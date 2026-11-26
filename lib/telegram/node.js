// dsh-bridge Telegram conversation node
// 把 Telegram OpenAPI / 长轮询入站事件解析后交给平台无关的
// ConversationBridge 处理，出站通过 TelegramGateway 发送文本 / Inline Keyboard 按钮 / 媒体。

import fs from 'node:fs'
import path from 'node:path'
import { ConversationBridge, conversationBridgeHelpers } from '../platform/conversation-bridge.js'
import { cumulativeSlices } from '../platform/stream-slices.js'
import { escapeMarkdown } from '../platform/activity.js'

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function splitIntoIncremental(text, maxChunkSize = 200) {
  if (!text) return []
  const chunks = conversationBridgeHelpers.splitForIM(text, maxChunkSize)
  if (chunks.length <= 1) {
    if (text.length <= maxChunkSize) return [text]
    const mid = Math.ceil(text.length / 2)
    return [text.slice(0, mid), text]
  }
  return cumulativeSlices(chunks)
}

/**
 * 平台适配对象（桥通过 `this.platform` 调用各能力）。
 *
 * @param {object} gateway Telegram 网关
 * @param {{ setActivityStatus?: Function }} [hooks] 会话桥需要的能力钩子。
 *   **必须挂在 platform 上**（桥调的是 this.platform.xxx，不是节点自身）——
 *   飞书侧曾因挂错对象导致状态永不显示，这里遵循同一约定。
 */
function makePlatform(gateway, hooks = {}) {
  return {
    id: 'telegram',
    name: 'Telegram',
    get accountId() { return gateway.accountId ?? '' },
    get capabilities() { return gateway.capabilities },
    get status() { return gateway?.status ?? 'idle' },
    async sendText(peerId, text, opts = {}) {
      return gateway?.sendText(peerId, text, opts)
    },
    async sendMediaFile(peerId, filePath, opts = {}) {
      return gateway?.sendMediaFile(peerId, filePath, opts)
    },
    async sendTyping(peerId) {
      return gateway?.sendTyping(peerId)
    },
    // 轮次中的"活动状态"：桥按鸭子类型探测（与飞书同一约定）
    ...(typeof hooks.setActivityStatus === 'function'
      ? { setActivityStatus: (line, opts, parts) => hooks.setActivityStatus(line, opts, parts) }
      : {}),
    dispose() {},
  }
}

export class TelegramConversationNode extends ConversationBridge {
  constructor(ctx, config = {}, logger = console, { onFirstSender, onActiveSessionChange, gateway: explicitGateway, instanceId, onDiagnostic } = {}) {
    // issue #78：显式接收所属网关，不再依赖 ctx.telegram 槽位（多实例时槽位会被覆盖）
    const gateway = explicitGateway ?? ctx.telegram
    super({
      ctx,
      logger,
      config: {
        maxMessageChars: 4096,
        ...config,
      },
      // 惰性转发：makePlatform 在 super() 参数里构造，此刻 this 尚不可用，
      // 故转发函数运行时才取 this.setActivityStatus（定义在类上）。
      platform: makePlatform(gateway, {
        setActivityStatus: (line, opts, parts) => this.setActivityStatus(line, opts, parts),
      }),
      onFirstSender,
      onActiveSessionChange,
      onDiagnostic,
    })

    this.gateway = gateway
    // 事件过滤标识：只处理本实例网关发出的事件，避免同类型多账号串消息
    this.instanceId = instanceId ?? gateway?.instanceId ?? 'telegram'
    this._lastPeer = null
    this._streamMsgId = null
    this._streamContent = ''
    this._inTurn = false
    this._activityLine = '' // 轮次中的活动状态行（收尾时清空，避免残留"进行中"）

    // 事件仅属于本实例（旧事件无 instanceId 时按单实例兼容放行）
    const forThisInstance = (event) => !event?.instanceId || event.instanceId === this.instanceId

    // 订阅网关入站消息事件
    this.disposers.push(this.ctx.on('telegram/message', (event) => {
      if (!forThisInstance(event)) return
      return this._handleInbound(event)
    }))

    // 订阅 Inline 按钮点击交互事件（审批确认）
    this.disposers.push(this.ctx.on('telegram/action', (event) => {
      if (!forThisInstance(event)) return
      return this._handleAction(event)
    }))

    // 监听轮次事件：turn/start 开启流式打字机，turn/end 最终刷新并重置
    this.disposers.push(this.ctx.on('session/event', (session, event) => {
      if (session.id !== this.activeSessionId) return
      if (event.type === 'turn/start') {
        this._inTurn = true
        this._streamMsgId = null
        this._streamContent = ''
        this._activityLine = ''
      } else if (event.type === 'turn/end') {
        this._inTurn = false
        // 清状态行并把**纯净正文**写回一次：否则消息会残留「正在运行命令…」，
        // 让用户以为任务还在跑（飞书侧实测过该问题）。
        this._activityLine = ''
        if (this._streamMsgId && this._streamContent) {
          const peerId = this._lastPeer?.chatId || this.peerId
          if (peerId) {
            void this.gateway?.editMessageText(peerId, this._streamMsgId, this._streamContent).catch(() => {})
          }
        }
        this._streamMsgId = null
        this._streamContent = ''
      }
    }))
  }

