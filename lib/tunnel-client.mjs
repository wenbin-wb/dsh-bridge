// DSH Bridge - Custom Tunnel Client
import { WebSocket } from 'ws';
import { request as httpRequest } from 'node:http';
import { connect as netConnect } from 'node:net';
import { promisify } from 'node:util';
import { gzip as gzipCallback } from 'node:zlib';
import { randomBytes as cryptoRandomBytes } from 'node:crypto';
import { stripSessionProjections } from './session-strip.js';

const gzipAsync = promisify(gzipCallback);

const HEARTBEAT_INTERVAL = 30000;
const RECONNECT_DELAY = 5000;
const MAX_RECONNECT_ATTEMPTS = 5;

// 单响应内存上限：隧道把整个 body 缓冲进内存再 base64 传输，无上限会在大文件
// 下载时把进程内存拖垮（一份 body 三份内存：chunks + Buffer + base64 字符串）
const MAX_RESPONSE_BYTES = 32 * 1024 * 1024; // 32MB

// 大响应 gzip 压缩阈值（超过此大小的可压缩响应将被 gzip）
const GZIP_THRESHOLD = 102400; // 100KB
// 可压缩的 content-type 前缀
const COMPRESSIBLE_TYPES = ['text/', 'application/json', 'application/javascript', 'application/xml'];

