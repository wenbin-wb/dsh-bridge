// dsh-bridge 飞书平台测试（官方 Channel SDK 适配层）
//
// 覆盖：网关 ↔ SDK 映射、入站/出站契约、流式卡片、审批卡片、媒体下载，
// 以及一键扫码创建应用（registerApp）状态机。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { FeishuGateway } from '../lib/feishu/gateway.js'
import { FeishuConversationNode } from '../lib/feishu/node.js'
import { FeishuService } from '../lib/feishu/index.js'
import { DESIRED_SLASH_COMMANDS } from '../lib/feishu/slash-commands.js'
import { PlatformManager } from '../lib/platform/manager.js'
import { buildCommentPeerId, isCommentPeerId, flattenCommentElements, extractCommentInput } from '../lib/feishu/comment.js'

// ---------------------------------------------------------------------------
// 测试替身
// ---------------------------------------------------------------------------

function makeMockCordisCtx() {
  const events = {}
  const ctx = {
    on(event, fn) {
      (events[event] ??= []).push(fn)
      return () => { events[event] = (events[event] ?? []).filter(f => f !== fn) }
    },
    emit(event, ...args) {
      const fns = events[event] ?? []
      if (fns.length === 1) return fns[0](...args)
      return Promise.all(fns.map((fn) => fn(...args)))
    },
    effect(fn) { return fn() },
    logger: () => ({ info() {}, warn() {}, error() {}, debug() {} }),
    sessions: { list: () => [], get: () => undefined },
    agents: { create: async () => ({}), get: () => undefined },
    reflect: { provide(name, value) { ctx['__provided__' + name] = value; return () => {} } },
  }
  return ctx
}

/** 官方 Channel SDK 的等价替身：只实现网关实际调用的成员 */
function makeFakeChannel() {
  const state = {
    options: null,
    sent: [],
    streams: [],
    downloads: [],
    connectCount: 0,
    disconnectCount: 0,
    handlers: {},
    identity: { openId: 'ou_bot', name: 'dsh-bridge' },
    failStream: false,
    failSend: false,
  }

  const channel = {
    state,
    on(name, handler) {
      (state.handlers[name] ??= []).push(handler)
      return () => { state.handlers[name] = state.handlers[name].filter((h) => h !== handler) }
    },
    async connect() { state.connectCount += 1 },
    async disconnect() { state.disconnectCount += 1 },
    getBotIdentity() { return state.identity },
    async send(to, input, opts = {}) {
      if (state.failSend) throw new Error('send failed')
      state.sent.push({ to, input, opts })
      return { messageId: `om_${state.sent.length}` }
    },
    stream(to, input) {
      const record = { to, contents: [], finished: false }
      state.streams.push(record)
      // 真实 SDK：建卡/更新失败时 channel.stream() 返回 rejected promise
      if (state.failStream) return Promise.reject(new Error('stream failed'))
      let settleRun
      const run = new Promise((resolve) => { settleRun = resolve })
      const controller = {
        get messageId() { return `om_stream_${state.streams.length}` },
        async setContent(full) {
          if (state.failStream) throw new Error('stream failed')
          record.contents.push(full)
        },
        async append(chunk) {
          if (state.failStream) throw new Error('stream failed')
          record.contents.push((record.contents.at(-1) ?? '') + chunk)
        },
      }
      void (async () => {
        try {
          await input.markdown(controller)
          record.finished = true
          settleRun({ messageId: controller.messageId })
        } catch (err) {
          record.error = err
          settleRun(null)
        }
      })()
      return run
    },
    // 底层 node-sdk Client（斜杠指令同步经此调用 v7 接口）；用例可按需替换
    rawClient: {
      domain: 'https://open.feishu.cn',
      auth: {
        v3: {
          tenantAccessToken: {
            internal: async () => ({ tenant_access_token: 'tenant-token', expire: 7200 }),
          },
        },
      },
      httpInstance: {
        request: async () => ({ code: 0, data: { items: [] } }),
      },
    },
    // 云文档评论面（CommentSurface）
    comments: {
      async resolveTarget(fileToken, fileType) { return { fileToken, fileType } },
      async fetch() { return null },
      async reply() {},
    },
    async downloadResourceToFile(messageId, fileKey, type, destPath) {
      state.downloads.push({ messageId, fileKey, type, destPath })
      fs.writeFileSync(destPath, Buffer.from('mock-bytes'))
      return { contentType: 'application/octet-stream', bytesWritten: 10 }
    },
  }
  return channel
}

function makeGateway(config = {}, { ctx = makeMockCordisCtx(), channel = null } = {}) {
  const gw = new FeishuGateway(ctx, { appId: 'cli_x', appSecret: 'sec', ...config })
  gw._createChannel = (options) => {
    channel.state.options = options
    return channel
  }
  return { gw, ctx, channel }
}

// ---------------------------------------------------------------------------
// FeishuGateway：连接与 SDK 选项
// ---------------------------------------------------------------------------

test('[飞书] 启动网关：以文档化选项建通道、连接并上报机器人身份', async () => {
  const channel = makeFakeChannel()
  const { gw, ctx } = makeGateway({ maxMessageChars: 3500 }, { channel })
  const statuses = []
  ctx.on('feishu/status', (s) => statuses.push(s.status))

  const ok = await gw.start()

  assert.equal(ok, true)
  assert.equal(channel.state.connectCount, 1)
  assert.equal(gw.status, 'online')
  assert.equal(gw.botInfo.appName, 'dsh-bridge')
  assert.equal(gw.botInfo.openId, 'ou_bot')
  assert.ok(statuses.includes('starting') && statuses.includes('online'))

  // 选项必须落在 SDK 文档定义的字段上
  const options = channel.state.options
  assert.equal(options.appId, 'cli_x')
  assert.equal(options.domain, 0, 'feishu → Domain.Feishu')
  assert.equal(options.policy.requireMention, true)
  assert.equal(options.safety.chatQueue.cardActions, 'separate', '审批卡片动作需独立队列，避免与消息处理互锁')
  assert.equal(options.outbound.textChunkLimit, 3500, 'maxMessageChars 映射为出站分片上限')
  assert.equal(options.keepalive.enabled, true)
  assert.equal(options.loggerLevel, 2, 'SDK 日志级别依附 LoggerLevel.warn，避免 info 噪声')
  for (const level of ['error', 'warn', 'info', 'debug', 'trace']) {
    assert.equal(typeof options.logger[level], 'function', `SDK LoggerProxy 需要 ${level}() 方法`)
  }

  // lark 域名映射
  gw.updateConfig({ domain: 'lark' })
  assert.equal(gw._channelOptions().domain, 1, 'lark → Domain.Lark')

  gw.dispose()
})

test('[飞书] 启动失败：状态置 error 并释放通道', async () => {
  const channel = makeFakeChannel()
  channel.connect = async () => { throw new Error('handshake failed') }
  const { gw } = makeGateway({}, { channel })

  const ok = await gw.start()

  assert.equal(ok, false)
  assert.equal(gw.status, 'error')
  assert.match(gw.error, /handshake failed/)
  assert.equal(gw.channel, null)
})

test('[飞书] 未配置凭证时 start 返回 false 且保持 idle', async () => {
  const { gw } = makeGateway({ appId: '', appSecret: '' })
  assert.equal(await gw.start(), false)
  assert.equal(gw.status, 'idle')
})

// ---------------------------------------------------------------------------
// FeishuGateway：入站映射（含 #72 回归：出站目标必须是 chat_id）
// ---------------------------------------------------------------------------

test('[飞书] 入站消息映射：出站目标用 chat_id、身份用 open_id（issue #72 回归）', async () => {
  const channel = makeFakeChannel()
  const { gw, ctx } = makeGateway({}, { channel })
  await gw.start()

  const inbound = []
  ctx.on('feishu/message', (event) => inbound.push(event))
  const normalized = {
    messageId: 'om_1',
    chatId: 'oc_p2p_chat',
    chatType: 'p2p',
    senderId: 'ou_user_1',
    content: '你好 DSH',
    rawContentType: 'text',
    resources: [],
    mentionedBot: false,
    createTime: 1700000000000,
  }
  await channel.state.handlers.message[0](normalized)

  assert.equal(inbound.length, 1)
  assert.equal(inbound[0].peerId, 'oc_p2p_chat', '单聊出站必须用 chat_id，不能用 open_id')
  assert.equal(inbound[0].chatId, 'oc_p2p_chat')
  assert.equal(inbound[0].senderId, 'ou_user_1', '身份仍是发送者 open_id')
  assert.equal(inbound[0].isGroup, false)
  assert.equal(inbound[0].text, '你好 DSH')

  await channel.state.handlers.message[0]({ ...normalized, messageId: 'om_2', chatType: 'group', chatId: 'oc_group' })
  assert.equal(inbound[1].isGroup, true)
  assert.equal(inbound[1].peerId, 'oc_group')

  gw.dispose()
})

