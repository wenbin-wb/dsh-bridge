// 回归：issue #119 / #112 —— 非 IM 发起轮次的提问归属与兜底推送
//
// 背景：
//   #119  DSH 重启后 `_turnPeers`（纯内存 Map）被清空，重启前遗留/恢复的轮次没有
//         peer 记录 → `user-questions/request` 判定为"非 IM 轮次" → next() 交给宿主，
//         手机端完全静默，轮次可无限期挂起（实测挂 7.5 小时）。
//   #112  同一根因的另一面：PC 上编辑发送的轮次根本不由 IM 发起，提问同样静默。
//
// 本文件锁住四件事：
//   ① 默认（alwaysNotifyAsk=false）行为**完全不变**：非 IM 轮次仍交回宿主 GUI；
//   ② 开启后，无 _turnPeers 记录的轮次也能把提问推到**白名单内**的目标；
//   ③ 安全边界：兜底**绝不**把新 peer 写入白名单，也绝不推给白名单外的目标；
//   ④ 多会话歧义：兜底推送时标题必须带会话标识。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Platform, ConversationBridge } from '../lib/platform/index.js'
import { formatAskPrompt } from '../lib/platform/ask-user.js'

const NOOP = () => {}
const noopLogger = { info: NOOP, warn: NOOP, error: NOOP, debug: NOOP }

/** 最小 mock 平台：把 sendText 都记下来，便于断言"推没推、推给谁"。 */
class MockPlatform extends Platform {
  constructor({ ctx, config = {} } = {}) {
    super({ ctx, logger: noopLogger, config })
    this.id = 'mock'
    this.name = 'Mock IM'
    this.status = 'connected'
    this.accountId = 'bot-mock'
    this.sent = []
  }
  get configured() { return true }
  get capabilities() {
    return { supportsGroup: true, supportsMedia: true, supportsVoice: false, supportsTyping: true, maxMessageChars: 2000 }
  }
  async sendText(peerId, text) {
    this.sent.push({ peerId, text })
    return { success: true }
  }
  async sendTyping() { return { success: true } }
}

/** 造一个最小的 ctx，只提供 user-questions/request 的事件注册能力。 */
function makeCtx() {
  const handlers = new Map()
  return {
    handlers,
    on(name, fn) {
      handlers.set(name, fn)
      return () => handlers.delete(name)
    },
    get() { return undefined },
    async fire(name, ...args) {
      const fn = handlers.get(name)
      if (!fn) return undefined
      return fn(...args)
    },
  }
}

/**
 * 构造一个"桥 + mock 平台"的测试骨架。
 * @param {object} opts
 * @param {object} opts.config 桥配置（allowFrom / alwaysNotifyAsk 等）
 */
function makeHarness({ config = {} } = {}) {
  const ctx = makeCtx()
  const platform = new MockPlatform({ ctx, config: {} })
  const bridge = new ConversationBridge({
    ctx,
    logger: noopLogger,
    config,
    platform,
    onFirstSender: NOOP,
    onActiveSessionChange: NOOP,
  })
  bridge._attachAskUserBridge()
  return { ctx, platform, bridge }
}

/** 一个假的 agent/session，模拟"不是 IM 发起"的轮次。 */
function makeAgent(sessionId, cwd = '/home/user/projects/dsh-bridge') {
  return { session: { id: sessionId, header: { cwd } } }
}

// 宿主的问题对象带 id；桥用它校验答案批次（validateAnswerBatch），缺 id 会被判非法。
const QUESTIONS = [{ id: 'q-env', header: '要部署到哪？', question: '选一个环境', options: [{ label: 'staging' }, { label: 'prod' }] }]

// ---------------------------------------------------------------------------
// ① 默认关闭：行为必须与旧版完全一致
// ---------------------------------------------------------------------------

test('#119：alwaysNotifyAsk 默认关闭时，非 IM 发起的轮次提问仍交回宿主 GUI', async () => {
  const { ctx, platform, bridge } = makeHarness({ config: { allowFrom: ['user-1'] } })
  assert.equal(bridge.config.alwaysNotifyAsk, false, '默认必须是关闭')

  let nextCalled = 0
  await ctx.fire('user-questions/request', {
    agent: makeAgent('session-未登记'),
    questions: QUESTIONS,
    signal: new AbortController().signal,
  }, () => { nextCalled += 1 })

  assert.equal(nextCalled, 1, '未开启兜底时必须调用 next() 交回宿主')
  assert.equal(platform.sent.length, 0, '默认关闭时不得向 IM 推送任何提问')
})

