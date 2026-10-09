// dsh-bridge 主插件（Host）
//
// 多渠道访问桥：
//   1. 局域网访问代理（自动启动，零配置）
//   2. Cloudflare 隧道（一键获取公网地址）
//   3. 自建隧道（WebSocket 反向隧道 + Token 认证）

import { createServer, request as httpRequest, get as httpGet } from 'node:http';
import { get as httpsGet } from 'node:https';
import { networkInterfaces, homedir, totalmem, freemem, cpus, loadavg, platform, arch, release, hostname, uptime } from 'node:os';
import { join, dirname, basename, resolve, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, appendFileSync, existsSync, realpathSync, mkdirSync } from 'node:fs';
import { readFile, writeFile, mkdir, unlink, readdir, stat, access, chmod } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import QRCode from 'qrcode';
import { installBridgeRpc } from './bridge-rpc.js';
import { CustomTunnelClient } from './tunnel-client.mjs';
import { CloudflaredManager, CLOUDFLARED_LOG_NAME } from './cloudflared-manager.mjs';
import { PlatformManager } from './platform/manager.js';
import { describeOpenTurn } from './platform/conversation-bridge.js';
import { applyRestoredPlatformConfig, RESTORED_STRING_FIELDS, PLATFORM_TIMING_FIELDS } from './platform/config-restore.js';
import { WechatService } from './wechat/index.js';
import { QqService } from './qq/index.js';
import { FeishuService } from './feishu/index.js';
import { TelegramService } from './telegram/index.js';
import { AuthManager } from './auth/manager.js';
import { getDshLoopbackCookie as getDshLoopbackCookieImpl } from './auth/dsh-native-cookie.js';
import { renderLoginPage } from './auth/login-template.js';
import { isSafeWorkspacePath, isSensitiveFolderName } from './security/path-validator.js';
import { stripSessionProjections } from './session-strip.js';
import { installAbortSignalCompat, BROWSER_ABORT_SIGNAL_POLYFILL, BROWSER_PROMISE_ITERATOR_POLYFILL } from './compat.js';

const name = 'dsh-bridge';
// 微信 Bot 会话桥依赖 DSH 提供的会话/agent/审批/工作区/持久化服务，需显式 inject
const inject = ['connection', 'webServer', 'sessions', 'agents', 'approval', 'workspaceRegistry', 'sessionPersistence'];

// 从 package.json 动态读取版本号，发版只需改 package.json 一处
const PACKAGE_JSON = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json'), 'utf8'));
const VERSION = PACKAGE_JSON.version ?? '0.0.0';

const VIRTUAL_KEYWORDS = [
  'vethernet', 'wsl', 'hyper-v', 'virtual', 'vmware', 'vbox', 'docker',
  'tailscale', 'zerotier', 'tap', 'tun', 'utun', 'wireguard', 'loopback', 'bridge',
];

/**
 * 列出所有可用的局域网 IPv4 网卡与 IP 地址（按推荐优先级排序）
 */
function listAllLanIPv4() {
  const interfaces = networkInterfaces();
  const list = [];

  for (const [ifname, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;
    const lower = ifname.toLowerCase();
    const isVirtual = VIRTUAL_KEYWORDS.some((kw) => lower.includes(kw));

    for (const addr of addrs) {
      if (addr.family !== 'IPv4' || addr.internal) continue;

      let score = 0;
      // 1. IP 网段优先（家庭/企业物理局域网最常用网段）
      if (addr.address.startsWith('192.168.')) score += 100;
      else if (addr.address.startsWith('10.')) score += 90;
      else if (addr.address.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)) score += 70;
      else score += 10;

      // 2. 物理网卡与名称特征优先
      if (isVirtual) {
        score -= 200; // 虚拟网卡大幅降权
      } else {
        score += 100;
        if (lower.includes('wi-fi') || lower.includes('wlan') || lower.includes('wireless')) score += 50;
        else if (lower.includes('ethernet') || lower.includes('以太网') || lower.includes('eth') || lower.includes('en')) score += 40;
      }

      let label = ifname;
      if (lower.includes('wi-fi') || lower.includes('wlan') || lower.includes('wireless')) label += ' (Wi-Fi 无线网卡)';
      else if (lower.includes('ethernet') || lower.includes('以太网') || lower.includes('eth') || lower.includes('en')) label += ' (有线网卡)';
      else if (isVirtual) label += ' (虚拟网卡 / WSL / 虚拟机)';

      list.push({
        name: ifname,
        label,
        address: addr.address,
        netmask: addr.netmask,
        isVirtual,
        score,
      });
    }
  }

  return list.sort((a, b) => b.score - a.score);
}

/**
 * 选择最佳默认局域网 IP
 */
function selectLanIPv4() {
  const list = listAllLanIPv4();
  return list[0]?.address || null;
}

/**
 * 二维码缓存（带 TTL + LRU）
 */
class QrCache {
  constructor(ttl = 30 * 60 * 1000, maxSize = 8) {
    this.cache = new Map();
    this.ttl = ttl;
    this.maxSize = maxSize;
  }

  async get(text) {
    const cached = this.cache.get(text);
    if (cached && Date.now() - cached.time < this.ttl) {
      return cached.data;
    }

    const qr = await QRCode.toDataURL(text, {
      width: 300,
      margin: 2,
      color: { dark: '#1F2421', light: '#FFFFFF' },
    });

    this.cache.set(text, { data: qr, time: Date.now() });

    if (this.cache.size > this.maxSize) {
      const oldest = Array.from(this.cache.entries())
        .sort((a, b) => a[1].time - b[1].time)[0];
      if (oldest) this.cache.delete(oldest[0]);
    }

    return qr;
  }

  clear() {
    this.cache.clear();
  }
}

/**
 * PWA Web App Manifest 与 App 启动图标
 */
const PWA_MANIFEST = JSON.stringify({
  name: 'DeepSeek Harness',
  short_name: 'DSH',
  description: 'DeepSeek Harness Remote & Mobile Workspace',
  start_url: '/',
  display: 'standalone',
  background_color: '#181825',
  theme_color: '#1e1e2e',
  orientation: 'any',
  icons: [
    {
      src: '/__dsh_bridge__/pwa-icon.svg',
      sizes: 'any',
      type: 'image/svg+xml',
      purpose: 'any maskable'
    }
  ]
}, null, 2);

const PWA_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4f6ef7"/>
      <stop offset="100%" stop-color="#24388a"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="128" fill="url(#g)"/>
  <path d="M150 170 C150 140, 362 140, 362 170 L362 330 C362 360, 150 360, 150 330 Z" fill="#ffffff" fill-opacity="0.12"/>
  <circle cx="206" cy="220" r="28" fill="#ffffff"/>
  <circle cx="306" cy="220" r="28" fill="#ffffff"/>
  <path d="M200 290 Q256 340 312 290" stroke="#ffffff" stroke-width="24" stroke-linecap="round" fill="none"/>
  <rect x="236" y="90" width="40" height="60" rx="10" fill="#ffffff"/>
  <circle cx="256" cy="80" r="16" fill="#4f6ef7"/>
</svg>`;

const HTML_HEAD_ASSETS = `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="DSH">
<meta name="theme-color" content="#1e1e2e">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="icon" type="image/svg+xml" href="/__dsh_bridge__/pwa-icon.svg">
<link rel="apple-touch-icon" href="/__dsh_bridge__/pwa-icon.svg">
<style data-dsh-bridge-overscroll="1">html,body{overscroll-behavior-y:none;-webkit-overflow-scrolling:touch}</style>
<script data-dsh-bridge-polyfill="1">!function(){try{if(self.crypto&&!self.crypto.randomUUID){self.crypto.randomUUID=function(){var b=new Uint8Array(16);self.crypto.getRandomValues(b);b[6]=b[6]&15|64;b[8]=b[8]&63|128;var h="";for(var i=0;i<16;i++){var x=b[i].toString(16);h+=(x.length<2?"0":"")+x;if(i===3||i===5||i===7||i===9)h+="-";}return h;}}}catch(e){}}();</script>
`;
/** 可分别判重注入的三段：各自的 data 标记即去重键（旧版只按 marker 1 判重，
 *  两层桥串联时会出现"上游有 1 没有 2/3 → 整段跳过"的漏注入）。 */
const HTML_INJECTION_PARTS = [
  { mark: 'data-dsh-bridge-polyfill="1"', html: HTML_HEAD_ASSETS },
  { mark: 'data-dsh-bridge-polyfill="2"', html: BROWSER_ABORT_SIGNAL_POLYFILL },
  { mark: 'data-dsh-bridge-polyfill="3"', html: BROWSER_PROMISE_ITERATOR_POLYFILL },
];

function isCompressed(headers) {
  return /(^|,\s*)(gzip|br|deflate)(\s*,|$)/i.test(String(headers['content-encoding'] ?? ''));
}

/**
 * 读取 DSH 本地凭证并生成 loopback dsh-auth 认证签名 Cookie (适配 DSH 新版原生认证)
 *
 * 实现见 lib/auth/dsh-native-cookie.js（含 cookie 名称/载荷/签名的格式说明与
 * 凭据记录定位策略）。此处仅做 thin wrapper，保持既有调用点不变。
 */
function getDshLoopbackCookie(targetPort) {
  return getDshLoopbackCookieImpl(targetPort);
}

/** 把请求头中的 Host 和 Origin 改写成 loopback，让 DSH 的安全栅栏放行 */
function loopbackHeaders(headers, targetPort) {
  const authority = `127.0.0.1:${targetPort}`;
  const out = { ...headers };
  out['host'] = authority;
  if (out['origin']) out['origin'] = `http://${authority}`;
  if (out['Origin']) out['Origin'] = `http://${authority}`;

  // 1. 注入 DSH 本地认证签名（若有）
  const dshCookie = getDshLoopbackCookie(targetPort);
  if (dshCookie) {
    const existing = out['cookie'] || out['Cookie'] || '';
    out['cookie'] = existing ? `${existing}; ${dshCookie}` : dshCookie;
    delete out['Cookie'];
  }

  // 2. 禁用内部代理流量压缩，确保代理层拿到未压缩 HTML 以稳定注入 ownsHost 和 Polyfill
  delete out['accept-encoding'];
  delete out['Accept-Encoding'];

  return out;
}

// hop-by-hop 响应头黑名单：这些头描述的是"当前一跳"的传输语义，反向代理
// 透传会干扰客户端对响应体的解析（transfer-encoding/connection 并存、
// keep-alive 连接复用错乱等）。Node http 层会自动生成正确的传输头，故统一剥离。
const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

/**
 * 净化上游响应头：剔除 hop-by-hop 头，返回可安全 writeHead 的干净头对象。
 * 保留原始键大小写（Node writeHead 会归一化处理）。
 * @param {object} headers 上游响应头（IncomingMessage.headers 形式）
 * @param {Set<string>} [extra] 额外需剔除的头（小写）
 */
function sanitizeProxyHeaders(headers, extra) {
  const out = {};
  for (const [k, v] of Object.entries(headers)) {
    if (HOP_BY_HOP_HEADERS.has(k.toLowerCase())) continue;
    if (extra && extra.has(k.toLowerCase())) continue;
    out[k] = v;
  }
  return out;
}

/**
 * HTTP + WebSocket 代理服务器（带安全认证守门）
 * 关键：改写 Host + Origin，注入 crypto.randomUUID polyfill
 * 并在未授权时拦截并展示 DSH 风格登录页，阻止未授权 WebSocket 与 API 调用
 */
/**
 * 从 `/proc/self/cgroup` 内容里取出最内层（最后一段）的 systemd 单元名。
 *
 * 形如 `0::/user.slice/user-1000.slice/user@1000.service/app.slice/dsh-web.service`
 * 时必须取 `dsh-web.service`（祖先里的 `user@1000.service` 是用户管理器，不是本服务）。
 *
 * @param {string} cgroup /proc/self/cgroup 的原始内容
 * @returns {string} 单元名，取不到返回空串
 */
export function parseSystemdUnit(cgroup) {
  const lines = String(cgroup || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const parts = line.split('/').map((p) => p.trim()).filter(Boolean);
    // 只认**最内层**组件：若最内层不是 .service（例如 .scope、或 docker/k8s 的容器目录），
    // 说明本进程不是被某个 service 直接托管，绝不能向上游误取祖先单元
    // （否则会把 docker.service / cron.service 之类重启掉）。
    const innermost = parts[parts.length - 1] ?? '';
    if (innermost.endsWith('.service')) {
      return innermost;
    }
  }
  return '';
}

/**
 * 判断当前 DSH 由谁托管，决定重启方式（纯函数，便于单测）。
 *
 * @param {object} [opts]
 * @param {object} [opts.env] 环境变量（默认 process.env）
 * @param {string} [opts.cgroup] /proc/self/cgroup 内容
 * @returns {{kind:'daemon'|'systemd'|'self', scope?:'user'|'system', unit?:string, reason:string}}
 */
export function detectSupervisor({ env = process.env, cgroup = '' } = {}) {
  if (env.DSH_DAEMON || env.PM2_HOME) {
    return { kind: 'daemon', reason: env.PM2_HOME ? 'PM2_HOME' : 'DSH_DAEMON' };
  }
  const text = String(cgroup || '');
  // 只在确实处于 systemd 环境时才认（INVOCATION_ID/JOURNAL_STREAM 是 systemd 注入的标记），
  // 避免在容器里存在同名 cgroup 文本时误判。
  const systemdMarked = Boolean(env.INVOCATION_ID || env.JOURNAL_STREAM) || text.includes('.slice');
  const unit = systemdMarked ? parseSystemdUnit(text) : '';
  if (unit) {
    const isUser = text.includes('user.slice') || text.includes('/user@');
    return { kind: 'systemd', scope: isUser ? 'user' : 'system', unit, reason: 'cgroup 检出 systemd 单元' };
  }
  return { kind: 'self', reason: '未检出托管器（无 DSH_DAEMON/PM2_HOME，也不在 systemd 单元内）' };
}

/**
 * 判断当前宿主是否跑在 DSH 桌面版（Electron）内（纯函数，便于单测）。
 *
 * 背景：桌面端宿主是 Electron 以 RunAsNode 模式拉起的同一套 @deepseek-ai/dsh，
 * 进程生死由 Electron 壳经 IPC 管理（shutdown/quit-inspection），没有 systemd、
 * DSH_DAEMON/PM2 这类托管器。插件若按 Web/CLI 版的假设自行重启/升级宿主，
 * 会拉起脱离壳管理的孤儿进程（抢占 19387 端口、触发壳的恢复对话框）或把包
 * 装进错误的 profile（桌面端 profile 名为 `desktop`，不是 `web`）。
 *
 * 判据（按可靠性排序，任一命中即判为桌面端）：
 *   1. `process.versions.electron` 存在 —— Electron（含 RunAsNode 模式）的官方
 *      行为保证该字段存在，跨平台最可靠；
 *   2. 主模块路径含 `desktop-host` —— 桌面宿主入口固定为 desktop-host 包。
 *
 * fail-open：判不准时一律按 Web/CLI 版走，绝不能把正常用户的重启/升级拦掉。
 *
 * @param {object} [opts]
 * @param {object} [opts.versions] process.versions（默认 process.versions）
 * @param {string} [opts.argv1] process.argv[1]（默认 process.argv[1]）
 * @returns {boolean}
 */
