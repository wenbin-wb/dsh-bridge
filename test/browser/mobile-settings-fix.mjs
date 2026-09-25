// 移动端设置页「全面修复」运行时验收（真实 GUI）：几何 + 可达性 + 视图切换
// 用法：node test/browser/mobile-settings-fix.mjs
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { launchOptions, shotsDir, connect } from './helpers.mjs';

const SHOTS = shotsDir('mobile-settings-fix');
const CHROME = launchOptions().executablePath;
const { port: PORT, cookie: c, cookieName: cn } = connect();

const results = [];
const record = (viewport, name, ok, detail) => {
  results.push({ viewport, name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  [${viewport}] ${name}${detail ? ' — ' + detail : ''}`);
};

const VIEWPORTS = [
  { name: '375x667', width: 375, height: 667, narrow: true },
  { name: '390x844', width: 390, height: 844, narrow: true },
  { name: '412x915', width: 412, height: 915, narrow: true },
  { name: '667x375-landscape', width: 667, height: 375, narrow: false },
  { name: '768x1024-desktop', width: 768, height: 1024, narrow: false },
];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

const snap = () =>
  (() => {
    const ov = document.querySelector('[class*="VOzbGW_overlay"]');
    if (!ov) return { found: false };
    const panel = ov.querySelector('[class*="VOzbGW_panel"]');
    const nav = ov.querySelector('nav[class*="VOzbGW_nav"]');
    const content = [...panel.children].find((x) => x !== nav);
    const options = ov.querySelector('[class*="VOzbGW_options"]');
    const navList = ov.querySelector('[class*="VOzbGW_navList"]');
    const navTitle = ov.querySelector('[class*="VOzbGW_navTitle"]');
    const close = ov.querySelector('[class*="VOzbGW_close"]');
    const cs = (e) => (e ? getComputedStyle(e) : null);
    const rect = (e) => {
      if (!e) return null;
      const r = e.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right), bottom: Math.round(r.bottom) };
    };
    const optRect = options ? options.getBoundingClientRect() : null;
    // 「永久不可达」= 元素被最近的 overflow-x:hidden/clip 祖先裁掉。
    // 注意不能只比 options 右边界：Tab 条这类 overflow-x:auto 的子容器本身可横滑，
    // 它的分页越出容器边界但用户滑一下就能看到，属于「可达」。
    const isClippedByHiddenAncestor = (el) => {
      const r = el.getBoundingClientRect();
      let a = el.parentElement;
      while (a) {
        const cs = getComputedStyle(a);
        // 第一个 overflow-x 非 visible 的祖先才决定裁切语义：
        // auto/scroll → 用户能滑出来（可达）；hidden/clip → 超出即永久不可见
        if (cs.overflowX === 'auto' || cs.overflowX === 'scroll') return null;
        if (cs.overflowX === 'hidden' || cs.overflowX === 'clip') {
          return r.right > a.getBoundingClientRect().right + 1 ? a : null;
        }
        if (a === options) break;
        a = a.parentElement;
      }
      return null;
    };
    const unreachable = options
      ? [...options.querySelectorAll('*')]
          .filter((el) => {
            const r = el.getBoundingClientRect();
            if (!(r.width > 0 && r.height > 0 && r.right > optRect.right + 1)) return false;
            return !!isClippedByHiddenAncestor(el);
          })
          .map((el) => ({
            tag: el.tagName,
            cls: String(el.className).slice(0, 40),
            text: (el.textContent || '').trim().slice(0, 16),
            right: Math.round(el.getBoundingClientRect().right),
          }))
      : [];
    const optionsUserScrollableX = options ? cs(options).overflowX === 'auto' || cs(options).overflowX === 'scroll' : false;
    const navCells = nav
      ? [...nav.querySelectorAll('button[class*="VOzbGW_navCell"]')].map((b) => {
          const r = b.getBoundingClientRect();
          const nr = nav.getBoundingClientRect();
          return {
            text: (b.textContent || '').trim(),
            rect: rect(b),
            fullyInsideNav: r.top >= nr.top - 0.5 && r.bottom <= nr.bottom + 0.5,
          };
        })
      : [];
    const updateBtn = options ? [...options.querySelectorAll('button')].find((b) => /检查更新|检查中/.test(b.textContent || '')) : null;
    const tabbar = ov.querySelector('.dsh-tabbar-container');
    return {
      found: true,
      viewAttr: panel.getAttribute('data-dshbr-settings-view'),
      panel: rect(panel),
      nav: rect(nav),
      content: rect(content),
      contentOrder: cs(content)?.order,
      options: rect(options),
      optionsDisplay: cs(options)?.display,
      optionsOverflowX: cs(options)?.overflowX,
      optionsUserScrollableX,
      optionsScrollW: options?.scrollWidth,
      optionsClientW: options?.clientWidth,
      navListDisplay: cs(navList)?.display,
      navTitleDisplay: cs(navTitle)?.display,
      navTitleText: (navTitle?.textContent || '').trim(),
      close: rect(close),
      closeVisible: !!close && close.offsetParent !== null && close.getBoundingClientRect().width > 0,
      closeInsideViewport: close ? close.getBoundingClientRect().right <= window.innerWidth + 0.5 && close.getBoundingClientRect().bottom <= window.innerHeight + 0.5 : false,
      unreachable,
      navCells,
      updateBtn: updateBtn ? { rect: rect(updateBtn), text: (updateBtn.textContent || '').trim() } : null,
      tabbar: tabbar
        ? {
            mask: getComputedStyle(tabbar).maskImage || getComputedStyle(tabbar).webkitMaskImage,
            scrollW: tabbar.scrollWidth,
            clientW: tabbar.clientWidth,
          }
        : null,
      innerW: window.innerWidth,
      innerH: window.innerHeight,
    };
  })();

for (const vp of VIEWPORTS) {
  const label = vp.name;
  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1, isMobile: vp.narrow, hasTouch: vp.narrow });
  await page.setCookie({ name: cn, value: c.slice(cn.length + 1), domain: '127.0.0.1', path: '/' });
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 4000));
  await page.evaluate(() => document.querySelector('button[aria-label="Settings"]')?.click());
  await new Promise((r) => setTimeout(r, 1200));

  // ---- A. 打开后默认状态 ----
  const opened = await page.evaluate(snap);
  if (!opened.found) {
    record(label, '设置弹窗可打开', false, '未找到 overlay');
    await page.close();
    continue;
  }
  record(label, '设置弹窗可打开', true);
  record(
    label,
    'options 不再是 overflow-x:hidden（恢复可达）',
    opened.optionsOverflowX === 'auto' || opened.optionsOverflowX === 'scroll',
    `overflow-x=${opened.optionsOverflowX}`,
  );
  record(
    label,
    '关闭按钮可见且在视口内',
    opened.closeVisible && opened.closeInsideViewport,
    `close=${JSON.stringify(opened.close)}`,
  );

  if (vp.narrow) {
    // 窄屏：默认应是分类列表页
    record(label, '默认落在分类列表页（options 隐藏、navList 可见）', opened.optionsDisplay === 'none' && opened.navListDisplay !== 'none', `options.display=${opened.optionsDisplay} navList.display=${opened.navListDisplay}`);
    await page.screenshot({ path: path.join(SHOTS, `${label}__menu.png`) });

    // 点第 3 个分类（远程访问）
    await page.evaluate(() => {
      const ov = document.querySelector('[class*="VOzbGW_overlay"]');
      const cells = [...ov.querySelectorAll('button[class*="VOzbGW_navCell"]')];
      cells[2].click();
    });
    await new Promise((r) => setTimeout(r, 1500));
    const detail = await page.evaluate(snap);
    record(label, '点分类行进入详情页（options 可见、navList 收起）', detail.viewAttr === 'detail' && detail.optionsDisplay !== 'none' && detail.navListDisplay === 'none', `attr=${detail.viewAttr} options.display=${detail.optionsDisplay} navList.display=${detail.navListDisplay}`);
    record(label, '详情页关闭按钮仍可见', detail.closeVisible && detail.closeInsideViewport);
    record(
      label,
      '详情页无被 overflow:hidden 永久裁切的元素',
      detail.unreachable.length === 0,
      `unreachable=${detail.unreachable.length} optionsScrollW/clientW=${detail.optionsScrollW}/${detail.optionsClientW} ${JSON.stringify(detail.unreachable.slice(0, 3))}`,
    );
    record(
      label,
      '版本行「检查更新」未被裁切且单行',
      !!detail.updateBtn && detail.updateBtn.rect.h <= 26 && detail.updateBtn.rect.right <= (detail.options?.right ?? 0) + 1,
      detail.updateBtn ? `h=${detail.updateBtn.rect.h} right=${detail.updateBtn.rect.right} optionsRight=${detail.options?.right}` : 'not found',
    );
    record(label, '内容列宽度 ≥ 340px（钻取后内容占满整宽）', (detail.options?.w ?? 0) >= 340, `options.w=${detail.options?.w}`);
    await page.screenshot({ path: path.join(SHOTS, `${label}__detail.png`) });

    // 点折叠后的标题行返回
    await page.evaluate(() => {
      const ov = document.querySelector('[class*="VOzbGW_overlay"]');
      ov.querySelector('div[class*="VOzbGW_navTitle"]').click();
    });
    await new Promise((r) => setTimeout(r, 900));
    const back = await page.evaluate(snap);
    record(label, '点折叠标题行可返回分类列表', back.viewAttr === null && back.optionsDisplay === 'none', `attr=${back.viewAttr} options.display=${back.optionsDisplay}`);
  } else {
    // 非窄屏（481-767 轨道 / >=768 桌面）：分类全部落在轨道内，无竖切
    const clipped = opened.navCells.filter((x) => !x.fullyInsideNav);
    record(label, '全部分类行完整落在导航容器内（无竖切）', clipped.length === 0, clipped.map((x) => `${x.text}@${JSON.stringify(x.rect)}`).join(' | ') || 'none');
    record(label, '非窄屏不启用钻取（navList 可见）', opened.navListDisplay !== 'none', `navList.display=${opened.navListDisplay}`);
    await page.screenshot({ path: path.join(SHOTS, `${label}__rail.png`) });
  }

  // ---- Tab 条可达性（远程访问页） ----
  await page.evaluate(() => {
    const ov = document.querySelector('[class*="VOzbGW_overlay"]');
    const cells = [...ov.querySelectorAll('button[class*="VOzbGW_navCell"]')];
    const t = cells.find((x) => /远程访问/.test(x.textContent || ''));
    if (t) t.click();
  });
  await new Promise((r) => setTimeout(r, 2500));
  const tabs = await page.evaluate(() => {
    const ov = document.querySelector('[class*="VOzbGW_overlay"]');
    const tb = ov.querySelector('.dsh-tabbar-container');
    if (!tb) return null;
    const before = tb.scrollLeft;
    tb.scrollLeft = 9999;
    const maxScroll = tb.scrollLeft;
    tb.scrollLeft = before;
    const opts = ov.querySelector('[class*="VOzbGW_options"]');
    const right = opts.getBoundingClientRect().right;
    return {
      count: tb.querySelectorAll('button').length,
      scrollW: tb.scrollWidth,
      clientW: tb.clientWidth,
      maxScroll,
      userScrolled: maxScroll > before,
      mask: getComputedStyle(tb).maskImage || getComputedStyle(tb).webkitMaskImage,
      tabsBeyondRight: [...tb.querySelectorAll('button')].filter((b) => b.getBoundingClientRect().right > right + 1).map((b) => (b.textContent || '').trim()),
      clippedTabs: [...tb.querySelectorAll('button')]
        .filter((b) => {
          const r = b.getBoundingClientRect();
          const cs = getComputedStyle(tb);
          const scrollable = cs.overflowX === 'auto' || cs.overflowX === 'scroll';
          return r.right > tb.getBoundingClientRect().right + 1 && !scrollable;
        })
        .map((b) => (b.textContent || '').trim()),
      optionsOverflowX: getComputedStyle(opts).overflowX,
    };
  });
  if (tabs) {
    record(label, 'Tab 条可横滑且 5 个分类都在（可滑到末尾）', tabs.userScrolled && tabs.maxScroll > 0, `scrollW/clientW=${tabs.scrollW}/${tabs.clientW} maxScroll=${tabs.maxScroll}`);
    record(label, 'Tab 条有边缘渐隐提示（mask-image 非 none）', !!tabs.mask && tabs.mask !== 'none', String(tabs.mask).slice(0, 60));
    record(label, 'Tab 条分页全部落在各自可横滑容器内（无永久裁切）', tabs.clippedTabs.length === 0, `clippedTabs=${JSON.stringify(tabs.clippedTabs)}`);
  }
  await page.screenshot({ path: path.join(SHOTS, `${label}__tabs.png`) });
  await page.close();
}

await browser.close();
fs.writeFileSync(path.join(SHOTS, 'mobile-settings-fix.json'), JSON.stringify(results, null, 2));
const failed = results.filter((r) => !r.ok);
console.log(`\n==== 汇总：${results.length - failed.length}/${results.length} 通过 ====`);
if (failed.length) {
  console.log('失败项：');
  for (const f of failed) console.log(`  - [${f.viewport}] ${f.name} :: ${f.detail}`);
  process.exitCode = 1;
}