// ---------------------------------------------------------------------------
// ② 开启兜底：重启后遗留轮次（_turnPeers 空）也能送到 IM
// ---------------------------------------------------------------------------

test('#119/#112：开启 alwaysNotifyAsk 后，重启遗留轮次的提问「提醒 + 放行」，不接管', async () => {
  const { ctx, platform, bridge } = makeHarness({ config: { allowFrom: ['user-1'], alwaysNotifyAsk: true } })

  // 模拟"重启后"：_turnPeers 是空的，activeSessionId 与 agent 的 session 不一致
  assert.equal(bridge._turnPeers.size, 0, '前置：轮次表应为空')
  bridge.activeSessionId = null

  let nextCalled = 0
  const done = ctx.fire('user-questions/request', {
    agent: makeAgent('session-遗留轮次'),
    questions: QUESTIONS,
    signal: new AbortController().signal,
  }, () => { nextCalled += 1 })

  await new Promise((r) => setTimeout(r, 30))

  // waterfall 的 next() 只能调一次：接管就不放行。提醒路径**必须**放行，
  // 否则 Web 端永远拿不到提问卡片（实测回归，见 #119 补充说明）。
  assert.equal(nextCalled, 1, '提醒之后必须放行给宿主 GUI')
  assert.equal(bridge.pendingAskCount(), 0, '提醒不是接管，不得登记待答')
  assert.equal(platform.sent.length, 1, '必须发一条提醒')
  assert.equal(platform.sent[0].peerId, 'user-1', '必须推给白名单里的 peer')
  assert.match(platform.sent[0].text, /提问在等你处理/, '文案应是提醒而非提问正文')
  assert.doesNotMatch(platform.sent[0].text, /需要你的决定/, '提醒不得伪装成提问')
  await done
})

test('#119：重启时正在跑的轮次没有 _lastTurnPeers 记录（turn/end 才写入），此时落到白名单首位', async () => {
  // 这条锁的是 issue #119 的**典型**场景：重启时该轮正跑到一半，turn/end 从未触发，
  // 因此 _lastTurnPeers 里没有它的绑定 —— 归属只能来自白名单。
  // 若将来有人把 _lastTurnPeers 的写入点挪到 turn/start，这条用例会变红，是预期行为。
  const { ctx, platform, bridge } = makeHarness({ config: { allowFrom: ['user-1', 'user-2'], alwaysNotifyAsk: true } })
  assert.equal(bridge._lastTurnPeers.size, 0, '前置：重启后 _lastTurnPeers 必为空')

  let nextCalled = 0
  const done = ctx.fire('user-questions/request', {
    agent: makeAgent('session-重启时在跑'),
    questions: QUESTIONS,
    signal: new AbortController().signal,
  }, () => { nextCalled += 1 })
  await new Promise((r) => setTimeout(r, 30))

  assert.equal(platform.sent.length, 1)
  assert.equal(platform.sent[0].peerId, 'user-1', '无绑定时应落到白名单首位')
  assert.equal(nextCalled, 1, '提醒后必须放行')
  assert.equal(bridge.pendingAskCount(), 0, '不得登记待答')
  await done
})

test('#119：_lastTurnPeers 有该会话的绑定后，兜底优先用它而不是 allowFrom[0]', async () => {
  const { ctx, platform, bridge } = makeHarness({
    config: { allowFrom: ['user-1', 'user-2'], alwaysNotifyAsk: true },
  })
  // 模拟 issue #119 报告里的真实形态：重启后 _turnPeers 空，但上一轮出站绑定仍在
  bridge._rememberBounded(bridge._lastTurnPeers, 'session-遗留轮次', {
    outboundPeer: { peerId: 'oc_chat_real' },
  })

  let nextCalled = 0
  const done = ctx.fire('user-questions/request', {
    agent: makeAgent('session-遗留轮次'),
    questions: QUESTIONS,
    signal: new AbortController().signal,
  }, () => { nextCalled += 1 })

  await new Promise((r) => setTimeout(r, 30))
  assert.equal(platform.sent.length, 1)
  assert.equal(platform.sent[0].peerId, 'oc_chat_real', '应回到"上一次真正用过的对话框"，而不是白名单首位')
  assert.equal(nextCalled, 1, '提醒后必须放行')
  assert.equal(bridge.pendingAskCount(), 0, '提醒不登记待答')
  await done
})

