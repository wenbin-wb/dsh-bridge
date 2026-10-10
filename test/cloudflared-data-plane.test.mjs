// test/cloudflared-data-plane.test.mjs
// issue #71 P1-A（端到端数据面探针）+ P2-B（实际二进制画像）。
// 全部基于本地 HTTP 原点，无外网依赖（CI ubuntu/windows 均可跑）。
import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { judgeDataPlaneStatus, normalizePublicUrl, classifyDataPlaneFailure, CloudflaredManager } from '../lib/cloudflared-manager.mjs'
import { BridgeService } from '../lib/index.js'

const silent = { info() {}, warn() {}, error() {}, debug() {} }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function waitFor(cond, timeoutMs, stepMs = 15) {
  const t0 = Date.now()
  for (;;) {
    if (await cond()) return true
    if (Date.now() - t0 > timeoutMs) throw new Error('waitFor 超时 ' + timeoutMs + 'ms')
    await sleep(stepMs)
  }
}
const makeManager = (opts = {}) => new CloudflaredManager({
  port: 0,
  home: 'unused-test-home',
  token: null,
  hostname: null,
  logger: silent,
  ...opts,
})

// 起一个状态可控的本地 HTTP 原点；status 也可传函数动态切换
function startOrigin(status = 401) {
  return new Promise((resolve) => {
    const srv = createServer((req, res) => {
      const code = typeof status === 'function' ? status() : status
      res.writeHead(code, { 'content-type': 'text/plain' })
      res.end('x')
    })
    srv.listen(0, '127.0.0.1', () => resolve(srv))
  })
}
function startDeadOrigin() {
  // 永不响应的原点：用于超时与防重叠
  return new Promise((resolve) => {
    const srv = createServer(() => { /* 故意不回应 */ })
    srv.listen(0, '127.0.0.1', () => resolve(srv))
  })
}

// ── 纯函数 ────────────────────────────────────────────────────────────────
test('judgeDataPlaneStatus：<500 视为链路可达（鉴权门禁也算通），>=500 视为回源失败', () => {
  for (const s of [200, 204, 301, 302, 401, 403, 404]) {
    assert.equal(judgeDataPlaneStatus(s).ok, true, 'HTTP ' + s + ' 应判为可达')
  }
  for (const s of [500, 502, 521, 530]) {
    const v = judgeDataPlaneStatus(s)
    assert.equal(v.ok, false, 'HTTP ' + s + ' 应判为不可用')
    assert.ok(v.reason.includes('HTTP ' + s), 'reason 需携带状态码')
  }
})

test('normalizePublicUrl：补协议、去空白、空值返回 null，与固定隧道就绪逻辑同源', () => {
  assert.equal(normalizePublicUrl('dsh.example.com'), 'https://dsh.example.com')
  assert.equal(normalizePublicUrl('http://127.0.0.1:3082'), 'http://127.0.0.1:3082')
  assert.equal(normalizePublicUrl('  dsh.example.com  '), 'https://dsh.example.com')
  assert.equal(normalizePublicUrl(''), null)
  assert.equal(normalizePublicUrl(null), null)
  assert.equal(normalizePublicUrl(undefined), null)
})

// ── 探针状态机（本地原点驱动）─────────────────────────────────────────────
test('数据面探测：可达 → ok 并记录来源 IP', async () => {
  const srv = await startOrigin(401)
  const mgr = makeManager({ hostname: 'http://127.0.0.1:' + srv.address().port })
  try {
    const snap = await mgr.probeDataPlaneOnce()
    assert.equal(snap.state, 'ok')
    assert.equal(snap.consecutiveFailures, 0)
    assert.equal(snap.lastError, null)
    assert.ok(snap.resolvedIp, '应记录对端 IP')
    assert.ok(snap.url.endsWith('/'), '只探测 origin 根路径')
    assert.ok(snap.checkedAt > 0)
  } finally {
    srv.closeAllConnections?.()
    await new Promise((r) => srv.close(r))
  }
})

