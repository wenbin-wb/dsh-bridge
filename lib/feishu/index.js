// dsh-bridge Feishu / Lark platform adapter
// 编排 FeishuGateway（官方 OpenAPI/WSClient 网关）+ FeishuConversationNode（飞书⇄DSH 会话桥）。
// 作为 Platform 子类，注册进 PlatformManager 统一管理。

import QRCode from 'qrcode'
import { Platform } from '../platform/base.js'
import { FeishuGateway } from './gateway.js'
import { FeishuConversationNode } from './node.js'

export class FeishuService extends Platform {
  /**
   * @param {object} opts
   * @param {object} opts.ctx          Cordis 上下文
   * @param {object} opts.logger       日志器
   * @param {object} [opts.config]     已持久化的 feishu 配置（凭证 + allowFrom + 间隔）
   * @param {(patch: object) => (void|Promise<void>)} opts.onPersist  主插件保存回调
   */
  constructor({ ctx, logger, config = {}, onPersist }) {
    super({ ctx, logger, config, onPersist })
    this.id = 'feishu'
    this.name = 'Feishu'
    this._botQrCache = { appId: '', qr: '' }

    this.gateway = new FeishuGateway(ctx, {
      appId: config.appId ?? '',
      appSecret: config.appSecret ?? '',
      domain: config.domain ?? 'feishu',
    })

    // 挂到 ctx 供会话节点读取
    try { ctx.feishu = this.gateway } catch { /* 挂载失败不致命 */ }

    this.node = new FeishuConversationNode(ctx, {
      allowFrom: Array.isArray(config.allowFrom) ? config.allowFrom : [],
      digestIntervalSec: config.digestIntervalSec,
      approvalTimeoutSec: config.approvalTimeoutSec,
      maxMessageChars: config.maxMessageChars || 2000,
      sendChunkDelayMs: config.sendChunkDelayMs,
      activeSessionId: config.activeSessionId,
    }, logger, {
      onFirstSender: () => this.persist({ allowFrom: [...(this.node?.config?.allowFrom ?? [])] }),
      onActiveSessionChange: (sessionId) => this.persist({ activeSessionId: sessionId }),
    })
    this.bridge = this.node

    if (this.gateway.configured) {
      void this.start().catch((err) => {
        this.logger.error?.('[dsh-bridge feishu] start failed:', err?.message ?? err)
      })
    }
  }

  // ---- Platform 接口 ----

  get configured() { return this.gateway.configured }
  get accountId() { return this.gateway.botInfo?.openId || '' }

  get capabilities() {
    return {
      group: true,
      media: true,
      approvals: true,
      maxMessageChars: this.node.config.maxMessageChars || 2000,
    }
  }

  async sendText(peerId, text, opts = {}) {
    return this.gateway.sendMarkdownCard(peerId, text, opts)
  }

  async sendTyping(peerId, opts = {}) {
    return this.gateway.sendTyping?.(peerId, opts)
  }

  // ---- 生命周期控制 ----

  async start() {
    if (!this.gateway.configured) {
      this.setStatus('idle')
      return { success: false, error: 'App ID 与 App Secret 未配置' }
    }
    this.setStatus('starting')
    const ok = await this.gateway.start()
    if (ok) {
      this.setStatus('connected')
      return { success: true }
    } else {
      this.setStatus('error', this.gateway.error || '连接失败')
      return { success: false, error: this.gateway.error }
    }
  }

  async stop() {
    await this.gateway.stop()
    this.setStatus('offline')
    return { success: true }
  }

  /**
   * 配置或登录
   * @param {object} creds - { appId, appSecret, domain }
   */
  async login(creds = {}) {
    const patch = {}
    if (creds.appId !== undefined) patch.appId = String(creds.appId).trim()
    if (creds.appSecret !== undefined) patch.appSecret = String(creds.appSecret).trim()
    if (creds.domain !== undefined) patch.domain = creds.domain === 'lark' ? 'lark' : 'feishu'

    this.gateway.updateConfig(patch)
    this.persist(patch)

    if (!this.gateway.configured) {
      await this.stop()
      return { success: false, error: '请填写完整的 App ID 和 App Secret' }
    }

    return this.start()
  }

