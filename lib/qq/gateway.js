// QQ Bot OpenAPI v2 gateway
// Official API: https://bot.q.qq.com/wiki/develop/api-v2/

import fs from 'node:fs'
import path from 'node:path'
import { Service } from '@deepseek-ai/cordis'
import WebSocket from 'ws'

const TOKEN_URL = 'https://bots.qq.com/app/getAppAccessToken'
const API_BASE = 'https://api.bot.qq.com'
// 官方 WebSocket 网关地址（2026-08-10 起域名统一为 api.bot.qq.com）
// 参考：https://bot.q.qq.com/wiki/develop/api-v2/dev-prepare/event-emit/websocket.html
const DEFAULT_GATEWAY = 'wss://api.bot.qq.com/websocket/'
const MAX_MESSAGE_CHARS = 2000
const TOKEN_MARGIN_MS = 5 * 60_000
const REQUEST_TIMEOUT_MS = 15_000
const RECONNECT_DELAY_MS = 3000

export const QQ_INTENTS = {
  // 官方 Intent 表：C2C_MESSAGE_CREATE 与 GROUP_AT_MESSAGE_CREATE 同属 GROUP_AND_C2C_EVENT (1<<25)
  // 参考：https://bot.q.qq.com/wiki/develop/api-v2/autogen/event/c2c_message_create.html
  //       https://bot.q.qq.com/wiki/develop/api-v2/autogen/event/group_at_message_create.html
  GROUP_AND_C2C_EVENT: 1 << 25,
  C2C_MESSAGE_CREATE: 1 << 25,
  GROUP_AT_MESSAGE_CREATE: 1 << 25, // 之前误标 1<<30（无效值）
  INTERACTION_CREATE: 1 << 26,
  PUBLIC_GUILD_MESSAGES: 1 << 9,
  DIRECT_MESSAGE: 1 << 12,
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const stringValue = (value) => value == null ? '' : String(value)

async function requestJson(url, { method = 'GET', token, body, timeoutMs = REQUEST_TIMEOUT_MS } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      method,
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        ...(token ? { authorization: `QQBot ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    })
    const raw = await response.text()
    let value = {}
    try { value = raw ? JSON.parse(raw) : {} } catch { value = { message: raw } }
    if (!response.ok) {
      const error = new Error(`QQ API ${response.status}: ${value?.message || value?.msg || value?.code || response.statusText}`)
      error.status = response.status
      error.payload = value
      throw error
    }
    return value
  } finally { clearTimeout(timer) }
}

function normalizeEvent(payload) {
  const data = payload?.d || {}
  const event = payload?.t || ''
  if (event === 'C2C_MESSAGE_CREATE') {
    return {
      type: 'message', scope: 'c2c', event,
      id: data.id || data.msg_id,
      senderId: data.author?.user_openid || data.user_openid,
      peerId: data.author?.user_openid || data.user_openid,
      text: stringValue(data.content).trim(),
      attachments: Array.isArray(data.attachments) ? data.attachments : [],
      message: data,
      messageReference: data.message_reference,
      msgSeq: data.msg_seq, // 用于避免去重
    }
  }
  if (event === 'GROUP_AT_MESSAGE_CREATE' || event === 'GROUP_MESSAGE_CREATE') {
    // GROUP_AT_MESSAGE_CREATE：用户@机器人触发；GROUP_MESSAGE_CREATE：开启"接收所有消息"后每条群消息
    // 两者字段结构完全一致（官方文档），content 已去除 @机器人 前缀
    return {
      type: 'message', scope: 'group', event,
      id: data.id || data.msg_id,
      senderId: data.author?.member_openid || data.author?.id || data.member_openid,
      peerId: data.group_openid || data.group_id,
      groupId: data.group_openid || data.group_id,
      text: stringValue(data.content).trim(),
      attachments: Array.isArray(data.attachments) ? data.attachments : [],
      message: data,
      messageReference: data.message_reference,
      msgSeq: data.msg_seq, // 用于避免去重
    }
  }
  if (event === 'AT_MESSAGE_CREATE') {
    return {
      type: 'message', scope: 'guild', event,
      id: data.id || data.msg_id,
      senderId: data.author?.id,
      peerId: data.channel_id,
      guildId: data.guild_id,
      text: stringValue(data.content).trim(),
      message: data,
      messageReference: data.message_reference,
    }
  }
  if (event === 'INTERACTION_CREATE') {
    return {
      type: 'interaction', scope: data.group_openid ? 'group' : 'c2c', event,
      id: data.id,
      interactionId: data.id,
      interactionType: Number(data.type), // 11=消息按钮回调, 12=快捷菜单回调, 13=消息反馈...
      senderId: data.group_member_openid || data.user_openid,
      peerId: data.group_openid || data.user_openid,
      groupId: data.group_openid,
      data: data.data,
      message: data,
    }
  }
  return { type: 'event', event, message: data }
}

export class QqGateway extends Service {
  constructor({ ctx, logger, config = {}, onPersist } = {}) {
    super(ctx, 'qq')
    this.logger = logger
    this.onPersist = onPersist || (() => {})
    this.config = {
      appId: config.appId || '',
      clientSecret: config.clientSecret || '',
      accessToken: config.accessToken || '',
      accessTokenExpiresAt: Number(config.accessTokenExpiresAt || 0),
      gatewayUrl: config.gatewayUrl || '',
      intents: Number(config.intents ?? (QQ_INTENTS.C2C_MESSAGE_CREATE | QQ_INTENTS.GROUP_AT_MESSAGE_CREATE | QQ_INTENTS.INTERACTION_CREATE)),
      reconnectDelayMs: Number(config.reconnectDelayMs ?? RECONNECT_DELAY_MS),
      apiTimeoutMs: Number(config.apiTimeoutMs ?? REQUEST_TIMEOUT_MS),
    }
    this.statusValue = 'idle'
    this.accountId = config.accountId || ''
    this.ws = null
    this.loopTask = null
    this.stopRequested = false
    this.heartbeatTimer = null
    this.heartbeatInterval = 30_000
    this.sequence = null
    this.sessionId = null
    this.unackedHeartbeats = 0
    this.tokenPromise = null
    this.dedup = new Map()
  }

  get status() { return this.statusValue }
  get configured() { return Boolean(this.config.appId && this.config.clientSecret) }
  get capabilities() {
    // QQ 支持输入状态（msg_type=6 + input_notify）、群聊、富媒体
    return { supportsGroup: true, supportsMedia: true, supportsVoice: true, supportsTyping: true, maxMessageChars: MAX_MESSAGE_CHARS }
  }

  setStatus(status) {
    this.statusValue = status
    try { this.ctx.emit?.('qq/status', status) } catch {}
  }

  async dispose() { await this.stop(); super.dispose?.() }

  async stop() {
    this.stopRequested = true
    this.clearHeartbeat()
    const finish = this._finishConnect
    this._finishConnect = null
    if (finish) {
      try { finish(new Error('Stopped by user')) } catch {}
    }
    const ws = this.ws
    this.ws = null
    if (ws) {
      try { ws.close(); ws.terminate() } catch {}
    }
    const task = this.loopTask
    this.loopTask = null
    if (task) await task.catch(() => {})
    this.setStatus('idle')
  }

  async start() {
    if (this._startingPromise) return this._startingPromise
    if (!this.configured) { this.setStatus('idle'); return }
    if (this.loopTask) return
    this._startingPromise = (async () => {
      this.stopRequested = false
      this.loopTask = this.runLoop().finally(() => { this.loopTask = null })
    })().finally(() => { this._startingPromise = null })
    return this._startingPromise
  }

  async persist(patch) {
    try { await this.onPersist(patch) } catch (error) {
      this.logger?.warn?.('[dsh-bridge qq] persist failed: %s', error?.message ?? error)
    }
  }

  async refreshAccessToken() {
    if (this.config.accessToken && this.config.accessTokenExpiresAt > Date.now() + TOKEN_MARGIN_MS) {
      return this.config.accessToken
    }
    if (this.tokenPromise) return this.tokenPromise
    if (!this.configured) throw new Error('QQ Bot 缺少 AppID 或 ClientSecret')
    this.tokenPromise = (async () => {
      const result = await requestJson(TOKEN_URL, {
        method: 'POST',
        body: { appId: this.config.appId, clientSecret: this.config.clientSecret },
        timeoutMs: this.config.apiTimeoutMs,
      })
      const token = result?.access_token || result?.accessToken
      if (!token) throw new Error('QQ Bot 未返回 access_token')
      const expires = Math.max(60, Number(result?.expires_in || 7200))
      this.config.accessToken = token
      this.config.accessTokenExpiresAt = Date.now() + expires * 1000
      await this.persist({ accessToken: token, accessTokenExpiresAt: this.config.accessTokenExpiresAt })
      return token
    })().finally(() => { this.tokenPromise = null })
    return this.tokenPromise
  }

  async api(path, options = {}) {
    return requestJson(`${API_BASE}${path}`, {
      ...options,
      token: await this.refreshAccessToken(),
      timeoutMs: this.config.apiTimeoutMs,
    })
  }

  async runLoop() {
    let backoffMs = this.config.reconnectDelayMs
    while (!this.stopRequested) {
      try {
        this.setStatus('starting')
        const token = await this.refreshAccessToken()
        if (this.stopRequested) break
        // 官方「获取带分片 WSS 接入点」接口，返回网关地址与建议分片数
        // 参考：https://bot.q.qq.com/wiki/develop/api-v2/dev-prepare/event-emit/websocket.html
        const gateway = this.config.gatewayUrl
          || ((await requestJson(`${API_BASE}/gateway/bot`, { token, timeoutMs: this.config.apiTimeoutMs })).url)
          || DEFAULT_GATEWAY
        if (this.stopRequested) break
        await this.connect(gateway, token)
        backoffMs = this.config.reconnectDelayMs
      } catch (error) {
        if (this.stopRequested) break
        this.setStatus('reconnecting')
        this.logger?.warn?.('[dsh-bridge qq] gateway disconnected: %s, retrying in %dms...', error?.message ?? error, backoffMs)
        await sleep(backoffMs)
        backoffMs = Math.min(Math.round(backoffMs * 1.5), 30_000)
      }
    }
    this.setStatus('idle')
  }

  connect(url, token) {
    return new Promise((resolve, reject) => {
      if (this.stopRequested) {
        resolve()
        return
      }
      const ws = new WebSocket(url)
      this.ws = ws
      let settled = false
      const finish = (error) => {
        if (settled) return
        settled = true
        this._finishConnect = null
        this.clearHeartbeat()
        if (this.ws === ws) this.ws = null
        error ? reject(error) : resolve()
      }
      this._finishConnect = finish

      ws.on('open', () => {
        if (this.stopRequested) {
          finish()
          return
        }
        this.logger?.info?.('[dsh-bridge qq] WebSocket connected to QQ Open Platform')
      })
      ws.on('message', (raw) => {
        if (this.stopRequested) return
        let payload
        try { payload = JSON.parse(String(raw)) } catch { return }
        void this.handlePayload(payload, token, ws).catch(finish)
      })
      ws.on('error', finish)
      ws.on('close', (code, reason) => finish(new Error(`QQ gateway closed: ${code} ${reason || ''}`)))
    })
  }

  async handlePayload(payload, token, ws) {
    if (this.stopRequested) return
    const op = Number(payload?.op)
    if (payload?.s != null) this.sequence = payload.s
    if (op === 10) {
      this.heartbeatInterval = Number(payload?.d?.heartbeat_interval || 30_000)
      this.startHeartbeat(ws)
      if (this.sessionId && this.sequence != null) {
        // 快速恢复模式（Resume）：携带 sessionId 与 sequence 避免重新全量鉴权与丢失消息
        this.logger?.info?.('[dsh-bridge qq] attempting session resume (sessionId=%s, seq=%s)', this.sessionId, this.sequence)
        ws.send(JSON.stringify({
          op: 6,
          d: {
            token: `QQBot ${token}`,
            session_id: this.sessionId,
            seq: this.sequence,
          },
        }))
      } else {
        // 全量鉴权模式（Identify）
        ws.send(JSON.stringify({
          op: 2,
          d: {
            token: `QQBot ${token}`,
            intents: this.config.intents,
            shard: [0, 1],
            properties: { $os: process.platform, $browser: 'dsh-bridge', $device: 'dsh-bridge' },
          },
        }))
      }
      return
    }
    if (op === 11) {
      // 心跳确认（Heartbeat ACK）：重置未确认计数器
      this.unackedHeartbeats = 0
      return
    }
    if (op === 0) {
      if (payload.t === 'READY') {
        this.sessionId = payload.d?.session_id || this.sessionId
        this.accountId = payload.d?.user?.id || payload.d?.user?.username || this.accountId
        this.unackedHeartbeats = 0
        await this.persist({ accountId: this.accountId })
        this.setStatus('connected')
        this.logger?.info?.('[dsh-bridge qq] gateway READY (session_id=%s)', this.sessionId)
      } else if (payload.t === 'RESUMED') {
        this.unackedHeartbeats = 0
        this.setStatus('connected')
        this.logger?.info?.('[dsh-bridge qq] gateway RESUMED successfully')
      }
      const event = normalizeEvent(payload)
      if (event.type === 'message' && event.id && !this.seen(event.id)) {
        this.ctx.emit?.('qq/message', event)
      }
      if (event.type === 'interaction' && event.interactionId) {
        this.ctx.emit?.('qq/interaction', event)
      }
      return
    }
    if (op === 7) {
      this.logger?.info?.('[dsh-bridge qq] gateway requested reconnect (OpCode 7)')
      try { ws.close() } catch {}
      return
    }
    if (op === 9) {
      this.sessionId = null
      this.sequence = null
      throw new Error('QQ gateway invalid session (OpCode 9)')
    }
  }

  startHeartbeat(ws) {
    this.clearHeartbeat()
    this.unackedHeartbeats = 0
    const beat = () => {
      if (ws.readyState === WebSocket.OPEN) {
        if (this.unackedHeartbeats >= 2) {
          this.logger?.warn?.('[dsh-bridge qq] heartbeat ACK missed (count=%d), dead link detected, reconnecting...', this.unackedHeartbeats)
          try { ws.terminate() } catch {}
          return
        }
        this.unackedHeartbeats += 1
        ws.send(JSON.stringify({ op: 1, d: this.sequence }))
      }
    }
    beat()
    this.heartbeatTimer = setInterval(beat, this.heartbeatInterval)
  }

  clearHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer)
    this.heartbeatTimer = null
    this.unackedHeartbeats = 0
  }

  seen(id) {
    const now = Date.now()
    for (const [key, at] of this.dedup) if (now - at > 300_000) this.dedup.delete(key)
    if (this.dedup.has(id)) return true
    this.dedup.set(id, now)
    return false
  }

  endpoint(peerId, scope, kind = 'messages') {
    return scope === 'group'
      ? `/v2/groups/${encodeURIComponent(peerId)}/${kind}`
      : `/v2/users/${encodeURIComponent(peerId)}/${kind}`
  }

  async sendText(peerId, content, opts = {}) {
    const body = {
      content: stringValue(content).slice(0, MAX_MESSAGE_CHARS),
      msg_type: 0,
    }
    // 只添加有值的可选字段
    if (opts.msgId !== undefined) body.msg_id = opts.msgId
    if (opts.eventId !== undefined) body.event_id = opts.eventId
    if (opts.msgSeq !== undefined) body.msg_seq = opts.msgSeq
    return this.api(this.endpoint(peerId, opts.scope), { method: 'POST', body })
  }

  async sendMarkdown(peerId, markdown, opts = {}) {
    const body = {
      markdown: typeof markdown === 'string' ? { content: markdown } : markdown,
      msg_type: 2,
    }
    // 只添加有值的可选字段
    if (opts.keyboard !== undefined) body.keyboard = opts.keyboard
    if (opts.msgId !== undefined) body.msg_id = opts.msgId
    if (opts.eventId !== undefined) body.event_id = opts.eventId
    if (opts.msgSeq !== undefined) body.msg_seq = opts.msgSeq
    return this.api(this.endpoint(peerId, opts.scope), { method: 'POST', body })
  }

  async sendKeyboard(peerId, content, keyboard, opts = {}) {
    // 官方文档：keyboard 为附加字段，配合 msg_type=0(content) 或 msg_type=2(markdown) 使用
    // 纯文本 + 键盘时使用 msg_type=0
    const body = {
      content: stringValue(content),
      keyboard,
      msg_type: 0,
    }
    // 只添加有值的可选字段
    if (opts.msgId !== undefined) body.msg_id = opts.msgId
    if (opts.eventId !== undefined) body.event_id = opts.eventId
    if (opts.msgSeq !== undefined) body.msg_seq = opts.msgSeq
    return this.api(this.endpoint(peerId, opts.scope), { method: 'POST', body })
  }

  async sendMedia(peerId, media, opts = {}) {
    return this.api(this.endpoint(peerId, opts.scope, 'files'), {
      method: 'POST',
      body: {
        file_type: Number(media.fileType || 1),
        url: media.url,
        srv_send_msg: media.sendMessage !== false,
      },
    })
  }

  async sendStream(peerId, content, opts = {}) {
    const endpoint = this.endpoint(peerId, opts.scope, 'stream_messages')
    const body = {
      content_type: opts.contentType || 'text',
      content_raw: stringValue(content), // 流式 replace 模式每片是全量前缀，不截断
      input_mode: opts.inputMode || 'replace',
      input_state: opts.inputState, // 1=生成中, 10=生成结束
      index: opts.index, // 分片序号，从0递增
    }
    // 只添加有值的可选字段，避免 undefined 被序列化
    if (opts.streamMsgId !== undefined) body.stream_msg_id = opts.streamMsgId
    if (opts.msgId !== undefined) body.msg_id = opts.msgId
    if (opts.eventId !== undefined) body.event_id = opts.eventId
    if (opts.msgSeq !== undefined) body.msg_seq = opts.msgSeq
    return this.api(endpoint, { method: 'POST', body })
  }

  async respondInteraction(interactionId, response) {
    return this.api(`/interactions/${encodeURIComponent(interactionId)}`, {
      method: 'PUT',
      body: response,
    })
  }

  async sendTyping(peerId, opts = {}) {
    // QQ Bot API v2 使用 msg_type: 6 发送输入状态通知
    // 参考：https://bot.q.qq.com/wiki/develop/api-v2/autogen/api/v2_users_user_openid_messages.post.html
    const endpoint = this.endpoint(peerId, opts.scope)
    const body = {
      msg_type: 6,
      input_notify: {
        input_type: 1,
        input_second: Math.min(opts.durationSeconds || 5, 60), // 最长60秒
      },
    }
    // 只添加有值的可选字段
    if (opts.msgId !== undefined) body.msg_id = opts.msgId
    if (opts.eventId !== undefined) body.event_id = opts.eventId
    if (opts.msgSeq !== undefined) body.msg_seq = opts.msgSeq
    return this.api(endpoint, { method: 'POST', body })
  }

  /**
   * 撤回机器人发送的消息（发送超过 2 分钟不可撤回）。
   * 参考：https://bot.q.qq.com/wiki/develop/api-v2/autogen/api/v2_users_user_openid_messages_message_id.delete.html
   * @param {string} peerId   用户/群 OpenID（u_xxx / g_xxx）
   * @param {string} messageId 要撤回的消息 ID
   * @param {object} [opts]   { scope }
   */
  async withdrawMessage(peerId, messageId, opts = {}) {
    const endpoint = `${this.endpoint(peerId, opts.scope)}/${encodeURIComponent(messageId)}`
    return this.api(endpoint, { method: 'DELETE' })
  }

  // ---- 自定义菜单（单聊底部菜单，全局生效）----
  // 参考：https://bot.q.qq.com/wiki/develop/api-v2/autogen/api/v2_menu.get.html
  //       https://bot.q.qq.com/wiki/develop/api-v2/autogen/api/v2_menu.put.html

  /** 查询全局自定义菜单 */
  async getMenu() {
    return this.api('/v2/menu', { method: 'GET' })
  }

  /**
   * 修改全局自定义菜单（覆盖式）
   * @param {Array} items 菜单项，最多 10 个
   *   { name, type: 'switch'|'send_message'|'link'|'menu', sub_menu_items?, send_message?, link?, switch? }
   */
  async setMenu(items) {
    return this.api('/v2/menu', {
      method: 'PUT',
      body: { menu: { items } },
    })
  }

  // ---- 指令面板（c2c/group/channel/dm 场景）----
  // 参考：https://bot.q.qq.com/wiki/develop/api-v2/server-inter/menu-panel/
  //       https://bot.q.qq.com/wiki/develop/api-v2/autogen/api/v2_panels.post.html

  /** 查询指令面板列表（按场景筛选） */
  async listPanels(scope) {
    const query = scope ? `?scope=${encodeURIComponent(scope)}` : ''
    return this.api(`/v2/panels${query}`, { method: 'GET' })
  }

  /**
   * 创建指令面板
   * @param {object} body { scope, target_type?, user_openids?, group_openids?, panel: { items, remark?, version? } }
   * @returns {Promise<{panel_id: string}>}
   */
  async createPanel(body) {
    return this.api('/v2/panels', { method: 'POST', body })
  }

  /** 查询指令面板详情 */
  async getPanel(panelId) {
    return this.api(`/v2/panels/${encodeURIComponent(panelId)}`, { method: 'GET' })
  }

  /** 修改指令面板 */
  async updatePanel(panelId, body) {
    return this.api(`/v2/panels/${encodeURIComponent(panelId)}`, { method: 'PUT', body })
  }

  /** 删除指令面板 */
  async deletePanel(panelId) {
    return this.api(`/v2/panels/${encodeURIComponent(panelId)}`, { method: 'DELETE' })
  }

  /** 修改指令面板关联对象（增删指定用户/群） */
  async updatePanelTarget(panelId, body) {
    return this.api(`/v2/panels/${encodeURIComponent(panelId)}/target`, { method: 'PUT', body })
  }

  /**
   * 上传并发送本地媒体文件（图片等）
   */
  async sendMediaFile(peerId, filePath, opts = {}) {
    if (!fs.existsSync(filePath)) return null
    const ext = path.extname(filePath).toLowerCase()
    const isImage = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'].includes(ext)
    const isVideo = ['.mp4', '.mov', '.webm', '.avi'].includes(ext)
    const isVoice = ['.silk', '.amr', '.wav', '.mp3'].includes(ext)
    let fileType = 4 // 默认文件类型（txt, pdf, zip, docx, etc.）
    if (isImage) fileType = 1
    else if (isVideo) fileType = 2
    else if (isVoice) fileType = 3

    const scope = opts.scope || (peerId.startsWith('g_') || peerId.startsWith('group_') ? 'group' : 'user')
    try {
      const fileName = path.basename(filePath)
      const buf = await fs.promises.readFile(filePath)
      const base64Data = buf.toString('base64')
      const ep = this.endpoint(peerId, scope, 'files')
      const body = {
        file_type: fileType,
        file_data: base64Data,
        file_name: fileName,
        srv_send_msg: true,
      }
      if (opts.msgId !== undefined) body.msg_id = opts.msgId
      if (opts.eventId !== undefined) body.event_id = opts.eventId
      if (opts.msgSeq !== undefined) body.msg_seq = opts.msgSeq
      const res = await this.api(ep, {
        method: 'POST',
        body,
      })
      return res
    } catch (err) {
      this.logger?.warn?.('[dsh-bridge qq] sendMediaFile error: %s', err?.message ?? err)
      return null
    }
  }

  setCredentials(values = {}) {
    for (const key of ['appId', 'clientSecret', 'accessToken', 'accessTokenExpiresAt', 'gatewayUrl', 'intents']) {
      if (values[key] !== undefined) this.config[key] = values[key]
    }
    if (values.accountId !== undefined) this.accountId = values.accountId
  }
}

export const gatewayConstants = { API_BASE, TOKEN_URL, DEFAULT_GATEWAY, MAX_MESSAGE_CHARS, QQ_INTENTS }
