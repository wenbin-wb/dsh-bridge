// dsh-bridge Telegram platform adapter
// 编排 TelegramGateway（长轮询 + 代理支持）+ TelegramConversationNode（Telegram⇄DSH 会话桥）。
// 作为 Platform 子类，注册进 PlatformManager 统一管理。

import QRCode from 'qrcode'
import { Platform } from '../platform/base.js'
import { TelegramGateway } from './gateway.js'
import { TelegramConversationNode } from './node.js'

export class TelegramService extends Platform {
  /**
   * @param {object} opts
   * @param {object} opts.ctx          Cordis 上下文
   * @param {object} opts.logger       日志器
   * @param {object} [opts.config]     已持久化的 telegram 配置（凭证 + allowFrom + 间隔）
   * @param {(patch: object) => (void|Promise<void>)} opts.onPersist  主插件保存回调
   */
  constructor({ ctx, logger, config = {}, onPersist }) {
    super({ ctx, logger, config, onPersist })
    this.id = 'telegram'
    this.name = 'Telegram'
    this._botQrCache = { username: '', qr: '' }

    this.gateway = new TelegramGateway(ctx, {
      botToken: config.botToken ?? '',
      proxy: config.proxy ?? '',
    })

    // 挂到 ctx 供会话节点读取
    try { ctx.telegram = this.gateway } catch {}

    this.node = new TelegramConversationNode(ctx, {
      allowFrom: Array.isArray(config.allowFrom) ? config.allowFrom : [],
      digestIntervalSec: config.digestIntervalSec,
      approvalTimeoutSec: config.approvalTimeoutSec,
      maxMessageChars: config.maxMessageChars || 4096,
      sendChunkDelayMs: config.sendChunkDelayMs,
      activeSessionId: config.activeSessionId,
    }, logger, {
      onFirstSender: () => this.persist({ allowFrom: [...(this.node?.config?.allowFrom ?? [])] }),
      onActiveSessionChange: (sessionId) => this.persist({ activeSessionId: sessionId }),
    })
    this.bridge = this.node

    if (this.gateway.configured) {
      void this.start().catch((err) => {
        this.logger.error?.('[dsh-bridge telegram] start failed:', err?.message ?? err)
      })
    }
  }

  // ---- Platform 接口 ----

  get configured() { return this.gateway.configured }
  get accountId() { return this.gateway.accountId }

  get capabilities() {
    return {
      group: true,
      media: true,
      approvals: true,
      maxMessageChars: this.node.config.maxMessageChars || 4096,
    }
  }

  async sendText(peerId, text, opts = {}) {
    return this.gateway.sendText(peerId, text, opts)
  }

  async sendTyping(peerId, opts = {}) {
    return this.gateway.sendTyping?.(peerId, opts)
  }

  // ---- 生命周期控制 ----

  async start() {
    if (!this.gateway.configured) {
      this.setStatus('idle')
      return { success: false, error: 'Telegram Bot Token 未配置' }
    }
    this.setStatus('starting')
    const ok = await this.gateway.start()
    if (ok) {
      this.setStatus('connected')
      return { success: true }
    } else {
      this.setStatus('error', '连接 Telegram API 失败，请检查 Bot Token 或网络代理')
      return { success: false, error: '连接失败' }
    }
  }

  async stop() {
    await this.gateway.stop()
    this.setStatus('offline')
    return { success: true }
  }

  /**
   * 配置或登录
   * @param {object} creds - { botToken, proxy }
   */
  async login(creds = {}) {
    const patch = {}
    if (creds.botToken !== undefined) patch.botToken = String(creds.botToken).trim()
    if (creds.proxy !== undefined) patch.proxy = String(creds.proxy).trim()

    this.gateway.setCredentials(patch)
    this.persist(patch)

    if (!this.gateway.configured) {
      await this.stop()
      return { success: false, error: '请填写完整的 Telegram Bot Token' }
    }

    return this.start()
  }