  async _handleInbound(event) {
    if (this.gateway?._stopPolling) return
    const { chatId, senderId, senderUsername, isGroup, text, messageId, raw } = event
    this._lastPeer = { chatId, senderId, senderUsername, isGroup }
    const authId = isGroup ? chatId : senderId

    // 检查是否有富媒体附件（图片 / 文件 / 语音 / 音频）
    let mediaFiles = []
    if (raw) {
      mediaFiles = await this._processInboundMedia(raw, this.config.cwd)
    }

    if (!text && mediaFiles.length === 0) {
      this.logger.debug?.(`[dsh-bridge telegram] ignore empty message from ${chatId}`)
      return
    }

    let fullText = text || ''
    if (mediaFiles.length > 0) {
      const mediaDesc = mediaFiles.map((f) => `[文件: ${f.path}]`).join('\n')
      fullText = fullText ? `${fullText}\n\n${mediaDesc}` : mediaDesc
    }

    this.logger.debug?.(`[dsh-bridge telegram] handling inbound message from ${chatId} (group=${isGroup}): ${fullText}`)

    // 如果还没有活动会话，且是首条消息，自动尝试选择最新已有会话
    if (!this.activeSessionId) {
      await this._pickDefaultSession().catch(() => {})
    }

    // 转交通用 ConversationBridge 路由
    // outboundPeer：本轮出站事件流绑定回发起会话（chat 而非成员），替代此前被静默丢弃的 peerId 幽灵参数
    return this.handleInbound({
      senderId: authId,
      isGroup,
      text: fullText,
      outboundPeer: { peerId: chatId, isGroup },
    })
  }

  async _processInboundMedia(rawMsg, sessionCwd) {
    if (!this.gateway) return []
    const downloaded = []

    try {
      // 1. 照片（选择最高分辨率的一张）
      if (Array.isArray(rawMsg.photo) && rawMsg.photo.length > 0) {
        const bestPhoto = rawMsg.photo[rawMsg.photo.length - 1]
        if (bestPhoto?.file_id) {
          const res = await this.gateway.downloadFile(bestPhoto.file_id, sessionCwd)
          if (res) downloaded.push(res)
        }
      }
      // 2. 文档 / 文件
      else if (rawMsg.document?.file_id) {
        const res = await this.gateway.downloadFile(rawMsg.document.file_id, sessionCwd)
        if (res) downloaded.push(res)
      }
      // 3. 语音 / 音频
      else if (rawMsg.voice?.file_id) {
        const res = await this.gateway.downloadFile(rawMsg.voice.file_id, sessionCwd)
        if (res) downloaded.push(res)
      } else if (rawMsg.audio?.file_id) {
        const res = await this.gateway.downloadFile(rawMsg.audio.file_id, sessionCwd)
        if (res) downloaded.push(res)
      }
    } catch (err) {
      this.logger.warn?.(`[dsh-bridge telegram] process media error: ${err.message}`)
    }

    return downloaded
  }

