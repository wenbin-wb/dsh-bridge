// test/host-families.test.mjs
// Issue #72 回归：宿主 CSS-module 前缀必须「运行时解析」，且解析不到时**显式降级**，
// 绝不能让选择器退化成 `[class*="overlay"]` 这种宽泛命中，也不能再用硬编码哈希。
//
// 背景：DSH 0.2.0（桌面版）把客户端 CSS-module 短哈希整代重算
// （VOzbGW_* → wCInkW_*、wSkVaW_* → Dc7zOa_* …）。插件原先硬编码 0.1.x 哈希，
// 导致桌面版上样式已注入却零命中（手机端设置页样式“没生效”）。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ABSENT_FAMILY,
  FAMILY_SLOTS,
  familyFromClasses,
  familiesSignature,
  referencedSlots,
  renderMobileStyles,
  resolveHostFamilies,
} from '../client/host-families.js';
import { MOBILE_STYLES_CSS } from '../client/mobile-styles.js';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// ---------- 假 DOM：只实现本模块用到的 querySelector 子集 ----------
/** @param {string[]} classIndex 页面上存在的全部类名 */
function fakeDoc(classIndex) {
  const has = (selector) => {
    const m = /^\[class\*="([^"]+)"\]$/.exec(selector);
    if (!m) return false;
    return classIndex.some((cls) => cls.includes(m[1]));
  };
  const element = (classes) => ({
    classList: classes,
    getAttribute: () => null,
    querySelector: () => null,
  });
  return {
    documentElement: element([]),
    body: element([]),
    querySelector: (selector) => {
      if (!has(selector)) return null;
      const m = /\[class\*="([^"]+)"\]/.exec(selector);
      return element(classIndex.filter((cls) => cls.includes(m[1])));
    },
    querySelectorAll: (selector) => {
      // 索引路径：一次拿到所有带 class 的元素（模块内部据此建 family→locals 索引）
      if (selector === '[class]') return classIndex.map((cls) => element([cls]));
      return has(selector) ? [element([selector])] : [];
    },
  };
}

/** 只提供 class 索引、其余 querySelector 一律为空的 doc：用于证明索引路径确实生效 */
function indexOnlyDoc(classIndex) {
  return {
    documentElement: { classList: [] },
    body: { classList: [] },
    querySelector: () => null,
    querySelectorAll: (selector) => (selector === '[class]'
      ? classIndex.map((cls) => ({ classList: [cls], getAttribute: () => null, querySelector: () => null }))
      : []),
  };
}

test('familyFromClasses：从 0.1.x / 0.2.0 两代类名都能反推前缀', () => {
  assert.equal(familyFromClasses(['VOzbGW_panel', 'VOzbGW_active'], 'panel'), 'VOzbGW');
  assert.equal(familyFromClasses(['wCInkW_panel'], 'panel'), 'wCInkW');
  assert.equal(familyFromClasses(['hHd-Xa_root', 'hHd-Xa_collapsed'], 'root'), 'hHd-Xa');
  assert.equal(familyFromClasses(['_2H3hWW_root'], 'root'), '_2H3hWW');
  assert.equal(familyFromClasses(['wCInkW_trigger', 'wCInkW_rail'], 'trigger'), 'wCInkW');
});

test('familyFromClasses：本地名不匹配时不误判（前缀必须整体对齐）', () => {
  assert.equal(familyFromClasses(['wCInkW_panel'], 'nav'), null);
  assert.equal(familyFromClasses(['prepanel'], 'panel'), null, '没有下划线分隔不算同族');
  assert.equal(familyFromClasses(['panel'], 'panel'), null, '光秃秃的本地名没有前缀');
  assert.equal(familyFromClasses([], 'panel'), null);
  assert.equal(familyFromClasses(null, 'panel'), null);
  assert.equal(familyFromClasses(['wCInkW_panel'], ''), null);
});

test('renderMobileStyles：占位符换成真实前缀', () => {
  const css = renderMobileStyles('A{color:red}div[class*="__F_SETTINGS__overlay"]{z-index:1}', { SETTINGS: 'wCInkW' });
  assert.match(css, /\[class\*="wCInkW_overlay"\]/);
  assert.doesNotMatch(css, /__F_/);
});

test('renderMobileStyles：未解析出的槽位换成哨兵，绝不退化成宽泛选择器', () => {
  const css = renderMobileStyles('div[class*="__F_SETTINGS__overlay"]{}', {});
  assert.match(css, new RegExp(`\\[class\\*="${ABSENT_FAMILY}_overlay"\\]`));
  assert.doesNotMatch(css, /\[class\*="overlay"\]/, '不能退化成只匹配本地名');
});

