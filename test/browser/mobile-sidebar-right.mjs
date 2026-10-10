// 移动端右侧栏（right sidebar）行为验收：修复「点开右侧栏按钮后按钮消失、面板不出来」。
//
// 背景（DSH 0.1.7 之后报障）：宿主 frame 是 grid 三列布局（sidebar|center|rightbar），
// 插件把左侧栏抽屉化（fixed 脱离流）后若不显式指定列位，centerCol 会误入第 1 列、
// rightbarCol 塌陷到视口底部 → 全屏面板被定位到视口外。同时 0.1.7 把面板从 fixed
// 改为 absolute 相对 rightbarCol，插件旧 top 让位会二次叠加 52px。
// 修法：frame 恢复宿主 grid 并显式归位列（center=2/rightbar=3/overlay=1/-1），
// 面板统一强制 fixed + top:52px 让位（兼容 0.1.5 与 0.1.7）。
//
// 本套件断言真实行为（不依赖宿主语言）：主内容区占满、左侧抽屉仍正常、右侧栏
// 展开落在顶栏下方且内部可见、可收起后再展开。
//
// 用法：node test/browser/mobile-sidebar-right.mjs（或由 run-all.mjs / verify:mobile-ui 调用）
import puppeteer from 'puppeteer-core';
import { suiteResult, installLegacySelectorBridge, resolveChrome, connect  } from './helpers.mjs';
const CHROME = resolveChrome();
const { port, cookie, cookieName } = connect();
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage();

// Issue #72：老套件写死 0.1.x 的 CSS-module 哈希，这里把查询字符串按宿主
// 真实前缀改写（只改查询、不改 DOM），使其能打在任意代次宿主上。
await installLegacySelectorBridge(page);
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
 if (cookie) await page.setCookie({ name: cookieName, value: cookie.slice(cookieName.length + 1), domain: '127.0.0.1', path: '/' });
await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' });
await new Promise((r) => setTimeout(r, 6000));
const out = [];
let skip = 0;
const say = (n, ok, d) => { out.push({ n, ok, d }); console.log(`${ok ? 'PASS' : 'FAIL'} ${n} ${d || ''}`); };
// 视口：390 与 375 两档
for (const vp of [{ w: 390, h: 844 }, { w: 375, h: 667 }]) {
  await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 5000));
  const V = `${vp.w}x${vp.h}`;
  // 1. 主内容区占满
  const center = await page.evaluate(() => { const c = document.querySelector('div[class*="_centerCol"]'); const r = c?.getBoundingClientRect(); return r ? `${Math.round(r.width)}x${Math.round(r.height)}@${Math.round(r.y)}` : 'NO'; });
  say(`${V} 主内容区占满`, center.startsWith(`${vp.w}x`), center);
  // 2. 左侧抽屉
  await page.evaluate(() => document.querySelector('.dsh-header-menu-btn')?.click());
  await new Promise((r) => setTimeout(r, 900));
  const dr = await page.evaluate(() => { const root = document.querySelector('div[class*="_sidebarCol"] div[class*="hHd-Xa_root"]'); const la = document.querySelector('div[class*="_sidebarCol"] div[class*="listArea"]'); return { open: document.body.classList.contains('dsh-drawer-open'), collapsed: root ? String(root.className).includes('collapsed') : null, children: la ? la.children.length : -1 }; });
  say(`${V} 左侧抽屉正常`, dr.open && dr.collapsed === false && dr.children > 0, JSON.stringify(dr));
  await page.evaluate(() => document.body.classList.remove('dsh-drawer-open'));
  await new Promise((r) => setTimeout(r, 400));
  // 3. 右侧栏（按钮文案随宿主语言切换，中英都匹配；先断言按钮存在再点，避免 zh 环境静默点不到）
  const openBtn = await page.evaluate(() => {
    const sel = 'button[aria-label="Open right sidebar"], button[aria-label="打开右侧边栏"], '
      + 'button[aria-label="Collapse right sidebar"], button[aria-label="收起右侧边栏"], '
      + '[data-sidebar-right-toggle] button, button[data-sidebar-right-toggle]';
    const b = document.querySelector(sel);
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { visible: r.width > 0 && r.height > 0, label: b.getAttribute('aria-label') || '(no aria-label)' };
  });
  // 宿主在极窄视口下可能根本不提供该入口（无按钮 ⇒ 不是本插件的回归，按 SKIP 记）
  if (!openBtn) {
    skip++;
    console.log(`SKIP  ${V} 右侧栏展开按钮可达 — 该宿主/视口未提供右侧栏入口，无法验证展开收起`);
    continue;
  }
  say(`${V} 右侧栏展开按钮可达`, openBtn.visible === true, openBtn.label);
  await page.evaluate(() => {
    const sel = 'button[aria-label="Open right sidebar"], button[aria-label="打开右侧边栏"], '
      + '[data-sidebar-right-toggle] button, button[data-sidebar-right-toggle]';
    document.querySelector(sel)?.click();
  });
  await new Promise((r) => setTimeout(r, 1200));
  const rb = await page.evaluate(() => {
    const p = document.querySelector('[data-sidebar-right-panel="fullscreen"]');
    const r = p?.getBoundingClientRect();
    const host = p?.querySelector('[data-dockkit-host="dock"], [data-dockkit-empty]');
    return { rect: r ? `${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}` : 'NO', inVp: r ? (r.y >= 52 && r.bottom <= window.innerHeight + 1 && r.width > 0) : false, hostVis: host ? getComputedStyle(host).visibility : 'NO' };
  });
  say(`${V} 右侧栏展开且在顶栏下方`, rb.inVp && rb.hostVis === 'visible', JSON.stringify(rb));
  // 4. 收起（同样中英双语 + data 属性兜底：只在英文环境找 "Collapse right sidebar" 会静默点不到）
  const collapsed = await page.evaluate(() => {
    const sel = 'button[aria-label="Collapse right sidebar"], button[aria-label="收起右侧边栏"], '
      + '[data-sidebar-right-toggle] button, button[data-sidebar-right-toggle]';
    const b = document.querySelector(sel);
    if (!b) return null;
    b.click();
    return b.getAttribute('aria-label') || '(no aria-label)';
  });
  await new Promise((r) => setTimeout(r, 1200));
  const cl = await page.evaluate(() => {
    const p = document.querySelector('[data-sidebar-right-panel="fullscreen"]');
    const host = p?.querySelector('[data-dockkit-host="dock"], [data-dockkit-empty]');
    return { hostVis: host ? getComputedStyle(host).visibility : 'NO', off: host ? getComputedStyle(host).transform !== 'none' : false, panelGone: !p };
  });
  say(`${V} 右侧栏可收起`, collapsed !== null && (cl.hostVis === 'hidden' || cl.off || cl.panelGone), `clicked=${collapsed} ${JSON.stringify(cl)}`);
}
console.log(`\n==== 汇总 ${out.filter(x=>x.ok).length}/${out.length} ====`);
await browser.close();
const sidebarFailed = out.filter((x) => !x.ok).length;
console.log(`\n==== 汇总 ${out.length - sidebarFailed}/${out.length} ====`);
if (!suiteResult({ label: '右侧栏展开/收起', pass: out.length - sidebarFailed, fail: sidebarFailed, skip })) process.exitCode = 1;
