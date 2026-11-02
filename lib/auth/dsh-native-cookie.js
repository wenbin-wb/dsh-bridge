// DSH 原生浏览器鉴权的兼容层（lib/auth/dsh-native-cookie.js）
//
// 背景
// ---------------------------------------------------------------
// DSH 从 0.1.2 起为 `dsh web` 引入了"原生浏览器鉴权"：
//   1. 启动时打印带一次性 launch token 的地址：http://127.0.0.1:<port>/?token=…
//   2. `GET /?token=<token>` 校验通过后 303 重定向到 `/`，并下发签名会话 cookie
//   3. 此后所有受保护路由（`/`、`/api`、以及任何经
//      `ctx.connection.rpc.handle()` 注册的通道）都要求该 cookie，否则 401
//
// cookie 的构造（见 @deepseek-ai/dsh-client-connection 的 BrowserAuth）：
//   名称：`dsh-auth-` + base64url(sha256(authority))，authority = `127.0.0.1:<port>`
//   值  ：`v1.<base64url(JSON payload)>.<base64url(HMAC-SHA256(secret, body))>`
//   载荷：`{ version: 1, authority, issuedAt, expiresAt }`（均为安全整数）
//   密钥：`<DSH_HOME>/.credentials.yaml` 里 record
//         `client-connection/browser-session` 的 `payload.secret`（base64url 32 字节）
//
// 为什么本插件需要它
// ---------------------------------------------------------------
// 本插件的自建反向代理监听自己的端口（默认 3082），对外提供局域网/隧道访问，
// 再把请求转发到 DSH 回环地址。浏览器持有的是"代理 origin"的 cookie，
// 而 DSH 的 cookie 绑定的是 `127.0.0.1:<dshPort>` 这个 authority，两者不是同一个，
// 因此代理必须自行注入一枚合法的 loopback 会话 cookie，否则远程访问会一律 401。
//
// 本模块只做"按 DSH 的格式生成一枚回环会话 cookie"，不引入任何三方依赖。

import { createHash, createHmac } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/** DSH 会话 cookie 的名称前缀（与 dsh-client-connection 的 COOKIE_PREFIX 一致）。 */
export const DSH_AUTH_COOKIE_PREFIX = 'dsh-auth-';

/** cookie 载荷版本（与 dsh-client-connection 的 COOKIE_PAYLOAD_VERSION 一致）。 */
export const DSH_AUTH_COOKIE_VERSION = 1;

/** DSH 默认的 cookieMaxAgeDays=30 对应的毫秒数（宿主侧的默认上限，仅供参照）。 */
export const DSH_AUTH_COOKIE_MAX_AGE_MS = 30 * 24 * 3600 * 1000;

/**
 * 实际注入到上游请求的 cookie 有效期（毫秒）。
 *
 * 代理是**每个请求现签**一枚 cookie，它只在这一次转发里被宿主校验，不需要
 * 覆盖浏览器会话。宿主会拒绝 `expiresAt - issuedAt > cookieMaxAgeDays` 的
 * cookie（默认 30 天，但可配置、最小 1 天），把有效期写死成 30 天会在宿主
 * 调小配置时全面 401（issue #92）。1 小时对任何合法配置都安全。
 */
export const DSH_AUTH_COOKIE_INJECTION_MAX_AGE_MS = 60 * 60 * 1000;

/** 承载签名密钥的 DSH 凭据记录键。 */
export const DSH_BROWSER_SESSION_RECORD = 'client-connection/browser-session';

function base64Url(value) {
  return Buffer.from(value).toString('base64url');
}

/**
 * 计算 DSH 会话 cookie 的**全部候选名称**。
 *
 * 官方口径：`dsh-auth-` + base64url(sha256("host:port"))。
 *
 * 但部分发行版 / 本地补丁（如 dsh-purge）会把名字派生改成忽略端口
 * （sha256("host")），而载荷里的 authority 仍按请求 Host 校验（含端口）。
 * 这种情况下按 `host:port` 派生的名字永远不会被宿主读到 → 经代理访问恒定
 * 401（issue #92：名称是唯一判别项，载荷必须仍带端口）。
 *
 * 因此同时注入两个名字、共用同一个载荷（authority 始终是 `host:port`）：
 * 官方宿主只会按自己的名字取值，补丁宿主同样如此，互不影响。多出的一枚
 * cookie 约 114 字节，对请求头大小影响可忽略。
 *
 * @param {number|string} targetPort DSH 回环端口
 * @param {string} [host] 默认 127.0.0.1
 * @returns {string[]} 去重后的候选名称（第一个始终是官方 `host:port` 口径）
 */
