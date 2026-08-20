// dsh-bridge QQ conversation node
// 把 QQ OpenAPI v2 的入站事件（C2C 私聊 / 群聊 @提及）解析后交给平台无关的
// ConversationBridge 处理，出站通过 QqGateway 发送文本 / Markdown / 按钮。
// 平台特定部分：
//   - 入站解析：event.scope 决定 c2c / group / guild，text 直接来自 content
//   - 出站：sendText 走 gateway.sendText；长文本用 Markdown 分块
//   - 群聊：@提及消息仅在命中机器人才处理（GROUP_AT_MESSAGE_CREATE 已保证）

import { ConversationBridge, conversationBridgeHelpers } from '../platform/conversation-bridge.js'
import { gatewayConstants } from './gateway.js'

const MAX_MESSAGE_CHARS = gatewayConstants.MAX_MESSAGE_CHARS
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// QQ 流式消息：markdown 内容每片最大长度（append 模式下每片为追加片段）
const STREAM_CHUNK_SIZE = 400

/**
 * 将文本转成 QQ 安全 Markdown：
 *  - 表格（| a | b | / |---|）降级为纯文本（QQ Markdown 不支持表格，会截断/报错）
 *  - markdown 图片语法 ![alt](url) 转为链接 [alt](url)（避免图片转存失败导致整条失败）
 *  - 代码块内容原样保留
 */
