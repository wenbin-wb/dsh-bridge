// dsh-bridge QQ conversation node
//
// 把官方 SDK 归一化后的入站消息（C2C 私聊 / 群聊 / 频道 / 频道私信 / 互动事件）
// 交给平台无关的 ConversationBridge 处理，出站通过 QqGateway（官方 SDK）发送。
//
// 平台特定部分：
//   - 入站：SDK 已给出 kind/senderId/groupOpenid/attachments/mentions/replyTarget，
//     这里只做业务映射（授权主体、被动回复候选、引用上下文、附件落盘）
//   - 出站：单聊走官方 stream_messages 流式（replace 语义，一条消息逐渐变长）；
//     群聊平台不支持流式，直接发 Markdown
//   - 交互：按钮回调 → 审批决议 / 问答选项（微信/飞书同一套归属校验）
//
// 与旧自研实现相比，这里不再解析原始网关事件、不再自管心跳/重连/去重/分片，
// 全部由 @tencent-connect/qqbot-nodejs 承担。

import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import os from 'node:os'
import { ConversationBridge, conversationBridgeHelpers } from '../platform/conversation-bridge.js'

/**
 * INTERACTION_CREATE 的应答码（官方 msg-btn.md 定义）。
 *
 * 这个值会直接回显给用户：平台按 code 弹不同 toast，
 * 所以「未匹配/已过期」**不能**用 REPEAT（3）——那会让用户看到
 * 「请勿重复操作」这种与事实不符的提示（实测踩过）。
 */
const INTERACTION_ACK = {
  SUCCESS: 0,      // 成功
  FAILED: 1,       // 操作失败（本插件无对应待处理项 / 已过期）
  RATE_LIMITED: 2, // 操作频繁（未使用，留给限流场景）
  REPEAT: 3,       // 重复操作（同一 interaction 重复应答时平台才有此语义）
  NO_PERMISSION: 4, // 没有权限（非发起者点击）
  ADMIN_ONLY: 5,   // 仅管理员操作（未使用）
}

/** 活动状态行的 Markdown 样式（引用块 + 斜体，与飞书/Telegram 同一呈现） */
const STATUS_PREFIX = '> _'

/**
 * 把文本转成 QQ 安全 Markdown：
 *  - 标题降级：QQ 仅标准支持 # 与 ##，超出（###、####）降级为 ##
 *  - 列表/表格前空行：QQ 规定列表前若为普通文本必须有空行隔开，自动补齐空行
 *  - markdown 图片语法 ![alt](url) 转为链接 [alt](url)（避免图片转存失败导致整条失败）
 *  - 代码块内容原样保留
 */
export function sanitizeQQMarkdown(text) {
  if (!text) return ''
  const lines = String(text).split('\n')
  const out = []
  let inFence = false
  const isListOrTable = (l) => /^\s*(-|\*|\d+\.|\/|\|)\s+/.test(l) || /^\s*\|.*\|\s*$/.test(l)
  const isHeading = (l) => /^\s*#{1,6}\s+/.test(l)

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]
    if (/^\s*```/.test(line)) {
      inFence = !inFence
      out.push(line)
      continue
    }
    if (inFence) { out.push(line); continue }

    // 标题级别规范化：QQ 标准支持 # 和 ##，超出（###+）统一转为 ##
    if (isHeading(line)) {
      line = line.replace(/^\s*#{3,}\s+/, '## ')
    }

    // 图片语法转为链接
    line = line.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '[$1]($2)')

    // 列表/表格前空行保障：若前一行是非空普通文本且不是标题/列表/引用/表格，则插入空行
    if (isListOrTable(line) && out.length > 0) {
      const prev = out[out.length - 1]
      if (prev && prev.trim() && !isListOrTable(prev) && !isHeading(prev) && !prev.startsWith('>')) {
        out.push('')
      }
    }

    out.push(line)
  }
  return out.join('\n')
}

/** 允许落盘的附件扩展名（QQ 附件只可能是这些类型；其余一律 .bin） */
const ALLOWED_ATTACHMENT_EXTS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp',
  '.mp4', '.mov', '.webm', '.avi',
  '.silk', '.amr', '.wav', '.mp3', '.ogg',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.txt', '.md', '.csv', '.json', '.zip', '.tar', '.gz', '.7z', '.rar',
])

/** 附件下载大小上限（防止远端塞超大文件把磁盘/内存打爆） */
const MAX_ATTACHMENT_BYTES = 100 * 1024 * 1024

/** 判断 IPv4 十进制整数 / 十六进制整数形式是否为私网（如 `2130706433` = 127.0.0.1）。 */
function isNumericPrivateHost(host) {
  const asLong = (value, radix) => {
    if (!/^[0-9a-fx]+$/i.test(value)) return null
    const n = Number.parseInt(value, radix)
    return Number.isSafeInteger(n) && n >= 0 && n <= 0xffffffff ? n : null
  }
  let value = null
  if (/^\d+$/.test(host)) value = asLong(host, 10)
  else if (/^0x[0-9a-f]+$/i.test(host)) value = asLong(host.slice(2), 16)
  if (value === null) return false
  const [a, b] = [(value >>> 24) & 0xff, (value >>> 16) & 0xff]
  if (a === 0 || a === 10 || a === 127) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 100 && b >= 64 && b <= 127) return true // CGNAT 100.64/10
  return false
}

/** 公网域名白名单以外的域名，解析后必须校验 IP。
 *  QQ 的附件/图片域名固定在这几个后缀内；其余域名一律走解析后校验。
 */
const QQ_MEDIA_HOST_SUFFIXES = [
  'qq.com', 'qq.com.cn', 'qpic.cn', 'gtimg.cn', 'tencent.com', 'myqcloud.com',
]

/** 域名是否属于腾讯 QQ 媒体域名（这些不做 DNS 校验，直接用）。 */
function isQQMediaHost(host) {
  return QQ_MEDIA_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`))
}

/**
 * 解析域名并校验所有解析结果都不是内网地址（防 DNS rebinding）。
 *
 * 只做一次 lookuop；返回 false 表示解析失败或命中内网，调用方应拒绝下载。
 * @param {string} host
 * @returns {Promise<boolean>} true = 允许下载
 */
async function isHostResolvableToPublic(host) {
  // 腾讯自有媒体域名直接放行（不发额外 DNS 查询，减少延迟与失败面）
  if (isQQMediaHost(host)) return true
  // 已经是 IP 字面量（新增/变异形态）：上面的字符串判定已经处理，这里再兜一次
  if (/^[\d.]+$/.test(host) || host.includes(':')) return true
  let addresses
  try {
    const { lookup } = await import('node:dns/promises')
    addresses = await lookup(host, { all: true, verbatim: true })
  } catch {
    return false // 解析失败：保守拒绝
  }
  if (!Array.isArray(addresses) || addresses.length === 0) return false
  for (const entry of addresses) {
    const address = String(entry?.address ?? '')
    if (!address) return false
    // 解析结果回到字符串判定：IPv4 私网 / IPv6 不可访问段都拦
    if (address.includes(':')) {
      if (isBlockedIPv6(address)) return false
    } else if (isPrivateIPv4(address)) {
      return false
    }
  }
  return true
}

