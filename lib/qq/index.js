// dsh-bridge QQ platform adapter
//
// 编排 QqGateway（官方 @tencent-connect/qqbot-nodejs 网关）+ QqConversationNode（QQ⇄DSH 会话桥）。
// 作为 Platform 子类，注册进 PlatformManager 统一管理。
//
// 凭证获取支持两条路径（与飞书一致）：
//   1. 一键扫码绑定（官方 @tencent-connect/qqbot-connector）——推荐，
//      手机 QQ 扫码后在开放平台侧自动创建/绑定机器人并回传 AppID + AppSecret；
//   2. 手动填写已有机器人的 AppID + AppSecret。
//
// 对外暴露给 bridge-rpc 的接口：getStatus / login / stop / setAllowFrom / setConfig /
// unbind / start / dispose。
//
// 持久化策略：凭证（appId/appSecret）与配置由主插件通过回调 `onPersist` 保存在
// $DSH_HOME/dsh-bridge/config.json。

import { Platform } from '../platform/base.js'
import { applySessionConfig, readSessionConfig } from '../platform/session-config.js'
import { QqGateway, gatewayConstants } from './gateway.js'
import { QqConversationNode } from './node.js'

/** 等待二维码就绪的上限（create_bind_task 通常 <1s；超时则前端轮询后续状态） */
const BIND_QR_TIMEOUT_MS = 10_000

/**
 * 可被 unref 的等待。
 *
 * 该定时器只是"二维码就绪的兜底超时"，不应阻止进程退出——
 * 否则测试/CLI 场景下进程会白等满 10 秒（复核实测退出耗时 9999ms）。
 */
function sleep(ms) {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms)
    if (typeof timer.unref === 'function') timer.unref()
  })
}