export function isDesktopHost({ versions = process.versions, argv1 = process.argv[1] } = {}) {
  try {
    if (versions && typeof versions.electron === 'string' && versions.electron.length > 0) return true;
  } catch { /* 忽略，继续下一个判据 */ }
  try {
    // 必须按路径分段匹配（前后是分隔符或串 ends）：避免用户目录名恰好包含
    // desktop-host 子串（如本仓库的 test/desktop-host-compat.test.mjs）时误判。
    // 生产路径形如 .../dsh-desktop-host/lib/index.js。
    if (typeof argv1 === 'string' && /(?:^|[/\\])(?:dsh-)?desktop-host(?:[/\\]|$)/i.test(argv1)) return true;
  } catch { /* 忽略，fail-open */ }
  return false;
}

/**
 * 当前宿主加载的 profile 名（纯函数，便于单测）。
 * 桌面端为 `desktop`，其余（Web/CLI）为 `web`。供 `dsh plugin --profile <name> add`
 * 类命令使用，避免把包装进宿主不加载的 profile。
 */
export function currentProfileName(opts = {}) {
  return isDesktopHost(opts) ? 'desktop' : 'web';
}

/** 浏览器对 opaque origin（sandboxed iframe、data:、file: 等）发送的 Origin 字面量。 */
const OPAQUE_ORIGIN = 'null';

/**
 * 把候选面板来源 URL 收敛为 http(s) 的 origin；非 http(s) 一律丢弃。
 *
 * 必要性：`new URL('dsh-app://app').origin` 返回的是字符串 `"null"`（opaque origin），
 * 一旦这种值进入 loopback-token 的 CORS 白名单，就等于放行**所有** opaque origin——
 * 任意网页只要用 sandboxed iframe 发起请求，就能跨域读取回环领取的 adminToken 响应。
 * 隧道地址来自外部（隧道服务器下发的 `publicUrl`），因此必须在进入白名单前按协议收敛。
 *
 * @param {unknown} value 候选来源（URL 字符串）
 * @returns {string|undefined} http(s) origin；非法或非 http(s) 返回 undefined
 */
export function toHttpOrigin(value) {
  if (value === undefined || value === null || value === '') return undefined;
  try {
    const url = new URL(String(value));
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
    return url.origin;
  } catch {
    return undefined;
  }
}

/**
 * 归一化外部隧道地址：仅接受 http(s)，去掉末尾斜杠。
 *
 * 保存（`saveExternalTunnel`）与启动恢复（`loadConfig()` 回填 `externalTunnelConfig`）
 * 两条路径共用同一收敛逻辑，消除"保存时校验、恢复时不校验"的不对称。
 *
 * 定位说明（勿夸大）：**这不是 CORS 防线**——进入白名单前还有 `toHttpOrigin()` 闸门，
 * 因此非 http(s) 值即使回填也不会产生 `"null"` origin。本函数的价值是纵深防御 +
 * 输入归一化：不让非法值进入配置对象（否则会被面板当公网地址展示并生成二维码），
 * 并且不再依赖"每个新调用点都记得加闸门"。
 *
 * @param {unknown} value 候选地址
 * @returns {string|null} 归一化后的 http(s) 地址；非法或非 http(s) 返回 null
 */
export function normalizeExternalTunnelUrl(value) {
  const trimmed = value ? String(value).trim() : '';
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    // 只剥掉"裸 origin"末尾那一枚斜杠（https://x/ → https://x）。
    // 路径与查询里的尾斜杠是有意义的：`https://x/app/` 的路径是 /app/，
    // `https://x/?q=1/` 的查询值就是 "1/"——对整串做 replace(/\/+$/) 会把它们改写掉。
    const serialized = url.toString();
    const isBareOrigin = url.pathname === '/' && !url.search && !url.hash;
    return isBareOrigin ? serialized.replace(/\/$/, '') : serialized;
  } catch {
    return null;
  }
}

/**
 * 从落盘配置恢复外部隧道登记（纯函数，便于单测）。
 *
 * 落盘文件可被本地改写或手工编辑，恢复侧同样收敛；`invalid` 只在"确实提供了地址但
 * 不是 http(s)"时为真，避免把"未登记"误报成"非法地址"。
 *
 * @param {unknown} storedExternalTunnel 落盘对象，形如 `{ url }`
 * @returns {{config: {url: string}|null, invalid: boolean}}
 */
export function restoreExternalTunnelConfig(storedExternalTunnel) {
  const raw = storedExternalTunnel?.url;
  const normalized = normalizeExternalTunnelUrl(raw);
  if (normalized) return { config: { url: normalized }, invalid: false };
  return { config: null, invalid: Boolean(raw && String(raw).trim()) };
}

/**
 * 启动时把落盘配置回填到 BridgeService（`apply()` 的恢复接线）。
 *
 * 抽成独立函数以便单测直接驱动：`apply()` 的启动链依赖完整宿主 ctx，测试里难以构造。
 * 落盘文件可被本地改写/手工编辑，因此来源类字段在恢复侧同样收敛（见
 * `restoreExternalTunnelConfig`）。自动拉起沿用原有的 fire-and-forget + 错误日志语义。
 *
 * @param {object} args
 * @param {object} args.service 目标 BridgeService 实例
 * @param {object} [args.stored] 落盘配置
 * @param {object} [args.logger]
 * @param {boolean} [args.authEnabled] 访问认证是否已开启（决定首次启用引导提示）
 */
export function restorePersistedServiceState({ service, stored, logger, authEnabled } = {}) {
  // 首次启用引导判据（保守）：仅当「访问认证未开启」且「从未展示过引导」时才提示。
  // 已开启认证的用户、以及已经看过引导的用户一律不再打扰。
  service.firstRunGuidePending = authEnabled !== true && stored?.wizard?.guideShown !== true;

  if (stored?.externalTunnel) {
    // 落盘配置不可信（可被本地改写/手工编辑）：恢复侧同样按 http(s) 收敛。
    // 这是纵深防御 + 输入归一化，不是 CORS 防线——白名单入口另有 toHttpOrigin 闸门；
    // 这里的价值是不让非法值进入配置对象（会被面板展示并生成二维码）。
    const restored = restoreExternalTunnelConfig(stored.externalTunnel);
    if (restored.invalid) {
      logger?.warn?.('dsh-bridge: 已忽略非法的外部隧道地址配置（仅接受 http/https）');
    }
    service.externalTunnelConfig = restored.config;
  }

  if (stored?.lan?.selectedIp) {
    service.selectedLanIp = stored.lan.selectedIp;
    logger?.info?.('dsh-bridge: loaded saved lan config (selectedIp=%s)', service.selectedLanIp);
  }

  if (stored?.cloudflared) {
    service.cloudflaredConfig = stored.cloudflared;
    logger?.info?.('dsh-bridge: loaded saved cloudflared config (autoStart=%s, tokenConfigured=%s)', Boolean(service.cloudflaredConfig.autoStart), Boolean(service.cloudflaredConfig.token));
    if (service.cloudflaredConfig.autoStart) {
      logger?.info?.('dsh-bridge: auto-starting cloudflared tunnel...');
      service.startCloudflared({ autoStart: true }).catch((err) => {
        logger?.error?.('dsh-bridge: cloudflared auto-start failed: %s', err?.message ?? err);
      });
    }
  }

  if (stored?.customTunnel) {
    service.customTunnelConfig = stored.customTunnel;
    logger?.info?.('dsh-bridge: loaded saved custom tunnel config (autoStart=%s)', Boolean(service.customTunnelConfig.autoStart));
    if (service.customTunnelConfig.autoStart && service.customTunnelConfig.serverUrl) {
      logger?.info?.('dsh-bridge: auto-starting custom tunnel...');
      service.startCustomTunnel({ autoStart: true }).catch((err) => {
        logger?.error?.('dsh-bridge: custom tunnel auto-start failed: %s', err?.message ?? err);
      });
    }
  }
}

class ProxyServer {
  constructor({ localPort, targetPort, authManager, logger, allowedOrigins }) {
    this.localPort = localPort;
    this.targetPort = targetPort;
    this.authManager = authManager;
    this.logger = logger;
    // 返回 loopback-token 端点允许跨域读取的 Origin 列表（本插件自身生成的面板地址）
    this.allowedOrigins = allowedOrigins ?? (() => []);
    this.server = null;
    this.clientSockets = new Set();
  }

