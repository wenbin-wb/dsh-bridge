// test/ask-user-bridge.test.mjs
// Agent 决策问答桥（user-questions/request）的**集成**测试。
//
// 为什么单独写：这是"IM 用户能不能看到并回答 Agent 提问"的核心链路，而它的正确性
// 取决于若干**宿主约定**（waterfall 归属、答案批次形状、超时由宿主驱动），
// 只靠纯函数测试覆盖不到。这里用真实 cordis 起一个最小宿主，注册真服务，
// 验证桥在本插件内的行为。
import test from 'node:test'
import assert from 'node:assert/strict'
import { Context } from '@deepseek-ai/cordis'
import { ConversationBridge } from '../lib/platform/conversation-bridge.js'
import { Platform } from '../lib/platform/base.js'

/** 记录出站消息的平台桩（可选卡片能力）。 */
class AskPlatform extends Platform {
  constructor({ ctx, logger, config = {}, cards = false } = {}) {
    super({ ctx, logger, config })
    this.id = 'mock'
    this.name = 'Mock'
    this.status = 'connected'
    this.sent = []
  }
  get configured() { return true }
  get capabilities() {
    return { supportsGroup: true, supportsMedia: true, supportsVoice: false, supportsTyping: true, maxMessageChars: 4000 }
  }
  async sendText(peerId, text) { this.sent.push({ peerId, text }); return { success: true } }
  async sendMediaFile() { return { success: true } }
  async sendTyping() { return { success: true } }
}

/** 支持卡片的桥桩：`sendAskCard` 定义在**节点/桥**这一层（与飞书实现一致），
 *  桥用鸭子类型探测它来决定是否走按钮路径。
 *  用**类字段**声明 cards：它在 super() 返回后立即初始化，避免父类构造期
 *  调用路径读到 undefined。 */
class CardBridge extends ConversationBridge {
  cards = []
  async sendAskCard(peer, question, entry) {
    this.cards.push({ peerId: peer?.peerId, question: entry.questions[0], number: entry.number })
    return true
  }
}

function setupAskEnv({ cards = false, approvalTimeoutSec = 600 } = {}) {
  const app = new Context()
  const root = app.isolate('bridge-test')
  // 最小宿主：只提供本插件 inject 声明里的服务 + 桥会用到的可选服务
  const services = {
    sessions: { list: () => [], get: () => undefined },
    agents: { get: () => undefined, create: async () => ({}), resume: async () => ({}), roots: () => [] },
    approval: {},
    workspaceRegistry: { archivedSessionIds: [], list: async () => [] },
    sessionPersistence: {},
  }
  for (const [name, value] of Object.entries(services)) root.provide(name, value)

  const logger = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} }
  const platform = new AskPlatform({ ctx: root, logger, cards })
  const BridgeClass = cards ? CardBridge : ConversationBridge
  const bridge = new BridgeClass({
    ctx: root,
    logger,
    config: { allowFrom: ['user-1'], approvalTimeoutSec },
    platform,
  })
  return { app, root, bridge, platform, logger }
}

const QUESTIONS = () => ([{
  id: 'deploy',
  question: '用哪种部署方式？',
  header: '部署',
  options: [{ label: 'Docker' }, { label: '裸机' }],
}])

/** 触发瀑布：模拟宿主 userQuestions.ask() 的调用方式。
 *  注意：host 的兜底回调（noAnswerer）在 waterfall 调用时同步执行，因此必须在
 *  注册桥监听器**之后**再触发，避免测试自己先抛出兜底错误。 */
function fireAsk(root, { agent, questions, signal, wait }) {
  let captured = null
  const noAnswerer = () => {
    captured = 'NO_PROVIDER'
    return Promise.reject(Object.assign(new Error('no user-questions answerer accepted the request'), { code: 'NO_PROVIDER' }))
  }
  // 用 try 包住：兜底是同步抛时也要拿到 captured
  let promise
  try {
    promise = Promise.resolve(root.waterfall('user-questions/request', { questions, agent, signal, wait }, noAnswerer))
  } catch (err) {
    captured = 'NO_PROVIDER'
    promise = Promise.reject(err)
  }
  return { promise, getCaptured: () => captured }
}

/** 造一个"本轮由 IM 发起"的上下文：桥靠 _turnPeers + ownsAgent 判定归属。 */
function bindImTurn(bridge, { sessionId = 'sess-1', peerId = 'chat-1', senderId = 'user-1', isGroup = false } = {}) {
  const agent = { id: 'agent-1', session: { id: sessionId }, inbox: { nextTurn: [], nextStep: [] } }
  bridge._turnPeers.set(sessionId, {
    outboundPeer: { peerId, isGroup },
    senderId,
    senderLabel: '测试用户',
  })
  bridge.ownsAgent = (a) => a === agent
  return agent
}

