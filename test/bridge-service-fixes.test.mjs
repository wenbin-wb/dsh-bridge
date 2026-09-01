// BridgeService / ProxyServer 修复回归测试（掩码回写、失效指标）
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BridgeService, ProxyServer } from '../lib/index.js'

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

test('getStatus 暴露 externalTunnel（含二维码）', async () => {
  const svc = new BridgeService({ dshPort: 1, proxyPort: 2, onPersist: async () => {} })
  await svc.saveExternalTunnel({ url: 'https://ext.example.com' })

  const status = await svc.getStatus()
  assert.equal(status.externalTunnel.configured, true)
  assert.equal(status.externalTunnel.url, 'https://ext.example.com')
  assert.ok(status.externalTunnel.qr, '登记后应生成二维码')
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