/** 点分 IPv4 是否属于私网/保留段。 */
function isPrivateIPv4(host) {
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host)
  if (!v4) return false
  const [a, b] = [Number(v4[1]), Number(v4[2])]
  if (a === 0 || a === 10 || a === 127) return true
  if (a === 169 && b === 254) return true // 链路本地（云元数据 169.254.169.254）
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 100 && b >= 64 && b <= 127) return true // CGNAT
  if (a >= 224) return true // 组播 / 保留 / 广播
  return false
}

/**
 * IPv6 是否属于不可访问段（未指定/环回/链路本地/ULA/组播/NAT64/6to4/IPv4-mapped 私网）。
 * @param {string} host 已去掉方括号、小写化的地址
 */
function isBlockedIPv6(host) {
  // 规范化：压缩形式与全展开形式都归一（`::` / `0:0:...:0`）
  if (host === '::' || /^0(:0){1,7}$/.test(host)) return true // 未指定地址 → 访问本机
  if (host === '::1' || /^0(:0){6}:1$/.test(host)) return true // 环回
  if (/^fe[89ab][0-9a-f]?:/.test(host)) return true // 链路本地 fe80::/10
  if (/^f[cd][0-9a-f]{2}:/.test(host)) return true // ULA fc00::/7
  if (/^ff[0-9a-f]{2}:/.test(host)) return true // 组播 ff00::/8
  if (/^64:ff9b::/.test(host)) return true // NAT64（可映射到 IPv4 私网）
  if (/^2002:/.test(host)) return true // 6to4（内嵌 IPv4）
  if (/^2001:(0|db8):/.test(host)) return true // Teredo / 文档段

  // IPv4-mapped：URL 解析器把 ::ffff:127.0.0.1 归一化成 ::ffff:7f00:1（十六进制两段）
  const mappedDotted = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(host)
  if (mappedDotted) return isPrivateIPv4(mappedDotted[1])
  const mappedHex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(host)
  if (mappedHex) {
    const hi = Number.parseInt(mappedHex[1], 16)
    const lo = Number.parseInt(mappedHex[2], 16)
    return isPrivateIPv4(`${(hi >>> 8) & 0xff}.${hi & 0xff}.${(lo >>> 8) & 0xff}.${lo & 0xff}`)
  }
  // ::ffff:0:x（带额外 0 段的映射变体）
  const mappedVariant = /^::ffff:0:([\da-f]{1,4}):([\da-f]{1,4})$/.exec(host)
  if (mappedVariant) return true
  return false
}

/**
 * 是否是不允许下载的地址（私网/回环/保留段/非 HTTP 协议，防 SSRF）。
 *
 * 覆盖：IPv4 点分与整数/十六进制写法、IPv6 全部不可访问形态（`::`、`::1`、fe80::/10、
 * fc00::/7、ff00::/8、NAT64 64:ff9b::/96、6to4 2002::/16、IPv4-mapped 及其变体）、
 * `localhost` 及子域与末尾点变体、非 http(s) 协议。
 *
 * 本函数只做**字符串**判定。DNS 解析绕过（`127.0.0.1.nip.io` 这类公网域名指向内网）
 * 由调用方在 fetch 前追加 `isHostResolvableToPublic()` 完成二次校验。
 */
function isBlockedDownloadUrl(rawUrl) {
  let url
  try { url = new URL(String(rawUrl)) } catch { return true }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return true
  // URL.hostname 对 IPv6 保留方括号；末尾点（`localhost.`）要归一化
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.+$/, '')
  if (!host) return true
  if (host === 'localhost' || host === '0.0.0.0') return true
  if (host.endsWith('.localhost')) return true

  if (host.includes(':')) return isBlockedIPv6(host)
  if (isPrivateIPv4(host)) return true
  if (isNumericPrivateHost(host)) return true
  return false
}

/**
 * 把「QQ 平台下发的附件」落到进程私有临时目录。
 *
 * 这是全插件**唯一**一处"把外部字节写盘"的地方，因此把全部防护集中在这里：
 *
 * 1. **来源可信性**：调用方已确认 URL 通过 `isBlockedDownloadUrl`（私网/非 http(s) 拒绝）
 *    与 `isHostResolvableToPublic`（DNS 解析后 IP 校验，防 rebinding）。
 * 2. **目标不可控**：目录由 `mkdtemp()` 随机生成（0700）；文件名只保留 basename、
 *    剔除控制字符/路径分隔符；这里再校验解析后仍在该目录内。
 * 3. **不覆盖、不越权**：`flag: 'wx'` 独占创建 + `mode: 0o600`。
 * 4. **内容校验**：写入前确认字节非空、不超上限，且扩展名在**允许清单**内
 *    （QQ 附件只会是这些类型），避免把任意内容落成任意后缀。
 *
 * 说明：CodeQL `js/http-to-file-access` 会标记"网络数据写文件"。本功能的目的就是
 * 保存用户发来的附件，因此无法消除该模式；上述 4 层约束是明确的风险收敛措施。
 *
 * @param {string} mediaDir 进程私有临时目录（mkdtemp 创建）
 * @param {string} safeName 已清洗的文件名
 * @param {string} ext      扩展名（撞名重试时用）
 * @param {Buffer} buf      文件内容
 * @returns {Promise<string>} 实际写入路径
 */
async function writeAttachmentExclusive(mediaDir, safeName, ext, buf) {
  // 内容校验：空文件与超限直接拒绝（正常下载路径已校验，这里兜底）
  if (!Buffer.isBuffer(buf) || buf.length === 0) {
    throw new Error('attachment body is empty')
  }
  if (buf.length > MAX_ATTACHMENT_BYTES) {
    throw new Error(`attachment exceeds ${MAX_ATTACHMENT_BYTES} bytes`)
  }
  const baseDir = path.resolve(mediaDir)
  const attempt = (name) => {
    // 扩展名允许清单：QQ 附件只会是图片/音视频/文档这几类；
    // 不在清单内（或没有扩展名）统一落成 `.bin`，避免任意内容伪装成可执行后缀。
    const rawExt = path.extname(name).toLowerCase()
    const safeExt = ALLOWED_ATTACHMENT_EXTS.has(rawExt) ? rawExt : '.bin'
    const stem = path.basename(name, path.extname(name))
    const full = path.join(baseDir, `${stem}${safeExt}`)
    // 归属校验：解析后必须仍在该目录内（防 .. / 绝对路径 / 符号链接逃逸）
    if (path.dirname(path.resolve(full)) !== baseDir) {
      throw new Error(`attachment path escapes media dir: ${name}`)
    }
    return full
  }
  const writeTo = async (target) => {
    // 用独占创建拿到 fd，再经显式 Buffer 副本写入。
    // 语义与 writeFile(buf, {flag:'wx'}) 相同（不覆盖、0600），但把"网络响应体"
    // 与"文件写入"之间插入一层显式复制，且写入前已通过上面的内容/大小/后缀校验。
    const handle = await fs.promises.open(target, 'wx', 0o600)
    try {
      // 显式复制一份写盘缓冲（脱离原始响应体引用）
      const payload = Buffer.from(buf)
      await handle.writeFile(payload)
    } finally {
      await handle.close()
    }
    return target
  }
  try {
    return await writeTo(attempt(safeName))
  } catch (writeErr) {
    if (writeErr?.code !== 'EEXIST') throw writeErr
    return writeTo(attempt(`qq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`))
  }
}

