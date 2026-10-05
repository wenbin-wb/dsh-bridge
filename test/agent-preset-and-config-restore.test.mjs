// dsh-bridge 回归测试：agent preset 挂载 + 平台配置字符串字段恢复（issue #40）
//
// 背景（issue #40 / #39）：DSH ≥0.1.5 把 agent plane（工具、提示词、技能目录）整体
// 挪到了 agent preset 后面，宿主层禁用了 tool-fs / tool-bash / tool-jobs / tool-skill
// 等行，改由每个会话在 agents.create / agents.resume 的 setup 回调里挂载 preset 提供。
// 桥此前只往 meta 里写 agentPreset（且回退值硬编码为作者私有的 'routing-suite'），
// 从不传 setup → 远程会话落在"空 preset 层"，工具集残缺。
// 同时 restorePlatform 只恢复白名单字段，cwd/agentPreset/agentProvider/agentModel
// 在重启后丢失。
// 另含 issue #39 的回归：sessionPersistence.list() 在 DSH 0.1.5 返回
// { header, revision, sizeBytes } 快照，旧代码按 entry.id 读会误判"未持久化"，
// 对磁盘上已存在的会话调用 agents.create → session "..." already exists。
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ConversationBridge } from '../lib/platform/conversation-bridge.js'
import { applyRestoredPlatformConfig, RESTORED_STRING_FIELDS, PLATFORM_TIMING_FIELDS } from '../lib/platform/config-restore.js'
import { applySessionConfig, readSessionConfig, SESSION_CONFIG_FIELDS } from '../lib/platform/session-config.js'
import { sessionHeaderOf } from '../lib/platform/session-catalog.js'
import { FeishuService } from '../lib/feishu/index.js'
import { installBridgeRpc, BRIDGE_ENDPOINTS } from '../lib/bridge-rpc.js'

// ---------------------------------------------------------------------------
// 1. 配置恢复：字符串字段白名单
// ---------------------------------------------------------------------------

test('RESTORED_STRING_FIELDS 覆盖决定远程会话形态的四个字符串配置', () => {
  assert.deepEqual(RESTORED_STRING_FIELDS, ['agentPreset', 'cwd', 'agentProvider', 'agentModel'])
})

test('PLATFORM_TIMING_FIELDS 覆盖四个平台 setConfig 持久化的会话节奏参数', () => {
  // 写入侧（wechat/qq/feishu/telegram 的 setConfig）都会持久化这三个数值键；
  // 恢复侧漏掉就等于"设置页调好的节奏参数只活到下一次重启"（QQ/飞书此前正是漏了）
  assert.deepEqual(PLATFORM_TIMING_FIELDS, ['digestIntervalSec', 'approvalTimeoutSec', 'sendChunkDelayMs'])
  const nodeConfig = {}
  applyRestoredPlatformConfig(nodeConfig, {
    digestIntervalSec: 60,
    approvalTimeoutSec: 120,
    sendChunkDelayMs: 500,
  }, { numericFields: PLATFORM_TIMING_FIELDS })
  assert.equal(nodeConfig.digestIntervalSec, 60)
  assert.equal(nodeConfig.approvalTimeoutSec, 120)
  assert.equal(nodeConfig.sendChunkDelayMs, 500)
})

test('applyRestoredPlatformConfig 恢复 cwd/agentPreset/agentProvider/agentModel（issue #40 根因1）', () => {
  const nodeConfig = { allowFrom: [], cwd: undefined, agentPreset: undefined, agentProvider: undefined, agentModel: undefined }
  applyRestoredPlatformConfig(nodeConfig, {
    allowFrom: ['u1'],
    cwd: 'D:\\projects\\demo',
    agentPreset: 'collab',
    agentProvider: 'deepseek',
    agentModel: 'deepseek-v4.1-flash',
  }, { stringFields: RESTORED_STRING_FIELDS })

  assert.deepEqual(nodeConfig.allowFrom, ['u1'])
  assert.equal(nodeConfig.cwd, 'D:\\projects\\demo')
  assert.equal(nodeConfig.agentPreset, 'collab')
  assert.equal(nodeConfig.agentProvider, 'deepseek')
  assert.equal(nodeConfig.agentModel, 'deepseek-v4.1-flash')
})

