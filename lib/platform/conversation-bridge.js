// dsh-bridge 平台无关的会话桥
//
// 承担所有 IM 平台共享的核心逻辑：
//   - 白名单（allowFrom）与首条自动授权
//   - DSH 会话生命周期（创建/切换/停止/恢复 re-attach）
//   - 审批问答（approval request/response，超时自动拒绝）
//   - 出站 digest 摘要 + 心跳进度
//   - 命令路由（/sessions /use /new /workspaces /stop /status /help …）
//   - 会话列表 / 工作区渲染（DSH 官方 API）
//
// 平台相关的部分由子类（或组合）提供：
//   - sendText(text) / sendTyping(state)：向当前 peer 发送
//   - extractTextFrom(message)：从平台消息提取文本
//   - isGroupMessage(message)：判断群消息
//   - handlePlatformInbound(message)：消息解析（返回 { senderId, text, isGroup } 或 null）
//
// 本类不直接依赖任何 IM 协议，只消费 DSH 官方服务：
//   ctx.sessions / ctx.agents / ctx.approval / ctx.sessionPersistence / ctx.workspaceRegistry

import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { randomUUID } from 'node:crypto'
import { statSync, existsSync, readFileSync } from 'node:fs'
import { stat } from 'node:fs/promises'
import { join, resolve, normalize, basename, extname, isAbsolute } from 'node:path'
import { homedir } from 'node:os'
import { isSafeWorkspacePath } from '../security/path-validator.js'

// 纯文本标记（用户偏好不用 emoji）
export const BRIDGE_MARK = {
  ok: '[OK]',
  err: '[错误]',
  stop: '[已停止]',
  idle: '[空闲]',
  turn: '[新会话]',
  ask: '[待确认]',
  welcome: '[IM Bot]',
  list: '[会话列表]',
  status: '[状态]',
  warn: '[注意]',
}

// ---------------------------------------------------------------------------
// 出站分块（通用：按平台 maxMessageChars 硬分块 + 保留 fenced code block）
// ---------------------------------------------------------------------------

const FENCE_RE = /^```([^\n`]*)\s*$/

function normalizeMarkdownBlocks(content) {
  const lines = content.split('\n')
  const out = []
  let blankRun = 0
  let inCode = false
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '')
    if (FENCE_RE.test(line.trim())) {
      inCode = !inCode
      out.push(line)
      blankRun = 0
      continue
    }
    if (inCode) {
      out.push(line)
      continue
    }
    if (!line.trim()) {
      blankRun += 1
      if (blankRun <= 1) out.push('')
      continue
    }
    blankRun = 0
    out.push(line)
  }
  return out.join('\n').trim()
}

function splitMarkdownBlocks(content) {
  const blocks = []
  let current = []
  let inCode = false
  const flush = () => {
    const block = current.join('\n').trim()
    if (block) blocks.push(block)
    current = []
  }
  for (const raw of content.split('\n')) {
    const line = raw.replace(/\s+$/, '')
    if (FENCE_RE.test(line.trim())) {
      if (!inCode && current.length) flush()
      current.push(line)
      inCode = !inCode
      if (!inCode) flush()
      continue
    }
    if (inCode) {
      current.push(line)
      continue
    }
    if (!line.trim()) {
      flush()
      continue
    }
    current.push(line)
  }
  flush()
  return blocks
}

function hardSplit(text, max) {
  const chunks = []
  let rest = text
  while (rest.length > max) {
    chunks.push(rest.slice(0, max))
    rest = rest.slice(max)
  }
  if (rest) chunks.push(rest)
  return chunks
}

function packBlocks(blocks, max) {
  const units = []
  let current = ''
  for (const block of blocks) {
    const candidate = current ? `${current}\n\n${block}` : block
    if (candidate.length <= max) {
      current = candidate
      continue
    }
    if (current) units.push(current)
    if (block.length <= max) {
      current = block
    } else {
      units.push(...hardSplit(block, max))
      current = ''
    }
  }
  if (current) units.push(current)
  return units
}

function splitForIM(content, max = 2000) {
  // 安全检查：防止畸形输入导致无限循环或崩溃
  if (typeof content !== 'string' || content.length === 0) return []
  if (content.length > 1_000_000) {
    content = content.slice(0, 1_000_000) + '\n\n[已截断：内容过长]'
  }
  const normalized = normalizeMarkdownBlocks(content)
  if (!normalized) return []
  if (normalized.length <= max) return [normalized]
  return packBlocks(splitMarkdownBlocks(normalized), max)
}

export function textOfAssistantMessage(message) {
  return (message.content ?? [])
    .filter((block) => block?.type === 'text')
    .map((block) => block.text)
    .join('\n')
}

/**
 * 尝试将任意路径（绝对或相对当前工作区）解析为真实存在的本地文件绝对路径
 */
