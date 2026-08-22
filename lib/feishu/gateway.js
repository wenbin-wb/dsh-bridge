// Feishu / Lark Bot OpenAPI & WebSocket Gateway
// Official SDK: @larksuiteoapi/node-sdk
// Reference: https://open.feishu.cn/document/home/event-subscription-via-websocket/overview

import { Service } from '@deepseek-ai/cordis'
import * as Lark from '@larksuiteoapi/node-sdk'

export class FeishuGateway extends Service {
  static name = 'feishu'

  constructor(ctx, config = {}) {
    super(ctx, 'feishu', true)
    this.ctx = ctx
    this.logger = ctx.logger?.('feishu') ?? console
    this.config = {
      appId: '',
      appSecret: '',
      domain: 'feishu', // 'feishu' | 'lark'
      ...config,
    }
    this.status = 'idle'
    this.error = null
    this.botInfo = null
    this.client = null
    this.wsClient = null
    this.eventDispatcher = null
    this._closing = false
    this.seenMessageIds = new Set()
  }

  get configured() {
    return Boolean(this.config.appId && this.config.appSecret)
  }

  setStatus(status, error = null) {
    this.status = status
    this.error = error ? String(error?.message || error) : null
    this.ctx.emit('feishu/status', {
      status: this.status,
      error: this.error,
      botInfo: this.botInfo,
      configured: this.configured,
    })
  }

  updateConfig(cfg = {}) {
    this.config = { ...this.config, ...cfg }
  }

  async start() {
    if (!this.configured) {
      this.setStatus('idle')
      return false
    }

    if (this.status === 'online') {
      return true
    }

    if (this._startingPromise) {
      return this._startingPromise
    }

    this._closing = false
    this.setStatus('starting')

    this._startingPromise = (async () => {
      try {
        const isLark = this.config.domain === 'lark'
        const domain = isLark ? Lark.Domain.Lark : Lark.Domain.Feishu

        const sdkLogger = {
          debug: (...args) => this.logger?.debug?.('[lark-sdk debug]', ...args),
          info: (...args) => this.logger?.debug?.('[lark-sdk info]', ...args),
          warn: (...args) => this.logger?.debug?.('[lark-sdk warn]', ...args),
          error: (...args) => this.logger?.error?.('[lark-sdk error]', ...args),
          trace: () => {},
        }

        // 1. 初始化 REST API Client
        this.client = new Lark.Client({
          appId: this.config.appId,
          appSecret: this.config.appSecret,
          domain,
          appType: Lark.AppType.SelfBuild,
          logger: sdkLogger,
          loggerLevel: Lark.LoggerLevel.error,
        })

        // 2. 初始化长连接 WSClient
        this.wsClient = new Lark.WSClient({
          appId: this.config.appId,
          appSecret: this.config.appSecret,
          domain,
          logger: sdkLogger,
          loggerLevel: Lark.LoggerLevel.error,
        })

        // 3. 构建事件分发器
        this.eventDispatcher = new Lark.EventDispatcher({
          logger: sdkLogger,
        })

        // 注册接收消息事件
        this.eventDispatcher.register({
          'im.message.receive_v1': async (data) => {
            try {
              await this._handleMessageReceive(data)
            } catch (err) {
              this.logger.error?.('[dsh-bridge feishu] error in im.message.receive_v1:', err)
            }
          },
          'card.action.trigger': async (data) => {
            try {
              return await this._handleCardActionTrigger(data)
            } catch (err) {
              this.logger.error?.('[dsh-bridge feishu] error in card.action.trigger:', err)
              return { toast: { type: 'error', content: '处理失败' } }
            }
          },
          'im.message.message_read_v1': async () => {
            // 消息已读回执事件，忽略
          },
          'im.chat.access_event.bot_p2p_chat_entered_v1': async () => {
            // 用户进入与机器人的单聊窗口事件，忽略
          },
        })

        // 4. 尝试获取机器人信息（验证凭证，非阻断）
        try {
          const botRes = await this.client.bot.v3.bot.get({}).catch(() => null)
          if (botRes?.bot) {
            this.botInfo = {
              openId: botRes.bot.open_id,
              appName: botRes.bot.app_name,
              avatarUrl: botRes.bot.avatar_url,
            }
            this.logger.info?.(`[dsh-bridge feishu] bot authenticated: ${this.botInfo.appName} (${this.botInfo.openId})`)
          }
        } catch (authErr) {
          this.logger.warn?.(`[dsh-bridge feishu] fetch bot info error: ${authErr.message}`)
        }

        // 5. 启动 WebSocket 长连接
        await this.wsClient.start({ eventDispatcher: this.eventDispatcher })
        this.setStatus('online')
        this.logger.info?.('[dsh-bridge feishu] WebSocket connected to Feishu Open Platform')
        return true
      } catch (err) {
        this.logger.error?.('[dsh-bridge feishu] start failed:', err?.message ?? err)
        this.setStatus('error', err)
        return false
      } finally {
        this._startingPromise = null
      }
    })()

    return this._startingPromise
  }

