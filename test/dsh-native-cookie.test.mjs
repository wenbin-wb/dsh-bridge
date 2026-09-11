// DSH 原生浏览器鉴权兼容层的单元测试（lib/auth/dsh-native-cookie.js）
//
// 背景：DSH 0.1.2 起 `dsh web` 带原生鉴权 —— `GET /?token=…` 换取签名会话
// cookie，此后 `/`、`/api` 以及经 ctx.connection.rpc.handle() 注册的通道都要求
// 该 cookie，否则 401。本插件的自建反代需要自行注入一枚 loopback 会话 cookie。
//
// 这里校验 cookie 的**格式契约**（名称派生 / 载荷 / 签名）与凭据定位策略。
// 「DSH 是否真的接受它」由另一个更强的交叉验证覆盖：直接用
// @deepseek-ai/dsh-client-connection 真实的 BrowserAuth.isAuthenticated() 校验，
// 见 scratch/real-cordis-harness/verify-cookie.mjs（6/6 通过），
// 以及真机 E2E（反代端口无 cookie 请求返回真实 UI 而非 401）。
import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash, createHmac } from 'node:crypto'
import {
  dshAuthCookieName,
  buildDshLoopbackCookie,
  readBrowserSessionSecret,
  getDshLoopbackCookie,
  DSH_AUTH_COOKIE_PREFIX,
  DSH_AUTH_COOKIE_VERSION,
} from '../lib/auth/dsh-native-cookie.js'

const PORT = 3080
const AUTHORITY = `127.0.0.1:${PORT}`
// 与 DSH 一致：密钥为 32 字节的 base64url
const SECRET = Buffer.from('0123456789abcdef0123456789abcdef', 'utf8').toString('base64url')

/** 按 DSH 的 decodeCookie 语义独立复算一遍（测试侧的第二实现） */
function verifyCookie(cookie, secret, authority, now = Date.now()) {
  const at = cookie.indexOf('=')
  const name = cookie.slice(0, at)
  const value = cookie.slice(at + 1)
  if (name !== DSH_AUTH_COOKIE_PREFIX + createHash('sha256').update(authority).digest('base64url')) return false
  const parts = value.split('.')
  if (parts.length !== 3 || parts[0] !== 'v1') return false
  const [, body, sig] = parts
  const expected = createHmac('sha256', Buffer.from(secret, 'base64url')).update(body).digest()
  if (Buffer.from(sig, 'base64url').toString('hex') !== expected.toString('hex')) return false
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
  return payload.version === 1
    && payload.authority === authority
    && payload.issuedAt <= now
    && payload.expiresAt > now
}

test('cookie 名称 = dsh-auth- + base64url(sha256(authority))', () => {
  const expected = 'dsh-auth-' + createHash('sha256').update(AUTHORITY).digest('base64url')
  assert.equal(dshAuthCookieName(PORT), expected)
  assert.equal(dshAuthCookieName('3080'), expected, '字符串端口应与数字端口等价')
})

test('cookie 载荷与签名符合 DSH 契约，且能被独立复算通过', () => {
  const now = 1_700_000_000_000
  const cookie = buildDshLoopbackCookie({ targetPort: PORT, secret: SECRET, now })

  assert.equal(verifyCookie(cookie, SECRET, AUTHORITY, now), true, '独立复算应通过')

  const body = cookie.split('.')[1]
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
  assert.deepEqual(Object.keys(payload).sort(), ['authority', 'expiresAt', 'issuedAt', 'version'])
  assert.equal(payload.version, DSH_AUTH_COOKIE_VERSION)
  assert.equal(payload.authority, AUTHORITY)
  assert.equal(payload.issuedAt, now - 1000, 'issuedAt 应比当前时间略微回拨')
  assert.ok(Number.isSafeInteger(payload.issuedAt) && Number.isSafeInteger(payload.expiresAt))
})

test('改用别的密钥/端口/时间即验签失败（证明签名真的绑定这些量）', () => {
  const now = 1_700_000_000_000
  const cookie = buildDshLoopbackCookie({ targetPort: PORT, secret: SECRET, now })
  const otherSecret = Buffer.alloc(32, 7).toString('base64url')

  assert.equal(verifyCookie(cookie, otherSecret, AUTHORITY, now), false, '换密钥应失败')
  assert.equal(verifyCookie(cookie, SECRET, '127.0.0.1:3090', now), false, '换 authority 应失败')
})

