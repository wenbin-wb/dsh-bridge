// dsh-bridge QqService construction smoke test
// Verifies the gateway (Service subclass) + conversation node construct and
// register 'qq' on a mock Cordis context without throwing.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { QqService } from '../lib/qq/index.js'
import { QqGateway, QQ_INTENTS, gatewayConstants } from '../lib/qq/gateway.js'
import { qqNodeHelpers } from '../lib/qq/node.js'
import { PlatformManager } from '../lib/platform/manager.js'

function makeMockCordisCtx() {
  const events = {}
  const ctx = {
    on(event, fn) { (events[event] ??= []).push(fn); return () => { events[event] = (events[event] ?? []).filter(f => f !== fn) } },
    emit(event, ...args) { (events[event] ?? []).forEach((fn) => fn(...args)) },
    effect(fn) { return fn() },
    logger: { info() {}, warn() {}, error() {} },
    sessions: { list: () => [], get: () => undefined },
    agents: { create: async () => ({}), get: () => undefined },
    reflect: { provide(name, value) { ctx['__provided__' + name] = value; return () => {} } },
  }
  return ctx
}

test('QqGateway is a Service and registers as ctx.qq', () => {
  const ctx = makeMockCordisCtx()
  const gw = new QqGateway({ ctx, logger: ctx.logger, config: {} })
  try {
    assert.equal(gw.name, 'qq')
    assert.equal(gw.status, 'idle')
    assert.equal(gw.configured, false)
    assert.ok(ctx.__provided__qq === gw, 'gateway registered as ctx.qq')
  } finally {
    gw.dispose()
  }
})

test('QqGateway configured requires appId + clientSecret', () => {
  const ctx = makeMockCordisCtx()
  const gw = new QqGateway({ ctx, logger: ctx.logger, config: { appId: 'a', clientSecret: 's' } })
  try {
    assert.equal(gw.configured, true)
    assert.ok(gw.capabilities.supportsGroup, 'QQ 支持群聊')
    assert.equal(gw.capabilities.maxMessageChars, 2000)
  } finally {
    gw.dispose()
  }
})

test('QqGateway QQ_INTENTS bit flags match OpenAPI v2', () => {
  // 官方 intent 位（来自 API v2 文档）：
  // C2C_MESSAGE_CREATE 与 GROUP_AT_MESSAGE_CREATE 同属 GROUP_AND_C2C_EVENT (1<<25)
  assert.equal(QQ_INTENTS.C2C_MESSAGE_CREATE, 1 << 25)
  assert.equal(QQ_INTENTS.GROUP_AT_MESSAGE_CREATE, 1 << 25)
  assert.equal(QQ_INTENTS.GROUP_AND_C2C_EVENT, 1 << 25)
  assert.equal(QQ_INTENTS.INTERACTION_CREATE, 1 << 26)
})

test('QqService constructs gateway + node and wires allowlist', async () => {
  const ctx = makeMockCordisCtx()
  const persisted = {}
  const svc = new QqService({
    ctx,
    logger: ctx.logger,
    config: { allowFrom: ['u1@qq.openid'] },
    onPersist: async (patch) => Object.assign(persisted, patch),
  })
  assert.equal(svc.gateway.configured, false) // no credentials yet
  assert.deepEqual(svc.node.config.allowFrom, ['u1@qq.openid'])
  assert.equal(svc.gateway.status, 'idle') // not configured → no connection
  await svc.destroy()
})

test('QqService setAllowFrom persists and updates node', async () => {
  const ctx = makeMockCordisCtx()
  const persisted = {}
  const svc = new QqService({ ctx, logger: ctx.logger, config: {}, onPersist: async (patch) => Object.assign(persisted, patch) })
  await svc.setAllowFrom(['a', ' a ', 'b', '', 'a'])
  assert.deepEqual(svc.node.config.allowFrom, ['a', 'b'])
  assert.deepEqual(persisted.allowFrom, ['a', 'b'])
  await svc.destroy()
})

