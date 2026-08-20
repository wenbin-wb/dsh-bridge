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
    sendTyping: (peer, state) => gateway.sendTyping(peer, state),
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

    // 订阅网关入站事件
    this.ctx.on('qq/message', (event) => {
      void this._handleInbound(event)
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

    // 交给平台无关核心：白名单/群消息/命令路由/agent 分发
    await this.handleInbound({ senderId: sender, text, isGroup })
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