test('[飞书] 卡片回调：转发动作事件并回传 toast 响应', async () => {
  const channel = makeFakeChannel()
  const { gw, ctx } = makeGateway({}, { channel })
  await gw.start()

  const actions = []
  ctx.on('feishu/action', (event) => actions.push(event))

  const response = await channel.state.handlers.cardAction[0]({
    messageId: 'om_card',
    chatId: 'oc_p2p_chat',
    operator: { openId: 'ou_user_1' },
    action: { value: { action: 'approve', approvalId: 1 }, tag: 'button' },
  })

  assert.equal(actions.length, 1)
  assert.equal(actions[0].operatorId, 'ou_user_1')
  assert.equal(actions[0].value.approvalId, 1)
  assert.equal(response.toast.type, 'success')
  assert.match(response.toast.content, /已批准/)

  gw.dispose()
})

test('[飞书] 连接状态事件映射到 feishu/status', async () => {
  const channel = makeFakeChannel()
  const { gw, ctx } = makeGateway({}, { channel })
  await gw.start()

  const statuses = []
  ctx.on('feishu/status', (s) => statuses.push(s.status))
  channel.state.handlers.reconnecting[0]()
  channel.state.handlers.reconnected[0]()

  assert.deepEqual(statuses, ['reconnecting', 'online'])
  gw.dispose()
})

// ---------------------------------------------------------------------------
// FeishuGateway：出站
// ---------------------------------------------------------------------------

test('[飞书] 文本出站：无表格走 SDK post，含表格改用交互卡片', async () => {
  const channel = makeFakeChannel()
  const { gw } = makeGateway({}, { channel })
  await gw.start()

  // 普通 Markdown → SDK 的 post 路径（分片/重试/降级由 SDK 负责）
  await gw.sendText('oc_chat', '## 标题\n正文')
  assert.equal(channel.state.sent.length, 1)
  assert.equal(channel.state.sent[0].to, 'oc_chat')
  assert.deepEqual(channel.state.sent[0].input, { markdown: '## 标题\n正文' })

  await gw.sendText('oc_chat', '   ')
  assert.equal(channel.state.sent.length, 1, '空内容不发送')

  // 含表格 → 交互卡片（部分客户端不渲染 post 表格：实测鸿蒙版飞书），并按官方规范补空行
  await gw.sendText('oc_chat', '### 标题\n| a | b |\n| --- | --- |\n尾注')
  const tableSend = channel.state.sent.at(-1)
  assert.ok(tableSend.input.card, '表格内容应以交互卡片发送')
  assert.equal(tableSend.input.card.schema, '2.0')
  assert.equal(tableSend.input.card.body.elements[0].tag, 'markdown')
  assert.match(tableSend.input.card.body.elements[0].content, /### 标题\n\n\| a \| b \|/)
  assert.match(tableSend.input.card.body.elements[0].content, /\| --- \|\n\n尾注/)

  gw.dispose()
})

test('[飞书] 含表格的长内容分片且每片带表头；卡片失败回退富文本', async () => {
  // A. 分片：按 maxMessageChars 切开，续片自动补表头
  const channel = makeFakeChannel()
  const { gw } = makeGateway({ maxMessageChars: 500 }, { channel })
  await gw.start()
  const rows = Array.from({ length: 30 }, (_, i) => `| ${i} | ${'x'.repeat(40)} |`)
  await gw.sendText('oc_chat', ['### 列表', '| 编号 | 标题 |', '| --- | --- |', ...rows].join('\n'))
  const cards = channel.state.sent.filter((s) => s.input?.card)
  assert.ok(cards.length > 1, '超长表格应分片')
  assert.ok(cards.every((c) => c.input.card.body.elements[0].content.includes('| --- | --- |')), '每片都要带表头')
  gw.dispose()

  // B. 卡片通道失败 → 回退 SDK 的 post 路径
  const channel2 = makeFakeChannel()
  let cardAttempts = 0
  channel2.send = async (to, input) => {
    if (input?.card) { cardAttempts += 1; throw new Error('card rejected') }
    channel2.state.sent.push({ to, input })
    return { messageId: 'om_post' }
  }
  const { gw: gw2 } = makeGateway({}, { channel: channel2 })
  await gw2.start()
  await gw2.sendText('oc_chat', '### 标题\n| a | b |\n| --- | --- |')
  assert.equal(cardAttempts, 1)
  assert.ok(channel2.state.sent.at(-1).input.markdown, '卡片失败后应回退富文本')
  gw2.dispose()
})

test('[飞书] 媒体出站：图片走 image、其它走 file，源为 Buffer', async () => {
  const channel = makeFakeChannel()
  const { gw } = makeGateway({}, { channel })
  await gw.start()

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'feishu-media-'))
  const imagePath = path.join(dir, 'shot.PNG')
  const filePath = path.join(dir, 'report.pdf')
  fs.writeFileSync(imagePath, 'img')
  fs.writeFileSync(filePath, 'pdf')

  const imageResult = await gw.sendMediaFile('oc_chat', imagePath)
  assert.equal(imageResult.success, true)
  assert.ok(Buffer.isBuffer(channel.state.sent[0].input.image.source))
  assert.equal(channel.state.sent[0].to, 'oc_chat')

  const fileResult = await gw.sendMediaFile('oc_chat', filePath)
  assert.equal(fileResult.success, true)
  assert.equal(channel.state.sent[1].input.file.fileName, 'report.pdf')
  assert.ok(Buffer.isBuffer(channel.state.sent[1].input.file.source))

  const missing = await gw.sendMediaFile('oc_chat', path.join(dir, 'nope.pdf'))
  assert.equal(missing.success, false)

  gw.dispose()
})

test('[飞书] 发送失败返回 success:false 而不再静默', async () => {
  const channel = makeFakeChannel()
  channel.state.failSend = true
  const { gw } = makeGateway({}, { channel })
  await gw.start()

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'feishu-media-'))
  const filePath = path.join(dir, 'a.txt')
  fs.writeFileSync(filePath, 'x')
  const result = await gw.sendMediaFile('oc_chat', filePath)

  assert.equal(result.success, false)
  assert.match(result.error, /send failed/)

  await assert.rejects(() => gw.sendText('oc_chat', 'hi'), /send failed/)

  gw.dispose()
})

test('[飞书] 流式卡片：setContent 覆盖内容，finish 收尾，重复 finish 幂等', async () => {
  const channel = makeFakeChannel()
  const { gw } = makeGateway({}, { channel })
  await gw.start()

  const stream = await gw.openStream('oc_chat')
  await stream.setContent('第一段')
  await stream.setContent('第一段\n第二段')
  await stream.finish()
  await stream.finish()

  const record = channel.state.streams[0]
  assert.equal(record.to, 'oc_chat')
  assert.deepEqual(record.contents, ['第一段', '第一段\n第二段'])
  assert.equal(record.finished, true)

  gw.dispose()
})

test('[飞书] 流式建卡失败：openStream 抛出，调用方可降级', async () => {
  const channel = makeFakeChannel()
  channel.state.failStream = true
  const { gw } = makeGateway({}, { channel })
  await gw.start()

  await assert.rejects(() => gw.openStream('oc_chat'), /stream failed/)
  gw.dispose()
})

test('[飞书] 资源下载与一键注册透传给 SDK', async () => {
  const channel = makeFakeChannel()
  const { gw } = makeGateway({}, { channel })
  await gw.start()

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'feishu-dl-'))
  const dest = path.join(dir, 'f.bin')
  const result = await gw.downloadResourceToFile('om_1', 'file_key_1', 'file', dest)
  assert.equal(result.bytesWritten, 10)
  assert.equal(channel.state.downloads[0].fileKey, 'file_key_1')
  assert.ok(fs.existsSync(dest))

  // 正常停止后通道释放
  await gw.stop()
  assert.equal(gw.status, 'offline')
  assert.equal(channel.state.disconnectCount, 1)
  assert.equal(gw.channel, null)
})

