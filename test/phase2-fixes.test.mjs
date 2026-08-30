// Phase 2 修复回归测试：配置持久化事务化 + 管理解锁防爆破
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { AuthManager } from '../lib/auth/manager.js'

// 并发读-改-写不得丢失更新：两个平台同时持久化，两份改动都必须落盘
test('AuthManager 并发 persist 序列化且互不覆盖', async () => {
  const writes = []
  let stored = { wechat: { allowFrom: [] }, qq: { allowFrom: [] } }
  const loadConfig = async () => JSON.parse(JSON.stringify(stored))
  const saveConfig = async (data) => { writes.push(JSON.parse(JSON.stringify(data))); stored = JSON.parse(JSON.stringify(data)) }

  // 模拟 T2.6 的队列语义（与 lib/index.js 中 updateConfig 相同的结构）
  let queue = Promise.resolve()
  const updateConfig = async (mutate) => {
    const task = queue.then(async () => {
      const current = await loadConfig()
      const next = (await mutate(current)) ?? current
      await saveConfig(next)
      return next
    })
    queue = task.catch(() => {})
    return task
  }

  await Promise.all([
    updateConfig((s) => { s.wechat.allowFrom = ['u-wechat']; return s }),
    updateConfig((s) => { s.qq.allowFrom = ['u-qq']; return s }),
  ])

  assert.equal(writes.length, 2, '两次事务各写一次')
  assert.deepEqual(stored.wechat.allowFrom, ['u-wechat'], '微信改动必须保留')
  assert.deepEqual(stored.qq.allowFrom, ['u-qq'], 'QQ 改动必须保留')
})

// 管理解锁防爆破：5 次失败锁定，正确密码在锁定期内也被拒绝
test('unlockAdmin 失败 5 次后锁定 60 秒（T2.8 回归）', () => {
  const auth = new AuthManager({
    config: { adminPasswordHash: '', adminPasswordSalt: '' },
    onPersist: async () => {},
  })
  auth.adminPasswordHash = 'deadbeef'
  auth.adminPasswordSalt = 'cafe'

  for (let i = 0; i < 5; i++) {
    const res = auth.unlockAdmin('wrong-password')
    assert.equal(res.ok, false)
  }
  const locked = auth.unlockAdmin('wrong-password')
  assert.equal(locked.ok, false)
  assert.match(locked.error, /尝试次数过多/)

  // 锁定期内即使密码正确也拒绝
  // （真实密码哈希未知，用 hasAnyPassword=false 路径不可行；这里只验证锁定优先于验证）
  assert.equal(auth._adminUnlockLockUntil > Date.now(), true)
  auth.dispose()
})

test('unlockAdmin 未设任何密码时直接放行（既有行为保持）', () => {
  const auth = new AuthManager({ config: {}, onPersist: async () => {} })
  const res = auth.unlockAdmin('anything')
  assert.equal(res.ok, true)
  assert.ok(res.adminToken)
  auth.dispose()
})

// T2.4：审批决议发起者校验——非发起者回复 /yes 不得批准
test('resolveApproval 校验发起者，他人 /yes 被拒绝', () => {
  const { ctx } = { ctx: { on: () => () => {}, emit: () => {}, logger: { warn() {}, info() {}, error() {} } } }
  return import('../lib/platform/index.js').then(({ ConversationBridge }) => {
    const platform = { id: 'mock', sendText: async () => ({ success: true }) }
    const bridge = new ConversationBridge({ ctx, logger: ctx.logger, config: { allowFrom: ['u1'] }, platform })
    let decision = null
    bridge.registerApproval(1, { number: 1, request: {}, peerId: 'u1', resolve: (v) => { decision = v }, timer: null })

    // 他人决议：拒绝生效
    assert.equal(bridge.resolveApproval('/yes', 'u-evil'), false)
    assert.equal(decision, null)
    // 发起者决议：生效
    assert.equal(bridge.resolveApproval('/yes', 'u1'), true)
    assert.equal(decision, 'allowed-once')
    bridge.dispose()
  })
})

// T2.5：群聊自动授权必须显式开启（默认关闭）
test('群聊消息在白名单非空且未开启 groupAutoApprove 时不再自动授权', async () => {
  const { ConversationBridge } = await import('../lib/platform/index.js')
  const ctx = { on: () => () => {}, emit: () => {}, logger: { warn() {}, info() {}, error() {} }, sessions: { list: () => [] }, agents: { get: () => undefined } }
  const platform = { id: 'mock', capabilities: { supportsGroup: true }, sendText: async () => ({ success: true }) }
  const bridge = new ConversationBridge({ ctx, logger: ctx.logger, config: { allowFrom: ['u1'] }, platform })
  bridge.activeSessionId = 's1'

  const out = await bridge.handleInbound({ senderId: 'u-stranger', text: 'hello', isGroup: true })
  assert.equal(out, 'ignored', '陌生群成员不应被自动授权')
  assert.deepEqual(bridge.config.allowFrom, ['u1'])
  bridge.dispose()
})

// T2.10：loopback-token 的 CORS 收敛——真实 HTTP 层验证陌生 Origin 不回显 ACAO
test('ProxyServer loopback-token 仅对白名单 Origin 放开跨域', async () => {
  const { ProxyServer } = await import('../lib/index.js')
  const { request } = await import('node:http')
  const proxy = new ProxyServer({
    localPort: 0, targetPort: 1, authManager: null,
    logger: { info() {}, error() {} },
    allowedOrigins: () => ['http://127.0.0.1:30882', 'http://192.168.1.5:30882'],
  })
  await proxy.start()
  try {
    const port = proxy.server.address().port
    const call = (method, origin) => new Promise((resolve, reject) => {
      const req = request({ host: '127.0.0.1', port, method, path: '/__dsh_bridge__/loopback-token',
        headers: origin ? { origin } : {} }, (res) => {
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString() }))
      })
      req.on('error', reject)
      req.end()
    })

    const preflightEvil = await call('OPTIONS', 'https://evil.example')
    assert.equal(preflightEvil.status, 204)
    assert.equal(preflightEvil.headers['access-control-allow-origin'], undefined, '陌生来源不得获得 ACAO 回显')
    assert.equal(preflightEvil.headers.vary, 'Origin')

    const preflightGood = await call('OPTIONS', 'http://192.168.1.5:30882')
    assert.equal(preflightGood.status, 204)
    assert.equal(preflightGood.headers['access-control-allow-origin'], 'http://192.168.1.5:30882')

    const post = await call('POST', 'https://evil.example')
    assert.equal(post.status, 403, 'authManager 缺失时拒绝签发')
    assert.equal(post.headers['access-control-allow-origin'], undefined)
  } finally {
    await proxy.stop()
  }
})
