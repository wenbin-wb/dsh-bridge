// 回归测试（Issue #52）：移动端体验与界面改动层的让位与多级开关
//
// 覆盖三层：
//   1. 行为断言：环境探测、URL 参数、全局配置、运行时配置、localStorage 优先级
//   2. 结构断言：调用点在 client/index.js 中的位置及守卫
//   3. 产物同步断言：client/client.js 必须包含最新的让位逻辑
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FEATURES,
  detectHostMobileDrawerTrigger,
  detectMobileShellOrResponsivePlugin,
  shouldYieldMobileDrawerTrigger,
  shouldYieldMobileHeader,
  shouldYieldMobileStyles,
  shouldYieldComposerCollapse,
  shouldYieldAllPageTweaks,
  setRuntimeFeatureOverrides,
  getRuntimeFeatureOverrides,
  resetRuntimeFeatureOverrides,
} from '../client/mobile-yield.js';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const indexSource = readFileSync(resolve(repoRoot, 'client/index.js'), 'utf8');
const bundle = readFileSync(resolve(repoRoot, 'client/client.js'), 'utf8');
const unescapedBundle = bundle.replace(
  /\\u([0-9a-fA-F]{4})|\\x([0-9a-fA-F]{2})/g,
  (_, u, x) => String.fromCharCode(parseInt(u ?? x, 16)),
);

function setupMockBrowser(opts = {}) {
  const previousWindow = global.window;
  const previousDocument = global.document;

  const mockLocation = {
    search: opts.search || '',
  };
  const mockLocalStorage = {
    _data: { ...opts.localStorage },
    getItem(key) { return this._data[key] ?? null; },
    setItem(key, val) { this._data[key] = String(val); },
    removeItem(key) { delete this._data[key]; },
  };

  const mockDoc = {
    querySelector(selector) {
      if (opts.matchingSelectors && opts.matchingSelectors.includes(selector)) {
        return { selector };
      }
      return null;
    },
  };

  global.window = {
    location: mockLocation,
    localStorage: mockLocalStorage,
    ...opts.windowProps,
  };
  global.document = mockDoc;

  return () => {
    global.window = previousWindow;
    global.document = previousDocument;
    resetRuntimeFeatureOverrides();
  };
}

// ---------- 1. 行为断言：环境特征自动探测 ----------

test('纯 Web 默认环境：未探测到壳层或竞争插件，不让位', () => {
  const cleanup = setupMockBrowser();
  try {
    assert.equal(detectMobileShellOrResponsivePlugin(), false);
    assert.equal(shouldYieldMobileHeader(), false, '默认不让位 header');
    assert.equal(shouldYieldMobileStyles(), false, '默认不让位 styles');
    assert.equal(shouldYieldComposerCollapse(), false, '默认不让位 composer collapse');
  } finally {
    cleanup();
  }
});

test('Android 移动壳环境（window.__DSH_MOBILE_SHELL__）：主动让位', () => {
  const cleanup = setupMockBrowser({
    windowProps: { __DSH_MOBILE_SHELL__: true },
  });
  try {
    assert.equal(detectMobileShellOrResponsivePlugin(), true);
    assert.equal(shouldYieldMobileHeader(), true, 'Android 壳下必须让位 header，防双顶栏');
    assert.equal(shouldYieldMobileStyles(), true, 'Android 壳下让位移动端全局覆盖样式');
    assert.equal(shouldYieldComposerCollapse(), true, 'Android 壳下让位折叠按钮');
  } finally {
    cleanup();
  }
});

test('桌面宿主环境（window.__TAURI__ 或 window.__DSH_DESKTOP__）：主动让位', () => {
  const cleanupTauri = setupMockBrowser({
    windowProps: { __TAURI__: true },
  });
  try {
    assert.equal(detectMobileShellOrResponsivePlugin(), true);
    assert.equal(shouldYieldMobileHeader(), true);
  } finally {
    cleanupTauri();
  }

  const cleanupDesktop = setupMockBrowser({
    windowProps: { __DSH_DESKTOP__: true },
  });
  try {
    assert.equal(detectMobileShellOrResponsivePlugin(), true);
    assert.equal(shouldYieldMobileHeader(), true);
  } finally {
    cleanupDesktop();
  }
});