export class QqService extends Platform {
  /**
   * @param {object} opts
   * @param {object} opts.ctx          Cordis 上下文
   * @param {object} opts.logger       日志器
   * @param {object} [opts.config]     已持久化的 qq 配置（凭证 + allowFrom + 间隔）
   * @param {(patch: object) => (void|Promise<void>)} opts.onPersist  主插件保存回调
   * @param {string} [opts.instanceId]
   * @param {string} [opts.serviceName]
   * @param {string} [opts.dataDir]    SDK 会话持久化目录
   */
  constructor({ ctx, logger, config = {}, onPersist, instanceId, serviceName, dataDir }) {
    super({ ctx, logger, config, onPersist })
    this.id = 'qq'
    // issue #78：同类型可并行多实例；缺省回退类型 id 保持单实例旧行为
    this.instanceId = instanceId || this.id
    this.displayName = null
    this.name = 'QQ'
    /** 扫码绑定流程运行期状态（一次流程 = 一个 run 对象） */
    this._bindRun = null
    this._bindSeq = 0

    this.gateway = new QqGateway({
      ctx,
      logger,
      // issue #78：instanceId 用于事件隔离；serviceName 是唯一 cordis 服务名（D2）
      instanceId: this.instanceId,
      serviceName,
      dataDir,
      config: {
        appId: config.appId ?? '',
        appSecret: config.appSecret ?? '',
        markdownSupport: config.markdownSupport,
        requireMentionInGroup: config.requireMentionInGroup,
        maxMessageChars: config.maxMessageChars,
        // 被动回复限额（单聊 4 / 群聊 5，官方上限）；留空走 gateway 默认值
        passiveReplyLimit: config.passiveReplyLimit,
        passiveReplyLimitGroup: config.passiveReplyLimitGroup,
        // 流式节流（平台建议 ≥300ms）
        streamThrottleMs: config.streamThrottleMs,
      },
      onPersist: (patch) => this.persist(patch),
    })

    // 仅首个实例占用 ctx.qq 槽位（兼容外部读取方）；节点已改为显式接收网关
    try { if (!ctx.qq) ctx.qq = this.gateway } catch { /* 挂载失败不致命 */ }

    // 网关连接成功后自动配置指令面板与自定义菜单（一次性）
    this._panelSetupDone = false
    try {
      ctx.on?.('qq/status', (event) => {
        // issue #78：status 事件带 instanceId（兼容旧的裸字符串 payload）
        if (event?.instanceId && event.instanceId !== this.instanceId) return
        const status = typeof event === 'string' ? event : event?.status
        if (status === 'connected') {
          void this._ensurePanelSetup().catch(() => {})
        }
      })
    } catch { /* 忽略事件订阅失败 */ }

    this.node = new QqConversationNode(ctx, {
      allowFrom: Array.isArray(config.allowFrom) ? config.allowFrom : [],
      groupAutoApprove: config.groupAutoApprove,
      changesDigest: config.changesDigest,
      steerMode: config.steerMode,
      digestIntervalSec: config.digestIntervalSec,
      approvalTimeoutSec: config.approvalTimeoutSec,
      maxMessageChars: config.maxMessageChars,
      sendChunkDelayMs: config.sendChunkDelayMs,
      activeSessionId: config.activeSessionId,
      // 会话级配置：工作区 / Agent 预设 / 模型路由（构造期来自 cordis 配置，运行期由设置页写入）
      cwd: config.cwd,
      agentPreset: config.agentPreset,
      agentProvider: config.agentProvider,
      agentModel: config.agentModel,
      // 单聊流式输出（平台只对 C2C 开放 stream_messages）
      streamReply: config.streamReply,
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
        this.logger.error?.('[dsh-bridge qq] start failed:', err?.message ?? err)
      })
    }
  }

  // ---- Platform 接口 ----

  get configured() { return this.gateway.configured }
  get accountId() { return this.gateway.accountId }

  get capabilities() {
    return {
      ...this.gateway.capabilities,
      maxMessageChars: this.node.config.maxMessageChars ?? gatewayConstants.MAX_MESSAGE_CHARS,
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
      // issue #78：实例标识（instanceId 为全局唯一键，platformId 为平台类型）
      instanceId: this.instanceId,
      platformId: this.id,
      displayName: this.displayName ?? this.name,
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
        name: this.config.name ?? '',
        digestIntervalSec: this.node.config.digestIntervalSec,
        approvalTimeoutSec: this.node.config.approvalTimeoutSec,
        maxMessageChars: this.node.config.maxMessageChars,
        sendChunkDelayMs: this.node.config.sendChunkDelayMs,
        groupAutoApprove: this.node.config.groupAutoApprove === true,
        changesDigest: this.node.config.changesDigest !== false,
        steerMode: this.node.config.steerMode === true,
        streamReply: this.node.config.streamReply !== false,
        appId: this.gateway.config.appId,
        // 密钥不回传到浏览器；设置页留空时保持已保存密钥
        appSecret: '',
        accountId: this.gateway.accountId,
        ...readSessionConfig(this.node.config),
      },
    }
  }

  /** 可编辑配置（供通用 PlatformPanel 读取）。 */
  getEditableConfig() {
    return {
      name: this.config.name ?? '',
      digestIntervalSec: this.node.config.digestIntervalSec,
      approvalTimeoutSec: this.node.config.approvalTimeoutSec,
      maxMessageChars: this.node.config.maxMessageChars,
      sendChunkDelayMs: this.node.config.sendChunkDelayMs,
      groupAutoApprove: this.node.config.groupAutoApprove === true,
      changesDigest: this.node.config.changesDigest !== false,
      steerMode: this.node.config.steerMode === true,
      streamReply: this.node.config.streamReply !== false,
      appId: this.gateway.config.appId,
      appSecret: '',
      ...readSessionConfig(this.node.config),
    }
  }

  /** 启动网关（凭证已配置时生效）。 */
  async start() {
    if (!this.gateway.configured) {
      this.setStatus('idle')
      return false
    }
    return this.gateway.start()
  }

  /** 停止网关（保留凭证与配置）。 */
  async stop() {
    this.cancelBind()
    await this.gateway.stop()
    this.setStatus('idle')
    return true
  }

  /** 完整关停（dispose 时调用）。 */
  async dispose() {
    this.cancelBind()
    await this.gateway.stop()
    this.gateway.dispose()
    super.dispose()
  }

  /** 兼容 v1.x 的别名。 */
  async destroy() {
    await this.dispose()
  }

  /**
   * 登录。
   * @param {object} [opts]
   * @param {string} [opts.qrType] 传 'bind' 走「官方扫码绑定机器人」流程
   * @param {boolean} [opts.refresh] true = 作废当前二维码并重新生成
   * @param {string} [opts.appId] / [opts.appSecret] 手动凭证
   */
  async login({ qrType, refresh, appId, appSecret } = {}) {
    if (qrType === 'bind') return this.startBindBot({ refresh })

    const patch = {}
    if (appId !== undefined) patch.appId = String(appId).trim()
    if (appSecret !== undefined) patch.appSecret = String(appSecret).trim()
    if (Object.keys(patch).length > 0) {
      this.gateway.setCredentials(patch)
      await this.persist(patch)
    }

    if (!this.gateway.configured) {
      return { ok: false, error: '请填写 QQ 机器人 AppID 与 AppSecret，或使用扫码一键绑定' }
    }
    this.setLoginState({ phase: 'done', qrPayload: null, qrKind: null, error: null })
    void this.gateway.start().catch((err) => {
      this.logger.error?.('[dsh-bridge qq] login start failed: %s', err?.message ?? err)
    })
    return { ok: true }
  }

  // ---- 扫码绑定机器人（官方 @tencent-connect/qqbot-connector） ----

  /**
   * 发起「扫码绑定 QQ 机器人」：立刻返回，二维码经 loginState 暴露给前端轮询。
   * 用户用手机 QQ 扫码确认后，AppID + AppSecret 自动落盘并连接。
   *
   * @param {object} [opts]
   * @param {boolean} [opts.refresh] true = 中止当前流程并重新生成二维码
   */
  async startBindBot({ refresh = false } = {}) {
    const current = this._bindRun
    if (current && !refresh) return { ok: true } // 已在扫码中：复用当前二维码
    if (current) {
      this.logger?.info?.('[dsh-bridge qq] 重新生成扫码绑定二维码')
      this.cancelBind()
    }

    const run = { seq: (this._bindSeq += 1), stopped: false }
    run.ready = new Promise((resolve) => { run.resolveReady = resolve })
    run.settled = new Promise((resolve) => { run.resolveSettled = resolve })
    this._bindRun = run
    this.setLoginState({ phase: 'qr', qrPayload: null, qrKind: 'text', error: null })

    void this._runBindBot(run)

    // 二维码就绪（或流程已提前结束/超时）后再返回，避免前端首帧空白
    await Promise.race([run.ready, run.settled, sleep(this._bindQrTimeoutMs())])
    return { ok: true }
  }

  /** 等待二维码就绪的上限（测试可注入更短的值）。 */
  _bindQrTimeoutMs() {
    const value = Number(this.config.bindQrTimeoutMs)
    return Number.isFinite(value) && value > 0 ? value : BIND_QR_TIMEOUT_MS
  }

  /** 是否正在扫码绑定流程中（状态快照与外部判断使用） */
  get binding() {
    return Boolean(this._bindRun)
  }

  cancelBind() {
    const run = this._bindRun
    if (!run) return
    this.logger?.info?.('[dsh-bridge qq] 取消扫码绑定')
    run.stopped = true
    if (this._bindRun === run) this._bindRun = null
    try { run.stopFn?.() } catch { /* 忽略 */ }
    try { run.resolveSettled?.() } catch { /* 忽略 */ }
  }

  /**
   * 官方扫码绑定工厂（测试注入点）。
   *
   * `@tencent-connect/qqbot-connector` 的 npm 包声明为 **UNLICENSED**（无 LICENSE 文件），
   * 不能内联进本仓的 MIT 产物。因此这里按需从**用户自己的 node_modules** 动态加载：
   *   - 未安装 → 抛出可读错误，前端提示"改为手动填写 AppID/AppSecret"；
   *   - 已安装 → 正常走官方扫码流程。
   * 这样既尊重上游许可，又不影响插件主功能（收发消息完全不依赖它）。
   */
  async _resolveQrConnect() {
    // 测试注入点优先（单测用假实现，避免依赖可选包）
    if (typeof this._qrConnectOverride === 'function') return this._qrConnectOverride
    let mod
    try {
      mod = await import('@tencent-connect/qqbot-connector')
    } catch (err) {
      const hint = '扫码绑定需要可选依赖 @tencent-connect/qqbot-connector（该包为 UNLICENSED，未随插件分发）。'
        + '请执行 `npm i @tencent-connect/qqbot-connector` 后重试，或直接手动填写 AppID 与 AppSecret。'
      const error = new Error(hint)
      error.cause = err
      error.code = 'CONNECTOR_NOT_INSTALLED'
      throw error
    }
    const start = mod.startQrConnect ?? mod.default?.startQrConnect
    if (typeof start !== 'function') {
      throw new Error('@tencent-connect/qqbot-connector 未导出 startQrConnect，请升级该依赖')
    }
    return start
  }

  async _runBindBot(run) {
    // 每次状态写入前确认自己仍是"当前流程"：刷新用的新流程启动后，
    // 旧流程的回调与结果都必须丢弃，避免覆盖新流程
    const isCurrent = () => this._bindRun === run && !run.stopped
    try {
      // 先解析出 start 函数（可选依赖动态加载，可能抛"未安装"）
      const startFn = await this._resolveQrConnect()
      if (!isCurrent()) return
      const credentials = await new Promise((resolve, reject) => {
        const stop = startFn({
          onSuccess: (creds) => resolve(Array.isArray(creds) ? creds : []),
          onFailure: (err) => reject(err instanceof Error ? err : new Error(String(err))),
          onQrDisplayed: (url) => {
            if (!isCurrent()) return
            this.setLoginState({ phase: 'qr', qrPayload: url, qrKind: 'text' })
            run.resolveReady()
          },
          onQrExpired: () => {
            if (!isCurrent()) return
            this.logger?.info?.('[dsh-bridge qq] 绑定二维码已过期，正在刷新…')
          },
        }, {
          // 不往插件进程的控制台打二维码：二维码由设置面板渲染（终端渲染在 Web 场景是噪音）
          displayQrCodeToConsole: false,
          source: 'dsh-bridge',
        })
        run.stopFn = stop
      })
      if (!isCurrent()) return // 已被刷新流程取代：结果作废
      const first = Array.isArray(credentials) ? credentials[0] : null
      const appId = String(first?.appId ?? '').trim()
      const appSecret = String(first?.appSecret ?? '').trim()
      if (!appId || !appSecret) throw new Error('扫码绑定未返回完整凭据')
      this.gateway.setCredentials({ appId, appSecret })
      await this.persist({ appId, appSecret })
      this.logger?.info?.('[dsh-bridge qq] 扫码绑定成功：%s', appId)
      this.setLoginState({ phase: 'done', qrPayload: null, qrKind: null, error: null })
      await this.start()
    } catch (err) {
      if (!isCurrent()) return // 旧流程被取消：静默退出
      const message = err?.message ?? String(err)
      this.logger?.warn?.('[dsh-bridge qq] 扫码绑定失败：%s', message)
      this.setLoginState({ phase: 'error', qrPayload: null, qrKind: null, error: message })
    } finally {
      if (isCurrent()) this._bindRun = null
      run.resolveSettled()
    }
  }

  setLoginState(state) {
    this.loginState = {
      phase: 'idle', qrPayload: null, qrKind: null, error: null,
      ...state,
    }
  }

  /** 解绑：停止网关并清除凭证，下次重启不再自动重连。 */
  async unbind() {
    this.cancelBind()
    await this.gateway.stop()
    this.gateway.setCredentials({ appId: '', appSecret: '' })
    this.gateway.markUnbound()
    await this.persist({ appId: '', appSecret: '', allowFrom: [] })
    if (this.node) this.node.config.allowFrom = []
    this.setLoginState({ phase: 'idle', qrPayload: null, qrKind: null, error: null })
    this.logger?.info?.('[dsh-bridge qq] unbound: credentials cleared')
    return { success: true }
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
      { name: '/model', desc: '模型列表 / 切换模型', type: 'command' },
      { name: '/help', desc: '命令帮助', type: 'command' },
    ]

    // 指令面板：c2c（单聊）与 group（群聊）各建一个全局面板
    for (const scope of ['c2c', 'group']) {
      try {
        const list = await gate.apiCall('GET', `/v2/panels?scope=${encodeURIComponent(scope)}`)
        const exists = (list?.records || []).some((r) => r?.panel?.remark === remark)
        if (!exists) {
          const res = await gate.apiCall('POST', '/v2/panels', {
            scope,
            target_type: 'all',
            panel: { items, remark, version: 1 },
          })
          this.logger.info?.('[dsh-bridge qq] created %s command panel: %s', scope, res?.panel_id ?? '(no id)')
        }
      } catch (err) {
        this.logger.warn?.('[dsh-bridge qq] command panel setup for %s skipped: %s', scope, err?.message ?? err)
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
      const existing = await gate.apiCall('GET', '/v2/menu')
      const existingItems = existing?.menu?.items || []
      const same = existingItems.length === menuItems.length &&
        menuItems.every((item, i) => existingItems[i]?.name === item.name && existingItems[i]?.send_message === item.send_message)
      if (!same) {
        await gate.apiCall('PUT', '/v2/menu', { menu: { items: menuItems } })
        this.logger.info?.('[dsh-bridge qq] custom menu configured')
      } else {
        this.logger.info?.('[dsh-bridge qq] custom menu already configured')
      }
    } catch (err) {
      this.logger.warn?.('[dsh-bridge qq] custom menu setup skipped: %s', err?.message ?? err)
    }
  }

  /** 更新运行时配置并持久化。 */
  async setConfig({
    digestIntervalSec, approvalTimeoutSec, maxMessageChars, sendChunkDelayMs,
    groupAutoApprove, changesDigest, steerMode, streamReply,
    appId, appSecret, clientSecret, name, agentPreset, cwd, agentProvider, agentModel,
  } = {}) {
    if (digestIntervalSec != null)   this.node.config.digestIntervalSec   = Number(digestIntervalSec)
    if (approvalTimeoutSec != null)  this.node.config.approvalTimeoutSec  = Number(approvalTimeoutSec)
    if (maxMessageChars != null) {
      const val = Number(maxMessageChars)
      this.node.config.maxMessageChars = (val >= 200) ? val : 2000
    }
    if (sendChunkDelayMs != null)    this.node.config.sendChunkDelayMs    = Number(sendChunkDelayMs)
    if (groupAutoApprove != null)    this.node.config.groupAutoApprove    = groupAutoApprove === true
    if (changesDigest != null)       this.node.config.changesDigest       = changesDigest === true
    if (steerMode != null)           this.node.config.steerMode           = steerMode === true
    if (streamReply != null)         this.node.config.streamReply         = streamReply === true
    applySessionConfig(this.node.config, { agentPreset, cwd, agentProvider, agentModel })
    // issue #78：账号备注名（面板回显 + displayName 来源），随 setConfig 持久化
    if (name !== undefined) this.config.name = String(name).trim()

    // 密钥字段兼容两种命名（旧面板传 clientSecret，新面板传 appSecret）；
    // 空字符串表示 UI 未修改密钥，避免误覆盖已保存的 secret
    const secretInput = appSecret !== undefined ? appSecret : clientSecret
    const credentialsTouched = appId !== undefined || secretInput !== undefined
    if (credentialsTouched) {
      this.gateway.setCredentials({
        appId: appId !== undefined ? appId : this.gateway.config.appId,
        appSecret: secretInput?.trim() ? secretInput.trim() : this.gateway.config.appSecret,
      })
    }

    this.gateway.setCredentials({
      maxMessageChars: this.node.config.maxMessageChars,
    })

    const patch = {
      digestIntervalSec:  this.node.config.digestIntervalSec,
      approvalTimeoutSec: this.node.config.approvalTimeoutSec,
      maxMessageChars:    this.node.config.maxMessageChars,
      sendChunkDelayMs:   this.node.config.sendChunkDelayMs,
      groupAutoApprove:   this.node.config.groupAutoApprove === true,
      changesDigest:      this.node.config.changesDigest !== false,
      steerMode:          this.node.config.steerMode === true,
      streamReply:        this.node.config.streamReply !== false,
      ...readSessionConfig(this.node.config),
    }
    if (name !== undefined) patch.name = this.config.name ?? ''
    if (credentialsTouched) {
      patch.appId = this.gateway.config.appId
      patch.appSecret = this.gateway.config.appSecret
    }
    await this.persist(patch)

    // 凭证配置完成后自动启动网关（前端「保存并连接」无需二次点击）
    if (this.gateway.configured && credentialsTouched) {
      await this.gateway.start().catch((err) => {
        this.logger?.warn?.('[dsh-bridge qq] auto-start failed: %s', err?.message ?? err)
      })
    }
  }

}

// 指令面板 remark 标识，用于幂等判断（区分本插件创建的面板）
const PANEL_REMARK = 'dsh-bridge 常用命令'
