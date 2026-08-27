// Telegram Bot Gateway
// Official API: https://core.telegram.org/bots/api
//
// 纯拉取式长轮询（getUpdates），免公网 IP，免 Webhook 域名。
// 零第三方依赖：
//   - 标准 HTTP/HTTPS CONNECT 隧道代理（支持国内 Clash/v2ray/Squid 等 HTTP/HTTPS 代理）
//   - 原生 fetch / multipart 表单文件上传
//   - 健壮的 HTML 安全格式化与纯文本自动降级重试

import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import https from 'node:https'
import tls from 'node:tls'
import { Service } from '@deepseek-ai/cordis'

const API_HOST = 'api.telegram.org'
const TELEGRAM_API_BASE = 'https://api.telegram.org'
const POLL_TIMEOUT_SEC = 30
const MAX_MESSAGE_CHARS = 4096

/**
 * 构造标准 HTTP CONNECT 代理 Agent（零依赖，适用于 https 请求）
 */
export function createConnectProxyAgent(proxyUrl) {
  if (!proxyUrl || typeof proxyUrl !== 'string') return undefined
  let parsed
  try {
    parsed = new URL(proxyUrl)
  } catch {
    return undefined
  }

  const proxyHost = parsed.hostname
  const proxyPort = Number(parsed.port) || 8080
  const authHeader = parsed.username
    ? 'Basic ' + Buffer.from(`${decodeURIComponent(parsed.username)}:${decodeURIComponent(parsed.password)}`).toString('base64')
    : undefined

  return new https.Agent({
    keepAlive: true,
    createConnection(opts, callback) {
      const connectReq = http.request({
        host: proxyHost,
        port: proxyPort,
        method: 'CONNECT',
        path: `${opts.host}:${opts.port || 443}`,
        headers: authHeader ? { 'Proxy-Authorization': authHeader } : {},
      })

      connectReq.on('connect', (res, socket) => {
        if (res.statusCode !== 200) {
          socket.destroy()
          return callback(new Error(`Proxy CONNECT failed with HTTP ${res.statusCode}`))
        }
        const tlsSocket = tls.connect({
          host: opts.host,
          socket,
          servername: opts.servername || opts.host,
        })
        callback(null, tlsSocket)
      })

      connectReq.on('error', (err) => callback(err))
      connectReq.end()
    },
  })
}

/**
 * 转换普通 Markdown / 纯文本为安全的 Telegram HTML，避免 MarkdownV2 转义地狱
 */