function sanitizeQQMarkdown(text) {
  if (!text) return ''
  const lines = String(text).split('\n')
  const out = []
  let inFence = false
  let inTable = false
  const isSep = (l) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l) && l.includes('-')
  const isTableRow = (l) => /^\s*\|.*\|\s*$/.test(l)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (/^\s*```/.test(line)) {
      inFence = !inFence
      out.push(line)
      continue
    }
    if (inFence) { out.push(line); continue }
    const nextIsSep = i + 1 < lines.length && isSep(lines[i + 1])
    if (isTableRow(line) && (inTable || nextIsSep)) {
      inTable = true
      if (!isSep(line)) {
        // 去掉首尾 |，内部 | 转空格
        out.push(line.replace(/^\s*\|\s*/, '').replace(/\s*\|\s*$/, '').replace(/\s*\|\s*/g, '  '))
      }
      continue
    }
    inTable = false
    out.push(line.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '[$1]($2)'))
  }
  return out.join('\n')
}

/**
 * replace 模式流式分片：把完整内容切成「递增前缀」序列。
 * 官方要求 replace 模式下每片 content_raw 为当前全量正文，
 * 且须以上游已下发内容开头；服务端逐片覆盖显示 → 手机端看到一条消息逐渐变长。
 * @param {string} content
 * @param {number} maxChunk - 单片最大字符数（用户配置的 maxMessageChars）
 * @returns {string[]} 递增前缀数组，最后一片为完整内容
 */
function splitIntoIncremental(content, maxChunk) {
  const segs = splitIntoChunks(content, maxChunk)
  const slices = []
  let acc = ''
  for (const s of segs) {
    acc += s
    slices.push(acc)
  }
  return slices
}

/**
 * 按段落边界切分内容（避免切断行内内容），单块时拆两片保证流式过渡
 * @param {string} content - 要分片的内容
 * @param {number} maxChunk - 单片最大字符数（用户配置的 maxMessageChars）
 */
function splitIntoChunks(content, maxChunk) {
  const chunks = []
  let start = 0
  while (start < content.length) {
    if (content.length - start <= maxChunk) { chunks.push(content.slice(start)); break }
    const windowStart = start + Math.floor(maxChunk * 0.6)
    const windowEnd = start + maxChunk
    let cut = content.lastIndexOf('\n', windowEnd)
    if (cut <= windowStart || cut === -1) cut = windowEnd
    chunks.push(content.slice(start, cut))
    start = cut
  }
  // 单块时拆两片，保证「生成中 → 生成结束」的流式过渡
  if (chunks.length === 1 && content.length > 0) {
    const half = Math.ceil(content.length / 2)
    chunks.length = 0
    chunks.push(content.slice(0, half), content.slice(half))
  }
  return chunks
}

// 把 QqGateway 适配为 ConversationBridge 需要的 Platform 消息接口
function makePlatform(gateway) {
  return {
    id: 'qq',
    name: 'QQ',
    get accountId() { return gateway.accountId ?? '' },
    get capabilities() { return gateway.capabilities },
    // sendText / sendTyping 由 QqConversationNode 覆盖，这里仅提供兜底
    sendText: (peer, text) => gateway.sendText(peer, text, {}),
    sendTyping: () => Promise.resolve({ ok: true }),
    sendKeyboard: (peer, content, keyboard) => gateway.sendKeyboard(peer, content, keyboard, {}),
  }
}

export class QqConversationNode extends ConversationBridge {
  /**
   * @param {object} ctx          Cordis 上下文（含 ctx.qq 网关服务）
   * @param {object} config       已持久化配置（allowFrom/间隔/活动会话等）
   * @param {object} logger       日志器
   * @param {object} [opts]
   * @param {(senderId: string) => void} [opts.onFirstSender]
   * @param {(sessionId: string) => void} [opts.onActiveSessionChange]
   */
  constructor(ctx, config, logger, { onFirstSender, onActiveSessionChange } = {}) {
    super({
      ctx,
      logger,
      config,
      platform: makePlatform(ctx.qq),
      onFirstSender,
      onActiveSessionChange,
    })
    this.gateway = ctx.qq
    this.lastMessageId = null // 存储最后发送的消息 ID，用于消息引用
    // 当前对话 peer 信息（由 _handleInbound 在每次收到消息时刷新）
    this._lastPeer = null // { peerId, scope: 'c2c'|'group' }
    this._replyMsgId = null // 被动回复用的用户消息 ID（事件 d.id）

    // 订阅网关入站事件
    this.ctx.on('qq/message', (event) => {
      void this._handleInbound(event)
    })
    this.ctx.on('qq/interaction', (event) => {
      void this._handleInteraction(event)
    })
  }

  // ---- 出站：覆盖 sendText / sendTyping，正确处理 scope 与被动回复 ----

  /** 解析当前对话 peer 信息；无活动 peer 时返回 null */
  _currentPeer() {
    return this._lastPeer
  }

  async sendText(text) {
    const peerInfo = this._currentPeer()
    if (!peerInfo) return
    const { peerId, scope } = peerInfo
    const replyMsgId = this._replyMsgId || undefined

    // 检测是否是提示用户开始新会话的消息
    const isPromptMessage = text.includes('没有活动会话') || text.includes('恢复会话失败')

    if (isPromptMessage) {
      // 发送带按钮的消息，方便用户快速操作
      // 官方键盘结构：keyboard.content.rows；action.type=1（回调按钮，触发 INTERACTION_CREATE）
      // 参考：https://bot.q.qq.com/wiki/develop/api-v2/server-inter/message/trans/msg-btn.html
      const keyboard = {
        content: {
          rows: [
            {
              buttons: [
                {
                  id: 'new_conversation',
                  render_data: { label: '🆕 新建会话', visited_label: '新建会话', style: 1 },
                  action: { type: 1, permission: { type: 2 }, data: 'new', unsupport_tips: '请升级QQ客户端后使用' },
                },
                {
                  id: 'list_sessions',
                  render_data: { label: '📋 会话列表', visited_label: '会话列表', style: 1 },
                  action: { type: 1, permission: { type: 2 }, data: 'list', unsupport_tips: '请升级QQ客户端后使用' },
                },
              ],
            },
            {
              buttons: [
                {
                  id: 'help',
                  render_data: { label: '❓ 帮助', visited_label: '帮助', style: 1 },
                  action: { type: 1, permission: { type: 2 }, data: 'help', unsupport_tips: '请升级QQ客户端后使用' },
                },
              ],
            },
          ],
        },
      }
      // 官方按钮基于 markdown 消息（msg_type=2）挂载，最稳妥
      return this._sendMarkdown(peerId, text, { scope, msgId: replyMsgId, keyboard })
    }

    // 其他回复统一走「流式 Markdown」：content_type=markdown 让手机端渲染
    const content = String(text || '').trim()
    if (content.length === 0) return { success: true }
    const md = sanitizeQQMarkdown(content)

    // 群消息不支持流式参数（官方文档明确说明），直接发送 Markdown
    // 参考：https://bot.q.qq.com/wiki/develop/api-v2/autogen/api/v2_groups_group_openid_messages.post.html
    if (scope === 'group') {
      return this._sendMarkdown(peerId, md, { scope, msgId: replyMsgId })
    }

    // 单聊：replace 模式（每片是全量前缀），服务端逐片覆盖 → 一条消息逐渐变长
    const maxChars = this.config.maxMessageChars || 2000
    const slices = splitIntoIncremental(md, maxChars)

    // 被动回复的 msg_id 每片都带（官方示例如此）；主动消息（digest 等）无 msg_id 则不传
    const baseSeq = Number(this._msgSeq) || 0
    const streamCommon = {
      scope,
      contentType: 'markdown',
      inputMode: 'replace',
    }

    try {
      let streamMsgId = null
      for (let i = 0; i < slices.length; i++) {
        const isLast = i === slices.length - 1
        const result = await this.gateway.sendStream(peerId, slices[i], {
          ...streamCommon,
          msgId: replyMsgId, // 每片都带被动回复 msg_id（官方示例如此）
          msgSeq: replyMsgId ? baseSeq + 1 + i : undefined, // 递增避免去重（40054005）
          streamMsgId, // 后续片携带服务端返回的 stream_msg_id
          index: i, // 分片序号从 0 递增
          inputState: isLast ? 10 : 1, // 1=生成中, 10=生成结束
        })

        // 首片返回 stream_msg_id，后续片需携带
        if (i === 0) {
          streamMsgId = result?.id || result?.message_id || result?.stream_msg_id
          if (streamMsgId) {
            this.lastMessageId = streamMsgId
            this.logger?.info?.('[dsh-bridge qq] stream started, stream_msg_id=%s, slices=%d', streamMsgId, slices.length)
          } else {
            this.logger?.warn?.('[dsh-bridge qq] stream first chunk returned no id: %o', result)
          }
        }

        if (result?.code !== undefined && result.code !== 0) {
          throw new Error(result.message || `QQ API error ${result.code}`)
        }

        // 使用用户配置的 sendChunkDelayMs（默认 1500ms），而非硬编码 120ms
        if (!isLast) {
          const delayMs = this.config.sendChunkDelayMs ?? 1500
          if (delayMs > 0) await sleep(delayMs)
        }
      }
      return { success: true }
    } catch (err) {
      // 流式失败 → 补发完整内容 replace 收尾（input_state=10），尽量合并成一条
      this.logger?.warn?.('[dsh-bridge qq] stream send failed, patch final replace: %s', err?.message ?? err)
      try {
        const result = await this.gateway.sendStream(peerId, md, {
          ...streamCommon,
          msgId: replyMsgId,
          msgSeq: replyMsgId ? baseSeq + slices.length + 1 : undefined,
          streamMsgId,
          index: slices.length,
          inputState: 10,
        })
        if (result?.id) this.lastMessageId = result.id
        return result
      } catch (fallbackErr1) {
        // 主动消息兜底（digest 心跳等非回复场景，msg_id 已过期或无）
        return this._sendMarkdown(peerId, md, { scope })
      }
    }
  }

  /** 发送 Markdown 消息：先带被动回复 msg_id，失败则降级为主动消息。 */
  async _sendMarkdown(peerId, md, { scope, msgId, keyboard } = {}) {
    try {
      const result = await this.gateway.sendMarkdown(peerId, md, { scope, msgId, keyboard })
      if (result?.id) this.lastMessageId = result.id
      return result
    } catch (fallbackErr1) {
      // 被动回复失败（msg_id 过期等）→ 主动消息兜底
      this.logger?.warn?.('[dsh-bridge qq] markdown send failed with msg_id, retry as active: %s', fallbackErr1?.message ?? fallbackErr1)
      try {
        const result = await this.gateway.sendMarkdown(peerId, md, { scope, keyboard })
        if (result?.id) this.lastMessageId = result.id
        return result
      } catch (fallbackErr2) {
        this.logger?.error?.('[dsh-bridge qq] markdown send failed: %s', fallbackErr2?.message ?? fallbackErr2)
        return { success: false, error: fallbackErr2?.message ?? String(fallbackErr2) }
      }
    }
  }

  /** 发送"正在输入"状态（QQ 通过 msg_type=6 + input_notify 显示 N 秒；群聊不支持） */
  async sendTyping(state) {
    const peerInfo = this._currentPeer()
    if (!peerInfo) return
    // 群聊消息类型列表不含 msg_type=6（输入状态），跳过
    if (peerInfo.scope === 'group') return { ok: true }
    // state=2（停止）时无需显式结束——input_second 到期自动消失
    if (Number(state) === 2) return { ok: true }
    return this.gateway.sendTyping(peerInfo.peerId, {
      scope: peerInfo.scope,
      durationSeconds: 8,
      msgId: this._replyMsgId || undefined,
    })
  }

  // ---- 入站 ----

  async _handleInbound(event) {
    const sender = String(event.senderId ?? '').trim()
    if (!sender) return

    // 快速预检查：白名单非空时，未授权发件人直接忽略
    if (!this.isAllowed(sender) && this.config.allowFrom.length > 0) {
      this.logger?.info?.(`[dsh-bridge qq] ignore message from non-allowlisted sender ${sender}`)
      return
    }

    const text = String(event.text ?? '').trim()
    if (!text) {
      this.logger?.info?.(`[dsh-bridge qq] ignore empty message from ${sender}`)
      return
    }

    // 群聊：仅在群聊 @ 机器人事件中处理（GROUP_AT_MESSAGE_CREATE 已由网关归一化）
    const isGroup = event.scope === 'group' || event.scope === 'guild'

    // 记录当前 peer 信息与被动回复消息 ID（事件 d.id）、msg_seq，供出站使用
    const peerId = isGroup ? event.groupId || event.peerId : event.peerId || event.senderId
    if (peerId) {
      this._lastPeer = { peerId: String(peerId), scope: isGroup ? 'group' : 'c2c' }
      if (event.id) this._replyMsgId = String(event.id)
      if (event.msgSeq !== undefined) this._msgSeq = event.msgSeq
    }

    // 检测消息引用（文本交互）：如果用户回复了机器人的消息，且当前没有活动会话或消息以 /new 开头，
    // 则自动创建新会话并发送消息
    const messageReference = event.messageReference
    if (messageReference && !this.activeSessionId && !text.startsWith('/')) {
      this.logger?.info?.(`[dsh-bridge qq] detected message reference from ${sender}, auto-starting conversation`)
      // 先创建新会话，再处理消息
      await this.handleInbound({ senderId: sender, text: '/new', isGroup })
      // 等待一小段时间确保会话创建完成
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // 交给平台无关核心：白名单/群消息/命令路由/agent 分发
    await this.handleInbound({ senderId: sender, text, isGroup })
  }

  // ---- 互动事件 ----

  async _handleInteraction(event) {
    const sender = String(event.senderId ?? '').trim()
    if (!sender) return

    // 快速预检查：白名单非空时，未授权发件人直接忽略
    if (!this.isAllowed(sender) && this.config.allowFrom.length > 0) {
      this.logger?.info?.(`[dsh-bridge qq] ignore interaction from non-allowlisted sender ${sender}`)
      return
    }

    const type = Number(event.interactionType ?? event?.data?.type ?? 0)
    // 仅消息按钮(11)与快捷菜单(12)需要回应；其他类型（反馈/清空会话/故事集/授权等）无需回应
    const needsRespond = type === 11 || type === 12

    // 记录 peer 信息，供命令回复使用
    const isGroup = event.scope === 'group'
    const peerId = isGroup ? event.groupId || event.peerId : event.peerId || sender
    if (peerId) {
      this._lastPeer = { peerId: String(peerId), scope: isGroup ? 'group' : 'c2c' }
      this._replyMsgId = null
    }

    // 回应互动：告知后台已收到，避免客户端一直 loading（同一 interaction_id 只能回应一次）
    if (needsRespond && event.interactionId) {
      try {
        await this.gateway.respondInteraction(event.interactionId, { code: 0 })
      } catch (err) {
        this.logger?.warn?.('[dsh-bridge qq] respond interaction failed: %s', err?.message ?? err)
      }
    }

    if (!needsRespond) {
      this.logger?.info?.(`[dsh-bridge qq] skip non-button interaction type=${type} from ${sender}`)
      return
    }

    const data = event.data || {}
    const resolved = data.resolved || {}
    const buttonId = resolved.button_id || ''

    // 根据按钮 ID 执行对应操作（消息按钮 11 与快捷菜单 12 都映射到命令）
    this.logger?.info?.('[dsh-bridge qq] button interaction type=%s button_id=%s from %s', type, buttonId, sender)
    if (buttonId === 'new_conversation') {
      await this.handleInbound({ senderId: sender, text: '/new', isGroup })
    } else if (buttonId === 'list_sessions') {
      await this.handleInbound({ senderId: sender, text: '/list', isGroup })
    } else if (buttonId === 'help') {
      await this.handleInbound({ senderId: sender, text: '/help', isGroup })
    } else {
      this.logger?.info?.(`[dsh-bridge qq] unknown button interaction: ${buttonId}`)
    }
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
  splitIntoChunks,
  splitIntoIncremental,
  STREAM_CHUNK_SIZE,
}
