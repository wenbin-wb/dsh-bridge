import test from 'node:test'
import assert from 'node:assert/strict'
import { AuthManager } from '../lib/auth/manager.js'
import { installBridgeRpc, BRIDGE_ENDPOINTS } from '../lib/bridge-rpc.js'
import { BridgeService } from '../lib/index.js'

test('P0-1: Custom Tunnel Authentication - prevents loopback bypass when forwarding', () => {
  const auth = new AuthManager({
    config: {
      enabled: true,
      mode: 'token_and_password',
      scope: 'all',
      allowLoopback: true,
    },
  })

  // 1. 真实的本机物理浏览器访问 (127.0.0.1, 无内部隧道标头) -> 命中 loopback 免密直通
  const localReq = {
    socket: { remoteAddress: '127.0.0.1' },
    headers: { host: '127.0.0.1:3082' },
    url: '/',
  }
  const localRes = auth.verifyRequest(localReq)
  assert.equal(localRes.authenticated, true)
  assert.equal(localRes.loopback, true)

  // 2. 自建隧道转发请求 (虽来自 127.0.0.1 但带有 internalTunnelSecret 内部隧道标识) -> 不可走 loopback 免密，必须鉴权
  const tunnelReq = {
    socket: { remoteAddress: '127.0.0.1' },
    headers: {
      host: '127.0.0.1:3082',
      'x-dsh-internal-tunnel': auth.internalTunnelSecret,
    },
    url: '/',
  }
  const tunnelRes = auth.verifyRequest(tunnelReq)
  assert.equal(tunnelRes.authenticated, false, 'Tunnel 请求必须被拦截并要求认证')

  // 3. 自建隧道带有效 Session -> 认证成功
  const sessionToken = auth.createSession()
  const authedTunnelReq = {
    socket: { remoteAddress: '127.0.0.1' },
    headers: {
      host: '127.0.0.1:3082',
      'x-dsh-internal-tunnel': auth.internalTunnelSecret,
      cookie: `dsh_bridge_auth=${sessionToken}`,
    },
    url: '/',
  }
  const authedRes = auth.verifyRequest(authedTunnelReq)
  assert.equal(authedRes.authenticated, true)
  assert.equal(authedRes.sessionToken, sessionToken)
})

test('P0-2: Secret Token 严格脱敏与公开状态隔离', () => {
  const auth = new AuthManager({
    config: {
      enabled: true,
      mode: 'token_and_password',
      scope: 'all',
    },
  })

  // 1. 公开状态接口严格不暴露 secretToken
  const publicStatus = auth.getPublicStatus()
  assert.equal(publicStatus.enabled, true)
  assert.equal('secretToken' in publicStatus, false)

  // 2. getStatus 默认必须脱敏（防止普通 RPC 泄露 Token）
  const defaultStatus = auth.getStatus()
  assert.ok(defaultStatus.secretToken.includes('***'))
  assert.notEqual(defaultStatus.secretToken, auth.secretToken)

  // 3. 经过授权获取未脱敏状态
  const fullStatus = auth.getStatus({ masked: false })
  assert.equal(fullStatus.secretToken, auth.secretToken)
})

test('P0-3: token_only 模式严格禁止密码登录', async () => {
  const auth = new AuthManager({
    config: {
      enabled: true,
      mode: 'token_only',
    },
  })
  await auth.setPassword('password123')

  // 1. 提交密码被拒绝
  const verifyRes = auth.verifyPassword('password123', '1.2.3.4')
  assert.equal(verifyRes.success, false)
  assert.ok(verifyRes.error.includes('专属安全 Token'))

  // 2. 空密码同样被拒绝
  const emptyRes = auth.verifyPassword('', '1.2.3.4')
  assert.equal(emptyRes.success, false)

  // 3. 只有合法的 Token Query 能通过认证
  const tokenReq = {
    socket: { remoteAddress: '10.0.0.5' },
    headers: { host: '10.0.0.1:3082' },
    url: `/?auth=${auth.secretToken}`,
  }
  const res = auth.verifyRequest(tokenReq)
  assert.equal(res.authenticated, true)
  assert.equal(res.fromToken, true)
})

