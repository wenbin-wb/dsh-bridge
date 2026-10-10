// dsh-bridge 宿主 CSS-module 类名前缀的「运行时探测 + 已知基线 + 显式降级」层
//
// 背景（Issue #72，桌面版 0.2.0 不兼容）
// ---------------------------------------------------------------
// DSH 每次大版本都会把客户端 CSS-module 的短哈希整代重算：
//   0.1.x: VOzbGW_overlay / wSkVaW_header / hHd-Xa_root / uV2eYG_card / qDHVXG_root …
//   0.2.0: wCInkW_overlay / Dc7zOa_header / _2H3hWW_root / RlGAzG_card / _9lTDKa_root …
// 本插件早期把这些哈希硬编码进选择器，宿主一升级就整片规则**静默空转**：
// 样式明明注入成功（<style> 在、无报错），却一个元素都匹配不到。
// 现象就是“手机端打开设置后样式没生效”，而 web 端（旧宿主）正常。
//
// 取值顺序（绝不静默）
//   1) 运行时探测：拿锚点元素 + 本地名反推前缀 —— 适配任意未来版本；
//   2) 已核实基线：同一 slot 的历代前缀都会做「是否真的命中页面」的验证；
//   3) 都没有 → 用永不匹配的哨兵占位，并记入 missing / degraded 供上层显式告警。
//
// 约定：只认 `<family>_<local>` 这一种 CSS-module 命名（Vite/lightningcss 风格，
// 0.1.x/0.2.0 的目标组件都是这个风格）。postcss 风格 `_local_hash_id`（如宿主
// 通用弹窗的 `_root_o6lrb_6`）不在覆盖范围，也不该被覆盖。
//
// 与其它模块的关系：mobile-styles.js 只导出**带占位符的模板**，本模块负责把
// 占位符渲染成真实前缀；client/index.js 负责注入与刷新。

/** 探测不到任何前缀时使用的哨兵：保证选择器永不匹配，而不是退化成 `[class*="overlay"]` 这种宽泛命中。 */
export const ABSENT_FAMILY = '__dshbr_absent_family';

/** 占位符语法：__F_<SLOT>__（SLOT 为大写字母/数字/下划线）。 */
export const FAMILY_TOKEN_RE = /__F_([A-Z][A-Z0-9_]*)__/g;

const norm = (v) => (typeof v === 'string' ? v.trim() : '');

/** 取元素的 class 列表（对无 classList 的环境 fail-open 成空数组）。 */
function classListOf(el) {
  if (!el || !el.classList) return [];
  try {
    return [...el.classList];
  } catch {
    return [];
  }
}

/**
 * 从 class 列表里按本地名反推 CSS-module 前缀（纯函数，便于单测）。
 *
 * @param {string[]} classes 元素上的类名
 * @param {string} local 本地名（如 'overlay'、'navCell'）
 * @returns {string|null} 前缀，如 'wCInkW'；找不到返回 null
 */
export function familyFromClasses(classes, local) {
  const name = norm(local);
  if (!name || !Array.isArray(classes)) return null;
  const suffix = `_${name}`;
  for (const token of classes) {
    if (typeof token !== 'string') continue;
    if (token.length <= suffix.length) continue;
    if (!token.endsWith(suffix)) continue;
    return token.slice(0, token.length - suffix.length);
  }
  return null;
}

/**
 * 一次性把页面上的 class 拆成 `<前缀> -> Set<本地名>` 索引。
 *
 * 为什么不做成「每个候选前缀一次 querySelector」：流式输出期间 DOM 每几毫秒就变一次，
 * 按 11 个槽位 × 若干候选 × 若干本地名去查，每次要做几十遍带属性子串匹配的全文档扫描；
 * 而一次 `querySelectorAll('[class]')`（走原生 class 属性索引）就够回答所有命中测试。
 *
 * 拆分规则取「最后一个下划线」：`VOzbGW_panel` → (VOzbGW, panel)、
 * `_2H3hWW_newSessionContent` → (_2H3hWW, newSessionContent)、`-ngf_W_triggerLabel` → (-ngf_W, triggerLabel)。
 * 对 `_root_o6lrb_6` 这类 postcss 风格类名会得到无意义键，但只多占一点内存，不会误命中。
 *
 * @returns {Map<string, Set<string>>|null} 索引；拿不到任何节点时返回 null（调用方退回直查）
 */
function buildClassIndex(doc) {
  let nodes;
  try {
    nodes = doc?.querySelectorAll?.('[class]');
  } catch {
    return null;
  }
  if (!nodes || !nodes.length) return null;
  const index = new Map();
  for (const el of nodes) {
    for (const token of classListOf(el)) {
      const cut = token.lastIndexOf('_');
      if (cut <= 0) continue;
      const family = token.slice(0, cut);
      const local = token.slice(cut + 1);
      let locals = index.get(family);
      if (!locals) {
        locals = new Set();
        index.set(family, locals);
      }
      locals.add(local);
    }
  }
  return index.size ? index : null;
}

