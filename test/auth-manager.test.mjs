// test/auth-manager.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { AuthManager } from '../lib/auth/manager.js'
import { renderLoginPage } from '../lib/auth/login-template.js'
import { makeSessionsFile } from './helpers.mjs'

test('AuthManager initializes and generates default secretToken', () => {
  const auth = new AuthManager({ sessionsFile: makeSessionsFile() })
  assert.equal(auth.enabled, false)
  assert.equal(auth.mode, 'token_and_password')
  assert.ok(auth.secretToken.startsWith('dsh_'))
  assert.equal(auth.hasPassword, false)
  auth.dispose()
})

test('AuthManager setPassword hashes with salt and verifies correctly', async () => {
  const persisted = []
  const auth = new AuthManager({ sessionsFile: makeSessionsFile(),
    onPersist: (p) => persisted.push(p),
  })

  await auth.setPassword('my-secret-123')
  assert.equal(auth.hasPassword, true)
  assert.ok(auth.passwordHash)
  assert.ok(auth.passwordSalt)
  assert.equal(persisted.length, 1)

  // Verify correct password
  const okResult = await auth.verifyPassword('my-secret-123', '192.168.1.50')
  assert.equal(okResult.success, true)

  // Verify incorrect password
  const failResult = await auth.verifyPassword('wrong-password', '192.168.1.50')
  assert.equal(failResult.success, false)
  assert.equal(failResult.error, '访问密码错误')

  // 新格式哈希应带算法前缀
  assert.ok(auth.passwordHash.startsWith('pbkdf2-sha256$600000$'), '应使用 600k 迭代的新格式')

  auth.dispose()
})

test('AuthManager transparently upgrades legacy (10k) password hashes on login', async () => {
  const persisted = []
  const auth = new AuthManager({ sessionsFile: makeSessionsFile(),
    onPersist: (p) => persisted.push(p),
  })

  // 手工构造旧格式（裸 hex，10000 次迭代）——模拟 v2.8.x 存量数据
  const { pbkdf2 } = await import('node:crypto')
  const { promisify } = await import('node:util')
  const salt = 'aabbccdd'
  auth.passwordSalt = salt
  auth.passwordHash = (await promisify(pbkdf2)('old-pass', salt, 10000, 32, 'sha256')).toString('hex')
  assert.ok(!auth.passwordHash.startsWith('pbkdf2-sha256$'))

  // 正确密码登录成功，且哈希被透明升级
  const ok = await auth.verifyPassword('old-pass', '192.168.1.50')
  assert.equal(ok.success, true)
  assert.ok(auth.passwordHash.startsWith('pbkdf2-sha256$600000$'), '登录后必须升级到新格式')
  assert.notEqual(auth.passwordSalt, salt, '重哈希应使用新盐')
  assert.ok(persisted.length >= 1, '升级结果必须持久化')

  // 升级后旧密码仍可登录，错误密码仍被拒
  assert.equal((await auth.verifyPassword('old-pass', '192.168.1.50')).success, true)
  assert.equal((await auth.verifyPassword('old-wrong', '192.168.1.50')).success, false)

  auth.dispose()
})

test('AuthManager rate limits and locks out IP after 5 consecutive failures', async () => {
  const auth = new AuthManager({ sessionsFile: makeSessionsFile() })
  await auth.setPassword('correct-pwd')

  const testIp = '10.0.0.99'
  assert.equal(auth.isIpBlocked(testIp), false)

  for (let i = 0; i < 4; i++) {
    const res = await auth.verifyPassword('wrong', testIp)
    assert.equal(res.success, false)
    assert.equal(auth.isIpBlocked(testIp), false)
  }

  // 5th attempt triggers lockout
  const res5 = await auth.verifyPassword('wrong', testIp)
  assert.equal(res5.success, false)
  assert.equal(auth.isIpBlocked(testIp), true)

  // 6th attempt is blocked immediately
  const res6 = await auth.verifyPassword('correct-pwd', testIp)
  assert.equal(res6.success, false)
  assert.ok(res6.error.includes('尝试次数过多'))

  auth.dispose()
})

test('AuthManager session lifecycle: create, validate, and revoke', () => {
  const auth = new AuthManager({ sessionsFile: makeSessionsFile() })
  const token = auth.createSession(5000)
  assert.ok(token)
  assert.equal(auth.validateSession(token), true)
  assert.equal(auth.validateSession('non-existent-token'), false)

  auth.revokeSession(token)
  assert.equal(auth.validateSession(token), false)
  auth.dispose()
})

