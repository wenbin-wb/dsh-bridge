// dsh-bridge WeChat conversation node
//
// 微信 ⇄ DSH 会话桥：把 iLink 入站消息路由到 DSH agent 会话，并把会话事件以 digest
// 摘要形式回传到微信。负责：白名单、会话切换/新建/停止、审批问答、出站分块限流。
//
// 由 Jesse-njx/dsh-chatnode-wechat 移植精简而来。消费的 DSH 服务：
//   ctx.wechat    （本插件 gateway 提供）sendText/sendTyping/accountId
//   ctx.sessions  （DSH 宿主提供）list/get
//   ctx.agents    （DSH 宿主提供）create/get
//   ctx.approval  （DSH 宿主提供）approval/request 事件
//
// 安全边界：强制白名单（allowFrom），非白名单发件人绝不喂给模型。

import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { randomUUID } from 'node:crypto'
import { statSync } from 'node:fs'
import { gatewayConstants } from './gateway.js'

const MAX_MESSAGE_CHARS = gatewayConstants.MAX_MESSAGE_CHARS

// ---------------------------------------------------------------------------
// 出站分块（移植 hermes-agent _split_text_for_weixin_delivery）
// ---------------------------------------------------------------------------

const FENCE_RE = /^```([^\n`]*)\s*$/

function normalizeMarkdownBlocks(content) {
  const lines = content.split('\n')
  const out = []
  let blankRun = 0
  let inCode = false
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '')
    if (FENCE_RE.test(line.trim())) {
      inCode = !inCode
      out.push(line)
      blankRun = 0
      continue
    }
    if (inCode) {
      out.push(line)
      continue
    }
    if (!line.trim()) {
      blankRun += 1
      if (blankRun <= 1) out.push('')
      continue
    }
    blankRun = 0
    out.push(line)
  }
  return out.join('\n').trim()
}

function splitMarkdownBlocks(content) {
  const blocks = []
  let current = []
  let inCode = false
  const flush = () => {
    const block = current.join('\n').trim()
    if (block) blocks.push(block)
    current = []
  }
  for (const raw of content.split('\n')) {
    const line = raw.replace(/\s+$/, '')
    if (FENCE_RE.test(line.trim())) {
      if (!inCode && current.length) flush()
      current.push(line)
      inCode = !inCode
      if (!inCode) flush()
      continue
    }
    if (inCode) {
      current.push(line)
      continue
    }
    if (!line.trim()) {
      flush()
      continue
    }
    current.push(line)
  }
  flush()
  return blocks
}

function hardSplit(text, max) {
  const chunks = []
  let rest = text
  while (rest.length > max) {
    chunks.push(rest.slice(0, max))
    rest = rest.slice(max)
  }
  if (rest) chunks.push(rest)
  return chunks
}

function packBlocks(blocks, max) {
  const units = []
  let current = ''
  for (const block of blocks) {
    const candidate = current ? `${current}\n\n${block}` : block
    if (candidate.length <= max) {
      current = candidate
      continue
    }
    if (current) units.push(current)
    if (block.length <= max) {
      current = block
    } else {
      units.push(...hardSplit(block, max))
      current = ''
    }
  }
  if (current) units.push(current)
  return units
}

function splitForWechat(content, max = MAX_MESSAGE_CHARS) {
  const normalized = normalizeMarkdownBlocks(content)
  if (!normalized) return []
  if (normalized.length <= max) return [normalized]
  return packBlocks(splitMarkdownBlocks(normalized), max)
}

function textOfAssistantMessage(message) {
  return (message.content ?? [])
    .filter((block) => block?.type === 'text')
    .map((block) => block.text)
    .join('\n')
}

// ---------------------------------------------------------------------------
// digest 摘要
// ---------------------------------------------------------------------------

function digestLine(session) {
  let turn = 0
  let tools = 0
  let lastTool = undefined
  let inTurn = false
  for (const event of session.events ?? []) {
    if (event.type === 'turn/start') {
      turn = event.data.turn
      inTurn = true
      tools = 0
      lastTool = undefined
    } else if (event.type === 'turn/end') {
      inTurn = false
    } else if (event.type === 'tool/call' && inTurn) {
      tools += 1
      lastTool = event.data.name
    }
  }
  const steps = tools > 0 ? `${tools} 次工具调用` : '思考中'
  const last = lastTool ? ` | 最近: ${lastTool}` : ''
  return `[处理中] 第 ${turn} 轮 | ${steps}${last}`
}

// ---------------------------------------------------------------------------
// 出站
// ---------------------------------------------------------------------------

