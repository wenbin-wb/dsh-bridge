// 统一管理员解锁管理器（client/unlock-manager.js）
//
// 背景：多个 RPC 封装（BridgePanel 的 authRpcCall、目录选择器的 authRpc）都会遇到
// "需要管理员权限" 的拦截，此前各自处理、目录选择器甚至没有解锁入口导致流程卡死。
// 本模块把"token 管理 + 权限拦截检测 + 解锁动作 + 被拦截操作自动重放"统一收敛，
// UI 层（React 弹窗 / DOM 内嵌 / 未来新增组件）通过 registerUnlockHandler 接入，
// 业务方通过 ensureAdminToken() 统一获取有效 token。
//
// 设计要点：
//   - token 与 sessionStorage 同步（兼容现有 getGlobalAdminToken/setGlobalAdminToken）
//   - 权限失败 -> 通知解锁 UI；解锁成功 -> 自动重放被拦截的 RPC（pending 队列）
//   - 可同时注册多个 UI（如主面板弹窗 + 目录选择器内嵌），manager 只通知当前活跃的
//   - 与具体 UI 框架解耦，纯 JS 单例

const SESSION_KEY = 'dsh_admin_token';

let _token = '';
let _unlockHandlers = [];       // [{ id, show, hide }]
let _pendingOps = [];           // 被拦截待重放的操作队列（解锁后按序重放）
let _onUnlocked = null;         // 解锁成功后的全局回调（可多个）
let _onPermissionDenied = null; // 权限失败通知（可多个）

// 与旧 API 兼容：读写 sessionStorage
function _readStorage() {
  try { return typeof window !== 'undefined' ? window.sessionStorage.getItem(SESSION_KEY) : ''; } catch { return ''; }
}
function _writeStorage(t) {
  try {
    if (typeof window === 'undefined') return;
    if (t) window.sessionStorage.setItem(SESSION_KEY, t);
    else window.sessionStorage.removeItem(SESSION_KEY);
  } catch {}
}

export function getAdminToken() {
  if (_token) return _token;
  const saved = _readStorage();
  if (saved) { _token = saved; return saved; }
  return '';
}

export function setAdminToken(t) {
  _token = t || '';
  _writeStorage(_token);
}

export function clearAdminToken() {
  setAdminToken('');
}

/** 是否有可用 token（未校验有效性，仅看是否已保存） */
export function hasAdminToken() {
  return Boolean(getAdminToken());
}

/**
 * 注册一个解锁 UI handler。
 * @param {object} handler { id, show, hide }
 *   show(context): context = { message, onUnlock(password)=>Promise<boolean>, onCancel }
 *   hide(): 关闭该 UI
 * @returns 注销函数
 */
export function registerUnlockHandler(handler) {
  if (!handler || typeof handler.show !== 'function') return () => {};
  const id = handler.id || Math.random().toString(36).slice(2);
  _unlockHandlers.push({ id, show: handler.show, hide: handler.hide });
  return () => {
    _unlockHandlers = _unlockHandlers.filter((h) => h.id !== id);
  };
}

/** 通知解锁 UI：需要解锁（用于权限被拒时）。只通知第一个活跃 handler，避免重复弹窗 */
export function notifyPermissionDenied(context = {}) {
  // 优先通知"当前可见"的 UI（后注册的通常更贴近当前上下文）
  for (let i = _unlockHandlers.length - 1; i >= 0; i--) {
    const h = _unlockHandlers[i];
    try {
      const handled = h.show(context);
      if (handled !== false) return; // handler 明确返回 false 表示不处理，继续找下一个
    } catch {}
  }
  // 业务方可监听
  if (_onPermissionDenied) {
    for (const cb of _onPermissionDenied) { try { cb(context); } catch {} }
  }
}

/** 关闭所有解锁 UI（解锁成功后清理） */
export function hideAllUnlock() {
  for (const h of _unlockHandlers) {
    try { if (h.hide) h.hide(); } catch {}
  }
}

/**
 * 暂存被拦截的操作，解锁成功后自动重放（队列：多个被拦操作按序重放）。
 * @param {function} retry 返回 Promise 的重试函数（带新 token 重新发起）
 */
export function queuePendingOperation(retry) {
  _pendingOps.push(retry);
}

/** 解锁成功后重放所有 pending 操作（若有） */
export async function replayPending() {
  if (_pendingOps.length === 0) return;
  const ops = _pendingOps;
  _pendingOps = [];
  for (const retry of ops) {
    try { await retry(); } catch {}
  }
}

/** 是否有待重放的操作 */
export function hasPendingOperation() {
  return _pendingOps.length > 0;
}

/** 监听解锁成功（可多个）；返回注销函数 */
export function onUnlocked(cb) {
  if (!_onUnlocked) _onUnlocked = [];
  _onUnlocked.push(cb);
  return () => { _onUnlocked = _onUnlocked.filter((f) => f !== cb); };
}

/** 内部：解锁成功后触发 */
function _emitUnlocked() {
  if (_onUnlocked) {
    for (const cb of _onUnlocked) { try { cb(); } catch {} }
  }
}

/**
 * 统一解锁动作：调 authAdminUnlock，成功存 token 并触发回调/重放。
 * @param {function} rpcCall 底层 rpcCall（用于调 authAdminUnlock）
 * @param {string} password 管理密码
 * @returns {Promise<{ok:boolean, error?:string}>}
 */
export async function unlockAdmin(rpcCall, password) {
  try {
    const res = await rpcCall('authAdminUnlock', { password });
    if (res?.ok) {
      const token = res.value?.adminToken || '';
      setAdminToken(token);
      hideAllUnlock();
      _emitUnlocked();
      await replayPending();
      return { ok: true };
    }
    return { ok: false, error: res?.error?.message || '管理员密码错误' };
  } catch (err) {
    return { ok: false, error: err?.message || '解锁请求失败' };
  }
}

/** 重置（测试/调试用） */
export function _resetForTest() {
  _token = '';
  _unlockHandlers = [];
  _pending = null;
  _onUnlocked = null;
  _onPermissionDenied = null;
}
