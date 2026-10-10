// 移动端侧边栏抽屉行为验收：修复「点击汉堡后侧边栏空白」回归。
//
// 背景（v2.11.1 之后报障）：宿主按钮 aria-label 随界面语言切换 —— 中文「打开侧边栏」、
// 英文 "Open sidebar"（DSH 0.1.7 起按浏览器语言渲染 en）。插件若只按中文匹配展开按钮，
// 英文界面下会漏取：抽屉 (`body.dsh-drawer-open`) 滑出、但宿主侧边栏仍保持 collapsed，
// 会话列表不挂载 → 用户看到空侧边栏（「侧边栏点击后不显示了」）。
//
// 本套件断言真实行为而不依赖宿主语言：无论界面中英文，点击汉堡后都必须
//   1) 抽屉打开（body 带 dsh-drawer-open）且宿主侧边栏展开（root 不带 collapsed）；
//   2) 会话列表真实挂载（listArea 有子节点、有可见文本）；
//   3) 点击宿主「收起侧边栏」按钮后抽屉收起。
//
// 用法：node test/browser/mobile-sidebar-drawer.mjs（或由 run-all.mjs / verify:mobile-ui 调用）
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { suiteResult, installLegacySelectorBridge, launchOptions, shotsDir, connect  } from './helpers.mjs';

const SHOTS = shotsDir('mobile-sidebar-drawer');
const CHROME = launchOptions().executablePath;
const { port: PORT, cookie: c, cookieName: cn } = connect();
const BASE_URL = `http://127.0.0.1:${PORT}`;

const out = [];
let skip = 0;
const say = (name, ok, detail) => {
  out.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
};

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });

for (const vp of [{ name: '375x667', width: 375, height: 667 }, { name: '390x844', width: 390, height: 844 }]) {
  const page = await browser.newPage();
  // Issue #72：老套件写死 0.1.x 的 CSS-module 哈希，这里把查询字符串按宿主
  // 真实前缀改写（只改查询、不改 DOM），使其能打在任意代次宿主上。
  await installLegacySelectorBridge(page);
  await page.setCacheEnabled(false);
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
 if (c) await page.setCookie({ name: cn, value: c.slice(cn.length + 1), domain: '127.0.0.1', path: '/' });
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 5000));

  const lang = await page.evaluate(() => document.documentElement.lang || '');
  const headerReady = await page.evaluate(() => !!document.querySelector('.dsh-header-menu-btn'));
  say(`${vp.name} 顶栏汉堡按钮已注入 (lang=${lang})`, headerReady);

  // 点击汉堡：抽屉滑出 + 宿主侧边栏自动展开
  await page.evaluate(() => document.querySelector('.dsh-header-menu-btn')?.click());
  await new Promise((r) => setTimeout(r, 1000));

  const opened = await page.evaluate(() => {
    const body = document.body;
    const root = document.querySelector('div[class*="_sidebarCol"] div[class*="hHd-Xa_root"]');
    const listArea = document.querySelector('div[class*="_sidebarCol"] div[class*="listArea"]');
    return {
      drawerOpen: body.classList.contains('dsh-drawer-open'),
      sidebarRootCls: root ? String(root.className) : null,
      collapsed: root ? String(root.className).includes('collapsed') : null,
      listChildren: listArea ? listArea.children.length : -1,
      listText: listArea ? (listArea.innerText || '').trim().slice(0, 80) : '',
    };
  });
  say(`${vp.name} 抽屉已打开`, opened.drawerOpen);
  say(
    `${vp.name} 宿主侧边栏已展开（非 collapsed）`,
    opened.sidebarRootCls !== null && opened.collapsed === false,
    `root=${opened.sidebarRootCls}`,
  );
  say(
    `${vp.name} 会话列表已挂载且有内容`,
    opened.listChildren > 0 && opened.listText.length > 0,
    `children=${opened.listChildren} text=${JSON.stringify(opened.listText.slice(0, 40))}`,
  );

  // 顶栏标题与宿主当前会话同步（用户报障：0.1.7 后顶栏永远显示「新会话」，
  // 修复为读宿主会话层级面包屑）。
  //
  // 断言方式（Issue #72 复核修正）：**期望值取宿主自己的面包屑**，而不是从会话行
  // innerText 里"猜"标题。此前按状态行黑名单猜，词表一旦缺词（如「等待回答」
  // 「待回答」「N 个子智能体运行中」）就会把状态行当标题，产生确定性假红 ——
  // 独立验收在两个视口复现，且证明插件行为其实是对的（顶栏与面包屑完全一致）。
  const clicked = await page.evaluate(() => {
    const area = document.querySelector('div[class*="_sidebarCol"]');
    const rows = [...area.querySelectorAll('[role="treeitem"]')]
      .filter((e) => /sessionRow/i.test(String(e.className)) && !/selected/i.test(String(e.className)));
    if (!rows.length) return false;
    rows[0].click();
    return true;
  });
  await new Promise((r) => setTimeout(r, 1800));
  const sync = await page.evaluate(() => {
    const header = (document.querySelector('.dsh-mobile-header-title')?.innerText || '').trim();
    // 与插件同源：宿主会话层级面包屑的「当前段」
    const nav = document.querySelector('nav[aria-label="Session hierarchy"], nav[aria-label="会话层级"]');
    let host = '';
    if (nav) {
      const segs = [...nav.querySelectorAll('[class*="crumbSeg"]')];
      const lastSeg = segs[segs.length - 1];
      const cur = lastSeg?.querySelector('[class*="crumbCurrent"]') || lastSeg?.querySelector('span, button');
      host = ((cur?.getAttribute?.('aria-label') || cur?.textContent) || '').trim();
    }
    return { header, host };
  });
  if (!clicked || !sync.host) {
    skip++;
    console.log(`SKIP  ${vp.name} 顶栏标题跟随当前会话（读宿主面包屑） — ${!clicked ? '本视口无可选会话行' : '宿主未暴露会话层级面包屑'}，无法对照`);
  } else {
    say(
      `${vp.name} 顶栏标题跟随当前会话（读宿主面包屑）`,
      sync.header.length > 0 && sync.header === sync.host,
      `host=${JSON.stringify(sync.host)} header=${JSON.stringify(sync.header)}`,
    );
  }

  await page.screenshot({ path: path.join(SHOTS, `open-${vp.name.split('x')[0]}.png`) });

  // 点击宿主「收起侧边栏」按钮（中英文文案都试，宿主语言决定命中哪个）→ 抽屉应收起
  await page.evaluate(() => {
    const b = document.querySelector('button[aria-label*="收起侧边栏"], button[aria-label*="Collapse sidebar"], button[title*="收起侧边栏"], button[title*="Collapse sidebar"]');
    if (b) b.click();
  });
  await new Promise((r) => setTimeout(r, 600));
  const closed = await page.evaluate(() => document.body.classList.contains('dsh-drawer-open'));
  say(`${vp.name} 点击宿主收起按钮后抽屉收起`, closed === false);
  await page.close();
}

const failed = out.filter((x) => !x.ok);
for (const f of failed) console.log(`FAIL  ${f.name}${f.detail ? ' — ' + f.detail : ''}`);
await browser.close();
if (!suiteResult({ label: '移动端侧边栏抽屉验收', pass: out.length - failed.length, fail: failed.length, skip })) process.exitCode = 1;