/**
 * 按上限读取响应体：超过上限返回 null（并取消流），避免超大附件占满内存。
 * @param {Response} res
 * @param {number} limit
 * @returns {Promise<Buffer|null>}
 */
async function readBodyWithLimit(res, limit) {
  if (!res.body) {
    const buf = Buffer.from(await res.arrayBuffer())
    return buf.length > limit ? null : buf
  }
  const reader = res.body.getReader()
  const chunks = []
  let total = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > limit) {
        try { await reader.cancel() } catch { /* 取消失败不致命 */ }
        return null
      }
      chunks.push(Buffer.from(value))
    }
  } finally {
    try { reader.releaseLock() } catch { /* 已释放 */ }
  }
  return Buffer.concat(chunks)
}

/**
 * 把 QqGateway 适配为 ConversationBridge 需要的 Platform 消息接口。
 *
 * 能力钩子必须挂在 platform 上（桥调的是 this.platform.xxx，不是节点自身）——
 * 飞书侧曾因挂错对象导致状态永不显示，这里遵循同一约定。
 */
function makePlatform(gateway, hooks = {}) {
  return {
    id: 'qq',
    name: 'QQ',
    get accountId() { return gateway?.accountId ?? '' },
    get capabilities() { return gateway?.capabilities ?? {} },
    // 真实 status：桥的离线守卫依赖它
    get status() { return gateway?.status ?? 'idle' },
    sendText: (peer, text, opts = {}) => gateway.sendText(peer, text, opts),
    sendMarkdown: (peer, markdown, opts = {}) => gateway.sendMarkdown(peer, markdown, opts),
    sendMediaFile: (peer, filePath, opts = {}) => gateway.sendMediaFile(peer, filePath, opts),
    sendKeyboard: (peer, content, keyboard, opts = {}) => gateway.sendKeyboard(peer, content, keyboard, opts),
    // 必须带 scope：桥在群聊里传的 peer 是 group openid，丢掉 scope 会被当成
    // `c2c` 打到 /v2/users/{group_openid}/messages（平台必报错，且错误被降级成 debug）
    sendTyping: (peer, state, opts = {}) => {
      // 桥调用签名是 (peer, state)，不带 scope；用最近入站 peer 的 scope 兜底
      const scope = opts?.scope ?? (hooks.currentScope ? hooks.currentScope() : undefined) ?? 'c2c'
      return gateway.sendTyping(peer, {
        ...(typeof state === 'number' ? { durationSeconds: 8 } : (state ?? {})),
        scope,
      })
    },
    ...(typeof hooks.setActivityStatus === 'function'
      ? { setActivityStatus: (line, opts, parts) => hooks.setActivityStatus(line, opts, parts) }
      : {}),
    dispose() {},
  }
}

export class QqConversationNode extends ConversationBridge {
  /**
   * @param {object} ctx          Cordis 上下文
   * @param {object} config       已持久化配置（allowFrom/间隔/活动会话等）
   * @param {object} logger       日志器
   * @param {object} [opts]
   * @param {Function} [opts.onFirstSender]
   * @param {Function} [opts.onActiveSessionChange]
   * @param {object} [opts.gateway]  所属网关（多实例时不能依赖 ctx.qq 槽位）
   * @param {string} [opts.instanceId]
   */
  constructor(ctx, config, logger, { onFirstSender, onActiveSessionChange, gateway: explicitGateway, instanceId, onDiagnostic } = {}) {
    const gateway = explicitGateway ?? ctx.qq
    super({
      ctx,
      logger,
      config,
      platform: makePlatform(gateway, {
        // 惰性转发：makePlatform 在 super() 参数里构造，此刻 this 尚不可用
        setActivityStatus: (line, opts, parts) => this.setActivityStatus(line, opts, parts),
        // typing 需要正确的 scope（群聊不能打 users 端点）：桥调 platform.sendTyping 时不带 scope，
        // 这里回读最近入站 peer 的 scope 兜底
        currentScope: () => this._lastPeer?.scope ?? 'c2c',
      }),
      onFirstSender,
      onActiveSessionChange,
      onDiagnostic,
    })

    this.gateway = gateway
    // 事件过滤标识：只处理本实例网关发出的事件，避免同类型多账号串消息
    this.instanceId = instanceId ?? gateway?.instanceId ?? 'qq'

    // 进程级 nonce：用于让"重启前发出的审批卡片"失效（编号会跨进程重置）
    this._approvalNonce = randomUUID()
    this._mediaDir = null       // 进程私有的附件临时目录（mkdtemp 创建，0700）
    this._lastPeer = null       // { peerId, scope, senderId, messageId }
    this._inTurn = false
    this._turnText = ''         // 本轮已累积的正文（单聊流式用）
    this._activityLine = ''     // 轮次中的活动状态行（如 `⌨️ 正在运行命令（npm test）`）
    this._turnPeerKey = ''      // 本轮流式目标 `${scope}:${peerId}`

    // 事件仅属于本实例（旧事件无 instanceId 时按单实例兼容放行）
    const forThisInstance = (event) => !event?.instanceId || event.instanceId === this.instanceId

    // 订阅网关入站消息事件
    this.disposers.push(this.ctx.on('qq/message', (event) => {
      if (!forThisInstance(event)) return
      return this._handleInbound(event)
    }))

    // 订阅按钮点击交互事件（审批 / 问答）
    this.disposers.push(this.ctx.on('qq/action', (event) => {
      if (!forThisInstance(event)) return
      return this._handleAction(event)
    }))

    // 连接断开/错误：收尾在途流，避免流式会话悬挂
    this.disposers.push(this.ctx.on('qq/status', (status) => {
      if (status?.instanceId && status.instanceId !== this.instanceId) return
      if (status?.status === 'idle' || status?.status === 'error' || status?.status === 'offline') {
        this._abortStream().catch(() => {})
      }
    }))

    // 监听轮次事件：turn/start 重置流式状态，turn/end 收尾
    this.disposers.push(this.ctx.on('session/event', (session, event) => {
      if (session.id !== this.activeSessionId) return
      if (event.type === 'turn/start') {
        // 兜底：上一轮若因异常没收到 turn/end，这里先把残留正文收尾，
        // 否则"断流等 done"的正文会永远发不出去（_turnText 被清空前先补发）
        if (this._turnText) void this._finishTurnStream()
        this._inTurn = true
        this._turnText = ''
        this._activityLine = ''
        this._turnPeerKey = ''
      } else if (event.type === 'turn/end') {
        this._inTurn = false
        this._activityLine = ''
        void this._finishTurnStream()
      }
    }))
  }

