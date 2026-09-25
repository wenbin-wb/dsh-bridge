// 关闭按钮位置验收（真实 GUI）：✕ 必须与标题/返回行同处第一行、位于面板右上角、可点可关；
// 宿主/第三方 action 槽下沉为底部动作栏，且不挤压内容列。
// 用法：node test/browser/mobile-settings-close.mjs
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { launchOptions, shotsDir, connect } from './helpers.mjs';

const SHOTS = shotsDir('mobile-settings-close');
const CHROME = launchOptions().executablePath;
const { cookie: c, cookieName: cn } = connect();

const out = [];
const say = (name, ok, detail) => {
  out.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
};

const VIEWPORTS = [
  { name: '320x480', width: 320, height: 480 },
  { name: '375x667', width: 375, height: 667 },
  { name: '390x844', width: 390, height: 844 },
  { name: '412x915', width: 412, height: 915 },
];

const measure = () => {
  const ov = document.querySelector('[class*="VOzbGW_overlay"]');
  if (!ov) return { found: false };
  const panel = ov.querySelector('[class*="VOzbGW_panel"]');
  const pr = panel.getBoundingClientRect();
  const close = ov.querySelector('button[class*="VOzbGW_close"]');
  const title = ov.querySelector('div[class*="VOzbGW_navTitle"]');
  const actions = ov.querySelector('div[class*="VOzbGW_actions"]');
  const options = ov.querySelector('[class*="VOzbGW_options"]');
  const nav = ov.querySelector('nav[class*="VOzbGW_nav"]');
  const cr = close.getBoundingClientRect();
  const tr = title.getBoundingClientRect();
  const range = document.createRange();
  range.selectNodeContents(title);
  const rects = [...range.getClientRects()];
  const textRight = rects.length ? Math.max(...rects.map((x) => x.right)) : tr.right;
  const textMidY = rects.length ? (Math.min(...rects.map((x) => x.top)) + Math.max(...rects.map((x) => x.bottom))) / 2 : tr.top + tr.height / 2;
  const hit = document.elementFromPoint(cr.x + cr.width / 2, cr.y + cr.height / 2);
  const ar = actions ? actions.getBoundingClientRect() : null;
  const orr = options ? options.getBoundingClientRect() : null;
  const nr = nav ? nav.getBoundingClientRect() : null;
  const cs = getComputedStyle(close);
  return {
    found: true,
    relTop: Math.round(cr.top - pr.top),
    relRight: Math.round(pr.right - cr.right),
    closeSize: { w: Math.round(cr.width), h: Math.round(cr.height) },
    closeCenterY: Math.round(cr.top + cr.height / 2),
    titleTextMidY: Math.round(textMidY),
    titleTextRight: Math.round(textRight),
    closeLeftEdge: Math.round(cr.left),
    sameRow: Math.abs(cr.top + cr.height / 2 - textMidY) <= 8,
    titleClear: textRight <= cr.left + 1,
    hittable: !!hit && (close === hit || close.contains(hit)),
    visible: cs.visibility !== 'hidden' && cr.width > 0 && cr.bottom <= innerHeight + 0.5 && cr.right <= innerWidth + 0.5,
    withinPanel: cr.top >= pr.top - 1 && cr.right <= pr.right + 1,
    actions: ar ? { y: Math.round(ar.top - pr.top), h: Math.round(ar.height) } : null,
    panelBottom: Math.round(pr.bottom),
    actionsAtBottom: ar ? pr.bottom - ar.bottom <= 16 : null,
    optionsTop: orr ? Math.round(orr.top - pr.top) : null,
    optionsH: orr ? Math.round(orr.height) : 0,
    navBottom: nr ? Math.round(nr.bottom - pr.top) : null,
    actionsOverlapsOptions: ar && orr ? !(ar.bottom <= orr.top + 1 || ar.top >= orr.bottom - 1) : null,
    actionsOverlapsNav: ar && nr ? !(ar.bottom <= nr.top + 1 || ar.top >= nr.bottom - 1) : null,
    // 详情页那条 navTitle 规则特异性更高、会整体覆盖基类 padding，故这里量**计算值**
    titlePaddingRight: Number.parseFloat(getComputedStyle(title).paddingRight) || 0,
    closeW: Math.round(cr.width),
    closeR: Math.round(pr.right - cr.right),
  };
};