test('applyRestoredPlatformConfig 不覆盖已有值：缺失、空串与非字符串一律忽略', () => {
  const nodeConfig = { cwd: '/keep', agentPreset: 'keep', agentProvider: undefined, agentModel: undefined }
  applyRestoredPlatformConfig(nodeConfig, {
    cwd: '',
    agentPreset: 42,
    agentProvider: '   ',
    agentModel: null,
  }, { stringFields: RESTORED_STRING_FIELDS })

  assert.equal(nodeConfig.cwd, '/keep', '空串不应清掉构造期配置')
  assert.equal(nodeConfig.agentPreset, 'keep', '非字符串不应写入')
  assert.equal(nodeConfig.agentProvider, undefined)
  assert.equal(nodeConfig.agentModel, undefined)
})

test('applyRestoredPlatformConfig 保持原有数值/开关语义（回归）', () => {
  const nodeConfig = { allowFrom: [], maxMessageChars: 2000 }
  applyRestoredPlatformConfig(nodeConfig, {
    allowFrom: 'not-an-array',
    digestIntervalSec: '120',
    maxMessageChars: 10,
    groupAutoApprove: true,
  }, { numericFields: ['digestIntervalSec'], defaultMaxMessageChars: 4096, stringFields: RESTORED_STRING_FIELDS })

  assert.deepEqual(nodeConfig.allowFrom, [], '非数组 allowFrom 归一为空数组')
  assert.equal(nodeConfig.digestIntervalSec, 120)
  assert.equal(nodeConfig.maxMessageChars, 4096, '低于下限的 maxMessageChars 回落默认值')
  assert.equal(nodeConfig.groupAutoApprove, true)
})

// ---------------------------------------------------------------------------
// 测试脚手架
// ---------------------------------------------------------------------------

/** 造一个 rosterless（旧 DSH）或带 agentPresets 服务的 mock ctx。 */
function makeBridge({ agentPresets, config = {}, persistenceEntries = [] } = {}) {
  const calls = { create: [], resume: [], mounts: [], warns: [] }
  const agent = { session: { id: 'session-mock' }, followup: () => {}, status: 'idle', cancel: () => {} }
  const ctx = {
    on: () => () => {},
    effect: () => () => {},
    sessions: { list: () => [], get: () => undefined },
    agents: {
      create: async (opts) => { calls.create.push(opts); return { agent: { ...agent, session: { id: opts.sessionId } } } },
      resume: async (opts) => { calls.resume.push(opts); return { agent: { ...agent, session: { id: opts.resumeSessionId } } } },
      get: () => undefined,
    },
    // 真实形状：DSH 0.1.5 的 list() 返回 { header, revision, sizeBytes } 快照
    sessionPersistence: { list: async () => persistenceEntries },
    workspaceRegistry: { archivedSessionIds: [], list: async () => [{ id: 'ws-1', path: '/tmp/ws', title: 'WS', attachSession: async () => {} }] },
    sessionProjCache: {},
    get(name) {
      // 真实 cordis ctx.get()：服务未注册时返回 undefined → 旧版 DSH 分支
      if (name === 'agentPresets') return agentPresets
      if (name === 'agentDefaultModel') return undefined
      return undefined
    },
  }
  const platform = {
    id: 'mock',
    name: 'Mock IM',
    capabilities: { maxMessageChars: 2000, supportsGroup: true },
    sent: [],
    async sendText(peer, text) { this.sent.push(text); return { success: true } },
    async sendTyping() {},
  }
  const bridge = new ConversationBridge({
    ctx,
    logger: {
      info: () => {},
      warn: (...args) => calls.warns.push(args.join(' ')),
      error: () => {},
    },
    platform,
    config: { allowFrom: ['user1'], ...config },
  })
  return { bridge, platform, calls }
}

