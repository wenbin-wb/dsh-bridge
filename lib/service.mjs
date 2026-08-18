// dsh-remote 服务层 - 管理代理和多种隧道方式
//
// 功能:
// 1. 局域网代理 (0.0.0.0:3082 -> 127.0.0.1:3080)
// 2. 自建服务器反向隧道 (WebSocket) - 新增选项
// 3. cloudflared 隧道支持 (共存,由用户选择)
// 4. Token 验证

import { networkInterfaces } from 'node:os';
import { createRequire } from 'node:module';
import { createRemoteProxy } from './proxy.mjs';
import { startReverseTunnel } from './reverse-tunnel.mjs';
import { startCloudflaredTunnel } from './cloudflared.mjs';

const require = createRequire(import.meta.url);

/** URL → 二维码 data URL */
export async function qrDataUrl(text, { width = 220, margin = 1 } = {}) {
  const QRCode = require('qrcode');
  return QRCode.toDataURL(text, { errorCorrectionLevel: 'M', margin, width, type: 'image/png' });
}

/** RFC1918 私网地址 */
const PRIVATE_IPV4_RE = /^(?:10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/;

/** 物理网卡接口 */
const PHYSICAL_IFACE_RE = /^(?:wlan|wi-?fi|wireless|ethernet|eth\d|en\d|wlp\d|以太网|本地连接)/i;

/** VPN / 虚拟网卡 */
const VPN_IFACE_RE = /(?:radmin|tailscale|zerotier|tun|tap|vpn|vethernet|virtual|vmware|virtualbox|wsl|docker|teredo|hamachi|bluetooth|bridge)/i;

/**
 * 选择最可能可达的局域网 IPv4
 */
export function selectLanIPv4(interfaces) {
  const candidates = [];
  for (const [name, addrs] of Object.entries(interfaces ?? {})) {
    for (const addr of addrs ?? []) {
      if (addr.family !== 'IPv4' || addr.internal) continue;
      const ip = addr.address;
      if (!ip || ip.startsWith('127.') || ip.startsWith('169.254.')) continue;

      let score = 0;
      if (PRIVATE_IPV4_RE.test(ip)) score += 100;
      if (PHYSICAL_IFACE_RE.test(name)) score += 20;
      else if (VPN_IFACE_RE.test(name)) score -= 50;

      candidates.push({ ip, score, order: candidates.length });
    }
  }

  candidates.sort((a, b) => b.score - a.score || a.order - b.order);
  return candidates[0]?.ip ?? null;
}

function lanIPv4() {
  return selectLanIPv4(networkInterfaces());
}

/**
 * 创建 Remote 服务
 */
export function createRemoteService({
  dshPort,
  port = 3082,
  serverUrl,
  accessToken,
  home,
  internals = {},
} = {}) {
  const createProxy = internals.createProxy ?? createRemoteProxy;
  const startReverse = internals.startReverseTunnel ?? startReverseTunnel;
  const startCloudflared = internals.startCloudflared ?? startCloudflaredTunnel;
  const getLan = internals.lanIPv4 ?? lanIPv4;

  let proxy = null;
  
  // 自建服务器隧道
  let reverseTunnel = null;
  let reverseTunnelAbort = null;
  let reverseTunnelPromise = null;
  const reverseTunnelState = { 
    phase: 'idle', 
    detail: '', 
    startedAt: null,
    publicUrl: null 
  };
  
  // cloudflared 隧道
  let cloudflaredTunnel = null;
  let cloudflaredAbort = null;
  let cloudflaredPromise = null;
  const cloudflaredState = {
    phase: 'idle',
    detail: '',
    startedAt: null,
    publicUrl: null
  };
  
  /** 二维码缓存 */
  const qrCache = new Map();
  const encodeQr = internals.encodeQr ?? qrDataUrl;
  
  async function qrCached(text) {
    if (!text) return null;
    if (!qrCache.has(text)) {
      if (qrCache.size >= 10) {
        const oldest = qrCache.keys().next().value;
        qrCache.delete(oldest);
      }
      qrCache.set(text, encodeQr(text).catch(() => null));
    }
    return qrCache.get(text);
  }

  return {
    dshPort,
    
    /** 启动局域网代理 (幂等) */
    async startProxy() {
      if (proxy) return proxy;
      let lastErr = null;
      
      for (let p = port; p < port + 10; p++) {
        try {
          proxy = await createProxy({
            port: p,
            host: '0.0.0.0',
            upstream: { host: '127.0.0.1', port: dshPort },
            accessToken,
          });
          if (p !== port) {
            console.log(`dsh-remote: port ${port} busy, proxy on ${p} | 端口 ${port} 被占用，代理改用 ${p}`);
          }
          break;
        } catch (err) {
          if (err?.code !== 'EADDRINUSE') throw err;
          lastErr = err;
        }
      }
      
      if (!proxy) throw lastErr ?? new Error('proxy start failed | 代理启动失败');
      return proxy;
    },

    /** 启动自建服务器反向隧道 (幂等) */
    async startReverseTunnel() {
      if (!serverUrl) {
        throw new Error('serverUrl not configured | 未配置服务器地址');
      }
      if (!accessToken) {
        throw new Error('accessToken not configured | 未配置访问令牌');
      }
      
      await this.startProxy();
      if (reverseTunnel) return reverseTunnel.publicUrl;
      if (reverseTunnelPromise) return reverseTunnelPromise;
      
      const controller = new AbortController();
      reverseTunnelAbort = controller;
      reverseTunnelState.startedAt = Date.now();
      
      const onPhase = (phase, detail) => {
        reverseTunnelState.phase = phase;
        reverseTunnelState.detail = detail || '';
      };

      reverseTunnelPromise = (async () => {
        try {
          onPhase('connecting', '连接到自建服务器... | connecting to custom server...');
          
          const result = await startReverse({
            serverUrl,
            accessToken,
            localPort: proxy.port,
            signal: controller.signal,
            onPhase,
          });
          
          reverseTunnel = result;
          reverseTunnelState.phase = 'ready';
          reverseTunnelState.publicUrl = result.publicUrl;
          reverseTunnelState.detail = '自建服务器隧道就绪 | custom server tunnel ready';
          
          result.onClose?.(() => {
            if (controller.signal.aborted) return;
            reverseTunnelState.phase = 'error';
            reverseTunnelState.detail = '隧道连接断开 | tunnel disconnected';
          });
          
          return result.publicUrl;
        } catch (err) {
          if (!controller.signal.aborted) {
            reverseTunnelState.phase = 'error';
            reverseTunnelState.detail = err?.message ?? String(err);
          }
          reverseTunnelState.startedAt = null;
          throw err;
        } finally {
          if (reverseTunnelPromise === p) reverseTunnelPromise = null;
        }
      })();
      
      const p = reverseTunnelPromise;
      return reverseTunnelPromise;
    },

    /** 停止自建服务器隧道 */
    stopReverseTunnel() {
      reverseTunnelAbort?.abort();
      reverseTunnelAbort = null;
      reverseTunnelPromise = null;
      
      if (reverseTunnel) {
        reverseTunnel.close?.();
        reverseTunnel = null;
      }
      
      reverseTunnelState.phase = 'idle';
      reverseTunnelState.detail = '';
      reverseTunnelState.startedAt = null;
      reverseTunnelState.publicUrl = null;
    },

    /** 启动 cloudflared 隧道 (幂等) */
    async startCloudflaredTunnel() {
      await this.startProxy();
      if (cloudflaredTunnel) return cloudflaredTunnel.url;
      if (cloudflaredPromise) return cloudflaredPromise;
      
      const controller = new AbortController();
      cloudflaredAbort = controller;
      cloudflaredState.startedAt = Date.now();
      
      const onPhase = (phase) => {
        cloudflaredState.phase = phase;
        if (phase === 'downloading') {
          cloudflaredState.detail = '首次下载 cloudflared（约 20MB）| downloading cloudflared (~20MB)';
        } else if (phase === 'starting') {
          cloudflaredState.detail = '启动隧道进程... | starting tunnel...';
        } else if (phase === 'registering') {
          cloudflaredState.detail = '连接 Cloudflare 边缘... | connecting to Cloudflare edge...';
        } else if (phase === 'ready') {
          cloudflaredState.detail = 'Cloudflare 隧道就绪 | cloudflare tunnel ready';
        }
      };

      cloudflaredPromise = (async () => {
        try {
          const result = await startCloudflared({ 
            port: proxy.port, 
            home, 
            signal: controller.signal, 
            onPhase 
          });
          
          cloudflaredTunnel = typeof result === 'string' ? { url: result, kill: () => {} } : result;
          cloudflaredState.phase = 'ready';
          cloudflaredState.publicUrl = cloudflaredTunnel.url;
          
          cloudflaredTunnel.onExit?.((code) => {
            if (controller.signal.aborted) return;
            cloudflaredState.phase = 'error';
            cloudflaredState.detail = `隧道进程退出（code=${code}）| tunnel process exited`;
          });
          
          return cloudflaredTunnel.url;
        } catch (err) {
          if (!controller.signal.aborted) {
            cloudflaredState.phase = 'error';
            cloudflaredState.detail = err?.message ?? String(err);
          }
          cloudflaredState.startedAt = null;
          throw err;
        } finally {
          if (cloudflaredPromise === p) cloudflaredPromise = null;
        }
      })();
      
      const p = cloudflaredPromise;
      return cloudflaredPromise;
    },

    /** 停止 cloudflared 隧道 */
    stopCloudflaredTunnel() {
      cloudflaredAbort?.abort();
      cloudflaredAbort = null;
      cloudflaredPromise = null;
      
      if (cloudflaredTunnel) {
        cloudflaredTunnel.kill?.();
        cloudflaredTunnel = null;
      }
      
      cloudflaredState.phase = 'idle';
      cloudflaredState.detail = '';
      cloudflaredState.startedAt = null;
      cloudflaredState.publicUrl = null;
    },

    /** 状态快照 */
    async status() {
      const lan = getLan();
      const proxyPort = proxy?.port ?? null;
      const lanUrl = lan && proxyPort ? `http://${lan}:${proxyPort}` : null;
      
      return {
        // 代理状态
        proxyRunning: proxy !== null,
        proxyPort,
        lanUrl,
        lanQr: await qrCached(lanUrl),
        dshPort,
        
        // 自建服务器隧道状态
        reverseTunnelRunning: reverseTunnel !== null,
        reverseTunnelUrl: reverseTunnelState.publicUrl,
        reverseTunnelQr: await qrCached(reverseTunnelState.publicUrl),
        reverseTunnelState: { ...reverseTunnelState },
        serverConfigured: !!serverUrl,
        tokenConfigured: !!accessToken,
        
        // cloudflared 隧道状态
        cloudflaredRunning: cloudflaredTunnel !== null,
        cloudflaredUrl: cloudflaredState.publicUrl,
        cloudflaredQr: await qrCached(cloudflaredState.publicUrl),
        cloudflaredState: { ...cloudflaredState },
      };
    },

    /** 清理资源 */
    async dispose() {
      this.stopReverseTunnel();
      this.stopCloudflaredTunnel();
      
      if (proxy) {
        const p = proxy;
        proxy = null;
        try { await p.close(); } catch { /* 忽略 */ }
      }
    },
  };
}