async function sendTextToPeer(node, text) {
  const peer = node.peerId
  if (!peer) return
  const chunks = splitForWechat(text, node.config.maxMessageChars)
  if (chunks.length === 0) return
  await node.ctx.wechat.sendTyping(peer, 1).catch(() => {})
  try {
    for (let i = 0; i < chunks.length; i++) {
      const result = await node.ctx.wechat.sendText(peer, chunks[i])
      if (!result.success) {
        node.logger?.warn?.(`[dsh-bridge wechat] outbound chunk ${i + 1}/${chunks.length} failed: ${result.error}`)
        break
      }
      if (i < chunks.length - 1 && node.config.sendChunkDelayMs > 0) {
        await sleep(node.config.sendChunkDelayMs)
      }
    }
  } finally {
    await node.ctx.wechat.sendTyping(peer, 2).catch(() => {})
  }
}

// ---------------------------------------------------------------------------
// 会话桥编排
// ---------------------------------------------------------------------------

// 纯文本标记（用户偏好不用 emoji）
const MARK = {
  ok: '[OK]',
  err: '[错误]',
  stop: '[已停止]',
  idle: '[空闲]',
  turn: '[新会话]',
  ask: '[待确认]',
  welcome: '[微信 Bot]',
  list: '[会话列表]',
  status: '[状态]',
  warn: '[注意]',
}

export class WechatConversationNode {
  constructor(ctx, config, logger, { onFirstSender, onActiveSessionChange } = {}) {
    this.ctx = ctx
    this.logger = logger
    this.onFirstSender = onFirstSender
    this.onActiveSessionChange = onActiveSessionChange
    this.config = {
      allowFrom: Array.isArray(config.allowFrom) ? config.allowFrom : [],
      digestIntervalSec: config.digestIntervalSec ?? 300,
      approvalTimeoutSec: config.approvalTimeoutSec ?? 600,
      maxMessageChars: config.maxMessageChars ?? MAX_MESSAGE_CHARS,
      sendChunkDelayMs: config.sendChunkDelayMs ?? 1500,
      cwd: config.cwd,
      agentPreset: config.agentPreset,
      agentProvider: config.agentProvider,
      agentModel: config.agentModel,
    }
    // 从配置恢复活动会话（v0.2.1：重启后保持会话）
    // 注意：不在构造函数里调用 _pickDefaultSession()，由 loadConfig 回调负责恢复，避免竞态覆盖
    this.activeSessionId = config.activeSessionId ?? null
    this.peerId = null
    this.pending = new Map() // number -> PendingApproval
    this.approvalCounter = 0
    this.disposers = []

    this._attachOutbound()
    this._attachApprovalBridge()
    this.ctx.on('wechat/message', (message) => {
      void this._handleInbound(message)
    })
  }

  get gatewayAccountId() {
    return this.ctx.wechat?.accountId ?? ''
  }

  activeSession() {
    if (!this.activeSessionId) return undefined
    return this.ctx.sessions?.get(this.activeSessionId)
  }

  activeAgent() {
    if (!this.activeSessionId) return undefined
    return this.ctx.agents?.get(this.activeSessionId)
  }

  ownsAgent(agent) {
    return this.activeSessionId !== null && agent?.session?.id === this.activeSessionId
  }

  isAllowed(senderId) {
    return Array.isArray(this.config.allowFrom) && this.config.allowFrom.includes(senderId)
  }

  setActiveSession(session) {
    this.activeSessionId = session.id
    // 持久化活动会话 ID
    try { this.onActiveSessionChange?.(session.id) } catch { /* 持久化失败不致命 */ }
  }

  // 仅按 ID 设置活动会话（持久化会话可能没有内存 session 对象），
  // 发消息时通过 re-attach 逻辑拉起 agent。
  setActiveSessionById(id) {
    if (!id) return
    this.activeSessionId = id
    try { this.onActiveSessionChange?.(id) } catch { /* 持久化失败不致命 */ }
  }

  async _pickDefaultSession() {
    const sessions = await listSessions(this)
    if (sessions.length > 0) this.setActiveSessionById(sessions[0].id)
  }

