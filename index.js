// DSH Bridge - Host Plugin
// Multi-channel access bridge for remote tunnels and bot integrations

import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import QRCode from 'qrcode';
import { installBridgeRpc } from './lib/bridge-rpc.js';
import { CustomTunnelClient } from './lib/tunnel-client.mjs';
import { CloudflaredManager } from './lib/cloudflared-manager.mjs';

const name = 'dsh-bridge';
const VERSION = '1.0.0';

/**
 * Get best LAN IP address with intelligent scoring
 */
function getBestLanIp() {
  const interfaces = networkInterfaces();
  let best = null;
  let bestScore = -1;
  
  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;
    
    for (const addr of addrs) {
      if (addr.family !== 'IPv4' || addr.internal) continue;
      
      let score = 0;
      
      // Prefer private ranges
      if (addr.address.startsWith('192.168.')) score += 100;
      else if (addr.address.startsWith('10.')) score += 90;
      else if (addr.address.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)) score += 90;
      
      // Prefer non-virtual interfaces
      if (!name.toLowerCase().includes('virtual')) score += 50;
      if (!name.toLowerCase().includes('vmware')) score += 50;
      if (!name.toLowerCase().includes('vbox')) score += 50;
      
      // Prefer ethernet over wifi
      if (name.toLowerCase().includes('eth')) score += 20;
      else if (name.toLowerCase().includes('en')) score += 10;
      
      if (score > bestScore) {
        bestScore = score;
        best = addr.address;
      }
    }
  }
  
  return best;
}

/**
 * QR code cache with TTL
 */
class QRCodeCache {
  constructor(ttl = 30 * 60 * 1000, maxSize = 50) {
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
    
    // Cleanup old entries
    if (this.cache.size > this.maxSize) {
      const oldest = Array.from(this.cache.entries())
        .sort((a, b) => a[1].time - b[1].time)[0];
      this.cache.delete(oldest[0]);
    }
    
    return qr;
  }
  
  clear() {
    this.cache.clear();
  }
}

/**
 * Bridge Service - orchestrates all access channels
 */
class BridgeService {
  constructor(ctx, config) {
    this.ctx = ctx;
    this.config = config;
    this.logger = ctx.logger(name);
    this.qrCache = new QRCodeCache();
    
    // State
    this.proxyServer = null;
    this.proxyRunning = false;
    this.activeConnections = 0;
    
    this.customTunnel = null;
    this.customTunnelState = { phase: 'idle', detail: '' };
    
    this.cloudflared = null;
    this.cloudflaredState = { phase: 'idle', detail: '' };
  }
  
  async start() {
    this.logger.info('Starting DSH Bridge v%s', VERSION);
    
    // Start proxy server
    await this.startProxyServer();
    
    this.logger.info('DSH Bridge ready');
  }
  
  async startProxyServer() {
    if (this.proxyRunning) return;
    
    const proxyPort = this.config.proxy?.port || 3082;
    const dshPort = this.config.dshPort || 3080;
    
    this.proxyServer = createServer((req, res) => {
      this.activeConnections++;
      
      const proxy = require('node:http').request({
        host: '127.0.0.1',
        port: dshPort,
        method: req.method,
        path: req.url,
        headers: {
          ...req.headers,
          host: `127.0.0.1:${dshPort}`,
        },
      }, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
        
        proxyRes.on('end', () => {
          this.activeConnections--;
        });
      });
      
      proxy.on('error', (err) => {
        this.logger.error('Proxy request failed: %s', err.message);
        this.activeConnections--;
        
        if (!res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'text/plain' });
        }
        res.end('Bad Gateway');
      });
      
