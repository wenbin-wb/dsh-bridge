// DSH Remote - Host-Client RPC 接口 (loopback-only)

export const REMOTE_RPC_CHANNEL = 'dsh-remote';

export const REMOTE_ENDPOINTS = {
  status: 'status',
  startReverseTunnel: 'startReverseTunnel',
  stopReverseTunnel: 'stopReverseTunnel',
  startCloudflaredTunnel: 'startCloudflaredTunnel',
  stopCloudflaredTunnel: 'stopCloudflaredTunnel',
};

function ok(value) {
  return { ok: true, value };
}

/**
 * 构造符合 DSH rpcErrorSchema 的错误
 */
function fail(code, message) {
  if (code === 'cancelled') {
    return { ok: false, error: { code: 'cancelled', message, details: {} } };
  }
  // 其余归入 bad-request
  return {
    ok: false,
    error: { code: 'bad-request', message, details: { issues: [{ message }] } },
  };
}

/**
 * 安装 RPC 接口
 */
export function installRemoteRpc(ctx, { service, log }) {
  if (!ctx?.connection?.rpc?.handle) {
    log.warn('DSH Remote: Connection RPC 不可用 - 设置页将无法使用');
    return () => {};
  }
  
  return ctx.connection.rpc.handle(
    REMOTE_RPC_CHANNEL,
    async (endpoint, payload = {}, signal) => {
      if (signal?.aborted) {
        return fail('cancelled', '请求已取消 | request cancelled');
      }
      
      const statusPayload = async () => {
        const status = await service.status();
        return ok(status);
      };
      
      try {
        // 获取状态
        if (endpoint === REMOTE_ENDPOINTS.status) {
          return await statusPayload();
        }
        
        // 启动自建服务器隧道
        if (endpoint === REMOTE_ENDPOINTS.startReverseTunnel) {
          await service.startReverseTunnel();
          return await statusPayload();
        }
        
        // 停止自建服务器隧道
        if (endpoint === REMOTE_ENDPOINTS.stopReverseTunnel) {
          service.stopReverseTunnel();
          return await statusPayload();
        }
        
        // 启动 Cloudflare 隧道
        if (endpoint === REMOTE_ENDPOINTS.startCloudflaredTunnel) {
          await service.startCloudflaredTunnel();
          return await statusPayload();
        }
        
        // 停止 Cloudflare 隧道
        if (endpoint === REMOTE_ENDPOINTS.stopCloudflaredTunnel) {
          service.stopCloudflaredTunnel();
          return await statusPayload();
        }
        
        return fail('bad-request', `未知端点 | unknown endpoint: ${endpoint}`);
      } catch (err) {
        log.error('DSH Remote: RPC %s 失败 | failed: %s', endpoint, err?.message ?? err);
        return fail('bad-request', err?.message ?? String(err));
      }
    },
    { authority: 'loopback' }
  );
}
