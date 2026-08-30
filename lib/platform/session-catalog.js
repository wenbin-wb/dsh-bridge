// 会话目录：DSH 会话/工作区列表组织、渲染与格式化工具
// 自 conversation-bridge.js 拆出。私有存储兜底见 dsh-storage.js。
import { statSync } from 'node:fs'
import { normalize, resolve } from 'node:path'
import { isSafeWorkspacePath } from '../security/path-validator.js'
import { getArchivedSessionIds, getSessionProjCache, getRegisteredWorkspaces } from './dsh-storage.js'

export function sessionLabel(session) {
  for (const event of session.events ?? []) {
    if (event.type === 'user/message') {
      const blocks = event.data.content ?? []
      const text = blocks
        .filter((block) => block.type === 'text')
        .map((block) => block.text ?? '')
        .join(' ')
        .trim()
      if (text) return text.length > 28 ? `${text.slice(0, 28)}…` : text
    }
  }
  return '新会话 (待输入)'
}

// 校验工作区路径（防止路径遍历攻击）
export async function validateWorkspacePath(node, sel) {
  const normalized = normalize(resolve(sel))
  const workspaces = await listWorkspaces(node)
  const allowedPaths = workspaces.map(w => normalize(resolve(w.path)))
  
  if (!allowedPaths.includes(normalized)) {
    const wsDisplay = allowedPaths.slice(0, 5).map((p, i) => `- \`[${i + 1}]\` \`${p}\``).join('\n')
    const more = allowedPaths.length > 5 ? `\n- *…等共 ${allowedPaths.length} 个工作区*` : ''
    return {
      valid: false,
      error: `❌ **路径不在已注册工作区列表中**：\`${normalized}\`\n\n**可用工作区：**\n${wsDisplay}${more}\n\n> 提示：发送 \`/workspaces\` 查看完整列表`
    }
  }
  
  // 校验目录存在
  let ok
  try { ok = statSync(normalized).isDirectory() } catch { ok = false }
  if (!ok) {
    return {
      valid: false,
      error: `❌ **工作区目录不存在**：\`${normalized}\``
    }
  }
  
  return { valid: true, path: normalized }
}

// 从事件日志折叠会话标题（本地实现，等价 DSH foldSessionTitle）：优先取最后的
// session/title 事件（DSH 生成的会话名），否则回退到第一条用户消息文本。
export function foldTitle(events) {
  const evts = events ?? []
  for (let i = evts.length - 1; i >= 0; i--) {
    const e = evts[i]
    if (e && e.type === 'session/title' && e.data?.title) return String(e.data.title)
  }
  return null
}

export function isSubagentSession(cacheRow, liveSession) {
  if (liveSession?.origin === 'subagent' || liveSession?.header?.origin === 'subagent') return true
  const subVal = cacheRow?.rows?.subagent?.val
  if (subVal && typeof subVal === 'object' && Object.keys(subVal).length > 0) return true
  return false
}

export function formatGoalTitle(raw) {
  if (typeof raw === 'string' && raw) return raw
  if (raw && typeof raw === 'object') {
    const obj = raw.objective ?? raw.goal?.objective ?? raw.title
    if (typeof obj === 'string' && obj) return obj
  }
  return ''
}

