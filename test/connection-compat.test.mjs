// DSH ≥ 0.1.5-alpha.1 connection RPC 注册回归的兼容测试
// （cannot get property "webServer" without inject → `dsh web` 启动即崩，见 issue #38）
//
// 用最小但忠实的假 ctx 复刻 cordis 4 的真实链路：
//   - 服务读取走 `internal/get` 瀑布，最内层是"默认解析"，它抛出的 error 对象
//     与交给各 listener 的 error 是同一个（lib/connection-compat.js 依赖这一点
//     区分"默认解析失败"与"真实故障"）；
//   - cordis 里所有子 ctx 共享同一个 EventsService，所以本插件注册的 listener
//     能对 connection 插件自身 ctx 的查找生效；
//   - 0.1.5-alpha.1 起的宿主里，connection 插件自己的 ctx 解析不到 webServer。
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  registerRpcChannel,
  installWebServerResolutionFallback,
  isMissingWebServerInjectError,
} from '../lib/connection-compat.js'

/**
 * 造一个最小 cordis 风格 ctx（含共享事件表）。
 * @param {object} opts
 * @param {unknown} opts.webServer 本插件 inject 到的 webServer（可为 undefined）
 * @param {(prop: string) => unknown} [opts.hostResolves] 复刻宿主默认解析；
 *        返回 undefined 视为解析不到 → 抛守卫错误
 * @param {Array} [opts.sharedHooks] 共享的 listener 表（模拟 EventsService 单例）
 */
function makeCtx({ webServer, hostResolves, sharedHooks } = {}) {
  const hooks = sharedHooks ?? []
  const ctx = {
    webServer,
    hooks,
    on(name, callback, options) {
      assert.equal(name, 'internal/get')
      const hook = { callback, options }
      hooks.push(hook)
      return () => {
        const i = hooks.indexOf(hook)
        if (i >= 0) hooks.splice(i, 1)
      }
    },
    listenerCount: () => hooks.length,
    /**
     * 复刻 cordis 的 ctx.<service> 读取：构造 error → waterfall → 默认解析。
     * 默认解析抛出的正是同一个 error 对象。
     */
    readService(prop) {
      const error = new Error(`cannot get property "${prop}" without inject`)
      const inner = () => {
        const value = hostResolves?.(prop)
        if (value !== undefined) return value
        throw error
      }
      const cbs = hooks.map((h) => h.callback)
      const next = () => (cbs.shift() ?? inner)(ctx, prop, error, next)
      return next()
    },
  }
  return ctx
}

/**
 * 造 connection 服务替身：rpc.handle 内部对"connection 自身 ctx"读 webServer
 * （即上游 register() 第 618 行的行为）。
 * @param {object} opts
 * @param {object} opts.selfCtx connection 插件自己的 ctx
 * @param {boolean} opts.buggy true = 模拟 0.1.5-alpha.1 起（自身 ctx 解析不到 webServer）
 * @param {object} opts.hostWebServer 非回归情形下 connection 自己能拿到的 webServer
 */
function makeConnectionService({ selfCtx, buggy, hostWebServer }) {
  const registeredRoutes = []
  return {
    registeredRoutes,
    connection: {
      rpc: {
        handle(channel, handler) {
          // owner.effect(() => owner.webServer.register(route), label)
          const webServer = buggy ? selfCtx.readService('webServer') : hostWebServer
          const route = { path: channel, handler }
          registeredRoutes.push(route)
          webServer.register(route)
          return () => {}
        },
      },
    },
  }
}

test('错误识别：只认 webServer 的 without inject 守卫错误', () => {
  assert.equal(isMissingWebServerInjectError(new Error('cannot get property "webServer" without inject')), true)
  assert.equal(isMissingWebServerInjectError(new Error('cannot get property "sessions" without inject')), false)
  assert.equal(isMissingWebServerInjectError(new Error('boom')), false)
  assert.equal(isMissingWebServerInjectError('not an error'), false)
  assert.equal(isMissingWebServerInjectError(undefined), false)
})

