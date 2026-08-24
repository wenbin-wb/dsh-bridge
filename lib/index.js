// dsh-bridge 主插件（Host）
//
// 多渠道访问桥：
//   1. 局域网访问代理（自动启动，零配置）
//   2. Cloudflare 隧道（一键获取公网地址）
//   3. 自建隧道（WebSocket 反向隧道 + Token 认证）

import { createServer, request as httpRequest } from 'node:http';
import { get as httpsGet } from 'node:https';
import { networkInterfaces, homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import { spawn } from 'node:child_process';
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

const name = 'dsh-bridge';
// 微信 Bot 会话桥依赖 DSH 提供的会话/agent/审批/工作区/持久化服务，需显式 inject
const inject = ['connection', 'webServer', 'sessions', 'agents', 'approval', 'workspaceRegistry', 'sessionPersistence'];

// 从 package.json 动态读取版本号，发版只需改 package.json 一处
const PACKAGE_JSON = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json'), 'utf8'));
const VERSION = PACKAGE_JSON.version ?? '0.0.0';

/**
 * 选择最佳局域网 IP
 */
function selectLanIPv4() {
  const interfaces = networkInterfaces();
  let best = null;
  let bestScore = -1;

  for (const [ifname, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;

    for (const addr of addrs) {
      if (addr.family !== 'IPv4' || addr.internal) continue;

      let score = 0;
      if (addr.address.startsWith('192.168.')) score += 100;
      else if (addr.address.startsWith('10.')) score += 90;
      else if (addr.address.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)) score += 90;

      const lower = ifname.toLowerCase();
      if (!lower.includes('virtual')) score += 50;
      if (!lower.includes('vmware')) score += 50;
      if (!lower.includes('vbox')) score += 50;
      if (lower.includes('eth')) score += 20;
      else if (lower.includes('en')) score += 10;

      if (score > bestScore) {
        bestScore = score;
        best = addr.address;
      }
    }
  }

  return best;
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
<script data-dsh-bridge-polyfill="1">!function(){try{if(self.crypto&&!self.crypto.randomUUID){self.crypto.randomUUID=function(){var b=new Uint8Array(16);self.crypto.getRandomValues(b);b[6]=b[6]&15|64;b[8]=b[8]&63|128;var h="";for(var i=0;i<16;i++){var x=b[i].toString(16);h+=(x.length<2?"0":"")+x;if(i===3||i===5||i===7||i===9)h+="-";}return h;}}}catch(e){}}();</script>`;
const INJECT_MARK = 'data-dsh-bridge-polyfill="1"';

function isCompressed(headers) {
  return /(^|,\s*)(gzip|br|deflate)(\s*,|$)/i.test(String(headers['content-encoding'] ?? ''));
}

/** 把请求头中的 Host 和 Origin 改写成 loopback，让 DSH 的安全栅栏放行 */
function loopbackHeaders(headers, targetPort) {
  const authority = `127.0.0.1:${targetPort}`;
  const out = { ...headers };
  out['host'] = authority;
  if (out['origin']) out['origin'] = `http://${authority}`;
  if (out['Origin']) out['Origin'] = `http://${authority}`;
  return out;
}

/**
 * HTTP + WebSocket 代理服务器（带安全认证守门）
 * 关键：改写 Host + Origin，注入 crypto.randomUUID polyfill
 * 并在未授权时拦截并展示 DSH 风格登录页，阻止未授权 WebSocket 与 API 调用
 */
class ProxyServer {
  constructor({ localPort, targetPort, authManager, logger }) {
    this.localPort = localPort;
    this.targetPort = targetPort;
    this.authManager = authManager;
    this.logger = logger;
    this.server = null;
    this.clientSockets = new Set();
    this.activeConnections = 0;
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
        req.on('end', () => {
          try {
            const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
            const clientIp = req.socket?.remoteAddress || '';
            const verify = this.authManager?.verifyPassword(body.password, clientIp);
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
        const corsHeaders = {
          'Access-Control-Allow-Origin': '*',
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
      const auth = this.authManager?.verifyRequest(req) ?? { authenticated: true };

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
    this.activeConnections = 0;
  }

  get port() {
    return this.localPort;
  }
}

/**
 * Bridge Service
 */
class BridgeService {
  constructor({ dshPort, proxyPort, home, customTunnelConfig, authManager, logger }) {
    this.dshPort = dshPort;
    this.proxyPort = proxyPort;
    this.home = home;
    this.customTunnelConfig = customTunnelConfig ?? null;
    this.authManager = authManager ?? null;
    this.logger = logger;

    this.qrCache = new QrCache();
    this.proxy = null;

    this.customTunnel = null;
    this.customTunnelState = { phase: 'idle', detail: '' };

    this.cloudflared = null;
    this.cloudflaredState = { phase: 'idle', detail: '' };
  }

  async startProxy() {
    if (this.proxy) return this.proxy;

    this.proxy = new ProxyServer({
      localPort: this.proxyPort,
      targetPort: this.dshPort,
      authManager: this.authManager,
      logger: this.logger,
    });

    await this.proxy.start();
    return this.proxy;
  }

  async getStatus({ adminAuthValid = false } = {}) {
    const lanIp = selectLanIPv4();
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
      },

      // 轻量摘要，供 UI Tab 状态点使用（完整状态由 wechatGetStatus 提供）
      wechat: this.wechat ? { status: this.wechat.gateway?.status ?? 'idle' } : null,
    };
  }

  async startCustomTunnel() {
    if (this.customTunnel) {
      throw new Error('自建隧道已在运行');
    }

    const serverUrl = this.customTunnelConfig?.serverUrl;
    const accessToken = this.customTunnelConfig?.accessToken;

    if (!serverUrl || !accessToken) {
      throw new Error('缺少配置：请在 cordis.yml 中配置 customTunnel.serverUrl 和 customTunnel.accessToken');
    }

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

    await this.customTunnel.connect();
  }

  stopCustomTunnel() {
    if (this.customTunnel) {
      this.customTunnel.disconnect();
      this.customTunnel = null;
      this.customTunnelState = { phase: 'idle', detail: '' };
    }
  }

  async startCloudflared() {
    if (this.cloudflared) {
      throw new Error('Cloudflare 隧道已在运行');
    }

    this.cloudflaredState = { phase: 'connecting', detail: '正在初始化...' };
    this.cloudflared = new CloudflaredManager({
      port: this.proxyPort,
      home: this.home,
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

  stopCloudflared() {
    if (this.cloudflared) {
      this.cloudflared.stop();
      this.cloudflared = null;
      this.cloudflaredState = { phase: 'idle', detail: '' };
    }
  }

  // 重置 Cloudflare 隧道：关闭隧道 + 删除已下载的 cloudflared 二进制
  async resetCloudflared() {
    this.stopCloudflared();
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

    const tasks = [
      { cmd: isWin ? 'dsh.cmd' : 'dsh', fallbackCmd: 'dsh', args: ['plugin', '--profile', 'web', 'add', pkgSpec] },
      { cmd: isWin ? 'npx.cmd' : 'npx', fallbackCmd: 'npx', args: ['--yes', '@deepseek-ai/dsh', 'plugin', '--profile', 'web', 'add', pkgSpec] },
      { cmd: isWin ? 'npm.cmd' : 'npm', fallbackCmd: 'npm', args: ['install', pkgSpec] },
    ];

    let lastError = null;

    for (const task of tasks) {
      try {
        const res = await new Promise((resolve, reject) => {
          const runExecutable = (executable) => {
            const cp = spawn(executable, task.args, {
              windowsHide: true,
              shell: false,
              timeout: 90000,
            });
            let stdout = '';
            let stderr = '';
            cp.stdout?.on('data', (d) => { stdout += d.toString(); });
            cp.stderr?.on('data', (d) => { stderr += d.toString(); });
            cp.on('error', (err) => {
              if (executable !== task.fallbackCmd) {
                runExecutable(task.fallbackCmd);
              } else {
                reject(err);
              }
            });
            cp.on('close', (code) => {
              if (code === 0) {
                resolve({ stdout, stderr });
              } else {
                reject(new Error(stderr || stdout || `进程退出码 ${code}`));
              }
            });
          };
          runExecutable(task.cmd);
        });

        const output = res.stdout || res.stderr || '升级成功';
        return { ok: true, command: `${task.cmd} ${task.args.join(' ')}`, output, version: targetVersion };
      } catch (err) {
        lastError = err;
      }
    }

    return { ok: false, error: lastError?.message ?? '升级命令执行失败', version: targetVersion };
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
  const dshPort = ctx.webServer.port;

  if (!dshPort) {
    logger.error('webServer port unavailable');
    return;
  }

  const proxyPort = config.port ?? 3082;
  const dshHome = process.env.DSH_HOME ?? join(homedir(), '.dsh');
  const configFile = join(dshHome, 'dsh-bridge', 'config.json');
  const emergencyResetFile = join(dshHome, 'dsh-bridge', 'reset-auth');

  // 配置写入互斥锁队列，杜绝多平台并发写入造成文件覆盖损坏
  let configWriteQueue = Promise.resolve();

  // 从 JSON 文件读取持久化配置
  async function loadConfig() {
    try {
      const raw = await readFile(configFile, 'utf8');
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  // 持久化配置到 JSON 文件（排队原子写入）
  async function saveConfig(data) {
    configWriteQueue = configWriteQueue.then(async () => {
      await mkdir(join(dshHome, 'dsh-bridge'), { recursive: true });
      await writeFile(configFile, JSON.stringify(data, null, 2), 'utf8');
    }).catch((err) => {
      logger.error('saveConfig failed: %s', err.message);
    });
    return configWriteQueue;
  }

  // 访问安全认证管理器
  const authManager = new AuthManager({
    config: config.auth ?? {},
    logger,
    onPersist: async (patch) => {
      const stored = await loadConfig();
      stored.auth = { ...(stored.auth ?? {}), ...patch };
      await saveConfig(stored);
    },
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
      const stored = await loadConfig();
      delete stored.auth;
      await saveConfig(stored);
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
      if (stored.auth.passwordHash) authManager.passwordHash = stored.auth.passwordHash;
      if (stored.auth.passwordSalt) authManager.passwordSalt = stored.auth.passwordSalt;
      if (stored.auth.adminPasswordHash) authManager.adminPasswordHash = stored.auth.adminPasswordHash;
      if (stored.auth.adminPasswordSalt) authManager.adminPasswordSalt = stored.auth.adminPasswordSalt;
      if (stored.auth.secretToken) authManager.secretToken = stored.auth.secretToken;
      if (stored.auth.allowLoopback != null) authManager.allowLoopback = Boolean(stored.auth.allowLoopback);
      logger.info('dsh-bridge: loaded saved auth config (enabled=%s, mode=%s, adminPolicy=%s)', authManager.enabled, authManager.mode, authManager.adminPolicy);
    }
  }).catch(() => {});

  const service = new BridgeService({
    dshPort,
    proxyPort,
    home: config.home,
    customTunnelConfig: config.customTunnel ?? null,
    authManager,
    logger,
  });

  // 启动时读取已保存的自建隧道配置
  loadConfig().then((stored) => {
    if (stored?.customTunnel?.serverUrl) {
      service.customTunnelConfig = stored.customTunnel;
      logger.info('dsh-bridge: loaded saved custom tunnel config');
    }
  }).catch(() => {});

  // 平台管理器：注册/协调所有 IM 平台适配器
  const platformManager = new PlatformManager({ logger });

  // 微信 Bot（ClawBot/iLink）—— 作为 Platform 子类注册进平台管理器
  const wechat = new WechatService({
    ctx,
    logger,
    config: config.wechat ?? {},
    onPersist: async (patch) => {
      const stored = await loadConfig();
      stored.wechat = { ...(stored.wechat ?? {}), ...patch };
      await saveConfig(stored);
    },
  });
  platformManager.register(wechat);

  // QQ Bot（OpenAPI v2）—— 作为 Platform 子类注册进平台管理器
  const qq = new QqService({
    ctx,
    logger,
    config: config.qq ?? {},
    onPersist: async (patch) => {
      const stored = await loadConfig();
      stored.qq = { ...(stored.qq ?? {}), ...patch };
      await saveConfig(stored);
    },
  });
  platformManager.register(qq);

  // 飞书 Bot（官方 OpenAPI / WebSocket 长连接）—— 作为 Platform 子类注册进平台管理器
  const feishu = new FeishuService({
    ctx,
    logger,
    config: config.feishu ?? {},
    onPersist: async (patch) => {
      const stored = await loadConfig();
      stored.feishu = { ...(stored.feishu ?? {}), ...patch };
      await saveConfig(stored);
    },
  });
  platformManager.register(feishu);

  // Telegram Bot（官方 Long Polling + 代理支持）—— 作为 Platform 子类注册进平台管理器
  const telegram = new TelegramService({
    ctx,
    logger,
    config: config.telegram ?? {},
    onPersist: async (patch) => {
      const stored = await loadConfig();
      stored.telegram = { ...(stored.telegram ?? {}), ...patch };
      await saveConfig(stored);
    },
  });
  platformManager.register(telegram);

  // 启动时读取已保存的微信 Bot 配置（凭证 + 白名单 + 活动会话）
  loadConfig().then(async (stored) => {
    if (stored?.wechat) {
      const cfg = stored.wechat;
      wechat.node.config.allowFrom = Array.isArray(cfg.allowFrom) ? cfg.allowFrom : [];
      if (cfg.digestIntervalSec != null) wechat.node.config.digestIntervalSec = Number(cfg.digestIntervalSec);
      if (cfg.approvalTimeoutSec != null) wechat.node.config.approvalTimeoutSec = Number(cfg.approvalTimeoutSec);
      if (cfg.maxMessageChars != null) wechat.node.config.maxMessageChars = Number(cfg.maxMessageChars);
      if (cfg.sendChunkDelayMs != null) wechat.node.config.sendChunkDelayMs = Number(cfg.sendChunkDelayMs);

      wechat.node._restoringConfig = (async () => {
        try {
          if (cfg.activeSessionId) {
            wechat.node.activeSessionId = cfg.activeSessionId;
            logger.info('dsh-bridge: restored wechat active session: %s', cfg.activeSessionId);
          } else {
            await wechat.node._pickDefaultSession().catch(() => {});
          }
        } finally {
          wechat.node._configRestored = true;
        }
      })();

      await wechat.node._restoringConfig;

      if (cfg.token && cfg.accountId) {
        wechat.gateway.setCredentials({
          token: cfg.token,
          accountId: cfg.accountId,
          baseUrl: cfg.baseUrl,
        });
        logger.info('dsh-bridge: loaded saved wechat bot config, starting gateway');
        await wechat.start().catch((err) => {
          logger.error('dsh-bridge: wechat auto-start failed: %s', err?.message ?? err);
        });
      }
    }
  }).catch(() => {});

  // 启动时读取已保存的 QQ Bot 配置（凭证 + 白名单 + 活动会话）
  loadConfig().then(async (stored) => {
    if (stored?.qq) {
      const cfg = stored.qq;
      qq.node.config.allowFrom = Array.isArray(cfg.allowFrom) ? cfg.allowFrom : [];

      qq.node._restoringConfig = (async () => {
        try {
          if (cfg.activeSessionId) {
            qq.node.activeSessionId = cfg.activeSessionId;
            logger.info('dsh-bridge: restored qq active session: %s', cfg.activeSessionId);
          } else {
            await qq.node._pickDefaultSession().catch(() => {});
          }
        } finally {
          qq.node._configRestored = true;
        }
      })();

      await qq.node._restoringConfig;

      if (cfg.appId && cfg.clientSecret) {
        qq.gateway.setCredentials({
          appId: cfg.appId,
          clientSecret: cfg.clientSecret,
          accessToken: cfg.accessToken,
          accessTokenExpiresAt: cfg.accessTokenExpiresAt,
          gatewayUrl: cfg.gatewayUrl,
          accountId: cfg.accountId,
        });
        logger.info('dsh-bridge: loaded saved qq bot config, starting gateway');
        await qq.start().catch((err) => {
          logger.error('dsh-bridge: qq auto-start failed: %s', err?.message ?? err);
        });
      }
    }
  }).catch(() => {});

  // 启动时读取已保存的飞书 Bot 配置（凭证 + 白名单 + 活动会话）
  loadConfig().then(async (stored) => {
    if (stored?.feishu) {
      const cfg = stored.feishu;
      feishu.node.config.allowFrom = Array.isArray(cfg.allowFrom) ? cfg.allowFrom : [];

      feishu.node._restoringConfig = (async () => {
        try {
          if (cfg.activeSessionId) {
            feishu.node.activeSessionId = cfg.activeSessionId;
            logger.info('dsh-bridge: restored feishu active session: %s', cfg.activeSessionId);
          } else {
            await feishu.node._pickDefaultSession().catch(() => {});
          }
        } finally {
          feishu.node._configRestored = true;
        }
      })();

      await feishu.node._restoringConfig;

      if (cfg.appId && cfg.appSecret) {
        feishu.gateway.updateConfig({
          appId: cfg.appId,
          appSecret: cfg.appSecret,
          domain: cfg.domain || 'feishu',
        });
        logger.info('dsh-bridge: loaded saved feishu bot config, starting gateway');
        await feishu.start().catch((err) => {
          logger.error('dsh-bridge: feishu auto-start failed: %s', err?.message ?? err);
        });
      }
    }
  }).catch(() => {});

  // 启动时读取已保存的 Telegram Bot 配置（凭证 + 代理 + 白名单 + 活动会话）
  loadConfig().then(async (stored) => {
    if (stored?.telegram) {
      const cfg = stored.telegram;
      telegram.node.config.allowFrom = Array.isArray(cfg.allowFrom) ? cfg.allowFrom : [];
      if (cfg.digestIntervalSec != null) telegram.node.config.digestIntervalSec = Number(cfg.digestIntervalSec);
      if (cfg.approvalTimeoutSec != null) telegram.node.config.approvalTimeoutSec = Number(cfg.approvalTimeoutSec);
      if (cfg.maxMessageChars != null) telegram.node.config.maxMessageChars = Number(cfg.maxMessageChars);
      if (cfg.sendChunkDelayMs != null) telegram.node.config.sendChunkDelayMs = Number(cfg.sendChunkDelayMs);

      telegram.node._restoringConfig = (async () => {
        try {
          if (cfg.activeSessionId) {
            telegram.node.activeSessionId = cfg.activeSessionId;
            logger.info('dsh-bridge: restored telegram active session: %s', cfg.activeSessionId);
          } else {
            await telegram.node._pickDefaultSession().catch(() => {});
          }
        } finally {
          telegram.node._configRestored = true;
        }
      })();

      await telegram.node._restoringConfig;

      if (cfg.botToken) {
        telegram.gateway.setCredentials({
          botToken: cfg.botToken,
          proxy: cfg.proxy || '',
        });
        logger.info('dsh-bridge: loaded saved telegram bot config, starting gateway');
        await telegram.start().catch((err) => {
          logger.error('dsh-bridge: telegram auto-start failed: %s', err?.message ?? err);
        });
      }
    }
  }).catch(() => {});

  const disposeRpc = installBridgeRpc(ctx, {
    service,
    authManager,
    wechat,
    qq,
    feishu,
    telegram,
    platformManager,
    logger,
    saveCustomTunnelConfig: async (serverUrl, accessToken) => {
      const stored = await loadConfig();
      stored.customTunnel = { serverUrl, accessToken };
      await saveConfig(stored);
      service.customTunnelConfig = { serverUrl, accessToken };
    },
  });

  // 代理随插件自动启动
  void service.startProxy().catch((err) => {
    logger.error('dsh-bridge: proxy start failed: %s', err?.message ?? err);
  });

  ctx.effect(() => async () => {
    try { disposeRpc(); } catch {}
    await wechat.destroy();
    await qq.destroy();
    await feishu.destroy();
    await telegram.destroy();
    platformManager.dispose();
    authManager.dispose();
    await service.dispose();
  }, 'dsh-bridge: stop wechat, qq, feishu, telegram, proxy, auth and tunnels');
}

export { name, inject, apply, ProxyServer, BridgeService, selectLanIPv4 };
