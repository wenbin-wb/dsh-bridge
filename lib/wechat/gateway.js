// dsh-bridge WeChat iLink gateway
//
// 微信 ClawBot（iLink Bot API）网关：扫码登录 + 长轮询收消息 + 发送 + typing。
// 由 Jesse-njx/dsh-chatnode-wechat（MIT）移植精简而来，协议细节与 hermes-agent
// 微信通道（gateway/platforms/weixin.py）一致。纯拉取式 outbound 连接，无需公网/隧道。
//
// 架构约束（决定本文件形态）：
//   - 独占锁：iLink 每条 bot token 只允许一个 poller；第二个 poller（hermes / OpenClaw /
//     本插件重复）收到 HTTP 403。检测到 403 时响亮报错并停止轮询，而不是无限重试。
//   - context_token：每次回复必须回带 peer 提供的最新 token；过期 token 返回 -14
//     （会话过期），随后做一次无 token 降级重试。
//   - 会话过期（-14 或 -2+"unknown error"）暂停轮询一段窗口，与 hermes 参考一致。
//
// 依赖注入：通过 `ctx.wechat` 服务提供（sendText/sendTyping/accountId/status），
// 并通过 ctx 事件 'wechat/message' / 'wechat/status' 派发。runInService 由主插件调用。

import fs from 'node:fs'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import { Service } from '@deepseek-ai/cordis'
import { uploadMedia, md5, generateFilekey, generateAesKey, encodeAesKeyForApi, aes128PaddedSize } from './media.js'

// ---------------------------------------------------------------------------
// 常量
// ---------------------------------------------------------------------------

const ILINK_BASE_URL = 'https://ilinkai.weixin.qq.com'
const WEIXIN_CDN_BASE_URL = 'https://novac2c.cdn.weixin.qq.com/c2c'
const ILINK_APP_ID = 'bot'
const CHANNEL_VERSION = '2.2.0'
const ILINK_APP_CLIENT_VERSION = (2 << 16) | (2 << 8) | 0

const EP_GET_UPDATES = 'ilink/bot/getupdates'
const EP_SEND_MESSAGE = 'ilink/bot/sendmessage'
const EP_SEND_TYPING = 'ilink/bot/sendtyping'
const EP_GET_CONFIG = 'ilink/bot/getconfig'
const EP_GET_BOT_QR = 'ilink/bot/get_bot_qrcode'
const EP_GET_QR_STATUS = 'ilink/bot/get_qrcode_status'

const LONG_POLL_TIMEOUT_MS = 35_000
const API_TIMEOUT_MS = 15_000
const CONFIG_TIMEOUT_MS = 10_000
const QR_TIMEOUT_MS = 35_000
const MAX_MESSAGE_CHARS = 2000

const MSG_TYPE_BOT = 2
const MSG_STATE_FINISH = 2
const ITEM_TEXT = 1

const TYPING_START = 1
const TYPING_STOP = 2

const SESSION_EXPIRED_ERRCODE = -14
const RATE_LIMIT_ERRCODE = -2
const MESSAGE_DEDUP_TTL_SECONDS = 300

/** 默认 CDN 白名单（SSRF 防护）。v0.2 媒体用到，先保留常量。 */
const DEFAULT_CDN_ALLOWLIST = ['novac2c.cdn.weixin.qq.com']

/** ret/errcode=-2 + "unknown error" 或 "prepare failed" 表示会话/凭证过期（而非限流）。 */
function isStaleSessionRet(ret, errcode, errmsg) {
  if (ret !== RATE_LIMIT_ERRCODE && errcode !== RATE_LIMIT_ERRCODE) return false
  const msg = String(errmsg ?? '').toLowerCase()
  return msg === 'unknown error' || msg === 'prepare failed' || msg.includes('expired') || msg.includes('token')
}

// ---------------------------------------------------------------------------
// 纯协议客户端（transport-light，不依赖 DSH）
// ---------------------------------------------------------------------------