  async createSession(prompt, cwdOverride) {
    // 使用 DSH 原生格式 session-${uuid}，与 ctx.sessions 持久化系统兼容
    const sessionId = `session-${randomUUID()}`
    try {
      const cwd = cwdOverride || this.config.cwd || process.cwd()
      // 校验指定目录存在且是目录
      if (cwdOverride) {
        let ok = false
        try { ok = statSync(cwd).isDirectory() } catch { ok = false }
        if (!ok) {
          await sendTextToPeer(this, `${MARK.err} 工作区目录不存在: ${cwd}`)
          return
        }
      }
      const meta = {
        cwd,
        agentPreset: this.config.agentPreset || 'routing-suite',
      }
      const agentOptions = {}
      if (this.config.agentProvider) agentOptions.provider = this.config.agentProvider
      if (this.config.agentModel) agentOptions.model = this.config.agentModel
      if (!agentOptions.provider || !agentOptions.model) {
        try {
          const def = this.ctx.get?.('agentDefaultModel')?.currentSelection?.()
          if (def) {
            if (!agentOptions.provider && def.provider) agentOptions.provider = def.provider
            if (!agentOptions.model && def.model) agentOptions.model = def.model
          }
        } catch { /* 默认模型服务不可用则忽略，交由 DSH 自行处理 */ }
      }
      // 注意：不预创建 ctx.sessions——agents.create 会自己 prepare+enter session
      const handle = await this.ctx.agents.create({ sessionId, meta, agentOptions })
      this.setActiveSession(handle.agent.session)
      if (prompt) {
        handle.agent.followup(createUserMessage({
          content: [{ type: 'text', text: prompt }],
          source: { kind: 'user' },
        }))
      }
      await sendTextToPeer(this, `${MARK.turn} 已创建会话 ${handle.agent.session.id}${cwdOverride ? `（工作区: ${cwdOverride}）` : ''}${prompt ? '' : '（发消息即可开始）'}`)
    } catch (error) {
      await sendTextToPeer(this, `${MARK.err} 创建会话失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // ---- 审批 ----

  nextApprovalNumber() {
    this.approvalCounter += 1
    return this.approvalCounter
  }

  registerApproval(number, approval) {
    this.pending.set(number, approval)
  }

  clearApproval(number) {
    const entry = this.pending.get(number)
    if (entry) {
      clearTimeout(entry.timer)
      this.pending.delete(number)
    }
  }

  resolveApproval(text) {
    const entries = [...this.pending.entries()]
    if (entries.length === 0) return false
    let outcome
    if (text === '/yes') outcome = 'allowed-once'
    else if (text === '/no') outcome = 'rejected'
    if (outcome) {
      const [number, entry] = entries[entries.length - 1]
      this.clearApproval(number)
      entry.resolve(outcome)
      return true
    }
    if ((text === '1' || text === '2') && entries.length === 1) {
      const [number, entry] = entries[0]
      this.clearApproval(number)
      entry.resolve(text === '1' ? 'allowed-once' : 'rejected')
      return true
    }
    return false
  }

  dispose() {
    for (const disposer of this.disposers) {
      try { disposer() } catch { /* 忽略 */ }
    }
    this.disposers = []
    for (const number of [...this.pending.keys()]) this.clearApproval(number)
  }

  // ---- 入站 ----

  async _handleInbound(message) {
    const sender = String(message.from_user_id ?? '').trim()
    if (!sender) return

    // 调试：记录收到的消息类型
    const items = message.item_list ?? []
    const itemTypes = items.map((it) => it.type).join(',')
    this.logger?.info?.(`[dsh-bridge wechat] received message from ${sender}, item_types=[${itemTypes}]`)

    if (!this.isAllowed(sender)) {
      // 扫码即自动加入：白名单为空时，首个给 Bot 发消息的真实用户（"扫码验收人"）
      // 自动纳入白名单。这是"扫码登录后第一条消息即完成授权"的一步到位体验。
      if (this.config.allowFrom.length === 0 && !isGroupMessage(message, this.gatewayAccountId)) {
        const text0 = extractText(message)
        if (text0.trim()) {
          this.config.allowFrom = [sender]
          this.logger?.info?.(`[dsh-bridge wechat] auto-approved first sender ${sender} into allowlist (scan onboarding)`)
          try { await this.onFirstSender?.(sender) } catch { /* 持久化失败不致命 */ }
        } else {
          this.logger?.info?.(`[dsh-bridge wechat] media-only first message from ${sender} not auto-approved (waiting for text)`)
        }
      } else {
        this.logger?.info?.(`[dsh-bridge wechat] ignore message from non-allowlisted sender ${sender} (never fed to model)`)
        return
      }
    }
    if (isGroupMessage(message, this.gatewayAccountId)) {
      this.logger?.info?.(`[dsh-bridge wechat] ignore group message from ${sender} (v0.1: no group support)`)
      return
    }

    // v0.2: 处理媒体项（图片/文件/语音/视频）
    this.logger?.info?.(`[dsh-bridge wechat] processing media items for ${sender}...`)
    let mediaFiles = []
    let hadMediaItems = false
    let mediaError = null
    let debugInfo = [] // 调试信息
    try {
      const items = message.item_list ?? []
      hadMediaItems = items.some((it) => it.type === 2 || it.type === 4 || it.type === 5) // 图片/文件/视频
      const result = await this._processMediaItems(message, sender)
      mediaFiles = result.files
      debugInfo = result.debug
      this.logger?.info?.(`[dsh-bridge wechat] media processing done, got ${mediaFiles.length} files`)
    } catch (error) {
      // 尽可能捕获完整错误信息
      mediaError = error?.message || error?.toString?.() || JSON.stringify(error) || '未知错误'
      this.logger?.error?.(`[dsh-bridge wechat] media processing failed: ${mediaError}`, error)
      // 媒体处理失败不阻断文本消息处理
    }
    
    const text = extractText(message)
    if (!text.trim() && mediaFiles.length === 0) {
      // 如果原消息有媒体项但下载失败，给用户提示（包含错误详情+调试信息）
      if (hadMediaItems) {
        let errMsg = mediaError ? `媒体处理失败: ${mediaError.substring(0, 150)}` : '媒体消息处理失败'
        if (debugInfo.length > 0) {
          errMsg += `\n调试信息:\n${debugInfo.join('\n')}`
        }
        await sendTextToPeer(this, `${MARK.err} ${errMsg}`)
        return
      }
      this.logger?.info?.(`[dsh-bridge wechat] ignore empty message from ${sender}`)
      return
    }

    this.peerId = sender

    // 构建完整消息内容（文本 + 媒体文件路径）
    let fullText = text
    if (mediaFiles.length > 0) {
      const mediaDesc = mediaFiles.map((f) => `[文件: ${f.path}]`).join('\n')
      fullText = fullText ? `${text}\n\n${mediaDesc}` : mediaDesc
    }

    if (await routeCommand(this, fullText)) return

    let agent = this.activeAgent()
    if (!agent && this.activeSessionId) {
      // agent 不在内存（DSH 重启后或切换到持久化会话）→ re-attach。
      // agents.create(sessionId) 对已持久化的 session 会自动采纳其历史，对不存在的则新建。
      try {
        const meta = {
          cwd: this.config.cwd || process.cwd(),
          agentPreset: this.config.agentPreset || 'routing-suite',
        }
        const agentOptions = {}
        if (this.config.agentProvider) agentOptions.provider = this.config.agentProvider
        if (this.config.agentModel) agentOptions.model = this.config.agentModel
        if (!agentOptions.provider || !agentOptions.model) {
          try {
            const def = this.ctx.get?.('agentDefaultModel')?.currentSelection?.()
            if (def) {
              if (!agentOptions.provider && def.provider) agentOptions.provider = def.provider
              if (!agentOptions.model && def.model) agentOptions.model = def.model
            }
          } catch { /* ignore */ }
        }
        const handle = await this.ctx.agents.create({
          sessionId: this.activeSessionId,
          meta,
          agentOptions,
        })
        agent = handle.agent
        this.logger?.info?.(`[dsh-bridge wechat] re-attached agent to session ${this.activeSessionId}`)
      } catch (err) {
        this.logger?.warn?.(`[dsh-bridge wechat] failed to re-attach agent: ${err?.message ?? err}`)
      }
    }
    if (!agent) {
      await sendTextToPeer(this, `${MARK.idle} 没有活动会话。发送 /new <提示词> 开始一个新会话，或 /sessions 查看已有会话。`)
      return
    }

    const messageValue = createUserMessage({
      content: [{ type: 'text', text: fullText }],
      source: { kind: 'user' },
    })
    agent.followup(messageValue)
    await this.ctx.wechat.sendTyping(sender, 1).catch(() => {})
  }

  /**
   * 处理消息中的媒体项（v0.2）：下载、解密、保存到工作目录。
   * @returns {Promise<{files: Array<{type: string, path: string, size: number}>, debug: string[]}>}
   */
  async _processMediaItems(message, sender) {
    const items = message.item_list ?? []
    const mediaFiles = []
    const debugInfo = []
    
    for (const item of items) {
      try {
        if (item.type === 2) { // 图片：image_item.media 是 {encrypt_query_param, aes_key, encrypt_type} 对象
          const img = item.image_item
          if (!img) {
            const msg = `图片项缺少 image_item`
            this.logger?.warn?.(`[dsh-bridge wechat] ${msg}`)
            debugInfo.push(msg)
            continue
          }
          
          const aesKey = img.aeskey || img.aes_key || img.media?.aes_key
          if (!aesKey) {
            const fields = Object.keys(img).join(', ')
            const msg = `图片缺 aes_key，字段: ${fields}`
            this.logger?.warn?.(`[dsh-bridge wechat] ${msg}`)
            debugInfo.push(msg)
            continue
          }
          
          // 从 image_item.media 对象提取 CDN 下载参数
          const mediaObj = img.media
          const encryptedParam = mediaObj?.encrypt_query_param || mediaObj?.encrypted_query_param || mediaObj?.encrypt_query_param_full || mediaObj
          debugInfo.push(`media 类型: ${typeof mediaObj}, param=${!!encryptedParam && typeof mediaObj === 'object'}${typeof mediaObj === 'string' ? ' (字符串)' : ''}`)
          
          const file = await this._downloadMediaItem({
            encryptedQueryParam: mediaObj?.encrypt_query_param || (typeof mediaObj === 'string' ? mediaObj : undefined),
            fullUrl: mediaObj?.full_url || mediaObj?.url,
            aesKeyBase64: aesKey,
            sender,
            mediaType: 'image',
            filename: `image_${Date.now()}.jpg`,
          })
          if (file) {
            mediaFiles.push(file)
            debugInfo.push(`成功: ${file.size} 字节`)
          } else {
            debugInfo.push(`下载返回 null`)
          }
        } else if (item.type === 4) { // 文件：file_item.media 是 {encrypt_query_param, aes_key,...}
          const fileItem = item.file_item
          if (!fileItem) {
            debugInfo.push(`文件项缺少 file_item`)
            continue
          }
          const aesKey = fileItem.aes_key || fileItem.media?.aes_key
          const encryptedParam = fileItem.media?.encrypt_query_param || (typeof fileItem.media === 'string' ? fileItem.media : undefined)
          if (!encryptedParam || !aesKey) {
            debugInfo.push(`文件缺 media/aes_key，字段: ${Object.keys(fileItem).join(', ')}`)
            continue
          }
          const file = await this._downloadMediaItem({
            encryptedQueryParam: encryptedParam,
            fullUrl: fileItem.media?.full_url || fileItem.full_url,
            aesKeyBase64: aesKey,
            sender,
            mediaType: 'file',
            filename: fileItem.file_name || fileItem.filename || `file_${Date.now()}`,
          })
          if (file) {
            mediaFiles.push(file)
            debugInfo.push(`文件成功: ${file.size} 字节`)
          } else {
            debugInfo.push(`文件下载返回 null`)
          }
        } else if (item.type === 3) { // 语音（iLink 自动转文字，原始音频暂不下载）
          // 语音转文字已在 extractText 中作为文本提取；原始音频下载留待后续
          continue
        } else if (item.type === 5) { // 视频：video_item.media
          const video = item.video_item
          if (!video) {
            debugInfo.push(`视频项缺少 video_item`)
            continue
          }
          const aesKey = video.aes_key || video.media?.aes_key
          const encryptedParam = video.media?.encrypt_query_param || (typeof video.media === 'string' ? video.media : undefined)
          if (!encryptedParam || !aesKey) {
            debugInfo.push(`视频缺 media/aes_key，字段: ${Object.keys(video).join(', ')}`)
            continue
          }
          const file = await this._downloadMediaItem({
            encryptedQueryParam: encryptedParam,
            fullUrl: video.media?.full_url || video.full_url,
            aesKeyBase64: aesKey,
            sender,
            mediaType: 'video',
            filename: `video_${Date.now()}.mp4`,
          })
          if (file) {
            mediaFiles.push(file)
            debugInfo.push(`视频成功: ${file.size} 字节`)
          } else {
            debugInfo.push(`视频下载返回 null`)
          }
        }
      } catch (error) {
        const msg = `处理媒体项 type=${item.type} 失败: ${error?.message ?? error}`
        this.logger?.warn?.(`[dsh-bridge wechat] ${msg}`)
        debugInfo.push(msg)
      }
    }
    
    return { files: mediaFiles, debug: debugInfo }
  }

  /**
   * 下载并解密一个媒体项，保存到工作目录的 .wechat-media/ 子目录。
   * aesKeyBase64 可能为：base64(raw16) / base64(hex32) / 裸 hex32 字符串 —— 统一在 parseAesKey 归一化。
   */
  async _downloadMediaItem({ encryptedQueryParam, fullUrl, aesKeyBase64, sender, mediaType, filename }) {
    if (!encryptedQueryParam && !fullUrl) return null
    if (!aesKeyBase64) {
      this.logger?.warn?.(`[dsh-bridge wechat] media item missing aes_key, cannot decrypt`)
      return null
    }
    
    const { downloadMedia, normalizeAesKey } = await import('./media.js')
    // 图片的 image_item.aeskey 可能是裸 hex（32 字符），需归一化
    const normalizedKey = normalizeAesKey(aesKeyBase64)
    if (!normalizedKey) {
      this.logger?.warn?.(`[dsh-bridge wechat] media item aes_key 无法解析: ${aesKeyBase64.slice(0, 16)}...`)
      return null
    }
    const plaintext = await downloadMedia({
      encryptedQueryParam,
      fullUrl,
      aesKeyBase64: normalizedKey,
      timeoutMs: 60000,
    })
    
    // 保存到工作目录的 .wechat-media/ 子目录
    const { mkdir, writeFile } = await import('node:fs/promises')
    const { join } = await import('node:path')
    const cwd = this.config.cwd || process.cwd()
    const mediaDir = join(cwd, '.wechat-media')
    await mkdir(mediaDir, { recursive: true })
    
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filePath = join(mediaDir, `${Date.now()}_${safeName}`)
    await writeFile(filePath, plaintext)
    
    this.logger?.info?.(`[dsh-bridge wechat] downloaded ${mediaType} from ${sender}: ${filePath} (${plaintext.length} bytes)`)
    return { type: mediaType, path: filePath, size: plaintext.length }
  }

  // ---- 出站事件绑定 ----

  _attachOutbound() {
    const digestState = new Map()
    const stopHeartbeat = (state) => {
      if (state.heartbeat) {
        clearInterval(state.heartbeat)
        state.heartbeat = undefined
      }
    }
    const startHeartbeat = (session, state) => {
      stopHeartbeat(state)
      if (this.config.digestIntervalSec <= 0) return
      state.heartbeat = setInterval(() => {
        void sendTextToPeer(this, digestLine(session))
      }, this.config.digestIntervalSec * 1000)
      if (typeof state.heartbeat.unref === 'function') state.heartbeat.unref()
    }
    const onEvent = (session, event) => {
      if (session.id !== this.activeSessionId) return
      const state = digestState.get(session.id) ?? { startedTurns: new Set() }
      digestState.set(session.id, state)

      if (event.type === 'turn/start') {
        const turn = event.data.turn
        if (!state.startedTurns.has(turn)) {
          state.startedTurns.add(turn)
          // 不发送"[OK] 收到，开始处理…"，改用微信"正在输入…"指示 + 心跳进度。
          // 心跳（digestIntervalSec）会周期性报告"[处理中] 第 N 轮…"，避免刷屏。
          if (this.peerId) this.ctx.wechat.sendTyping(this.peerId, 1).catch(() => {})
        }
        startHeartbeat(session, state)
        return
      }
      if (event.type === 'assistant/message') {
        const text = textOfAssistantMessage(event.data.message)
        if (text.trim()) void sendTextToPeer(this, text)
        return
      }
      if (event.type === 'turn/end') {
        stopHeartbeat(state)
        // 停止"正在输入…"指示
        if (this.peerId) this.ctx.wechat.sendTyping(this.peerId, 2).catch(() => {})
        const reason = event.data.reason
        if (reason.kind === 'error') {
          void sendTextToPeer(this, `${MARK.err} 处理出错: ${summarizeError(reason.error)}`)
        } else if (reason.kind === 'aborted') {
          void sendTextToPeer(this, `${MARK.stop} 已停止`)
        } else if (reason.kind === 'max-tokens') {
          void sendTextToPeer(this, `${MARK.warn} 达到输出上限，本轮已截断`)
        }
        return
      }
    }
    const listener = (session, event) => onEvent(session, event)
    const disposer = this.ctx.on('session/event', listener)
    this.disposers.push(() => {
      for (const state of digestState.values()) stopHeartbeat(state)
      disposer()
    })
  }

  // ---- 审批桥 ----

  _attachApprovalBridge() {
    const listener = async (req, next) => {
      if (!this.ownsAgent(req.agent)) return next()
      const peer = this.peerId
      if (!peer) return next()

      const number = this.nextApprovalNumber()
      const timeoutSec = this.config.approvalTimeoutSec
      const prompt = [
        `${MARK.ask} #${number} 需要你的确认`,
        `工具: ${req.toolName}`,
        ...(req.reason ? [`原因: ${req.reason}`] : []),
        `回复 /yes 同意，/no 拒绝（仅一条待确认时也可回复 1/2）`,
        `${Math.max(1, Math.round(timeoutSec / 60))} 分钟内未回复将自动拒绝。`,
      ].join('\n')

      void sendTextToPeer(this, prompt)

      const outcome = await new Promise((resolve) => {
        const timer = setTimeout(() => {
          this.clearApproval(number)
          resolve('rejected')
        }, timeoutSec * 1000)
        if (typeof timer.unref === 'function') timer.unref()
        this.registerApproval(number, { number, request: req, resolve, timer })
      })

      const label = outcome === 'allowed-once' ? `${MARK.ok} 已同意` : outcome === 'rejected' ? `${MARK.err} 已拒绝` : `[${outcome}]`
      void sendTextToPeer(this, `${label}（#${number}）`)
      return outcome
    }
    const disposer = this.ctx.on('approval/request', listener)
    this.disposers.push(disposer)
  }
}