  async start() {
    if (this.server) return;

    this.server = createServer((req, res) => {
      const pathname = (req.url || '/').split('?')[0].replace(/\/+$/, '') || '/';

      // 0. PWA Web App Manifest 与 App 图标支持
      if (pathname === '/manifest.webmanifest' || pathname === '/manifest.json') {
        res.writeHead(200, { 'Content-Type': 'application/manifest+json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
        res.end(PWA_MANIFEST);
        return;
      }
      if (pathname === '/__dsh_bridge__/pwa-icon.svg' || pathname === '/apple-touch-icon.png') {
        res.writeHead(200, { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
        res.end(PWA_ICON_SVG);
        return;
      }

      // 1. 处理登录 API: POST /__dsh_bridge__/login
      if (pathname === '/__dsh_bridge__/login' && req.method === 'POST') {
        const chunks = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', async () => {
          try {
            const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
            const clientIp = req.socket?.remoteAddress || '';
            const verify = await this.authManager?.verifyPassword(body.password, clientIp);
            if (verify?.success) {
              const sessionToken = this.authManager.createSession();
              res.writeHead(200, {
                'Content-Type': 'application/json; charset=utf-8',
                'Set-Cookie': `dsh_bridge_auth=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`,
              });
              res.end(JSON.stringify({ ok: true }));
            } else {
              res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ ok: false, error: verify?.error || '访问密码错误' }));
            }
          } catch (e) {
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ ok: false, error: '无效请求' }));
          }
        });
        return;
      }

      // 2. 处理登出 API: POST /__dsh_bridge__/logout
      if (pathname === '/__dsh_bridge__/logout' && req.method === 'POST') {
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Set-Cookie': 'dsh_bridge_auth=; Path=/; HttpOnly; Max-Age=0',
        });
        res.end(JSON.stringify({ ok: true }));
        return;
      }

      // 3. 处理鉴权状态 API: GET /__dsh_bridge__/auth-status (严格脱敏，不暴露 secretToken)
      if (pathname === '/__dsh_bridge__/auth-status' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(this.authManager?.getPublicStatus() ?? { enabled: false }));
        return;
      }

      // 3.1 本机特权 Token 签发：仅限真正物理回环连接（127.0.0.1 / ::1，严禁隧道转发流量伪造）
      if (pathname === '/__dsh_bridge__/loopback-token') {
        // CORS 收敛（T2.10）：不再使用 *。仅允许本插件自己生成的面板来源（回环/局域网 IP/隧道地址）
        // 跨域读取响应，防止任意网页在 Firefox/Safari 下借访客浏览器回环领取 adminToken。
        // 无 Origin 头的请求（curl 等非浏览器客户端）不受影响。
        let corsOrigin;
        {
          const origin = req.headers?.origin;
          // opaque origin（字面量 "null"）永不授权：它代表 sandboxed iframe / data: / file: 等
          // 任意来源，回显 ACAO: null 会让任何网页跨域读走 loopback-token 响应。
          if (origin && origin !== OPAQUE_ORIGIN) {
            try {
              const allowed = new Set(this.allowedOrigins());
              if (allowed.has(origin)) corsOrigin = origin;
            } catch { /* 来源计算失败则不放开跨域 */ }
          }
        }
        const corsHeaders = {
          ...(corsOrigin ? { 'Access-Control-Allow-Origin': corsOrigin, Vary: 'Origin' } : { Vary: 'Origin' }),
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          // 该端点响应体含 adminToken：禁止任何缓存留存。Vary: Origin 只影响缓存键，
          // 不禁缓存——缺 no-store 时中间缓存/浏览器磁盘缓存可能留存令牌。
          'Cache-Control': 'no-store',
        };
        if (req.method === 'OPTIONS') {
          res.writeHead(204, corsHeaders);
          res.end();
          return;
        }

        const remote = req.socket?.remoteAddress || '';
        const isLoopback = (remote === '127.0.0.1' || remote === '::1' || remote === '::ffff:127.0.0.1');
        const internalTunnelHeader = req.headers?.['x-dsh-internal-tunnel'];
        const isCustomTunnel = Boolean(isLoopback && internalTunnelHeader && internalTunnelHeader === this.authManager?.internalTunnelSecret);
        const isCloudflare = Boolean(isLoopback && (req.headers?.['cf-ray'] || req.headers?.['cf-connecting-ip']));
        const isPublicTunnel = isCustomTunnel || isCloudflare;

        if (isLoopback && !isPublicTunnel && this.authManager) {
          const adminToken = this.authManager.createAdminSession();
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders });
          res.end(JSON.stringify({ ok: true, adminToken }));
          return;
        }

        res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders });
        res.end(JSON.stringify({ ok: false, error: 'Forbidden: loopback only' }));
        return;
      }

      // 4. 核心鉴权拦截
      // 豁免：authAdminUnlock（管理密码解锁）不要求访问会话——锁屏状态下访问会话可能已失效，
      // 但用户应能凭管理密码解锁（否则访问会话失效后锁屏永远解不开，死锁）
      const isAdminUnlockRpc = pathname === '/dsh-bridge/authAdminUnlock'
        || pathname.endsWith('/dsh-bridge/authAdminUnlock');
      const auth = isAdminUnlockRpc
        ? { authenticated: true }
        : (this.authManager?.verifyRequest(req) ?? { authenticated: true });

      // 4.1 若从 URL Token 认证通过：下发 Cookie 并 302 重定向到干净 URL (去掉 ?auth=)
      if (auth.fromToken) {
        const sessionToken = this.authManager.createSession();
        try {
          const urlObj = new URL(req.url, 'http://localhost');
          urlObj.searchParams.delete('auth');
          urlObj.searchParams.delete('token');
          const cleanPath = (urlObj.pathname || '/') + (urlObj.search || '');
          res.writeHead(302, {
            'Location': cleanPath,
            'Set-Cookie': `dsh_bridge_auth=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`,
          });
          res.end();
          return;
        } catch {
          res.writeHead(302, {
            'Location': '/',
            'Set-Cookie': `dsh_bridge_auth=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`,
          });
          res.end();
          return;
        }
      }

      // 4.2 若未通过认证：根据请求类型渲染 DSH 登录页或返回 401 JSON
      if (!auth.authenticated) {
        const accept = String(req.headers['accept'] || '');
        const isHtml = accept.includes('text/html') || (!req.url.startsWith('/api/') && !req.url.includes('.'));
        if (isHtml) {
          const clientIp = req.socket?.remoteAddress || '';
          const isLocked = this.authManager?.isIpBlocked(clientIp);
          const html = renderLoginPage({
            hasPassword: this.authManager?.hasPassword,
            // 管理员是否从未设置过任何密码（含独立管理密码）：登录页需如实提示，
            // 避免出现"输入任意密码都能进"的假门禁
            noPasswordConfigured: !this.authManager?.hasPassword && !this.authManager?.hasAdminPassword,
            mode: this.authManager?.mode,
            locked: isLocked,
            error: isLocked ? '尝试次数过多，请 60 秒后再试' : '',
          });
          res.writeHead(401, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(html);
          return;
        } else {
          res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'unauthorized', message: '需要访问认证，请先登录' }));
          return;
        }
      }

      // 5. 认证通过：正常执行反向代理转发
      const headers = loopbackHeaders(req.headers, this.targetPort);
      const proxyReq = httpRequest(
        { host: '127.0.0.1', port: this.targetPort, method: req.method, path: req.url, headers, agent: false },
        (proxyRes) => {
          const contentType = String(proxyRes.headers['content-type'] ?? '');
          // 会话投影剥离（session.list / session.history）：这两个端点响应体可能达
          // 数十 MB（contextHeaders 投影无 UI 读取），剥离后显著降低公网传输体积。
          // 覆盖所有入口：局域网 / Cloudflare 隧道 / 外部隧道登记 / 自建隧道。
          const isSessionProjection = pathname.startsWith('/api/session.list') || pathname.startsWith('/api/session.history');
          // session 投影剥离须覆盖压缩(gzip)响应：v2.10.4 起 stripSessionProjections 支持
          // gunzip 解压，因此压缩的 session 响应也应进入缓冲分支进行剥离（此前 !isCompressed
          // 门控会跳过压缩响应，导致 DSH 启用 gzip 后局域网/CF/外部隧道入口剥离失效——只有
          // 自建隧道入口正确剥离）。HTML 注入仍只在未压缩时进行（注入逻辑处理明文）。
          const sessionProjectionBuffered = isSessionProjection && proxyRes.statusCode === 200;
          const shouldBuffer = (contentType.includes('text/html') && !isCompressed(proxyRes.headers))
            || sessionProjectionBuffered;
          if (shouldBuffer) {
            const chunks = [];
            proxyRes.on('data', (c) => chunks.push(c));
            proxyRes.on('end', () => {
              let out = Buffer.concat(chunks);
              const outHeaders = { ...proxyRes.headers };
              if (contentType.includes('text/html') && !isCompressed(proxyRes.headers)) {
                let html = out.toString('utf8');
                const missingParts = HTML_INJECTION_PARTS.filter((part) => !html.includes(part.mark));
                if (missingParts.length > 0) {
                  const payload = missingParts.map((part) => part.html).join('\n');
                  html = html.replace(/<head[^>]*>/i, (m) => `${m}${payload}`);
                }
                out = Buffer.from(html, 'utf8');
              } else if (isSessionProjection) {
                const { body, stripped } = stripSessionProjections(pathname, out, proxyRes.headers['content-encoding']);
                if (stripped) {
                  out = body;
                  // 已修改 body，清除原始压缩编码标记
                  delete outHeaders['content-encoding'];
                }
              }
              // 缓冲改写过 body：必须去掉原始传输头，避免 content-length 与
              // transfer-encoding 并存导致客户端解析错误（HPE_INVALID_CONTENT_LENGTH）
              delete outHeaders['content-length'];
              delete outHeaders['transfer-encoding'];
              outHeaders['content-length'] = String(out.length);
              res.writeHead(proxyRes.statusCode ?? 200, sanitizeProxyHeaders(outHeaders));
              res.end(out);
            });
            proxyRes.on('error', () => res.destroy());
            return;
          }
          // 直通分支同样剔除 hop-by-hop 头（transfer-encoding/connection 等），
          // 防止透传给客户端导致解析错误；Node 会按 writeHead+pipe 自动生成正确的传输头
          res.writeHead(proxyRes.statusCode ?? 502, sanitizeProxyHeaders(proxyRes.headers));
          proxyRes.pipe(res);
          res.on('close', () => proxyRes.destroy());
          proxyRes.on('error', () => res.destroy());
          proxyRes.on('close', () => { if (!res.writableEnded) res.destroy(); });
        },
      );
      proxyReq.on('error', (err) => {
        this.logger.error('代理请求失败: %s', err.message);
        if (!res.headersSent) res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
        res.end(`dsh-bridge: 无法连接 dsh web (127.0.0.1:${this.targetPort}) — ${err.message}`);
      });
      req.pipe(proxyReq);
    });

    // WebSocket upgrade 鉴权与代理
    this.server.on('upgrade', (req, socket, head) => {
      const auth = this.authManager?.verifyRequest(req) ?? { authenticated: true };
      if (!auth.authenticated) {
        socket.write('HTTP/1.1 401 Unauthorized\r\nContent-Type: text/plain\r\n\r\nUnauthorized\r\n');
        socket.destroy();
        return;
      }

      // 纵深防御：浏览器发起的升级请求若带 Origin 且不在已知面板来源内，拒绝握手，
      // 防止恶意页面借用户浏览器已有的 Cookie 建立 WebSocket（CSWSH）。
      // 认证已在上方完成，此处只做额外收紧，不构成绕过认证的路径。
      // 关键兼容性约束：Origin 缺失一律放行——非浏览器客户端（IM 机器人、
      // ws 库、命令行工具、隧道转发）通常不发 Origin，若按缺失拒绝会直接
      // 打断现有用户的机器人通道。
      const origin = req.headers?.origin;
      if (origin) {
        let allowed;
        try {
          allowed = this.allowedOrigins?.() ?? [];
        } catch { allowed = []; }
        // opaque origin（字面量 "null"）永不放行：它无法归属到任何具体面板来源。
        if (origin === OPAQUE_ORIGIN || !allowed.includes(origin)) {
          // 直接内联 origin，避免依赖 logger 的 printf 插值（该 logger 在部分调用形态下不做替换）
          this.logger?.warn?.(`dsh-bridge: 拒绝来源不明的 WebSocket 升级请求 (Origin=${origin})`);
          socket.write('HTTP/1.1 403 Forbidden\r\nContent-Type: text/plain\r\n\r\nForbidden\r\n');
          socket.destroy();
          return;
        }
      }

      const headers = loopbackHeaders(req.headers, this.targetPort);
      const proxyReq = httpRequest({
        host: '127.0.0.1', port: this.targetPort, method: req.method, path: req.url, headers, agent: false,
      });
      proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
        socket.write('HTTP/1.1 101 Switching Protocols\r\n');
        // WS 升级成功：手写原始 socket 响应，只放行必要的 101 头（白名单），
        // 避免上游注入任意头（如 set-cookie / 自定义敏感头）透传给浏览器
        const WS_101_ALLOW = new Set([
          'connection', 'upgrade', 'sec-websocket-accept',
          'sec-websocket-extensions', 'sec-websocket-protocol',
        ]);
        const raw = [];
        for (const [k, v] of Object.entries(proxyRes.headers)) {
          if (!WS_101_ALLOW.has(k.toLowerCase())) continue;
          raw.push(`${k}: ${Array.isArray(v) ? v.join(', ') : v}`);
        }
        socket.write(`${raw.join('\r\n')}\r\n\r\n`);
        if (proxyHead?.length) socket.write(proxyHead);
        proxySocket.pipe(socket);
        socket.pipe(proxySocket);
        const teardown = () => {
          try { proxySocket.destroy(); } catch {}
          try { socket.destroy(); } catch {}
        };
        proxySocket.on('close', teardown);
        socket.on('close', teardown);
      });
      proxyReq.on('response', (proxyRes) => {
        if (proxyRes.statusCode === 101) return;
        try {
          const raw = [`HTTP/1.1 ${proxyRes.statusCode} ${proxyRes.statusMessage ?? ''}`.trim()];
          // 非 101（如后端拒绝升级）：剔除 hop-by-hop 头后再回写
          for (const [k, v] of Object.entries(sanitizeProxyHeaders(proxyRes.headers))) {
            raw.push(`${k}: ${Array.isArray(v) ? v.join(', ') : v}`);
          }
          socket.end(raw.join('\r\n') + '\r\n\r\n');
          proxyRes.resume();
        } catch { socket.destroy(); }
      });
      proxyReq.on('error', () => socket.destroy());
      if (head?.length) proxyReq.write(head);
      proxyReq.end();
      socket.on('error', () => socket.destroy());
    });

    // 跟踪所有连接以便 stop() 时强制关闭
    this.server.on('connection', (sock) => {
      this.clientSockets.add(sock);
      sock.on('close', () => this.clientSockets.delete(sock));
      sock.on('error', () => {});
    });

    await new Promise((resolve, reject) => {
      this.server.once('error', reject);
      this.server.listen(this.localPort, '0.0.0.0', () => {
        this.logger.info('dsh-bridge: 代理已启动 0.0.0.0:%d -> 127.0.0.1:%d', this.localPort, this.targetPort);
        resolve();
      });
    });
  }

  async stop() {
    if (!this.server) return;
    for (const s of this.clientSockets) { try { s.destroy(); } catch {} }
    await new Promise((resolve) => this.server.close(() => resolve()));
    this.server = null;
    this.clientSockets.clear();
  }

  get activeConnections() {
    return this.clientSockets.size;
  }

  get port() {
    return this.localPort;
  }
}

/**
 * Bridge Service
 */
class BridgeService {
  constructor({ dshPort, proxyPort, home, cloudflaredConfig, customTunnelConfig, lanConfig, authManager, onPersist, logger, mobileUiEnabled }) {
    this.dshPort = dshPort;
    this.proxyPort = proxyPort;
    // 包级别页面改写层开关（issue #56 §4），默认 true；仅影响客户端页面改写，不影响隧道/IM
    this.mobileUiEnabled = mobileUiEnabled ?? true;
    this.home = home;
    this.cloudflaredConfig = cloudflaredConfig ?? { token: '', hostname: '', autoStart: false };
    this.customTunnelConfig = customTunnelConfig ?? null;
    this.externalTunnelConfig = null; // 用户自行部署的外部隧道（Docker cloudflared 等），仅登记公网地址展示
    this.selectedLanIp = lanConfig?.selectedIp ?? null;
    this.authManager = authManager ?? null;
    this.onPersist = onPersist ?? null;
    this.logger = logger;

    // 运行中任务探测所需的运行时引用（由 apply 在构造后注入）：
    //   ctx.sessions —— 枚举 live 会话及其事件流，判断是否有 turn 在跑
    //   platformManager —— 遍历各 IM 平台 bridge，取其 pending 审批
    // 二者缺失时探测退化为「未检测到任务」，重启照常执行（不得因探测失败而阻断重启）。
    this.runtimeCtx = null;
    this.platformManager = null;

    this.qrCache = new QrCache();
    this.proxy = null;

    // 首次启用引导：是否仍需要向用户展示「开门禁」提示（由 apply 的启动链按保守判据置位）
    this.firstRunGuidePending = false;

    this.customTunnel = null;
    this.customTunnelState = { phase: 'idle', detail: '' };

    this.cloudflared = null;
    this.cloudflaredState = { phase: 'idle', detail: '' };

    // DSH 宿主版本：惰性探测一次并缓存（进程生命周期内不变，避免频繁 spawn 子进程）
    this._dshVersion = null;
    this._dshVersionLoaded = false;
    // 版本检查结果缓存（10 分钟 TTL）：客户端轮询/多处面板重复调用时不反复打 npm registry
    this._versionCheckCache = null;
    this._versionCheckCachedAt = 0;
    this._versionCheckTtlMs = 10 * 60 * 1000;
  }

  /**
   * 探测 DSH 宿主版本（`dsh --version`，与升级功能同一套增强 PATH 的 spawn 模式）。
   * 惰性执行 + 结果缓存；失败静默返回 null（不阻塞面板）。
   * @returns {Promise<string|null>}
   */
  async getDshVersion() {
    if (this._dshVersionLoaded) return this._dshVersion;
    // 上次探测失败后的退避期未到：不 spawn，直接返回 null（面板仍可正常加载）
    if (this._dshVersionRetryAt && Date.now() < this._dshVersionRetryAt) return this._dshVersion;
    this._dshVersionLoaded = true; // 尝试期间置位；成功保持，失败在 catch 里复位并设退避

    const isWin = process.platform === 'win32';
    const nodeDir = dirname(process.execPath);
    const existingPath = process.env.PATH || process.env.Path || '';
    const extraPaths = isWin ? [nodeDir] : [nodeDir, '/opt/homebrew/bin', '/opt/homebrew/sbin', '/usr/local/bin', '/usr/bin', '/bin'];
    const separator = isWin ? ';' : ':';
    const augmentedEnv = {
      ...process.env,
      PATH: [...extraPaths, existingPath].filter(Boolean).join(separator),
    };
    if (isWin) augmentedEnv.Path = augmentedEnv.PATH;

    try {
      const version = await new Promise((resolve, reject) => {
        let cp;
        try {
          // 命令为固定字面量（无用户输入），shell 拼接安全；带 args 的 shell:true 在 Node 24 有弃用警告
          cp = spawn('dsh --version', {
            windowsHide: true,
            shell: true,
            env: augmentedEnv,
            timeout: 5000,
          });
        } catch (e) {
          return reject(e);
        }
        let stdout = '';
        let stderr = '';
        cp.stdout?.on('data', (d) => { stdout += d.toString(); });
        cp.stderr?.on('data', (d) => { stderr += d.toString(); });
        cp.on('error', reject);
        cp.on('close', (code) => {
          if (code === 0 && stdout.trim()) resolve(stdout.trim());
          else reject(new Error(stderr || stdout || `退出码 ${code}`));
        });
      });
      this._dshVersion = version;
    } catch (e) {
      this.logger?.debug?.('dsh-bridge: 探测 DSH 版本失败: %s', e.message);
      this._dshVersion = null;
      // 失败：复位已加载标记并设 10 分钟退避期。退避期内 getStatus 不再 spawn，
      // 到期后允许重试一次（用户修复 PATH 后无需重启即可恢复版本显示）。
      this._dshVersionLoaded = false;
      this._dshVersionRetryAt = Date.now() + 10 * 60 * 1000;
    }
    return this._dshVersion;
  }

  /**
   * 标记「首次启用引导」已展示/已确认，持久化后不再打扰用户。
   * 与访问认证状态解耦：即便用户仍未开启门禁，确认过后也不再重复弹窗。
   */
  async dismissFirstRunGuide() {
    this.firstRunGuidePending = false;
    await this.onPersist?.({ wizard: { guideShown: true } });
    return { ok: true };
  }

  async setLanIp({ ip } = {}) {    const trimmed = ip ? String(ip).trim() : null;
    this.selectedLanIp = trimmed || null;
    await this.onPersist?.({ lan: { selectedIp: this.selectedLanIp } });
    this.logger?.info('局域网选定 IP 更新为: %s', this.selectedLanIp || '自动推荐');
    return this.getStatus();
  }

