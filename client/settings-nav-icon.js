// dsh-bridge 设置页左侧导航栏图标定制 (替换默认小齿轮)
//
// 背景：
// DSH 0.1.x 的设置弹窗外壳（@deepseek-ai/dsh-client-ui-settings-general）仅内置了原生
// 三个 section 的图标（models, agent-presets, plugins），对第三方插件注册的 settings.section，
// 外壳一律 fallback 显示其默认的小齿轮图标（gear）。
//
// 方案（两套，互斥）：
//   ① 官方插槽（DSH >= 0.2.2）：外壳把每行图标渲染进 settings.section.icon 插槽
//      （kind: list, scope: root, inline: true），插件注册自己的 React 图标组件即可，
//      宿主不再画齿轮 fallback。实现见 client/index.js 的 SettingsNavIconSlot。
//   ② CSS 兜底（0.1.x / 0.2.0 等无该插槽的版本）：监听设置弹窗挂载，定位到文本匹配
//      「远程访问」的 nav 按钮，通过 CSS mask 把宿主图标替换为专属的「手机 + 无线信号」
//      矢量图标，颜色跟随 currentColor，保持原生悬停/激活态一致。
//
// 互斥（issue #106）：0.2.2 把图标 SVG 包进了 span（不再直属 button），旧选择器
// `> svg:first-child` 匹配不到 → 宿主齿轮与插件 ::before 手机会同时显示；而插槽生效后
// 宿主连齿轮 fallback 都不再渲染 → 若 CSS 兜底继续生效，同样会变成「两个插件图标」。
// 因此插槽组件提交时（layout effect，绘制前）调用 markSettingsNavIconSlotActive()：
// 置位后 CSS 兜底永久退出（移除样式元素 + 按钮标记），未接管（旧版 DSH）时行为与
// 改造前完全一致。
//
// 选择器策略（Issue #72）：以结构锚点 `[role="dialog"] nav button` 为主——它不依赖任何
// CSS-module 哈希，0.1.x 与 0.2.0 实测都命中；宿主前缀（VOzbGW_ / wCInkW_）改由
// client/host-families.js 运行时解析，仅在解析成功时作为补充选择器。
import { ABSENT_FAMILY } from './host-families.js';
import { t } from './locales.mjs';

export const SETTINGS_NAV_MARKER = 'data-dsh-bridge-settings-nav';
export const SETTINGS_NAV_ICON_STYLE_ID = 'dsh-bridge-settings-nav-icon-style';

/**
 * 远程访问专属图标的图元（手机 + 无线信号，24x24 viewBox）。
 * CSS mask（旧版兜底）与官方插槽的 React 组件（0.2.2+）共用这一份几何定义，
 * 避免两套图标在视觉上漂移。
 * @type {Array<[string, Record<string, string|number>]>}
 */
export const REMOTE_NAV_ICON_SHAPES = [
  ['rect', { width: 10, height: 16, x: 3, y: 4, rx: 2 }],
  ['path', { d: 'M7 16h2' }],
  ['path', { d: 'M17 8a4 4 0 0 1 0 8' }],
  ['path', { d: 'M20 5a8 8 0 0 1 0 14' }],
];

const REMOTE_NAV_SHAPES_SVG = REMOTE_NAV_ICON_SHAPES
  .map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).map(([key, value]) => `${key}='${value}'`).join(' ')}/>`)
  .join('');

/**
 * 供 CSS mask 使用的 SVG 字符串（24x24）。
 * mask 取的是 alpha 通道，stroke 颜色本身不参与显示，最终颜色由 currentColor 决定。
 */
export const REMOTE_NAV_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>${REMOTE_NAV_SHAPES_SVG}</svg>`;

/**
 * 官方插槽（settings.section.icon）是否已接管图标。
 * 一旦置位就不可逆：同一页面生命周期内宿主始终提供该插槽，CSS 兜底不应再复活。
 */
let navIconSlotActive = false;

/** 官方插槽是否已接管图标（供测试与诊断使用）。 */
export function isSettingsNavIconSlotActive() {
  return navIconSlotActive;
}

/**
 * 标记「官方 settings.section.icon 插槽已接管插件图标」（issue #106）。
 *
 * 由 client/index.js 的插槽组件在提交时（layout effect）调用：宿主已用插槽渲染插件
 * 自己的图标后，隐藏宿主图标 + ::before 画图标的 CSS 兜底必须整体退出，否则会出现
 * 两个图标。幂等；重复调用无副作用。
 */