test('健康宿主（未命中回归）：直接注册，不安装任何兜底监听器', () => {
  const calls = []
  const ctx = {
    webServer: { register: () => () => {} },
    connection: {
      rpc: {
        handle(channel, handler, options) {
          calls.push([channel, handler, options])
          return () => {}
        },
      },
    },
    on() {
      throw new Error('健康宿主不应注册 internal/get 监听器')
    },
  }
  const handler = () => {}
  const dispose = registerRpcChannel(ctx, '/dsh-bridge', handler, { authority: 'loopback' }, { warn: () => {} })

  assert.equal(typeof dispose, 'function')
  assert.equal(calls.length, 1)
  assert.equal(calls[0][0], '/dsh-bridge')
  assert.equal(calls[0][1], handler)
  // 关键：DSH 0.1.0/0.1.1 的 authority 选项（仅回环可达）不得被吞掉
  assert.deepEqual(calls[0][2], { authority: 'loopback' })
})

test('命中回归时也必须原样透传 authority 选项（不得退回非回环可达）', () => {
  const bridgeWebServer = { register: (r) => { bridgeWebServer.lastRoute = r; return () => {} } }
  const sharedHooks = []
  const selfCtx = makeCtx({ sharedHooks })
  const seenOptions = []
  const { connection } = makeConnectionService({ selfCtx, buggy: true })

  const originalHandle = connection.rpc.handle
  connection.rpc.handle = (channel, handler, options) => {
    seenOptions.push(options)
    return originalHandle(channel, handler)
  }

  const ctx = makeCtx({ webServer: bridgeWebServer, sharedHooks })
  ctx.connection = connection

  registerRpcChannel(ctx, '/dsh-bridge', () => {}, { authority: 'loopback' }, { warn: () => {} })

  assert.equal(seenOptions.length, 2, '应调用两次（一次失败一次成功）')
  for (const options of seenOptions) {
    assert.deepEqual(options, { authority: 'loopback' }, '两次调用都必须带上 authority 选项')
  }
})

test('旧宿主（≤ 0.1.3-alpha.2）：一次调用直接成功，不触发兜底', () => {
  const hostWebServer = { register: (r) => { hostWebServer.lastRoute = r; return () => {} } }
  const { connection, registeredRoutes } = makeConnectionService({ buggy: false, hostWebServer })
  const ctx = {
    webServer: hostWebServer,
    connection,
    on() { throw new Error('旧宿主不应触发兜底路径') },
  }

  const dispose = registerRpcChannel(ctx, '/dsh-bridge', () => {}, { warn: () => {} })
  assert.equal(typeof dispose, 'function')
  assert.equal(registeredRoutes.length, 1)
  assert.equal(hostWebServer.lastRoute.path, '/dsh-bridge')
})

test('命中回归：兜底补解析后注册成功、记录告警，且监听器已摘除', () => {
  const warnings = []
  const bridgeWebServer = { register: (r) => { bridgeWebServer.lastRoute = r; return () => {} } }
  const sharedHooks = []                     // 共享 EventsService
  const selfCtx = makeCtx({ sharedHooks })   // connection 自身 ctx：解析不到 webServer
  const { connection, registeredRoutes } = makeConnectionService({ selfCtx, buggy: true })

  // 本插件 ctx：注入过 webServer，且与 selfCtx 共享事件表
  const ctx = makeCtx({ webServer: bridgeWebServer, sharedHooks })
  ctx.connection = connection

  const dispose = registerRpcChannel(ctx, '/dsh-bridge', () => {}, { authority: 'loopback' }, { warn: (m) => warnings.push(m) })

  assert.equal(typeof dispose, 'function')
  assert.equal(registeredRoutes.length, 1, '重试后应注册成功')
  assert.equal(bridgeWebServer.lastRoute.path, '/dsh-bridge')
  assert.equal(warnings.length, 1)
  assert.match(warnings[0], /webServer/)
  assert.equal(ctx.listenerCount(), 0, '兜底监听器必须在注册结束后摘除')
})