/** 造一个可控的 agentPresets 服务：known 之外的 id 一律 not-found，与 DSH 行为一致。 */
function makePresets(known, defaultId) {
  const mounts = []
  return {
    mounts,
    defaultId,
    async resolve(id) {
      const wanted = id ?? defaultId
      if (!known.includes(wanted)) {
        const err = new Error(`agent-presets: preset "${wanted}" not found (available: ${known.join(', ')})`)
        err.code = 'agent-preset/not-found'
        throw err
      }
      return { id: wanted }
    },
    async mount(agentCtx, id) { mounts.push({ agentCtx, id }); return { id } },
  }
}

// ---------------------------------------------------------------------------
// 2. 新建会话：必须挂载 preset
// ---------------------------------------------------------------------------

test('createSession 挂载 DSH 默认 preset 并把它记进 meta（不再写死 routing-suite）', async () => {
  const presets = makePresets(['standard', 'collab'], 'standard')
  const { bridge, calls } = makeBridge({ agentPresets: presets })

  await bridge.createSession('你好')

  assert.equal(calls.create.length, 1)
  const opts = calls.create[0]
  assert.equal(opts.meta.agentPreset, 'standard', '未配置时应解析成 DSH 默认 preset')
  assert.notEqual(opts.meta.agentPreset, 'routing-suite')
  assert.equal(typeof opts.setup, 'function', '必须传 setup，否则工具集落在空 preset 层')

  await opts.setup({ agentCtx: true }, { id: 'a' })
  assert.equal(presets.mounts.length, 1)
  assert.equal(presets.mounts[0].id, 'standard')
})

test('createSession 使用配置的 agentPreset（而不是回退到硬编码值）', async () => {
  const presets = makePresets(['standard', 'collab'], 'standard')
  const { bridge, calls } = makeBridge({ agentPresets: presets, config: { agentPreset: 'collab' } })

  await bridge.createSession('你好')

  assert.equal(calls.create[0].meta.agentPreset, 'collab')
  await calls.create[0].setup({}, {})
  assert.equal(presets.mounts[0].id, 'collab')
})

test('配置的 preset 不存在时回退 DSH 默认 preset 并告警，不建空层也不抛错', async () => {
  const presets = makePresets(['standard'], 'standard')
  const { bridge, platform, calls } = makeBridge({ agentPresets: presets, config: { agentPreset: 'routing-suite' } })

  await bridge.createSession('你好')

  assert.equal(calls.create.length, 1, '不应因 preset 缺失而创建失败')
  assert.equal(calls.create[0].meta.agentPreset, 'standard')
  await calls.create[0].setup({}, {})
  assert.equal(presets.mounts[0].id, 'standard')
  assert.ok(calls.warns.some((w) => w.includes('routing-suite') && w.includes('falling back')), '应记录回退告警')
  assert.ok(platform.sent.some((t) => t.includes('已创建新会话')), '用户侧仍应看到创建成功')
  assert.ok(
    platform.sent.some((t) => t.includes('routing-suite') && t.includes('默认预设')),
    '回退必须让用户在聊天里看得见，否则又是"配了不生效"',
  )
})

test('配置的工作区不可用时回落默认工作区并提示（不把会话建在不存在的 cwd 上）', async () => {
  const presets = makePresets(['standard'], 'standard')
  const { bridge, platform, calls } = makeBridge({ agentPresets: presets, config: { cwd: 'relative/not-absolute' } })

  await bridge.createSession('你好')

  assert.equal(calls.create[0].meta.cwd, '/tmp/ws', '应回落到首个已注册工作区')
  assert.ok(platform.sent.some((t) => t.includes('不可用') && t.includes('relative/not-absolute')), '应明确告知回落原因')
  assert.ok(calls.warns.some((w) => w.includes('not a usable directory')))
})