/** 每个请求必带的头。X-WECHAT-UIN 每次随机，防重放。 */
function requestHeaders(token, body) {
  const headers = {
    'Content-Type': 'application/json',
    AuthorizationType: 'ilink_bot_token',
    'Content-Length': String(Buffer.byteLength(body)),
    'X-WECHAT-UIN': randomBytes(4).toString('base64url'),
    'iLink-App-Id': ILINK_APP_ID,
    'iLink-App-ClientVersion': String(ILINK_APP_CLIENT_VERSION),
  }
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

function baseInfo() {
  return { channel_version: CHANNEL_VERSION }
}

/** 带超时与 abort 的 POST JSON。非 2xx 抛出带 HTTP 状态的错误。 */
async function postJson({ baseUrl = ILINK_BASE_URL, endpoint, payload, token, timeoutMs = API_TIMEOUT_MS }) {
  const body = JSON.stringify({ ...payload, base_info: baseInfo() })
  const url = `${baseUrl.replace(/\/+$/, '')}/${endpoint}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: requestHeaders(token, body),
      body,
      signal: controller.signal,
    })
    const raw = await response.text()
    if (!response.ok) {
      // 403 = iLink 独占锁症状：同 token 已有别的 poller。响亮抛出。
      const err = new Error(`iLink POST ${endpoint} HTTP ${response.status}: ${raw.slice(0, 200)}`)
      err.httpStatus = response.status
      throw err
    }
    return JSON.parse(raw)
  } finally {
    clearTimeout(timer)
  }
}

/** GET（扫码端点是无 token 的 GET）。 */
async function getJson({ baseUrl = ILINK_BASE_URL, endpoint, timeoutMs = QR_TIMEOUT_MS }) {
  const url = `${baseUrl.replace(/\/+$/, '')}/${endpoint}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'iLink-App-Id': ILINK_APP_ID,
        'iLink-App-ClientVersion': String(ILINK_APP_CLIENT_VERSION),
      },
      signal: controller.signal,
    })
    const raw = await response.text()
    if (!response.ok) {
      const err = new Error(`iLink GET ${endpoint} HTTP ${response.status}: ${raw.slice(0, 200)}`)
      err.httpStatus = response.status
      throw err
    }
    return JSON.parse(raw)
  } finally {
    clearTimeout(timer)
  }
}

/** 长轮询收消息；超时返回空批次（不算错误）。 */
async function getUpdates({ baseUrl, token, syncBuf, timeoutMs = LONG_POLL_TIMEOUT_MS }) {
  try {
    const raw = await postJson({
      baseUrl,
      endpoint: EP_GET_UPDATES,
      payload: { get_updates_buf: syncBuf },
      token,
      timeoutMs,
    })
    return {
      messages: Array.isArray(raw.msgs) ? raw.msgs : [],
      syncBuf: raw.get_updates_buf ?? syncBuf,
      suggestedTimeoutMs: raw.longpolling_timeout_ms,
      raw,
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { messages: [], syncBuf, raw: { ret: 0, msgs: [] } }
    }
    throw error
  }
}

/** 发送消息（文本或媒体）。text 和 item 二选一。 */
async function sendMessage({ baseUrl, token, to, text, item, contextToken, clientId, timeoutMs }) {
  const msg = {
    from_user_id: '',
    to_user_id: to,
    client_id: clientId,
    message_type: MSG_TYPE_BOT,
    message_state: MSG_STATE_FINISH,
  }
  
  // 构建 item_list：优先使用 item（媒体），否则用 text
  if (item) {
    msg.item_list = [item]
  } else if (text && text.trim()) {
    msg.item_list = [{ type: ITEM_TEXT, text_item: { text } }]
  } else {
    throw new Error('sendMessage: either text or item must be provided')
  }
  
  if (contextToken) msg.context_token = contextToken
  return postJson({ baseUrl, endpoint: EP_SEND_MESSAGE, payload: { msg }, token, timeoutMs })
}

/** 获取 peer 的 typing_ticket（600s TTL）。 */
async function getConfig({ baseUrl, token, userId, contextToken }) {
  const payload = { ilink_user_id: userId }
  if (contextToken) payload.context_token = contextToken
  const raw = await postJson({ baseUrl, endpoint: EP_GET_CONFIG, payload, token, timeoutMs: CONFIG_TIMEOUT_MS })
  return { typingTicket: raw.typing_ticket }
}

/** 开始(1)/结束(2) "正在输入" 指示。 */
async function sendTyping({ baseUrl, token, toUserId, typingTicket, status }) {
  await postJson({
    baseUrl,
    endpoint: EP_SEND_TYPING,
    payload: { ilink_user_id: toUserId, typing_ticket: typingTicket, status },
    token,
    timeoutMs: CONFIG_TIMEOUT_MS,
  })
}

/** 获取登录二维码（bot_type=3 = 个人号 bot）。 */
async function getBotQrcode({ baseUrl, botType = '3' }) {
  return getJson({ baseUrl, endpoint: `${EP_GET_BOT_QR}?bot_type=${botType}` })
}

/** 轮询扫码状态。 */
async function getQrcodeStatus({ baseUrl, qrcode }) {
  return getJson({ baseUrl, endpoint: `${EP_GET_QR_STATUS}?qrcode=${encodeURIComponent(qrcode)}` })
}