// 注入一个**不可折行**的超长 token（无空格），验证标题也不会钻到 ✕ 下面。
// 留白只能管盒内、管不住溢出，这是独立验收指出的第三类边界（实测交叠 707px²）。
const overlapWithLongToken = () => {
  const ov = document.querySelector('[class*="VOzbGW_overlay"]');
  const title = ov.querySelector('div[class*="VOzbGW_navTitle"]');
  const close = ov.querySelector('button[class*="VOzbGW_close"]');
  const saved = [...title.childNodes].map((n) => n.cloneNode(true));
  title.textContent = 'A'.repeat(81);
  const cr = close.getBoundingClientRect();
  const tr = title.getBoundingClientRect();
  const range = document.createRange();
  range.selectNodeContents(title);
  const rects = [...range.getClientRects()];
  const textRight = rects.length ? Math.max(...rects.map((x) => x.right)) : tr.right;
  const overflowX = title.scrollWidth > title.clientWidth + 1;
  title.textContent = '';
  for (const n of saved) title.appendChild(n);
  return { textRight: Math.round(textRight), closeLeft: Math.round(cr.left), overlap: textRight > cr.left + 1, overflowX };
};

// 注入一个超长标题，验证标题绝不会钻到 ✕ 下面（矩形不相交）
const overlapWithLongTitle = () => {
  const ov = document.querySelector('[class*="VOzbGW_overlay"]');
  const title = ov.querySelector('div[class*="VOzbGW_navTitle"]');
  const close = ov.querySelector('button[class*="VOzbGW_close"]');
  const saved = [...title.childNodes].map((n) => n.cloneNode(true));
  title.textContent = 'A very long settings section title that should never collide with the close button';
  const tr = title.getBoundingClientRect();
  const cr = close.getBoundingClientRect();
  const range = document.createRange();
  range.selectNodeContents(title);
  const rects = [...range.getClientRects()];
  const textRight = rects.length ? Math.max(...rects.map((x) => x.right)) : tr.right;
  const overlap = textRight > cr.left + 1;
  title.textContent = '';
  for (const n of saved) title.appendChild(n);
  return { textRight: Math.round(textRight), closeLeft: Math.round(cr.left), overlap };
};

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });

