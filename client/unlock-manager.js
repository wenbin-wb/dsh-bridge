// 统一管理员解锁管理器（client/unlock-manager.js）
//
// 背景：多个 RPC 封装（BridgePanel 的 authRpcCall、目录选择器的 authRpc）都会遇到
// "需要管理员权限" 的拦截，此前各自处理、目录选择器甚至没有解锁入口导致流程卡死。
// 本模块把"token 管理 + 权限拦截检测 + 解锁动作 + 被拦截操作自动重放"统一收敛。
//
// 设计要点：
//   - token 与 sessionStorage 同步，是本插件唯一的 adminToken 缓存来源
//   - 权限失败 -> 解锁成功 -> 自动重放被拦截的 RPC（pending 队列）
//   - 与具体 UI 框架解耦，纯 JS 单例

const SESSION_KEY = 'dsh_admin_token';

let _token = '';
let _pendingOps = [];           // 被拦截待重放的操作队列（解锁后按序重放）
let _onUnlocked = null;         // 解锁成功后的全局回调（可多个）

// 读写 sessionStorage
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

/**
 * 本机（回环）场景：从多候选 URL 获取 loopback adminToken（免输密码直通管理）。
 * 支持 3080 原生端口与 3082 代理端口；不信任 sessionStorage 里的旧 token
 * ——DSH 重启后 adminSessions 清空，旧 token 失效，因此强制每次获取新的。
 * 返回 null 表示获取失败（非本机 / 端点不可达）。
 * @param {boolean} [force] true 时忽略已缓存 token 强制重取（默认 true）
 */
export async function fetchLoopbackTokenOnce(force = true) {
  if (typeof window === 'undefined') return null;
  if (!force) {
    const existing = getAdminToken();
    if (existing) return existing;
  }
  const candidates = [
    '/__dsh_bridge__/loopback-token',
    'http://127.0.0.1:3082/__dsh_bridge__/loopback-token',
    'http://localhost:3082/__dsh_bridge__/loopback-token',
  ];
  for (const url of [...new Set(candidates)]) {
    try {
      const res = await fetch(url, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data?.ok && data.adminToken) {
          setAdminToken(data.adminToken);
          return data.adminToken;
        }
      }
    } catch {}
  }
  return null;
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
      _emitUnlocked();
      await replayPending();
      return { ok: true };
    }
    return { ok: false, error: res?.error?.message || '管理员密码错误' };
  } catch (err) {
    // 访问会话失效（HTTP 401）：authAdminUnlock 即使豁免，主面板后续请求也会 401，
    // 解锁成功也进不去。此时应整页重载回绿色登录页重新获取访问会话。
    const msg = String(err?.message || err || '');
    if (msg.includes('401') || msg.includes('transport failure') || msg.includes('unauthorized')) {
      if (typeof window !== 'undefined' && typeof window.location?.reload === 'function') {
        try {
          window.sessionStorage.setItem('dsh_access_expired_reloaded', '1');
        } catch {}
        window.location.reload();
      }
    }
    return { ok: false, error: err?.message || '解锁请求失败' };
  }
}
