// DSH Bridge - RPC Interface (server side)
// Loopback-only RPC methods for browser UI

import QRCode from 'qrcode';
import { BRIDGE_RPC_CHANNEL, BRIDGE_ENDPOINTS } from './bridge-rpc-constants.js';

export { BRIDGE_RPC_CHANNEL, BRIDGE_ENDPOINTS };

function ok(value) {
  return { ok: true, value };
}

function fail(code, message, details = {}) {
  if (code === 'cancelled') {
    return { ok: false, error: { code: 'cancelled', message, details: {} } };
  }
  return {
    ok: false,
    error: {
      code: 'bad-request',
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
  let url = null;
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

/** 归一化 wechat 状态返回：把 loginState 里的 qrPayload 渲染成 qr dataURL。 */
async function wechatStatusValue(wechatService, logger) {
  const status = wechatService.getStatus();
  const qr = await renderQr(status.login).catch((err) => {
    logger.warn('dsh-bridge: render wechat qr failed: %s', err?.message ?? err);
    return null;
  });
  return { ...status, login: { ...status.login, qr, qrPayload: undefined, qrKind: undefined } };
}

export function installBridgeRpc(ctx, { service, wechat, platformManager, logger, saveCustomTunnelConfig }) {
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
          const status = await service.getStatus();
          return ok(status);
        }

        if (endpoint === BRIDGE_ENDPOINTS.saveCustomTunnelConfig) {
          const { serverUrl = '', accessToken = '' } = payload;
          await saveCustomTunnelConfig(serverUrl.trim(), accessToken.trim());
          const status = await service.getStatus();
          return ok(status);
        }

        if (endpoint === BRIDGE_ENDPOINTS.startCustomTunnel) {
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
          service.stopCustomTunnel();
          const status = await service.getStatus();
          return ok(status);
        }

        if (endpoint === BRIDGE_ENDPOINTS.startCloudflared) {
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
          service.stopCloudflared();
          const status = await service.getStatus();
          return ok(status);
        }

        if (endpoint === BRIDGE_ENDPOINTS.resetCloudflared) {
          await service.resetCloudflared();
          const status = await service.getStatus();
          return ok(status);
        }

        if (endpoint === BRIDGE_ENDPOINTS.checkVersion) {
          const result = await service.checkVersion();
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
          const { platformId } = payload;
          if (!platformId) return fail('bad-request', '缺少 platformId 参数');
          const platform = platformManager.get(platformId);
          if (!platform) return fail('bad-request', `平台未注册: ${platformId}`);
          await platform.unbind();
          const status = platform.getStatus();
          const qr = await renderQr(status.login).catch(() => null);
          return ok({ ...status, login: { ...status.login, qr, qrPayload: undefined, qrKind: undefined } });
        }

        // ---- 微信 Bot（v1.x 向后兼容别名，deprecated）----

        if (endpoint === BRIDGE_ENDPOINTS.wechatGetStatus) {
          if (!wechat) return fail('bad-request', '微信 Bot 未初始化');
          const value = await wechatStatusValue(wechat, logger);
          return ok(value);
        }

        if (endpoint === BRIDGE_ENDPOINTS.wechatLogin) {
          if (!wechat) return fail('bad-request', '微信 Bot 未初始化');
          const { qrType } = payload;
          const result = await wechat.login({ qrType });
          if (!result.ok) return fail('bad-request', result.error ?? '登录启动失败');
          const value = await wechatStatusValue(wechat, logger);
          return ok(value);
        }

        if (endpoint === BRIDGE_ENDPOINTS.wechatSetAllowFrom) {
          if (!wechat) return fail('bad-request', '微信 Bot 未初始化');
          await wechat.setAllowFrom(payload.allowFrom);
          const value = await wechatStatusValue(wechat, logger);
          return ok(value);
        }

        if (endpoint === BRIDGE_ENDPOINTS.wechatSetConfig) {
          if (!wechat) return fail('bad-request', '微信 Bot 未初始化');
          await wechat.setConfig(payload);
          const value = await wechatStatusValue(wechat, logger);
          return ok(value);
        }

        if (endpoint === BRIDGE_ENDPOINTS.wechatStop) {
          if (!wechat) return fail('bad-request', '微信 Bot 未初始化');
          await wechat.stop();
          const value = await wechatStatusValue(wechat, logger);
          return ok(value);
        }

        if (endpoint === BRIDGE_ENDPOINTS.wechatStart) {
          if (!wechat) return fail('bad-request', '微信 Bot 未初始化');
          await wechat.gateway.start().catch((err) => {
            logger.error('wechat start enabled: %s', err?.message ?? err);
          });
          const value = await wechatStatusValue(wechat, logger);
          return ok(value);
        }

        if (endpoint === BRIDGE_ENDPOINTS.wechatUnbind) {
          if (!wechat) return fail('bad-request', '微信 Bot 未初始化');
          await wechat.unbind();
          const value = await wechatStatusValue(wechat, logger);
          return ok(value);
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