export function markSettingsNavIconSlotActive() {
  if (navIconSlotActive) return;
  navIconSlotActive = true;
  if (typeof document === 'undefined') return;
  // 清掉可能已经打上的兜底标记（插槽渲染前 MutationObserver 可能已标记过一帧）
  document.querySelectorAll(`[${SETTINGS_NAV_MARKER}]`).forEach((el) => el.removeAttribute(SETTINGS_NAV_MARKER));
  const styleEl = document.getElementById(SETTINGS_NAV_ICON_STYLE_ID);
  if (styleEl) styleEl.remove();
}

/**
 * 生成导航栏图标样式
 * @param {string} [customSvg] 可选自定义 SVG 字符串
 * @returns {string}
 */
export function getNavIconCss(customSvg = REMOTE_NAV_SVG) {
  const maskUrl = `data:image/svg+xml,${encodeURIComponent(customSvg)}`;
  return `
[${SETTINGS_NAV_MARKER}] > svg:first-child,
[${SETTINGS_NAV_MARKER}] > span:first-child {
  display: none !important;
}
[${SETTINGS_NAV_MARKER}]::before {
  content: '';
  flex: none;
  width: 16px;
  height: 16px;
  background-color: currentColor;
  -webkit-mask: url("${maskUrl}") center / contain no-repeat;
  mask: url("${maskUrl}") center / contain no-repeat;
}
`;
}

/**
 * 注册设置页导航图标适配器（CSS 兜底，仅用于没有 settings.section.icon 插槽的旧版 DSH）
 *
 * @param {() => string} [resolveLabel] 获取当前标签文本的回调
 * @param {() => Record<string,string>} [resolveFamilies] 取运行时解析出的宿主 CSS-module
 *   前缀表（见 client/host-families.js）。拿不到时退回纯结构锚点 `[role="dialog"] nav button`
 *   —— 该锚点在 0.1.x 与 0.2.0 实测都命中，故即使前缀完全解析失败，本功能也不受影响。
 * @returns {() => void} 清理函数
 */
export function registerSettingsNavIcon(resolveLabel = () => t('远程访问'), resolveFamilies = null) {
  if (typeof document === 'undefined') return () => {};
  // 官方插槽已接管：CSS 兜底必须整体退出，连样式元素都不能再注入（否则会出现两个图标）
  if (navIconSlotActive) return () => {};

  if (!document.getElementById(SETTINGS_NAV_ICON_STYLE_ID)) {
    const style = document.createElement('style');
    style.id = SETTINGS_NAV_ICON_STYLE_ID;
    style.dataset.plugin = '@wenbin_wb/dsh-bridge';
    style.dataset.pluginCss = '@wenbin_wb/dsh-bridge/settings-nav-icon';
    style.textContent = getNavIconCss();
    document.head.appendChild(style);
  }

  let disposed = false;
  const sync = () => {
    if (disposed || navIconSlotActive) return;
    const currentLabel = typeof resolveLabel === 'function' ? resolveLabel().trim() : t('远程访问');
    // 结构锚点优先（版本无关）；解析到前缀时再补一条同族选择器，覆盖 nav 结构变化的宿主
    const families = typeof resolveFamilies === 'function' ? (resolveFamilies() || {}) : {};
    const settingsFamily = families.SETTINGS;
    const selector = settingsFamily && settingsFamily !== ABSENT_FAMILY
      ? `[role="dialog"] nav button, div[class*="${settingsFamily}_nav"] button`
      : '[role="dialog"] nav button';
    const buttons = document.querySelectorAll(selector);
    for (const button of buttons) {
      const text = button.textContent?.trim() || '';
      if (currentLabel.length > 0 && (text === currentLabel || text.includes(currentLabel))) {
        button.setAttribute(SETTINGS_NAV_MARKER, '');
      } else if (button.hasAttribute(SETTINGS_NAV_MARKER)) {
        button.removeAttribute(SETTINGS_NAV_MARKER);
      }
    }
  };

  sync();
  let observer = null;
  if (typeof MutationObserver !== 'undefined') {
    observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  return () => {
    disposed = true;
    if (observer) observer.disconnect();
    document.querySelectorAll(`[${SETTINGS_NAV_MARKER}]`).forEach((el) => el.removeAttribute(SETTINGS_NAV_MARKER));
    const styleEl = document.getElementById(SETTINGS_NAV_ICON_STYLE_ID);
    if (styleEl) styleEl.remove();
  };
}