export class CustomTunnelClient {
  constructor({ serverUrl, accessToken, localPort, internalTunnelSecret, signal, onStateChange, logger, sseStreaming = false }) {
    this.serverUrl = serverUrl;
    this.accessToken = accessToken;
    this.localPort = localPort;
    this.internalTunnelSecret = internalTunnelSecret;
    this.signal = signal;
    this.onStateChange = onStateChange;
    this.logger = logger;
    this.sseStreaming = sseStreaming;
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
        if (this.sseStreaming) {
          // ── 流式模式（需服务端支持 response-start/chunk/end 协议）──
          // 逐 chunk 转发，SSE 长连接持续保持，浏览器端不会断连重连
          const respHeaders = Object.fromEntries(
            Object.entries(res.headers).filter(([k]) => !SKIP.has(k.toLowerCase()))
          );
          this._sendMessage({
            type: 'response-start', requestId,
            statusCode: res.statusCode, headers: respHeaders,
          });
          res.on('data', (c) => {
            this._sendMessage({
              type: 'response-chunk', requestId,
              body: c.toString('base64'),
            });
          });
          res.on('error', () => {
            this._sendMessage({ type: 'response-end', requestId });
          });
          res.on('end', () => {
            this._sendMessage({ type: 'response-end', requestId });
          });
          return;
        }

        // ── 截断模式（默认，兼容老服务端）──
        // 收集初始数据后立即返回，避免 SSE 永不 end 导致隧道服务器超时 504
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

      let responded = false;
      const sendResponse = (statusCode, headers, body) => {
        if (responded) return;
        responded = true;
        this._sendMessage({
          type: 'response', requestId, statusCode, headers,
          body: Buffer.from(body).toString('base64'),
        });
      };

      let total = 0;
      const cleanPath = String(path || '').split('?')[0];
      // session.list 会在 end 后剥离 contextHeaders 等大字段，跳过 data 阶段的大小检查
      const skipSizeCheck = cleanPath === '/api/session.list';
      res.on('data', (c) => {
        chunks.push(c);
        total += c.length;
        if (!skipSizeCheck && total > MAX_RESPONSE_BYTES) {
          sendResponse(502, { 'content-type': 'text/plain' },
            `Response too large for tunnel (>${Math.round(MAX_RESPONSE_BYTES / 1024 / 1024)}MB cap)`);
          res.destroy();
        }
      });
      res.on('error', () => {
        sendResponse(502, { 'content-type': 'text/plain' }, 'Response Error');
      });
      res.on('end', () => {
        if (responded) return;
        const respHeaders = Object.fromEntries(
          Object.entries(res.headers).filter(([k]) => !SKIP.has(k.toLowerCase()))
        );
        let bodyBuf = Buffer.concat(chunks);

        // 剥离 session.list / session.history 的 contextHeaders 投影（无 UI 读取的大字段）
        // 传入 content-encoding 以便 stripSessionProjections 先 gunzip 再解析
        if (res.statusCode === 200) {
          const { body, stripped } = stripSessionProjections(path, bodyBuf, res.headers['content-encoding']);
          if (stripped) {
            bodyBuf = body;
            // 已修改 body，清除原始压缩编码标记，让下方 gzip 逻辑重新压缩
            delete respHeaders['content-encoding'];
            respHeaders['content-length'] = String(bodyBuf.length);
          }
        }

        // 大响应 gzip 压缩：异步执行，避免 gzipSync 卡住整个事件循环
        const respCt = String(res.headers['content-type'] ?? '').toLowerCase();
        // 注意：alreadyEncoded 从 respHeaders 读取（而非 res.headers），
        // 因为上面的剥离逻辑可能已经删除了 respHeaders['content-encoding']
        const alreadyEncoded = String(respHeaders['content-encoding'] ?? res.headers['content-encoding'] ?? '').toLowerCase();
        const compressible = COMPRESSIBLE_TYPES.some((t) => respCt.startsWith(t));
        if (bodyBuf.length > GZIP_THRESHOLD && compressible && !alreadyEncoded) {
          gzipAsync(bodyBuf).then((zipped) => {
            respHeaders['content-encoding'] = 'gzip';
            respHeaders['content-length'] = String(zipped.length);
            sendResponse(res.statusCode, respHeaders, zipped);
          }).catch(() => {
            sendResponse(res.statusCode, respHeaders, bodyBuf);
          });
          return;
        }

        sendResponse(res.statusCode, respHeaders, bodyBuf);
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

    // WebSocket 帧解析缓冲区 — 拦截 Ping (0x9) 自动回复 Pong (0xA)。
    // DSH API Gateway 的 /api/remote.mux WebSocket 每 2s 发 Ping，连续 2 次没收到
    // Pong 就 terminate。隧道用裸 TCP 转发，Pong 往返延迟可能超时，本地直接回复最可靠。
    let wsFrameBuf = Buffer.alloc(0);

    sock.on('data', (chunk) => {
      if (upgraded) {
        wsFrameBuf = Buffer.concat([wsFrameBuf, chunk]);
        wsFrameBuf = this._processWsFrames(wsId, wsFrameBuf, sock);
        return;
      }
      headerBuf += chunk.toString('binary');
      const sep = headerBuf.indexOf('\r\n\r\n');
      if (sep === -1) return;

      upgraded = true;
      const statusLine = headerBuf.slice(0, headerBuf.indexOf('\r\n'));
      const replyHeaders = {};
      const headerLines = headerBuf.slice(0, sep).split('\r\n');
      for (let i = 1; i < headerLines.length; i++) {
        const ci = headerLines[i].indexOf(':');
        if (ci > 0) {
          replyHeaders[headerLines[i].slice(0, ci).trim().toLowerCase()] =
            headerLines[i].slice(ci + 1).trim();
        }
      }

      // 解析状态码，传递给服务端以便正确转发（非 101 时浏览器能看到真实错误）
      const statusMatch = /^HTTP\/1\.\d\s+(\d+)\s*(.*)/.exec(statusLine);
      const statusCode = statusMatch ? parseInt(statusMatch[1], 10) : 101;
      const statusMessage = statusMatch ? statusMatch[2] : '';

      if (statusCode === 101) {
        this._sendMessage({ type: 'ws-accept', wsId, statusCode, replyHeaders });
      } else {
        // 非 101 响应：转发状态码和头，让浏览器看到真实错误（如 401）
        this._sendMessage({ type: 'ws-accept', wsId, statusCode, statusMessage, replyHeaders });
        sock.destroy();
        return;
      }

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

  // ── WebSocket 帧解析 ─────────────────────────────────────────────────────
  // 在裸 TCP 层面解析 WebSocket 帧，拦截 Ping (0x9) 自动回复 Pong (0xA)，
  // 其余帧原样转发。DSH API Gateway 每 2s 发 Ping，2 次没 Pong 就 terminate。
  _processWsFrames(wsId, buf, sock) {
    while (buf.length >= 2) {
      const b0 = buf[0];
      const b1 = buf[1];
      const opcode = b0 & 0x0f;
      const masked = b1 & 0x80;
      let payloadLen = b1 & 0x7f;
      let offset = 2;

      if (payloadLen === 126) {
        if (buf.length < 4) break;
        payloadLen = buf.readUInt16BE(2);
        offset = 4;
      } else if (payloadLen === 127) {
        if (buf.length < 10) break;
        payloadLen = Number(buf.readBigUInt64BE(2));
        offset = 10;
      }
      if (masked) offset += 4;
      if (buf.length < offset + payloadLen) break;

      const frameEnd = offset + payloadLen;
      const frameBytes = buf.subarray(0, frameEnd);

      if (opcode === 0x9) {
        // Ping → 自动回复 Pong（同 payload，必须 mask，因为这是 client→server 方向）
        // WebSocket 协议规定客户端→服务端的帧必须加 mask，否则服务端 ws 库会判定
        // 协议错误（1002）并关闭连接。
        const payload = buf.subarray(offset, frameEnd);
        const mask = cryptoRandomBytes(4);
        const maskedPayload = Buffer.alloc(payload.length);
        for (let i = 0; i < payload.length; i++) {
          maskedPayload[i] = payload[i] ^ mask[i % 4];
        }
        if (payload.length < 126) {
          const hdr = Buffer.alloc(6);
          hdr[0] = 0x8a; // fin + opcode 0xA (pong)
          hdr[1] = 0x80 | payload.length; // masked + length
          mask.copy(hdr, 2);
          sock.write(Buffer.concat([hdr, maskedPayload]));
        } else if (payload.length < 65536) {
          const hdr = Buffer.alloc(8);
          hdr[0] = 0x8a; hdr[1] = 0x80 | 126;
          hdr.writeUInt16BE(payload.length, 2);
          mask.copy(hdr, 4);
          sock.write(Buffer.concat([hdr, maskedPayload]));
        } else {
          const hdr = Buffer.alloc(14);
          hdr[0] = 0x8a; hdr[1] = 0x80 | 127;
          hdr.writeBigUInt64BE(BigInt(payload.length), 2);
          mask.copy(hdr, 10);
          sock.write(Buffer.concat([hdr, maskedPayload]));
        }
      } else {
        this._sendMessage({ type: 'ws-frame', wsId, data: frameBytes.toString('base64') });
      }
      buf = buf.subarray(frameEnd);
    }
    return buf;
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