// ---------------------------------------------------------------------------
// FeishuConversationNode：入站 / 流式 / 审批
// ---------------------------------------------------------------------------

function makeNodeHarness({ status = 'online', sendChunkDelayMs = 100 } = {}) {
  const ctx = makeMockCordisCtx()
  const sends = []
  const streams = []
  const gateway = {
    status,
    _closing: false,
    sendText: async (peerId, text) => { sends.push({ peerId, text }); return { messageId: 'om_t' } },
    sendCard: async (peerId, card) => { sends.push({ peerId, card }); return { messageId: 'om_card' } },
    sendMediaFile: async () => ({ success: true }),
    downloadResourceToFile: async () => ({ bytesWritten: 0 }),
    openStream: async (peerId) => {
      const record = { peerId, contents: [], finished: false }
      streams.push(record)
      return {
        to: peerId,
        setContent: async (full) => { record.contents.push(full) },
        finish: async () => { record.finished = true },
      }
    },
  }
  ctx.feishu = gateway
  // 真实宿主里活动会话必然有一个 Agent 实例，轮次绑定以 agent.session.id 为 key
  // （issue #93）。桩里也要给出同样的形状，否则 handleInbound 走到"无活动会话"，
  // 审批测试就测不到真实链路。
  const agent = {
    session: { id: 'sess_1' },
    status: 'idle',
    followup() {},
    steer() {},
    cancel() {},
  }
  ctx.agents = {
    get: (id) => (id === 'sess_1' ? agent : undefined),
    create: async ({ sessionId }) => ({ agent: { ...agent, session: { id: sessionId ?? 'sess_1' } } }),
    resume: async ({ resumeSessionId }) => ({ agent: { ...agent, session: { id: resumeSessionId ?? 'sess_1' } } }),
  }
  const logger = { info() {}, warn() {}, error() {}, debug() {} }
  const node = new FeishuConversationNode(ctx, { allowFrom: [], sendChunkDelayMs }, logger)
  node.activeSessionId = 'sess_1'
  // 会话目标：真实链路中由入站消息写入 _lastPeer
  node._lastPeer = { peerId: 'oc_chat', senderId: 'ou_user', isGroup: false }
  return { ctx, node, gateway, sends, streams }
}

test('[飞书] 轮次内输出：整轮共用一张流式卡片（不影响既有"不碎片化"契约）', async () => {
  const { ctx, node, sends, streams } = makeNodeHarness()

  ctx.emit('session/event', { id: 'sess_1' }, { type: 'turn/start', data: { turn: 1 } })
  await node.sendText('正在思考...')
  assert.equal(streams.length, 1, '首段输出建立流式卡片')
  assert.equal(streams[0].peerId, 'oc_chat')
  assert.ok(streams[0].contents.length >= 1)

  await node.sendText('正在思考...\n已完成代码生成：\n```js\nconsole.log(1)\n```')
  assert.equal(streams.length, 1, '后续输出不得新建卡片')
  assert.equal(streams[0].contents.at(-1), '正在思考...\n已完成代码生成：\n```js\nconsole.log(1)\n```')

  ctx.emit('session/event', { id: 'sess_1' }, { type: 'turn/end', data: { reason: { kind: 'complete' } } })
  await new Promise((r) => setTimeout(r, 10))
  assert.equal(streams[0].finished, true, 'turn/end 必须收尾流式卡片')
  assert.equal(sends.length, 0, '轮次内不额外发独立消息')

  node.dispose()
})

test('[飞书] 轮次外输出：单条 Markdown 消息，不建流式卡片', async () => {
  const { node, sends, streams } = makeNodeHarness()

  await node.sendText('## 帮助\n- /new')
  await new Promise((r) => setTimeout(r, 10))

  assert.equal(streams.length, 0)
  assert.equal(sends.length, 1)
  assert.equal(sends[0].text, '## 帮助\n- /new')
  assert.equal(sends[0].peerId, 'oc_chat')

  node.dispose()
})

test('[飞书] 出站失败写日志而非静默丢弃', async () => {
  const { ctx, node } = makeNodeHarness()
  const warnings = []
  node.logger = { info() {}, warn: (...args) => warnings.push(args), error() {}, debug() {} }
  node.gateway.sendText = async () => { throw new Error('230101: Sending messages to users is temporarily unavailable.') }

  await node.sendText('测试')
  await new Promise((r) => setTimeout(r, 10))

  assert.equal(warnings.length, 1, '失败必须留痕')
  assert.match(String(warnings[0][0]), /outbound send failed/)

  ctx.emit('session/event', { id: 'sess_1' }, { type: 'turn/start' })
  node.dispose()
})

test('[飞书] 轮次内入站事件带上会话目标（chat_id）', async () => {
  const { ctx, node } = makeNodeHarness()
  const handled = []
  node.handleInbound = async (item) => { handled.push(item); return 'routed' }

  await ctx.emit('feishu/message', {
    chatId: 'oc_chat',
    peerId: 'oc_chat',
    senderId: 'ou_user',
    isGroup: false,
    text: 'hello',
    messageId: 'om_1',
    rawContentType: 'text',
    resources: [],
  })

  assert.equal(handled.length, 1)
  assert.deepEqual(handled[0].outboundPeer, { peerId: 'oc_chat', isGroup: false, messageId: 'om_1', threadId: '' })
  assert.equal(handled[0].senderId, 'ou_user', '单聊身份为发送者 open_id')

  // 群聊：以群为授权主体
  await ctx.emit('feishu/message', {
    chatId: 'oc_group',
    peerId: 'oc_group',
    senderId: 'ou_user',
    isGroup: true,
    text: '@机器人 跑一下',
    messageId: 'om_2',
    rawContentType: 'text',
    resources: [],
  })
  assert.equal(handled[1].senderId, 'oc_group')
  assert.deepEqual(handled[1].outboundPeer, { peerId: 'oc_group', isGroup: true, messageId: 'om_2', threadId: '' })

  node.dispose()
})

test('[飞书] 媒体消息：纯媒体占位正文被忽略，附件以下载路径描述', async () => {
  const { ctx, node, gateway } = makeNodeHarness()
  const downloads = []
  gateway.downloadResourceToFile = async (messageId, fileKey, type, destPath) => {
    downloads.push({ messageId, fileKey, type, destPath })
    fs.writeFileSync(destPath, Buffer.from('bytes'))
    return { contentType: 'application/pdf', bytesWritten: 5 }
  }
  const handled = []
  node.handleInbound = async (item) => { handled.push(item); return 'routed' }
  node.config.cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'feishu-cwd-'))

  await ctx.emit('feishu/message', {
    chatId: 'oc_chat',
    peerId: 'oc_chat',
    senderId: 'ou_user',
    isGroup: false,
    text: '<file key="fk_1" name="doc.pdf"/>',
    messageId: 'om_media',
    rawContentType: 'file',
    resources: [{ type: 'file', fileKey: 'fk_1', fileName: 'doc.pdf' }],
  })

  assert.equal(downloads.length, 1)
  assert.equal(downloads[0].fileKey, 'fk_1')
  assert.equal(downloads[0].type, 'file')
  assert.equal(path.basename(downloads[0].destPath), 'doc.pdf')
  assert.equal(handled.length, 1)
  assert.ok(handled[0].text.includes('[文件: '), '附件以本地路径描述')
  assert.ok(!handled[0].text.includes('file key='), 'SDK 占位标记不得投喂给模型')

  node.dispose()
})

test('[飞书] 审批卡片发到 chat_id，且仅发起者可决议（单聊）', async () => {
  const { ctx, node, sends } = makeNodeHarness()
  node.config.allowFrom = ['ou_user']

  await ctx.emit('feishu/message', {
    chatId: 'oc_chat',
    peerId: 'oc_chat',
    senderId: 'ou_user',
    isGroup: false,
    text: '创建文件',
    messageId: 'om_1',
    rawContentType: 'text',
    resources: [],
  })
  await new Promise((r) => setTimeout(r, 20))

  const decide = ctx.emit('approval/request', {
    agent: { session: { id: 'sess_1' } },
    toolName: 'write_file',
    reason: 'run tests',
  })
  await new Promise((r) => setTimeout(r, 20))

  const cardSend = sends.find((s) => s.card)
  assert.ok(cardSend, '审批卡片必须发出')
  assert.equal(cardSend.peerId, 'oc_chat', '卡片发往会话 chat_id')

  // 非发起者点击被拒绝
  await ctx.emit('feishu/action', { operatorId: 'ou_evil', value: { action: 'approve', approvalId: 1 } })
  const pending = await Promise.race([
    decide.then(() => 'decided'),
    new Promise((r) => setTimeout(() => r('pending'), 30)),
  ])
  assert.equal(pending, 'pending')

  // 发起者点击生效
  await ctx.emit('feishu/action', { operatorId: 'ou_user', value: { action: 'approve', approvalId: 1 } })
  assert.equal(await decide, 'allowed-once')

  node.dispose()
})