test('AuthManager verifyRequest handles bypass, loopback, token, and cookie', () => {
  const auth = new AuthManager({ sessionsFile: makeSessionsFile(),
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
  const auth = new AuthManager({ sessionsFile: makeSessionsFile(),
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
  const failRes1 = await auth.unlockAdmin('access-pass-111', '192.168.1.88')
  assert.equal(failRes1.ok, false)

  // 2. Correct admin password returns valid adminToken
  const okRes = await auth.unlockAdmin('admin-pass-222', '192.168.1.88')
  assert.equal(okRes.ok, true)
  assert.ok(okRes.adminToken)
  assert.equal(auth.validateAdminSession(okRes.adminToken), true)

  // 3. Changing admin policy invalidates admin session
  await auth.setAdminPolicy('local_only')
  assert.equal(auth.validateAdminSession(okRes.adminToken), false)

  // 4. In local_only mode, unlockAdmin is rejected
  const localOnlyRes = await auth.unlockAdmin('admin-pass-222', '192.168.1.88')
  assert.equal(localOnlyRes.ok, false)
  assert.ok(localOnlyRes.error.includes('仅限电脑本机'))

  auth.dispose()
})


test('v2.10.5: password_only 模式 + 未设密码时 verifyPassword 放行（防自我锁死）', async () => {
  const auth = new AuthManager({ sessionsFile: makeSessionsFile(),
    config: { enabled: true, mode: 'password_only' }, // 无密码
  })
  try {
    // 此前实现会拒绝（管理员尚未设置访问密码）→ 登录墙 401 → 进不去面板设密码 → 死锁。
    // 现应与 token_and_password 一致：无哈希可校验即放行，让管理员能进入面板完成初始化。
    const res = await auth.verifyPassword('anything', '192.168.1.50')
    assert.equal(res.success, true, 'password_only + 无密码必须放行（否则自我锁死）')
  } finally {
    auth.dispose()
  }
})

test('v2.10.5: password_only 模式 + 已设密码时错误密码被拒绝（真实门禁生效）', async () => {
  const auth = new AuthManager({ sessionsFile: makeSessionsFile(), config: { enabled: true, mode: 'password_only' } })
  try {
    await auth.setPassword('real-pass-1')
    const wrong = await auth.verifyPassword('wrong-pass', '192.168.1.51')
    assert.equal(wrong.success, false)
    const right = await auth.verifyPassword('real-pass-1', '192.168.1.51')
    assert.equal(right.success, true)
  } finally {
    auth.dispose()
  }
})

// ---- 登录 Session 持久化（宿主重启后已登录设备免重输访问密码）----

test('session persistence: createSession 落盘，新实例（模拟宿主重启）恢复后仍有效', () => {
  const sessionsFile = makeSessionsFile()
  const auth = new AuthManager({ sessionsFile })
  const token = auth.createSession()
  auth.dispose()

  // 落盘文件包含该会话
  const raw = readFileSync(sessionsFile, 'utf8')
  assert.ok(raw.includes(token), '会话必须写入落盘文件')

  // 新实例同路径恢复——等价于 dsh web 宿主进程重启后 AuthManager 重新构造
  const reborn = new AuthManager({ sessionsFile })
  assert.equal(reborn.validateSession(token), true, '重启后已登录会话必须仍然有效')
  assert.equal(reborn.validateSession('not-a-real-token'), false)
  reborn.dispose()
})

test('session persistence: 改密码吊销全部会话并清空落盘文件，重启后仍拒绝', async () => {
  const sessionsFile = makeSessionsFile()
  const auth = new AuthManager({ sessionsFile })
  const token = auth.createSession()
  await auth.setPassword('brand-new-pass')
  assert.equal(auth.validateSession(token), false, '改密码后本实例会话全部吊销')

  const entries = JSON.parse(readFileSync(sessionsFile, 'utf8'))
  assert.equal(entries.length, 0, '吊销必须同步清空落盘文件')

  const reborn = new AuthManager({ sessionsFile })
  assert.equal(reborn.validateSession(token), false, '重启后旧会话仍被拒绝')
  reborn.dispose()
})

test('session persistence: 已过期的会话在恢复时被过滤', () => {
  const sessionsFile = makeSessionsFile()
  mkdirSync(dirname(sessionsFile), { recursive: true })
  // 手写一条已过期会话 + 一条有效会话
  const now = Date.now()
  writeFileSync(sessionsFile, JSON.stringify([
    ['expiredtoken', { createdAt: 1, expiresAt: now - 1000 }],
    ['livetoken000', { createdAt: now, expiresAt: now + 60_000 }],
  ]))

  const auth = new AuthManager({ sessionsFile })
  assert.equal(auth.validateSession('expiredtoken'), false, '过期会话不得恢复')
  assert.equal(auth.validateSession('livetoken000'), true, '未过期会话正常恢复')
  auth.dispose()
})

test('session persistence: 落盘文件损坏时安全降级为空（不抛异常）', () => {
  const sessionsFile = makeSessionsFile()
  mkdirSync(dirname(sessionsFile), { recursive: true })
  writeFileSync(sessionsFile, '{not valid json!!!')

  const auth = new AuthManager({ sessionsFile }) // 不应抛异常
  const token = auth.createSession()
  assert.equal(auth.validateSession(token), true, '降级后新登录正常（纯内存语义）')
  auth.dispose()
})

test('session persistence: dispose 不清空落盘文件（宿主重启保活的关键）', () => {
  const sessionsFile = makeSessionsFile()
  const auth = new AuthManager({ sessionsFile })
  const token = auth.createSession()
  auth.dispose() // 宿主退出时 cleanup 调 dispose——此处不得清空持久化文件

  const entries = JSON.parse(readFileSync(sessionsFile, 'utf8'))
  assert.equal(entries.length, 1, 'dispose 后落盘文件必须保留（否则重启保活失效）')

  const reborn = new AuthManager({ sessionsFile })
  assert.equal(reborn.validateSession(token), true)
  reborn.dispose()
})

test('session persistence: 落盘失败降级为纯内存语义（不阻断认证流程）', () => {
  // 路径中段是一个普通文件：mkdirSync 必然失败（ENOTDIR），模拟不可写环境
  const dir = mkdtempSync(join(tmpdir(), 'dsh-bridge-ro-'))
  const blocker = join(dir, 'blocker')
  writeFileSync(blocker, 'x')
  const sessionsFile = join(blocker, 'sub', 'sessions.json')

  const auth = new AuthManager({ sessionsFile }) // 不应抛异常
  const token = auth.createSession()
  assert.equal(auth.validateSession(token), true, '写盘失败不影响内存会话生命周期')
  auth.dispose()
})
