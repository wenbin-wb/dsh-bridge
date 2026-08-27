// dsh-bridge Telegram conversation node
// 把 Telegram OpenAPI / 长轮询入站事件解析后交给平台无关的
// ConversationBridge 处理，出站通过 TelegramGateway 发送文本 / Inline Keyboard 按钮 / 媒体。

import fs from 'node:fs'
import path from 'node:path'
import { ConversationBridge, conversationBridgeHelpers } from '../platform/conversation-bridge.js'

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
  const slices = []
  let acc = ''
  for (const s of chunks) {
    acc += s
    slices.push(acc)
  }
  return slices
}

function makePlatform(gateway) {
  return {
    id: 'telegram',
    name: 'Telegram',
    get accountId() { return gateway.accountId ?? '' },
    get capabilities() { return gateway.capabilities },
    async sendText(peerId, text, opts = {}) {
      return gateway?.sendText(peerId, text, opts)
    },
    async sendMediaFile(peerId, filePath, opts = {}) {
      return gateway?.sendMediaFile(peerId, filePath, opts)
    },
    async sendTyping(peerId) {
      return gateway?.sendTyping(peerId)
    },
    dispose() {},
  }
}

export class TelegramConversationNode extends ConversationBridge {
  constructor(ctx, config = {}, logger = console, { onFirstSender, onActiveSessionChange } = {}) {
    const gateway = ctx.telegram
    super({
      ctx,
      logger,
      config: {
        maxMessageChars: 4096,
        ...config,
      },
      platform: makePlatform(gateway),
      onFirstSender,
      onActiveSessionChange,
    })

    this.gateway = gateway
    this._lastPeer = null
    this._streamMsgId = null
    this._streamContent = ''
    this._inTurn = false

    // 订阅网关入站消息事件
    this.disposers.push(this.ctx.on('telegram/message', (event) => this._handleInbound(event)))

    // 订阅 Inline 按钮点击交互事件（审批确认）
    this.disposers.push(this.ctx.on('telegram/action', (event) => this._handleAction(event)))

    // 监听轮次事件：turn/start 开启流式打字机，turn/end 最终刷新并重置
    this.disposers.push(this.ctx.on('session/event', (session, event) => {
      if (session.id !== this.activeSessionId) return
      if (event.type === 'turn/start') {
        this._inTurn = true
        this._streamMsgId = null
        this._streamContent = ''
      } else if (event.type === 'turn/end') {
        this._inTurn = false
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
    return this.handleInbound({
      senderId: authId,
      peerId: chatId,
      isGroup,
      text: fullText,
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
        peerId: chatId,
        isGroup: false,
        text,
      })
    }
  }

  async sendApprovalCard(approvalId, request) {
    const peerId = this._lastPeer?.chatId || this.peerId
    if (!peerId || !this.gateway) return

    const toolName = request?.name || request?.tool || '系统操作'
    const desc = request?.description || request?.summary || ''
    const command = request?.command || request?.cmd || ''

    const lines = [
      `⚠️ **操作权限确认** (ID: <code>${approvalId}</code>)`,
      '',
      `• **工具**：<code>${toolName}</code>`,
    ]
    if (desc) lines.push(`• **说明**：${desc}`)
    if (command) lines.push(`• **命令**：<code>${command}</code>`)
    lines.push('', '请选择审批决议（亦可直接输入 <code>1</code> 批准，<code>2</code> 拒绝）：')

    const buttons = [
      [
        { text: '✓ 批准执行', callback_data: `approve:${approvalId}` },
        { text: '✕ 拒绝执行', callback_data: `reject:${approvalId}` },
      ],
    ]

    return this.gateway.sendKeyboard(peerId, lines.join('\n'), buttons)
  }

  async sendText(text) {
    const peerId = this._lastPeer?.chatId || this.peerId
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
          const res = await this.gateway.sendText(peerId, firstSlice)
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
            await this.gateway.editMessageText(peerId, this._streamMsgId, this._streamContent).catch(() => {})
          }
        }
      } else {
        // 消息已存在（同轮次后续输出）
        if (content.length <= 4000) {
          this._streamContent = content
          await this.gateway.editMessageText(peerId, this._streamMsgId, this._streamContent).catch(() => {})
        } else {
          // 超出 4000 字符，另起一条新消息继续流式
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
      return this.gateway.sendText(peerId, content)
    }
    const chunks = conversationBridgeHelpers.splitForIM(content, 4000)
    for (const chunk of chunks) {
      await this.gateway.sendText(peerId, chunk)
    }
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