test('数据面探测：连续失败按阈值进级 unstable → degraded，恢复即回 ok', async () => {
  let code = 401
  const srv = await startOrigin(() => code)
  const mgr = makeManager({ hostname: 'http://127.0.0.1:' + srv.address().port, dataPlaneDegradedAfter: 3 })
  try {
    assert.equal((await mgr.probeDataPlaneOnce()).state, 'ok')

    code = 502
    const s1 = await mgr.probeDataPlaneOnce()
    assert.equal(s1.state, 'unstable', '第 1 次失败先进 unstable')
    assert.equal(s1.consecutiveFailures, 1)
    assert.ok(s1.lastError.includes('HTTP 502'))

    const s2 = await mgr.probeDataPlaneOnce()
    assert.equal(s2.state, 'unstable', '第 2 次仍是 unstable')
    const s3 = await mgr.probeDataPlaneOnce()
    assert.equal(s3.state, 'degraded', '第 3 次（阈值）进 degraded')
    assert.equal(s3.consecutiveFailures, 3)

    code = 401
    const ok = await mgr.probeDataPlaneOnce()
    assert.equal(ok.state, 'ok', '恢复后回 ok')
    assert.equal(ok.consecutiveFailures, 0, '恢复后清零')
    assert.equal(ok.lastError, null)
  } finally {
    srv.closeAllConnections?.()
    await new Promise((r) => srv.close(r))
  }
})

test('数据面探测：连接被拒与超时都如实进入失败态（reason 可读）', async () => {
  // 连接被拒：直连必然关闭的 1 号端口
  const refused = makeManager({ hostname: 'http://127.0.0.1:1', dataPlaneDegradedAfter: 2 })
  const r1 = await refused.probeDataPlaneOnce()
  assert.equal(r1.state, 'unstable')
  assert.ok(r1.lastError, '必须有失败原因')
  const r2 = await refused.probeDataPlaneOnce()
  assert.equal(r2.state, 'degraded')

  // 超时：原点永不响应
  const dead = await startDeadOrigin()
  const slow = makeManager({
    hostname: 'http://127.0.0.1:' + dead.address().port,
    dataPlaneProbeTimeoutMs: 300,
  })
  try {
    const t = await slow.probeDataPlaneOnce()
    assert.equal(t.state, 'unstable')
    assert.ok(t.lastError.includes('超时'), '超时原因应可读，实际: ' + t.lastError)
    assert.ok(t.lastError.includes('解析到 127.0.0.1'), '失败时应补查并标注解析 IP，实际: ' + t.lastError)
  } finally {
    dead.closeAllConnections?.()
    await new Promise((r) => dead.close(r))
  }
})

test('数据面探测：未配置入口 → idle；防重叠：飞行中重复调用返回 null', async () => {
  const idleMgr = makeManager()
  const snap = await idleMgr.probeDataPlaneOnce()
  assert.equal(snap.state, 'idle')
  assert.ok(snap.lastError, 'idle 需给出原因')

  const dead = await startDeadOrigin()
  const mgr = makeManager({
    hostname: 'http://127.0.0.1:' + dead.address().port,
    dataPlaneProbeTimeoutMs: 800,
  })
  try {
    const p1 = mgr.probeDataPlaneOnce()
    const p2 = mgr.probeDataPlaneOnce()
    assert.equal(await p2, null, '飞行中重复调用应被拒绝')
    const first = await p1
    assert.ok(first && first.state, '首轮照常完成')
  } finally {
    dead.closeAllConnections?.()
    await new Promise((r) => dead.close(r))
  }
})

