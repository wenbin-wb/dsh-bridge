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
import { statSync } from 'node:fs'
import { resolve, normalize } from 'node:path'

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
    this.config = {
      allowFrom: Array.isArray(config.allowFrom) ? config.allowFrom : [],
      digestIntervalSec: config.digestIntervalSec ?? 300,
      approvalTimeoutSec: config.approvalTimeoutSec ?? 600,
      maxMessageChars: config.maxMessageChars ?? maxChars,
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
    this.activeSessionId = session.id
    try { this.onActiveSessionChange?.(session.id) } catch { /* 持久化失败不致命 */ }
  }

  // 仅按 ID 设置活动会话（持久化会话可能没有内存 session 对象），
  // 发消息时通过 re-attach 逻辑拉起 agent。
  setActiveSessionById(id) {
    if (!id) return
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
      const cwd = cwdOverride || this.config.cwd || process.cwd()
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
      if (prompt) {
        handle.agent.followup(createUserMessage({
          content: [{ type: 'text', text: prompt }],
          source: { kind: 'user' },
        }))
      }
      await this.sendText(`${this.mark.turn} 已创建会话 ${handle.agent.session.id}${cwdOverride ? `（工作区: ${cwdOverride}）` : ''}${prompt ? '' : '（发消息即可开始）'}`)
    } catch (error) {
      await this.sendText(`${this.mark.err} 创建会话失败: ${error instanceof Error ? error.message : String(error)}`)
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

  dispose() {
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
          persisted = Array.isArray(headers) && headers.some((h) => h?.id === this.activeSessionId)
        } catch { /* 读取失败则按未持久化处理 */ }

        let handle
        if (persisted) {
          handle = await this.ctx.agents.resume({
            resumeSessionId: this.activeSessionId,
            agentOptions,
          })
        } else {
          // 读取持久化会话的 cwd 做 fallback（新建会话时用）
          let sessionCwd = this.config.cwd || process.cwd()
          const meta = {
            cwd: sessionCwd,
            agentPreset: this.config.agentPreset || 'routing-suite',
          }
          handle = await this.ctx.agents.create({
            sessionId: this.activeSessionId,
            meta,
            agentOptions,
          })
        }
        agent = handle.agent
        this.logger?.info?.(`[dsh-bridge ${this.platform.id}] re-attached agent to session ${this.activeSessionId} (${persisted ? 'resume' : 'create'})`)
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err)
        this.logger?.warn?.(`[dsh-bridge ${this.platform.id}] failed to re-attach agent: ${reason}`)
        // 清除失效的 activeSessionId，避免用户误以为还在旧会话中
        this.activeSessionId = null
        await this.sendText(`${this.mark.err} 恢复会话失败: ${reason}。发送 /new <提示词> 新建一个会话。`)
      }
    }
    if (!agent) {
      await this.sendText(`${this.mark.idle} 没有活动会话。发送 /new <提示词> 开始一个新会话，或 /sessions 查看已有会话。`)
      return 'routed'
    }

    const messageValue = createUserMessage({
      content: [{ type: 'text', text: fullText }],
      source: { kind: 'user' },
    })
    agent.followup(messageValue)
    await this.sendTyping(1).catch(() => {})
    return 'routed'
  }

  // ---- 发送（子类必须实现）----

  /** 向当前 peer 发送文本（自动分块 + typing 指示）。 */
  async sendText(text) {
    const peer = this.peerId
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
    if (!this.platform?.sendTyping || this.peerId == null) return
    return this.platform.sendTyping(this.peerId, state)
  }

  // ---- 出站事件绑定 ----

  _attachOutbound() {
    const digestState = new Map()
    const stopHeartbeat = (state) => {
      if (state.heartbeat) {
        clearInterval(state.heartbeat)
        state.heartbeat = undefined
      }
    }
    const startHeartbeat = (session, state) => {
      stopHeartbeat(state)
      if (this.config.digestIntervalSec <= 0) return
      state.heartbeat = setInterval(() => {
        // 心跳时同时刷新 typing 状态（微信 typing 只维持 15 秒）
        if (this.peerId) this.sendTyping(1).catch(() => {})
        void this.sendText(digestLine(session))
      }, this.config.digestIntervalSec * 1000)
      if (typeof state.heartbeat.unref === 'function') state.heartbeat.unref()
    }
    const onEvent = (session, event) => {
      if (session.id !== this.activeSessionId) return
      const state = digestState.get(session.id) ?? { startedTurns: new Set() }
      digestState.set(session.id, state)

      if (event.type === 'turn/start') {
        const turn = event.data.turn
        if (!state.startedTurns.has(turn)) {
          state.startedTurns.add(turn)
          // 不发送"[OK] 收到，开始处理…"，改用 typing 指示 + 心跳进度。
          if (this.peerId) this.sendTyping(1).catch(() => {})
        }
        startHeartbeat(session, state)
        return
      }
      if (event.type === 'assistant/message') {
        const text = textOfAssistantMessage(event.data.message)
        if (text.trim()) void this.sendText(text)
        return
      }
      if (event.type === 'turn/end') {
        stopHeartbeat(state)
        if (this.peerId) this.sendTyping(2).catch(() => {})
        const reason = event.data.reason
        if (reason.kind === 'error') {
          void this.sendText(`${this.mark.err} 处理出错: ${summarizeError(reason.error)}`)
        } else if (reason.kind === 'aborted') {
          void this.sendText(`${this.mark.stop} 已停止`)
        } else if (reason.kind === 'max-tokens') {
          void this.sendText(`${this.mark.warn} 达到输出上限，本轮已截断`)
        }
        return
      }
    }
    const listener = (session, event) => onEvent(session, event)
    const disposer = this.ctx.on('session/event', listener)
    this.disposers.push(() => {
      for (const state of digestState.values()) stopHeartbeat(state)
      disposer()
    })
  }

  // ---- 审批桥 ----

  _attachApprovalBridge() {
    const listener = async (req, next) => {
      if (!this.ownsAgent(req.agent)) return next()
      const peer = this.peerId
      if (!peer) return next()

      const number = this.nextApprovalNumber()
      const timeoutSec = this.config.approvalTimeoutSec
      const prompt = [
        `${this.mark.ask} #${number} 需要你的确认`,
        `工具: ${req.toolName}`,
        ...(req.reason ? [`原因: ${req.reason}`] : []),
        `回复 /yes 同意，/no 拒绝（仅一条待确认时也可回复 1/2）`,
        `${Math.max(1, Math.round(timeoutSec / 60))} 分钟内未回复将自动拒绝。`,
      ].join('\n')

      void this.sendText(prompt)

      let timeoutFired = false
      const outcome = await new Promise((resolve) => {
        const timer = setTimeout(() => {
          timeoutFired = true
          this.clearApproval(number)
          resolve('rejected')
        }, timeoutSec * 1000)
        if (typeof timer.unref === 'function') timer.unref()
        this.registerApproval(number, { number, request: req, resolve, timer })
      })

      // 仅在非超时路径发送确认消息（超时时 resolve 已经发生在 timer 回调）
      if (!timeoutFired) {
        const label = outcome === 'allowed-once' ? `${this.mark.ok} 已同意` : outcome === 'rejected' ? `${this.mark.err} 已拒绝` : `[${outcome}]`
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
      if (text) return text.length > 24 ? `${text.slice(0, 24)}…` : text
    }
  }
  return '(空会话)'
}