  async startProxy() {
    if (this.proxy) return this.proxy;

    this.proxy = new ProxyServer({
      localPort: this.proxyPort,
      targetPort: this.dshPort,
      authManager: this.authManager,
      logger: this.logger,
      // loopback-token 允许跨域的面板来源：DSH 原生端口（直连 3080 场景）、代理端口、
      // 当前局域网 IP、隧道公网地址。直连原生端口时页面相对路径拿不到 token，
      // 必须允许它跨域回读 3082 代理端口的 loopback-token 端点（见 issue #28）。
      allowedOrigins: () => {
        const origins = [
          `http://127.0.0.1:${this.proxyPort}`, `http://localhost:${this.proxyPort}`,
          `http://127.0.0.1:${this.dshPort}`, `http://localhost:${this.dshPort}`,
        ];
        try {
          // LAN 面板与回环同理需要同时覆盖 3082（代理）与 dshPort（DSH 原生端口直连）：
          // 浏览器从 LAN IP 直连原生端口时 Origin 是 http://<lanIp>:<dshPort>，
          // 只配 proxyPort 会导致页面能打开但 WebSocket 升级被拒（实时通道静默失效）。
          for (const iface of listAllLanIPv4()) {
            origins.push(`http://${iface.address}:${this.proxyPort}`);
            origins.push(`http://${iface.address}:${this.dshPort}`);
          }
          if (this.selectedLanIp) {
            origins.push(`http://${this.selectedLanIp}:${this.proxyPort}`);
            origins.push(`http://${this.selectedLanIp}:${this.dshPort}`);
          }
          // 隧道地址由外部提供，必须先按协议收敛为 http(s) origin：非 http(s) 的
          // `.origin` 是字符串 "null"，会放行全部 opaque origin（见 toHttpOrigin）。
          const cloudflaredOrigin = toHttpOrigin(this.cloudflared?.url);
          if (cloudflaredOrigin) origins.push(cloudflaredOrigin);
          const customTunnelOrigin = toHttpOrigin(this.customTunnel?.publicUrl);
          if (customTunnelOrigin) origins.push(customTunnelOrigin);
          const externalTunnelOrigin = toHttpOrigin(this.externalTunnelConfig?.url);
          if (externalTunnelOrigin) origins.push(externalTunnelOrigin);
        } catch { /* 单项来源解析失败不影响其余 */ }
        return origins;
      },
    });

    await this.proxy.start();
    return this.proxy;
  }

  async getStatus({ adminAuthValid = false } = {}) {
    const allInterfaces = listAllLanIPv4();
    const isSelectedValid = Boolean(this.selectedLanIp && allInterfaces.some(i => i.address === this.selectedLanIp));
    const lanIp = isSelectedValid ? this.selectedLanIp : selectLanIPv4();
    const token = adminAuthValid ? this.authManager?.secretToken : null;
    const isAuthEnabled = Boolean(this.authManager?.enabled && this.authManager?.mode !== 'password_only' && token);

    const isLanProtected = isAuthEnabled && this.authManager?.scope !== 'public_only';
    const isPublicProtected = isAuthEnabled && this.authManager?.scope !== 'lan_only';

    const appendToken = (url, shouldAppend) => {
      if (!url || !shouldAppend || !token) return url;
      try {
        const u = new URL(url);
        u.searchParams.set('auth', token);
        return u.toString();
      } catch {
        const sep = url.includes('?') ? '&' : '?';
        return `${url}${sep}auth=${encodeURIComponent(token)}`;
      }
    };

    const baseLanUrl = lanIp ? `http://${lanIp}:${this.proxyPort}` : null;
    const lanUrl = appendToken(baseLanUrl, isLanProtected);

    const baseCloudflaredUrl = this.cloudflared?.url || null;
    const cloudflaredUrl = appendToken(baseCloudflaredUrl, isPublicProtected);

    const baseCustomUrl = this.customTunnel?.publicUrl || null;
    const customUrl = appendToken(baseCustomUrl, isPublicProtected);

    return {
      version: VERSION,
      dshVersion: await this.getDshVersion(),

      // 页面改写层：mobileUi=实际生效（宿主开关 && 用户偏好），另附分项供面板展示
      mobileUi: (this.mobileUiEnabled ?? true) && (this.uiPageTweaks ?? true),
      mobileUiHost: this.mobileUiEnabled ?? true,
      uiPageTweaks: this.uiPageTweaks ?? true,

      auth: this.authManager?.getStatus({ masked: !adminAuthValid }) ?? { enabled: false },

      // 首次启用引导：为 true 时面板应提示用户开启访问门禁（默认 0.0.0.0 且认证默认关闭）
      firstRunGuide: {
        pending: Boolean(this.firstRunGuidePending),
        // 当前是否处于「监听 0.0.0.0 但认证未开启」的开箱敞开状态
        exposedWithoutAuth: this.authManager?.enabled !== true,
      },

      proxy: {
        running: !!this.proxy,
        port: this.proxyPort,
        activeConnections: this.proxy?.activeConnections ?? 0,
      },

      lan: {
        ip: lanIp,
        selectedIp: this.selectedLanIp || '',
        interfaces: allInterfaces,
        url: lanUrl,
        rawUrl: baseLanUrl,
        qr: lanUrl ? await this.qrCache.get(lanUrl) : null,
      },

      cloudflared: {
        running: this.isCloudflaredActive(),
        url: cloudflaredUrl,
        rawUrl: baseCloudflaredUrl,
        qr: cloudflaredUrl
          ? await this.qrCache.get(cloudflaredUrl)
          : null,
        state: this.cloudflaredState,
        tokenConfigured: !!this.cloudflaredConfig?.token,
        token: adminAuthValid ? (this.cloudflaredConfig?.token || '') : (this.cloudflaredConfig?.token ? '******' : ''),
        hostname: this.cloudflaredConfig?.hostname || '',
        autoStart: Boolean(this.cloudflaredConfig?.autoStart),
      },

      customTunnel: {
        configured: !!(this.customTunnelConfig?.serverUrl && this.customTunnelConfig?.accessToken),
        serverUrl: this.customTunnelConfig?.serverUrl ?? '',
        running: !!this.customTunnel?.connected,
        sseStreaming: Boolean(this.customTunnelConfig?.sseStreaming),
        url: customUrl,
        rawUrl: baseCustomUrl,
        qr: customUrl
          ? await this.qrCache.get(customUrl)
          : null,
        state: this.customTunnelState,
        autoStart: Boolean(this.customTunnelConfig?.autoStart),
      },

      // 外部已部署隧道（用户自行 Docker/二进制部署，插件仅登记展示）
      externalTunnel: {
        configured: !!this.externalTunnelConfig?.url,
        url: this.externalTunnelConfig?.url ?? '',
        qr: this.externalTunnelConfig?.url
          ? await this.qrCache.get(this.externalTunnelConfig.url)
          : null,
      },

      // 宿主系统运行监控指标
      system: this.getSystemMetrics(),
    };
  }

  async saveCloudflaredConfig({ token, hostname } = {}) {
    const prev = this.cloudflaredConfig ?? {};
    const next = { ...prev };
    // undefined = 客户端未修改不上传；'******' = 非管理员视图的掩码回显。
    // 两者都保留现值，防止真实 Token 被掩码覆盖；仅显式字符串（含空串=清除）才变更。
    if (token !== undefined) next.token = token === '******' ? (prev.token ?? '') : String(token).trim();
    if (hostname !== undefined) next.hostname = String(hostname).trim();
    this.cloudflaredConfig = next;
    await this.onPersist?.({ cloudflared: this.cloudflaredConfig });
  }

  // 登记用户自行部署的外部隧道（Docker cloudflared 等）。插件不下载/不管理该隧道，
  // 仅保存公网地址用于面板展示二维码/URL 并放行 CORS。url 传空串则清除登记。
  async saveExternalTunnel({ url } = {}) {
    const trimmed = url ? String(url).trim() : '';
    if (trimmed) {
      // 仅接受 http/https 公网地址，防止注入任意协议或本地路径
      const normalized = normalizeExternalTunnelUrl(trimmed);
      if (!normalized) throw new Error('请输入合法的公网隧道地址（https://...）');
      this.externalTunnelConfig = { url: normalized };
    } else {
      this.externalTunnelConfig = null;
    }
    await this.onPersist?.({ externalTunnel: this.externalTunnelConfig });
  }

  async setTunnelAutoStart({ tunnel, autoStart }) {
    const isAuto = Boolean(autoStart);
    if (tunnel === 'cloudflared') {
      this.cloudflaredConfig = {
        ...(this.cloudflaredConfig ?? {}),
        autoStart: isAuto,
      };
      await this.onPersist?.({ cloudflared: this.cloudflaredConfig });
    } else if (tunnel === 'customTunnel' || tunnel === 'custom') {
      this.customTunnelConfig = {
        ...(this.customTunnelConfig ?? {}),
        autoStart: isAuto,
      };
      await this.onPersist?.({ customTunnel: this.customTunnelConfig });
    }
  }

  async startCustomTunnel({ autoStart = true } = {}) {
    if (this.customTunnel) {
      throw new Error('自建隧道已在运行');
    }

    const serverUrl = this.customTunnelConfig?.serverUrl;
    const accessToken = this.customTunnelConfig?.accessToken;

    if (!serverUrl || !accessToken) {
      throw new Error('缺少配置：请在控制台配置 customTunnel.serverUrl 和 customTunnel.accessToken');
    }

    this.customTunnelConfig = {
      ...(this.customTunnelConfig ?? {}),
      autoStart: Boolean(autoStart),
    };
    await this.onPersist?.({ customTunnel: this.customTunnelConfig });

    this.customTunnel = new CustomTunnelClient({
      serverUrl,
      accessToken,
      localPort: this.proxyPort,
      internalTunnelSecret: this.authManager?.internalTunnelSecret,
      sseStreaming: Boolean(this.customTunnelConfig?.sseStreaming),
      onStateChange: (state) => {
        this.customTunnelState = state;
      },
      logger: this.logger,
    });

    try {
      await this.customTunnel.connect();
    } catch (err) {
      // 启动失败不留僵尸：断开（阻止其后台重连计时器）并清空引用，用户可立即重试
      this.customTunnel.disconnect();
      this.customTunnel = null;
      this.customTunnelState = { phase: 'error', detail: err.message };
      throw err;
    }
  }

  async stopCustomTunnel() {
    if (this.customTunnel) {
      this.customTunnel.disconnect();
      this.customTunnel = null;
      this.customTunnelState = { phase: 'idle', detail: '' };
    }
    this.customTunnelConfig = {
      ...(this.customTunnelConfig ?? {}),
      autoStart: false,
    };
    await this.onPersist?.({ customTunnel: this.customTunnelConfig });
  }

  // 仅断开与状态，不动持久化配置（dispose 路径用）
  async _haltCustomTunnel() {
    if (this.customTunnel) {
      this.customTunnel.disconnect();
      this.customTunnel = null;
      this.customTunnelState = { phase: 'idle', detail: '' };
    }
  }

  async startCloudflared({ autoStart = true } = {}) {
    // 活动中的隧道不允许重复开启；error / idle（引用保留但已停止）允许重建。
    if (this.cloudflared && this.isCloudflaredActive()) {
      throw new Error('Cloudflare 隧道已在运行');
    }

    this.cloudflaredConfig = {
      ...(this.cloudflaredConfig ?? {}),
      autoStart: Boolean(autoStart),
    };
    await this.onPersist?.({ cloudflared: this.cloudflaredConfig });

    // 若存在旧 manager（error/自愈中断留的引用），先彻底停止再重建，杜绝双跑
    if (this.cloudflared) {
      this.cloudflared.stop();
      this.cloudflared = null;
    }

    this.cloudflaredState = { phase: 'connecting', detail: '正在初始化...' };
    this.cloudflared = new CloudflaredManager({
      port: this.proxyPort,
      home: this.home,
      token: this.cloudflaredConfig?.token,
      hostname: this.cloudflaredConfig?.hostname,
      // cloudflared 自身的 stdout/stderr 落盘：事故时 journal 里没有任何连接器日志，
      // 导致断连时间点与原因完全无法定位（内含 Token 脱敏与 5MB 轮转）。
      logFilePath: join(this.home ?? join(homedir(), '.dsh-bridge'), CLOUDFLARED_LOG_NAME),
      onStateChange: (state) => {
        this.cloudflaredState = state;
        // 注意：不在 error 时清空 this.cloudflared 引用。
        // manager 在 error/意外退出时会自行退避重试（reconnecting），引用必须保留到
        // 用户显式 stop / dispose——否则自愈后 UI 失去控制句柄（"关闭"杀不掉、
        // "开启"叠新 manager 双跑）。
      },
      logger: this.logger,
    });

    // 非阻塞启动，立即返回——下载/连接进度通过 onStateChange 推送
    this.cloudflared.start();
  }

  // cloudflared 是否处于"活动"（进程存在或有意图运行）状态。
  // 引用保留期间（自愈退避中）引用仍在，但不算 running——UI 据此显示"重连中"而非"运行中"。
  isCloudflaredActive() {
    const phase = this.cloudflaredState?.phase;
    return phase === 'ready' || phase === 'connecting' || phase === 'downloading' || phase === 'reconnecting';
  }

  // 用户显式关闭：停止进程并持久化 autoStart=false（与 UI"关闭"语义一致：关了就不该再自启）。
  // 内部 dispose 请走 _haltCloudflared()，避免误改用户配置。
  async stopCloudflared() {
    if (this.cloudflared) {
      this.cloudflared.stop();
      this.cloudflared = null;
      this.cloudflaredState = { phase: 'idle', detail: '' };
    }
    this.cloudflaredConfig = {
      ...(this.cloudflaredConfig ?? {}),
      autoStart: false,
    };
    await this.onPersist?.({ cloudflared: this.cloudflaredConfig });
  }

  // 仅停止进程与状态，不动持久化配置（插件卸载/重启路径用——用户的 autoStart 意图要保留）
  async _haltCloudflared() {
    if (this.cloudflared) {
      this.cloudflared.stop();
      this.cloudflared = null;
      this.cloudflaredState = { phase: 'idle', detail: '' };
    }
  }

  // 重置 Cloudflare 隧道：关闭隧道 + 删除已下载的 cloudflared 二进制
  async resetCloudflared() {
    await this.stopCloudflared();
    const binDir = join(this.home ?? join(homedir(), '.dsh-bridge'), 'bin');
    const candidates = ['cloudflared.exe', 'cloudflared'];
    for (const name of candidates) {
      const p = join(binDir, name);
      try { await unlink(p); } catch {}
    }
    this.cloudflaredState = { phase: 'idle', detail: '' };
  }

