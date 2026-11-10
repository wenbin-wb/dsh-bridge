// 回归测试：设置页左侧导航栏图标定制 (替换默认小齿轮)
//
// issue #106：DSH 0.2.2 起宿主把设置行图标包进 span（不再直属 button），并新增官方
// settings.section.icon 插槽。本用例锁死三件事：
//   1. CSS 兜底同时兼容新旧 DOM（`> svg:first-child` + `> span:first-child`）；
//   2. 官方插槽接管后 CSS 兜底整体退出（互斥），未接管时行为与改造前一致；
//   3. 插槽组件与注册接线存在且图标跟随 currentColor（宿主激活态可着色）。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SETTINGS_NAV_MARKER,
  SETTINGS_NAV_ICON_STYLE_ID,
  REMOTE_NAV_ICON_SHAPES,
  getNavIconCss,
  registerSettingsNavIcon,
  markSettingsNavIconSlotActive,
  isSettingsNavIconSlotActive,
} from '../client/settings-nav-icon.js';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const bundle = readFileSync(resolve(repoRoot, 'client/client.js'), 'utf8');
const unescapedBundle = bundle.replace(
  /\\u([0-9a-fA-F]{4})|\\x([0-9a-fA-F]{2})/g,
  (_, u, x) => String.fromCharCode(parseInt(u ?? x, 16)),
);
const indexSource = readFileSync(resolve(repoRoot, 'client/index.js'), 'utf8');

const markerSelector = new RegExp(`\\[${SETTINGS_NAV_MARKER}\\]`);

/**
 * 构造一个够用的 document 替身：style 元素登记、head 追加、按钮查询。
 * @param {{textContent: string}[]} buttons 模拟 nav 按钮
 */
function createFakeDocument(buttons) {
  const headChildren = [];
  const styleElements = [];
  const doc = {
    headChildren,
    styleElements,
    getElementById(id) {
      return styleElements.find((s) => s.id === id) || null;
    },
    createElement(tag) {
      const el = {
        tagName: tag,
        id: '',
        dataset: {},
        textContent: '',
        remove() {
          const idx = styleElements.indexOf(this);
          if (idx !== -1) styleElements.splice(idx, 1);
        },
      };
      if (tag === 'style') styleElements.push(el);
      return el;
    },
    head: {
      appendChild(node) {
        headChildren.push(node);
      },
    },
    querySelectorAll(selector) {
      if (selector.includes('nav button')) return buttons;
      if (selector.includes(SETTINGS_NAV_MARKER)) {
        return buttons.filter((b) => b.hasAttribute(SETTINGS_NAV_MARKER));
      }
      return [];
    },
  };
  return doc;
}

/** 构造一个够用的 nav 按钮替身。 */
function createButton(textContent) {
  return {
    textContent,
    attrs: {},
    setAttribute(k, v) { this.attrs[k] = v; },
    removeAttribute(k) { delete this.attrs[k]; },
    hasAttribute(k) { return k in this.attrs; },
  };
}