// ---------------------------------------------------------------------------
// ③ 安全边界
// ---------------------------------------------------------------------------

test('#119：兜底绝不修改白名单（不产生自授权后门）', async () => {
  const { ctx, bridge } = makeHarness({ config: { allowFrom: ['user-1'], alwaysNotifyAsk: true } })
  const before = [...bridge.config.allowFrom]

  const done = ctx.fire('user-questions/request', {
    agent: makeAgent('session-x'),
    questions: QUESTIONS,
    signal: new AbortController().signal,
  }, () => {})
  await new Promise((r) => setTimeout(r, 20))
  await bridge.resolveAsk('1', 'user-1')
  await done

  assert.deepEqual(bridge.config.allowFrom, before, '白名单必须一字不改')
})

test('#119：白名单为空时兜底不推送（宁可放行给 GUI，也不推给未知目标）', async () => {
  const { ctx, platform, bridge } = makeHarness({ config: { allowFrom: [], alwaysNotifyAsk: true } })
  bridge.peerId = null

  let nextCalled = 0
  await ctx.fire('user-questions/request', {
    agent: makeAgent('session-y'),
    questions: QUESTIONS,
    signal: new AbortController().signal,
  }, () => { nextCalled += 1 })

  assert.equal(nextCalled, 1, '无可用目标时必须交回宿主')
  assert.equal(platform.sent.length, 0)
})

test('#119：非白名单的 peerId 不得被兜底复用（旧 resolveSendTarget 的隐患）', async () => {
  const { ctx, platform, bridge } = makeHarness({ config: { allowFrom: ['user-1'], alwaysNotifyAsk: true } })
  // peerId 曾被**非白名单**发送者写入过（旧实现的真实隐患），兜底不得直接采信
  bridge.peerId = 'stranger-999'

  const done = ctx.fire('user-questions/request', {
    agent: makeAgent('session-z'),
    questions: QUESTIONS,
    signal: new AbortController().signal,
  }, () => {})
  await new Promise((r) => setTimeout(r, 20))

  assert.equal(platform.sent.length, 1)
  assert.equal(platform.sent[0].peerId, 'user-1', '必须跳过陌生 peerId，回落到白名单目标')
  assert.match(platform.sent[0].text, /> 会话：/, '兜底路径必带会话标识')
  assert.notEqual(platform.sent[0].peerId, 'stranger-999')

  await bridge.resolveAsk('1', 'user-1')
  await done
})

test('#119：群聊兜底目标必须在白名单内（单聊打码不等于群聊打码）', async () => {
  const { ctx, platform, bridge } = makeHarness({ config: { allowFrom: ['user-1'], alwaysNotifyAsk: true } })
  // 群聊目标不在白名单：即便它出现在 _lastTurnPeers 里也不得采信
  bridge._rememberBounded(bridge._lastTurnPeers, 'session-group', {
    outboundPeer: { peerId: 'group-not-allowlisted', isGroup: true },
  })

  const done = ctx.fire('user-questions/request', {
    agent: makeAgent('session-group'),
    questions: QUESTIONS,
    signal: new AbortController().signal,
  }, () => {})
  await new Promise((r) => setTimeout(r, 20))

  assert.equal(platform.sent.length, 1)
  assert.equal(platform.sent[0].peerId, 'user-1', '群聊目标未入白名单时必须回落到白名单目标')

  await bridge.resolveAsk('1', 'user-1')
  await done
})

// ---------------------------------------------------------------------------
// ④ 多会话歧义：兜底推送必须标出会话来源
// ---------------------------------------------------------------------------