export function formatTelegramHtml(text) {
  if (!text || typeof text !== 'string') return ''

  // 1. 提取并保护代码块 ```lang ... ```
  const codeBlocks = []
  let safeText = text.replace(/```([a-zA-Z0-9_-]*)\r?\n?([\s\S]*?)```/g, (_, lang, code) => {
    const idx = codeBlocks.length
    codeBlocks.push({ lang: lang ? lang.trim() : '', code })
    return `%%TG_CODE_${idx}%%`
  })

  // 2. 提取并保护行内代码
  const inlineCodes = []
  safeText = safeText.replace(/`([^`\r\n]+)`/g, (_, code) => {
    const idx = inlineCodes.length
    inlineCodes.push(code)
    return `%%TG_INLINE_${idx}%%`
  })

  // 3. 提取并保护 Markdown 链接 [text](url)
  const links = []
  safeText = safeText.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, linkText, url) => {
    const idx = links.length
    links.push({ text: linkText, url })
    return `%%TG_LINK_${idx}%%`
  })

  // 4. 全局 HTML 实体转义
  safeText = safeText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // 5. 转换 Markdown 标题 (#, ##, ###, ####, etc.) 为加粗标题
  safeText = safeText.replace(/^#{1,6}\s+(.+)$/gm, '<b>$1</b>')

  // 6. 转换 Markdown 引用块 (> text 或 &gt; text) 为 <blockquote>
  safeText = safeText.replace(/^(?:&gt;|>)\s*(.+)$/gm, '<blockquote>$1</blockquote>')

  // 7. 转换无序列表符号 (* item, - item) 为友好圆点 •
  safeText = safeText.replace(/^(\s*)[*-]\s+(.+)$/gm, '$1• $2')

  // 8. 转换水平分割线 (---, ***, ___)
  safeText = safeText.replace(/^([-*_]){3,}$/gm, '───────────────')

  // 9. Markdown 加粗与斜体转换
  safeText = safeText
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/__(.+?)__/g, '<b>$1</b>')
    .replace(/~~(.+?)~~/g, '<s>$1</s>')
    .replace(/(?<!\*)\*([^*\r\n]+)\*(?!\*)/g, '<i>$1</i>')

  // 10. 还原 Markdown 链接
  safeText = safeText.replace(/%%TG_LINK_(\d+)%%/g, (_, idx) => {
    const link = links[Number(idx)]
    if (!link) return ''
    const escapedText = link.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    return `<a href="${link.url}">${escapedText}</a>`
  })

  // 11. 还原行内代码（HTML 转义其内容）
  safeText = safeText.replace(/%%TG_INLINE_(\d+)%%/g, (_, idx) => {
    const raw = inlineCodes[Number(idx)] || ''
    const escaped = raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    return `<code>${escaped}</code>`
  })

  // 12. 还原代码块
  safeText = safeText.replace(/%%TG_CODE_(\d+)%%/g, (_, idx) => {
    const item = codeBlocks[Number(idx)] || { lang: '', code: '' }
    const rawCode = item.code.replace(/^\r?\n/, '').replace(/\r?\n$/, '')
    const escaped = rawCode.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    if (item.lang) {
      return `<pre><code class="language-${item.lang}">${escaped}</code></pre>`
    }
    return `<pre><code>${escaped}</code></pre>`
  })

  return safeText
}

export class TelegramGateway extends Service {
  static name = 'telegram'

  constructor(ctx, config = {}) {
    super(ctx, 'telegram', true)
    this.ctx = ctx
    this.logger = ctx.logger?.('telegram') ?? console
    this.config = {
      botToken: config.botToken ?? process.env.TELEGRAM_BOT_TOKEN ?? '',
      proxy: config.proxy ?? process.env.HTTPS_PROXY ?? process.env.ALL_PROXY ?? process.env.http_proxy ?? '',
      apiBase: config.apiBase ?? TELEGRAM_API_BASE,
      pollTimeoutSec: config.pollTimeoutSec ?? POLL_TIMEOUT_SEC,
      ...config,
    }

    this.botInfo = null
    this.status = 'idle'
    this._polling = false
    this._stopPolling = false
    this._offset = 0
    this._seenUpdates = new Set()
    this._agent = undefined

    if (this.config.proxy) {
      this._agent = createConnectProxyAgent(this.config.proxy)
    }
  }

  get configured() {
    return Boolean(this.config.botToken && String(this.config.botToken).includes(':'))
  }

  get accountId() {
    return this.botInfo?.username ? `@${this.botInfo.username}` : (this.botInfo?.id ? String(this.botInfo.id) : '')
  }

  get capabilities() {
    return {
      supportsGroup: true,
      group: true,
      media: true,
      approvals: true,
      maxMessageChars: MAX_MESSAGE_CHARS,
    }
  }

  setStatus(status, detail = null) {
    this.status = status
    this.ctx.emit('telegram/status', {
      status,
      configured: this.configured,
      botInfo: this.botInfo,
      detail,
    })
  }

  /**
   * 底层 HTTP 请求封装，支持代理 Agent 与统一错误解析
   */
  async request(method, params = {}, { isMultipart = false, formData = null } = {}) {
    if (!this.config.botToken) throw new Error('Telegram botToken is required')

    const url = `${this.config.apiBase}/bot${this.config.botToken}/${method}`

    if (isMultipart && formData) {
      const resp = await fetch(url, {
        method: 'POST',
        body: formData,
        dispatcher: this._agent,
      })
      const data = await resp.json()
      if (!data.ok) {
        throw new Error(data.description || `Telegram API error ${data.error_code}`)
      }
      return data.result
    }

    return new Promise((resolve, reject) => {
      const bodyStr = JSON.stringify(params)
      const parsedUrl = new URL(url)

      const reqOpts = {
        protocol: parsedUrl.protocol,
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 443,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(bodyStr),
        },
        agent: this._agent,
        timeout: (this.config.pollTimeoutSec + 15) * 1000,
      }

      const req = https.request(reqOpts, (res) => {
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => {
          try {
            const raw = Buffer.concat(chunks).toString('utf8')
            const data = JSON.parse(raw)
            if (!data.ok) {
              const err = new Error(data.description || `Telegram API error ${data.error_code}`)
              err.errorCode = data.error_code
              return reject(err)
            }
            resolve(data.result)
          } catch (e) {
            reject(new Error(`Failed to parse Telegram API response: ${e.message}`))
          }
        })
      })

      req.on('error', (err) => reject(err))
      req.on('timeout', () => {
        req.destroy(new Error('Telegram API request timed out'))
      })
      req.write(bodyStr)
      req.end()
    })
  }

  // ---- 生命周期 ----

  async start() {
    if (this._startingPromise) return this._startingPromise
    if (!this.configured) {
      this.logger.info?.('[dsh-bridge telegram] not configured (missing botToken); staying idle')
      this.setStatus('idle')
      return false
    }

    this._startingPromise = (async () => {
      this._stopPolling = false
      this.setStatus('connecting')
      if (this.config.proxy) {
        this._agent = createConnectProxyAgent(this.config.proxy)
      }

      try {
        this.botInfo = await this.request('getMe')
        this.logger.info?.(`[dsh-bridge telegram] authenticated as @${this.botInfo.username} (id=${this.botInfo.id})`)
        this.setStatus('online')
        void this.registerCommands().catch(() => {})
        this._startPollLoop()
        return true
      } catch (err) {
        this.logger.error?.('[dsh-bridge telegram] getMe error:', err.message)
        this.setStatus('error', err.message)
        return false
      } finally {
        this._startingPromise = null
      }
    })()

    return this._startingPromise
  }

  /**
   * 自动向 Telegram 注册原生快捷指令菜单（输入 / 或点击 Menu 菜单时展示）
   */
  async registerCommands() {
    const commands = [
      { command: 'new', description: '新建会话并开始执行 (/new <提示词>)' },
      { command: 'sessions', description: '列出所有会话列表与切换' },
      { command: 'use', description: '切换活动会话 (/use <N>)' },
      { command: 'workspaces', description: '列出本地所有可用工作区' },
      { command: 'status', description: '查看 Agent 状态与会话摘要' },
      { command: 'stop', description: '停止当前正在运行的任务' },
      { command: 'end', description: '结束当前活动会话' },
      { command: 'help', description: '显示快捷按键与完整帮助' },
    ]
    try {
      // 1. 设置全局默认范围
      await this.request('setMyCommands', { commands, scope: { type: 'default' } })
      // 2. 设置单聊私聊范围（确保私聊立即生效）
      await this.request('setMyCommands', { commands, scope: { type: 'all_private_chats' } })
      // 3. 设置群聊范围
      await this.request('setMyCommands', { commands, scope: { type: 'all_group_chats' } })
      // 4. 设置左下角菜单按键为命令列表
      await this.request('setChatMenuButton', { menu_button: { type: 'commands' } }).catch(() => {})
      this.logger.info?.('[dsh-bridge telegram] bot command menu & menu button registered successfully')
    } catch (err) {
      this.logger.warn?.('[dsh-bridge telegram] setMyCommands failed: %s', err?.message ?? err)
    }
  }

  async stop() {
    this._stopPolling = true
    this._polling = false
    this._startingPromise = null
    this.setStatus('idle')
  }

  // ---- 长轮询 Poll 循环 ----

  _startPollLoop() {
    if (this._polling) return
    this._polling = true

    ;(async () => {
      let consecutiveErrors = 0
      while (!this._stopPolling && this.configured) {
        try {
          const updates = await this.request('getUpdates', {
            offset: this._offset,
            timeout: this.config.pollTimeoutSec,
            allowed_updates: ['message', 'callback_query'],
          })

          consecutiveErrors = 0
          if (this.status !== 'online') this.setStatus('online')

          if (this._stopPolling) break

          if (Array.isArray(updates) && updates.length > 0) {
            for (const update of updates) {
              if (this._stopPolling) break
              if (this._seenUpdates.has(update.update_id)) continue
              this._seenUpdates.add(update.update_id)
              if (this._seenUpdates.size > 2000) {
                const first = this._seenUpdates.values().next().value
                this._seenUpdates.delete(first)
              }

              this._offset = Math.max(this._offset, update.update_id + 1)
              this._dispatchUpdate(update)
            }
          }
        } catch (err) {
          if (this._stopPolling) break
          consecutiveErrors += 1
          const backoffSec = Math.min(30, 2 ** Math.min(consecutiveErrors, 5))
          this.logger.warn?.(`[dsh-bridge telegram] poll error: ${err.message}, retrying in ${backoffSec}s...`)
          this.setStatus('reconnecting', err.message)
          await new Promise((r) => setTimeout(r, backoffSec * 1000))
        }
      }
      this._polling = false
    })()
  }

  _dispatchUpdate(update) {
    if (update.message) {
      this._handleInboundMessage(update.message)
    } else if (update.callback_query) {
      this._handleCallbackQuery(update.callback_query)
    }
  }

  _handleInboundMessage(msg) {
    const chatId = msg.chat?.id
    if (!chatId) return

    const isGroup = msg.chat.type === 'group' || msg.chat.type === 'supergroup'
    const senderId = msg.from?.id ? String(msg.from.id) : String(chatId)
    const senderUsername = msg.from?.username ? `@${msg.from.username}` : senderId

    let text = msg.text || msg.caption || ''
    if (isGroup && this.botInfo?.username) {
      const atMention = `@${this.botInfo.username}`
      if (text.includes(atMention)) {
        text = text.replace(new RegExp(atMention, 'gi'), '').trim()
      }
    }

    this.ctx.emit('telegram/message', {
      chatId: String(chatId),
      senderId: String(senderId),
      senderUsername,
      isGroup,
      messageId: msg.message_id,
      text,
      raw: msg,
    })
  }

  _handleCallbackQuery(query) {
    const queryId = query.id
    const chatId = query.message?.chat?.id
    const messageId = query.message?.message_id
    const operatorId = query.from?.id ? String(query.from.id) : ''
    const data = query.data || ''

    this.ctx.emit('telegram/action', {
      queryId,
      chatId: String(chatId),
      messageId,
      operatorId,
      data,
      raw: query,
    })
  }

  // ---- 出站 API ----

  /**
   * 发送文本/Markdown 消息（自动尝试 HTML 模式，失败自动降级为无格式纯文本重试）
   */
  async sendText(chatId, text, opts = {}) {
    if (!chatId || !text) return null
    const safeHtml = formatTelegramHtml(text)

    const params = {
      chat_id: chatId,
      text: safeHtml,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      ...opts,
    }

    try {
      return await this.request('sendMessage', params)
    } catch (err) {
      if (err.errorCode === 400 || String(err.message).includes('can\'t parse')) {
        this.logger.warn?.(`[dsh-bridge telegram] HTML parse failed, falling back to plain text for chat ${chatId}`)
        return await this.request('sendMessage', {
          chat_id: chatId,
          text: String(text).slice(0, MAX_MESSAGE_CHARS),
          disable_web_page_preview: true,
          ...opts,
          parse_mode: undefined,
        })
      }
      throw err
    }
  }

  /**
   * 发送带 Inline Keyboard 按钮的消息（常用于操作审批）
   */
  async sendKeyboard(chatId, text, buttons = []) {
    const inline_keyboard = buttons.map((row) =>
      row.map((btn) => ({
        text: btn.text,
        callback_data: btn.callback_data || btn.action || btn.text,
      })),
    )

    return this.sendText(chatId, text, {
      reply_markup: { inline_keyboard },
    })
  }

  /**
   * 原地编辑已发送消息
   */
  async editMessageText(chatId, messageId, text, opts = {}) {
    if (!chatId || !messageId || !text) return null
    const safeHtml = formatTelegramHtml(text)

    const params = {
      chat_id: chatId,
      message_id: messageId,
      text: safeHtml,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      ...opts,
    }

    try {
      return await this.request('editMessageText', params)
    } catch (err) {
      if (err.errorCode === 400 || String(err.message).includes('can\'t parse')) {
        return await this.request('editMessageText', {
          chat_id: chatId,
          message_id: messageId,
          text: String(text).slice(0, MAX_MESSAGE_CHARS),
          disable_web_page_preview: true,
          ...opts,
          parse_mode: undefined,
        })
      }
      if (String(err.message).includes('message is not modified')) return null
      throw err
    }
  }

  /**
   * 回应 CallbackQuery（关闭加载圈并弹窗提示）
   */
  async answerCallbackQuery(queryId, text = '', showAlert = false) {
    if (!queryId) return
    try {
      return await this.request('answerCallbackQuery', {
        callback_query_id: queryId,
        text,
        show_alert: showAlert,
      })
    } catch (err) {
      this.logger.warn?.('[dsh-bridge telegram] answerCallbackQuery error:', err.message)
    }
  }

  /**
   * 发送打字指示
   */
  async sendTyping(chatId) {
    if (!chatId) return
    try {
      return await this.request('sendChatAction', {
        chat_id: chatId,
        action: 'typing',
      })
    } catch {}
  }

  /**
   * 发送本地媒体文件（自动识别图片通过 sendPhoto，其他通过 sendDocument）
   */
  async sendMediaFile(chatId, filePath, opts = {}) {
    if (!chatId || !filePath || !fs.existsSync(filePath)) return null
    const ext = path.extname(filePath).toLowerCase()
    const isImage = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'].includes(ext)
    const method = isImage ? 'sendPhoto' : 'sendDocument'
    const fieldName = isImage ? 'photo' : 'document'

    try {
      const buffer = await fs.promises.readFile(filePath)
      const fileName = path.basename(filePath)
      const blob = new Blob([buffer])
      const formData = new FormData()
      formData.append('chat_id', String(chatId))
      formData.append(fieldName, blob, fileName)
      if (opts.caption) formData.append('caption', opts.caption)

      return await this.request(method, {}, { isMultipart: true, formData })
    } catch (err) {
      this.logger.warn?.(`[dsh-bridge telegram] sendMediaFile (${filePath}) error: ${err.message}`)
      return null
    }
  }

  /**
   * 下载 Telegram 文件
   */
  async downloadFile(fileId, sessionCwd) {
    if (!fileId) return null
    try {
      const fileInfo = await this.request('getFile', { file_id: fileId })
      if (!fileInfo?.file_path) return null

      const downloadUrl = `${this.config.apiBase}/file/bot${this.config.botToken}/${fileInfo.file_path}`
      const resp = await fetch(downloadUrl, { dispatcher: this._agent })
      if (!resp.ok) throw new Error(`Download HTTP ${resp.status}`)

      const buf = Buffer.from(await resp.arrayBuffer())
      const mediaDir = path.join(sessionCwd || process.cwd(), '.telegram-media')
      await fs.promises.mkdir(mediaDir, { recursive: true })

      const ext = path.extname(fileInfo.file_path) || '.bin'
      const safeName = `tg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`
      const fullPath = path.join(mediaDir, safeName)
      await fs.promises.writeFile(fullPath, buf)
      return { path: fullPath, filename: safeName, size: buf.length }
    } catch (err) {
      this.logger.warn?.(`[dsh-bridge telegram] downloadFile error: ${err.message}`)
      return null
    }
  }

  setCredentials(values = {}) {
    for (const key of ['botToken', 'proxy', 'apiBase', 'pollTimeoutSec']) {
      if (values[key] !== undefined) this.config[key] = values[key]
    }
    if (this.config.proxy) {
      this._agent = createConnectProxyAgent(this.config.proxy)
    } else {
      this._agent = undefined
    }
  }

  dispose() {
    void this.stop()
  }
}
