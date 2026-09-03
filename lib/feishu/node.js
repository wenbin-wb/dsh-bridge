// dsh-bridge Feishu / Lark conversation node
// 把飞书 OpenAPI / WebSocket 长连接入站事件解析后交给平台无关的
// ConversationBridge 处理，出站通过 FeishuGateway 发送文本 / 卡片。

import fs from 'node:fs'
import path from 'node:path'
import { ConversationBridge, conversationBridgeHelpers } from '../platform/conversation-bridge.js'
import { cumulativeSlices } from '../platform/stream-slices.js'

function makePlatform(gateway) {
  return {
    id: 'feishu',
    name: 'Feishu / Lark',
    get status() { return gateway?.status ?? 'idle' },
    // 能力字段与 base.js 约定对齐（此前是 group/media/approvals 非规范命名）
    capabilities: { supportsGroup: true, supportsMedia: true, supportsTyping: false, maxMessageChars: 2000 },
    async sendText(peerId, text, opts = {}) {
      return gateway?.sendMarkdownCard(peerId, text, opts)
    },
    async sendMediaFile(peerId, filePath, opts = {}) {
      return gateway?.sendMediaFile(peerId, filePath, opts)
    },
    async sendTyping() {},
    dispose() {},
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function splitChunksByNewline(content, maxChunk = 150) {
  const chunks = []
  let start = 0
  while (start < content.length) {
    if (content.length - start <= maxChunk) {
      chunks.push(content.slice(start))
      break
    }
    const windowStart = start + Math.floor(maxChunk * 0.6)
    const windowEnd = start + maxChunk
    let cut = content.lastIndexOf('\n', windowEnd)
    if (cut <= windowStart || cut === -1) cut = windowEnd
    chunks.push(content.slice(start, cut))
    start = cut
  }
  if (chunks.length <= 1 && content.length > 30) {
    const step = Math.max(20, Math.floor(content.length / 4))
    chunks.length = 0
    for (let i = 0; i < content.length; i += step) {
      chunks.push(content.slice(i, Math.min(i + step, content.length)))
    }
  }
  return chunks
}

function splitIntoIncremental(content, maxChunk = 150) {
  return cumulativeSlices(splitChunksByNewline(content, maxChunk))
}

export class FeishuConversationNode extends ConversationBridge {
  constructor(ctx, config, logger, { onFirstSender, onActiveSessionChange } = {}) {
    super({
      ctx,
      logger,
      config,
      platform: makePlatform(ctx.feishu),
      onFirstSender,
      onActiveSessionChange,
    })
    this.gateway = ctx.feishu
    this._lastPeer = null // { peerId, senderId, isGroup }
    this._streamCardId = null // 当前轮次的流式卡片 message_id
    this._streamContent = ''  // 当前轮次流式卡片的内容
    this._patchTimer = null   // 节流定时器
    this._inTurn = false

    // 订阅网关入站消息事件
    this.disposers.push(this.ctx.on('feishu/message', (event) => this._handleInbound(event)))

    // 订阅卡片交互事件（审批按钮点击）
    this.disposers.push(this.ctx.on('feishu/action', (event) => this._handleAction(event)))

    // 监听轮次事件：turn/start 开启流式会话，turn/end 最终刷新并重置
    this.disposers.push(this.ctx.on('session/event', (session, event) => {
      if (session.id !== this.activeSessionId) return
      if (event.type === 'turn/start') {
        this._inTurn = true
        this._streamCardId = null
        this._streamContent = ''
        if (this._patchTimer) {
          clearTimeout(this._patchTimer)
          this._patchTimer = null
        }
      } else if (event.type === 'turn/end') {
        this._inTurn = false
        if (this._patchTimer) {
          clearTimeout(this._patchTimer)
          this._patchTimer = null
        }
        if (this._streamCardId && this._streamContent) {
          void this.gateway.patchCard(this._streamCardId, this._streamContent).catch(() => {})
        }
        this._streamCardId = null
        this._streamContent = ''
      }
    }))
  }

  async _handleInbound(event) {
    if (this.gateway?._closing || this.gateway?.status === 'offline') return
    const { peerId, senderId, isGroup, text, messageId, messageType, contentObj } = event
    this._lastPeer = { peerId, senderId, isGroup }

    let mediaFiles = []
    if (messageType && messageType !== 'text') {
      mediaFiles = await this._processMedia(messageId, messageType, contentObj, this.config.cwd)
    }

    if (!text && mediaFiles.length === 0) {
      this.logger.debug?.(`[dsh-bridge feishu] ignore empty message from ${peerId}`)
      return
    }

    let fullText = text || ''
    if (mediaFiles.length > 0) {
      const mediaDesc = mediaFiles.map((f) => `[文件: ${f.path}]`).join('\n')
      fullText = fullText ? `${fullText}\n\n${mediaDesc}` : mediaDesc
    }

    this.logger.debug?.(`[dsh-bridge feishu] handling inbound message from ${peerId} (group=${isGroup}): ${fullText}`)

    // 如果还没有活动会话，且是首条消息，自动尝试选择最新已有会话
    if (!this.activeSessionId) {
      await this._pickDefaultSession().catch(() => {})
    }

    // 转交通用 ConversationBridge 路由
    // outboundPeer：本轮出站事件流绑定回发起会话（此前这里传的 peerId 是被静默丢弃的幽灵参数）
    return this.handleInbound({
      senderId: isGroup ? peerId : senderId,
      isGroup,
      text: fullText,
      outboundPeer: { peerId, isGroup },
    })
  }

  async _processMedia(messageId, messageType, contentObj = {}, sessionCwd) {
    if (!messageId || !messageType) return []
    const mediaDir = path.join(sessionCwd || this.config.cwd || process.cwd(), '.feishu-media')
    try { await fs.promises.mkdir(mediaDir, { recursive: true }) } catch {}

    const downloaded = []
    const fileKey = contentObj.image_key || contentObj.file_key
    const fileName = contentObj.file_name

    if (fileKey) {
      try {
        const type = messageType === 'image' ? 'image' : 'file'
        const buf = await this.gateway.downloadMessageResource({ messageId, fileKey, type })
        if (buf && buf.length > 0) {
          const ext = fileName ? path.extname(fileName) : (type === 'image' ? '.png' : '.bin')
          const safeName = fileName ? path.basename(fileName) : `feishu_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`
          const filePath = path.join(mediaDir, safeName)
          await fs.promises.writeFile(filePath, buf)
          downloaded.push({ filename: safeName, path: filePath, size: buf.length })
          this.logger.info?.(`[dsh-bridge feishu] downloaded media ${safeName} (${buf.length} bytes)`)
        }
      } catch (err) {
        this.logger.warn?.(`[dsh-bridge feishu] download media failed: ${err.message}`)
      }
    }
    return downloaded
  }

  async _handleAction(event) {
    const { operatorId, value } = event
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
        this.clearApproval(approvalId)
        pending.resolve(outcome)
      }
    }
  }

  async _sendTextNow(text, opts = {}) {
    // T2.3：轮次绑定的 outboundPeer（{ peerId, isGroup }）优先生效
    const bound = opts?.outboundPeer && typeof opts.outboundPeer.isGroup === 'boolean' ? opts.outboundPeer : null
    const peerId = bound?.peerId || this._lastPeer?.peerId || this.peerId
    if (!peerId) return
    const isGroup = bound ? bound.isGroup : (this._lastPeer?.isGroup ?? (peerId.startsWith('oc_') || peerId.startsWith('chat_')))
    const content = String(text || '').trim()
    if (!content) return

    // 如果处于 Agent 生成轮次中（turn 期间）：流式打字机逐段增量更新
    if (this._inTurn) {
      const maxChunk = 150
      const slices = splitIntoIncremental(content, maxChunk)
      const delayMs = Math.min(Math.max(this.config.sendChunkDelayMs ?? 200, 100), 1000)

      if (!this._streamCardId) {
        // 首片：创建卡片并记录 message_id
        const firstSlice = slices[0] || content
        try {
          const res = await this.gateway.sendMarkdownCard(peerId, firstSlice, { isGroup })
          this._streamCardId = res?.message_id || null
          this._streamContent = firstSlice
        } catch (err) {
          this.logger.warn?.('[dsh-bridge feishu] sendMarkdownCard failed, fallback to sendText:', err?.message ?? err)
          await this.gateway.sendText(peerId, content, { isGroup })
          return
        }

        // 后续片依次 patchCard（间隔 delayMs，呈现真实打字机流式效果）
        for (let i = 1; i < slices.length; i++) {
          await sleep(delayMs)
          this._streamContent = slices[i]
          if (this._streamCardId) {
            await this.gateway.patchCard(this._streamCardId, this._streamContent).catch(() => {})
          }
        }
      } else {
        // 如果卡片已存在（同轮次后续输出）：更新到最终内容
        this._streamContent = content
        await this.gateway.patchCard(this._streamCardId, this._streamContent).catch(() => {})
      }
      return
    }

    // 非 turn 期间（指令响应、系统提示、单条通知等）：以完整单张卡片直接发送，杜绝碎片拆分
    try {
      if (content.length <= 25000) {
        await this.gateway.sendMarkdownCard(peerId, content, { isGroup })
      } else {
        const chunks = conversationBridgeHelpers.splitForIM(content, 20000)
        for (const chunk of chunks) {
          await this.gateway.sendMarkdownCard(peerId, chunk, { isGroup })
        }
      }
    } catch (err) {
      this.logger.warn?.('[dsh-bridge feishu] sendMarkdownCard failed, fallback to plain text:', err?.message ?? err)
      await this.gateway.sendText(peerId, content, { isGroup })
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
      const initiator = turn.senderId
      const sendOpts = { outboundPeer: peer }

      const number = this.nextApprovalNumber()
      const timeoutSec = this.config.approvalTimeoutSec || 600
      const timeoutMin = Math.max(1, Math.round(timeoutSec / 60))

      // 构建飞书原生交互卡片 (JSON 2.0)
      const card = {
        schema: '2.0',
        header: {
          title: {
            tag: 'plain_text',
            content: `⚠️ 操作权限确认 (#${number})`,
          },
          template: 'orange',
        },
        body: {
          elements: [
            {
              tag: 'markdown',
              content: [
                `| 项目 | 详情 |`,
                `| :--- | :--- |`,
                `| **调用工具** | \`${req.toolName}\` |`,
                ...(req.reason ? [`| **申请原因** | ${String(req.reason).replace(/\|/g, '｜')} |`] : []),
                `| **等待超时** | ${timeoutMin} 分钟 (超时自动拒绝) |`,
              ].join('\n'),
            },
            {
              tag: 'column_set',
              flex_mode: 'flow',
              columns: [
                {
                  tag: 'column',
                  width: 'auto',
                  elements: [
                    {
                      tag: 'button',
                      text: {
                        tag: 'plain_text',
                        content: '✓ 批准执行',
                      },
                      type: 'primary',
                      value: {
                        action: 'approve',
                        approvalId: number,
                      },
                    },
                  ],
                },
                {
                  tag: 'column',
                  width: 'auto',
                  elements: [
                    {
                      tag: 'button',
                      text: {
                        tag: 'plain_text',
                        content: '✕ 拒绝执行',
                      },
                      type: 'danger',
                      value: {
                        action: 'reject',
                        approvalId: number,
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      }

      // 发送飞书卡片；失败降级 Markdown 文本
      try {
        await this.gateway.sendCard(peer.peerId, card, { isGroup: peer.isGroup })
      } catch (err) {
        this.logger?.warn?.('[dsh-bridge feishu] approval card failed (%s), fallback to markdown', err?.message ?? err)
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

      let settled = false
      let timeoutFired = false
      let resolveIm
      const imPromise = new Promise((resolve) => { resolveIm = resolve })
      const settleIm = (outcome) => {
        if (settled) return
        settled = true
        this.clearApproval(number)
        resolveIm(outcome)
      }

      const timer = setTimeout(() => {
        timeoutFired = true
        settleIm('rejected')
      }, timeoutSec * 1000)
      if (typeof timer.unref === 'function') timer.unref()

      // turn 被停止时 DSH 会 abort req.signal：同步取消飞书侧待决审批
      const onSignalAbort = () => {
        timeoutFired = true
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

      if (!timeoutFired) {
        const label = outcome === 'allowed-once' ? `✓ **已批准执行**` : outcome === 'rejected' ? `❌ **已拒绝执行**` : `**[${outcome}]**`
        void this.sendText(`${label}（#${number}）`, sendOpts)
      }
      return outcome
    }

    const disposer = this.ctx.on('approval/request', listener, { prepend: true })
    this.disposers.push(disposer)
  }

  dispose() {
    if (this._patchTimer) {
      clearTimeout(this._patchTimer)
      this._patchTimer = null
    }
    this._inTurn = false
    this._streamCardId = null
    this._streamContent = ''
    this._lastPeer = null
    super.dispose()
  }
}

export const feishuNodeHelpers = {
  makePlatform,
}
