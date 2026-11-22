// dsh-bridge 移动端体验与界面改动层的「让位与开关」机制 (Issue #52)
//
// 背景：
// dsh-bridge 为了在移动端网页访问（纯手机浏览器/局域网扫码）时提供类 App 的移动交互，
// 自建了 body 级导航条（.dsh-mobile-app-header）、输入框折叠按钮以及一套含 !important
// 的移动端全局覆盖样式。
//
// 但在以下环境，这一层自绘会引发严重冲突：
// 1. Android 原生 WebView 壳（如 com.dsharnessmobile.shell），壳层自身已有原生导航栏与手势；
// 2. 页面已安装专门的响应式插件（如 @dsh-android/dsh-client-ui-responsive），争抢同层 DOM；
// 3. 桌面端宿主（如 Tauri 桌面端 / DSH Desktop），无需任何移动端 DOM 侵入。
//
// 本模块提供「多级开关 + 自动特征探测让位」：
// 优先级：URL 参数 > 宿主全局注入配置 (__DSH_BRIDGE_CONFIG__) > 运行时动态配置 > 本地存储 > 自动探测兜底

/** 特性名称常量 */
export const FEATURES = {
  MOBILE_HEADER: 'mobileHeader',
  MOBILE_STYLES: 'mobileStyles',
  COMPOSER_COLLAPSE: 'composerCollapse',
  // 自绘顶栏左上角的「菜单/抽屉」按钮：宿主 0.2.x 自己就在同一个角落渲染了侧边栏触发器
  // （leadingSeat 的 opener），两个图标会叠在一起。默认让位给宿主，保留 DSH 自带的那一个。
  MOBILE_DRAWER_TRIGGER: 'mobileDrawerTrigger',
  // 总开关：覆盖全部页面改写动作（含设置钻取/导航图标/iOS 键盘适配等残留项，见 #56）
  PAGE_TWEAKS: 'pageTweaks',
};

// 内存中的动态运行时覆盖配置（可通过 ctx.reflect.get('dsh-bridge').configureFeatures(...) 设置）
let runtimeFeatureOverrides = {};

/**
 * 设置运行时特性覆盖（供 Cordis 反射服务调用）
 * @param {Record<string, boolean>} overrides
 */
export function setRuntimeFeatureOverrides(overrides) {
  if (overrides && typeof overrides === 'object') {
    runtimeFeatureOverrides = { ...runtimeFeatureOverrides, ...overrides };
  }
}

/**
 * 获取当前运行时特性状态
 * @returns {Record<string, boolean>}
 */
export function getRuntimeFeatureOverrides() {
  return { ...runtimeFeatureOverrides };
}

/**
 * 重置运行时特性覆盖（主要用于测试）
 */
export function resetRuntimeFeatureOverrides() {
  runtimeFeatureOverrides = {};
}

/**
 * 探测是否处于已具备自适应/原生移动顶栏的环境中
 * @returns {boolean}
 */
export function detectMobileShellOrResponsivePlugin() {
  if (typeof window === 'undefined') return false;

  // 1. 移动端原生/混合壳显式标记
  if (window.__DSH_MOBILE_SHELL__ || window.__TAURI__ || window.__DSH_DESKTOP__) {
    return true;
  }

  // 2. 已加载的移动端自适应插件标记
  if (window.__DSH_CLIENT_UI_RESPONSIVE__) {
    return true;
  }

  // 2b. 第三方移动层显式登记（issue #56 §3.4：不再靠猜全局变量）。
  // 宿主按任一约定声明即可：window.__DSH_MOBILE_LAYER__ = '<plugin-id>'
  // 或在 <html>/<body> 挂 [data-dsh-mobile-layer] / [data-dsh-mobile-ui]。
  if (typeof window.__DSH_MOBILE_LAYER__ === 'string' && window.__DSH_MOBILE_LAYER__) {
    return true;
  }

  // 3. DOM 标记探测（如 @dsh-android/dsh-client-ui-responsive 挂载的特征属性，
  // 以及第三方层按约定挂载的 data-dsh-mobile-layer / data-dsh-mobile-ui）
  if (typeof document !== 'undefined') {
    if (document.querySelector('[data-dsh-responsive-mobile]') ||
        document.querySelector('[data-dsh-mobile-shell]') ||
        document.querySelector('[data-dsh-mobile-layer]') ||
        document.querySelector('[data-dsh-mobile-ui]')) {
      return true;
    }
  }

  return false;
}

