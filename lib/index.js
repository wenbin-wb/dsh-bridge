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
import { readFileSync, existsSync } from 'node:fs';
import { readFile, writeFile, mkdir, unlink, readdir, stat, access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createHash, createHmac } from 'node:crypto';
import QRCode from 'qrcode';
import { installBridgeRpc } from './bridge-rpc.js';
import { CustomTunnelClient } from './tunnel-client.mjs';
import { CloudflaredManager } from './cloudflared-manager.mjs';
import { PlatformManager } from './platform/manager.js';
import { WechatService } from './wechat/index.js';
import { QqService } from './qq/index.js';
import { FeishuService } from './feishu/index.js';
import { TelegramService } from './telegram/index.js';
import { AuthManager } from './auth/manager.js';
import { renderLoginPage } from './auth/login-template.js';
import { isSafeWorkspacePath, isSensitiveFolderName } from './security/path-validator.js';
import { installAbortSignalCompat, BROWSER_ABORT_SIGNAL_POLYFILL } from './compat.js';

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

const HTML_HEAD_INJECTIONS = `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="DSH">
<meta name="theme-color" content="#1e1e2e">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="icon" type="image/svg+xml" href="/__dsh_bridge__/pwa-icon.svg">
<link rel="apple-touch-icon" href="/__dsh_bridge__/pwa-icon.svg">
<script data-dsh-bridge-polyfill="1">!function(){try{if(self.crypto&&!self.crypto.randomUUID){self.crypto.randomUUID=function(){var b=new Uint8Array(16);self.crypto.getRandomValues(b);b[6]=b[6]&15|64;b[8]=b[8]&63|128;var h="";for(var i=0;i<16;i++){var x=b[i].toString(16);h+=(x.length<2?"0":"")+x;if(i===3||i===5||i===7||i===9)h+="-";}return h;}}}catch(e){}}();</script>
${BROWSER_ABORT_SIGNAL_POLYFILL}`;
const INJECT_MARK = 'data-dsh-bridge-polyfill="1"';

function isCompressed(headers) {
  return /(^|,\s*)(gzip|br|deflate)(\s*,|$)/i.test(String(headers['content-encoding'] ?? ''));
}

function encodeBase64Url(value) {
  return Buffer.from(value).toString('base64url');
}

/**
 * 读取 DSH 本地凭证并生成 loopback dsh-auth 认证签名 Cookie (适配 DSH 新版原生认证)
 */