for (const vp of VIEWPORTS) {
  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await page.setCookie({ name: cn, value: c.slice(cn.length + 1), domain: '127.0.0.1', path: '/' });
  await page.goto('http://127.0.0.1:3080/', { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 4200));
  await page.evaluate(() => document.querySelector('button[aria-label="Settings"]')?.click());
  await new Promise((r) => setTimeout(r, 1300));

  // --- 列表页 ---
  const menu = await page.evaluate(measure);
  say(`${vp.name} 列表页：✕ 位于面板右上角`, menu.found && menu.relTop <= 14 && menu.relRight <= 14 && menu.withinPanel, `relTop=${menu.relTop} relRight=${menu.relRight}`);
  say(`${vp.name} 列表页：✕ 与标题同一行`, menu.sameRow, `✕中心y=${menu.closeCenterY} 标题文字中心y=${menu.titleTextMidY}`);
  say(`${vp.name} 列表页：标题未钻到 ✕ 下面`, menu.titleClear, `标题右端=${menu.titleTextRight} ✕左端=${menu.closeLeftEdge}`);
  say(`${vp.name} 列表页：✕ 可命中且可见`, menu.hittable && menu.visible);
  say(`${vp.name} 列表页：标题右侧留白 >= ✕ 宽+右边距`, menu.titlePaddingRight >= menu.closeW + menu.closeR, `留白=${menu.titlePaddingRight}px ✕=${menu.closeW}+${menu.closeR}`);
  const ovlM = await page.evaluate(overlapWithLongTitle);
  say(`${vp.name} 列表页：注入超长标题后仍不与 ✕ 交叠`, ovlM.overlap === false, `标题右端=${ovlM.textRight} ✕左端=${ovlM.closeLeft}`);
  const tokM = await page.evaluate(overlapWithLongToken);
  say(`${vp.name} 列表页：注入不可折行超长 token 后仍不与 ✕ 交叠`, tokM.overlap === false, `标题右端=${tokM.textRight} ✕左端=${tokM.closeLeft} 横向溢出=${tokM.overflowX}`);
  say(`${vp.name} 列表页：动作栏在面板底部`, menu.actionsAtBottom === true, `actionsY=${menu.actions?.y} panelBottom=${menu.panelBottom}`);
  say(`${vp.name} 列表页：动作栏不与列表重叠`, menu.actionsOverlapsNav === false);
  await page.screenshot({ path: path.join(SHOTS, `${vp.name}__menu.png`) });

  // 点 ✕ 真能关
  await page.evaluate(() => document.querySelector('button[class*="VOzbGW_close"]').click());
  await new Promise((r) => setTimeout(r, 800));
  say(`${vp.name} 列表页：点 ✕ 真的关闭弹窗`, await page.evaluate(() => !document.querySelector('[class*="VOzbGW_overlay"]')));

  // --- 详情页 ---
  await page.evaluate(() => document.querySelector('button[aria-label="Settings"]')?.click());
  await new Promise((r) => setTimeout(r, 1200));
  await page.evaluate(() => document.querySelectorAll('button[class*="VOzbGW_navCell"]')[2].click());
  await new Promise((r) => setTimeout(r, 1900));
  const detail = await page.evaluate(measure);
  say(`${vp.name} 详情页：✕ 位于面板右上角`, detail.found && detail.relTop <= 14 && detail.relRight <= 14 && detail.withinPanel, `relTop=${detail.relTop} relRight=${detail.relRight}`);
  say(`${vp.name} 详情页：✕ 与返回行同一行`, detail.sameRow, `✕中心y=${detail.closeCenterY} 返回文字中心y=${detail.titleTextMidY}`);
  say(`${vp.name} 详情页：返回文字未钻到 ✕ 下面`, detail.titleClear, `返回右端=${detail.titleTextRight} ✕左端=${detail.closeLeftEdge}`);
  say(`${vp.name} 详情页：✕ 可命中且可见`, detail.hittable && detail.visible);
  say(`${vp.name} 详情页：标题右侧留白 >= ✕ 宽+右边距（曾被高特异性规则覆盖成 4px）`, detail.titlePaddingRight >= detail.closeW + detail.closeR, `留白=${detail.titlePaddingRight}px ✕=${detail.closeW}+${detail.closeR}`);
  const ovlD = await page.evaluate(overlapWithLongTitle);
  say(`${vp.name} 详情页：注入超长标题后仍不与 ✕ 交叠`, ovlD.overlap === false, `标题右端=${ovlD.textRight} ✕左端=${ovlD.closeLeft}`);
  const tokD = await page.evaluate(overlapWithLongToken);
  say(`${vp.name} 详情页：注入不可折行超长 token 后仍不与 ✕ 交叠`, tokD.overlap === false, `标题右端=${tokD.textRight} ✕左端=${tokD.closeLeft} 横向溢出=${tokD.overflowX}`);
  say(`${vp.name} 详情页：动作栏下沉到底部且不与内容重叠`, detail.actionsAtBottom === true && detail.actionsOverlapsOptions === false, `actionsY=${detail.actions?.y} optionsTop=${detail.optionsTop} optionsH=${detail.optionsH}`);
  say(`${vp.name} 详情页：内容区高度未被动作栏挤没`, (detail.optionsH ?? 0) >= 150, `optionsH=${detail.optionsH}`);
  await page.screenshot({ path: path.join(SHOTS, `${vp.name}__detail.png`) });

  // 返回仍可用
  await page.evaluate(() => document.querySelector('div[class*="VOzbGW_navTitle"]').click());
  await new Promise((r) => setTimeout(r, 800));
  say(`${vp.name} 详情页：点返回行仍能回到列表`, await page.evaluate(() => !document.querySelector('[class*="VOzbGW_panel"]').getAttribute('data-dshbr-settings-view')));
  await page.close();
}

await browser.close();
const failed = out.filter((x) => !x.ok);
console.log(`\n==== 关闭按钮位置验收汇总：${out.length - failed.length}/${out.length} 通过 ====`);
if (failed.length) process.exitCode = 1;