export function dshAuthCookieNames(targetPort, host = '127.0.0.1') {
  const names = new Set([
    DSH_AUTH_COOKIE_PREFIX + base64Url(createHash('sha256').update(`${host}:${targetPort}`).digest()),
    DSH_AUTH_COOKIE_PREFIX + base64Url(createHash('sha256').update(String(host)).digest()),
  ]);
  return [...names];
}

/**
 * 计算 DSH 会话 cookie 的官方名称（authority 绑定）。
 * @param {number|string} targetPort DSH 回环端口
 * @param {string} [host] 默认 127.0.0.1
 * @returns {string} 形如 `dsh-auth-<base64url(sha256("127.0.0.1:3080"))>`
 */
export function dshAuthCookieName(targetPort, host = '127.0.0.1') {
  return dshAuthCookieNames(targetPort, host)[0];
}

/**
 * 从 DSH 凭据文件内容中取出 browser-session 记录的签名密钥。
 *
 * 必须精确定位 `client-connection/browser-session` 这条 record：
 * 凭据文件里还有 `refs:` 段（各家模型 API key）以及可能存在其它插件写入的
 * record，一旦取到别处的 `secret:`，签名就会无效 —— 现象是"远程访问一律 401"，
 * 且极难定位。因此先锚定 record 键，再在其后的小范围内取 secret；
 * 仅当锚点缺失（异常/未来格式）时才退回"全文件第一个 secret:"的旧行为。
 *
 * @param {string} content 凭据文件文本
 * @returns {string} base64url 编码的密钥；取不到时返回空串
 */
export function readBrowserSessionSecret(content) {
  if (typeof content !== 'string' || content === '') return '';

  // 锚定 record 键所在行，随后只在该行往后的一小段内查找 secret
  const anchorMatch = /^[ \t]*client-connection\/browser-session:[ \t]*$/m.exec(content);
  if (anchorMatch) {
    const tail = content.slice(anchorMatch.index);
    const scoped = /secret:[ \t]*([A-Za-z0-9_-]+)/.exec(tail);
    if (scoped) return scoped[1];
  }

  // 兜底：老格式/异常格式下沿用全文件首个 secret:
  const fallback = /secret:[ \t]*([A-Za-z0-9_-]+)/.exec(content);
  return fallback ? fallback[1] : '';
}

/**
 * 生成绑定到 loopback authority 的 DSH 原生会话 cookie（同一载荷、全部候选名称）。
 *
 * 载荷里的 authority 始终是 `host:port`：issue #92 的对照实验证明，忽略端口的
 * 补丁只改 cookie 名，宿主对 `payload.authority` 的校验仍用含端口的 Host。
 *
 * @param {object} opts
 * @param {number|string} opts.targetPort DSH 回环端口
 * @param {string} opts.secret base64url 编码的签名密钥
 * @param {string} [opts.host] 默认 127.0.0.1
 * @param {number} [opts.now] 当前时间戳（测试注入用）
 * @param {number} [opts.maxAgeMs] 有效期
 * @returns {string[]} 形如 `name=value` 的候选 cookie；密钥缺失时返回空数组
 */
export function buildDshLoopbackCookies({
  targetPort,
  secret,
  host = '127.0.0.1',
  now = Date.now(),
  maxAgeMs = DSH_AUTH_COOKIE_INJECTION_MAX_AGE_MS,
}) {
  if (!secret || !targetPort) return [];

  const authority = `${host}:${targetPort}`;
  // 与 DSH 一致：issuedAt 略微回拨，避免与宿主的同秒比较产生边界问题
  const issuedAt = now - 1000;
  const expiresAt = issuedAt + maxAgeMs;

  const body = base64Url(Buffer.from(JSON.stringify({
    version: DSH_AUTH_COOKIE_VERSION,
    authority,
    issuedAt,
    expiresAt,
  }), 'utf8'));
  const key = Buffer.from(secret, 'base64url');
  const sig = base64Url(createHmac('sha256', key).update(body).digest());
  const value = `v${DSH_AUTH_COOKIE_VERSION}.${body}.${sig}`;
  return dshAuthCookieNames(targetPort, host).map((name) => `${name}=${value}`);
}