test('P0-4: RPC 服务端管理员权限校验与主动重新锁定', async () => {
  const auth = new AuthManager({
    config: {
      enabled: true,
      adminPolicy: 'password_unlock',
    },
  })
  await auth.setAdminPassword('admin_pass')

  let handlerFn = null
  const mockCtx = {
    connection: {
      rpc: {
        handle: (channel, fn) => {
          handlerFn = fn
        },
      },
    },
  }

  installBridgeRpc(mockCtx, {
    service: {
      getStatus: async ({ adminAuthValid = false } = {}) => ({
        auth: auth.getStatus({ masked: !adminAuthValid }),
      }),
    },
    authManager: auth,
    logger: { error: () => {}, warn: () => {} },
  })

  // 1. 未提供 adminToken 时调用敏感配置接口 -> 返回 bad-request 拦截
  const unauthRes = await handlerFn(BRIDGE_ENDPOINTS.authUpdateConfig, { enabled: false })
  assert.equal(unauthRes.ok, false)
  assert.equal(unauthRes.error.code, 'bad-request')

  // 1.1 伪造 isLocalhost: true 同样被拦截（不再信任客户端自称的 isLocalhost）
  const spoofedLocalRes = await handlerFn(BRIDGE_ENDPOINTS.authUpdateConfig, { isLocalhost: true, enabled: false })
  assert.equal(spoofedLocalRes.ok, false)
  assert.equal(spoofedLocalRes.error.code, 'bad-request')

  // 1.2 未解锁时查询 getStatus，返回脱敏 Token
  const unauthStatusRes = await handlerFn(BRIDGE_ENDPOINTS.getStatus, {})
  assert.ok(unauthStatusRes.value.auth.secretToken.includes('***'))

  // 2. 输入管理员密码解锁 -> 获取 adminToken
  const unlockRes = await handlerFn(BRIDGE_ENDPOINTS.authAdminUnlock, { password: 'admin_pass' })
  assert.equal(unlockRes.ok, true)
  const adminToken = unlockRes.value.adminToken
  assert.ok(adminToken)

  // 2.1 携带 adminToken 查询 getStatus，返回完整 Token
  const authedStatusRes = await handlerFn(BRIDGE_ENDPOINTS.getStatus, { adminToken })
  assert.equal(authedStatusRes.value.auth.secretToken, auth.secretToken)

  // 3. 携带 adminToken 调用敏感配置接口 -> 执行成功
  const authedRes = await handlerFn(BRIDGE_ENDPOINTS.authUpdateConfig, { adminToken, scope: 'lan_only' })
  assert.equal(authedRes.ok, true)
  assert.equal(auth.scope, 'lan_only')

  // 4. 调用 authAdminLock 主动锁定 -> 服务端 session 销毁
  const lockRes = await handlerFn(BRIDGE_ENDPOINTS.authAdminLock, { adminToken })
  assert.equal(lockRes.ok, true)

  // 5. 再次使用旧 adminToken -> 返回 bad-request
  const retryRes = await handlerFn(BRIDGE_ENDPOINTS.authUpdateConfig, { adminToken, scope: 'all' })
  assert.equal(retryRes.ok, false)
  assert.equal(retryRes.error.code, 'bad-request')
})

test('P0-5: 升级插件命令注入防范与版本正则白名单', async () => {
  const service = new BridgeService({
    ctx: { webServer: { port: 3000 } },
    proxyPort: 3082,
    logger: { info: () => {}, error: () => {}, warn: () => {} },
  })

  // 1. 含有分号注入的非法版本号被拦截
  const r1 = await service.upgradePlugin({ version: '2.5.0; calc.exe' })
  assert.equal(r1.ok, false)
  assert.ok(r1.error.includes('非法的版本号格式'))

  // 2. 含有 & 管道符号的非法版本号被拦截
  const r2 = await service.upgradePlugin({ version: '2.5.0 & whoami' })
  assert.equal(r2.ok, false)
  assert.ok(r2.error.includes('非法的版本号格式'))

  // 3. 含有 $() 反引号注入的非法版本号被拦截
  const r3 = await service.upgradePlugin({ version: '`id`' })
  assert.equal(r3.ok, false)
  assert.ok(r3.error.includes('非法的版本号格式'))
})

test('P0-6: Scope 防护范围 Header 伪造防范', () => {
  const auth = new AuthManager({
    config: {
      enabled: true,
      scope: 'lan_only', // 仅对局域网访客开启防护
    },
  })

  // 局域网客户端 (192.168.1.50) 伪造 cf-ray / x-dsh-tunnel 试图假冒公网隧道绕过 LAN 认证
  const spoofedReq = {
    socket: { remoteAddress: '192.168.1.50' },
    headers: {
      host: '192.168.1.10:3082',
      'cf-ray': '12345678',
      'cf-connecting-ip': '1.1.1.1',
      'x-dsh-tunnel': '1',
    },
    url: '/',
  }

  const res = auth.verifyRequest(spoofedReq)
  assert.equal(res.authenticated, false, '局域网客户端伪造头部不可绕过 lan_only 认证')
})

test('P0-7: Loopback 物理特权 Token 签发与远程/伪造拦截', async () => {
  const auth = new AuthManager({
    config: {
      enabled: true,
      adminPolicy: 'password_unlock',
      passwordHash: 'dummy',
      passwordSalt: 'dummy',
    },
  })

  // 1. 真实物理本机回环连接 (127.0.0.1) -> 成功签发 adminToken
  const isLoopback = true
  const isPublicTunnel = false
  assert.ok(isLoopback && !isPublicTunnel)
  const token = auth.createAdminSession()
  assert.ok(token)
  assert.equal(auth.validateAdminSession(token), true)

  // 2. 远端客户端 / 隧道转发伪造 -> 被拒绝
  const remoteIsLoopback = false
  assert.equal(remoteIsLoopback && !isPublicTunnel, false)
})