      req.pipe(proxy);
    });
    
    await new Promise((resolve, reject) => {
      this.proxyServer.listen(proxyPort, '0.0.0.0', (err) => {
        if (err) return reject(err);
        this.proxyRunning = true;
        this.logger.info('Proxy server listening on 0.0.0.0:%d -> 127.0.0.1:%d', proxyPort, dshPort);
        resolve();
      });
    });
  }
  
  async stopProxyServer() {
    if (!this.proxyServer) return;
    
    await new Promise((resolve) => {
      this.proxyServer.close(() => {
        this.proxyRunning = false;
        this.logger.info('Proxy server stopped');
        resolve();
      });
    });
    
    this.proxyServer = null;
  }
  
  async getStatus() {
    const proxyPort = this.config.proxy?.port || 3082;
    const lanIp = getBestLanIp();
    const lanUrl = lanIp ? `http://${lanIp}:${proxyPort}` : null;
    
    return {
      version: VERSION,
      
      // Proxy server
      proxy: {
        running: this.proxyRunning,
        port: proxyPort,
        activeConnections: this.activeConnections,
      },
      
      // LAN access
      lan: {
        ip: lanIp,
        url: lanUrl,
        qr: lanUrl ? await this.qrCache.get(lanUrl) : null,
      },
      
      // Cloudflared tunnel
      cloudflared: {
        running: !!this.cloudflared,
        url: this.cloudflared?.url || null,
        qr: this.cloudflared?.url ? await this.qrCache.get(this.cloudflared.url) : null,
        state: this.cloudflaredState,
      },
      
      // Custom tunnel
      customTunnel: {
        running: !!this.customTunnel?.connected,
        configured: !!(this.config.customTunnel?.serverUrl && this.config.customTunnel?.accessToken),
        url: this.customTunnel?.publicUrl || null,
        qr: this.customTunnel?.publicUrl ? await this.qrCache.get(this.customTunnel.publicUrl) : null,
        state: this.customTunnelState,
      },
    };
  }
  
  async startCustomTunnel() {
    if (this.customTunnel) {
      throw new Error('Custom tunnel already running');
    }
    
    const { serverUrl, accessToken } = this.config.customTunnel || {};
    if (!serverUrl || !accessToken) {
      throw new Error('Custom tunnel not configured (serverUrl and accessToken required)');
    }
    
    const proxyPort = this.config.proxy?.port || 3082;
    const signal = this.ctx.effect(() => {
      this.stopCustomTunnel();
    });
    
    this.customTunnel = new CustomTunnelClient({
      serverUrl,
      accessToken,
      localPort: proxyPort,
      signal,
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
      throw new Error('Cloudflared already running');
    }
    
    const proxyPort = this.config.proxy?.port || 3082;
    const home = this.config.home;
    const signal = this.ctx.effect(() => {
      this.stopCloudflared();
    });
    
    this.cloudflared = new CloudflaredManager({
      port: proxyPort,
      home,
      signal,
      onStateChange: (state) => {
        this.cloudflaredState = state;
      },
      logger: this.logger,
    });
    
    await this.cloudflared.start();
  }
  
  stopCloudflared() {
    if (this.cloudflared) {
      this.cloudflared.stop();
      this.cloudflared = null;
      this.cloudflaredState = { phase: 'idle', detail: '' };
    }
  }
  
  async stop() {
    this.logger.info('Stopping DSH Bridge');
    
    this.stopCustomTunnel();
    this.stopCloudflared();
    await this.stopProxyServer();
    this.qrCache.clear();
  }
}

/**
 * Plugin entry point
 */
export function apply(ctx, config) {
  const logger = ctx.logger(name);
  
  // Merge config with environment variables
  const finalConfig = {
    dshPort: parseInt(process.env.DSH_PORT) || config.dshPort || 3080,
    proxy: {
      port: parseInt(process.env.DSH_BRIDGE_PROXY_PORT) || config.proxy?.port || 3082,
    },
    customTunnel: {
      serverUrl: process.env.DSH_BRIDGE_SERVER || config.customTunnel?.serverUrl,
      accessToken: process.env.DSH_BRIDGE_TOKEN || config.customTunnel?.accessToken,
    },
    home: config.home,
  };
  
  logger.info('Configuration loaded');
  logger.debug('Config: %o', { ...finalConfig, customTunnel: { ...finalConfig.customTunnel, accessToken: '***' } });
  
  // Create service
  const service = new BridgeService(ctx, finalConfig);
  
  // Provide service
  ctx.provide('bridge', service);
  
  // Install RPC handlers
  const disposeRpc = installBridgeRpc(ctx, { service, logger });
  ctx.accept(() => disposeRpc, { immediate: true });
  
  // Start service
  ctx.on('ready', async () => {
    await service.start();
  });
  
  // Stop on dispose
  ctx.on('dispose', async () => {
    await service.stop();
  });
}

export { name };