test('getNavIconCss 生成正确的遮罩与样式规则（新旧 DOM 双兜底）', () => {
  const css = getNavIconCss();
  assert.match(css, markerSelector);
  assert.match(css, /display:\s*none\s*!important/);
  assert.match(css, /background-color:\s*currentColor/);
  assert.match(css, /mask:\s*url\("data:image\/svg\+xml/);
  // 旧版 DSH：图标 SVG 直属 button
  assert.match(css, new RegExp(`\\[${SETTINGS_NAV_MARKER}\\]\\s*>\\s*svg:first-child`));
  // DSH 0.2.2：图标 SVG 包在第一个子 span 里（label 是第二个 span），issue #106
  assert.match(css, new RegExp(`\\[${SETTINGS_NAV_MARKER}\\]\\s*>\\s*span:first-child`));
  // 两条隐藏规则都必须以插件标记为前提，绝不能变成全局规则
  assert.match(css, new RegExp(
    `\\[${SETTINGS_NAV_MARKER}\\]\\s*>\\s*svg:first-child,\\s*\\n`
    + `\\[${SETTINGS_NAV_MARKER}\\]\\s*>\\s*span:first-child\\s*\\{\\s*\\n\\s*display: none !important;`,
  ));
});

test('插槽组件：渲染 16px currentColor 手机图标，并把 CSS 兜底标记为已接管', () => {
  // client/index.js 顶层依赖宿主 React，无法直接 import；按 panel-i18n 测试的既有做法，
  // 从源码切片真实执行组件（用桩 h / mark 替换打包注入的依赖）。
  const start = indexSource.indexOf('const NAV_ICON_DEFAULT_SIZE');
  const fnStart = indexSource.indexOf('function SettingsNavIconSlot', start);
  assert.ok(start > 0 && fnStart > start, '应能在 client/index.js 里定位插槽图标组件');
  const end = indexSource.indexOf('\n}\n', fnStart);
  assert.ok(end > fnStart, '应能定位组件函数体的结尾');
  const snippet = indexSource.slice(start, end + 2);

  let marked = 0;
  const h = (type, props = {}, ...children) => ({ type, props, children });
  // 桩 React：layout effect 立即执行（真实宿主里它在 DOM 提交后、绘制前同步执行）
  const ReactStub = { useLayoutEffect: (callback) => { callback(); } };
  const factory = new Function('React', 'h', 'markSettingsNavIconSlotActive', 'REMOTE_NAV_ICON_SHAPES',
    `${snippet}\nreturn SettingsNavIconSlot;`);
  const SettingsNavIconSlot = factory(ReactStub, h, () => { marked += 1; }, REMOTE_NAV_ICON_SHAPES);

  const tree = SettingsNavIconSlot({ size: 16, active: true });
  assert.equal(marked, 1, '组件提交时必须调用 markSettingsNavIconSlotActive()');
  assert.equal(tree.type, 'svg');
  assert.equal(tree.props.width, 16);
  assert.equal(tree.props.height, 16);
  assert.equal(tree.props.stroke, 'currentColor', 'stroke 必须是 currentColor 才能跟宿主激活态颜色');
  assert.equal(tree.props.fill, 'none');
  assert.equal(tree.props['aria-hidden'], 'true');
  // 子节点以数组形式传入（真实 React 会拍平）；这里拍平后校验图元
  const shapes = tree.children.flat();
  assert.equal(shapes.length, REMOTE_NAV_ICON_SHAPES.length, '图元必须与 CSS mask 共用同一份几何定义');
  assert.equal(shapes[0].type, 'rect');
  assert.equal(shapes[1].type, 'path');
  assert.equal(shapes[1].props.d, 'M7 16h2');
  // 宿主传入异常 size 时回落到默认 16，不得渲染成 NaN/0 尺寸
  assert.equal(SettingsNavIconSlot({ size: 'oops' }).props.width, 16);
});

test('registerSettingsNavIcon 正确标记「远程访问」行并支持安全销毁', () => {
  const previousDocument = global.document;
  const buttons = [createButton(' 通用设置 '), createButton('远程访问'), createButton('模型服务')];
  const doc = createFakeDocument(buttons);
  global.document = doc;

  try {
    const cleanup = registerSettingsNavIcon(() => '远程访问');

    // 验证 style 标签是否注入
    assert.equal(doc.styleElements.length, 1);
    assert.equal(doc.styleElements[0].id, SETTINGS_NAV_ICON_STYLE_ID);

    // 验证按钮标记状态
    assert.equal(SETTINGS_NAV_MARKER in buttons[0].attrs, false, '通用设置不应被标记');
    assert.equal(SETTINGS_NAV_MARKER in buttons[1].attrs, true, '远程访问必须被标记专属属性');
    assert.equal(SETTINGS_NAV_MARKER in buttons[2].attrs, false, '模型服务不应被标记');

    // 验证清理函数
    cleanup();
    assert.equal(SETTINGS_NAV_MARKER in buttons[1].attrs, false, '清理后属性必须移除');
    assert.equal(doc.styleElements.length, 0, '清理后 style 标签必须移除');
  } finally {
    global.document = previousDocument;
  }
});

// 注意：本用例会置位模块级「插槽已接管」标记且不可逆，必须排在所有
// registerSettingsNavIcon 行为用例之后（node:test 顶层用例按声明顺序串行执行）。
test('官方插槽接管后：CSS 兜底整体退出，不再出现第二个图标', () => {
  const previousDocument = global.document;
  const buttons = [createButton('远程访问')];
  const doc = createFakeDocument(buttons);
  global.document = doc;

  try {
    assert.equal(isSettingsNavIconSlotActive(), false, '前置用例不得提前置位接管标记');
    const cleanup = registerSettingsNavIcon(() => '远程访问');
    assert.equal(doc.styleElements.length, 1);
    assert.equal(SETTINGS_NAV_MARKER in buttons[0].attrs, true, '接管前仍走 CSS 兜底');

    // 插槽组件渲染 → 置位接管标记
    markSettingsNavIconSlotActive();
    assert.equal(isSettingsNavIconSlotActive(), true);
    assert.equal(doc.styleElements.length, 0, '接管后必须移除 CSS 兜底样式元素');
    assert.equal(SETTINGS_NAV_MARKER in buttons[0].attrs, false, '接管后必须清掉按钮上的兜底标记');

    // 再次注册（例如插件重新激活）不得把兜底 CSS 加回来
    const cleanupAgain = registerSettingsNavIcon(() => '远程访问');
    assert.equal(doc.styleElements.length, 0, '接管后不得再注入兜底 CSS');
    assert.equal(SETTINGS_NAV_MARKER in buttons[0].attrs, false, '接管后不得重新打标记');

    // 幂等：重复调用无副作用
    markSettingsNavIconSlotActive();
    assert.equal(doc.styleElements.length, 0);

    cleanup();
    cleanupAgain();
    assert.equal(doc.styleElements.length, 0);
  } finally {
    global.document = previousDocument;
  }
});

test('client/index.js 接线：官方插槽 id 与设置行 id 一致（only 过滤命中）', () => {
  // 宿主渲染口径：renderSlot('settings.section.icon', { size, active }, { only: row.id })，
  // row.id 来自 settings.section 注册项的 options.id，故两处 id 必须都是 'dsh-bridge'。
  assert.match(indexSource, /ctx\.slots\.inject\('settings\.section\.icon'/);
  assert.match(indexSource, /name: 'settings\.section\.icon', id: 'dsh-bridge', order: 10/);
  assert.ok(indexSource.includes("name: 'settings.section',\n          id: 'dsh-bridge'"),
    'settings.section 与 settings.section.icon 的行 id 必须一致');
  // 旧版 DSH 无该槽位 → inject 不触发；只有插槽声明后才会走到注册，属安全降级。
  assert.match(indexSource, /const NAV_ICON_DEFAULT_SIZE = 16;/);
  assert.match(indexSource, /markSettingsNavIconSlotActive\(\)/);
});

test('client/client.js 必须同步包含专属图标、标记与插槽注册', () => {
  assert.match(unescapedBundle, new RegExp(SETTINGS_NAV_MARKER));
  assert.match(unescapedBundle, new RegExp(SETTINGS_NAV_ICON_STYLE_ID));
  // issue #106：官方插槽注册与新旧 DOM 双兜底必须进入打包产物
  assert.match(unescapedBundle, /settings\.section\.icon/);
  assert.match(unescapedBundle, /> span:first-child/);
  assert.match(unescapedBundle, /markSettingsNavIconSlotActive/);
  // issue #108：cloudflared 支持窗口提示的接线与词条键必须进入打包产物
  assert.match(unescapedBundle, /binary\.outdated/);
  assert.match(unescapedBundle, /supportedUntil/);
  assert.match(unescapedBundle, /cloudflared 版本已超出 Cloudflare 一年支持窗口/);
});
