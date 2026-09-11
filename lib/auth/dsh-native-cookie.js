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

/** 会话 cookie 有效期（毫秒）。与 DSH 默认的 cookieMaxAgeDays=30 对齐。 */
export const DSH_AUTH_COOKIE_MAX_AGE_MS = 30 * 24 * 3600 * 1000;

/** 承载签名密钥的 DSH 凭据记录键。 */
export const DSH_BROWSER_SESSION_RECORD = 'client-connection/browser-session';

function base64Url(value) {
  return Buffer.from(value).toString('base64url');
}

/**
 * 计算 DSH 会话 cookie 的名称（authority 绑定）。
 * @param {number|string} targetPort DSH 回环端口
 * @param {string} [host] 默认 127.0.0.1
 * @returns {string} 形如 `dsh-auth-<base64url(sha256("127.0.0.1:3080"))>`
 */
export function dshAuthCookieName(targetPort, host = '127.0.0.1') {
  const authority = `${host}:${targetPort}`;
  return DSH_AUTH_COOKIE_PREFIX + base64Url(createHash('sha256').update(authority).digest());
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
 * 生成一枚绑定到 loopback authority 的 DSH 原生会话 cookie。
 *
 * @param {object} opts
 * @param {number|string} opts.targetPort DSH 回环端口
 * @param {string} opts.secret base64url 编码的签名密钥
 * @param {string} [opts.host] 默认 127.0.0.1
 * @param {number} [opts.now] 当前时间戳（测试注入用）
 * @param {number} [opts.maxAgeMs] 有效期
 * @returns {string} `name=value`；密钥缺失时返回空串
 */
export function buildDshLoopbackCookie({
  targetPort,
  secret,
  host = '127.0.0.1',
  now = Date.now(),
  maxAgeMs = DSH_AUTH_COOKIE_MAX_AGE_MS,
}) {
  if (!secret || !targetPort) return '';

  const authority = `${host}:${targetPort}`;
  const name = dshAuthCookieName(targetPort, host);
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
  return `${name}=v${DSH_AUTH_COOKIE_VERSION}.${body}.${sig}`;
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
export function getDshLoopbackCookie(targetPort, env = {}) {
  const readFile = env.readFileSync ?? readFileSync;
  const exists = env.existsSync ?? existsSync;
  try {
    const dshHome = env.dshHome ?? process.env.DSH_HOME ?? join(homedir(), '.dsh');
    const credPath = join(dshHome, '.credentials.yaml');
    if (!exists(credPath)) return '';
    const secret = readBrowserSessionSecret(readFile(credPath, 'utf8'));
    if (!secret) return '';
    return buildDshLoopbackCookie({ targetPort, secret, now: env.now });
  } catch {
    return '';
  }
}
