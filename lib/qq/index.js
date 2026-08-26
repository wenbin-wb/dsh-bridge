// dsh-bridge QQ platform adapter
// 编排 QqGateway（OpenAPI v2 网关）+ QqConversationNode（QQ⇄DSH 会话桥）。
// 作为 Platform 子类，注册进 PlatformManager 统一管理。
//
// 对外暴露给 bridge-rpc 的接口（与 wechat 一致）：getStatus / login / stop /
// setAllowFrom / setConfig / unbind / destroy。
//
// 持久化策略：凭证（appId/clientSecret/accessToken/accountId）与配置由主插件
// 通过回调 `onPersist` 保存在 $DSH_HOME/dsh-bridge/config.json。

import { Platform } from '../platform/base.js'
import { QqGateway } from './gateway.js'
import { QqConversationNode } from './node.js'

export class QqService extends Platform {
  /**
   * @param {object} opts
   * @param {object} opts.ctx          Cordis 上下文
   * @param {object} opts.logger       日志器
   * @param {object} [opts.config]     已持久化的 qq 配置（凭证 + allowFrom + 间隔）
   * @param {(patch: object) => (void|Promise<void>)} opts.onPersist  主插件保存回调
   */
  constructor({ ctx, logger, config = {}, onPersist }) {
    super({ ctx, logger, config, onPersist })
    this.id = 'qq'
    this.name = 'QQ'

    this.gateway = new QqGateway({
      ctx,
      logger,
      config: {
        appId: config.appId ?? '',
        clientSecret: config.clientSecret ?? '',
        accessToken: config.accessToken ?? '',
        accessTokenExpiresAt: config.accessTokenExpiresAt ?? 0,
        gatewayUrl: config.gatewayUrl ?? '',
        accountId: config.accountId ?? '',
      },
      onPersist: (patch) => this.persist(patch),
    })

    // 挂到 ctx 供会话节点读取
    try { ctx.qq = this.gateway } catch { /* 挂载失败不致命 */ }

    // 网关连接成功后自动配置指令面板与自定义菜单（一次性）
    this._panelSetupDone = false
    try {
      ctx.on?.('qq/status', (status) => {
        if (status === 'connected') {
          void this._ensurePanelSetup().catch(() => {})
        }
      })
    } catch { /* 忽略事件订阅失败 */ }

    this.node = new QqConversationNode(ctx, {
      allowFrom: Array.isArray(config.allowFrom) ? config.allowFrom : [],
      digestIntervalSec: config.digestIntervalSec,
      approvalTimeoutSec: config.approvalTimeoutSec,
      maxMessageChars: config.maxMessageChars,
      sendChunkDelayMs: config.sendChunkDelayMs,
      activeSessionId: config.activeSessionId,
    }, logger, {
      onFirstSender: () => this.persist({ allowFrom: [...(this.node?.config?.allowFrom ?? [])] }),
      onActiveSessionChange: (sessionId) => this.persist({ activeSessionId: sessionId }),
    })
    this.bridge = this.node

    if (this.gateway.configured) {
      void this.start().catch((err) => {
        this.logger.error('[dsh-bridge qq] start failed: %s', err?.message ?? err)
      })
    }
  }

  // ---- Platform 接口 ----

  get configured() { return this.gateway.configured }
  get accountId() { return this.gateway.accountId }

  get capabilities() {
    return {
      ...this.gateway.capabilities,
      maxMessageChars: this.node.config.maxMessageChars ?? gatewayMaxChars(),
    }
  }

  /** 消息抽象：委托 gateway（供 PlatformManager/未来多平台统一调用）。 */
  async sendText(peerId, text, opts = {}) {
    return this.gateway.sendText(peerId, text, opts)
  }

  async sendTyping(peerId, opts = {}) {
    // 兼容旧调用：sendTyping(peerId, durationSeconds)
    const normalized = typeof opts === 'number' ? { durationSeconds: opts } : opts
    return this.gateway.sendTyping(peerId, normalized)
  }

  async sendMedia(peerId, media, opts = {}) {
    return this.gateway.sendMedia(peerId, media, opts)
  }

  async sendMarkdown(peerId, markdown, opts = {}) {
    return this.gateway.sendMarkdown(peerId, markdown, opts)
  }