/**
 * 生成单枚（官方口径）cookie，保留给只关心一个名字的调用方与测试。
 *
 * @param {object} opts 同 buildDshLoopbackCookies
 * @returns {string} `name=value`；密钥缺失时返回空串
 */
export function buildDshLoopbackCookie(opts) {
  return buildDshLoopbackCookies(opts)[0] ?? '';
}

/**
 * 读取本机 DSH 凭据并生成回环会话 cookie（失败时返回空串，绝不抛出）。
 *
 * @param {number|string} targetPort DSH 回环端口
 * @param {object} [env] 便于测试注入的环境
 * @param {string} [env.dshHome] DSH 主目录（默认 $DSH_HOME 或 ~/.dsh）
 * @param {Function} [env.readFileSync] 文件读取实现（默认 node:fs）
 * @param {Function} [env.existsSync] 存在性判断实现
 * @param {number} [env.now] 当前时间戳
 * @returns {string} `name=value`，或空串
 */
export function getDshLoopbackCookies(targetPort, env = {}) {
  const readFile = env.readFileSync ?? readFileSync;
  const exists = env.existsSync ?? existsSync;
  try {
    const dshHome = env.dshHome ?? process.env.DSH_HOME ?? join(homedir(), '.dsh');
    const credPath = join(dshHome, '.credentials.yaml');
    if (!exists(credPath)) return [];
    const secret = readBrowserSessionSecret(readFile(credPath, 'utf8'));
    if (!secret) return [];
    return buildDshLoopbackCookies({ targetPort, secret, now: env.now });
  } catch {
    return [];
  }
}

/**
 * 读取本机 DSH 凭据并生成回环会话 cookie（仅官方口径，失败时返回空串）。
 *
 * 注：代理注入请用 {@link getDshLoopbackCookies}——它同时给出忽略端口的候选名。
 *
 * @param {number|string} targetPort DSH 回环端口
 * @param {object} [env] 便于测试注入的环境
 * @returns {string} `name=value`，或空串
 */
export function getDshLoopbackCookie(targetPort, env = {}) {
  return getDshLoopbackCookies(targetPort, env)[0] ?? '';
}

/**
 * 从 Cookie 头里剔除指定名字的段。
 *
 * 宿主的 cookie 读取是「同名取第一个」，而代理把自签 cookie **追加**在浏览器
 * 原有 cookie 之后。如果浏览器里残留了同名的旧 cookie（换过 secret、旧版本
 * 留下的），旧值会排在前面被宿主取走，注入的新 cookie 等于没生效 —— 现象是
 * 经代理访问永远 401。注入前先剔除同名段即可（issue #92）。
 *
 * @param {string|undefined} headerValue 原始 Cookie 头
 * @param {string} name 要剔除的 cookie 名
 * @returns {string} 剔除后的 Cookie 头；无法识别时原样返回
 */
export function stripCookieByName(headerValue, name) {
  if (typeof headerValue !== 'string' || headerValue === '' || !name) return headerValue ?? '';
  return headerValue
    .split(';')
    .map((segment) => segment.trim())
    .filter((segment) => {
      if (!segment) return false;
      const at = segment.indexOf('=');
      if (at === -1) return true; // 畸形段不可能匹配名字，原样留给宿主忽略
      return segment.slice(0, at).trim() !== name;
    })
    .join('; ');
}

/**
 * 诊断用：报告 cookie 生成失败时卡在哪一步。
 *
 * 只返回凭据文件路径与两个布尔量，**绝不返回 secret 本身**——这条信息会进日志。
 * 读取过程中的任何异常都吞掉（诊断不得影响代理）。
 *
 * @param {object} [env] 便于测试注入的环境（同 getDshLoopbackCookie）
 * @returns {{credentialsPath: string, fileExists: boolean, secretFound: boolean}}
 */
export function inspectLoopbackCookie(env = {}) {
  const readFile = env.readFileSync ?? readFileSync;
  const exists = env.existsSync ?? existsSync;
  const dshHome = env.dshHome ?? process.env.DSH_HOME ?? join(homedir(), '.dsh');
  const credentialsPath = join(dshHome, '.credentials.yaml');
  let fileExists = false;
  let secretFound = false;
  try {
    fileExists = Boolean(exists(credentialsPath));
    if (fileExists) secretFound = Boolean(readBrowserSessionSecret(readFile(credentialsPath, 'utf8')));
  } catch { /* 诊断不得抛出 */ }
  return { credentialsPath, fileExists, secretFound };
}