test('[ask-bridge] IM 发起的提问会被接管并渲染给用户（此前是 NO_PROVIDER）', async () => {
  const { root, bridge, platform } = setupAskEnv()
  bridge.peerId = 'chat-1'
  bridge.activeSessionId = 'sess-1'
  const agent = bindImTurn(bridge)

  const { promise } = fireAsk(root, { agent, questions: QUESTIONS(), wait: { callId: 'c1', timed: false } })
  await new Promise((r) => setTimeout(r, 20))

  assert.equal(platform.sent.length, 1, '应向用户发出提问')
  assert.match(platform.sent[0].text, /需要你的决定/)
  assert.match(platform.sent[0].text, /Docker/)
  assert.equal(bridge.pendingAskCount(), 1, '应登记一条待答')

  // 用户回复 → 桥解析并 resolve 瀑布
  const ok = await bridge.resolveAsk('/ask 1', 'user-1')
  assert.equal(ok, true)
  const answers = await promise
  assert.deepEqual(answers.answers, [{ id: 'deploy', selected: ['Docker'] }])
  assert.equal(bridge.pendingAskCount(), 0, '作答后应清理')
  bridge.dispose()
})

test('[ask-bridge] 非 IM 发起的轮次必须放行给 Web GUI（绝不抢答）', async () => {
  const { root, bridge, platform } = setupAskEnv()
  bridge.activeSessionId = 'sess-web'      // 有活动会话，但没有 _turnPeers 记录
  const agent = { id: 'agent-web', session: { id: 'sess-web' } }

  const { promise, getCaptured } = fireAsk(root, { agent, questions: QUESTIONS() })
  // 关键不变量：桥放行给宿主兜底（Web GUI 才有机会接管），且不向 IM 发问。
  // 兜底错误的具体形状由宿主决定（此处是测试自己提供的 noAnswerer），只断言"走到了兜底"。
  await assert.rejects(promise)
  assert.equal(getCaptured(), 'NO_PROVIDER', 'Web 轮次应落到宿主兜底（交给 GUI）')
  // issue #119：放行之前允许留一条"有提问在等待"的提示（提示 ≠ 抢答），
  // 因此这里断言的是**没有接管**：不登记待答、不回任何作答类内容。
  assert.equal(bridge.pendingAskCount(), 0, '不得登记待答（绝不抢答）')
  for (const sent of platform.sent) {
    assert.doesNotMatch(sent.text, /需要你的决定|请直接在卡片上选择/, '不得把提问本身发到 IM')
  }
  bridge.dispose()
})

test('[ask-bridge] 支持卡片的平台走按钮，不支持则退回文字', async () => {
  {
    const { root, bridge, platform } = setupAskEnv({ cards: true })
    bridge.activeSessionId = 'sess-1'
    const agent = bindImTurn(bridge)
    const { promise } = fireAsk(root, { agent, questions: QUESTIONS() })
    await new Promise((r) => setTimeout(r, 20))
    assert.equal(bridge.cards.length, 1, '有卡片能力时应发卡片')
    assert.equal(platform.sent.length, 0, '卡片送达后不再重复发文字')
    bridge.resolveAsk('/ask 1', 'user-1')
    await promise
    bridge.dispose()
  }
  {
    const { root, bridge, platform } = setupAskEnv({ cards: false })
    bridge.activeSessionId = 'sess-1'
    const agent = bindImTurn(bridge)
    const { promise } = fireAsk(root, { agent, questions: QUESTIONS() })
    await new Promise((r) => setTimeout(r, 20))
    assert.equal((bridge.cards ?? []).length, 0)
    assert.equal(platform.sent.length, 1, '无卡片能力时退回文字')
    bridge.resolveAsk('/ask 2', 'user-1')
    await promise
    bridge.dispose()
  }
})

test('[ask-bridge] 多选/多问不走卡片（卡片表达不了），退回文字', async () => {
  const { root, bridge, platform } = setupAskEnv({ cards: true })
  bridge.activeSessionId = 'sess-1'
  const agent = bindImTurn(bridge)
  const twoQuestions = [
    { id: 'a', question: '部署？', options: [{ label: 'Docker' }, { label: '裸机' }] },
    { id: 'b', question: '监控？', options: [{ label: '要' }, { label: '不要' }] },
  ]
  const { promise } = fireAsk(root, { agent, questions: twoQuestions })
  await new Promise((r) => setTimeout(r, 20))
  assert.equal((bridge.cards ?? []).length, 0, '多问不使用卡片')
  assert.equal(platform.sent.length, 1)
  assert.match(platform.sent[0].text, /逐个作答/)
  bridge.resolveAsk('/ask 1; 2', 'user-1')
  const ans = await promise
  assert.deepEqual(ans.answers, [
    { id: 'a', selected: ['Docker'] },
    { id: 'b', selected: ['不要'] },
  ])
  bridge.dispose()
})

test('[ask-bridge] 非发起者不得代为作答（单聊严格限定本人）', async () => {
  const { root, bridge } = setupAskEnv()
  bridge.activeSessionId = 'sess-1'
  const agent = bindImTurn(bridge, { senderId: 'user-1' })
  const { promise } = fireAsk(root, { agent, questions: QUESTIONS() })
  await new Promise((r) => setTimeout(r, 20))

  const blocked = await bridge.resolveAsk('/ask 1', 'attacker')
  assert.equal(blocked, false, '他人回复不得被当作答案')
  assert.equal(bridge.pendingAskCount(), 1, '条目仍在等待真正的发起者')

  bridge.resolveAsk('/ask 1', 'user-1')
  await promise
  bridge.dispose()
})