  async stop() {
    this._closing = true
    try {
      if (this.wsClient) {
        const wsInstance = this.wsClient.wsConfig?.getWSInstance?.()
        if (wsInstance) {
          try { wsInstance.close?.() } catch {}
          try { wsInstance.terminate?.() } catch {}
        }
      }
    } catch (err) {
      this.logger.warn?.('[dsh-bridge feishu] stop error:', err)
    } finally {
      this.client = null
      this.wsClient = null
      this.eventDispatcher = null
      this.setStatus('offline')
    }
  }

  // ---- 消息收发 ----

  async _handleMessageReceive(data) {
    if (!data?.message) return
    const { message, sender } = data
    const messageId = message.message_id
    if (!messageId) return

    // 消息去重
    if (this.seenMessageIds.has(messageId)) return
    this.seenMessageIds.add(messageId)
    if (this.seenMessageIds.size > 500) {
      const first = this.seenMessageIds.values().next().value
      this.seenMessageIds.delete(first)
    }

    const senderOpenId = sender?.sender_id?.open_id || ''
    const chatId = message.chat_id || ''
    const chatType = message.chat_type || 'p2p' // 'p2p' or 'group'
    const isGroup = chatType === 'group'

    // 提取文本内容
    let text = ''
    if (message.message_type === 'text') {
      try {
        const parsed = JSON.parse(message.content || '{}')
        text = parsed.text || ''
      } catch {
        text = message.content || ''
      }
    }

    // 群聊中剥离机器人 @ 占位符（例如 @_user_1 等）
    if (isGroup && text) {
      text = text.replace(/@_user_\d+/g, '').trim()
    }

    const peerId = isGroup ? chatId : senderOpenId
    if (!peerId) return

    this.ctx.emit('feishu/message', {
      peerId,
      senderId: senderOpenId,
      chatId,
      chatType,
      isGroup,
      messageId,
      text,
      messageType: message.message_type,
      raw: data,
      createTime: Number(message.create_time || Date.now()),
    })
  }

  async _handleCardActionTrigger(data) {
    const action = data?.action || {}
    const operator = data?.operator || {}
    const operatorOpenId = operator.open_id || ''
    const value = action.value || {}

    this.ctx.emit('feishu/action', {
      operatorId: operatorOpenId,
      action: value.action || action.tag,
      value,
      raw: data,
    })

    const actionName = value.action === 'approve' ? '已批准' : value.action === 'reject' ? '已拒绝' : '已操作'
    return {
      toast: {
        type: 'success',
        content: `操作成功：${actionName}`,
      },
    }
  }

