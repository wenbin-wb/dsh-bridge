// dsh-bridge Feishu / Lark conversation node
// 把飞书 OpenAPI / WebSocket 长连接入站事件解析后交给平台无关的
// ConversationBridge 处理，出站通过 FeishuGateway 发送文本 / 卡片。

import fs from 'node:fs'
import path from 'node:path'
import { ConversationBridge, conversationBridgeHelpers } from '../platform/conversation-bridge.js'

function makePlatform(gateway) {
  return {
    id: 'feishu',
    name: 'Feishu / Lark',
    capabilities: { supportsGroup: true, group: true, media: true, approvals: true },
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

function splitIntoIncremental(content, maxChunk = 150) {
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
  const slices = []
  let acc = ''
  for (const s of chunks) {
    acc += s
    slices.push(acc)
  }
  return slices
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
    return this.handleInbound({
      senderId: isGroup ? peerId : senderId,
      peerId,
      isGroup,
      text: fullText,
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
        this.clearApproval(approvalId)
        pending.resolve(outcome)
      }
    }
  }

  async sendText(text) {
    const peerId = this._lastPeer?.peerId || this.peerId
    if (!peerId) return
    const isGroup = this._lastPeer?.isGroup ?? (peerId.startsWith('oc_') || peerId.startsWith('chat_'))
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

  _attachApprovalBridge() {
    const listener = async (req, next) => {
      if (!this.ownsAgent(req.agent)) return next?.()
      const peer = this._lastPeer
      if (!peer?.peerId) return next?.()

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

      // 发送飞书卡片
      try {
        await this.gateway.sendCard(peer.peerId, card, { isGroup: peer.isGroup })
      } catch (err) {
        // 卡片发送失败降级发送 Markdown
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
        void this.gateway.sendMarkdownCard(peer.peerId, textFallback, { isGroup: peer.isGroup })
      }

      // 同时调用 downstream next()，使 Web UI 原生弹窗也能同步显示并支持直接操作
      let nextPromise = null
      if (typeof next === 'function') {
        try {
          const res = next()
          if (res && typeof res.then === 'function') {
            nextPromise = res
          }
        } catch {}
      }

      let timeoutFired = false
      let winner = 'feishu'
      const feishuPromise = new Promise((resolve) => {
        const timer = setTimeout(() => {
          timeoutFired = true
          this.clearApproval(number)
          resolve('rejected')
        }, timeoutSec * 1000)
        if (typeof timer.unref === 'function') timer.unref()
        this.registerApproval(number, { number, request: req, resolve, timer })
      })

      const outcome = await (nextPromise
        ? Promise.race([
            feishuPromise.then(res => { winner = 'feishu'; return res }),
            nextPromise.then(res => { winner = 'web'; return res }),
          ])
        : feishuPromise)

      // 如果 Web 端先决议，清除飞书端 pending 记录
      if (winner === 'web') {
        this.clearApproval(number)
      }

      if (!timeoutFired) {
        const sourceHint = winner === 'web' ? '（Web 端操作）' : ''
        const label = outcome === 'allowed-once' ? `✓ **已批准执行**${sourceHint}` : outcome === 'rejected' ? `❌ **已拒绝执行**${sourceHint}` : `**[${outcome}]**`
        void this.gateway.sendMarkdownCard(peer.peerId, `${label}（#${number}）`, { isGroup: peer.isGroup })
      }
      return outcome
    }

    const disposer = this.ctx.on('approval/request', listener)
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
