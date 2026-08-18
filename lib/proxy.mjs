// dsh-remote 代理 - Host/Origin 改写 + Token 验证
//
// 核心功能:
// 1. Host/Origin 改写到 loopback (与 dsh-pocket 相同)
// 2. Token 验证 (通过 HTTP Header 或 Query)
// 3. HTTP + WebSocket 透传

import { createServer } from 'node:http';
import { request as httpRequest } from 'node:http';
import { URL } from 'node:url';

const DEFAULT_UPSTREAM = { host: '127.0.0.1', port: 3080 };

/**
 * crypto.randomUUID polyfill (非安全上下文)
 */
const RANDOM_UUID_POLYFILL = `<script data-dsh-remote-polyfill="1">!function(){try{if(self.crypto&&!self.crypto.randomUUID){self.crypto.randomUUID=function(){var b=new Uint8Array(16);self.crypto.getRandomValues(b);b[6]=b[6]&15|64;b[8]=b[8]&63|128;var h="";for(var i=0;i<16;i++){var x=b[i].toString(16);h+=(x.length<2?"0":"")+x;if(i===3||i===5||i===7||i===9)h+="-";}return h;}}}catch(e){}}();</script>`;

const INJECT_MARK = 'data-dsh-remote-polyfill="1"';

/** 检查响应是否压缩 */
function isCompressed(headers) {
  return /(^|,\s*)(gzip|br|deflate)(\s*,|$)/i.test(String(headers['content-encoding'] ?? ''));
}

/** 改写 Host/Origin 到 loopback */
function loopbackAuthority(headers, upstream) {
  const authority = `${upstream.host}:${upstream.port}`;
  headers.Host = authority;
  if (headers.origin) headers.origin = `http://${authority}`;
  if (headers.Origin) headers.Origin = `http://${authority}`;
  return headers;
}

/**
 * 验证访问 Token
 * 支持三种方式:
 * 1. HTTP Header: X-DSH-Token
 * 2. Query Parameter: token
 * 3. Cookie: dsh_token
 */
function verifyToken(req, expectedToken) {
  // 如果未配置 token，则不验证
  if (!expectedToken) return true;
  
  // 1. 检查 Header
  const headerToken = req.headers['x-dsh-token'];
  if (headerToken === expectedToken) return true;
  
  // 2. 检查 Query Parameter
  try {
    const url = new URL(req.url, 'http://localhost');
    const queryToken = url.searchParams.get('token');
    if (queryToken === expectedToken) return true;
  } catch {
    // 忽略 URL 解析错误
  }
  
  // 3. 检查 Cookie
  const cookies = req.headers.cookie?.split(';').map(c => c.trim()) ?? [];
  for (const cookie of cookies) {
    const [name, value] = cookie.split('=').map(s => s.trim());
    if (name === 'dsh_token' && value === expectedToken) return true;
  }
  
  return false;
}

/**
 * 创建代理服务器
 */
export function createRemoteProxy({ 
  port = 3082, 
  host = '0.0.0.0', 
  upstream = DEFAULT_UPSTREAM, 
  accessToken = null,
  log = null 
} = {}) {
  const server = createServer((req, res) => {
    // Token 验证
    if (!verifyToken(req, accessToken)) {
      res.writeHead(401, { 
        'content-type': 'text/html; charset=utf-8',
        'www-authenticate': 'Bearer realm="DSH Remote"'
      });
      res.end(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>DSH Remote - 身份验证</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #F7F4EF; 
      color: #1F2421;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }
    .card {
      background: #FFFFFF;
      border: 1px solid #E7E1D7;
      border-radius: 12px;
      padding: 32px;
      max-width: 400px;
      width: 100%;
      box-shadow: 0 2px 8px rgba(31, 36, 33, 0.08);
    }
    h1 { 
      font-size: 24px; 
      margin-bottom: 8px;
      color: #C4612F;
    }
    p { 
      color: #5C635D; 
      margin-bottom: 24px;
      line-height: 1.5;
    }
    input {
      width: 100%;
      padding: 12px;
      border: 1px solid #E7E1D7;
      border-radius: 8px;
      font-size: 15px;
      margin-bottom: 16px;
      font-family: 'Courier New', monospace;
    }
    input:focus {
      outline: none;
      border-color: #C4612F;
    }
    button {
      width: 100%;
      padding: 12px;
      background: #C4612F;
      color: white;
      border: none;
      border-radius: 999px;
      font-size: 15px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
    button:hover {
      background: #A94E22;
      transform: translateY(-1px);
    }
    .error {
      background: #FEE;
      border: 1px solid #FCC;
      color: #C00;
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 16px;
      font-size: 14px;
      display: none;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>🔐 身份验证</h1>
    <p>请输入访问令牌以继续</p>
    <div class="error" id="error"></div>
    <input type="password" id="token" placeholder="访问令牌" autofocus>
    <button onclick="login()">验证</button>
  </div>
  <script>
    function login() {
      const token = document.getElementById('token').value;
      if (!token) {
        showError('请输入令牌');
        return;
      }
      // 设置 cookie 并重新加载
      document.cookie = 'dsh_token=' + token + '; path=/; max-age=86400';
      window.location.reload();
    }
    function showError(msg) {
      const el = document.getElementById('error');
      el.textContent = msg;
      el.style.display = 'block';
    }
    document.getElementById('token').addEventListener('keypress', function(e) {
      if (e.key === 'Enter') login();
    });
  </script>
</body>
</html>
      `);
      return;
    }
    
    const headers = loopbackAuthority({ ...req.headers }, upstream);
    const proxyReq = httpRequest(
      { 
        host: upstream.host, 
        port: upstream.port, 
        method: req.method, 
        path: req.url, 
        headers, 
        agent: false 
      },
      (proxyRes) => {
        log?.(`${req.method} ${req.url} -> ${proxyRes.statusCode}`);
        
        const contentType = String(proxyRes.headers['content-type'] ?? '');
        
        // 注入 polyfill 到 HTML
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
      if (!res.headersSent) res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
      res.end(`dsh-remote: 无法连接上游 dsh web（${upstream.host}:${upstream.port}）——先启动 dsh web | ${err.message}`);
    });
    
    req.pipe(proxyReq);
  });

  // WebSocket upgrade 处理
  server.on('upgrade', (req, socket, head) => {
    // Token 验证
    if (!verifyToken(req, accessToken)) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n');
      socket.write('Content-Type: text/plain\r\n\r\n');
      socket.write('Unauthorized');
      socket.destroy();
      return;
    }
    
    const headers = loopbackAuthority({ ...req.headers }, upstream);
    const proxyReq = httpRequest({
      host: upstream.host, 
      port: upstream.port, 
      method: req.method, 
      path: req.url, 
      headers, 
      agent: false,
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
      } catch { 
        socket.destroy(); 
      }
    });
    
    proxyReq.on('error', (err) => {
      try {
        socket.write(`HTTP/1.1 502 Bad Gateway\r\n\r\n`);
        socket.end();
      } catch { 
        socket.destroy(); 
      }
    });
    
    proxyReq.end();
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      server.removeListener('error', reject);
      resolve({
        server,
        port,
        host,
        close: () => new Promise((res) => server.close(() => res())),
      });
    });
  });
}
