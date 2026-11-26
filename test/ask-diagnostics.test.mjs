// 回归：提问归属与提醒发送必须可落盘诊断（issue #119 补充）
//
// 背景（2026-11-26 实测）：QQ 侧没收到"有提问在等你"的提醒，但无论 journalctl 还是
// ~/.dsh/dsh-bridge/diagnostics.log 都没有任何记录——宿主 logger 默认不落盘，
// 桥只打了 logger.info，于是完全无法判断是"没调发送"还是"调了被平台拒"。
//
// 本文件锁住四件事：
//   ① 判定为放行时留痕；
//   ② 提醒发送前留痕（目标 peer + 原因）；
//   ③ 发送成功/失败都要留痕，失败必须带 error；
//   ④ 没有可信目标时也要留痕，而不是静默 return。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Platform, ConversationBridge } from '../lib/platform/index.js'

const NOOP = () => {}
const QUESTIONS = [{ id: 'q1', header: '要部署到哪？', question: '选一个环境', options: [{ label: 'staging' }] }]

class MockPlatform extends Platform {
  constructor({ ctx, sendResult = { success: true } } = {}) {
    super({ ctx, logger: { info: NOOP, warn: NOOP, error: NOOP }, config: {} })
    this.id = 'mock'
    this.name = 'Mock'
    this.status = 'connected'
    this.accountId = 'b'
    this.sent = []
    this.sendResult = sendResult
  }
  get configured() { return true }
  get capabilities() { return { supportsGroup: true, supportsMedia: true, maxMessageChars: 2000 } }
  async sendText(peerId, text) {
    this.sent.push({ peerId, text })
    if (typeof this.sendResult === 'function') return this.sendResult()
    return this.sendResult
  }
  async sendTyping() { return { success: true } }
}

function makeHarness({ config = {}, sendResult } = {}) {
  const handlers = new Map()
  const ctx = {
    on: (n, f) => { handlers.set(n, f); return () => handlers.delete(n) },
    get: () => undefined,
    fire: async (n, ...a) => { const f = handlers.get(n); return f ? f(...a) : undefined },
  }
  const diagnostics = []
  const platform = new MockPlatform({ ctx, sendResult })
  const bridge = new ConversationBridge({
    ctx,
    logger: { info: NOOP, warn: NOOP, error: NOOP },
    config,
    platform,
    onFirstSender: NOOP,
    onActiveSessionChange: NOOP,
    onDiagnostic: (level, message) => diagnostics.push({ level, message: String(message) }),
  })
  bridge._attachAskUserBridge()
  return { ctx, platform, bridge, diagnostics }
}

const agent = (id) => ({ session: { id, header: { cwd: '/p/dsh-bridge' } } })
const flush = () => new Promise((r) => setTimeout(r, 40))

test('诊断：Web 发起并放行时写入可落盘的判定记录', async () => {
  const { ctx, diagnostics } = makeHarness({ config: { allowFrom: ['u1'], alwaysNotifyAsk: true } })

  await ctx.fire('user-questions/request', {
    agent: agent('session-web'),
    questions: QUESTIONS,
    signal: new AbortController().signal,
  }, () => {})
  await flush()

  const joined = diagnostics.map((d) => d.message).join('\n')
  assert.match(joined, /提问提醒并放行/, '必须记录放行判定')
  assert.match(joined, /session=session-web/, '必须带上会话 id，便于定位')
})

test('诊断：提醒发送前与提交后各留一条，且含目标 peer', async () => {
  const { ctx, diagnostics } = makeHarness({ config: { allowFrom: ['u1'], alwaysNotifyAsk: true } })

  await ctx.fire('user-questions/request', {
    agent: agent('session-x'),
    questions: QUESTIONS,
    signal: new AbortController().signal,
  }, () => {})
  await flush()

  const msgs = diagnostics.map((d) => d.message)
  assert.ok(msgs.some((m) => /提问提醒：向 peer=u1 发送/.test(m)), '发送前应有意图记录')
  assert.ok(msgs.some((m) => /提问提醒已提交发送：peer=u1/.test(m)), '提交后应有记录')
})

test('诊断：分块发送失败必须留下 warn 且带平台返回的错误', async () => {
  // 真实路径：平台 sendText 返回 success=false 时，桥在 _sendTextNow 里 break，
  // 失败由**出站分块**那条 warn 记录（而不是上层 then 的返回值——它拿不到）。
  const { ctx, diagnostics } = makeHarness({
    config: { allowFrom: ['u1'], alwaysNotifyAsk: true },
    sendResult: { success: false, error: 'frequency limit exceeded' },
  })

  await ctx.fire('user-questions/request', {
    agent: agent('session-fail'),
    questions: QUESTIONS,
    signal: new AbortController().signal,
  }, () => {})
  await flush()

  const failed = diagnostics.find((d) => /出站分块发送失败/.test(d.message))
  assert.ok(failed, '必须记录发送失败')
  assert.equal(failed.level, 'warn', '失败应为 warn 级别')
  assert.match(failed.message, /frequency limit exceeded/, '必须带出平台错误，否则仍要猜')
  assert.match(failed.message, /peer=u1/, '必须带目标，便于核对是否发错人')
})

test('诊断：发送抛异常时同样留痕（不得吞成未处理拒绝）', async () => {
  const { ctx, diagnostics } = makeHarness({
    config: { allowFrom: ['u1'], alwaysNotifyAsk: true },
    sendResult: () => { throw new Error('socket hang up') },
  })

  await ctx.fire('user-questions/request', {
    agent: agent('session-throw'),
    questions: QUESTIONS,
    signal: new AbortController().signal,
  }, () => {})
  await flush()

  const hit = diagnostics.find((d) => /出站分块抛异常/.test(d.message))
  assert.ok(hit, '异常也要有记录')
  assert.match(hit.message, /socket hang up/)
})

test('诊断：没有可信目标时明确记录"跳过"，而不是静默返回', async () => {
  const { ctx, diagnostics } = makeHarness({ config: { allowFrom: [], alwaysNotifyAsk: true } })

  await ctx.fire('user-questions/request', {
    agent: agent('session-notarget'),
    questions: QUESTIONS,
    signal: new AbortController().signal,
  }, () => {})
  await flush()

  const skipped = diagnostics.find((d) => /提问提醒跳过/.test(d.message))
  assert.ok(skipped, '无目标时也必须留痕，否则与"没触发"无法区分')
  assert.equal(skipped.level, 'warn')
})

test('诊断：未注入 onDiagnostic 时不得抛错（测试环境与老宿主兼容）', async () => {
  const handlers = new Map()
  const ctx = { on: (n, f) => { handlers.set(n, f); return () => handlers.delete(n) }, get: () => undefined }
  const platform = new MockPlatform({ ctx })
  const bridge = new ConversationBridge({
    ctx, logger: { info: NOOP, warn: NOOP, error: NOOP },
    config: { allowFrom: ['u1'], alwaysNotifyAsk: true }, platform,
    onFirstSender: NOOP, onActiveSessionChange: NOOP,
  })
  bridge._attachAskUserBridge()

  await assert.doesNotReject(async () => {
    await handlers.get('user-questions/request')({
      agent: agent('session-no-diag'),
      questions: QUESTIONS,
      signal: new AbortController().signal,
    }, () => {})
  })
})
