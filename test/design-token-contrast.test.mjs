// 设计令牌与对比度回归
//
// 起因（一次性收敛的三条根因）：
//  1. 插件引用了 12 个 DSH 主题系统**根本没定义**的令牌（state-*-bg/border、info-*、
//     danger-*、border-secondary）。var() 只能走浅色 fallback → 暗色主题下浅底浅字。
//  2. 深色补丁原先写在移动端样式里，injectMobileStyles() 在 __TAURI__ / __DSH_DESKTOP__ /
//     外部响应式插件存在时直接 return → 桌面端 Shell 下补丁从未生效。
//  3. DSH 定义的 state-{warn,error,success}-primary 是**强调填充色**（浅色 amber-500 /
//     red-600 / green-500），当告警面上的正文只有 1.95~4.11:1；DSH 状态族四个变体
//     在浅色告警面上**没有一个**达到 WCAG AA（2.07 / 1.84 / 2.69 / 4.11 / 2.16 …）。
//     → 正文统一改用 DSH 自带的 label-primary（中性正文色，随主题翻转），
//       状态感由告警面底色与边框承担。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const indexSource = readFileSync(resolve(repoRoot, 'client/index.js'), 'utf8');
const themeTokens = readFileSync(resolve(repoRoot, 'client/theme-tokens.js'), 'utf8');
const rawBundle = readFileSync(resolve(repoRoot, 'client/client.js'), 'utf8');
const fixture = JSON.parse(readFileSync(resolve(repoRoot, 'test/fixtures/dsh-design-tokens.json'), 'utf8'));

const allClientSources = ['client/index.js', 'client/mobile-styles.js', 'client/theme-tokens.js', 'client/unlock-manager.js']
  .map((f) => readFileSync(resolve(repoRoot, f), 'utf8')).join('\n');

const DSH_DEFINED = new Set(fixture.dshDefinedAndReferenced);
// 插件自己在 theme-tokens.js 里定义的令牌（`--xxx:` 形式）
const PLUGIN_DEFINED = new Set([...themeTokens.matchAll(/--(dsw-[a-z0-9-]+):/g)].map((m) => m[1]));

/** WCAG 2.x 相对亮度与对比度 */
function luminance(hex) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
/** 半透明告警面叠在面板底色上的合成色（暗色主题 bg-layer-1 = #232324） */
function composite(tintRgb, alpha, baseHex) {
  const b = [1, 3, 5].map((i) => parseInt(baseHex.slice(i, i + 2), 16));
  return '#' + [0, 1, 2].map((i) => Math.round(tintRgb[i] * alpha + b[i] * (1 - alpha)).toString(16).padStart(2, '0')).join('');
}

test('不变式：插件引用的令牌必须 DSH 有定义、或插件自己在 theme-tokens.js 定义', () => {
  const used = new Set([...allClientSources.matchAll(/--(dsw-[a-z0-9-]+)/g)].map((m) => m[1]));
  const unknown = [...used].filter((t) => !DSH_DEFINED.has(t) && !PLUGIN_DEFINED.has(t)).sort();
  assert.deepEqual(
    unknown,
    [],
    `引用了既不属于 DSH、插件也未定义的令牌（var() 会静默退化成浅色 fallback）：${JSON.stringify(unknown)}`,
  );
});

test('不变式：告警/状态正文不得再用 DSH 的 state-*-primary（那是填充色，浅底 1.95~4.11:1）', () => {
  const offenders = [];
  // 跨行回溯：三元表达式常把 `color:` 写在上一行，只看同一行会漏判（假阴性）
  let offset = 0;
  for (const [i, line] of indexSource.split('\n').entries()) {
    const m = line.match(/--dsw-alias-state-(warn|error|success|info)-primary/);
    if (m) {
      const head = indexSource.slice(Math.max(0, offset + m.index - 500), offset + m.index);
      const props = [...head.matchAll(/\b(color|background|border[A-Za-z]*)\s*[:=]/g)];
      if (props.length && props[props.length - 1][1] === 'color') {
        offenders.push({ line: i + 1, state: m[1], text: line.trim().slice(0, 100) });
      }
    }
    offset += line.length + 1;
  }
  assert.deepEqual(offenders, [], `以下位置仍把强调填充色当正文色：${JSON.stringify(offenders, null, 2)}`);
});

/** 从源码里取某个告警面的浅色 fallback（`var(--dsw-alias-state-X-bg, #fffbeb)` 第二参数） */
function surfaceFallback(state) {
  const m = indexSource.match(new RegExp(`var\\(--dsw-alias-state-${state}-bg,\\s*([^)]+)\\)`));
  assert.ok(m, `源码里找不到 ${state} 告警面的 fallback`);
  return m[1].trim();
}
/** 从 theme-tokens.js 里取深色告警面的半透明定义 */
function darkSurfaceDef(state) {
  const m = themeTokens.match(new RegExp(`--dsw-alias-state-${state}-bg:\\s*([^;]+);`));
  assert.ok(m, `theme-tokens.js 未定义 ${state} 深色告警面（暗色主题会退回浅色 fallback）`);
  return m[1].trim();
}
/** 解析 `rgba(r, g, b, a)` */
function parseRgba(v) {
  const m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/.exec(v.trim());
  assert.ok(m, `无法解析颜色值：${v}`);
  return { rgb: [1, 2, 3].map((i) => parseInt(m[i], 10)), a: Number(m[4]) };
}

