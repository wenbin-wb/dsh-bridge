// dsh-bridge QqService construction smoke test
// Verifies the gateway (Service subclass) + conversation node construct and
// register 'qq' on a mock Cordis context without throwing.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { QqService } from '../lib/qq/index.js'
import { QqGateway, QQ_INTENTS } from '../lib/qq/gateway.js'
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
  // 官方 intent 位（来自 API v2 文档）
  assert.equal(QQ_INTENTS.C2C_MESSAGE_CREATE, 1 << 25)
  assert.equal(QQ_INTENTS.GROUP_AT_MESSAGE_CREATE, 1 << 30)
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
