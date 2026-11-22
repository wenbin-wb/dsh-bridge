// 回归测试：移动端抽屉「插件状态 ↔ 宿主抽屉状态」双写同步（issue #105）
//
// 现场（issue #105）：
//   A. 抽屉第一次点击被吞，要点第二次；
//   B. 从抽屉入口新建会话后，顶栏 (+) 与抽屉/面板自己的关闭控件挤在顶部右侧，
//      点不到退出控件，退不回会话界面。
//
// 代码层根因（详见 client/index.js 里 setMobileDrawerOpen 的注释）：
//   - 打开抽屉时插件既加 `body.dsh-drawer-open`、又点宿主「打开侧边栏」按钮；
//   - 但历史实现的所有关闭路径只删插件自己的 class，**从不收起宿主抽屉**。
//   宿主 0.2.x 在 <768px 下自带抽屉（frame 带 data-sidebar-drawer，打开时渲染一层
//   pointer-events:auto 的 drawerMask）。于是插件"关闭"后宿主抽屉连同遮罩仍开着：
//   插件遮罩先消失，宿主 drawerMask 正好盖住内容区，下一次点击被它吃掉（它只把宿主
//   抽屉关掉）——体感就是"第一次点击被吞"；同时抽屉/面板的关闭控件与自绘顶栏 (+)
//   同时可命中，用户点 (+) 反而重开新建会话。
//
// 本文件两层断言：
//   ① 结构/产物同步：所有关闭路径都走 setMobileDrawerOpen、CSS 有"抽屉打开时顶栏
//      按钮让位"的规则、产物与源码同步；
//   ② 行为：把源码里的 helper 原样抽出来，用桩 document 真实执行，验证
//      「旧宿主不改变行为」「新宿主只在两套状态不一致时才点宿主 toggle」
//      「关闭路径不会把宿主状态切反（双 toggle）」。
//
// ⚠️ 真实几何/命中（+ 与 X 是否像素重叠、点击是否真的落到正确控件）仍需
// `npm run verify:mobile-ui` 或真机确认，本文件不声称覆盖。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MOBILE_STYLES_CSS } from '../client/mobile-styles.js';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const indexSource = readFileSync(resolve(repoRoot, 'client/index.js'), 'utf8');
const bundle = readFileSync(resolve(repoRoot, 'client/client.js'), 'utf8');
// 产物里的中文注释/标点被 esbuild 转成 \uXXXX / \xNN 转义，反转义后才能逐字比对
const unescapedBundle = bundle.replace(
  /\\u([0-9a-fA-F]{4})|\\x([0-9a-fA-F]{2})/g,
  (_, u, x) => String.fromCharCode(parseInt(u ?? x, 16)),
);
// 结构断言在"剥掉注释"的副本上做（注释里的选择器/花括号不该影响判定）
const structureCss = MOBILE_STYLES_CSS.replace(/\/\*[\s\S]*?\*\//g, ' ');

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

/** 取某选择器在给定 CSS 片段里的声明体（本文件涉及的规则均无嵌套） */
function ruleBody(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = new RegExp(`${escaped}\\s*\\{`).exec(css);
  if (!m) return null;
  const open = css.indexOf('{', m.index);
  const close = css.indexOf('}', open);
  if (open < 0 || close < 0) return null;
  return css.slice(open + 1, close);
}

const mobileBlock = mediaBlock(structureCss, '(max-width: 767px)');
const outsideMobile = mobileBlock ? structureCss.split(mobileBlock).join('') : structureCss;

// ---- 从源码里原样抽出抽屉 helper，用桩 document 真实执行 ----
const helperStart = indexSource.indexOf('const MOBILE_DRAWER_CLASS');
const helperEnd = indexSource.indexOf('function setupMobileExperience(rpcCall, ctx) {');
assert.ok(helperStart > 0 && helperEnd > helperStart, '应能在 client/index.js 里定位抽屉 helper 区块');
const helperSource = indexSource.slice(helperStart, helperEnd);

/** 构造一个够用的桩 document；返回 clicks 便于断言"宿主 toggle 被点了几次"。 */
function makeStubEnv({ hostDrawer = null, collapsed = true, toggleButtons = null, legacyButton = null, familyButton = null, familyThrows = false, asyncCommit = false } = {}) {
  const clicks = [];
  const bodyClasses = new Set();
  // 宿主状态可随点击翻转，模拟真实 toggle 语义（否则第二次 toggle 的断言会失真）。
  // asyncCommit=true 模拟「宿主把抽屉状态异步提交」：点击后状态在微任务里才翻转，
  // 用于验证同一 task 内连续两次关闭请求不会双 toggle 把抽屉切回打开。
  let hostCollapsed = collapsed;
  const frame = hostDrawer === null
    ? null
    : { hasAttribute: (name) => (name === 'data-sidebar-collapsed' ? hostCollapsed : false) };
  const buttons = (toggleButtons ?? []).map((id) => ({
    id,
    inert: false,
    closest: (sel) => (sel === '[inert]' && id.startsWith('inert:') ? {} : null),
    click: () => {
      clicks.push(id);
      if (asyncCommit) queueMicrotask(() => { hostCollapsed = !hostCollapsed; });
      else hostCollapsed = !hostCollapsed;
    },
  }));
  const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
  const legacy = legacyButton
    ? { id: legacyButton, click: () => clicks.push(legacyButton) }
    : null;
  // 宿主前缀 family 选择器兜底（改造前「左缘右滑」用的那条）：有的旧宿主只给按钮
  // 加 CSS-module class、不带中英文 aria-label，没有这层就会出现「抽屉滑出但侧边栏空白」。
  const familyToggle = familyButton
    ? { id: familyButton, click: () => clicks.push(familyButton) }
    : null;
  const panels = [];
  const document = {
    body: {
      classList: {
        add: (c) => bodyClasses.add(c),
        remove: (c) => bodyClasses.delete(c),
        contains: (c) => bodyClasses.has(c),
      },
    },
    querySelector: (sel) => {
      if (sel === '[data-sidebar-drawer]') return frame;
      if (sel.includes('button[aria-label')) return legacy;
      if (sel.includes('.stub-family')) return familyToggle;
      return null;
    },
    querySelectorAll: (sel) => {
      if (sel === 'button[data-sidebar-toggle], button[data-sidebar-opener]') return buttons;
      if (sel === 'div.stub-panel') return panels;
      return [];
    },
  };
  const familySelector = () => {
    if (familyThrows) throw new Error('family 未解析');
    return '.stub-family';
  };
  const workbenchPanelSelector = () => 'div.stub-panel';
  const factory = new Function(
    'document',
    'workbenchPanelSelector',
    'familySelector',
    `${helperSource}\nreturn { setMobileDrawerOpen, toggleMobileDrawer, readHostMobileDrawerOpen, clickHostSidebarToggle, hideOpenMobilePanels, MOBILE_DRAWER_CLASS };`,
  );
  const api = factory(document, workbenchPanelSelector, familySelector);
  return { api, clicks, bodyClasses, panels, document, settle };
}

test('helper：宿主 0.2.x 用稳定 data 属性读抽屉状态；旧宿主返回 null（不改变旧语义）', () => {
  const { api } = makeStubEnv({ hostDrawer: true, collapsed: true });
  assert.equal(api.readHostMobileDrawerOpen(), false, 'data-sidebar-collapsed 存在 = 宿主抽屉已收起');
  const open = makeStubEnv({ hostDrawer: true, collapsed: false });
  assert.equal(open.api.readHostMobileDrawerOpen(), true, '缺 data-sidebar-collapsed = 宿主抽屉打开');
  const legacy = makeStubEnv({ hostDrawer: null });
  assert.equal(legacy.api.readHostMobileDrawerOpen(), null, '没有 [data-sidebar-drawer] 的旧宿主必须返回 null');
});

test('行为：旧宿主（无自带抽屉）保持历史语义——只在打开时点宿主展开按钮', () => {
  const { api, clicks, bodyClasses } = makeStubEnv({ hostDrawer: null, legacyButton: 'legacy-expand' });
  api.setMobileDrawerOpen(true);
  assert.equal(bodyClasses.has(api.MOBILE_DRAWER_CLASS), true, '打开时应加插件 class');
  assert.deepEqual(clicks, ['legacy-expand'], '旧宿主：打开时仍点一次宿主展开按钮（与改动前一致）');
  api.setMobileDrawerOpen(false);
  assert.equal(bodyClasses.has(api.MOBILE_DRAWER_CLASS), false, '关闭时应撤插件 class');
  assert.deepEqual(clicks, ['legacy-expand'], '旧宿主没有抽屉可收：关闭时不得再点宿主按钮');
});

test('行为：旧宿主只有 CSS-module class（无 aria-label）时，退回 family 选择器兜底', () => {
  // 改造前「左缘右滑」用的就是这条 family 兜底；统一入口不得把它丢掉，
  // 否则这类宿主会「抽屉滑出但会话列表没挂载（侧边栏空白）」。
  const env = makeStubEnv({ hostDrawer: null, familyButton: 'family-toggle' });
  env.api.setMobileDrawerOpen(true);
  assert.deepEqual(env.clicks, ['family-toggle'], '有 family 兜底时必须点它，而不是什么都不点');
  assert.equal(env.bodyClasses.has(env.api.MOBILE_DRAWER_CLASS), true);

  // family 解析失败（querySelector 会因非法选择器抛错）时不得外抛，且优雅降级
  const broken = makeStubEnv({ hostDrawer: null, familyThrows: true });
  assert.doesNotThrow(() => broken.api.setMobileDrawerOpen(true), '兜底路径异常不得冒泡到点击处理');
  assert.equal(broken.api.clickHostSidebarToggle(), false, '无任何可点入口时返回 false，由调用方继续');
});

test('行为：宿主异步提交抽屉状态时，同一 task 内连续两次「关闭」不得双 toggle 把抽屉切回打开', async () => {
  // 现实触发点：抽屉内点「新建会话」——捕获阶段先关一次抽屉，宿主 startSession 又触发
  // sessions 订阅再关一次；若宿主把抽屉状态异步提交，第二次仍读到「开」，会再点一次
  // toggle。修复后：同一意图 150ms 内只同步一次宿主。
  const env = makeStubEnv({
    hostDrawer: true,
    collapsed: false,
    toggleButtons: ['toggle'],
    asyncCommit: true,
  });
  env.api.setMobileDrawerOpen(false);
  env.api.setMobileDrawerOpen(false); // 同一 task 的第二次关闭（状态尚未提交）
  assert.deepEqual(env.clicks, ['toggle'], `连续两次关闭只允许点一次宿主 toggle，实际点了 ${env.clicks.length} 次`);
  await env.settle();
  // 宿主提交后状态一致：再次关闭不得再点
  env.api.setMobileDrawerOpen(false);
  assert.deepEqual(env.clicks, ['toggle']);
});

test('行为：宿主自带抽屉时，打开/关闭只在两套状态不一致时点一次宿主 toggle', () => {
  // 宿主已收起 + 要求打开 → 点一次
  const a = makeStubEnv({ hostDrawer: true, collapsed: true, toggleButtons: ['opener'] });
  a.api.setMobileDrawerOpen(true);
  assert.equal(a.bodyClasses.has('dsh-drawer-open'), true);
  assert.deepEqual(a.clicks, ['opener'], '宿主抽屉收起时应点一次宿主 toggle 打开');

  // 宿主已打开 + 要求关闭 → 点一次（这是 issue #105 的修复点：此前一次都不点）
  const b = makeStubEnv({ hostDrawer: true, collapsed: false, toggleButtons: ['toggle'] });
  b.api.setMobileDrawerOpen(false);
  assert.equal(b.bodyClasses.has('dsh-drawer-open'), false);
  assert.deepEqual(b.clicks, ['toggle'], '宿主抽屉仍开着时必须把它一起收起（否则遮罩会吃掉下一次点击）');

  // 状态已一致 → 不得重复点（否则会把宿主状态切反）
  const c = makeStubEnv({ hostDrawer: true, collapsed: true, toggleButtons: ['opener'] });
  c.api.setMobileDrawerOpen(false);
  assert.deepEqual(c.clicks, [], '两套状态已一致时不得再点宿主 toggle（避免双 toggle 把抽屉切回打开）');
  const d = makeStubEnv({ hostDrawer: true, collapsed: false, toggleButtons: ['toggle'] });
  d.api.setMobileDrawerOpen(true);
  assert.deepEqual(d.clicks, [], '宿主已打开时再次打开不应重复点 toggle');
});

test('行为：优先点不在 inert 子树里的宿主 toggle（关闭态下 sidebar 自身 inert）', () => {
  const env = makeStubEnv({
    hostDrawer: true,
    collapsed: true,
    toggleButtons: ['inert:sidebar-toggle', 'leading-opener'],
  });
  env.api.setMobileDrawerOpen(true);
  assert.deepEqual(env.clicks, ['leading-opener'], '关闭态应优先点 leadingSeat 的 opener，而不是 inert 的 sidebar toggle');
});

test('行为：toggleMobileDrawer 依据插件 class 取反，并同步宿主', () => {
  const env = makeStubEnv({ hostDrawer: true, collapsed: true, toggleButtons: ['t'] });
  env.api.toggleMobileDrawer();
  assert.equal(env.bodyClasses.has('dsh-drawer-open'), true);
  assert.deepEqual(env.clicks, ['t']);
  env.api.toggleMobileDrawer();
  assert.equal(env.bodyClasses.has('dsh-drawer-open'), false);
  assert.deepEqual(env.clicks, ['t', 't'], '第二次 toggle 应把宿主抽屉一起收起');
});

test('行为：hideOpenMobilePanels 收起 workbench 面板并撤掉打开态 class', () => {
  const env = makeStubEnv({ hostDrawer: true, collapsed: true });
  const hidden = new Set();
  env.panels.push({ classList: { add: (c) => hidden.add(c) } });
  env.bodyClasses.add('dsh-workbench-open');
  env.api.hideOpenMobilePanels();
  assert.equal(env.bodyClasses.has('dsh-workbench-open'), false, '应撤掉 dsh-workbench-open');
  assert.equal(hidden.has('dsh-bridge-panelHidden'), true, '打开的面板应被标记为隐藏');
});

// ---- 结构断言：所有开关入口都必须走 helper，不能有"只删插件 class"的关闭路径 ----
test('所有抽屉开关入口都走 helper（禁止遗留只删插件 class 的关闭路径）', () => {
  assert.match(indexSource, /const MOBILE_DRAWER_CLASS = 'dsh-drawer-open';/, '应有统一的抽屉 class 常量');
  // 打开入口：顶栏汉堡 + 左缘右滑
  assert.match(indexSource, /leftBtn\.onclick = \(e\) => \{\s*e\.stopPropagation\(\);\s*\/\/[^\n]*\n\s*toggleMobileDrawer\(\);/,
    '顶栏汉堡应走 toggleMobileDrawer()');
  assert.match(indexSource, /setMobileDrawerOpen\(true\);/, '左缘右滑打开应走 setMobileDrawerOpen(true)');
  // 关闭入口（逐个点名，任何一处回退都会让宿主遮罩残留、吞掉下一次点击）
  const closeSites = [
    /backdrop\.addEventListener\('click', \(\) => \{\s*setMobileDrawerOpen\(false\);\s*\}\);/,
    /if \(label\.includes\('新会话'\) \|\| btn\.matches\('button\[class\*="newSession"\]'\)\) \{\s*setMobileDrawerOpen\(false\);\s*hideOpenMobilePanels\(\);/,
    /setTimeout\(\(\) => \{\s*if \(document\.body\.classList\.contains\(MOBILE_DRAWER_CLASS\)\) \{\s*\/\/[^\n]*\n\s*\/\/[^\n]*\n\s*setMobileDrawerOpen\(false\);/,
    /if \(document\.body\.classList\.contains\(MOBILE_DRAWER_CLASS\)\) \{\s*\/\/[^\n]*\n\s*\/\/[^\n]*\n\s*setMobileDrawerOpen\(false\);\s*\}/,
    /else if \(deltaX < 0 && document\.body\.classList\.contains\(MOBILE_DRAWER_CLASS\)\) \{\s*setMobileDrawerOpen\(false\);\s*\}/,
  ];
  for (const re of closeSites) {
    assert.match(indexSource, re, `关闭入口必须走 setMobileDrawerOpen(false)（否则宿主抽屉遮罩会残留）：${re}`);
  }
  // 点遮罩的关闭只允许由遮罩自己的监听器处理：捕获阶段再补一条会双 toggle
  assert.doesNotMatch(indexSource, /else if \(e\.target\.classList\?\.contains\('dsh-mobile-backdrop'\)\)/,
    '不得在 document 捕获阶段再处理一次遮罩点击（会与遮罩自身监听器双 toggle）');
  // 工作区弹窗的两个收尾路径同样要同步宿主状态
  assert.equal((indexSource.match(/closeModal\(\);\s*setMobileDrawerOpen\(false\);/g) || []).length, 2,
    '工作区弹窗的两处收尾都应走 setMobileDrawerOpen(false)');
  // 不得再出现裸的 class 字面量开关（唯一例外：捕获阶段监听宿主自己的收起按钮，
  // 此刻宿主状态尚未更新，只能删插件 class，见该处注释）
  assert.equal((indexSource.match(/classList\.(?:add|remove|toggle)\('dsh-drawer-open'/g) || []).length, 0,
    '不得再出现裸的 dsh-drawer-open 字面量开关');
  assert.equal((indexSource.match(/classList\.remove\(MOBILE_DRAWER_CLASS\)/g) || []).length, 3,
    '只允许三处直接删 class：helper 内部、捕获阶段监听宿主收起按钮、反向同步（都不应回点宿主 toggle）');
});

test('宿主 toggle 选择器：优先稳定 data 属性，旧宿主退回中英文 aria-label', () => {
  const fnStart = indexSource.indexOf('function clickHostSidebarToggle()');
  assert.ok(fnStart >= 0, '应有 clickHostSidebarToggle');
  const fnBody = indexSource.slice(fnStart, indexSource.indexOf('\n}', fnStart));
  assert.match(fnBody, /button\[data-sidebar-toggle\], button\[data-sidebar-opener\]/,
    '0.2.x 宿主应优先用 data-sidebar-toggle / data-sidebar-opener（不依赖哈希类名）');
  assert.match(fnBody, /打开侧边栏/, '旧宿主中文展开按钮兜底');
  assert.match(fnBody, /Open sidebar/, '旧宿主英文展开按钮兜底');
  assert.match(fnBody, /收起侧边栏/, '旧宿主中文收起按钮兜底');
  assert.match(fnBody, /Collapse sidebar/, '旧宿主英文收起按钮兜底');
  assert.match(fnBody, /closest\('\[inert\]'\)/, '应优先点不在 inert 子树里的 toggle');
});

test('新建会话（顶栏 + 与抽屉入口）都先收起抽屉与面板', () => {
  const plusAt = indexSource.indexOf('rightBtn.onclick = () => {');
  assert.ok(plusAt >= 0, '应有顶栏 + 的点击处理');
  const plusBody = indexSource.slice(plusAt, indexSource.indexOf('\n    };', plusAt));
  assert.match(plusBody, /setMobileDrawerOpen\(false\);/, '顶栏 + 应先收起抽屉（同步宿主）');
  assert.match(plusBody, /hideOpenMobilePanels\(\);/, '顶栏 + 应先收起右侧面板');
  assert.match(indexSource, /function hideOpenMobilePanels\(\)/, '面板收起应统一走 hideOpenMobilePanels');
  // 切会话时的自动收起也走统一入口
  assert.match(indexSource, /ctx\.sessions\.active\.subscribe\(\(\) => \{[\s\S]{0,400}?hideOpenMobilePanels\(\);/,
    '切换会话时应统一收起面板');
});

test('反向同步：宿主自己开/关抽屉时把插件 class 拉齐，且不得回点宿主 toggle', () => {
  assert.match(indexSource, /const syncDrawerClassFromHost = \(\) => \{/,
    '应有「宿主状态 → 插件 class」的反向同步');
  const fnAt = indexSource.indexOf('const syncDrawerClassFromHost = () => {');
  const fnBody = indexSource.slice(fnAt, indexSource.indexOf('\n    };', fnAt));
  assert.match(fnBody, /const hostOpen = readHostMobileDrawerOpen\(\);/, '反向同步必须读宿主真实状态');
  assert.match(fnBody, /if \(hostOpen === null\) return;/, '宿主没有自带抽屉时不得反向改动插件状态');
  assert.match(fnBody, /if \(hostOpen === pluginOpen\) return;/, '状态一致时不得写 class（避免无谓 DOM 变更）');
  assert.doesNotMatch(fnBody, /clickHostSidebarToggle|\.click\(\)/,
    '反向同步不得再点宿主 toggle（输入就是宿主状态，再点会把它切反）');
  assert.match(indexSource, /attributeFilter: \['data-sidebar-drawer', 'data-sidebar-collapsed'\]/,
    '应同时观察宿主抽屉的两个稳定属性（转屏/开合都会变）');
});

test('CSS：抽屉打开期间顶栏按钮必须让位（+ 不得盖住抽屉/面板的关闭控件）', () => {
  assert.ok(mobileBlock, '移动端媒体查询块缺失');
  const menuBtn = ruleBody(mobileBlock, 'body.dsh-drawer-open .dsh-header-menu-btn');
  const newBtn = ruleBody(mobileBlock, 'body.dsh-drawer-open .dsh-header-new-btn');
  // 选择器是分组写法，ruleBody 只能匹配到分组最后一个；第一个用正则确认仍在同一分组里
  assert.match(mobileBlock, /body\.dsh-drawer-open \.dsh-header-menu-btn,\s*body\.dsh-drawer-open \.dsh-header-new-btn\s*\{/,
    '两个顶栏按钮应写在同一分组里');
  assert.ok(menuBtn || newBtn, '应有"抽屉打开时顶栏按钮让位"规则');
  assert.match(newBtn || '', /[;{\s]pointer-events:\s*none\s*!important/,
    '抽屉打开期间 (+) 必须不可命中，避免挡住抽屉/面板自己的关闭控件');
  // 只作用于移动端：桌面端保持宿主原样
  assert.equal(ruleBody(outsideMobile, 'body.dsh-drawer-open .dsh-header-new-btn'), null,
    '该让位规则不得出现在 <=767px 之外（桌面端不受影响）');
});

test('产物同步：client/client.js 必须包含抽屉同步 helper 与让位规则', () => {
  assert.ok(
    unescapedBundle.includes(MOBILE_STYLES_CSS),
    '产物内嵌的移动端 CSS 与源码不一致，请运行 npm run build:client',
  );
  for (const needle of [
    'MOBILE_DRAWER_CLASS',
    'readHostMobileDrawerOpen',
    'clickHostSidebarToggle',
    'setMobileDrawerOpen',
    'toggleMobileDrawer',
    'hideOpenMobilePanels',
    'syncDrawerClassFromHost',
    'syncMobileHeaderDrawerTrigger',
    'data-dsh-yield-host-drawer',
    'data-sidebar-drawer',
    'data-sidebar-collapsed',
    'button[data-sidebar-toggle], button[data-sidebar-opener]',
    'body.dsh-drawer-open .dsh-header-menu-btn',
    'body.dsh-drawer-open .dsh-header-new-btn',
  ]) {
    assert.ok(unescapedBundle.includes(needle), `产物缺少 ${needle}，疑似忘记运行 npm run build:client`);
  }
});

// ---- 用户截图确认的双图标重叠（issue #105 后续）----
//
// 现场：434px 视口下，左上角同时出现「宿主侧边栏图标」与「插件汉堡图标」，两图标重合；
// 右上角第二个小图标（y≈70）是宿主自己的右侧栏 opener，与插件 (+) 不重叠。
// 结论：宿主自带就不该再画插件的 → 用 data 属性 + CSS 隐藏插件汉堡（保留占位）。
test('CSS：宿主自带抽屉触发器时，插件自绘汉堡让位（visibility 保留占位，不挪标题）', () => {
  assert.ok(mobileBlock, '移动端媒体查询块缺失');
  const body = ruleBody(mobileBlock, '.dsh-mobile-app-header[data-dsh-yield-host-drawer] .dsh-header-menu-btn');
  assert.ok(body, '缺少「宿主自带触发器时隐藏插件汉堡」的样式规则');
  assert.match(body, /visibility:\s*hidden\s*!important/, '必须用 visibility（保留 40px 占位）而不是 display:none');
  assert.match(body, /pointer-events:\s*none\s*!important/, '隐藏后不得再拦截点击（否则宿主 opener 会被透明按钮盖住）');
  // 不得误伤桌面端或其它按钮
  assert.equal(
    ruleBody(outsideMobile, '.dsh-mobile-app-header[data-dsh-yield-host-drawer] .dsh-header-menu-btn'),
    null,
    '该规则不得出现在 <=767px 之外',
  );
  assert.doesNotMatch(body, /dsh-header-new-btn/, '右侧 (+) 不受影响（宿主 0.2.x 没有同位置的 (+)）');
});

test('让位同步：观察宿主 DOM 变化后合并重判，且不得每次变更都同步查询', () => {
  // 创建顶栏后立即同步一次 + 延迟再判（宿主 React 可能晚挂载）
  assert.match(indexSource, /document\.body\.appendChild\(header\);[\s\S]{0,500}?syncMobileHeaderDrawerTrigger\(\)/,
    '顶栏创建后必须立即同步一次让位状态');
  assert.match(indexSource, /document\.body\.appendChild\(header\);[\s\S]{0,500}?scheduleMobileHeaderDrawerTriggerSync\(\)/,
    '顶栏创建后必须安排一次延迟重判（宿主可能晚于插件挂载）');
  // 反向同步 observer 必须触发让位重判（宿主抽屉出现/消失会改 data-sidebar-drawer）
  const observerAt = indexSource.indexOf('const hostDrawerObserver = new MutationObserver');
  assert.ok(observerAt > 0, '缺少宿主抽屉 observer');
  const observerChunk = indexSource.slice(observerAt, observerAt + 700);
  assert.match(observerChunk, /syncDrawerClassFromHost\(\)/, 'observer 仍需同步抽屉 class');
  assert.match(observerChunk, /scheduleMobileHeaderDrawerTriggerSync\(\)/, 'observer 必须重判让位（宿主抽屉模式出现时要藏汉堡）');
  assert.match(observerChunk, /childList: true/, '必须观察 childList：宿主可能整体挂载/替换 AppFrame');
  // 合并（宏任务）而不是直接同步：聊天流式渲染期间 DOM 变更很密
  assert.match(indexSource, /function scheduleMobileHeaderDrawerTriggerSync\(\)[\s\S]{0,600}?setTimeout\(/, 
    '让位重判必须合并到宏任务，避免流式渲染期间反复全文档查询');
  assert.match(indexSource, /if \(headerYieldSyncPending \|\| typeof setTimeout !== 'function'\) return;/,
    '合并标志必须存在，否则每次 DOM 变更都会排队');
});