// 校验工作区路径（防止路径遍历攻击）
async function validateWorkspacePath(node, sel) {
  const normalized = normalize(resolve(sel))
  const workspaces = await listWorkspaces(node)
  const allowedPaths = workspaces.map(w => normalize(resolve(w.path)))
  
  if (!allowedPaths.includes(normalized)) {
    const wsDisplay = allowedPaths.slice(0, 5).join('\n  ')
    const more = allowedPaths.length > 5 ? `\n  ... 等 ${allowedPaths.length} 个工作区` : ''
    return {
      valid: false,
      error: `${node.mark.err} 路径不在已注册工作区内: ${normalized}\n\n` +
             `可用工作区：\n  ${wsDisplay}${more}\n\n` +
             `提示：使用 /workspaces 查看完整列表`
    }
  }
  
  // 校验目录存在
  let ok = false
  try { ok = statSync(normalized).isDirectory() } catch { ok = false }
  if (!ok) {
    return {
      valid: false,
      error: `${node.mark.err} 工作区目录不存在: ${normalized}`
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

// 列出会话：使用 DSH 官方 API（ctx.sessions + sessionPersistence），与 web 端一致。
// 屏蔽已归档会话。返回 [{ id, createdAt, events?, seq?, cwd?, title? }]，按时间倒序。
async function listSessions(node) {
  // 归档会话 ID 集合
  let archived = new Set()
  try { archived = new Set(node.ctx.workspaceRegistry?.archivedSessionIds ?? []) } catch { /* ignore */ }
  const live = [...(node.ctx.sessions?.list() ?? [])].filter((s) => !archived.has(s.id))
  const liveIds = new Set(live.map((s) => s.id))
  // 内存活跃会话（带完整 events/title）
  const liveMapped = live.map((s) => {
    try {
      const title = foldTitle(s.events ?? [])
      if (title) return { id: s.id, createdAt: s.header?.createdAt ?? 0, events: s.events, seq: s.seq, cwd: s.header?.cwd, title }
    } catch { /* ignore */ }
    return { id: s.id, createdAt: s.header?.createdAt ?? 0, events: s.events, seq: s.seq, cwd: s.header?.cwd }
  })
  // 持久化会话（含 cwd，与 web 端过滤一致）
  let cold = []
  try {
    const headers = await node.ctx.sessionPersistence?.list?.()
    if (Array.isArray(headers)) {
      const coldHeaders = headers.filter((h) => h && h.id && !liveIds.has(h.id) && h.cwd !== undefined && !archived.has(h.id))
      // 分批加载以避免并发过载（每批 10 个）
      const BATCH_SIZE = 10
      for (let i = 0; i < coldHeaders.length; i += BATCH_SIZE) {
        const batch = coldHeaders.slice(i, i + BATCH_SIZE)
        const batchResults = await Promise.all(batch.map(async (h) => {
          let title
          try {
            const insp = await node.ctx.sessionPersistence.load(h.id)
            title = foldTitle(insp.events ?? []) ?? undefined
          } catch { /* 标题提取失败则只用 id */ }
          return { id: h.id, createdAt: h.createdAt ?? 0, events: undefined, seq: 0, cwd: h.cwd, title }
        }))
        cold.push(...batchResults)
      }
    }
  } catch { /* 持久化服务不可用时仅返回内存会话 */ }
  return [...liveMapped, ...cold].sort((a, b) => b.createdAt - a.createdAt || b.seq - a.seq)
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

async function routeCommand(node, text) {
  const trimmed = text.trim()
  if (!trimmed.startsWith('/')) return false

  if (trimmed === '/yes' || trimmed === '/no' || /^[12]$/.test(trimmed)) {
    if (node.resolveApproval(trimmed)) return true
  }

  const [command, ...rest] = trimmed.slice(1).split(/\s+/)
  switch (command) {
    case 'help':
      await node.sendText(helpText())
      return true
    case 'sessions':
      await node.sendText(await renderSessions(node))
      return true
    case 'use': {
      const index = Number(rest[0])
      const sessions = sessionsInDisplayOrder(await listSessions(node))
      if (!Number.isInteger(index) || index < 1 || index > sessions.length) {
        await node.sendText(`${node.mark.err} 无效编号。可用: 1–${sessions.length}（/sessions 查看列表）`)
        return true
      }
      const session = sessions[index - 1]
      node.setActiveSessionById(session.id)
      await node.sendText(`${node.mark.ok} 已切换到会话 #${index}（${session.id}）`)
      return true
    }
    case 'workspaces': {
      const workspaces = await listWorkspaces(node)
      if (workspaces.length === 0) {
        await node.sendText(`${node.mark.list} 没有可用的工作区。使用 /new <提示词> @<路径> 指定一个目录。`)
        return true
      }
      const lines = workspaces.map((w, i) => {
        const name = w.title && w.title !== w.path ? `**${w.title}** · \`${w.path}\`` : `\`${w.path}\``
        return `${i + 1}. ${name}`
      })
      await node.sendText(`${node.mark.list}\n**可用工作区**（/new <提示词> @N 选择）\n\n${lines.join('\n')}`)
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
          else { await node.sendText(`${node.mark.err} 无效工作区编号 ${sel}。用 /workspaces 查看。`); return true }
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
      const agent = node.activeAgent()
      if (!agent) {
        await node.sendText(`${node.mark.err} 没有活动的 agent`)
      } else {
        agent.cancel({ kind: 'user' })
        await node.sendText(`${node.mark.stop} 已请求停止`)
      }
      return true
    }
    case 'end': {
      // 结束当前会话：停止 agent 并清除活动会话（进入"无活动会话"状态）
      const agent = node.activeAgent()
      if (agent) agent.cancel({ kind: 'user' })
      node.activeSessionId = null
      await node.onActiveSessionChange?.(null)
      // 文本含"没有活动会话"→ 有按钮权限时附带快捷按钮；无按钮时文字指引也能操作
      await node.sendText(`${node.mark.ok} 已结束当前会话（没有活动会话）。\n\n发送以下任一命令开始：\n/new <提示词> — 新建会话\n/sessions — 查看已有会话\n/help — 命令帮助`)
      return true
    }
    case 'status': {
      const agent = node.activeAgent()
      const session = node.activeSession()
      if (!session) {
        await node.sendText(`${node.mark.idle} 没有活动会话。发送 /new <提示词> 开始，或 /sessions 查看已有会话。`)
        return true
      }
      const status = agent?.status ?? 'idle'
      const lastTurn = [...(session.events ?? [])].reverse().find((e) => e.type === 'turn/end')
      const reason = lastTurn ? describeTurnEnd(lastTurn.data.reason) : '尚未运行'
      await node.sendText(`${node.mark.status}\n会话: ${session.id}\nagent: ${status}\n事件: ${session.seq} 条\n最近: ${reason}`)
      return true
    }
    case 'start': // 别名：首次扫码自动开始一个会话
      await node.createSession('')
      return true
    default:
      await node.sendText(`${node.mark.err} 未知命令 /${command}\n${helpText()}`)
      return true
  }
}

function describeTurnEnd(reason) {
  switch (reason.kind) {
    case 'completed': return '[完成]'
    case 'error': return '[出错]'
    case 'aborted': return '[已停止]'
    case 'blocked': return '[已阻塞]'
    case 'max-tokens': return '[输出截断]'
    case 'interrupted': return '[中断]'
    default: return reason.kind
  }
}

async function renderSessions(node) {
  const all = await listSessions(node)
  if (all.length === 0) return `${node.mark.list} 没有会话。发送 /new <提示词> 开始。`
  // 按工作区（真实 cwd）分组；无 cwd 的归入 '(未指定)'
  const groups = new Map()
  for (const s of all) {
    const key = s.cwd || '(未指定)'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(s)
  }
  const sortedGroups = [...groups.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0])))
  const parts = [`**会话列表** · 共 ${all.length} 个（/use N 切换）`, '']
  let idx = 0
  for (const [cwd, sessions] of sortedGroups) {
    parts.push(`## ${cwd}`)
    for (const session of sessions.slice(0, 20)) {
      idx += 1
      const active = session.id === node.activeSessionId ? ' **← 当前**' : ''
      const title = session.title || (session.events ? sessionLabel(session) : '')
      const label = title || fmtSessionId(session.id)
      const when = session.createdAt ? fmtTime(session.createdAt) : ''
      parts.push(`${idx}. \`${label}\``)
      parts.push(`   ${session.id} · ${when}${active}`)
    }
    if (sessions.length > 20) parts.push(`   …该工作区共 ${sessions.length} 个`)
  }
  if (all.length > 50) parts.push('', `…共 ${all.length} 个会话，仅显示前若干`)
  return `${node.mark.list}\n${parts.join('\n')}`
}

// 与 renderSessions 完全一致的显示顺序：按工作区字母序分组、组内保持 listSessions 顺序。
// /use N 用这个数组索引，保证显示的编号 N 与切换的会话一一对应。
function sessionsInDisplayOrder(all) {
  const groups = new Map()
  for (const s of all) {
    const key = s.cwd || '(未指定)'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(s)
  }
  const sortedGroups = [...groups.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0])))
  return sortedGroups.flatMap(([, sessions]) => sessions)
}