test('[飞书] 话题群：出站留在原话题内（replyTo + replyInThread），普通会话不引用', async () => {
  const { ctx, node, gateway, sends } = makeNodeHarness()
  const streamOpts = []
  gateway.sendText = async (peerId, text, opts) => { sends.push({ peerId, text, opts }); return { messageId: 'om_t' } }
  gateway.openStream = async (peerId, opts) => {
    streamOpts.push({ peerId, opts })
    return { to: peerId, setContent: async () => {}, finish: async () => {} }
  }

  // 普通会话：不引用（观感与既往一致）
  await ctx.emit('feishu/message', {
    chatId: 'oc_chat', peerId: 'oc_chat', senderId: 'ou_user', isGroup: false,
    text: '你好', messageId: 'om_1', threadId: '', replyToMessageId: '', rawContentType: 'text', resources: [],
  })
  await new Promise((r) => setTimeout(r, 10))
  await node.sendText('普通回复')
  await new Promise((r) => setTimeout(r, 10))
  assert.deepEqual(sends.at(-1).opts, {}, '普通会话不加 replyTo（不出现引用条）')

  // 话题群：回复留在话题内
  await ctx.emit('feishu/message', {
    chatId: 'oc_topic', peerId: 'oc_topic', senderId: 'ou_user', isGroup: true,
    text: '话题里提问', messageId: 'om_topic_msg', threadId: 'omt_topic_root', replyToMessageId: 'omt_topic_root',
    rawContentType: 'text', resources: [],
  })
  await new Promise((r) => setTimeout(r, 10))
  await node.sendText('话题内回复')
  await new Promise((r) => setTimeout(r, 10))
  assert.deepEqual(sends.at(-1).opts, { replyTo: 'om_topic_msg', replyInThread: true }, '话题群回复要留在话题内')

  // 轮次内（流式卡片）同样带话题参数
  ctx.emit('session/event', { id: 'sess_1' }, { type: 'turn/start', data: { turn: 1 } })
  await node.sendText('流式内容')
  await new Promise((r) => setTimeout(r, 10))
  assert.deepEqual(streamOpts.at(-1).opts, { replyTo: 'om_topic_msg', replyInThread: true })

  node.dispose()
})

test('[飞书] 引用回复：拉取被引用正文作为上下文；话题群不额外拉取', async () => {
  const { ctx, node, gateway } = makeNodeHarness()
  const fetched = []
  gateway.fetchMessage = async (messageId) => {
    fetched.push(messageId)
    return { messageId, content: '被引用的原始需求：帮我改登录超时' }
  }
  const handled = []
  node.handleInbound = async (item) => { handled.push(item); return 'routed' }

  // 普通会话的引用回复
  await ctx.emit('feishu/message', {
    chatId: 'oc_chat', peerId: 'oc_chat', senderId: 'ou_user', isGroup: false,
    text: '这个改成 30 分钟', messageId: 'om_2', threadId: '', replyToMessageId: 'om_quoted',
    rawContentType: 'text', resources: [],
  })
  assert.deepEqual(fetched, ['om_quoted'])
  assert.match(handled[0].text, /\[引用消息\] 被引用的原始需求/)
  assert.match(handled[0].text, /这个改成 30 分钟/)

  // 话题群：位置语义已由 replyInThread 承载，不再每条拉取
  await ctx.emit('feishu/message', {
    chatId: 'oc_topic', peerId: 'oc_topic', senderId: 'ou_user', isGroup: true,
    text: '话题内发言', messageId: 'om_3', threadId: 'omt_root', replyToMessageId: 'omt_root',
    rawContentType: 'text', resources: [],
  })
  assert.deepEqual(fetched, ['om_quoted'], '话题群消息不触发额外拉取')

  node.dispose()
})

test('[飞书] 审批后输出从新卡片续写（不再写回上方旧流式卡片）', async () => {
  const { ctx, node, gateway, streams } = makeNodeHarness()
  // 记录"谁先发生"，直接锁定用户可见的消息顺序
  const order = []
  gateway.openStream = async (peerId) => {
    const record = { peerId, contents: [], finished: false }
    streams.push(record)
    order.push(`stream#${streams.length}`)
    return {
      to: peerId,
      setContent: async (full) => { record.contents.push(full) },
      finish: async () => { record.finished = true; order.push(`finish#${streams.length}`) },
    }
  }
  const baseSendCardRef = gateway.sendCardRef
  gateway.createCard = async () => 'card_1'
  gateway.sendCardRef = async (to, cardId, opts) => { order.push('approval-card'); return baseSendCardRef(to, cardId, opts) }

  await ctx.emit('feishu/message', {
    chatId: 'oc_chat', peerId: 'oc_chat', senderId: 'ou_user', isGroup: false,
    text: '跑个命令', messageId: 'om_1', rawContentType: 'text', resources: [],
  })
  await new Promise((r) => setTimeout(r, 20))

  // 轮次内先有输出 → 建立第 1 张流式卡片
  ctx.emit('session/event', { id: 'sess_1' }, { type: 'turn/start', data: { turn: 1 } })
  await node.sendText('我先说明一下要做什么')
  assert.equal(streams.length, 1)

  // 审批卡发出（此时应收尾第 1 张卡片）
  const decide = ctx.emit('approval/request', { agent: { session: { id: 'sess_1' } }, toolName: 'bash' })
  await new Promise((r) => setTimeout(r, 20))
  assert.equal(streams[0].finished, true, '审批卡发出前应收尾旧流式卡片')

  // 决议后模型接着输出 → 应新建第 2 张卡片（顺序在审批卡之后）
  await ctx.emit('feishu/action', { operatorId: 'ou_user', value: { action: 'approve', approvalId: 1 } })
  assert.equal(await decide, 'allowed-once')
  await node.sendText('批准后继续执行的结果')
  assert.equal(streams.length, 2, '审批后的输出应写入新卡片')
  assert.match(streams[1].contents.at(-1), /批准后继续执行的结果/)

  // 用户可见顺序：旧流式卡 → 收尾 → 审批卡 → 新流式卡
  assert.deepEqual(order, ['stream#1', 'finish#1', 'approval-card', 'stream#2'], '消息顺序必须符合阅读顺序')

  node.dispose()
})

test('[飞书] 出站目标解析器：单聊取 chat_id，不用发送者 open_id；轮次绑定优先', () => {
  const { node } = makeNodeHarness()
  node._lastPeer = { peerId: 'oc_chat', senderId: 'ou_user', isGroup: false }
  assert.equal(node.resolveSendTarget({}), 'oc_chat', '单聊必须用会话 chat_id')
  assert.equal(node.resolveSendTarget({ outboundPeer: { peerId: 'oc_topic', isGroup: true } }), 'oc_topic', '轮次绑定优先')
  node.dispose()
})

test('[飞书] 接收附件：落盘到当前会话工作区（session.header.cwd）', async () => {
  const { ctx, node, gateway } = makeNodeHarness()
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'feishu-recv-'))
  const downloads = []
  gateway.downloadResourceToFile = async (messageId, fileKey, type, destPath) => {
    downloads.push({ messageId, fileKey, type, destPath })
    fs.writeFileSync(destPath, Buffer.from('bytes'))
    return { contentType: 'application/pdf', bytesWritten: 5 }
  }
  // DSH 会话：cwd 在 header 内
  ctx.sessions = { get: (id) => (id === 'sess_1' ? { id, header: { cwd: workDir } } : undefined), list: () => [] }
  node.handleInbound = async () => 'routed'

  await ctx.emit('feishu/message', {
    chatId: 'oc_chat', peerId: 'oc_chat', senderId: 'ou_user', isGroup: false,
    text: '', messageId: 'om_media', rawContentType: 'file',
    resources: [{ type: 'file', fileKey: 'fk_1', fileName: 'doc.pdf' }],
  })

  assert.equal(downloads.length, 1)
  assert.ok(downloads[0].destPath.startsWith(path.join(workDir, '.feishu-media')), `应落到会话工作区，实际 ${downloads[0].destPath}`)
  node.dispose()
})

