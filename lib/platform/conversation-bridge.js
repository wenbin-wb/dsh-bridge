// dsh-bridge 平台无关的会话桥（核心类）
//
// 本模块只保留 ConversationBridge 类本身（白名单、会话生命周期、审批桥、
// 出站 digest/心跳、入站路由入口）。拆分出去的模块：
//   - message-split.js    出站分块 + [SEND_FILE] 指令解析（纯函数）
//   - dsh-storage.js      DSH 私有存储读取兜底（workspace.json / projcache）
//   - session-catalog.js  会话目录组织 / 渲染 / 格式化
//   - commands.js         斜杠命令解释器（routeCommand）
//
// 平台相关的部分由子类（或组合）提供：
//   - sendText(text, opts) / sendTyping(state)：向当前 peer 发送
//   - extractTextFrom(message)：从平台消息提取文本
//   - isGroupMessage(message)：判断群消息
//   - handlePlatformInbound(message)：消息解析（返回 { senderId, text, isGroup } 或 null）
//
// 本类不直接依赖任何 IM 协议，只消费 DSH 官方服务：
//   ctx.sessions / ctx.agents / ctx.approval / ctx.sessionPersistence / ctx.workspaceRegistry

import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { randomUUID } from 'node:crypto'
import { stat } from 'node:fs/promises'
import { normalize } from 'node:path'
import { resolveFilePath } from './message-split.js'
import { splitForIM, textOfAssistantMessage, extractAndStripSendFileDirectives, extractFilePathsFromText } from './message-split.js'
import { routeCommand } from './commands.js'
import { listSessions, listWorkspaces, validateWorkspacePath, renderSessions, sessionsInDisplayOrder, describeTurnEnd, helpText, fmtTime, fmtSessionId, sessionLabel } from './session-catalog.js'

export { textOfAssistantMessage } from './message-split.js'