// 时间戳 → 可读时间
function fmtTime(ms) {
  try {
    const d = new Date(ms)
    const p = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
  } catch { return '' }
}

// 持久化会话没有加载 events，用时间戳作为可读标识
function fmtSessionId(id) {
  const m = /^session-([0-9a-f]{8})/.exec(id ?? '')
  return m ? `session-${m[1]}…` : (id ?? '')
}

function helpText() {
  return [
    `${BRIDGE_MARK.welcome} 命令`,
    '/sessions — 列出会话（按工作区分组）',
    '/use N — 切换到会话 N',
    '/workspaces — 列出可用工作区',
    '/new <提示词> — 新建会话并开始（当前工作区）',
    '/new <提示词> @路径 — 在指定目录新建会话',
    '/new <提示词> @N — 用编号选择工作区（/workspaces）',
    '/stop — 停止当前任务',
    '/end — 结束当前会话（回到无活动会话状态）',
    '/status — 查看状态',
    '/yes /no 或 1/2 — 回应权限请求',
    '/help — 本帮助',
  ].join('\n')
}

// 导出，便于测试与复用
export const conversationBridgeHelpers = {
  splitForIM,
  digestLine,
  textOfAssistantMessage,
  sessionsInDisplayOrder,
  listSessions,
  listWorkspaces,
  BRIDGE_MARK,
}