test('命中回归但重试仍失败：异常照常上抛', () => {
  const boom = new Error('cannot get property "webServer" without inject')
  const ctx = {
    webServer: { register: () => () => {} },
    connection: { rpc: { handle() { throw boom } } },
    on() { return () => {} },
  }

  assert.throws(() => registerRpcChannel(ctx, '/dsh-bridge', () => {}, { warn: () => {} }), (err) => err === boom)
})

test('命中回归时重试失败：兜底监听器仍被摘除（无残留）', () => {
  const boom = new Error('cannot get property "webServer" without inject')
  const hooks = []
  const ctx = makeCtx({ webServer: { register: () => () => {} }, sharedHooks: hooks })
  ctx.connection = { rpc: { handle() { throw boom } } }

  assert.throws(() => registerRpcChannel(ctx, '/dsh-bridge', () => {}, { warn: () => {} }))
  assert.equal(hooks.length, 0, '失败路径也必须摘除监听器')
})

test('非本回归的错误：不吞、不重试，原样抛出', () => {
  const other = new Error('connection: invalid shared RPC channel')
  let attempts = 0
  const ctx = {
    webServer: { register: () => () => {} },
    connection: { rpc: { handle() { attempts += 1; throw other } } },
    on() { return () => {} },
  }

  assert.throws(() => registerRpcChannel(ctx, '/dsh-bridge', () => {}), (err) => err === other)
  assert.equal(attempts, 1)
})

test('兜底监听器：默认解析成功时零干预（返回宿主原值）', () => {
  const hostWebServer = { name: 'host-webServer' }
  const ctx = makeCtx({
    webServer: { name: 'bridge-webServer' },
    hostResolves: (prop) => (prop === 'webServer' ? hostWebServer : undefined),
  })
  const off = installWebServerResolutionFallback(ctx)

  assert.equal(ctx.readService('webServer'), hostWebServer, '默认解析成功时必须原样返回宿主的值')

  off()
  assert.equal(ctx.listenerCount(), 0)
})

test('兜底监听器：其它属性一律透传给默认解析', () => {
  const sessions = { name: 'sessions' }
  const ctx = makeCtx({
    webServer: { name: 'bridge-webServer' },
    hostResolves: (prop) => (prop === 'sessions' ? sessions : undefined),
  })
  const off = installWebServerResolutionFallback(ctx)

  assert.equal(ctx.readService('sessions'), sessions)

  off()
})

test('兜底监听器：真实故障（默认解析抛的不是本次守卫错误）不被掩盖', () => {
  const realFailure = new Error('database is down')
  const ctx = makeCtx({ webServer: { name: 'bridge-webServer' } })
  const off = installWebServerResolutionFallback(ctx)

  // 复刻"默认解析抛真实故障"：抛出的对象与传入 listener 的 error 不同 → 必须原样上抛
  const breakCtx = {
    ...ctx,
    readService(prop) {
      const error = new Error(`cannot get property "${prop}" without inject`)
      const cbs = ctx.hooks.map((h) => h.callback)
      const inner = () => { throw realFailure }
      const next = () => (cbs.shift() ?? inner)(breakCtx, prop, error, next)
      return next()
    },
  }

  assert.throws(() => breakCtx.readService('webServer'), (err) => err === realFailure)

  off()
})

test('本插件没有 webServer 引用时不安装兜底（无可补的值）', () => {
  const ctx = makeCtx({ webServer: undefined })
  const off = installWebServerResolutionFallback(ctx)
  assert.equal(ctx.listenerCount(), 0)
  assert.equal(typeof off, 'function')
})
