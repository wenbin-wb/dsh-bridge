// test/cloudflared-network-args.test.mjs
// issue #71 P1-B：cloudflared 网络参数白名单（校验 / 拼装 / 能力门控）。
// 取值白名单的一手来源：Cloudflare 官方 Tunnel run parameters 文档（见模块头注释）。
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CLOUDFLARED_NETWORK_FIELDS,
  CLOUDFLARED_NETWORK_FLAGS,
  validateCloudflaredNetworkOptions,
  buildCloudflaredNetworkArgs,
  parseFlagSupport,
} from '../lib/cloudflared-network-args.js'
import { CloudflaredManager } from '../lib/cloudflared-manager.mjs'
import { BridgeService } from '../lib/index.js'

const silent = { info() {}, warn() {}, error() {}, debug() {} }

// ── 白名单清单本身 ────────────────────────────────────────────────────────
test('字段与官方文档一致：protocol/edgeIpVersion/region，且不含 ha-connections', () => {
  assert.deepEqual(CLOUDFLARED_NETWORK_FIELDS, ['protocol', 'edgeIpVersion', 'region'])
  assert.deepEqual(CLOUDFLARED_NETWORK_FLAGS.protocol.values, ['auto', 'http2', 'quic'])
  assert.deepEqual(CLOUDFLARED_NETWORK_FLAGS.edgeIpVersion.values, ['auto', '4', '6'])
  assert.deepEqual(CLOUDFLARED_NETWORK_FLAGS.region.values, ['us'])
  assert.equal('haConnections' in CLOUDFLARED_NETWORK_FLAGS, false, '官方未收录的 flag 不提供')
})

// ── 校验（保存入口）──────────────────────────────────────────────────────
test('validate：undefined 不改、空串清除、去空白、非法值给出可读错误', () => {
  const r1 = validateCloudflaredNetworkOptions({ protocol: ' quic ', edgeIpVersion: undefined, region: '' })
  assert.equal(r1.ok, true)
  assert.deepEqual(r1.values, { protocol: 'quic', region: '' })

  const r2 = validateCloudflaredNetworkOptions({ protocol: 'socks' })
  assert.equal(r2.ok, false)
  assert.ok(r2.errors.protocol.includes('auto / http2 / quic'), '错误信息必须列白名单')

  const r3 = validateCloudflaredNetworkOptions({ edgeIpVersion: 'v4' })
  assert.equal(r3.ok, false, 'v4 不在官方取值内（官方是 4）')

  const r4 = validateCloudflaredNetworkOptions({ region: 'eu' })
  assert.equal(r4.ok, false, '官方当前只有 us')

  const r5 = validateCloudflaredNetworkOptions({ protocol: 123 })
  assert.equal(r5.ok, false, '非文本必须拒绝')

  const r6 = validateCloudflaredNetworkOptions({})
  assert.equal(r6.ok, true)
  assert.deepEqual(r6.values, {}, '全部未提供 → 不产生任何写入')
})

// ── 拼装（启动参数）──────────────────────────────────────────────────────
test('build：未配置即零变化；配置且支持才追加；顺序与清单一致', () => {
  const zero = buildCloudflaredNetworkArgs({ protocol: '', edgeIpVersion: '', region: '' }, { protocol: true, edgeIpVersion: true, region: true })
  assert.deepEqual(zero.args, [])
  assert.deepEqual(zero.skipped, [])

  const full = buildCloudflaredNetworkArgs({ protocol: 'quic', edgeIpVersion: '6', region: 'us' }, { protocol: true, edgeIpVersion: true, region: true })
  assert.deepEqual(full.args, ['--protocol', 'quic', '--edge-ip-version', '6', '--region', 'us'])

  const partial = buildCloudflaredNetworkArgs({ protocol: 'http2', edgeIpVersion: '', region: 'us' }, { protocol: false, edgeIpVersion: true, region: true })
  assert.deepEqual(partial.args, ['--region', 'us'])
  assert.equal(partial.skipped.length, 1)
  assert.equal(partial.skipped[0].field, 'protocol')
  assert.ok(partial.skipped[0].reason.includes('--protocol'), '跳过原因必须点名 flag')
})

test('build：能力探测结果为 null（探测失败）→ 全部保守跳过，绝不带病传参', () => {
  const r = buildCloudflaredNetworkArgs({ protocol: 'quic' }, null)
  assert.deepEqual(r.args, [])
  assert.equal(r.skipped.length, 1)
  assert.ok(r.skipped[0].reason.includes('保守'), '原因要说明是保守跳过')
})