test('QqService getStatus includes login state', async () => {
  const ctx = makeMockCordisCtx()
  const svc = new QqService({ ctx, logger: ctx.logger, config: {}, onPersist: async () => {} })
  const s = svc.getStatus()
  assert.equal(typeof s.status, 'string')
  assert.ok('login' in s)
  assert.ok(Array.isArray(s.allowFrom))
  await svc.destroy()
})

test('QqService is a Platform instance with id/name/capabilities', async () => {
  const ctx = makeMockCordisCtx()
  const svc = new QqService({ ctx, logger: ctx.logger, config: {}, onPersist: async () => {} })
  assert.equal(svc.id, 'qq')
  assert.equal(svc.name, 'QQ')
  assert.equal(svc.configured, false)
  assert.ok(svc.capabilities.maxMessageChars > 0)
  assert.equal(svc.capabilities.supportsGroup, true)
  const s = svc.getStatus()
  assert.equal(s.id, 'qq')
  assert.ok(s.capabilities)
  await svc.destroy()
})

test('QqService registers into PlatformManager and aggregates status', async () => {
  const ctx = makeMockCordisCtx()
  const svc = new QqService({ ctx, logger: ctx.logger, config: {}, onPersist: async () => {} })
  const manager = new PlatformManager({ logger: ctx.logger })
  try {
    manager.register(svc)
    assert.equal(manager.get('qq'), svc)
    const status = manager.getStatus()
    assert.ok('qq' in status)
    assert.equal(status.qq.id, 'qq')
    assert.equal(status.qq.name, 'QQ')
  } finally {
    await svc.destroy()
    manager.dispose()
  }
})

test('QqService login without credentials returns error', async () => {
  const ctx = makeMockCordisCtx()
  const svc = new QqService({ ctx, logger: ctx.logger, config: {}, onPersist: async () => {} })
  const result = await svc.login()
  assert.equal(result.ok, false)
  assert.ok(result.error.includes('AppID'))
  await svc.destroy()
})

test('QqGateway API_BASE uses unified api.bot.qq.com domain', () => {
  const ctx = makeMockCordisCtx()
  const gw = new QqGateway({ ctx, logger: ctx.logger, config: {} })
  try {
    // 官方 2026-08-10 变更：所有接口域名统一为 api.bot.qq.com
    assert.equal(gatewayConstants.API_BASE, 'https://api.bot.qq.com')
    // 官方 WebSocket 网关地址同样统一为 api.bot.qq.com
    assert.equal(gatewayConstants.DEFAULT_GATEWAY, 'wss://api.bot.qq.com/websocket/')
  } finally {
    gw.dispose()
  }
})

test('QqGateway gateway discovery uses /gateway/bot endpoint', async () => {
  const ctx = makeMockCordisCtx()
  const gw = new QqGateway({ ctx, logger: ctx.logger, config: {} })
  const originalFetch = global.fetch
  try {
    let capturedUrl = null
    gw.refreshAccessToken = async () => 'tok'
    gw.connect = async () => { gw.stopRequested = true } // 连一次即停，避免死循环
    global.fetch = async (url) => {
      capturedUrl = url
      return { ok: true, text: async () => JSON.stringify({ url: 'wss://api.bot.qq.com/websocket', shards: 1 }) }
    }
    await gw.runLoop()
    assert.ok(capturedUrl?.includes('/gateway/bot'), 'should call /gateway/bot, got ' + capturedUrl)
  } finally {
    global.fetch = originalFetch
    await gw.dispose()
  }
})

test('QqGateway stream message endpoint uses underscore stream_messages', () => {
  const ctx = makeMockCordisCtx()
  const gw = new QqGateway({ ctx, logger: ctx.logger, config: {} })
  try {
    // 官方流式消息路径：/v2/users/{user_openid}/stream_messages（下划线）
    const ep = gw.endpoint('u_123', 'c2c', 'stream_messages')
    assert.equal(ep, '/v2/users/u_123/stream_messages')
    const epGroup = gw.endpoint('g_456', 'group', 'stream_messages')
    assert.equal(epGroup, '/v2/groups/g_456/stream_messages')
  } finally {
    gw.dispose()
  }
})

