// DSH Bridge - RPC Interface (server side)
// Loopback-only RPC methods for browser UI

import QRCode from 'qrcode';
import { BRIDGE_RPC_CHANNEL, BRIDGE_ENDPOINTS } from './bridge-rpc-constants.js';
import { RateLimiter } from './security/rate-limiter.js';

export { BRIDGE_RPC_CHANNEL, BRIDGE_ENDPOINTS };

const rpcRateLimiter = new RateLimiter({ maxRequests: 30, windowMs: 60000 });

function ok(value) {
  return { ok: true, value };
}

function fail(code, message, details = {}) {
  const allowedCodes = new Set([
    'bad-request', 'cancelled', 'internal', 'settings-rejected', 'command-error'
  ]);
  const safeCode = allowedCodes.has(code) ? code : 'bad-request';
  return {
    ok: false,
    error: {
      code: safeCode,
      message,
      details: { issues: [{ message }], ...details },
    },
  };
}

// 把登录态里的二维码载荷渲染成浏览器可展示的 dataURL（带缓存，避免重复生成）
async function renderQr(loginState) {
  if (!loginState?.qrPayload) return null;
  const cacheKey = `${loginState.qrKind}:${loginState.qrPayload.slice(0, 80)}`;
  if (renderQr.cache && renderQr.cache.key === cacheKey) return renderQr.cache.url;
  let url;
  const payload = loginState.qrPayload;
  if (loginState.qrKind === 'img') {
    url = /^data:/i.test(payload) ? payload : `data:image/png;base64,${payload}`;
  } else {
    try {
      url = await QRCode.toDataURL(payload, {
        width: 300, margin: 2, color: { dark: '#1F2421', light: '#FFFFFF' },
      });
    } catch { url = null; }
  }
  renderQr.cache = { key: cacheKey, url };
  return url;
}

function checkAdminAuth(authManager, payload, { requireConfigured = false } = {}) {
  if (!authManager) return null;
  if (authManager.adminPolicy === 'open') return null;
  // 若系统尚未设置任何管理密码或访客密码，允许免密管理
  const hasAnyPassword = authManager.hasAdminPassword || authManager.hasPassword;
  // T2.9：高危操作（备份导出/导入、隧道配置与启动、目录浏览、添加工作区、升级、重启）
  // 在系统从未设置任何密码时不再静默放行，强制先完成一次密码设置，
  // 杜绝"未设密码 = 局域网/隧道内任何人都可导出全部凭证"的裸奔状态被直接利用
  if (requireConfigured && !hasAnyPassword) {
    return fail('bad-request', '该操作涉及敏感配置：请先在「安全认证」中设置访问密码或管理密码后再执行');
  }
  if (!hasAnyPassword) {
    return null;
  }
  // 已设置密码时，必须提供经服务端校验有效的 adminToken（绝不依赖客户端自称的 isLocalhost）
  if (payload?.adminToken && authManager.validateAdminSession(payload.adminToken)) {
    return null;
  }
  return fail('bad-request', '操作已被拦截：需要管理员权限，请先在控制台输入管理密码解锁');
}

