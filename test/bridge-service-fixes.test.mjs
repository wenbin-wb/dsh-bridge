// BridgeService / ProxyServer 修复回归测试（掩码回写、失效指标）
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BridgeService, ProxyServer, normalizeExternalTunnelUrl, restoreExternalTunnelConfig, restorePersistedServiceState, assertCustomTunnelServerUrl, normalizeCustomTunnelServerUrl } from '../lib/index.js'

test('saveCloudflaredConfig 忽略掩码 ******，保留真实 token（掩码回写回归）', async () => {
  const svc = new BridgeService({ dshPort: 1, proxyPort: 2, onPersist: async () => {} })
  svc.cloudflaredConfig = { token: 'real-token', hostname: 'a.example.com', autoStart: true }

  // 非管理员视图把 token 掩码成 '******' 后原样传回，不得覆盖真实值
  await svc.saveCloudflaredConfig({ token: '******', hostname: 'a.example.com' })
  assert.equal(svc.cloudflaredConfig.token, 'real-token')
  assert.equal(svc.cloudflaredConfig.autoStart, true, '保存时不应丢失 autoStart')

  // 正常写入新值
  await svc.saveCloudflaredConfig({ token: 'new-token', hostname: 'b.example.com' });
  assert.equal(svc.cloudflaredConfig.token, 'new-token');
  assert.equal(svc.cloudflaredConfig.hostname, 'b.example.com');

  // 未提供的字段（undefined）表示"保留现值"
  await svc.saveCloudflaredConfig({ hostname: 'c.example.com' });
  assert.equal(svc.cloudflaredConfig.token, 'new-token', '未回传 token 时不得清除');
  assert.equal(svc.cloudflaredConfig.hostname, 'c.example.com');

  // 显式空串仍表示清除
  await svc.saveCloudflaredConfig({ token: '', hostname: '' });
  assert.equal(svc.cloudflaredConfig.token, '');
});

test('ProxyServer.activeConnections 是基于已跟踪 socket 的 getter（不再恒为 0）', () => {
  const proxy = new ProxyServer({ localPort: 0, targetPort: 1, authManager: null, logger: { error() {} } })
  assert.equal(proxy.activeConnections, 0)
  const sock = {}
  proxy.clientSockets.add(sock)
  assert.equal(proxy.activeConnections, 1, '连接跟踪集合变化应反映到指标')
  proxy.clientSockets.delete(sock)
  assert.equal(proxy.activeConnections, 0)
})

test('saveExternalTunnel 登记外部已部署隧道：校验 URL、持久化、清除', async () => {
  const persisted = []
  const svc = new BridgeService({ dshPort: 1, proxyPort: 2, onPersist: (patch) => { persisted.push(patch); return Promise.resolve() } })

  // 非法协议拒绝
  await assert.rejects(() => svc.saveExternalTunnel({ url: 'ftp://x.com' }), /http/)
  await assert.rejects(() => svc.saveExternalTunnel({ url: 'not-a-url' }), /http/)
  assert.equal(svc.externalTunnelConfig, null)

  // 合法 https 地址登记，末尾斜杠被规范化，持久化写入
  await svc.saveExternalTunnel({ url: 'https://tunnel.example.com/' })
  assert.equal(svc.externalTunnelConfig.url, 'https://tunnel.example.com')
  assert.equal(persisted.at(-1).externalTunnel.url, 'https://tunnel.example.com')

  // 空串清除
  await svc.saveExternalTunnel({ url: '' })
  assert.equal(svc.externalTunnelConfig, null)
  assert.equal(persisted.at(-1).externalTunnel, null)
})