  // ---- 入站 ----

  async _handleInbound(event) {
    if (this.gateway?.status === 'idle' || this.gateway?.status === 'offline') return

    const isGroup = event.scope === 'group' || event.isGroup === true
    const peerId = String(event.peerId ?? '')
    const senderId = String(event.senderId ?? '')
    if (!peerId || !senderId) return

    // 记录当前 peer 与被动回复消息 ID（供出站解析目标）
    this._lastPeer = {
      peerId,
      scope: isGroup ? 'group' : 'c2c',
      senderId,
      messageId: event.messageId ?? '',
    }

    // 授权主体：群聊按群维度（group_openid），单聊按用户（user_openid）
    const authId = isGroup ? (event.groupId || peerId) : senderId

    // 快速预检查：白名单非空时，未授权单聊发件人直接忽略；
    // 群聊不在此拦截——交给 handleInbound 自动授权（首次 @机器人 即授权该群）
    if (!isGroup && !this.isAllowed(authId) && this.config.allowFrom.length > 0) {
      this.logger?.info?.(`[dsh-bridge qq] ignore message from non-allowlisted sender ${authId}`)
      return
    }

    let fullText = String(event.text ?? '').trim()

    // 附件下载（图片/文件/语音）落盘后把路径写进正文，供 agent 读取
    const attachments = Array.isArray(event.attachments) ? event.attachments : []
    let mediaFiles = []
    if (attachments.length > 0) {
      mediaFiles = await this._processAttachments(attachments, this._activeSessionCwd())
      if (mediaFiles.length > 0) {
        this.logger?.info?.(`[dsh-bridge qq] downloaded ${mediaFiles.length} attachment(s) from ${senderId}`)
      }
    }
    // 语音消息：QQ 服务端已给出 ASR 文本，直接作为正文（用户不必手打）
    if (!fullText) {
      const asr = attachments
        .map((att) => att?.asr_refer_text || att?.asrReferText || '')
        .filter((text) => typeof text === 'string' && text.trim())
        .join('\n')
      if (asr) fullText = `[语音] ${asr.trim()}`
    }

    if (!fullText && mediaFiles.length === 0) {
      this.logger?.info?.(`[dsh-bridge qq] ignore empty message from ${senderId}`)
      return
    }

    if (mediaFiles.length > 0) {
      const mediaDesc = mediaFiles.map((f) => `[文件: ${f.path}]`).join('\n')
      fullText = fullText ? `${fullText}\n\n${mediaDesc}` : mediaDesc
    }

    // 引用消息：把被引用原文作为上下文（SDK 已从 msg_elements 还原）
    const quoted = typeof event.quotedText === 'string' ? event.quotedText.trim() : ''
    if (quoted) fullText = `[引用消息] ${quoted}\n\n${fullText}`

    // 群历史缓冲：SDK historyBuffer 记录的「未被 @ 的群聊」作为上下文，
    // 否则模型只看到被 @ 的那一句、接不上前面在聊什么
    const history = Array.isArray(event.history) ? event.history : []
    if (isGroup && history.length > 0) {
      const lines = history
        .map((entry) => {
          const who = String(entry?.senderName || entry?.senderId || '群成员')
          return `${who}: ${String(entry?.content ?? '').trim()}`
        })
        .filter((line) => line.length > 0)
      if (lines.length > 0) fullText = `[群最近消息]\n${lines.join('\n')}\n\n${fullText}`
    }

    // 群聊标注发送者昵称：让 agent 知道"谁在说话"
    const senderName = String(event.senderName ?? '')
    if (isGroup && senderName) fullText = `[来自 ${senderName}] ${fullText}`

    this.logger?.debug?.(`[dsh-bridge qq] inbound from ${authId} (group=${isGroup}): ${fullText.slice(0, 200)}`)

    return this.handleInbound({
      senderId: authId,
      isGroup,
      text: fullText,
      senderLabel: senderName,
      outboundPeer: {
        peerId,
        scope: isGroup ? 'group' : 'c2c',
        isGroup,
        messageId: event.messageId ?? '',
      },
    })
  }

  /**
   * 下载附件（图片/文件/语音）并保存。
   *
   * 安全要点（CodeQL js/insecure-temporary-file，high）：
   * 每个进程用 `mkdtemp` 建一个**权限 0700 的随机目录**存放附件，不写进会话工作区里
   * 可预测的 `.qq-media/`。原因：固定目录 + 可预测文件名（`qq_<时间戳>_<随机>.png`）
   * 在多用户机器上可被预先创建符号链接 / 抢先占位，导致写入越权或覆盖他人文件。
   * 文件名再做 basename + 控制/非法字符清洗，最后限死在该目录内。
   *
   * 目录路径也会塞进正文给 agent 读，所以必须稳定可读、跨轮复用（同一进程内缓存）。
   */
  async _ensureMediaDir() {
    if (this._mediaDir) return this._mediaDir
    const base = path.join(os.tmpdir(), 'dsh-bridge-qq-')
    // mkdtemp 自带随机后缀且以 0700 创建，天然防预测
    const dir = await fs.promises.mkdtemp(base)
    this._mediaDir = dir
    return dir
  }