function getDshLoopbackCookie(targetPort) {
  try {
    const dshHome = process.env.DSH_HOME ?? join(homedir(), '.dsh');
    const credPath = join(dshHome, '.credentials.yaml');
    if (!existsSync(credPath)) return '';
    const content = readFileSync(credPath, 'utf8');
    const match = content.match(/secret:\s*([A-Za-z0-9_-]+)/);
    if (!match) return '';
    const secret = Buffer.from(match[1], 'base64url');

    const authority = `127.0.0.1:${targetPort}`;
    const name = 'dsh-auth-' + encodeBase64Url(createHash('sha256').update(authority).digest());
    const issuedAt = Date.now() - 1000;
    const expiresAt = issuedAt + 30 * 24 * 3600 * 1000;
    const body = encodeBase64Url(Buffer.from(JSON.stringify({
      version: 1, authority, issuedAt, expiresAt,
    }), 'utf8'));
    const sig = encodeBase64Url(createHmac('sha256', secret).update(body).digest());
    return `${name}=v1.${body}.${sig}`;
  } catch {
    return '';
  }
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

/**
 * HTTP + WebSocket 代理服务器（带安全认证守门）
 * 关键：改写 Host + Origin，注入 crypto.randomUUID polyfill
 * 并在未授权时拦截并展示 DSH 风格登录页，阻止未授权 WebSocket 与 API 调用
 */
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
          if (origin) {
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
          // 未压缩的 HTML 文档注入 polyfill
          if (contentType.includes('text/html') && !isCompressed(proxyRes.headers)) {
            const chunks = [];
            proxyRes.on('data', (c) => chunks.push(c));
            proxyRes.on('end', () => {
              let html = Buffer.concat(chunks).toString('utf8');
              if (!html.includes(INJECT_MARK)) {
                html = html.replace(/<head[^>]*>/i, (m) => `${m}${HTML_HEAD_INJECTIONS}`);
              }
              const out = Buffer.from(html, 'utf8');
              const outHeaders = { ...proxyRes.headers };
              delete outHeaders['content-length'];
              delete outHeaders['transfer-encoding'];
              outHeaders['content-length'] = String(out.length);
              res.writeHead(proxyRes.statusCode ?? 200, outHeaders);
              res.end(out);
            });
            proxyRes.on('error', () => res.destroy());
            return;
          }
          res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
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

      const headers = loopbackHeaders(req.headers, this.targetPort);
      const proxyReq = httpRequest({
        host: '127.0.0.1', port: this.targetPort, method: req.method, path: req.url, headers, agent: false,
      });
      proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
        socket.write('HTTP/1.1 101 Switching Protocols\r\n');
        const raw = [];
        for (const [k, v] of Object.entries(proxyRes.headers)) {
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
          for (const [k, v] of Object.entries(proxyRes.headers)) {
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
  constructor({ dshPort, proxyPort, home, cloudflaredConfig, customTunnelConfig, lanConfig, authManager, onPersist, logger }) {
    this.dshPort = dshPort;
    this.proxyPort = proxyPort;
    this.home = home;
    this.cloudflaredConfig = cloudflaredConfig ?? { token: '', hostname: '', autoStart: false };
    this.customTunnelConfig = customTunnelConfig ?? null;
    this.selectedLanIp = lanConfig?.selectedIp ?? null;
    this.authManager = authManager ?? null;
    this.onPersist = onPersist ?? null;
    this.logger = logger;

    this.qrCache = new QrCache();
    this.proxy = null;

    this.customTunnel = null;
    this.customTunnelState = { phase: 'idle', detail: '' };

    this.cloudflared = null;
    this.cloudflaredState = { phase: 'idle', detail: '' };
  }

  async setLanIp({ ip } = {}) {
    const trimmed = ip ? String(ip).trim() : null;
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
      // loopback-token 允许跨域的面板来源：回环、当前局域网 IP、隧道公网地址
      allowedOrigins: () => {
        const origins = [`http://127.0.0.1:${this.proxyPort}`, `http://localhost:${this.proxyPort}`];
        try {
          for (const iface of listAllLanIPv4()) origins.push(`http://${iface.address}:${this.proxyPort}`);
          if (this.selectedLanIp) origins.push(`http://${this.selectedLanIp}:${this.proxyPort}`);
          if (this.cloudflared?.url) origins.push(new URL(this.cloudflared.url).origin);
          if (this.customTunnel?.publicUrl) origins.push(new URL(this.customTunnel.publicUrl).origin);
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

      auth: this.authManager?.getStatus({ masked: !adminAuthValid }) ?? { enabled: false },

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
        running: !!this.cloudflared,
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
        url: customUrl,
        rawUrl: baseCustomUrl,
        qr: customUrl
          ? await this.qrCache.get(customUrl)
          : null,
        state: this.customTunnelState,
        autoStart: Boolean(this.customTunnelConfig?.autoStart),
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

  async startCloudflared({ autoStart = true } = {}) {
    if (this.cloudflared) {
      throw new Error('Cloudflare 隧道已在运行');
    }

    this.cloudflaredConfig = {
      ...(this.cloudflaredConfig ?? {}),
      autoStart: Boolean(autoStart),
    };
    await this.onPersist?.({ cloudflared: this.cloudflaredConfig });

    this.cloudflaredState = { phase: 'connecting', detail: '正在初始化...' };
    this.cloudflared = new CloudflaredManager({
      port: this.proxyPort,
      home: this.home,
      token: this.cloudflaredConfig?.token,
      hostname: this.cloudflaredConfig?.hostname,
      onStateChange: (state) => {
        this.cloudflaredState = state;
        // 出错时自动清理，让用户可以重新开启
        if (state.phase === 'error') {
          this.cloudflared = null;
        }
      },
      logger: this.logger,
    });

    // 非阻塞启动，立即返回——下载/连接进度通过 onStateChange 推送
    this.cloudflared.start();
  }

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
  async checkVersion() {
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
      return {
        current: VERSION,
        latest: latestData?.version ?? null,
        releaseNotes: latestData?.releaseNotes ?? null,
      };
    } catch (e) {
      return { current: VERSION, latest: null, error: e.message ?? '检查失败' };
    }
  }

  // 一键直接升级插件（执行 dsh / npx / npm 自动升级，使用安全的参数数组彻底杜绝 shell 注入）
  async upgradePlugin({ version } = {}) {
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

    const tasks = [
      { cmd: 'dsh', args: ['plugin', '--profile', 'web', 'add', pkgSpec] },
      { cmd: existsSync(siblingNpx) ? siblingNpx : 'npx', args: ['--yes', '@deepseek-ai/dsh', 'plugin', '--profile', 'web', 'add', pkgSpec] },
      { cmd: existsSync(siblingNpm) ? siblingNpm : 'npm', args: ['install', pkgSpec] },
    ];

    let lastError = null;

    for (const task of tasks) {
      try {
        const res = await new Promise((resolve, reject) => {
          let cp;
          try {
            cp = spawn(task.cmd, task.args, {
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

  // 优雅重启 DSH 服务（支持守护进程自动拉起或独立派生子进程重启）
  async restartDsh() {
    this.logger?.info('收到 DSH 重启请求，正在调度重启...');
    setTimeout(() => {
      try {
        if (process.env.DSH_DAEMON || process.env.PM2_HOME) {
          process.exit(0);
        } else {
          // 常规 Node/CLI 模式：派生与当前参数一致的独立后台子进程并退出当前进程
          const child = spawn(process.execPath, process.argv.slice(1), {
            cwd: process.cwd(),
            env: process.env,
            detached: true,
            stdio: 'ignore',
            windowsHide: false,
          });
          child.unref();
          process.exit(0);
        }
      } catch (err) {
        this.logger?.error('派生重启进程失败: %s，执行直接退出', err.message);
        process.exit(0);
      }
    }, 600);

    return { ok: true, message: 'DSH 服务正在重启中，前端将在几秒后自动重新连接…' };
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
    this.stopCustomTunnel();
    this.stopCloudflared();
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

  async function writeConfig(data) {
    await mkdir(join(dshHome, 'dsh-bridge'), { recursive: true });
    await writeFile(configFile, JSON.stringify(data, null, 2), 'utf8');
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
  checkEmergencyReset().then(() => loadConfig()).then((stored) => {
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

  // 启动时读取已保存的局域网网卡配置与公网隧道配置并按需自动拉起
  loadConfig().then(async (stored) => {
    if (stored?.lan?.selectedIp) {
      service.selectedLanIp = stored.lan.selectedIp;
      logger.info('dsh-bridge: loaded saved lan config (selectedIp=%s)', service.selectedLanIp);
    }
    if (stored?.cloudflared) {
      service.cloudflaredConfig = stored.cloudflared;
      logger.info('dsh-bridge: loaded saved cloudflared config (autoStart=%s, tokenConfigured=%s)', Boolean(service.cloudflaredConfig.autoStart), Boolean(service.cloudflaredConfig.token));
      if (service.cloudflaredConfig.autoStart) {
        logger.info('dsh-bridge: auto-starting cloudflared tunnel...');
        service.startCloudflared({ autoStart: true }).catch((err) => {
          logger.error('dsh-bridge: cloudflared auto-start failed: %s', err?.message ?? err);
        });
      }
    }

    if (stored?.customTunnel) {
      service.customTunnelConfig = stored.customTunnel;
      logger.info('dsh-bridge: loaded saved custom tunnel config (autoStart=%s)', Boolean(service.customTunnelConfig.autoStart));
      if (service.customTunnelConfig.autoStart && service.customTunnelConfig.serverUrl) {
        logger.info('dsh-bridge: auto-starting custom tunnel...');
        service.startCustomTunnel({ autoStart: true }).catch((err) => {
          logger.error('dsh-bridge: custom tunnel auto-start failed: %s', err?.message ?? err);
        });
      }
    }
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
      node.config.allowFrom = Array.isArray(cfg.allowFrom) ? cfg.allowFrom : [];
      for (const field of numericFields) {
        if (cfg[field] != null) node.config[field] = Number(cfg[field]);
      }
      if (cfg.maxMessageChars != null) {
        const val = Number(cfg.maxMessageChars);
        node.config.maxMessageChars = (val >= 200) ? val : defaultMaxMessageChars;
      }
      if (cfg.groupAutoApprove != null) node.config.groupAutoApprove = cfg.groupAutoApprove === true;

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
    numericFields: ['digestIntervalSec', 'approvalTimeoutSec', 'sendChunkDelayMs'],
    hasCredentials: (cfg) => Boolean(cfg.token && cfg.accountId),
    applyCredentials: (cfg) => wechat.gateway.setCredentials({
      token: cfg.token,
      accountId: cfg.accountId,
      baseUrl: cfg.baseUrl,
    }),
  });

  restorePlatform(qq, {
    platformKey: 'qq',
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
    hasCredentials: (cfg) => Boolean(cfg.appId && cfg.appSecret),
    applyCredentials: (cfg) => feishu.gateway.updateConfig({
      appId: cfg.appId,
      appSecret: cfg.appSecret,
      domain: cfg.domain || 'feishu',
    }),
  });

  restorePlatform(telegram, {
    platformKey: 'telegram',
    numericFields: ['digestIntervalSec', 'approvalTimeoutSec', 'sendChunkDelayMs'],
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
    saveCustomTunnelConfig: async (serverUrl, accessToken) => {
      const stored = await updateConfig((current) => {
        const prev = service.customTunnelConfig ?? {};
        const next = { ...prev };
        // 与 saveCloudflaredConfig 同契约：undefined/掩码保留现值，空串清除
        if (serverUrl !== undefined) next.serverUrl = String(serverUrl).trim();
        if (accessToken !== undefined) next.accessToken = accessToken === '******' ? (prev.accessToken ?? '') : accessToken;
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
      // 重新载入各 IM 平台白名单与配置
      if (incoming.wechat) wechat.node.config.allowFrom = incoming.wechat.allowFrom ?? [];
      if (incoming.qq) {
        qq.node.config.allowFrom = incoming.qq.allowFrom ?? [];
        if (incoming.qq.appId && incoming.qq.clientSecret) {
          qq.gateway.setCredentials({ appId: incoming.qq.appId, clientSecret: incoming.qq.clientSecret });
        }
      }
      if (incoming.feishu) {
        feishu.node.config.allowFrom = incoming.feishu.allowFrom ?? [];
        if (incoming.feishu.appId && incoming.feishu.appSecret) {
          feishu.gateway.setCredentials({ appId: incoming.feishu.appId, appSecret: incoming.feishu.appSecret });
        }
      }
      if (incoming.telegram) {
        telegram.node.config.allowFrom = incoming.telegram.allowFrom ?? [];
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
