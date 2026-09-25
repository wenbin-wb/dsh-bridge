// 回归测试：移动端设置中心可读性修复
//
// 背景（实测，非推测）：
//   1) mobile-styles.js 曾对宿主设置内容区强制 `overflow-x: hidden !important`，
//      而宿主原样式只写 `overflow-y: auto`（按 CSS Overflow 规范 overflow-x 会计算为
//      auto，即本来可横滑）。这条规则把「可滚动」降级成「静默裁切」：375px 下 options
//      的 scrollWidth 319 > clientWidth 277，多出的 42px 既看不到也滑不出来，
//      Plugin Market 的 Installed / Advanced 两个 Tab 因此完全不可达。
//   2) 78px 轨道把 "Agent presets"/"Plugin Market" 挤到两侧仅剩 ~5px，
//      标签字号被压到 10.5px 且 word-break: break-all 会从词中间断字。
//   3) 矮视口（横屏 667×375）下 nav 内容 362px > 容器 345px，末项被切 ~7px。
//   4) client/index.js 版本状态行左组缺 flexWrap/minWidth，305px 的定宽把
//      「检查更新」按钮顶出容器后被上面的 hidden 裁掉（375 下 42px，390 下 27px）。
//
// 本文件是「结构与产物同步」断言（不需要浏览器）。真实几何 / 可达性由
// scratch/verify-mobile-settings-fix.mjs、scratch/verify-mobile-settings-all-sections.mjs、
// scratch/verify-mobile-settings-edge.mjs 在真实 GUI 上覆盖。
//
// 关于断言取「全部匹配体」而不是「第一个匹配体」：独立验收用「在原规则之后追加一条
// 同特异性规则」的变异证明了「只取第一条」会漏判（测试全绿但真实 GUI 重新出现裁切）。
// 故凡是「某属性不得出现」类断言，一律遍历该选择器的全部规则体来判定。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MOBILE_STYLES_CSS } from '../client/mobile-styles.js';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceCss = MOBILE_STYLES_CSS;
const structureCss = sourceCss.replace(/\/\*[\s\S]*?\*\//g, ' ');
const indexSource = readFileSync(resolve(repoRoot, 'client/index.js'), 'utf8');
const bundle = readFileSync(resolve(repoRoot, 'client/client.js'), 'utf8');
const unescapedBundle = bundle.replace(
  /\\u([0-9a-fA-F]{4})|\\x([0-9a-fA-F]{2})/g,
  (_, u, x) => String.fromCharCode(parseInt(u ?? x, 16)),
);

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

/** 取某选择器在给定片段里的第一个声明体（本文件中的规则均无嵌套） */
function ruleBody(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = new RegExp(`${escaped}\\s*\\{`).exec(css);
  if (!m) return null;
  const open = css.indexOf('{', m.index);
  const close = css.indexOf('}', open);
  if (open < 0 || close < 0) return null;
  return css.slice(open + 1, close);
}

/** 取某选择器的【全部】声明体：用于「某属性不得出现」类断言，防后置覆盖漏判 */
function allRuleBodies(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`${escaped}\\s*\\{`, 'g');
  const out = [];
  let m;
  while ((m = re.exec(css))) {
    const open = css.indexOf('{', m.index);
    const close = css.indexOf('}', open);
    if (open >= 0 && close >= 0) out.push(css.slice(open + 1, close));
  }
  return out;
}

/** 把一段「无嵌套规则」的 CSS 拆成 { selector, body } 列表 */
function flatRules(css) {
  const out = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(css))) out.push({ selector: m[1].trim(), body: m[2] });
  return out;
}

/**
 * 按**顶层**逗号拆分选择器列表。
 * 不能直接用 `selector.split(',')`：`:has(> div[class*="mask"], > div[role="dialog"])`
 * 这类带嵌套逗号的选择器会被错误切开（实测会把 `> div[role="dialog"])` 当成独立选择器）。
 */
