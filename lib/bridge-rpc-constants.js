// DSH Bridge - RPC constants (dependency-free, safe to import from browser client)

export const BRIDGE_RPC_CHANNEL = '/dsh-bridge';

export const BRIDGE_ENDPOINTS = {
  getStatus: 'getStatus',
  startCustomTunnel: 'startCustomTunnel',
  stopCustomTunnel: 'stopCustomTunnel',
  startCloudflared: 'startCloudflared',
  stopCloudflared: 'stopCloudflared',
  resetCloudflared: 'resetCloudflared',
  saveCloudflaredConfig: 'saveCloudflaredConfig',
  setTunnelAutoStart: 'setTunnelAutoStart',
  saveCustomTunnelConfig: 'saveCustomTunnelConfig',
  checkVersion: 'checkVersion',
  upgradePlugin: 'upgradePlugin',
  restartDsh: 'restartDsh',
  exportBackup: 'exportBackup',
  importBackup: 'importBackup',
  diagnoseNetwork: 'diagnoseNetwork',
  getSystemMetrics: 'getSystemMetrics',
  // 访问安全认证（密码保护 / 扫码免密 Token）
  authGetStatus: 'authGetStatus',
  authUpdateConfig: 'authUpdateConfig',
  authRegenerateToken: 'authRegenerateToken',
  authAdminUnlock: 'authAdminUnlock',
  authAdminLock: 'authAdminLock',
  // 平台管理器（多 IM 平台统一接口）
  listPlatforms: 'listPlatforms',
  platformLogin: 'platformLogin',
  platformSetAllowFrom: 'platformSetAllowFrom',
  platformSetConfig: 'platformSetConfig',
  platformStop: 'platformStop',
  platformStart: 'platformStart',
  platformUnbind: 'platformUnbind',
  // 微信 Bot（v1.x 向后兼容别名，deprecated）
  wechatGetStatus: 'wechatGetStatus',
  wechatLogin: 'wechatLogin',
  wechatSetAllowFrom: 'wechatSetAllowFrom',
  wechatSetConfig: 'wechatSetConfig',
  wechatStop: 'wechatStop',
  wechatStart: 'wechatStart',
  wechatUnbind: 'wechatUnbind',
};