test('QqGateway panel & menu endpoints resolve under /v2', () => {
  const ctx = makeMockCordisCtx()
  const gw = new QqGateway({ ctx, logger: ctx.logger, config: {} })
  try {
    // 自定义菜单：/v2/menu
    // 指令面板：/v2/panels[/{panel_id}][/target]
    // 通过检查 api() 实现路径拼装（mock fetch）来验证
    const calls = []
    gw.api = async (path, opts) => { calls.push([path, opts]); return {} }
    void gw.getMenu()
    void gw.setMenu([])
    void gw.listPanels('c2c')
    void gw.createPanel({ scope: 'group' })
    void gw.getPanel('p_1')
    void gw.updatePanel('p_1', {})
    void gw.deletePanel('p_1')
    void gw.updatePanelTarget('p_1', {})
    assert.equal(calls.length, 8)
    assert.deepEqual(calls[0][0], '/v2/menu')
    assert.deepEqual(calls[1][0], '/v2/menu')
    assert.deepEqual(calls[2][0], '/v2/panels?scope=c2c')
    assert.deepEqual(calls[3][0], '/v2/panels')
    assert.deepEqual(calls[4][0], '/v2/panels/p_1')
    assert.deepEqual(calls[5][0], '/v2/panels/p_1')
    assert.deepEqual(calls[6][0], '/v2/panels/p_1')
    assert.deepEqual(calls[7][0], '/v2/panels/p_1/target')
  } finally {
    gw.dispose()
  }
})

test('QqGateway sendKeyboard uses msg_type=0 with content+keyboard', () => {
  const ctx = makeMockCordisCtx()
  const gw = new QqGateway({ ctx, logger: ctx.logger, config: {} })
  try {
    let captured = null
    gw.api = async (path, opts) => { captured = opts.body; return { id: 'msg_1' } }
    const keyboard = { content: { rows: [{ buttons: [{ id: 'b1' }] }] } }
    void gw.sendKeyboard('u_123', '提示文本', keyboard, { scope: 'c2c', msgId: 'u_msg' })
    assert.equal(captured.msg_type, 0)
    assert.equal(captured.content, '提示文本')
    assert.equal(captured.keyboard, keyboard)
    assert.equal(captured.msg_id, 'u_msg')
  } finally {
    gw.dispose()
  }
})

test('QqGateway sendMarkdown passes keyboard through and omits undefined optional fields', () => {
  const ctx = makeMockCordisCtx()
  const gw = new QqGateway({ ctx, logger: ctx.logger, config: {} })
  try {
    let captured = null
    gw.api = async (path, opts) => { captured = opts.body; return { id: 'msg_1' } }
    // 官方键盘结构：keyboard.content.rows；回调按钮 action.type=1
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
            ],
          },
        ],
      },
    }
    void gw.sendMarkdown('u_123', '**提示**', { scope: 'c2c', msgId: 'u_msg', keyboard })
    assert.equal(captured.msg_type, 2)
    assert.equal(captured.markdown.content, '**提示**')
    assert.deepEqual(captured.keyboard, keyboard)
    assert.equal(captured.msg_id, 'u_msg')
    // 未提供的可选字段不出现（避免 undefined 污染）
    assert.ok(!('event_id' in captured))
    assert.ok(!('msg_seq' in captured))
    // 无 keyboard 时不带该字段
    void gw.sendMarkdown('u_123', '**提示**', { scope: 'c2c' })
    assert.ok(!('keyboard' in captured))
  } finally {
    gw.dispose()
  }
})

test('QqGateway sendTyping uses msg_type=6 with input_notify', () => {
  const ctx = makeMockCordisCtx()
  const gw = new QqGateway({ ctx, logger: ctx.logger, config: {} })
  try {
    let captured = null
    gw.api = async (path, opts) => { captured = opts.body; return {} }
    void gw.sendTyping('u_123', { scope: 'c2c', durationSeconds: 8 })
    assert.equal(captured.msg_type, 6)
    assert.equal(captured.input_notify.input_type, 1)
    assert.equal(captured.input_notify.input_second, 8)
    // 上限 60 秒
    void gw.sendTyping('u_123', { scope: 'c2c', durationSeconds: 999 })
    assert.equal(captured.input_notify.input_second, 60)
  } finally {
    gw.dispose()
  }
})