// ---------------------------------------------------------------------------
// 辅助
// ---------------------------------------------------------------------------

function isGroupMessage(message, accountId) {
  const roomId = String(message.room_id ?? message.chat_room_id ?? '').trim()
  if (roomId) return true
  const toUserId = String(message.to_user_id ?? '').trim()
  const sender = String(message.from_user_id ?? '').trim()
  return Boolean(toUserId && accountId && toUserId !== accountId && message.msg_type === 1)
}

function extractText(message) {
  const items = Array.isArray(message.item_list) ? message.item_list : []
  const texts = []
  for (const item of items) {
    if (item?.type === 1) {
      const text = String(item.text_item?.text ?? '')
      if (text.trim()) texts.push(text)
    } else if (item?.type === 3) {
      // 语音：iLink 自动转文字，在 voice_item.text 里
      const voiceText = String(item.voice_item?.text ?? '')
      if (voiceText.trim()) texts.push(voiceText)
    }
  }
  return texts.join('\n')
}

function summarizeError(error) {
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message).slice(0, 200)
  }
  return String(error).slice(0, 200)
}

// ---------------------------------------------------------------------------
// 命令
// ---------------------------------------------------------------------------

function sessionLabel(session) {
  for (const event of session.events ?? []) {
    if (event.type === 'user/message') {
      const blocks = event.data.content ?? []
      const text = blocks
        .filter((block) => block.type === 'text')
        .map((block) => block.text ?? '')
        .join(' ')
        .trim()
      if (text) return text.length > 24 ? `${text.slice(0, 24)}…` : text
    }
  }
  return '(空会话)'
}