/** 完整扫码登录流程，返回凭据或 null。 */
async function qrLogin({ baseUrl, timeoutMs = 480_000, pollIntervalMs = 1000, onQr, onStatus }) {
  const deadline = Date.now() + timeoutMs
  let currentBaseUrl = baseUrl ?? ILINK_BASE_URL
  let qrcodeValue = ''
  let qrcodeImg = ''

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const qr = await getBotQrcode({ baseUrl: currentBaseUrl })
      qrcodeValue = qr.qrcode ?? ''
      qrcodeImg = qr.qrcode_img_content ?? ''
      break
    } catch {
      if (attempt === 1) return null
    }
  }
  if (!qrcodeValue) return null

  const scanData = qrcodeImg || qrcodeValue
  onQr?.({ value: qrcodeValue, scanData, imgContent: qrcodeImg })

  let refreshCount = 0
  while (Date.now() < deadline) {
    let status
    try {
      status = await getQrcodeStatus({ baseUrl: currentBaseUrl, qrcode: qrcodeValue })
    } catch {
      await sleep(pollIntervalMs)
      continue
    }
    const state = status.status ?? 'wait'
    onStatus?.(state, status)
    if (state === 'scaned_but_redirect' && status.redirect_host) {
      currentBaseUrl = `https://${status.redirect_host}`
    } else if (state === 'expired') {
      refreshCount += 1
      if (refreshCount > 3) return null
      const qr = await getBotQrcode({ baseUrl: currentBaseUrl }).catch(() => null)
      if (!qr || !qr.qrcode) return null
      qrcodeValue = qr.qrcode
      qrcodeImg = qr.qrcode_img_content ?? ''
      onQr?.({ value: qrcodeValue, scanData: qrcodeImg || qrcodeValue, imgContent: qrcodeImg })
    } else if (state === 'confirmed') {
      const accountId = status.ilink_bot_id ?? ''
      const token = status.bot_token ?? ''
      if (!accountId || !token) return null
      return {
        accountId,
        token,
        baseUrl: status.baseurl ?? currentBaseUrl,
        userId: status.ilink_user_id,
      }
    }
    await sleep(pollIntervalMs)
  }
  return null
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ---------------------------------------------------------------------------
// 网关服务（生命周期 + 轮询 + 发送 + typing + 扫码）
// ---------------------------------------------------------------------------

/** 网关状态。 */
const GATEWAY_STATUS = ['idle', 'starting', 'connected', 'reconnecting', 'paused', 'error']

/**
 * WechatGateway — iLink 网关服务实例。
 * @param {object} opts
 * @param {object} opts.ctx            Cordis 上下文（用于 emit 事件）
 * @param {object} opts.logger         日志器
 * @param {object} [opts.config]       配置（默认值见下）
 */
export class WechatGateway extends Service {
  constructor({ ctx, logger, config = {} }) {
    super(ctx, 'wechat')
    this.logger = logger
    this.c = {
      baseUrl: config.baseUrl ?? ILINK_BASE_URL,
      cdnBaseUrl: config.cdnBaseUrl ?? WEIXIN_CDN_BASE_URL,
      token: config.token ?? '',
      accountId: config.accountId ?? '',
      longPollTimeoutMs: config.longPollTimeoutMs ?? LONG_POLL_TIMEOUT_MS,
      apiTimeoutMs: config.apiTimeoutMs ?? API_TIMEOUT_MS,
      pollIdleDelayMs: config.pollIdleDelayMs ?? 0,
      qrPollIntervalMs: config.qrPollIntervalMs ?? 1000,
      retryDelayMs: config.retryDelayMs ?? 2000,
      backoffDelayMs: config.backoffDelayMs ?? 30_000,
      maxConsecutiveFailures: config.maxConsecutiveFailures ?? 3,
      sessionExpiredPauseMs: config.sessionExpiredPauseMs ?? 600_000,
      sendChunkDelayMs: config.sendChunkDelayMs ?? 1500,
      sendChunkRetries: config.sendChunkRetries ?? 4,
      sendChunkRetryDelayMs: config.sendChunkRetryDelayMs ?? 1000,
      rateLimitCircuitOpenMs: config.rateLimitCircuitOpenMs ?? 30_000,
      rateLimitCircuitWindowMs: config.rateLimitCircuitWindowMs ?? 30_000,
      rateLimitCircuitThreshold: config.rateLimitCircuitThreshold ?? 1,
      allowCdnHosts: [
        ...DEFAULT_CDN_ALLOWLIST,
        ...(config.allowCdnHosts ?? [])
      ].filter((v, i, a) => a.indexOf(v) === i), // 去重
    }
    this.syncBuf = ''
    this.pollTask = null
    this.stopPollingLocal = false
    this.statusValue = 'idle'
    this.contextTokens = new Map()
    try {
      const tokenFile = path.join(process.env.DSH_HOME || path.join(process.env.USERPROFILE || process.env.HOME || '.', '.dsh'), 'dsh-bridge', 'wechat-context-tokens.json')
      if (fs.existsSync(tokenFile)) {
        const data = JSON.parse(fs.readFileSync(tokenFile, 'utf8'))
        for (const [k, v] of Object.entries(data)) {
          if (v) this.contextTokens.set(k, String(v))
        }
      }
    } catch {}
    this.dedup = new Map()
    this.typingTickets = new Map()
    this.rateLimitHits = []
    this.rateLimitUntil = 0
    this._disposed = false
    // 内存泄漏防护：每 5 分钟清理过期缓存
    this.cleanupInterval = setInterval(() => this._cleanupMaps(), 300_000)
  }

