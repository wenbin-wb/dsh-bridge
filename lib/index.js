// dsh-remote 插件入口 - 支持自建服务器的远程访问
//
// 核心功能:
// 1. 局域网直连 (与 dsh-pocket 相同)
// 2. 自建服务器反向隧道 (替代 cloudflared)
// 3. Token 身份验证 (保护访问安全)
//
// 架构:
// - 本地代理: 监听 0.0.0.0:3082, 改写 Host/Origin 到 127.0.0.1:3080
// - 反向隧道: WebSocket 连接到自建服务器, 双向转发流量
// - 身份验证: 基于 token 的请求验证

import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';

import { createRemoteService } from './service.mjs';
import { installRemoteRpc } from './web-rpc.js';

const name = 'dsh-remote';
const inject = ['connection', 'webServer'];

const pkgPath = fileURLToPath(new URL('../package.json', import.meta.url));

function currentVersion() {
  try {
    return JSON.parse(readFileSync(pkgPath, 'utf8')).version;
  } catch {
    return '0.0.0';
  }
}

export function apply(ctx, config = {}, internals = {}) {
  const logger = ctx.logger?.(name) ?? console;
  const dshPort = internals.dshPort ?? ctx.webServer?.port;
  
  if (!dshPort) {
    logger.error('dsh-remote: webServer port unavailable — cannot start proxy | 拿不到 dsh web 端口，无法启动代理');
    return () => {};
  }

  // 从配置读取服务器地址和 token
  const serverUrl = config.serverUrl || process.env.DSH_REMOTE_SERVER;
  const accessToken = config.accessToken || process.env.DSH_REMOTE_TOKEN;

  const service = internals.service ?? createRemoteService({
    dshPort,
    port: internals.port ?? config.port ?? 3082,
    serverUrl,
    accessToken,
    home: internals.home,
    internals,
  });

  const disposers = [];
  const disposeRpc = installRemoteRpc(ctx, {
    service,
    log: logger,
  });
  disposers.push(disposeRpc);

  // 代理自动启动 (局域网二维码开箱即用)
  void service.startProxy().then((proxy) => {
    logger.info('dsh-remote: proxy ready on :%d | 局域网代理已就绪', proxy.port);
  }).catch((err) => {
    logger.error('dsh-remote: proxy start failed | 代理启动失败: %s', err?.message ?? err);
  });

  ctx.effect(() => async () => {
    for (const d of disposers.reverse()) { 
      try { d(); } catch { /* 忽略 */ } 
    }
    await service.dispose();
  }, 'dsh-remote: stop proxy and tunnel');
}

export { name, inject };
