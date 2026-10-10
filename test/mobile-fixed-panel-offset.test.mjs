// 回归测试（#41）：移动端 fixed 全屏面板让位 + 断点与宿主判据对齐
//
// 背景：桥此前的让位方式是给 `div[class*="_frame"]` 加 padding-top:52px，但
// `position: fixed` 的包含块是 viewport（CSS 2.1 §10.1），不跟随祖先 padding，
// 于是官方右侧栏在 <768px 自动全屏（fixed; inset:0）时顶部 52px 落进顶栏覆盖区。
//
// 本文件只做「结构与产物同步」断言（不需要浏览器）；真实几何/命中行为由
// 独立验收（Chrome + 合成 DOM）覆盖。断言失败时优先怀疑：改了 CSS 但没跑
// `npm run build:client`（产物与源码不同步）。
//
// 已知覆盖边界（文本断言无法判断，改动本文件相关 CSS 后请重跑几何验收）：
//   1. 同一移动端块内**后置的同元素更高优先级覆盖**（例如将来再加一条
//      `[data-sidebar-right-panel="fullscreen"][data-sidebar-right-open]{top:0}`）
//      会让实际让位失效，而本文件的文本断言仍然全绿；
//   2. 规则被放进不生效的媒体上下文（如误嵌 `@media print`）；
//   3. `--dsh-mobile-header-h` 被后置规则重定义（例如在 frame 上覆盖为 0px）。
// 判别这些只能靠真实浏览器几何/命中测试。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MOBILE_STYLES_CSS } from '../client/mobile-styles.js';
import { FAMILY_SLOTS, renderMobileStyles } from '../client/host-families.js';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// 断言关心规则内容而非宿主前缀（Issue #72 起源码里是 __F_<SLOT>__ 占位符）：
// 这里按 0.1.x 那一代前缀渲染做结构断言，产物同步断言用未渲染的模板原文。
const LEGACY_FAMILIES = Object.fromEntries(
  Object.entries(FAMILY_SLOTS).map(([slot, spec]) => [slot, spec.known[spec.known.length - 1]]),
);
const templateCss = MOBILE_STYLES_CSS;
const sourceCss = renderMobileStyles(templateCss, LEGACY_FAMILIES);
const indexSource = readFileSync(resolve(repoRoot, 'client/index.js'), 'utf8');
const bundle = readFileSync(resolve(repoRoot, 'client/client.js'), 'utf8');
// 产物里的中文注释被 esbuild 转成 \uXXXX（非 ASCII 标点也可能是 \xNN）转义，
// 反转义后才能与源码逐字比对
const unescapedBundle = bundle.replace(
  /\\u([0-9a-fA-F]{4})|\\x([0-9a-fA-F]{2})/g,
  (_, u, x) => String.fromCharCode(parseInt(u ?? x, 16)),
);

// 结构断言在"剥掉注释"的副本上做：注释里若出现「选择器 {」会被取块逻辑误当成规则，
// 而注释文本本身不该影响断言的成败。产物同步断言仍用带注释的原始串。
const structureCss = sourceCss.replace(/\/\*[\s\S]*?\*\//g, ' ');

/** 按花括号配对取出整段 @media 块，避免用 includes 误判"规则其实在别的块里" */
function mediaBlock(css, query) {
  const start = css.indexOf(`@media ${query}`);
  if (start < 0) return null;
  const open = css.indexOf('{', start);
  if (open < 0) return null;
  let depth = 0;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    else if (css[i] === '}') {
      depth -= 1;
      if (depth === 0) return css.slice(start, i + 1);
    }
  }
  return null;
}

/**
 * 取某选择器在给定 CSS 片段里的声明体（本文件中的规则均无嵌套）。
 * 用 `选择器 + 可选空白 + {` 匹配，避免被"注释里提到过该选择器"误导。
 */
function ruleBody(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = new RegExp(`${escaped}\\s*\\{`).exec(css);
  if (!m) return null;
  const open = css.indexOf('{', m.index);
  const close = css.indexOf('}', open);
  if (open < 0 || close < 0) return null;
  return css.slice(open + 1, close);
}

test('移动端断点与宿主判据对齐：<=767 生效、>=768 交还桌面', () => {
  assert.ok(mediaBlock(structureCss, '(max-width: 767px)'), '应存在 @media (max-width: 767px)');
  assert.ok(mediaBlock(structureCss, '(min-width: 768px)'), '应存在 @media (min-width: 768px)');
  assert.equal(mediaBlock(structureCss, '(max-width: 768px)'), null, '旧的 max-width: 768px 断点应已移除');
  assert.equal(mediaBlock(structureCss, '(min-width: 769px)'), null, '旧的 min-width: 769px 断点应已移除');
});

