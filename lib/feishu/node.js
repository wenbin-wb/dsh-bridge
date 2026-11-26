// dsh-bridge Feishu / Lark conversation node
// 把飞书 Channel SDK 归一化后的入站消息交给平台无关的 ConversationBridge 处理，
// 出站经 FeishuGateway（官方 Channel SDK）发送文本 / 卡片 / 文件，轮次内使用流式卡片。

import fs from 'node:fs'
import path from 'node:path'
import { ConversationBridge } from '../platform/conversation-bridge.js'
import { escapeMarkdown } from '../platform/activity.js'
import { buildCommentPeerId, isCommentPeerId } from './comment.js'

/** 审批结果 → 卡片标题/配色（CardKit header template 取值：blue/green/red/orange/grey…） */
const APPROVAL_RESOLUTIONS = {
  approved: { emoji: '✅', text: '**已批准执行**', template: 'green' },
  rejected: { emoji: '❌', text: '**已拒绝执行**', template: 'red' },
  timeout: { emoji: '⏰', text: '**已超时（自动拒绝）**', template: 'grey' },
  cancelled: { emoji: '⚪', text: '**已取消**（任务中止）', template: 'grey' },
}

/** 纯媒体消息类型：SDK 归一化后的 content 是占位标记（如 `![](image_key)`、`<file .../>`），
 *  不投喂给模型；附件一律以下载后的本地路径描述（与既有行为一致）。 */
const MEDIA_ONLY_TYPES = new Set(['image', 'file', 'audio', 'video', 'media', 'sticker'])

/**
 * 预热状态卡的建卡延迟（issue #77 ② 与历史"(no content)"空卡事故的折中）。
 *
 * 为什么需要延迟：`openStream()` 一旦调用，飞书的卡片就已经创建（SDK 在回调里给出
 * controller），此后若因轮次结束/正文已建卡而"收掉不用"，用户会看到一张从未写入内容的
 * 空卡（真机截图 "(no content)"）。因此先用一个短延迟观察：这段时间内正文到达或轮次结束，
 * 就直接取消、不建卡；只有状态真的持续存在（工具在跑）时才建卡承载。
 * 400ms 对"长任务里正文最后才出"的场景足够快，对短任务则完全无感。
 */
const WARM_CARD_DELAY_MS = 400

/**
 * 平台适配对象（桥通过 `this.platform` 调用各能力）。
 *
 * @param {object} gateway 飞书网关
 * @param {{ setActivityStatus?: (line: string) => Promise<void> }} [hooks]
 *   会话桥需要的能力钩子。**注意**：桥调用的是 `this.platform.xxx`，而非节点自身；
 *   把能力只定义在节点类上、忘了挂到这里，桥就会因 `typeof !== 'function'` 静默跳过
 *   （2026-10-16 本轮真机前自查发现过这个错，务必保持两边一致）。
 */
function makePlatform(gateway, hooks = {}) {
  return {
    id: 'feishu',
    name: 'Feishu / Lark',
    get status() { return gateway?.status ?? 'idle' },
    // 能力字段与 base.js 约定对齐
    capabilities: { supportsGroup: true, supportsMedia: true, supportsTyping: false, maxMessageChars: 2000 },
    async sendText(peerId, text, opts = {}) {
      return gateway?.sendText(peerId, text, opts)
    },
    async sendMediaFile(peerId, filePath, opts = {}) {
      return gateway?.sendMediaFile(peerId, filePath, opts)
    },
    async sendTyping() {},
    // 轮次中的"活动状态"：仅在节点提供了钩子时才存在（桥按鸭子类型探测）
    ...(typeof hooks.setActivityStatus === 'function'
      // 第三参 parts（结构化状态片段）必须透传：detail 需要转义，丢掉它就退化成
      // 未转义的纯文本状态行（`*`/`_`/反引号会破坏引用块样式）。
      ? { setActivityStatus: (line, opts, parts) => hooks.setActivityStatus(line, opts, parts) }
      : {}),
  dispose() {},
  }
}


/**
 * 按文件**魔数**推断真实格式（只认几种常见签名，识别不出返回 null、绝不瞎猜）。
 *
 * 为什么需要：飞书图片不带文件名，旧实现一律按 `.png` 命名，而图片实际多为 JPEG
 * （2026-10-16 真机实测：截图是 JPEG 字节却存成 .png，按扩展名读取报"格式不符"、
 * 用户也打不开）。文件/音视频同样可能缺文件名，会退化成无意义的 `.bin`。
 *
 * @param {Buffer} head 文件开头若干字节
 * @returns {string|null} 形如 '.jpg'；无法识别返回 null
 */