// 列出会话：严格对齐 DSH Web 端侧边栏会话树逻辑。
// 1. 过滤已归档会话 (archivedSessionIds)
// 2. 过滤未发起提问的空白会话 (blank: true)
// 3. 过滤子代理内部会话 (subagent origin)
// 4. 严格按工作区账本 (workspace.sessionIds) 组织
export async function listSessions(node) {
  const archived = getArchivedSessionIds(node.ctx)
  const projCache = getSessionProjCache(node.ctx)
  const workspaces = await getRegisteredWorkspaces(node.ctx)

  // 内存活跃会话（按 id 索引）
  const liveList = [...(node.ctx.sessions?.list?.() ?? [])].filter(
    (s) => s && s.id && !archived.has(s.id) && !s.archived && !s.header?.archived
  )
  const liveById = new Map(liveList.map((s) => [s.id, s]))

  const accounted = new Set()
  const result = []

  // 1. 如果存在已注册的工作区，严格按工作区及其 sessionIds 账本组织（与 Web 端完全一致）
  if (workspaces.length > 0) {
    for (const ws of workspaces) {
      const normWsPath = ws.path ? normalize(ws.path).toLowerCase() : ''

      // 优先将当前工作区下新创建但在内存里的 live 会话追加到头部
      for (const s of liveList) {
        const sCwd = s.header?.cwd || s.cwd
        if (sCwd && normalize(sCwd).toLowerCase() === normWsPath && !accounted.has(s.id)) {
          if (isSubagentSession(projCache[s.id], s)) continue
          accounted.add(s.id)
          let title = s.title || (s.events ? foldTitle(s.events) : '')
          if (!title) {
            const cache = projCache[s.id]
            title = cache?.rows?.title?.val || formatGoalTitle(cache?.rows?.goal?.val)
          }
          result.push({
            id: s.id,
            createdAt: s.header?.createdAt || Date.now(),
            cwd: ws.path,
            workspaceTitle: ws.title,
            title: title || '新会话',
            events: s.events,
            seq: s.seq ?? 0,
          })
        }
      }

      // 按工作区账本存储的 sessionIds 顺序追加已记录会话
      for (const sId of ws.sessionIds) {
        if (archived.has(sId) || accounted.has(sId)) continue
        accounted.add(sId)

        const cache = projCache[sId]
        const live = liveById.get(sId)
        // 过滤空白草稿会话（非当前活动会话）
        if (cache?.rows?.sessionListMetadata?.val?.blank === true && sId !== node.activeSessionId) {
          continue
        }
        // 过滤子代理内部会话
        if (isSubagentSession(cache, live)) {
          continue
        }

        let title = cache?.rows?.title?.val || formatGoalTitle(cache?.rows?.goal?.val)
        let createdAt = cache?.identity?.createdAt || 0
        let cwd = ws.path

        // 如果内存有该会话，提取最新数据
        if (live) {
          title = live.title || (live.events ? foldTitle(live.events) : '') || title
          createdAt = live.header?.createdAt || createdAt
        } else if (!title && node.ctx.sessionPersistence?.load) {
          try {
            const insp = await node.ctx.sessionPersistence.load(sId)
            title = foldTitle(insp.events ?? []) ?? undefined
          } catch {}
        }

        result.push({
          id: sId,
          createdAt,
          cwd,
          workspaceTitle: ws.title,
          title: title || '新会话',
          events: live?.events,
          seq: live?.seq ?? 0,
        })
      }
    }

    // 处理当前内存中处于活动状态但未绑定任何工作区的 live 会话
    for (const s of liveList) {
      if (accounted.has(s.id)) continue
      if (isSubagentSession(projCache[s.id], s)) continue
      accounted.add(s.id)
      const title = s.title || (s.events ? foldTitle(s.events) : '') || '未分组会话'
      result.push({
        id: s.id,
        createdAt: s.header?.createdAt || Date.now(),
        cwd: s.header?.cwd || '(未指定)',
        workspaceTitle: '未指定工作区',
        title,
        events: s.events,
        seq: s.seq ?? 0,
      })
    }
  } else {
    // 2. 如果系统未注册任何工作区（如单目录/无工作区模式），降级读取内存及持久化会话
    for (const s of liveList) {
      accounted.add(s.id)
      const title = s.title || (s.events ? foldTitle(s.events) : '') || '活跃会话'
      result.push({
        id: s.id,
        createdAt: s.header?.createdAt || Date.now(),
        cwd: s.header?.cwd || '(未指定)',
        workspaceTitle: '未指定工作区',
        title,
        events: s.events,
        seq: s.seq ?? 0,
      })
    }
    if (node.ctx.sessionPersistence?.list) {
      try {
        const headers = await node.ctx.sessionPersistence.list()
        if (Array.isArray(headers)) {
          const coldHeaders = headers.filter((h) => h && h.id && !accounted.has(h.id) && !archived.has(h.id) && !h.archived)
          for (const h of coldHeaders) {
            accounted.add(h.id)
            let title
            try {
              const insp = await node.ctx.sessionPersistence.load(h.id)
              title = foldTitle(insp.events ?? []) ?? undefined
            } catch {}
            result.push({
              id: h.id,
              createdAt: h.createdAt ?? 0,
              events: undefined,
              seq: 0,
              cwd: h.cwd || '(未指定)',
              workspaceTitle: '未指定工作区',
              title: title || '新会话',
            })
          }
        }
      } catch {}
    }
  }

  return result
}

