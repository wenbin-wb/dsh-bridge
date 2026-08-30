// DSH Bridge - Custom Tunnel Client
import { WebSocket } from 'ws';
import { request as httpRequest } from 'node:http';
import { connect as netConnect } from 'node:net';
import { gzipSync } from 'node:zlib';

const HEARTBEAT_INTERVAL = 30000;
const RECONNECT_DELAY = 5000;
const MAX_RECONNECT_ATTEMPTS = 5;

// 大响应 gzip 压缩阈值（超过此大小的可压缩响应将被 gzip）
const GZIP_THRESHOLD = 102400; // 100KB
// 可压缩的 content-type 前缀
const COMPRESSIBLE_TYPES = ['text/', 'application/json', 'application/javascript', 'application/xml'];

export class CustomTunnelClient {
  constructor({ serverUrl, accessToken, localPort, internalTunnelSecret, signal, onStateChange, logger }) {
    this.serverUrl = serverUrl;
    this.accessToken = accessToken;
    this.localPort = localPort;
    this.internalTunnelSecret = internalTunnelSecret;
    this.signal = signal;
    this.onStateChange = onStateChange;
    this.logger = logger;
    this.ws = null;
    this.publicUrl = null;
    this.connected = false;
    this.disconnecting = false;
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    this.localWsSockets = new Map(); // wsId -> net.Socket
  }

  async connect() {
    if (this.connected) return;
    this._setState('connecting', 'Connecting to tunnel server...');
    try {
      await this._connectWebSocket();
      this._startHeartbeat();
      this.reconnectAttempts = 0;
      this._setState('ready', 'Tunnel established');
    } catch (err) {
      this._setState('error', err.message);
      throw err;
    }
  }

