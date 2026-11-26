// 回归：issue #119 —— 提问落回宿主 GUI 时不得完全静默
//
// 与 ask-fallback-notify.test.mjs 的分工：
//   - 前者验证 `alwaysNotifyAsk` 开启后的**归属兜底**（把提问推到白名单 IM 目标）；
//   - 本文件验证**拍板放行之后的最后一层保险**：无法归属时，先在原通道留一条
//     "本轮有提问在等待"的提示，再调用 next() 交给宿主。
//
// 为什么需要这层：
//   `_turnPeers` 与 `_lastTurnPeers` 都是纯内存 Map，重启即清空。重启后恢复/遗留的
//   轮次既没有本会话绑定、也未必有 activeSession 归属（activeSessionId 指向别的会话
//   时 `ownsAgent` 直接挡掉），归属兜底命中不了。此时若一声不响地 next()，手机端只会
//   看到"发了消息没反应"，issue #119 实测因此挂了 7.5 小时才被人工发现。
//
// 边界（不可越界）：
//   ① 只发**提示**，绝不接管提问、绝不阻塞宿主——提示发完仍必须调用 next()；
//   ② 绝不因此把任何人写进白名单；
//   ③ 本来就能归属的轮次（IM 发起 / alwaysNotifyAsk 兜底）不得多发提示；
//   ④ 非活跃会话的遗留轮次也必须提示——那正是 #119 的场景，此时 activeSessionId
//      早已不是它，若按 ownsAgent 过滤就永远不会提示。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Platform, ConversationBridge } from '../lib/platform/index.js'

const NOOP = () => {}
const noopLogger = { info: NOOP, warn: NOOP, error: NOOP, debug: NOOP }

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

function makeAgent(sessionId, cwd = '/home/user/projects/dsh-bridge') {
  return { session: { id: sessionId, header: { cwd } } }
}

const QUESTIONS = [{ id: 'q-env', header: '要部署到哪？', question: '选一个环境', options: [{ label: 'staging' }, { label: 'prod' }] }]

const NOTICE_PATTERN = /本轮有一个提问在等你处理/

/** 等出站串行队列排空（sendText 走 _enqueueSend，返回 Promise）。 */
async function flush(out = 30) {
  await new Promise((r) => setTimeout(r, out))
}

test('#119：开启提醒后，无法归属的提问先发提示再交回宿主（不再完全静默）', async () => {
  const { ctx, platform, bridge } = makeHarness({ config: { allowFrom: ['user-1'], alwaysNotifyAsk: true } })
  bridge.activeSessionId = null

  let nextCalled = 0
  await ctx.fire('user-questions/request', {
    agent: makeAgent('session-遗留轮次'),
    questions: QUESTIONS,
    signal: new AbortController().signal,
  }, () => { nextCalled += 1 })
  await flush()

  assert.equal(nextCalled, 1, '提示归提示，仍必须交回宿主，绝不接管')
  assert.equal(platform.sent.length, 1, '必须发出一条提示')
  assert.match(platform.sent[0].text, NOTICE_PATTERN, '提示文案应说明有提问在等待')
  assert.equal(platform.sent[0].peerId, 'user-1', '提示优先发给白名单内的目标')
})

test('#119：会话仍挂在另一个 activeSession 上时同样要提示（ownsAgent 挡掉的场景）', async () => {
  const { ctx, platform, bridge } = makeHarness({ config: { allowFrom: ['user-1'], alwaysNotifyAsk: true } })
  // 用户在 GUI 里切过会话：activeSessionId 指向别处，遗留轮次永远过不了 ownsAgent
  bridge.activeSessionId = 'session-当前在用的'
  bridge._turnPeers.set('session-遗留轮次', { outboundPeer: { peerId: 'user-1' }, senderId: 'user-1' })

  let nextCalled = 0
  await ctx.fire('user-questions/request', {
    agent: makeAgent('session-遗留轮次'),
    questions: QUESTIONS,
    signal: new AbortController().signal,
  }, () => { nextCalled += 1 })
  await flush()

  assert.equal(nextCalled, 1, '仍交回宿主')
  assert.equal(platform.sent.length, 1, '这种情况下同样不能静默')
  assert.match(platform.sent[0].text, NOTICE_PATTERN)
})

test('#119：提示绝不修改白名单，也不写新的 peer', async () => {
  const { ctx, bridge } = makeHarness({ config: { allowFrom: ['user-1'], alwaysNotifyAsk: true } })
  const before = [...bridge.config.allowFrom]
  const peerBefore = bridge.peerId

  await ctx.fire('user-questions/request', {
    agent: makeAgent('session-x'),
    questions: QUESTIONS,
    signal: new AbortController().signal,
  }, () => {})
  await flush()

  assert.deepEqual(bridge.config.allowFrom, before, '白名单必须一字不改')
  assert.equal(bridge.peerId, peerBefore, '不得顺带写入 peerId')
})

test('#119：默认配置下没有可用提示目标时，直接交回宿主且不发任何消息', async () => {
  const { ctx, platform, bridge } = makeHarness({ config: { allowFrom: [] } })
  bridge.activeSessionId = null
  bridge.peerId = null

  let nextCalled = 0
  await ctx.fire('user-questions/request', {
    agent: makeAgent('session-无目标'),
    questions: QUESTIONS,
    signal: new AbortController().signal,
  }, () => { nextCalled += 1 })

  assert.equal(nextCalled, 1)
  assert.equal(platform.sent.length, 0, '没有可信目标时宁可不发，也不能推给陌生人')
})