// 落盘配置可被本地改写/手工编辑，因此"保存时校验、启动恢复时不校验"是对称性缺口：
// 非法值会被回填进配置对象并被面板当公网地址展示、生成二维码。注意这不是 CORS 防线——
// 进入白名单前另有 toHttpOrigin 闸门，所以这里属于纵深防御 + 输入归一化。
test('normalizeExternalTunnelUrl：保存与启动恢复共用同一 http(s) 收敛', () => {
  // 合法：归一化（裸 origin 去末尾斜杠、trim、协议与主机大小写归一）
  assert.equal(normalizeExternalTunnelUrl('https://tunnel.example.com/'), 'https://tunnel.example.com')
  assert.equal(normalizeExternalTunnelUrl('  https://tunnel.example.com  '), 'https://tunnel.example.com')
  assert.equal(normalizeExternalTunnelUrl('HTTP://Example.COM'), 'http://example.com')
  assert.equal(normalizeExternalTunnelUrl('https://tunnel.example.com:8443/path'), 'https://tunnel.example.com:8443/path')
  assert.equal(normalizeExternalTunnelUrl('https://user:pass@host.example.com/'), 'https://user:pass@host.example.com')

  // 路径/查询里的尾斜杠有意义，不得被剥离（回归：原先对整串 replace(/\/+$/) 会改写它们）
  assert.equal(normalizeExternalTunnelUrl('https://tunnel.example.com/app/'), 'https://tunnel.example.com/app/')
  assert.equal(normalizeExternalTunnelUrl('https://tunnel.example.com/?q=1/'), 'https://tunnel.example.com/?q=1/')
  assert.equal(normalizeExternalTunnelUrl('https://tunnel.example.com/p//'), 'https://tunnel.example.com/p//')
  assert.equal(normalizeExternalTunnelUrl('https://tunnel.example.com/#frag/'), 'https://tunnel.example.com/#frag/')

  // 非法：非 http(s) 与解析失败一律丢弃
  for (const bad of ['dsh-app://app', 'file:///etc/passwd', 'javascript:alert(1)', 'data:text/html,x', 'ftp://x.com', 'not-a-url', '', null, undefined, 0, {}, []]) {
    assert.equal(normalizeExternalTunnelUrl(bad), null, `${String(bad)} 不得回填/登记`)
  }
})

test('restoreExternalTunnelConfig：恢复侧丢弃非法值，且不把"未登记"误报为非法', () => {
  // 被篡改/手工编辑的落盘值：丢弃 + 标记 invalid（供告警）
  assert.deepEqual(restoreExternalTunnelConfig({ url: 'dsh-app://app' }), { config: null, invalid: true })
  assert.deepEqual(restoreExternalTunnelConfig({ url: 'file:///etc/passwd' }), { config: null, invalid: true })

  // 合法值：归一化后回填
  assert.deepEqual(restoreExternalTunnelConfig({ url: 'https://tunnel.example.com/' }), { config: { url: 'https://tunnel.example.com' }, invalid: false })

  // 未登记：静默为 null（invalid=false），不产生误导性告警
  for (const empty of [{}, { url: '' }, { url: '   ' }, null, undefined]) {
    assert.deepEqual(restoreExternalTunnelConfig(empty), { config: null, invalid: false }, `${JSON.stringify(empty)} 不应被当成非法地址`)
  }
})

// 行为测试替代原先与实现文本耦合的"源码正则"守卫：直接驱动 apply() 用的恢复接线。
test('restorePersistedServiceState：启动恢复接线（篡改值不得进入配置对象）', async () => {
  const logs = []
  const logger = { info: (m) => logs.push(['info', m]), warn: (m) => logs.push(['warn', m]), error: (m) => logs.push(['error', m]) }
  const makeSvc = () => new BridgeService({ dshPort: 1, proxyPort: 2, onPersist: async () => {} })

  // 被篡改的落盘值：丢弃 + 告警；认证已开启时不提示首启引导
  const tampered = makeSvc()
  restorePersistedServiceState({ service: tampered, stored: { externalTunnel: { url: 'dsh-app://app' } }, logger, authEnabled: true })
  assert.equal(tampered.externalTunnelConfig, null, '非法隧道地址不得进入配置对象')
  assert.equal(tampered.firstRunGuidePending, false, '认证已开启时不提示首启引导')
  assert.ok(
    logs.some(([level, m]) => level === 'warn' && String(m).includes('已忽略非法的外部隧道地址配置')),
    `应有一条非法地址告警，实际日志: ${JSON.stringify(logs)}`,
  )

  // 合法配置：归一化回填 + LAN 回填
  const ok = makeSvc()
  restorePersistedServiceState({
    service: ok,
    stored: { externalTunnel: { url: 'https://tunnel.example.com/' }, lan: { selectedIp: '192.168.1.9' }, wizard: { guideShown: true } },
    logger, authEnabled: false,
  })
  assert.deepEqual(ok.externalTunnelConfig, { url: 'https://tunnel.example.com' })
  assert.equal(ok.selectedLanIp, '192.168.1.9')
  assert.equal(ok.firstRunGuidePending, false, '已展示过引导则不再提示')

  // 首启引导判据：认证未开启且从未展示 → 提示
  const fresh = makeSvc()
  restorePersistedServiceState({ service: fresh, stored: {}, logger, authEnabled: false })
  assert.equal(fresh.firstRunGuidePending, true)

  // autoStart 只按配置触发对应拉起，且不会因非法地址而触发
  const started = []
  const auto = makeSvc()
  auto.startCloudflared = async (opts) => { started.push(['cloudflared', opts]) }
  auto.startCustomTunnel = async (opts) => { started.push(['customTunnel', opts]) }
  restorePersistedServiceState({
    service: auto,
    stored: { cloudflared: { autoStart: true, token: 't' }, customTunnel: { autoStart: false, serverUrl: 'https://t.example.com' } },
    logger, authEnabled: true,
  })
  await new Promise((resolve) => setImmediate(resolve))
  assert.deepEqual(started, [['cloudflared', { autoStart: true }]], '只有 autoStart 的 cloudflared 被拉起')
  assert.equal(auto.customTunnelConfig.serverUrl, 'https://t.example.com')
})

