// DSH Bridge - Custom Tunnel Client
// WebSocket-based reverse tunnel with automatic reconnection and health monitoring

import { WebSocket } from 'ws';
import { request as httpRequest } from 'node:http';

const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const RECONNECT_DELAY = 5000; // 5 seconds
const MAX_RECONNECT_ATTEMPTS = 5;

/**
 * Custom tunnel client with production-grade features:
 * - Automatic reconnection with exponential backoff
 * - Heartbeat monitoring
 * - Request multiplexing
 * - Graceful shutdown
 */
export class CustomTunnelClient {
  constructor({ serverUrl, accessToken, localPort, signal, onStateChange, logger }) {
    this.serverUrl = serverUrl;
    this.accessToken = accessToken;
    this.localPort = localPort;
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
    this.pendingRequests = new Map();
    this.requestIdCounter = 0;
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
      if (this.signal?.aborted) {
        return reject(new Error('Aborted'));
      }
      
      const url = new URL(this.serverUrl);
      url.searchParams.set('token', this.accessToken);
      
      this.ws = new WebSocket(url.toString(), {
        handshakeTimeout: 10000,
        perMessageDeflate: false,
      });
      
      const onAbort = () => {
        this.ws?.terminate();
        reject(new Error('Aborted'));
      };
      
      this.signal?.addEventListener('abort', onAbort);
      
      this.ws.on('open', () => {
        this.signal?.removeEventListener('abort', onAbort);
        this.logger?.info('Tunnel WebSocket connected');
      });
      
      this.ws.on('message', (data) => {
        this._handleMessage(data);
      });
      
      this.ws.on('close', (code, reason) => {
        this.connected = false;
        this._stopHeartbeat();
        
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
      
      // Listen for 'ready' message from server
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
      
      // Timeout
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
      
      // HTTP request from server
      if (msg.type === 'request') {
        this._handleHttpRequest(msg);
      }
      // Response for our request
      else if (msg.type === 'response') {
        this._handleHttpResponse(msg);
      }
      // Heartbeat pong
      else if (msg.type === 'pong') {
        // Server is alive
      }
    } catch (err) {
      this.logger?.error('Failed to parse tunnel message: %s', err.message);
    }
  }
  
  _handleHttpRequest(msg) {
    const { requestId, method, path, headers } = msg;
    
    // Proxy to local DSH
    const req = httpRequest({
      host: '127.0.0.1',
      port: this.localPort,
      method,
      path,
      headers: {
        ...headers,
        host: `127.0.0.1:${this.localPort}`,
      },
    }, (res) => {
      const chunks = [];
      
      res.on('data', (chunk) => {
        chunks.push(chunk);
      });
      
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('base64');
        
        this._sendMessage({
          type: 'response',
          requestId,
          statusCode: res.statusCode,
          headers: res.headers,
          body,
        });
      });
    });
    
    req.on('error', (err) => {
      this.logger?.error('Local request failed: %s', err.message);
      
      this._sendMessage({
        type: 'response',
        requestId,
        statusCode: 502,
        headers: { 'content-type': 'text/plain' },
        body: Buffer.from('Bad Gateway').toString('base64'),
      });
    });
    
    // Send request body if present
    if (msg.body) {
      req.write(Buffer.from(msg.body, 'base64'));
    }
    
    req.end();
  }
  
  _handleHttpResponse(msg) {
    const { requestId, statusCode, headers, body } = msg;
    const pending = this.pendingRequests.get(requestId);
    
    if (pending) {
      pending.resolve({ statusCode, headers, body });
      this.pendingRequests.delete(requestId);
    }
  }
  
  _sendMessage(msg) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }
  
  _startHeartbeat() {
    this._stopHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      if (this.connected) {
        this._sendMessage({ type: 'ping' });
      }
    }, HEARTBEAT_INTERVAL);
  }
  
  _stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
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
      this.connect().catch(() => {
        // Will schedule another reconnect
      });
    }, delay);
  }
  
  _setState(phase, detail) {
    if (this.onStateChange) {
      this.onStateChange({ phase, detail });
    }
  }
  
  disconnect() {
    // Mark as disconnected (don't modify external signal)
    this.disconnecting = true;
    this._stopHeartbeat();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.connected = false;
    this.publicUrl = null;
    
    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests) {
      pending.reject(new Error('Disconnected'));
      this.pendingRequests.delete(id);
    }
    
    this.logger?.info('Tunnel disconnected');
  }
}