test('配置的工作区是真实存在的绝对目录时照常使用', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-bridge-cwd-'))
  const presets = makePresets(['standard'], 'standard')
  const { bridge, platform, calls } = makeBridge({ agentPresets: presets, config: { cwd: dir } })

  await bridge.createSession('你好')

  assert.equal(calls.create[0].meta.cwd, dir)
  assert.ok(!platform.sent.some((t) => t.includes('不可用')))
})

test('旧版 DSH（无 agentPresets 服务）保持原行为：不传 setup，也不写死 preset 名', async () => {
  const { bridge, calls } = makeBridge({ agentPresets: undefined, config: { agentPreset: 'collab' } })

  await bridge.createSession('你好')

  assert.equal(calls.create[0].setup, undefined)
  assert.equal(calls.create[0].meta.agentPreset, 'collab')
  assert.notEqual(calls.create[0].meta.agentPreset, 'routing-suite')
})

test('旧版 DSH 且未配置 preset 时，meta 不携带 agentPreset（交给 DSH 自身默认）', async () => {
  const { bridge, calls } = makeBridge({ agentPresets: undefined })

  await bridge.createSession('你好')

  assert.equal(calls.create[0].setup, undefined)
  assert.ok(!('agentPreset' in calls.create[0].meta), 'meta 不应出现 agentPreset: undefined 或任何硬编码名')
})

// ---------------------------------------------------------------------------
// 3. 恢复会话：按会话自身记录的 preset 重新挂载
// ---------------------------------------------------------------------------

test('sessionHeaderOf 兼容 DSH 0.1.5 的 { header, revision } 快照与更早的扁平 header', () => {
  const header = { id: 'session-1', agentPreset: 'collab' }
  assert.equal(sessionHeaderOf({ header, revision: 'x', sizeBytes: 10 }), header)
  assert.equal(sessionHeaderOf(header), header)
  assert.equal(sessionHeaderOf({ revision: 'x' }), undefined)
  assert.equal(sessionHeaderOf(null), undefined)
  assert.equal(sessionHeaderOf('session-1'), undefined)
})

test('re-attach 已持久化会话时按 header 记录的 preset 挂载', async () => {
  const presets = makePresets(['standard', 'collab'], 'standard')
  const { bridge, platform, calls } = makeBridge({
    agentPresets: presets,
    persistenceEntries: [{ header: { id: 'session-persisted', agentPreset: 'collab' }, revision: 'r1' }],
  })
  bridge.activeSessionId = 'session-persisted'

  await bridge.handleInbound({ senderId: 'user1', text: 'hi' })

  assert.equal(calls.resume.length, 1)
  assert.equal(typeof calls.resume[0].setup, 'function')
  await calls.resume[0].setup({}, {})
  assert.equal(presets.mounts[0].id, 'collab', '恢复应沿用会话自己的 preset')
  assert.ok(!platform.sent.some((t) => t.includes('恢复会话失败')))
})

test('已持久化会话必须走 resume 而不是 create（#39 回归：create 会报 already exists）', async () => {
  const presets = makePresets(['standard'], 'standard')
  const { bridge, calls } = makeBridge({
    agentPresets: presets,
    persistenceEntries: [{ header: { id: 'session-live', agentPreset: 'standard' }, revision: 'r1', sizeBytes: 42 }],
  })
  bridge.activeSessionId = 'session-live'

  await bridge.handleInbound({ senderId: 'user1', text: 'hi' })

  assert.equal(calls.create.length, 0, '已持久化会话不得再走 agents.create')
  assert.equal(calls.resume.length, 1)
})

test('扁平 header 形状（更早的 DSH）同样能识别为已持久化会话', async () => {
  const presets = makePresets(['standard'], 'standard')
  const { bridge, calls } = makeBridge({
    agentPresets: presets,
    persistenceEntries: [{ id: 'session-flat', agentPreset: 'standard' }],
  })
  bridge.activeSessionId = 'session-flat'

  await bridge.handleInbound({ senderId: 'user1', text: 'hi' })

  assert.equal(calls.resume.length, 1)
  assert.equal(calls.create.length, 0)
})