test('getStatus 暴露 externalTunnel（含二维码）', async () => {
  const svc = new BridgeService({ dshPort: 1, proxyPort: 2, onPersist: async () => {} })
  await svc.saveExternalTunnel({ url: 'https://ext.example.com' })

  const status = await svc.getStatus({ adminAuthValid: true })
  assert.equal(status.externalTunnel.configured, true)
  assert.equal(status.externalTunnel.url, 'https://ext.example.com')
  assert.ok(status.externalTunnel.qr, '登记后应生成二维码')
})

// 外部隧道 URL 由用户自由填写，可能内嵌 Basic Auth 凭据（https://user:pass@host），
// 二维码等价于同一串凭据。策略与 cloudflared.token 一致：仅管理员视图可见。
test('getStatus：外部隧道 URL/二维码仅管理员可见（访客只保留"是否已登记"）', async () => {
  const svc = new BridgeService({ dshPort: 1, proxyPort: 2, onPersist: async () => {} })
  await svc.saveExternalTunnel({ url: 'https://user:pass@tunnel.example.com' })

  const admin = await svc.getStatus({ adminAuthValid: true })
  assert.equal(admin.externalTunnel.configured, true)
  assert.equal(admin.externalTunnel.url, 'https://user:pass@tunnel.example.com')
  assert.ok(admin.externalTunnel.qr, '管理员应拿到二维码')

  const guest = await svc.getStatus({ adminAuthValid: false })
  assert.equal(guest.externalTunnel.configured, true, '"是否已登记"对访客仍可见')
  assert.equal(guest.externalTunnel.url, '', '访客不得拿到隧道 URL')
  assert.equal(guest.externalTunnel.qr, null, '访客不得拿到二维码（等价于同一串凭据）')

  // 默认即访客视图：调用方忘记传参时不得泄漏
  const dflt = await svc.getStatus()
  assert.equal(dflt.externalTunnel.url, '')
  assert.equal(dflt.externalTunnel.qr, null)
})

test('setLanIp 按调用方视图返回状态（管理员分支不得拿到被掩码的状态）', async () => {
  const svc = new BridgeService({ dshPort: 1, proxyPort: 2, onPersist: async () => {} })
  await svc.saveExternalTunnel({ url: 'https://tunnel.example.com' })

  const adminView = await svc.setLanIp({ ip: null, adminAuthValid: true })
  assert.equal(adminView.externalTunnel.url, 'https://tunnel.example.com')
  assert.ok(adminView.externalTunnel.qr)

  const guestView = await svc.setLanIp({ ip: null, adminAuthValid: false })
  assert.equal(guestView.externalTunnel.url, '')
  assert.equal(guestView.externalTunnel.qr, null)
})

// 自建隧道 serverUrl 是管理员配置的**出站连接目标**，URL 里可能内嵌 Basic Auth
// （ws 会把 userinfo 转成 Authorization 头）。与 externalTunnel 同策略：仅管理员视图返回。
test('getStatus：自建隧道 serverUrl 仅管理员可见（访客只保留"是否已配置"）', async () => {
  const svc = new BridgeService({ dshPort: 1, proxyPort: 2, onPersist: async () => {} })
  svc.customTunnelConfig = { serverUrl: 'https://user:pass@vps.example.com', accessToken: 'tok' }

  const admin = await svc.getStatus({ adminAuthValid: true })
  assert.equal(admin.customTunnel.configured, true)
  assert.equal(admin.customTunnel.serverUrl, 'https://user:pass@vps.example.com')

  const guest = await svc.getStatus({ adminAuthValid: false })
  assert.equal(guest.customTunnel.configured, true, '"是否已配置"对访客仍可见')
  assert.equal(guest.customTunnel.serverUrl, '', '访客不得拿到出站连接地址')

  const dflt = await svc.getStatus()
  assert.equal(dflt.customTunnel.serverUrl, '', '默认（不传参）即访客视图')
})