test('已有移动自适应插件（window.__DSH_CLIENT_UI_RESPONSIVE__ 或 DOM 属性）：主动让位', () => {
  const cleanupJs = setupMockBrowser({
    windowProps: { __DSH_CLIENT_UI_RESPONSIVE__: true },
  });
  try {
    assert.equal(detectMobileShellOrResponsivePlugin(), true);
    assert.equal(shouldYieldMobileHeader(), true);
  } finally {
    cleanupJs();
  }

  const cleanupDom = setupMockBrowser({
    matchingSelectors: ['[data-dsh-responsive-mobile]'],
  });
  try {
    assert.equal(detectMobileShellOrResponsivePlugin(), true);
    assert.equal(shouldYieldMobileHeader(), true);
  } finally {
    cleanupDom();
  }
});

// ---------- 2. 行为断言：多级开关与覆盖优先级 ----------

test('URL 应急排障开关 ?dsh_bridge_tweaks=0：强制让位所有页面微调', () => {
  const cleanup = setupMockBrowser({
    search: '?dsh_bridge_tweaks=0',
  });
  try {
    assert.equal(shouldYieldMobileHeader(), true);
    assert.equal(shouldYieldMobileStyles(), true);
    assert.equal(shouldYieldComposerCollapse(), true);
  } finally {
    cleanup();
  }
});

test('URL 单项排障开关 ?dsh_mobile_header=0：仅让位 header', () => {
  const cleanup = setupMockBrowser({
    search: '?dsh_mobile_header=0',
  });
  try {
    assert.equal(shouldYieldMobileHeader(), true, 'header 让位');
    assert.equal(shouldYieldMobileStyles(), false, 'styles 依然保留');
  } finally {
    cleanup();
  }
});

test('URL 强制启用 ?dsh_mobile_header=1：即使在壳层环境下也强制不让位', () => {
  const cleanup = setupMockBrowser({
    search: '?dsh_mobile_header=1',
    windowProps: { __DSH_MOBILE_SHELL__: true },
  });
  try {
    assert.equal(shouldYieldMobileHeader(), false, 'URL 优先级高于自动探测');
  } finally {
    cleanup();
  }
});

test('宿主全局配置 window.__DSH_BRIDGE_CONFIG__：支持批量与细粒度开关', () => {
  const cleanup1 = setupMockBrowser({
    windowProps: {
      __DSH_BRIDGE_CONFIG__: { disablePageTweaks: true },
    },
  });
  try {
    assert.equal(shouldYieldMobileHeader(), true);
    assert.equal(shouldYieldMobileStyles(), true);
  } finally {
    cleanup1();
  }

  const cleanup2 = setupMockBrowser({
    windowProps: {
      __DSH_BRIDGE_CONFIG__: { mobileHeader: false, mobileStyles: true },
    },
  });
  try {
    assert.equal(shouldYieldMobileHeader(), true);
    assert.equal(shouldYieldMobileStyles(), false);
  } finally {
    cleanup2();
  }
});

test('运行时反射配置 setRuntimeFeatureOverrides：动态开关支持', () => {
  const cleanup = setupMockBrowser();
  try {
    assert.equal(shouldYieldMobileHeader(), false);
    setRuntimeFeatureOverrides({ mobileHeader: false });
    assert.deepEqual(getRuntimeFeatureOverrides(), { mobileHeader: false });
    assert.equal(shouldYieldMobileHeader(), true, '动态配置覆盖生效');
  } finally {
    cleanup();
  }
});

// ---------- 3. 结构与产物断言 ----------

