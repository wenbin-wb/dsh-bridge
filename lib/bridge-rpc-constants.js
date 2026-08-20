// DSH Bridge - RPC constants (dependency-free, safe to import from browser client)

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
  // 平台管理器（多 IM 平台）
  listPlatforms: 'listPlatforms',
  // 微信 Bot（保持 v1.x 兼容）
  wechatGetStatus: 'wechatGetStatus',
  wechatLogin: 'wechatLogin',
  wechatSetAllowFrom: 'wechatSetAllowFrom',
  wechatSetConfig: 'wechatSetConfig',
  wechatStop: 'wechatStop',
  wechatStart: 'wechatStart',
  wechatUnbind: 'wechatUnbind',
};