export function installBridgeRpc(ctx, { service, authManager, platformManager, logger, saveCustomTunnelConfig, exportBackup, importBackup }) {
  if (!ctx?.connection?.rpc?.handle) {
    logger.warn('dsh-bridge: Connection RPC unavailable — UI will not work');
    return () => {};
  }

  return ctx.connection.rpc.handle(
    BRIDGE_RPC_CHANNEL,
    async (endpoint, payload = {}, signal) => {
      if (signal?.aborted) return fail('cancelled', 'Request was cancelled');

      try {
        if (endpoint === BRIDGE_ENDPOINTS.getStatus) {
          const isAdmin = checkAdminAuth(authManager, payload) === null;
          const status = await service.getStatus({ adminAuthValid: isAdmin });
          return ok(status);
        }

        // ---- 访问安全认证 ----

        if (endpoint === BRIDGE_ENDPOINTS.authGetStatus) {
          if (!authManager) return fail('bad-request', 'AuthManager 未初始化');
          const isAdmin = checkAdminAuth(authManager, payload) === null;
          return ok(authManager.getStatus({ masked: !isAdmin }));
        }

        if (endpoint === BRIDGE_ENDPOINTS.authUpdateConfig) {
          if (!authManager) return fail('bad-request', 'AuthManager 未初始化');
          const adminErr = checkAdminAuth(authManager, payload);
          if (adminErr) return adminErr;

          const { enabled, mode, scope, adminPolicy, password, adminPassword } = payload;
          if (enabled != null) await authManager.setEnabled(enabled);
          if (mode != null) await authManager.setMode(mode);
          if (scope != null) await authManager.setScope(scope);
          if (adminPolicy != null) await authManager.setAdminPolicy(adminPolicy);
          if (password !== undefined) await authManager.setPassword(password);
          if (adminPassword !== undefined) await authManager.setAdminPassword(adminPassword);
          return ok(authManager.getStatus({ masked: false }));
        }

        if (endpoint === BRIDGE_ENDPOINTS.authRegenerateToken) {
          if (!authManager) return fail('bad-request', 'AuthManager 未初始化');
          const adminErr = checkAdminAuth(authManager, payload);
          if (adminErr) return adminErr;

          await authManager.regenerateSecretToken();
          return ok(authManager.getStatus({ masked: false }));
        }

        if (endpoint === BRIDGE_ENDPOINTS.authAdminUnlock) {
          if (!authManager) return fail('bad-request', 'AuthManager 未初始化');
          const { password } = payload;
          const res = authManager.unlockAdmin(password);
          if (res.ok) return ok({ adminToken: res.adminToken });
          return fail('bad-request', res.error || '管理员密码错误');
        }

        if (endpoint === BRIDGE_ENDPOINTS.authAdminLock) {
          if (!authManager) return fail('bad-request', 'AuthManager 未初始化');
          if (payload?.adminToken) authManager.revokeAdminSession(payload.adminToken);
          return ok({ locked: true });
        }

        if (endpoint === BRIDGE_ENDPOINTS.saveCustomTunnelConfig) {
          const adminErr = checkAdminAuth(authManager, payload, { requireConfigured: true });
          if (adminErr) return adminErr;

          // 未提供的字段保持 undefined 透传：服务端视为"保留现值"
          const { serverUrl, accessToken } = payload;
          await saveCustomTunnelConfig(serverUrl, accessToken);
          const status = await service.getStatus();
          return ok(status);
        }

        if (endpoint === BRIDGE_ENDPOINTS.saveCloudflaredConfig) {
          const adminErr = checkAdminAuth(authManager, payload, { requireConfigured: true });
          if (adminErr) return adminErr;

          const { token, hostname } = payload;
          await service.saveCloudflaredConfig({ token, hostname });
          const status = await service.getStatus();
          return ok(status);
        }

        if (endpoint === BRIDGE_ENDPOINTS.setTunnelAutoStart) {
          const adminErr = checkAdminAuth(authManager, payload, { requireConfigured: true });
          if (adminErr) return adminErr;

          const { tunnel, autoStart } = payload;
          await service.setTunnelAutoStart({ tunnel, autoStart });
          const status = await service.getStatus();
          return ok(status);
        }

        if (endpoint === BRIDGE_ENDPOINTS.setLanIp) {
          const adminErr = checkAdminAuth(authManager, payload);
          if (adminErr) return adminErr;

          const { ip } = payload;
          const status = await service.setLanIp({ ip });
          return ok(status);
        }

        if (endpoint === BRIDGE_ENDPOINTS.startCustomTunnel) {
          const adminErr = checkAdminAuth(authManager, payload, { requireConfigured: true });
          if (adminErr) return adminErr;

          try {
            await service.startCustomTunnel();
            const status = await service.getStatus();
            return ok(status);
          } catch (err) {
            logger.error('Failed to start custom tunnel: %s', err.message);
            return fail('bad-request', err.message);
          }
        }

        if (endpoint === BRIDGE_ENDPOINTS.stopCustomTunnel) {
          const adminErr = checkAdminAuth(authManager, payload);
          if (adminErr) return adminErr;

          service.stopCustomTunnel();
          const status = await service.getStatus();
          return ok(status);
        }

        if (endpoint === BRIDGE_ENDPOINTS.startCloudflared) {
          const adminErr = checkAdminAuth(authManager, payload, { requireConfigured: true });
          if (adminErr) return adminErr;

          try {
            await service.startCloudflared();
            const status = await service.getStatus();
            return ok(status);
          } catch (err) {
            logger.error('Failed to start cloudflared: %s', err.message);
            return fail('bad-request', err.message);
          }
        }

        if (endpoint === BRIDGE_ENDPOINTS.stopCloudflared) {
          const adminErr = checkAdminAuth(authManager, payload);
          if (adminErr) return adminErr;

          service.stopCloudflared();
          const status = await service.getStatus();
          return ok(status);
        }

        if (endpoint === BRIDGE_ENDPOINTS.resetCloudflared) {
          const adminErr = checkAdminAuth(authManager, payload);
          if (adminErr) return adminErr;

          await service.resetCloudflared();
          const status = await service.getStatus();
          return ok(status);
        }

        if (endpoint === BRIDGE_ENDPOINTS.checkVersion) {
          const result = await service.checkVersion();
          return ok(result);
        }

        if (endpoint === BRIDGE_ENDPOINTS.upgradePlugin) {
          const adminErr = checkAdminAuth(authManager, payload, { requireConfigured: true });
          if (adminErr) return adminErr;

          const result = await service.upgradePlugin(payload);
          return ok(result);
        }

        if (endpoint === BRIDGE_ENDPOINTS.restartDsh) {
          const adminErr = checkAdminAuth(authManager, payload, { requireConfigured: true });
          if (adminErr) return adminErr;

          const result = await service.restartDsh();
          return ok(result);
        }

        if (endpoint === BRIDGE_ENDPOINTS.exportBackup) {
          const adminErr = checkAdminAuth(authManager, payload, { requireConfigured: true });
          if (adminErr) return adminErr;

          if (!exportBackup) return fail('bad-request', '备份导出服务不可用');
          const backup = await exportBackup();
          return ok(backup);
        }

        if (endpoint === BRIDGE_ENDPOINTS.importBackup) {
          const adminErr = checkAdminAuth(authManager, payload, { requireConfigured: true });
          if (adminErr) return adminErr;

          if (!importBackup) return fail('bad-request', '备份导入服务不可用');
          const result = await importBackup(payload?.backup);
          const status = await service.getStatus({ adminAuthValid: true });
          return ok({ result, status });
        }

        if (endpoint === BRIDGE_ENDPOINTS.diagnoseNetwork) {
          const result = await service.diagnoseNetwork();
          return ok(result);
        }

        if (endpoint === BRIDGE_ENDPOINTS.getSystemMetrics) {
          const metrics = service.getSystemMetrics();
          return ok(metrics);
        }

        // ---- 远程工作区管理与目录浏览 ----

        if (endpoint === BRIDGE_ENDPOINTS.listRemoteDirectories) {
          const adminErr = checkAdminAuth(authManager, payload, { requireConfigured: true });
          if (adminErr) return adminErr;

          const clientKey = payload?.clientIp || payload?.adminToken || 'default';
          const rateCheck = rpcRateLimiter.check(clientKey, 30);
          if (!rateCheck.allowed) {
            return fail('bad-request', `请求过于频繁，请等待 ${rateCheck.retryAfterSec} 秒后再试`);
          }

          const result = await service.listRemoteDirectories(payload?.path);
          return ok(result);
        }

        if (endpoint === BRIDGE_ENDPOINTS.addRemoteWorkspace) {
          const adminErr = checkAdminAuth(authManager, payload, { requireConfigured: true });
          if (adminErr) return adminErr;

          const clientKey = payload?.clientIp || payload?.adminToken || 'default';
          const rateCheck = rpcRateLimiter.check(clientKey, 20);
          if (!rateCheck.allowed) {
            return fail('bad-request', `添加工作区请求过于频繁，请等待 ${rateCheck.retryAfterSec} 秒后再试`);
          }

          const result = await service.addWorkspace(payload?.path);
          return ok(result);
        }

        if (endpoint === BRIDGE_ENDPOINTS.listWorkspaces) {
          const adminErr = checkAdminAuth(authManager, payload);
          if (adminErr) return adminErr;

          const result = await service.getWorkspaces();
          return ok(result);
        }

        // ---- 平台管理器（多 IM 平台）----

        if (endpoint === BRIDGE_ENDPOINTS.listPlatforms) {
          if (!platformManager) return ok({});
          // 每个平台的 login.qrPayload 渲染为 dataURL 后返回
          const raw = platformManager.getStatus();
          const out = {};
          for (const [id, status] of Object.entries(raw)) {
            let qr = null;
            try { qr = await renderQr(status.login).catch(() => null); } catch { /* ignore */ }
            out[id] = { ...status, login: { ...(status.login ?? {}), qr, qrPayload: undefined, qrKind: undefined } };
          }
          return ok(out);
        }

        // ---- 平台操作（统一接口）----

        if (endpoint === BRIDGE_ENDPOINTS.platformLogin) {
          if (!platformManager) return fail('bad-request', 'PlatformManager 未初始化');
          const adminErr = checkAdminAuth(authManager, payload);
          if (adminErr) return adminErr;

          const { platformId, qrType } = payload;
          if (!platformId) return fail('bad-request', '缺少 platformId 参数');
          const platform = platformManager.get(platformId);
          if (!platform) return fail('bad-request', `平台未注册: ${platformId}`);
          const result = await platform.login({ qrType });
          if (!result.ok) return fail('bad-request', result.error ?? '登录启动失败');
          const status = platform.getStatus();
          const qr = await renderQr(status.login).catch(() => null);
          return ok({ ...status, login: { ...status.login, qr, qrPayload: undefined, qrKind: undefined } });
        }

        if (endpoint === BRIDGE_ENDPOINTS.platformSetAllowFrom) {
          if (!platformManager) return fail('bad-request', 'PlatformManager 未初始化');
          const adminErr = checkAdminAuth(authManager, payload);
          if (adminErr) return adminErr;

          const { platformId, allowFrom } = payload;
          if (!platformId) return fail('bad-request', '缺少 platformId 参数');
          const platform = platformManager.get(platformId);
          if (!platform) return fail('bad-request', `平台未注册: ${platformId}`);
          await platform.setAllowFrom(allowFrom);
          const status = platform.getStatus();
          const qr = await renderQr(status.login).catch(() => null);
          return ok({ ...status, login: { ...status.login, qr, qrPayload: undefined, qrKind: undefined } });
        }

        if (endpoint === BRIDGE_ENDPOINTS.platformSetConfig) {
          if (!platformManager) return fail('bad-request', 'PlatformManager 未初始化');
          const adminErr = checkAdminAuth(authManager, payload);
          if (adminErr) return adminErr;

          const { platformId, ...config } = payload;
          if (!platformId) return fail('bad-request', '缺少 platformId 参数');
          const platform = platformManager.get(platformId);
          if (!platform) return fail('bad-request', `平台未注册: ${platformId}`);
          await platform.setConfig(config);
          const status = platform.getStatus();
          const qr = await renderQr(status.login).catch(() => null);
          return ok({ ...status, login: { ...status.login, qr, qrPayload: undefined, qrKind: undefined } });
        }

        if (endpoint === BRIDGE_ENDPOINTS.platformStop) {
          if (!platformManager) return fail('bad-request', 'PlatformManager 未初始化');
          const adminErr = checkAdminAuth(authManager, payload);
          if (adminErr) return adminErr;

          const { platformId } = payload;
          if (!platformId) return fail('bad-request', '缺少 platformId 参数');
          const platform = platformManager.get(platformId);
          if (!platform) return fail('bad-request', `平台未注册: ${platformId}`);
          await platform.stop();
          const status = platform.getStatus();
          const qr = await renderQr(status.login).catch(() => null);
          return ok({ ...status, login: { ...status.login, qr, qrPayload: undefined, qrKind: undefined } });
        }

        if (endpoint === BRIDGE_ENDPOINTS.platformStart) {
          if (!platformManager) return fail('bad-request', 'PlatformManager 未初始化');
          const adminErr = checkAdminAuth(authManager, payload);
          if (adminErr) return adminErr;

          const { platformId } = payload;
          if (!platformId) return fail('bad-request', '缺少 platformId 参数');
          const platform = platformManager.get(platformId);
          if (!platform) return fail('bad-request', `平台未注册: ${platformId}`);
          await platform.start();
          const status = platform.getStatus();
          const qr = await renderQr(status.login).catch(() => null);
          return ok({ ...status, login: { ...status.login, qr, qrPayload: undefined, qrKind: undefined } });
        }

        if (endpoint === BRIDGE_ENDPOINTS.platformUnbind) {
          if (!platformManager) return fail('bad-request', 'PlatformManager 未初始化');
          const adminErr = checkAdminAuth(authManager, payload);
          if (adminErr) return adminErr;

          const { platformId } = payload;
          if (!platformId) return fail('bad-request', '缺少 platformId 参数');
          const platform = platformManager.get(platformId);
          if (!platform) return fail('bad-request', `平台未注册: ${platformId}`);
          await platform.unbind();
          const status = platform.getStatus();
          const qr = await renderQr(status.login).catch(() => null);
          return ok({ ...status, login: { ...status.login, qr, qrPayload: undefined, qrKind: undefined } });
        }

        return fail('bad-request', `Unknown endpoint: ${endpoint}`);
      } catch (err) {
        logger.error('RPC endpoint %s failed: %s', endpoint, err.message);
        return fail('bad-request', err.message);
      }
    },
    { authority: 'loopback' }
  );
}

