// 对抗用例（针对独立验收的发现 1）：
//   1) 回退路径可达性：把就绪开关摘掉（等价于「CSS 6.2 惰性」），<=480px 必须退回
//      767 块的 88px 图标轨道，且设置内容完整可达 —— 不是点了没反应的死列表。
//   2) 对照组：正常环境下开关为 ready 且走钻取布局。
//   3) 结构顺序：apply() 里 setupSettingsDrilldown() 必须先于 setupMobileExperience()，
//      这是「CSS 已生效、监听器未装」不可达的根本保证（由单测断言，这里只做运行时核对）。
//
// 已知且明确不覆盖：无法探测「addEventListener 被环境静默丢弃」。做这种自检必须在
// document 上派发合成 click，而全量 bundle 里宿主+第三方共有 6 个 document 级 click
// 监听（另有多组 mousedown/pointerdown）会被误触发，代价大于收益。详见 mobile-styles.js
// 6.2 块顶部的安全说明。
//
// 用法：node test/browser/mobile-settings-fallback.mjs
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { launchOptions, shotsDir, connect } from './helpers.mjs';

const SHOTS = shotsDir('mobile-settings-fallback');
const CHROME = launchOptions().executablePath;
const { cookie: c, cookieName: cn } = connect();

const out = [];
const say = (name, ok, detail) => {
  out.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
};

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });

// ---------- 1) 回退路径 ----------
for (const vp of [
  { name: '375x667', width: 375, height: 667 },
  { name: '320x480', width: 320, height: 480 },
]) {
  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await page.setCookie({ name: cn, value: c.slice(cn.length + 1), domain: '127.0.0.1', path: '/' });
  await page.goto('http://127.0.0.1:3080/', { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 4500));

  const armed = await page.evaluate(() => document.documentElement.getAttribute('data-dshbr-drilldown'));
  say(`${vp.name} 正常环境下就绪开关为 ready`, armed === 'ready', `gate=${armed}`);

  // 摘掉开关 = 模拟「CSS 6.2 惰性」这一回退分支
  await page.evaluate(() => document.documentElement.removeAttribute('data-dshbr-drilldown'));
  await page.evaluate(() => document.querySelector('button[aria-label="Settings"]')?.click());
  await new Promise((r) => setTimeout(r, 1500));

  const fb = await page.evaluate(() => {
    const ov = document.querySelector('[class*="VOzbGW_overlay"]');
    if (!ov) return { found: false };
    const panel = ov.querySelector('[class*="VOzbGW_panel"]');
    const nav = ov.querySelector('nav[class*="VOzbGW_nav"]');
    const opts = ov.querySelector('[class*="VOzbGW_options"]');
    const navRect = nav.getBoundingClientRect();
    const cells = [...nav.querySelectorAll('button[class*="VOzbGW_navCell"]')];
    const close = ov.querySelector('[class*="VOzbGW_close"]');
    const or = opts.getBoundingClientRect();
    // options 内是否还存在被 overflow:hidden 永久裁切的元素
    let clipped = 0;
    for (const el of opts.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (!(r.width > 0 && r.height > 0 && r.right > or.right + 1)) continue;
      let a = el.parentElement;
      while (a) {
        const cs = getComputedStyle(a);
        if (cs.overflowX === 'auto' || cs.overflowX === 'scroll') break;
        if (cs.overflowX === 'hidden' || cs.overflowX === 'clip') {
          if (r.right > a.getBoundingClientRect().right + 1) clipped += 1;
          break;
        }
        if (a === opts) break;
        a = a.parentElement;
      }
    }
    return {
      found: true,
      panelDir: getComputedStyle(panel).flexDirection,
      railW: Math.round(navRect.width),
      optionsDisplay: getComputedStyle(opts).display,
      optionsContentLen: (opts.textContent || '').length,
      optionsOverflowX: getComputedStyle(opts).overflowX,
      optionsW: Math.round(or.width),
      clipped,
      cellsInsideNav: cells.every((b) => {
        const r = b.getBoundingClientRect();
        return r.top >= navRect.top - 0.5 && r.bottom <= navRect.bottom + 0.5;
      }),
      closeVisible: !!close && close.offsetParent !== null && close.getBoundingClientRect().width > 0,
    };
  });

  say(`${vp.name} 回退为横向轨道布局（未走钻取）`, fb.found && fb.panelDir === 'row', `panelDir=${fb.panelDir} railW=${fb.railW}`);
  say(`${vp.name} 回退后内容区可见且有内容（不是死列表）`, fb.found && fb.optionsDisplay !== 'none' && fb.optionsContentLen > 200, `display=${fb.optionsDisplay} 内容长度=${fb.optionsContentLen}`);
  // 回退态内容宽度 = 视口 - 20(面板左右 padding) - 88(轨道)。按视口宽度判定，
  // 不用固定阈值（320px 下只有 ~212px，窄但可达，与改动前的轨道布局一致）。
  const expectW = vp.width - 20 - 88;
  say(`${vp.name} 回退后内容区宽度符合轨道布局预期（视口-20-88=${expectW}）`, Math.abs((fb.optionsW || 0) - expectW) <= 6, `optionsW=${fb.optionsW}`);
  // 措辞收窄：第三方（如插件市场）自身用 overflow:hidden 裁自己的装饰图标不算插件的问题，
  // 独立验收实测回退态 375/320 各有 1 个 12x12 GitHub 图标被其自身祖先 <a> 裁掉。
  say(`${vp.name} 回退后无本插件导致的永久裁切`, fb.clipped === 0, `clipped=${fb.clipped}`);
  say(`${vp.name} 回退后分类行完整落在轨道内`, !!fb.cellsInsideNav);
  say(`${vp.name} 回退后关闭按钮可见`, !!fb.closeVisible);
  await page.screenshot({ path: path.join(SHOTS, `${vp.name}__fallback.png`) });
  await page.close();
}

