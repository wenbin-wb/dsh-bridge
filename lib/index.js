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
import QRCode from 'qrcode';
import { installBridgeRpc } from './bridge-rpc.js';
import { CustomTunnelClient } from './tunnel-client.mjs';
import { CloudflaredManager } from './cloudflared-manager.mjs';
import { PlatformManager } from './platform/manager.js';
import { WechatService } from './wechat/index.js';

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
 * 非安全上下文（http://LAN-IP:端口）里浏览器没有 crypto.randomUUID，
 * DSH 连接层 mint RPC id 时会抛错，注入 polyfill 修复。
 */
const RANDOM_UUID_POLYFILL = `<script data-dsh-bridge-polyfill="1">!function(){try{if(self.crypto&&!self.crypto.randomUUID){self.crypto.randomUUID=function(){var b=new Uint8Array(16);self.crypto.getRandomValues(b);b[6]=b[6]&15|64;b[8]=b[8]&63|128;var h="";for(var i=0;i<16;i++){var x=b[i].toString(16);h+=(x.length<2?"0":"")+x;if(i===3||i===5||i===7||i===9)h+="-";}return h;}}}catch(e){}}();</script>`;
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
 * HTTP + WebSocket 代理服务器
 * 关键：改写 Host + Origin，注入 crypto.randomUUID polyfill
 * 否则手机通过局域网访问时 DSH 会把它当未登录的外部请求处理
 */
class ProxyServer {
  constructor({ localPort, targetPort, logger }) {
    this.localPort = localPort;
    this.targetPort = targetPort;
    this.logger = logger;
    this.server = null;
    this.clientSockets = new Set();
    this.activeConnections = 0;
  }

  async start() {
    if (this.server) return;

    this.server = createServer((req, res) => {
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
                html = html.replace(/<head[^>]*>/i, (m) => `${m}${RANDOM_UUID_POLYFILL}`);
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

    // WebSocket upgrade（DSH 的 /api/events.mux 等流式通道）
    this.server.on('upgrade', (req, socket, head) => {
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
  constructor({ dshPort, proxyPort, home, customTunnelConfig, logger }) {
    this.dshPort = dshPort;
    this.proxyPort = proxyPort;
    this.home = home;
    this.customTunnelConfig = customTunnelConfig ?? null;
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
      logger: this.logger,
    });

    await this.proxy.start();
    return this.proxy;
  }

  async getStatus() {
    const lanIp = selectLanIPv4();
    const lanUrl = lanIp ? `http://${lanIp}:${this.proxyPort}` : null;

    return {
      version: VERSION,

      proxy: {
        running: !!this.proxy,
        port: this.proxyPort,
        activeConnections: this.proxy?.activeConnections ?? 0,
      },

      lan: {
        ip: lanIp,
        url: lanUrl,
        qr: lanUrl ? await this.qrCache.get(lanUrl) : null,
      },

      cloudflared: {
        running: !!this.cloudflared,
        url: this.cloudflared?.url || null,
        qr: this.cloudflared?.url
          ? await this.qrCache.get(this.cloudflared.url)
          : null,
        state: this.cloudflaredState,
      },

      customTunnel: {
        configured: !!(this.customTunnelConfig?.serverUrl && this.customTunnelConfig?.accessToken),
        serverUrl: this.customTunnelConfig?.serverUrl ?? '',
        running: !!this.customTunnel?.connected,
        url: this.customTunnel?.publicUrl || null,
        qr: this.customTunnel?.publicUrl
          ? await this.qrCache.get(this.customTunnel.publicUrl)
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

  // 检查 npm 上是否有新版本
  async checkVersion() {
    return new Promise((resolve) => {
      const req = httpsGet('https://registry.npmjs.org/@wenbin_wb/dsh-bridge/latest', { timeout: 8000 }, (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          try {
            const data = JSON.parse(Buffer.concat(chunks).toString());
            resolve({ current: VERSION, latest: data.version ?? null });
          } catch {
            resolve({ current: VERSION, latest: null, error: '解析失败' });
          }
        });
      });
      req.on('error', (e) => resolve({ current: VERSION, latest: null, error: e.message }));
      req.on('timeout', () => { req.destroy(); resolve({ current: VERSION, latest: null, error: '超时' }); });
    });
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

  // 从 JSON 文件读取持久化配置
  async function loadConfig() {
    try {
      const raw = await readFile(configFile, 'utf8');
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  // 持久化配置到 JSON 文件
  async function saveConfig(data) {
    await mkdir(join(dshHome, 'dsh-bridge'), { recursive: true });
    await writeFile(configFile, JSON.stringify(data, null, 2), 'utf8');
  }

  const service = new BridgeService({
    dshPort,
    proxyPort,
    home: config.home,
    customTunnelConfig: config.customTunnel ?? null,
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

  // 启动时读取已保存的微信 Bot 配置（凭证 + 白名单 + 活动会话）
  loadConfig().then((stored) => {
    if (stored?.wechat) {
      const cfg = stored.wechat;
      wechat.node.config.allowFrom = Array.isArray(cfg.allowFrom) ? cfg.allowFrom : [];
      // 恢复活动会话 ID（直接覆盖，不判断当前值）
      if (cfg.activeSessionId) {
        wechat.node.activeSessionId = cfg.activeSessionId;
        logger.info('dsh-bridge: restored wechat active session: %s', cfg.activeSessionId);
      } else {
        // 没有持久化的会话时，回退到选第一个
        wechat.node._pickDefaultSession().catch(() => {});
      }
      if (cfg.token && cfg.accountId) {
        wechat.gateway.setCredentials({
          token: cfg.token,
          accountId: cfg.accountId,
          baseUrl: cfg.baseUrl,
        });
        logger.info('dsh-bridge: loaded saved wechat bot config, starting polling');
      }
    }
  }).catch(() => {});

  const disposeRpc = installBridgeRpc(ctx, {
    service,
    wechat,
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
    platformManager.dispose();
    await service.dispose();
  }, 'dsh-bridge: stop wechat, proxy and tunnels');
}

export { name, inject, apply };