test('sanitizeQQMarkdown preserves table and sanitizes images/headings', () => {
  const input = [
    '| 名称 | 说明 |',
    '| :--- | :--- |',
    '| /new | 新建 |',
    '',
    '![图](https://example.com/a.png) 和 **粗体**',
    '',
    '```js',
    'const a = 1 | 2',
    '```',
  ].join('\n')
  const out = qqNodeHelpers.sanitizeQQMarkdown(input)
  // 表格内容与格式保留
  assert.ok(out.includes('| 名称 | 说明 |'), '表头保留')
  assert.ok(out.includes('| /new | 新建 |'), '表格内容保留')
  assert.ok(out.includes('| :--- | :--- |'), '分隔行保留')
  // 图片语法转为链接，粗体保留
  assert.ok(out.includes('[图](https://example.com/a.png)'), '图片语法转为链接')
  // 标题级别规范化：### 转为 ##
  const headingInput = '### 三级标题\n普通文本\n- 列表项1\n- 列表项2'
  const headingOut = qqNodeHelpers.sanitizeQQMarkdown(headingInput)
  assert.ok(headingOut.includes('## 三级标题'), 'H3 被规范化为 H2')
  assert.ok(headingOut.includes('普通文本\n\n- 列表项1'), '普通文本与列表之间自动补全空行')
})

test('splitIntoChunks splits at boundaries and splits single block in two', () => {
  const { splitIntoChunks } = qqNodeHelpers
  // 短内容：单块拆两片（保证流式过渡）
  const short = '很短的内容'
  const shortChunks = splitIntoChunks(short, 400)
  assert.equal(shortChunks.length, 2)
  assert.equal(shortChunks.join(''), short)
  // 长内容：多片且拼接完整
  const long = Array.from({ length: 50 }, (_, i) => `第${i}行内容`).join('\n')
  const chunks = splitIntoChunks(long, 400)
  assert.ok(chunks.length >= 2)
  assert.equal(chunks.join(''), long)
})

test('splitIntoIncremental produces ascending prefixes ending with full content', () => {
  const { splitIntoIncremental, splitIntoChunks } = qqNodeHelpers
  const long = Array.from({ length: 50 }, (_, i) => `第${i}行内容`).join('\n')
  const slices = splitIntoIncremental(long, 400)
  // 每片长度递增，且以上一片开头
  for (let i = 1; i < slices.length; i++) {
    assert.ok(slices[i].length > slices[i - 1].length, `slice ${i} longer than ${i - 1}`)
    assert.ok(slices[i].startsWith(slices[i - 1]), `slice ${i} starts with previous`)
  }
  // 最后一片是完整内容
  assert.equal(slices[slices.length - 1], long)
  // 与 splitIntoChunks 的段数一致
  assert.equal(slices.length, splitIntoChunks(long, 400).length)
})

test('QqGateway sendStream passes content_type markdown through', () => {
  const ctx = makeMockCordisCtx()
  const gw = new QqGateway({ ctx, logger: ctx.logger, config: {} })
  try {
    let captured = null
    gw.api = async (path, opts) => { captured = opts.body; return { id: 's_1' } }
    void gw.sendStream('u_123', '**粗体**', {
      scope: 'c2c', contentType: 'markdown', inputState: 10, index: 0, inputMode: 'replace', msgId: 'm1', msgSeq: 7,
    })
    assert.equal(captured.content_type, 'markdown')
    assert.equal(captured.content_raw, '**粗体**')
    assert.equal(captured.input_state, 10)
    assert.equal(captured.input_mode, 'replace')
    assert.equal(captured.msg_id, 'm1')
    assert.equal(captured.msg_seq, 7)
    // 未提供的可选字段不应出现在 body 中（避免 undefined 污染）
    assert.ok(!('event_id' in captured))
  } finally {
    gw.dispose()
  }
})
