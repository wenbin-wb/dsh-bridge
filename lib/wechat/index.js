// dsh-bridge WeChat coordinator
//
// 编排 WechatGateway（iLink 网关，注册为 ctx.wechat 服务）+ WechatConversationNode
// （微信⇄DSH 会话桥）。对外暴露给 bridge-rpc 的接口：status / login / stop / setAllowFrom。
//
// 持久化策略：凭证（token/accountId/baseUrl）与配置（allowFrom/间隔）由主插件通过回调
// `onPersist` 保存在 $DSH_HOME/dsh-bridge/config.json。本服务不直接碰文件系统。

import { WechatGateway } from './gateway.js'
import { WechatConversationNode } from './node.js'

export class WechatService {
  /**
   * @param {object} opts
   * @param {object} opts.ctx          Cordis 上下文
   * @param {object} opts.logger       日志器
   * @param {object} [opts.config]     已持久化的 wechat 配置（凭证 + allowFrom + 间隔）
   * @param {(patch: object) => (void|Promise<void>)} opts.onPersist  主插件保存回调
   */
  constructor({ ctx, logger, config = {}, onPersist }) {
    this.ctx = ctx
    this.logger = logger
    this.onPersist = onPersist ?? (() => {})

    // 扫码登录的流式状态（RPC 轮询读取）
    this.loginState = {
      phase: 'idle',     // idle | qr | scaned | confirmed | done | error
      qrPayload: null,   // 待渲染内容：dataURL 图片 或 二维码文本
      qrKind: null,      // 'img' | 'text'
      error: null,
    }

    this.gateway = new WechatGateway({
      ctx,
      logger,
      config: {
        token: config.token ?? '',
        accountId: config.accountId ?? '',
        baseUrl: config.baseUrl ?? undefined,
      },
    })

    this.node = new WechatConversationNode(ctx, {
      allowFrom: Array.isArray(config.allowFrom) ? config.allowFrom : [],
      digestIntervalSec: config.digestIntervalSec,
      approvalTimeoutSec: config.approvalTimeoutSec,
      maxMessageChars: config.maxMessageChars,
      sendChunkDelayMs: config.sendChunkDelayMs,
      activeSessionId: config.activeSessionId, // v0.2.1：恢复活动会话
    }, logger, {
      onFirstSender: (senderId) => this.persist({ allowFrom: [senderId] }),
      onActiveSessionChange: (sessionId) => this.persist({ activeSessionId: sessionId }), // v0.2.1：持久化活动会话
    })

    if (this.gateway.configured) {
      void this.gateway.start().catch((err) => {
        this.logger.error('[dsh-bridge wechat] start failed: %s', err?.message ?? err)
      })
    }
  }

  /** 合并展示状态给浏览器 UI。 */
  getStatus() {
    const allowFrom = [...(this.node.config.allowFrom ?? [])]
    return {
      status: this.gateway.status,
      configured: this.gateway.configured,
      accountId: this.gateway.accountId,
      allowFrom,
      peerId: this.node.peerId,
      sessionId: this.node.activeSessionId,
      baseUrl: this.gateway.baseUrl,
      login: { ...this.loginState },
      // 可编辑配置（供 UI 设置面板读取）
      config: {
        digestIntervalSec: this.node.config.digestIntervalSec,
        approvalTimeoutSec: this.node.config.approvalTimeoutSec,
        maxMessageChars: this.node.config.maxMessageChars,
        sendChunkDelayMs: this.node.config.sendChunkDelayMs,
      },
    }
  }

  /**
   * 发起扫码登录（后台执行，状态通过 getStatus/loginState 轮询读取）。
   * @param {object} [opts]
   * @param {string} [opts.qrType]   'img' 时优先用 qrcode_img_content，否则用 scanData
   * @returns {Promise<{ok: boolean, error?: string}>}  立即返回（已启动）
   */
  async login({ qrType } = {}) {
    // 已有状态/正在登录则先清空
    this.loginState = { phase: 'idle', qrPayload: null, qrKind: null, error: null }
    void this._doLogin({ qrType })
    return { ok: true }
  }

