// dsh-remote 反向隧道 - WebSocket 连接到自建服务器
//
// 架构:
// 客户端 (本地 DSH) <-> WebSocket <-> 自建服务器 <-> 公网访问
//
// 协议:
// 1. 建立 WebSocket 连接,发送认证信息
// 2. 服务器验证通过后返回公网 URL
// 3. 双向转发 HTTP/WebSocket 流量

import { WebSocket } from 'ws';
import { request as httpRequest } from 'node:http';

/**
 * 启动反向隧道到自建服务器
 * @param {object} opts
 * @param {string} opts.serverUrl - 服务器 WebSocket 地址 (ws://或wss://)
 * @param {string} opts.accessToken - 访问令牌
 * @param {number} opts.localPort - 本地代理端口
 * @param {AbortSignal} opts.signal - 取消信号
 * @param {Function} opts.onPhase - 状态回调
 * @returns {Promise<{publicUrl: string, close: Function, onClose: Function}>}
 */
export async function startReverseTunnel({
  serverUrl,
  accessToken,
  localPort,
  signal,
  onPhase,
} = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('Aborted'));
      return;
    }

    onPhase?.('connecting', '连接自建服务器... | connecting to custom server...');

    // 构建 WebSocket 连接 URL (带 token)
    const wsUrl = new URL(serverUrl);
    wsUrl.searchParams.set('token', accessToken);

    const ws = new WebSocket(wsUrl.toString(), {
      handshakeTimeout: 30000,
    });

    let publicUrl = null;
    let closeCallback = null;
    const pendingRequests = new Map(); // requestId -> {req, res}

    // 连接成功
    ws.on('open', () => {
      onPhase?.('authenticating', '认证中... | authenticating...');
    });

    // 收到消息
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());

        // 1. 认证成功,收到公网 URL
        if (msg.type === 'authenticated') {
          publicUrl = msg.publicUrl;
          onPhase?.('ready', '隧道已建立 | tunnel established');
          
          resolve({
            publicUrl,
            close: () => {
              ws.close();
            },
            onClose: (cb) => {
              closeCallback = cb;
            },
          });
          return;
        }

        // 2. 收到代理请求
        if (msg.type === 'request') {
          handleProxyRequest(msg, ws, localPort, pendingRequests);
          return;
        }

        // 3. 收到响应数据
        if (msg.type === 'response') {
          handleProxyResponse(msg, pendingRequests);
          return;
        }

        // 4. WebSocket upgrade 请求
        if (msg.type === 'upgrade') {
          handleWebSocketUpgrade(msg, ws, localPort);
          return;
        }

      } catch (err) {
        console.error('dsh-remote: message parse error:', err.message);
      }
    });

    // 连接错误
    ws.on('error', (err) => {
      if (!publicUrl) {
        reject(new Error(`连接服务器失败: ${err.message}`));
      } else {
        console.error('dsh-remote: tunnel error:', err.message);
      }
    });

    // 连接关闭
    ws.on('close', (code, reason) => {
      if (!publicUrl) {
        reject(new Error(`连接关闭: ${code} ${reason}`));
      } else {
        closeCallback?.();
      }
      
      // 清理所有待处理的请求
      for (const [id, ctx] of pendingRequests.entries()) {
        try {
          ctx.proxyReq?.destroy();
        } catch {}
        pendingRequests.delete(id);
      }
    });

    // 处理取消信号
    if (signal) {
      const onAbort = () => {
        ws.close();
        reject(new Error('Aborted'));
      };
      signal.addEventListener('abort', onAbort, { once: true });
      ws.on('close', () => {
        signal.removeEventListener('abort', onAbort);
      });
    }
  });
}

/**
 * 处理代理请求 - 转发到本地 DSH
 */
function handleProxyRequest(msg, ws, localPort, pendingRequests) {
  const { requestId, method, path, headers } = msg;

  const proxyReq = httpRequest(
    {
      host: '127.0.0.1',
      port: localPort,
      method,
      path,
      headers,
      agent: false,
    },
    (proxyRes) => {
      // 发送响应头
      ws.send(JSON.stringify({
        type: 'response',
        requestId,
        statusCode: proxyRes.statusCode,
        headers: proxyRes.headers,
      }));

      // 流式发送响应体
      proxyRes.on('data', (chunk) => {
        ws.send(JSON.stringify({
          type: 'response-data',
          requestId,
          data: chunk.toString('base64'),
        }));
      });

      proxyRes.on('end', () => {
        ws.send(JSON.stringify({
          type: 'response-end',
          requestId,
        }));
        pendingRequests.delete(requestId);
      });

      proxyRes.on('error', (err) => {
        ws.send(JSON.stringify({
          type: 'response-error',
          requestId,
          error: err.message,
        }));
        pendingRequests.delete(requestId);
      });
    }
  );

  proxyReq.on('error', (err) => {
    ws.send(JSON.stringify({
      type: 'response-error',
      requestId,
      error: err.message,
    }));
    pendingRequests.delete(requestId);
  });

  // 如果有请求体,接收并转发
  if (msg.body) {
    proxyReq.write(Buffer.from(msg.body, 'base64'));
  }
  proxyReq.end();

  pendingRequests.set(requestId, { proxyReq });
}

/**
 * 处理代理响应数据
 */
function handleProxyResponse(msg, pendingRequests) {
  // 这个函数在客户端模式下不需要实现
  // 因为客户端是发送响应,不是接收响应
}

/**
 * 处理 WebSocket upgrade
 */
function handleWebSocketUpgrade(msg, tunnelWs, localPort) {
  const { upgradeId, path, headers } = msg;

  // 向本地 DSH 发起 WebSocket upgrade
  const proxyReq = httpRequest({
    host: '127.0.0.1',
    port: localPort,
    method: 'GET',
    path,
    headers,
    agent: false,
  });

  proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
    // 通知服务器 upgrade 成功
    tunnelWs.send(JSON.stringify({
      type: 'upgrade-success',
      upgradeId,
      headers: proxyRes.headers,
    }));

    // 建立 WebSocket 数据通道
    // 从本地 socket 读取数据,通过隧道 WebSocket 发送
    proxySocket.on('data', (chunk) => {
      tunnelWs.send(JSON.stringify({
        type: 'ws-data',
        upgradeId,
        data: chunk.toString('base64'),
      }));
    });

    proxySocket.on('end', () => {
      tunnelWs.send(JSON.stringify({
        type: 'ws-end',
        upgradeId,
      }));
    });

    proxySocket.on('error', (err) => {
      tunnelWs.send(JSON.stringify({
        type: 'ws-error',
        upgradeId,
        error: err.message,
      }));
    });

    // 接收来自隧道的 WebSocket 数据
    const messageHandler = (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'ws-data' && msg.upgradeId === upgradeId) {
          proxySocket.write(Buffer.from(msg.data, 'base64'));
        } else if (msg.type === 'ws-end' && msg.upgradeId === upgradeId) {
          proxySocket.end();
        }
      } catch {}
    };

    tunnelWs.on('message', messageHandler);
    proxySocket.on('close', () => {
      tunnelWs.off('message', messageHandler);
    });
  });

  proxyReq.on('error', (err) => {
    tunnelWs.send(JSON.stringify({
      type: 'upgrade-error',
      upgradeId,
      error: err.message,
    }));
  });

  proxyReq.end();
}