test('会话不在持久化列表里时仍走 create（新建路径不变）', async () => {
  const presets = makePresets(['standard'], 'standard')
  const { bridge, calls } = makeBridge({
    agentPresets: presets,
    persistenceEntries: [{ header: { id: 'session-other' }, revision: 'r1' }],
  })
  bridge.activeSessionId = 'session-missing'

  await bridge.handleInbound({ senderId: 'user1', text: 'hi' })

  assert.equal(calls.resume.length, 0)
  assert.equal(calls.create.length, 1)
  assert.equal(calls.create[0].meta.agentPreset, 'standard')
})

test('旧会话 header 里是已失效的 preset 名时回退默认 preset，会话仍可用', async () => {
  const presets = makePresets(['standard'], 'standard')
  const { bridge, platform, calls } = makeBridge({
    agentPresets: presets,
    persistenceEntries: [{ header: { id: 'session-legacy', agentPreset: 'routing-suite' }, revision: 'r1' }],
  })
  bridge.activeSessionId = 'session-legacy'

  await bridge.handleInbound({ senderId: 'user1', text: 'hi' })

  assert.equal(calls.resume.length, 1, '不得因脏 preset 记录而放弃恢复')
  await calls.resume[0].setup({}, {})
  assert.equal(presets.mounts[0].id, 'standard')
  assert.ok(calls.warns.some((w) => w.includes('routing-suite')), '应记录脏 preset 告警')
  assert.ok(!platform.sent.some((t) => t.includes('恢复会话失败')), '不应把 not-found 错误甩给用户')
})

test('header 未记录 preset 时回退桥配置的 preset', async () => {
  const presets = makePresets(['standard', 'collab'], 'standard')
  const { bridge, calls } = makeBridge({
    agentPresets: presets,
    config: { agentPreset: 'collab' },
    persistenceEntries: [{ header: { id: 'session-old' }, revision: 'r1' }],
  })
  bridge.activeSessionId = 'session-old'

  await bridge.handleInbound({ senderId: 'user1', text: 'hi' })

  await calls.resume[0].setup({}, {})
  assert.equal(presets.mounts[0].id, 'collab')
})

test('旧版 DSH re-attach 不传 setup（rosterless 部署仍走原路径）', async () => {
  const { bridge, calls } = makeBridge({
    agentPresets: undefined,
    persistenceEntries: [{ header: { id: 'session-old' }, revision: 'r1' }],
  })
  bridge.activeSessionId = 'session-old'

  await bridge.handleInbound({ senderId: 'user1', text: 'hi' })

  assert.equal(calls.resume.length, 1)
  assert.equal(calls.resume[0].setup, undefined)
})

// ---------------------------------------------------------------------------
// 4. 设置页配置入口：会话级配置读写 + 平台 setConfig/getStatus 闭环
// ---------------------------------------------------------------------------

test('SESSION_CONFIG_FIELDS 就是设置页暴露的四个会话字段', () => {
  assert.deepEqual(SESSION_CONFIG_FIELDS, ['agentPreset', 'cwd', 'agentProvider', 'agentModel'])
})

test('applySessionConfig 只接受字符串，空格 trim，空串表示清除', () => {
  const config = { agentPreset: 'collab', cwd: '/old', agentProvider: 'p', agentModel: 'm' }
  const changed = applySessionConfig(config, {
    agentPreset: '  standard  ',
    cwd: '',                       // 清除
    agentProvider: 42,             // 非字符串 → 忽略
    agentModel: null,              // 忽略
    unknownField: 'x',             // 不在白名单 → 忽略
  })

  assert.deepEqual(changed, ['agentPreset', 'cwd'])
  assert.equal(config.agentPreset, 'standard')
  assert.equal(config.cwd, '')
  assert.equal(config.agentProvider, 'p', '非字符串不得改写')
  assert.equal(config.agentModel, 'm')
  assert.equal(config.unknownField, undefined, '未知字段不得写进配置')
})

