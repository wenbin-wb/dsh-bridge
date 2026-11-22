// 安全回归：issue #115 —— request-target 携带 fragment 导致的未认证鉴权绕过
//
// 攻击形态：`POST /api/session/list#/dsh-bridge/authAdminUnlock`
//   - 旧实现只按 `?` 切分路径，fragment 留在 pathname 里，endsWith 命中管理解锁豁免 →
//     跳过访问认证；
//   - 转发时用原始 req.url，下游按 URL 语义把 `#...` 当 fragment 丢弃，请求实际落到
//     `/api/session/list`，于是未认证读到了会话数据。
//
// 本文件同时锁住三件事：
//   ① 含 fragment 的请求一律 400（HTTP 与 WebSocket 两个入口口径一致）；
//   ② 管理解锁豁免只认**精确路径**；
//   ③ 正常请求（无 fragment）行为不变——不能把修复做成"全部拒绝"。
import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer, request as httpRequest } from 'node:http'
import net from 'node:net'
import { ProxyServer } from '../lib/index.js'
import { AuthManager } from '../lib/auth/manager.js'
import { makeSessionsFile } from './helpers.mjs'

const NOOP = () => {}

function doRequest(options) {
  return new Promise((resolve, reject) => {
    const req = httpRequest(options, (res) => {
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => resolve({
        statusCode: res.statusCode,
        body: Buffer.concat(chunks).toString('utf8'),
      }))
    })
    req.on('error', reject)
    req.end()
  })
}

/** 造一个「访问认证已开启、环回不免密」的代理，后端记录收到的原始 URL。 */
async function makeHarness() {
  const seen = []
  const backend = createServer((req, res) => {
    seen.push(req.url)
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ leaked: true }))
  })
  await new Promise((resolve) => backend.listen(0, '127.0.0.1', resolve))
  const backendPort = backend.address().port

  const authManager = new AuthManager({
    sessionsFile: makeSessionsFile(),
    config: { enabled: true, mode: 'password_only', allowLoopback: false },
  })
  await authManager.setPassword('harness-password')

  const proxy = new ProxyServer({
    localPort: 0,
    targetPort: backendPort,
    authManager,
    logger: { info: NOOP, warn: NOOP, error: NOOP },
  })
  await proxy.start()

  return {
    proxy,
    backend,
    authManager,
    seen,
    port: proxy.server.address().port,
    async close() {
      await proxy.stop()
      authManager.dispose()
      await new Promise((r) => backend.close(r))
    },
  }
}

test('#115：路径后追加 #/dsh-bridge/authAdminUnlock 不得绕过访问认证', async () => {
  const h = await makeHarness()
  try {
    // 对照：无 fragment 时正常要求认证
    const plain = await doRequest({ host: '127.0.0.1', port: h.port, method: 'POST', path: '/api/session/list' })
    assert.equal(plain.statusCode, 401, '未认证访问必须 401')

    for (const path of [
      '/api/session/list#/dsh-bridge/authAdminUnlock',
      '/api/session/list#/dsh-bridge/authAdminUnlock?x=1',
      '/api/session/list#/dsh-bridge/authAdminUnlock/../../x',
      '/#/dsh-bridge/authAdminUnlock',
    ]) {
      const res = await doRequest({ host: '127.0.0.1', port: h.port, method: 'POST', path })
      assert.equal(res.statusCode, 400, `含 fragment 的请求必须拒绝：${path}`)
      assert.doesNotMatch(res.body, /leaked/, '绝不能把后端数据返回给未认证请求')
    }

    assert.equal(h.seen.length, 0, '含 fragment 的请求不得转发到后端')
  } finally {
    await h.close()
  }
})

test('#115：管理解锁豁免只认精确路径（前缀/后缀变体不再获得免认证）', async () => {
  const h = await makeHarness()
  const chunks = []
  const exploit = (path) => new Promise((resolve) => {
    const socket = net.connect(h.port, '127.0.0.1', () => {
      socket.write(`POST ${path} HTTP/1.1\r\nHost: 127.0.0.1\r\nContent-Length: 2\r\nConnection: close\r\n\r\n{}`)
    })
    let data = ''
    socket.on('data', (c) => { data += c.toString('utf8') })
    socket.on('end', () => resolve(data.split('\r\n')[0]))
    socket.on('error', () => resolve('socket-error'))
  })

  try {
    // 原始 request-target（绕过 curl / 浏览器对 fragment 的截断）
    chunks.push(await exploit('/api/session/list#/dsh-bridge/authAdminUnlock'))
    chunks.push(await exploit('/prefix/dsh-bridge/authAdminUnlock'))
    chunks.push(await exploit('/dsh-bridge/authAdminUnlockX'))

    for (const statusLine of chunks) {
      assert.doesNotMatch(statusLine, / 200 /, `不得有请求被放行：${statusLine}`)
    }
    assert.equal(h.seen.length, 0, '以上变体都不应转发到后端')
  } finally {
    await h.close()
  }
})

test('#115：无 fragment 的正常请求行为不变（管理解锁仍免认证可达、带 token 仍可访问）', async () => {
  const h = await makeHarness()
  try {
    // 管理解锁 RPC 本身仍需免认证可达（否则锁屏状态下无法解锁 → 死锁）
    const unlock = await doRequest({ host: '127.0.0.1', port: h.port, method: 'POST', path: '/dsh-bridge/authAdminUnlock' })
    assert.equal(unlock.statusCode, 200, '管理解锁 RPC 必须保持免认证可达')
    assert.ok(h.seen.includes('/dsh-bridge/authAdminUnlock'))

    // 带合法访问会话的请求正常放行（修复不能误伤已认证流量）
    const sessionToken = h.authManager.createSession()
    const viaCookie = await doRequest({
      host: '127.0.0.1', port: h.port, method: 'GET', path: '/api/session/list',
      headers: { Cookie: `dsh_bridge_auth=${sessionToken}` },
    })
    assert.equal(viaCookie.statusCode, 200, '带合法访问会话的请求必须放行')
  } finally {
    await h.close()
  }
})

test('#115：WebSocket 升级同样拒绝含 fragment 的 request-target', async () => {
  const h = await makeHarness()
  try {
    const statusLine = await new Promise((resolve) => {
      const socket = net.connect(h.port, '127.0.0.1', () => {
        socket.write(
          'GET /api/remote.mux#/dsh-bridge/authAdminUnlock HTTP/1.1\r\n'
          + 'Host: 127.0.0.1\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n'
          + 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\nSec-WebSocket-Version: 13\r\n\r\n',
        )
      })
      let data = ''
      socket.on('data', (c) => { data += c.toString('utf8') })
      socket.on('close', () => resolve(data.split('\r\n')[0]))
      socket.on('error', () => resolve('socket-error'))
      setTimeout(() => { try { socket.destroy() } catch {} }, 2000)
    })
    assert.doesNotMatch(statusLine, /101|200/, `含 fragment 的升级请求必须拒绝：${statusLine}`)
    assert.match(statusLine, /400|401/, '应为 400 或 401，而不是放行')
  } finally {
    await h.close()
  }
})