// 列出可用工作区：使用 DSH 官方 workspaceRegistry。返回 [{title, path}]。
export async function listWorkspaces(node) {
  try {
    const list = await node.ctx.workspaceRegistry?.list?.() ?? []
    const out = []
    for (const ws of list) {
      if (ws && ws.path) out.push({ title: ws.title ?? ws.path, path: ws.path })
    }
    return out.sort((a, b) => String(a.path).localeCompare(String(b.path)))
  } catch {
    return []
  }
}

export function getWorkspaceBasename(cwd) {
  if (!cwd || cwd === '(未指定)') return '(未指定)'
  const norm = normalize(cwd).replace(/[\\/]+$/, '')
  const parts = norm.split(/[\\/]/)
  return parts[parts.length - 1] || cwd
}
export function describeTurnEnd(reason) {
  const kind = reason?.kind ?? 'unknown'
  switch (kind) {
    case 'completed': return '✓ 已完成'
    case 'error': return '❌ 出错'
    case 'aborted': return '⏹ 已停止'
    case 'blocked': return '⚠️ 已阻塞'
    case 'max-tokens': return '⚠️ 输出截断'
    case 'interrupted': return '⚡ 已中断'
    default: return `[${kind}]`
  }
}

export async function renderSessions(node) {
  const all = await listSessions(node)
  if (all.length === 0) {
    return `## 📋 会话列表\n\n> 暂无历史会话。发送 \`/new <提示词>\` 开始新会话。`
  }
  // 按工作区分组（保持 listSessions 中的工作区账本顺序）
  const groups = new Map()
  for (const s of all) {
    const key = s.cwd || '(未指定)'
    if (!groups.has(key)) {
      groups.set(key, { title: s.workspaceTitle || getWorkspaceBasename(key), sessions: [] })
    }
    groups.get(key).sessions.push(s)
  }
  const parts = [
    `## 📋 会话列表 (共 ${all.length} 个)`,
    `> 切换会话：发送 \`/use 编号\` 或 \`/resume 编号\``,
    '',
  ]
  // 编号必须与 /use 的全量显示顺序（sessionsInDisplayOrder）一致：
  // 表格里显示的 #N 就是 /use N 切换的会话（此前只对每组前 20 条编号，超长时编号错位）
  const ordered = sessionsInDisplayOrder(all)
  const displayIndex = new Map(ordered.map((s, i) => [s.id, i + 1]))
  for (const [cwd, group] of groups) {
    const groupName = cwd === '(未指定)' ? '📁 未指定工作区' : `📁 **${group.title || getWorkspaceBasename(cwd)}**`
    parts.push(groupName)
    parts.push('')
    parts.push('| 序号 | 会话标题 / 摘要 | 时间 | 状态 |')
    parts.push('| :--- | :--- | :--- | :--- |')
    for (const session of group.sessions.slice(0, 20)) {
      const displayNum = displayIndex.get(session.id) ?? 0
      const isActive = session.id === node.activeSessionId
      const statusTag = isActive ? '`[当前]`' : '-'
      const rawTitle = session.title || (session.events ? sessionLabel(session) : '')
      const titleText = formatGoalTitle(rawTitle) || (typeof rawTitle === 'string' ? rawTitle : '') || '新会话'
      const safeTitle = String(titleText).replace(/\|/g, '｜').replace(/\r?\n/g, ' ')
      const when = session.createdAt ? fmtTime(session.createdAt) : '-'
      parts.push(`| **#${displayNum}** | ${safeTitle} | ${when} | ${statusTag} |`)
    }
    if (group.sessions.length > 20) {
      parts.push(`*…该工作区共 ${group.sessions.length} 个会话，仅显示前 20 个（编号保持全列表序号，可用 /use 直接切换）*`)
    }
    parts.push('')
  }
  if (all.length > 50) parts.push(`*…共 ${all.length} 个会话，仅显示前 50 个*`)
  return parts.join('\n').trim()
}

