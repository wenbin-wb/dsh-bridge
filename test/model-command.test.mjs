// `/model` 指令回归测试（issue #91）
//
// 覆盖：目录渲染（编号 + 当前打勾）、按编号选择、provider/model 直写、reset、
// 越界/非法输入、宿主没有模型服务时的降级提示，以及目录缓存保证编号稳定。
//
// 语义边界（本文件同时作为文档）：模型选择写入**平台配置**，对该平台之后
// 新建（/new）或重新接入（/use）的会话生效；当前活着的会话不受影响。
import test from 'node:test'
import assert from 'node:assert/strict'
import { Platform } from '../lib/platform/index.js'
import { ConversationBridge } from '../lib/platform/conversation-bridge.js'

class MockPlatform extends Platform {
  constructor({ ctx, logger, config = {} } = {}) {
    super({ ctx, logger, config })
    this.id = 'mock'
    this.name = 'Mock IM'
    this.status = 'connected'
    this.sent = []
  }
  get configured() { return true }
  get capabilities() {
    return { supportsGroup: true, supportsMedia: true, supportsVoice: false, supportsTyping: true, maxMessageChars: 4000 }
  }
  async sendText(peerId, text) { this.sent.push({ peerId, text }); return { success: true } }
  async sendTyping() { return { success: true } }
}

const PROVIDERS = [
  { id: 'deepseek', name: 'DeepSeek' },
  { id: 'openai', name: 'OpenAI' },
]

