// 宿主代次兼容守卫（Issue #72）：**任何代次**的宿主上都必须满足
//   「插件注入的 CSS 前缀能真正命中挂在页面上的设置弹窗」。
//
// 为什么单独立一套：0.2.0 把客户端 CSS-module 哈希整代重算（VOzbGW_* → wCInkW_*），
// 插件当时把这些哈希写死在选择器里，于是样式注入了、却零命中；而老验收脚本同样写死
// 0.1.x 的哈希，连弹窗都定位不到 —— 两边一起哑火，谁也没报错。本套件只依赖
// 插件写在 <html data-dshbr-families> / data-dshbr-compat 上的运行时事实，
// 因此对代次免疫：宿主再换代，这里会直接红。
//
// 用法：node test/browser/host-family-compat.mjs（或 npm run verify:mobile-ui host-family）
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { suiteResult, launchOptions, shotsDir, connect, readHostFamilies  } from './helpers.mjs';

const SHOTS = shotsDir('host-family-compat');
const CHROME = launchOptions().executablePath;
// 老宿主（0.1.1 及更早）没有原生浏览器鉴权，取不到回环 cookie 属正常：
// 本守卫只关心「前缀能否命中弹窗」，无 cookie 也照跑；有 cookie 的宿主照常带上。
let auth;
try {
  auth = connect();
} catch (e) {
  console.log(`[host-family-compat] 未取得回环 cookie（${e.message.split('\n')[0]}），按无鉴权宿主继续。`);
  auth = { port: Number(process.env.DSH_WEB_PORT || 3080), cookie: null, cookieName: null, cookieValue: null };
}
const PORT = auth.port;

const rows = [];
const say = (name, ok, detail = '') => {
  rows.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
};

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

for (const vp of [
  { name: '390x844', width: 390, height: 844, narrow: true },
  { name: '768x1024', width: 768, height: 1024, narrow: false },
]) {
  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1, isMobile: vp.narrow, hasTouch: vp.narrow });
  if (auth.cookie) await page.setCookie({ name: auth.cookieName, value: auth.cookieValue, domain: '127.0.0.1', path: '/' });
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 5000));

  const hook = await page.evaluate(() => ({
    families: document.documentElement.getAttribute('data-dshbr-families'),
    sources: document.documentElement.getAttribute('data-dshbr-family-sources'),
    compat: document.documentElement.getAttribute('data-dshbr-compat'),
    styleLen: (document.getElementById('dsh-bridge-mobile-styles')?.textContent || '').length,
    placeholderLeft: (document.getElementById('dsh-bridge-mobile-styles')?.textContent || '').includes('__F_'),
  }));
  say(`[${vp.name}] 插件注入了移动端样式表`, hook.styleLen > 1000, `len=${hook.styleLen}`);
  say(`[${vp.name}] 插件公布了运行时前缀钩子 data-dshbr-families`, !!hook.families, String(hook.families).slice(0, 90));
  say(`[${vp.name}] 同时公布每个槽位的取值来源（assumed 不得静默）`, !!hook.sources, String(hook.sources).slice(0, 90));
  say(`[${vp.name}] 渲染后的 CSS 不残留未解析占位符`, hook.placeholderLeft === false);
  say(`[${vp.name}] 自检状态为 ok/partial，且不得是 degraded`, ['ok', 'partial'].includes(hook.compat), `compat=${hook.compat}`);
  const sources = (() => { try { return JSON.parse(hook.sources || '{}'); } catch { return {}; } })();
  say(`[${vp.name}] 设置弹窗槽位必须"有据可依"（detected/known/known-weak）`, ['detected', 'known', 'known-weak'].includes(sources.SETTINGS), `SETTINGS=${sources.SETTINGS}`);

  const families = await readHostFamilies(page);
  say(`[${vp.name}] 前缀非哨兵（说明解析到了真实宿主前缀）`, !!families.SETTINGS && families.SETTINGS !== '__dshbr_absent_family', `SETTINGS=${families.SETTINGS}`);

  // 打开设置：优先按前缀找常驻的「设置」轨道按钮（各代次都带 _rail），再按 aria/文本兜底
  const opened = await page.evaluate((fam) => {
    const rail = document.querySelector(`button[class*="${fam}_rail"]`);
    const all = [...document.querySelectorAll('button')];
    const b = rail
      || all.find((x) => /^(设置|Settings)$/.test((x.getAttribute('aria-label') || '').trim()))
      || all.find((x) => /设置|Settings/.test((x.getAttribute('aria-label') || '') + (x.textContent || '')));
    b?.click();
    return !!b;
  }, families.SETTINGS);
  await new Promise((r) => setTimeout(r, 2200));

  const hit = await page.evaluate((fam) => {
    const panel = document.querySelector(`div[class*="${fam}_panel"]`);
    if (!panel) return { found: false };
    const nav = panel.querySelector(`nav[class*="${fam}_nav"]`);
    const options = panel.querySelector(`div[class*="${fam}_options"]`);
    const cs = (e) => (e ? getComputedStyle(e) : null);
    const r = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return { w: Math.round(b.width), h: Math.round(b.height) }; };
    return {
      found: true,
      hasNav: !!nav,
      hasOptions: !!options,
      navCells: panel.querySelectorAll(`button[class*="${fam}_navCell"]`).length,
      panelRadius: cs(panel).borderRadius,
      nav: r(nav),
      optionsDisplay: cs(options)?.display,
    };
  }, families.SETTINGS);

  say(`[${vp.name}] 设置弹窗能被「运行时前缀」定位（本 issue 的核心不变量）`, hit.found && opened, `opened=${opened} found=${hit.found}`);
  if (hit.found) {
    say(`[${vp.name}] 弹窗内部结构按前缀全部命中（nav / options / 分类行）`, hit.hasNav && hit.hasOptions && hit.navCells > 0, `nav=${hit.hasNav} options=${hit.hasOptions} navCells=${hit.navCells}`);
    if (vp.narrow) {
      // 插件的移动端样式只作用于 ≤767px（768 起彻底交还桌面布局），故圆角/列表页断言只在窄屏做
      say(`[${vp.name}] 插件样式确实作用到弹窗上（圆角 18px）`, hit.panelRadius === '18px', hit.panelRadius);
      say(`[${vp.name}] ≤480px 默认落在分类列表页（options 隐藏、nav 占满）`, hit.optionsDisplay === 'none' && hit.nav.w > 300, `options.display=${hit.optionsDisplay} nav.w=${hit.nav?.w}`);
    }
  }
  await page.screenshot({ path: path.join(SHOTS, `${vp.name}.png`) });
  await page.close();
}

await browser.close();
const failed = rows.filter((r) => !r.ok);
if (!suiteResult({ label: '宿主代次兼容守卫', pass: rows.length - failed.length, fail: failed.length })) {
  console.log('失败项：');
  for (const f of failed) console.log(`  - ${f.name} :: ${f.detail}`);
  process.exitCode = 1;
}
