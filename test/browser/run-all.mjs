// 移动端 UI 行为验收统一入口：npm run verify:mobile-ui [套件名片段…]
//
// 这些验收需要**真实运行中的 dsh web + 本插件 GUI**（用无头 Chrome 驱动真实设置弹窗），
// 所以不在 CI 的 `npm test` 里跑；请在发布前或改动 UI/CSS 后本地执行。
//
// 需要无头 Chrome：优先 PUPPETEER_EXECUTABLE_PATH，其次本仓库 scratch/chrome-cache、
// puppeteer 缓存目录，以及 Windows 上已安装的 Chrome/Edge（见 helpers.mjs 的 resolveChrome）。
// 需要 GUI 在跑：默认 127.0.0.1:3080，可用 DSH_WEB_PORT 覆盖；
// 目标宿主没有浏览器鉴权（≤0.1.1）时用 DSH_ALLOW_NO_AUTH=1。
//
// 汇总口径（Issue #72 复核修正）：套件通过 stdout 上的 `[suite-result]` 标记回传
// pass/skip/fail，故「全部 SKIP、零断言执行」的套件不会再被算成 ✅ —— 那会让读者
// 误以为断言真的跑过（例如 0.2.0 宿主没有插件市场入口时的 market-install）。
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, resolveChrome, SUITE_RESULT_PREFIX } from './helpers.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));

const SUITES = [
  // 放在最前：与宿主代次无关的守卫，宿主换代必须先过它（Issue #72）
  { file: 'host-family-compat.mjs', label: '宿主代次兼容守卫（任意版本宿主都能定位设置弹窗）' },
  { file: 'mobile-settings-fix.mjs', label: '设置页几何 + 可达性 + 视图切换' },
  { file: 'mobile-settings-all-sections.mjs', label: '全设置分类 × 全视口扫描' },
  { file: 'mobile-settings-edge.mjs', label: '极窄屏 320 + 页签可达性' },
  { file: 'mobile-settings-fallback.mjs', label: '就绪开关回退 + matchMedia 异常路径' },
  { file: 'mobile-settings-close.mjs', label: '关闭按钮位置与底部动作栏' },
  { file: 'market-install.mjs', label: '插件市场安装确认框可达性' },
  { file: 'mobile-sidebar-drawer.mjs', label: '侧边栏抽屉展开/收起（宿主按钮中英文匹配）' },
  { file: 'mobile-sidebar-right.mjs', label: '右侧栏展开/收起（0.1.7 grid 布局修复）' },
];

// ---- 预检：环境不对时直接给可操作的报错，而不是让 9 个套件各报一堆空断言 ----
try {
  resolveChrome();
} catch (e) {
  console.error(`[verify:mobile-ui] ${e.message}`);
  process.exit(2);
}
try {
  const { port } = connect();
  console.log(`[verify:mobile-ui] GUI 与鉴权就绪（127.0.0.1:${port}）\n`);
} catch (e) {
  console.error(`[verify:mobile-ui] ${e.message}`);
  process.exit(2);
}

const filters = process.argv.slice(2);
const picked = filters.length ? SUITES.filter((s) => filters.some((f) => s.file.includes(f))) : SUITES;
if (!picked.length) {
  console.error(`[verify:mobile-ui] 没有匹配的套件。可用：\n  ${SUITES.map((s) => s.file).join('\n  ')}`);
  process.exit(2);
}

/** 跑一个套件：输出实时透传，同时留一份用于解析 [suite-result] 标记 */
function runSuite(file) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(DIR, file)], { stdio: ['inherit', 'pipe', 'inherit'] });
    let buf = '';
    child.stdout.on('data', (chunk) => {
      buf += chunk.toString();
      process.stdout.write(chunk);
    });
    child.on('close', (code) => resolve({ code: code ?? 1, out: buf }));
  });
}

const results = [];
for (const suite of picked) {
  console.log(`\n########## ${suite.file} —— ${suite.label} ##########`);
  const { code, out } = await runSuite(suite.file);
  const marker = out.split('\n').filter((l) => l.startsWith(SUITE_RESULT_PREFIX)).pop();
  const parsed = marker
    ? Object.fromEntries(marker.slice(SUITE_RESULT_PREFIX.length).trim().split(/\s+/)
        .map((kv) => kv.split('='))
        .filter(([k]) => ['pass', 'skip', 'fail'].includes(k))
        .map(([k, v]) => [k, Number(v)]))
    : null;
  results.push({ ...suite, code, pass: parsed?.pass, skip: parsed?.skip, fail: parsed?.fail });
}

console.log('\n================ 移动端 UI 行为验收汇总 ================');
let totalSkipped = 0;
for (const r of results) {
  const hasCounts = typeof r.pass === 'number' && typeof r.fail === 'number';
  if (hasCounts) totalSkipped += r.skip ?? 0;
  let verdict;
  if (r.code !== 0) verdict = '❌ 失败';
  else if (hasCounts && (r.pass + r.fail + (r.skip ?? 0)) === 0) verdict = '⚪ 未执行断言';
  else if (hasCounts && r.pass === 0 && (r.skip ?? 0) > 0) verdict = '⚪ 未执行断言';
  else verdict = '✅ 通过';
  const counts = hasCounts ? `（通过 ${r.pass}${r.skip ? `，跳过 ${r.skip}` : ''}${r.fail ? `，失败 ${r.fail}` : ''}）` : '';
  console.log(`${verdict}  ${r.file.padEnd(34)} ${r.label} ${counts}`);
}
const failed = results.filter((r) => r.code !== 0);
const zeroAssertion = results.filter((r) => r.code === 0 && r.pass === 0 && (r.skip ?? 0) > 0);
console.log(`\n共 ${results.length} 个套件：失败 ${failed.length} 个${totalSkipped ? `，累计跳过 ${totalSkipped} 条断言` : ''}${zeroAssertion.length ? `，其中 ${zeroAssertion.length} 个套件零断言执行（仅跳过）` : ''}。`);
if (zeroAssertion.length) {
  console.log('零断言执行的套件（宿主结构漂移导致，不能据此认为该功能验收通过）：');
  for (const r of zeroAssertion) console.log(`  - ${r.file}`);
}
process.exitCode = failed.length ? 1 : 0;
