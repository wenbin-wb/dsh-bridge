// DSH 私有存储读取（workspace.json / session_projcache.json 兜底）
// 自 conversation-bridge.js 拆出。策略：内存服务（workspaceRegistry）优先，
// 仅当内存服务缺失时才落盘读 DSH 存储；文件不存在时安全返回空值。
// 注意：不再以 ctx._mock 作为跳过依据——测试通过提供内存服务或注入 DSH_HOME 保持隔离。
import { existsSync, readFileSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, basename } from 'node:path'
import { homedir } from 'node:os'

export function getArchivedSessionIds(ctx) {
  const archived = new Set()
  // 1. 尝试从 ctx.workspaceRegistry 内存服务读取
  try {
    const list = ctx?.workspaceRegistry?.archivedSessionIds
    if (Array.isArray(list)) {
      for (const id of list) {
        if (id) archived.add(String(id))
      }
      return archived
    }
  } catch { /* ignore */ }

  // 2. 尝试从 DSH workspace 存储文件（$DSH_HOME/storages/workspace.json）读取兜底
  {
    try {
      const home = process.env.DSH_HOME || join(homedir(), '.dsh')
      const wsFile = join(home, 'storages', 'workspace.json')
      if (existsSync(wsFile)) {
        const data = JSON.parse(readFileSync(wsFile, 'utf8'))
        const fileArchived = data?.global?.archivedSessionIds
        if (Array.isArray(fileArchived)) {
          for (const id of fileArchived) {
            if (id) archived.add(String(id))
          }
        }
      }
    } catch { /* ignore */ }
  }

  return archived
}

/**
 * 安全探测 ctx 上的非 inject 属性。
 * 宿主 cordis 上下文对插件未在 inject 中声明的属性读取会直接抛错
 * （'cannot get property "x" without inject'），因此内存注入点（测试夹具用）
 * 必须经 try/catch 探测，绝不能让异常外溢到命令路径。
 *
 * 这不仅是"防御性写法"，而是**崩溃边界**：探测点若位于宿主的 session 事件回调里
 * （会话桥 onEvent），未捕获的 cordis 异常会冒泡成 `dsh: fatal load failure`，
 * 让整个宿主进程退出（实测 2026-10-16 03:02 因 workspaceChanges 未探测而崩溃重启）。
 */
export function peekCtxProperty(ctx, key) {
  if (!ctx) return undefined
  try { return ctx[key] } catch { return undefined }
}

// 取文件 mtime（毫秒）。消失/权限异常一律按 0 处理。
// 注意 0 是"时间戳未知"，不是"很旧"：与旧文件比较时（见 pickProjRecord）若旧文件 mtime 已知
// （> 0），结果会倾向于**旧文件**；两者都拿不到时才是 per-record 胜出（0 >= 0）。
// 这是保守取舍——per-record 是否可读仍由 readProjRecordFile 的解析结果决定，
// 时间戳未知不会让本来可读的缓存被丢弃（旧文件缺该 id 时依然回落到 per-record）。
function fileMtimeMs(file) {
  try { return statSync(file).mtimeMs } catch { return 0 }
}

// 读取单个 per-record 投影缓存文件，返回 `{ record, mtimeMs }`（mtime 供与旧布局择一）。
// 文件形状：{ version, record: { identity, rows } }
// 损坏/半写文件返回 undefined（宿主自身也把该格式视为可丢弃的派生数据）。
function readProjRecordFile(file) {
  try {
    const data = JSON.parse(readFileSync(file, 'utf8'))
    const record = data?.record
    if (record && typeof record === 'object') return { record, mtimeMs: fileMtimeMs(file) }
  } catch { /* 半写/损坏/不存在：视为无缓存 */ }
  return undefined
}

// 按 id 惰性探测 per-record 文件，返回 `{ record, mtimeMs }` 或 undefined。
// 候选目录与候选文件名见 resolveProjCacheDirs / projRecordFileNames。
function findProjRecord(id, dirs) {
  for (const dir of dirs) {
    for (const name of projRecordFileNames(id)) {
      const entry = readProjRecordFile(join(dir, name))
      if (entry) return entry
    }
  }
  return undefined
}

/**
 * 读取旧布局（0.1.6-）单文件 `<DSH_HOME>/storages/session_projcache.json`。
 *
 * 该文件由宿主整体重写，无法按 id 局部读取，故一次性读入；同时取文件 mtime，
 * 供与新布局按新鲜度择一。无文件/损坏/形状不符时 sessions 为 null、mtime 为 0。
 *
 * @returns {{ sessions: object|null, mtimeMs: number }}
 */