  _cleanupMaps() {
    const now = Date.now()
    // 清理 contextTokens：超过 1 小时未使用的删除
    const contextTokenTtl = 3600_000
    // 清理 typingTickets：超过 30 秒的删除
    const typingTicketTtl = 30_000
    
    // contextTokens 没有时间戳，保守策略：如果 Map 过大才清理（超过 100 个）
    if (this.contextTokens.size > 100) {
      this.logger?.warn(`contextTokens Map 过大 (${this.contextTokens.size})，清理旧数据`)
      // 保留最近 50 个，删除其余
      const entries = Array.from(this.contextTokens.entries())
      this.contextTokens.clear()
      entries.slice(-50).forEach(([k, v]) => this.contextTokens.set(k, v))
    }
    
    // 清理 typingTickets
    for (const [peerId, ticket] of this.typingTickets) {
      if (now - ticket.at > typingTicketTtl) {
        this.typingTickets.delete(peerId)
      }
    }
  }

  // ---- 状态访问器 ----------------------------------------------------------

  get status() { return this.statusValue }
  get configured() { return Boolean(this.c.token && this.c.accountId) }
  get accountId() { return this.c.accountId }
  get baseUrl() { return this.c.baseUrl }

  // ---- 生命周期 ------------------------------------------------------------

  /** 运行中由外部持有 setTimeout 等资源；dispose 停止轮询。 */
  dispose() {
    this._disposed = true
    this.stopPollingLocal = true
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    void this.stop()
  }

  async stop() {
    this.stopPollingLocal = true
    const task = this.pollTask
    this.pollTask = null
    if (task) {
      try { await task } catch { /* 轮询错误通过事件暴露，不在此抛出 */ }
    }
    this.setStatus('idle')
  }

  async start() {
    if (this._startingPromise) return this._startingPromise
    if (!this.configured) {
      this.setStatus('idle')
      return
    }
    this._startingPromise = this.restart()
    try {
      await this._startingPromise
    } finally {
      this._startingPromise = null
    }
  }

  setCredentials({ token, accountId, baseUrl } = {}) {
    if (token !== undefined) this.c.token = token
    if (accountId !== undefined) this.c.accountId = accountId
    if (baseUrl !== undefined) this.c.baseUrl = baseUrl
    void this.restart()
  }

  // ---- 对外能力 ------------------------------------------------------------

  contextTokenFor(peerId) { return this.contextTokens.get(peerId) }
  setContextToken(peerId, token) { if (token) this.contextTokens.set(peerId, token) }

  /**
   * 扫码登录。成功即采用凭据并开始轮询。返回 { success, credentials?, error? }。
   * 调用方负责持久化凭据。
   */
  async loginQr({ onQr, onStatus, timeoutMs } = {}) {
    const credentials = await qrLogin({
      baseUrl: this.c.baseUrl,
      timeoutMs,
      pollIntervalMs: this.c.qrPollIntervalMs,
      onQr,
      onStatus,
    })
    if (!credentials) return { success: false, error: 'login failed or timed out' }
    this.setCredentials(credentials)
    return { success: true, credentials }
  }

