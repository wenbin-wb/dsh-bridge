// DSH Bridge - RPC Interface
// Loopback-only RPC methods for browser UI

export const BRIDGE_RPC_CHANNEL = '/dsh-bridge';

export const BRIDGE_ENDPOINTS = {
  getStatus: 'getStatus',
  startCustomTunnel: 'startCustomTunnel',
  stopCustomTunnel: 'stopCustomTunnel',
  startCloudflared: 'startCloudflared',
  stopCloudflared: 'stopCloudflared',
  resetCloudflared: 'resetCloudflared',
  saveCustomTunnelConfig: 'saveCustomTunnelConfig',
  checkVersion: 'checkVersion',
};

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

export function installBridgeRpc(ctx, { service, logger, saveCustomTunnelConfig }) {
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

        return fail('bad-request', `Unknown endpoint: ${endpoint}`);
      } catch (err) {
        logger.error('RPC endpoint %s failed: %s', endpoint, err.message);
        return fail('bad-request', err.message);
      }
    },
    { authority: 'loopback' }
  );
}