// 从事件日志折叠会话标题（本地实现，等价 DSH foldSessionTitle）：优先取最后的
// session/title 事件（DSH 生成的会话名），否则回退到第一条用户消息文本。
function foldTitle(events) {
  const evts = events ?? []
  for (let i = evts.length - 1; i >= 0; i--) {
    const e = evts[i]
    if (e && e.type === 'session/title' && e.data?.title) return String(e.data.title)
  }
  return null
}

// 列出会话：使用 DSH 官方 API（ctx.sessions + sessionPersistence），与 web 端一致。
// 返回 [{ id, createdAt, events?, seq?, cwd?, title? }]，按时间倒序。
async function listSessions(node) {
  const live = [...(node.ctx.sessions?.list() ?? [])]
  const liveIds = new Set(live.map((s) => s.id))
  // 内存活跃会话（带完整 events/title）
  const liveMapped = live.map((s) => {
    try {
      const title = foldTitle(s.events ?? [])
      if (title) return { id: s.id, createdAt: s.header?.createdAt ?? 0, events: s.events, seq: s.seq, cwd: s.header?.cwd, title }
    } catch { /* ignore */ }
    return { id: s.id, createdAt: s.header?.createdAt ?? 0, events: s.events, seq: s.seq, cwd: s.header?.cwd }
  })
  // 持久化会话（含 cwd，与 web 端过滤一致）
  let cold = []
  try {
    const headers = await node.ctx.sessionPersistence?.list?.()
    if (Array.isArray(headers)) {
      const coldHeaders = headers.filter((h) => h && h.id && !liveIds.has(h.id) && h.cwd !== undefined)
      // 并行加载每个冷会话的 events 以提取标题
      cold = await Promise.all(coldHeaders.map(async (h) => {
        let title
        try {
          const insp = await node.ctx.sessionPersistence.load(h.id)
          title = foldTitle(insp.events ?? []) ?? undefined
        } catch { /* 标题提取失败则只用 id */ }
        return { id: h.id, createdAt: h.createdAt ?? 0, events: undefined, seq: 0, cwd: h.cwd, title }
      }))
    }
  } catch { /* 持久化服务不可用时仅返回内存会话 */ }
  return [...liveMapped, ...cold].sort((a, b) => b.createdAt - a.createdAt || b.seq - a.seq)
}

