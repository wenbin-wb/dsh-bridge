// dsh-bridge 平台抽象基类
//
// 定义 IM 平台适配器的统一接口。每个平台（微信/QQ/飞书/Telegram…）继承本类，
// 实现协议层（登录、收发消息、typing）。平台无关的会话桥逻辑在 ConversationBridge
// （lib/platform/conversation-bridge.js）中实现，通过 platform 注入到 bridge。
//
// 生命周期：constructor → start() → stop() → dispose()
// 消息抽象：sendText / sendTyping / sendMedia（由子类实现）

export class Platform {
  /**
   * @param {object} opts
   * @param {object} opts.ctx          Cordis 上下文
   * @param {object} opts.logger       日志器
   * @param {object} [opts.config]     已持久化的平台配置（凭证等）
   * @param {(patch: object) => (void|Promise<void>)} [opts.onPersist]  主插件保存回调
   * @param {import('./conversation-bridge.js').ConversationBridge} [opts.bridge] 会话桥实例
   */
  constructor({ ctx, logger, config = {}, onPersist, bridge } = {}) {
    this.ctx = ctx
    this.logger = logger
    this.config = { ...config }
    this.onPersist = onPersist ?? (() => {})
    this.bridge = bridge ?? null

    // 平台标识（子类必须设置）
    this.id = ''
    this.name = ''

    // 连接状态与账号：子类可能用 getter 覆盖（如委托给 gateway），
    // 因此仅在未被子类覆盖时才初始化默认值。
    if (!('status' in this)) this.status = 'idle'
    if (!('accountId' in this)) this.accountId = null

    // 扫码/登录的流式状态（RPC 轮询读取）
    this.loginState = {
      phase: 'idle',   // idle | qr | scaned | confirmed | done | error
      qrPayload: null, // 待渲染内容：dataURL 图片 或 二维码文本
      qrKind: null,    // 'img' | 'text'
      error: null,
    }

    this.disposers = []
  }

  // ---- 平台能力声明（子类可覆盖）----

  get capabilities() {
    return {
      supportsGroup: false,   // 是否支持群聊
      supportsMedia: false,   // 是否支持媒体收发
      supportsVoice: false,   // 是否支持语音
      supportsTyping: false,  // 是否支持 typing 状态
      maxMessageChars: 2000,  // 单条消息最大字符数
    }
  }

  get configured() {
    return false
  }

  // ---- 生命周期（子类必须实现 start/stop；dispose 已提供默认实现）----

  async start() {
    throw new Error(`${this.id || 'platform'}: start() not implemented`)
  }

  async stop() {
    throw new Error(`${this.id || 'platform'}: stop() not implemented`)
  }

  dispose() {
    for (const disposer of this.disposers) {
      try { disposer() } catch { /* 忽略 */ }
    }
    this.disposers = []
    this.bridge?.dispose?.()
    this.bridge = null
  }

  // ---- 消息抽象（子类必须实现）----

  async sendText(peerId, text, opts = {}) {
    throw new Error(`${this.id || 'platform'}: sendText() not implemented`)
  }

  async sendTyping(peerId, state) {
    return Promise.resolve()
  }

  async sendMedia(peerId, media, opts = {}) {
    throw new Error(`${this.id || 'platform'}: sendMedia() not implemented`)
  }

  // ---- 登录（子类必须实现 login；getLoginState 已提供默认）----

  async login(opts = {}) {
    throw new Error(`${this.id || 'platform'}: login() not implemented`)
  }

  getLoginState() {
    return { ...this.loginState }
  }

  // ---- 状态汇总（供 RPC/UI 读取）----

  getStatus() {
    return {
      id: this.id,
      name: this.name,
      status: this.status,
      configured: this.configured,
      accountId: this.accountId,
      login: this.getLoginState(),
      peerId: this.bridge?.peerId ?? null,
      sessionId: this.bridge?.activeSessionId ?? null,
      config: this.getEditableConfig?.(),
    }
  }

  /** 可编辑配置（供 UI 设置面板读取）；子类可覆盖返回具体字段。 */
  getEditableConfig() {
    return {}
  }

  // ---- 工具 ----

  setStatus(status) {
    if (this.status === status) return
    this.status = status
    try {
      this.ctx.emit?.(`${this.id}/status`, status)
    } catch { /* emit 失败不致命 */ }
  }

  async persist(patch) {
    try {
      await this.onPersist(patch)
    } catch (err) {
      this.logger?.warn?.(`[dsh-bridge ${this.id}] persist failed: %s`, err?.message ?? err)
    }
  }

  dispose() {
    for (const d of this.disposers) {
      try { d() } catch {}
    }
    this.disposers = []
    this.bridge?.dispose?.()
    this.bridge = null
  }

  async destroy() {
    this.dispose()
  }
}
