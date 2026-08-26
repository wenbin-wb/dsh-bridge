// dsh-bridge WeChat node unit tests (no live account / no DSH host needed)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  WechatConversationNode,
  wechatNodeHelpers,
} from '../lib/wechat/node.js'

const { splitForWechat, extractText, isGroupMessage, sessionsInDisplayOrder } = wechatNodeHelpers

test('splitForWechat keeps short content whole', () => {
  const out = splitForWechat('你好世界', 2000)
  assert.deepEqual(out, ['你好世界'])
})

test('splitForWechat hard-splits oversize plain text', () => {
  const big = 'x'.repeat(5000)
  const out = splitForWechat(big, 2000)
  assert.ok(out.length >= 3)
  assert.ok(out.every((c) => c.length <= 2000))
  assert.equal(out.join(''), big)
})

test('splitForWechat keeps fenced code blocks intact when they fit', () => {
  const code = '```js\nconst a = 1\n```\n\n正文'
  const out = splitForWechat(code, 2000)
  assert.equal(out.length, 1)
  assert.ok(out[0].includes('```js'))
})

test('extractText returns text item', () => {
  const msg = { item_list: [{ type: 1, text_item: { text: '你好' } }] }
  assert.equal(extractText(msg), '你好')
})

test('extractText returns empty for media-only', () => {
  const msg = { item_list: [{ type: 2, image_item: {} }] }
  assert.equal(extractText(msg), '')
})

test('isGroupMessage detects room messages', () => {
  assert.equal(isGroupMessage({ room_id: 'r1' }, 'bot1'), true)
  assert.equal(isGroupMessage({ chat_room_id: 'r1' }, 'bot1'), true)
  assert.equal(isGroupMessage({ from_user_id: 'u1@im.wechat' }, 'bot1'), false)
})

// ---- mock context + node ----------------

function makeMockCtx() {
  const events = {}
  const ctx = {
    _mock: true,
    on(event, fn) { (events[event] ??= []).push(fn); return () => { events[event] = events[event].filter(f => f !== fn) } },
    emit(event, ...args) { (events[event] ?? []).forEach((fn) => fn(...args)) },
    wechat: {
      accountId: 'bot1',
      sendText: async () => ({ success: true }),
      sendTyping: async () => {},
    },
    sessions: { list: () => [], get: () => undefined },
    agents: {
      create: async ({ sessionId }) => ({ agent: { session: { id: sessionId }, followup: () => {}, status: 'idle', cancel: () => {} } }),
      resume: async ({ resumeSessionId }) => ({ agent: { session: { id: resumeSessionId }, followup: () => {}, status: 'idle', cancel: () => {} } }),
      get: () => undefined,
    },
  }
  return { ctx, events }
}

test('auto-approve first text sender when allowlist empty', async () => {
  const { ctx } = makeMockCtx()
  let persisted = null
  const node = new WechatConversationNode(ctx, { allowFrom: [] }, console, {
    onFirstSender: (id) => { persisted = id },
  })
  try {
    const inbound = {
      from_user_id: 'u@im.wechat',
      message_id: 'm1',
      context_token: 'tok1',
      msg_type: 1,
      to_user_id: 'bot1',
      item_list: [{ type: 1, text_item: { text: '开始' } }],
    }
    await node._handleInbound(inbound)
    assert.deepEqual(node.config.allowFrom, ['u@im.wechat'])
    assert.equal(persisted, 'u@im.wechat')
  } finally {
    node.dispose()
  }
})