  /**
   * 发送一条文本气泡（< maxMessageChars）。分块由上层负责。
   * 带逐块重试、会话过期无 token 降级、限流熔断。
   */
  async sendText(to, text, clientId) {
    if (!text.trim()) return { success: false, error: 'empty message' }
    if (!this.configured) return { success: false, error: 'not configured' }
    let contextToken = this.contextTokens.get(to)
    const id = clientId ?? `dsh-bridge-wechat-${randomId()}`
    let lastError
    let retriedWithoutToken = false

    for (let attempt = 0; attempt <= this.c.sendChunkRetries; attempt++) {
      if (this.rateLimitUntil > Date.now()) {
        return { success: false, error: 'iLink sendmessage rate limited; cooldown active' }
      }
      try {
        const resp = await sendMessage({
          baseUrl: this.c.baseUrl,
          token: this.c.token,
          to,
          text,
          contextToken,
          clientId: id,
          timeoutMs: this.c.apiTimeoutMs,
        })
        const ret = resp.ret
        const errcode = resp.errcode
        if ((ret !== undefined && ret !== 0) || (errcode !== undefined && errcode !== 0)) {
          const isSessionExpired = ret === SESSION_EXPIRED_ERRCODE || errcode === SESSION_EXPIRED_ERRCODE
            || isStaleSessionRet(ret, errcode, resp.errmsg)
          if (isSessionExpired) {
            if (contextToken && !retriedWithoutToken) {
              retriedWithoutToken = true
              contextToken = undefined
              this.contextTokens.delete(to)
              await sleep(this.c.sendChunkRetryDelayMs)
              continue
            }
            lastError = new Error(`iLink sendmessage session expired: ret=${ret} errcode=${errcode}`)
            break
          }
          const isRateLimited = ret === RATE_LIMIT_ERRCODE || errcode === RATE_LIMIT_ERRCODE
          if (isRateLimited) {
            lastError = new Error(`iLink sendmessage rate limited: ret=${ret} errcode=${errcode} errmsg=${resp.errmsg ?? ''}`)
            if (this.recordRateLimit()) break
            if (attempt >= this.c.sendChunkRetries) break
            await sleep(this.c.sendChunkRetryDelayMs * 3)
            continue
          }
          lastError = new Error(`iLink sendmessage error: ret=${ret} errcode=${errcode} errmsg=${resp.errmsg ?? ''}`)
          break
        }
        this.rateLimitHits = []
        return { success: true, messageId: id }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        if (attempt >= this.c.sendChunkRetries) break
        await sleep(this.c.sendChunkRetryDelayMs * (attempt + 1))
      }
    }
    return { success: false, error: lastError?.message ?? 'send failed' }
  }

  /**
   * 获取媒体上传 URL（v0.2）。
   * @param {object} opts
   * @param {string} opts.to 接收用户 ID
   * @param {number} opts.mediaType 媒体类型（2=图片 3=语音 4=文件 5=视频）
   * @param {string} opts.filekey 随机 hex 标识（32 字符）
   * @param {number} opts.rawSize 明文大小
   * @param {string} opts.rawFileMd5 明文 MD5
   * @param {number} opts.fileSize 密文大小（AES 填充后）
   * @param {string} opts.aesKeyHex AES key 的 hex 表示（32 字符）
   * @returns {Promise<{uploadParam?: string, uploadFullUrl?: string}>}
   */
  async getUploadUrl({ to, mediaType, filekey, rawSize, rawFileMd5, fileSize, aesKeyHex }) {
    if (!this.configured) throw new Error('not configured')
    // 映射 MessageItemType 到 UploadMediaType (IMAGE:1, VIDEO:2, FILE:3, VOICE:4)
    let uploadMediaType = mediaType
    if (mediaType === 2) uploadMediaType = 1 // IMAGE
    else if (mediaType === 4) uploadMediaType = 3 // FILE
    else if (mediaType === 3) uploadMediaType = 4 // VOICE
    else if (mediaType === 5) uploadMediaType = 2 // VIDEO

    const resp = await postJson({
      baseUrl: this.c.baseUrl,
      endpoint: 'ilink/bot/getuploadurl',
      token: this.c.token,
      payload: {
        filekey,
        media_type: uploadMediaType,
        to_user_id: to,
        rawsize: rawSize,
        rawfilemd5: rawFileMd5,
        filesize: fileSize,
        no_need_thumb: true,
        aeskey: aesKeyHex,
      },
      timeoutMs: this.c.apiTimeoutMs,
    })
    return {
      uploadParam: resp.upload_param,
      uploadFullUrl: resp.upload_full_url,
    }
  }