test('[飞书] 审批卡片走 CardKit 实体：决议后原地更新、不再补文字消息', async () => {
  const { ctx, node, gateway, sends } = makeNodeHarness()
  const calls = { create: [], sendRef: [], update: [] }
  gateway.createCard = async (card) => { calls.create.push(card); return 'card_1' }
  gateway.sendCardRef = async (to, cardId) => { calls.sendRef.push({ to, cardId }); return { messageId: 'om_ref' } }
  gateway.updateCardById = async (cardId, card, sequence) => { calls.update.push({ cardId, card, sequence }) }

  await ctx.emit('feishu/message', {
    chatId: 'oc_chat', peerId: 'oc_chat', senderId: 'ou_user', isGroup: false,
    text: '创建文件', messageId: 'om_1', rawContentType: 'text', resources: [],
  })
  await new Promise((r) => setTimeout(r, 20))

  const decide = ctx.emit('approval/request', { agent: { session: { id: 'sess_1' } }, toolName: 'write_file', reason: 'run tests' })
  await new Promise((r) => setTimeout(r, 20))

  assert.equal(calls.create.length, 1, '应先创建卡片实体')
  assert.ok(calls.create[0].body.elements.some((el) => el.tag === 'column_set'), '待决卡片含按钮')
  assert.deepEqual(calls.sendRef[0], { to: 'oc_chat', cardId: 'card_1' }, '发送引用卡片实体的消息')
  assert.equal(sends.filter((x) => x.card).length, 0, '走实体时不再发内联卡片')

  await ctx.emit('feishu/action', { operatorId: 'ou_user', operatorName: '文斌', value: { action: 'approve', approvalId: 1 } })
  assert.equal(await decide, 'allowed-once')
  await new Promise((r) => setTimeout(r, 10))

  assert.equal(calls.update.length, 1, '决议后原地更新卡片')
  const updated = calls.update[0]
  assert.equal(updated.cardId, 'card_1')
  assert.equal(updated.sequence, 1, 'sequence 从 1 起严格递增')
  assert.equal(updated.card.header.template, 'green', '结果态换表头配色')
  assert.ok(!updated.card.body.elements.some((el) => el.tag === 'column_set'), '结果态去掉按钮')
  // 卡片 JSON 2.0 不支持 note 元素（实测服务端 200861 unsupported tag note）→ 结果提示必须并入 markdown
  assert.deepEqual(updated.card.body.elements.map((el) => el.tag), ['markdown'], '结果态只用 markdown 元素')
  assert.match(updated.card.body.elements[0].content, /已批准执行/)
  assert.match(updated.card.body.elements[0].content, /文斌/, '显示决议者昵称')
  assert.equal(sends.filter((x) => x.text && x.text.includes('已批准执行')).length, 0, '卡片已原地更新，不再补"已批准"文字')

  node.dispose()
})

test('[飞书] 审批超时 / 任务中止：卡片原地更新为对应结果态', async () => {
  // A. 超时
  {
    const { ctx, node, gateway } = makeNodeHarness()
    const updates = []
    gateway.createCard = async () => 'card_t'
    gateway.sendCardRef = async () => ({ messageId: 'om_ref' })
    gateway.updateCardById = async (cardId, card, sequence) => { updates.push({ card, sequence }) }
    node.config.approvalTimeoutSec = 0.05
    await ctx.emit('feishu/message', { chatId: 'oc_chat', peerId: 'oc_chat', senderId: 'ou_user', isGroup: false, text: 'x', messageId: 'om_1', rawContentType: 'text', resources: [] })
    await new Promise((r) => setTimeout(r, 10))
    const decide = ctx.emit('approval/request', { agent: { session: { id: 'sess_1' } }, toolName: 'bash' })
    // 桥内审批超时定时器是 unref 的：Node 22 下事件循环可能先退出（用例挂起并级联取消后续用例），
    // 这里用 ref 定时器把事件循环托住，等超时真正触发。
    const keepAlive = setTimeout(() => {}, 5000)
    try {
      assert.equal(await decide, 'rejected')
    } finally {
      clearTimeout(keepAlive)
    }
    await new Promise((r) => setTimeout(r, 20))
    assert.equal(updates.length, 1)
    assert.equal(updates[0].card.header.template, 'grey')
    assert.match(updates[0].card.body.elements[0].content, /已超时/)
    node.dispose()
  }

  // B. 任务中止（req.signal abort）
  {
    const { ctx, node, gateway } = makeNodeHarness()
    const updates = []
    gateway.createCard = async () => 'card_a'
    gateway.sendCardRef = async () => ({ messageId: 'om_ref' })
    gateway.updateCardById = async (cardId, card, sequence) => { updates.push({ card, sequence }) }
    await ctx.emit('feishu/message', { chatId: 'oc_chat', peerId: 'oc_chat', senderId: 'ou_user', isGroup: false, text: 'x', messageId: 'om_1', rawContentType: 'text', resources: [] })
    await new Promise((r) => setTimeout(r, 10))
    const controller = new AbortController()
    const decide = ctx.emit('approval/request', { agent: { session: { id: 'sess_1' } }, toolName: 'bash', signal: controller.signal })
    await new Promise((r) => setTimeout(r, 10))
    controller.abort()
    assert.equal(await decide, 'cancelled')
    await new Promise((r) => setTimeout(r, 20))
    assert.equal(updates.length, 1)
    assert.match(updates[0].card.body.elements[0].content, /已取消/)
    node.dispose()
  }
})

test('[飞书] 卡片实体不可用时回退内联卡片 + 文字确认', async () => {
  const { ctx, node, gateway, sends } = makeNodeHarness()
  gateway.createCard = async () => { throw new Error('cardkit permission denied') }

  await ctx.emit('feishu/message', { chatId: 'oc_chat', peerId: 'oc_chat', senderId: 'ou_user', isGroup: false, text: 'x', messageId: 'om_1', rawContentType: 'text', resources: [] })
  await new Promise((r) => setTimeout(r, 20))
  const decide = ctx.emit('approval/request', { agent: { session: { id: 'sess_1' } }, toolName: 'bash' })
  await new Promise((r) => setTimeout(r, 20))
  assert.equal(sends.filter((s) => s.card).length, 1, '退回内联卡片')

  await ctx.emit('feishu/action', { operatorId: 'ou_user', value: { action: 'reject', approvalId: 1 } })
  assert.equal(await decide, 'rejected')
  await new Promise((r) => setTimeout(r, 10))
  assert.equal(sends.filter((s) => s.text && s.text.includes('已拒绝执行')).length, 1, '内联卡片下仍补文字确认')

  node.dispose()
})

test('[飞书] 通道选项：开启发送者昵称解析、配置本地文件白名单目录', async () => {
  const channel = makeFakeChannel()
  const { gw } = makeGateway({ cwd: '/srv/work' }, { channel })
  await gw.start()
  const options = channel.state.options

  assert.equal(options.resolveSenderNames, true, '群聊需要知道"谁在说话"')
  assert.ok(options.outbound.allowedFileDirs.includes('/srv/work'), '工作目录进入白名单')
  assert.ok(options.outbound.allowedFileDirs.includes(process.cwd()), '进程目录进入白名单')

  // 路径判定：白名单内 / 外
  assert.equal(gw._isInsideAllowedDirs('/srv/work/a/b.txt'), true)
  assert.equal(gw._isInsideAllowedDirs('/srv/work-other/a.txt'), false, '前缀相似但不同目录不得误判')
  assert.equal(gw._isInsideAllowedDirs('/etc/passwd'), false)

  gw.dispose()
})

test('[飞书] 媒体发送：白名单内交给 SDK 读盘（流式）、白名单外回退 Buffer', async () => {
  const channel = makeFakeChannel()
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'feishu-work-'))
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'feishu-out-'))
  const { gw } = makeGateway({ cwd: workDir }, { channel })
  await gw.start()

  const inside = path.join(workDir, 'big-report.pdf')
  fs.writeFileSync(inside, 'pdf-bytes')
  await gw.sendMediaFile('oc_chat', inside)
  assert.equal(channel.state.sent[0].input.file.source, inside, '白名单内传路径，由 SDK 流式读盘')

  const outside = path.join(outDir, 'other.pdf')
  fs.writeFileSync(outside, 'pdf-bytes')
  await gw.sendMediaFile('oc_chat', outside)
  assert.ok(Buffer.isBuffer(channel.state.sent[1].input.file.source), '白名单外回退 Buffer')

  gw.dispose()
})