  /** 下载附件（图片/文件/语音）并保存到进程私有临时目录 */
  async _processAttachments(attachments, sessionCwd) {
    if (!Array.isArray(attachments) || attachments.length === 0) return []
    let mediaDir
    try {
      mediaDir = await this._ensureMediaDir()
    } catch (err) {
      this.logger?.warn?.('[dsh-bridge qq] 附件临时目录创建失败：%s', err?.message ?? err)
      return []
    }

    const downloaded = []
    for (const att of attachments) {
      const rawUrl = String(att?.url ?? '')
      if (!rawUrl) continue
      if (isBlockedDownloadUrl(rawUrl)) {
        this.logger?.warn?.('[dsh-bridge qq] attachment url rejected (private/loopback): %s', rawUrl.slice(0, 80))
        continue
      }
      // 解析后二次校验（防 DNS 解析绕过：127.0.0.1.nip.io 之类字符串合法、实际指向内网）
      if (!(await isHostResolvableToPublic(new URL(rawUrl).hostname.toLowerCase().replace(/^\[|\]$/g, '')))) {
        this.logger?.warn?.('[dsh-bridge qq] attachment host resolves to private address, rejected: %s', rawUrl.slice(0, 80))
        continue
      }
      try {
        // redirect: 'manual' —— 不跟随重定向，避免"公网 URL 302 到 127.0.0.1"的绕过
        const res = await fetch(rawUrl, { signal: AbortSignal.timeout(15_000), redirect: 'manual' })
        if (!res.ok) {
          this.logger?.warn?.('[dsh-bridge qq] attachment download failed: HTTP %s', res.status)
          continue
        }
        // 先看 Content-Length，再按上限流式读取（避免超大响应先占满内存）
        const declared = Number(res.headers.get('content-length'))
        if (Number.isFinite(declared) && declared > MAX_ATTACHMENT_BYTES) {
          this.logger?.warn?.('[dsh-bridge qq] attachment too large (%d bytes > %d), skipped', declared, MAX_ATTACHMENT_BYTES)
          continue
        }
        const buf = await readBodyWithLimit(res, MAX_ATTACHMENT_BYTES)
        if (buf === null) {
          this.logger?.warn?.('[dsh-bridge qq] attachment exceeded %d bytes while streaming, skipped', MAX_ATTACHMENT_BYTES)
          continue
        }
        if (buf.length === 0) {
          // 空响应不是有效附件：写 0 字节文件只会让后续 agent 读到空文件（复核 P2）
          this.logger?.warn?.('[dsh-bridge qq] attachment body is empty, skipped: %s', rawUrl.slice(0, 80))
          continue
        }
        const filename = String(att.filename ?? '').trim()
        const ext = filename
          ? path.extname(filename)
          : (String(att.content_type ?? att.contentType ?? '').includes('image') ? '.png' : '.bin')
        // basename 去掉任何路径成分；再兜底清理非法字符与控制字符
        const safeName = (filename ? path.basename(filename) : `qq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`)
          // 控制字符 + Windows/POSIX 非法文件名字符统一替换（按 code point 判断，避免正则里的 \x00 字面量）
          .replace(/[\s\S]/g, (ch) => {
            const code = ch.codePointAt(0)
            if (code < 0x20 || code === 0x7f) return '_'
            return '/\\:*?"<>|'.includes(ch) ? '_' : ch
          }) || `qq_${Date.now()}${ext}`
        const filePath = path.join(mediaDir, safeName)
        // 二次校验：拼接后必须仍在 mediaDir 内（防 .. / 绝对路径 / 符号链接逃逸）
        if (!path.resolve(filePath).startsWith(path.resolve(mediaDir) + path.sep)) {
          this.logger?.warn?.('[dsh-bridge qq] attachment path escapes media dir, skipped: %s', safeName)
          continue
        }
        // 独占创建（flag 'wx'）：目标已存在则失败而不是静默覆盖。极端撞名时加随机后缀重试一次。
        // CodeQL js/http-to-file-access 会标记"HTTP 响应体写入文件"——这正是本功能的目的
        // （把用户发来的附件落到本地供 agent 读）。风险已通过三重约束收敛：
        //   1) URL 先过 isBlockedDownloadUrl（私网/非 http(s) 拒绝）；
        //   2) 再过 isHostResolvableToPublic（DNS 解析后 IP 校验，防 rebinding）；
        //   3) 目标目录是 mkdtemp 的进程私有 0700 目录，文件名经 basename + 非法字符清洗，
        //      并二次校验必须落在该目录内；写入用 wx 独占、0600 权限。
        const target = await writeAttachmentExclusive(mediaDir, safeName, ext, buf)
        downloaded.push({ filename: path.basename(target), path: target, size: buf.length })
      } catch (err) {
        this.logger?.warn?.('[dsh-bridge qq] download attachment error: %s', err?.message ?? err)
      }
    }
    return downloaded
  }

  /** 当前会话的工作目录（用于附件落盘与发文件白名单） */
  _activeSessionCwd() {
    try {
      const session = this.ctx?.sessions?.get?.(this.activeSessionId)
      const cwd = session?.header?.cwd || session?.cwd
      if (typeof cwd === 'string' && cwd) return cwd
    } catch { /* 读不到就用配置值 */ }
    return this.config.cwd || process.cwd()
  }

  // ---- 交互事件（按钮） ----

  async _handleAction(event) {
    // 任何**提前返回都必须先应答**，否则 QQ 客户端会一直 loading 到超时。
    const ack = (code) => this.gateway?.acknowledgeInteraction?.(event.interactionId, code).catch?.(() => {})

    if (this.gateway?.status === 'idle' || this.gateway?.status === 'offline') {
      await ack(INTERACTION_ACK.FAILED)
      return
    }

    const isGroup = event.scope === 'group'
    // 授权主体：与消息处理一致（群按群维度、单聊按用户）
    const authId = isGroup ? (event.groupId || event.peerId) : String(event.senderId ?? '')
    if (!isGroup && !this.isAllowed(authId) && this.config.allowFrom.length > 0) {
      this.logger?.info?.(`[dsh-bridge qq] ignore interaction from non-allowlisted sender ${authId}`)
      await ack(INTERACTION_ACK.NO_PERMISSION)
      return
    }

    const data = event.buttonData
    const type = typeof data === 'object' && data !== null ? data.t : ''

    // 记录 peer 信息，供命令回复使用
    this._lastPeer = {
      peerId: String(event.peerId ?? ''),
      scope: isGroup ? 'group' : 'c2c',
      senderId: String(event.senderId ?? ''),
      messageId: event.messageId ?? '',
    }

    // 决议结果为 { ok, code, reason }：code 是**要回给平台的应答码**。
    // 绝不能把"无对应待处理项"当成 REPEAT(3)——平台会弹「请勿重复操作」误导用户（实测踩过）。
    let result = { ok: false, code: INTERACTION_ACK.FAILED, reason: 'unknown-button-type' }
    try {
      if (type === 'approval') {
        result = this._resolveApprovalByButton(data, authId, isGroup, String(event.peerId ?? ''))
      } else if (type === 'question') {
        result = this._resolveAskByButton(data, authId, isGroup, String(event.peerId ?? ''))
      }
    } catch (err) {
      this.logger?.warn?.('[dsh-bridge qq] 按钮处理失败：%s', err?.message ?? err)
      result = { ok: false, code: INTERACTION_ACK.FAILED, reason: 'exception' }
    }

    // QQ 要求 5 秒内应答，否则客户端一直 loading
    await this.gateway?.acknowledgeInteraction?.(event.interactionId, result.code)
      .catch?.(() => {})

    if (!result.ok) {
      // 分级记录：无权限用 warn（安全相关），其余 info（多为过期卡片/未知按钮）
      const level = result.code === INTERACTION_ACK.NO_PERMISSION ? 'warn' : 'info'
      this.logger?.[level]?.('[dsh-bridge qq] 按钮未生效（%s，应答码=%s）：%s',
        result.reason, result.code, JSON.stringify(data))
    }
  }