test('数据面探测：setHostname 切换入口后按新目标探测', async () => {
  const okSrv = await startOrigin(200)
  const badSrv = await startOrigin(502)
  const mgr = makeManager({ hostname: 'http://127.0.0.1:' + okSrv.address().port })
  try {
    assert.equal((await mgr.probeDataPlaneOnce()).state, 'ok')
    mgr.setHostname('http://127.0.0.1:' + badSrv.address().port)
    const after = await mgr.probeDataPlaneOnce()
    assert.equal(after.state, 'unstable', '切换到 502 入口后应失败')
    assert.ok(after.url.startsWith('http://127.0.0.1:' + badSrv.address().port))
  } finally {
    for (const s of [okSrv, badSrv]) { s.closeAllConnections?.(); await new Promise((r) => s.close(r)) }
  }
})

test('探针循环：周期执行、start 幂等不叠表、stop 后不再写状态', async () => {
  const srv = await startOrigin(200)
  const mgr = makeManager({
    hostname: 'http://127.0.0.1:' + srv.address().port,
    dataPlaneProbeIntervalMs: 50,
  })
  try {
    mgr._startDataPlaneProbe()
    mgr._startDataPlaneProbe() // 幂等
    await waitFor(async () => {
      const a = mgr.dataPlaneState().checkedAt
      await sleep(70)
      return mgr.dataPlaneState().checkedAt !== a
    }, 3000, 20)
    mgr._stopDataPlaneProbe()
    const frozen = mgr.dataPlaneState().checkedAt
    await sleep(160)
    assert.equal(mgr.dataPlaneState().checkedAt, frozen, 'stop 后不得再写状态')
  } finally {
    mgr._stopDataPlaneProbe()
    srv.closeAllConnections?.()
    await new Promise((r) => srv.close(r))
  }
})

// ── 失败标注（#6 DNS 污染可观测性）───────────────────────────────────────
test('classifyDataPlaneFailure：证书/握手类错误标注疑似污染并附解析 IP', () => {
  const tagged = classifyDataPlaneFailure('self signed certificate', '103.73.220.188')
  assert.ok(tagged.startsWith('疑似 DNS 污染或伪造证书：'), '证书类错误必须显式分类')
  assert.ok(tagged.includes('103.73.220.188'), '必须带上解析 IP')

  const alt = classifyDataPlaneFailure('Hostname/IP does not match certificate\'s altnames', '104.21.83.67')
  assert.ok(alt.startsWith('疑似 DNS 污染或伪造证书：'))

  const plain = classifyDataPlaneFailure('connect ECONNREFUSED 127.0.0.1:1', '127.0.0.1')
  assert.equal(plain.startsWith('疑似'), false, '连接类错误不应误标为污染')
  assert.equal(plain, 'connect ECONNREFUSED 127.0.0.1:1', '原因里已有 IP 时不重复拼接')

  const appended = classifyDataPlaneFailure('connect ETIMEDOUT', '203.0.113.5')
  assert.ok(appended.includes('（解析到 203.0.113.5）'), '原因里没有 IP 时补上')

  assert.equal(classifyDataPlaneFailure('timeout'), 'timeout', '无 IP 时原样返回')
})

// ── 二进制画像（P2-B）─────────────────────────────────────────────────────
test('getBinaryInfo：未启动前为 null 值；注入二进制如实标注 injected 且不执行 --version', async () => {
  const mgr = makeManager({ binaryPath: '/fake/cloudflared' })
  assert.deepEqual(mgr.getBinaryInfo(), { path: null, version: null, source: null })
  await mgr._ensureBinary()
  assert.deepEqual(mgr.getBinaryInfo(), { path: '/fake/cloudflared', version: null, source: 'injected' })
})

// ── 状态出口（getStatus）─────────────────────────────────────────────────
test('getStatus：cloudflared 段暴露 dataPlane 与 binary 的兜底值', async () => {
  const svc = new BridgeService({ dshPort: 1, proxyPort: 2, onPersist: async () => {} })
  const status = await svc.getStatus({ adminAuthValid: false })
  assert.equal(status.cloudflared.dataPlane.state, 'idle')
  assert.equal(status.cloudflared.dataPlane.lastError, '隧道未运行')
  assert.equal(status.cloudflared.binary, null, '从未启动过时 binary 为 null')
})