export function resolveFilePath(rawPath, cwd = process.cwd()) {
  if (typeof rawPath !== 'string') return null
  let p = rawPath.trim()
    .replace(/^["'`]|["'`]$/g, '')
    .replace(/^file:\/\/\/?/, '')
    .replace(/^[📁📄📦\s]+/, '')
  if (!p) return null
  // 排除 HTTP/HTTPS 网址
  if (/^https?:\/\//i.test(p)) return null
  const resolved = isAbsolute(p) ? normalize(p) : resolve(cwd, p)
  try {
    if (statSync(resolved).isFile()) {
      return resolved
    }
  } catch {}
  return null
}

/**
 * 提取并过滤文本中的 [SEND_FILE: <path>] 显式发送指令
 * 由 AI 根据用户意图显式决定何时向用户发送文件附件，杜绝底层盲目扫描与误发。
 * @param {string} text - 原始助手回复文本
 * @param {string} cwd - 会话当前工作目录
 * @returns {{ cleanText: string, files: string[] }}
 */
export function extractAndStripSendFileDirectives(text, cwd = process.cwd()) {
  if (typeof text !== 'string' || !text.trim()) {
    return { cleanText: text || '', files: [] }
  }

  const files = []
  const directiveRegex = /\[(?:SEND_FILE|SEND-FILE|send_file|send-file|SEND_MEDIA|send_media):\s*[`"']?([^\]`"'\r\n]+?)[`"']?\s*\]/gi

  let m
  const re = new RegExp(directiveRegex)
  while ((m = re.exec(text)) !== null) {
    const rawPath = m[1].trim()
    const resolved = resolveFilePath(rawPath, cwd)
    if (resolved && !files.includes(resolved)) {
      files.push(resolved)
    }
  }

  // 从聊天正文中彻底剔除控制指令（保持 IM 聊天气泡的干净整洁）
  const cleanText = text.replace(directiveRegex, '').replace(/\n{3,}/g, '\n\n').trim()

  return { cleanText, files }
}

/**
 * 提取文本中的产物文件路径（基于显式指令）
 */
export function extractFilePathsFromText(text, cwd = process.cwd()) {
  return extractAndStripSendFileDirectives(text, cwd).files
}

// ---------------------------------------------------------------------------
// digest 摘要
// ---------------------------------------------------------------------------

function digestLine(session) {
  let turn = 0
  let tools = 0
  let lastTool = undefined
  let inTurn = false
  for (const event of session.events ?? []) {
    if (event.type === 'turn/start') {
      turn = event.data.turn
      inTurn = true
      tools = 0
      lastTool = undefined
    } else if (event.type === 'turn/end') {
      inTurn = false
    } else if (event.type === 'tool/call' && inTurn) {
      tools += 1
      lastTool = event.data.name
    }
  }
  if (!inTurn || turn === 0) return null
  const steps = tools > 0 ? `${tools} 次工具调用` : '思考中'
  const last = lastTool ? ` | 最近: ${lastTool}` : ''
  return `[处理中] 第 ${turn} 轮 | ${steps}${last}`
}

function summarizeError(error) {
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message).slice(0, 200)
  }
  return String(error).slice(0, 200)
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ---------------------------------------------------------------------------
// 会话桥基类
// ---------------------------------------------------------------------------

export class ConversationBridge {
  /**
   * @param {object} opts
   * @param {object} opts.ctx            Cordis 上下文
   * @param {object} opts.logger         日志器
   * @param {object} [opts.config]       已持久化配置（allowFrom/间隔/活动会话等）
   * @param {object} opts.platform       所属 Platform 实例（提供 accountId/capabilities）—— 必需
   * @param {(senderId: string) => void} [opts.onFirstSender]
   * @param {(sessionId: string) => void} [opts.onActiveSessionChange]
   */
  constructor({ ctx, logger, config = {}, platform, onFirstSender, onActiveSessionChange } = {}) {
    if (!platform) {
      throw new Error('ConversationBridge requires a platform instance')
    }
    
    this.ctx = ctx
    this.logger = logger
    this.platform = platform
    this.onFirstSender = onFirstSender
    this.onActiveSessionChange = onActiveSessionChange

    const maxChars = platform.capabilities?.maxMessageChars ?? 2000
    const rawMax = Number(config.maxMessageChars)
    const safeMaxChars = (Number.isFinite(rawMax) && rawMax > 0) ? rawMax : maxChars
    this.config = {
      allowFrom: Array.isArray(config.allowFrom) ? config.allowFrom : [],
      digestIntervalSec: config.digestIntervalSec ?? 300,
      approvalTimeoutSec: config.approvalTimeoutSec ?? 600,
      maxMessageChars: safeMaxChars,
      sendChunkDelayMs: config.sendChunkDelayMs ?? 1500,
      cwd: config.cwd,
      agentPreset: config.agentPreset,
      agentProvider: config.agentProvider,
      agentModel: config.agentModel,
    }

    // 从配置恢复活动会话（v0.2.1：重启后保持会话）
    // 注意：不在构造函数里调用 _pickDefaultSession()，由 loadConfig 回调负责恢复，避免竞态覆盖
    this.activeSessionId = config.activeSessionId ?? null
    this.peerId = null
    this.pending = new Map() // number -> PendingApproval
    this.approvalCounter = 0
    this.disposers = []

    // 配置恢复状态追踪（用于防止 handleInbound 在配置加载前处理消息）
    this._configRestored = false
    this._restoringConfig = null
    this._restoringSessionMap = new Map() // sessionId -> Promise<Agent|null>

    this.mark = BRIDGE_MARK
    this._attachOutbound()
    this._attachApprovalBridge()
  }

  get gatewayAccountId() {
    return this.platform?.accountId ?? ''
  }

  activeSession() {
    if (!this.activeSessionId) return undefined
    return this.ctx.sessions?.get(this.activeSessionId)
  }

  activeAgent() {
    if (!this.activeSessionId) return undefined
    return this.ctx.agents?.get(this.activeSessionId)
  }

  ownsAgent(agent) {
    return this.activeSessionId !== null && agent?.session?.id === this.activeSessionId
  }

  isAllowed(senderId) {
    if (!Array.isArray(this.config.allowFrom)) return false
    if (this.config.allowFrom.length === 0) return false
    return this.config.allowFrom.includes(senderId)
  }

  setActiveSession(session) {
    this.stopAllHeartbeats()
    this.activeSessionId = session.id
    try { this.onActiveSessionChange?.(session.id) } catch { /* 持久化失败不致命 */ }
  }

  // 仅按 ID 设置活动会话（持久化会话可能没有内存 session 对象），
  // 发消息时通过 re-attach 逻辑拉起 agent。
  setActiveSessionById(id) {
    if (!id) return
    this.stopAllHeartbeats()
    this.activeSessionId = id
    try { this.onActiveSessionChange?.(id) } catch { /* 持久化失败不致命 */ }
  }

  async _pickDefaultSession() {
    const sessions = await listSessions(this)
    if (sessions.length > 0) this.setActiveSessionById(sessions[0].id)
  }

  async createSession(prompt, cwdOverride) {
    // 使用 DSH 原生格式 session-${uuid}，与 ctx.sessions 持久化系统兼容
    const sessionId = `session-${randomUUID()}`
    try {
      const workspaces = await listWorkspaces(this)
      const defaultWsPath = workspaces.length > 0 ? workspaces[0].path : process.cwd()
      const cwd = cwdOverride || this.config.cwd || defaultWsPath
      // 校验指定目录存在且是目录，防止路径遍历
      if (cwdOverride) {
        const validation = await validateWorkspacePath(this, cwdOverride)
        if (!validation.valid) {
          await this.sendText(validation.error)
          return
        }
      }
      const meta = {
        cwd,
        agentPreset: this.config.agentPreset || 'routing-suite',
      }
      const agentOptions = {}
      if (this.config.agentProvider) agentOptions.provider = this.config.agentProvider
      if (this.config.agentModel) agentOptions.model = this.config.agentModel
      if (!agentOptions.provider || !agentOptions.model) {
        try {
          const def = this.ctx.get?.('agentDefaultModel')?.currentSelection?.()
          if (def) {
            if (!agentOptions.provider && def.provider) agentOptions.provider = def.provider
            if (!agentOptions.model && def.model) agentOptions.model = def.model
          }
        } catch { /* 默认模型服务不可用则忽略，交由 DSH 自行处理 */ }
      }
      // 注意：不预创建 ctx.sessions——agents.create 会自己 prepare+enter session
      const handle = await this.ctx.agents.create({ sessionId, meta, agentOptions })
      this.setActiveSession(handle.agent.session)

      // 同步挂载进 DSH 工作区账本 (workspaceRegistry)，使新会话在 Web 侧边栏和 /list 中精准归组
      try {
        const reg = this.ctx.workspaceRegistry
        const entities = reg?.list ? (await reg.list()) : []
        const normCwd = normalize(cwd).toLowerCase()
        const match = (entities || []).find((ws) => ws?.path && normalize(ws.path).toLowerCase() === normCwd)
        if (match?.attachSession) await match.attachSession(sessionId)
      } catch { /* 账本写入失败不影响会话创建 */ }

      if (prompt) {
        const platformName = this.platform?.name || 'IM客户端'
        const promptWithContext = `${prompt}\n\n<!-- [dsh-bridge 提示] 当前用户正通过【${platformName}】与你对话。若用户明确要求发送、导出或传送文件/图片/报表/代码脚本产物，请在本地生成/准备好文件后，在回复正文中附带明确发送指令：\n[SEND_FILE: <本地文件绝对路径>]\n例如：[SEND_FILE: C:\\path\\to\\report.xlsx]\n网关会自动解析该指令并将该文件直传至用户的聊天窗口，且在聊天文本中自动隐藏该指令。在日常编写代码、回复普通文本或未请求发送文件时，请勿输出此指令。 -->`
        handle.agent.followup(createUserMessage({
          content: [{ type: 'text', text: promptWithContext }],
          source: { kind: 'user' },
        }))
      }
      const wsDetail = cwd ? `\n- **工作区**：\`${cwd}\`` : ''
      const hint = prompt ? '' : '\n\n> 💡 发送任意消息即可直接与 Agent 对话。'
      await this.sendText(`✓ **已创建新会话**\n- **会话 ID**：\`${fmtSessionId(handle.agent.session.id)}\`${wsDetail}${hint}`)
    } catch (error) {
      await this.sendText(`❌ **创建会话失败**：${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // ---- 审批 ----

  nextApprovalNumber() {
    this.approvalCounter += 1
    return this.approvalCounter
  }

  registerApproval(number, approval) {
    this.pending.set(number, approval)
  }

  clearApproval(number) {
    const entry = this.pending.get(number)
    if (entry) {
      clearTimeout(entry.timer)
      this.pending.delete(number)
    }
  }

  // 取消并拒绝审批（用于 dispose 清理）
  cancelApproval(number) {
    const entry = this.pending.get(number)
    if (entry) {
      clearTimeout(entry.timer)
      this.pending.delete(number)
      entry.resolve('rejected')  // 触发 Promise，防止泄漏
    }
  }

  resolveApproval(text) {
    const entries = [...this.pending.entries()]
    if (entries.length === 0) return false
    let outcome
    if (text === '/yes') outcome = 'allowed-once'
    else if (text === '/no') outcome = 'rejected'
    if (outcome) {
      const [number, entry] = entries[entries.length - 1]
      // 双重检查：确保此 number 仍在 pending 中（防止超时竞态）
      if (!this.pending.has(number)) return false
      this.clearApproval(number)
      entry.resolve(outcome)
      return true
    }
    if ((text === '1' || text === '2') && entries.length === 1) {
      const [number, entry] = entries[0]
      // 双重检查：确保此 number 仍在 pending 中（防止超时竞态）
      if (!this.pending.has(number)) return false
      this.clearApproval(number)
      entry.resolve(text === '1' ? 'allowed-once' : 'rejected')
      return true
    }
    return false
  }

  stopAllHeartbeats() {
    if (this._digestState) {
      for (const state of this._digestState.values()) {
        if (state && state.heartbeat) {
          clearInterval(state.heartbeat)
          state.heartbeat = undefined
        }
      }
    }
  }

  dispose() {
    this.stopAllHeartbeats()
    for (const disposer of this.disposers) {
      try { disposer() } catch { /* 忽略 */ }
    }
    this.disposers = []
    for (const number of [...this.pending.keys()]) this.cancelApproval(number)
    // 清理所有引用，防止内存泄漏
    this.peerId = null
    this.activeSessionId = null
    this._restoringConfig = null
  }

  // ---- 入站核心（平台无关）----
  //
  // 子类解析出平台消息后调用本方法：
  //   await bridge.handleInbound({ senderId, text, isGroup })
  //
  // 返回：
  //   'ignored'   消息被忽略（未授权/群消息/空消息）
  //   'routed'    消息已路由到 agent
  async handleInbound({ senderId, text, isGroup = false }) {
    try {
      // 等待配置恢复完成（防止启动时竞态）
      if (this._restoringConfig) {
        await this._restoringConfig
      }

      const sender = String(senderId ?? '').trim()
      if (!sender) return 'ignored'

      if (!this.isAllowed(sender)) {
        // 自动授权：
        //  - 单聊：白名单为空时，首个发消息的真实用户自动纳入白名单
        //  - 群聊：首次 @机器人 的群自动纳入（群维度授权，群内成员均可使用）
        // 这是"登录后第一条消息/首次被 @即完成授权"的一步到位体验。
        const shouldAutoApprove = Boolean(text?.trim()) && (
          this.config.allowFrom.length === 0 || // 白名单为空：单聊/群聊都自动授权
          isGroup                                // 群聊：始终自动授权群
        )
        if (shouldAutoApprove) {
          this.config.allowFrom = Array.from(new Set([...this.config.allowFrom, sender]))
          this.logger?.info?.(`[dsh-bridge ${this.platform.id}] auto-approved ${isGroup ? 'group' : 'sender'} ${sender} into allowlist`)
          try {
            await this.onFirstSender?.(sender)
          } catch (err) {
            this.logger?.warn?.(`[dsh-bridge ${this.platform.id}] failed to persist first sender: ${err instanceof Error ? err.message : String(err)}`)
          }
        } else {
          this.logger?.info?.(`[dsh-bridge ${this.platform.id}] media-only first message from ${sender} not auto-approved (waiting for text)`)
        }

        // 如果仍未通过白名单，拒绝处理（防止绕过白名单）
        if (!this.isAllowed(sender)) {
          this.logger?.info?.(`[dsh-bridge ${this.platform.id}] ignore message from non-allowlisted sender ${sender} (never fed to model)`)
          return 'ignored'
        }
      }

      // 仅在不支持群聊的平台忽略群消息（QQ 等支持群聊的平台放行）
      if (isGroup && !this.platform?.capabilities?.supportsGroup) {
        this.logger?.info?.(`[dsh-bridge ${this.platform.id}] ignore group message from ${sender} (no group support)`)
        return 'ignored'
      }

      const fullText = text?.trim() ?? ''
      if (!fullText) {
        this.logger?.info?.(`[dsh-bridge ${this.platform.id}] ignore empty message from ${sender}`)
        return 'ignored'
      }

      this.peerId = sender

      if (await routeCommand(this, fullText)) return 'routed'

      let agent = this.activeAgent()
      if (!agent && this.activeSessionId) {
        const sessionId = this.activeSessionId
        if (this._restoringSessionMap.has(sessionId)) {
          try {
            await this._restoringSessionMap.get(sessionId)
          } catch { /* 错误已在原始 Promise 中捕获 */ }
          agent = this.activeAgent()
        } else {
          const restorePromise = (async () => {
            // agent 不在内存（DSH 重启后或切换到持久化会话）→ re-attach。
            try {
              const agentOptions = {}
              if (this.config.agentProvider) agentOptions.provider = this.config.agentProvider
              if (this.config.agentModel) agentOptions.model = this.config.agentModel
              if (!agentOptions.provider || !agentOptions.model) {
                try {
                  const def = this.ctx.get?.('agentDefaultModel')?.currentSelection?.()
                  if (def) {
                    if (!agentOptions.provider && def.provider) agentOptions.provider = def.provider
                    if (!agentOptions.model && def.model) agentOptions.model = def.model
                  }
                } catch { /* ignore */ }
              }

              // 判断该 session 是否已持久化：已持久化 → agents.resume（从持久化加载历史恢复，
              // 避免 agents.create 用空 seed 与已持久化事件冲突）；未持久化 → agents.create。
              let persisted = false
              try {
                const headers = await this.ctx.sessionPersistence?.list?.()
                persisted = Array.isArray(headers) && headers.some((h) => h?.id === sessionId)
              } catch { /* 读取失败则按未持久化处理 */ }

              let handle
              if (persisted) {
                handle = await this.ctx.agents.resume({
                  resumeSessionId: sessionId,
                  agentOptions,
                })
              } else {
                handle = await this.ctx.agents.create({
                  sessionId,
                  meta: { cwd: this.config.cwd || process.cwd() },
                  agentOptions,
                })
              }
              const resumedAgent = handle?.agent
              this.logger?.info?.(`[dsh-bridge ${this.platform.id}] re-attached agent to session ${sessionId} (${persisted ? 'resume' : 'create'})`)
              return resumedAgent
            } catch (err) {
              const reason = err instanceof Error ? err.message : String(err)
              this.logger?.warn?.(`[dsh-bridge ${this.platform.id}] failed to re-attach agent: ${reason}`)
              // 清除失效的 activeSessionId，避免用户误以为还在旧会话中
              if (this.activeSessionId === sessionId) {
                this.activeSessionId = null
              }
              await this.sendText(`❌ **恢复会话失败**：${reason}\n\n> 发送 \`/new <提示词>\` 可新建一个会话。`)
              return null
            }
          })().finally(() => {
            this._restoringSessionMap.delete(sessionId)
          })

          this._restoringSessionMap.set(sessionId, restorePromise)
          agent = await restorePromise
        }
      }
      if (!agent) {
        await this.sendText(`> 💤 **当前没有活动会话**\n> 发送 \`/new <提示词>\` 开始新会话，或发送 \`/sessions\` 查看已有会话。`)
        return 'routed'
      }

      // 针对微信/IM客户端用户，注入上下文提示，规范 Agent 仅在需要向用户发送文件附件时输出 [SEND_FILE: <文件绝对路径>]
      const promptWithContext = `${fullText}\n\n<!-- [dsh-bridge 提示] 当前用户正通过【${this.platform.name}】与你对话。若用户明确要求发送、导出或传送文件/图片/报表/代码脚本产物，请在本地生成/准备好文件后，在回复正文中附带明确发送指令：\n[SEND_FILE: <本地文件绝对路径>]\n例如：[SEND_FILE: C:\\path\\to\\report.xlsx]\n网关会自动解析该指令并将该文件直传至用户的聊天窗口，且在聊天文本中自动隐藏该指令。在日常编写代码、回复普通文本或未请求发送文件时，请勿输出此指令。 -->`

      const messageValue = createUserMessage({
        content: [{ type: 'text', text: promptWithContext }],
        source: { kind: 'user' },
      })
      agent.followup(messageValue)
      await this.sendTyping(1).catch(() => {})
      return 'routed'
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      this.logger?.error?.(`[dsh-bridge ${this.platform.id}] unhandled error in handleInbound: ${errMsg}`)
      await this.sendText(`❌ **执行出错**：${errMsg}`).catch(() => {})
      return 'ignored'
    }
  }

  // ---- 发送（子类必须实现）----

  /** 向当前 peer 发送文本（自动分块 + typing 指示）。 */
  async sendText(text) {
    if (this.platform?.status === 'idle' || this.platform?.status === 'offline') return
    const peer = this.peerId || this.config.allowFrom?.[0]
    if (!peer) return
    const chunks = splitForIM(text, this.config.maxMessageChars)
    if (chunks.length === 0) return
    await this.sendTyping(1).catch(() => {})
    try {
      for (let i = 0; i < chunks.length; i++) {
        const result = await this.platform.sendText(peer, chunks[i])
        if (result && result.success === false) {
          this.logger?.warn?.(`[dsh-bridge ${this.platform.id}] outbound chunk ${i + 1}/${chunks.length} failed: ${result.error}`)
          break
        }
        if (i < chunks.length - 1 && this.config.sendChunkDelayMs > 0) {
          await sleep(this.config.sendChunkDelayMs)
        }
      }
    } finally {
      await this.sendTyping(2).catch(() => {})
    }
  }

  /** 发送 typing 状态（1=开始，2=停止）。子类可覆盖。 */
  async sendTyping(state) {
    const peer = this.peerId || this.config.allowFrom?.[0]
    if (!this.platform?.sendTyping || peer == null) return
    return this.platform.sendTyping(peer, state)
  }

  // ---- 出站事件绑定 ----

  _attachOutbound() {
    this._digestState = new Map()
    const stopHeartbeat = (state) => {
      if (state && state.heartbeat) {
        clearInterval(state.heartbeat)
        state.heartbeat = undefined
      }
    }
    const startHeartbeat = (session, state) => {
      stopHeartbeat(state)
      if (this.config.digestIntervalSec <= 0) return
      state.heartbeat = setInterval(() => {
        // 1. 必须依然是当前活动会话
        if (this.activeSessionId !== session.id) {
          stopHeartbeat(state)
          return
        }
        // 2. 检查会话当前是否真正处于 inTurn 状态中
        const line = digestLine(session)
        if (!line) {
          stopHeartbeat(state)
          return
        }
        // 心跳时同时刷新 typing 状态（微信 typing 只维持 15 秒）
        if (this.peerId) this.sendTyping(1).catch(() => {})
        void this.sendText(line)
      }, this.config.digestIntervalSec * 1000)
      if (typeof state.heartbeat.unref === 'function') state.heartbeat.unref()
    }
    const onEvent = async (session, event) => {
      const state = this._digestState.get(session.id) ?? { startedTurns: new Set(), createdFiles: new Set() }
      this._digestState.set(session.id, state)

      // 无论是否为当前活动会话，一旦收到 turn/end，立即停止该 session 的心跳定时器
      if (event.type === 'turn/end') {
        stopHeartbeat(state)
      }
      if (session.id !== this.activeSessionId) return
      if (this.platform?.status === 'idle' || this.platform?.status === 'offline') return

      if (event.type === 'turn/start') {
        const turn = event.data?.turn
        state.createdFiles = new Set()
        if (turn != null && !state.startedTurns.has(turn)) {
          state.startedTurns.add(turn)
          // 不发送"[OK] 收到，开始处理…"，改用 typing 指示 + 心跳进度。
          if (this.peerId) this.sendTyping(1).catch(() => {})
        }
        startHeartbeat(session, state)
        return
      }
      const getSessionCwd = (sess) => sess?.cwd || this.config.cwd || process.cwd()

      if (event.type === 'tool/call') {
        // 工具执行仅在终端/状态中展示，文件直发由 AI 回复中的 [SEND_FILE: ...] 指令显式驱动，杜绝误判
        return
      }
      if (event.type === 'assistant/message') {
        const rawText = textOfAssistantMessage(event.data.message)
        if (rawText.trim()) {
          const cwd = getSessionCwd(session)
          const { cleanText, files } = extractAndStripSendFileDirectives(rawText, cwd)
          for (const f of files) {
            state.createdFiles.add(f)
          }
          // 仅向聊天窗口发送过滤掉 [SEND_FILE: ...] 控制指令后的纯净正文
          if (cleanText) {
            void this.sendText(cleanText)
          }
        }
        return
      }
      if (event.type === 'turn/end') {
        stopHeartbeat(state)
        if (this.peerId) this.sendTyping(2).catch(() => {})
        const reason = event.data?.reason || {}
        if (reason.kind === 'error') {
          void this.sendText(`❌ **处理出错**：${summarizeError(reason.error)}`)
        } else if (reason.kind === 'aborted') {
          void this.sendText(`⏹ **任务已停止**`)
        } else if (reason.kind === 'max-tokens') {
          void this.sendText(`⚠️ **达到模型单轮输出上限，本轮内容已截断**`)
        }

        // 如果本轮 AI 显式指定了 [SEND_FILE: ...] 文件发送指令，直接上传并发送给用户
        if (state.createdFiles && state.createdFiles.size > 0) {
          const rawFiles = Array.from(state.createdFiles)
          const cwd = getSessionCwd(session)
          const targetPeer = this.peerId || this.config.allowFrom?.[0]

          if (typeof this.platform?.sendMediaFile === 'function' && targetPeer) {
            const uniqueFilesToSend = []
            for (const f of rawFiles) {
              const resolved = resolveFilePath(f, cwd)
              if (resolved && !uniqueFilesToSend.includes(resolved)) {
                uniqueFilesToSend.push(resolved)
              }
            }
            for (const resolved of uniqueFilesToSend) {
              try {
                this.logger?.info?.(`[dsh-bridge ${this.platform.id}] auto sendMediaFile to peer: ${resolved}`)
                const res = await this.platform.sendMediaFile(targetPeer, resolved)
                if (res && res.success === false) {
                  this.logger?.warn?.(`[dsh-bridge ${this.platform.id}] auto sendMediaFile ${resolved} failed: %s`, res.error)
                }
              } catch (err) {
                this.logger?.warn?.(`[dsh-bridge ${this.platform.id}] auto sendMediaFile ${resolved} failed: %s`, err?.message ?? err)
              }
            }
          }
          state.createdFiles.clear()
        }
        return
      }
    }
    const listener = (session, event) => { void onEvent(session, event) }
    const disposer = this.ctx.on('session/event', listener)
    this.disposers.push(() => {
      for (const state of digestState.values()) stopHeartbeat(state)
      disposer()
    })
  }

  // ---- 审批桥 ----

  _attachApprovalBridge() {
    const listener = async (req, next) => {
      if (!this.ownsAgent(req.agent)) return next?.()
      const peer = this.peerId
      if (!peer) return next?.()

      const number = this.nextApprovalNumber()
      const timeoutSec = this.config.approvalTimeoutSec
      const timeoutMin = Math.max(1, Math.round(timeoutSec / 60))
      const prompt = [
        `## ⚠️ 操作权限确认 (#${number})`,
        '',
        '| 项目 | 详情 |',
        '| :--- | :--- |',
        `| **调用工具** | \`${req.toolName}\` |`,
        ...(req.reason ? [`| **申请原因** | ${String(req.reason).replace(/\|/g, '｜')} |`] : []),
        `| **等待超时** | ${timeoutMin} 分钟 (超时自动拒绝) |`,
        '',
        `> 回复 \`/yes\` (或 \`1\`) 批准执行`,
        `> 回复 \`/no\` (或 \`2\`) 拒绝执行`,
      ].join('\n')

      void this.sendText(prompt)

      // 同时调用 downstream next()，使 Web UI 原生弹窗也能同步显示并支持直接操作
      let nextPromise = null
      if (typeof next === 'function') {
        try {
          const res = next()
          if (res && typeof res.then === 'function') {
            nextPromise = res
          }
        } catch {}
      }

      let timeoutFired = false
      let winner = 'im'
      const imPromise = new Promise((resolve) => {
        const timer = setTimeout(() => {
          timeoutFired = true
          this.clearApproval(number)
          resolve('rejected')
        }, timeoutSec * 1000)
        if (typeof timer.unref === 'function') timer.unref()
        this.registerApproval(number, { number, request: req, resolve, timer })
      })

      const outcome = await (nextPromise
        ? Promise.race([
            imPromise.then(res => { winner = 'im'; return res }),
            nextPromise.then(res => { winner = 'web'; return res }),
          ])
        : imPromise)

      // 如果 Web 端先决议，清除 IM 端 pending 记录
      if (winner === 'web') {
        this.clearApproval(number)
      }

      // 仅在非超时路径发送确认消息（超时时 resolve 已经发生在 timer 回调）
      if (!timeoutFired) {
        const sourceHint = winner === 'web' ? '（Web 端操作）' : ''
        const label = outcome === 'allowed-once' ? `✓ **已批准执行**${sourceHint}` : outcome === 'rejected' ? `❌ **已拒绝执行**${sourceHint}` : `**[${outcome}]**`
        void this.sendText(`${label}（#${number}）`)
      }
      return outcome
    }
    const disposer = this.ctx.on('approval/request', listener)
    this.disposers.push(disposer)
  }
}

