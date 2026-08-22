// dsh-bridge FeishuService & FeishuGateway tests
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FeishuService } from '../lib/feishu/index.js'
import { FeishuGateway } from '../lib/feishu/gateway.js'
import { FeishuConversationNode } from '../lib/feishu/node.js'
import { PlatformManager } from '../lib/platform/manager.js'

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
    logger: () => ({ info() {}, warn() {}, error() {} }),
    sessions: { list: () => [], get: () => undefined },
    agents: { create: async () => ({}), get: () => undefined },
    reflect: { provide(name, value) { ctx['__provided__' + name] = value; return () => {} } },
  }
  return ctx
}

test('FeishuGateway is a Service and registers with initial state', () => {
  const ctx = makeMockCordisCtx()
  const gw = new FeishuGateway(ctx, {})
  try {
    assert.equal(gw.status, 'idle')
    assert.equal(gw.configured, false)
  } finally {
    gw.dispose()
  }
})

test('FeishuGateway configured requires appId + appSecret', () => {
  const ctx = makeMockCordisCtx()
  const gw = new FeishuGateway(ctx, { appId: 'cli_123', appSecret: 'sec_456' })
  try {
    assert.equal(gw.configured, true)
    assert.equal(gw.config.appId, 'cli_123')
    assert.equal(gw.config.appSecret, 'sec_456')
  } finally {
    gw.dispose()
  }
})

test('FeishuGateway message handling extracts text and strips group @mentions', async () => {
  const ctx = makeMockCordisCtx()
  const gw = new FeishuGateway(ctx, { appId: 'cli_123', appSecret: 'sec_456' })
  const received = []
  ctx.on('feishu/message', (msg) => received.push(msg))

  // 1. 单聊消息
  await gw._handleMessageReceive({
    message: {
      message_id: 'om_1',
      chat_id: 'oc_p2p_1',
      chat_type: 'p2p',
      message_type: 'text',
      content: JSON.stringify({ text: '你好 DSH' }),
      create_time: '1700000000000',
    },
    sender: {
      sender_id: { open_id: 'ou_user_1' },
      sender_type: 'user',
    },
  })

  assert.equal(received.length, 1)
  assert.equal(received[0].peerId, 'ou_user_1')
  assert.equal(received[0].senderId, 'ou_user_1')
  assert.equal(received[0].text, '你好 DSH')
  assert.equal(received[0].isGroup, false)

  // 2. 群聊消息（带机器人 @ 占位符）
  await gw._handleMessageReceive({
    message: {
      message_id: 'om_2',
      chat_id: 'oc_group_1',
      chat_type: 'group',
      message_type: 'text',
      content: JSON.stringify({ text: '@_user_1 帮我写个脚本' }),
      create_time: '1700000001000',
    },
    sender: {
      sender_id: { open_id: 'ou_user_2' },
      sender_type: 'user',
    },
  })

  assert.equal(received.length, 2)
  assert.equal(received[1].peerId, 'oc_group_1')
  assert.equal(received[1].senderId, 'ou_user_2')
  assert.equal(received[1].text, '帮我写个脚本') // @_user_1 已被剥离
  assert.equal(received[1].isGroup, true)

  // 3. 消息去重测试 (重复 om_2 不会被二次派发)
  await gw._handleMessageReceive({
    message: {
      message_id: 'om_2',
      chat_id: 'oc_group_1',
      chat_type: 'group',
      message_type: 'text',
      content: JSON.stringify({ text: '重复消息' }),
    },
    sender: { sender_id: { open_id: 'ou_user_2' } },
  })
  assert.equal(received.length, 2, '重复 message_id 被自动去重')

  gw.dispose()
})

test('FeishuGateway card.action.trigger returns toast and emits event', async () => {
  const ctx = makeMockCordisCtx()
  const gw = new FeishuGateway(ctx, { appId: 'cli_123', appSecret: 'sec_456' })
  const actions = []
  ctx.on('feishu/action', (act) => actions.push(act))

  const res = await gw._handleCardActionTrigger({
    action: {
      value: { action: 'approve', approvalId: 1 },
      tag: 'button',
    },
    operator: { open_id: 'ou_admin' },
  })

  assert.equal(res.toast.type, 'success')
  assert.match(res.toast.content, /已批准/)
  assert.equal(actions.length, 1)
  assert.equal(actions[0].operatorId, 'ou_admin')
  assert.equal(actions[0].action, 'approve')
  assert.equal(actions[0].value.approvalId, 1)

  gw.dispose()
})