  async sendKeyboard(peerId, content, keyboard, opts = {}) {
    return this.gateway.sendKeyboard(peerId, content, keyboard, opts)
  }

  /** 合并展示状态给浏览器 UI。 */
  getStatus() {
    const allowFrom = [...(this.node.config.allowFrom ?? [])]
    return {
      id: this.id,
      name: this.name,
      status: this.gateway.status,
      configured: this.gateway.configured,
      accountId: this.gateway.accountId,
      allowFrom,
      peerId: this.node.peerId,
      sessionId: this.node.activeSessionId,
      login: { ...this.loginState },
      capabilities: { ...this.capabilities },
      config: {
        digestIntervalSec: this.node.config.digestIntervalSec,
        approvalTimeoutSec: this.node.config.approvalTimeoutSec,
        maxMessageChars: this.node.config.maxMessageChars,
        sendChunkDelayMs: this.node.config.sendChunkDelayMs,
        appId: this.gateway.config.appId,
        // 密钥不回传到浏览器；设置页留空时保持已保存密钥
        clientSecret: '',
        accountId: this.gateway.accountId,
      },
    }
  }

  /** 可编辑配置（供通用 PlatformPanel 读取）。 */
  getEditableConfig() {
    return {
      digestIntervalSec: this.node.config.digestIntervalSec,
      approvalTimeoutSec: this.node.config.approvalTimeoutSec,
      maxMessageChars: this.node.config.maxMessageChars,
      sendChunkDelayMs: this.node.config.sendChunkDelayMs,
      appId: this.gateway.config.appId,
      clientSecret: '',
    }
  }

  /** 启动网关（凭证已配置时生效）。 */
  async start() {
    if (!this.gateway.configured) {
      this.setStatus('idle')
      return
    }
    await this.gateway.start()
  }

  /** 停止网关（保留凭证与配置）。 */
  async stop() {
    await this.gateway.stop()
  }

  /** 完整关停（dispose 时调用）。 */
  async dispose() {
    await this.gateway.stop()
    this.gateway.dispose()
    super.dispose()
  }

  /** 兼容 v1.x 的别名。 */
  async destroy() {
    await this.dispose()
  }

  /**
   * 发起登录（配置 AppID/Secret 后即视为已连接；后台执行，状态通过 getStatus 轮询读取）。
   * @returns {Promise<{ok: boolean, error?: string}>}  立即返回（已启动）
   */
  async login(opts = {}) {
    // 无二维码流程：QQ 官方 Bot 用 AppID/Secret 鉴权，登录即配置凭证 + 启动网关
    if (!this.gateway.configured) {
      return { ok: false, error: '请先在配置面板填写 QQ 开放平台的 AppID 与 ClientSecret' }
    }
    this.loginState = { phase: 'done', qrPayload: null, qrKind: null, error: null }
    void this.gateway.start().catch((err) => {
      this.logger.error('[dsh-bridge qq] login start failed: %s', err?.message ?? err)
    })
    return { ok: true }
  }

  /** 解绑：停止网关并清除凭证，下次重启不再自动重连。 */
  async unbind() {
    await this.gateway.stop()
    this.gateway.setCredentials({ appId: '', clientSecret: '', accessToken: '', accessTokenExpiresAt: 0 })
    await this.persist({ appId: '', clientSecret: '', accessToken: '', accessTokenExpiresAt: 0, accountId: '' })
    this.logger.info('[dsh-bridge qq] unbound: credentials cleared')
  }

  /** 更新白名单并发起持久化。 */
  async setAllowFrom(list) {
    const clean = Array.isArray(list) ? [...new Set(list.map((x) => String(x).trim()).filter(Boolean))] : []
    this.node.config.allowFrom = clean
    await this.persist({ allowFrom: clean })
  }

  // ---- 指令面板 / 自定义菜单（一次性自动配置）----