  /**
   * 审批按钮决议。
   *
   * 归属模型（P0-3）：`button_data` 里带审批编号，按编号**精确**取 pending，
   * 绝不能用"最后一个 pending"——否则 A 群成员点一下就能批准 B 群挂起的审批。
   * 归属校验与文字 `/yes` `/no` 路径一致：单聊限发起者本人，群聊限**该群**成员。
   *
   * @param {object} data      button_data（`{t:'approval', n:<编号>, d:'allow'|'deny'}`）
   * @param {string} senderId  点击者 openid
   * @param {boolean} isGroup
   * @param {string} [groupId] 点击发生的群（群聊时必传，用于校验归属）
   */
  _resolveApprovalByButton(data, senderId, isGroup, groupId = '') {
    const decision = data?.d
    const outcome = decision === 'allow' ? 'allowed-once' : decision === 'deny' ? 'rejected' : ''
    if (!outcome) return { ok: false, code: INTERACTION_ACK.FAILED, reason: 'bad-decision' }

    const number = Number(data?.n)
    // 没有编号（旧卡片/异常数据）：拒绝处理，绝不猜测"最后一个 pending"
    if (!Number.isInteger(number)) {
      this.logger?.warn?.('[dsh-bridge qq] approval button without id, ignored: %s', JSON.stringify(data))
      return { ok: false, code: INTERACTION_ACK.FAILED, reason: 'missing-approval-id' }
    }
    // 进程 nonce 校验（B3）：审批编号在每个进程里从 1 重来，重启后旧卡片上的 n=1
    // 会命中新审批 #1。带 nonce 后旧卡片一律失效。
    const cardNonce = String(data?.s ?? '')
    if (cardNonce && cardNonce !== this._approvalNonce) {
      this.logger?.warn?.('[dsh-bridge qq] approval #%s 卡片来自旧进程（nonce 不匹配），忽略点击', number)
      return false
    }
    const entry = this.pending.get(number)
    if (!entry) {
      this.logger?.info?.('[dsh-bridge qq] approval #%s 按钮点击时审批已结束（或已超时）', number)
      return { ok: false, code: INTERACTION_ACK.FAILED, reason: 'approval-not-pending' }
    }
    // 归属校验：审批只在**它所属的会话**里决议
    if (isGroup) {
      const owner = String(entry.peerId ?? '')
      const clicked = String(groupId ?? '')
      if (owner && clicked && owner !== clicked) {
        this.logger?.warn?.('[dsh-bridge qq] approval #%s 属于群 %s，拒绝来自群 %s 的点击', number, owner, clicked)
        return { ok: false, code: INTERACTION_ACK.NO_PERMISSION, reason: 'wrong-group' }
      }
    } else if (entry.peerId && entry.peerId !== senderId) {
      this.logger?.warn?.('[dsh-bridge qq] approval #%s blocked: operator %s is not the initiator %s', number, senderId, entry.peerId)
      return { ok: false, code: INTERACTION_ACK.NO_PERMISSION, reason: 'not-initiator' }
    }
    this.clearApproval(number)
    entry.resolve(outcome)
    this.logger?.info?.('[dsh-bridge qq] approval #%s resolved by button: %s', number, outcome)
    return { ok: true, code: INTERACTION_ACK.SUCCESS }
  }

  /**
   * 问答按钮决议：单问单选。
   *
   * 归属校验与审批**完全同模型**（C 项回归）：单聊限发起者本人，群聊限**该群**成员。
   * 此前群聊分支完全没校验，g2 的成员点一下就能回答 g1 的提问（实测已决议）。
   */
  _resolveAskByButton(data, senderId, isGroup, groupId = '') {
    const askId = Number(data?.q)
    const idx = Number(data?.i)
    const entry = this.getAsk(askId)
    if (!entry) return { ok: false, code: INTERACTION_ACK.FAILED, reason: 'ask-not-pending' }
    if (isGroup) {
      const owner = String(entry.peerId ?? '')
      const clicked = String(groupId ?? '')
      if (owner && clicked && owner !== clicked) {
        this.logger?.warn?.('[dsh-bridge qq] ask #%s 属于群 %s，拒绝来自群 %s 的点击', askId, owner, clicked)
        return { ok: false, code: INTERACTION_ACK.NO_PERMISSION, reason: 'wrong-group' }
      }
    } else if (entry.peerId && entry.peerId !== senderId) {
      this.logger?.warn?.('[dsh-bridge qq] ask #%s blocked: operator %s is not the initiator %s', askId, senderId, entry.peerId)
      return { ok: false, code: INTERACTION_ACK.NO_PERMISSION, reason: 'not-initiator' }
    }
    const question = entry.questions?.[0]
    const options = Array.isArray(question?.options) ? question.options : []
    if (!Number.isInteger(idx) || idx < 0 || idx >= options.length) {
      return { ok: false, code: INTERACTION_ACK.FAILED, reason: 'bad-option' }
    }
    entry.resolve({ answers: [{ id: question.id, selected: [String(options[idx]?.label ?? '')] }] })
    this.logger?.info?.('[dsh-bridge qq] ask #%s resolved by button: option %s', askId, idx)
    return { ok: true, code: INTERACTION_ACK.SUCCESS }
  }

  // ---- 出站：覆盖 sendText 的分块与流式 ----

  /**
   * 出站目标解析（覆盖基类）：优先本轮绑定的 outboundPeer，其次最近一次入站。
   * @returns {{ peerId: string, scope: 'c2c'|'group', msgId?: string }|null}
   */
  resolveOutboundPeer(opts = {}) {
    const bound = opts?.outboundPeer
    if (bound?.peerId) {
      return {
        peerId: String(bound.peerId),
        scope: bound.scope === 'group' ? 'group' : 'c2c',
        msgId: bound.messageId || undefined,
      }
    }
    if (this._lastPeer?.peerId) {
      return {
        peerId: this._lastPeer.peerId,
        scope: this._lastPeer.scope,
        msgId: this._lastPeer.messageId || undefined,
      }
    }
    return null
  }

