// 回归测试（Issue #51）：client 侧宿主接入与控制面暴露
//
// 覆盖：
//   1. 行为断言：ctx.provide('dsh-bridge', bridgeControl) 契约发布
//   2. render(props) element 构造与 preferredTab 透传
//   3. setSettingsVisible 动态可见性门控与注销/重新注册
//   4. 老宿主（无 ctx.provide）平稳向下兼容
//   5. 结构与产物同步断言（client/index.js 与 client/client.js）
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// 准备轻量浏览器与 React mock 环境以支持模块导入与组件构造
global.React = {
  createElement: (type, props, ...children) => ({
    type,
    props: { ...props, children: children.length === 1 ? children[0] : children },
  }),
  memo: (fn) => fn,
  useState: (val) => [val, () => {}],
  useCallback: (fn) => fn,
  useEffect: () => {},
  useRef: () => ({ current: null }),
};
global.window = {
  location: { search: '', hostname: '127.0.0.1' },
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  innerWidth: 1024,
  __DSH_DESKTOP__: true, // 模拟桌面端宿主（如 Tauri / DSH Desktop）
};
global.MutationObserver = class {
  observe() {}
  disconnect() {}
};
global.document = {
  querySelector: () => null,
  querySelectorAll: () => [],
  getElementById: () => null,
  createElement: () => ({ style: {}, setAttribute: () => {}, appendChild: () => {}, dataset: {} }),
  head: { appendChild: () => {} },
  body: { appendChild: () => {}, classList: { contains: () => false, add: () => {}, remove: () => {} } },
  documentElement: { setAttribute: () => {}, removeAttribute: () => {}, dataset: {} },
  addEventListener: () => {},
};

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const indexSource = readFileSync(resolve(repoRoot, 'client/index.js'), 'utf8');
const bundle = readFileSync(resolve(repoRoot, 'client/client.js'), 'utf8');
const unescapedBundle = bundle.replace(
  /\\u([0-9a-fA-F]{4})|\\x([0-9a-fA-F]{2})/g,
  (_, u, x) => String.fromCharCode(parseInt(u ?? x, 16)),
);

const { apply } = await import('../client/index.js');

test('IM 平台首次轮询：Desktop 与回环可加载，未解锁远程页面仍暂停', async () => {
  const originalEffect = global.React.useEffect;
  const originalFetch = global.fetch;
  const originalLocation = window.location;
  try {
    global.fetch = async () => ({ ok: true, json: async () => ({ ok: true, adminToken: 'test-only' }) });
    for (const [url, shouldPoll] of [
      ['dsh-app://app/', true],
      ['http://127.0.0.1:3082/', true],
      ['https://remote.example/', false],
      ['dsh-app://untrusted/', false],
    ]) {
      window.location = new URL(url);
      const effects = [];
      global.React.useEffect = (effect) => effects.push(effect);
      const ctx = createMockCtx();
      const endpoints = [];
      ctx.connection.rpc.call = async (_channel, endpoint) => {
        endpoints.push(endpoint);
        return { ok: true, value: {} };
      };
      apply(ctx);
      effects.length = 0;
      const panel = ctx._getProvided()['dsh-bridge'].render({ preferredTab: 'bot' });
      panel.type(panel.props);
      const cleanups = effects.map(effect => effect()).filter(fn => typeof fn === 'function');
      try {
        await new Promise(resolve => setImmediate(resolve));
        assert.equal(endpoints.includes('listPlatforms'), shouldPoll, url);
      } finally {
        cleanups.forEach(cleanup => cleanup());
      }
    }
  } finally {
    global.React.useEffect = originalEffect;
    global.fetch = originalFetch;
    window.location = originalLocation;
  }
});