function sniffExtension(head) {
  if (!head || head.length < 3) return null
  const ascii = (start, len) => head.subarray(start, start + len).toString('ascii')
  // 图片
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return '.jpg'
  if (head.length >= 8 && head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return '.png'
  if (ascii(0, 3) === 'GIF') return '.gif'
  if (ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') return '.webp'
  if (head[0] === 0x42 && head[1] === 0x4d) return '.bmp'
  // 文档 / 归档（docx/xlsx/pptx 本质是 zip，无法从魔数细分，统一给 .zip 更诚实）
  if (ascii(0, 4) === '%PDF') return '.pdf'
  if (head[0] === 0x50 && head[1] === 0x4b && (head[2] === 0x03 || head[2] === 0x05 || head[2] === 0x07)) return '.zip'
  if (head[0] === 0x1f && head[1] === 0x8b) return '.gz'
  if (ascii(0, 4) === 'Rar!') return '.rar'
  if (head[0] === 0x37 && head[1] === 0x7a && head[2] === 0xbc && head[3] === 0xaf) return '.7z'
  // 音视频
  if (ascii(0, 4) === 'fLaC') return '.flac'
  if (ascii(0, 3) === 'ID3') return '.mp3'
  if (ascii(0, 4) === 'OggS') return '.ogg'
  if (ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WAVE') return '.wav'
  if (head.length >= 12 && ascii(4, 4) === 'ftyp') return '.mp4'
  return null
}

/** 读取文件头部若干字节（失败返回 null）。 */
async function readHead(filePath, len = 16) {
  try {
    const fh = await fs.promises.open(filePath, 'r')
    try {
      const buf = Buffer.alloc(len)
      const { bytesRead } = await fh.read(buf, 0, len, 0)
      return buf.subarray(0, bytesRead)
    } finally {
      await fh.close()
    }
  } catch { return null }
}

/** 无意义/占位的扩展名：这些情况下按魔数校正不会覆盖用户的真实意图。 */
const PLACEHOLDER_EXTS = new Set(['', '.bin', '.dat', '.tmp'])

/**
 * 校正落盘文件的扩展名，使其与**实际字节**一致。
 *
 * 规则（刻意保守，避免"自作聪明"改掉用户明确给的名字）：
 *   - 图片：一律校正——飞书图片通常不带文件名，且实测存在扩展名与实际格式不符；
 *   - 其它资源：仅在**没有扩展名**或扩展名是占位值（.bin/.dat/.tmp）时按魔数补全，
 *     用户明确给的名字（如 `报告.pdf`）原样保留。
 * 识别不出格式就保持原样（宁可留 `.bin`，也不猜错）。
 *
 * @param {string} filePath 落盘路径
 * @param {boolean} isImage 资源是否声明为图片
 * @returns {Promise<string>} 校正后的路径（必要时已重命名）
 */
async function correctMediaExtension(filePath, isImage) {
  const current = path.extname(filePath).toLowerCase()
  const isPlaceholder = PLACEHOLDER_EXTS.has(current)
  // 图片之外、且已有明确扩展名 → 尊重用户给的名字，不动
  if (!isImage && !isPlaceholder) return filePath

  const head = await readHead(filePath)
  const wanted = sniffExtension(head)
  if (!wanted) return filePath
  // .jpeg 与 .jpg 等价，无需改名
  if (current === wanted || (wanted === '.jpg' && current === '.jpeg')) return filePath

  const renamed = path.join(path.dirname(filePath), `${path.basename(filePath, path.extname(filePath))}${wanted}`)
  try {
    await fs.promises.rename(filePath, renamed)
    return renamed
  } catch {
    // 重命名失败（跨设备/竞态）不致命：保留原路径
    return filePath
  }
}

export class FeishuConversationNode extends ConversationBridge {
  constructor(ctx, config, logger, { onFirstSender, onActiveSessionChange, gateway: explicitGateway, instanceId, onDiagnostic } = {}) {
    // issue #78：显式接收所属网关，不再依赖 ctx.feishu 槽位（多实例时槽位会被覆盖）
    const gateway = explicitGateway ?? ctx.feishu
    super({
      ctx,
      logger,
      config,
      // 状态钩子用**惰性转发**：makePlatform 在 super() 参数里构造，此刻 this 尚不可用，
      // 故先挂一个转发函数，运行时再取 this.setActivityStatus（方法定义在类上）。
      platform: makePlatform(gateway, {
        setActivityStatus: (line, opts, parts) => this.setActivityStatus(line, opts, parts),
      }),
      onFirstSender,
      onActiveSessionChange,
      onDiagnostic,
    })
    this.gateway = gateway
    // 事件过滤标识：只处理本实例网关发出的事件，避免同类型多账号串消息
    this.instanceId = instanceId ?? gateway?.instanceId ?? 'feishu'
    this._lastPeer = null // { peerId(chat_id), senderId(open_id), isGroup }
    this._stream = null   // 当前轮次的流式卡片控制器 { to, setContent, finish }
    this._activityLine = '' // 轮次中的活动状态行（如 `⌨️ 正在运行命令（npm test）`），收尾时清空
    // issue #77 ②：预热卡建卡是异步的（openStream 有网络往返）。并发 tool/call 可能在
    // 同一时刻多次调 setActivityStatus，若不合并会重复建卡（旧实现曾出现空卡 "(no content)"）。
    this._warmOpening = false
    this._warmTimer = null // 预热建卡的延迟定时器（正文到达/轮次结束会取消它）
    this._warmCancel = null // 取消定时器时唤醒等待中的 setActivityStatus（否则 await 永挂）
    this._approvalOperatorName = '' // 最近一次按钮决议者昵称（飞书提供时用于卡片结果行）
    this._commentPeers = new Set()  // 已处理过的评论会话（同线程后续回复不再要求 @）
    this._commentBuffers = new Map() // 评论轮次的出站缓冲：peerId → 文本（turn/end 统一发一条）
    this._inTurn = false

    // 事件仅属于本实例（旧事件无 instanceId 时按单实例兼容放行）
    const forThisInstance = (event) => !event?.instanceId || event.instanceId === this.instanceId

    // 订阅网关入站消息事件
    this.disposers.push(this.ctx.on('feishu/message', (event) => {
      if (!forThisInstance(event)) return
      return this._handleInbound(event)
    }))

    // 订阅云文档评论事件（@机器人 提问）
    this.disposers.push(this.ctx.on('feishu/comment', (event) => {
      if (!forThisInstance(event)) return
      return this._handleComment(event)
    }))

    // 订阅卡片交互事件（审批按钮点击）
    this.disposers.push(this.ctx.on('feishu/action', (event) => {
      if (!forThisInstance(event)) return
      return this._handleAction(event)
    }))

    // 连接断开/错误时收尾未完成的流式卡片，避免流式控制器悬挂
    this.disposers.push(this.ctx.on('feishu/status', (status) => {
      if (status?.instanceId && status.instanceId !== this.instanceId) return
      if (status?.status === 'offline' || status?.status === 'error') void this._finishStream()
    }))

    // 监听轮次事件：turn/start 开启流式会话，turn/end 收尾
    this.disposers.push(this.ctx.on('session/event', (session, event) => {
      if (session.id !== this.activeSessionId) return
      if (event.type === 'turn/start') {
        // 上一轮若因异常未收到 turn/end，先收尾旧卡片再开新一轮
        this._cancelWarmStream()
        void this._finishStream()
        this._inTurn = true
        this._activityLine = ''
      } else if (event.type === 'turn/end') {
        this._inTurn = false
        // 轮次结束：状态行随收尾一起消失，最终卡片只留正文
        this._activityLine = ''
        // 还没建出的预热卡直接取消：轮次都结束了，不该再凭空冒出一张状态卡
        this._cancelWarmStream()
        void this._finishStream()
        void this._flushCommentBuffers()
      }
    }))
  }

  async _handleInbound(event) {
    if (this.gateway?._closing || this.gateway?.status === 'offline') return
    const { chatId, senderId, isGroup, messageId, resources, rawContentType } = event
    const threadId = event.threadId ?? ''
    const senderName = event.senderName ?? ''
    this._lastPeer = { peerId: chatId, senderId, isGroup, messageId, threadId, senderName }

    // 纯媒体消息的 content 是 SDK 占位标记，不作为正文
    let text = MEDIA_ONLY_TYPES.has(rawContentType) ? '' : (event.text || '')

    let mediaFiles = []
    if (resources?.length) {
      mediaFiles = await this._processMedia({ messageId, resources }, this._activeSessionCwd() || this.config.cwd)
    }

    if (!text && mediaFiles.length === 0) {
      this.logger.debug?.(`[dsh-bridge feishu] ignore empty message from ${chatId}`)
      return
    }

    let fullText = text
    // 群聊里让 agent 知道"谁在说话"（昵称由 SDK 按会话成员表填充，p2p 无需标注）
    if (isGroup && senderName) fullText = `[来自 ${senderName}] ${fullText}`
    if (mediaFiles.length > 0) {
      const mediaDesc = mediaFiles.map((f) => `[文件: ${f.path}]`).join('\n')
      fullText = fullText ? `${fullText}\n\n${mediaDesc}` : mediaDesc
    }

    // 引用回复：拉取被引用消息正文作为上下文（否则模型看不到"他引用的那句话"）
    const quoted = await this._fetchQuotedContext(event)
    if (quoted) fullText = `[引用消息] ${quoted}\n\n${fullText}`

    this.logger.debug?.(`[dsh-bridge feishu] handling inbound message from ${chatId} (group=${isGroup}): ${fullText}`)

    // 如果还没有活动会话，且是首条消息，自动尝试选择最新已有会话
    if (!this.activeSessionId) {
      await this._pickDefaultSession().catch(() => {})
    }

    // 转交通用 ConversationBridge 路由
    // 单聊/群聊的出站目标统一是 chat_id（oc_…）——飞书已限制按发送者 open_id 主动发消息（230101）；
    // 群聊以"群"为授权主体，单聊以发送者 open_id 为身份（白名单 / 审批决议者校验）。
    return this.handleInbound({
      senderId: isGroup ? chatId : senderId,
      isGroup,
      text: fullText,
      senderLabel: senderName,
      outboundPeer: { peerId: chatId, isGroup, messageId, threadId },
    })
  }

  /**
   * 云文档评论入站：@机器人（或同一评论线程内的后续回复）→ 拉正文 → 交给会话桥。
   * 评论只能回纯文本、无卡片，因此合成 peer `comment:<fileToken>:<commentId>` 并在出站侧分流。
   */
  async _handleComment(event) {
    if (this.gateway?._closing || this.gateway?.status === 'offline') return
    const peerId = buildCommentPeerId(event)
    const known = this._commentPeers.has(peerId)
    if (!event.mentionedBot && !known) {
      this.logger.debug?.('[dsh-bridge feishu] 忽略未 @机器人 的评论：%s', peerId)
      return
    }

    let detail
    try {
      detail = await this.gateway.fetchComment({
        peerId,
        fileToken: event.fileToken,
        fileType: event.fileType,
        commentId: event.commentId,
      })
    } catch (err) {
      this.logger.warn?.('[dsh-bridge feishu] 拉取评论失败：%s', err?.message ?? err)
      return
    }
    if (!detail) return

    if (this._commentPeers.size >= 200) {
      const oldest = this._commentPeers.values().next().value
      this._commentPeers.delete(oldest)
    }
    this._commentPeers.add(peerId)
    this._lastPeer = { peerId, senderId: event.operatorId, isGroup: false, messageId: '', threadId: '', senderName: '' }

    let text = detail.text
    // 评论里的 @机器人 会被拍平成 `@<open_id>` 之类的占位，去掉机器人自身提及
    const botOpenId = this.gateway?.botInfo?.openId
    if (botOpenId) text = text.split(`@${botOpenId}`).join(' ')
    if (detail.quote) text = `[选中内容] ${detail.quote}\n\n${text}`
    text = text.trim()
    if (!text) {
      this.logger.debug?.('[dsh-bridge feishu] 评论正文为空，忽略：%s', peerId)
      return
    }

    if (!this.activeSessionId) await this._pickDefaultSession().catch(() => {})
    return this.handleInbound({
      senderId: event.operatorId,
      isGroup: false,
      text,
      outboundPeer: { peerId, isGroup: false, comment: true },
    })
  }

  /** 评论轮次的出站先缓冲，turn/end 时合并成一条评论回复（评论无流式/卡片） */
  async _flushCommentBuffers() {
    if (this._commentBuffers.size === 0) return
    const pending = [...this._commentBuffers.entries()]
    this._commentBuffers.clear()
    for (const [peerId, text] of pending) {
      try {
        await this.gateway.sendText(peerId, text)
      } catch (err) {
        this.logger.warn?.('[dsh-bridge feishu] 评论回复发送失败：%s', err?.message ?? err)
      }
    }
  }

  /**
   * 取"引用回复"的被引用正文（截断），失败静默降级为无上下文。
   * 只服务于普通会话的引用；话题群每条消息都带 parent_id/thread_id，若也去拉取会变成每条一次接口调用，
   * 且话题内的位置语义已由 replyInThread 承载，故跳过。
   */
  async _fetchQuotedContext(event) {
    if (!event?.replyToMessageId || event?.threadId) return ''
    try {
      const quoted = await this.gateway.fetchMessage(event.replyToMessageId)
      const content = String(quoted?.content ?? '').trim()
      if (!content) return ''
      return content.length > 600 ? `${content.slice(0, 600)}…` : content
    } catch (err) {
      this.logger.debug?.('[dsh-bridge feishu] 拉取引用消息失败：%s', err?.message ?? err)
      return ''
    }
  }

  /** 出站参数：话题群里的回复留在原话题内（普通会话保持不引用，观感与既往一致） */
  _replyOptions(source) {
    if (!source?.threadId || !source?.messageId) return {}
    return { replyTo: source.messageId, replyInThread: true }
  }

  /** 当前活动会话的工作区（DSH 把 cwd 放在 session.header.cwd；顶层无 cwd） */
  _activeSessionCwd() {
    const id = this.activeSessionId
    if (!id) return ''
    try {
      const sessions = this.ctx.sessions
      const sess = sessions?.get?.(id) ?? sessions?.list?.().find((s) => s?.id === id)
      return sess?.header?.cwd || sess?.cwd || ''
    } catch { return '' }
  }

  /**
   * 下载消息附件到会话工作区的 .feishu-media 目录。
   * SDK 的 downloadResourceToFile 直接流式落盘（大文件不进内存）。
   */
  async _processMedia({ messageId, resources }, sessionCwd) {
    if (!messageId || !resources?.length) return []
    const mediaDir = path.join(sessionCwd || this.config.cwd || process.cwd(), '.feishu-media')
    try { await fs.promises.mkdir(mediaDir, { recursive: true }) } catch {}

    const downloaded = []
    for (const resource of resources) {
      // SDK 约定：图片资源用 'image'，其余（文件/音视频/表情）统一 'file'
      const type = resource.type === 'image' ? 'image' : 'file'
      const fileName = resource.fileName
      const ext = fileName ? path.extname(fileName) : (type === 'image' ? '.png' : '.bin')
      const safeName = fileName
        ? path.basename(fileName)
        : `feishu_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`
      const filePath = path.join(mediaDir, safeName)
      try {
        const result = await this.gateway.downloadResourceToFile(messageId, resource.fileKey, type, filePath)
        const size = result?.bytesWritten ?? 0
        if (size <= 0) {
          this.logger.warn?.(`[dsh-bridge feishu] download media empty: ${safeName}`)
          continue
        }
        // 校正扩展名使其与**实际字节**一致：图片一律校正（飞书图片通常不带文件名，
        // 实测存在扩展名与实际格式不符）；文件/音视频在缺扩展名或为占位值（.bin 等）时
        // 按魔数补全，用户明确给的名字保持不动。
        const finalPath = await correctMediaExtension(filePath, resource.type === 'image')
        const finalName = path.basename(finalPath)
        downloaded.push({ filename: finalName, path: finalPath, size })
        this.logger.info?.(`[dsh-bridge feishu] downloaded media ${finalName} (${size} bytes)`)
      } catch (err) {
        this.logger.warn?.(`[dsh-bridge feishu] download media failed: ${err?.message ?? err}`)
      }
    }
    return downloaded
  }

  async _handleAction(event) {
    const { operatorId, operatorName, value } = event
    const approvalId = Number(value.approvalId)
    const action = value.action

    if (approvalId && (action === 'approve' || action === 'reject')) {
      const outcome = action === 'approve' ? 'allowed-once' : 'rejected'
      const pending = this.pending.get(approvalId)
      if (pending) {
        // 决议者校验：群聊按"群"整体授权（群内成员均可按钮决议，与 QQ 群模型一致），
        // 不校验成员级 operatorId；单聊严格限定发起者本人（operatorId === 发起者 open_id）。
        if (!pending.isGroup && pending.peerId && operatorId && pending.peerId !== operatorId) {
          this.logger?.warn?.('[dsh-bridge feishu] approval #%d blocked: operator %s is not the initiator %s', approvalId, operatorId, pending.peerId)
          return
        }
        this._approvalOperatorName = operatorName || ''
        this.clearApproval(approvalId)
        pending.resolve(outcome)
      }
      return
    }

    // ---- Agent 决策问答的按钮回调 ----
    // value: { action: 'ask', askId, askOption }（askOption 为选项下标，0-based）
    if (action === 'ask') {
      const askId = Number(value.askId)
      const entry = this.getAsk(askId)
      if (!entry) {
        this.logger?.info?.('[dsh-bridge feishu] ask #%s 按钮点击时问题已结束（或已超时并清理）', value.askId)
        return
      }
      // 作答者校验：单聊限定发起者本人；群聊允许群内成员（与审批同一模型）
      if (!entry.isGroup && entry.peerId && operatorId && entry.peerId !== operatorId) {
        this.logger?.warn?.('[dsh-bridge feishu] ask #%d blocked: operator %s is not the initiator %s', askId, operatorId, entry.peerId)
        return
      }
      const question = entry.questions?.[0]
      const options = Array.isArray(question?.options) ? question.options : []
      const idx = Number(value.askOption)
      if (!Number.isInteger(idx) || idx < 0 || idx >= options.length) return
      const label = String(options[idx]?.label ?? '')
      entry.resolve({ answers: [{ id: question.id, selected: [label] }] })
      return
    }
  }

  /**
   * 渲染"Agent 提问"卡片（单问单选）。
   *
   * 为什么用卡片而不是纯文字：手机端点选比手打 `/ask 1` 顺手得多；而选项文字的
   * 语义（哪个是推荐项、各自代价）需要排版才看得清。
   *
   * 复杂度受控的边界：只在"单问 + 单选 + 选项数适中"时走卡片（canRenderAsButtons），
   * 多选/多问/自由输入一律走文字（`/ask`），避免卡片不能表达时的误导。
   *
   * @returns {boolean} 是否成功送达卡片
   */
  async sendAskCard(peer, question, entry, promptText = '') {
    const options = Array.isArray(question?.options) ? question.options : []
    if (options.length === 0) return false

    const detail = String(question?.detail ?? '').replace(/\|/g, '｜').trim()
    const rows = []
    rows.push(`**${String(question?.question ?? '').replace(/\|/g, '｜')}**`)
    if (detail) rows.push('', detail)
    // 选项**全文写进正文**（markdown 不截断），按钮只放短标签。
    //
    // 为什么不能只靠按钮：飞书卡片的按钮文字有**平台级单行截断**（实测约 13 个汉字后
    // 变省略号），`width: 'fill'` 只能把按钮铺满、并不能避免截断——2026-10-16 两次真机
    // 截图确认（第一次以为是列容器压窄，改用 fill 后仍截断）。一旦选项全文只存在于按钮里，
    // 被截断即**信息丢失**；放进正文则永远完整可见。
    options.forEach((opt, i) => {
      const label = String(opt?.label ?? `选项 ${i + 1}`)
      const recommended = /\(recommended\)|（推荐）/i.test(label)
      const desc = String(opt?.description ?? '').trim()
      rows.push(`${i + 1}. ${recommended ? '⭐ ' : ''}${label}${desc ? `\n   ${desc}` : ''}`)
    })
    if (entry.timeoutSec > 0) {
      const min = Math.max(1, Math.round(entry.timeoutSec / 60))
      rows.push('', `> 等待超时：${min} 分钟（超时后 Agent 可能先继续其它工作，你稍后仍可 \`/ask\` 补答）`)
    }

    // 按钮用**短标签**（序号 + 简称），保证不会被平台截断；
    // 完整语义在正文里，点击等价于 `/ask <序号>`。
    //
    // 简称取"第一个分隔符之前"的短语（选项文字常写成「标签：说明」或「标签 — 说明」），
    // 比硬截断更像人话；实在没有分隔符才按长度截。**不留省略号**：省略号会让用户以为
    // 内容被吞了（历史事故的观感问题），序号 + 正文已足够定位。
    const buttonElements = options.map((opt, i) => {
      const label = String(opt?.label ?? `选项 ${i + 1}`).trim()
      const recommended = /\(recommended\)|（推荐）/i.test(label)
      const bare = label
        .replace(/\s*[（(]\s*recommended\s*[)）]\s*/i, '')
        .replace(/\s*[（(]推荐[)）]\s*/, '')
        .trim()
      const head = bare.split(/[：:—\-–(（]/)[0].trim() || bare
      const short = (head.length > 10 ? head.slice(0, 10) : head) || `选项 ${i + 1}`
      return {
        tag: 'button',
        text: { tag: 'plain_text', content: `${recommended ? '⭐ ' : ''}${i + 1}. ${short}` },
        type: recommended ? 'primary' : 'default',
        width: 'fill',
        size: 'medium',
        value: { action: 'ask', askId: entry.number, askOption: i },
      }
    })

    const elements = [{ tag: 'markdown', content: rows.join('\n') }]
    for (const el of buttonElements) elements.push(el)
    elements.push({ tag: 'markdown', content: '> 也可以文字回复：`/ask 1`（第 1 项）或 `/ask =你的答案`' })

    const card = {
      schema: '2.0',
      header: { title: { tag: 'plain_text', content: `❓ 需要你的决定 (#${entry.number})` }, template: 'blue' },
      body: { elements },
    }

    try {
      await this._finishStream()
      await this.gateway.sendCard(peer?.peerId ?? this.resolveSendTarget(entry.sendOpts), card, this._replyOptions(peer))
      return true
    } catch (err) {
      this.logger?.warn?.('[dsh-bridge feishu] 提问卡片发送失败（回退文字）：%s', err?.message ?? err)
      return false
    }
  }

  /**
   * 出站文本。
   * - 轮次内（turn 期间）：整轮共用一张 SDK 流式卡片（首片按 sendChunkDelayMs 打字机推进，
   *   后续输出覆盖为最新内容），由 SDK 负责建卡、节流、超限换卡与收尾；
   * - 轮次外（指令响应 / 系统提示 / 心跳摘要等）：单条 Markdown 消息，SDK 负责
   *   富文本渲染、超长分片、限流重试与格式错误降级。
   */
  /**
   * 出站目标解析（覆盖基类）：飞书单聊必须发会话 chat_id（oc_…），
   * 发送者 open_id 只用于身份校验（否则会触发 230101）。
   */
  resolveSendTarget(opts = {}) {
    const bound = opts?.outboundPeer && typeof opts.outboundPeer.isGroup === 'boolean' ? opts.outboundPeer : null
    const candidate = bound?.peerId || this._lastPeer?.peerId || ''
    if (candidate) return candidate
    // 兜底（issue #77 ③）：单聊里基类把 this.peerId 赋成**发送者 senderId**（open_id，
    // ou_…），它不是合法出站目标（飞书按 open_id 主动发消息会 230101 失败）。
    // 因此只在 it 明显不是 open_id 时才敢用；解析不到就返回空串由调用方跳过，
    // 绝不"发错人"或静默落到 open_id。
    const fallback = this.peerId ? String(this.peerId) : ''
    return fallback && !fallback.startsWith('ou_') ? fallback : ''
  }

  async _sendTextNow(text, opts = {}) {
    if (this.platform?.status === 'idle' || this.platform?.status === 'offline') return
    // T2.3：轮次绑定的 outboundPeer（{ peerId, isGroup }）优先生效
    const bound = opts?.outboundPeer && typeof opts.outboundPeer.isGroup === 'boolean' ? opts.outboundPeer : null
    const peerId = this.resolveSendTarget(opts)
    if (!peerId) {
      // 不静默丢出站消息：解析不到合法目标（例如只剩发送者 open_id）时记一条告警，
      // 便于真机排查"消息没发出去"（issue #77 ③ 的同类问题）。
      this.logger?.warn?.('[dsh-bridge feishu] 出站目标解析为空（无 outboundPeer 且无最近入站 chat_id），本条已跳过：%s', String(text || '').slice(0, 80))
      return
    }
    const content = String(text || '').trim()
    if (!content) return

    // 评论会话：无流式/无卡片，轮次内先缓冲、非轮次直接回一条纯文本
    if (isCommentPeerId(peerId)) {
      if (this._inTurn) {
        const buffered = this._commentBuffers.get(peerId)
        this._commentBuffers.set(peerId, buffered ? `${buffered}\n\n${content}` : content)
        return
      }
      try {
        await this.gateway.sendText(peerId, content)
      } catch (err) {
        this.logger.warn?.('[dsh-bridge feishu] 评论回复发送失败：%s', err?.message ?? err)
      }
      return
    }

    // 话题群：回复留在话题内（bound 优先，其次最近一次入站）
    const replyOpts = this._replyOptions(bound || this._lastPeer)

    try {
      // standalone：本次内容必须独立成条，不得并入轮次流式卡片。
      // 用于"本轮改动摘要"这类**轮次级通知**：宿主在 turn/end 之前发出 workspace/changes
      // （实测 seq 2945 < 2946），此时 _inTurn 仍为 true；若走 _sendTurnOutput 就会被并进
      // 正在输出的卡片、随即被 turn/end 的收尾覆盖 —— 用户侧表现为"摘要一条都收不到"。
      if (this._inTurn && !opts?.standalone) {
        await this._sendTurnOutput(peerId, content, replyOpts)
        return
      }
      // 独立成条前先收尾在途卡片，保证它排在正文之后、不会被后续流式输出吞掉
      if (opts?.standalone && this._stream) await this._finishStream()
      await this.gateway.sendText(peerId, content, replyOpts)
    } catch (err) {
      // 显式记录，绝不静默丢弃（历史问题：出站失败无日志，用户侧完全无感知）
      this.logger.warn?.('[dsh-bridge feishu] outbound send failed：%s', err?.message ?? err)
      // 落盘：宿主 logger 不落盘，出站失败对用户完全不可见
      this._diag('warn', `[dsh-bridge feishu] 出站发送失败 peer=${peerId} error=${err?.message ?? err}`)
    }
  }

  async _sendTurnOutput(peerId, content, replyOpts = {}) {
    // 正文已经要建/复用卡片了，未建出的预热卡不再需要（避免晚到的定时器再冒出一张空卡）
    this._cancelWarmStream()
    // 同一轮内**累积**文本，而不是用最新片段覆盖整张卡片。
    //
    // 为什么必须累积：宿主对每个 step 发一条独立的 `assistant/message`（surfaceOp=append），
    // 每条只是**该步的文本片段**，不是整轮累积全文。旧实现把每个片段直接 setContent 覆盖
    // 卡片 → 用户看到"输出一半突然消失、又重新输出"，最终只剩最后一个片段
    //（2026-10-16 真机反馈："输出一半，然后又突然全部消失，又重新输出…只保留了最后一条"）。
    // Web 端是把这些 append 事件累积渲染的，IM 侧必须做同样的事。
    if (this._stream && (this._stream.to === peerId || this._stream.warm)) {
      // issue #77 ③：预热卡"转正"。预热/正文的目标解析同源（resolveSendTarget），
      // 正常情况下 to === peerId；这里放宽到 warm 是防御性兼容（例如评论/话题场景
      // 的目标字段差异），避免把刚建好的状态卡收掉、正文退化成另一条普通消息。
      // 渲染/收尾都使用 _stream.to，不受入参 peerId 影响。
      this._stream.warm = false
      // 合并规则要同时兼容宿主的两种出站形态（都已实测/有用例覆盖）：
      //   1) **片段**（实测主流）：每个 step 一条 assistant/message，只含该步文本 → 需追加；
      //   2) **已累积全文**：content 以已渲染内容开头（调用方自己累积过）→ 直接替换，避免重复。
      // 若只做追加，形态 2 会渲染成"正在思考...\n\n正在思考...\n已完成…"这种重复。
      // 基于**已渲染**内容做合并（不是 text：打字机可能仍在推进，text 是完整目标）。
      const prev = this._stream.rendered ?? ''
      const merged = !prev ? content
        : content.startsWith(prev) ? content
          : `${prev}\n\n${content}`
      // text / rendered 同步推进：后续片段合并以 rendered 为准
      this._stream.text = merged
      this._stream.rendered = merged
      await this._renderStream(peerId, merged)
      return
    }
    // 目标会话变化（或上一轮残留）：先收尾旧卡片
    await this._finishStream()

    const stream = await this.gateway.openStream(peerId, replyOpts)
    // `text` = 本轮的**完整目标内容**；`rendered` = **已真正写进卡片的部分**。
    // 两者必须分开：首片打字机是"逐片推进"的，若把 text（全文）当成已渲染内容，
    // 并发的状态更新会直接把卡片跳到全文，紧接着打字机又把内容**倒回**前面的片
    // → 用户看到"反复覆盖、中间内容消失"（2026-10-16 真机反馈）。
    this._stream = {
      to: peerId,
      streamRef: stream,
      setContent: stream.setContent,
      finish: stream.finish,
      text: content,
      rendered: '',
    }

    // **不再在应用层做打字机** —— 飞书流式卡片自带逐字打印动画。
    //
    // 真凶（2026-10-17 定位，之前多轮都改错了地方）：SDK 建卡时固定开启飞书原生流式动画：
    //   config: { streaming_mode: true,
    //             streaming_config: { print_frequency_ms: 70, print_step: 1, print_strategy: 'fast' } }
    // 即**每 70ms 逐字打印**。而本插件此前在应用层又切一次片、每片 sleep 后再 setContent，
    // 每次 setContent 更新都会让飞书**对整段新内容从头重播逐字动画** →
    // 用户看到的就是"反复覆盖、重复打字"，且越长越慢（旧实现在 1954 字上切 33 片 = 33 次重播）。
    // 结论：这里的应用层打字机是**纯多余**，删掉后由飞书原生动画负责观感，
    // 我们只需在拿到新内容时**一次性写入完整累积文本**。
    if (this._stream?.streamRef !== stream) return
    this._stream.rendered = content
    await stream.setContent(this._withStatus(content))
  }

  /**
   * 把"当前活动"状态行拼到正文前面（一并在流式卡片里更新，不额外发消息）。
   *
   * 为什么放卡片里而不是单发一条：工具调用很密集，单发会把会话刷爆；卡片原地更新
   * 既能实时反映"agent 在干什么"，又不留垃圾消息（轮次结束收尾时状态行自动消失）。
   *
   * **样式上刻意区别于正文**（用户提问："这种带状态的要不在字体上区分于正文？"）：
   * 用飞书原生支持的**引用块 + 斜体**（官方文档 official-message-content.md：
   * 「引用 | `> quote` | 支持引用块语法」，斜体 `_text_` 亦支持），渲染成引用条 + 斜体，
   * 一眼可辨"这是过程状态、不是正文"。引用块后接正文**必须** `\n\n` 分隔（官方硬性要求）。
   *
   * **转义**：detail 来自工具参数（命令原文、文件名…）可能含 markdown 元字符
   * （`*` `_` `` ` `` `[]` …）。不转义时 `echo *bold*` 会让外层斜体提前闭合、
   * 甚至把后续正文一起吞进样式里；故只对**受控文案**加样式、detail 一律转义。
   */
  _withStatus(text) {
    const status = this._activityLine
    if (!status) return text
    const styled = `> _${status}_`
    return text ? `${styled}\n\n${text}` : styled
  }

  /** 写入流式卡片（自动带上当前状态行）。 */
  async _renderStream(peerId, text) {
    if (!this._stream) return
    await this._stream.setContent(this._withStatus(text))
  }

  /**
   * 用**指定**的状态行渲染文本（不读 this._activityLine）。
   * 供预热卡竞态收尾使用：此时状态可能已被清空，但仍要把快照写进卡片，避免空内容卡片。
   */
  _withStatusText(status, text) {
    if (!status) return text
    const styled = `> _${status}_`
    return text ? `${styled}\n\n${text}` : styled
  }

  /**
   * 更新"当前活动"状态（由会话桥在 tool/call 时调用）。
   *
   * @param {string} line 形如 `⌨️ 正在运行命令（npm test） · 第 3 轮`；空串表示清除
   * @param {object} [_opts]
   * @param {{icon:string,text:string,detail:string,suffix:string}} [parts]
   *   结构化形式。给了就按它**安全地**重新组装（detail 转义），
   *   避免用户可控的命令原文破坏状态行的斜体/引用样式。
   */
  async setActivityStatus(line, opts, parts) {
    this._activityLine = parts
      ? this._styleActivityParts(parts)
      : (line || '')
    // **必须渲染 `rendered`（已真正写进卡片的部分），不能用 `text`（本轮完整目标）**：
    // 首片打字机仍在逐片推进时，用 text 会把卡片直接跳到全文，紧接着打字机又把内容
    // 倒回更小的片 → 用户看到"反复覆盖、中间内容消失"（2026-10-16 真机反馈）。
    if (this._stream && typeof this._stream.rendered === 'string') {
      try {
        await this._renderStream(this._stream.to, this._stream.rendered)
      } catch (err) {
        this.logger?.debug?.('[dsh-bridge feishu] 状态行刷新失败：%s', err?.message ?? err)
      }
      return
    }
    // issue #77 ②：轮次内、还没有卡片时，先建一张只含状态行的「预热卡」。
    // 旧实现假设"tool/call 与正文总是同一时刻到达"，但在 DSH 0.2.1-rc.2 上长任务
    // 正文往往最后才出：整段时间 _stream 为 null，状态行只存在变量里、无处渲染，
    // 用户全程看不到"正在运行命令"。这里先给状态行一个载体；正文到达时直接复用
    // 这张卡（见 _sendTurnOutput），整轮结束仍无正文则由 _finishStream 收掉空卡。
    if (!this._inTurn || !this._activityLine) {
      // 状态被清空 / 不在轮次内：撤掉尚未建出的预热卡
      this._cancelWarmStream()
      return
    }
    await this._scheduleWarmStream(opts)
  }

  /** 取消尚未执行的预热建卡（定时器），并唤醒等待中的调度者。 */
  _cancelWarmStream() {
    if (this._warmTimer) {
      clearTimeout(this._warmTimer)
      this._warmTimer = null
    }
    // 必须唤醒 await 中的 _scheduleWarmStream：clearTimeout 只是不执行回调，
    // 不会 resolve 那个 Promise（曾导致 setActivityStatus 永久挂起、测试超时）。
    if (this._warmCancel) {
      const cancel = this._warmCancel
      this._warmCancel = null
      cancel()
    }
  }

  /**
   * 调度预热建卡：先等一个短窗口，期间正文到达/轮次结束就取消（见 WARM_CARD_DELAY_MS）。
   * 窗口过后状态仍在，才真正建卡。
   */
  async _scheduleWarmStream(opts = {}) {
    const delay = Number.isFinite(this.config?.warmCardDelayMs)
      ? Math.max(0, Number(this.config.warmCardDelayMs))
      : WARM_CARD_DELAY_MS
    if (delay <= 0) return this._openWarmStream(opts)
    if (this._warmTimer || this._warmOpening) return
    const fired = await new Promise((resolve) => {
      let settled = false
      this._warmTimer = setTimeout(() => {
        this._warmTimer = null
        this._warmCancel = null
        settled = true
        resolve(true)
      }, delay)
      if (typeof this._warmTimer.unref === 'function') this._warmTimer.unref()
      // 供 _cancelWarmStream 唤醒：返回 false 表示被取消（不建卡）
      this._warmCancel = () => { if (!settled) { settled = true; resolve(false) } }
    })
    if (!fired) return
    // 定时器等待期间可能已经被正文/轮次结束取消或已无需建卡，交给 _openWarmStream 再判一次
    return this._openWarmStream(opts)
  }

  /**
   * 建一张只含状态行的预热卡（issue #77 ②）。
   *
   * 三个必须处理的竞态：
   *   1) 并发调用：`_warmOpening` 闸门合并，避免同一时刻建出两张卡；
   *   2) 等待建卡期间正文已建卡：这张预热卡多余，直接 finish 掉（不留空卡/双卡）；
   *   3) 等待建卡期间轮次结束或状态被清空：同样收掉，不留下 "(no content)" 卡片。
   * 建卡目标统一走 resolveSendTarget（与正文/心跳同源，issue #77 ③）。
   */
  async _openWarmStream(opts = {}) {
    if (this._warmOpening || this._stream) return
    const peer = this.resolveSendTarget(opts)
    // 评论会话没有卡片/流式能力，跳过；解析不到合法目标（如只有 open_id）也跳过
    if (!peer || isCommentPeerId(peer)) return
    // 建卡前抓一份状态快照：万一 openStream 网络往返期间轮次结束、状态被清空，
    // 也要把这份快照写进卡片再收尾——**绝不留下从未写入内容的 "(no content)" 卡片**
    // （2026-10-17 真机事故，见 test/activity-status.test.mjs 的孤儿空卡用例）。
    const statusAtOpen = this._activityLine
    this._warmOpening = true
    try {
      const stream = await this.gateway.openStream(peer, this._replyOptions(opts?.outboundPeer || this._lastPeer))
      if (this._stream) {
        // 竞态 2：正文已建卡 → 预热卡多余。先写入快照（非空），再收掉
        try { await stream.setContent(this._withStatusText(statusAtOpen, '')) } catch { /* 写入失败也要收尾 */ }
        try { await stream.finish() } catch { /* 收尾失败不影响正文卡 */ }
        return
      }
      if (!this._inTurn || !this._activityLine) {
        // 竞态 3：轮次已结束/状态已清空 → 写入快照后收尾，不留空卡
        try { await stream.setContent(this._withStatusText(statusAtOpen, '')) } catch { /* 同上 */ }
        try { await stream.finish() } catch { /* 同上 */ }
        return
      }
      this._stream = {
        to: peer,
        streamRef: stream,
        setContent: stream.setContent,
        finish: stream.finish,
        text: '',
        rendered: '',
        warm: true,
        // 快照随控制器保存：首写失败或收尾时若仍无内容，用它补写，避免 "(no content)" 卡片
        warmStatus: statusAtOpen,
      }
      try {
        await this._renderStream(peer, '')
      } catch (err) {
        // 首写失败（网络抖动）：卡片已经建出但零写入。立刻清掉 _stream（否则后续
        // _finishStream 的 warm 分支会直接 finish 出零内容卡片），并用快照补写后收尾。
        this._stream = null
        this.logger?.warn?.('[dsh-bridge feishu] 预热状态卡首写失败，改用快照补写后收尾：%s', err?.message ?? err)
        try { await stream.setContent(this._withStatusText(statusAtOpen, '')) } catch { /* 补写失败只能收尾 */ }
        try { await stream.finish() } catch { /* 收尾失败不影响正文 */ }
      }
    } catch (err) {
      // 建卡失败不致命：正文到达时会重新建卡；这里只记debug，不刷告警
      this.logger?.debug?.('[dsh-bridge feishu] 预热状态卡创建失败：%s', err?.message ?? err)
    } finally {
      this._warmOpening = false
    }
  }

  /**
   * 用结构化片段组装状态行：受控文案（图标/动作）保持原样，detail 转义。
   * @param {{icon:string,text:string,detail:string,suffix:string}} parts
   */
  _styleActivityParts(parts) {
    const icon = String(parts?.icon ?? '')
    const text = String(parts?.text ?? '')
    const suffix = String(parts?.suffix ?? '')
    const detail = parts?.detail ? escapeMarkdown(parts.detail) : ''
    const head = detail ? `${icon} ${text}（${detail}）` : `${icon} ${text}`
    return `${head}${suffix}`
  }

  /** 收尾当前流式卡片（幂等）：关闭 SDK 的 streaming_mode，落定最终内容 */
  async _finishStream() {
    this._cancelWarmStream()
    const current = this._stream
    this._stream = null
    if (!current) return
    // 收尾前把状态行**去掉**并重渲染一次：轮次结束还挂着「正在运行命令（…）」会让用户
    // 以为任务仍在进行（实测：只清空 _activityLine 而不重渲染，卡片会保留最后一次
    // 带状态的版本）。
    // 用 `text`（本轮**完整目标**）而非 `rendered`（打字机可能只推进到中途）：
    // 收尾是终点，必须保证卡片是完整正文；用 rendered 会把内容截断在中间。
    this._activityLine = ''
    const finalText = current.text ?? current.rendered
    // 预热卡片但本轮**始终没有正文**（例如被中断、或只有工具调用没有回复）：
    // 不留下"只有状态行"的空卡片，直接收尾掉，避免会话里残留无意义内容。
    if (current.warm && !finalText) {
      // 零写入兜底：预热卡若因任何原因从未写入内容，用建卡时保存的状态快照补一次，
      // 再收尾。否则飞书会显示 "(no content)" 空卡（2026-10-17 真机事故）。
      if (!current.rendered && current.warmStatus) {
        try { await current.setContent(this._withStatusText(current.warmStatus, '')) } catch { /* 补写失败仍收尾 */ }
      }
      try { await current.finish() } catch (err) {
        this.logger.debug?.('[dsh-bridge feishu] stream finish failed: %s', err?.message ?? err)
      }
      return
    }
    try {
      if (finalText !== undefined) await current.setContent(finalText)
    } catch { /* 最终渲染失败不影响收尾 */ }
    try {
      await current.finish()
    } catch (err) {
      this.logger.debug?.('[dsh-bridge feishu] stream finish failed: %s', err?.message ?? err)
    }
  }

  /**
   * 审批卡片（CardKit JSON 2.0）。
   * - 待决：详情表 + 「批准 / 拒绝」按钮；
   * - 已决议：附加"决议结果"行、去掉按钮、表头换成结果配色。
   */
  _buildApprovalCard({ number, toolName, reason, timeoutMin, initiator = '', resolution = null }) {
    const meta = resolution ? (APPROVAL_RESOLUTIONS[resolution.status] ?? APPROVAL_RESOLUTIONS.rejected) : null
    const rows = [
      '| 项目 | 详情 |',
      '| :--- | :--- |',
      `| **调用工具** | \`${toolName}\` |`,
      ...(initiator ? [`| **发起人** | ${String(initiator).replace(/\|/g, '｜')} |`] : []),
      ...(reason ? [`| **申请原因** | ${String(reason).replace(/\|/g, '｜')} |`] : []),
      `| **等待超时** | ${timeoutMin} 分钟${resolution ? '' : '（超时自动拒绝）'} |`,
    ]
    if (meta) {
      const operator = resolution.operatorName ? ` · ${resolution.operatorName}` : ''
      rows.push('', `| **决议结果** | ${meta.emoji} ${meta.text}${operator} |`, '', '本次审批已结束')
    }

    // 注意：卡片 JSON 2.0（CardKit）**不支持 note 元素**——曾用它写"已结束"，
    // 服务端整卡更新返回 200861 unsupported tag note，导致结果态更新失败、卡片停在待办态。
    // 因此结果提示统一并入 markdown 元素。
    const elements = [{ tag: 'markdown', content: rows.join('\n') }]
    if (!meta) {
      elements.push({
        tag: 'column_set',
        flex_mode: 'flow',
        columns: [
          {
            tag: 'column',
            width: 'auto',
            elements: [{
              tag: 'button',
              text: { tag: 'plain_text', content: '✓ 批准执行' },
              type: 'primary',
              value: { action: 'approve', approvalId: number },
            }],
          },
          {
            tag: 'column',
            width: 'auto',
            elements: [{
              tag: 'button',
              text: { tag: 'plain_text', content: '✕ 拒绝执行' },
              type: 'danger',
              value: { action: 'reject', approvalId: number },
            }],
          },
        ],
      })
    }

    return {
      schema: '2.0',
      header: {
        title: {
          tag: 'plain_text',
          content: `${meta ? meta.emoji : '⚠️'} 操作权限确认 (#${number})`,
        },
        template: meta ? meta.template : 'orange',
      },
      body: { elements },
    }
  }

  // ---- 飞书专属卡片审批桥 ----
  //
  // 与基类（conversation-bridge）同一归属模型，仅卡片渲染不同：
  //   - 必须 { prepend: true } 注册：否则宿主 apiproxy 的 GUI 认领监听器先行否决，
  //     飞书卡片永远发不出（用户实测：飞书发起审批收不到卡片、Web 反而弹窗）；
  //   - 只拦截"本轮由飞书发起"的轮次（_turnPeers 门槛），Web 轮次放行给宿主；
  //   - 不调用 next()：IM 发起的审批只在 IM 决议，避免 Web 弹窗在 IM 决议后残留。

  _attachApprovalBridge() {
    const listener = async (req, next) => {
      const sessionId = req.agent?.session?.id
      const turn = sessionId ? this._turnPeers.get(sessionId) : null
      if (!turn || !this.ownsAgent(req.agent)) {
        this.logger?.info?.('[dsh-bridge feishu] approval falls through to GUI: not a feishu-initiated turn (session=%s)', sessionId ?? '(none)')
        return next?.()
      }
      const peer = turn.outboundPeer
      if (!peer?.peerId) return next?.()
      if (peer.comment) {
        // 评论会话没有可点的卡片：本轮审批交回宿主 GUI（用户可从远程面板处理）
        this.logger?.info?.('[dsh-bridge feishu] 评论发起的轮次：审批交回宿主 GUI (session=%s)', sessionId ?? '(none)')
        return next?.()
      }
      const initiator = turn.senderId
      const sendOpts = { outboundPeer: peer }

      const number = this.nextApprovalNumber()
      const timeoutSec = this.config.approvalTimeoutSec || 600
      const timeoutMin = Math.max(1, Math.round(timeoutSec / 60))
      const cardContext = {
        number, toolName: req.toolName, reason: req.reason, timeoutMin,
        initiator: turn.senderLabel || '',
      }

      // 优先创建 CardKit 卡片实体：决议后可**原地整卡更新**（内联卡片消息做不到），
      // 无需再补一条"已批准/已拒绝"的文字消息；创建失败则退回内联卡片 + 文字兜底。
      let cardId = null
      try {
        cardId = await this.gateway.createCard(this._buildApprovalCard(cardContext))
      } catch (err) {
        this.logger?.debug?.('[dsh-bridge feishu] 卡片实体创建失败，退回内联卡片：%s', err?.message ?? err)
      }

      // 先收尾本轮已有的流式卡片：否则用户在"审批卡之后"看到的续写会跑到**上方**那张旧卡片里
      // （卡片顺序：旧流式卡 → 审批卡 → 新流式卡，符合阅读顺序）
      await this._finishStream()

      let cardDelivered = false
      try {
        const cardOpts = this._replyOptions(peer)
        if (cardId) await this.gateway.sendCardRef(peer.peerId, cardId, cardOpts)
        else await this.gateway.sendCard(peer.peerId, this._buildApprovalCard(cardContext), cardOpts)
        cardDelivered = true
      } catch (err) {
        this.logger?.warn?.('[dsh-bridge feishu] approval card failed (%s), fallback to markdown', err?.message ?? err)
      }

      if (!cardDelivered) {
        const textFallback = [
          `## ⚠️ 操作权限确认 (#${number})`,
          '',
          `| 项目 | 详情 |`,
          `| :--- | :--- |`,
          `| **调用工具** | \`${req.toolName}\` |`,
          ...(req.reason ? [`| **申请原因** | ${String(req.reason).replace(/\|/g, '｜')} |`] : []),
          `| **等待超时** | ${timeoutMin} 分钟 (超时自动拒绝) |`,
          '',
          `> 回复 \`/yes\` (或 \`1\`) 批准执行`,
          `> 回复 \`/no\` (或 \`2\`) 拒绝执行`,
        ].join('\n')
        void this.sendText(textFallback, sendOpts)
      }

      // sequence 必须严格递增（飞书拒绝乱序更新）
      let cardSequence = 1
      const updateApprovalCard = async (status, operatorName = '') => {
        if (!cardId) return false
        try {
          await this.gateway.updateCardById(
            cardId,
            this._buildApprovalCard({ ...cardContext, resolution: { status, operatorName } }),
            cardSequence++,
          )
          return true
        } catch (err) {
          this.logger?.warn?.('[dsh-bridge feishu] 审批卡片更新失败：%s', err?.message ?? err)
          return false
        }
      }

      let settled = false
      let settledBy = null // 'timeout' | 'abort' | null（用户决议）
      let resolveIm
      const imPromise = new Promise((resolve) => { resolveIm = resolve })
      const settleIm = (outcome) => {
        if (settled) return
        settled = true
        this.clearApproval(number)
        resolveIm(outcome)
      }

      const timer = setTimeout(() => {
        settledBy = 'timeout'
        settleIm('rejected')
      }, timeoutSec * 1000)
      if (typeof timer.unref === 'function') timer.unref()

      // turn 被停止时 DSH 会 abort req.signal：同步取消飞书侧待决审批
      const onSignalAbort = () => {
        settledBy = 'abort'
        settleIm('cancelled')
      }
      req.signal?.addEventListener('abort', onSignalAbort, { once: true })

      // peerId 记录发起者：单聊 /yes 与卡片按钮都校验决议者身份；
      // 群聊把"群"整体作为授权主体（首个 @ 即授权整群），群内成员均可决议，不校验成员级 operatorId
      this.registerApproval(number, {
        number, request: req, resolve: resolveIm, timer,
        peerId: initiator,
        isGroup: Boolean(peer.isGroup),
      })

      let outcome
      try {
        outcome = await imPromise
      } finally {
        req.signal?.removeEventListener('abort', onSignalAbort)
        clearTimeout(timer)
        settled = true
      }

      this.logger?.info?.('[dsh-bridge feishu] approval #%d resolved: outcome=%s', number, outcome)

      if (settledBy === 'timeout') {
        // 卡片直接变成"已超时"，不再让按钮看起来还能点
        await updateApprovalCard('timeout')
      } else if (settledBy === 'abort') {
        await updateApprovalCard('cancelled')
      } else {
        const status = outcome === 'allowed-once' ? 'approved' : 'rejected'
        const updated = await updateApprovalCard(status, this._approvalOperatorName)
        // 卡片不可更新（内联卡片 / 更新失败）时，保留原有的文字确认
        if (!updated) {
          const label = outcome === 'allowed-once' ? `✓ **已批准执行**` : outcome === 'rejected' ? `❌ **已拒绝执行**` : `**[${outcome}]**`
          void this.sendText(`${label}（#${number}）`, sendOpts)
        }
      }
      return outcome
    }

    const disposer = this.ctx.on('approval/request', listener, { prepend: true })
    this.disposers.push(disposer)
  }

  dispose() {
    this._cancelWarmStream()
    void this._flushCommentBuffers()
    this._commentPeers.clear()
    this._inTurn = false
    void this._finishStream()
    this._lastPeer = null
    super.dispose()
  }
}

export const feishuNodeHelpers = {
  makePlatform,
}
