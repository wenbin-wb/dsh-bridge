// test/sse-keepalive.test.mjs
// issue #71：代理层 SSE 空闲保活（': keepalive' 注释帧）。
// 三层验证：护栏判定（纯函数）→ 计时语义（注入假定时器）→ 真实 ProxyServer 集成。
import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer, request as httpRequest } from 'node:http'
import { gzipSync, gunzipSync } from 'node:zlib'
import {
  isSseKeepaliveCandidate,
  createSseKeepalive,
  SSE_KEEPALIVE_FRAME,
  SSE_KEEPALIVE_INTERVAL_MS,
} from '../lib/sse-keepalive.js'
import { ProxyServer } from '../lib/index.js'

const silentLogger = { info() {}, warn() {}, error() {}, debug() {} }

// ── 1. 护栏判定 ─────────────────────────────────────────────────────────────
test('isSseKeepaliveCandidate：只有未压缩且无 content-length 的事件流可注入', () => {
  assert.equal(isSseKeepaliveCandidate({ 'content-type': 'text/event-stream' }), true)
  assert.equal(isSseKeepaliveCandidate({ 'content-type': 'text/event-stream; charset=utf-8' }), true)
  assert.equal(isSseKeepaliveCandidate({ 'content-type': 'Text/Event-Stream' }), true)
  assert.equal(isSseKeepaliveCandidate({ 'content-type': 'application/json' }), false)
  assert.equal(isSseKeepaliveCandidate({}), false)
  // 护栏2：压缩流插明文会损坏字节流
  assert.equal(isSseKeepaliveCandidate({ 'content-type': 'text/event-stream', 'content-encoding': 'gzip' }), false)
  assert.equal(isSseKeepaliveCandidate({ 'content-type': 'text/event-stream', 'content-encoding': 'br' }), false)
  assert.equal(isSseKeepaliveCandidate({ 'content-type': 'text/event-stream', 'content-encoding': 'deflate' }), false)
  assert.equal(isSseKeepaliveCandidate({ 'content-type': 'text/event-stream', 'content-encoding': 'gzip, br' }), false)
  assert.equal(isSseKeepaliveCandidate({ 'content-type': 'text/event-stream', 'content-encoding': 'identity' }), true)
  // 护栏3：定长响应插字节会破坏消息帧界
  assert.equal(isSseKeepaliveCandidate({ 'content-type': 'text/event-stream', 'content-length': '42' }), false)
})

test('保活帧是规范注释行；默认间隔 25s 且远小于实测 ~126s 空闲回收窗口', () => {
  assert.equal(SSE_KEEPALIVE_FRAME, ': keepalive\n\n')
  // 纯 ASCII 可打印字符 + 换行（SSE 注释行，客户端必须忽略）
  assert.match(SSE_KEEPALIVE_FRAME, /^[\x20-\x7e\n]+$/)
  assert.ok(SSE_KEEPALIVE_FRAME.startsWith(': '))
  assert.equal(SSE_KEEPALIVE_INTERVAL_MS, 25_000)
  assert.ok(SSE_KEEPALIVE_INTERVAL_MS < 126_000 / 4, '至少要留 4 倍安全余量')
})

// ── 2. 计时语义（假定时器，零真实等待）──────────────────────────────────────
function makeTimers() {
  let seq = 0
  const pending = new Map()
  return {
    setTimeout: (fn, ms) => { const id = ++seq; pending.set(id, { fn, ms }); return id },
    clearTimeout: (id) => { pending.delete(id) },
    fireAll() { const items = [...pending.values()]; pending.clear(); for (const it of items) it.fn(); return items.length },
    peek() { return [...pending.values()].map((v) => v.fn) },
    get count() { return pending.size },
    get lastMs() { return [...pending.values()].at(-1)?.ms },
  }
}

test('createSseKeepalive：创建即排第一段静默倒计时，到期写帧并自动续排', () => {
  const timers = makeTimers()
  const writes = []
  const ka = createSseKeepalive({ write: (f) => writes.push(f), intervalMs: 1000, timers })
  assert.equal(timers.count, 1)
  assert.equal(timers.lastMs, 1000)
  assert.equal(writes.length, 0, '未到期不得写')
  timers.fireAll()
  assert.deepEqual(writes, [': keepalive\n\n'])
  assert.equal(timers.count, 1, '写完自动续排，静默期间持续保活')
  timers.fireAll()
  assert.equal(writes.length, 2)
  ka.stop()
  assert.equal(timers.count, 0)
})

