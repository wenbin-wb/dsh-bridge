// dsh-bridge QQ conversation node
// 把 QQ OpenAPI v2 的入站事件（C2C 私聊 / 群聊 @提及）解析后交给平台无关的
// ConversationBridge 处理，出站通过 QqGateway 发送文本 / Markdown / 按钮。
// 平台特定部分：
//   - 入站解析：event.scope 决定 c2c / group / guild，text 直接来自 content
//   - 出站：sendText 走 gateway.sendText；长文本用 Markdown 分块
//   - 群聊：@提及消息仅在命中机器人才处理（GROUP_AT_MESSAGE_CREATE 已保证）

import { ConversationBridge, conversationBridgeHelpers } from '../platform/conversation-bridge.js'
import { gatewayConstants } from './gateway.js'

const MAX_MESSAGE_CHARS = gatewayConstants.MAX_MESSAGE_CHARS

// 把 QqGateway 适配为 ConversationBridge 需要的 Platform 消息接口
function makePlatform(gateway) {
  return {
    id: 'qq',
    name: 'QQ',
    get accountId() { return gateway.accountId ?? '' },
    get capabilities() { return gateway.capabilities },
    sendText: (peer, text) => gateway.sendText(peer, text, {}),
    sendTyping: (peer, opts) => gateway.sendTyping(peer, opts),
    sendKeyboard: (peer, content, keyboard) => gateway.sendKeyboard(peer, content, keyboard, {}),
  }
}

export class QqConversationNode extends ConversationBridge {
  /**
   * @param {object} ctx          Cordis 上下文（含 ctx.qq 网关服务）
   * @param {object} config       已持久化配置（allowFrom/间隔/活动会话等）
   * @param {object} logger       日志器
   * @param {object} [opts]
   * @param {(senderId: string) => void} [opts.onFirstSender]
   * @param {(sessionId: string) => void} [opts.onActiveSessionChange]
   */
  constructor(ctx, config, logger, { onFirstSender, onActiveSessionChange } = {}) {
    super({
      ctx,
      logger,
      config,
      platform: makePlatform(ctx.qq),
      onFirstSender,
      onActiveSessionChange,
    })
    this.gateway = ctx.qq
    this.lastMessageId = null // 存储最后发送的消息 ID，用于消息引用

    // 订阅网关入站事件
    this.ctx.on('qq/message', (event) => {
      void this._handleInbound(event)
    })
    this.ctx.on('qq/interaction', (event) => {
      void this._handleInteraction(event)
    })
  }

  // ---- 出站：覆盖 sendText，在提示消息中添加按钮 ----

  async sendText(text) {
    const peer = this.peerId
    if (!peer) return
    
    // 检测是否是提示用户开始新会话的消息
    const isPromptMessage = text.includes('没有活动会话') || text.includes('恢复会话失败')
    
    if (isPromptMessage) {
      // 发送带按钮的消息，方便用户快速操作
      const keyboard = {
        rows: [
          {
            buttons: [
              { id: 'new_conversation', render_data: { label: '🆕 新建会话', visited_label: '新建会话' }, action: { type: 2, permission: { type: 2 } } },
              { id: 'list_sessions', render_data: { label: '📋 会话列表', visited_label: '会话列表' }, action: { type: 2, permission: { type: 2 } } },
            ],
          },
          {
            buttons: [
              { id: 'help', render_data: { label: '❓ 帮助', visited_label: '帮助' }, action: { type: 2, permission: { type: 2 } } },
            ],
          },
        ],
      }
      const result = await this.platform.sendKeyboard(peer, text, keyboard)
      // 保存消息 ID
      if (result?.data?.message_id) {
        this.lastMessageId = result.data.message_id
      }
      return result
    }
    
    // 其他消息使用流式发送
    const content = String(text || '').trim()
    if (content.length === 0) return { success: true }
    
    const STREAM_CHUNK_SIZE = 200
    
    // 如果消息较短，直接发送普通消息
    if (content.length <= STREAM_CHUNK_SIZE) {
      const result = await this.gateway.sendText(peer, content, {})
      // 保存消息 ID
      if (result?.data?.message_id) {
        this.lastMessageId = result.data.message_id
      }
      return result
    }
    
    // 流式发送：把内容切分成多段
    const chunks = []
    for (let i = 0; i < content.length; i += STREAM_CHUNK_SIZE) {
      chunks.push(content.slice(i, i + STREAM_CHUNK_SIZE))
    }
    
    // 逐段发送流式消息
    let firstMsgId = null
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const isLast = i === chunks.length - 1
      const result = await this.gateway.sendStream(peer, chunk, {
        msgId: firstMsgId, // 后续段关联到第一段
        inputState: isLast ? 0 : 1, // 最后一段结束输入状态，其他段显示输入中
      })
      if (!firstMsgId && result?.data?.message_id) {
        firstMsgId = result.data.message_id
        this.lastMessageId = firstMsgId // 保存第一段消息 ID
      }
      if (result?.error) {
        return { success: false, error: result.error }
      }
      // 流式发送间隔稍短，避免刷屏
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    return { success: true }
  }

