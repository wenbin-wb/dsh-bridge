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
  saveExternalTunnel: 'saveExternalTunnel',
  setLanIp: 'setLanIp',
  checkVersion: 'checkVersion',
  upgradePlugin: 'upgradePlugin',
  upgradeDsh: 'upgradeDsh',
  restartDsh: 'restartDsh',
  exportBackup: 'exportBackup',
  importBackup: 'importBackup',
  diagnoseNetwork: 'diagnoseNetwork',
  getSystemMetrics: 'getSystemMetrics',
  // 远程工作区管理与目录浏览
  listRemoteDirectories: 'listRemoteDirectories',
  addRemoteWorkspace: 'addRemoteWorkspace',
  listWorkspaces: 'listWorkspaces',
  // 访问安全认证（密码保护 / 扫码免密 Token）
  authGetStatus: 'authGetStatus',
  authUpdateConfig: 'authUpdateConfig',
  authRegenerateToken: 'authRegenerateToken',
  authAdminUnlock: 'authAdminUnlock',
  authAdminLock: 'authAdminLock',
  // 首次启用引导：用户确认已了解后置位，避免重复打扰
  dismissFirstRunGuide: 'dismissFirstRunGuide',
  // 页面改写层用户偏好（设置面板可见开关，issue #55 讨论衍生）
  uiGetFlags: 'uiGetFlags',
  uiUpdateConfig: 'uiUpdateConfig',
  // 平台管理器（多 IM 平台统一接口）
  listPlatforms: 'listPlatforms',
  platformLogin: 'platformLogin',
  platformSetAllowFrom: 'platformSetAllowFrom',
  platformSetConfig: 'platformSetConfig',
  platformStop: 'platformStop',
  platformStart: 'platformStart',
  platformUnbind: 'platformUnbind',
  // 本机可用的 DSH agent preset（设置页下拉用；老版本 DSH 返回 available:false）
  listAgentPresets: 'listAgentPresets',
  // 微信 Bot（v1.x 向后兼容别名，deprecated）
  wechatGetStatus: 'wechatGetStatus',
  wechatLogin: 'wechatLogin',
  wechatSetAllowFrom: 'wechatSetAllowFrom',
  wechatSetConfig: 'wechatSetConfig',
  wechatStop: 'wechatStop',
  wechatStart: 'wechatStart',
  wechatUnbind: 'wechatUnbind',
};