/**
 * 探测页面是否已有主顶栏（避免 body 级双顶栏叠加）
 * @returns {boolean}
 */
export function detectExistingHeader() {
  if (typeof document === 'undefined') return false;
  // 如果页面中已经有 #root 下的 header 或 banner 角色元素
  return !!document.querySelector('#root header, [role="banner"]:not(.dsh-mobile-app-header)');
}

/**
 * 解析特性开关（返回 true 表示启用，false 表示禁用/让位）
 *
 * @param {string} featureName 特性名称
 * @param {() => boolean} defaultDetector 自动探测兜底函数
 * @returns {boolean}
 */
export function isFeatureEnabled(featureName, defaultDetector) {
  if (typeof window === 'undefined') {
    return typeof defaultDetector === 'function' ? defaultDetector() : true;
  }

  // 1. URL 应急排障参数（最高优先级，支持 ?dsh_bridge_tweaks=0 或 ?dsh_mobile=off 批量禁用）
  try {
    if (window.location && window.location.search) {
      const params = new URLSearchParams(window.location.search);
      // 总开关：禁用所有页面微调
      const tweaksVal = params.get('dsh_bridge_tweaks') ?? params.get('dsh_mobile_tweaks');
      if (tweaksVal === '0' || tweaksVal === 'false' || tweaksVal === 'off') {
        return false;
      }
      if (tweaksVal === '1' || tweaksVal === 'true' || tweaksVal === 'on') {
        return true;
      }

      // 单项开关：如 ?dsh_mobile_header=0, ?dsh_mobile_styles=0, ?dsh_composer_collapse=0
      const kebabName = featureName.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
      const specificVal = params.get(`dsh_${kebabName}`) ?? params.get(`dsh_${featureName}`);
      if (specificVal === '0' || specificVal === 'false' || specificVal === 'off') {
        return false;
      }
      if (specificVal === '1' || specificVal === 'true' || specificVal === 'on') {
        return true;
      }
    }
  } catch {}

  // 2. 宿主注入的全局配置对象 window.__DSH_BRIDGE_CONFIG__
  try {
    const hostConfig = window.__DSH_BRIDGE_CONFIG__;
    if (hostConfig && typeof hostConfig === 'object') {
      if (hostConfig.disablePageTweaks === true || hostConfig.disableMobileTweaks === true ||
          hostConfig.mobileUi === false) {
        return false;
      }
      if (hostConfig.mobileUi === true) {
        return true;
      }
      if (typeof hostConfig[featureName] === 'boolean') {
        return hostConfig[featureName];
      }
    }
  } catch {}

  // 3. 动态运行时配置（通过反射 API 设置）
  if (typeof runtimeFeatureOverrides[featureName] === 'boolean') {
    return runtimeFeatureOverrides[featureName];
  }

  // 4. 本地持久化偏好 (localStorage)
  try {
    if (window.localStorage) {
      const stored = window.localStorage.getItem(`dsh_bridge:feature:${featureName}`);
      if (stored === '0' || stored === 'false') return false;
      if (stored === '1' || stored === 'true') return true;
    }
  } catch {}

  // 5. 自动探测兜底
  if (typeof defaultDetector === 'function') {
    return defaultDetector();
  }

  return true;
}

