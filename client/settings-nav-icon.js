// dsh-bridge 设置页左侧导航栏图标定制 (替换默认小齿轮)
//
// 背景：
// DSH 0.1.x 的设置弹窗外壳（@deepseek-ai/dsh-client-ui-settings-general）仅内置了原生
// 三个 section 的图标（models, agent-presets, plugins），对第三方插件注册的 settings.section，
// 外壳一律 fallback 显示其默认的小齿轮图标（gear）。
//
// 解决方案（对齐 dshmarket 与 dsh-better-sidebar）：
// 监听设置弹窗挂载，定位到文本匹配「远程访问」的 nav 按钮，通过 CSS mask 将原生齿轮
// 替换为专属的「手机 + 远程无线连接」矢量图标，颜色跟随 currentColor 保持原生悬停与激活态一致。
//
// 选择器策略（Issue #72）：以结构锚点 `[role="dialog"] nav button` 为主——它不依赖任何
// CSS-module 哈希，0.1.x 与 0.2.0 实测都命中；宿主前缀（VOzbGW_ / wCInkW_）改由
// client/host-families.js 运行时解析，仅在解析成功时作为补充选择器。
import { ABSENT_FAMILY } from './host-families.js';

export const SETTINGS_NAV_MARKER = 'data-dsh-bridge-settings-nav';

/**
 * 远程访问专属图标：手机 + 无线连接电波 (24x24 viewBox)
 */
export const REMOTE_NAV_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect width='10' height='16' x='3' y='4' rx='2'/><path d='M7 16h2'/><path d='M17 8a4 4 0 0 1 0 8'/><path d='M20 5a8 8 0 0 1 0 14'/></svg>`;

/**
 * 生成导航栏图标样式
 * @param {string} [customSvg] 可选自定义 SVG 字符串
 * @returns {string}
 */
export function getNavIconCss(customSvg = REMOTE_NAV_SVG) {
  const maskUrl = `data:image/svg+xml,${encodeURIComponent(customSvg)}`;
  return `
[${SETTINGS_NAV_MARKER}] > svg:first-child {
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
 * 注册设置页导航图标适配器
 *
 * @param {() => string} [resolveLabel] 获取当前标签文本的回调
 * @param {() => Record<string,string>} [resolveFamilies] 取运行时解析出的宿主 CSS-module
 *   前缀表（见 client/host-families.js）。拿不到时退回纯结构锚点 `[role="dialog"] nav button`
 *   —— 该锚点在 0.1.x 与 0.2.0 实测都命中，故即使前缀完全解析失败，本功能也不受影响。
 * @returns {() => void} 清理函数
 */
export function registerSettingsNavIcon(resolveLabel = () => '远程访问', resolveFamilies = null) {
  if (typeof document === 'undefined') return () => {};

  const styleId = 'dsh-bridge-settings-nav-icon-style';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.dataset.plugin = '@wenbin_wb/dsh-bridge';
    style.dataset.pluginCss = '@wenbin_wb/dsh-bridge/settings-nav-icon';
    style.textContent = getNavIconCss();
    document.head.appendChild(style);
  }

  let disposed = false;
  const sync = () => {
    if (disposed) return;
    const currentLabel = typeof resolveLabel === 'function' ? resolveLabel().trim() : '远程访问';
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
    const styleEl = document.getElementById(styleId);
    if (styleEl) styleEl.remove();
  };
}
