// dsh-bridge WeChat conversation node
//
// 微信 ⇄ DSH 会话桥：把 iLink 入站消息解析后交给平台无关的 ConversationBridge 处理，
// 出站通过 ctx.wechat 发送。负责微信协议相关的部分：
//   - 消息解析（extractText / isGroupMessage）
//   - 媒体处理（图片/文件/语音/视频：下载、AES 解密、保存到 .wechat-media/）
//   - 白名单/会话/审批/命令路由等平台无关逻辑继承自 ConversationBridge
//
// 由 Jesse-njx/dsh-chatnode-wechat 移植精简而来。消费的 DSH 服务：
//   ctx.wechat    （本插件 gateway 提供）sendText/sendTyping/accountId
//   ctx.sessions  （DSH 宿主提供）list/get
//   ctx.agents    （DSH 宿主提供）create/get/resume
//   ctx.approval  （DSH 宿主提供）approval/request 事件
//
// 安全边界：强制白名单（allowFrom），非白名单发件人绝不喂给模型。

import { ConversationBridge, conversationBridgeHelpers } from '../platform/conversation-bridge.js'
import { gatewayConstants } from './gateway.js'

const MAX_MESSAGE_CHARS = gatewayConstants.MAX_MESSAGE_CHARS

// 将 ctx.wechat 网关适配为 ConversationBridge 需要的 Platform 消息接口
function makePlatform(ctx) {
  return {
    id: 'wechat',
    name: '微信',
    get accountId() { return ctx.wechat?.accountId ?? '' },
    get capabilities() {
      return {
        supportsGroup: false, // v0.1 不处理群消息
        supportsMedia: true,
        supportsVoice: true,
        supportsTyping: true,
        maxMessageChars: MAX_MESSAGE_CHARS,
      }
    },
    sendText: (peer, text) => ctx.wechat.sendText(peer, text),
    sendMediaFile: (peer, filePath) => ctx.wechat.sendMediaFile(peer, filePath),
    sendTyping: (peer, state) => ctx.wechat.sendTyping(peer, state),
  }
}

