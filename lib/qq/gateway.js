// QQ Bot OpenAPI v2 gateway
// Official API: https://bot.q.qq.com/wiki/develop/api-v2/

import { Service } from '@deepseek-ai/cordis'
import WebSocket from 'ws'

const TOKEN_URL = 'https://bots.qq.com/app/getAppAccessToken'
const API_BASE = 'https://api.sgroup.qq.com'
const DEFAULT_GATEWAY = 'wss://api.sgroup.qq.com/websocket/'
const MAX_MESSAGE_CHARS = 2000
const TOKEN_MARGIN_MS = 5 * 60_000
const REQUEST_TIMEOUT_MS = 15_000
const RECONNECT_DELAY_MS = 3000

export const QQ_INTENTS = {
  C2C_MESSAGE_CREATE: 1 << 25,
  INTERACTION_CREATE: 1 << 26,
  GROUP_AT_MESSAGE_CREATE: 1 << 30,
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
      message: data,
      messageReference: data.message_reference,
    }
  }
  if (event === 'GROUP_AT_MESSAGE_CREATE') {
    return {
      type: 'message', scope: 'group', event,
      id: data.id || data.msg_id,
      senderId: data.author?.member_openid || data.author?.id || data.member_openid,
      peerId: data.group_openid || data.group_id,
      groupId: data.group_openid || data.group_id,
      text: stringValue(data.content).trim(),
      message: data,
      messageReference: data.message_reference,
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
    this.tokenPromise = null
    this.dedup = new Map()
  }

  get status() { return this.statusValue }
  get configured() { return Boolean(this.config.appId && this.config.clientSecret) }
  get capabilities() {
    return { supportsGroup: true, supportsMedia: true, supportsVoice: true, supportsTyping: false, maxMessageChars: MAX_MESSAGE_CHARS }
  }

  setStatus(status) {
    this.statusValue = status
    try { this.ctx.emit?.('qq/status', status) } catch {}
  }

  async dispose() { await this.stop(); super.dispose?.() }

  async stop() {
    this.stopRequested = true
    this.clearHeartbeat()
    const ws = this.ws
    this.ws = null
    if (ws) { try { ws.removeAllListeners(); ws.close(); ws.terminate() } catch {} }
    const task = this.loopTask
    this.loopTask = null
    if (task) await task.catch(() => {})
    this.setStatus('idle')
  }

  async start() {
    if (!this.configured) { this.setStatus('idle'); return }
    if (!this.loopTask) {
      this.stopRequested = false
      this.loopTask = this.runLoop().finally(() => { this.loopTask = null })
    }
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
    while (!this.stopRequested) {
      try {
        this.setStatus('starting')
        const token = await this.refreshAccessToken()
        const gateway = this.config.gatewayUrl
          || ((await requestJson(`${API_BASE}/gateway`, { token, timeoutMs: this.config.apiTimeoutMs })).url)
          || DEFAULT_GATEWAY
        await this.connect(gateway, token)
      } catch (error) {
        if (this.stopRequested) break
        this.setStatus('reconnecting')
        this.logger?.warn?.('[dsh-bridge qq] gateway disconnected: %s', error?.message ?? error)
        await sleep(this.config.reconnectDelayMs)
      }
    }
    this.setStatus('idle')
  }

  connect(url, token) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url)
      this.ws = ws
      let settled = false
      const finish = (error) => {
        if (settled) return
        settled = true
        this.clearHeartbeat()
        if (this.ws === ws) this.ws = null
        error ? reject(error) : resolve()
      }
      ws.on('open', () => this.logger?.info?.('[dsh-bridge qq] gateway connected'))
      ws.on('message', (raw) => {
        let payload
        try { payload = JSON.parse(String(raw)) } catch { return }
        void this.handlePayload(payload, token, ws).catch(finish)
      })
      ws.on('error', finish)
      ws.on('close', (code, reason) => finish(new Error(`QQ gateway closed: ${code} ${reason || ''}`)))
    })
  }

  async handlePayload(payload, token, ws) {
    const op = Number(payload?.op)
    if (payload?.s != null) this.sequence = payload.s
    if (op === 10) {
      this.heartbeatInterval = Number(payload?.d?.heartbeat_interval || 30_000)
      this.startHeartbeat(ws)
      ws.send(JSON.stringify({
        op: 2,
        d: {
          token: `QQBot ${token}`,
          intents: this.config.intents,
          shard: [0, 1],
          properties: { $os: process.platform, $browser: 'dsh-bridge', $device: 'dsh-bridge' },
        },
      }))
      return
    }
    if (op === 0) {
      if (payload.t === 'READY') {
        this.accountId = payload.d?.user?.id || payload.d?.user?.username || this.accountId
        await this.persist({ accountId: this.accountId })
        this.setStatus('connected')
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
    if (op === 7) { try { ws.close() } catch {}; return }
    if (op === 9) throw new Error('QQ gateway invalid session')
  }

  startHeartbeat(ws) {
    this.clearHeartbeat()
    const beat = () => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ op: 1, d: this.sequence }))
    }
    beat()
    this.heartbeatTimer = setInterval(beat, this.heartbeatInterval)
  }

  clearHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer)
    this.heartbeatTimer = null
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
    return this.api(this.endpoint(peerId, opts.scope), {
      method: 'POST',
      body: {
        content: stringValue(content).slice(0, MAX_MESSAGE_CHARS),
        msg_type: 0,
        msg_id: opts.msgId,
        event_id: opts.eventId,
      },
    })
  }

  async sendMarkdown(peerId, markdown, opts = {}) {
    return this.api(this.endpoint(peerId, opts.scope), {
      method: 'POST',
      body: {
        markdown: typeof markdown === 'string' ? { content: markdown } : markdown,
        msg_type: 2,
        msg_id: opts.msgId,
        event_id: opts.eventId,
      },
    })
  }

  async sendKeyboard(peerId, content, keyboard, opts = {}) {
    return this.api(this.endpoint(peerId, opts.scope), {
      method: 'POST',
      body: {
        content: stringValue(content),
        keyboard,
        msg_type: 2,
        msg_id: opts.msgId,
        event_id: opts.eventId,
      },
    })
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
    const endpoint = this.endpoint(peerId, opts.scope, 'stream-messages')
    return this.api(endpoint, {
      method: 'POST',
      body: {
        content: stringValue(content).slice(0, MAX_MESSAGE_CHARS),
        msg_type: 0,
        msg_id: opts.msgId,
        event_id: opts.eventId,
      },
    })
  }

  async respondInteraction(interactionId, response) {
    return this.api(`/interactions/${encodeURIComponent(interactionId)}`, {
      method: 'PUT',
      body: response,
    })
  }

  async sendTyping() { return { ok: false, unsupported: true } }

  setCredentials(values = {}) {
    for (const key of ['appId', 'clientSecret', 'accessToken', 'accessTokenExpiresAt', 'gatewayUrl', 'intents']) {
      if (values[key] !== undefined) this.config[key] = values[key]
    }
    if (values.accountId !== undefined) this.accountId = values.accountId
  }
}

export const gatewayConstants = { API_BASE, TOKEN_URL, DEFAULT_GATEWAY, MAX_MESSAGE_CHARS, QQ_INTENTS }