test('#112：兜底推送的标题带会话标识（多会话并发时能分辨在答哪个）', async () => {
  const { ctx, platform, bridge } = makeHarness({ config: { allowFrom: ['user-1'], alwaysNotifyAsk: true } })

  const done = ctx.fire('user-questions/request', {
    agent: makeAgent('session-66292ab8-aaaa-bbbb-cccc-1234567890ab', '/home/user/projects/dsh-bridge'),
    questions: QUESTIONS,
    signal: new AbortController().signal,
  }, () => {})
  await new Promise((r) => setTimeout(r, 20))

  assert.equal(platform.sent.length, 1)
  assert.match(platform.sent[0].text, /> 会话：/, '兜底推送必须带会话来源行')
  assert.match(platform.sent[0].text, /dsh-bridge/, '会话标识应含 cwd 末段（人可读）')
  assert.match(platform.sent[0].text, /1234567890ab|0ab/, '会话标识应含会话 id 尾段（保证唯一）')

  await bridge.resolveAsk('1', 'user-1')
  await done
})

test('#112：IM 主动发起的轮次不带会话标识（既有观感不变）', async () => {
  const { ctx, platform, bridge } = makeHarness({ config: { allowFrom: ['user-1'] } })
  bridge.activeSessionId = 'session-im'
  bridge._turnPeers.set('session-im', { outboundPeer: { peerId: 'user-1' }, senderId: 'user-1' })

  const done = ctx.fire('user-questions/request', {
    agent: makeAgent('session-im'),
    questions: QUESTIONS,
    signal: new AbortController().signal,
  }, () => {})
  await new Promise((r) => setTimeout(r, 20))

  assert.equal(platform.sent.length, 1)
  assert.doesNotMatch(platform.sent[0].text, /> 会话：/, 'IM 发起的轮次不该多出会话行')

  await bridge.resolveAsk('1', 'user-1')
  await done
})

// ---------------------------------------------------------------------------
// 文案层单测：formatAskPrompt 的 sessionTag 参数
// ---------------------------------------------------------------------------

test('formatAskPrompt：sessionTag 出现在标题下方，且不会破坏行内代码', () => {
  const plain = formatAskPrompt(QUESTIONS, { number: 3 })
  assert.doesNotMatch(plain, /> 会话：/)

  const tagged = formatAskPrompt(QUESTIONS, { number: 3, sessionTag: 'dsh-bridge · 66292ab8' })
  assert.match(tagged, /## ❓ 需要你的决定 \(#3\)/)
  assert.match(tagged, /> 会话：`dsh-bridge · 66292ab8`/)

  // 反引号必须被中和，否则后续整段会被吞进代码块
  const hostile = formatAskPrompt(QUESTIONS, { number: 1, sessionTag: 'a`b|c' })
  assert.doesNotMatch(hostile, /a`b/, '反引号必须被替换')
  assert.doesNotMatch(hostile, /\|/, '竖线必须被替换（避免打乱表格）')
  assert.ok(hostile.includes('′'), '应替换为等价可见字符')
})

// ---------------------------------------------------------------------------
// 辅助函数：会话标识的构造规则
// ---------------------------------------------------------------------------

test('sessionTagOf 契约：cwd 末段 + 会话 id 尾段；信息不足时降级不报错', async () => {
  const { sessionTagOf } = await import('../lib/platform/conversation-bridge.js').catch(() => ({}))
  // sessionTagOf 未导出（内部函数），退回行为级断言：通过兜底推送的文案验证
  const { ctx, platform, bridge } = makeHarness({ config: { allowFrom: ['u'], alwaysNotifyAsk: true } })

  // 只有 id、没有 cwd → 仍应有标识（只有 id 尾段）
  const done = ctx.fire('user-questions/request', {
    agent: { session: { id: 'abcdefgh12345678' } },
    questions: QUESTIONS,
    signal: new AbortController().signal,
  }, () => {})
  await new Promise((r) => setTimeout(r, 20))
  assert.match(platform.sent[0].text, /> 会话：`12345678`/, '无 cwd 时降级为仅会话 id 尾段')

  await bridge.resolveAsk('1', 'u')
  await done
  assert.equal(typeof sessionTagOf, 'undefined')
})