  /**
   * 连接成功后自动创建 c2c + group 指令面板，并配置单聊自定义菜单。
   * 幂等：已存在 remark 匹配的面板时跳过创建；失败仅记日志，不影响连接。
   */
  async _ensurePanelSetup() {
    if (this._panelSetupDone) return
    this._panelSetupDone = true // 防并发重复执行

    const gate = this.gateway
    const remark = PANEL_REMARK
    const items = [
      { name: '/new', desc: '新建对话', type: 'command' },
      { name: '/list', desc: '查看会话列表', type: 'command' },
      { name: '/resume', desc: '恢复会话', type: 'command' },
      { name: '/sessions', desc: '切换会话', type: 'command' },
      { name: '/help', desc: '命令帮助', type: 'command' },
    ]

    // 指令面板：c2c（单聊）与 group（群聊）各建一个全局面板
    for (const scope of ['c2c', 'group']) {
      try {
        const list = await gate.listPanels(scope)
        const exists = (list?.records || []).some((r) => r?.panel?.remark === remark)
        if (!exists) {
          const res = await gate.createPanel({
            scope,
            target_type: 'all',
            panel: { items, remark, version: 1 },
          })
          this.logger.info('[dsh-bridge qq] created %s command panel: %s', scope, res?.panel_id ?? '(no id)')
        }
      } catch (err) {
        this.logger.warn('[dsh-bridge qq] command panel setup for %s skipped: %s', scope, err?.message ?? err)
      }
    }

    // 自定义菜单：单聊底部菜单（send_message 类型，点击自动填入命令）
    // 幂等：先查询，内容一致则跳过 PUT，避免每次重启都覆盖（version 递增）
    try {
      const menuItems = [
        { name: '新建', type: 'send_message', send_message: '/new' },
        { name: '列表', type: 'send_message', send_message: '/list' },
        { name: '帮助', type: 'send_message', send_message: '/help' },
      ]
      const existing = await gate.getMenu()
      const existingItems = existing?.menu?.items || []
      const same = existingItems.length === menuItems.length &&
        menuItems.every((item, i) => existingItems[i]?.name === item.name && existingItems[i]?.send_message === item.send_message)
      if (!same) {
        await gate.setMenu(menuItems)
        this.logger.info('[dsh-bridge qq] custom menu configured')
      } else {
        this.logger.info('[dsh-bridge qq] custom menu already configured')
      }
    } catch (err) {
      this.logger.warn('[dsh-bridge qq] custom menu setup skipped: %s', err?.message ?? err)
    }
  }

  /** 更新运行时配置并持久化。 */
  async setConfig({ digestIntervalSec, approvalTimeoutSec, maxMessageChars, sendChunkDelayMs, appId, clientSecret } = {}) {
    if (digestIntervalSec != null)   this.node.config.digestIntervalSec   = Number(digestIntervalSec)
    if (approvalTimeoutSec != null)  this.node.config.approvalTimeoutSec  = Number(approvalTimeoutSec)
    if (maxMessageChars != null) {
      const val = Number(maxMessageChars)
      this.node.config.maxMessageChars = (val >= 200) ? val : 2000
    }
    if (sendChunkDelayMs != null)    this.node.config.sendChunkDelayMs    = Number(sendChunkDelayMs)
    if (appId !== undefined || clientSecret !== undefined) {
      this.gateway.setCredentials({
        appId: appId !== undefined ? appId : this.gateway.config.appId,
        // 空字符串表示 UI 未修改密钥，避免误覆盖已保存的 secret
        clientSecret: clientSecret?.trim() ? clientSecret.trim() : this.gateway.config.clientSecret,
      })
    }
    const patch = {
      digestIntervalSec:  this.node.config.digestIntervalSec,
      approvalTimeoutSec: this.node.config.approvalTimeoutSec,
      maxMessageChars:    this.node.config.maxMessageChars,
      sendChunkDelayMs:   this.node.config.sendChunkDelayMs,
    }
    if (appId !== undefined || clientSecret !== undefined) {
      patch.appId = this.gateway.config.appId
      patch.clientSecret = this.gateway.config.clientSecret
    }
    await this.persist(patch)

    // 凭证配置完成后自动启动网关（前端「保存并连接」无需二次点击）
    if (this.gateway.configured && (appId !== undefined || clientSecret !== undefined)) {
      await this.gateway.start().catch((err) => {
        this.logger?.warn?.('[dsh-bridge qq] auto-start failed: %s', err?.message ?? err)
      })
    }
  }
}

function gatewayMaxChars() {
  return 2000
}

// 指令面板 remark 标识，用于幂等判断（区分本插件创建的面板）
const PANEL_REMARK = 'dsh-bridge 常用命令'