  // ---- 入站 ----

  async _handleInbound(event) {
    const sender = String(event.senderId ?? '').trim()
    if (!sender) return

    // 快速预检查：白名单非空时，未授权发件人直接忽略
    if (!this.isAllowed(sender) && this.config.allowFrom.length > 0) {
      this.logger?.info?.(`[dsh-bridge qq] ignore message from non-allowlisted sender ${sender}`)
      return
    }

    const text = String(event.text ?? '').trim()
    if (!text) {
      this.logger?.info?.(`[dsh-bridge qq] ignore empty message from ${sender}`)
      return
    }

    // 群聊：仅在群聊 @ 机器人事件中处理（GROUP_AT_MESSAGE_CREATE 已由网关归一化）
    const isGroup = event.scope === 'group' || event.scope === 'guild'

    // 检测消息引用（文本交互）：如果用户回复了机器人的消息，且当前没有活动会话或消息以 /new 开头，
    // 则自动创建新会话并发送消息
    const messageReference = event.messageReference
    if (messageReference && !this.activeSessionId && !text.startsWith('/')) {
      this.logger?.info?.(`[dsh-bridge qq] detected message reference from ${sender}, auto-starting conversation`)
      // 先创建新会话，再处理消息
      await this.handleInbound({ senderId: sender, text: '/new', isGroup })
      // 等待一小段时间确保会话创建完成
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // 交给平台无关核心：白名单/群消息/命令路由/agent 分发
    await this.handleInbound({ senderId: sender, text, isGroup })
  }

  // ---- 互动事件 ----

  async _handleInteraction(event) {
    const sender = String(event.senderId ?? '').trim()
    if (!sender) return

    // 快速预检查：白名单非空时，未授权发件人直接忽略
    if (!this.isAllowed(sender) && this.config.allowFrom.length > 0) {
      this.logger?.info?.(`[dsh-bridge qq] ignore interaction from non-allowlisted sender ${sender}`)
      return
    }

    const data = event.data || {}
    const resolved = data.resolved || {}
    const buttonId = resolved.button_id || ''

    // 响应互动
    await this.gateway.respondInteraction(event.interactionId, {
      code: 0,
    })

    // 根据按钮 ID 执行对应操作
    if (buttonId === 'new_conversation') {
      await this.handleInbound({ senderId: sender, text: '/new', isGroup: event.scope === 'group' })
    } else if (buttonId === 'list_sessions') {
      await this.handleInbound({ senderId: sender, text: '/list', isGroup: event.scope === 'group' })
    } else if (buttonId === 'help') {
      await this.handleInbound({ senderId: sender, text: '/help', isGroup: event.scope === 'group' })
    } else {
      this.logger?.info?.(`[dsh-bridge qq] unknown button interaction: ${buttonId}`)
    }
  }
}

// 导出，便于测试与复用
export const qqNodeHelpers = {
  splitForQQ: conversationBridgeHelpers.splitForIM,
  digestLine: conversationBridgeHelpers.digestLine,
  textOfAssistantMessage: conversationBridgeHelpers.textOfAssistantMessage,
  listSessions: conversationBridgeHelpers.listSessions,
  sessionsInDisplayOrder: conversationBridgeHelpers.sessionsInDisplayOrder,
}