test('createSseKeepalive：poke 表示"刚见到上游数据"，清旧排新不叠加定时器', () => {
  const timers = makeTimers()
  const writes = []
  const ka = createSseKeepalive({ write: (f) => writes.push(f), intervalMs: 1000, timers })
  ka.poke()
  ka.poke()
  ka.poke()
  assert.equal(timers.count, 1, '多次 poke 只保留一个倒计时')
  timers.fireAll()
  assert.equal(writes.length, 1, '重置后的窗口到期仍要写')
  ka.stop()
})

test('createSseKeepalive：stop 幂等；stop 后迟到触发与 poke 均不再写入', () => {
  const timers = makeTimers()
  const writes = []
  const ka = createSseKeepalive({ write: (f) => writes.push(f), intervalMs: 5, timers })
  const lateFn = timers.peek()[0]
  ka.stop()
  ka.stop() // 幂等
  assert.equal(ka.stopped, true)
  lateFn() // 模拟定时器回调与 stop 竞态迟到
  assert.equal(writes.length, 0, 'stop 后迟到触发不得写入')
  ka.poke()
  assert.equal(timers.count, 0, 'stop 后 poke 不得再排表')
})

test('createSseKeepalive：write 抛错时停表并经 onWriteError 上报，不向事件循环抛异常', () => {
  const timers = makeTimers()
  const errors = []
  const ka = createSseKeepalive({
    write: () => { throw new Error('EPIPE') },
    intervalMs: 5,
    timers,
    onWriteError: (e) => errors.push(e.message),
  })
  timers.fireAll() // 写失败：不得导致测试进程崩溃，也不得续排
  assert.equal(ka.stopped, true)
  assert.equal(timers.count, 0, '写失败后停止保活')
  assert.deepEqual(errors, ['EPIPE'])
  timers.fireAll()
  assert.equal(errors.length, 1, '停表后不会再触发')
})

test('createSseKeepalive：参数校验', () => {
  assert.throws(() => createSseKeepalive({}), TypeError)
  assert.throws(() => createSseKeepalive({ write() {}, intervalMs: 0 }), RangeError)
  assert.throws(() => createSseKeepalive({ write() {}, intervalMs: -5 }), RangeError)
  assert.throws(() => createSseKeepalive({ write() {}, intervalMs: Number.NaN }), RangeError)
})

// ── 3. 真实 ProxyServer 集成 ───────────────────────────────────────────────
function waitFor(cond, timeoutMs, stepMs = 20) {
  return new Promise((resolve, reject) => {
    const t0 = Date.now()
    const tick = () => {
      let v
      try { v = cond() } catch (e) { reject(e); return }
      if (v) { resolve(v); return }
      if (Date.now() - t0 > timeoutMs) { reject(new Error('waitFor 超时: ' + timeoutMs + 'ms')); return }
      setTimeout(tick, stepMs)
    }
    tick()
  })
}

function openStream(port, path) {
  return new Promise((resolve, reject) => {
    const req = httpRequest({ host: '127.0.0.1', port, path, method: 'GET', headers: { Accept: 'text/event-stream' } }, (res) => {
      const chunks = []
      const events = []
      res.on('data', (c) => { chunks.push(c); events.push({ at: Date.now(), text: c.toString('utf8') }) })
      resolve({
        res,
        events,
        raw: () => Buffer.concat(chunks),
        text: () => Buffer.concat(chunks).toString('utf8'),
        keepaliveCount: () => (Buffer.concat(chunks).toString('utf8').match(/: keepalive/g) || []).length,
        ended: new Promise((r) => res.once('end', () => r(true))),
      })
    })
    req.on('error', reject)
    req.end()
  })
}