test('[飞书] 群聊标注发送者昵称；p2p 不标注', async () => {
  const { ctx, node } = makeNodeHarness()
  const handled = []
  node.handleInbound = async (item) => { handled.push(item); return 'routed' }

  await ctx.emit('feishu/message', {
    chatId: 'oc_group', peerId: 'oc_group', senderId: 'ou_user', senderName: '文斌', isGroup: true,
    text: '跑一下测试', messageId: 'm1', rawContentType: 'text', resources: [],
  })
  assert.match(handled[0].text, /^\[来自 文斌\] 跑一下测试/)
  assert.equal(handled[0].senderLabel, '文斌', '昵称透传给轮次绑定（审批卡显示发起人）')

  await ctx.emit('feishu/message', {
    chatId: 'oc_p2p', peerId: 'oc_p2p', senderId: 'ou_user', senderName: '文斌', isGroup: false,
    text: '你好', messageId: 'm2', rawContentType: 'text', resources: [],
  })
  assert.equal(handled[1].text, '你好', '单聊不标注（永远是同一个人）')

  node.dispose()
})

test('[飞书] 审批卡片显示发起人（来自轮次绑定的昵称）', async () => {
  const { ctx, node, gateway, sends } = makeNodeHarness()
  gateway.createCard = async () => 'card_1'
  gateway.sendCardRef = async () => ({ messageId: 'om_ref' })
  const created = []
  gateway.createCard = async (card) => { created.push(card); return 'card_1' }

  await ctx.emit('feishu/message', {
    chatId: 'oc_group', peerId: 'oc_group', senderId: 'ou_user', senderName: '文斌', isGroup: true,
    text: '跑一下', messageId: 'm1', rawContentType: 'text', resources: [],
  })
  await new Promise((r) => setTimeout(r, 20))
  const decide = ctx.emit('approval/request', { agent: { session: { id: 'sess_1' } }, toolName: 'bash' })
  await new Promise((r) => setTimeout(r, 20))

  const markdown = created[0].body.elements[0].content
  assert.match(markdown, /\| \*\*发起人\*\* \| 文斌 \|/)

  await ctx.emit('feishu/action', { operatorId: 'ou_user', value: { action: 'approve', approvalId: 1 } })
  assert.equal(await decide, 'allowed-once')
  assert.ok(sends.filter((x) => x.card).length === 0)
  node.dispose()
})

// ---------------------------------------------------------------------------
// 云文档评论 @机器人
// ---------------------------------------------------------------------------

function makeCommentHarness() {
  const h = makeNodeHarness()
  h.gateway.botInfo = { openId: 'ou_bot' }
  h.gateway.fetchComment = async () => ({
    text: '帮我看看这段代码',
    quote: '被选中的原文',
    isWhole: false,
    replyId: 'r1',
  })
  const handled = []
  h.node.handleInbound = async (item) => { handled.push(item); return 'routed' }
  return { ...h, handled }
}

const commentEvent = (over = {}) => ({
  fileToken: 'docx1', fileType: 'docx', commentId: 'c1', operatorId: 'ou_user', mentionedBot: true, ...over,
})

test('[飞书] 评论工具函数：peer id 合成/识别、富文本拍平、输入提取', () => {
  assert.equal(buildCommentPeerId({ fileToken: 'docx1', commentId: 'c1' }), 'comment:docx1:c1')
  assert.equal(isCommentPeerId('comment:docx1:c1'), true)
  assert.equal(isCommentPeerId('oc_chat'), false)

  assert.equal(flattenCommentElements([
    { type: 'text_run', text_run: { text: '看下 ' } },
    { type: 'person', person: { user_id: 'ou_x' } },
    { type: 'docs_link', docs_link: { url: 'https://x' } },
  ]), '看下 @ou_xhttps://x')

  const input = extractCommentInput({
    isWhole: true, quote: '原文',
    replies: [
      { reply_id: 'r1', content: { elements: [{ type: 'text_run', text_run: { text: '第一条' } }] } },
      { reply_id: 'r2', content: { elements: [{ type: 'text_run', text_run: { text: '最新一条' } }] } },
    ],
  })
  assert.equal(input.text, '最新一条', '取最后一条回复作为本次输入')
  assert.equal(input.quote, '原文')
  assert.equal(input.isWhole, true)
  assert.equal(input.replyId, 'r2')
  assert.equal(input.replyCount, 2)
})

test('[飞书] 云文档评论：@机器人 触发一轮输入（带选中内容）', async () => {
  const { ctx, handled } = makeCommentHarness()

  await ctx.emit('feishu/comment', commentEvent())

  assert.equal(handled.length, 1)
  assert.equal(handled[0].senderId, 'ou_user')
  assert.match(handled[0].text, /\[选中内容\] 被选中的原文/)
  assert.match(handled[0].text, /帮我看看这段代码/)
  assert.deepEqual(handled[0].outboundPeer, { peerId: 'comment:docx1:c1', isGroup: false, comment: true })
})

test('[飞书] 云文档评论：未 @ 的评论忽略、同线程后续回复免 @', async () => {
  const { ctx, handled } = makeCommentHarness()

  await ctx.emit('feishu/comment', commentEvent({ commentId: 'c_other', operatorId: 'ou_x', mentionedBot: false }))
  assert.equal(handled.length, 0, '未 @机器人 的其他评论应忽略')

  await ctx.emit('feishu/comment', commentEvent())
  assert.equal(handled.length, 1)

  await ctx.emit('feishu/comment', commentEvent({ mentionedBot: false }))
  assert.equal(handled.length, 2, '同一评论线程的后续回复（不再 @）继续处理')
})

test('[飞书] 评论轮次：出站先缓冲、turn/end 合并成一条回复，且不走流式卡片', async () => {
  const { ctx, node, sends, streams } = makeCommentHarness()
  await ctx.emit('feishu/comment', commentEvent())
  await new Promise((r) => setTimeout(r, 10))

  ctx.emit('session/event', { id: 'sess_1' }, { type: 'turn/start', data: { turn: 1 } })
  await node.sendText('第一段')
  await node.sendText('第二段')
  await new Promise((r) => setTimeout(r, 10))
  assert.equal(sends.length, 0, '轮次内不立即发评论（避免刷屏）')
  assert.equal(streams.length, 0, '评论轮次不使用流式卡片')

  ctx.emit('session/event', { id: 'sess_1' }, { type: 'turn/end', data: { reason: { kind: 'complete' } } })
  await new Promise((r) => setTimeout(r, 20))
  assert.equal(sends.length, 1, 'turn/end 合并成一条评论回复')
  assert.equal(sends[0].peerId, 'comment:docx1:c1')
  assert.match(sends[0].text, /第一段[\s\S]*第二段/)
})

test('[飞书] 评论轮次：审批不拦截（交回宿主 GUI），也不产生心跳摘要', async () => {
  const { ctx, node, sends } = makeCommentHarness()
  await ctx.emit('feishu/comment', commentEvent())
  await new Promise((r) => setTimeout(r, 10))

  // 审批：评论轮次直接放行（harness 的 emit 无 next → 返回 undefined 且不发卡片）
  const approval = await ctx.emit('approval/request', { agent: { session: { id: 'sess_1' } }, toolName: 'bash' })
  assert.equal(approval, undefined)
  assert.equal(sends.filter((x) => x.card).length, 0, '不应为评论轮次发送审批卡片')

  // 心跳摘要：评论会话跳过（观察桥侧 sendText 调用）
  const digestSends = []
  node.sendText = (text, opts) => { digestSends.push({ text, opts }); return Promise.resolve() }
  node.config.digestIntervalSec = 0.02
  node._turnPeers.set('sess_1', { outboundPeer: { peerId: 'comment:docx1:c1', isGroup: false, comment: true }, senderId: 'ou_user' })
  const session = { id: 'sess_1', events: [{ type: 'turn/start', data: { turn: 1 } }] }
  ctx.emit('session/event', session, { type: 'turn/start', data: { turn: 1 } })
  await new Promise((r) => setTimeout(r, 80))
  assert.equal(digestSends.length, 0, '评论会话不发进度摘要')

  // 对照：普通会话仍发摘要
  node._turnPeers.set('sess_1', { outboundPeer: { peerId: 'oc_chat', isGroup: false }, senderId: 'ou_user' })
  ctx.emit('session/event', session, { type: 'turn/start', data: { turn: 1 } })
  await new Promise((r) => setTimeout(r, 80))
  assert.ok(digestSends.length > 0, '普通会话仍发进度摘要')

  node.dispose()
})