// 列出可用工作区：使用 DSH 官方 workspaceRegistry。返回 [{title, path}]。
function listWorkspaces(node) {
  try {
    const list = node.ctx.workspaceRegistry?.list?.() ?? []
    const out = []
    for (const ws of list) {
      if (ws && ws.path) out.push({ title: ws.title ?? ws.path, path: ws.path })
    }
    return out.sort((a, b) => String(a.path).localeCompare(String(b.path)))
  } catch {
    return []
  }
}

async function routeCommand(node, text) {
  const trimmed = text.trim()
  if (!trimmed.startsWith('/')) return false

  if (trimmed === '/yes' || trimmed === '/no' || /^[12]$/.test(trimmed)) {
    if (node.resolveApproval(trimmed)) return true
  }

  const [command, ...rest] = trimmed.slice(1).split(/\s+/)
  switch (command) {
    case 'help':
      await sendTextToPeer(node, helpText())
      return true
    case 'sessions':
      await sendTextToPeer(node, await renderSessions(node))
      return true
    case 'use': {
      const index = Number(rest[0])
      const sessions = await listSessions(node)
      if (!Number.isInteger(index) || index < 1 || index > sessions.length) {
        await sendTextToPeer(node, `${MARK.err} 无效编号。可用: 1–${sessions.length}（/sessions 查看列表）`)
        return true
      }
      const session = sessions[index - 1]
      node.setActiveSessionById(session.id)
      await sendTextToPeer(node, `${MARK.ok} 已切换到会话 #${index}（${session.id}）`)
      return true
    }
    case 'workspaces': {
      const workspaces = listWorkspaces(node)
      if (workspaces.length === 0) {
        await sendTextToPeer(node, `${MARK.list} 没有可用的工作区。使用 /new <提示词> @<路径> 指定一个目录。`)
        return true
      }
      const lines = workspaces.map((w, i) => {
        const name = w.title && w.title !== w.path ? `**${w.title}** · \`${w.path}\`` : `\`${w.path}\``
        return `${i + 1}. ${name}`
      })
      await sendTextToPeer(node, `${MARK.list}\n**可用工作区**（/new <提示词> @N 选择）\n\n${lines.join('\n')}`)
      return true
    }
    case 'new': {
      // 解析尾部 @N 或 @路径 作为工作区 cwd
      const args = rest.join(' ').trim()
      let cwd
      let prompt = args
      const atMatch = args.match(/\s+@(\S+)$/)
      if (atMatch) {
        prompt = args.slice(0, atMatch.index).trim()
        const sel = atMatch[1]
        const workspaces = listWorkspaces(node)
        if (/^\d+$/.test(sel)) {
          const idx = Number(sel)
          const ws = workspaces[idx - 1]
          if (ws) cwd = ws.path
          else { await sendTextToPeer(node, `${MARK.err} 无效工作区编号 ${sel}。用 /workspaces 查看。`); return true }
        } else {
          cwd = sel
        }
      }
      await node.createSession(prompt, cwd)
      return true
    }
    case 'stop': {
      const agent = node.activeAgent()
      if (!agent) {
        await sendTextToPeer(node, `${MARK.err} 没有活动的 agent`)
      } else {
        agent.cancel({ kind: 'user' })
        await sendTextToPeer(node, `${MARK.stop} 已请求停止`)
      }
      return true
    }
    case 'status': {
      const agent = node.activeAgent()
      const session = node.activeSession()
      if (!session) {
        await sendTextToPeer(node, `${MARK.idle} 没有活动会话。发送 /new <提示词> 开始，或 /sessions 查看已有会话。`)
        return true
      }
      const status = agent?.status ?? 'idle'
      const lastTurn = [...(session.events ?? [])].reverse().find((e) => e.type === 'turn/end')
      const reason = lastTurn ? describeTurnEnd(lastTurn.data.reason) : '尚未运行'
      await sendTextToPeer(node, `${MARK.status}\n会话: ${session.id}\nagent: ${status}\n事件: ${session.seq} 条\n最近: ${reason}`)
      return true
    }
    case 'start': // 别名：首次扫码自动开始一个会话
      await node.createSession('')
      return true
    default:
      await sendTextToPeer(node, `${MARK.err} 未知命令 /${command}\n${helpText()}`)
      return true
  }
}