  async unbind() {
    await this.stop()
    this.gateway.updateConfig({ appId: '', appSecret: '' })
    this.persist({ appId: '', appSecret: '', allowFrom: [] })
    if (this.node) this.node.config.allowFrom = []
    return { success: true }
  }

  getStatus() {
    const allowFrom = [...(this.node?.config?.allowFrom ?? [])]
    const appId = this.gateway.config.appId || ''
    const botLink = appId ? `https://applink.feishu.cn/client/bot/open?appId=${encodeURIComponent(appId)}` : null
    if (botLink && this._botQrCache.appId !== appId) {
      this._botQrCache.appId = appId
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
      accountId: this.gateway.botInfo?.appName
        ? `${this.gateway.botInfo.appName} (${this.gateway.botInfo.openId || this.gateway.config.appId})`
        : (this.gateway.botInfo?.openId || this.gateway.config.appId || ''),
      allowFrom,
      peerId: this.node?.peerId,
      sessionId: this.node?.activeSessionId,
      login: {
        phase: this.status === 'connected' ? 'done' : this.status === 'error' ? 'error' : 'idle',
        error: this.gateway.error,
      },
      capabilities: { ...this.capabilities },
      config: {
        digestIntervalSec: this.node?.config?.digestIntervalSec,
        approvalTimeoutSec: this.node?.config?.approvalTimeoutSec,
        maxMessageChars: this.node?.config?.maxMessageChars,
        sendChunkDelayMs: this.node?.config?.sendChunkDelayMs,
        appId: this.gateway.config.appId,
        appSecret: '',
        domain: this.gateway.config.domain,
      },
      botInfo: this.gateway.botInfo,
      botLink,
      botQr: this._botQrCache.qr,
      error: this.gateway.error,
    }
  }

  setAllowFrom(allowFrom) {
    const list = Array.isArray(allowFrom) ? allowFrom.map((s) => String(s).trim()).filter(Boolean) : []
    if (this.node) this.node.config.allowFrom = list
    this.persist({ allowFrom: list })
    return { success: true, allowFrom: list }
  }

  async setConfig({ digestIntervalSec, approvalTimeoutSec, maxMessageChars, sendChunkDelayMs, appId, appSecret, domain } = {}) {
    if (digestIntervalSec != null)   this.node.config.digestIntervalSec   = Number(digestIntervalSec)
    if (approvalTimeoutSec != null)  this.node.config.approvalTimeoutSec  = Number(approvalTimeoutSec)
    if (maxMessageChars != null) {
      const val = Number(maxMessageChars)
      this.node.config.maxMessageChars = (val >= 200) ? val : 2000
    }
    if (sendChunkDelayMs != null)    this.node.config.sendChunkDelayMs    = Number(sendChunkDelayMs)
    if (appId !== undefined || appSecret !== undefined || domain !== undefined) {
      this.gateway.updateConfig({
        appId: appId !== undefined ? appId.trim() : this.gateway.config.appId,
        appSecret: appSecret?.trim() ? appSecret.trim() : this.gateway.config.appSecret,
        domain: domain || this.gateway.config.domain || 'feishu',
      })
    }
    const patch = {
      digestIntervalSec:  this.node.config.digestIntervalSec,
      approvalTimeoutSec: this.node.config.approvalTimeoutSec,
      maxMessageChars:    this.node.config.maxMessageChars,
      sendChunkDelayMs:   this.node.config.sendChunkDelayMs,
    }
    if (appId !== undefined || appSecret !== undefined || domain !== undefined) {
      patch.appId = this.gateway.config.appId
      patch.appSecret = this.gateway.config.appSecret
      patch.domain = this.gateway.config.domain
    }
    await this.persist(patch)

    // 凭证配置完成后自动启动网关（前端「保存并连接」自动连接）
    if (this.gateway.configured && (appId !== undefined || appSecret !== undefined)) {
      await this.start().catch((err) => {
        this.logger?.warn?.('[dsh-bridge feishu] auto-start failed: %s', err?.message ?? err)
      })
    }
    return { success: true }
  }

  dispose() {
    super.dispose()
    this.gateway?.dispose?.()
  }
}