test('assertCustomTunnelServerUrl：只收敛协议，不剥离 userinfo', () => {
  // 合法：ws/wss/http/https（ws 库会把 http(s) 归一为 ws(s)）；userinfo 必须保留
  for (const ok of ['wss://tunnel.example.com/ws', 'ws://192.168.1.5:8080', 'https://user:pass@vps.example.com', 'http://vps.example.com']) {
    assert.doesNotThrow(() => assertCustomTunnelServerUrl(ok), `${ok} 应被接受`)
  }
  assert.equal(new URL('https://user:pass@vps.example.com').username, 'user', '前提：userinfo 可解析且有意保留')

  // 非法协议 / 无法解析：拒绝
  for (const bad of ['file:///etc/passwd', 'javascript:alert(1)', 'dsh-app://app', 'ftp://x.com', 'not-a-url', '']) {
    assert.throws(() => assertCustomTunnelServerUrl(bad), /ws:\/\/ 或 wss:\/\//, `${bad} 应被拒绝`)
  }
})

test('normalizeCustomTunnelServerUrl：保存前归一化（undefined 保留 / 空串清除 / 非空校验）', () => {
  assert.equal(normalizeCustomTunnelServerUrl(undefined), undefined, 'undefined 表示保留现值')
  assert.equal(normalizeCustomTunnelServerUrl(''), '', '空串表示清除')
  assert.equal(normalizeCustomTunnelServerUrl('   '), '', '空白串等价于清除')
  assert.equal(
    normalizeCustomTunnelServerUrl('  https://user:pass@vps.example.com  '),
    'https://user:pass@vps.example.com',
    'trim 且保留 userinfo',
  )
  assert.throws(() => normalizeCustomTunnelServerUrl('ftp://x.com'), /ws:\/\/ 或 wss:\/\//)
})

test('stripSessionProjections 剥离 session.list/history 大投影字段（共享逻辑）', async () => {
  const { stripSessionProjections } = await import('../lib/session-strip.js')

  // session.list: items[].projections.values
  const listBody = Buffer.from(JSON.stringify({
    result: { ok: true, value: { items: [
      { id: 'a', projections: { values: { contextHeaders: 'x'.repeat(100), contextTimeline: 'y', title: '保留' } } },
      { id: 'b', projections: { values: { contextHeaders: 'big' } } },
    ] } },
  }))
  const r1 = stripSessionProjections('/api/session.list', listBody)
  assert.equal(r1.stripped, true)
  const j1 = JSON.parse(r1.body.toString())
  assert.equal(j1.result.value.items[0].projections.values.contextHeaders, undefined)
  assert.equal(j1.result.value.items[0].projections.values.contextTimeline, undefined)
  assert.equal(j1.result.value.items[0].projections.values.title, '保留', '不应误删其他字段')
  assert.equal(j1.result.value.items[1].projections.values.contextHeaders, undefined)

  // session.history: projections.values
  const historyBody = Buffer.from(JSON.stringify({
    result: { ok: true, value: { projections: { values: { contextHeaders: 'big', title: 'h' } } } },
  }))
  const r2 = stripSessionProjections('/api/session.history', historyBody)
  assert.equal(r2.stripped, true)
  const j2 = JSON.parse(r2.body.toString())
  assert.equal(j2.result.value.projections.values.contextHeaders, undefined)
  assert.equal(j2.result.value.projections.values.title, 'h')

  // 非目标路径 / 解析失败 / 无投影 → 原样返回
  const other = Buffer.from('plain')
  assert.equal(stripSessionProjections('/api/other', other).stripped, false)
  assert.equal(stripSessionProjections('/api/session.list', Buffer.from('not-json')).stripped, false)
  const noProj = Buffer.from(JSON.stringify({ result: { ok: true, value: { items: [{ id: 'c' }] } } }))
  assert.equal(stripSessionProjections('/api/session.list', noProj).stripped, false)
})


test('stripSessionProjections 支持 gzip 编码的 session.list 响应（PR #29 gzip-aware）', async () => {
  const { stripSessionProjections } = await import('../lib/session-strip.js')
  const { gzipSync } = await import('node:zlib')

  const raw = Buffer.from(JSON.stringify({
    result: { ok: true, value: { items: [
      { id: 'a', projections: { values: { contextHeaders: 'x'.repeat(64), title: 'keep' } } },
    ] } },
  }))
  const gz = gzipSync(raw)

  // 传入 content-encoding: gzip 时应先解压再剥离
  const r = stripSessionProjections('/api/session.list', gz, 'gzip')
  assert.equal(r.stripped, true, 'gzip 响应应能成功剥离')
  const j = JSON.parse(r.body.toString())
  assert.equal(j.result.value.items[0].projections.values.contextHeaders, undefined)
  assert.equal(j.result.value.items[0].projections.values.title, 'keep')

  // 未声明 gzip 却传入 gzip 数据 → 解析失败 → 原样返回（不破坏响应）
  const r2 = stripSessionProjections('/api/session.list', gz, undefined)
  assert.equal(r2.stripped, false)
  assert.equal(r2.body, gz)
})
