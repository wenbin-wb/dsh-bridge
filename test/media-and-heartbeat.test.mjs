import test from 'node:test'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { QqGateway } from '../lib/qq/gateway.js'
import { QqConversationNode } from '../lib/qq/node.js'
import { FeishuConversationNode } from '../lib/feishu/node.js'
import { ConversationBridge } from '../lib/platform/conversation-bridge.js'

function makeMockCordisCtx() {
  const events = {}
  const ctx = {
    on(event, fn) { (events[event] ??= []).push(fn); return () => { events[event] = (events[event] ?? []).filter(f => f !== fn) } },
    async emit(event, ...args) {
      const fns = [...(events[event] ?? [])]
      for (const fn of fns) await fn(...args)
    },
    effect(fn) { return fn() },
    logger: () => ({ info() {}, warn() {}, error() {}, debug() {} }),
    sessions: { list: () => [], get: () => undefined },
    agents: { create: async () => ({}), get: () => undefined },
    reflect: { provide(name, value) { ctx[name] = value; return () => {} } },
  }
  return ctx
}

test('QQ Gateway OpCode 10 sends OpCode 6 RESUME when sessionId exists', async () => {
  const ctx = makeMockCordisCtx()
  const gw = new QqGateway({ ctx, logger: ctx.logger(), config: { appId: '123', clientSecret: 'abc' } })
  gw.sessionId = 'test-session-123'
  gw.sequence = 42

  const sent = []
  const mockWs = {
    readyState: 1,
    send(data) { sent.push(JSON.parse(data)) },
  }

  await gw.handlePayload({ op: 10, d: { heartbeat_interval: 1000 } }, 'mock-token', mockWs)
  
  assert.equal(sent.length, 2)
  assert.equal(sent[0].op, 1) // Heartbeat
  assert.equal(sent[1].op, 6) // Resume
  assert.equal(sent[1].d.session_id, 'test-session-123')
  assert.equal(sent[1].d.seq, 42)

  gw.clearHeartbeat()
})

test('QQ Gateway OpCode 11 resets unackedHeartbeats counter', async () => {
  const ctx = makeMockCordisCtx()
  const gw = new QqGateway({ ctx, logger: ctx.logger(), config: { appId: '123', clientSecret: 'abc' } })
  gw.unackedHeartbeats = 2

  await gw.handlePayload({ op: 11 }, 'mock-token', {})
  assert.equal(gw.unackedHeartbeats, 0)
})

test('QQ Node processes attachments and appends file path', async () => {
  const ctx = makeMockCordisCtx()
  ctx.qq = new QqGateway({ ctx, logger: ctx.logger(), config: { appId: '123', clientSecret: 'abc' } })
  
  const node = new QqConversationNode(ctx, { allowFrom: ['user1'] }, ctx.logger())
  const events = []
  node.handleInbound = async (item) => {
    events.push(item)
    return 'routed'
  }

  node._processAttachments = async () => [
    { filename: 'photo.png', path: '/mock/.qq-media/photo.png', size: 1024 },
  ]

  await ctx.emit('qq/message', {
    type: 'message',
    scope: 'c2c',
    senderId: 'user1',
    peerId: 'user1',
    text: '请看这张图',
    attachments: [{ url: 'http://example.com/photo.png' }],
  })

  assert.equal(events.length, 1)
  assert.ok(events[0].text.includes('请看这张图'))
  assert.ok(events[0].text.includes('[文件: /mock/.qq-media/photo.png]'))
})

test('Feishu Node processes media messages and appends file path', async () => {
  const ctx = makeMockCordisCtx()
  ctx.feishu = {
    sendMarkdownCard: async () => ({ code: 0 }),
    downloadMessageResource: async () => Buffer.from('mock image data'),
  }
  
  const node = new FeishuConversationNode(ctx, { allowFrom: ['user2'] }, ctx.logger())
  const events = []
  node.handleInbound = async (item) => {
    events.push(item)
    return 'routed'
  }

  node._processMedia = async () => [
    { filename: 'doc.pdf', path: '/mock/.feishu-media/doc.pdf', size: 2048 },
  ]

  await ctx.emit('feishu/message', {
    peerId: 'user2',
    senderId: 'user2',
    isGroup: false,
    text: '',
    messageId: 'om_123',
    messageType: 'file',
    contentObj: { file_key: 'fk_123', file_name: 'doc.pdf' },
  })

  assert.equal(events.length, 1)
  assert.ok(events[0].text.includes('[文件: /mock/.feishu-media/doc.pdf]'))
})

test('ConversationBridge 解析 assistant 消息中的 [SEND_FILE: path] 指令并在正文中剔除', async () => {
  const ctx = makeMockCordisCtx()
  const sentTexts = []
  const bridge = new ConversationBridge({
    ctx,
    logger: ctx.logger(),
    config: { allowFrom: ['u1'] },
    platform: {
      id: 'mock',
      name: 'Mock',
      status: 'connected',
      capabilities: {},
      sendText: async (peer, text) => { sentTexts.push(text) },
    },
  })
  bridge.peerId = 'u1'
  bridge.activeSessionId = 'session-1'

  // 1. turn/start
  await ctx.emit('session/event', { id: 'session-1' }, { type: 'turn/start', data: { turn: 1 } })

  // 2. assistant/message with directive
  await ctx.emit('session/event', { id: 'session-1' }, {
    type: 'assistant/message',
    data: { message: { content: [{ type: 'text', text: '已生成图片。\n[SEND_FILE: /project/result.png]' }] } },
  })

  // 3. turn/end
  await ctx.emit('session/event', { id: 'session-1' }, {
    type: 'turn/end',
    data: { reason: { kind: 'stop' } },
  })

  assert.ok(sentTexts.some(t => t.includes('已生成图片。')))
  assert.ok(!sentTexts.some(t => t.includes('SEND_FILE')))
})

test('ConversationBridge triggers sendMediaFile on turn/end when [SEND_FILE: path] exists', async () => {
  const ctx = makeMockCordisCtx()
  const sentMedia = []
  const bridge = new ConversationBridge({
    ctx,
    logger: ctx.logger(),
    config: { allowFrom: ['u1'] },
    platform: {
      id: 'mock',
      name: 'Mock',
      status: 'connected',
      capabilities: {},
      sendText: async () => {},
      sendMediaFile: async (peer, filePath) => { sentMedia.push({ peer, filePath }) },
    },
  })
  bridge.peerId = 'u1'
  bridge.activeSessionId = 'session-1'

  const targetFile = 'docs/banner.jpg'

  await ctx.emit('session/event', { id: 'session-1' }, { type: 'turn/start', data: { turn: 1 } })
  await ctx.emit('session/event', { id: 'session-1' }, {
    type: 'assistant/message',
    data: { message: { content: [{ type: 'text', text: `请查收：\n[SEND_FILE: ${targetFile}]` }] } },
  })
  await ctx.emit('session/event', { id: 'session-1' }, {
    type: 'turn/end',
    data: { reason: { kind: 'stop' } },
  })

  assert.equal(sentMedia.length, 1)
  assert.equal(sentMedia[0].peer, 'u1')
  assert.equal(sentMedia[0].filePath, resolve(process.cwd(), targetFile))
})
