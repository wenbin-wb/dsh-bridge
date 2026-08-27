// Feishu / Lark Bot OpenAPI & WebSocket Gateway
// Official SDK: @larksuiteoapi/node-sdk
// Reference: https://open.feishu.cn/document/home/event-subscription-via-websocket/overview

import fs from 'node:fs'
import path from 'node:path'
import { Service } from '@deepseek-ai/cordis'
import LarkSdk from './lark-bundled.mjs'
const Lark = LarkSdk.default || LarkSdk

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
        this._startWatchdog()
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

  _startWatchdog() {
    this._stopWatchdog()
    this._watchdogTimer = setInterval(async () => {
      if (this.status === 'online' && !this._closing && this.configured && this.client) {
        try {
          await this.client.bot.v3.bot.get({}).catch(() => null)
        } catch (err) {
          this.logger?.warn?.('[dsh-bridge feishu] liveness probe warning: %s', err?.message ?? err)
        }
      }
    }, 60_000)
    if (typeof this._watchdogTimer?.unref === 'function') this._watchdogTimer.unref()
  }

  _stopWatchdog() {
    if (this._watchdogTimer) clearInterval(this._watchdogTimer)
    this._watchdogTimer = null
  }

  async stop() {
    this._closing = true
    this._stopWatchdog()
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
    if (this._closing || this.status === 'offline') return
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

    // 解析消息体（文本 / 图片 / 文件 / 音频 / 视频）
    let text = ''
    let contentObj = {}
    try {
      contentObj = JSON.parse(message.content || '{}')
      if (message.message_type === 'text') {
        text = contentObj.text || ''
      }
    } catch {
      text = message.content || ''
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
      contentObj,
      messageType: message.message_type,
      raw: data,
      createTime: Number(message.create_time || Date.now()),
    })
  }

  /**
   * 下载消息中的资源文件（图片/文件/音频/媒体）
   * @param {object} opts
   * @param {string} opts.messageId 消息 ID
   * @param {string} opts.fileKey 资源 Key
   * @param {string} [opts.type] 'file' | 'image'
   * @returns {Promise<Buffer|null>}
   */
  async downloadMessageResource({ messageId, fileKey, type = 'file' }) {
    if (!this.client) throw new Error('Feishu client not initialized')
    try {
      const resp = await this.client.im.messageResource.get({
        path: {
          message_id: messageId,
          file_key: fileKey,
        },
        params: {
          type: type === 'image' ? 'image' : 'file',
        },
      })
      if (Buffer.isBuffer(resp)) return resp
      if (resp && typeof resp.pipe === 'function') {
        const chunks = []
        for await (const chunk of resp) chunks.push(Buffer.from(chunk))
        return Buffer.concat(chunks)
      }
      if (resp?.data) {
        if (Buffer.isBuffer(resp.data)) return resp.data
        if (resp.data.pipe) {
          const chunks = []
          for await (const chunk of resp.data) chunks.push(Buffer.from(chunk))
          return Buffer.concat(chunks)
        }
      }
      return null
    } catch (err) {
      this.logger?.warn?.('[dsh-bridge feishu] downloadMessageResource error: %s', err?.message ?? err)
      return null
    }
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

  /**
   * 上传并发送本地图片
   */
  async sendLocalImage(receiveId, filePath, opts = {}) {
    if (!this.client || !receiveId || !filePath) return null
    let receiveIdType = opts.receiveIdType
    if (!receiveIdType) {
      if (receiveId.startsWith('ou_')) receiveIdType = 'open_id'
      else if (receiveId.startsWith('oc_')) receiveIdType = 'chat_id'
      else if (opts.isGroup) receiveIdType = 'chat_id'
      else receiveIdType = 'open_id'
    }

    try {
      const imageStream = fs.createReadStream(filePath)
      const uploadRes = await this.client.im.v1.image.create({
        data: {
          image_type: 'message',
          image: imageStream,
        },
      })
      const imageKey = uploadRes?.image_key
      if (!imageKey) throw new Error('Feishu image upload returned no image_key')

      const res = await this.client.im.v1.message.create({
        params: { receive_id_type: receiveIdType },
        data: {
          receive_id: receiveId,
          msg_type: 'image',
          content: JSON.stringify({ image_key: imageKey }),
        },
      })
      return res?.data
    } catch (err) {
      this.logger.warn?.(`[dsh-bridge feishu] sendLocalImage error (${receiveId}, ${filePath}):`, err?.message ?? err)
      return null
    }
  }

  /**
   * 上传并发送本地文件
   */
  async sendLocalFile(receiveId, filePath, opts = {}) {
    if (!this.client || !receiveId || !filePath) return null
    let receiveIdType = opts.receiveIdType
    if (!receiveIdType) {
      if (receiveId.startsWith('ou_')) receiveIdType = 'open_id'
      else if (receiveId.startsWith('oc_')) receiveIdType = 'chat_id'
      else if (opts.isGroup) receiveIdType = 'chat_id'
      else receiveIdType = 'open_id'
    }

    try {
      const fileName = path.basename(filePath)
      const fileStream = fs.createReadStream(filePath)
      const uploadRes = await this.client.im.v1.file.create({
        data: {
          file_type: 'stream',
          file_name: fileName,
          file: fileStream,
        },
      })
      const fileKey = uploadRes?.file_key
      if (!fileKey) throw new Error('Feishu file upload returned no file_key')

      const res = await this.client.im.v1.message.create({
        params: { receive_id_type: receiveIdType },
        data: {
          receive_id: receiveId,
          msg_type: 'file',
          content: JSON.stringify({ file_key: fileKey }),
        },
      })
      return res?.data
    } catch (err) {
      this.logger.warn?.(`[dsh-bridge feishu] sendLocalFile error (${receiveId}, ${filePath}):`, err?.message ?? err)
      return null
    }
  }

  /**
   * 发送本地媒体文件（自动识别图片/文档）
   */
  async sendMediaFile(receiveId, filePath, opts = {}) {
    if (!fs.existsSync(filePath)) return null
    const ext = path.extname(filePath).toLowerCase()
    const isImage = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'].includes(ext)
    if (isImage) {
      return this.sendLocalImage(receiveId, filePath, opts)
    }
    return this.sendLocalFile(receiveId, filePath, opts)
  }

  // 释放资源
  dispose() {
    void this.stop()
  }
}