  // 检查 npm 上是否有新版本（优先国内高速镜像 npmmirror，降级 npmjs 官方源）
  // 探测 DSH 宿主 CLI 的安装形态，判断能否通过"npm 全局升级"自动更新。
  // 仅当 dsh 命令 resolve 到当前 node 同 prefix 的 node_modules/@deepseek-ai/dsh（标准 npm 全局安装）
  // 时才允许一键升级；pnpm / 源码 / Electron 加壳等形态无法用 npm -g 升级，仅返回提示。
  // @returns {Promise<{upgradable:boolean, rootGlobal?:string, dshRealPath?:string, reason?:string}>}
  async _probeDshUpgrade() {
    const isWin = process.platform === 'win32';
    const nodeDir = dirname(process.execPath);
    const existingPath = process.env.PATH || process.env.Path || '';
    const extraPaths = isWin ? [nodeDir] : [nodeDir, '/opt/homebrew/bin', '/opt/homebrew/sbin', '/usr/local/bin', '/usr/bin', '/bin', join(homedir(), '.local/bin'), join(homedir(), '.npm-global/bin')];
    const separator = isWin ? ';' : ':';
    const augmentedEnv = { ...process.env, PATH: [...extraPaths, existingPath].filter(Boolean).join(separator) };
    if (isWin) augmentedEnv.Path = augmentedEnv.PATH;

    const runCmd = (cmd, args) => new Promise((resolve) => {
      let cp;
      try {
        cp = spawn(cmd, args, { windowsHide: true, shell: true, env: augmentedEnv, timeout: 8000 });
      } catch {
        return resolve(null);
      }
      let stdout = ''; let stderr = '';
      cp.stdout?.on('data', (d) => { stdout += d.toString(); });
      cp.stderr?.on('data', (d) => { stderr += d.toString(); });
      cp.on('error', () => resolve(null));
      cp.on('close', (code) => {
        if (code === 0 && stdout.trim()) resolve(stdout.trim().split(/\r?\n/)[0]);
        else resolve(null);
      });
    });

    try {
      // 1. 找 dsh bin 的真实路径（Windows which 不存在，用 where）
      const dshBin = await runCmd(isWin ? 'where' : 'which', [isWin ? 'dsh.cmd' : 'dsh']);
      if (!dshBin) {
        return { upgradable: false, reason: '未找到 dsh 命令（可能通过源码/打包方式运行，非 npm 全局安装）' };
      }
      // realpath 在主进程内解析（子进程 node -e + shell 引号嵌套易出错）
      let dshRealPath = dshBin;
      try {
        dshRealPath = realpathSync(dshBin) || dshBin;
      } catch { /* 保留原始路径继续判断 */ }
      // npm root -g 返回的是 prefix 下的 node_modules（如 /prefix/lib/node_modules），
      // 不能直接 dirname 后再作为 --prefix，否则会变成 /prefix/lib，实际安装到
      // /prefix/lib/lib/node_modules，dsh 命令仍会加载旧的 /prefix/lib/node_modules。
      // npm prefix -g 才是可传给 --prefix 的真实全局安装前缀。
      const globalPrefix = await runCmd('npm', ['prefix', '-g']);
      const globalNodeModules = await runCmd('npm', ['root', '-g']);
      const rootGlobal = globalPrefix || (globalNodeModules ? dirname(dirname(globalNodeModules)) : dirname(nodeDir));
      const marker = join('node_modules', '@deepseek-ai', 'dsh');
      if (dshRealPath.includes(marker) && (dshRealPath.startsWith(rootGlobal) || dshRealPath.includes('node-v') && dshRealPath.includes('lib'))) {
        return { upgradable: true, rootGlobal, dshRealPath };
      }
      return {
        upgradable: false,
        // 桌面端 dsh 装在 App 包内：走桌面应用内更新，不要用 npm 动它。
        // 桌面检测是 fail-open 的，判不准时仍是这条通用文案，不影响 Web/CLI 用户。
        reason: isDesktopHost()
          ? '桌面版 DSH 由应用内更新统一管理（一键升级仅支持 npm 全局安装的 CLI 版）；请用桌面应用菜单的"检查更新"升级，勿用 npm 改动应用包内文件'
          : 'dsh 非标准 npm 全局安装（Electron/打包/源码/pnpm 等），无法自动升级；请按官方渠道手动更新',
      };
    } catch {
      return { upgradable: false, reason: '探测 dsh 安装形态失败，请按官方渠道手动更新' };
    }
  }