function createMockCtx() {
  const provided = {};
  const registeredSlots = [];
  const injectedSlots = [];
  let unregisterCount = 0;

  const ctx = {
    connection: {
      rpc: {
        call: (channel, endpoint, payload) => Promise.resolve({ ok: true, endpoint, payload }),
      },
    },
    slots: {
      inject: (name, callback) => {
        injectedSlots.push({ name, callback });
        // 模拟 slot 触发
        callback();
      },
      register: (descriptor, component) => {
        const item = { descriptor, component, active: true };
        registeredSlots.push(item);
        return () => {
          item.active = false;
          unregisterCount++;
        };
      },
    },
    provide: (name, service) => {
      provided[name] = service;
    },
    _getProvided: () => provided,
    _getRegisteredSlots: () => registeredSlots,
    _getUnregisterCount: () => unregisterCount,
  };

  return ctx;
}

// ---------- 1. 行为断言：反射服务契约 ----------

test('apply(ctx) 发布 dsh-bridge 控制面服务', () => {
  const ctx = createMockCtx();
  apply(ctx);

  const service = ctx._getProvided()['dsh-bridge'];
  assert.ok(service, '必须通过 ctx.provide 发布 dsh-bridge 服务');
  assert.equal(service.version, 1, '服务版本必须为 1');
  assert.equal(typeof service.render, 'function', '必须提供 render() 方法');
  assert.equal(typeof service.setSettingsVisible, 'function', '必须提供 setSettingsVisible()');
  assert.equal(typeof service.settingsVisible, 'function', '必须提供 settingsVisible()');
  assert.equal(typeof service.configureFeatures, 'function', '必须提供 configureFeatures()');
  assert.equal(typeof service.getFeatures, 'function', '必须提供 getFeatures()');
});

// ---------- 2. 行为断言：render(props) 现构造与 preferredTab 透传 ----------

test('render() 现构造 React element 并正确透传 props 和 preferredTab', () => {
  const ctx = createMockCtx();
  apply(ctx);
  const service = ctx._getProvided()['dsh-bridge'];

  const element1 = service.render({ preferredTab: 'tunnel', customHeader: 'hello' });
  assert.ok(element1, 'render 必须返回 React element');
  assert.equal(typeof element1.type, 'function', 'element type 必须是 BridgePanel 组件');
  assert.equal(element1.props.preferredTab, 'tunnel', '必须透传 preferredTab');
  assert.equal(element1.props.customHeader, 'hello', '必须透传外部自定义 props');
  assert.equal(typeof element1.props.rpcCall, 'function', '必须自动注入内部构造的 rpcCall');

  const element2 = service.render({ preferredTab: 'bot' });
  assert.equal(element2.props.preferredTab, 'bot');
  assert.notEqual(element1, element2, '每次调用必须现构造 element，不可缓存');
});

// ---------- 3. 行为断言：设置页可见性门控 ----------

test('setSettingsVisible(false) 撤下设置页条目，setSettingsVisible(true) 重新注册', () => {
  const ctx = createMockCtx();
  apply(ctx);
  const service = ctx._getProvided()['dsh-bridge'];

  assert.equal(service.settingsVisible(), true, '默认设置页条目可见');
  const initialSlots = ctx._getRegisteredSlots().filter((s) => s.descriptor.name === 'settings.section');
  assert.equal(initialSlots.length, 1, '初始应注册设置页 slot');
  assert.equal(initialSlots[0].active, true);

  // 宿主调用撤下
  service.setSettingsVisible(false);
  assert.equal(service.settingsVisible(), false);
  assert.equal(initialSlots[0].active, false, '应触发注销函数释放 slot');
  assert.equal(ctx._getUnregisterCount(), 1);

  // 宿主恢复显示
  service.setSettingsVisible(true);
  assert.equal(service.settingsVisible(), true);
  const updatedSlots = ctx._getRegisteredSlots().filter((s) => s.descriptor.name === 'settings.section');
  assert.equal(updatedSlots.length, 2, '恢复显示后应重新注册');
  assert.equal(updatedSlots[1].active, true);
});

// ---------- 4. 行为断言：老宿主兼容性 ----------

test('老宿主没有 ctx.provide 时：平稳降级不抛错', () => {
  const ctx = createMockCtx();
  delete ctx.provide; // 模拟旧版 Cordis

  assert.doesNotThrow(() => {
    apply(ctx);
  }, '没有 ctx.provide 绝不能抛出异常');
});

// ---------- 5. 结构与产物断言 ----------