export class WechatConversationNode extends ConversationBridge {
  /**
   * @param {object} ctx          Cordis 上下文（含 ctx.wechat 网关服务）
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
      platform: makePlatform(ctx),
      onFirstSender,
      onActiveSessionChange,
    })

    this.disposers.push(this.ctx.on('wechat/message', (message) => {
      void this._handleInbound(message)
    }))
  }

  // ---- 入站 ----

  async _handleInbound(message) {
    if (this.ctx?.wechat?.stopPollingLocal) return
    const sender = String(message.from_user_id ?? '').trim()
    if (!sender) return

    // 调试：记录收到的消息类型
    const items = message.item_list ?? []
    const itemTypes = items.map((it) => it.type).join(',')
    this.logger?.info?.(`[dsh-bridge wechat] received message from ${sender}, item_types=[${itemTypes}]`)

    // 快速预检查：白名单非空时，未授权发件人直接忽略（不下载媒体，防资源滥用）。
    // 白名单为空的"首条自动授权"场景交给 handleInbound 处理。
    if (!this.isAllowed(sender) && this.config.allowFrom.length > 0) {
      this.logger?.info?.(`[dsh-bridge wechat] ignore message from non-allowlisted sender ${sender} (never fed to model)`)
      return
    }

    // v0.2: 处理媒体项（图片/文件/语音/视频）
    this.logger?.info?.(`[dsh-bridge wechat] processing media items for ${sender}...`)
    let mediaFiles = []
    let hadMediaItems = false
    let mediaError = null
    let debugInfo = [] // 调试信息
    try {
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
        await this.sendText(`❌ **${errMsg}**`)
        return
      }
      this.logger?.info?.(`[dsh-bridge wechat] ignore empty message from ${sender}`)
      return
    }

    // 构建完整消息内容（文本 + 媒体文件路径）
    let fullText = text
    if (mediaFiles.length > 0) {
      const mediaDesc = mediaFiles.map((f) => `[文件: ${f.path}]`).join('\n')
      fullText = fullText ? `${text}\n\n${mediaDesc}` : mediaDesc
    }

    // 交给平台无关核心：白名单/群消息/命令路由/agent 分发
    const isGroup = isGroupMessage(message, this.gatewayAccountId)
    await this.handleInbound({ senderId: sender, text: fullText, isGroup })
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

          const aesKey = img.aeskey || img.aes_key || img.media?.aes_key || img.media?.aeskey
          if (!aesKey) {
            const fields = Object.keys(img).join(', ')
            const msg = `图片缺 aes_key，字段: ${fields}`
            this.logger?.warn?.(`[dsh-bridge wechat] ${msg}`)
            debugInfo.push(msg)
            continue
          }

          // 从 image_item 或 image_item.media 对象提取 CDN 下载参数
          const mediaObj = img.media
          const encryptedParam = img.encrypt_query_param
            || img.encrypted_query_param
            || mediaObj?.encrypt_query_param
            || mediaObj?.encrypted_query_param
            || mediaObj?.encrypt_query_param_full
            || (typeof mediaObj === 'string' ? mediaObj : undefined)
          const fullUrl = img.full_url || img.url || mediaObj?.full_url || mediaObj?.url
          debugInfo.push(`media 类型: ${typeof mediaObj}, param=${!!encryptedParam}`)

          const file = await this._downloadMediaItem({
            encryptedQueryParam: encryptedParam,
            fullUrl,
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
          const aesKey = fileItem.aes_key || fileItem.aeskey || fileItem.media?.aes_key || fileItem.media?.aeskey
          const encryptedParam = fileItem.encrypt_query_param
            || fileItem.encrypted_query_param
            || fileItem.media?.encrypt_query_param
            || fileItem.media?.encrypted_query_param
            || (typeof fileItem.media === 'string' ? fileItem.media : undefined)
          const fullUrl = fileItem.full_url || fileItem.url || fileItem.media?.full_url || fileItem.media?.url

          if (!encryptedParam && !fullUrl) {
            debugInfo.push(`文件缺 media/encrypt_query_param，字段: ${Object.keys(fileItem).join(', ')}`)
            continue
          }
          if (!aesKey) {
            debugInfo.push(`文件缺 aes_key，字段: ${Object.keys(fileItem).join(', ')}`)
            continue
          }
          const file = await this._downloadMediaItem({
            encryptedQueryParam: encryptedParam,
            fullUrl,
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
          const aesKey = video.aes_key || video.aeskey || video.media?.aes_key || video.media?.aeskey
          const encryptedParam = video.encrypt_query_param
            || video.encrypted_query_param
            || video.media?.encrypt_query_param
            || video.media?.encrypted_query_param
            || (typeof video.media === 'string' ? video.media : undefined)
          const fullUrl = video.full_url || video.url || video.media?.full_url || video.media?.url

          if (!encryptedParam && !fullUrl) {
            debugInfo.push(`视频缺 media/encrypt_query_param，字段: ${Object.keys(video).join(', ')}`)
            continue
          }
          if (!aesKey) {
            debugInfo.push(`视频缺 aes_key，字段: ${Object.keys(video).join(', ')}`)
            continue
          }
          const file = await this._downloadMediaItem({
            encryptedQueryParam: encryptedParam,
            fullUrl,
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
}

// ---------------------------------------------------------------------------
// 微信消息解析辅助（协议特定）
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

// 导出，便于测试与复用
export const wechatNodeHelpers = {
  splitForWechat: conversationBridgeHelpers.splitForIM,
  digestLine: conversationBridgeHelpers.digestLine,
  textOfAssistantMessage: conversationBridgeHelpers.textOfAssistantMessage,
  extractText,
  isGroupMessage,
  listSessions: conversationBridgeHelpers.listSessions,
  sessionsInDisplayOrder: conversationBridgeHelpers.sessionsInDisplayOrder,
}
