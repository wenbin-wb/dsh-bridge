// dsh-remote Client API - 前端调用 RPC

export const REMOTE_RPC_CHANNEL = 'dsh-remote';

export const REMOTE_ENDPOINTS = {
  status: 'status',
  reverseTunnelStart: 'reverse-tunnel-start',
  reverseTunnelStop: 'reverse-tunnel-stop',
  cloudflaredStart: 'cloudflared-start',
  cloudflaredStop: 'cloudflared-stop',
};

/** 清理状态数据 */
export function redactStatus(status) {
  return {
    proxyRunning: status.proxyRunning,
    proxyPort: status.proxyPort,
    lanUrl: status.lanUrl,
    lanQr: status.lanQr,
    dshPort: status.dshPort,
    
    reverseTunnelRunning: status.reverseTunnelRunning,
    reverseTunnelUrl: status.reverseTunnelUrl,
    reverseTunnelQr: status.reverseTunnelQr,
    reverseTunnelState: status.reverseTunnelState,
    serverConfigured: status.serverConfigured,
    tokenConfigured: status.tokenConfigured,
    
    cloudflaredRunning: status.cloudflaredRunning,
    cloudflaredUrl: status.cloudflaredUrl,
    cloudflaredQr: status.cloudflaredQr,
    cloudflaredState: status.cloudflaredState,
  };
}
