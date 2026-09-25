// 全分类 × 全视口扫描：逐个设置分类检查是否仍有被 overflow:hidden 永久裁切的元素
// 用法：node test/browser/mobile-settings-all-sections.mjs
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { launchOptions, shotsDir, connect } from './helpers.mjs';

const SHOTS = shotsDir('mobile-settings-all-sections');
const CHROME = launchOptions().executablePath;
const { cookie: c, cookieName: cn } = connect();

const VIEWPORTS = [
  { name: '375x667', width: 375, height: 667, narrow: true },
  { name: '390x844', width: 390, height: 844, narrow: true },
  { name: '667x375-landscape', width: 667, height: 375, narrow: false },
  { name: '768x1024', width: 768, height: 1024, narrow: false },
];

const rows = [];
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });

for (const vp of VIEWPORTS) {
  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1, isMobile: vp.narrow, hasTouch: vp.narrow });
  await page.setCookie({ name: cn, value: c.slice(cn.length + 1), domain: '127.0.0.1', path: '/' });
  await page.goto('http://127.0.0.1:3080/', { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 4000));
  await page.evaluate(() => document.querySelector('button[aria-label="Settings"]')?.click());
  await new Promise((r) => setTimeout(r, 1200));

  const labels = await page.evaluate(() => {
    const ov = document.querySelector('[class*="VOzbGW_overlay"]');
    return [...ov.querySelectorAll('button[class*="VOzbGW_navCell"]')].map((b) => (b.textContent || '').trim());
  });

  for (let i = 0; i < labels.length; i += 1) {
    await page.evaluate((idx) => {
      const ov = document.querySelector('[class*="VOzbGW_overlay"]');
      ov.querySelectorAll('button[class*="VOzbGW_navCell"]')[idx].click();
    }, i);
    // Plugin Market / Agent presets 首屏要拉取数据，多等一会
    await new Promise((r) => setTimeout(r, labels[i].includes('Market') ? 4500 : 1800));

    const m = await page.evaluate(() => {
      const ov = document.querySelector('[class*="VOzbGW_overlay"]');
      const opts = ov.querySelector('[class*="VOzbGW_options"]');
      const or = opts.getBoundingClientRect();
      const clipped = [];
      for (const el of opts.querySelectorAll('*')) {
        const r = el.getBoundingClientRect();
        if (!(r.width > 0 && r.height > 0 && r.right > or.right + 1)) continue;
        // 语义：元素是否被「不可滑动的裁剪祖先」永久裁掉。
        // 从元素向上找第一个 overflow-x 非 visible 的祖先 —— 它才是真正决定裁切的盒子：
        //   auto/scroll → 用户能滑出来，可达（例如 Plugin Market 的截图横滑条 cardShots）
        //   hidden/clip → 超出它的右边界就是永久看不见
        let a = el.parentElement;
        let hit = null;
        while (a) {
          const cs = getComputedStyle(a);
          if (cs.overflowX === 'auto' || cs.overflowX === 'scroll') break;
          if (cs.overflowX === 'hidden' || cs.overflowX === 'clip') {
            if (r.right > a.getBoundingClientRect().right + 1) hit = { cls: String(a.className).slice(0, 40), right: Math.round(a.getBoundingClientRect().right) };
            break;
          }
          if (a === opts) break;
          a = a.parentElement;
        }
        if (hit) clipped.push({ tag: el.tagName, text: (el.textContent || '').trim().slice(0, 18), right: Math.round(r.right), clipRight: hit.right });
      }
      // 自身横滑容器（Tab 条类）：越界但可在容器内滑到 = 可达
      const scrollers = [...opts.querySelectorAll('*')]
        .filter((el) => {
          const cs = getComputedStyle(el);
          return (cs.overflowX === 'auto' || cs.overflowX === 'scroll') && el.scrollWidth > el.clientWidth + 1;
        })
        .map((el) => ({ cls: String(el.className).slice(0, 40), scrollW: el.scrollWidth, clientW: el.clientWidth }));
      return {
        optionsW: Math.round(or.width),
        optionsOverflowX: getComputedStyle(opts).overflowX,
        optionsScrollW: opts.scrollWidth,
        optionsClientW: opts.clientWidth,
        contentOverflowsOptions: opts.scrollWidth > opts.clientWidth + 1,
        clipped: clipped.slice(0, 6),
        clippedCount: clipped.length,
        scrollers: scrollers.slice(0, 4),
      };
    });

    const ok = m.clippedCount === 0;
    rows.push({ viewport: vp.name, section: labels[i], ok, ...m });
    console.log(`${ok ? 'PASS' : 'FAIL'}  [${vp.name}] ${labels[i].padEnd(16)} options=${m.optionsW}px overflowX=${m.optionsOverflowX} 内部横滑容器=${m.scrollers.length} 永久裁切=${m.clippedCount} ${m.clippedCount ? JSON.stringify(m.clipped) : ''}`);
    await page.screenshot({ path: path.join(SHOTS, `${vp.name}__${i}-${labels[i].replace(/[^\w\u4e00-\u9fa5]/g, '_')}.png`) });

    // 窄屏：回到列表页再进下一个分类
    if (vp.narrow) {
      await page.evaluate(() => {
        const ov = document.querySelector('[class*="VOzbGW_overlay"]');
        ov.querySelector('div[class*="VOzbGW_navTitle"]').click();
      });
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  await page.close();
  console.log('');
}

await browser.close();
fs.writeFileSync(path.join(SHOTS, 'verify-mobile-settings-all-sections.json'), JSON.stringify(rows, null, 2));
const failed = rows.filter((r) => !r.ok);
console.log(`==== 汇总：${rows.length - failed.length}/${rows.length} 通过 ====`);
if (failed.length) {
  for (const f of failed) console.log(`  FAIL [${f.viewport}] ${f.section} :: ${JSON.stringify(f.clipped)}`);
  process.exitCode = 1;
}
