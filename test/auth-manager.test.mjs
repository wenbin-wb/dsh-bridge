// test/auth-manager.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { AuthManager } from '../lib/auth/manager.js'
import { renderLoginPage } from '../lib/auth/login-template.js'

test('AuthManager initializes and generates default secretToken', () => {
  const auth = new AuthManager()
  assert.equal(auth.enabled, false)
  assert.equal(auth.mode, 'token_and_password')
  assert.ok(auth.secretToken.startsWith('dsh_'))
  assert.equal(auth.hasPassword, false)
  auth.dispose()
})

test('AuthManager setPassword hashes with salt and verifies correctly', async () => {
  const persisted = []
  const auth = new AuthManager({
    onPersist: (p) => persisted.push(p),
  })

  await auth.setPassword('my-secret-123')
  assert.equal(auth.hasPassword, true)
  assert.ok(auth.passwordHash)
  assert.ok(auth.passwordSalt)
  assert.equal(persisted.length, 1)

  // Verify correct password
  const okResult = auth.verifyPassword('my-secret-123', '192.168.1.50')
  assert.equal(okResult.success, true)

  // Verify incorrect password
  const failResult = auth.verifyPassword('wrong-password', '192.168.1.50')
  assert.equal(failResult.success, false)
  assert.equal(failResult.error, '访问密码错误')

  auth.dispose()
})

test('AuthManager rate limits and locks out IP after 5 consecutive failures', () => {
  const auth = new AuthManager()
  auth.setPassword('correct-pwd')

  const testIp = '10.0.0.99'
  assert.equal(auth.isIpBlocked(testIp), false)

  for (let i = 0; i < 4; i++) {
    const res = auth.verifyPassword('wrong', testIp)
    assert.equal(res.success, false)
    assert.equal(auth.isIpBlocked(testIp), false)
  }

  // 5th attempt triggers lockout
  const res5 = auth.verifyPassword('wrong', testIp)
  assert.equal(res5.success, false)
  assert.equal(auth.isIpBlocked(testIp), true)

  // 6th attempt is blocked immediately
  const res6 = auth.verifyPassword('correct-pwd', testIp)
  assert.equal(res6.success, false)
  assert.ok(res6.error.includes('尝试次数过多'))

  auth.dispose()
})

test('AuthManager session lifecycle: create, validate, and revoke', () => {
  const auth = new AuthManager()
  const token = auth.createSession(5000)
  assert.ok(token)
  assert.equal(auth.validateSession(token), true)
  assert.equal(auth.validateSession('non-existent-token'), false)

  auth.revokeSession(token)
  assert.equal(auth.validateSession(token), false)
  auth.dispose()
})

test('AuthManager verifyRequest handles bypass, loopback, token, and cookie', () => {
  const auth = new AuthManager({
    config: {
      enabled: true,
      mode: 'token_and_password',
      secretToken: 'dsh_test_token_123',
    },
  })

  // 1. Loopback bypass (127.0.0.1)
  const loopbackReq = {
    url: '/',
    socket: { remoteAddress: '127.0.0.1' },
    headers: { host: '127.0.0.1:3082' },
  }
  assert.equal(auth.verifyRequest(loopbackReq).authenticated, true)
  assert.equal(auth.verifyRequest(loopbackReq).loopback, true)

  // 2. External IP without token or cookie -> Unauthorized
  const externalReq = {
    url: '/',
    socket: { remoteAddress: '192.168.1.100' },
    headers: { host: '192.168.1.50:3082' },
  }
  assert.equal(auth.verifyRequest(externalReq).authenticated, false)

  // 3. External IP with valid ?auth=token -> Authorized from token
  const tokenReq = {
    url: '/?auth=dsh_test_token_123',
    socket: { remoteAddress: '192.168.1.100' },
    headers: { host: '192.168.1.50:3082' },
  }
  const tokenRes = auth.verifyRequest(tokenReq)
  assert.equal(tokenRes.authenticated, true)
  assert.equal(tokenRes.fromToken, true)

  // 4. External IP with valid session cookie -> Authorized
  const sessionToken = auth.createSession(60000)
  const cookieReq = {
    url: '/chat',
    socket: { remoteAddress: '192.168.1.100' },
    headers: {
      host: '192.168.1.50:3082',
      cookie: `dsh_bridge_auth=${sessionToken}; other=123`,
    },
  }
  const cookieRes = auth.verifyRequest(cookieReq)
  assert.equal(cookieRes.authenticated, true)
  assert.equal(cookieRes.sessionToken, sessionToken)

  // 5. Disabled auth -> Bypass
  auth.enabled = false
  assert.equal(auth.verifyRequest(externalReq).authenticated, true)
  assert.equal(auth.verifyRequest(externalReq).bypass, true)

  auth.dispose()
})

test('renderLoginPage returns valid standalone HTML with DSH styling', () => {
  const html = renderLoginPage({ hasPassword: true })
  assert.ok(html.includes('DeepSeek Harness'))
  assert.ok(html.includes('远程安全访问认证'))
  assert.ok(html.includes('/__dsh_bridge__/login'))
  assert.ok(html.includes('input type="password"'))
})

test('AuthManager handles adminPolicy and remote admin unlocking', async () => {
  const auth = new AuthManager({
    config: {
      enabled: true,
      adminPolicy: 'password_unlock',
    },
  })

  await auth.setPassword('access-pass-111')
  await auth.setAdminPassword('admin-pass-222')
  assert.equal(auth.adminPolicy, 'password_unlock')
  assert.equal(auth.hasPassword, true)
  assert.equal(auth.hasAdminPassword, true)

  // 1. Access password cannot unlock admin when adminPassword is set
  const failRes1 = auth.unlockAdmin('access-pass-111', '192.168.1.88')
  assert.equal(failRes1.ok, false)

  // 2. Correct admin password returns valid adminToken
  const okRes = auth.unlockAdmin('admin-pass-222', '192.168.1.88')
  assert.equal(okRes.ok, true)
  assert.ok(okRes.adminToken)
  assert.equal(auth.validateAdminSession(okRes.adminToken), true)

  // 3. Changing admin policy invalidates admin session
  await auth.setAdminPolicy('local_only')
  assert.equal(auth.validateAdminSession(okRes.adminToken), false)

  // 4. In local_only mode, unlockAdmin is rejected
  const localOnlyRes = auth.unlockAdmin('admin-pass-222', '192.168.1.88')
  assert.equal(localOnlyRes.ok, false)
  assert.ok(localOnlyRes.error.includes('仅限电脑本机'))

  auth.dispose()
})

