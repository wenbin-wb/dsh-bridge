// 斜杠命令解释器（/sessions /use /new /workspaces /status /help …）
// 自 conversation-bridge.js 拆出。routeCommand(node, text, senderId) 只通过 node 参数
// 访问会话桥能力，目录/渲染逻辑来自 session-catalog.js。
import {
  listSessions, listWorkspaces, validateWorkspacePath, renderSessions,
  sessionsInDisplayOrder, describeTurnEnd, helpText, fmtTime, fmtSessionId,
  sessionLabel, getWorkspaceBasename,
} from './session-catalog.js'
import { isSafeWorkspacePath } from '../security/path-validator.js'
import { basename, normalize } from 'node:path'

export async function routeCommand(node, text, senderId = null) {
  const trimmed = text.trim()

  if (trimmed === '/yes' || trimmed === '/no' || /^[12]$/.test(trimmed)) {
    if (node.resolveApproval(trimmed, senderId)) return true
  }

  // Agent 决策问答（ask_user_question）的作答。顺序很重要：必须在"当成普通聊天喂给
  // 模型"之前拦截，否则用户的选项会被当成新指令、与问题错位。
  //   /ask 1         ← 答单问（选第 1 项）
  //   /ask 1; 2=1    ← 多问分别作答
  //   /ask =自由文本  ← 自由输入
  //   /ask           ← 无参数：重新展示当前问题（用户忘了内容时很常用）
  const bareAsk = /^\/(?:ask|answer)\s*$/i.test(trimmed)
  const hasAsk = /^\/(?:ask|answer)\b/i.test(trimmed)
  if (bareAsk) {
    if (node.hasPendingAsk?.()) {
      await node.resendAsk?.(senderId)
      return true
    }
    // 没有待答问题时明确说明，而不是让它落进模型（避免莫名多一轮）
    await node.sendText('ℹ️ 当前没有待你回答的问题。')
    return true
  }
  if (hasAsk) {
    if (await node.resolveAsk?.(trimmed, senderId)) return true
  }
  // 便利路径（仅在有唯一待答问题时生效）：手机端直接回 `1`/`1,3` 就算作答。
  // 刻意收得很窄——必须是**纯选项编号**，避免把"1"、"2" 之类的正常聊天劫持成答案。
  if (!trimmed.startsWith('/') && node.hasPendingAsk?.() && node.pendingAskCount?.() === 1
      && /^\d+(\s*[,，]\s*\d+)*$/.test(trimmed)) {
    if (await node.resolveAsk?.(trimmed, senderId)) return true
  }

  if (!trimmed.startsWith('/')) return false

  const [command, ...rest] = trimmed.slice(1).split(/\s+/)
  switch (command) {
    case 'help':
      await node.sendText(helpText())
      return true
    case 'sessions':
    case 'list':
      await node.sendText(await renderSessions(node))
      return true
    case 'diff':
    case 'patch':
      // 导出本轮改动补丁（数据来自宿主 workspaceChanges，见 conversation-bridge.sendSessionDiff）
      await node.sendSessionDiff()
      return true
    case 'model':
    case 'models':
      // issue #91：模型目录与选择（写本平台配置，对该平台新建/重新接入的会话生效）
      await node.handleModelCommand(rest.join(' '))
      return true
    case 'use':
    case 'resume': {
      const index = Number(rest[0])
      const sessions = sessionsInDisplayOrder(await listSessions(node))
      if (!Number.isInteger(index) || index < 1 || index > sessions.length) {
        await node.sendText(`❌ **无效会话编号**：\`${rest[0] ?? ''}\`\n\n> 可用编号范围：\`1 – ${sessions.length}\`（发送 \`/sessions\` 查看会话列表）`)
        return true
      }
      const session = sessions[index - 1]
      node.setActiveSessionById(session.id)
      const title = session.title || (session.events ? sessionLabel(session) : '')
      const titleLine = title ? `\n- **标题**：${title}` : ''
      await node.sendText(`✓ **已切换到会话 #${index}**${titleLine}\n- **会话 ID**：\`${fmtSessionId(session.id)}\``)
      return true
    }
    case 'rename': {
      if (!node.activeSessionId) {
        await node.sendText(`❌ **当前没有活动会话**\n\n> 请先使用 \`/sessions\` 查看会话列表并通过 \`/use 编号\` 切换到目标会话，或通过 \`/new <提示词>\` 创建新会话。`)
        return true
      }
      const newTitle = rest.join(' ').trim()
      if (!newTitle) {
        await node.sendText(`❌ **缺少新标题参数**\n\n> 用法：\`/rename <新标题>\`\n> 示例：\`/rename 优化登录交互逻辑\``)
        return true
      }

      try {
        const session = node.activeSession()
        if (!session) {
          // 会话尚未在内存中恢复（如宿主刚重启）：DSH 的会话标题服务只接受 live 会话，
          // 此时无法真正改名，明确告知而不是回复一句"成功"却什么都没发生
          await node.sendText(`❌ **无法重命名**：当前会话尚未恢复（宿主重启后需先发一条消息重新挂载）。\n\n> 发送任意消息后再次执行 \`/rename <新标题>\` 即可。`)
          return true
        }
        // 首选 DSH 原生会话标题服务：rename() 会追加 session/title 事件并落盘，
        // 宿主重启与 Web 侧边栏都能看到。注意 sessionPersistence 并不提供 update()
        // （真实方法只有 create/open/stat/list/...），旧写法被可选链静默跳过，
        // 导致 /rename 只改了内存对象、重启即失效。
        const titleService = node.ctx.get?.('sessionTitle')
        if (titleService?.rename) {
          titleService.rename(session, newTitle)
        } else {
          // 旧版 DSH 回退：内存标题立即可见，并尝试历史持久化接口（存在才用）
          session.title = newTitle
          if (node.ctx.sessionPersistence?.update) {
            await node.ctx.sessionPersistence.update(node.activeSessionId, { title: newTitle }).catch(() => {})
          }
        }
        await node.sendText(`✓ **会话重命名成功**\n- **会话 ID**：\`${fmtSessionId(node.activeSessionId)}\`\n- **新标题**：${newTitle}`)
      } catch (err) {
        await node.sendText(`❌ **重命名失败**：${err instanceof Error ? err.message : String(err)}`)
      }
      return true
    }
    case 'workspaces': {
      const workspaces = await listWorkspaces(node)
      if (workspaces.length === 0) {
        await node.sendText(`## 🗂️ 可用工作区\n\n> 当前没有已注册的工作区。可使用 \`/new <提示词> @<路径>\` 指定项目目录。`)
        return true
      }
      const rows = workspaces.map((w, i) => {
        const titleStr = w.title && w.title !== w.path ? w.title : getWorkspaceBasename(w.path)
        const safeTitle = titleStr.replace(/\|/g, '｜')
        return `| **@${i + 1}** | ${safeTitle} | \`${w.path}\` |`
      })
      await node.sendText([
        `## 🗂️ 可用工作区 (共 ${workspaces.length} 个)`,
        `> 新建会话：发送 \`/new <提示词> @序号\` 或 \`/new <提示词> @路径\``,
        '',
        '| 序号 | 工作区名称 | 目录路径 |',
        '| :--- | :--- | :--- |',
        ...rows,
      ].join('\n'))
      return true
    }
    case 'addworkspace': {
      const targetPath = rest.join(' ').trim()
      if (!targetPath) {
        await node.sendText(`❌ **缺少工作区路径**\n\n> 用法：\`/addworkspace <电脑绝对路径>\`\n> 示例：\`/addworkspace D:\\IdeaProjects\\my-app\``)
        return true
      }
      try {
        const safetyCheck = await isSafeWorkspacePath(targetPath)
        if (!safetyCheck.valid) {
          await node.sendText(`⚠️ **${safetyCheck.error || '路径安全校验未通过'}**：\`${targetPath}\`\n\n> 出于安全考虑，禁止将系统关键目录或敏感配置文件所在路径登记为工作区。`)
          return true
        }
        const resolved = safetyCheck.path
        const title = basename(resolved) || resolved
        if (node.ctx.workspaceRegistry?.add) {
          await node.ctx.workspaceRegistry.add({ path: resolved, title }).catch(() => {})
        } else if (node.ctx.workspaceRegistry?.register) {
          await node.ctx.workspaceRegistry.register({ path: resolved, title }).catch(() => {})
        }
        const workspaces = await listWorkspaces(node)
        const foundIndex = workspaces.findIndex(w => normalize(w.path) === normalize(resolved))
        const numStr = foundIndex >= 0 ? `@${foundIndex + 1}` : ''
        await node.sendText([
          `✓ **工作区添加成功**！`,
          `- **名称**：${title}`,
          `- **路径**：\`${resolved}\``,
          foundIndex >= 0 ? `- **快捷编号**：\`${numStr}\`` : '',
          '',
          `> 发送 \`/new <提示词> ${numStr || '@' + resolved}\` 即可直接在此工作区创建会话。`,
        ].filter(Boolean).join('\n'))
      } catch (err) {
        await node.sendText(`❌ **添加工作区失败**：${err instanceof Error ? err.message : String(err)}`)
      }
      return true
    }
    case 'new': {
      // 解析尾部 @N 或 @路径 作为工作区 cwd
      const args = rest.join(' ').trim()
      let cwd
      let prompt = args
      const atMatch = args.match(/\s+@(\S+)$/)
      if (atMatch) {
        prompt = args.slice(0, atMatch.index).trim()
        const sel = atMatch[1]
        const workspaces = await listWorkspaces(node)
        if (/^\d+$/.test(sel)) {
          const idx = Number(sel)
          const ws = workspaces[idx - 1]
          if (ws) cwd = ws.path
          else {
            await node.sendText(`❌ **无效工作区编号**：\`${sel}\`\n\n> 请发送 \`/workspaces\` 查看可用工作区列表与编号。`)
            return true
          }
        } else {
          // 直接指定路径时，规范化并校验（必须完全匹配已注册工作区）
          const validation = await validateWorkspacePath(node, sel)
          if (!validation.valid) {
            await node.sendText(validation.error)
            return true
          }
          cwd = validation.path
        }
      }
      await node.createSession(prompt, cwd)
      return true
    }
    case 'stop': {
      node.stopAllHeartbeats()
      const agent = node.activeAgent()
      if (!agent) {
        await node.sendText(`ℹ️ **当前没有正在运行的 Agent 任务**`)
      } else {
        agent.cancel({ kind: 'user' })
        await node.sendText(`⏹ **已请求停止当前任务**`)
      }
      return true
    }
    case 'end': {
      node.stopAllHeartbeats()
      // 结束当前会话：停止 agent 并清除活动会话（进入"没有活动会话"状态）
      const agent = node.activeAgent()
      if (agent) agent.cancel({ kind: 'user' })
      node.activeSessionId = null
      await node.onActiveSessionChange?.(null)
      await node.sendText(`✓ **已结束当前会话**（没有活动会话）。\n\n> **后续操作**：\n> - \`/new <提示词>\` — 新建会话并开始\n> - \`/sessions\` — 查看历史会话列表\n> - \`/help\` — 查看常用指令帮助`)
      return true
    }
    case 'status': {
      const agent = node.activeAgent()
      const session = node.activeSession()
      if (!session) {
        await node.sendText(`## 📊 Agent 状态看板\n\n> 当前没有活动会话。\n> 发送 \`/new <提示词>\` 开始新任务，或发送 \`/sessions\` 查看已有会话。`)
        return true
      }
      const statusMap = {
        idle: '空闲 (idle)',
        running: '运行中 (running)',
        paused: '已暂停 (paused)',
        error: '异常 (error)',
      }
      const status = statusMap[agent?.status] || (agent?.status ?? '空闲 (idle)')
      const lastTurn = [...(session.events ?? [])].reverse().find((e) => e.type === 'turn/end')
      const reason = lastTurn ? describeTurnEnd(lastTurn.data.reason) : '尚未运行'
      const title = session.title || (session.events ? sessionLabel(session) : '')
      const shortId = fmtSessionId(session.id)
      const cwd = session.header?.cwd || node.config?.cwd || ''

      const content = [
        `## 📊 Agent 状态看板`,
        '',
        '| 属性 | 当前状态 / 参数 |',
        '| :--- | :--- |',
        `| **会话 ID** | \`${shortId}\` |`,
        ...(title ? [`| **会话标题** | ${title.replace(/\|/g, '｜')} |`] : []),
        ...(cwd ? [`| **工作区** | \`${cwd}\` |`] : []),
        `| **Agent 状态** | ${status} |`,
        `| **累计事件** | ${session.seq ?? 0} 条 |`,
        `| **最近执行** | ${reason} |`,
      ].join('\n')

      await node.sendText(content)
      return true
    }
    case 'start': // 别名：首次扫码自动开始一个会话
      await node.createSession('')
      return true
    default:
      await node.sendText(`❌ **未知指令**：\`/${command}\`\n\n${helpText()}`)
      return true
  }
}
