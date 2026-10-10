// 移动端 UI 行为验收的公共设施。
//
// 这些验收跑的是**真实运行中的 dsh web + 本插件 GUI**（用无头 Chrome 驱动真实设置弹窗），
// 因此它们**不进 `npm test`**（CI 里没有宿主），而是通过 `npm run verify:mobile-ui` 手动/发布前运行。
// 断言是「行为」而非「文本」——这是本仓库对 UI 的承重检查，结构断言（test/*.test.mjs）只做廉价第一道。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDshLoopbackCookie } from '../../lib/auth/dsh-native-cookie.js';

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** 截图输出目录（scratch/ 被 .gitignore 忽略，验收产物不污染仓库） */
export function shotsDir(name) {
  const dir = path.join(REPO_ROOT, 'scratch', 'verify-shots', name);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** 枚举本仓库常见的无头 Chrome 落盘位置（puppeteer 下载缓存布局） */
function* cachedChromeCandidates() {
  const local = process.env.LOCALAPPDATA || '';
  const progFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
  const progFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
  const roots = [
    path.join(REPO_ROOT, 'scratch', 'chrome-cache', 'chrome'),
    path.join(REPO_ROOT, 'scratch', 'chrome-cache', 'chrome-headless-shell'),
    path.join(process.env.HOME || '', '.cache', 'puppeteer', 'chrome'),
    path.join(process.env.HOME || '', '.cache', 'puppeteer', 'chrome-headless-shell'),
    path.join(local, 'puppeteer', 'chrome'),
    path.join(local, 'puppeteer', 'chrome-headless-shell'),
  ];
  const rel = [
    ['chrome-linux64', 'chrome'],
    ['chrome-headless-shell-linux64', 'chrome-headless-shell'],
    ['chrome-mac-x64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'],
    ['chrome-mac-arm64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'],
    ['chrome-win64', 'chrome.exe'],
    ['chrome-headless-shell-win64', 'chrome-headless-shell.exe'],
  ];
  for (const root of roots) {
    if (!root || !fs.existsSync(root)) continue;
    let versions;
    try {
      versions = fs.readdirSync(root);
    } catch {
      continue;
    }
    for (const v of versions) {
      for (const parts of rel) yield path.join(root, v, ...parts);
    }
  }
  // Windows 上直接落到已安装的 Chrome / Edge（本仓库在 Windows 上长期“找不到无头 Chrome”，
  // 只能靠 PUPPETEER_EXECUTABLE_PATH 手动指路，等于验收默认跑不起来）
  if (process.platform === 'win32') {
    yield path.join(progFiles, 'Google', 'Chrome', 'Application', 'chrome.exe');
    yield path.join(progFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe');
    yield path.join(local, 'Google', 'Chrome', 'Application', 'chrome.exe');
    yield path.join(progFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe');
    yield path.join(progFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe');
  }
}

/**
 * 解析无头 Chrome 可执行文件。
 * 优先环境变量（PUPPETEER_EXECUTABLE_PATH / CHROME_PATH），其次本仓库与 puppeteer 的缓存目录。
 */
export function resolveChrome() {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_PATH,
    ...cachedChromeCandidates(),
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean);
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error(
    '未找到无头 Chrome。请设置 PUPPETEER_EXECUTABLE_PATH 指向 chrome 可执行文件后重试。\n已尝试：\n  ' +
      candidates.join('\n  '),
  );
}

/**
 * 连接运行中的 dsh web：取出回环会话 cookie。
 *
 * 老宿主（≤0.1.1，尚无原生浏览器鉴权）取不到 cookie 属正常，可用
 * `DSH_ALLOW_NO_AUTH=1` 显式放行（这样同一批验收也能拿去当"旧宿主对照"）。
 * 其余情况仍按原样抛出可操作的报错，避免把"没启动/没鉴权"误当成通过。
 */
export function connect(port = Number(process.env.DSH_WEB_PORT || 3080)) {
  const cookie = getDshLoopbackCookie(port);
  if (!cookie) {
    if (process.env.DSH_ALLOW_NO_AUTH === '1') {
      console.log(`[verify:mobile-ui] 127.0.0.1:${port} 取不到回环 cookie，按无鉴权宿主继续（DSH_ALLOW_NO_AUTH=1）`);
      return { port, cookie: null, cookieName: null, cookieValue: null };
    }
    throw new Error(
      `未能取得 127.0.0.1:${port} 的回环会话 cookie。\n` +
        '这些验收需要 dsh web 正在运行（并已加载本插件）。请先启动它，或用 DSH_WEB_PORT 指定端口；\n' +
        '若目标宿主本身没有浏览器鉴权（≤0.1.1），用 DSH_ALLOW_NO_AUTH=1 放行。',
    );
  }
  const cookieName = cookie.split('=')[0];
  return { port, cookie, cookieName, cookieValue: cookie.slice(cookieName.length + 1) };
}

export function launchOptions() {
  return {
    executablePath: resolveChrome(),
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  };
}

/** 给新页面装好鉴权 cookie 并打开 GUI，供各验收脚本复用 */
export async function openGui(page, auth, viewport) {
  await page.setCacheEnabled(false);
  if (viewport) {
    await page.setViewport({
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 1,
      isMobile: viewport.width < 768,
      hasTouch: viewport.width < 768,
    });
  }
  if (auth?.cookie) await page.setCookie({ name: auth.cookieName, value: auth.cookieValue, domain: '127.0.0.1', path: '/' });
  await page.goto(`http://127.0.0.1:${auth.port}/`, { waitUntil: 'domcontentloaded' });
}

// ---------------- 宿主 CSS-module 前缀（Issue #72） ----------------
//
// 老验收脚本把宿主的 CSS-module 哈希（VOzbGW_* / wSkVaW_* / hHd-Xa_*）写死在断言里，
// 于是「宿主换代 = 验收脚本一起失效」：桌面版 0.2.0 换成 wCInkW_* 之后，这些脚本连
// 设置弹窗都定位不到，而插件样式恰恰也是因为同一原因静默失效 —— 谁也没拦住。
//
// 插件现在会把运行时解析出的前缀写到 <html data-dshbr-families="...">，验收脚本从这里读，
// 就与宿主代次解耦；老宿主（插件未提供该钩子）退回历史上那一代前缀。
export const LEGACY_FAMILIES = {
  SETTINGS: 'VOzbGW',
  CONV: 'wSkVaW',
  COMPOSER: 'uV2eYG',
  SIDEBAR: 'hHd-Xa',
  WS: 'qDHVXG',
  MODEL: '_7KE1Ra',
  ACCESS: 'Sh0Q9G',
  PRESET: 'h8S2Va',
  LOG: 'nL4_yW',
  WB: 'nArs4W',
  TOGGLE: 'W-zNGW',
};

/** 读取插件写在 <html> 上的运行时前缀表；拿不到（老插件/被让位）时退回历史基线。 */
export async function readHostFamilies(page) {
  const families = await page.evaluate(() => {
    try {
      return JSON.parse(document.documentElement.getAttribute('data-dshbr-families') || 'null');
    } catch {
      return null;
    }
  });
  return { ...LEGACY_FAMILIES, ...(families || {}) };
}

/** 组装「某槽位 + 本地名」的类名选择器（与插件内部 familySelector 同构）。 */
export function famSel(families, slot, local) {
  return `[class*="${families[slot]}_${local}"]`;
}

/**
 * 打开设置弹窗（Issue #72 测试债）：入口随宿主版本与界面语言而变——
 * 老套件一律点 `button[aria-label="Settings"]`，在中文界面（aria-label="设置"）或
 * 0.1.x 那种无 aria-label 的裸图标轨道按钮上直接落空，于是"宿主换代次"被误报成
 * "弹窗没打开"。这里按「前缀轨道按钮 → 中英 aria-label → 文本」逐级兜底。
 *
 * @returns {Promise<boolean>} 是否点到了入口
 */
export async function openSettings(page, families = null) {
  const fams = families ?? await readHostFamilies(page);
  return page.evaluate((fam) => {
    const rail = fam && fam !== '__dshbr_absent_family'
      ? document.querySelector(`button[class*="${fam}_rail"]`)
      : null;
    const all = [...document.querySelectorAll('button')];
    const btn = rail
      || all.find((x) => /^(设置|Settings|設定)$/.test((x.getAttribute('aria-label') || '').trim()))
      || all.find((x) => /设置|Settings/.test((x.getAttribute('aria-label') || '') + (x.textContent || '')));
    if (!btn) return false;
    btn.click();
    return true;
  }, fams.SETTINGS);
}

/**
 * 「选择器代次桥」（Issue #72）：让**写死 0.1.x 哈希**的老验收套件也能打在任意代次宿主上。
 *
 * 为什么需要：老套件里 `[class*="VOzbGW_overlay"]` 这类字面量有 90+ 处，且它们是**断言本身**
 * （几何/可达性都靠它定位弹窗）。桌面宿主换成 wCInkW_* 后，这些断言连弹窗都找不到，
 * 于是"宿主换哈希"被误报成"弹窗没打开"，谁也没拦住真正的样式失效。
 *
 * 做法（刻意选最不侵入的一种）：在测试页面里**只改写查询字符串**——把 `VOzbGW_overlay`
 * 之类按 `<html data-dshbr-families>` 换成宿主当前真实前缀；**不改 DOM（不加别名类）、
 * 不改被测代码路径**。插件的 JS 用的是它自己运行时解析的前缀，不受影响；宿主代码也不用
 * 这些历史名字，同样不受影响。因此它只影响测试的定位，不改变被测行为。
 *
 * 副作用边界：只 patch `querySelector/querySelectorAll/matches` 三个入口，且只对含
 * `class*=` 的字符串做前缀映射；非字符串/无映射一律原样透传。
 *
 * @param {import('puppeteer-core').Page} page 必须在 page.goto 之前调用
 */
export async function installLegacySelectorBridge(page) {
  await page.evaluateOnNewDocument(() => {
    const LEGACY_TO_SLOT = {
      VOzbGW: 'SETTINGS',
      wSkVaW: 'CONV',
      uV2eYG: 'COMPOSER',
      'hHd-Xa': 'SIDEBAR',
      qDHVXG: 'WS',
      _7KE1Ra: 'MODEL',
      Sh0Q9G: 'ACCESS',
      h8S2Va: 'PRESET',
      nL4_yW: 'LOG',
      nArs4W: 'WB',
      'W-zNGW': 'TOGGLE',
    };
    const resolvedFamilies = () => {
      try {
        return JSON.parse(document.documentElement.getAttribute('data-dshbr-families') || '{}') || {};
      } catch {
        return {};
      }
    };
    // 只对"有据可依"的槽位做改写：`assumed` 表示插件自己也只拿到一个按基线猜的前缀
    // （该代次在页面上没有任何痕迹）。此时若照改，会把**真实存在**的老宿主类名
    // （如 0.1.1 的 `_7KE1Ra_trigger`）改写成不存在的 `wq12jW_trigger`，反而查不到 ——
    // 这正是独立验收指出的同型陷阱；今天无用例踩到，但不该留着。
    const usableSources = () => {
      try {
        return JSON.parse(document.documentElement.getAttribute('data-dshbr-family-sources') || '{}') || {};
      } catch {
        return {};
      }
    };
    const rewrite = (selector) => {
      if (typeof selector !== 'string' || !selector.includes('class*=')) return selector;
      const families = resolvedFamilies();
      const sources = usableSources();
      return selector.replace(/class\*="([A-Za-z0-9_-]+)_([A-Za-z0-9_-]+)"/g, (all, family, local) => {
        const slot = LEGACY_TO_SLOT[family];
        const actual = slot ? families[slot] : null;
        if (!actual || actual === family) return all;
        const source = sources[slot];
        if (source && source !== 'detected' && source !== 'known' && source !== 'known-weak') return all;
        return `class*="${actual}_${local}"`;
      });
    };
    for (const proto of [Document.prototype, Element.prototype]) {
      const q = proto.querySelector;
      const qa = proto.querySelectorAll;
      proto.querySelector = function patchedQuerySelector(selector) {
        return q.call(this, rewrite(selector));
      };
      proto.querySelectorAll = function patchedQuerySelectorAll(selector) {
        return qa.call(this, rewrite(selector));
      };
    }
    // 与 matches 保持一致；漏掉 closest 会让"同一元素同一历史选择器"下两个 API 语义分叉
    for (const proto of [Document.prototype, Element.prototype]) {
      const closest = proto.closest;
      if (typeof closest !== 'function') continue;
      proto.closest = function patchedClosest(selector) {
        return closest.call(this, rewrite(selector));
      };
    }
    const matches = Element.prototype.matches;
    Element.prototype.matches = function patchedMatches(selector) {
      return matches.call(this, rewrite(selector));
    };
  });
}

/** 关闭宿主一次性浮层（如 0.2.0 Preview Notice 全屏浮层，会盖住设置 ✕ 与顶部可点元素）。
 * 仅测试前置：凡命中测试（elementFromPoint）前调用一次，避免宿主弹窗污染判定。
 *
 * 排除"设置弹窗自身"用的族名**在页面内现读** `data-dshbr-families`（不再写死 VOzbGW）：
 * 独立验收指出该参数曾无人传入，于是在 0.2.0 上排除失效（今天只因调用时机靠前才无害）。
 * @param {import('puppeteer-core').Page} page */
export async function dismissHostNotices(page) {
  try {
    await page.evaluate(() => {
      let settingsFamily = 'VOzbGW';
      try {
        const fams = JSON.parse(document.documentElement.getAttribute('data-dshbr-families') || '{}');
        if (fams.SETTINGS) settingsFamily = fams.SETTINGS;
      } catch { /* 老插件没有该钩子时退回历史族名 */ }
      const roots = [...document.body.children].filter(
        (e) => e.tagName === 'DIV'
          && !String(e.className).includes(settingsFamily)
          && e.querySelector(':scope > div[role="dialog"]'),
      );
      for (const r of roots) {
        const dlg = r.querySelector(':scope > div[role="dialog"]');
        if (!dlg) continue;
        const btn = [...dlg.querySelectorAll('button')].find((b) =>
          /ok|got it|知道|关闭|dismiss|confirm|确定|不再提示/i.test((b.textContent || '').trim()));
        (btn ?? dlg.querySelector('button'))?.click();
      }
    });
    await new Promise((r) => setTimeout(r, 600));
  } catch {}
}

/** 统一的 PASS/FAIL 记录器与收尾汇总 */
export function createReporter(label) {
  const rows = [];
  return {
    rows,
    say(name, ok, detail) {
      rows.push({ name, ok, detail });
      console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
    },
    finish() {
      const failed = rows.filter((r) => !r.ok);
      console.log(`\n==== ${label}：${rows.length - failed.length}/${rows.length} 通过 ====`);
      if (failed.length) {
        console.log('失败项：');
        for (const f of failed) console.log(`  - ${f.name} :: ${f.detail ?? ''}`);
        process.exitCode = 1;
      }
      return failed.length === 0;
    },
  };
}

/** 套件结果标记：run-all 汇总靠它区分「通过 / 跳过 / 失败」，避免把 SKIP 计成通过。 */
export const SUITE_RESULT_PREFIX = '[suite-result]';

/**
 * 打印套件收尾汇总 + 机器可读的结果标记。
 *
 * 为什么需要：宿主结构漂移时部分断言会按设计 SKIP（如 0.2.0 无插件市场入口）。
 * 老口径把这些套件算成"✅ N/N 通过"，读者会误以为断言真的跑过 —— 独立验收为此
 * 专门提了一条。现在跳过单独计数：全跳过的套件在汇总里显示"未执行断言"。
 *
 * @param {{label: string, pass: number, fail: number, skip?: number}} r
 * @returns {boolean} 是否无失败
 */
export function suiteResult({ label, pass, fail, skip = 0 }) {
  const total = pass + fail;
  console.log(`\n==== ${label}：通过 ${pass}/${total}${skip ? `，跳过 ${skip}` : ''} ====`);
  console.log(`${SUITE_RESULT_PREFIX} label=${label} pass=${pass} skip=${skip} fail=${fail}`);
  return fail === 0;
}