async function setup({ proxyOptions = {} } = {}) {
  const held = {}
  const backend = createServer((req, res) => {
    const p = (req.url || '/').split('?')[0]
    if (p === '/events') {
      res.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache' })
      res.write('data: hello\n\n')
      held.plain = res
      return
    }
    if (p === '/events-gzip') {
      res.writeHead(200, { 'content-type': 'text/event-stream', 'content-encoding': 'gzip' })
      res.write(gzipSync(Buffer.from('data: hello\n\n')))
      held.gzip = res
      return
    }
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end('{"ok":true}')
  })
  await new Promise((r) => backend.listen(0, '127.0.0.1', r))
  const proxy = new ProxyServer({
    localPort: 0,
    targetPort: backend.address().port,
    authManager: null,
    logger: silentLogger,
    sseKeepaliveIntervalMs: 60, // 测试用短间隔（生产 25s），验证语义而非墙钟
    ...proxyOptions,
  })
  await proxy.start()
  return {
    held,
    proxyPort: proxy.server.address().port,
    close: async () => {
      for (const res of Object.values(held)) { try { res.destroy() } catch {} }
      await proxy.stop()
      backend.closeAllConnections?.()
      await new Promise((r) => backend.close(r))
    },
  }
}

test('集成：静默 SSE 经代理周期收到 : keepalive，上游数据重置窗口，流结束即停', async () => {
  const env = await setup()
  let stream
  try {
    stream = await openStream(env.proxyPort, '/events')
    await waitFor(() => stream.keepaliveCount() >= 2, 4000)
    assert.ok(stream.text().includes('data: hello'), '上游首帧必须原样透传')
    const firstData = stream.events[0]
    const firstKa = stream.events.find((e) => e.text.includes(': keepalive'))
    assert.ok(firstKa && firstData, '应能定位首帧与首帧保活')
    assert.ok(firstKa.at - firstData.at >= 25, '保活不得早于静默窗口（实测 ' + (firstKa.at - firstData.at) + 'ms）')

    // 上游恢复出数据（poke 生效的外部表现是流不被干扰），随后正常结束
    env.held.plain.write('data: again\n\n')
    await waitFor(() => stream.text().includes('data: again'), 2000)
    env.held.plain.end('event: bye\ndata: 1\n\n')
    await stream.ended
    const atEnd = stream.keepaliveCount()
    await new Promise((r) => setTimeout(r, 250)) // 约 4 个测试间隔
    assert.equal(stream.keepaliveCount(), atEnd, '流结束后不得再注入保活帧')
    assert.ok(stream.text().includes('event: bye'), '收尾帧必须完整送达')
  } finally {
    await env.close()
  }
})

test('集成：压缩 SSE 不注入保活，gzip 字节流保持完整可解', async () => {
  const env = await setup()
  let stream
  try {
    stream = await openStream(env.proxyPort, '/events-gzip')
    await new Promise((r) => setTimeout(r, 320)) // >5 个测试间隔，给足注入机会
    assert.equal(
      stream.raw().includes(Buffer.from(': keepalive')),
      false,
      '压缩流中出现明文保活帧 = 字节流已被破坏',
    )
    env.held.gzip.end()
    await stream.ended
    const body = gunzipSync(stream.raw()).toString('utf8')
    assert.ok(body.includes('data: hello'), 'gunzip 必须成功且内容完整')
  } finally {
    await env.close()
  }
})

test('集成：sseKeepalive:false 时不注入任何保活帧', async () => {
  const env = await setup({ proxyOptions: { sseKeepalive: false } })
  let stream
  try {
    stream = await openStream(env.proxyPort, '/events')
    await new Promise((r) => setTimeout(r, 320))
    assert.equal(stream.keepaliveCount(), 0, '开关关闭时不得注入')
    assert.ok(stream.text().includes('data: hello'), '数据面不受影响')
    env.held.plain.end()
  } finally {
    await env.close()
  }
})

test('集成：普通 JSON 响应原样透传，无任何注入', async () => {
  const env = await setup()
  let stream
  try {
    stream = await openStream(env.proxyPort, '/api/ping')
    await stream.ended
    assert.equal(stream.text(), '{"ok":true}')
    assert.equal(stream.keepaliveCount(), 0)
  } finally {
    await env.close()
  }
})