// ── 能力判据 ─────────────────────────────────────────────────────────────
test('parseFlagSupport：not defined → 不支持；其余输出 → 支持；空输出 → 不支持', () => {
  assert.equal(parseFlagSupport('Incorrect Usage. flag provided but not defined: -nope-xyz'), false)
  assert.equal(parseFlagSupport('FLAG PROVIDED BUT NOT DEFINED: -protocol'), false)
  assert.equal(parseFlagSupport('Provided Tunnel token is not valid.'), true)
  assert.equal(parseFlagSupport('Incorrect Usage. invalid value "x" for flag -ha-connections: parse error'), true)
  assert.equal(parseFlagSupport(''), false, '空输出必须保守判为不支持')
  assert.equal(parseFlagSupport('   '), false)
})

// ── manager 侧接线 ──────────────────────────────────────────────────────
test('manager：network 配置规整（只认白名单三键、去空白、非文本置空）', () => {
  const mgr = new CloudflaredManager({
    port: 0, home: 'unused', token: null, hostname: null, logger: silent,
    network: { protocol: ' quic ', edgeIpVersion: 7, region: undefined, evil: '--rm' },
  })
  assert.deepEqual(mgr.networkOptions, { protocol: 'quic', edgeIpVersion: '', region: '' })
  const none = new CloudflaredManager({ port: 0, home: 'unused', token: null, hostname: null, logger: silent })
  assert.deepEqual(none.networkOptions, { protocol: '', edgeIpVersion: '', region: '' })
})

test('manager：能力探测用行为法分类，结果缓存且未配置时不执行', async () => {
  const calls = []
  const mgr = new CloudflaredManager({
    port: 0, home: 'unused', token: null, hostname: null, logger: silent,
    binaryPath: '/fake/cloudflared',
    network: { protocol: 'quic' },
    networkProbeExec: (bin, args) => {
      calls.push(args.join(' '))
      if (args.includes('--protocol')) return 'Provided Tunnel token is not valid.'
      if (args.includes('--region')) {
        const err = new Error('spawn failed')
        err.stdout = 'Incorrect Usage. flag provided but not defined: -region'
        err.stderr = ''
        throw err
      }
      return '' // 空输出 → 保守不支持
    },
  })
  await mgr._detectNetworkFlagSupport()
  assert.deepEqual(mgr._networkFlagSupport, { protocol: true, edgeIpVersion: false, region: false })
  assert.equal(calls.length, 3)
  assert.ok(calls[0].includes('__dsh_probe_invalid__'), '探测用注定失败的取值')

  await mgr._detectNetworkFlagSupport()
  assert.equal(calls.length, 3, '结果缓存：不重复探测')

  const unconfigured = new CloudflaredManager({
    port: 0, home: 'unused', token: null, hostname: null, logger: silent,
    binaryPath: '/fake/cloudflared',
    networkProbeExec: () => { throw new Error('未配置时不得执行探测') },
  })
  await unconfigured._detectNetworkFlagSupport()
  assert.equal(unconfigured._networkFlagSupport, null, '未配置任何参数 → 零开销不探测')
})

test('manager：真实二进制不可执行（ENOENT）→ 能力全判 false（fail-open 到安全侧）', async () => {
  const mgr = new CloudflaredManager({
    port: 0, home: 'unused', token: null, hostname: null, logger: silent,
    binaryPath: '/nonexistent-' + Date.now() + '/cloudflared',
    network: { region: 'us' },
  })
  await mgr._detectNetworkFlagSupport()
  assert.deepEqual(mgr._networkFlagSupport, { protocol: false, edgeIpVersion: false, region: false })
})

// ── 保存入口（BridgeService）────────────────────────────────────────────
test('saveCloudflaredConfig：网络参数校验 + 持久化 + 非法值拒绝', async () => {
  const saved = []
  const svc = new BridgeService({ dshPort: 1, proxyPort: 2, onPersist: async (p) => saved.push(p) })

  await svc.saveCloudflaredConfig({ token: 't1', hostname: 'dsh.example.com', protocol: ' quic ', region: 'us' })
  assert.equal(svc.cloudflaredConfig.protocol, 'quic', '去空白后落盘')
  assert.equal(svc.cloudflaredConfig.region, 'us')
  assert.equal(svc.cloudflaredConfig.edgeIpVersion, undefined, 'undefined = 不写入（保留语义）')
  assert.equal(saved.length, 1)

  await assert.rejects(() => svc.saveCloudflaredConfig({ protocol: 'socks' }), /仅支持/, '非法值必须抛给面板')
  assert.equal(svc.cloudflaredConfig.protocol, 'quic', '被拒绝的调用不得污染现值')

  await svc.saveCloudflaredConfig({ protocol: '', region: '' })
  assert.equal(svc.cloudflaredConfig.protocol, '', '空串 = 清除（恢复 cloudflared 默认）')

  const status = await svc.getStatus({ adminAuthValid: false })
  assert.equal(status.cloudflared.protocol, '')
  assert.equal(status.cloudflared.region, '')
  assert.equal(status.cloudflared.edgeIpVersion, '')
  assert.equal(status.cloudflared.foreignRunner, null, '未扫描过时为 null')
})