function splitSelectorList(selector) {
  const out = [];
  let depth = 0;
  let cur = '';
  for (const ch of selector) {
    if (ch === '(' || ch === '[') depth += 1;
    else if (ch === ')' || ch === ']') depth -= 1;
    if (ch === ',' && depth === 0) {
      if (cur.trim()) out.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

const GATE = 'html[data-dshbr-drilldown="ready"]';
// 「让元素看不见」的声明集合。不能只看 display:none —— visibility / content-visibility /
// max-height:0 / clip-path 同样能让设置内容彻底不可见，却绕过门控检查。
const HIDING_DECL_RE =
  /display\s*:\s*none|visibility\s*:\s*hidden|content-visibility\s*:\s*hidden|opacity\s*:\s*0(?![\d.])|max-height\s*:\s*0(?![\d.])|clip-path\s*:\s*(?:inset\(\s*100%|circle\(\s*0)/;
const mobileBlock = mediaBlock(structureCss, '(max-width: 767px)');
const narrowBlock = mediaBlock(structureCss, '(max-width: 480px)');

test('设置内容区不再被 overflow-x:hidden 静默裁切', () => {
  assert.ok(mobileBlock, '移动端媒体查询块缺失');
  const bodies = allRuleBodies(mobileBlock, 'div[class*="VOzbGW_options"]');
  assert.ok(bodies.length >= 1, '移动端块内应存在设置内容区规则');
  // 遍历全部规则体：后置追加一条同特异性 overflow-x:hidden 也必须被拦下
  for (const b of bodies) {
    assert.doesNotMatch(b, /overflow-x:\s*hidden/, 'overflow-x 不得为 hidden（会把溢出降级为永久不可达）');
  }
  assert.ok(
    bodies.some((b) => /[;{\s]overflow-x:\s*auto\s*!important/.test(b)),
    'overflow-x 应为 auto（恢复宿主默认可横滑语义）',
  );
  const main = ruleBody(mobileBlock, 'div[class*="VOzbGW_options"]');
  assert.match(main, /[;{\s]overflow-y:\s*auto\s*!important/, 'overflow-y 应保持 auto');
  assert.match(main, /-webkit-overflow-scrolling:\s*touch/, '应保留 iOS 惯性滚动');
});

test('导航标签不再被压到极限字号或从词中间断字', () => {
  const bodies = allRuleBodies(mobileBlock, 'span[class*="VOzbGW_navLabel"]');
  assert.ok(bodies.length >= 1, '移动端块内应有导航标签规则');
  for (const b of bodies) {
    assert.doesNotMatch(b, /word-break:\s*break-all/, '不得使用 break-all（会把中英文从词中间拆开）');
  }
  assert.ok(
    bodies.some((b) => /overflow-wrap:\s*anywhere/.test(b)),
    '超长单词应靠 overflow-wrap 兜底而不是 break-all',
  );
  const body = ruleBody(mobileBlock, 'span[class*="VOzbGW_navLabel"]');
  const size = Number(/font-size:\s*([\d.]+)px/.exec(body)?.[1]);
  assert.ok(size >= 11, `标签字号应 >= 11px（当前 ${size}px，10.5px 在手机上不可读）`);
});

test('导航轨道加宽且单元格不被压缩（防矮视口末项被切）', () => {
  const navBody = ruleBody(mobileBlock, 'nav[class*="VOzbGW_nav"]');
  assert.ok(navBody, '移动端块内应有导航容器规则');
  const width = Number(/width:\s*(\d+)px/.exec(navBody)?.[1]);
  assert.ok(width >= 88, `导航轨道应 >= 88px（当前 ${width}px，78px 会让长标签两侧只剩 ~5px）`);
  // 不得有另一条规则把轨道再压窄（矮视口收紧块不得改 width）
  for (const b of allRuleBodies(mobileBlock, 'nav[class*="VOzbGW_nav"]')) {
    const w = /width:\s*(\d+)px/.exec(b)?.[1];
    if (w !== undefined) assert.ok(Number(w) >= 88, `不应有规则把轨道压到 ${w}px`);
  }

  const cellBody = ruleBody(mobileBlock, 'button[class*="VOzbGW_navCell"]');
  assert.ok(cellBody, '移动端块内应有导航单元格规则');
  assert.match(cellBody, /[;{\s]flex:\s*0 0 auto\s*!important/, '单元格必须 flex:none，否则矮视口下会被压缩导致末项贴边裁切');
  assert.match(cellBody, /[;{\s]min-height:\s*46px\s*!important/, '单元格最小高度应 >= 46px（触控目标）');
});

test('矮视口（横屏）单独收紧，6 个分类无需滚动即可全部落位', () => {
  const shortBlock = mediaBlock(mobileBlock, '(max-height: 500px)');
  assert.ok(shortBlock, '移动端块内应有 @media (max-height: 500px) 收紧规则');
  const cellBody = ruleBody(shortBlock, 'button[class*="VOzbGW_navCell"]');
  assert.ok(cellBody, '矮视口块内应有单元格规则');
  assert.match(cellBody, /[;{\s]min-height:\s*4[0-4]px\s*!important/, '矮视口单元格应压到 40–44px');
});

test('<=480px 两级钻取整块由就绪开关门控（CSS 不得单方面假设 JS 可用）', () => {
  assert.ok(narrowBlock, '应存在 @media (max-width: 480px) 钻取块');

  // 关键安全属性（全样式表反向扫描，不只看第一个 480 块）：
  // 凡是会隐藏设置弹窗结构（display:none 且选择器命中 VOzbGW_*）的规则，都必须带就绪开关。
  // 否则一旦 CSS 生效而点击监听器不匹配/缺失，列表点了没反应，设置内容 100% 不可达。
  // 逐条选择器按逗号拆分判定：只门控选择器列表前半段的写法也要被拦下。
  const offenders = [];
  const gated = [];
  for (const r of flatRules(structureCss)) {
    // 隐藏谓词不能只看 display:none：visibility:hidden / content-visibility:hidden /
    // max-height:0 / clip-path 同样能让设置内容彻底看不见，却绕过门控检查
    // （独立验收加码构造的 M21 正是用 visibility:hidden 在 480 块外隐藏 options）。
    if (!HIDING_DECL_RE.test(r.body)) continue;
    for (const sel of splitSelectorList(r.selector)) {
      if (!/VOzbGW_/.test(sel)) continue;
      if (sel.startsWith(GATE)) gated.push(sel);
      else offenders.push(sel);
    }
  }
  assert.equal(offenders.length, 0, `以下规则会隐藏设置弹窗结构但没有就绪开关门控：${offenders.join(' | ')}`);
  // 正对照：必须真的扫到受门控的隐藏规则，避免「一条都没扫到」的假绿
  assert.ok(gated.length >= 2, `应至少扫到 2 条受门控的隐藏规则，实际 ${gated.length} 条（防空扫假绿）`);

  // 钻取块内不得存在未门控规则
  const ungated = flatRules(narrowBlock).filter((r) => !splitSelectorList(r.selector).every((s) => s.startsWith(GATE)));
  assert.equal(
    ungated.length,
    0,
    `钻取块内不得有未门控规则：${ungated.map((r) => r.selector).join(' | ')}`,
  );
  // 且只允许存在一个 max-width: 480px 块（防止后置追加第二个块绕过上面的扫描）
  assert.equal(
    structureCss.split('@media (max-width: 480px)').length - 1,
    1,
    '只应存在一个 @media (max-width: 480px) 块',
  );
});

test('<=480px 布局：面板纵向、列表页默认、详情页折叠导航', () => {
  const panelBody = ruleBody(narrowBlock, 'div[class*="VOzbGW_panel"]');
  assert.ok(panelBody, '钻取块内应有面板规则');
  assert.match(panelBody, /flex-direction:\s*column\s*!important/, '钻取布局必须是纵向排队（否则 nav 与 content 并排抢宽度）');

  const defaultBody = ruleBody(
    narrowBlock,
    'div[class*="VOzbGW_panel"]:not([data-dshbr-settings-view="detail"]) div[class*="VOzbGW_options"]',
  );
  assert.ok(defaultBody, '默认态（未标注视图）应隐藏选项区，即默认展示分类列表页');
  assert.match(defaultBody, /display:\s*none\s*!important/);

  const detailNavList = ruleBody(
    narrowBlock,
    'div[class*="VOzbGW_panel"][data-dshbr-settings-view="detail"] div[class*="VOzbGW_navList"]',
  );
  assert.ok(detailNavList, '详情页应收起分类列表');
  assert.match(detailNavList, /display:\s*none\s*!important/);

  const cellBody = ruleBody(narrowBlock, 'button[class*="VOzbGW_navCell"]');
  assert.ok(cellBody, '钻取块内应有列表行规则');
  assert.match(cellBody, /flex-direction:\s*row\s*!important/, '列表行应为横向（图标左文字右）');
  assert.match(cellBody, /[;{\s]min-height:\s*52px\s*!important/, '列表行触控高度应 >= 52px');
  const labelBody = ruleBody(narrowBlock, 'span[class*="VOzbGW_navLabel"]');
  assert.ok(labelBody, '钻取块内应有标签规则');
  assert.match(labelBody, /font-size:\s*15px\s*!important/, '钻取页标签字号应为 15px');

  assert.match(narrowBlock, /\[data-dshbr-settings-view="detail"\][^{]*navTitle[^{]*::before/, '详情页标题行应有 ‹ 返回箭头');
});

test('交互层：断点同源 + 装好监听器之后才打开就绪开关', () => {
  const cssBreakpoint = Number(/@media \(max-width:\s*(\d+)px\)/.exec(narrowBlock)?.[1]);
  assert.ok(Number.isFinite(cssBreakpoint), '未能从钻取块解析断点');
  const jsMatch = /const SETTINGS_DRILLDOWN_MAX_WIDTH = (\d+);/.exec(indexSource);
  assert.ok(jsMatch, 'client/index.js 应定义 SETTINGS_DRILLDOWN_MAX_WIDTH');
  assert.equal(
    Number(jsMatch[1]),
    cssBreakpoint,
    `JS 断点(${jsMatch?.[1]}) 与 CSS 断点(${cssBreakpoint}) 必须一致，否则会出现「CSS 已切钻取、JS 仍不接管」或反过来的错位`,
  );

  // 开关常量与 CSS 里的属性值必须一致
  assert.match(indexSource, /const DRILLDOWN_GATE_ATTR = 'data-dshbr-drilldown';/, 'JS 应定义就绪开关属性名');
  assert.match(indexSource, /const DRILLDOWN_GATE_READY = 'ready';/, 'JS 应定义就绪开关取值');
  assert.ok(indexSource.includes('data-dshbr-settings-view'), 'JS 应使用与 CSS 相同的视图属性名');
  assert.ok(indexSource.includes("const SETTINGS_VIEW_DETAIL = 'detail';"), 'JS 应定义 detail 视图常量');

  const fnStart = indexSource.indexOf('function setupSettingsDrilldown()');
  assert.ok(fnStart > 0, '应定义 setupSettingsDrilldown');
  const fnEnd = indexSource.indexOf('\nfunction setupMobileExperience', fnStart);
  // 剥掉注释再断言：否则「catch 里只有注释没有 return」也会被正则误判为已覆盖
  const fnBody = indexSource.slice(fnStart, fnEnd).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
  const fnRaw = indexSource.slice(fnStart, fnEnd);

  // 断点谓词与开关必须同源：都用同一个 MediaQueryList，且 matchMedia 不可用时不启用
  assert.match(fnRaw, /typeof window\.matchMedia !== 'function'\)\s*return/, 'matchMedia 缺失时必须提前返回、不打开开关');
  const mqIdx = fnBody.indexOf('window.matchMedia(');
  assert.ok(mqIdx > 0, '应创建 MediaQueryList 实例');
  assert.match(fnBody, /const isNarrow = \(\) => narrowQuery\.matches === true;/, '断点谓词必须复用同一个 MediaQueryList 实例，不得各自再问一次 matchMedia');
  assert.doesNotMatch(
    fnBody.slice(fnBody.indexOf('const isNarrow'), fnBody.indexOf('const onDocumentClick')),
    /matchMedia\(/,
    'isNarrow 内不得重新调用 matchMedia',
  );

  // 开关必须在 addEventListener 之后；addEventListener 失败必须提前 return（不是只写 catch）
  const addIdx = fnBody.indexOf(`document.addEventListener('click'`);
  const armIdx = fnBody.indexOf('syncGate()');
  assert.ok(addIdx > 0, '交互层应在 document 上注册 click 监听');
  assert.ok(armIdx > addIdx, '就绪开关必须在监听器注册之后才同步');
  // 必须定位到 addEventListener 紧随的那个 catch 体再判定：
  // 本函数里还有 matchMedia / 订阅两处 `catch { return; }`，用全局正则会被它们蒙混过去
  // （实测变异「只删 addEventListener 的 return」正是这样漏判的）。
  const afterAdd = fnBody.slice(addIdx);
  const addCatchIdx = afterAdd.indexOf('catch');
  assert.ok(addCatchIdx > 0, 'addEventListener 应包在 try/catch 中');
  const addCatchBodyStart = afterAdd.indexOf('{', addCatchIdx) + 1;
  const addCatchBodyEnd = afterAdd.indexOf('}', addCatchBodyStart);
  const addCatchBody = afterAdd.slice(addCatchBodyStart, addCatchBodyEnd);
  // 只校验「文本里有 return」不够：`if (0) return;` 或 `setAttribute(...); return;` 都能带着
  // return 字样继续把开关打开（独立验收加码构造的 M17/M18 正是这两种）。
  // 因此剥掉嵌套块后要求 catch 体里剩下的实质语句只有 return。
  const addCatchStripped = addCatchBody.replace(/\{[^{}]*\}/g, ' ');
  assert.match(addCatchStripped, /\breturn\b/, 'addEventListener 失败的 catch 体必须 return（只有 catch 关键字不算）');
  assert.match(addCatchStripped, /^\s*return\s*;?\s*$/, `catch 体剥掉嵌套块后只允许是 return，实际为：${JSON.stringify(addCatchStripped.trim())}`);
  assert.doesNotMatch(addCatchBody, /setAttribute|removeAttribute|syncGate|DRILLDOWN_GATE/, 'catch 体里不得出现任何开/关开关的语句（必须直接 return）');
  assert.ok(
    fnBody.indexOf('syncGate();', addIdx) > afterAdd.indexOf('catch'),
    '开关同步不得出现在 addEventListener 的 catch 之前',
  );
  assert.match(fnBody, /const syncGate = \(\)[\s\S]{0,220}setAttribute\(DRILLDOWN_GATE_ATTR, DRILLDOWN_GATE_READY\)[\s\S]{0,120}removeAttribute\(DRILLDOWN_GATE_ATTR\)/, 'syncGate 必须按 matches 同时负责开与关');
  // 断点变化要订阅，否则转屏后开关会与实际匹配状态漂移
  assert.match(fnBody, /addEventListener\('change', syncGate\)|addListener\(syncGate\)/, '应订阅断点变化以同步开关');

  // 交互层不得往 React 管理的设置树里插 DOM（会在卸载时 removeChild 失配）
  assert.doesNotMatch(fnBody, /appendChild|insertBefore|createElement/, '钻取交互不得注入 DOM，只能给宿主节点打属性');
  // 不得用合成点击自检：宿主与第三方插件有多个 document 级 click 监听，会被误触发
  assert.doesNotMatch(fnBody, /dispatchEvent/, '不得在 document 上派发合成事件做自检（会误触发宿主/第三方的 document 级监听）');

  // 必须尽早初始化：apply() 里要出现在 setupMobileExperience 之前
  const applyStart = indexSource.indexOf('function apply(ctx)');
  const applyBody = indexSource.slice(applyStart, indexSource.indexOf('\n  const injected =', applyStart));
  const callIdx = applyBody.indexOf('setupSettingsDrilldown();');
  const mobileIdx = applyBody.indexOf('setupMobileExperience(');
  assert.ok(callIdx > 0, 'apply() 应调用 setupSettingsDrilldown()');
  assert.ok(mobileIdx > 0, 'apply() 应调用 setupMobileExperience()');
  assert.ok(callIdx < mobileIdx, '钻取交互层应早于 setupMobileExperience 初始化，避免后者抛异常留下「CSS 已生效、监听器未装」的状态');
});

test('关闭按钮与标题/返回行同处第一行（弹窗常规约定）', () => {
  // 宿主 DOM 里 ✕ 在 content>header、标题在 nav，是两棵子树。此前用 order:-1 把 content
  // 提到 nav 之前，导致菜单页 ✕ 落在标题上面一行、详情页 ✕ 落在返回行下面一行。
  // 修法是让 panel 成为定位祖先、✕ 绝对定位到面板右上角，并给标题留出右侧空间。
  const panelBody = ruleBody(narrowBlock, 'div[class*="VOzbGW_panel"]');
  assert.match(panelBody, /[;{\s]position:\s*relative\s*!important/, '✕ 要绝对定位，panel 必须是定位祖先');

  const closeBody = ruleBody(narrowBlock, 'button[class*="VOzbGW_close"]');
  assert.ok(closeBody, '钻取块内应有 ✕ 定位规则（注意宿主渲染的是 button 不是 div）');
  assert.match(closeBody, /position:\s*absolute\s*!important/, '✕ 应绝对定位');
  // 只断言「有 top/right」不够：把 top 改成 200px 仍能通过，但 ✕ 已经不在角落。
  // 因此限定偏移量必须很小（真正贴右上是 9px）。
  const topPx = Number(/[;{\s]top:\s*(\d+)px\s*!important/.exec(closeBody)?.[1]);
  const rightPx = Number(/[;{\s]right:\s*(\d+)px\s*!important/.exec(closeBody)?.[1]);
  assert.ok(Number.isFinite(topPx) && topPx <= 16, `✕ 的 top 偏移应 <= 16px（贴面板顶部），实际 ${topPx}`);
  assert.ok(Number.isFinite(rightPx) && rightPx <= 16, `✕ 的 right 偏移应 <= 16px（贴面板右侧），实际 ${rightPx}`);

  // 标题必须为 ✕ 留位：**逐条**校验右侧内边距 >= ✕ 宽度 + 右边距。
  // 不能取 Math.max —— 详情页那条比基类多一个属性选择器、特异性更高，会整体覆盖基类
  // 的 padding。独立验收实测：基类 52px + 详情页 4px 时，Math.max 拿到 52px 判定通过，
  // 但详情页实际只有 4px，注入长标题后与 ✕ 交叠 608/707 px²（真缺陷，已修 CSS）。
  // 同一条规则体内 padding-right 与 padding 同时出现时按源序取最后声明的那个。
  // 必须同时考虑三层，缺一层就有实测可复现的盲区：
  //  1) 逻辑属性 padding-inline-end / padding-inline（D9 用前者把详情页让位打回 4px）；
  //  2) !important —— CSS 里 important 覆盖非 important，**与源序无关**，
  //     故不能像早前那样只按源序取最后一条（D10：前面 important 4px + 后面非 important 简写）；
  //  3) 简写展开（t r b l / t h b / v h 的右侧值都在下标 1）。
  const rightPaddingOf = (body) => {
    const norm = body.replace(/\s+/g, ' ');
    const decls = [];
    const re = /(padding-inline-end|padding-inline|padding-right|padding)\s*:\s*([^;]+)/g;
    let m;
    while ((m = re.exec(norm))) {
      const prop = m[1];
      const important = /!\s*important/.test(m[2]);
      const parts = m[2]
        .replace(/!\s*important/, '')
        .trim()
        .split(/\s+/)
        .map((x) => Number.parseFloat(x) || 0);
      let right;
      if (prop === 'padding-right' || prop === 'padding-inline-end') right = parts[0];
      else if (prop === 'padding-inline') right = parts.length === 1 ? parts[0] : parts[1];
      else right = parts.length === 1 ? parts[0] : parts[1];
      decls.push({ right, important, order: m.index });
    }
    if (!decls.length) return null;
    const important = decls.filter((d) => d.important);
    const pool = (important.length ? important : decls).sort((a, b) => a.order - b.order);
    return pool[pool.length - 1].right;
  };
  // 扫描范围必须是**整张样式表**里所有带钻取门控的 navTitle 规则，而不是只看 480 块：
  // 追加在 480 块之外的覆盖规则同样会生效（独立验收的 D9/D10 就是这样绕过的）。
  // 只取门控规则是因为 ≤767 的轨道布局里标题在左栏、✕ 在右栏，本来就不需要让位。
  const titleRules = flatRules(structureCss)
    .filter((r) => r.selector.includes(GATE) && r.selector.includes('VOzbGW_navTitle'))
    // 排除 ::before/::after：它们是箭头伪元素，不承载标题文字，也不该有内边距/折行要求
    .filter((r) => !r.selector.includes('::'))
    .map((r) => r.body);
  assert.ok(titleRules.length >= 2, `应同时存在基类与详情页两条门控 navTitle 规则（实际 ${titleRules.length} 条）`);
  const closeW = Number(/width:\s*(\d+)px/.exec(closeBody)?.[1]);
  const closeR = Number(/[;{\s]right:\s*(\d+)px/.exec(closeBody)?.[1]);
  const need = closeW + closeR;
  let checked = 0;
  for (const b of titleRules) {
    const rp = rightPaddingOf(b);
    if (rp === null) continue; // 该条不设内边距，不参与
    checked += 1;
    assert.ok(
      rp >= need,
      `每条 navTitle 规则的右侧留白都必须 >= ✕ 宽度+右边距(${need}px)，发现 ${rp}px（规则体：${b.trim().slice(0, 80)}…）`,
    );
  }
  assert.ok(checked >= 2, `应逐条校验到至少 2 条设了内边距的 navTitle 规则，实际 ${checked} 条`);
  // 留白只能管盒内，管不住溢出：不可折行的超长 token 会整块顶过去（实测交叠 707px²），
  // 故门控的每条 navTitle 规则都要能断长 token。
  for (const b of titleRules) {
    assert.match(
      b.replace(/\s+/g, ' '),
      /overflow-wrap\s*:\s*anywhere\s*!\s*important/,
      '每条门控 navTitle 规则都应设 overflow-wrap: anywhere，兜住不可折行的超长标题',
    );
  }

  // 不得再回退到 order:-1 的老写法（那正是 ✕ 与标题分行的根因）
  assert.equal(narrowBlock.includes('order: -1'), false, '不得再用 order:-1 把 content 提到 nav 之前');

  // content/header 必须保持 static：✕ 绝对定位的包含块是最近的**定位祖先**，本该是 panel。
  // 一旦 content/header 被任何来源设成 relative/absolute，包含块就下移 —— 独立验收实测
  // 给 content 加 position:relative 后 ✕ 的 relTop 由 9 变成 579、并与底部动作栏重叠 837px²。
  for (const cls of ['VOzbGW_content', 'VOzbGW_header']) {
    // 全表扫描（不限 480 块）：任何来源把 content/header 变成定位元素都会挪走 ✕ 的包含块
    const bodies = flatRules(structureCss)
      .filter((r) => splitSelectorList(r.selector).some((x) => x.includes(cls)))
      .map((r) => r.body.replace(/\s+/g, ' '));
    assert.ok(bodies.length >= 1, `应能扫到 ${cls} 的规则（防空扫假绿）`);
    for (const b of bodies) {
      for (const m of b.matchAll(/position\s*:\s*([a-z-]+)/g)) {
        assert.equal(m[1], 'static', `${cls} 的 position 必须是 static（否则 ✕ 的定位祖先下移），发现 ${m[1]}`);
      }
    }
    assert.ok(
      bodies.some((b) => /position\s*:\s*static\s*!\s*important/.test(b)),
      `${cls} 应显式声明 position: static !important，防止被其它来源的定位规则顶掉`,
    );
  }

  // 详情页：动作栏用 flex order 沉到底部，且 options 仍是滚动容器（不用 column-reverse）
  const detailHeader = ruleBody(
    narrowBlock,
    'div[class*="VOzbGW_panel"][data-dshbr-settings-view="detail"] div[class*="VOzbGW_header"]',
  );
  const detailOptions = ruleBody(
    narrowBlock,
    'div[class*="VOzbGW_panel"][data-dshbr-settings-view="detail"] div[class*="VOzbGW_options"]',
  );
  assert.ok(detailHeader && /order:\s*2/.test(detailHeader), '详情页动作栏应 order:2 沉底');
  assert.ok(detailOptions && /order:\s*1/.test(detailOptions), '详情页 options 应 order:1 置顶');
  assert.doesNotMatch(narrowBlock, /column-reverse/, '不得用 column-reverse（会让滚动原点翻转）');
});

test('设置页内弹出的第三方模态框必须盖在设置弹窗之上，且不超出视口', () => {
  // 故障：插件市场点「安装」无反应。本插件把设置弹窗抬到 z-index:10002，而第三方的
  // 模态根（挂在 <body> 下、自带遮罩）只有 1000；它内部的对话框虽被 10005 规则抬起，
  // 但 z-index 逃不出祖先层叠上下文，整棵子树被盖死。矮视口下还叠加「对话框比视口高」。
  //
  // ⚠️ 三条都被独立验收的变异逼出来过，别再退回去：
  //  (a) 「按选择器取全部规则体逐条校验」，**不能按值过滤** —— 按值过滤会让「后置追加一条
  //      把 z-index 改回 1000 的同特异性规则」既不计数也不被检查，测试全绿而用户 bug 复现。
  //  (b) 收集条件按**目标形状**而非门控拼写：独立验收连续用 `:is()` 包裹、`:not()` 打断、
  //      `html:has(...) body >` 前缀、拆属性选择器（E1/E3/E4/E7）绕过了「按门控拼写」的写法。
  //      改为「选择器含 div:has( 且含 mask 或 role="dialog"」——只认这两条规则真正要覆盖的
  //      目标形状，与门控怎么写无关。实测在当前样式表上恰好命中那 2 条受控规则，无假阳性。
  //      （诚实标注：仍非密不透风，`body > div:nth-of-type(4)` 这类位置选择器仍可逃逸；
  //        剩下的靠行为门禁 verify-market-install.mjs 兜底，不再继续拼写级加码。）
  //  (c) 规则体先做空白归一化并**转小写**，声明正则用 !\s*important —— CSS 关键字大小写
  //      不敏感（`!IMPORTANT` 合法），且允许 `! important` / `z-index : 1000`（D1/D2/D6/E5）。
  const isGatedSelector = (sel) => sel.includes('div:has(') && (sel.includes('mask') || sel.includes('role="dialog"'));
  const gated = flatRules(structureCss).filter((r) => splitSelectorList(r.selector).some(isGatedSelector));
  assert.ok(gated.length >= 2, `应有至少两条第三方模态框相关规则，实际 ${gated.length}`);
  // 意图断言：真正的实现仍应以「设置弹窗打开时」为前提（写成布尔表达式而非字面，避免又变成拼写检查）
  assert.ok(
    gated.some((r) => /body\s*:\s*has\(/.test(r.selector) && r.selector.includes('VOzbGW_overlay')),
    '受控规则应仍以 body:has(...VOzbGW_overlay...) 为生效前提',
  );

  const zDecl = [];
  const hDecl = [];
  for (const r of gated) {
    const body = r.body.replace(/\s+/g, ' ').toLowerCase(); // 关键字大小写不敏感
    // 每条门控规则里的 z-index 声明都必须是 10050（含后置覆盖规则）
    for (const m of body.matchAll(/z-index\s*:\s*([^;!]+?)\s*!\s*important/g)) zDecl.push({ sel: r.selector, v: m[1].trim() });
    for (const m of body.matchAll(/max-height\s*:\s*([^;!]+?)\s*!\s*important/g)) {
      // 任何形态的 max-height 都必须落在「视口高度 - >=32px」这个白名单式写法上。
      // 不能只收集 calc 形态：否则改成 `max-height: 584px` 这类固定值会溜过检查（C2）。
      const raw = m[1].trim();
      const ok = /^calc\(\s*100(?:d)?vh\s*-\s*(\d+)px\s*\)$/.exec(raw);
      hDecl.push({ sel: r.selector, raw, pad: ok ? Number(ok[1]) : null, unit: /dvh/.test(raw) ? 'dvh' : 'vh' });
    }
    // 每个选择器都必须确实是「第三方模态框」这一类目标（与门控怎么写无关）
    for (const sel of splitSelectorList(r.selector)) {
      assert.ok(isGatedSelector(sel), `每个选择器都应指向第三方模态框这一类目标：${sel}`);
    }
  }

  assert.ok(zDecl.length >= 1, '应有抬升第三方模态根 z-index 的声明');
  for (const z of zDecl) {
    assert.equal(z.v, '10050', `门控规则里的 z-index 必须全为 10050，发现 ${z.v}（选择器：${z.sel}）—— 后置覆盖规则也要被这条断言拦下`);
  }

  assert.ok(hDecl.length >= 2, '视口约束应同时提供 vh 与 dvh 两种写法');
  assert.ok(hDecl.some((h) => h.unit === 'vh'), '缺少 vh 回退（不支持 dvh 的环境）');
  assert.ok(hDecl.some((h) => h.unit === 'dvh'), '缺少 dvh 写法');
  for (const h of hDecl) {
    assert.ok(h.pad !== null, `max-height 必须是 calc(100vh|100dvh - Npx) 形态，发现「${h.raw}」（选择器：${h.sel}）`);
    assert.ok(h.pad >= 32, `max-height 的留白必须 >= 32px（该对话框是 content-box + 24px 纵向内边距，留 16px 时仍溢出 4px），发现 ${h.pad}px：${h.raw}`);
  }
  assert.ok(
    gated.some((r) => /overflow-y\s*:\s*auto\s*!\s*important/.test(r.body.replace(/\s+/g, ' ').toLowerCase())),
    '应允许对话框内部滚动，否则矮视口下按钮仍点不到',
  );

  // 不得硬编码任何第三方构建哈希/类名前缀（否则第三方升级即失效）。
  // 扫描范围是**整张样式表**而非只扫门控规则：独立验收证明「额外加一条不含门控选择器、
  // 但硬编码第三方类名的规则」能绕过只扫 gated 的写法（C4）。注释已在 structureCss 剥掉。
  for (const forbidden of ['_root_w1urq', '_dialog_w1urq', 'nUhMVa', '_mask_w1urq', '_content_w1urq']) {
    assert.equal(structureCss.includes(forbidden), false, `整张样式表都不得硬编码第三方类名 ${forbidden}`);
  }
  assert.doesNotMatch(structureCss, /dshmarket/i, '样式表不得硬编码第三方插件标识');
});

test('版本状态行左组允许换行收缩，「检查更新」不再被裁', () => {
  const marker = '// flexWrap + minWidth:0 是必需的';
  assert.ok(indexSource.includes(marker), '版本状态行左组应带修复说明注释');
  const idx = indexSource.indexOf(marker);
  const snippet = indexSource.slice(idx, idx + 400);
  assert.match(snippet, /flexWrap:\s*'wrap'/, '左组应允许换行');
  assert.match(snippet, /minWidth:\s*0/, '左组应允许收缩');
  assert.match(indexSource, /whiteSpace:\s*'nowrap',\s*\n\s*flexShrink:\s*0,/, '「检查更新」按钮应 nowrap + flexShrink:0');
});

test('Tab 条具备横滑可达提示（边缘渐隐 + 当前项滚入可视区）', () => {
  const start = indexSource.indexOf('function TabBar(');
  const end = indexSource.indexOf('\n// ---- 主面板 ----', start);
  const body = indexSource.slice(start, end);
  assert.match(body, /dsh-tabbar-container/, '应保留 Tab 条类名');
  assert.match(body, /maskImage/, '应给 Tab 条加 mask-image 边缘渐隐，让「还能横滑」可见');
  assert.match(body, /data-dsh-tab-active/, '应标记当前项以便滚入可视区');
  assert.match(body, /scrollLeft/, '应实现当前项滚入可视区');
});

test('打包产物与源码同步（本次修复 + 无 hidden 残留 + 带就绪开关）', () => {
  assert.ok(unescapedBundle.includes(sourceCss), '产物内嵌的移动端 CSS 与源码不一致，请运行 npm run build:client');
  assert.ok(unescapedBundle.includes('setupSettingsDrilldown'), '产物缺少钻取交互，疑似忘记运行 npm run build:client');
  assert.ok(unescapedBundle.includes('SETTINGS_DRILLDOWN_MAX_WIDTH'), '产物缺少钻取断点常量');
  assert.ok(unescapedBundle.includes('data-dsh-tab-active'), '产物缺少 Tab 条可达提示');
  assert.ok(
    unescapedBundle.includes('data-dshbr-drilldown') && unescapedBundle.includes('DRILLDOWN_GATE_READY'),
    '产物缺少就绪开关（CSS 与 JS 必须同源）',
  );
  assert.ok(
    unescapedBundle.includes(`:not([data-dshbr-settings-view="detail"])`),
    '产物缺少钻取默认态规则',
  );
  assert.equal(
    unescapedBundle.includes('VOzbGW_options"] {\n        flex: 1 1 auto !important;\n        width: 100% !important;\n        max-width: 100% !important;\n        box-sizing: border-box !important;\n        padding: 0 14px 20px !important;\n        overflow-x: hidden'),
    false,
    '产物仍残留把设置内容区裁切的旧规则，请运行 npm run build:client',
  );
});