test('[飞书] 网关：评论 peer 出站走 comments.reply（整篇文档评论用 topLevel），媒体被拒绝', async () => {
  const channel = makeFakeChannel()
  const replies = []
  channel.comments.resolveTarget = async (fileToken, fileType) => ({ fileToken, fileType })
  channel.comments.fetch = async () => ({
    commentId: 'c1', isWhole: true, quote: '',
    replies: [{ reply_id: 'r1', content: { elements: [{ type: 'text_run', text_run: { text: '问题' } }] } }],
  })
  channel.comments.reply = async (target, commentId, text, opts) => { replies.push({ target, commentId, text, opts }) }
  const { gw } = makeGateway({}, { channel })
  await gw.start()

  const detail = await gw.fetchComment({ peerId: 'comment:docx1:c1', fileToken: 'docx1', fileType: 'docx', commentId: 'c1' })
  assert.equal(detail.text, '问题')
  assert.equal(detail.isWhole, true)

  await gw.sendText('comment:docx1:c1', '**纯文本回复**')
  assert.equal(replies.length, 1)
  assert.equal(replies[0].commentId, 'c1')
  assert.equal(replies[0].text, '**纯文本回复**', '评论回复原样发送，不做 Markdown 归一化')
  assert.deepEqual(replies[0].opts, { topLevel: true }, '整篇文档评论直接发顶层')

  const media = await gw.sendMediaFile('comment:docx1:c1', '/tmp/x.png')
  assert.equal(media.success, false)
  assert.match(media.error, /评论会话不支持发送文件/)

  gw.dispose()
})

// ---------------------------------------------------------------------------
// FeishuService：配置 / 状态 / 一键创建应用
// ---------------------------------------------------------------------------

function makeService({ config = {}, gatewayStub = {} } = {}) {
  const ctx = makeMockCordisCtx()
  const persisted = []
  const svc = new FeishuService({
    ctx,
    logger: ctx.logger(),
    config,
    onPersist: async (patch) => { persisted.push(patch) },
  })
  // 测试隔离：不发起真实长连接
  const channel = makeFakeChannel()
  svc.gateway._createChannel = (options) => {
    channel.state.options = options
    return channel
  }
  Object.assign(svc.gateway, gatewayStub)
  return { svc, ctx, persisted, channel }
}

test('[飞书] 服务生命周期：白名单、配置持久化与状态快照', async () => {
  const { svc, persisted } = makeService({ config: { allowFrom: ['ou_u1'] } })

  assert.equal(svc.id, 'feishu')
  assert.equal(svc.name, 'Feishu')
  assert.equal(svc.configured, false)
  assert.deepEqual(svc.node.config.allowFrom, ['ou_u1'])
  assert.ok(svc.capabilities.group)
  assert.ok(svc.capabilities.approvals)

  svc.setAllowFrom(['ou_u1', 'ou_u2'])
  assert.deepEqual(svc.node.config.allowFrom, ['ou_u1', 'ou_u2'])
  assert.deepEqual(persisted.at(-1).allowFrom, ['ou_u1', 'ou_u2'])

  await svc.setConfig({ digestIntervalSec: 120, approvalTimeoutSec: 300, maxMessageChars: 3000 })
  assert.equal(svc.node.config.digestIntervalSec, 120)
  assert.equal(svc.node.config.approvalTimeoutSec, 300)
  assert.equal(persisted.at(-1).digestIntervalSec, 120)
  assert.equal(svc.gateway.config.maxMessageChars, 3000, '分片上限需同步到通道参数')

  const status = svc.getStatus()
  assert.equal(status.id, 'feishu')
  assert.equal(status.configured, false)
  assert.equal(status.config.appSecret, '', 'App Secret 不回传前端')
  assert.deepEqual(status.allowFrom, ['ou_u1', 'ou_u2'])
  assert.equal(status.login.phase, 'idle')
  assert.equal(status.status, 'idle')

  svc.dispose()
})

test('[飞书] 配置凭证后自动连接，状态为 connected 并注册进 PlatformManager', async () => {
  const { svc } = makeService()
  const pm = new PlatformManager({ logger: makeMockCordisCtx().logger() })
  pm.register(svc)

  const result = await svc.login({ appId: 'cli_a', appSecret: 'sec_b' })
  assert.deepEqual(result, { ok: true })
  assert.equal(svc.status, 'connected')
  assert.equal(svc.getStatus().status, 'connected')
  assert.equal(pm.get('feishu'), svc)

  svc.dispose()
})

test('[飞书] 一键创建应用：重新生成二维码会作废旧码并换新码', async () => {
  const { svc } = makeService()
  const runs = []
  svc.gateway.registerApp = ({ signal, onQRCodeReady }) => new Promise((resolve, reject) => {
    const record = { aborted: false }
    runs.push(record)
    signal.addEventListener('abort', () => {
      record.aborted = true
      const err = new Error('aborted')
      err.code = 'abort'
      reject(err)
    })
    onQRCodeReady({ url: `https://open.feishu.cn/page/launcher?user_code=CODE_${runs.length}`, expireIn: 600 })
  })

  await svc.login({ qrType: 'register' })
  assert.equal(svc.getStatus().login.qrPayload, 'https://open.feishu.cn/page/launcher?user_code=CODE_1')

  // 未刷新时重复点击：复用当前二维码，不新起流程
  await svc.login({ qrType: 'register' })
  assert.equal(runs.length, 1)
  assert.equal(svc.getStatus().login.qrPayload, 'https://open.feishu.cn/page/launcher?user_code=CODE_1')

  // 刷新：作废旧设备码 + 新流程给出新二维码
  await svc.login({ qrType: 'register', refresh: true })
  assert.equal(runs.length, 2, '刷新必须发起新流程')
  assert.equal(runs[0].aborted, true, '旧设备码必须被作废')
  const status = svc.getStatus()
  assert.equal(status.login.phase, 'qr')
  assert.equal(status.login.qrPayload, 'https://open.feishu.cn/page/launcher?user_code=CODE_2')

  svc.dispose()
})

test('[飞书] 一键创建应用：刷新后旧流程的迟到结果必须丢弃', async () => {
  const { svc, persisted } = makeService()
  const pending = []
  // 模拟"忽略 abort、稍后才返回"的旧流程（真实场景：用户恰在刷新瞬间完成确认）
  svc.gateway.registerApp = ({ onQRCodeReady }) => new Promise((resolve) => {
    pending.push(resolve)
    onQRCodeReady({ url: `https://open.feishu.cn/page/launcher?user_code=OLD${pending.length}`, expireIn: 600 })
  })

  await svc.login({ qrType: 'register' })
  await svc.login({ qrType: 'register', refresh: true })

  pending[0]({ client_id: 'cli_stale', client_secret: 'sec_stale', user_info: { tenant_brand: 'feishu' } })
  await new Promise((r) => setTimeout(r, 20))
  assert.equal(svc.gateway.config.appId, '', '旧流程结果不得落盘')
  assert.equal(persisted.some((p) => p.appId === 'cli_stale'), false)
  assert.equal(svc.getStatus().login.phase, 'qr', '仍应停留在新流程的二维码阶段')

  pending[1]({ client_id: 'cli_new', client_secret: 'sec_new', user_info: { tenant_brand: 'feishu' } })
  await new Promise((r) => setTimeout(r, 20))
  assert.equal(svc.gateway.config.appId, 'cli_new', '新流程结果正常落盘')
  assert.equal(svc.getStatus().login.phase, 'done')

  svc.dispose()
})