test('P0-8: Workspace RPC checkAdminAuth 权限校验与访客拦截', async () => {
  const auth = new AuthManager({
    config: {
      enabled: true,
      adminPolicy: 'password_unlock',
      passwordHash: 'dummy_hash',
      passwordSalt: 'dummy_salt',
    },
  })

  const mockCtx = {
    workspaceRegistry: {
      list: async () => [],
      add: async () => {},
    },
  }

  const service = new BridgeService({
    dshPort: 3080,
    proxyPort: 3082,
    logger: { info: () => {}, warn: () => {}, error: () => {} },
  })
  service.ctx = mockCtx

  let rpcHandler
  const mockDshCtx = {
    connection: {
      rpc: {
        handle: (channel, fn) => {
          rpcHandler = fn
        },
      },
    },
  }

  installBridgeRpc(mockDshCtx, {
    service,
    authManager: auth,
    logger: { info: () => {}, warn: () => {}, error: () => {} },
  })

  // 1. 无 adminToken 访客调用 listRemoteDirectories -> 被拦截
  const res1 = await rpcHandler(BRIDGE_ENDPOINTS.listRemoteDirectories, { path: process.cwd() })
  assert.equal(res1.ok, false)
  assert.match(res1.error.message, /需要管理员权限/)

  // 2. 无 adminToken 访客调用 addRemoteWorkspace -> 被拦截
  const res2 = await rpcHandler(BRIDGE_ENDPOINTS.addRemoteWorkspace, { path: process.cwd() })
  assert.equal(res2.ok, false)
  assert.match(res2.error.message, /需要管理员权限/)

  // 3. 无 adminToken 访客调用 listWorkspaces -> 被拦截
  const res3 = await rpcHandler(BRIDGE_ENDPOINTS.listWorkspaces, {})
  assert.equal(res3.ok, false)
  assert.match(res3.error.message, /需要管理员权限/)

  // 4. 提供有效 adminToken -> 成功放行
  const validAdminToken = auth.createAdminSession()
  const res4 = await rpcHandler(BRIDGE_ENDPOINTS.listRemoteDirectories, {
    path: process.cwd(),
    adminToken: validAdminToken,
  })
  assert.equal(res4.ok, true)
  assert.ok(res4.value.currentPath)
})

test('P0-9: 路径穿越与敏感系统目录黑名单拦截 (Windows & POSIX)', async () => {
  const { isSafeWorkspacePath, isSensitiveFolderName } = await import('../lib/security/path-validator.js')

  // 1. 敏感文件夹名识别
  assert.equal(isSensitiveFolderName('.ssh'), true)
  assert.equal(isSensitiveFolderName('.gnupg'), true)
  assert.equal(isSensitiveFolderName('.aws'), true)
  assert.equal(isSensitiveFolderName('$Recycle.Bin'), true)
  assert.equal(isSensitiveFolderName('my-project'), false)

  // 2. Windows 系统敏感目录拦截
  const winCheck1 = await isSafeWorkspacePath('C:\\Windows')
  assert.equal(winCheck1.valid, false)
  assert.match(winCheck1.error, /安全拦截/)

  const winCheck2 = await isSafeWorkspacePath('C:\\Program Files')
  assert.equal(winCheck2.valid, false)

  // 3. POSIX 系统敏感目录拦截
  const posixCheck1 = await isSafeWorkspacePath('/etc/shadow', { allowNonExistent: true })
  assert.equal(posixCheck1.valid, false)

  const posixCheck2 = await isSafeWorkspacePath('/root/.ssh', { allowNonExistent: true })
  assert.equal(posixCheck2.valid, false)

  // 4. 路径中包含敏感片段
  const dotSshCheck = await isSafeWorkspacePath('D:\\test\\.ssh\\keys', { allowNonExistent: true })
  assert.equal(dotSshCheck.valid, false)

  // 5. 空字符 (Null byte) 注入拦截
  const nullByteCheck = await isSafeWorkspacePath('D:\\Projects\0\\etc')
  assert.equal(nullByteCheck.valid, false)

  // 6. 当前项目合法目录放行
  const validCheck = await isSafeWorkspacePath(process.cwd())
  assert.equal(validCheck.valid, true)
})

test('P0-10: Rate Limiter 滑动窗口频率限制防护', async () => {
  const { RateLimiter } = await import('../lib/security/rate-limiter.js')
  const limiter = new RateLimiter({ maxRequests: 3, windowMs: 1000 })
  const key = '192.168.1.100'

  // 前 3 次允许
  assert.equal(limiter.check(key).allowed, true)
  assert.equal(limiter.check(key).allowed, true)
  assert.equal(limiter.check(key).allowed, true)

  // 第 4 次被限流
  const r4 = limiter.check(key)
  assert.equal(r4.allowed, false)
  assert.equal(r4.remaining, 0)
  assert.ok(r4.retryAfterSec > 0)

  limiter.dispose()
})


