// DSH Bridge - Tunnel Server
// Production-grade WebSocket reverse tunnel server with authentication and monitoring

import { WebSocketServer } from 'ws';
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';

const PORT = parseInt(process.env.PORT) || 8080;
const ALLOWED_TOKENS = (process.env.ALLOWED_TOKENS || '').split(',').filter(Boolean);
const HEARTBEAT_INTERVAL = 30000;
const CLIENT_TIMEOUT = 90000;

/**
 * Generate random subdomain
 */
function generateSubdomain() {
  return randomBytes(8).toString('hex').slice(0, 12);
}

/**
 * Tunnel connection manager
 */
class TunnelManager {
  constructor() {
    this.tunnels = new Map(); // clientId -> { ws, subdomain, publicUrl, lastPing }
    this.subdomains = new Map(); // subdomain -> clientId
  }
  
  register(clientId, ws) {
    const subdomain = generateSubdomain();
    const publicUrl = process.env.PUBLIC_URL 
      ? `${process.env.PUBLIC_URL}/${subdomain}`
      : `http://localhost:${PORT}/${subdomain}`;
    
    this.tunnels.set(clientId, {
      ws,
      subdomain,
      publicUrl,
      lastPing: Date.now(),
      createdAt: Date.now(),
    });
    
    this.subdomains.set(subdomain, clientId);
    
    console.log('[Tunnel] Registered: client=%s, subdomain=%s', clientId, subdomain);
    
    return { subdomain, publicUrl };
  }
  
  unregister(clientId) {
    const tunnel = this.tunnels.get(clientId);
    if (tunnel) {
      this.subdomains.delete(tunnel.subdomain);
      this.tunnels.delete(clientId);
      console.log('[Tunnel] Unregistered: client=%s', clientId);
    }
  }
  
  getBySubdomain(subdomain) {
    const clientId = this.subdomains.get(subdomain);
    return clientId ? this.tunnels.get(clientId) : null;
  }
  
  updatePing(clientId) {
    const tunnel = this.tunnels.get(clientId);
    if (tunnel) {
      tunnel.lastPing = Date.now();
    }
  }
  
  checkTimeouts() {
    const now = Date.now();
    for (const [clientId, tunnel] of this.tunnels) {
      if (now - tunnel.lastPing > CLIENT_TIMEOUT) {
        console.log('[Tunnel] Timeout: client=%s', clientId);
        tunnel.ws.close(1000, 'Timeout');
        this.unregister(clientId);
      }
    }
  }
  
  getStats() {
    return {
      totalTunnels: this.tunnels.size,
      tunnels: Array.from(this.tunnels.entries()).map(([clientId, tunnel]) => ({
        clientId,
        subdomain: tunnel.subdomain,
        publicUrl: tunnel.publicUrl,
        uptime: Date.now() - tunnel.createdAt,
        lastPing: Date.now() - tunnel.lastPing,
      })),
    };
  }
}

/**
 * Request queue for pending HTTP requests
 */
class RequestQueue {
  constructor() {
    this.pending = new Map(); // requestId -> { resolve, reject, timeout }
    this.nextId = 1;
  }
  
  add(timeout = 30000) {
    const requestId = `req-${this.nextId++}`;
    
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error('Request timeout'));
      }, timeout);
      
      this.pending.set(requestId, { resolve, reject, timeout: timer });
    }).then(response => {
      const pending = this.pending.get(requestId);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pending.delete(requestId);
      }
      return response;
    });
  }
  
  resolve(requestId, response) {
    const pending = this.pending.get(requestId);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pending.delete(requestId);
      pending.resolve(response);
      return true;
    }
    return false;
  }
  
  rejectAll() {
    for (const [requestId, pending] of this.pending) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Connection closed'));
    }
    this.pending.clear();
  }
}

/**
 * Main server
 */
class TunnelServer {
  constructor() {
    this.manager = new TunnelManager();
    this.httpServer = null;
    this.wss = null;
  }
  