  /**
   * 发送媒体消息（图片/文件/语音/视频）。
   * @param {object} opts
   * @param {string} opts.to 接收用户 ID
   * @param {number} opts.mediaType 媒体类型（2=图片 3=语音 4=文件 5=视频）
   * @param {string} opts.encryptedQueryParam CDN 加密参数（上传后获取）
   * @param {string} opts.aesKeyBase64 AES key 的 base64(hex) 表示
   * @param {number} opts.ciphertextSize 密文大小
   * @param {number} opts.plaintextSize 明文大小
   * @param {string} opts.filename 文件名
   * @param {string} opts.rawFileMd5 明文 MD5
   * @param {string} [opts.clientId] 客户端消息 ID
   * @returns {Promise<{success: boolean, error?: string, messageId?: string}>}
   */
  async sendMedia({
    to,
    mediaType,
    encryptedQueryParam,
    aesKeyBase64,
    aesKeyHex,
    ciphertextSize,
    plaintextSize,
    filename,
    rawFileMd5,
    clientId,
  }) {
    if (!this.configured) return { success: false, error: 'not configured' }
    const contextToken = this.contextTokens.get(to)
    const id = clientId ?? `dsh-bridge-wechat-${randomId()}`
    const hexKey = aesKeyHex || (aesKeyBase64 ? Buffer.from(aesKeyBase64, 'base64').toString('hex') : '')

    // 构建媒体项（全字段兼容各端微信客户端解析）
    let item
    if (mediaType === 2) { // 图片
      item = {
        type: 2,
        image_item: {
          media: {
            encrypt_query_param: encryptedQueryParam,
            aes_key: aesKeyBase64,
            aeskey: hexKey,
            encrypt_type: 1,
          },
          aeskey: hexKey,
          aes_key: aesKeyBase64,
          filesize: ciphertextSize,
          rawsize: plaintextSize,
          rawfilemd5: rawFileMd5,
        },
      }
    } else if (mediaType === 4) { // 文件
      item = {
        type: 4,
        file_item: {
          file_name: filename,
          len: String(plaintextSize),
          media: {
            encrypt_query_param: encryptedQueryParam,
            aes_key: aesKeyBase64,
            encrypt_type: 1,
          },
        },
      }
    } else if (mediaType === 3) { // 语音
      item = {
        type: 3,
        voice_item: {
          media: {
            encrypt_query_param: encryptedQueryParam,
            aes_key: aesKeyBase64,
            aeskey: hexKey,
            encrypt_type: 0,
          },
          aeskey: hexKey,
          aes_key: aesKeyBase64,
          encode_type: 6, // silk
          sample_rate: 24000,
          bits_per_sample: 16,
        },
      }
    } else if (mediaType === 5) { // 视频
      item = {
        type: 5,
        video_item: {
          media: {
            encrypt_query_param: encryptedQueryParam,
            aes_key: aesKeyBase64,
            aeskey: hexKey,
            encrypt_type: 1,
          },
          aeskey: hexKey,
          aes_key: aesKeyBase64,
          filesize: ciphertextSize,
          rawsize: plaintextSize,
          rawfilemd5: rawFileMd5,
        },
      }
    } else {
      return { success: false, error: `unsupported media type ${mediaType}` }
    }

    try {
      const resp = await sendMessage({
        baseUrl: this.c.baseUrl,
        token: this.c.token,
        to,
        item,
        contextToken,
        clientId: id,
        timeoutMs: this.c.apiTimeoutMs,
      })
      const ret = resp.ret
      const errcode = resp.errcode
      if ((ret !== undefined && ret !== 0) || (errcode !== undefined && errcode !== 0)) {
        return {
          success: false,
          error: `iLink sendmessage error: ret=${ret} errcode=${errcode} errmsg=${resp.errmsg ?? ''}`,
        }
      }
      return { success: true, messageId: id }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * 加密并发送本地媒体文件（图片/文档）到微信
   */
  async sendMediaFile(to, filePath) {
    if (!this.configured || !fs.existsSync(filePath)) return { success: false, error: 'not configured or file not found' }
    try {
      const buf = await fs.promises.readFile(filePath)
      const ext = path.extname(filePath).toLowerCase()
      const isImage = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'].includes(ext)
      const mediaType = isImage ? 2 : 4
      const filename = path.basename(filePath)
      const rawFileMd5 = md5(buf)
      const aesKey = generateAesKey()
      const aesKeyHex = aesKey.toString('hex')
      const aesKeyBase64 = encodeAesKeyForApi(aesKey)
      const filekey = generateFilekey()
      const rawSize = buf.length
      const fileSize = aes128PaddedSize(rawSize)

      const uploadInfo = await this.getUploadUrl({
        to,
        filekey,
        mediaType,
        rawSize,
        rawFileMd5,
        fileSize,
        aesKeyHex,
      })

      const uploadUrl = uploadInfo.uploadFullUrl || `${this.c.cdnBaseUrl.replace(/\/+$/, '')}/upload?encrypted_query_param=${encodeURIComponent(uploadInfo.uploadParam)}&filekey=${encodeURIComponent(filekey)}`

      const encryptedParam = await uploadMedia({
        plaintext: buf,
        uploadUrl,
        aesKey,
      })

      return await this.sendMedia({
        to,
        mediaType,
        encryptedQueryParam: encryptedParam,
        aesKeyBase64,
        aesKeyHex,
        ciphertextSize: fileSize,
        plaintextSize: rawSize,
        filename,
        rawFileMd5,
      })
    } catch (err) {
      this.logger?.warn?.('[dsh-bridge wechat] sendMediaFile failed: %s', err?.message ?? err)
      return { success: false, error: err?.message }
    }
  }

  /** 显示/隐藏 typing 指示（尽力而为，失败不致命）。 */
  async sendTyping(to, status) {
    if (!this.configured) return
    const ticket = await this.typingTicket(to)
    if (!ticket) return
    try {
      await sendTyping({
        baseUrl: this.c.baseUrl,
        token: this.c.token,
        toUserId: to,
        typingTicket: ticket,
        status,
      })
    } catch { /* typing 是装饰性的 */ }
  }

  async typingTicket(peerId) {
    const cached = this.typingTickets.get(peerId)
    if (cached && Date.now() - cached.at < 600_000) return cached.ticket
    try {
      const { typingTicket } = await getConfig({
        baseUrl: this.c.baseUrl,
        token: this.c.token,
        userId: peerId,
        contextToken: this.contextTokens.get(peerId),
      })
      if (typingTicket) {
        this.typingTickets.set(peerId, { ticket: typingTicket, at: Date.now() })
        return typingTicket
      }
    } catch { /* 非致命 */ }
    return undefined
  }

  // -------------------------------------------------------------------------
  // 轮询循环
  // -------------------------------------------------------------------------

  async restart() {
    if (this._restartingPromise) return this._restartingPromise
    this._restartingPromise = (async () => {
      this.stopPollingLocal = true
      const previous = this.pollTask
      this.pollTask = null
      if (previous) {
        try { await previous } catch { /* 被替换 */ }
      }
      if (!this.configured) {
        this.setStatus('idle')
        return
      }
      this.stopPollingLocal = false
      this.setStatus('starting')
      this.pollTask = this.runPollLoop()
    })()
    try {
      await this._restartingPromise
    } finally {
      this._restartingPromise = null
    }
  }

  setStatus(status) {
    if (this.statusValue === status) return
    this.statusValue = status
    try {
      this.ctx.emit('wechat/status', status)
    } catch { /* emit 失败不致命 */ }
  }

  async runPollLoop() {
    let consecutiveFailures = 0
    let timeoutMs = this.c.longPollTimeoutMs
    let fatal = false
    while (!this.stopPollingLocal) {
      try {
        const batch = await getUpdates({
          baseUrl: this.c.baseUrl,
          token: this.c.token,
          syncBuf: this.syncBuf,
          timeoutMs,
        })
        if (this.stopPollingLocal) break

        if (typeof batch.raw.longpolling_timeout_ms === 'number' && batch.raw.longpolling_timeout_ms > 0) {
          timeoutMs = batch.raw.longpolling_timeout_ms
        }

        const ret = batch.raw.ret
        const errcode = batch.raw.errcode
        if ((ret !== undefined && ret !== 0 && ret !== null) || (errcode !== undefined && errcode !== 0 && errcode !== null)) {
          if (ret === SESSION_EXPIRED_ERRCODE || errcode === SESSION_EXPIRED_ERRCODE
            || isStaleSessionRet(ret, errcode, batch.raw.errmsg)) {
            this.setStatus('paused')
            this.ctx.emit('wechat/error', new Error(`iLink session expired; pausing ${this.c.sessionExpiredPauseMs}ms`))
            await sleep(this.c.sessionExpiredPauseMs)
            consecutiveFailures = 0
            this.setStatus('connected')
            continue
          }
          consecutiveFailures += 1
          const backoff = consecutiveFailures >= this.c.maxConsecutiveFailures
            ? this.c.backoffDelayMs : this.c.retryDelayMs
          this.setStatus(consecutiveFailures >= this.c.maxConsecutiveFailures ? 'reconnecting' : 'connected')
          this.ctx.emit('wechat/error', new Error(
            `getUpdates failed ret=${ret} errcode=${errcode} errmsg=${batch.raw.errmsg ?? ''} (${consecutiveFailures}/${this.c.maxConsecutiveFailures})`,
          ))
          if (consecutiveFailures >= this.c.maxConsecutiveFailures) consecutiveFailures = 0
          await sleep(backoff)
          continue
        }

        consecutiveFailures = 0
        if (batch.syncBuf) this.syncBuf = batch.syncBuf
        if (this.statusValue !== 'connected') {
          this.logger?.info?.('[dsh-bridge wechat] connected to iLink platform')
        }
        if (this.stopPollingLocal) break
        this.setStatus('connected')
        for (const message of batch.messages) {
          if (this.stopPollingLocal) break
          this.dispatchInbound(message)
        }
        if (this.c.pollIdleDelayMs > 0) await sleep(this.c.pollIdleDelayMs)
      } catch (error) {
        if (this.stopPollingLocal) break
        if (error?.httpStatus === 403) {
          // iLink 独占锁：同 token 已有别的 poller。响亮报错并停止。
          this.setStatus('error')
          this.ctx.emit('wechat/fatal', new Error(
            'iLink returned HTTP 403: another poller (hermes-agent, OpenClaw, or a duplicate dsh-bridge WeChat bot) is already polling this account. ' +
            'iLink allows exactly one authenticated poller per token. Stop the other gateway or use a dedicated WeChat account.',
          ))
          fatal = true
          this.stopPollingLocal = true
          break
        }
        consecutiveFailures += 1
        const backoff = consecutiveFailures >= this.c.maxConsecutiveFailures
          ? this.c.backoffDelayMs : this.c.retryDelayMs
        this.setStatus(consecutiveFailures >= this.c.maxConsecutiveFailures ? 'reconnecting' : 'connected')
        this.ctx.emit('wechat/error', error instanceof Error ? error : new Error(String(error)))
        if (consecutiveFailures >= this.c.maxConsecutiveFailures) consecutiveFailures = 0
        await sleep(backoff)
      }
    }
    // 致命错误保持终态；普通停止回到 idle
    if (!fatal) this.setStatus('idle')
  }

  // ---- 入站管道（去重 + context token 捕获；策略在上层 node） ---------------

  dispatchInbound(message) {
    const sender = String(message.from_user_id ?? '')
    const messageId = String(message.message_id ?? '')
    if (!sender || sender === this.c.accountId) return
    if (messageId && this.isDuplicate(messageId)) return
    if (messageId) this.remember(messageId)

    const contextToken = String(message.context_token ?? '')
    if (contextToken) {
      this.contextTokens.set(sender, contextToken)
      try {
        const tokenFile = path.join(process.env.DSH_HOME || path.join(process.env.USERPROFILE || process.env.HOME || '.', '.dsh'), 'dsh-bridge', 'wechat-context-tokens.json')
        let data = {}
        try { if (fs.existsSync(tokenFile)) data = JSON.parse(fs.readFileSync(tokenFile, 'utf8')) } catch {}
        data[sender] = contextToken
        fs.writeFileSync(tokenFile, JSON.stringify(data, null, 2), 'utf8')
      } catch {}
    }

    try {
      this.ctx.emit('wechat/message', message)
    } catch { /* 上层未订阅时不致命 */ }
  }

  isDuplicate(id) {
    const seen = this.dedup.get(id)
    if (seen !== undefined && Date.now() - seen < MESSAGE_DEDUP_TTL_SECONDS * 1000) return true
    return false
  }

  remember(id) {
    this.dedup.set(id, Date.now())
    if (this.dedup.size > 512) {
      const cutoff = Date.now() - MESSAGE_DEDUP_TTL_SECONDS * 1000
      for (const [key, at] of this.dedup) {
        if (at < cutoff) this.dedup.delete(key)
      }
    }
  }

  // ---- 限流熔断 ------------------------------------------------------------

  recordRateLimit() {
    const now = Date.now()
    const windowStart = now - this.c.rateLimitCircuitWindowMs
    this.rateLimitHits = this.rateLimitHits.filter((ts) => ts >= windowStart)
    this.rateLimitHits.push(now)
    if (this.rateLimitHits.length >= this.c.rateLimitCircuitThreshold) {
      this.rateLimitUntil = Math.max(this.rateLimitUntil, now + this.c.rateLimitCircuitOpenMs)
      return this.rateLimitUntil > now
    }
    return false
  }
}

function randomId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// 媒体类型常量（v0.2）
const MEDIA_TYPE_IMAGE = 2
const MEDIA_TYPE_VOICE = 3
const MEDIA_TYPE_FILE = 4
const MEDIA_TYPE_VIDEO = 5

export const gatewayConstants = {
  ILINK_BASE_URL,
  WEIXIN_CDN_BASE_URL,
  MAX_MESSAGE_CHARS,
  TYPING_START,
  TYPING_STOP,
  ITEM_TEXT,
  GATEWAY_STATUS,
  MEDIA_TYPE_IMAGE,
  MEDIA_TYPE_VOICE,
  MEDIA_TYPE_FILE,
  MEDIA_TYPE_VIDEO,
}