  async unbind() {
    await this.stop()
    this.gateway.setCredentials({ botToken: '', proxy: '' })
    this.persist({ botToken: '', proxy: '', allowFrom: [] })
    if (this.node) this.node.config.allowFrom = []
    return { success: true }
  }

  getStatus() {
    const allowFrom = [...(this.node?.config?.allowFrom ?? [])]
    const username = this.gateway.botInfo?.username || ''
    const botLink = username ? `https://t.me/${encodeURIComponent(username)}` : null
    if (botLink && this._botQrCache.username !== username) {
      this._botQrCache.username = username
      void QRCode.toDataURL(botLink, {
        width: 260,
        margin: 2,
        color: { dark: '#1F2421', light: '#FFFFFF' },
      }).then((qr) => {
        this._botQrCache.qr = qr
      }).catch(() => {})
    }

    return {
      id: this.id,
      name: this.name,
      status: this.status === 'connected' ? 'connected' : this.gateway.status,
      configured: this.gateway.configured,
      accountId: this.gateway.accountId || (this.gateway.configured ? '已配置 Token' : ''),
      allowFrom,
      peerId: this.node?.peerId,
      sessionId: this.node?.activeSessionId,
      login: {
        phase: this.status === 'connected' ? 'done' : this.status === 'error' ? 'error' : 'idle',
      },
      capabilities: { ...this.capabilities },
      config: {
        digestIntervalSec: this.node?.config?.digestIntervalSec,
        approvalTimeoutSec: this.node?.config?.approvalTimeoutSec,
        maxMessageChars: this.node?.config?.maxMessageChars,
        sendChunkDelayMs: this.node?.config?.sendChunkDelayMs,
        botToken: this.gateway.config.botToken ? '******' : '',
        proxy: this.gateway.config.proxy || '',
      },
      botInfo: this.gateway.botInfo,
      botLink,
      botQr: this._botQrCache.qr,
    }
  }

  setAllowFrom(allowFrom) {
    const list = Array.isArray(allowFrom) ? allowFrom.map((s) => String(s).trim()).filter(Boolean) : []
    if (this.node) this.node.config.allowFrom = list
    this.persist({ allowFrom: list })
    return { success: true, allowFrom: list }
  }

  async setConfig({ digestIntervalSec, approvalTimeoutSec, maxMessageChars, sendChunkDelayMs, botToken, proxy } = {}) {
    if (digestIntervalSec != null)   this.node.config.digestIntervalSec   = Number(digestIntervalSec)
    if (approvalTimeoutSec != null)  this.node.config.approvalTimeoutSec  = Number(approvalTimeoutSec)
    if (maxMessageChars != null) {
      const val = Number(maxMessageChars)
      this.node.config.maxMessageChars = (val >= 200) ? val : 4096
    }
    if (sendChunkDelayMs != null)    this.node.config.sendChunkDelayMs    = Number(sendChunkDelayMs)

    if (botToken !== undefined || proxy !== undefined) {
      const patch = {}
      if (botToken !== undefined) patch.botToken = botToken.trim()
      if (proxy !== undefined) patch.proxy = proxy.trim()
      this.gateway.setCredentials(patch)
    }

    const patch = {
      digestIntervalSec:  this.node.config.digestIntervalSec,
      approvalTimeoutSec: this.node.config.approvalTimeoutSec,
      maxMessageChars:    this.node.config.maxMessageChars,
      sendChunkDelayMs:   this.node.config.sendChunkDelayMs,
    }
    if (botToken !== undefined) patch.botToken = this.gateway.config.botToken
    if (proxy !== undefined) patch.proxy = this.gateway.config.proxy
    await this.persist(patch)

    if (this.gateway.configured && (botToken !== undefined || proxy !== undefined)) {
      await this.start().catch((err) => {
        this.logger?.warn?.('[dsh-bridge telegram] auto-start failed: %s', err?.message ?? err)
      })
    }
    return { success: true }
  }

  dispose() {
    super.dispose()
    this.gateway?.dispose?.()
  }
}