// ---------- 1b) 断点谓词与开关同源：matchMedia 缺失 / 返回 false 都不得打开开关 ----------
// 第二轮独立验收指出的两条真实可达路径：监听器装上了但 isNarrow() 恒 false（回调空转），
// 而开关照常打开 → 死列表。修法是让开关与谓词复用同一个 MediaQueryList。
const BROKEN_MQ_CASES = [
  {
    name: 'matchMedia 缺失',
    patch: () => {
      Object.defineProperty(window, 'matchMedia', { value: undefined, configurable: true, writable: true });
    },
  },
  {
    name: 'matchMedia 对 480 查询返回 false',
    patch: () => {
      const orig = window.matchMedia.bind(window);
      window.matchMedia = (q) => {
        if (String(q).includes('480')) {
          return {
            matches: false,
            media: String(q),
            addEventListener() {},
            removeEventListener() {},
            addListener() {},
            removeListener() {},
            onchange: null,
            dispatchEvent: () => false,
          };
        }
        return orig(q);
      };
    },
  },
];

for (const mqCase of BROKEN_MQ_CASES) {
  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  await page.evaluateOnNewDocument(mqCase.patch);
  await page.setViewport({ width: 375, height: 667, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await page.setCookie({ name: cn, value: c.slice(cn.length + 1), domain: '127.0.0.1', path: '/' });
  await page.goto('http://127.0.0.1:3080/', { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 4500));

  const gate = await page.evaluate(() => document.documentElement.getAttribute('data-dshbr-drilldown'));
  say(`375x667 [${mqCase.name}] 就绪开关不得打开`, gate === null, `gate=${gate}`);

  await page.evaluate(() => document.querySelector('button[aria-label="Settings"]')?.click());
  await new Promise((r) => setTimeout(r, 1500));
  const m = await page.evaluate(() => {
    const ov = document.querySelector('[class*="VOzbGW_overlay"]');
    if (!ov) return { found: false };
    const nav = ov.querySelector('nav[class*="VOzbGW_nav"]');
    const opts = ov.querySelector('[class*="VOzbGW_options"]');
    return {
      found: true,
      panelDir: getComputedStyle(ov.querySelector('[class*="VOzbGW_panel"]')).flexDirection,
      railW: Math.round(nav.getBoundingClientRect().width),
      optionsDisplay: getComputedStyle(opts).display,
      panelTextLen: (ov.querySelector('[class*="VOzbGW_panel"]').textContent || '').trim().length,
    };
  });
  say(`375x667 [${mqCase.name}] 退回轨道布局且面板非空（不是死列表）`, m.found && m.panelDir === 'row' && m.optionsDisplay !== 'none' && m.panelTextLen > 200, JSON.stringify(m));
  await page.screenshot({ path: path.join(SHOTS, `375x667__mq-${mqCase.name.replace(/[^\w]/g, '_')}.png`) });
  await page.close();
}

// ---------- 2) 对照组：开关在时走钻取，且进退正常 ----------
{
  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  await page.setViewport({ width: 375, height: 667, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await page.setCookie({ name: cn, value: c.slice(cn.length + 1), domain: '127.0.0.1', path: '/' });
  await page.goto('http://127.0.0.1:3080/', { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 4500));
  await page.evaluate(() => document.querySelector('button[aria-label="Settings"]')?.click());
  await new Promise((r) => setTimeout(r, 1200));
  const menu = await page.evaluate(() => {
    const ov = document.querySelector('[class*="VOzbGW_overlay"]');
    return {
      panelDir: getComputedStyle(ov.querySelector('[class*="VOzbGW_panel"]')).flexDirection,
      optionsDisplay: getComputedStyle(ov.querySelector('[class*="VOzbGW_options"]')).display,
    };
  });
  say('对照组 打开即分类列表页（纵向、内容区隐藏）', menu.panelDir === 'column' && menu.optionsDisplay === 'none', JSON.stringify(menu));

  await page.evaluate(() => document.querySelectorAll('button[class*="VOzbGW_navCell"]')[2].click());
  await new Promise((r) => setTimeout(r, 1500));
  const detail = await page.evaluate(() => {
    const ov = document.querySelector('[class*="VOzbGW_overlay"]');
    const opts = ov.querySelector('[class*="VOzbGW_options"]');
    return {
      attr: ov.querySelector('[class*="VOzbGW_panel"]').getAttribute('data-dshbr-settings-view'),
      optionsDisplay: getComputedStyle(opts).display,
      optionsW: Math.round(opts.getBoundingClientRect().width),
      navListDisplay: getComputedStyle(ov.querySelector('[class*="VOzbGW_navList"]')).display,
    };
  });
  say('对照组 点分类进入详情页且内容占满整宽', detail.attr === 'detail' && detail.optionsDisplay !== 'none' && detail.optionsW >= 340 && detail.navListDisplay === 'none', JSON.stringify(detail));

  await page.evaluate(() => document.querySelector('div[class*="VOzbGW_navTitle"]').click());
  await new Promise((r) => setTimeout(r, 900));
  const back = await page.evaluate(() => {
    const ov = document.querySelector('[class*="VOzbGW_overlay"]');
    return {
      attr: ov.querySelector('[class*="VOzbGW_panel"]').getAttribute('data-dshbr-settings-view'),
      optionsDisplay: getComputedStyle(ov.querySelector('[class*="VOzbGW_options"]')).display,
    };
  });
  say('对照组 点返回行回到分类列表', back.attr === null && back.optionsDisplay === 'none', JSON.stringify(back));
  await page.close();
}

await browser.close();
const failed = out.filter((x) => !x.ok);
console.log(`\n==== 回退/对抗用例汇总：${out.length - failed.length}/${out.length} 通过 ====`);
if (failed.length) process.exitCode = 1;