  async _doLogin({ qrType } = {}) {
    const update = (phase, patch = {}) => {
      this.loginState = { ...this.loginState, phase, ...patch }
    }
    const result = await this.gateway.loginQr({
      onQr: (qr) => {
        const img = qr.imgContent
        if (img && /^data:/i.test(img)) {
          // 服务端已给图片 dataURL
          update('qr', { qrPayload: img, qrKind: 'img' })
        } else if (qrType === 'img' && img) {
          // 服务端给了图片内容但非 dataURL（可能是 base64）——RPC 层拼接
          update('qr', { qrPayload: img, qrKind: 'img' })
        } else {
          // 纯文本/短链：RPC 层用 qrcode 库渲染成 dataURL
          update('qr', { qrPayload: qr.scanData || qr.value, qrKind: 'text' })
        }
      },
      onStatus: (state) => {
        if (state === 'scaned' || state === 'scaned_but_redirect') update('scaned')
        else if (state === 'confirmed') update('confirmed')
        else if (state === 'expired') update('qr', { error: '二维码已过期，正在刷新…' })
        else if (state === 'wait') update('qr')
      },
    }).catch((err) => {
      this.loginState = { phase: 'error', qrPayload: null, qrKind: null, error: err?.message ?? String(err) }
      return null
    })
    if (!result || !result.success) {
      this.loginState = { phase: 'error', qrPayload: null, qrKind: null, error: result?.error ?? '登录失败或超时' }
      return
    }
    const creds = result.credentials
    await this.persist({
      token: creds.token,
      accountId: creds.accountId,
      baseUrl: creds.baseUrl,
    })
    void this.gateway.start().catch((err) => {
      this.logger.error('[dsh-bridge wechat] login start failed: %s', err?.message ?? err)
    })
    this.loginState = { phase: 'done', qrPayload: null, qrKind: null, error: null }
  }

  /** 停止网关轮询（保留凭证与配置）。 */
  async stop() {
    await this.gateway.stop()
  }

  /** 解绑：停止网关并清除凭证（token/accountId），下次重启不再自动重连。 */
  async unbind() {
    await this.gateway.stop()
    this.gateway.setCredentials({ token: '', accountId: '', baseUrl: undefined })
    await this.persist({ token: '', accountId: '', baseUrl: '' })
    this.logger.info('[dsh-bridge wechat] unbound: credentials cleared')
  }

  /** 更新白名单并发起持久化。 */
  async setAllowFrom(list) {
    const clean = Array.isArray(list) ? [...new Set(list.map((x) => String(x).trim()).filter(Boolean))] : []
    this.node.config.allowFrom = clean
    await this.persist({ allowFrom: clean })
  }

  /** 更新运行时配置（心跳间隔/审批超时/每气泡字数/分块延迟）并持久化。 */
  async setConfig({ digestIntervalSec, approvalTimeoutSec, maxMessageChars, sendChunkDelayMs } = {}) {
    if (digestIntervalSec != null)   this.node.config.digestIntervalSec   = Number(digestIntervalSec)
    if (approvalTimeoutSec != null)  this.node.config.approvalTimeoutSec  = Number(approvalTimeoutSec)
    if (maxMessageChars != null)     this.node.config.maxMessageChars     = Number(maxMessageChars)
    if (sendChunkDelayMs != null)    this.node.config.sendChunkDelayMs    = Number(sendChunkDelayMs)
    await this.persist({
      digestIntervalSec:  this.node.config.digestIntervalSec,
      approvalTimeoutSec: this.node.config.approvalTimeoutSec,
      maxMessageChars:    this.node.config.maxMessageChars,
      sendChunkDelayMs:   this.node.config.sendChunkDelayMs,
    })
  }

  /** 完整关停（dispose 时调用）。 */
  async destroy() {
    await this.gateway.stop()
    this.gateway.dispose()
    this.node.dispose()
  }

  async persist(patch) {
    try {
      await this.onPersist(patch)
    } catch (err) {
      this.logger.warn('[dsh-bridge wechat] persist failed: %s', err?.message ?? err)
    }
  }
}
