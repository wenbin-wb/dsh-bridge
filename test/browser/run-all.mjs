// 移动端 UI 行为验收统一入口：npm run verify:mobile-ui [套件名片段…]
//
// 这些验收需要**真实运行中的 dsh web + 本插件 GUI**（用无头 Chrome 驱动真实设置弹窗），
// 所以不在 CI 的 `npm test` 里跑；请在发布前或改动 UI/CSS 后本地执行。
//
// 需要无头 Chrome：优先 PUPPETEER_EXECUTABLE_PATH，其次本仓库 scratch/chrome-cache 与
// puppeteer 缓存目录（见 helpers.mjs 的 resolveChrome）。
// 需要 GUI 在跑：默认 127.0.0.1:3080，可用 DSH_WEB_PORT 覆盖。
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, resolveChrome } from './helpers.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));

const SUITES = [
  { file: 'mobile-settings-fix.mjs', label: '设置页几何 + 可达性 + 视图切换' },
  { file: 'mobile-settings-all-sections.mjs', label: '全设置分类 × 全视口扫描' },
  { file: 'mobile-settings-edge.mjs', label: '极窄屏 320 + 页签可达性' },
  { file: 'mobile-settings-fallback.mjs', label: '就绪开关回退 + matchMedia 异常路径' },
  { file: 'mobile-settings-close.mjs', label: '关闭按钮位置与底部动作栏' },
  { file: 'market-install.mjs', label: '插件市场安装确认框可达性' },
];

// ---- 预检：环境不对时直接给可操作的报错，而不是让 6 个套件各报一堆空断言 ----
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

const results = [];
for (const suite of picked) {
  console.log(`\n########## ${suite.file} —— ${suite.label} ##########`);
  const r = spawnSync(process.execPath, [path.join(DIR, suite.file)], { stdio: 'inherit' });
  results.push({ ...suite, code: r.status });
}

console.log('\n================ 移动端 UI 行为验收汇总 ================');
for (const r of results) {
  console.log(`${r.code === 0 ? '✅ 通过' : '❌ 失败'}  ${r.file.padEnd(36)} ${r.label}`);
}
const failed = results.filter((r) => r.code !== 0);
console.log(`\n共 ${results.length} 个套件，失败 ${failed.length} 个。`);
process.exitCode = failed.length ? 1 : 0;