// ---------------------------------------------------------------------------
// 出站分块（通用：按平台 maxMessageChars 硬分块 + 保留 fenced code block）
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
      // 群聊自动授权开关：默认关闭，防止任意陌生群 @机器人 即获得访问权（T2.5）
      groupAutoApprove: config.groupAutoApprove === true,
    }

    // 从配置恢复活动会话（v0.2.1：重启后保持会话）
    // 注意：不在构造函数里调用 _pickDefaultSession()，由 loadConfig 回调负责恢复，避免竞态覆盖
    this.activeSessionId = config.activeSessionId ?? null
    this.peerId = null
    this.pending = new Map() // number -> PendingApproval
    this.approvalCounter = 0
    this.disposers = []

    // 配置恢复状态追踪（用于防止 handleInbound 在配置加载前处理消息）
    this._restoringConfig = null
    this._restoringSessionMap = new Map() // sessionId -> Promise<Agent|null>

    // T2.3：sessionId -> { outboundPeer, senderId }
    // 记录每轮对话的发起者：出站事件流（assistant/turn/end/心跳/SEND_FILE/审批）绑定到
    // 发起轮次的 peer，而不是"最近一条入站的 peer"，防止 A 任务进行中 B 来消息把回复串到 B 的窗口
    this._turnPeers = new Map()
    // 入站串行队列：handleInbound 内部读写 this.peerId 等共享状态，并发入站会造成串扰
    this._inboundQueue = Promise.resolve()

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
    this._dropDigestState(this.activeSessionId)
    this.activeSessionId = session.id
    try { this.onActiveSessionChange?.(session.id) } catch { /* 持久化失败不致命 */ }
  }

  // 仅按 ID 设置活动会话（持久化会话可能没有内存 session 对象），
  // 发消息时通过 re-attach 逻辑拉起 agent。
  setActiveSessionById(id) {
    if (!id) return
    this.stopAllHeartbeats()
    this._dropDigestState(this.activeSessionId)
    this.activeSessionId = id
    try { this.onActiveSessionChange?.(id) } catch { /* 持久化失败不致命 */ }
  }

  // 释放指定会话的 digest 状态（活动会话切换后旧状态不再使用）
  _dropDigestState(sessionId) {
    if (sessionId && this._digestState) this._digestState.delete(sessionId)
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

  resolveApproval(text, senderId = null) {
    const entries = [...this.pending.entries()]
    if (entries.length === 0) return false
    let outcome
    if (text === '/yes') outcome = 'allowed-once'
    else if (text === '/no') outcome = 'rejected'
    if (outcome) {
      const [number, entry] = entries[entries.length - 1]
      // 双重检查：确保此 number 仍在 pending 中（防止超时竞态）
      if (!this.pending.has(number)) return false
      if (!this._approvalAllowed(entry, senderId)) return false
      this.clearApproval(number)
      entry.resolve(outcome)
      return true
    }
    if ((text === '1' || text === '2') && entries.length === 1) {
      const [number, entry] = entries[0]
      // 双重检查：确保此 number 仍在 pending 中（防止超时竞态）
      if (!this.pending.has(number)) return false
      if (!this._approvalAllowed(entry, senderId)) return false
      this.clearApproval(number)
      entry.resolve(text === '1' ? 'allowed-once' : 'rejected')
      return true
    }
    return false
  }

  // 审批发起者校验：仅允许发起审批时的 peer（handleInbound 的 sender）决议，
  // 防止群聊/多用户场景下其他成员代批工具执行。senderId 为 null 时放行（内部路径）。
  _approvalAllowed(entry, senderId) {
    if (senderId == null) return true
    if (entry.peerId && entry.peerId !== senderId) {
      this.logger?.warn?.(`[dsh-bridge ${this.platform?.id}] approval #${entry.number} blocked: sender ${senderId} is not the initiator ${entry.peerId}`)
      return false
    }
    return true
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
    this._turnPeers?.clear()
    this._inboundQueue = Promise.resolve()
    this.peerId = null
    this.activeSessionId = null
    this._restoringConfig = null
  }

  // ---- 入站核心（平台无关）----
  //
  // 子类解析出平台消息后调用本方法：
  //   await bridge.handleInbound({ senderId, text, isGroup, outboundPeer })
  //   - outboundPeer（可选）：该平台的"会话级发送目标"（如 QQ 群 { peerId, scope }、
  //     Telegram { peerId: chatId }），用于把本轮的出站事件流绑定回发起会话；
  //     不传时出站回退到 this.peerId。
  //
  // 入站按 bridge 串行执行：处理过程会读写共享的 peer/会话状态，并发入站会互相踩踏。
  // 消息处理本身轻量（重活是异步的 turn 事件流），串行代价可忽略。
  //
  // 返回：
  //   'ignored'   消息被忽略（未授权/群消息/空消息）
  //   'routed'    消息已路由到 agent
  handleInbound(message) {
    const task = this._inboundQueue.catch(() => {}).then(() => this._handleInboundSerialized(message))
    this._inboundQueue = task.catch(() => {})
    return task
  }

  async _handleInboundSerialized({ senderId, text, isGroup = false, outboundPeer }) {
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
        //  - 群聊：白名单为空时随首条消息自动授权；白名单非空时仅在
        //    config.groupAutoApprove 显式开启后才授权新群（默认关闭，
        //    防止任意陌生群 @机器人 一次即整群获得访问权）
        const shouldAutoApprove = Boolean(text?.trim()) && (
          this.config.allowFrom.length === 0 || // 白名单为空：单聊/群聊都自动授权
          (isGroup && this.config.groupAutoApprove === true)
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

      // 记录本轮发起者：出站事件流绑定回发起会话（T2.3）。outboundPeer 由平台节点传入
      // 其"会话级发送目标"（QQ 群/Telegram chat 等），未传则不记录（出站回退 this.peerId）。
      if (this.activeSessionId && outboundPeer) {
        this._turnPeers.set(this.activeSessionId, { outboundPeer, senderId: sender })
      }

      if (await routeCommand(this, fullText, sender)) return 'routed'

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
      this.logger?.error?.(`[dsh-bridge ${this.platform.id}] unhandled error in handleInbound: ${errMsg}\n${err instanceof Error ? err.stack : ''}`)
      await this.sendText(`❌ **执行出错**：${errMsg}`).catch(() => {})
      return 'ignored'
    }
  }

  // ---- 发送（子类覆盖 _sendTextNow，不要覆盖 sendText）----

  // 出站发送串行队列：所有 sendText 依次执行，杜绝并发分块交错乱序，
  // 以及 QQ 流式 replace 共享 _msgSeq 的并发冲突
  _enqueueSend(task) {
    const queue = (this._sendQueue ??= Promise.resolve())
    const run = queue.then(task, task)
    this._sendQueue = run.catch(() => {})
    return run
  }

  /** 向当前 peer 发送文本（自动分块 + typing 指示）。经串行队列执行。
   *  opts.outboundPeer（可选）：覆盖发送目标（T2.3，绑定到发起轮次的会话 peer）。 */
  sendText(text, opts = {}) {
    return this._enqueueSend(() => this._sendTextNow(text, opts))
  }

  async _sendTextNow(text, opts = {}) {
    if (this.platform?.status === 'idle' || this.platform?.status === 'offline') return
    const peer = opts?.outboundPeer?.peerId ?? this.peerId ?? this.config.allowFrom?.[0]
    if (!peer) return
    const chunks = splitForIM(text, this.config.maxMessageChars)
    if (chunks.length === 0) return
    await this.sendTyping(1).catch(() => {})
    try {
      for (let i = 0; i < chunks.length; i++) {
        let result
        try {
          result = await this.platform.sendText(peer, chunks[i])
        } catch (err) {
          // 适配器可能直接透传 gateway 抛出的异常（telegram/feishu），统一按失败分块处理，
          // 避免调用方 `void this.sendText(...)` 逃逸成 unhandled rejection
          result = { success: false, error: err?.message ?? String(err) }
        }
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
        const heartbeatTurn = this._turnPeers.get(session.id)
        void this.sendText(line, heartbeatTurn ? { outboundPeer: heartbeatTurn.outboundPeer } : {})
      }, this.config.digestIntervalSec * 1000)
      if (typeof state.heartbeat.unref === 'function') state.heartbeat.unref()
    }
    const onEvent = async (session, event) => {
      // 仅为活动会话创建 digest 状态：非活动会话即使有心跳残留，也会被心跳回调里的
      // 失活检查在下一个周期自行停止。若不过滤，任意会话事件都会在此堆积 Map entry（内存泄漏）
      if (session.id !== this.activeSessionId) return
      const state = this._digestState.get(session.id) ?? { startedTurns: new Set(), createdFiles: new Set() }
      this._digestState.set(session.id, state)

      if (event.type === 'turn/end') {
        stopHeartbeat(state)
        // 本轮已结束，清空轮次集合防止长期运行下无限累积
        state.startedTurns.clear()
      }
      if (this.platform?.status === 'idle' || this.platform?.status === 'offline') return

      // 出站事件绑定到发起本轮的会话 peer（T2.3）
      const turn = this._turnPeers.get(session.id)
      const sendOpts = turn ? { outboundPeer: turn.outboundPeer } : {}

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
            void this.sendText(cleanText, sendOpts)
          }
        }
        return
      }
      if (event.type === 'turn/end') {
        stopHeartbeat(state)
        if (this.peerId) this.sendTyping(2).catch(() => {})
        const reason = event.data?.reason || {}
        if (reason.kind === 'error') {
          void this.sendText(`❌ **处理出错**：${summarizeError(reason.error)}`, sendOpts)
        } else if (reason.kind === 'aborted') {
          void this.sendText(`⏹ **任务已停止**`, sendOpts)
        } else if (reason.kind === 'max-tokens') {
          void this.sendText(`⚠️ **达到模型单轮输出上限，本轮内容已截断**`, sendOpts)
        }

        // 如果本轮 AI 显式指定了 [SEND_FILE: ...] 文件发送指令，直接上传并发送给用户
        if (state.createdFiles && state.createdFiles.size > 0) {
          const rawFiles = Array.from(state.createdFiles)
          const cwd = getSessionCwd(session)
          const targetPeer = sendOpts.outboundPeer?.peerId ?? this.peerId ?? this.config.allowFrom?.[0]

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
        // 本轮结束，释放轮次绑定（审批/心跳等已不再需要）
        this._turnPeers.delete(session.id)
        return
      }
    }
    const listener = (session, event) => { void onEvent(session, event) }
    const disposer = this.ctx.on('session/event', listener)
    this.disposers.push(() => {
      for (const state of this._digestState.values()) stopHeartbeat(state)
      disposer()
    })
  }

  // ---- 审批桥 ----
  //
  // DSH 的审批分发是 cordis waterfall（顺序链）：监听器按注册序执行，
  // 不调用 next() 的监听器否决整条链。宿主 apiproxy 注册在先的 GUI 认领监听器
  // 会认领 approval/asked 事件并 veto 等待网页回答——若不 prepend，本桥永远没有
  // 机会执行，IM 端永远收不到审批卡片（工具调用最终以 unavailable 失败）。
  // 因此以 { prepend: true } 注册到链条最外层。
  //
  // 归属模型：IM 发起的轮次审批**只在 IM 决议**——不调用 next()，宿主 GUI 通道
  // 根本不打开。此前曾让 GUI 弹窗与 IM 卡片并行 race，但宿主的 pending 认领没有
  // 插件可用的收尾接口（只有 Web /api/respond 或 signal abort），IM 决议后 Web
  // 弹窗会永久残留（用户实测报告）。各通道只决议自己发起的轮次。

  _attachApprovalBridge() {
    const listener = async (req, next) => {
      // 只有"本轮由本桥发起"（_turnPeers 有该会话的轮次记录）时才拦截审批。
      // 仅凭 activeSessionId 匹配是不够的：重启恢复/默认挑选后它可能指向一个
      // Web 端发起的会话——那会让 Web 轮次的审批被劫持发去 IM（GUI 不弹窗、
      // 无人响应即自动拒绝）。Web 轮次必须直接放行给宿主 GUI 处理。
      const sessionId = req.agent?.session?.id
      const turn = sessionId ? this._turnPeers.get(sessionId) : null
      if (!turn || !this.ownsAgent(req.agent)) {
        // info 级别：这是用户可自诊的关键判定点（IM 没收到卡片时先看这行）
        this.logger?.info?.('[dsh-bridge %s] approval falls through to GUI: not an IM-initiated turn (session=%s, activeSession=%s, turnTracked=%s)', this.platform?.id, sessionId ?? '(none)', this.activeSessionId ?? '(none)', Boolean(turn))
        return next?.()
      }
      const peer = turn.outboundPeer?.peerId
      const initiator = turn.senderId
      if (!peer) {
        this.logger?.debug?.('[dsh-bridge %s] approval/request ignored: no active peer', this.platform?.id)
        return next?.()
      }
      const sendOpts = turn ? { outboundPeer: turn.outboundPeer } : {}

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

      void this.sendText(prompt, sendOpts)

      let settled = false
      let timeoutFired = false
      let resolveIm
      const imPromise = new Promise((resolve) => { resolveIm = resolve })
      const settleIm = (outcome) => {
        if (settled) return
        settled = true
        this.clearApproval(number)
        resolveIm(outcome)
      }

      const timer = setTimeout(() => {
        timeoutFired = true
        settleIm('rejected')
      }, timeoutSec * 1000)
      if (typeof timer.unref === 'function') timer.unref()

      // turn 被停止/工具调用中止时 DSH 会 abort req.signal：同步取消 IM 侧待决审批
      const onSignalAbort = () => {
        timeoutFired = true
        settleIm('cancelled')
      }
      req.signal?.addEventListener('abort', onSignalAbort, { once: true })

      this.registerApproval(number, { number, request: req, resolve: resolveIm, timer, peerId: initiator })

      let outcome
      try {
        outcome = await imPromise
      } finally {
        req.signal?.removeEventListener('abort', onSignalAbort)
        clearTimeout(timer)
        settled = true
      }

      this.logger?.info?.('[dsh-bridge %s] approval #%d resolved: outcome=%s', this.platform?.id, number, outcome)

      // 仅在非超时/非中止路径发送确认消息（那些路径 resolve 已发生在定时器/abort 回调）
      if (!timeoutFired) {
        const label = outcome === 'allowed-once' ? `✓ **已批准执行**` : outcome === 'rejected' ? `❌ **已拒绝执行**` : `**[${outcome}]**`
        void this.sendText(`${label}（#${number}）`, sendOpts)
      }
      return outcome
    }
    const disposer = this.ctx.on('approval/request', listener, { prepend: true })
    this.disposers.push(disposer)
  }
}

// ---------------------------------------------------------------------------
// 辅助
// ---------------------------------------------------------------------------

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
}
