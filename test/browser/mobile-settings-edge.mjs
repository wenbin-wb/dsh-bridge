// 补充验证（在独立验收之后运行，避免与变异测试并发）：
//   A. 极窄屏 320×480（主验证脚本未覆盖）
//   B. 插件市场设置页「已安装 / 高级」页签在 375px 下是否真的可达（用户原始诉求"直接看不到"）
//   C. 详情页返回后的滚动状态是否干净（nav 不应残留滚动位置）
// 用法：node test/browser/mobile-settings-edge.mjs
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { launchOptions, shotsDir, connect } from './helpers.mjs';

const SHOTS = shotsDir('mobile-settings-edge');
const CHROME = launchOptions().executablePath;
const { cookie: c, cookieName: cn } = connect();

const out = [];
const say = (name, ok, detail) => {
  out.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
};

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });

// ---------- A. 320x480 极窄屏 ----------
{
  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  await page.setViewport({ width: 320, height: 480, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await page.setCookie({ name: cn, value: c.slice(cn.length + 1), domain: '127.0.0.1', path: '/' });
  await page.goto('http://127.0.0.1:3080/', { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 4000));
  await page.evaluate(() => document.querySelector('button[aria-label="Settings"]')?.click());
  await new Promise((r) => setTimeout(r, 1200));

  const menu = await page.evaluate(() => {
    const ov = document.querySelector('[class*="VOzbGW_overlay"]');
    const nav = ov.querySelector('nav[class*="VOzbGW_nav"]');
    const nr = nav.getBoundingClientRect();
    const cells = [...nav.querySelectorAll('button[class*="VOzbGW_navCell"]')];
    const close = ov.querySelector('[class*="VOzbGW_close"]');
    const cr = close.getBoundingClientRect();
    return {
      cellCount: cells.length,
      allInsideNav: cells.every((b) => {
        const r = b.getBoundingClientRect();
        return r.top >= nr.top - 0.5 && r.bottom <= nr.bottom + 0.5 && r.left >= nr.left - 0.5 && r.right <= nr.right + 0.5;
      }),
      navScrollable: nav.scrollHeight > nav.clientHeight + 1,
      closeVisible: close.offsetParent !== null && cr.width > 0 && cr.right <= innerWidth + 0.5 && cr.bottom <= innerHeight + 0.5,
      docScrollW: document.documentElement.scrollWidth,
      innerW: innerWidth,
    };
  });
  say('320x480 分类行全部落在导航容器内（未溢出）', menu.allInsideNav, `cells=${menu.cellCount} navScrollable=${menu.navScrollable}`);
  say('320x480 关闭按钮可见且在视口内', menu.closeVisible);
  say('320x480 无整页横向滚动条', menu.docScrollW <= menu.innerW + 1, `scrollW=${menu.docScrollW} innerW=${menu.innerW}`);
  await page.screenshot({ path: path.join(SHOTS, '320x480__menu.png') });

  await page.evaluate(() => document.querySelectorAll('button[class*="VOzbGW_navCell"]')[2].click());
  await new Promise((r) => setTimeout(r, 2200));
  const detail = await page.evaluate(() => {
    const ov = document.querySelector('[class*="VOzbGW_overlay"]');
    const opts = ov.querySelector('[class*="VOzbGW_options"]');
    const back = ov.querySelector('div[class*="VOzbGW_navTitle"]');
    const br = back.getBoundingClientRect();
    const hit = document.elementFromPoint(br.left + br.width / 2, br.top + br.height / 2);
    return {
      optionsW: Math.round(opts.getBoundingClientRect().width),
      optionsScrollW: opts.scrollWidth,
      optionsClientW: opts.clientWidth,
      backText: (back.textContent || '').trim(),
      backHittable: !!hit && (back === hit || back.contains(hit)),
      docScrollW: document.documentElement.scrollWidth,
      innerW: innerWidth,
    };
  });
  say('320x480 详情页内容区占满整宽', detail.optionsW >= 290, `optionsW=${detail.optionsW}`);
  say('320x480 详情页无整页横向滚动条', detail.docScrollW <= detail.innerW + 1, `scrollW=${detail.docScrollW}`);
  say('320x480 返回行可点中', detail.backHittable, `text=${detail.backText}`);
  await page.screenshot({ path: path.join(SHOTS, '320x480__detail.png') });
  await page.close();
}

// ---------- B. 插件市场页签在 375px 是否可达 ----------
for (const width of [375, 390]) {
  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  await page.setViewport({ width, height: 800, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await page.setCookie({ name: cn, value: c.slice(cn.length + 1), domain: '127.0.0.1', path: '/' });
  await page.goto('http://127.0.0.1:3080/', { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 4000));
  await page.evaluate(() => document.querySelector('button[aria-label="Settings"]')?.click());
  await new Promise((r) => setTimeout(r, 1000));
  await page.evaluate(() => {
    const ov = document.querySelector('[class*="VOzbGW_overlay"]');
    [...ov.querySelectorAll('button[class*="VOzbGW_navCell"]')].find((x) => /Plugin Market/.test(x.textContent))?.click();
  });
  await new Promise((r) => setTimeout(r, 6000));

  const before = await page.evaluate(() => {
    const ov = document.querySelector('[class*="VOzbGW_overlay"]');
    const opts = ov.querySelector('[class*="VOzbGW_options"]');
    const or = opts.getBoundingClientRect();
    const tabs = [...opts.querySelectorAll('button')].filter((b) => /Discover|Themes|Favorites|Installed|Advanced|发现|主题|收藏|已安装|高级/i.test(b.textContent || ''));
    return {
      optionsScrollW: opts.scrollWidth,
      optionsClientW: opts.clientWidth,
      maxScrollLeft: opts.scrollWidth - opts.clientWidth,
      tabs: tabs.map((t) => {
        const r = t.getBoundingClientRect();
        return { text: (t.textContent || '').trim().slice(0, 16), left: Math.round(r.left), right: Math.round(r.right), insideOptions: r.left >= or.left - 1 && r.right <= or.right + 1 };
      }),
    };
  });

  // 横向滑动内容区到最右，再看目标页签是否进入可视且可命中
  const after = await page.evaluate(() => {
    const ov = document.querySelector('[class*="VOzbGW_overlay"]');
    const opts = ov.querySelector('[class*="VOzbGW_options"]');
    opts.scrollLeft = 9999;
    const or = opts.getBoundingClientRect();
    const tabs = [...opts.querySelectorAll('button')].filter((b) => /Discover|Themes|Favorites|Installed|Advanced|发现|主题|收藏|已安装|高级/i.test(b.textContent || ''));
    const res = tabs.map((t) => {
      const r = t.getBoundingClientRect();
      const cx = Math.min(Math.max(r.left + r.width / 2, or.left + 2), or.right - 2);
      const cy = Math.min(Math.max(r.top + r.height / 2, or.top + 2), or.bottom - 2);
      const hit = document.elementFromPoint(cx, cy);
      return {
        text: (t.textContent || '').trim().slice(0, 16),
        left: Math.round(r.left),
        right: Math.round(r.right),
        insideOptions: r.left >= or.left - 1 && r.right <= or.right + 1,
        hittable: !!hit && (t === hit || t.contains(hit)),
      };
    });
    return { scrollLeft: opts.scrollLeft, optionsRight: Math.round(or.right), tabs: res };
  });

  const target = after.tabs.find((t) => /Installed|已安装/i.test(t.text));
  const advanced = after.tabs.find((t) => /Advanced|高级/i.test(t.text));
  say(
    `${width}px 插件市场「已安装」页签可滑入可视区并可点中`,
    !!target && target.insideOptions && target.hittable,
    `before=${JSON.stringify(before.tabs)} afterScrollLeft=${after.scrollLeft} target=${JSON.stringify(target)}`,
  );
  say(
    `${width}px 插件市场「高级」页签可滑入可视区并可点中`,
    !!advanced && advanced.insideOptions && advanced.hittable,
    `${JSON.stringify(advanced)}`,
  );
  say(`${width}px 内容区确实可横向滚动（maxScrollLeft>0）`, before.maxScrollLeft > 0, `scrollW/clientW=${before.optionsScrollW}/${before.optionsClientW}`);
  await page.screenshot({ path: path.join(SHOTS, `${width}__market-scrolled.png`) });
  await page.close();
}

// ---------- C. 返回后 nav 滚动状态干净 ----------
{
  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  await page.setViewport({ width: 375, height: 667, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await page.setCookie({ name: cn, value: c.slice(cn.length + 1), domain: '127.0.0.1', path: '/' });
  await page.goto('http://127.0.0.1:3080/', { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 4000));
  await page.evaluate(() => document.querySelector('button[aria-label="Settings"]')?.click());
  await new Promise((r) => setTimeout(r, 1000));
  await page.evaluate(() => document.querySelectorAll('button[class*="VOzbGW_navCell"]')[5].click());
  await new Promise((r) => setTimeout(r, 1200));
  await page.evaluate(() => document.querySelector('div[class*="VOzbGW_navTitle"]').click());
  await new Promise((r) => setTimeout(r, 800));
  const st = await page.evaluate(() => {
    const ov = document.querySelector('[class*="VOzbGW_overlay"]');
    const nav = ov.querySelector('nav[class*="VOzbGW_nav"]');
    const panel = ov.querySelector('[class*="VOzbGW_panel"]');
    return { navScrollTop: nav.scrollTop, attr: panel.getAttribute('data-dshbr-settings-view'), optionsDisplay: getComputedStyle(ov.querySelector('[class*="VOzbGW_options"]')).display };
  });
  say('返回列表后视图属性已清除且 nav 滚动归零', st.attr === null && st.navScrollTop === 0, JSON.stringify(st));
  await page.close();
}

await browser.close();
const failed = out.filter((x) => !x.ok);
console.log(`\n==== 补充验证汇总：${out.length - failed.length}/${out.length} 通过 ====`);
if (failed.length) process.exitCode = 1;