  async checkVersion() {
    // TTL 缓存：窗口内直接返回上次结果，避免重复请求外网 registry
    if (this._versionCheckCache && Date.now() - this._versionCheckCachedAt < this._versionCheckTtlMs) {
      return this._versionCheckCache;
    }
    const fetchRegistry = (url, timeoutMs = 4000) => new Promise((resolve, reject) => {
      const req = httpsGet(url, { timeout: timeoutMs, headers: { 'User-Agent': 'dsh-bridge' } }, (res) => {
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          try {
            const data = JSON.parse(Buffer.concat(chunks).toString());
            resolve({
              version: data.version ?? null,
              releaseNotes: data.releaseNotes ?? data.description ?? null,
            });
          } catch (e) {
            reject(e);
          }
        });
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('请求超时')); });
    });

    try {
      const latestData = await fetchRegistry('https://registry.npmmirror.com/@wenbin_wb/dsh-bridge/latest', 3500)
        .catch(() => fetchRegistry('https://registry.npmjs.org/@wenbin_wb/dsh-bridge/latest', 5000));
      // DSH 宿主 CLI 最新版本（npm 全局包 @deepseek-ai/dsh；与插件同源镜像，失败不阻断面板）
      const dshLatestData = await fetchRegistry('https://registry.npmmirror.com/@deepseek-ai/dsh/latest', 3500)
        .catch(() => fetchRegistry('https://registry.npmjs.org/@deepseek-ai/dsh/latest', 5000))
        .catch(() => null);
      // 安装形态探测（决定是否给"一键升级 DSH"按钮）：npm 全局可升级，加壳/源码仅提醒
      const dshProbe = await this._probeDshUpgrade();
      const result = {
        current: VERSION,
        latest: latestData?.version ?? null,
        releaseNotes: latestData?.releaseNotes ?? null,
        dshVersion: await this.getDshVersion(),
        dshLatest: dshLatestData?.version ?? null,
        dshUpgradable: dshProbe.upgradable,
        dshUpgradeReason: dshProbe.reason || '',
      };
      this._versionCheckCache = result;
      this._versionCheckCachedAt = Date.now();
      return result;
    } catch (e) {
      // 失败不缓存（让下次调用可重试），但记录便于诊断
      return { current: VERSION, latest: null, error: e.message ?? '检查失败', dshVersion: await this.getDshVersion(), dshLatest: null, dshUpgradable: false, dshUpgradeReason: '' };
    }
  }

  // 一键直接升级插件（执行 dsh / npx / npm 自动升级，使用安全的参数数组彻底杜绝 shell 注入）
  // opts.profile 供测试注入；默认按当前宿主推导（桌面端为 `desktop`，其余为 `web`），
  // 绝不能写死 --profile web——桌面端会把包装进宿主不加载的 profile，造成"显示成功实际没升"。
  async upgradePlugin({ version, spawnImpl = spawn, profile } = {}) {
    const targetVersion = version ? String(version).trim() : 'latest';
    // 严格 SemVer 白名单正则校验
    if (!/^(latest|\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?)$/.test(targetVersion)) {
      return { ok: false, error: `非法的版本号格式: ${targetVersion}`, version: targetVersion };
    }
    const pkgSpec = `@wenbin_wb/dsh-bridge@${targetVersion}`;
    const isWin = process.platform === 'win32';

    // 自动构建包含 Homebrew / NVM / Node 兄弟目录的全量 PATH 环境变量
    const nodeDir = dirname(process.execPath);
    const home = homedir();
    const extraPaths = isWin ? [
      nodeDir,
    ] : [
      nodeDir,
      '/opt/homebrew/bin',
      '/opt/homebrew/sbin',
      '/usr/local/bin',
      '/usr/bin',
      '/bin',
      join(home, '.nvm/current/bin'),
      join(home, '.fnm/current/bin'),
      join(home, '.local/bin'),
      join(home, '.cargo/bin'),
    ];

    const separator = isWin ? ';' : ':';
    const existingPath = process.env.PATH || process.env.Path || '';
    const augmentedEnv = {
      ...process.env,
      PATH: [...extraPaths, existingPath].filter(Boolean).join(separator),
    };
    if (isWin) augmentedEnv.Path = augmentedEnv.PATH;

    // 寻找与当前 node 配对的 npm/npx 绝对路径
    const siblingNpm = join(nodeDir, isWin ? 'npm.cmd' : 'npm');
    const siblingNpx = join(nodeDir, isWin ? 'npx.cmd' : 'npx');

    // 目标 profile：显式传入优先，否则按宿主形态推导（桌面端 `desktop`，其余 `web`）。
    // 桌面端 profile 名固定，见官方 desktop-host（runProfile profile: 'desktop'）。
    // 安全：payload 里的 profile 不可信，白名单只认 desktop/web，其余一律按推导值处理，
    // 避免未校验字符串进入 shell:true 的 spawn 参数（参数拼接有注入风险）。
    const targetProfile = (profile === 'desktop' || profile === 'web') ? profile : currentProfileName();

    const tasks = [
      { cmd: 'dsh', args: ['plugin', '--profile', targetProfile, 'add', pkgSpec] },
      { cmd: existsSync(siblingNpx) ? siblingNpx : 'npx', args: ['--yes', '@deepseek-ai/dsh', 'plugin', '--profile', targetProfile, 'add', pkgSpec] },
      { cmd: existsSync(siblingNpm) ? siblingNpm : 'npm', args: ['install', pkgSpec] },
    ];

    let lastError = null;

    for (const task of tasks) {
      try {
        const res = await new Promise((resolve, reject) => {
          let cp;
          try {
            cp = spawnImpl(task.cmd, task.args, {
              windowsHide: true,
              shell: true,
              env: augmentedEnv,
              timeout: 120000,
            });
          } catch (spawnErr) {
            return reject(spawnErr);
          }
          let stdout = '';
          let stderr = '';
          cp.stdout?.on('data', (d) => { stdout += d.toString(); });
          cp.stderr?.on('data', (d) => { stderr += d.toString(); });
          cp.on('error', (err) => {
            reject(err);
          });
          cp.on('close', (code) => {
            if (code === 0) {
              resolve({ stdout, stderr });
            } else {
              reject(new Error(stderr || stdout || `进程退出码 ${code}`));
            }
          });
        });

        const output = res.stdout || res.stderr || '升级成功';
        return { ok: true, command: `${task.cmd} ${task.args.join(' ')}`, output, version: targetVersion };
      } catch (err) {
        lastError = err;
      }
    }

    return { ok: false, error: lastError?.message ?? '升级命令执行失败', version: targetVersion };
  }

  // 一键升级 DSH 宿主 CLI（npm 全局包 @deepseek-ai/dsh）。
  // 升级的是"与当前 node 配对"的全局 prefix（dsh 命令所在目录），完成后需重启 DSH 生效。
  // opts.spawnImpl 供测试注入，生产环境用 node:child_process 的 spawn。
  async upgradeDsh({ version, spawnImpl = spawn } = {}) {
    const targetVersion = version ? String(version).trim() : 'latest';
    // 严格 SemVer 白名单校验（dsh 用 rc 版本号，如 0.1.2-rc.1）
    if (!/^(latest|\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?)$/.test(targetVersion)) {
      return { ok: false, error: `非法的版本号格式: ${targetVersion}`, version: targetVersion };
    }

    // 安装形态守卫：非标准 npm 全局安装（Electron/源码/pnpm 等）拒绝自动升级，
    // 避免"装一份不生效的新副本、误导用户以为升级成功"
    const probe = await this._probeDshUpgrade();
    if (!probe.upgradable) {
      return {
        ok: false,
        error: probe.reason || '当前 DSH 为非 npm 全局安装，无法自动升级；请按官方渠道手动更新',
        version: targetVersion,
      };
    }

    const pkgSpec = `@deepseek-ai/dsh@${targetVersion}`;
    const isWin = process.platform === 'win32';
    const nodeDir = dirname(process.execPath);
    const home = homedir();
    const extraPaths = isWin ? [nodeDir] : [
      nodeDir,
      '/opt/homebrew/bin',
      '/opt/homebrew/sbin',
      '/usr/local/bin',
      '/usr/bin',
      '/bin',
      join(home, '.nvm/current/bin'),
      join(home, '.fnm/current/bin'),
      join(home, '.local/bin'),
      join(home, '.cargo/bin'),
    ];
    const separator = isWin ? ';' : ':';
    const existingPath = process.env.PATH || process.env.Path || '';
    const augmentedEnv = {
      ...process.env,
      PATH: [...extraPaths, existingPath].filter(Boolean).join(separator),
    };
    if (isWin) augmentedEnv.Path = augmentedEnv.PATH;

    // 与当前 node 配对的 npm 绝对路径（保证装进 dsh 所在 prefix，而非 PATH 里其它 npm）
    const siblingNpm = join(nodeDir, isWin ? 'npm.cmd' : 'npm');
    const npmBin = existsSync(siblingNpm) ? siblingNpm : 'npm';
    // 优先用探测到的全局 root（dsh 实际所在 prefix），其次 nodeDir 父目录
    const globalRoot = probe.rootGlobal || dirname(nodeDir);

    const tasks = [
      { cmd: npmBin, args: ['install', '-g', '--prefix', globalRoot, pkgSpec] },
      { cmd: npmBin, args: ['install', '-g', pkgSpec] },
    ];

    let lastError = null;
    for (const task of tasks) {
      try {
        const res = await new Promise((resolve, reject) => {
          let cp;
          try {
            cp = spawnImpl(task.cmd, task.args, {
              windowsHide: true,
              shell: true,
              env: augmentedEnv,
              timeout: 180000,
            });
          } catch (spawnErr) {
            return reject(spawnErr);
          }
          let stdout = '';
          let stderr = '';
          cp.stdout?.on('data', (d) => { stdout += d.toString(); });
          cp.stderr?.on('data', (d) => { stderr += d.toString(); });
          cp.on('error', reject);
          cp.on('close', (code) => {
            if (code === 0) resolve({ stdout, stderr });
            else reject(new Error(stderr || stdout || `进程退出码 ${code}`));
          });
        });
        const output = (res.stdout || res.stderr || '升级成功').trim().slice(-500);
        this.logger?.info('dsh-bridge: DSH 升级命令成功: %s %s', task.cmd, task.args.join(' '));
        
        // 升级成功后清理版本缓存，让 getDshVersion/checkVersion 下次重新探测
        this._dshVersion = null;
        this._dshVersionLoaded = false;
        this._versionCheckCache = null;
        
        // 核验实际 dsh 版本：npm 命令成功不等于正在使用的 dsh 已经变新。
        // 如果探测到的版本号仍然是旧版（或探测失败），则安装可能装到了错误位置。
        const actualVersion = await this.getDshVersion();
        if (actualVersion && targetVersion !== 'latest') {
          // 用户指定了具体版本号（如 0.2.0-rc.2）：安装后 dsh --version 必须精确匹配
          if (actualVersion !== targetVersion) {
            return {
              ok: false,
              error: `npm 安装成功但 dsh 命令实际版本仍为 ${actualVersion}（预期 ${targetVersion}）。可能安装到了错误位置，请手动执行 \`npm install -g @deepseek-ai/dsh@${targetVersion}\` 并重启 DSH。`,
              version: targetVersion,
              installedButNotActive: true,
            };
          }
        }
        
        return { ok: true, command: `${task.cmd} ${task.args.join(' ')}`, output, version: targetVersion };
      } catch (err) {
        lastError = err;
      }
    }
    return { ok: false, error: lastError?.message ?? '升级命令执行失败', version: targetVersion };
  }

  // 优雅重启 DSH 服务。
  //
  // 关键教训（真实事故）：DSH 常以 systemd 用户单元（如 dsh-web.service，Restart=on-failure）托管，
  // 而"自己派生一个子进程再 process.exit(0)"在这种环境下必然失败：
  //   - 干净退出（code 0）不满足 Restart=on-failure，systemd 不会拉起；
  //   - 默认 KillMode=control-group，主进程退出时 systemd 会把 cgroup 里刚派生的子进程一起杀掉。
  //   结果就是"点了重启，dsh 再也没起来"，而且没有任何日志（旧实现 stdio: 'ignore'）。
  // 因此这里先识别托管方式：
  // 探测「重启会打断哪些正在跑的任务」。
  //
  // 判据（均为可从宿主运行时直接读到的信号，不依赖任何新增宿主 API）：
  //   1. 主会话进行中的 turn：事件流里存在未配对的 turn/start（无对应 turn/end）。
  //      这是 Web/IM 两端「正在思考/工具调用中」的同一依据
  //      （见 lib/platform/conversation-bridge.js 的 digestLine）。
  //   2. 子代理/agent 会话：会话 header.origin === 'subagent'，同样按未闭合 turn 判断在跑。
  //      嵌套委托最容易被遗忘，重启损失也最大。
  //   3. 待审批请求：各 IM 平台 bridge 的 pending（用户尚未在机器人里点「同意/拒绝」）。
  //      宿主 ctx.approval 只提供 request()，无查询 API，故以插件自身登记的 pending 为准。
  //
  // 任何一步探测失败都必须降级为「该项无任务」并继续，绝不因此阻断重启：
  // 重启是救急能力，不能被探测逻辑锁死。
  getActiveWork() {
    const work = { sessions: [], subagentSessions: [], pendingApprovals: [], total: 0 };

    // 1 + 2：遍历 live 会话，按未闭合 turn 判断是否在跑
    try {
      const list = this.runtimeCtx?.sessions?.list?.() ?? [];
      for (const s of list) {
        if (!s || !s.id) continue;
        const isSubagent = s.origin === 'subagent' || s.header?.origin === 'subagent';
        const turn = describeOpenTurn(s.events);
        if (!turn) continue;
        const entry = {
          id: s.id,
          title: s.title || (s.header?.cwd ? basename(s.header.cwd) : '') || '未命名会话',
          turn: turn.turn,
          tools: turn.tools,
          lastTool: turn.lastTool,
        };
        if (isSubagent) work.subagentSessions.push(entry);
        else work.sessions.push(entry);
      }
    } catch (err) {
      this.logger?.debug?.('dsh-bridge: 探测进行中会话失败（视为无任务）：%s', err?.message ?? err);
    }

    // 3：各 IM 平台的待审批请求
    try {
      for (const platform of this.platformManager?.list?.() ?? []) {
        const pending = platform?.bridge?.pending;
        if (!pending || typeof pending.forEach !== 'function') continue;
        pending.forEach((entry, number) => {
          work.pendingApprovals.push({
            platform: platform?.id ?? 'unknown',
            number,
            summary: entry?.summary || entry?.title || entry?.tool || '待审批请求',
          });
        });
      }
    } catch (err) {
      this.logger?.debug?.('dsh-bridge: 探测待审批请求失败（视为无））：%s', err?.message ?? err);
    }

    work.total = work.sessions.length + work.subagentSessions.length + work.pendingApprovals.length;
    return work;
  }

  //   - systemd（从 /proc/self/cgroup 取单元名）→ 交给 `systemctl [--user] restart --no-block <unit>`，
  //     由 systemd 负责 stop+start，新进程仍在正确的 cgroup 里；
  //   - DSH_DAEMON / PM2 → 直接退出，交给守护进程拉起；
  //   - 无托管器 → 派生独立助手（lib/restart-helper.mjs），等旧进程退出 + 端口释放后才拉起新进程，
  //     并把全过程写入 ~/.dsh/dsh-bridge/restart.log（失败不再无声）。
  // opts 仅供单测注入（spawnImpl / readCgroup / env / scheduleExit）。
  async restartDsh(opts = {}) {
    // 桌面端拦截（P0）：桌面宿主由 Electron 壳经 IPC 管理生死，插件绝不能自行
    // 派生 helper 重拉进程——那会产生壳外孤儿（抢占 19387 端口、触发壳的恢复
    // 对话框）。直接拒绝，并指引用户走应用菜单重启。
    // isDesktopHost 是 fail-open 的：判不准时按 Web/CLI 版走，不拦正常用户。
    if (isDesktopHost({ versions: opts.processVersions, argv1: opts.argv1 })) {
      return {
        ok: false,
        error: '当前运行在 DSH 桌面版内，宿主由应用统一管理，插件不能自行重启。请用桌面应用菜单的重启/退出重进（有关闭确认保护正在跑的任务），不要用面板重启。',
        desktopManaged: true,
      };
    }
    const env = opts.env ?? process.env;
    const spawnImpl = opts.spawnImpl ?? spawn;
    const readCgroup = opts.readCgroup
      ?? (() => { try { return readFileSync('/proc/self/cgroup', 'utf8'); } catch { return ''; } });
    const cgroup = opts.cgroup ?? readCgroup();
    const scheduleExit = opts.scheduleExit ?? ((ms) => setTimeout(() => process.exit(0), ms));

    const dshHome = env.DSH_HOME ?? join(homedir(), '.dsh');
    const logFile = join(dshHome, 'dsh-bridge', 'restart.log');
    const childLog = join(dshHome, 'dsh-bridge', 'restart-child.log');
    try { mkdirSync(dirname(logFile), { recursive: true }); } catch { /* 日志目录不可写时忽略 */ }
    const writeLog = (message) => {
      try { appendFileSync(logFile, `[${new Date().toISOString()}] ${message}\n`); } catch { /* 日志不可写时忽略 */ }
    };

    const plan = detectSupervisor({ env, cgroup });
    writeLog(`重启请求：plan=${plan.kind}${plan.unit ? ` unit=${plan.unit}(${plan.scope})` : ''}（${plan.reason}）pid=${process.pid} cwd=${process.cwd()} argv=${JSON.stringify(process.argv.slice(1))}`);
    this.logger?.info('收到 DSH 重启请求（%s）', plan.kind === 'systemd' ? `systemd:${plan.unit}` : plan.kind);

    if (plan.kind === 'systemd') {
      const args = [...(plan.scope === 'user' ? ['--user'] : []), 'restart', '--no-block', plan.unit];
      const systemctlEnv = { ...env };
      if (process.platform === 'linux') {
        const defaultPaths = ['/usr/local/bin', '/usr/bin', '/bin', '/usr/local/sbin', '/usr/sbin', '/sbin'];
        const existingPath = systemctlEnv.PATH || '';
        const missingPaths = defaultPaths.filter((p) => !existingPath.split(':').includes(p));
        if (missingPaths.length > 0) {
          systemctlEnv.PATH = existingPath ? `${existingPath}:${missingPaths.join(':')}` : missingPaths.join(':');
        }
        if (plan.scope === 'user' && !systemctlEnv.XDG_RUNTIME_DIR && typeof process.getuid === 'function') {
          systemctlEnv.XDG_RUNTIME_DIR = `/run/user/${process.getuid()}`;
        }
      }
      // 关键：必须以 **systemctl 的退出码** 判定成败，而不是"派生成功"。
      // `--no-block` 下 systemctl 只发请求就返回（实测往返 ~6ms），但单元名不存在会 rc=5、
      // 权限不足会 rc=1；旧写法只看 'spawn' 事件 → 必然失败也返回 ok:true 再 exit(0)，
      // 而干净退出不满足 Restart=on-failure → DSH 直接下线且不自动拉起。
      const outcome = await new Promise((resolve) => {
        let settled = false;
        const timer = setTimeout(() => settle({ error: new Error('systemctl 执行超时（5s）') }), 5000);
        const settle = (value) => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            resolve(value);
          }
        };
        try {
          const child = spawnImpl('systemctl', args, { detached: true, stdio: 'ignore', env: systemctlEnv });
          child.once?.('error', (err) => settle({ error: err }));
          child.once?.('close', (code) => settle({ code }));
        } catch (err) {
          settle({ error: err });
        }
      });

      if (!outcome.error && (outcome.code === 0 || outcome.code === null || outcome.code === undefined)) {
        writeLog(`已请求 systemd 重启（systemctl 退出码 ${outcome.code ?? 'n/a'}）：systemctl ${args.join(' ')}`);
        scheduleExit(1500);
        const scopeText = plan.scope === 'user' ? '用户会话' : '系统';
        return { ok: true, message: `已请求 systemd 重启 ${plan.unit}（${scopeText}），由 systemd 负责停止与拉起…` };
      }

      // 失败时**不退化为自派生**：systemd 下主进程干净退出既不会被拉起，
      // 默认 KillMode=control-group 还会把 detached 助手一起杀掉 —— 那等于"报着重启却永久下线"。
      // 因此保持现状（DSH 继续运行）并如实报错，由用户手动处理。
      const reason = outcome.error ? outcome.error.message : `systemctl 退出码 ${outcome.code}`;
      writeLog(`systemctl 重启失败（${reason}），为不让 DSH 掉线未做任何退出`);
      return {
        ok: false,
        error: `systemctl ${args.join(' ')} 失败：${reason}。DSH 仍在运行；请手动执行「systemctl ${plan.scope === 'user' ? '--user ' : ''}restart ${plan.unit}」或检查单元。`,
      };
    } else if (plan.kind === 'daemon') {
      writeLog(`交由守护进程拉起（${plan.reason}）`);
      scheduleExit(600);
      return { ok: true, message: `DSH 正在重启（由 ${plan.reason} 守护进程拉起）…` };
    }

    // 无托管器（或 systemd 调用失败）→ 独立助手：等旧进程退出、端口释放后再拉起新进程，全程留日志
    const helper = join(dirname(fileURLToPath(import.meta.url)), 'restart-helper.mjs');
    const payload = JSON.stringify({
      pid: process.pid,
      port: this.dshPort ?? 3080,
      argv: process.argv.slice(1),
      cwd: process.cwd(),
      execPath: process.execPath,
      logFile,
      childLog,
    });
    // spawn 的失败是异步事件（'error'），只 try/catch 抓不到——必须挂监听，否则会变成未捕获异常
    const helperError = await new Promise((resolve) => {
      let settled = false;
      const settle = (value) => { if (!settled) { settled = true; resolve(value); } };
      try {
        const child = spawnImpl(process.execPath, [helper, payload], {
          cwd: process.cwd(),
          env,
          detached: true,
          stdio: 'ignore',
        });
        child.once?.('error', (err) => settle(err));
        child.once?.('spawn', () => { writeLog(`已派生重启助手：helperPid=${child.pid ?? '(未知)'}，日志：${logFile}`); settle(null); });
        child.unref?.();
      } catch (err) {
        settle(err);
      }
    });

    if (helperError) {
      writeLog(`派生重启助手失败：${helperError.message}`);
      return { ok: false, error: `重启失败：${helperError.message}（DSH 仍在运行，未做任何退出）` };
    }
    scheduleExit(600);
    return { ok: true, message: '正在重启：独立助手会在旧进程退出、端口释放后拉起新的 DSH（若失败会记录在 ~/.dsh/dsh-bridge/restart.log）…' };
  }

  getSystemMetrics() {
    try {
      const totalMem = totalmem();
      const freeMem = freemem();
      const usedMem = totalMem - freeMem;
      const memUsage = process.memoryUsage();
      const cpusList = cpus() || [];
      const cpuCount = cpusList.length;
      const cpuModel = cpusList[0]?.model || 'Generic CPU';

      return {
        os: {
          platform: platform(),
          arch: arch(),
          release: release(),
          hostname: hostname(),
          nodeVersion: process.version,
        },
        uptime: {
          processSec: Math.floor(process.uptime()),
          systemSec: Math.floor(uptime()),
        },
        cpu: {
          model: cpuModel,
          cores: cpuCount,
          loadAvg: typeof loadavg === 'function' ? loadavg() : [0, 0, 0],
        },
        memory: {
          totalBytes: totalMem,
          freeBytes: freeMem,
          usedBytes: usedMem,
          usedPercent: Math.round((usedMem / totalMem) * 100),
          processHeapUsed: memUsage.heapUsed,
          processRss: memUsage.rss,
        },
      };
    } catch {
      return null;
    }
  }

  // 获取当前所有已注册的工作区
  async getWorkspaces() {
    try {
      const list = await this.ctx?.workspaceRegistry?.list?.() ?? [];
      const out = [];
      for (const ws of list) {
        if (ws && ws.path) {
          out.push({
            id: ws.id,
            title: ws.title ?? basename(ws.path),
            path: ws.path,
          });
        }
      }
      return out.sort((a, b) => String(a.path).localeCompare(String(b.path)));
    } catch {
      return [];
    }
  }

  // 远程添加工作区目录到 DSH 体系
  async addWorkspace(workspacePath) {
    if (!workspacePath || typeof workspacePath !== 'string') {
      return { ok: false, error: '缺少工作区目录路径' };
    }
    const safetyCheck = await isSafeWorkspacePath(workspacePath);
    if (!safetyCheck.valid) {
      return { ok: false, error: safetyCheck.error || '路径安全校验未通过' };
    }
    const resolved = safetyCheck.path;

    const title = basename(resolved) || resolved;
    let added = false;
    let workspaceId = null;

    if (this.ctx?.workspaceRegistry) {
      if (typeof this.ctx.workspaceRegistry.create === 'function') {
        try {
          const entity = await this.ctx.workspaceRegistry.create(resolved, title);
          added = true;
          workspaceId = entity?.id ?? null;
        } catch (e) {
          this.logger?.warn?.('workspaceRegistry.create 失败: %s', e.message);
        }
      } else if (typeof this.ctx.workspaceRegistry.add === 'function') {
        try {
          const res = await this.ctx.workspaceRegistry.add({ path: resolved, title });
          added = true;
          workspaceId = res?.id ?? null;
        } catch (e) {
          this.logger?.warn?.('workspaceRegistry.add 失败: %s', e.message);
        }
      } else if (typeof this.ctx.workspaceRegistry.register === 'function') {
        try {
          const res = await this.ctx.workspaceRegistry.register({ path: resolved, title });
          added = true;
          workspaceId = res?.id ?? null;
        } catch (e) {
          this.logger?.warn?.('workspaceRegistry.register 失败: %s', e.message);
        }
      }
    }

    const list = await this.getWorkspaces();
    if (!workspaceId) {
      const match = list.find(w => w.path === resolved || (w.path && w.path.toLowerCase() === resolved.toLowerCase()));
      if (match) workspaceId = match.id;
    }

    let sessionId = null;
    if (this.ctx?.sessions && typeof this.ctx.sessions.create === 'function') {
      try {
        const session = this.ctx.sessions.create(undefined, { meta: { cwd: resolved } });
        if (session?.id) {
          sessionId = session.id;
          if (workspaceId && this.ctx?.workspaceRegistry?.get) {
            const entity = this.ctx.workspaceRegistry.get(workspaceId);
            if (entity && typeof entity.attachSession === 'function') {
              await entity.attachSession(session.id).catch(() => {});
            }
          }
        }
      } catch (e) {
        this.logger?.debug?.('sessions.create 初始化 session 提示: %s', e.message);
      }
    }

    return {
      ok: true,
      path: resolved,
      title,
      workspaceId,
      sessionId,
      workspaces: list,
      registered: added
    };
  }

  // 远程目录列表浏览与常用路径推荐
  async listRemoteDirectories(targetPath) {
    const isWin = process.platform === 'win32';
    const home = homedir();

    // 1. 获取快速访问常用根目录
    const roots = [
      { name: '🏠 用户主目录', path: home },
    ];
    const commonSubdirs = [
      { name: '💻 桌面', sub: 'Desktop' },
      { name: '📁 文档', sub: 'Documents' },
      { name: '📥 下载', sub: 'Downloads' },
      { name: '💡 IdeaProjects', sub: 'IdeaProjects' },
      { name: '🔨 Projects', sub: 'Projects' },
      { name: '📦 workspace', sub: 'workspace' },
      { name: '💻 code', sub: 'code' },
      { name: '💻 src', sub: 'src' },
    ];
    for (const item of commonSubdirs) {
      const fullPath = join(home, item.sub);
      try {
        const s = await stat(fullPath);
        if (s.isDirectory()) {
          roots.push({ name: item.name, path: fullPath });
        }
      } catch {}
    }

    // 2. Windows 盘符探测
    const drives = [];
    if (isWin) {
      const letters = 'CDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
      for (const letter of letters) {
        const driveRoot = `${letter}:\\`;
        try {
          await access(driveRoot);
          drives.push({ name: `${letter}: 盘`, path: driveRoot });
        } catch {}
      }
      if (drives.length === 0) drives.push({ name: 'C: 盘', path: 'C:\\' });
    } else {
      drives.push({ name: '根目录 /', path: '/' });
    }

    // 3. 解析当前请求路径并进行安全校验
    let rawTarget = targetPath && typeof targetPath === 'string' ? targetPath.trim() : '';
    if (isWin && /^[A-Za-z]:$/.test(rawTarget)) {
      rawTarget = `${rawTarget}\\`;
    }
    let candidatePath = rawTarget ? resolve(rawTarget) : home;
    
    // 安全校验：遇非法或黑名单目录时安全回退至用户主目录
    let currentPath = home;
    const pathCheck = await isSafeWorkspacePath(candidatePath);
    if (pathCheck.valid && pathCheck.path) {
      currentPath = pathCheck.path;
    }

    // 4. 读取子文件夹列表（过滤敏感目录与不安全软链接）
    const entries = [];
    let readError = null;
    try {
      const dirents = await readdir(currentPath, { withFileTypes: true });
      for (const d of dirents) {
        if (isSensitiveFolderName(d.name)) continue;

        let isDir = d.isDirectory();
        const targetEntryPath = join(currentPath, d.name);

        // 如果是符号链接，安全探测其真实目标
        if (d.isSymbolicLink()) {
          try {
            const symCheck = await isSafeWorkspacePath(targetEntryPath);
            if (!symCheck.valid) continue;
            isDir = true;
          } catch {
            continue;
          }
        }

        if (isDir) {
          entries.push({
            name: d.name,
            path: targetEntryPath,
            isDirectory: true,
          });
        }
      }
    } catch (err) {
      readError = err.message;
    }

    entries.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

    const parentPath = dirname(currentPath) !== currentPath ? dirname(currentPath) : null;

    // 5. 生成结构化面包屑导航路径
    const breadcrumbs = [];
    if (isWin) {
      const match = currentPath.match(/^([A-Za-z]:)(?:\\(.*))?$/);
      if (match) {
        const driveLetter = match[1];
        const rest = match[2] || '';
        breadcrumbs.push({ name: `${driveLetter}`, path: `${driveLetter}\\` });
        if (rest) {
          const parts = rest.split('\\').filter(Boolean);
          let curr = `${driveLetter}\\`;
          for (const p of parts) {
            curr = join(curr, p);
            breadcrumbs.push({ name: p, path: curr });
          }
        }
      } else {
        breadcrumbs.push({ name: currentPath, path: currentPath });
      }
    } else {
      breadcrumbs.push({ name: '根目录 /', path: '/' });
      const parts = currentPath.split('/').filter(Boolean);
      let curr = '/';
      for (const p of parts) {
        curr = join(curr, p);
        breadcrumbs.push({ name: p, path: curr });
      }
    }

    // 6. 获取当前已注册的工作区作为快捷参考
    const currentWorkspaces = await this.getWorkspaces();

    return {
      ok: !readError,
      error: readError ? `读取文件夹失败: ${readError}` : undefined,
      currentPath,
      parentPath,
      breadcrumbs,
      entries: entries.slice(0, 150),
      totalEntries: entries.length,
      roots,
      drives,
      workspaces: currentWorkspaces,
    };
  }

  async diagnoseNetwork() {
    const results = [];

    // 1. 本地代理端口检测
    results.push({
      item: 'local_proxy',
      name: `本地反向代理端口 (${this.proxyPort})`,
      status: this.proxy ? 'pass' : 'fail',
      detail: this.proxy ? `正常运行中 (代理目标端口: ${this.dshPort})` : '代理未启动',
    });

    // 2. 局域网网卡检测
    const lanIp = selectLanIPv4();
    results.push({
      item: 'lan_interface',
      name: '局域网 IP 分配与可用性',
      status: lanIp ? 'pass' : 'warn',
      detail: lanIp ? `检测到有效局域网 IPv4: ${lanIp}` : '未检测到活跃局域网 IPv4 地址 (可能未连接 Wi-Fi/以太网)',
    });

    // 3. Cloudflare 边缘连通性测试
    const cfStart = Date.now();
    try {
      await new Promise((resolve, reject) => {
        const req = httpsGet('https://1.1.1.1', { timeout: 3500 }, (res) => {
          res.resume();
          resolve();
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('连接超时 (3.5s)')); });
      });
      const cfLatency = Date.now() - cfStart;
      results.push({
        item: 'cloudflare_edge',
        name: 'Cloudflare Anycast 边缘网络',
        status: 'pass',
        latencyMs: cfLatency,
        detail: `连接畅通 (延迟 ${cfLatency}ms)`,
      });
    } catch (err) {
      results.push({
        item: 'cloudflare_edge',
        name: 'Cloudflare Anycast 边缘网络',
        status: 'warn',
        detail: `连接异常: ${err.message} (临时公网隧道可能受阻)`,
      });
    }

    // 4. 国内 npm 高速镜像源 (npmmirror)
    const npmStart = Date.now();
    try {
      await new Promise((resolve, reject) => {
        const req = httpsGet('https://registry.npmmirror.com', { timeout: 3500 }, (res) => {
          res.resume();
          resolve();
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('连接超时 (3.5s)')); });
      });
      const npmLatency = Date.now() - npmStart;
      results.push({
        item: 'npmmirror',
        name: '国内 npm 高速镜像源 (npmmirror)',
        status: 'pass',
        latencyMs: npmLatency,
        detail: `连接畅通 (延迟 ${npmLatency}ms)`,
      });
    } catch (err) {
      results.push({
        item: 'npmmirror',
        name: '国内 npm 高速镜像源 (npmmirror)',
        status: 'warn',
        detail: `连接超时或异常: ${err.message}`,
      });
    }

    // 5. 自建隧道部署服务器连通性检测
    const customServerUrl = this.customTunnelConfig?.serverUrl?.trim();
    if (customServerUrl) {
      const isRunning = Boolean(this.customTunnel?.connected);
      const ctStart = Date.now();
      try {
        const parsedUrl = new URL(customServerUrl);
        const isSecure = parsedUrl.protocol === 'https:' || parsedUrl.protocol === 'wss:';
        const getter = isSecure ? httpsGet : httpGet;
        const probeUrl = new URL(customServerUrl);
        probeUrl.protocol = isSecure ? 'https:' : 'http:';

        await new Promise((resolve, reject) => {
          const req = getter(probeUrl.toString(), { timeout: 4000 }, (res) => {
            res.resume();
            resolve();
          });
          req.on('error', reject);
          req.on('timeout', () => { req.destroy(); reject(new Error('连接超时 (4.0s)')); });
        });
        const ctLatency = Date.now() - ctStart;
        results.push({
          item: 'custom_tunnel_server',
          name: `自建隧道部署服务器 (${parsedUrl.hostname}${parsedUrl.port ? `:${parsedUrl.port}` : ''})`,
          status: 'pass',
          latencyMs: ctLatency,
          detail: `服务器连通良好 (延迟 ${ctLatency}ms · 状态: ${isRunning ? '客户端在线运行中' : '待连接/就绪'})`,
        });
      } catch (err) {
        if (isRunning) {
          results.push({
            item: 'custom_tunnel_server',
            name: `自建隧道部署服务器 (${customServerUrl})`,
            status: 'pass',
            detail: '客户端在线运行中 (WebSocket 通道已建立)',
          });
        } else {
          results.push({
            item: 'custom_tunnel_server',
            name: `自建隧道部署服务器 (${customServerUrl})`,
            status: 'warn',
            detail: `无法连通自建服务器: ${err.message}`,
          });
        }
      }
    } else {
      results.push({
        item: 'custom_tunnel_server',
        name: '自建隧道部署服务器',
        status: 'pass',
        detail: '未配置自建服务器（若已部署自建隧道可在「公网隧道」中配置）',
      });
    }

    const allPassed = results.every(r => r.status === 'pass');
    return {
      ok: true,
      timestamp: new Date().toISOString(),
      overall: allPassed ? 'healthy' : 'warning',
      results,
    };
  }

  async dispose() {
    await this._haltCustomTunnel();
    // 只停进程与状态，不改持久化：插件卸载/重载不应悄悄抹掉用户的 autoStart 意图
    await this._haltCloudflared();
    if (this.proxy) {
      await this.proxy.stop();
      this.proxy = null;
    }
    this.qrCache.clear();
  }
}