test('P0 回归：MOBILE_STYLES_CSS 里的占位符全部是已知槽位', () => {
  const used = referencedSlots(MOBILE_STYLES_CSS);
  assert.ok(used.length > 0, '模板里应有占位符');
  for (const slot of used) {
    assert.ok(FAMILY_SLOTS[slot], `未知槽位 ${slot}：拼错或被删除`);
  }
});

test('P0 回归：mobile-styles 不得再出现硬编码的宿主哈希', () => {
  const css = readFileSync(resolve(repoRoot, 'client/mobile-styles.js'), 'utf8');
  for (const fam of ['VOzbGW', 'wSkVaW', 'hHd-Xa', 'uV2eYG', 'nL4_yW', 'h8S2Va', 'Sh0Q9G', '_7KE1Ra', 'qDHVXG', 'W-zNGW', 'nArs4W']) {
    // 只允许出现在注释里（说明历史），不允许出现在 class*= 选择器里
    assert.doesNotMatch(css, new RegExp(`class\\*="${fam}_`), `mobile-styles.js 仍硬编码了 ${fam}_`);
  }
});

test('P0 回归：渲染后的 CSS 必须带上两代宿主前缀（0.1.x 与 0.2.0）', () => {
  const desktop = renderMobileStyles(MOBILE_STYLES_CSS, Object.fromEntries(
    Object.entries(FAMILY_SLOTS).map(([slot, spec]) => [slot, spec.known[0]]),
  ));
  const web = renderMobileStyles(MOBILE_STYLES_CSS, Object.fromEntries(
    Object.entries(FAMILY_SLOTS).map(([slot, spec]) => [slot, spec.known[spec.known.length - 1]]),
  ));
  // 设置弹窗：0.2.0 是 wCInkW_，0.1.x 是 VOzbGW_
  assert.match(desktop, /\[class\*="wCInkW_panel"\]/);
  assert.match(web, /\[class\*="VOzbGW_panel"\]/);
  // 对话区
  assert.match(desktop, /\[class\*="Dc7zOa_titleRow"\]/);
  assert.match(web, /\[class\*="wSkVaW_titleRow"\]/);
  // 不得残留占位符
  assert.doesNotMatch(desktop, /__F_/);
  assert.doesNotMatch(web, /__F_/);
});

test('每个槽位的基线都带「两代及以上」前缀，保证旧宿主不退化', () => {
  for (const [slot, spec] of Object.entries(FAMILY_SLOTS)) {
    assert.ok(Array.isArray(spec.known) && spec.known.length >= 1, `${slot} 缺少 known 基线`);
    assert.ok(Array.isArray(spec.locals) && spec.locals.length >= 1, `${slot} 缺少 locals`);
    const uniq = new Set(spec.known);
    assert.equal(uniq.size, spec.known.length, `${slot} 基线里有重复前缀`);
  }
  // 设置弹窗是本 issue 的主战场，必须有 0.1.x 与 0.2.0 两代
  assert.deepEqual(FAMILY_SLOTS.SETTINGS.known, ['wCInkW', 'VOzbGW']);
});

test('resolveHostFamilies：锚点可用时优先探测，且不依赖基线是否过期', () => {
  // 模拟一个「宿主换成了全新哈希」的页面：基线里没有它，但结构锚点能反推出来
  const doc = {
    documentElement: { classList: [] },
    body: { classList: [] },
    querySelector: (sel) => (sel.includes('_centerCol') ? { classList: ['ZZnew9_header'], querySelector: () => null } : null),
    querySelectorAll: (sel) => {
      if (sel === 'div[role="dialog"]') {
        return [{ classList: ['ZZnew9_panel'], querySelector: () => ({}) }];
      }
      return [];
    },
  };
  const { families, sources } = resolveHostFamilies(doc);
  assert.equal(families.SETTINGS, 'ZZnew9');
  assert.equal(sources.SETTINGS, 'detected');
  assert.equal(families.CONV, 'ZZnew9');
  assert.equal(sources.CONV, 'detected');
});

test('resolveHostFamilies：锚点不可用但基线命中页面时用 known，并标记未验证项', () => {
  const doc = fakeDoc(['wCInkW_panel', 'wCInkW_nav', 'Dc7zOa_header']);
  const { families, sources, unverified } = resolveHostFamilies(doc);
  assert.equal(families.SETTINGS, 'wCInkW');
  assert.equal(sources.SETTINGS, 'known');
  assert.ok(unverified.includes('WB'), '未采到的槽位应被标记出来（供告警/诊断）');
});