// ---------------------------------------------------------------------------
// 辅助
// ---------------------------------------------------------------------------

function sessionLabel(session) {
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
async function validateWorkspacePath(node, sel) {
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
  let ok = false
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
function foldTitle(events) {
  const evts = events ?? []
  for (let i = evts.length - 1; i >= 0; i--) {
    const e = evts[i]
    if (e && e.type === 'session/title' && e.data?.title) return String(e.data.title)
  }
  return null
}

/** 获取所有已归档会话 ID 集合（支持 ctx.workspaceRegistry 内存服务 + workspace.json 文件存储双重兜底） */
function getArchivedSessionIds(ctx) {
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
  if (!ctx?._mock) {
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
function getSessionProjCache(ctx) {
  if (ctx?._mock) return {}
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
async function getRegisteredWorkspaces(ctx) {
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
  if (!ctx?._mock) {
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

function isSubagentSession(cacheRow, liveSession) {
  if (liveSession?.origin === 'subagent' || liveSession?.header?.origin === 'subagent') return true
  const subVal = cacheRow?.rows?.subagent?.val
  if (subVal && typeof subVal === 'object' && Object.keys(subVal).length > 0) return true
  return false
}

function formatGoalTitle(raw) {
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
async function listSessions(node) {
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
async function listWorkspaces(node) {
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

function getWorkspaceBasename(cwd) {
  if (!cwd || cwd === '(未指定)') return '(未指定)'
  const norm = normalize(cwd).replace(/[\\/]+$/, '')
  const parts = norm.split(/[\\/]/)
  return parts[parts.length - 1] || cwd
}

async function routeCommand(node, text) {
  const trimmed = text.trim()

  if (trimmed === '/yes' || trimmed === '/no' || /^[12]$/.test(trimmed)) {
    if (node.resolveApproval(trimmed)) return true
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
        if (session) {
          session.title = newTitle
        }
        if (node.ctx.sessionPersistence?.update) {
          await node.ctx.sessionPersistence.update(node.activeSessionId, { title: newTitle }).catch(() => {})
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

function describeTurnEnd(reason) {
  switch (reason.kind) {
    case 'completed': return '✓ 已完成'
    case 'error': return '❌ 出错'
    case 'aborted': return '⏹ 已停止'
    case 'blocked': return '⚠️ 已阻塞'
    case 'max-tokens': return '⚠️ 输出截断'
    case 'interrupted': return '⚡ 已中断'
    default: return `[${reason.kind}]`
  }
}

async function renderSessions(node) {
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
  let idx = 0
  for (const [cwd, group] of groups) {
    const groupName = cwd === '(未指定)' ? '📁 未指定工作区' : `📁 **${group.title || getWorkspaceBasename(cwd)}**`
    parts.push(groupName)
    parts.push('')
    parts.push('| 序号 | 会话标题 / 摘要 | 时间 | 状态 |')
    parts.push('| :--- | :--- | :--- | :--- |')
    for (const session of group.sessions.slice(0, 20)) {
      idx += 1
      const isActive = session.id === node.activeSessionId
      const statusTag = isActive ? '`[当前]`' : '-'
      const rawTitle = session.title || (session.events ? sessionLabel(session) : '')
      const titleText = formatGoalTitle(rawTitle) || (typeof rawTitle === 'string' ? rawTitle : '') || '新会话'
      const safeTitle = String(titleText).replace(/\|/g, '｜').replace(/\r?\n/g, ' ')
      const when = session.createdAt ? fmtTime(session.createdAt) : '-'
      parts.push(`| **#${idx}** | ${safeTitle} | ${when} | ${statusTag} |`)
    }
    if (group.sessions.length > 20) {
      parts.push(`*…该工作区共 ${group.sessions.length} 个会话，仅显示前 20 个*`)
    }
    parts.push('')
  }
  if (all.length > 50) parts.push(`*…共 ${all.length} 个会话，仅显示前 50 个*`)
  return parts.join('\n').trim()
}

// 与 renderSessions 完全一致的显示顺序：保持 listSessions 中的分组和顺序。
// /use N 用这个数组索引，保证显示的编号 N 与切换的会话一一对应。
function sessionsInDisplayOrder(all) {
  const groups = new Map()
  for (const s of all) {
    const key = s.cwd || '(未指定)'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(s)
  }
  return [...groups.values()].flatMap((sessions) => sessions)
}

// 时间戳 → 简洁可读时间 (MM-DD HH:mm 或 YYYY-MM-DD HH:mm)
function fmtTime(ms) {
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
function fmtSessionId(id) {
  if (!id) return ''
  const clean = String(id).replace(/^session-/, '')
  return clean.length > 8 ? clean.slice(0, 8) : clean
}

function helpText() {
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

// 导出，便于测试与复用
export const conversationBridgeHelpers = {
  splitForIM,
  digestLine,
  textOfAssistantMessage,
  resolveFilePath,
  extractFilePathsFromText,
  extractAndStripSendFileDirectives,
  sessionsInDisplayOrder,
  listSessions,
  renderSessions,
  listWorkspaces,
  BRIDGE_MARK,
}