  start() {
    // Create HTTP server
    this.httpServer = createServer((req, res) => {
      this.handleHttpRequest(req, res);
    });
    
    // Create WebSocket server
    this.wss = new WebSocketServer({ 
      noServer: true,
      perMessageDeflate: false,
    });
    
    // Handle WebSocket upgrade
    this.httpServer.on('upgrade', (req, socket, head) => {
      // Check authentication
      const url = new URL(req.url, 'http://localhost');
      const token = url.searchParams.get('token');
      
      if (!this.validateToken(token)) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        console.log('[Auth] Rejected: invalid token from %s', req.socket.remoteAddress);
        return;
      }
      
      this.wss.handleUpgrade(req, socket, head, (ws) => {
        this.handleWebSocket(ws, req);
      });
    });
    
    // Heartbeat interval
    setInterval(() => {
      this.manager.checkTimeouts();
    }, HEARTBEAT_INTERVAL);
    
    // Start listening
    this.httpServer.listen(PORT, () => {
      console.log('[Server] DSH Bridge Tunnel Server');
      console.log('[Server] Listening on port %d', PORT);
      console.log('[Server] Allowed tokens: %d configured', ALLOWED_TOKENS.length);
      console.log('[Server] Public URL: %s', process.env.PUBLIC_URL || 'not set');
    });
  }
  
  validateToken(token) {
    if (ALLOWED_TOKENS.length === 0) {
      console.warn('[Auth] No tokens configured - allowing all connections (unsafe!)');
      return true;
    }
    return ALLOWED_TOKENS.includes(token);
  }
  
  handleWebSocket(ws, req) {
    const clientId = randomBytes(8).toString('hex');
    const requestQueue = new RequestQueue();
    
    console.log('[WebSocket] Connected: client=%s from %s', clientId, req.socket.remoteAddress);
    
    // Register tunnel
    const { subdomain, publicUrl } = this.manager.register(clientId, ws);
    
    // Send ready message
    ws.send(JSON.stringify({
      type: 'ready',
      subdomain,
      publicUrl,
    }));
    
    // Handle messages
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        
        if (msg.type === 'ping') {
          this.manager.updatePing(clientId);
          ws.send(JSON.stringify({ type: 'pong' }));
        }
        else if (msg.type === 'response') {
          requestQueue.resolve(msg.requestId, msg);
        }
      } catch (err) {
        console.error('[WebSocket] Failed to parse message from client=%s: %s', clientId, err.message);
      }
    });
    
    ws.on('close', () => {
      console.log('[WebSocket] Disconnected: client=%s', clientId);
      this.manager.unregister(clientId);
      requestQueue.rejectAll();
    });
    
    ws.on('error', (err) => {
      console.error('[WebSocket] Error for client=%s: %s', clientId, err.message);
    });
    
    // Store request queue for forwarding
    ws.requestQueue = requestQueue;
  }
  
  async handleHttpRequest(req, res) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    
    // Health check
    if (url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', ...this.manager.getStats() }));
      return;
    }
    
    // Extract subdomain from path
    const pathParts = url.pathname.split('/').filter(Boolean);
    if (pathParts.length === 0) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('DSH Bridge Tunnel Server\n\nNo tunnel specified');
      return;
    }
    
    const subdomain = pathParts[0];
    const tunnel = this.manager.getBySubdomain(subdomain);
    
    if (!tunnel) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Tunnel not found');
      return;
    }
    
    // Forward request to client
    try {
      const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      
      // Collect request body
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const body = Buffer.concat(chunks).toString('base64');
      
      // Reconstruct path without subdomain prefix
      const forwardPath = '/' + pathParts.slice(1).join('/') + url.search;
      
      // Send request to client
      tunnel.ws.send(JSON.stringify({
        type: 'request',
        requestId,
        method: req.method,
        path: forwardPath,
        headers: req.headers,
        body: body || undefined,
      }));
      
      // Wait for response
      const responsePromise = tunnel.ws.requestQueue.add(30000);
      const response = await responsePromise;
      
      // Send response
      res.writeHead(response.statusCode, response.headers);
      
      if (response.body) {
        res.end(Buffer.from(response.body, 'base64'));
      } else {
        res.end();
      }
      
    } catch (err) {
      console.error('[HTTP] Forward failed: %s', err.message);
      
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'text/plain' });
      }
      res.end('Bad Gateway');
    }
  }
}

// Start server
const server = new TunnelServer();
server.start();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received, shutting down...');
  server.httpServer?.close(() => {
    console.log('[Server] Closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[Server] SIGINT received, shutting down...');
  server.httpServer?.close(() => {
    console.log('[Server] Closed');
    process.exit(0);
  });
});