test('fixed 全屏面板在移动端块内单独让位 header 高度', () => {
  const mobile = mediaBlock(structureCss, '(max-width: 767px)');
  assert.ok(mobile, '移动端媒体查询块缺失');

  const body = ruleBody(mobile, '[data-sidebar-right-panel="fullscreen"]');
  assert.ok(body, '移动端块内应有 [data-sidebar-right-panel="fullscreen"] 让位规则');

  // 0.1.7 宿主把面板从 fixed 改为 absolute（相对 rightbarCol），若插件只改 top 会在
  // 宿主定位之上二次叠加 52px → 面板被推到视口外（点开右侧栏按钮消失、面板不出来）。
  // 修法：统一强制 fixed 相对视口 + top 让位，0.1.5 与 0.1.7 行为一致。
  assert.match(
    body,
    /[;{\s]position:\s*fixed\s*!important/,
    '面板必须强制为 fixed（相对视口），否则 0.1.7 的 absolute 会叠加二次偏移',
  );
  assert.match(
    body,
    /[;{\s]top:\s*var\(--dsh-mobile-header-h,\s*52px\)\s*!important/,
    '应把面板自身 top 顶到 header 高度（!important 覆盖宿主的 inset:0）',
  );
  // 注意前置字符类：`max-height:` 里也含 "height:"，不加边界会漏掉 height 被删的回归
  assert.match(
    body,
    /[;{\s]height:\s*calc\(100dvh - var\(--dsh-mobile-header-h,\s*52px\)\)\s*!important/,
    '应同步收窄高度，避免面板超出视口底部',
  );
  assert.match(
    body,
    /[;{\s]max-height:\s*calc\(100dvh - var\(--dsh-mobile-header-h,\s*52px\)\)\s*!important/,
    '应同步收窄 max-height（与工作台面板让位写法一致）',
  );

  // 该规则必须只作用于全屏态：push 态（>=768px）本身就在 frame 内容盒内，不需要位移
  assert.doesNotMatch(body, /data-sidebar-right-panel="push"/);
});

test('让位量与实际顶栏盒高同源（52px 变量未被改成 0 或脱离顶栏）', () => {
  // 整表匹配而非"取第一个 :root 块"：将来若在更前面新增暗色主题的 :root 块也不会误报
  assert.match(
    structureCss,
    /:root\s*\{[^}]*--dsh-mobile-header-h:\s*52px\s*;/,
    '顶栏高度变量应仍为 52px',
  );

  const header = ruleBody(structureCss, '.dsh-mobile-app-header');
  assert.ok(header, '应存在顶栏规则');
  assert.match(
    header,
    /[;{\s]height:\s*var\(--dsh-mobile-header-h\)\s*!important/,
    '顶栏高度必须与被让位的 52px 用同一个变量，二者才不会各自漂移',
  );

  const frame = ruleBody(mediaBlock(structureCss, '(max-width: 767px)'), '[data-slot="root"] > div[class*="_frame"]');
  assert.match(
    frame,
    /[;{\s]padding-top:\s*var\(--dsh-mobile-header-h\)\s*!important/,
    '流内内容的让位也必须用同一个变量',
  );

  const panel = ruleBody(mediaBlock(structureCss, '(max-width: 767px)'), '[data-sidebar-right-panel="fullscreen"]');
  assert.match(panel, /var\(--dsh-mobile-header-h,\s*52px\)/, '面板让位量必须来自同一个变量');
});

test('frame 规则限定在布局外壳，不命中聊天记录容器（否则手机看不到最新消息）', () => {
  const mobile = mediaBlock(structureCss, '(max-width: 767px)');
  assert.ok(mobile, '移动端媒体查询块缺失');

  // 外壳规则必须限定 [data-slot="root"] 的直接子元素：宿主的 CSS-module 哈希只保证
  // 同文件内唯一，`*="_frame"` 是跨包通配，会一并命中聊天记录容器 .EvIC1a_frame。
  assert.ok(
    ruleBody(mobile, '[data-slot="root"] > div[class*="_frame"]'),
    '移动端 frame 规则应限定为 [data-slot="root"] > div[class*="_frame"]',
  );
  // 回归守卫：不能让无前缀的宽选择器回来（注释里提到聊天容器不受影响，故只看「选择器 {」）
  assert.doesNotMatch(
    mobile,
    /(^|[};])\s*div\[class\*="_frame"\]\s*\{/,
    '不应再出现无前缀的 div[class*="_frame"] 规则：它会连同聊天记录容器一起命中，'
      + '把记录钳在视口高度并裁掉溢出内容（手机上表现为「看不到最新消息」）',
  );

  // 该块内不得给聊天记录容器设高度/溢出（官方规则是 flex:none;height:auto，由外层滚动）
  const chatFrame = ruleBody(mobile, 'div[class*="EvIC1a_frame"]');
  assert.equal(chatFrame, null, '移动端规则不得命中聊天记录容器 .EvIC1a_frame');
});

test('frame 恢复宿主 grid 三列并显式归位（0.1.7 右侧栏布局）', () => {
  const mobile = mediaBlock(structureCss, '(max-width: 767px)');
  assert.ok(mobile, '移动端媒体查询块缺失');

  // 0.1.7 宿主 frame 是 display:grid 三列，插件若强制 flex column + 单列 grid 会挤塌
  // rightbarCol（面板 absolute 相对它 → 定位到视口外，右侧栏不出来）。
  const frame = ruleBody(mobile, '[data-slot="root"] > div[class*="_frame"]');
  assert.match(frame, /display:\s*grid\s*!important/, 'frame 必须保持宿主 grid 布局');
  assert.match(
    frame,
    /grid-template-columns:\s*0px\s+minmax\(0px,\s*1fr\)\s+minmax\(0px,\s*0px\)\s*!important/,
    'frame 列应为「0 | 1fr | 0」：左侧抽屉 fixed 不占列、center 占满、rightbar 折叠列留位',
  );

  // 左侧栏抽屉化（fixed 脱离 grid 流）后，center/rightbar/overlay 必须显式归位列，
  // 否则 centerCol 会被自动排进第 1 列（56px 轨道）、rightbarCol 塌陷到视口底部。
  const center = ruleBody(mobile, 'div[class*="_centerCol"]');
  assert.match(center, /grid-column:\s*2\s*!important/, 'centerCol 必须归位到第 2 列（1fr 占满）');
  const rightbar = ruleBody(mobile, 'div[class*="_rightbarCol"]');
  assert.match(rightbar, /grid-column:\s*3\s*!important/, 'rightbarCol 必须归位到第 3 列');
  const overlay = ruleBody(mobile, 'div[class*="_overlayLayer"]');
  assert.match(overlay, /grid-column:\s*1\s*\/\s*-1\s*!important/, 'overlayLayer 必须横跨全部列');
});

test('运行时断点常量与 CSS 一致，且不再散落魔法值', () => {
  assert.match(indexSource, /const MOBILE_MAX_WIDTH = 767;/, 'client/index.js 应定义 MOBILE_MAX_WIDTH = 767');
  assert.doesNotMatch(indexSource, /innerWidth\s*<=?\s*768/, '不应再出现 innerWidth <= 768 的魔法值');
  assert.doesNotMatch(indexSource, /innerWidth\s*>=?\s*768/, '不应再出现 innerWidth > 768 的魔法值');
});

test('打包产物与源码同步（含 #41 修复、无旧断点残留）', () => {
  assert.ok(
    unescapedBundle.includes('@media (max-width: 767px)'),
    '产物缺少移动端样式，疑似忘记运行 npm run build:client',
  );
  assert.ok(
    unescapedBundle.includes('[data-sidebar-right-panel="fullscreen"]'),
    '产物缺少 #41 的面板让位规则，疑似忘记运行 npm run build:client',
  );
  assert.ok(
    unescapedBundle.includes(templateCss),
    '产物内嵌的移动端 CSS 与源码不一致，请运行 npm run build:client',
  );
  assert.equal(unescapedBundle.includes('max-width: 768px'), false, '产物仍残留旧的 768px 移动端断点');
  assert.equal(unescapedBundle.includes('min-width: 769px'), false, '产物仍残留旧的 769px 桌面断点');
  assert.ok(unescapedBundle.includes('MOBILE_MAX_WIDTH'), '产物缺少运行时断点常量，疑似忘记运行 npm run build:client');
  assert.doesNotMatch(bundle, /innerWidth\s*<=?\s*768/, '产物仍使用旧的 innerWidth <= 768');
  assert.doesNotMatch(bundle, /innerWidth\s*>=?\s*768/, '产物仍使用旧的 innerWidth > 768');
});