  async _handleAction(event) {
    const { queryId, chatId, operatorId, data } = event
    if (!data || !this.gateway) return

    // 1. 审批决议按钮 (approve:ID / reject:ID)
    const match = /^([a-zA-Z]+):(\d+)$/.exec(data)
    if (match) {
      const [, action, approvalIdStr] = match
      const approvalId = Number(approvalIdStr)
      const outcome = action === 'approve' ? 'allowed-once' : 'rejected'
      const pending = this.pending.get(approvalId)

      if (pending) {
        this.clearApproval(approvalId)
        pending.resolve(outcome)
        await this.gateway?.answerCallbackQuery(
          queryId,
          action === 'approve' ? '✓ 操作已批准' : '✕ 操作已拒绝',
          false,
        )
      } else {
        await this.gateway?.answerCallbackQuery(queryId, '⚠️ 该审批已处理或已过期', false)
      }
      return
    }

    // 2. 快捷指令交互按键 (cmd:xxx)
    if (data.startsWith('cmd:')) {
      const cmdBody = data.slice(4)
      await this.gateway?.answerCallbackQuery(queryId, `⚡ 执行: /${cmdBody.replace(':', ' ')}`, false)
      let text = `/${cmdBody.replace(':', ' ')}`
      if (cmdBody.startsWith('use:')) {
        text = `/use ${cmdBody.slice(4)}`
      }
      return this.handleInbound({
        senderId: operatorId || chatId,
        isGroup: false,
        text,
        outboundPeer: { peerId: chatId, isGroup: false },
      })
    }
  }

  async _sendTextNow(text, opts = {}) {
    // T2.3：轮次绑定的 outboundPeer（chat 级目标）优先生效
    const peerId = opts?.outboundPeer?.peerId || this._lastPeer?.chatId || this.peerId
    if (!peerId || !this.gateway) return
    const content = String(text || '').trim()
    if (!content) return

    // 如果处于 Agent 生成轮次中（turn 期间）：流式打字机逐段增量更新
    if (this._inTurn) {
      const maxChunk = 200
      const slices = splitIntoIncremental(content, maxChunk)
      const delayMs = Math.min(Math.max(this.config.sendChunkDelayMs ?? 800, 400), 2000)

      if (!this._streamMsgId) {
        // 首片：创建消息并记录 message_id
        const firstSlice = slices[0] || content
        try {
          const res = await this.gateway.sendText(peerId, this._withStatus(firstSlice))
          this._streamMsgId = res?.message_id || null
          this._streamContent = firstSlice
        } catch (err) {
          this.logger.warn?.('[dsh-bridge telegram] sendText stream initial failed:', err?.message ?? err)
          await this.gateway.sendText(peerId, content).catch(() => {})
          return
        }

        // 后续片依次 editMessageText（间隔 delayMs，呈现平滑打字机流式效果）
        for (let i = 1; i < slices.length; i++) {
          await sleep(delayMs)
          this._streamContent = slices[i]
          if (this._streamMsgId) {
            await this.gateway.editMessageText(peerId, this._streamMsgId, this._withStatus(this._streamContent)).catch(() => {})
          }
        }
      } else {
        // 消息已存在（同轮次后续输出）：必须**累积**而非覆盖。
        // 宿主对每个 step 发一条独立的 `assistant/message`（该步的片段，不是整轮全文），
        // 直接覆盖会让用户看到"输出一半消失、又重新输出"、最终只剩最后一段
        // （2026-10-16 飞书侧真机复现，Telegram 同一实现同样受影响）。
        const merged = this._streamContent ? `${this._streamContent}\n\n${content}` : content
        if (merged.length <= 4000) {
          this._streamContent = merged
          await this.gateway.editMessageText(peerId, this._streamMsgId, this._withStatus(this._streamContent)).catch(() => {})
        } else {
          // 超出 4000 字符，另起一条新消息继续流式（保留已输出内容在前一条里）
          const res = await this.gateway.sendText(peerId, content).catch(() => null)
          this._streamMsgId = res?.message_id || null
          this._streamContent = content
        }
      }
      return
    }

    // 非 turn 期间（指令响应、系统提示、单条通知等）：
    // 若命中帮助/状态/会话列表等特定系统命令响应，挂载原生快捷交互按钮
    if (content.includes('命令帮助') || content.includes('/new <提示词>')) {
      const buttons = [
        [
          { text: '📋 会话列表', callback_data: 'cmd:sessions' },
          { text: '📁 工作区', callback_data: 'cmd:workspaces' },
        ],
        [
          { text: '📊 运行状态', callback_data: 'cmd:status' },
          { text: '⏹ 停止任务', callback_data: 'cmd:stop' },
        ],
      ]
      return this.gateway.sendKeyboard(peerId, content, buttons)
    }

    if (content.includes('Agent 状态') || content.includes('无活动会话')) {
      const buttons = [
        [
          { text: '🔄 刷新状态', callback_data: 'cmd:status' },
          { text: '⏹ 停止任务', callback_data: 'cmd:stop' },
        ],
        [
          { text: '📋 会话列表', callback_data: 'cmd:sessions' },
          { text: '🚪 结束会话', callback_data: 'cmd:end' },
        ],
      ]
      return this.gateway.sendKeyboard(peerId, content, buttons)
    }

    if (content.includes('会话列表') || content.includes('可用会话')) {
      const buttons = [
        [
          { text: '📁 可用工作区', callback_data: 'cmd:workspaces' },
          { text: '📊 查看状态', callback_data: 'cmd:status' },
        ],
      ]
      return this.gateway.sendKeyboard(peerId, content, buttons)
    }

    if (content.length <= 4000) {
      try {
        return await this.gateway.sendText(peerId, content)
      } catch (err) {
        this._diag('warn', `[dsh-bridge telegram] 出站发送失败 peer=${peerId} error=${err?.message ?? err}`)
        throw err
      }
    }
    const chunks = conversationBridgeHelpers.splitForIM(content, 4000)
    for (const chunk of chunks) {
      await this.gateway.sendText(peerId, chunk)
    }
  }

