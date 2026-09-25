// 应用市场「安装插件」流程验收（真实 GUI）
//   A. 点 Install 后确认框必须可见、不被设置弹窗遮罩拦截（z-index 修复）
//   B. 确认框不得超出视口；矮视口下允许内部滚动，但底部按钮必须**滚动后可达**
//   C. 桌面/竖屏等正常视口不得出现回归
//
// 安全约束：本脚本**绝不点击**「Confirm install / 确认安装」——那会真的改动用户环境。
// 只做命中测试（elementFromPoint）与滚动，不触发安装。
//
// 用法：node test/browser/market-install.mjs
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { launchOptions, shotsDir, connect } from './helpers.mjs';

const SHOTS = shotsDir('market-install');
const CHROME = launchOptions().executablePath;
const { cookie: c, cookieName: cn } = connect();

const rows = [];
const say = (n, ok, d) => {
  rows.push({ n, ok, d });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? ' — ' + d : ''}`);
};

const VIEWPORTS = [
  { n: '320x480', w: 320, h: 480 },
  { n: '375x667', w: 375, h: 667 },
  { n: '390x844', w: 390, h: 844 },
  { n: '667x375', w: 667, h: 375 },
  { n: '844x390', w: 844, h: 390 },
];

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });

for (const vp of VIEWPORTS) {
  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await page.setCookie({ name: cn, value: c.slice(cn.length + 1), domain: '127.0.0.1', path: '/' });
  await page.goto('http://127.0.0.1:3080/', { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 4200));
  await page.evaluate(() => document.querySelector('button[aria-label="Settings"]')?.click());
  await new Promise((r) => setTimeout(r, 1200));
  await page.evaluate(() => {
    const ov = document.querySelector('[class*="VOzbGW_overlay"]');
    [...ov.querySelectorAll('button[class*="VOzbGW_navCell"]')].find((x) => /Plugin Market/.test(x.textContent))?.click();
  });
  await new Promise((r) => setTimeout(r, 7000));
  const clicked = await page.evaluate(() => {
    const ov = document.querySelector('[class*="VOzbGW_overlay"]');
    const o = ov.querySelector('[class*="VOzbGW_options"]');
    const b = [...o.querySelectorAll('button')].find((x) => /^Install$/i.test((x.textContent || '').trim()));
    if (!b) return false;
    b.click();
    return true;
  });
  await new Promise((r) => setTimeout(r, 2500));

  const m = await page.evaluate(() => {
    const dlgRoot = [...document.body.children].find((e) => e.tagName === 'DIV' && e.querySelector(':scope > div[role="dialog"]'));
    if (!dlgRoot) return { found: false };
    const inner = dlgRoot.querySelector(':scope > div[role="dialog"]');
    const ir = inner.getBoundingClientRect();
    const pt = (x, y) => {
      const e = document.elementFromPoint(x, y);
      return e ? { tag: e.tagName, cls: String(e.className).slice(0, 28), inside: dlgRoot.contains(e) } : null;
    };
    const samples = [pt(ir.left + 8, ir.top + 8), pt(ir.left + ir.width / 2, ir.top + ir.height / 2), pt(ir.right - 8, ir.bottom - 8)];
    const hitBtn = (b) => {
      const r = b.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0 || r.bottom < 0 || r.top > innerHeight) return false;
      const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return !!e && (b === e || b.contains(e));
    };
    const namedBtns = [...dlgRoot.querySelectorAll('button')].filter((b) => (b.textContent || '').trim());
    const before = namedBtns.map((b) => ({ text: (b.textContent || '').trim().slice(0, 18), hit: hitBtn(b) }));
    // 滚动对话框到底，再看按钮是否可达（矮视口下这是预期路径）
    const cs = getComputedStyle(inner);
    const canScroll = inner.scrollHeight > inner.clientHeight + 1;
    inner.scrollTop = 99999;
    const scrolledTo = inner.scrollTop;
    const after = namedBtns.map((b) => ({ text: (b.textContent || '').trim().slice(0, 18), hit: hitBtn(b) }));
    inner.scrollTop = 0;
    return {
      found: true,
      rootZ: Number(getComputedStyle(dlgRoot).zIndex),
      innerOverflowY: cs.overflowY,
      innerMaxH: cs.maxHeight,
      innerRect: { x: Math.round(ir.x), y: Math.round(ir.y), w: Math.round(ir.width), h: Math.round(ir.height), right: Math.round(ir.right), bottom: Math.round(ir.bottom) },
      fitsX: ir.left >= -6 && ir.right <= innerWidth + 6,
      fitsY: ir.top >= -6 && ir.bottom <= innerHeight + 6,
      samples,
      allSamplesInside: samples.every((s) => s && s.inside),
      canScroll,
      scrolledTo,
      before,
      after,
      confirmButtons: namedBtns.map((b) => (b.textContent || '').trim()).filter((t) => /confirm|install|确定|确认|安装/i.test(t)),
      viewport: { w: innerWidth, h: innerHeight },
    };
  });

  console.log(`\n=== ${vp.n}（点 Install 命中=${clicked}）===`);
  console.log(JSON.stringify({ rootZ: m.rootZ, innerRect: m.innerRect, fitsX: m.fitsX, fitsY: m.fitsY, overflowY: m.innerOverflowY, maxH: m.innerMaxH, canScroll: m.canScroll, scrolledTo: m.scrolledTo, allSamplesInside: m.allSamplesInside, before: m.before, after: m.after }, null, 1));

  say(`${vp.n} 确认框已渲染`, m.found);
  if (m.found) {
    say(`${vp.n} 模态根 z-index 高于设置弹窗(10002)`, m.rootZ > 10002, `rootZ=${m.rootZ}`);
    say(`${vp.n} 三处采样点均命中确认框内部（未被设置弹窗遮罩拦截）`, m.allSamplesInside, JSON.stringify(m.samples));
    say(`${vp.n} 确认框横向不超出视口`, m.fitsX, `x=${m.innerRect.x}..${m.innerRect.right} vw=${m.viewport.w}`);
    say(`${vp.n} 确认框纵向不超出视口`, m.fitsY, `y=${m.innerRect.y}..${m.innerRect.bottom} vh=${m.viewport.h}`);
    const reachable = m.before.some((b) => b.hit) || m.after.some((b) => b.hit);
    say(`${vp.n} 底部动作按钮可达（直接命中或滚动后命中）`, reachable, `直接=${JSON.stringify(m.before)} 滚动后=${JSON.stringify(m.after)}`);
    // 正常竖屏（够高）不应被迫滚动
    if (vp.h >= 640) {
      say(`${vp.n} 正常竖屏下无需滚动即可看到全部按钮`, m.before.every((b) => b.hit), JSON.stringify(m.before));
    }
  }
  await page.screenshot({ path: path.join(SHOTS, `verify-${vp.n}.png`) });
  await page.close();
}

await browser.close();
const failed = rows.filter((r) => !r.ok);
console.log(`\n==== 市场安装流程验收汇总：${rows.length - failed.length}/${rows.length} 通过 ====`);
if (failed.length) process.exitCode = 1;
