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
  const roots = [
    path.join(REPO_ROOT, 'scratch', 'chrome-cache', 'chrome'),
    path.join(REPO_ROOT, 'scratch', 'chrome-cache', 'chrome-headless-shell'),
    path.join(process.env.HOME || '', '.cache', 'puppeteer', 'chrome'),
    path.join(process.env.HOME || '', '.cache', 'puppeteer', 'chrome-headless-shell'),
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
 * 拿不到 cookie 时给出可操作的报错（而不是让后续断言莫名其妙地失败）。
 */
export function connect(port = Number(process.env.DSH_WEB_PORT || 3080)) {
  const cookie = getDshLoopbackCookie(port);
  if (!cookie) {
    throw new Error(
      `未能取得 127.0.0.1:${port} 的回环会话 cookie。\n` +
        '这些验收需要 dsh web 正在运行（并已加载本插件）。请先启动它，或用 DSH_WEB_PORT 指定端口。',
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
  await page.setCookie({ name: auth.cookieName, value: auth.cookieValue, domain: '127.0.0.1', path: '/' });
  await page.goto(`http://127.0.0.1:${auth.port}/`, { waitUntil: 'domcontentloaded' });
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