  /**
   * 发送文本消息
   * @param {string} receiveId - 接收人 open_id 或群 chat_id
   * @param {string} text - 发送文本
   * @param {object} opts - { isGroup, receiveIdType }
   */
  async sendText(receiveId, text, opts = {}) {
    if (!this.client || !receiveId || !text) return null
    let receiveIdType = opts.receiveIdType
    if (!receiveIdType) {
      if (receiveId.startsWith('ou_')) receiveIdType = 'open_id'
      else if (receiveId.startsWith('oc_')) receiveIdType = 'chat_id'
      else if (opts.isGroup) receiveIdType = 'chat_id'
      else receiveIdType = 'open_id'
    }

    try {
      this.logger.debug?.(`[dsh-bridge feishu] sending text to ${receiveId} (${receiveIdType})`)
      const res = await this.client.im.v1.message.create({
        params: { receive_id_type: receiveIdType },
        data: {
          receive_id: receiveId,
          msg_type: 'text',
          content: JSON.stringify({ text }),
        },
      })
      return res?.data
    } catch (err) {
      this.logger.error?.(`[dsh-bridge feishu] sendText error (${receiveId}, ${receiveIdType}):`, err?.message ?? err)
      throw err
    }
  }

  /**
   * 发送飞书原生交互卡片
   * @param {string} receiveId - 接收人 open_id 或群 chat_id
   * @param {object} cardData - 卡片结构对象 (JSON 2.0)
   * @param {object} opts - { isGroup, receiveIdType }
   */
  async sendCard(receiveId, cardData, opts = {}) {
    if (!this.client || !receiveId || !cardData) return null
    let receiveIdType = opts.receiveIdType
    if (!receiveIdType) {
      if (receiveId.startsWith('ou_')) receiveIdType = 'open_id'
      else if (receiveId.startsWith('oc_')) receiveIdType = 'chat_id'
      else if (opts.isGroup) receiveIdType = 'chat_id'
      else receiveIdType = 'open_id'
    }

    try {
      this.logger.debug?.(`[dsh-bridge feishu] sending card to ${receiveId} (${receiveIdType})`)
      const res = await this.client.im.v1.message.create({
        params: { receive_id_type: receiveIdType },
        data: {
          receive_id: receiveId,
          msg_type: 'interactive',
          content: JSON.stringify(cardData),
        },
      })
      return res?.data
    } catch (err) {
      this.logger.error?.(`[dsh-bridge feishu] sendCard error (${receiveId}, ${receiveIdType}):`, err?.message ?? err)
      throw err
    }
  }

  /**
   * 发送 Markdown 交互卡片 (JSON 2.0)
   * @param {string} receiveId - 接收人 open_id 或群 chat_id
   * @param {string} markdownText - Markdown 文本
   * @param {object} opts - { isGroup, receiveIdType }
   */
  async sendMarkdownCard(receiveId, markdownText, opts = {}) {
    const card = {
      schema: '2.0',
      config: {
        wide_screen_mode: true,
        update_multi: true,
      },
      body: {
        elements: [
          {
            tag: 'markdown',
            content: String(markdownText || '').trim(),
          },
        ],
      },
    }
    return this.sendCard(receiveId, card, opts)
  }

  /**
   * 更新已发送的交互卡片（流式更新 / 原地替换，JSON 2.0）
   * @param {string} messageId - 已发送消息的 message_id
   * @param {string} markdownText - 最新完整 Markdown 文本
   */
  async patchCard(messageId, markdownText) {
    if (!this.client || !messageId) return null
    const card = {
      schema: '2.0',
      config: {
        wide_screen_mode: true,
        update_multi: true,
      },
      body: {
        elements: [
          {
            tag: 'markdown',
            content: String(markdownText || '').trim(),
          },
        ],
      },
    }
    try {
      this.logger.debug?.(`[dsh-bridge feishu] patching card message ${messageId}`)
      const res = await this.client.im.v1.message.patch({
        path: { message_id: messageId },
        data: {
          content: JSON.stringify(card),
        },
      })
      return res?.data
    } catch (err) {
      this.logger.error?.(`[dsh-bridge feishu] patchCard error (${messageId}):`, err?.message ?? err)
      throw err
    }
  }

  // 释放资源
  dispose() {
    void this.stop()
  }
}