/**
 * 探测宿主是否已在移动端提供自己的「侧边栏/抽屉」触发器。
 *
 * 背景（issue #105 后续，用户截图确认）：DSH 0.2.x 在 <768px 下把侧边栏做成抽屉，
 * 并在**左上角同一个位置**（`leadingSeat`，top:11px/left:12px）渲染了自己的 opener；
 * 插件自绘顶栏的汉堡按钮也在那儿（left:16px），两个图标直接叠在一起。
 * 宿主既然自带，就保留 DSH 的，插件不再画第二个（见 shouldYieldMobileDrawerTrigger）。
 *
 * 判定口径（任一成立即视为宿主自带，均不依赖中文文案，避免踩面板 i18n 守卫）：
 *   1. 宿主 0.2.x 的稳定 data 属性 `[data-sidebar-toggle] / [data-sidebar-opener]`；
 *   2. 宿主 CSS-module 的 `leadingSeat` 容器里确实有可点的按钮（类名哈希会变，
 *      局部名 leadingSeat 稳定，仓库其它地方同样按 `[class*="..."]` 取宿主类名）；
 *   3. 英文 aria-label / title 的兜底（中文文案不在此列：那是内部匹配串，另有白名单）。
 *
 * 旧宿主（0.1.x）没有以上任何一项 → 返回 false，插件继续用自己的汉堡（不回归）。
 * @param {Document} [doc] 便于单测注入
 * @returns {boolean}
 */
export function detectHostMobileDrawerTrigger(doc = typeof document === 'undefined' ? null : document) {
  if (!doc || typeof doc.querySelector !== 'function') return false;
  try {
    if (doc.querySelector('[data-sidebar-toggle], [data-sidebar-opener]')) return true;
    if (doc.querySelector('[class*="leadingSeat"] button')) return true;
    if (doc.querySelector('button[aria-label*="Open sidebar"], button[title*="Open sidebar"]')) return true;
  } catch { /* 选择器不支持/宿主异常：按"没有自带触发器"处理，宁可多用插件自己的按钮 */ }
  return false;
}

/**
 * 是否应该让位宿主的移动端抽屉触发器（true = 隐藏插件自绘的汉堡按钮）。
 *
 * 复用统一的特性开关链（URL 参数 > 宿主注入配置 > 运行时覆盖 > localStorage > 自动探测）：
 * 自动探测为「宿主自带则让位」；用户若想强制用插件的按钮，可用
 * `?dsh_mobile_drawer_trigger=1` 或运行时 `configureFeatures({ mobileDrawerTrigger: true })`。
 * @param {boolean} [hostHasOwnTrigger] 宿主是否自带触发器（默认现查 DOM）
 * @returns {boolean}
 */
export function shouldYieldMobileDrawerTrigger(hostHasOwnTrigger = detectHostMobileDrawerTrigger()) {
  return !isFeatureEnabled(FEATURES.MOBILE_DRAWER_TRIGGER, () => !hostHasOwnTrigger);
}

/**
 * 是否应该让位自绘顶栏 (返回 true 表示让位/不自建顶栏)
 * @returns {boolean}
 */
export function shouldYieldMobileHeader() {
  return !isFeatureEnabled(FEATURES.MOBILE_HEADER, () => {
    // 自动判定：如果是移动端壳层/已有自适应插件/页面已有顶栏，则主动让位
    return !detectMobileShellOrResponsivePlugin();
  });
}

/**
 * 是否应该让位移动端全局样式 (返回 true 表示让位/不注入样式)
 * @returns {boolean}
 */
export function shouldYieldMobileStyles() {
  return !isFeatureEnabled(FEATURES.MOBILE_STYLES, () => {
    // 自动判定：如果已被外部响应式插件完全接管，则让位全局样式
    return !detectMobileShellOrResponsivePlugin();
  });
}

/**
 * 总开关：是否应该让位全部页面改写动作 (返回 true 表示跳过 drilldown/导航图标/
 * iOS 键盘适配/折叠按钮/移动体验等所有页面侧改动，见 #56 §2.2)。
 * 服务端 mobileUi:false 会经 head 注入的 __DSH_BRIDGE_CONFIG__ 生效，宿主也可在
 * 加载阶段直接声明，时机早于 apply()（包级别 opt-in，见 #56 §4）。
 * @returns {boolean}
 */
export function shouldYieldAllPageTweaks() {
  return !isFeatureEnabled(FEATURES.PAGE_TWEAKS, () => true);
}

/**
 * 是否应该让位输入框折叠按钮 (返回 true 表示让位/不挂载折叠按钮)
 * @returns {boolean}
 */
export function shouldYieldComposerCollapse() {
  return !isFeatureEnabled(FEATURES.COMPOSER_COLLAPSE, () => {
    // 自动判定：移动端壳层下输入框折叠按钮容易与原生交互冲突，让位
    return !detectMobileShellOrResponsivePlugin();
  });
}