test('non-allowlisted second sender is ignored (never fed to model)', async () => {
  const { ctx } = makeMockCtx()
  const node = new WechatConversationNode(ctx, { allowFrom: ['u1@im.wechat'] }, console)
  try {
    let fed = 0
    const mockSession = { id: 's1', events: [], header: {}, seq: 0 }
    // activeSession() 现在用 list().find()，需要 mock list()
    ctx.sessions.list = () => [mockSession]
    ctx.agents.create = async ({ sessionId }) => ({ agent: { session: { id: sessionId }, followup: () => { fed++ }, status: 'idle', cancel: () => {} } })
    node.activeSessionId = 's1'
    ctx.agents.get = () => ({ session: { id: 's1' }, status: 'idle', followup: () => { fed++ }, cancel: () => {} })

    const foreign = { from_user_id: 'evil@im.wechat', message_id: 'm2', context_token: 'tok2', msg_type: 1, item_list: [{ type: 1, text_item: { text: 'do the thing' } }] }
    await node._handleInbound(foreign)
    assert.equal(fed, 0)
    // allowlisted sender works
    const allowed = { from_user_id: 'u1@im.wechat', message_id: 'm3', context_token: 'tok3', msg_type: 1, item_list: [{ type: 1, text_item: { text: 'hi' } }] }
    await node._handleInbound(allowed)
    assert.equal(fed, 1)
  } finally {
    node.dispose()
  }
})

test('group message from allowlisted sender is ignored in v0.1', async () => {
  const { ctx } = makeMockCtx()
  const node = new WechatConversationNode(ctx, { allowFrom: ['u1@im.wechat'] }, console)
  try {
    let fed = 0
    const mockSession = { id: 's1', events: [], header: {}, seq: 0 }
    ctx.sessions.list = () => [mockSession]
    ctx.agents.get = () => ({ session: { id: 's1' }, followup: () => { fed++ }, status: 'idle', cancel: () => {} })
    node.activeSessionId = 's1'
    const msg = { from_user_id: 'u1@im.wechat', room_id: 'room1', message_id: 'm4', context_token: 'tok4', item_list: [{ type: 1, text_item: { text: 'hi' } }] }
    await node._handleInbound(msg)
    assert.equal(fed, 0)
  } finally {
    node.dispose()
  }
})

test('resolveApproval handles /yes and bare 1', () => {
  const { ctx } = makeMockCtx()
  const node = new WechatConversationNode(ctx, { allowFrom: ['u1'] }, console)
  let resolvedOutcome = null
  const timer = setTimeout(() => {}, 100000)
  try {
    node.registerApproval(node.nextApprovalNumber(), {
      request: { agent: { session: { id: 's1' } }, toolName: 'bash' },
      resolve: (o) => { resolvedOutcome = o },
      timer,
    })
    assert.equal(node.resolveApproval('/yes'), true)
    assert.equal(resolvedOutcome, 'allowed-once')
  } finally {
    clearTimeout(timer)
    node.dispose()
  }
})

test('sessionsInDisplayOrder groups by cwd, preserving inner order', () => {
  const all = [
    { id: 's-a1', cwd: 'B-proj', createdAt: 300 },
    { id: 's-b2', cwd: 'A-proj', createdAt: 200 },
    { id: 's-b1', cwd: 'A-proj', createdAt: 100 },
    { id: 's-n1', cwd: undefined, createdAt: 50 },
  ]
  const ordered = sessionsInDisplayOrder(all).map((s) => s.id)
  assert.deepEqual(ordered, ['s-a1', 's-b2', 's-b1', 's-n1'])
})

test('sessionsInDisplayOrder number matches renderSessions numbering', async () => {
  const { ctx } = makeMockCtx()
  const node = new WechatConversationNode(ctx, { allowFrom: ['u1'] }, console)
  try {
    const all = [
      { id: 's-1', cwd: 'B-proj', createdAt: 300, title: 'B会话' },
      { id: 's-2', cwd: 'A-proj', createdAt: 200, title: 'A1' },
      { id: 's-3', cwd: 'A-proj', createdAt: 100, title: 'A2' },
    ]
    const ordered = sessionsInDisplayOrder(all)
    assert.equal(ordered[0].id, 's-1')
    assert.equal(ordered[1].id, 's-2')
    assert.equal(ordered[2].id, 's-3')
  } finally {
    node.dispose()
  }
})