test('[飞书] 连接成功后自动同步斜杠指令（默认开启）并持久化映射', async () => {
  const channel = makeFakeChannel()
  const calls = []
  // 模拟 v7 斜杠指令接口：列表为空 → 全部创建
  channel.rawClient.httpInstance.request = async ({ url, method }) => {
    calls.push({ url, method })
    if (method === 'GET') return { code: 0, data: { items: [] } }
    return { code: 0, data: { command_id: `cmd_${calls.length}` } }
  }
  const { gw } = makeGateway({}, { channel })
  const persisted = []
  gw.onSlashCommandIds = (ids) => persisted.push(ids)

  assert.equal(await gw.start(), true)
  await new Promise((r) => setTimeout(r, 20))

  assert.equal(calls.filter((c) => c.method === 'GET').length, 1, '先查列表')
  assert.equal(calls.filter((c) => c.method === 'POST').length, DESIRED_SLASH_COMMANDS.length, '缺失的指令全部创建')
  assert.equal(Object.keys(gw.config.slashCommandIds).length, DESIRED_SLASH_COMMANDS.length)
  assert.ok(Object.values(gw.config.slashCommandIds).every((entry) => entry.ours === true))
  assert.equal(persisted.length, 1, '映射需回调持久化')
  assert.match(calls[0].url, /\/open-apis\/application\/v7\/app_slash_commands$/)

  gw.dispose()
})

test('[飞书] 缺少斜杠指令权限：只记一条告警且不再重试', async () => {
  const channel = makeFakeChannel()
  const calls = []
  channel.rawClient.httpInstance.request = async () => {
    calls.push(Date.now())
    const err = new Error('lacks permission')
    err.response = { data: { code: 99991640, msg: 'lacks permission' } }
    throw err
  }
  const warnings = []
  const { gw } = makeGateway({}, { channel })
  gw.logger = { info() {}, debug() {}, error() {}, warn: (...args) => warnings.push(args) }

  await gw.start()
  await new Promise((r) => setTimeout(r, 20))
  assert.equal(calls.length, 1)
  assert.equal(warnings.length, 1, '只告警一次')
  assert.match(String(warnings[0][0]), /app_slash_command/)

  // 已置位：再次同步不再发请求
  const again = await gw.syncSlashCommands()
  assert.equal(again.ok, false)
  assert.equal(calls.length, 1)

  gw.dispose()
})

test('[飞书] 通道参数变更触发重建连接（分片上限 / 凭证在构造期生效）', async () => {
  const { svc, channel } = makeService({ config: { appId: 'cli_x', appSecret: 'sec' } })
  await new Promise((r) => setTimeout(r, 20))
  assert.equal(svc.status, 'connected')
  assert.equal(channel.state.connectCount, 1)
  assert.equal(channel.state.options.outbound.textChunkLimit, 2000)

  await svc.setConfig({ maxMessageChars: 3000 })
  await new Promise((r) => setTimeout(r, 20))

  assert.equal(channel.state.options.outbound.textChunkLimit, 3000, '新通道按新参数重建')
  assert.equal(channel.state.connectCount, 2, '重建后重新连接')
  assert.equal(channel.state.disconnectCount >= 1, true, '旧通道先释放')
  assert.equal(svc.status, 'connected')

  svc.dispose()
})

test('[飞书] 一键创建应用：二维码 → 凭据落盘（含租户域名）→ 自动连接', async () => {
  const { svc, persisted } = makeService()
  let captured = null
  let settleRegistration
  svc.gateway.registerApp = (options) => {
    captured = options
    options.onQRCodeReady({ url: 'https://open.feishu.cn/page/launcher?user_code=XXXX', expireIn: 600 })
    return new Promise((resolve) => {
      settleRegistration = () => resolve({
        client_id: 'cli_created',
        client_secret: 'sec_created',
        user_info: { tenant_brand: 'lark' },
      })
    })
  }

  const result = await svc.login({ qrType: 'register' })
  assert.deepEqual(result, { ok: true })
  assert.equal(captured.source, 'dsh-bridge')
  assert.ok(captured.appPreset?.name, '应预填应用名称')

  // 二维码就绪：前端轮询可拿到 qrPayload（渲染为二维码）
  const qrStatus = svc.getStatus()
  assert.equal(qrStatus.login.phase, 'qr')
  assert.match(qrStatus.login.qrPayload, /^https:\/\/open\.feishu\.cn/)
  assert.equal(qrStatus.login.qrKind, 'text')

  // 授权完成：凭据落盘 + 域名按租户品牌自动切换 + 自动连接
  settleRegistration()
  await new Promise((r) => setTimeout(r, 20))
  assert.equal(svc.gateway.config.appId, 'cli_created')
  assert.equal(svc.gateway.config.domain, 'lark')
  assert.deepEqual(
    persisted.find((p) => p.appId === 'cli_created'),
    { appId: 'cli_created', appSecret: 'sec_created', domain: 'lark' },
  )
  assert.equal(svc.getStatus().login.phase, 'done')
  assert.equal(svc.status, 'connected')

  svc.dispose()
})

test('[飞书] 一键创建应用：用户拒绝/二维码过期时给出可读错误', async () => {
  const { svc } = makeService()
  svc.gateway.registerApp = async () => {
    const err = new Error('user denied')
    err.code = 'access_denied'
    err.description = 'user denied'
    throw err
  }

  await svc.login({ qrType: 'register' })
  await new Promise((r) => setTimeout(r, 20))

  const status = svc.getStatus()
  assert.equal(status.login.phase, 'error')
  assert.match(status.login.error, /拒绝授权/)
  assert.equal(svc.configured, false)

  svc.dispose()
})

test('[飞书] 一键创建应用：断开连接会中止扫码流程', async () => {
  const { svc } = makeService()
  svc.gateway.registerApp = ({ signal, onQRCodeReady }) => new Promise((resolve, reject) => {
    onQRCodeReady({ url: 'https://open.feishu.cn/page/launcher?user_code=YYYY', expireIn: 600 })
    signal?.addEventListener('abort', () => {
      const err = new Error('aborted')
      err.code = 'abort'
      reject(err)
    })
  })

  await svc.login({ qrType: 'register' })
  assert.equal(svc.getStatus().login.phase, 'qr')

  await svc.stop()
  await new Promise((r) => setTimeout(r, 20))

  assert.equal(svc.getStatus().login.phase, 'idle')
  assert.equal(svc.status, 'offline')

  svc.dispose()
})

// ---------------------------------------------------------------------------
// issue #77 ①：设置页开关回读（缺字段会让勾选"莫名其妙回退"）
// ---------------------------------------------------------------------------

test('[飞书] issue #77①：getStatus().config 回读 showActivity / changesDigest / groupAutoApprove', async () => {
  const { svc } = makeService()
  try {
    // 默认值语义必须与桥的 opt-in 一致：活动状态默认关、改动摘要默认开、群自动授权默认关
    const defaults = svc.getStatus().config
    assert.equal(defaults.showActivity, false)
    assert.equal(defaults.changesDigest, true)
    assert.equal(defaults.groupAutoApprove, false)

    // 设置页勾选 → setConfig 落盘 → getStatus 必须读回同一状态（旧实现这 3 个字段直接缺失，
    // 前端读到的永远是 undefined，于是切页/重开面板后勾选回退成未勾选）
    await svc.setConfig({ showActivity: true, changesDigest: false, groupAutoApprove: true })
    const cfg = svc.getStatus().config
    assert.equal(cfg.showActivity, true)
    assert.equal(cfg.changesDigest, false)
    assert.equal(cfg.groupAutoApprove, true)
  } finally {
    svc.dispose()
  }
})

test('issue #78: FeishuService 支持 instanceId / displayName 与备注名回显持久化', async () => {
  const ctx = makeMockCordisCtx()
  const persisted = []
  const svc = new FeishuService({
    ctx,
    logger: ctx.logger(),
    config: { name: '老备注' },
    instanceId: 'feishu:2',
    onPersist: async (patch) => { persisted.push(patch) },
  })
  try {
    svc.displayName = 'feishu 2'
    const status = svc.getStatus()
    assert.equal(status.instanceId, 'feishu:2')
    assert.equal(status.platformId, 'feishu')
    assert.equal(status.displayName, 'feishu 2')
    assert.equal(status.config.name, '老备注', '备注名必须可回显')

    await svc.setConfig({ name: '  新备注  ' })
    assert.equal(svc.getStatus().config.name, '新备注', '备注名应 trim 后回显')
    assert.equal(persisted.at(-1).name, '新备注', '备注名应随 setConfig 持久化到该 account')
  } finally {
    await svc.destroy?.()
  }
})