test('client/index.js 源码包含控制面发布与 BridgePanel preferredTab 支持', () => {
  assert.match(indexSource, /ctx\.provide\(\s*['"]dsh-bridge['"]/);
  assert.match(indexSource, /function\s+BridgePanel\s*\(\s*\{[^}]*preferredTab/);
  assert.match(indexSource, /setSettingsVisible/);
  assert.match(indexSource, /settingsVisible/);
});

test('client/client.js 打包产物必须同步包含宿主控制面', () => {
  assert.match(unescapedBundle, /dsh-bridge/);
  assert.match(unescapedBundle, /preferredTab/);
  assert.match(unescapedBundle, /setSettingsVisible/);
  // 宿主按钮文案匹配（中英双语）也必须随产物发布：只改源码不 build 会让线上
  // 仍只匹配中文、英文界面下侧边栏空白（与第 6 节的源码断言配套）。
  assert.match(unescapedBundle, /Open sidebar/, '产物缺少展开侧边栏英文匹配，请运行 npm run build:client');
  assert.match(unescapedBundle, /Collapse sidebar/, '产物缺少收起侧边栏英文匹配，请运行 npm run build:client');
  assert.match(unescapedBundle, /Session actions/, '产物缺少会话操作英文匹配，请运行 npm run build:client');
});

// ---------- 6. 宿主按钮文案匹配（中英双语，见 PR #48 后侧边栏空白回归） ----------
//
// 宿主按钮 aria-label 随界面语言切换：中文「打开侧边栏 / 收起侧边栏 / 操作 / 新建会话」，
// 英文 "Open sidebar / Collapse sidebar / Session actions / New session"（0.1.7 起按浏览器语言渲染）。
// 只按中文匹配会在英文界面下漏取宿主按钮：抽屉滑出但会话列表不挂载 → 侧边栏空白。
// 下面是全部宿主按钮匹配点；展开/收起/操作三类用 `[\s\S]*` 跨子句核对中英成对，
// 其余（收起面板 Collapse、工作区 workspace、Add/Open workspace、新建会话 New session）
// 以精确子串分别断言。产物同步断言（第 5 节）同样覆盖这些英文变体。

test('宿主侧边栏展开按钮必须同时匹配中英文文案', () => {
  assert.match(
    indexSource,
    /button\[aria-label\*="打开侧边栏"\][\s\S]*button\[aria-label\*="Open sidebar"\]/,
    '抽屉展开逻辑必须同时匹配中文「打开侧边栏」与宿主英文 "Open sidebar"（缺英文会在英文界面漏取 → 侧边栏空白）',
  );
  assert.match(
    indexSource,
    /button\[aria-label\*="收起侧边栏"\][\s\S]*button\[aria-label\*="Collapse sidebar"\]/,
    '点击宿主收起图标收抽屉逻辑必须同时匹配中英文收起文案',
  );
  assert.match(
    indexSource,
    /button\[aria-label\*="操作"\][\s\S]*button\[aria-label\*="Session actions"\]/,
    '长按会话呼出操作菜单必须同时匹配中英文操作按钮文案',
  );
  assert.match(
    indexSource,
    /button\[class\*="toggleButton"\]\[aria-label\*="收起"\]/,
    '收起面板按钮必须保留中文「收起」匹配（与英文 Collapse 配对，见下一条）',
  );
  assert.match(
    indexSource,
    /button\[class\*="toggleButton"\]\[aria-label\*="Collapse"\]/,
    '收起面板按钮必须同时匹配英文 "Collapse"',
  );
  assert.match(
    indexSource,
    /button\[aria-label\*="工作区"\][\s\S]*button\[aria-label\*="workspace"\]/,
    '工作区触发按钮必须同时匹配中文「工作区」与英文小写 workspace（"Add workspace"/"Choose workspace"）',
  );
  assert.match(
    indexSource,
    /button\[aria-label\*="Add workspace"\]/,
    '打开工作区拦截必须匹配英文 "Add workspace"',
  );
  assert.match(
    indexSource,
    /button\[aria-label="新建会话"\][\s\S]*button\[aria-label="New session"\]/,
    '新建会话按钮必须同时匹配中文「新建会话」与英文 "New session"（否则英文界面 (+) 失效）',
  );
});

// ---------- 7. 移动端顶栏会话标题：优先读宿主会话层级面包屑 ----------
//
// 0.1.7 起 sessions.list 快照没有 current 字段，旧方案 snap.current 恒为 undefined →
// 顶栏标题永远「新会话」（用户报障：每个会话标题都叫新会话）。现改为读宿主
// 「会话层级」面包屑 nav（PC 顶栏同源）：稳定锚点是 aria-label（中英双语），
// 最后一个 crumb 即当前会话标题；空会话时无 crumbs 回退「新会话」。

test('移动端顶栏标题读取宿主会话层级面包屑（中英文锚点）', () => {
  assert.match(
    indexSource,
    /nav\[aria-label="Session hierarchy"\], nav\[aria-label="会话层级"\]/,
    '必须按中英文 aria-label 定位宿主会话层级面包屑（否则英文界面取不到标题）',
  );
  assert.match(
    indexSource,
    /readHostSessionTitle/,
    '应有独立的宿主标题读取函数',
  );
  assert.match(
    indexSource,
    /MOBILE_TITLE_FALLBACK_TEXT/,
    '应有「新会话」回退常量',
  );
  assert.match(
    indexSource,
    /querySelector\('\.dsh-mobile-header-title'\)/,
    '应仍操作移动端顶栏标题元素',
  );
});

// ---------- 8. 国际化：跟随 DSH 主体语言 ----------
//
// ① 移动端自绘 UI 文案走 locales.mjs（中英词典，按 <html lang> 取词，跟随主体语言）；
// ② 插件管理页/市场显示名走 package.json 的 `locale/<lang>.json`（宿主按当前语言读
//    meta.title/description，fallback 到包名）——exports 必须暴露 "./locale/*"，否则
//     resolver 拒绝解析、管理页永远显示包名（如 @wenbin_wb/dsh-bridge）。

test('客户端国际化：locales.mjs 存在且中英键一致', () => {
  const localesSrc = readFileSync(resolve(repoRoot, 'client/locales.mjs'), 'utf8');
  assert.match(localesSrc, /export const zh = \{/, '应有中文词典');
  assert.match(localesSrc, /export const en = \{/, '应有英文词典');
  assert.match(localesSrc, /document\.documentElement\.getAttribute\(['"]lang['"]\)/, '应按 <html lang> 跟随 DSH 主体语言');
  // 中英键集合应一致（缺翻译立刻暴露）
  const zhKeys = [...localesSrc.matchAll(/^ {2}['"]([^'"]+)['"]:/gm)].map((m) => m[1]);
  const enBlock = localesSrc.slice(localesSrc.indexOf('export const en'));
  const enKeys = [...enBlock.matchAll(/^ {2}['"]([^'"]+)['"]:/gm)].map((m) => m[1]);
  assert.deepEqual(new Set(zhKeys), new Set(enKeys), 'zh/en 词典键集合必须一致');
  assert.ok(zhKeys.length >= 20, '应有足够的 UI 文案键');
});

test('插件管理页本地化：locale/*.json 存在且 exports 暴露', () => {
  const en = JSON.parse(readFileSync(resolve(repoRoot, 'locale/en.json'), 'utf8'));
  const zh = JSON.parse(readFileSync(resolve(repoRoot, 'locale/zh.json'), 'utf8'));
  assert.ok(en.meta?.title && en.meta?.description, 'locale/en.json 应有 meta.title/description');
  assert.ok(zh.meta?.title && zh.meta?.description, 'locale/zh.json 应有 meta.title/description');
  assert.deepEqual(new Set(Object.keys(en.meta)), new Set(Object.keys(zh.meta)), '中英 meta 字段应一致');
  const pkg = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8'));
  assert.equal(pkg.exports['./locale/*'], './locale/*', 'exports 必须暴露 ./locale/*（否则管理页永远显示包名）');
  assert.ok(pkg.files.includes('locale'), 'files 白名单必须含 locale（否则 npm publish 不带上）');
});
