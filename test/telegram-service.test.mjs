import { test } from 'node:test'
import assert from 'node:assert/strict'
import { TelegramService } from '../lib/telegram/index.js'
import { TelegramGateway, createConnectProxyAgent, formatTelegramHtml } from '../lib/telegram/gateway.js'
import { TelegramConversationNode } from '../lib/telegram/node.js'
import { PlatformManager } from '../lib/platform/manager.js'

function makeMockCordisCtx() {
  const events = {}
  const ctx = {
    on(event, fn) {
      (events[event] ??= []).push(fn)
      return () => { events[event] = (events[event] ?? []).filter(f => f !== fn) }
    },
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

test('TelegramGateway is a Service and registers as ctx.telegram', () => {
  const ctx = makeMockCordisCtx()
  const gw = new TelegramGateway(ctx, { botToken: '' })
  try {
    assert.equal(gw.name, 'telegram')
    assert.equal(gw.status, 'idle')
    assert.equal(gw.configured, false)
    assert.ok(ctx.telegram === gw, 'gateway registered as ctx.telegram')
  } finally {
    gw.dispose()
  }
})

test('TelegramGateway configured requires valid botToken with colon', () => {
  const ctx = makeMockCordisCtx()
  const gw1 = new TelegramGateway(ctx, { botToken: 'invalid' })
  assert.equal(gw1.configured, false)

  const gw2 = new TelegramGateway(ctx, { botToken: '123456:ABC-DEF' })
  assert.equal(gw2.configured, true)
  assert.equal(gw2.status, 'idle')
})

test('createConnectProxyAgent handles http proxy url', () => {
  const agent = createConnectProxyAgent('http://127.0.0.1:7890')
  assert.ok(agent)
  assert.equal(createConnectProxyAgent(''), undefined)
  assert.equal(createConnectProxyAgent(null), undefined)
})

test('formatTelegramHtml converts markdown and escapes HTML entities safely', () => {
  const input = [
    '## 标题 Header',
    '> 引用 Blockquote',
    '- 列表项 List item',
    '访问 [官网](https://dsh.ai) 查看 **加粗** 与 `code & tags <test>`',
    '```javascript',
    'const x = 1 < 2 && 3 > 0;',
    '```',
  ].join('\n')
  const html = formatTelegramHtml(input)
  assert.ok(html.includes('<b>标题 Header</b>'))
  assert.ok(html.includes('<blockquote>引用 Blockquote</blockquote>'))
  assert.ok(html.includes('• 列表项 List item'))
  assert.ok(html.includes('<a href="https://dsh.ai">官网</a>'))
  assert.ok(html.includes('<b>加粗</b>'))
  assert.ok(html.includes('<code>code &amp; tags &lt;test&gt;</code>'))
  assert.ok(html.includes('<pre><code class="language-javascript">const x = 1 &lt; 2 &amp;&amp; 3 &gt; 0;</code></pre>'))
})

test('TelegramService is a Platform instance with full lifecycle and allowlist persistence', async () => {
  const ctx = makeMockCordisCtx()
  const persisted = []
  const service = new TelegramService({
    ctx,
    logger: ctx.logger(),
    config: { botToken: '', proxy: '' },
    onPersist: (p) => persisted.push(p),
  })

  try {
    assert.equal(service.id, 'telegram')
    assert.equal(service.name, 'Telegram')
    assert.equal(service.configured, false)
    assert.equal(service.capabilities.group, true)
    assert.equal(service.capabilities.media, true)
    assert.equal(service.capabilities.approvals, true)

    // Login with invalid credentials
    const loginFail = await service.login({ botToken: '' })
    assert.equal(loginFail.success, false)

    // Set allowFrom
    service.setAllowFrom(['12345', '67890'])
    assert.deepEqual(service.node.config.allowFrom, ['12345', '67890'])
    assert.ok(persisted.some(p => p.allowFrom && p.allowFrom.includes('12345')))

    const status = service.getStatus()
    assert.equal(status.id, 'telegram')
    assert.deepEqual(status.allowFrom, ['12345', '67890'])

    // Unbind
    await service.unbind()
    assert.deepEqual(service.node.config.allowFrom, [])
  } finally {
    service.destroy()
  }
})

test('TelegramService registers into PlatformManager and aggregates status', async () => {
  const ctx = makeMockCordisCtx()
  const pm = new PlatformManager({ logger: ctx.logger() })
  const service = new TelegramService({
    ctx,
    logger: ctx.logger(),
    config: { botToken: '' },
    onPersist: () => {},
  })

  try {
    pm.register(service)
    const status = pm.getStatus()
    assert.ok('telegram' in status)
    assert.equal(status.telegram.id, 'telegram')
    assert.equal(status.telegram.name, 'Telegram')
  } finally {
    service.destroy()
    pm.dispose()
  }
})

test('TelegramConversationNode handles callback query approval and 1/2 commands', async () => {
  const ctx = makeMockCordisCtx()
  const answered = []
  ctx.telegram = {
    answerCallbackQuery: async (id, text) => { answered.push({ id, text }) },
    sendText: async () => ({}),
    sendKeyboard: async () => ({}),
  }

  const node = new TelegramConversationNode(ctx, { allowFrom: ['1001'] }, ctx.logger())
  
  // Test pending approval resolution via callback query
  let resolvedOutcome = null
  node.pending.set(42, {
    resolve: (out) => { resolvedOutcome = out },
    reject: () => {},
    timer: null,
  })

  await ctx.emit('telegram/action', {
    queryId: 'query_1',
    chatId: '1001',
    operatorId: '1001',
    data: 'approve:42',
  })

  assert.equal(resolvedOutcome, 'allowed-once')
  assert.equal(answered.length, 1)
  assert.ok(answered[0].text.includes('已批准'))

  // Test bare 1/2 routing
  node.pending.set(43, {
    resolve: (out) => { resolvedOutcome = out },
    reject: () => {},
    timer: null,
  })

  await node.handleInbound({ senderId: '1001', peerId: '1001', text: '1', isGroup: false })
  assert.equal(resolvedOutcome, 'allowed-once')
})

test('TelegramConversationNode processes inbound media photos and files', async () => {
  const ctx = makeMockCordisCtx()
  ctx.telegram = {
    downloadFile: async (fileId) => ({ path: `/mock/.telegram-media/${fileId}.png`, filename: `${fileId}.png`, size: 1024 }),
  }

  const node = new TelegramConversationNode(ctx, { allowFrom: ['1002'] }, ctx.logger())
  const routedEvents = []
  node.handleInbound = async (item) => {
    routedEvents.push(item)
    return 'routed'
  }

  // Receive message with photo
  await ctx.emit('telegram/message', {
    chatId: '1002',
    senderId: '1002',
    isGroup: false,
    text: '请看这张图',
    raw: {
      photo: [
        { file_id: 'thumb_1', file_size: 100 },
        { file_id: 'highres_1', file_size: 5000 },
      ],
    },
  })

  assert.equal(routedEvents.length, 1)
  assert.ok(routedEvents[0].text.includes('请看这张图'))
  assert.ok(routedEvents[0].text.includes('[文件: /mock/.telegram-media/highres_1.png]'))
})

test('TelegramConversationNode streams turn output incrementally with editMessageText', async () => {
  const ctx = makeMockCordisCtx()
  const sent = []
  const edited = []
  ctx.telegram = {
    sendText: async (chatId, text) => {
      sent.push({ chatId, text })
      return { message_id: 10086 }
    },
    editMessageText: async (chatId, messageId, text) => {
      edited.push({ chatId, messageId, text })
      return {}
    },
  }

  const node = new TelegramConversationNode(ctx, { allowFrom: ['1003'], sendChunkDelayMs: 10 }, ctx.logger())
  node._lastPeer = { chatId: '1003' }
  node.activeSessionId = 'sess_1'

  // Turn start
  await ctx.emit('session/event', { id: 'sess_1' }, { type: 'turn/start' })

  // Send turn content
  await node.sendText('Line 1\nLine 2\nLine 3')

  assert.equal(sent.length, 1)
  assert.equal(sent[0].chatId, '1003')

  // Turn end
  await ctx.emit('session/event', { id: 'sess_1' }, { type: 'turn/end' })
  assert.equal(node._streamMsgId, null)
})

test('TelegramConversationNode handles cmd:xxx callback query action button click', async () => {
  const ctx = makeMockCordisCtx()
  const answered = []
  ctx.telegram = {
    answerCallbackQuery: async (id, text) => { answered.push({ id, text }) },
    sendText: async () => ({}),
    sendKeyboard: async () => ({}),
  }

  const node = new TelegramConversationNode(ctx, { allowFrom: ['1005'] }, ctx.logger())
  const handled = []
  node.handleInbound = async (item) => { handled.push(item) }

  await ctx.emit('telegram/action', {
    queryId: 'query_cmd_1',
    chatId: '1005',
    operatorId: '1005',
    data: 'cmd:sessions',
  })

  assert.equal(answered.length, 1)
  assert.ok(answered[0].text.includes('执行: /sessions'))
  assert.equal(handled.length, 1)
  assert.equal(handled[0].text, '/sessions')
})

test('TelegramGateway registerCommands requests setMyCommands API', async () => {
  const ctx = makeMockCordisCtx()
  let setCommandsPayload = null
  const gw = new TelegramGateway(ctx, { botToken: '12345:TOKEN' })
  gw.request = async (method, params) => {
    if (method === 'setMyCommands') {
      setCommandsPayload = params
      return true
    }
  }

  await gw.registerCommands()
  assert.ok(setCommandsPayload?.commands?.length >= 5)
  assert.ok(setCommandsPayload.commands.some(c => c.command === 'new'))
  assert.ok(setCommandsPayload.commands.some(c => c.command === 'sessions'))
})