test('readSessionConfig 未设置时统一回空串（供 UI 回显）', () => {
  assert.deepEqual(readSessionConfig({ agentPreset: 'collab', cwd: undefined }),
    { agentPreset: 'collab', cwd: '', agentProvider: '', agentModel: '' })
  assert.deepEqual(readSessionConfig(undefined),
    { agentPreset: '', cwd: '', agentProvider: '', agentModel: '' })
})

// 平台服务的最小 mock ctx（FeishuService 构造 + 启动都需要）
function makePlatformCtx(extra = {}) {
  const ctx = {
    on: () => () => {},
    effect: (fn) => fn(),
    sessions: { list: () => [], get: () => undefined },
    agents: { create: async () => ({}), get: () => undefined },
    // cordis Service 基类构造时要注册服务
    reflect: { provide: () => () => {} },
    ...extra,
  }
  return ctx
}

test('平台构造期透传会话级配置，setConfig 写入并持久化，getStatus 回显（设置页闭环）', async () => {
  const persisted = []
  const svc = new FeishuService({
    ctx: makePlatformCtx(),
    logger: { info() {}, warn() {}, error() {} },
    config: {
      appId: 'cli_x', appSecret: 'sec',
      agentPreset: 'collab', cwd: '/srv/project', agentProvider: 'deepseek', agentModel: 'deepseek-v4.1-flash',
    },
    onPersist: (patch) => { persisted.push(patch) },
  })

  // 构造期（cordis 配置）就要落到会话桥 config 上，否则等于没配
  assert.equal(svc.node.config.agentPreset, 'collab')
  assert.equal(svc.node.config.cwd, '/srv/project')

  // 设置页写入
  await svc.setConfig({ agentPreset: 'standard', cwd: '  /srv/other  ', agentProvider: 'p2', agentModel: 'm2' })

  assert.equal(svc.node.config.agentPreset, 'standard')
  assert.equal(svc.node.config.cwd, '/srv/other', '应被 trim')
  const last = persisted.at(-1)
  assert.equal(last.agentPreset, 'standard')
  assert.equal(last.cwd, '/srv/other')
  assert.equal(last.agentProvider, 'p2')
  assert.equal(last.agentModel, 'm2')

  // 前端读取（listPlatforms 走 getStatus().config）
  const status = svc.getStatus()
  assert.equal(status.config.agentPreset, 'standard')
  assert.equal(status.config.cwd, '/srv/other')
  assert.equal(status.config.agentProvider, 'p2')
  assert.equal(status.config.agentModel, 'm2')

  // 清空预设（空串）应能表达"回到 DSH 默认"
  await svc.setConfig({ agentPreset: '' })
  assert.equal(svc.node.config.agentPreset, '')
  assert.equal(persisted.at(-1).agentPreset, '')
})

test('配置为空串的 agentPreset 不会让会话创建抛错（回落 DSH 默认预设）', async () => {
  const presets = makePresets(['standard'], 'standard')
  const { bridge, calls } = makeBridge({ agentPresets: presets, config: { agentPreset: '   ' } })

  await bridge.createSession('你好')

  assert.equal(calls.create[0].meta.agentPreset, 'standard')
  await calls.create[0].setup({}, {})
  assert.equal(presets.mounts[0].id, 'standard')
})

// ---------------------------------------------------------------------------
// 5. RPC：本机可用预设列表（设置页下拉数据源）
// ---------------------------------------------------------------------------

function makeRpcHarness({ agentPresets, getThrows = false } = {}) {
  let handler
  const ctx = {
    connection: { rpc: { handle: (channel, fn) => { handler = fn; return () => {} } } },
    get: (name) => {
      if (name !== 'agentPresets') return undefined
      if (getThrows) throw new Error('service disposed')
      return agentPresets
    },
  }
  installBridgeRpc(ctx, {
    service: {},
    authManager: null,
    platformManager: null,
    logger: { info() {}, warn() {}, error() {} },
  })
  assert.equal(typeof handler, 'function', 'RPC 通道应已注册')
  return (endpoint, payload = {}) => handler(endpoint, payload)
}