function readLegacyProjCache(file) {
  try {
    const data = JSON.parse(readFileSync(file, 'utf8'))
    const sessions = data?.tables?.sessions
    if (sessions && typeof sessions === 'object') return { sessions, mtimeMs: fileMtimeMs(file) }
  } catch { /* 无旧文件/损坏：视为无旧布局 */ }
  return { sessions: null, mtimeMs: 0 }
}

/**
 * 旧单文件 vs per-record 两代布局择一（issue #107）。
 *
 * 背景：宿主升级到 per-record 布局后**不再写**旧单文件，旧文件只是升级前的历史快照。
 * 固定优先旧文件会让升级机器的 /sessions 标题永远停在升级时的标题；但也不能简单反转
 * 优先级——只有旧文件的未升级用户会因此全部退化为「新会话」。故逐 id 按 mtime 比新鲜度：
 *   - 两边都有该会话：per-record 的 mtime **大于或等于**旧文件 → 取 per-record
 *     （相等时取新布局：升级后 per-record 是权威来源，相等多为同一次落盘或时间戳精度所致）；
 *     旧文件更新 → 取旧文件（宿主回退旧布局或迁移尚未完成时仍读到最新标题）。
 *   - 只有 per-record：取 per-record。
 *   - 只有旧文件：取旧文件（纯旧布局用户不回归）。
 *   - per-record 存在但解析失败（半写/损坏）：readProjRecordFile 已返回 undefined，
 *     此函数自然回退旧文件。
 *
 * @param {{record: object, mtimeMs: number}|undefined} perRecord per-record 读取结果
 * @param {object|undefined} legacyRecord 旧文件里该 id 的记录（不存在为 undefined）
 * @param {number} legacyMtimeMs 旧文件的 mtime（毫秒）
 * @returns {object|undefined} 消费方期望的 `{ identity, rows }`
 */
function pickProjRecord(perRecord, legacyRecord, legacyMtimeMs) {
  if (perRecord && legacyRecord !== undefined) {
    return perRecord.mtimeMs >= legacyMtimeMs ? perRecord.record : legacyRecord
  }
  if (perRecord) return perRecord.record
  return legacyRecord
}

/**
 * 读取 DSH 官方持久化会话缓存元数据（标题、是否空白、创建时间等）。
 *
 * DSH 0.1.7 起 `session_projcache` 领域改为 **per-record 布局**：
 *   `<DSH_HOME>/storages/session_projcache/sessions/<sessionId>.json`（每条会话一个文件，
 *   顶层 `{ version, record: { identity, rows } }`）。
 * 0.1.6 及更早则是单文件 `<DSH_HOME>/storages/session_projcache.json`
 * （`{ tables: { sessions: { <id>: { identity, rows } } } }`）。
 * 见 @deepseek-ai/dsh-session-projection-cache 的 projectionCacheDomainSpec
 * （`layout: 'per-record'`）。
 *
 * 两种布局都必须支持：只读旧路径会让升级到 0.1.7 的用户标题全部退化为「新会话」，
 * 只读新路径则会让未升级用户回归。两代并存时按 mtime 新鲜度逐 id 择一（见
 * pickProjRecord；不能用固定优先级，issue #107）。
 *
 * 返回**按 id 惰性读取**的代理对象：
 *   - 消费方（session-catalog）只按 sessionId 取值，从不遍历 keys，
 *     因此无需为一次 /sessions 同步读取数百个文件（本机实测 470 个）；
 *   - 形状与旧布局一致（直接给出 `{ identity, rows }`），消费方无需感知差异。
 */