test('client/index.js 必须引入并在关键入口守卫 mobile yield 判定', () => {
  assert.match(indexSource, /shouldYieldMobileHeader/);
  assert.match(indexSource, /shouldYieldMobileStyles/);
  assert.match(indexSource, /shouldYieldComposerCollapse/);

  // 必须在 injectMobileStyles 开头守卫
  assert.match(
    indexSource,
    /function\s+injectMobileStyles\s*\(\)\s*\{[\s\S]*?if\s*\(\s*shouldYieldMobileStyles\(\)\s*\)\s*return;/,
  );
  // 必须在 setupMobileExperience 开头守卫
  assert.match(
    indexSource,
    /function\s+setupMobileExperience\s*\([^)]*\)\s*\{[\s\S]*?if\s*\(\s*shouldYieldMobileHeader\(\)\s*\)\s*return;/,
  );
  // 必须在 setupComposerCollapse 开头守卫
  assert.match(
    indexSource,
    /function\s+setupComposerCollapse\s*\(\)\s*\{[\s\S]*?if\s*\(\s*shouldYieldComposerCollapse\(\)\s*\)\s*return;/,
  );
});

test('client/client.js 打包产物必须同步包含让位逻辑', () => {
  assert.match(unescapedBundle, /shouldYieldMobileHeader/);
  assert.match(unescapedBundle, /shouldYieldMobileStyles/);
  assert.match(unescapedBundle, /shouldYieldComposerCollapse/);
  assert.match(unescapedBundle, /__DSH_MOBILE_SHELL__/);
});

// ---------- 4. 回归测试（Issue #56）：第三方层登记 + 包级总开关 ----------

test('#56 第三方移动层显式登记 window.__DSH_MOBILE_LAYER__ 即让位', () => {
  const cleanup = setupMockBrowser({ windowProps: { __DSH_MOBILE_LAYER__: 'dsh-tauri-mobile-ui' } });
  try {
    assert.equal(detectMobileShellOrResponsivePlugin(), true);
    assert.equal(shouldYieldMobileHeader(), true);
    assert.equal(shouldYieldMobileStyles(), true);
  } finally {
    cleanup();
  }
});

test('#56 第三方 DOM 标记 [data-dsh-mobile-layer] / [data-dsh-mobile-ui] 即让位', () => {
  for (const sel of ['[data-dsh-mobile-layer]', '[data-dsh-mobile-ui]']) {
    const cleanup = setupMockBrowser({ matchingSelectors: [sel] });
    try {
      assert.equal(detectMobileShellOrResponsivePlugin(), true, sel);
    } finally {
      cleanup();
    }
  }
});

test('#56 宿主 mobileUi:false 即关闭整层页面改写（含总开关）', () => {
  const cleanup = setupMockBrowser({ windowProps: { __DSH_BRIDGE_CONFIG__: { mobileUi: false } } });
  try {
    assert.equal(shouldYieldAllPageTweaks(), true);
    assert.equal(shouldYieldMobileHeader(), true);
    assert.equal(shouldYieldComposerCollapse(), true);
  } finally {
    cleanup();
  }
});

test('#56 纯 Web 默认环境下总开关保持开启（不误伤正常用户）', () => {
  const cleanup = setupMockBrowser();
  try {
    assert.equal(shouldYieldAllPageTweaks(), false);
    assert.equal(FEATURES.PAGE_TWEAKS, 'pageTweaks');
  } finally {
    cleanup();
  }
});

test('#56 apply() 必须经总开关守卫全部页面改写入口', () => {
  assert.match(indexSource, /shouldYieldAllPageTweaks/);
  assert.match(indexSource, /pageTweaksOn/);
  // 残留项（钻取/导航图标/iOS 适配）必须包在总开关内，而非无条件执行
  assert.match(indexSource, /if\s*\(\s*pageTweaksOn\s*\)\s*\{[\s\S]*?setupSettingsDrilldown\(\)/);
  assert.match(indexSource, /if\s*\(\s*pageTweaksOn\s*\)\s*\{[\s\S]*?setupMobileExperience\(rpcCall,\s*ctx\)/);
});

test('#56 打包产物必须同步包含登记标记与总开关', () => {
  assert.match(unescapedBundle, /__DSH_MOBILE_LAYER__/);
  assert.match(unescapedBundle, /data-dsh-mobile-layer/);
  assert.match(unescapedBundle, /shouldYieldAllPageTweaks/);
});

test('设置面板可见开关 PageTweaksCard 必须存在并走 uiUpdateConfig', () => {
  assert.match(indexSource, /function PageTweaksCard/);
  assert.match(indexSource, /uiUpdateConfig/);
  assert.match(indexSource, /dsh_bridge:feature:pageTweaks/);
  assert.match(unescapedBundle, /PageTweaksCard/);
  assert.match(unescapedBundle, /uiUpdateConfig/);
});

// ---------- 5. 自绘抽屉按钮让位宿主（issue #105 后续，用户截图确认双图标重叠） ----------

test('detectHostMobileDrawerTrigger：宿主自带抽屉触发器才为真，旧宿主为假', () => {
  const detect = (selectors) => detectHostMobileDrawerTrigger({
    querySelector: (sel) => (selectors.includes(sel) ? { sel } : null),
  });

  assert.equal(detect(['[data-sidebar-toggle], [data-sidebar-opener]']), true, '0.2.x 稳定 data 属性');
  assert.equal(detect(['[class*="leadingSeat"] button']), true, '0.2.x leadingSeat 内的 opener（类名哈希会变，局部名稳定）');
  assert.equal(detect(['button[aria-label*="Open sidebar"], button[title*="Open sidebar"]']), true, '英文 aria-label 兜底');
  assert.equal(detect([]), false, '旧宿主没有任何宿主触发器 → 插件继续用自己的汉堡');
});

test('detectHostMobileDrawerTrigger：无 document / 宿主查询抛错时按"没有"处理，绝不外抛', () => {
  assert.equal(detectHostMobileDrawerTrigger(null), false);
  assert.equal(detectHostMobileDrawerTrigger({}), false);
  const throwing = { querySelector: () => { throw new Error('host exploded'); } };
  assert.equal(detectHostMobileDrawerTrigger(throwing), false, '探测失败不得冒泡（否则整个移动端初始化会挂）');
});

test('shouldYieldMobileDrawerTrigger：宿主自带则让位，否则保留插件按钮', () => {
  const cleanup = setupMockBrowser();
  try {
    assert.equal(FEATURES.MOBILE_DRAWER_TRIGGER, 'mobileDrawerTrigger');
    assert.equal(shouldYieldMobileDrawerTrigger(true), true, '宿主自带触发器 → 隐藏插件汉堡（保留 DSH 的）');
    assert.equal(shouldYieldMobileDrawerTrigger(false), false, '宿主没有 → 插件汉堡必须保留（否则移动端没有菜单入口）');
  } finally {
    cleanup();
  }
});

test('shouldYieldMobileDrawerTrigger：支持运行时覆盖与 URL 排障开关（用户可强制用插件按钮）', () => {
  const cleanup = setupMockBrowser();
  try {
    setRuntimeFeatureOverrides({ mobileDrawerTrigger: true });
    assert.equal(shouldYieldMobileDrawerTrigger(true), false, '用户强制启用插件按钮时不让位');
  } finally {
    cleanup();
  }

  const cleanupUrl = setupMockBrowser({ search: '?dsh_mobile_drawer_trigger=0' });
  try {
    assert.equal(shouldYieldMobileDrawerTrigger(false), true, 'URL 关闭插件触发器 → 让位（隐藏插件汉堡）');
  } finally {
    cleanupUrl();
  }
});

test('结构与产物：client/index.js 必须按宿主探测结果同步自绘汉堡的让位属性', () => {
  assert.match(indexSource, /syncMobileHeaderDrawerTrigger/);
  assert.match(indexSource, /detectHostMobileDrawerTrigger/);
  assert.match(indexSource, /data-dsh-yield-host-drawer/);
  // 必须在创建顶栏后立即同步一次，并在宿主抽屉相关 DOM 变化后（合并）重判
  assert.match(indexSource, /document\.body\.appendChild\(header\);[\s\S]{0,400}?syncMobileHeaderDrawerTrigger\(\)/);
  assert.match(indexSource, /scheduleMobileHeaderDrawerTriggerSync\(\)/);
  assert.match(unescapedBundle, /data-dsh-yield-host-drawer/);
  assert.match(unescapedBundle, /shouldYieldMobileDrawerTrigger/);
});