  _connectWebSocket() {
    return new Promise((resolve, reject) => {
      if (this.signal?.aborted) return reject(new Error('Aborted'));

      const url = new URL(this.serverUrl);
      url.searchParams.set('token', this.accessToken);

      this.ws = new WebSocket(url.toString(), {
        handshakeTimeout: 10000,
        perMessageDeflate: {
          clientNoContextTakeover: true,
          serverNoContextTakeover: true,
          clientMaxWindowBits: 15,
          serverMaxWindowBits: 15,
        },
      });

      const onAbort = () => { this.ws?.terminate(); reject(new Error('Aborted')); };
      this.signal?.addEventListener('abort', onAbort);

      this.ws.on('open', () => {
        this.signal?.removeEventListener('abort', onAbort);
        this.logger?.info('Tunnel WebSocket connected');
      });

      this.ws.on('message', (data) => this._handleMessage(data));

      this.ws.on('close', (code, reason) => {
        this.connected = false;
        this._stopHeartbeat();
        this._cleanupLocalWs();
        if (!this.signal?.aborted) {
          this.logger?.warn('Tunnel disconnected: code=%d, reason=%s', code, reason.toString());
          this._scheduleReconnect();
        }
      });

      this.ws.on('error', (err) => {
        this.logger?.error('Tunnel WebSocket error: %s', err.message);
        if (!this.connected) {
          this.signal?.removeEventListener('abort', onAbort);
          reject(err);
        }
      });

      const readyHandler = (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'ready' && msg.publicUrl) {
            this.publicUrl = msg.publicUrl;
            this.connected = true;
            this.ws.off('message', readyHandler);
            this.signal?.removeEventListener('abort', onAbort);
            this.logger?.info('Tunnel ready: %s', this.publicUrl);
            resolve();
          }
        } catch {}
      };
      this.ws.on('message', readyHandler);

      setTimeout(() => {
        if (!this.connected) {
          this.signal?.removeEventListener('abort', onAbort);
          this.ws?.terminate();
          reject(new Error('Connection timeout'));
        }
      }, 15000);
    });
  }

  _handleMessage(data) {
    try {
      const msg = JSON.parse(data.toString());
      if      (msg.type === 'request')  this._handleHttpRequest(msg);
      else if (msg.type === 'ws-open')  this._handleWsOpen(msg);
      else if (msg.type === 'ws-frame') this._handleWsFrame(msg);
      else if (msg.type === 'ws-close') this._handleWsClose(msg);
      // pong: ignore
    } catch (err) {
      this.logger?.error('Failed to parse tunnel message: %s', err.message);
    }
  }

  // ── HTTP 请求代理 ─────────────────────────────────────────────────────────
  _handleHttpRequest(msg) {
    const { requestId, method, path, headers } = msg;
    const SKIP = new Set(['transfer-encoding','connection','keep-alive',
      'proxy-authenticate','proxy-authorization','te','trailer','upgrade']);
    const safeHeaders = Object.fromEntries(
      Object.entries(headers ?? {}).filter(([k]) => !SKIP.has(k.toLowerCase()))
    );

    const reqHeaders = { ...safeHeaders, host: `127.0.0.1:${this.localPort}` };
    if (this.internalTunnelSecret) {
      reqHeaders['x-dsh-internal-tunnel'] = this.internalTunnelSecret;
    }

    const req = httpRequest({
      host: '127.0.0.1', port: this.localPort,
      method, path: path || '/',
      headers: reqHeaders,
    }, (res) => {
      const contentType = String(res.headers['content-type'] ?? '');
      const isSSE = contentType.includes('text/event-stream');
      const chunks = [];

      if (isSSE) {
        // SSE 流式响应：隧道协议不支持流式，收集初始数据后立即返回
        // 避免 SSE 永不 end 导致隧道服务器超时返回 504
        let sseSent = false;
        const sseTimer = setTimeout(() => {
          if (sseSent) return;
          sseSent = true;
          const respHeaders = Object.fromEntries(
            Object.entries(res.headers).filter(([k]) => !SKIP.has(k.toLowerCase()))
          );
          this._sendMessage({
            type: 'response', requestId,
            statusCode: res.statusCode, headers: respHeaders,
            body: Buffer.concat(chunks).toString('base64'),
          });
          res.destroy();
        }, 500);

        res.on('data', (c) => {
          if (sseSent) return;
          chunks.push(c);
          // 收到初始数据后立即发送（不等超时）
          if (chunks.length >= 2) {
            clearTimeout(sseTimer);
            sseSent = true;
            const respHeaders = Object.fromEntries(
              Object.entries(res.headers).filter(([k]) => !SKIP.has(k.toLowerCase()))
            );
            this._sendMessage({
              type: 'response', requestId,
              statusCode: res.statusCode, headers: respHeaders,
              body: Buffer.concat(chunks).toString('base64'),
            });
            res.destroy();
          }
        });
        res.on('error', () => {
          if (!sseSent) {
            clearTimeout(sseTimer);
            this._sendMessage({
              type: 'response', requestId, statusCode: 502,
              headers: { 'content-type': 'text/plain' },
              body: Buffer.from('Response Error').toString('base64'),
            });
          }
        });
        res.on('end', () => {
          if (!sseSent) {
            clearTimeout(sseTimer);
            sseSent = true;
            const respHeaders = Object.fromEntries(
              Object.entries(res.headers).filter(([k]) => !SKIP.has(k.toLowerCase()))
            );
            this._sendMessage({
              type: 'response', requestId,
              statusCode: res.statusCode, headers: respHeaders,
              body: Buffer.concat(chunks).toString('base64'),
            });
          }
        });
        return;
      }

      res.on('data', (c) => chunks.push(c));
      res.on('error', () => {
        this._sendMessage({
          type: 'response', requestId, statusCode: 502,
          headers: { 'content-type': 'text/plain' },
          body: Buffer.from('Response Error').toString('base64'),
        });
      });
      res.on('end', () => {
        const respHeaders = Object.fromEntries(
          Object.entries(res.headers).filter(([k]) => !SKIP.has(k.toLowerCase()))
        );
        let bodyBuf = Buffer.concat(chunks);

        // session.list 响应可能极大（数百会话 × contextHeaders = 60MB+）
        // 剥离 contextHeaders 和 contextTimeline（侧边栏列表不需要，打开会话时通过 WebSocket 实时获取）
        const cleanPath = String(path || '').split('?')[0];
        if (cleanPath === '/api/session.list' && res.statusCode === 200) {
          try {
            const json = JSON.parse(bodyBuf.toString('utf8'));
            if (json?.result?.ok && json.result.value?.items) {
              for (const item of json.result.value.items) {
                const proj = item?.projections?.values;
                if (proj) {
                  delete proj.contextHeaders;
                  delete proj.contextTimeline;
                }
              }
              bodyBuf = Buffer.from(JSON.stringify(json), 'utf8');
              respHeaders['content-length'] = String(bodyBuf.length);
            }
          } catch {} // 解析失败则原样发送
        }

        // 大响应 gzip 压缩：减少隧道 WebSocket 传输量
        const respCt = String(res.headers['content-type'] ?? '').toLowerCase();
        const alreadyEncoded = String(res.headers['content-encoding'] ?? '').toLowerCase();
        const compressible = COMPRESSIBLE_TYPES.some((t) => respCt.startsWith(t));
        if (bodyBuf.length > GZIP_THRESHOLD && compressible && !alreadyEncoded) {
          bodyBuf = gzipSync(bodyBuf);
          respHeaders['content-encoding'] = 'gzip';
          respHeaders['content-length'] = String(bodyBuf.length);
        }

        this._sendMessage({
          type: 'response', requestId,
          statusCode: res.statusCode, headers: respHeaders,
          body: bodyBuf.toString('base64'),
        });
      });
    });
    req.on('error', err => {
      this._sendMessage({ type: 'response', requestId, statusCode: 502,
        headers: { 'content-type': 'text/plain' },
        body: Buffer.from(`Bad Gateway: ${err.message}`).toString('base64') });
    });
    if (msg.body) req.write(Buffer.from(msg.body, 'base64'));
    req.end();
  }

  // ── WebSocket 升级代理 ────────────────────────────────────────────────────
  // 服务端通知有浏览器要建 WebSocket，用裸 TCP 连本地 DSH 完成握手再转发帧
  _handleWsOpen(msg) {
    const { wsId, path, headers } = msg;

    const sock = netConnect({ host: '127.0.0.1', port: this.localPort });
    this.localWsSockets.set(wsId, sock);

    // 构造 HTTP Upgrade 请求
    const reqHeaders = { ...headers, host: `127.0.0.1:${this.localPort}` };
    delete reqHeaders['proxy-connection'];
    delete reqHeaders['proxy-authorization'];
    if (this.internalTunnelSecret) {
      reqHeaders['x-dsh-internal-tunnel'] = this.internalTunnelSecret;
    }

    const lines = [`GET ${path || '/'} HTTP/1.1`];
    for (const [k, v] of Object.entries(reqHeaders)) lines.push(`${k}: ${v}`);
    lines.push('', '');
    sock.write(lines.join('\r\n'));

    let headerBuf = '';
    let upgraded = false;

    sock.on('data', (chunk) => {
      if (upgraded) {
        this._sendMessage({ type: 'ws-frame', wsId, data: chunk.toString('base64') });
        return;
      }
      headerBuf += chunk.toString('binary');
      const sep = headerBuf.indexOf('\r\n\r\n');
      if (sep === -1) return;

      upgraded = true;
      const replyHeaders = {};
      const headerLines = headerBuf.slice(0, sep).split('\r\n');
      for (let i = 1; i < headerLines.length; i++) {
        const ci = headerLines[i].indexOf(':');
        if (ci > 0) {
          replyHeaders[headerLines[i].slice(0, ci).trim().toLowerCase()] =
            headerLines[i].slice(ci + 1).trim();
        }
      }
      this._sendMessage({ type: 'ws-accept', wsId, replyHeaders });

      // 握手后紧跟的帧数据
      const rest = headerBuf.slice(sep + 4);
      if (rest.length > 0) {
        this._sendMessage({ type: 'ws-frame', wsId, data: Buffer.from(rest, 'binary').toString('base64') });
      }
    });

    sock.on('close', () => {
      this._sendMessage({ type: 'ws-close', wsId });
      this.localWsSockets.delete(wsId);
    });
    sock.on('error', (err) => {
      this.logger?.error('Local WS socket error wsId=%s: %s', wsId, err.message);
      this._sendMessage({ type: 'ws-close', wsId });
      this.localWsSockets.delete(wsId);
    });
  }

  _handleWsFrame(msg) {
    const sock = this.localWsSockets.get(msg.wsId);
    if (sock && !sock.destroyed) sock.write(Buffer.from(msg.data, 'base64'));
  }

  _handleWsClose(msg) {
    const sock = this.localWsSockets.get(msg.wsId);
    if (sock) { sock.destroy(); this.localWsSockets.delete(msg.wsId); }
  }

  _cleanupLocalWs() {
    for (const [, sock] of this.localWsSockets) sock.destroy();
    this.localWsSockets.clear();
  }

  // ── 工具方法 ──────────────────────────────────────────────────────────────
  _sendMessage(msg) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  _startHeartbeat() {
    this._stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.connected) this._sendMessage({ type: 'ping' });
    }, HEARTBEAT_INTERVAL);
  }

  _stopHeartbeat() {
    if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null; }
  }

  _scheduleReconnect() {
    if (this.signal?.aborted || this.disconnecting) return;
    if (this.reconnectTimer) return;
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      this._setState('error', `Failed to reconnect after ${MAX_RECONNECT_ATTEMPTS} attempts`);
      return;
    }
    this.reconnectAttempts++;
    const delay = RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts - 1);
    this._setState('reconnecting', `Reconnecting in ${Math.round(delay / 1000)}s (attempt ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch(() => {});
    }, delay);
  }

  _setState(phase, detail) {
    if (this.onStateChange) this.onStateChange({ phase, detail });
  }

  disconnect() {
    this.disconnecting = true;
    this._stopHeartbeat();
    this._cleanupLocalWs();
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    if (this.ws) { this.ws.close(); this.ws = null; }
    this.connected = false;
    this.publicUrl = null;
    this.logger?.info('Tunnel disconnected');
  }
}