export function getSessionProjCache(ctx) {
  const injected = peekCtxProperty(ctx, 'sessionProjCache')
  if (injected) return injected

  const home = process.env.DSH_HOME || join(homedir(), '.dsh')
  const legacyFile = join(home, 'storages', 'session_projcache.json')
  const recordDirs = resolveProjCacheDirs(home)

  // 旧布局（0.1.6-）：整份一次性读入 + mtime，不进入惰性读取路径
  const legacy = readLegacyProjCache(legacyFile)

  // 新布局（0.1.7+）：按 id 惰性读单文件；cache 存**择一后**的最终 record
  // 纯旧布局用户（升级前）没有任何 per-record 目录：构造期探一次即可跳过全部按 id 探测，
  // 否则每个会话要多付 6 次注定 ENOENT 的打开（470 个会话 ≈ 2800 次），白白拖慢 /sessions。
  const hasRecordDirs = recordDirs.some((dir) => existsSync(dir))
  const cache = new Map()
  const lookup = (id) => {
    if (cache.has(id)) return cache.get(id)
    const perRecord = hasRecordDirs ? findProjRecord(id, recordDirs) : undefined
    const legacyRecord = legacy.sessions && Object.prototype.hasOwnProperty.call(legacy.sessions, id)
      ? legacy.sessions[id]
      : undefined
    const chosen = pickProjRecord(perRecord, legacyRecord, legacy.mtimeMs)
    cache.set(id, chosen)
    return chosen
  }
  const target = legacy.sessions ?? {}
  return new Proxy(target, {
    // 旧布局的 own prop 也不能直接返回：旧文件可能已落后于 per-record（issue #107），
    // get/has 都走同一套择一逻辑；非字符串 prop（Symbol 等）仍交给 Reflect。
    get(_target, prop) {
      if (typeof prop !== 'string') return Reflect.get(target, prop)
      return lookup(prop)
    },
    has(_target, prop) {
      if (typeof prop !== 'string') return Reflect.has(target, prop)
      return !!lookup(prop)
    },
  })
}

/**
 * 投影缓存文件的候选文件名。
 *
 * 命中两种命名世代（都源自宿主的 per-record 布局）：
 *   - 官方 `session_projcache`：文件名为**裸 sessionId**（`<id>.json`）；
 *   - 第三方接管的域（本机实测 @michengai/dsh-archive-manager 的
 *     `session_projcache_archive_manager_v2`）：文件名是
 *     `session_<base64url(sha256(sessionId))>`（见其 projcache.js 的
 *     projectionCacheStorageKey，为规避文件名非法字符与长度限制）。
 * 只认其中一种就会在另一世代上读空 → /sessions 标题全部退化成「新会话」。
 */
function projRecordFileNames(id) {
  const names = [`${id}.json`]
  try {
    const hash = createHash('sha256').update(String(id), 'utf8').digest('base64url')
    names.push(`session_${hash}.json`)
  } catch { /* 哈希不可用时只试裸 id */ }
  return names
}

/**
 * 定位投影缓存的 per-record 目录（可多个，按优先级）。
 *
 * `session_projcache` 不是稳定路径：第三方插件可把该存储域整体改名（本机实测
 * dsh-archive-manager → `session_projcache_archive_manager_v2`，更早还有
 * `session_projcache_archive_manager`）。故全部列出、逐个尝试，官方默认路径放最后
 * 兜底；实际命中的那个由「该目录里是否有该会话的文件」决定，而不是靠猜。
 */
function resolveProjCacheDirs(home) {
  const base = join(home, 'storages')
  return [
    join(base, 'session_projcache_archive_manager_v2', 'sessions'),
    join(base, 'session_projcache_archive_manager', 'sessions'),
    join(base, 'session_projcache', 'sessions'),
  ]
}

/** 读取 DSH 官方注册的工作区列表及各自绑定的 sessionIds 列表 */
export async function getRegisteredWorkspaces(ctx) {
  const workspaces = []

  // 优先从内存服务获取
  if (ctx?.workspaceRegistry) {
    try {
      const list = await ctx.workspaceRegistry.list?.()
      if (Array.isArray(list)) {
        for (const w of list) {
          if (w && w.path) {
            workspaces.push({
              id: w.id || w.path,
              path: w.path,
              title: w.title || basename(w.path),
              sessionIds: Array.isArray(w.sessionIds) ? [...w.sessionIds] : [],
            })
          }
        }
        return workspaces
      }
    } catch { /* ignore */ }
  }

  // 兜底从 workspace.json 存储文件读取
  {
    try {
      const home = process.env.DSH_HOME || join(homedir(), '.dsh')
      const wsFile = join(home, 'storages', 'workspace.json')
      if (existsSync(wsFile)) {
        const data = JSON.parse(readFileSync(wsFile, 'utf8'))
        const wsIds = data?.global?.workspaceIds || Object.keys(data?.tables?.workspaces || {})
        const table = data?.tables?.workspaces || {}
        for (const wId of wsIds) {
          const ws = table[wId]
          if (ws && ws.path) {
            workspaces.push({
              id: wId,
              path: ws.path,
              title: ws.title || basename(ws.path),
              sessionIds: Array.isArray(ws.sessionIds) ? [...ws.sessionIds] : [],
            })
          }
        }
      }
    } catch { /* ignore */ }
  }

  return workspaces
}