test('缺少密钥或端口时不产出 cookie（不抛异常）', () => {
  assert.equal(buildDshLoopbackCookie({ targetPort: PORT, secret: '' }), '')
  assert.equal(buildDshLoopbackCookie({ targetPort: PORT }), '')
  assert.equal(buildDshLoopbackCookie({ secret: SECRET }), '')
})

test('凭据定位：文件里有更早的 secret: 时，仍取 browser-session 记录的密钥', () => {
  // 这是关键回归场景：早期实现用「全文件第一个 secret:」，一旦别处先出现
  // secret 字段就会取错密钥 → cookie 签名无效 → 远程访问一律 401，且极难定位。
  const yaml = [
    'version: 1',
    'refs:',
    '  DEEPSEEK_API_KEY: sk-aaa',
    'records:',
    '  some-other-plugin/thing:',
    '    kind: grant',
    '    payload:',
    '      version: 1',
    '      secret: V1RPTkdfU0VDUkVUX0VBUkxZX0hFUkVfWFhYWA',
    '  client-connection/browser-session:',
    '    kind: grant',
    '    payload:',
    '      version: 1',
    '      secret: ' + SECRET,
    '',
  ].join('\n')

  assert.equal(readBrowserSessionSecret(yaml), SECRET, '必须取 browser-session 记录里的那个')
})

test('凭据定位：标准文件（仅一条 secret）正常取值', () => {
  const yaml = [
    'version: 1',
    'records:',
    '  client-connection/browser-session:',
    '    kind: grant',
    '    payload:',
    '      version: 1',
    '      secret: ' + SECRET,
    '',
  ].join('\n')
  assert.equal(readBrowserSessionSecret(yaml), SECRET)
})

test('凭据定位：无锚点时退回全文件首个 secret:（老格式兜底）', () => {
  const yaml = 'version: 1\nlegacy:\n  secret: ' + SECRET + '\n'
  assert.equal(readBrowserSessionSecret(yaml), SECRET)
})

test('凭据定位：空内容 / 非字符串 / 无 secret 返回空串', () => {
  assert.equal(readBrowserSessionSecret(''), '')
  assert.equal(readBrowserSessionSecret(undefined), '')
  assert.equal(readBrowserSessionSecret(null), '')
  assert.equal(readBrowserSessionSecret('version: 1\nrecords: {}\n'), '')
})

test('getDshLoopbackCookie：从磁盘读到密钥并产出合法 cookie', () => {
  const yaml = 'records:\n  client-connection/browser-session:\n    payload:\n      secret: ' + SECRET + '\n'
  const cookie = getDshLoopbackCookie(PORT, {
    dshHome: '/fake/home',
    existsSync: () => true,
    readFileSync: () => yaml,
    now: 1_700_000_000_000,
  })
  assert.equal(cookie.startsWith(dshAuthCookieName(PORT) + '='), true)
  assert.equal(verifyCookie(cookie, SECRET, AUTHORITY, 1_700_000_000_000), true)
})

test('getDshLoopbackCookie：凭据文件缺失/读取抛错时静默返回空串（不阻断代理启动）', () => {
  assert.equal(getDshLoopbackCookie(PORT, { dshHome: '/nope', existsSync: () => false }), '')
  assert.equal(getDshLoopbackCookie(PORT, {
    dshHome: '/nope',
    existsSync: () => true,
    readFileSync: () => { throw new Error('EACCES') },
  }), '')
  assert.equal(getDshLoopbackCookie(PORT, {
    dshHome: '/nope',
    existsSync: () => true,
    readFileSync: () => 'records: {}\n',
  }), '')
})

test('DSH_HOME 环境变量优先于 ~/.dsh', () => {
  const prev = process.env.DSH_HOME
  const seen = []
  process.env.DSH_HOME = '/custom/dsh/home'
  try {
    getDshLoopbackCookie(PORT, {
      existsSync: (p) => { seen.push(p); return true },
      readFileSync: () => 'secret: ' + SECRET + '\n',
    })
  } finally {
    if (prev === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = prev
  }
  assert.equal(seen.length, 1)
  assert.match(seen[0].replace(/\\/g, '/'), /^\/custom\/dsh\/home\/\.credentials\.yaml$/)
})