// 与 renderSessions 完全一致的显示顺序：保持 listSessions 中的分组和顺序。
// /use N 用这个数组索引，保证显示的编号 N 与切换的会话一一对应。
export function sessionsInDisplayOrder(all) {
  const groups = new Map()
  for (const s of all) {
    const key = s.cwd || '(未指定)'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(s)
  }
  return [...groups.values()].flatMap((sessions) => sessions)
}

// 时间戳 → 简洁可读时间 (MM-DD HH:mm 或 YYYY-MM-DD HH:mm)
export function fmtTime(ms) {
  try {
    const d = new Date(ms)
    if (isNaN(d.getTime())) return ''
    const p = (n) => String(n).padStart(2, '0')
    const now = new Date()
    const isSameYear = d.getFullYear() === now.getFullYear()
    const datePart = isSameYear ? `${p(d.getMonth() + 1)}-${p(d.getDate())}` : `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
    return `${datePart} ${p(d.getHours())}:${p(d.getMinutes())}`
  } catch { return '' }
}

// 提取精简会话短 ID（去除冗余 session- 前缀，保留 8 位短标识）
export function fmtSessionId(id) {
  if (!id) return ''
  const clean = String(id).replace(/^session-/, '')
  return clean.length > 8 ? clean.slice(0, 8) : clean
}

export function helpText() {
  return [
    '## 🤖 常用指令帮助',
    '',
    '### 💬 会话控制',
    '| 指令 | 说明 | 示例 |',
    '| :--- | :--- | :--- |',
    '| `/sessions` | 查看所有会话表格列表 | `/sessions` 或 `/list` |',
    '| `/use <编号>` | 切换到指定编号会话 | `/use 1` 或 `/resume 1` |',
    '| `/new <提示词>` | 在当前工作区新建会话 | `/new 帮我写个脚本` |',
    '| `/new <词> @N` | 在指定工作区新建会话 | `/new 帮我写个脚本 @1` |',
    '| `/rename <新标题>` | 重命名当前活动会话 | `/rename 优化登录交互` |',
    '| `/stop` | 中断停止当前正在执行的任务 | `/stop` |',
    '| `/end` | 结束当前会话（回到空闲） | `/end` |',
    '',
    '### 📁 环境与状态',
    '| 指令 | 说明 |',
    '| :--- | :--- |',
    '| `/workspaces` | 查看可用工作区表格列表 |',
    '| `/addworkspace <路径>` | 注册添加新的电脑工作区目录 |',
    '| `/status` | 查看 Agent 运行状态看板 |',
    '| `/help` | 查看此帮助菜单 |',
    '',
    '### 🔐 权限确认',
    '| 指令 | 快捷数字 | 说明 |',
    '| :--- | :--- | :--- |',
    '| `/yes` | `1` | 批准当前工具执行请求 |',
    '| `/no` | `2` | 拒绝当前工具执行请求 |',
  ].join('\n')
}