function describeTurnEnd(reason) {
  switch (reason.kind) {
    case 'completed': return '[完成]'
    case 'error': return '[出错]'
    case 'aborted': return '[已停止]'
    case 'blocked': return '[已阻塞]'
    case 'max-tokens': return '[输出截断]'
    case 'interrupted': return '[中断]'
    default: return reason.kind
  }
}

async function renderSessions(node) {
  const all = await listSessions(node)
  if (all.length === 0) return `${MARK.list} 没有会话。发送 /new <提示词> 开始。`
  // 按工作区（真实 cwd）分组；无 cwd 的归入 '(未指定)'
  const groups = new Map()
  for (const s of all) {
    const key = s.cwd || '(未指定)'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(s)
  }
  const sortedGroups = [...groups.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0])))
  const parts = [`**会话列表** · 共 ${all.length} 个（/use N 切换）`, '']
  let idx = 0
  for (const [cwd, sessions] of sortedGroups) {
    parts.push(`## ${cwd}`)
    for (const session of sessions.slice(0, 20)) {
      idx += 1
      const active = session.id === node.activeSessionId ? ' **← 当前**' : ''
      const title = session.title || (session.events ? sessionLabel(session) : '')
      const label = title || fmtSessionId(session.id)
      const when = session.createdAt ? fmtTime(session.createdAt) : ''
      parts.push(`${idx}. \`${label}\``)
      parts.push(`   ${session.id} · ${when}${active}`)
    }
    if (sessions.length > 20) parts.push(`   …该工作区共 ${sessions.length} 个`)
  }
  if (all.length > 50) parts.push('', `…共 ${all.length} 个会话，仅显示前若干`)
  return `${MARK.list}\n${parts.join('\n')}`
}

// 时间戳 → 可读时间
function fmtTime(ms) {
  try {
    const d = new Date(ms)
    const p = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
  } catch { return '' }
}

// 持久化会话没有加载 events，用时间戳作为可读标识
function fmtSessionId(id) {
  const m = /^session-([0-9a-f]{8})/.exec(id ?? '')
  return m ? `session-${m[1]}…` : (id ?? '')
}

function helpText() {
  return [
    `${MARK.welcome} 命令`,
    '/sessions — 列出会话（按工作区分组）',
    '/use N — 切换到会话 N',
    '/workspaces — 列出可用工作区',
    '/new <提示词> — 新建会话并开始（当前工作区）',
    '/new <提示词> @路径 — 在指定目录新建会话',
    '/new <提示词> @N — 用编号选择工作区（/workspaces）',
    '/stop — 停止当前任务',
    '/status — 查看状态',
    '/yes /no 或 1/2 — 回应权限请求',
    '/help — 本帮助',
  ].join('\n')
}

// 导出，便于测试与复用
export const wechatNodeHelpers = {
  splitForWechat,
  digestLine,
  textOfAssistantMessage,
  extractText,
  isGroupMessage,
  listSessions,
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