test('对比度：告警/状态正文（label-primary）落在两套主题的告警面上均达 AA', () => {
  const STATES = ['warn', 'error', 'success', 'info'];
  // 正文色：DSH 主题系统实测值（入仓清单 test/fixtures/dsh-design-tokens.json 有出处）
  const lightLabel = fixture.dshLabelTokenValues.light['label-primary'];
  const darkLabel = fixture.dshLabelTokenValues.dark['label-primary'];
  // 暗色半透明告警面叠在面板底色 bg-layer-1 上（DSH 暗色值 bluish-875 = #232324）
  const DARK_BASE = '#232324';

  for (const state of STATES) {
    const light = contrast(lightLabel, surfaceFallback(state));
    assert.ok(light >= 4.5, `浅色主题：${state} 告警面 ${surfaceFallback(state)} 上的正文 ${lightLabel} 仅 ${light.toFixed(2)}:1`);

    const def = parseRgba(darkSurfaceDef(state));
    const darkBg = composite(def.rgb, def.a, DARK_BASE);
    const dark = contrast(darkLabel, darkBg);
    assert.ok(dark >= 4.5, `暗色主题：${state} 告警面 ${darkBg} 上的正文 ${darkLabel} 仅 ${dark.toFixed(2)}:1`);
  }

  // 前提复核：DSH 的强调填充色当正文，在浅色面上确实不达 AA（这正是本次修复的动因）
  for (const [state, accent] of [['warn', '#f59e0b'], ['error', '#ec1313'], ['success', '#22c55e']]) {
    const before = contrast(accent, surfaceFallback(state));
    assert.ok(before < 4.5, `前提复核：${state} 强调色 ${accent} 在浅色告警面上应确实不达 AA（实测 ${before.toFixed(2)}:1）`);
  }
});

test('对比度：纯色底按钮（保存成功态 / 升级重开按钮）在两套主题下均达 AA', () => {
  // 从源码取实际配色：底色与前景都写死，因此与主题无关
  const greenBg = /saveSuccess \? '(#[0-9a-f]{6})'/.exec(indexSource)?.[1];
  const greenFg = /color: saveSuccess \? '(#[0-9a-f]{6})'/.exec(indexSource)?.[1];
  const blueBg = /height: 36, background: '(#[0-9a-f]{6})'/.exec(indexSource)?.[1];
  assert.ok(greenBg && greenFg && blueBg, '未能从源码取到按钮配色');

  const pairs = [
    [greenFg, greenBg, '保存成功态绿底'],
    ['#ffffff', blueBg, '蓝底白字按钮'],
    ['#27241f', '#f59e0b', '琥珀警示按钮（s.btnWarn 底）'],
  ];
  for (const [fg, bg, name] of pairs) {
    const r = contrast(fg, bg);
    assert.ok(r >= 4.5, `${name}：${fg} on ${bg} = ${r.toFixed(2)}:1，未达 AA`);
  }
  // 前提复核：修复前的两组配色确实不达 AA（防"改回去还不报警"）
  assert.ok(contrast('#ffffff', '#059669') < 4.5, '前提复核：旧绿底 #059669 + 白字应确实不达 AA');
  assert.ok(contrast('#ffffff', '#4f6ef7') < 4.5, '前提复核：旧蓝底 #4f6ef7 + 白字应确实不达 AA');
});

test('调用点：修复后的配色确实进了源码与产物', () => {
  assert.match(indexSource, /background: '#047857'/, '保存成功态应改为 #047857 + 白字');
  assert.match(indexSource, /background: '#4560ea'/, '蓝底按钮应改为 #4560ea（4.28 → 5.10:1）');
  assert.match(indexSource, /color: saveSuccess \? '#ffffff'/, '成功态必须固定白字，不能继承主题前景令牌');
  // 产物同步
  assert.match(rawBundle, /#047857/, '产物缺少绿底修复，请运行 npm run build:client');
  assert.match(rawBundle, /#4560ea/, '产物缺少蓝底修复，请运行 npm run build:client');
  assert.match(rawBundle, /dsh-bridge-theme-tokens/, '产物缺少主题令牌注入，请运行 npm run build:client');
});

test('主题令牌：深色补丁与移动端样式解耦（不再只在移动端生效）', () => {
  // 原深色补丁写在 MOBILE_STYLES_CSS 里，移动端让位时会被一起让掉
  assert.match(indexSource, /injectThemeTokens\(\);/, 'apply() 必须无条件注入主题令牌');
  assert.match(themeTokens, /body\[data-ds-dark-theme\]/, 'theme-tokens.js 必须含深色补丁');
  assert.match(
    readFileSync(resolve(repoRoot, 'client/mobile-styles.js'), 'utf8'),
    /深色模式适配已迁移到 client\/theme-tokens\.js/,
    'mobile-styles.js 应保留迁移说明（防止有人把深色补丁搬回去）',
  );
  assert.doesNotMatch(
    readFileSync(resolve(repoRoot, 'client/mobile-styles.js'), 'utf8'),
    /--dsw-alias-state-warn-bg/,
    '深色补丁不得再留在移动端样式里（会让位时失效）',
  );
});