/**
 * 插件入口
 */
/**
 * 同步读取用户页面改写偏好（设置面板可见开关）。文件缺失/损坏一律默认开启。
 * @param {string} configFile config.json 绝对路径
 * @returns {boolean}
 */
export function readUiPageTweaksPref(configFile) {
  try {
    const stored = JSON.parse(readFileSync(configFile, 'utf8'));
    if (stored?.ui && typeof stored.ui.pageTweaks === 'boolean') return stored.ui.pageTweaks;
  } catch {}
  return true;
}

/**
 * 解析移动端页面改写层总开关（issue #56 §4 包级别 opt-in）。
 * 关闭条件（任一命中即关）：宿主插件配置 `mobileUi: false`，或环境变量
 * `DSH_BRIDGE_MOBILE_UI=0/false/off/no`。默认开启，不影响远程访问/隧道/IM。
 * @param {object} [pluginConfig] 宿主传给 apply 的插件配置
 * @returns {boolean} true=启用页面改写层，false=整层跳过
 */
export function resolveMobileUiEnabled(pluginConfig = {}) {
  const offValues = new Set(['0', 'false', 'off', 'no', 'disable', 'disabled']);
  const isOff = (v) => v === false || (typeof v === 'string' && offValues.has(v.trim().toLowerCase()));
  if (isOff(pluginConfig?.mobileUi)) return false;
  try {
    if (isOff(process.env.DSH_BRIDGE_MOBILE_UI)) return false;
  } catch {}
  return true;
}

// 服务端 mobileUi 关闭时向被代理页面注入的配置合并脚本（去重键）：让客户端总开关
// 在 apply() 之前即可见。注意：仅经桥接代理的页面生效；桌面宿主请自行声明
// window.__DSH_BRIDGE_CONFIG__（见 mobile-yield.js 注释与 #56）。
const BRIDGE_CLIENT_CONFIG_MARK = 'data-dsh-bridge-config="1"';
const BRIDGE_CLIENT_CONFIG_OFF_HTML = `<script ${BRIDGE_CLIENT_CONFIG_MARK}>try{window.__DSH_BRIDGE_CONFIG__=Object.assign({},window.__DSH_BRIDGE_CONFIG__,{disablePageTweaks:true,mobileUi:false});}catch(e){}</script>`;