test('#119：IM 发起的轮次能正常接管，不得多发提示', async () => {
  const { ctx, platform, bridge } = makeHarness({ config: { allowFrom: ['user-1'] } })
  bridge.activeSessionId = 'session-im'
  bridge._turnPeers.set('session-im', { outboundPeer: { peerId: 'user-1' }, senderId: 'user-1' })

  const done = ctx.fire('user-questions/request', {
    agent: makeAgent('session-im'),
    questions: QUESTIONS,
    signal: new AbortController().signal,
  }, () => {})

  await new Promise((r) => setTimeout(r, 20))
  assert.equal(platform.sent.length, 1, '只发提问本身，不该多一条提示')
  assert.doesNotMatch(platform.sent[0].text, NOTICE_PATTERN)
  assert.match(platform.sent[0].text, /需要你的决定/)

  await bridge.resolveAsk('1', 'user-1')
  await done
})

test('#119/#112：alwaysNotifyAsk 开启时的提醒只发一条，且不接管', async () => {
  const { ctx, platform, bridge } = makeHarness({ config: { allowFrom: ['user-1'], alwaysNotifyAsk: true } })
  bridge.activeSessionId = null

  let nextCalled = 0
  const done = ctx.fire('user-questions/request', {
    agent: makeAgent('session-兜底'),
    questions: QUESTIONS,
    signal: new AbortController().signal,
  }, () => { nextCalled += 1 })

  await new Promise((r) => setTimeout(r, 30))
  // 提醒路径本身就是那条"提示"，因此恰好一条、且不伪装成提问
  assert.equal(platform.sent.length, 1, '只发一条提醒')
  assert.match(platform.sent[0].text, NOTICE_PATTERN)
  assert.equal(nextCalled, 1, '提醒后必须放行给宿主 GUI（Web 端要能弹窗）')
  assert.equal(bridge.pendingAskCount(), 0, '不得登记待答')
  await done
})

test('#119：提示文案带会话标识，便于用户判断该去哪个会话处理', async () => {
  const { ctx, platform } = makeHarness({ config: { allowFrom: ['user-1'], alwaysNotifyAsk: true } })

  await ctx.fire('user-questions/request', {
    agent: makeAgent('session-66292ab8-aaaa-bbbb-cccc-1234567890ab', '/home/user/projects/dsh-bridge'),
    questions: QUESTIONS,
    signal: new AbortController().signal,
  }, () => {})
  await flush()

  assert.equal(platform.sent.length, 1)
  assert.match(platform.sent[0].text, /dsh-bridge/, '应带 cwd 末段')
  assert.match(platform.sent[0].text, /567890ab/, "应带会话 id 尾段（后 8 位）")
})

// ---------------------------------------------------------------------------
// #112 回归：提醒路径绝不能吃掉 Web 端的提问卡片
// ---------------------------------------------------------------------------
//
// `user-questions/request` 是 waterfall，`next()` 只能调一次且一旦接管就不能再调。
// 实测回归：alwaysNotifyAsk 最初实现成"兜底接管"，导致 Web 面板发起的会话在
// Web 上完全看不到提问卡片（手机上收到了，电脑上什么都没有）。
// 本组用例锁住"提醒 ≠ 接管"这条不变量。

test('#112：Web 发起的轮次在提醒之后必须放行，Web 端才能弹窗', async () => {
  const { ctx, platform, bridge } = makeHarness({ config: { allowFrom: ['user-1'], alwaysNotifyAsk: true } })
  bridge.activeSessionId = null

  let nextCalled = 0
  await ctx.fire('user-questions/request', {
    agent: makeAgent('session-web-发起'),
    questions: QUESTIONS,
    signal: new AbortController().signal,
  }, () => { nextCalled += 1 })
  await new Promise((r) => setTimeout(r, 30))

  assert.equal(nextCalled, 1, 'next() 恰好被调用一次：既放行又不重复')
  assert.equal(bridge.pendingAskCount(), 0, '提醒路径不得登记待答条目')
  assert.equal(platform.sent.length, 1, 'IM 侧只收到一条提醒')
  assert.doesNotMatch(platform.sent[0].text, /需要你的决定/, '提醒不得伪装成提问卡片')
})

test('#112：提醒文案需说明"请在 Web 面板作答"，避免用户以为要在这里回', async () => {
  const { ctx, platform } = makeHarness({ config: { allowFrom: ['user-1'], alwaysNotifyAsk: true } })

  await ctx.fire('user-questions/request', {
    agent: makeAgent('session-web-2'),
    questions: QUESTIONS,
    signal: new AbortController().signal,
  }, () => {})
  await new Promise((r) => setTimeout(r, 30))

  assert.equal(platform.sent.length, 1)
  assert.match(platform.sent[0].text, /Web 面板/, '必须指明去 Web 面板作答')
  assert.match(platform.sent[0].text, /已在 Web 面板显示/, '讲清卡片就在 Web 上')
})

test('#112：开关关闭时 Web 轮次完全不打扰 IM（既有行为不变）', async () => {
  const { ctx, platform, bridge } = makeHarness({ config: { allowFrom: ['user-1'] } })
  bridge.activeSessionId = null

  let nextCalled = 0
  await ctx.fire('user-questions/request', {
    agent: makeAgent('session-web-3'),
    questions: QUESTIONS,
    signal: new AbortController().signal,
  }, () => { nextCalled += 1 })
  await new Promise((r) => setTimeout(r, 30))

  assert.equal(nextCalled, 1, '必须放行')
  assert.equal(platform.sent.length, 0, '开关关闭时 IM 侧不应有任何消息')
})