test('resolveHostFamilies：组件未挂载时用「弱命中」判代次，不得一律假设最新宿主', () => {
  // 0.1.x 宿主的常态：设置弹窗还没打开，页面上只有常驻的侧栏「设置」轨道按钮
  // VOzbGW_trigger。若此时取基线首项（0.2.0 的 wCInkW），设置页规则会被整片让掉。
  const doc = fakeDoc(['VOzbGW_trigger', 'VOzbGW_rail', 'hHd-Xa_root']);
  const { families, sources } = resolveHostFamilies(doc);
  assert.equal(families.SETTINGS, 'VOzbGW');
  assert.equal(sources.SETTINGS, 'known-weak');
  assert.equal(families.SIDEBAR, 'hHd-Xa');
});

test('resolveHostFamilies：0.2.0 宿主同理取 wCInkW（弱命中也认最新代）', () => {
  const doc = fakeDoc(['wCInkW_trigger', 'wCInkW_rail']);
  const { families, sources } = resolveHostFamilies(doc);
  assert.equal(families.SETTINGS, 'wCInkW');
  assert.equal(sources.SETTINGS, 'known-weak');
});

test('resolveHostFamilies：走「一次扫描建索引」的快路径也能解析（性能相关不变量）', () => {
  // 只给 class 索引、其余 querySelector 全空：解析仍必须成功，证明命中测试确实走的索引，
  // 而不是每个候选前缀都去做一次带属性子串匹配的全文档扫描（流式输出期间那样会很贵）。
  const { families, sources } = resolveHostFamilies(indexOnlyDoc(['wCInkW_panel', 'wCInkW_navCell', 'Dc7zOa_header']));
  assert.equal(families.SETTINGS, 'wCInkW');
  assert.equal(sources.SETTINGS, 'known');
  assert.equal(families.CONV, 'Dc7zOa');
});

test('resolveHostFamilies：索引缺失时退回直查（老测试替身/异常 DOM 不得崩）', () => {
  const { families } = resolveHostFamilies(fakeDoc(['wCInkW_panel']));
  assert.equal(families.SETTINGS, 'wCInkW');
});

test('resolveHostFamilies：直查路径的**正命中**分支也要覆盖（独立验收指出的单测缺口）', () => {
  // 只提供 querySelector 直查、不给 [class] 列表 → 强制 index=null，
  // 此时 SETTINGS 必须靠直查命中基线而不是退化到 assumed。
  const classIndex = ['wCInkW_panel', 'wCInkW_navCell'];
  const doc = {
    documentElement: { classList: [] },
    body: { classList: [] },
    querySelector: (selector) => {
      const m = /\[class\*="([^"]+)"\]/.exec(selector);
      return m && classIndex.some((c) => c.includes(m[1])) ? { classList: classIndex } : null;
    },
    querySelectorAll: () => [],
  };
  const { families, sources } = resolveHostFamilies(doc);
  assert.equal(families.SETTINGS, 'wCInkW');
  assert.equal(sources.SETTINGS, 'known');
});

test('compat 状态机：全部有据=ok；有槽位只能假设=partial；主链路解析不出=degraded', () => {
  // 只有 wCInkW 的痕迹：SETTINGS 走弱命中，其余槽位全 assumed → partial
  const partial = resolveHostFamilies(fakeDoc(['wCInkW_trigger']));
  assert.equal(partial.degraded, false);
  assert.equal(partial.compat, 'partial', `unverified=${JSON.stringify(partial.unverified)}`);

  // 所有槽位都能在页面上验证（构造足够多的真实类名）→ ok
  const rich = [
    'wCInkW_panel', 'wCInkW_nav', 'wCInkW_navCell', 'wCInkW_navList', 'wCInkW_navTitle',
    'wCInkW_navLabel', 'wCInkW_options', 'wCInkW_content', 'wCInkW_close', 'wCInkW_header', 'wCInkW_overlay',
    'Dc7zOa_header', 'Dc7zOa_titleRow', 'Dc7zOa_headerActions', 'Dc7zOa_headerUtilities', 'Dc7zOa_crumbs',
    'Dc7zOa_scrollBody', 'Dc7zOa_viewArea', 'Dc7zOa_composerSeat',
    'RlGAzG_card', 'RlGAzG_row', 'RlGAzG_tools', 'RlGAzG_modes', 'RlGAzG_trailing', 'RlGAzG_overlayAnchor',
    '_2H3hWW_root', '_2H3hWW_logoRow', '_2H3hWW_toggle', '_2H3hWW_collapsed', '_2H3hWW_newSession', '_2H3hWW_regionArea',
    '_9lTDKa_root', '_9lTDKa_searchButton', '_9lTDKa_listArea', '_9lTDKa_rail',
    'wq12jW_root', 'wq12jW_trigger', 'wq12jW_triggerLabel',
    'dlU_AG_trigger',
    '_oGoKq_seat', '_oGoKq_trigger', '_oGoKq_menu',
    'nL4_yW_sessionLogButton',
    'nArs4W_panel', 'nArs4W_tabBar', 'nArs4W_tabList', 'nArs4W_tab', 'nArs4W_tabActive', 'nArs4W_tabTitle', 'nArs4W_tabClose', 'nArs4W_tabBarPlus',
    'W-zNGW_toggleCluster',
  ];
  const ok = resolveHostFamilies(fakeDoc(rich));
  assert.equal(ok.degraded, false);
  assert.equal(ok.compat, 'ok', `unverified=${JSON.stringify(ok.unverified)} missing=${JSON.stringify(ok.missing)}`);
});

