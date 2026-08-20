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
    // sendText / sendTyping 由 QqConversationNode 覆盖，这里仅提供兜底
    sendText: (peer, text) => gateway.sendText(peer, text, {}),
    sendTyping: () => Promise.resolve({ ok: true }),
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
    // 当前对话 peer 信息（由 _handleInbound 在每次收到消息时刷新）
    this._lastPeer = null // { peerId, scope: 'c2c'|'group' }
    this._replyMsgId = null // 被动回复用的用户消息 ID（事件 d.id）

    // 订阅网关入站事件
    this.ctx.on('qq/message', (event) => {
      void this._handleInbound(event)
    })
    this.ctx.on('qq/interaction', (event) => {
      void this._handleInteraction(event)
    })
  }

  // ---- 出站：覆盖 sendText / sendTyping，正确处理 scope 与被动回复 ----

  /** 解析当前对话 peer 信息；无活动 peer 时返回 null */
  _currentPeer() {
    return this._lastPeer
  }

  async sendText(text) {
    const peerInfo = this._currentPeer()
    if (!peerInfo) return
    const { peerId, scope } = peerInfo
    const replyMsgId = this._replyMsgId || undefined

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
      return this.gateway.sendKeyboard(peerId, text, keyboard, { scope, msgId: replyMsgId })
    }

    // 其他消息使用流式发送
    const content = String(text || '').trim()
    if (content.length === 0) return { success: true }

    const STREAM_CHUNK_SIZE = 500

    // 如果消息较短，直接发送普通消息
    if (content.length <= STREAM_CHUNK_SIZE) {
      const result = await this.gateway.sendText(peerId, content, { scope, msgId: replyMsgId })
      if (result?.id) this.lastMessageId = result.id
      return result
    }

    // 流式发送：把内容切分成多段（append 模式，服务端拼接为同一条消息）
    const chunks = []
    for (let i = 0; i < content.length; i += STREAM_CHUNK_SIZE) {
      chunks.push(content.slice(i, i + STREAM_CHUNK_SIZE))
    }

    let streamMsgId = null
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const isLast = i === chunks.length - 1
      const result = await this.gateway.sendStream(peerId, chunk, {
        scope,
        msgId: i === 0 ? replyMsgId : undefined, // 首片带被动回复 msg_id
        streamMsgId, // 后续片携带服务端返回的 stream_msg_id
        index: i, // 分片序号从 0 递增
        inputState: isLast ? 10 : 1, // 1=生成中, 10=生成结束
        inputMode: 'append', // 追加模式：服务端拼接到同一条消息
      })

      // 首片返回 stream_msg_id，后续片需携带
      if (i === 0 && result?.id) {
        streamMsgId = result.id
        this.lastMessageId = result.id // 保存消息 ID 用于消息引用
      }

      if (result?.code !== undefined && result.code !== 0) {
        return { success: false, error: result.message || `QQ API error ${result.code}` }
      }

      // 流式发送间隔稍短，避免刷屏
      if (!isLast) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    return { success: true }
  }

  /** 发送"正在输入"状态（QQ 通过 msg_type=6 + input_notify 显示 N 秒） */
  async sendTyping(state) {
    const peerInfo = this._currentPeer()
    if (!peerInfo) return
    // state=2（停止）时无需显式结束——input_second 到期自动消失
    if (Number(state) === 2) return { ok: true }
    return this.gateway.sendTyping(peerInfo.peerId, {
      scope: peerInfo.scope,
      durationSeconds: 8,
      msgId: this._replyMsgId || undefined,
    })
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

    // 记录当前 peer 信息与被动回复消息 ID（事件 d.id），供出站使用
    const peerId = isGroup ? event.groupId || event.peerId : event.peerId || event.senderId
    if (peerId) {
      this._lastPeer = { peerId: String(peerId), scope: isGroup ? 'group' : 'c2c' }
      if (event.id) this._replyMsgId = String(event.id)
    }

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

    // 记录 peer 信息，供命令回复使用
    const isGroup = event.scope === 'group'
    const peerId = isGroup ? event.groupId || event.peerId : event.peerId || sender
    if (peerId) {
      this._lastPeer = { peerId: String(peerId), scope: isGroup ? 'group' : 'c2c' }
      this._replyMsgId = null
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
