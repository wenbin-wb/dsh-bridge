// dsh-bridge Feishu / Lark platform adapter
// 编排 FeishuGateway（官方 Channel SDK 网关）+ FeishuConversationNode（飞书⇄DSH 会话桥）。
// 作为 Platform 子类，注册进 PlatformManager 统一管理。
//
// 凭证获取支持两条路径：
//   1. 一键扫码创建应用（registerApp，官方 OAuth 2.0 设备码流程）——推荐，自动预置权限与事件订阅；
//   2. 手动填写已有应用的 App ID / App Secret。

import QRCode from 'qrcode'
import { Platform } from '../platform/base.js'
import { applySessionConfig, readSessionConfig } from '../platform/session-config.js'
import { FeishuGateway } from './gateway.js'
import { FeishuConversationNode } from './node.js'

/** 等待二维码就绪的上限（设备码请求通常 <1s；超时则前端轮询后续状态） */
const REGISTER_QR_TIMEOUT_MS = 10_000

/** registerApp 文档化错误码 → 用户可读提示 */
const REGISTER_ERROR_TEXT = {
  access_denied: '你已拒绝授权，可重新发起扫码创建',
  expired_token: '二维码已过期，请重新发起扫码创建',
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function describeRegisterError(err) {
  const code = err?.code
  const detail = err?.description || err?.message || String(err)
  const friendly = code ? REGISTER_ERROR_TEXT[code] : ''
  if (friendly) return `${friendly}（${code}）`
  return code ? `${detail}（${code}）` : detail
}

export class FeishuService extends Platform {
  /**
   * @param {object} opts
   * @param {object} opts.ctx          Cordis 上下文
   * @param {object} opts.logger       日志器
   * @param {object} [opts.config]     已持久化的 feishu 配置（凭证 + allowFrom + 间隔）
   * @param {(patch: object) => (void|Promise<void>)} opts.onPersist  主插件保存回调
   */
  constructor({ ctx, logger, config = {}, onPersist, instanceId, serviceName }) {
    super({ ctx, logger, config, onPersist })
    this.id = 'feishu'
    // issue #78：同类型可并行多实例；缺省回退类型 id 保持单实例旧行为
    this.instanceId = instanceId || this.id
    this.displayName = null
    this.name = 'Feishu'
    this._botQrCache = { appId: '', qr: '' }
    // 一键创建应用（registerApp）运行期状态：一次流程 = 一个 run 对象
    //（用对象而非散装字段，刷新二维码时替换 run 即可，旧流程的收尾不会污染新流程）
    this._registerRun = null
    this._registerSeq = 0

    this.gateway = new FeishuGateway(ctx, {
      // issue #78：instanceId 用于事件隔离；serviceName 是唯一 cordis 服务名（D2）
      instanceId: this.instanceId,
      serviceName,
      appId: config.appId ?? '',
      appSecret: config.appSecret ?? '',
      domain: config.domain ?? 'feishu',
      maxMessageChars: config.maxMessageChars || 2000,
      sendChunkDelayMs: config.sendChunkDelayMs,
      // 工作目录：网关据此设置 outbound.allowedFileDirs（本地文件走 SDK 流式上传）
      cwd: config.cwd ?? '',
      // 已注册的斜杠指令映射（由本服务持久化，gateway 只负责同步与调用回调）
      slashCommandIds: config.slashCommandIds ?? {},
    })
    this.gateway.onSlashCommandIds = (ids) => {
      void this.persist({ slashCommandIds: ids })
    }

    // 仅首个实例占用 ctx.feishu 槽位（兼容外部读取方）；节点已改为显式接收网关
    try { if (!ctx.feishu) ctx.feishu = this.gateway } catch { /* 挂载失败不致命 */ }

    this.node = new FeishuConversationNode(ctx, {
      allowFrom: Array.isArray(config.allowFrom) ? config.allowFrom : [],
      groupAutoApprove: config.groupAutoApprove,
      changesDigest: config.changesDigest,
      showActivity: config.showActivity,
      steerMode: config.steerMode,
      digestIntervalSec: config.digestIntervalSec,
      approvalTimeoutSec: config.approvalTimeoutSec,
      maxMessageChars: config.maxMessageChars || 2000,
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
    return this.gateway.sendText(peerId, text, opts)
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
      // 连接成功即视为流程闭环：清掉上一次扫码失败留下的错误提示
      if (this.loginState.phase === 'error') this.setLoginState({ phase: 'idle' })
      return { success: true }
    }
    this.setStatus('error', this.gateway.error || '连接失败')
    return { success: false, error: this.gateway.error }
  }

  async stop() {
    this.cancelRegisterApp()
    await this.gateway.stop()
    this.setStatus('offline')
    return { success: true }
  }

  /**
   * 配置或登录。
   * @param {object} [opts]
   * @param {string} [opts.qrType] 传 'register' 走「一键扫码创建应用」流程
   * @param {string} [opts.appId] / [opts.appSecret] / [opts.domain] 手动凭证
   */
  async login({ qrType, refresh, appId, appSecret, domain } = {}) {
    if (qrType === 'register') return this.startRegisterApp({ refresh })

    const patch = {}
    if (appId !== undefined) patch.appId = String(appId).trim()
    if (appSecret !== undefined) patch.appSecret = String(appSecret).trim()
    if (domain !== undefined) patch.domain = domain === 'lark' ? 'lark' : 'feishu'
    if (Object.keys(patch).length > 0) {
      this.gateway.updateConfig(patch)
      await this.persist(patch)
    }

    if (!this.gateway.configured) {
      await this.stop()
      return { ok: false, error: '请填写完整的 App ID 和 App Secret，或使用扫码一键创建应用' }
    }

    const result = await this.start()
    return result.success ? { ok: true } : { ok: false, error: result.error }
  }

  // ---- 一键扫码创建应用（官方 registerApp / OAuth 2.0 设备码流程） ----

  /**
   * 发起「一键创建飞书智能体应用」：立刻返回，二维码经 loginState 暴露给前端轮询。
   * 用户在飞书中扫码并确认后，凭据自动落盘并连接。
   *
   * @param {object} [opts]
   * @param {boolean} [opts.refresh] true = 作废当前设备码并重新生成二维码
   *   （设备码一次性且 10 分钟有效；刷新后旧码立即失效，旧流程的迟到结果一律丢弃）
   */
  async startRegisterApp({ refresh = false } = {}) {
    const current = this._registerRun
    if (current && !refresh) return { ok: true } // 已在扫码中：复用当前二维码
    if (current) {
      this.logger?.info?.('[dsh-bridge feishu] 重新生成扫码创建二维码')
      current.controller.abort()
    }

    const run = {
      seq: (this._registerSeq += 1),
      controller: new AbortController(),
    }
    run.ready = new Promise((resolve) => { run.resolveReady = resolve })
    run.settled = new Promise((resolve) => { run.resolveSettled = resolve })
    this._registerRun = run
    this.setLoginState({ phase: 'qr', qrPayload: null, qrKind: 'text', error: null })

    void this._runRegisterApp(run)

    // 二维码就绪（或流程已提前结束/超时）后再返回，避免前端首帧空白
    await Promise.race([run.ready, run.settled, sleep(REGISTER_QR_TIMEOUT_MS)])
    return { ok: true }
  }

  /** 是否正在扫码创建流程中（状态快照与外部判断使用） */
  get registering() {
    return Boolean(this._registerRun)
  }

  cancelRegisterApp() {
    const run = this._registerRun
    if (!run) return
    this.logger?.info?.('[dsh-bridge feishu] 取消扫码创建应用')
    run.controller.abort()
  }

  async _runRegisterApp(run) {
    // 每次状态写入前确认自己仍是"当前流程"：刷新用的新流程启动后，
    // 旧流程的二维码回调、成功结果、错误与收尾都必须丢弃，避免覆盖新流程
    const isCurrent = () => this._registerRun === run
    try {
      const result = await this.gateway.registerApp({
        source: 'dsh-bridge',
        signal: run.controller.signal,
        appPreset: {
          name: 'dsh-bridge',
          desc: 'DeepSeek Harness 远程连接：手机扫码即可远程继续本机 DSH 会话',
        },
        onQRCodeReady: ({ url }) => {
          if (!isCurrent()) return
          this.setLoginState({ phase: 'qr', qrPayload: url, qrKind: 'text' })
          run.resolveReady()
        },
      })
      if (!isCurrent()) return // 已被刷新流程取代：结果作废

      const appId = result?.client_id
      const appSecret = result?.client_secret
      if (!appId || !appSecret) throw new Error('扫码创建应用未返回完整凭据')
      // 扫码用户所在租户品牌 → 域名（feishu / lark），避免 Lark 用户走错认证域名
      const domain = result?.user_info?.tenant_brand === 'lark' ? 'lark' : 'feishu'

      this.gateway.updateConfig({ appId, appSecret, domain })
      await this.persist({ appId, appSecret, domain })
      this.logger?.info?.('[dsh-bridge feishu] 一键创建应用成功：%s（%s）', appId, domain)
      this.setLoginState({ phase: 'done', qrPayload: null, qrKind: null, error: null })
      await this.start()
    } catch (err) {
      if (!isCurrent()) return // 旧流程被 abort：静默退出
      if (err?.code === 'abort' || err?.name === 'AbortError') {
        this.setLoginState({ phase: 'idle', qrPayload: null, qrKind: null, error: null })
      } else {
        const message = describeRegisterError(err)
        this.logger?.warn?.('[dsh-bridge feishu] 扫码创建应用失败：%s', message)
        this.setLoginState({ phase: 'error', qrPayload: null, qrKind: null, error: message })
      }
    } finally {
      if (isCurrent()) this._registerRun = null
      run.resolveSettled()
    }
  }

  setLoginState(state) {
    this.loginState = {
      phase: 'idle', qrPayload: null, qrKind: null, error: null,
      ...state,
    }
  }

  async unbind() {
    this.cancelRegisterApp()
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
    const registering = this.registering
    return {
      id: this.id,
      // issue #78：实例标识（instanceId 为全局唯一键，platformId 为平台类型）
      instanceId: this.instanceId,
      platformId: this.id,
      displayName: this.displayName ?? this.name,
      name: this.name,
      // 通道重连中（SDK 事件驱动）要如实展示，不要钉在 connected 上
      status: this.gateway.status === 'reconnecting' && this.status === 'connected'
        ? 'reconnecting'
        : (this.status === 'connected' ? 'connected' : this.gateway.status),
      configured: this.gateway.configured,
      accountId: this.gateway.botInfo?.appName
        ? `${this.gateway.botInfo.appName} (${this.gateway.botInfo.openId || this.gateway.config.appId})`
        : (this.gateway.botInfo?.openId || this.gateway.config.appId || ''),
      allowFrom,
      peerId: this.node?.peerId,
      sessionId: this.node?.activeSessionId,
      login: {
        // 扫码创建流程的中间态（qr）与终态错误要如实回传，供设置页展示与重试
        phase: this.loginState.phase === 'error'
          ? 'error'
          : (registering
            ? this.loginState.phase
            : (this.status === 'connected' ? 'done' : this.status === 'error' ? 'error' : 'idle')),
        error: this.loginState.phase === 'error'
          ? this.loginState.error
          : (registering ? this.loginState.error : this.gateway.error),
        qrPayload: registering ? this.loginState.qrPayload : null,
        qrKind: registering ? this.loginState.qrKind : null,
      },
      capabilities: { ...this.capabilities },
      config: {
        name: this.config.name ?? '',
        digestIntervalSec: this.node?.config?.digestIntervalSec,
        approvalTimeoutSec: this.node?.config?.approvalTimeoutSec,
        maxMessageChars: this.node?.config?.maxMessageChars,
        sendChunkDelayMs: this.node?.config?.sendChunkDelayMs,
        // issue #77 ①：这三个开关必须回读，否则设置页读 status.config.showActivity 恒为
        // undefined，勾选后切页/重开面板就回退（磁盘其实已保存成功），用户以为"没保存"。
        groupAutoApprove: this.node?.config?.groupAutoApprove === true,
        changesDigest: this.node?.config?.changesDigest !== false,
        showActivity: this.node?.config?.showActivity === true,
        steerMode: this.node?.config?.steerMode === true,
        appId: this.gateway.config.appId,
        appSecret: '',
        domain: this.gateway.config.domain,
        ...readSessionConfig(this.node?.config),
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

  async setConfig({ digestIntervalSec, approvalTimeoutSec, maxMessageChars, sendChunkDelayMs, groupAutoApprove, changesDigest, showActivity, steerMode, appId, appSecret, domain, name, agentPreset, cwd, agentProvider, agentModel } = {}) {
    if (digestIntervalSec != null)   this.node.config.digestIntervalSec   = Number(digestIntervalSec)
    if (approvalTimeoutSec != null)  this.node.config.approvalTimeoutSec  = Number(approvalTimeoutSec)
    if (maxMessageChars != null) {
      const val = Number(maxMessageChars)
      this.node.config.maxMessageChars = (val >= 200) ? val : 2000
    }
    if (sendChunkDelayMs != null)    this.node.config.sendChunkDelayMs    = Number(sendChunkDelayMs)
    if (groupAutoApprove != null)    this.node.config.groupAutoApprove    = groupAutoApprove === true
    if (changesDigest != null)       this.node.config.changesDigest       = changesDigest === true
    if (showActivity != null)        this.node.config.showActivity        = showActivity === true
    if (steerMode != null)           this.node.config.steerMode           = steerMode === true
    applySessionConfig(this.node.config, { agentPreset, cwd, agentProvider, agentModel })
    // issue #78：账号备注名（面板回显 + displayName 来源），随 setConfig 持久化
    if (name !== undefined) this.config.name = String(name).trim()

    // 通道构造期参数：凭证与出站渲染（分片上限 / 流式节流）变更后需要重建通道才生效
    const channelPatch = {}
    if (appId !== undefined) channelPatch.appId = appId.trim()
    // 密码框留空表示「不修改已保存的密钥」
    if (appSecret !== undefined && appSecret.trim()) channelPatch.appSecret = appSecret.trim()
    if (domain !== undefined) channelPatch.domain = domain === 'lark' ? 'lark' : 'feishu'
    if (maxMessageChars != null) channelPatch.maxMessageChars = this.node.config.maxMessageChars
    if (sendChunkDelayMs != null) channelPatch.sendChunkDelayMs = this.node.config.sendChunkDelayMs

    const channelChanged = Object.entries(channelPatch).some(([key, value]) => this.gateway.config[key] !== value)
    if (Object.keys(channelPatch).length > 0) this.gateway.updateConfig(channelPatch)

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
    if (name !== undefined) patch.name = this.config.name ?? ''
    if (appId !== undefined || appSecret !== undefined || domain !== undefined) {
      patch.appId = this.gateway.config.appId
      patch.appSecret = this.gateway.config.appSecret
      patch.domain = this.gateway.config.domain
    }
    await this.persist(patch)

    if (channelChanged) {
      // 通道参数/凭证变化：先收尾在途流式卡片（避免控制器悬挂），再重建通道
      await this.node?._finishStream?.()
      if (this.gateway.status !== 'idle') await this.gateway.stop()
      this.setStatus('idle')
      if (this.gateway.configured) {
        await this.start().catch((err) => {
          this.logger?.warn?.('[dsh-bridge feishu] 重连失败：%s', err?.message ?? err)
        })
      }
    }
    return { success: true }
  }

  dispose() {
    this.cancelRegisterApp()
    super.dispose()
    this.gateway?.dispose?.()
  }
}
