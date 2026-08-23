// dsh-bridge Telegram conversation node
// 把 Telegram OpenAPI / 长轮询入站事件解析后交给平台无关的
// ConversationBridge 处理，出站通过 TelegramGateway 发送文本 / Inline Keyboard 按钮 / 媒体。

import fs from 'node:fs'
import path from 'node:path'
import { ConversationBridge, conversationBridgeHelpers } from '../platform/conversation-bridge.js'

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
  constructor(ctx, config = {}, logger = console) {
    const gateway = ctx.telegram
    super({
      ctx,
      logger,
      config: {
        maxMessageChars: 4096,
        ...config,
      },
      platform: makePlatform(gateway),
    })

    this.gateway = gateway
    this._lastPeer = null

    // 订阅网关入站消息事件
    this.ctx.on('telegram/message', (event) => this._handleInbound(event))

    // 订阅 Inline 按钮点击交互事件（审批确认）
    this.ctx.on('telegram/action', (event) => this._handleAction(event))
  }

  async _handleInbound(event) {
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
    if (!data) return

    // 解析 approve:<approvalId> 或 reject:<approvalId>
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
    return this.gateway.sendText(peerId, text)
  }

  async sendTyping() {
    const peerId = this._lastPeer?.chatId || this.peerId
    if (!peerId || !this.gateway) return
    return this.gateway.sendTyping(peerId)
  }
}

export const telegramNodeHelpers = { makePlatform }