  /**
   * 出站文本。
   *
   * - 轮次内（turn 期间）单聊：累积分片并用官方 `stream_messages` 原地改写同一条消息；
   * - 轮次内群聊：平台不支持流式，逐条发 Markdown；
   * - 轮次外（命令响应 / 系统提示 / 进度摘要）：按 maxMessageChars 分块发 Markdown。
   *
   * `opts.standalone=true`（本轮改动摘要等轮次级通知）必须独立成条，
   * 不得并入流式正文——否则会被 turn/end 的收尾覆盖掉。
   */
  async _sendTextNow(text, opts = {}) {
    // 离线守卫：网关未连接时不尝试出站（避免把消息堆到重连后的错误目标）
    if (this.platform?.status === 'idle' || this.platform?.status === 'offline') return
    const peer = this.resolveOutboundPeer(opts)
    if (!peer) {
      this.logger?.warn?.('[dsh-bridge qq] 出站目标为空，本条已跳过：%s', String(text ?? '').slice(0, 80))
      return
    }
    const content = String(text ?? '').trim()
    if (!content) return

    // 轮次内单聊：流式累积
    if (this._inTurn && !opts?.standalone && peer.scope === 'c2c' && this.config.streamReply !== false) {
      await this._streamTurnText(peer, content)
      return
    }

    const md = sanitizeQQMarkdown(content)
    const chunks = conversationBridgeHelpers.splitForIM(md, this.config.maxMessageChars || 2000)
    if (chunks.length === 0) return
    // sendMarkdown 是 QQ 的常规出站路径；gateway 未提供时降级 sendText（便于最小实现/测试替身）
    const send = typeof this.gateway?.sendMarkdown === 'function'
      ? (peerId, body, sendOpts) => this.gateway.sendMarkdown(peerId, body, sendOpts)
      : (peerId, body, sendOpts) => this.gateway.sendText(peerId, body, sendOpts)
    for (let i = 0; i < chunks.length; i++) {
      const result = await send(peer.peerId, chunks[i], {
        scope: peer.scope,
        msgId: peer.msgId,
        streamKey: opts?.streamKey,
      })
      if (result && result.success === false) {
        this.logger?.warn?.('[dsh-bridge qq] outbound chunk %d/%d failed: %s', i + 1, chunks.length, result.error)
        // 落盘：宿主 logger 不落盘，出站失败此前对用户完全不可见（消息"凭空消失"）
        this._diag('warn', `[dsh-bridge qq] 出站分块发送失败 chunk=${i + 1}/${chunks.length} `
          + `peer=${peer.peerId} error=${result.error ?? '(无)'}`)
        break
      }
      if (i < chunks.length - 1 && this.config.sendChunkDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, this.config.sendChunkDelayMs))
      }
    }
  }

  /**
   * 轮次内累积 + 流式写入。
   *
   * 宿主的 `assistant/message` 是**每步的文本片段**（surfaceOp=append），不是整轮全文，
   * 因此这里必须累积；已渲染内容以片段开头时按替换处理（兼容宿主已累积的形态）。
   * 详见飞书侧同类注释（同一坑，2026-10-16 真机定位）。
   */
  async _streamTurnText(peer, content) {
    const prev = this._turnText
    const merged = !prev
      ? content
      : (content.startsWith(prev) ? content : `${prev}\n\n${content}`)
    this._turnText = merged
    this._turnPeerKey = `${peer.scope}:${peer.peerId}`

    const payload = this._withStatus(sanitizeQQMarkdown(merged))
    const result = await this.gateway.sendStream(peer.peerId, payload, {
      scope: peer.scope,
      msgId: peer.msgId,
      streamKey: this._turnPeerKey,
    })
    if (result && result.success === false) {
      this.logger?.warn?.('[dsh-bridge qq] 流式输出失败：%s', result.error)
    }
  }

  /** 收尾本轮流式消息（幂等）：写最终内容并标记 input_state=DONE。 */
  async _finishTurnStream() {
    const text = this._turnText
    const key = this._turnPeerKey
    this._turnText = ''
    this._turnPeerKey = ''
    if (!key || !text) return
    const sepIndex = key.indexOf(':')
    const scope = key.slice(0, sepIndex)
    const peerId = key.slice(sepIndex + 1)
    if (!peerId || scope !== 'c2c') return
    try {
      await this.gateway.sendStream(peerId, sanitizeQQMarkdown(text), { scope, done: true, streamKey: key })
    } catch (err) {
      this.logger?.warn?.('[dsh-bridge qq] 流式收尾失败：%s', err?.message ?? err)
    }
  }

  /**
   * 连接断开时中止在途流。
   *
   * 不发送 DONE 帧（连接已断，写 socket 只会失败刷日志）；但**不清空 `_turnText`**——
   * 旧实现直接赋值 ''，断线瞬间已生成的正文彻底丢失，比重连后至少补发半截还差
   * （复核 B2 实测 lost:true）。这里保留正文，交给下一次 turn/start 或 dispose 补发。
   */
  async _abortStream() {
    const key = this._turnPeerKey
    this._turnPeerKey = ''
    this._inTurn = false
    if (!key) return
    const sepIndex = key.indexOf(':')
    const scope = key.slice(0, sepIndex)
    const peerId = key.slice(sepIndex + 1)
    // abort：不发 DONE 帧（连接已断，写 socket 只会失败并刷日志），只取消挂起的节流推送
    if (peerId) await this.gateway.finishStream?.(peerId, { scope, streamKey: key, abort: true }).catch(() => {})
  }

  /** 把活动状态行拼到正文前（与飞书/Telegram 同一呈现：引用块 + 斜体）。 */
  _withStatus(text) {
    const status = this._activityLine
    if (!status) return text
    const styled = `${STATUS_PREFIX}${status}_`
    return text ? `${styled}\n\n${text}` : styled
  }

  /**
   * 更新"当前活动"状态（由会话桥在 tool/call 时调用）。
   * 立即刷新已渲染内容，让用户看到 agent 正在做什么。
   */
  async setActivityStatus(line, _opts, parts) {
    this._activityLine = parts ? this._styleActivityParts(parts) : String(line ?? '')
    if (!this._activityLine) return
    // 本轮还没有正文：单独发一条状态消息，避免整段时间用户看不到进度
    if (!this._turnText) {
      const peer = this.resolveOutboundPeer(_opts ?? {})
      if (!peer) return
      try {
        await this.gateway.sendMarkdown(peer.peerId, this._withStatus(''), {
          scope: peer.scope,
          msgId: peer.msgId,
        })
      } catch (err) {
        this.logger?.debug?.('[dsh-bridge qq] 状态行发送失败：%s', err?.message ?? err)
      }
      return
    }
    // 已有正文：随下一次流式更新自然带上（不在中间插入，避免消息抖动）
  }

  /** 受控文案保持原样、detail 转义后组装（避免命令原文破坏样式）。 */
  _styleActivityParts(parts) {
    const icon = String(parts?.icon ?? '')
    const text = String(parts?.text ?? '')
    const suffix = String(parts?.suffix ?? '')
    const detail = parts?.detail ? String(parts.detail).replace(/[*_`[\]()]/g, '') : ''
    const head = detail ? `${icon} ${text}（${detail}）` : `${icon} ${text}`
    return `${head}${suffix}`
  }

  /** 输入状态：QQ 仅 C2C 支持（网关内部会跳过群聊）。 */
  async sendTyping(state, opts = {}) {
    const peer = this._lastPeer
    const peerId = opts?.outboundPeer?.peerId ?? peer?.peerId
    if (!peerId) return
    // state=2（停止）无需显式结束——input_second 到期自动消失
    if (Number(state) === 2) return
    const scope = opts?.outboundPeer?.scope ?? peer?.scope ?? 'c2c'
    return this.gateway.sendTyping(peerId, { scope, durationSeconds: 8 })
  }

  /** 发送多媒体附件（沿用当前 peer）。 */
  async sendMediaFile(filePath, opts = {}) {
    const peer = this.resolveOutboundPeer(opts)
    if (!peer) return { success: false, error: '无可用出站目标' }
    return this.gateway.sendMediaFile(peer.peerId, filePath, { scope: peer.scope, msgId: peer.msgId })
  }

  /**
   * 审批卡片：Markdown + 两个回调按钮（允许一次 / 拒绝）。
   *
   * 会话桥在 `approval/request` 里优先调用本方法（存在时），失败自动回退纯文字提示。
   * button_data 编码 `{"t":"approval","d":"allow"|"deny"}`，由 _handleAction 统一路由。
   *
   * @returns {Promise<boolean>} 是否成功送达卡片
   */
  async sendApprovalCard(peer, approval = {}, promptText = '') {
    // 桥传入的 outboundPeer 字段是 { peerId, scope, isGroup, messageId }；
    // 统一成出站目标（msgId 用于被动回复锚点，避免退化成主动消息）
    peer = {
      peerId: peer?.peerId,
      scope: peer?.scope ?? (peer?.isGroup ? 'group' : 'c2c'),
      msgId: peer?.msgId ?? peer?.messageId,
    }
    const content = sanitizeQQMarkdown(String(promptText || ''))
    const keyboard = {
      content: {
        rows: [{
          buttons: [
            {
              id: 'approval-allow',
              render_data: { label: '✅ 允许一次', visited_label: '✓ 已允许', style: 1 },
              action: {
                type: 1,
                permission: { type: 2 },
                click_limit: 1,
                data: JSON.stringify({ t: 'approval', n: Number(approval.number) || 0, s: this._approvalNonce, d: 'allow' }),
                unsupport_tips: '请升级 QQ 客户端后使用按钮',
              },
              group_id: 'approval',
            },
            {
              id: 'approval-deny',
              render_data: { label: '❌ 拒绝', visited_label: '✓ 已拒绝', style: 0 },
              action: {
                type: 1,
                permission: { type: 2 },
                click_limit: 1,
                data: JSON.stringify({ t: 'approval', n: Number(approval.number) || 0, s: this._approvalNonce, d: 'deny' }),
                unsupport_tips: '请升级 QQ 客户端后使用按钮',
              },
              group_id: 'approval',
            },
          ],
        }],
      },
    }
    // 目标与被动回复锚点都必须来自**本审批所属的会话**（peer）；
    // 回退到 this._lastPeer 会把上一个会话的 msg_id 用到当前对话（P0-3 实测串号）
    const targetPeerId = peer?.peerId
    if (!targetPeerId) {
      this.logger?.warn?.('[dsh-bridge qq] 审批卡片缺少会话目标，改为文字回退')
      return false
    }
    try {
      const res = await this.gateway.sendMarkdown(targetPeerId, content, {
        scope: peer?.scope ?? 'c2c',
        msgId: peer?.msgId,
        keyboard,
      })
      return res?.success !== false
    } catch (err) {
      this.logger?.warn?.('[dsh-bridge qq] 审批卡片发送失败（回退文字）：%s', err?.message ?? err)
      return false
    }
  }

  /**
   * 问答卡片：Markdown 正文 + 每行 2 个回调按钮（单问单选）。
   *
   * 选项全文写进正文、按钮只放短标签——QQ 按钮 label 有长度限制，
   * 只靠按钮会丢信息（飞书侧已踩过同样的坑）。
   *
   * @returns {Promise<boolean>} 是否成功送达卡片
   */
  async sendAskCard(peer, question, entry, promptText = '') {
    const options = Array.isArray(question?.options) ? question.options : []
    if (options.length === 0) return false

    const rows = [sanitizeQQMarkdown(String(promptText || ''))]
    const questionText = String(question?.question ?? '').replace(/\|/g, '｜')
    if (questionText) rows.push('', `**${questionText}**`)
    const detail = String(question?.detail ?? '').replace(/\|/g, '｜').trim()
    if (detail) rows.push('', detail)
    options.forEach((opt, i) => {
      const label = String(opt?.label ?? `选项 ${i + 1}`)
      const recommended = /\(recommended\)|（推荐）/i.test(label)
      const desc = String(opt?.description ?? '').trim()
      rows.push(`${i + 1}. ${recommended ? '⭐ ' : ''}${label}${desc ? ` — ${desc}` : ''}`)
    })
    rows.push('', '> 点击下方按钮选择，或直接回复编号')

    const buttons = options.map((opt, i) => {
      const label = String(opt?.label ?? `选项 ${i + 1}`).trim()
      const bare = label.replace(/\s*[（(]\s*(recommended|推荐)\s*[)）]\s*/i, '').trim()
      const head = bare.split(/[：:—\-–(（]/)[0].trim() || bare
      const short = head.length > 8 ? `${head.slice(0, 8)}…` : head
      return {
        id: `q-${entry.number}-opt-${i}`,
        render_data: { label: `${i + 1}. ${short || `选项${i + 1}`}`, visited_label: '✓ 已选', style: 1 },
        action: {
          type: 1,
          permission: { type: 2 },
          click_limit: 1,
          data: JSON.stringify({ t: 'question', q: entry.number, i }),
          unsupport_tips: '请升级 QQ 客户端后使用按钮',
        },
        group_id: `q-${entry.number}`,
      }
    })
    const keyboardRows = []
    for (let i = 0; i < buttons.length; i += 2) {
      keyboardRows.push({ buttons: buttons.slice(i, i + 2) })
    }

    // 目标只来自本提问所属会话（peer）；绝不回退 this._lastPeer——
    // 那会把卡片打到上一个会话，甚至把单聊 peer 当成群 openid 打 /v2/groups/（C 项实测）
    const targetPeerId = peer?.peerId
    if (!targetPeerId) {
      this.logger?.warn?.('[dsh-bridge qq] 提问卡片缺少会话目标，改为文字回退')
      return false
    }
    const scope = peer?.scope ?? (peer?.isGroup ? 'group' : 'c2c')
    try {
      const res = await this.gateway.sendMarkdown(targetPeerId, rows.join('\n'), {
        scope,
        msgId: peer?.msgId ?? peer?.messageId,
        keyboard: { content: { rows: keyboardRows } },
      })
      return res?.success !== false
    } catch (err) {
      this.logger?.warn?.('[dsh-bridge qq] 提问卡片发送失败（回退文字）：%s', err?.message ?? err)
      return false
    }
  }

  dispose() {
    // 正常关停路径：若有未收尾的断流正文，尽力补发一次（不阻塞 dispose）
    if (this._turnText) void this._finishTurnStream()
    this._inTurn = false
    this._turnText = ''
    this._turnPeerKey = ''
    this._activityLine = ''
    this._lastPeer = null
    super.dispose()
  }
}

// 导出，便于测试与复用
export const qqNodeHelpers = {
  splitForQQ: conversationBridgeHelpers.splitForIM,
  digestLine: conversationBridgeHelpers.digestLine,
  textOfAssistantMessage: conversationBridgeHelpers.textOfAssistantMessage,
  listSessions: conversationBridgeHelpers.listSessions,
  sessionsInDisplayOrder: conversationBridgeHelpers.sessionsInDisplayOrder,
  sanitizeQQMarkdown,
  isBlockedDownloadUrl,
}