/** 页面里是否存在该前缀 + 任一本地名组成的类名（用于验证基线是否仍然有效）。 */
function familyHits(doc, family, locals, index) {
  if (!family || !locals || !locals.length) return false;
  if (index) {
    const present = index.get(family);
    return !!present && locals.some((local) => present.has(local));
  }
  for (const local of locals) {
    try {
      if (doc.querySelector(`[class*="${family}_${local}"]`)) return true;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * 弱命中：页面里是否存在任意 `<family>_*` 类名。
 *
 * 为什么需要：组件（如设置弹窗）尚未挂载时，按本地名的强命中一定失败，此时若直接取
 * 基线首项就会猜错代次 —— 0.1.x 宿主上会被猜成 0.2.0 的前缀，整片规则反而失效。
 * 而侧栏的「设置」轨道按钮等入口元素在任何代次都常驻，`VOzbGW_trigger` /
 * `wCInkW_trigger` 这类痕迹足以判断该代次是不是活的。
 */
function familyPresent(doc, family, index) {
  if (!family) return false;
  if (index) return index.has(family);
  try {
    return !!doc.querySelector(`[class*="${family}_"]`);
  } catch {
    return false;
  }
}

const aria = (re) => (doc) => {
  const nodes = doc.querySelectorAll?.('[aria-label]') ?? [];
  for (const el of nodes) if (re.test(el.getAttribute('aria-label') || '')) return el;
  return null;
};

/** 设置弹窗面板：`[role="dialog"]` 且直接子级含 `<nav>`（0.1.x / 0.2.0 同构）。 */
const settingsPanel = (doc) => {
  const panels = doc.querySelectorAll?.('div[role="dialog"]') ?? [];
  for (const p of panels) {
    try {
      if (p.querySelector(':scope > nav')) return p;
    } catch {
      /* :scope 不可用时跳过该锚点 */
    }
  }
  return null;
};

const closestClass = (el, local) => {
  let cur = el;
  while (cur && cur !== el.ownerDocument?.body) {
    if (familyFromClasses(classListOf(cur), local)) return cur;
    cur = cur.parentElement;
  }
  return null;
};

const composerCard = (doc) => {
  const direct = doc.querySelector?.('[data-composer-card="true"]');
  if (direct) return direct;
  const input = doc.querySelector?.('[data-composer-input="true"]')
    || doc.querySelector?.('div[role="textbox"], textarea');
  return input ? closestClass(input, 'card') || input : null;
};

/**
 * 槽位表：每个槽位＝一组同族规则，独立探测、独立降级。
 * `known` 为已核实的历代前缀（顺序＝优先级）；只在「真的命中页面」或探测失败时才采用。
 * `critical` 的槽位探测失败会触发显式告警（其余只记 debug）。
 */
export const FAMILY_SLOTS = {
  // 设置中心弹窗（手机端样式失效的主战场）
  SETTINGS: {
    critical: true,
    locals: ['overlay', 'panel', 'nav', 'navList', 'navCell', 'navLabel', 'navTitle', 'options', 'content', 'close', 'header'],
    known: ['wCInkW', 'VOzbGW'],
    anchors: [{ local: 'panel', find: settingsPanel }],
  },
  // 对话区：头部标题行、面包屑、滚动体、输入座
  CONV: {
    locals: ['header', 'titleRow', 'headerActions', 'headerUtilities', 'crumbs', 'scrollBody', 'viewArea', 'composerSeat'],
    known: ['Dc7zOa', 'wSkVaW'],
    anchors: [{ local: 'header', find: (doc) => doc.querySelector?.('div[class*="_centerCol"] header') || null }],
  },
  // 输入卡片（卡片本体 / 底部工具行 / 模式区 / 尾随区）
  COMPOSER: {
    locals: ['card', 'row', 'tools', 'modes', 'trailing', 'overlayAnchor'],
    known: ['RlGAzG', 'uV2eYG'],
    anchors: [{ local: 'card', find: composerCard }],
  },
  // 左侧边栏（抽屉化的对象）
  SIDEBAR: {
    locals: ['root', 'logoRow', 'toggle', 'collapsed', 'newSession', 'regionArea'],
    known: ['_2H3hWW', 'hHd-Xa'],
    anchors: [{
      local: 'root',
      find: (doc) => {
        const btn = aria(/新建会话|New session/)(doc);
        return btn ? closestClass(btn, 'root') : null;
      },
    }],
  },
  // 工作区列表轨道（搜索/视图选项/列表区）
  WS: {
    locals: ['root', 'searchButton', 'listArea', 'rail'],
    known: ['_9lTDKa', 'qDHVXG'],
    anchors: [{ local: 'searchButton', find: aria(/搜索会话|Search sessions/) }],
  },
  // 模型选择器
  MODEL: {
    locals: ['root', 'trigger', 'triggerLabel'],
    known: ['wq12jW', '_7KE1Ra'],
    anchors: [{ local: 'trigger', find: aria(/选择模型|Select model|模型/) }],
  },
  // 访问模式选择器
  ACCESS: {
    locals: ['trigger'],
    known: ['dlU_AG', 'Sh0Q9G'],
    anchors: [{ local: 'trigger', find: aria(/访问模式|Access mode/) }],
  },
  // Agent 预设胶囊（本地名历代不一：seat / trigger 都收）
  PRESET: {
    locals: ['seat', 'trigger', 'menu'],
    known: ['_oGoKq', 'cubgiG', 'h8S2Va'],
    anchors: [{ local: 'seat', find: aria(/Agent 预设|Agent preset/) }],
  },
  // 会话日志导出按钮
  LOG: {
    locals: ['sessionLogButton'],
    known: ['nL4_yW'],
    anchors: [{ local: 'sessionLogButton', find: aria(/Session Log|会话日志|导出|Export/i) }],
  },
  // Workbench 面板 / Tab 栏（0.2.0 起改为 dockkit，本地名未采全，故只保留基线 + 无锚点）
  WB: {
    locals: ['panel', 'tabBar', 'tabList', 'tab', 'tabActive', 'tabTitle', 'tabClose', 'tabBarPlus'],
    known: ['nArs4W'],
    anchors: [],
  },
  // 折叠簇容器（本地名 `toggleCluster` 历代不变，但族哈希只在 0.1.x 采到过）
  TOGGLE: {
    locals: ['toggleCluster'],
    known: ['W-zNGW'],
    anchors: [{ local: 'toggleCluster', find: (doc) => doc.querySelector?.('div[class*="toggleCluster"]') || null }],
  },
};

/**
 * 关键判定：设置弹窗是否真的被「注入的 CSS」命中。
 *
 * 刻意用**带标签**的探针，与 CSS 里真正写的结构选择器同形（`div[class*="F_panel"]`、
 * `nav[class*="F_nav"]`、`div[class*="F_options"]`、`div[class*="F_overlay"]`）。
 * 无标签的子串查询会被无关元素满足——独立验收实测：面板类名被整代改掉、只剩
 * `svg.wCInkW_navIcon` 时，`[class*="wCInkW_nav"]` 仍命中，于是 degraded 漏报。
 */
function criticalSettingsHit(doc, family) {
  const probes = [
    `div[class*="${family}_panel"]`,
    `nav[class*="${family}_nav"]`,
    `div[class*="${family}_options"]`,
    `div[class*="${family}_overlay"]`,
  ];
  for (const sel of probes) {
    try {
      if (doc.querySelector(sel)) return true;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * 解析各槽位的真实前缀。
 *
 * @param {Document} doc
 * @param {typeof FAMILY_SLOTS} [slots]
 * @returns {{families: Record<string,string>, sources: Record<string,string>, missing: string[], unverified: string[], degraded: boolean, compat: 'ok'|'partial'|'degraded', settingsMounted: boolean}}
 *   sources 取值：detected（运行时探测）/ known（基线且实测命中本地名）/
 *   known-weak（基线且页面上存在该代次痕迹，但该槽位的本地名尚未挂载）/
 *   assumed（无任何痕迹，按基线首项假设）/ absent（无可用前缀）
 *   compat：ok＝全部槽位有据可依；partial＝主链路可用但有槽位只能假设；
 *   degraded＝设置弹窗已挂载却解析不出前缀（即过去那种静默失效）
 */
export function resolveHostFamilies(doc = globalThis.document, slots = FAMILY_SLOTS) {
  const families = {};
  const sources = {};
  const missing = [];
  const unverified = [];
  // 一次扫描建索引，后面所有命中测试都查它（见 buildClassIndex 的性能说明）
  const index = buildClassIndex(doc);

  for (const [slot, spec] of Object.entries(slots || {})) {
    let family = null;
    let source = null;

    for (const anchor of spec.anchors ?? []) {
      let el;
      try {
        el = anchor.find(doc);
      } catch {
        el = null;
      }
      const found = familyFromClasses(classListOf(el), anchor.local);
      if (found) {
        family = found;
        source = 'detected';
        break;
      }
    }

    if (!family) {
      for (const cand of spec.known ?? []) {
        if (familyHits(doc, cand, spec.locals, index)) {
          family = cand;
          source = 'known';
          break;
        }
      }
    }

    // 组件还没挂载时的「代次判断」：用弱命中（任意 <cand>_* 痕迹）决定基线取哪一代，
    // 否则会退化成「一律假设最新宿主」，在旧宿主上把整片规则让掉。
    if (!family) {
      for (const cand of spec.known ?? []) {
        if (familyPresent(doc, cand, index)) {
          family = cand;
          source = 'known-weak';
          break;
        }
      }
    }

    if (!family) {
      const cand = norm((spec.known ?? [])[0]);
      if (cand) {
        family = cand;
        source = 'assumed';
        unverified.push(slot);
      } else {
        family = ABSENT_FAMILY;
        source = 'absent';
        missing.push(slot);
      }
    }

    families[slot] = family;
    sources[slot] = source;
  }

  // 显式降级判定：设置弹窗已经挂在页面上，却没有解析出可用前缀
  // （即锚点失配 + 基线也匹配不上）——这正是过去会静默失效的状态。
  const mounted = (() => {
    try {
      return !!settingsPanel(doc);
    } catch {
      return false;
    }
  })();
  const settingsOk = families.SETTINGS
    && families.SETTINGS !== ABSENT_FAMILY
    && (!mounted || criticalSettingsHit(doc, families.SETTINGS));
  const degraded = !settingsOk;

  // 'partial'：设置弹窗这一条主链路可用，但有槽位只能"假设"（既没探测到、也没在页面上
  // 留下痕迹）。它们不会误伤（顶多规则空转），但必须给出可见信号 —— 独立验收指出
  // LOG/WB/TOGGLE 过去只进返回值、compat 仍是 ok，等于留了一块静默面。
  const compat = degraded ? 'degraded' : ((unverified.length || missing.length) ? 'partial' : 'ok');

  return { families, sources, missing, unverified, degraded, compat, settingsMounted: mounted };
}

/**
 * 渲染模板：把 `__F_SLOT__` 换成 `<真实前缀>_`。
 * 注意占位符本身**不含**本地名前的下划线分隔符（`__F_SETTINGS__overlay` 里的 `__`
 * 是定界符），故作替换时必须补回 `_`，否则会渲染成 `wCInkWoverlay` 这种废选择器。
 * 未解析出的槽位换成永不匹配的哨兵，绝不退化成宽泛选择器。
 */
export function renderMobileStyles(template, families = {}) {
  return String(template ?? '').replace(FAMILY_TOKEN_RE, (_all, slot) => {
    const fam = norm(families[slot]);
    return `${fam || ABSENT_FAMILY}_`;
  });
}

/** 模板里引用到的槽位名（测试用：确保没有拼错的占位符）。 */
export function referencedSlots(template) {
  const out = new Set();
  for (const m of String(template ?? '').matchAll(FAMILY_TOKEN_RE)) out.add(m[1]);
  return [...out];
}

/** 稳定的签名，用于判断「探测结果是否真的变了」，避免无谓重渲染。 */
export function familiesSignature(families = {}) {
  return Object.keys(families).sort().map((k) => `${k}=${families[k]}`).join('|');
}

/**
 * 守护宿主 DOM，前缀变化或 DOM 抖动时回调。
 *
 * 刻意**不在本模块内做去重**：调用方（client/index.js）的注入本身幂等（节点复用 +
 * 文本比对），而去重会把"样式表被宿主 HMR 删掉、但族签名没变"这种情况一起吞掉
 * （独立验收实测：把补挂写在"签名变化"分支里时，删表后抖动多次也不会补回）。
 * 本模块只负责"防抖 + 在整棵树（含 <head>）上观察"。
 *
 * @param {(result: ReturnType<typeof resolveHostFamilies>) => void} onChange
 * @param {{doc?: Document, slots?: typeof FAMILY_SLOTS, debounceMs?: number}} [opts]
 * @returns {() => void} 清理函数
 */
export function watchHostFamilies(onChange, opts = {}) {
  const doc = opts.doc ?? globalThis.document;
  const slots = opts.slots ?? FAMILY_SLOTS;
  const debounceMs = opts.debounceMs ?? 120;
  if (!doc || typeof doc.addEventListener !== 'function' || typeof MutationObserver === 'undefined') {
    return () => {};
  }

  let timer = null;
  const run = () => {
    timer = null;
    onChange(resolveHostFamilies(doc, slots));
  };

  const observer = new MutationObserver(() => {
    if (timer) return;
    timer = setTimeout(run, debounceMs);
  });
  // 观察 documentElement（而非 body）：<style> 挂在 <head>，宿主 HMR 删表时
  // body 子树根本不会产生变更记录，补挂逻辑就永远不会被唤醒。
  observer.observe(doc.documentElement ?? doc.body, { childList: true, subtree: true });

  return () => {
    if (timer) clearTimeout(timer);
    timer = null;
    observer.disconnect();
  };
}