test('FeishuService is a Platform instance with full lifecycle', async () => {
  const ctx = makeMockCordisCtx()
  const persisted = {}
  const svc = new FeishuService({
    ctx,
    logger: ctx.logger(),
    config: { allowFrom: ['ou_u1'] },
    onPersist: async (patch) => Object.assign(persisted, patch),
  })

  assert.equal(svc.id, 'feishu')
  assert.equal(svc.name, 'Feishu')
  assert.equal(svc.configured, false)
  assert.deepEqual(svc.node.config.allowFrom, ['ou_u1'])
  assert.ok(svc.capabilities.group)
  assert.ok(svc.capabilities.approvals)

  // 测试 setAllowFrom
  svc.setAllowFrom(['ou_u1', 'ou_u2'])
  assert.deepEqual(svc.node.config.allowFrom, ['ou_u1', 'ou_u2'])
  assert.deepEqual(persisted.allowFrom, ['ou_u1', 'ou_u2'])

  // 测试 setConfig 基础参数
  await svc.setConfig({ digestIntervalSec: 120, approvalTimeoutSec: 300 })
  assert.equal(svc.node.config.digestIntervalSec, 120)
  assert.equal(svc.node.config.approvalTimeoutSec, 300)
  assert.equal(persisted.digestIntervalSec, 120)

  // 测试 setConfig 凭证参数
  svc.gateway.start = async () => true
  await svc.setConfig({ appId: 'cli_test_123', appSecret: 'sec_test_456' })
  assert.equal(svc.gateway.config.appId, 'cli_test_123')
  assert.equal(svc.gateway.config.appSecret, 'sec_test_456')
  assert.equal(persisted.appId, 'cli_test_123')
  assert.equal(persisted.appSecret, 'sec_test_456')
  assert.equal(svc.status, 'connected')

  // 测试 getStatus 返回完整结构
  const status = svc.getStatus()
  assert.equal(status.configured, true)
  assert.equal(status.status, 'connected')
  assert.equal(status.id, 'feishu')
  assert.equal(status.name, 'Feishu')
  assert.deepEqual(status.allowFrom, ['ou_u1', 'ou_u2'])
  assert.equal(status.config.appId, 'cli_test_123')

  svc.dispose()
})

test('FeishuService registers into PlatformManager and aggregates status', async () => {
  const ctx = makeMockCordisCtx()
  const pm = new PlatformManager({ logger: ctx.logger() })
  const svc = new FeishuService({
    ctx,
    logger: ctx.logger(),
    config: { allowFrom: ['ou_u1'] },
    onPersist: () => {},
  })

  pm.register(svc)
  assert.ok(pm.get('feishu') === svc)
  const list = pm.list()
  assert.ok(list.some((p) => p.id === 'feishu'))
  const status = pm.getStatus()
  assert.ok(status.feishu)
  assert.equal(status.feishu.configured, false)

  svc.dispose()
})

test('FeishuConversationNode handles card action resolution', async () => {
  const ctx = makeMockCordisCtx()
  const sent = []
  ctx.feishu = {
    sendText: async (peerId, text) => sent.push({ peerId, text }),
    sendCard: async (peerId, card) => sent.push({ peerId, card }),
    sendMarkdownCard: async (peerId, md) => sent.push({ peerId, text: md }),
  }

  const node = new FeishuConversationNode(ctx, { allowFrom: ['ou_u1'] }, ctx.logger())
  node._lastPeer = { peerId: 'ou_u1', senderId: 'ou_u1', isGroup: false }
  node.activeSessionId = 'sess_1'

  // 1. 触发 approval/request
  const approvalPromise = ctx.emit('approval/request', {
    agent: { session: { id: 'sess_1' } },
    toolName: 'bash',
    reason: 'run tests',
  })
  await new Promise(r => setTimeout(r, 10))

  assert.equal(node.pending.has(1), true)
  assert.equal(sent.length, 1, '已发送审批卡片')

  // 2. 触发卡片按钮点击 (approve)
  ctx.emit('feishu/action', {
    operatorId: 'ou_u1',
    value: { action: 'approve', approvalId: 1 },
  })

  const outcome = await approvalPromise
  assert.equal(outcome, 'allowed-once')
  assert.equal(node.pending.has(1), false)

  // 3. 验证确认消息仅发送了 1 次
  const confirmMessages = sent.filter(s => s.text && s.text.includes('已批准执行'))
  assert.equal(confirmMessages.length, 1, '审批确认消息仅发送 1 遍')

  node.dispose()
})

test('FeishuConversationNode streams turn output into single card without fragmentation', async () => {
  const ctx = makeMockCordisCtx()
  const cards = []
  const patches = []
  ctx.feishu = {
    sendText: async () => {},
    sendCard: async () => {},
    sendMarkdownCard: async (peerId, md) => {
      const id = `om_card_${cards.length + 1}`
      cards.push({ id, peerId, md })
      return { message_id: id }
    },
    patchCard: async (messageId, md) => {
      patches.push({ messageId, md })
      return { message_id: messageId }
    },
  }

  const node = new FeishuConversationNode(ctx, { allowFrom: ['ou_u1'] }, ctx.logger())
  node._lastPeer = { peerId: 'ou_u1', senderId: 'ou_u1', isGroup: false }
  node.activeSessionId = 'sess_1'

  // 1. 模拟 turn/start
  ctx.emit('session/event', { id: 'sess_1' }, { type: 'turn/start', data: { turn: 1 } })
  assert.equal(node._inTurn, true)

  // 2. 模拟首个 assistant message
  await node.sendText('正在思考...')
  assert.equal(cards.length, 1, '首条输出创建卡片')
  assert.equal(cards[0].md, '正在思考...')
  assert.equal(node._streamCardId, 'om_card_1')

  // 3. 模拟后续输出更新
  await node.sendText('正在思考...\n已完成代码生成：\n```js\nconsole.log(1)\n```')
  assert.equal(cards.length, 1, '后续输出不会创建新消息卡片')

  // 4. 模拟 turn/end
  ctx.emit('session/event', { id: 'sess_1' }, { type: 'turn/end', data: { reason: { kind: 'complete' } } })
  assert.equal(node._inTurn, false)
  assert.ok(patches.length >= 1, 'turn 结束时刷入最终内容')
  assert.equal(patches[patches.length - 1].messageId, 'om_card_1')
  assert.ok(patches[patches.length - 1].md.includes('console.log(1)'))

  node.dispose()
})