const MODELS = {
  deepseek: [
    { id: 'deepseek-chat', name: 'DeepSeek Chat' },
    { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner' },
  ],
  openai: [{ id: 'gpt-4o', name: 'GPT-4o' }],
}

function makeCtx({ llmAvailable = true, defaultSelection, onListProviders } = {}) {
  const calls = { listProviders: 0, listModels: [] }
  const llm = llmAvailable
    ? {
        listProviders: () => {
          calls.listProviders += 1
          onListProviders?.(calls.listProviders)
          return PROVIDERS
        },
        listModels: async (id) => {
          calls.listModels.push(id)
          return MODELS[id] ?? []
        },
      }
    : undefined
  const agent = { session: { id: 's1' }, status: 'idle', followup() {}, steer() {}, cancel() {} }
  const ctx = {
    logger: { info() {}, warn() {}, error() {}, debug() {} },
    on() { return () => {} },
    emit() {},
    get: (name) => {
      if (name === 'llm') return llm
      if (name === 'agentDefaultModel') return { currentSelection: () => defaultSelection }
      return undefined
    },
    sessions: { list: () => [], get: () => undefined },
    agents: { get: (id) => (id === 's1' ? agent : undefined), list: () => [], create: async () => { throw new Error('not used') }, resume: async () => { throw new Error('not used') } },
    workspaceRegistry: { archivedSessionIds: [], list: async () => [] },
    sessionProjCache: {},
  }
  return { ctx, calls }
}

function makeBridge({ config = {}, llmAvailable = true, defaultSelection, onListProviders } = {}) {
  const { ctx, calls } = makeCtx({ llmAvailable, defaultSelection, onListProviders })
  const persisted = []
  const platform = new MockPlatform({ ctx, logger: ctx.logger, config: { allowFrom: ['u1'], ...config } })
  const bridge = new ConversationBridge({
    ctx,
    logger: ctx.logger,
    config: { allowFrom: ['u1'], ...config },
    platform,
    onConfigChange: async (patch) => { persisted.push(patch) },
  })
  return { ctx, calls, platform, bridge, persisted }
}

const lastText = (platform) => String(platform.sent.at(-1)?.text ?? '')

test('/model 列出编号、当前打勾，并提示选择方式', async () => {
  const { platform, bridge } = makeBridge({ config: { agentProvider: 'deepseek', agentModel: 'deepseek-reasoner' } })

  await bridge.handleInbound({ senderId: 'u1', text: '/model' })
  const text = lastText(platform)

  assert.match(text, /1\. `deepseek-chat` — DeepSeek Chat/)
  assert.match(text, /2\. `deepseek-reasoner` — DeepSeek Reasoner ✅/)
  assert.match(text, /3\. `gpt-4o` — GPT-4o/)
  assert.match(text, /当前：\*\*deepseek\/deepseek-reasoner\*\*/)
  assert.match(text, /`\/model reset`/)
  assert.match(text, /新建（`\/new`）或重新接入（`\/use`）/)
  bridge.dispose()
})

test('/model <编号> 写入平台配置并持久化，且说明当前会话不变', async () => {
  const { platform, bridge, persisted } = makeBridge()
  bridge.activeSessionId = 's1' // 有活着的会话 → 提示当前会话不变

  await bridge.handleInbound({ senderId: 'u1', text: '/model 3' })

  assert.equal(bridge.config.agentProvider, 'openai')
  assert.equal(bridge.config.agentModel, 'gpt-4o')
  assert.deepEqual(persisted.at(-1), { agentProvider: 'openai', agentModel: 'gpt-4o' })
  const text = lastText(platform)
  assert.match(text, /已选择模型.*openai\/gpt-4o/)
  assert.match(text, /当前会话仍使用原模型/)
  bridge.dispose()
})

test('/model provider/model 直写选择（不依赖目录编号）', async () => {
  const { bridge, persisted } = makeBridge({ llmAvailable: false })

  await bridge.handleInbound({ senderId: 'u1', text: '/model deepseek/deepseek-reasoner' })

  assert.equal(bridge.config.agentProvider, 'deepseek')
  assert.equal(bridge.config.agentModel, 'deepseek-reasoner')
  assert.deepEqual(persisted.at(-1), { agentProvider: 'deepseek', agentModel: 'deepseek-reasoner' })
  bridge.dispose()
})

test('/model reset 清除平台覆盖', async () => {
  const { platform, bridge, persisted } = makeBridge({ config: { agentProvider: 'openai', agentModel: 'gpt-4o' } })

  await bridge.handleInbound({ senderId: 'u1', text: '/model reset' })

  assert.equal(bridge.config.agentProvider, '')
  assert.equal(bridge.config.agentModel, '')
  assert.deepEqual(persisted.at(-1), { agentProvider: '', agentModel: '' })
  assert.match(lastText(platform), /已恢复 DSH 默认模型/)
  bridge.dispose()
})

test('/model 越界编号与非法参数给出可操作提示，且不改配置', async () => {
  const { platform, bridge, persisted } = makeBridge({ config: { agentProvider: 'deepseek', agentModel: 'deepseek-chat' } })

  await bridge.handleInbound({ senderId: 'u1', text: '/model 99' })
  assert.match(lastText(platform), /无效编号/)
  await bridge.handleInbound({ senderId: 'u1', text: '/model nonsense' })
  assert.match(lastText(platform), /无法识别的模型/)

  assert.equal(bridge.config.agentProvider, 'deepseek')
  assert.equal(bridge.config.agentModel, 'deepseek-chat')
  assert.equal(persisted.length, 0, '非法输入不得写配置')
  bridge.dispose()
})

test('宿主没有 llm 服务时给出降级提示，仍支持 provider/model 直写', async () => {
  const { platform, bridge } = makeBridge({ llmAvailable: false })

  await bridge.handleInbound({ senderId: 'u1', text: '/model' })
  const text = lastText(platform)
  assert.match(text, /没有提供模型目录/)
  assert.match(text, /`\/model <provider>\/<model>`/)
  bridge.dispose()
})

test('目录缓存：连续两次 /model 只拉取一次 provider 列表（编号稳定）', async () => {
  const { platform, bridge, calls } = makeBridge()

  await bridge.handleInbound({ senderId: 'u1', text: '/model' })
  await bridge.handleInbound({ senderId: 'u1', text: '/model 2' })

  assert.equal(calls.listProviders, 1)
  assert.equal(bridge.config.agentProvider, 'deepseek')
  assert.equal(bridge.config.agentModel, 'deepseek-reasoner')
  assert.match(lastText(platform), /deepseek\/deepseek-reasoner/)
  bridge.dispose()
})

test('单个 provider 的模型列表失败不影响其它 provider', async () => {
  const { ctx, platform, bridge } = (() => {
    const made = makeBridge()
    // 覆盖 listModels：deepseek 抛错，openai 正常
    const llm = {
      listProviders: () => PROVIDERS,
      listModels: async (id) => {
        if (id === 'deepseek') throw new Error('endpoint down')
        return MODELS[id] ?? []
      },
    }
    made.ctx.get = (name) => (name === 'llm' ? llm : undefined)
    return made
  })()

  await bridge.handleInbound({ senderId: 'u1', text: '/model' })
  const text = lastText(platform)
  assert.match(text, /1\. `gpt-4o`/)
  assert.doesNotMatch(text, /deepseek-chat/)
  bridge.dispose()
  assert.ok(ctx)
})