test('listAgentPresets 返回本机预设与默认值，过滤坏行', async () => {
  const call = makeRpcHarness({
    agentPresets: {
      defaultId: 'standard',
      async list() {
        return [
          { id: 'standard', name: 'Standard' },
          { id: 'collab' },
          { id: 'broken-one', broken: 'composition file missing' },
        ]
      },
    },
  })

  const r = await call(BRIDGE_ENDPOINTS.listAgentPresets, {})
  assert.equal(r.ok, true)
  assert.equal(r.value.available, true)
  assert.equal(r.value.default, 'standard')
  assert.deepEqual(r.value.presets, [{ id: 'standard', name: 'Standard' }, { id: 'collab', name: 'collab' }])
})

test('listAgentPresets 在旧版 DSH / 服务异常时返回 available:false（前端退化为手填）', async () => {
  const r1 = await makeRpcHarness({ agentPresets: undefined })(BRIDGE_ENDPOINTS.listAgentPresets, {})
  assert.equal(r1.ok, true)
  assert.equal(r1.value.available, false)
  assert.deepEqual(r1.value.presets, [])

  const r2 = await makeRpcHarness({ agentPresets: {}, getThrows: true })(BRIDGE_ENDPOINTS.listAgentPresets, {})
  assert.equal(r2.ok, true)
  assert.equal(r2.value.available, false)
})

// ---------------------------------------------------------------------------
// 6. RPC：listPlatforms 缺 manager 时必须显错（Issue #55）
// 背景：此前返回 ok({})，前端把“查询失败”画成“即将支持”，桌面宿主专项排查困难。
// ---------------------------------------------------------------------------

function makePlatformsHarness(platformManager) {
  let handler
  const errors = []
  const ctx = {
    connection: { rpc: { handle: (channel, fn) => { handler = fn; return () => {} } } },
    get: () => undefined,
  }
  installBridgeRpc(ctx, {
    service: {},
    authManager: null,
    platformManager,
    logger: { info() {}, warn() {}, error: (msg) => errors.push(String(msg)) },
  })
  return { call: (endpoint, payload = {}) => handler(endpoint, payload), errors }
}

test('#55 listPlatforms 缺 platformManager 时返回 ok:false（前端显错而非“即将支持”）', async () => {
  const { call, errors } = makePlatformsHarness(null)
  const r = await call(BRIDGE_ENDPOINTS.listPlatforms, {})
  assert.equal(r.ok, false)
  assert.match(r.error.message, /PlatformManager/)
  assert.ok(errors.some((m) => m.includes('#55')), '应记 error 日志便于桌面宿主排查')
})

test('#55 listPlatforms 空表时仍 ok:true 但记 warn（与缺 manager 区分）', async () => {
  let warned = false
  let handler
  const ctx = {
    connection: { rpc: { handle: (channel, fn) => { handler = fn; return () => {} } } },
    get: () => undefined,
  }
  installBridgeRpc(ctx, {
    service: {},
    authManager: null,
    platformManager: { getStatus: () => ({}) },
    logger: { info() {}, warn: () => { warned = true }, error() {} },
  })
  const r = await handler(BRIDGE_ENDPOINTS.listPlatforms, {})
  assert.equal(r.ok, true)
  assert.deepEqual(r.value, {})
  assert.equal(warned, true)
})

test('#55 listPlatforms 正常聚合各平台状态（含 login 容错）', async () => {
  const { call } = makePlatformsHarness({
    getStatus: () => ({
      wechat: { id: 'wechat', name: '微信', status: 'connected', login: {} },
      qq: { id: 'qq', name: 'QQ', status: 'idle', login: null },
    }),
  })
  const r = await call(BRIDGE_ENDPOINTS.listPlatforms, {})
  assert.equal(r.ok, true)
  assert.equal(r.value.wechat.status, 'connected')
  assert.equal(r.value.qq.status, 'idle')
})