  /**
   * 把"当前活动"状态行拼到正文前（与飞书同一呈现：引用块 + 斜体）。
   *
   * Telegram 侧由 gateway 的 HTML 格式化把 `> quote` 转成 `<blockquote>`、
   * `_text_` 转成斜体（见 lib/telegram/gateway.js 的格式化步骤），因此语法可直接复用。
   * detail 做 markdown 转义：命令原文里的 `*` `_` `` ` `` 会破坏样式。
   */
  _withStatus(text) {
    const status = this._activityLine
    if (!status) return text
    const styled = `> _${status}_`
    return text ? `${styled}\n\n${text}` : styled
  }

  /**
   * 更新"当前活动"状态（由会话桥在 tool/call 时调用）。
   *
   * @param {string} line 纯文本状态行（老平台路径）
   * @param {object} [_opts]
   * @param {{icon:string,text:string,detail:string,suffix:string}} [parts] 结构化形式（detail 会被转义）
   */
  async setActivityStatus(line, _opts, parts) {
    this._activityLine = parts ? this._styleActivityParts(parts) : (line || '')
    // 已有流式消息时立即刷新（否则等下一片自然带上）
    if (this._streamMsgId && this._streamContent !== undefined) {
      const peerId = this._lastPeer?.chatId || this.peerId
      if (peerId) {
        try {
          await this.gateway?.editMessageText(peerId, this._streamMsgId, this._withStatus(this._streamContent))
        } catch {
          // 此处是 debug 级的非关键失败（流式状态行刷新），日志里**不拼接任何动态值**：
          // 错误对象源自 Telegram API 响应，静态分析会将其视为外部可控输入
          // （js/log-injection）。固定文案即可，无需牺牲可诊断性——真正的失败会由
          // 上层 turn/end / 发送失败路径以更完整的上下文记录。
          this.logger?.debug?.('[dsh-bridge telegram] 状态行刷新失败（详见上层日志）')
        }
      }
    }
  }

  /** 受控文案保持原样、detail 转义后组装（避免命令原文破坏样式）。 */
  _styleActivityParts(parts) {
    const icon = String(parts?.icon ?? '')
    const text = String(parts?.text ?? '')
    const suffix = String(parts?.suffix ?? '')
    const detail = parts?.detail ? escapeMarkdown(parts.detail) : ''
    const head = detail ? `${icon} ${text}（${detail}）` : `${icon} ${text}`
    return `${head}${suffix}`
  }

  async sendTyping() {
    const peerId = this._lastPeer?.chatId || this.peerId
    if (!peerId || !this.gateway) return
    return this.gateway.sendTyping(peerId)
  }

  dispose() {
    this._inTurn = false
    this._streamMsgId = null
    this._streamContent = ''
    this._lastPeer = null
    super.dispose()
  }
}

export const telegramNodeHelpers = { makePlatform }
