// dsh-bridge Telegram platform adapter
// 编排 TelegramGateway（长轮询 + 代理支持）+ TelegramConversationNode（Telegram⇄DSH 会话桥）。
// 作为 Platform 子类，注册进 PlatformManager 统一管理。

import QRCode from 'qrcode'
import { Platform } from '../platform/base.js'
import { applySessionConfig, readSessionConfig } from '../platform/session-config.js'
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
  constructor({ ctx, logger, config = {}, onPersist, instanceId, serviceName }) {
    super({ ctx, logger, config, onPersist })
    this.id = 'telegram'
    // issue #78：同类型可并行多实例；缺省回退类型 id 保持单实例旧行为
    this.instanceId = instanceId || this.id
    this.displayName = null
    this.name = 'Telegram'
    this._botQrCache = { username: '', qr: '' }

    this.gateway = new TelegramGateway(ctx, {
      // issue #78：instanceId 用于事件隔离；serviceName 是唯一 cordis 服务名（D2）
      instanceId: this.instanceId,
      serviceName,
      botToken: config.botToken ?? '',
      proxy: config.proxy ?? '',
    })

    // 仅首个实例占用 ctx.telegram 槽位（兼容外部读取方）；节点已改为显式接收网关
    try { if (!ctx.telegram) ctx.telegram = this.gateway } catch {}

    this.node = new TelegramConversationNode(ctx, {
      allowFrom: Array.isArray(config.allowFrom) ? config.allowFrom : [],
      groupAutoApprove: config.groupAutoApprove,
      changesDigest: config.changesDigest,
      showActivity: config.showActivity,
      steerMode: config.steerMode,
      digestIntervalSec: config.digestIntervalSec,
      approvalTimeoutSec: config.approvalTimeoutSec,
      maxMessageChars: config.maxMessageChars || 4096,
      sendChunkDelayMs: config.sendChunkDelayMs,
      activeSessionId: config.activeSessionId,
      // 会话级配置：工作区 / Agent 预设 / 模型路由（构造期来自 cordis 配置，运行期由设置页写入）
      cwd: config.cwd,
      agentPreset: config.agentPreset,
      agentProvider: config.agentProvider,
      agentModel: config.agentModel,
    }, logger, {
      onFirstSender: () => this.persist({ allowFrom: [...(this.node?.config?.allowFrom ?? [])] }),
      onActiveSessionChange: (sessionId) => this.persist({ activeSessionId: sessionId }),
      // /model 写平台配置（issue #91）
      onConfigChange: (patch) => this.persist(patch),
      gateway: this.gateway,
      instanceId: this.instanceId,
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
      // issue #78：实例标识（instanceId 为全局唯一键，platformId 为平台类型）
      instanceId: this.instanceId,
      platformId: this.id,
      displayName: this.displayName ?? this.name,
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
        name: this.config.name ?? '',
        digestIntervalSec: this.node?.config?.digestIntervalSec,
        approvalTimeoutSec: this.node?.config?.approvalTimeoutSec,
        maxMessageChars: this.node?.config?.maxMessageChars,
        sendChunkDelayMs: this.node?.config?.sendChunkDelayMs,
        // issue #77 ①：与飞书同缺陷——不回读这三个字段，设置页勾选会"回退"
        groupAutoApprove: this.node?.config?.groupAutoApprove === true,
        changesDigest: this.node?.config?.changesDigest !== false,
        showActivity: this.node?.config?.showActivity === true,
        steerMode: this.node?.config?.steerMode === true,
        botToken: this.gateway.config.botToken ? '******' : '',
        proxy: this.gateway.config.proxy || '',
        ...readSessionConfig(this.node?.config),
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

  async setConfig({ digestIntervalSec, approvalTimeoutSec, maxMessageChars, sendChunkDelayMs, groupAutoApprove, changesDigest, showActivity, steerMode, botToken, proxy, name, agentPreset, cwd, agentProvider, agentModel } = {}) {
    if (digestIntervalSec != null)   this.node.config.digestIntervalSec   = Number(digestIntervalSec)
    if (approvalTimeoutSec != null)  this.node.config.approvalTimeoutSec  = Number(approvalTimeoutSec)
    if (maxMessageChars != null) {
      const val = Number(maxMessageChars)
      this.node.config.maxMessageChars = (val >= 200) ? val : 4096
    }
    if (sendChunkDelayMs != null)    this.node.config.sendChunkDelayMs    = Number(sendChunkDelayMs)
    if (groupAutoApprove != null)    this.node.config.groupAutoApprove    = groupAutoApprove === true
    if (changesDigest != null)       this.node.config.changesDigest       = changesDigest === true
    if (showActivity != null)        this.node.config.showActivity        = showActivity === true
    if (steerMode != null)           this.node.config.steerMode           = steerMode === true
    applySessionConfig(this.node.config, { agentPreset, cwd, agentProvider, agentModel })
    // issue #78：账号备注名（面板回显 + displayName 来源），随 setConfig 持久化
    if (name !== undefined) this.config.name = String(name).trim()

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
      groupAutoApprove:   this.node.config.groupAutoApprove === true,
      changesDigest:      this.node.config.changesDigest !== false,
      showActivity:       this.node.config.showActivity === true,
      steerMode:          this.node.config.steerMode === true,
      ...readSessionConfig(this.node.config),
    }
    if (botToken !== undefined) patch.botToken = this.gateway.config.botToken
    if (proxy !== undefined) patch.proxy = this.gateway.config.proxy
    if (name !== undefined) patch.name = this.config.name ?? ''
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