test('[ask-bridge] 群聊允许群内成员作答（与审批同一模型）', async () => {
  const { root, bridge } = setupAskEnv()
  bridge.activeSessionId = 'sess-1'
  const agent = bindImTurn(bridge, { isGroup: true, senderId: 'user-1' })
  const { promise } = fireAsk(root, { agent, questions: QUESTIONS() })
  await new Promise((r) => setTimeout(r, 20))
  const ok = await bridge.resolveAsk('/ask 1', 'other-member')
  assert.equal(ok, true, '群内成员应可作答')
  await promise
  bridge.dispose()
})

test('[ask-bridge] 调用被中止（stop）时把等待交还宿主，条目保留待补答', async () => {
  const { root, bridge } = setupAskEnv()
  bridge.activeSessionId = 'sess-1'
  const agent = bindImTurn(bridge)
  const ac = new AbortController()
  const { promise } = fireAsk(root, { agent, questions: QUESTIONS(), signal: ac.signal, wait: { callId: 'c9', timed: true } })
  await new Promise((r) => setTimeout(r, 20))
  assert.equal(bridge.pendingAskCount(), 1)

  ac.abort()  // 宿主驱动（超时/中止都会 abort）
  await assert.rejects(promise, /wait ended/)
  assert.equal(bridge.pendingAskCount(), 1, '超时后仍应保留，允许稍后 /ask 补答')
  bridge.dispose()
})

test('[ask-bridge] 超时后补答：走宿主 userQuestions.answer 的迟到回复通道', async () => {
  const { root, bridge } = setupAskEnv()
  bridge.activeSessionId = 'sess-1'
  const agent = bindImTurn(bridge)
  // 注入宿主 userQuestions 服务（模拟宿主提供 answer()）
  const answered = []
  root.provide('userQuestions', {
    answer(a, callId, batch) { answered.push({ agent: a, callId, batch }); return true },
  })

  const ac = new AbortController()
  const { promise } = fireAsk(root, { agent, questions: QUESTIONS(), signal: ac.signal, wait: { callId: 'c-late', timed: true } })
  await new Promise((r) => setTimeout(r, 20))
  ac.abort()
  await assert.rejects(promise)

  const ok = await bridge.resolveAsk('/ask 1', 'user-1')
  assert.equal(ok, true)
  assert.equal(answered.length, 1, '应通过宿主 answer() 提交迟到回复')
  assert.equal(answered[0].callId, 'c-late')
  assert.deepEqual(answered[0].batch.answers, [{ id: 'deploy', selected: ['Docker'] }])
  assert.equal(bridge.pendingAskCount(), 0, '提交成功后清理条目')
  bridge.dispose()
})

test('[ask-bridge] 回复无法解析时明确反馈且不吞掉消息（避免误喂给模型）', async () => {
  const { root, bridge, platform } = setupAskEnv()
  bridge.activeSessionId = 'sess-1'
  const agent = bindImTurn(bridge)
  const { promise } = fireAsk(root, { agent, questions: QUESTIONS() })
  await new Promise((r) => setTimeout(r, 20))

  const handled = await bridge.resolveAsk('/ask 99', 'user-1')
  assert.equal(handled, true, '应消费该消息（返回 true），不落进模型')
  assert.match(platform.sent.at(-1).text, /没能理解你的回复/)
  assert.equal(bridge.pendingAskCount(), 1, '解析失败不应清理待答')

  bridge.resolveAsk('/ask 1', 'user-1')
  await promise
  bridge.dispose()
})

test('[ask-bridge] /ask 无参数可重发当前问题（手机端常用）', async () => {
  const { root, bridge, platform } = setupAskEnv()
  bridge.activeSessionId = 'sess-1'
  const agent = bindImTurn(bridge)
  const { promise } = fireAsk(root, { agent, questions: QUESTIONS() })
  await new Promise((r) => setTimeout(r, 20))
  const before = platform.sent.length

  await bridge.resendAsk('user-1')
  assert.equal(platform.sent.length, before + 1, '应重新展示问题')
  assert.match(platform.sent.at(-1).text, /需要你的决定/)

  bridge.resolveAsk('/ask 1', 'user-1')
  await promise
  bridge.dispose()
})

test('[ask-bridge] dispose 时待答条目全部释放（桥内 Promise 不悬挂）', async () => {
  const { root, bridge } = setupAskEnv()
  bridge.activeSessionId = 'sess-1'
  const agent = bindImTurn(bridge)
  const { promise } = fireAsk(root, { agent, questions: QUESTIONS() })
  await new Promise((r) => setTimeout(r, 20))
  assert.equal(bridge.pendingAskCount(), 1)
  bridge.dispose()
  await assert.rejects(promise, /wait ended/)   // resolve({aborted:true}) → 桥抛错交还宿主
  assert.equal(bridge.pendingAskCount(), 0)
})
