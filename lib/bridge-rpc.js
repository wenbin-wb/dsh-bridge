// DSH Bridge - RPC Interface
// Loopback-only RPC methods for browser UI

export const BRIDGE_RPC_CHANNEL = 'dsh-bridge';

export const BRIDGE_ENDPOINTS = {
  getStatus: 'getStatus',
  startCustomTunnel: 'startCustomTunnel',
  stopCustomTunnel: 'stopCustomTunnel',
  startCloudflared: 'startCloudflared',
  stopCloudflared: 'stopCloudflared',
};

/**
 * Create success response
 */
function ok(value) {
  return { ok: true, value };
}

/**
 * Create error response conforming to DSH rpcErrorSchema
 */
function fail(code, message, details = {}) {
  if (code === 'cancelled') {
    return { 
      ok: false, 
      error: { code: 'cancelled', message, details: {} } 
    };
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

/**
 * Install RPC handlers
 * Authority: loopback-only for security
 */
export function installBridgeRpc(ctx, { service, logger }) {
  if (!ctx?.connection?.rpc?.handle) {
    logger.warn('Connection RPC service unavailable - UI will not work');
    return () => {};
  }
  
  return ctx.connection.rpc.handle(
    BRIDGE_RPC_CHANNEL,
    async (endpoint, payload = {}, signal) => {
      // Handle cancellation
      if (signal?.aborted) {
        return fail('cancelled', 'Request was cancelled');
      }
      
      try {
        // Get status
        if (endpoint === BRIDGE_ENDPOINTS.getStatus) {
          const status = await service.getStatus();
          return ok(status);
        }
        
        // Start custom tunnel
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
        
        // Stop custom tunnel
        if (endpoint === BRIDGE_ENDPOINTS.stopCustomTunnel) {
          service.stopCustomTunnel();
          const status = await service.getStatus();
          return ok(status);
        }
        
        // Start cloudflared
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
        
        // Stop cloudflared
        if (endpoint === BRIDGE_ENDPOINTS.stopCloudflared) {
          service.stopCloudflared();
          const status = await service.getStatus();
          return ok(status);
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
