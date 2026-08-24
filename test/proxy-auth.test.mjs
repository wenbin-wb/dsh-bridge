// test/proxy-auth.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer, request as httpRequest } from 'node:http'
import { ProxyServer } from '../lib/index.js'
import { AuthManager } from '../lib/auth/manager.js'

function doRequest(options, postBody) {
  return new Promise((resolve, reject) => {
    const req = httpRequest(options, (res) => {
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8')
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body,
        })
      })
    })
    req.on('error', reject)
    if (postBody) req.write(postBody)
    req.end()
  })
}

test('ProxyServer end-to-end authentication: login, token redirect, and cookie protection', async () => {
  // 1. Mock Backend Server
  const backend = createServer((req, res) => {
    if (req.url === '/api/data') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ secretData: 42 }))
      return
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end('<html><head></head><body><h1>Welcome to DSH</h1></body></html>')
  })

  await new Promise((resolve) => backend.listen(0, '127.0.0.1', resolve))
  const backendPort = backend.address().port

  // 2. AuthManager with custom password & token
  const authManager = new AuthManager({
    config: {
      enabled: true,
      mode: 'token_and_password',
      secretToken: 'dsh_valid_token_xyz',
      allowLoopback: false, // Force auth check on all connections for testing
    },
  })
  await authManager.setPassword('mypassword')

  // 3. ProxyServer
  const proxy = new ProxyServer({
    localPort: 0,
    targetPort: backendPort,
    authManager,
    logger: { info: () => {}, warn: () => {}, error: () => {} },
  })
  await proxy.start()
  const proxyPort = proxy.server.address().port

  try {
    // A. Unauthenticated HTML request -> 401 with DSH Login Page
    const resHtml = await doRequest({
      host: '127.0.0.1',
      port: proxyPort,
      path: '/',
      method: 'GET',
      headers: { Accept: 'text/html' },
    })
    assert.equal(resHtml.statusCode, 401)
    assert.ok(resHtml.body.includes('远程安全访问认证'))
    assert.ok(resHtml.body.includes('DeepSeek Harness'))

    // B. Unauthenticated API request -> 401 JSON
    const resApi = await doRequest({
      host: '127.0.0.1',
      port: proxyPort,
      path: '/api/data',
      method: 'GET',
      headers: { Accept: 'application/json' },
    })
    assert.equal(resApi.statusCode, 401)
    assert.ok(resApi.body.includes('unauthorized'))

    // C. POST /__dsh_bridge__/login with WRONG password -> 401 JSON
    const resWrongLogin = await doRequest(
      {
        host: '127.0.0.1',
        port: proxyPort,
        path: '/__dsh_bridge__/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      JSON.stringify({ password: 'wrong' })
    )
    assert.equal(resWrongLogin.statusCode, 401)
    const wrongData = JSON.parse(resWrongLogin.body)
    assert.equal(wrongData.ok, false)
    assert.ok(wrongData.error)

    // D. POST /__dsh_bridge__/login with CORRECT password -> 200 JSON with Set-Cookie
    const resLogin = await doRequest(
      {
        host: '127.0.0.1',
        port: proxyPort,
        path: '/__dsh_bridge__/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      JSON.stringify({ password: 'mypassword' })
    )
    assert.equal(resLogin.statusCode, 200)
    const loginData = JSON.parse(resLogin.body)
    assert.equal(loginData.ok, true)
    const setCookie = resLogin.headers['set-cookie']?.[0]
    assert.ok(setCookie)
    assert.ok(setCookie.includes('dsh_bridge_auth='))

    // Extract cookie value
    const cookieVal = setCookie.split(';')[0]

    // E. Authenticated request using Cookie -> 200 backend HTML
    const resAuth = await doRequest({
      host: '127.0.0.1',
      port: proxyPort,
      path: '/',
      method: 'GET',
      headers: { Cookie: cookieVal, Accept: 'text/html' },
    })
    assert.equal(resAuth.statusCode, 200)
    assert.ok(resAuth.body.includes('Welcome to DSH'))

    // F. Authenticated API request using Cookie -> 200 backend JSON
    const resAuthApi = await doRequest({
      host: '127.0.0.1',
      port: proxyPort,
      path: '/api/data',
      method: 'GET',
      headers: { Cookie: cookieVal, Accept: 'application/json' },
    })
    assert.equal(resAuthApi.statusCode, 200)
    const data = JSON.parse(resAuthApi.body)
    assert.equal(data.secretData, 42)

    // G. Scan QR code with valid ?auth=token -> 302 Redirect to clean URL + Set-Cookie
    const resToken = await doRequest({
      host: '127.0.0.1',
      port: proxyPort,
      path: '/chat?auth=dsh_valid_token_xyz',
      method: 'GET',
    })
    assert.equal(resToken.statusCode, 302)
    assert.equal(resToken.headers['location'], '/chat')
    const tokenCookie = resToken.headers['set-cookie']?.[0]
    assert.ok(tokenCookie)
    assert.ok(tokenCookie.includes('dsh_bridge_auth='))

    // H. PWA Manifest & App Icon API endpoints
    const resManifest = await doRequest({
      host: '127.0.0.1',
      port: proxyPort,
      path: '/manifest.webmanifest',
      method: 'GET',
    })
    assert.equal(resManifest.statusCode, 200)
    const manifestJson = JSON.parse(resManifest.body)
    assert.equal(manifestJson.name, 'DeepSeek Harness')
    assert.equal(manifestJson.display, 'standalone')

    const resPwaIcon = await doRequest({
      host: '127.0.0.1',
      port: proxyPort,
      path: '/__dsh_bridge__/pwa-icon.svg',
      method: 'GET',
    })
    assert.equal(resPwaIcon.statusCode, 200)
    assert.ok(resPwaIcon.body.includes('<svg'))

    // I. Verified HTML head contains mobile viewport and PWA meta tags
    assert.ok(resAuth.body.includes('viewport-fit=cover'))
    assert.ok(resAuth.body.includes('apple-mobile-web-app-capable'))
    assert.ok(resAuth.body.includes('/manifest.webmanifest'))
  } finally {
    await proxy.stop()
    await new Promise((resolve) => backend.close(resolve))
    authManager.dispose()
  }
})