function apply(ctx, config = {}) {
  const logger = ctx.logger(name);
  const dshPort = ctx.webServer?.port ?? config.targetPort ?? 3080;

  // 低版本 Node（<20.3）缺少 AbortSignal.any，DSH 核心链路（dsh-timeout ← dsh-llm）
  // 每次 agent 请求都会调用它——缺失时通过桥接发送消息直接报 "(internal)"。
  // 插件加载即安装兼容垫片，并在缺失时告警引导升级。
  if (installAbortSignalCompat()) {
    logger.warn('dsh-bridge: 当前 Node %s 缺少 AbortSignal.any/timeout，已安装兼容垫片。建议升级 Node 至 22.19+ 或 24+（见 package.json engines）。', process.version);
  }

  if (!dshPort) {
    logger.error('webServer port unavailable');
    return;
  }

  const proxyPort = config.port ?? 3082;
  const dshHome = process.env.DSH_HOME ?? join(homedir(), '.dsh');
  const configFile = join(dshHome, 'dsh-bridge', 'config.json');
  const emergencyResetFile = join(dshHome, 'dsh-bridge', 'reset-auth');

  // 包级别 opt-in（issue #56 §4）：宿主在加载阶段决定不要移动页面改写层。
  // 注意：必须放在 configFile 定义之后（TDZ：提前引用会抛 ReferenceError，见 #55/#56 验收）。
  const mobileUiEnabled = resolveMobileUiEnabled(config);
  // 用户偏好（设置面板可见开关，持久化于 config.json.ui.pageTweaks，默认开）
  const uiPageTweaks = readUiPageTweaksPref(configFile);
  const pageTweaksEffective = mobileUiEnabled && uiPageTweaks;
  if (!pageTweaksEffective) {
    logger.info('dsh-bridge: page-tweak layer disabled (hostAllows=%s userPref=%s)', mobileUiEnabled, uiPageTweaks);
    if (!HTML_INJECTION_PARTS.some((p) => p.mark === BRIDGE_CLIENT_CONFIG_MARK)) {
      HTML_INJECTION_PARTS.push({ mark: BRIDGE_CLIENT_CONFIG_MARK, html: BRIDGE_CLIENT_CONFIG_OFF_HTML });
    }
  }

  // 配置持久化互斥队列：读-改-写事务整体入队，杜绝多平台并发持久化时
  // "读到同一份旧配置 → 各自合并 → 后写覆盖先写"的丢失更新问题
  let configQueue = Promise.resolve();

  // 从 JSON 文件读取持久化配置（只读快照；启动恢复等场景使用）
  async function loadConfig() {
    try {
      const raw = await readFile(configFile, 'utf8');
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  // config.json 含平台 Token / 隧道凭据 / 访问密码哈希，属同机敏感文件：
  // 落盘固定 0600，与 sessions.json（lib/auth/manager.js）保持一致。
  const CONFIG_FILE_MODE = 0o600;

  async function writeConfig(data) {
    await mkdir(join(dshHome, 'dsh-bridge'), { recursive: true });
    // mode 仅对新建文件生效；已存在的旧文件（历史版本落在 0644）由
    // ensureConfigFileMode 在启动时收敛，两者配合覆盖新建与存量两种情形。
    await writeFile(configFile, JSON.stringify(data, null, 2), { encoding: 'utf8', mode: CONFIG_FILE_MODE });
  }

  // 存量收敛：writeFile 的 mode 不会修改已存在文件的权限位，历史版本已把
  // config.json 写成 0644（同机其他用户可读）。此处幂等收紧到 0600。
  // 失败仅告警、不阻断启动（Windows 等平台 chmod 语义不同，且权限收紧
  // 不应成为插件不可用的原因）。
  async function ensureConfigFileMode() {
    try {
      await access(configFile);
    } catch (err) {
      // 仅「文件不存在」属预期（尚未写入，写入时会带上正确 mode）。
      // 其余错误（EACCES/EIO 等）意味着我们无法确认权限状态，必须出声，
      // 否则旧版遗留的宽松权限会被静默放过。
      if (err?.code !== 'ENOENT') {
        logger.warn('dsh-bridge: 无法检查 config.json 权限状态，跳过收紧：%s', err?.message ?? err);
      }
      return;
    }
    try {
      const current = await stat(configFile);
      const tightened = current.mode & 0o777;
      if (tightened === CONFIG_FILE_MODE) return;
      await chmod(configFile, CONFIG_FILE_MODE);
      logger.info('dsh-bridge: 已将 config.json 权限从 %s 收敛为 0600', tightened.toString(8).padStart(4, '0'));
    } catch (err) {
      logger.warn('dsh-bridge: 收紧 config.json 权限失败（不影响运行）：%s', err?.message ?? err);
    }
  }

  // 整对象写入（同样入队，避免与进行中的事务交错）
  async function saveConfig(data) {
    const task = configQueue.then(() => writeConfig(data));
    configQueue = task.catch((err) => {
      logger.error('saveConfig failed: %s', err.message);
    });
    return task;
  }

  // 读-改-写事务：mutate(current) 在队列内执行并返回新配置对象，与其他持久化调用严格串行
  async function updateConfig(mutate) {
    const task = configQueue.then(async () => {
      const current = await loadConfig();
      const next = (await mutate(current)) ?? current;
      await writeConfig(next);
      return next;
    });
    configQueue = task.catch((err) => {
      logger.error('updateConfig failed: %s', err.message);
    });
    return task;
  }

  // 访问安全认证管理器
  const authManager = new AuthManager({
    config: config.auth ?? {},
    logger,
    onPersist: (patch) => updateConfig((stored) => {
      stored.auth = { ...(stored.auth ?? {}), ...patch };
      return stored;
    }),
  });

  // 保命救急检查：检测到 reset-auth 文件时自动重置全量密码与安全策略
  async function checkEmergencyReset() {
    try {
      await unlink(emergencyResetFile);
      authManager.enabled = false;
      authManager.passwordHash = '';
      authManager.passwordSalt = '';
      authManager.adminPasswordHash = '';
      authManager.adminPasswordSalt = '';
      authManager.adminPolicy = 'password_unlock';
      authManager.mode = 'token_and_password';
      authManager.sessions.clear();
      authManager.adminSessions.clear();
      await updateConfig((stored) => {
        delete stored.auth;
        return stored;
      });
      logger.warn('dsh-bridge: [保命救急] 检测到 reset-auth 标记文件，已成功重置所有访问密码与安全策略！');
    } catch {}
  }

  // 启动时读取已保存的 auth 配置并执行保命标记检查
  checkEmergencyReset().then(() => ensureConfigFileMode()).then(() => loadConfig()).then((stored) => {
    if (stored?.auth) {
      if (stored.auth.enabled != null) authManager.enabled = Boolean(stored.auth.enabled);
      if (stored.auth.mode) authManager.mode = stored.auth.mode;
      if (stored.auth.scope) authManager.scope = stored.auth.scope;
      if (stored.auth.adminPolicy) authManager.adminPolicy = stored.auth.adminPolicy;
      if (stored.auth.adminProtection != null) authManager.adminProtection = stored.auth.adminProtection !== false;
      if (stored.auth.passwordHash) authManager.passwordHash = stored.auth.passwordHash;
      if (stored.auth.passwordSalt) authManager.passwordSalt = stored.auth.passwordSalt;
      if (stored.auth.adminPasswordHash) authManager.adminPasswordHash = stored.auth.adminPasswordHash;
      if (stored.auth.adminPasswordSalt) authManager.adminPasswordSalt = stored.auth.adminPasswordSalt;
      if (stored.auth.secretToken) authManager.secretToken = stored.auth.secretToken;
      if (stored.auth.allowLoopback != null) authManager.allowLoopback = Boolean(stored.auth.allowLoopback);
      logger.info('dsh-bridge: loaded saved auth config (enabled=%s, mode=%s, adminPolicy=%s, adminProtection=%s)', authManager.enabled, authManager.mode, authManager.adminPolicy, authManager.adminProtection);
    }
  }).catch(() => {});

  const service = new BridgeService({
    mobileUiEnabled,
    dshPort,
    proxyPort,
    home: config.home,
    customTunnelConfig: config.customTunnel ?? null,
    cloudflaredConfig: config.cloudflared ?? null,
    lanConfig: config.lan ?? null,
    authManager,
    onPersist: (patch) => updateConfig((stored) => Object.assign(stored, patch)),
    logger,
  });
  service.uiPageTweaks = uiPageTweaks;

  // 启动时读取已保存的局域网网卡配置与公网隧道配置并按需自动拉起
  loadConfig().then(async (stored) => {
    restorePersistedServiceState({ service, stored, logger, authEnabled: authManager.enabled });
  }).catch(() => {});

  // 平台管理器：注册/协调所有 IM 平台适配器
  const platformManager = new PlatformManager({ logger });

  // ---- 平台装配（T3.4：注册 + 统一持久化回调，替代四段逐平台复制的构造块）----
  // 新增平台只需在此表加一行；持久化、注册、恢复编排与销毁全部自动接入
  const platformCtors = [
    ['wechat', WechatService],     // 微信 Bot（ClawBot/iLink）
    ['qq', QqService],             // QQ Bot（OpenAPI v2）
    ['feishu', FeishuService],     // 飞书 Bot（官方 OpenAPI / WebSocket 长连接）
    ['telegram', TelegramService], // Telegram Bot（Long Polling + 代理）
  ];
  const platforms = {};
  for (const [key, Ctor] of platformCtors) {
    const service = new Ctor({
      ctx,
      logger,
      config: config[key] ?? {},
      onPersist: (patch) => updateConfig((stored) => {
        stored[key] = { ...(stored[key] ?? {}), ...patch };
        return stored;
      }),
    });
    platformManager.register(service);
    platforms[key] = service;
  }
  const { wechat, qq, feishu, telegram } = platforms;

  // ---- 平台配置恢复编排（统一工厂，替代四段逐平台复制的 loadConfig 恢复块）----
  // 顺序：白名单/数值字段 → 活动会话恢复（_restoringConfig 屏障）→ 凭证注入 → 网关自启
  function restorePlatform(service, { platformKey, numericFields = [], defaultMaxMessageChars = 2000, hasCredentials, applyCredentials }) {
    return loadConfig().then(async (stored) => {
      const cfg = stored?.[platformKey];
      if (!cfg) return;
      const node = service.node;
      // 白名单/数值字段 + 会话字符串字段（cwd/agentPreset/agentProvider/agentModel）一并回写，
      // 否则"设置里配了、重启就丢"，远程会话会掉到默认或空 preset 层
      applyRestoredPlatformConfig(node.config, cfg, {
        numericFields,
        stringFields: RESTORED_STRING_FIELDS,
        defaultMaxMessageChars,
      });

      node._restoringConfig = (async () => {
        if (cfg.activeSessionId) {
          node.activeSessionId = cfg.activeSessionId;
          logger.info('dsh-bridge: restored %s active session: %s', platformKey, cfg.activeSessionId);
        } else {
          await node._pickDefaultSession().catch(() => {});
        }
      })();

      await node._restoringConfig;

      if (hasCredentials(cfg)) {
        applyCredentials(cfg);
        logger.info('dsh-bridge: loaded saved %s bot config, starting gateway', platformKey);
        await service.start().catch((err) => {
          logger.error('dsh-bridge: %s auto-start failed: %s', platformKey, err?.message ?? err);
        });
      }
    }).catch(() => {});
  }

  restorePlatform(wechat, {
    platformKey: 'wechat',
    numericFields: PLATFORM_TIMING_FIELDS,
    hasCredentials: (cfg) => Boolean(cfg.token && cfg.accountId),
    applyCredentials: (cfg) => wechat.gateway.setCredentials({
      token: cfg.token,
      accountId: cfg.accountId,
      baseUrl: cfg.baseUrl,
    }),
  });

  restorePlatform(qq, {
    platformKey: 'qq',
    numericFields: PLATFORM_TIMING_FIELDS,
    hasCredentials: (cfg) => Boolean(cfg.appId && cfg.clientSecret),
    applyCredentials: (cfg) => qq.gateway.setCredentials({
      appId: cfg.appId,
      clientSecret: cfg.clientSecret,
      accessToken: cfg.accessToken,
      accessTokenExpiresAt: cfg.accessTokenExpiresAt,
      gatewayUrl: cfg.gatewayUrl,
      accountId: cfg.accountId,
    }),
  });

  restorePlatform(feishu, {
    platformKey: 'feishu',
    numericFields: PLATFORM_TIMING_FIELDS,
    hasCredentials: (cfg) => Boolean(cfg.appId && cfg.appSecret),
    applyCredentials: (cfg) => feishu.gateway.updateConfig({
      appId: cfg.appId,
      appSecret: cfg.appSecret,
      domain: cfg.domain || 'feishu',
    }),
  });

  restorePlatform(telegram, {
    platformKey: 'telegram',
    numericFields: PLATFORM_TIMING_FIELDS,
    defaultMaxMessageChars: 4096,
    hasCredentials: (cfg) => Boolean(cfg.botToken),
    applyCredentials: (cfg) => telegram.gateway.setCredentials({
      botToken: cfg.botToken,
      proxy: cfg.proxy || '',
    }),
  });

  const disposeRpc = installBridgeRpc(ctx, {
    service,
    authManager,
    qq,
    feishu,
    telegram,
    platformManager,
    logger,
    // 运行中任务探测所需的引用：探测失败一律降级为「无任务」，不阻断重启
    runtime: { ctx, platformManager },
    // 页面改写层用户偏好（设置面板可见开关）：读返回三态，写持久化 + 同步内存
    getUiFlags: async () => ({
      pageTweaks: service.uiPageTweaks ?? true,
      hostAllows: service.mobileUiEnabled ?? true,
      effective: (service.mobileUiEnabled ?? true) && (service.uiPageTweaks ?? true),
    }),
    setUiFlags: async (patch) => {
      if (patch.pageTweaks !== undefined) {
        service.uiPageTweaks = patch.pageTweaks === true;
        await updateConfig((current) => {
          current.ui = { ...(current.ui ?? {}), pageTweaks: service.uiPageTweaks };
          return current;
        });
      }
      return {
        pageTweaks: service.uiPageTweaks ?? true,
        hostAllows: service.mobileUiEnabled ?? true,
        effective: (service.mobileUiEnabled ?? true) && (service.uiPageTweaks ?? true),
      };
    },
    saveCustomTunnelConfig: async (serverUrl, accessToken, sseStreaming) => {
      const stored = await updateConfig((current) => {
        const prev = service.customTunnelConfig ?? {};
        const next = { ...prev };
        // 与 saveCloudflaredConfig 同契约：undefined/掩码保留现值，空串清除
        if (serverUrl !== undefined) next.serverUrl = String(serverUrl).trim();
        if (accessToken !== undefined) next.accessToken = accessToken === '******' ? (prev.accessToken ?? '') : accessToken;
        if (sseStreaming !== undefined) next.sseStreaming = Boolean(sseStreaming);
        current.customTunnel = next;
        return current;
      });
      service.customTunnelConfig = stored.customTunnel;
    },
    exportBackup: async () => {
      const stored = await loadConfig();
      return {
        version: VERSION,
        exportedAt: new Date().toISOString(),
        config: stored,
      };
    },
    importBackup: async (backup) => {
      if (!backup || typeof backup !== 'object' || !backup.config || typeof backup.config !== 'object') {
        throw new Error('无效的备份数据结构：缺少 config 节点');
      }
      const incoming = backup.config;
      await saveConfig(incoming);

      // 重新载入 Auth
      if (incoming.auth) {
        if (incoming.auth.enabled != null) authManager.enabled = Boolean(incoming.auth.enabled);
        if (incoming.auth.mode) authManager.mode = incoming.auth.mode;
        if (incoming.auth.scope) authManager.scope = incoming.auth.scope;
        if (incoming.auth.adminPolicy) authManager.adminPolicy = incoming.auth.adminPolicy;
        if (incoming.auth.adminProtection != null) authManager.adminProtection = incoming.auth.adminProtection !== false;
        if (incoming.auth.passwordHash) authManager.passwordHash = incoming.auth.passwordHash;
        if (incoming.auth.passwordSalt) authManager.passwordSalt = incoming.auth.passwordSalt;
        if (incoming.auth.adminPasswordHash) authManager.adminPasswordHash = incoming.auth.adminPasswordHash;
        if (incoming.auth.adminPasswordSalt) authManager.adminPasswordSalt = incoming.auth.adminPasswordSalt;
        if (incoming.auth.secretToken) authManager.secretToken = incoming.auth.secretToken;
      }
      // 重新载入 Tunnels
      if (incoming.cloudflared) {
        service.cloudflaredConfig = incoming.cloudflared;
      }
      if (incoming.customTunnel) {
        service.customTunnelConfig = incoming.customTunnel;
      }
      // 重新载入各 IM 平台白名单与配置（含 cwd/agentPreset/agentProvider/agentModel）
      if (incoming.wechat) {
        applyRestoredPlatformConfig(wechat.node.config, incoming.wechat, { stringFields: RESTORED_STRING_FIELDS });
      }
      if (incoming.qq) {
        applyRestoredPlatformConfig(qq.node.config, incoming.qq, { stringFields: RESTORED_STRING_FIELDS });
        if (incoming.qq.appId && incoming.qq.clientSecret) {
          qq.gateway.setCredentials({ appId: incoming.qq.appId, clientSecret: incoming.qq.clientSecret });
        }
      }
      if (incoming.feishu) {
        applyRestoredPlatformConfig(feishu.node.config, incoming.feishu, { stringFields: RESTORED_STRING_FIELDS });
        if (incoming.feishu.appId && incoming.feishu.appSecret) {
          feishu.gateway.setCredentials({ appId: incoming.feishu.appId, appSecret: incoming.feishu.appSecret });
        }
      }
      if (incoming.telegram) {
        applyRestoredPlatformConfig(telegram.node.config, incoming.telegram, { stringFields: RESTORED_STRING_FIELDS });
        if (incoming.telegram.botToken) {
          telegram.gateway.setCredentials({ botToken: incoming.telegram.botToken, proxy: incoming.telegram.proxy || '' });
        }
      }

      return { ok: true, message: '配置已成功导入并刷新生效！' };
    },
  });

  // 代理随插件自动启动
  void service.startProxy().catch((err) => {
    logger.error('dsh-bridge: proxy start failed: %s', err?.message ?? err);
  });

  ctx.effect(() => async () => {
    try { disposeRpc(); } catch {}
    for (const service of Object.values(platforms)) {
      await service.destroy();
    }
    platformManager.dispose();
    authManager.dispose();
    await service.dispose();
  }, 'dsh-bridge: stop wechat, qq, feishu, telegram, proxy, auth and tunnels');
}

export { name, inject, apply, ProxyServer, BridgeService, selectLanIPv4, listAllLanIPv4 };
