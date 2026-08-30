// DSH 私有存储读取（workspace.json / session_projcache.json 兜底）
// 自 conversation-bridge.js 拆出。策略：内存服务（workspaceRegistry）优先，
// 仅当内存服务缺失时才落盘读 DSH 存储；文件不存在时安全返回空值。
// 注意：不再以 ctx._mock 作为跳过依据——测试通过提供内存服务或注入 DSH_HOME 保持隔离。
import { existsSync, readFileSync } from 'node:fs'
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

/** 读取 DSH 官方持久化会话缓存元数据（标题、是否空白、创建时间等） */
export function getSessionProjCache(ctx) {
  if (ctx?.sessionProjCache) return ctx.sessionProjCache
  try {
    const home = process.env.DSH_HOME || join(homedir(), '.dsh')
    const cacheFile = join(home, 'storages', 'session_projcache.json')
    if (existsSync(cacheFile)) {
      const data = JSON.parse(readFileSync(cacheFile, 'utf8'))
      return data?.tables?.sessions || {}
    }
  } catch { /* ignore */ }
  return {}
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