test('resolveHostFamilies：完全解析不出时用基线兜底而不是哨兵，并给出降级信号', () => {
  const doc = fakeDoc(['unrelated_class']);
  const { families, sources, degraded } = resolveHostFamilies(doc);
  assert.equal(families.SETTINGS, 'wCInkW', '有基线时先按基线走，保持旧行为');
  assert.equal(sources.SETTINGS, 'assumed');
  assert.equal(degraded, false, '弹窗没挂上时不算降级（assumed 是正常的预挂载状态）');
});

test('resolveHostFamilies：设置弹窗已挂上但前缀解析失败 = 显式降级（正是过去的静默失效）', () => {
  const doc = {
    documentElement: { classList: [] },
    body: { classList: [] },
    querySelector: () => null,
    querySelectorAll: (sel) => {
      if (sel === 'div[role="dialog"]') {
        // 面板存在，但类名不是 family_local 形态（例如宿主换成 postcss 风格）
        return [{ classList: ['_root_o6lrb_6'], querySelector: () => ({}) }];
      }
      return [];
    },
  };
  const { degraded, sources } = resolveHostFamilies(doc);
  assert.equal(degraded, true);
  assert.equal(sources.SETTINGS, 'assumed');
});

test('降级判定必须用「带标签」探针：无关元素不得把 degraded 蒙混成 ok（独立验收反例）', () => {
  // 独立验收构造：面板类名被整代改掉，页面上只剩 svg.wCInkW_navIcon。
  // 无标签的 [class*="wCInkW_nav"] 会被这个 svg 满足 → degraded 漏报。
  const doc = {
    documentElement: { classList: [] },
    body: { classList: [] },
    querySelector: (sel) => {
      // 只有无标签探针才会命中 svg（带标签的 div/nav/… 都不该命中）
      if (/\[class\*="wCInkW_nav"\]$/.test(sel)) return { classList: ['wCInkW_navIcon'] };
      return null;
    },
    querySelectorAll: (sel) => {
      if (sel === 'div[role="dialog"]') return [{ classList: ['zzhash6_panel'], querySelector: () => ({}) }];
      if (sel === '[class]') return [{ classList: ['wCInkW_navIcon'] }];
      return [];
    },
  };
  const { degraded } = resolveHostFamilies(doc);
  assert.equal(degraded, true, '只剩 svg.wCInkW_navIcon 时必须判降级，而不是 ok');
});

test('降级判定：面板类名真实存在（div.F_panel）时必须不降级', () => {
  const doc = {
    documentElement: { classList: [] },
    body: { classList: [] },
    querySelector: (sel) => (sel === 'div[class*="wCInkW_panel"]' ? { classList: ['wCInkW_panel'] } : null),
    querySelectorAll: (sel) => {
      if (sel === 'div[role="dialog"]') return [{ classList: ['wCInkW_panel'], querySelector: () => ({}) }];
      if (sel === '[class]') return [{ classList: ['wCInkW_panel'] }];
      return [];
    },
  };
  const { degraded } = resolveHostFamilies(doc);
  assert.equal(degraded, false);
});

test('familiesSignature：前缀或降级状态变化才会变', () => {
  assert.equal(familiesSignature({ A: 'x', B: 'y' }), familiesSignature({ B: 'y', A: 'x' }));
  assert.notEqual(familiesSignature({ A: 'x' }), familiesSignature({ A: 'z' }));
});
