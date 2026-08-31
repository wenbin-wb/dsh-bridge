// downloadMedia 回归测试
//
// 曾因函数体内缺失 fetch() 调用（直接引用未定义的 response）导致微信入站媒体
// 下载 100% 抛 ReferenceError，且旧测试未覆盖该路径。本文件 mock 全局 fetch
// 验证真实下载、解密回环、非 200 与超限拒绝。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { downloadMedia, aes128EcbEncrypt, generateAesKey, encodeAesKeyForApi } from '../lib/wechat/media.js'

/** 临时替换 globalThis.fetch，返回 { restore } */
function mockFetch(handler) {
  const original = globalThis.fetch
  const calls = []
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init })
    return handler(url, init)
  }
  return { calls, restore: () => { globalThis.fetch = original } }
}

function okResponse(body, headers = {}) {
  return {
    ok: true,
    status: 200,
    headers: { get: (k) => headers[k.toLowerCase()] ?? null },
    arrayBuffer: async () => body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
  }
}

test('downloadMedia 发起真实 fetch 并返回明文（missing-fetch 回归）', async () => {
  const body = Buffer.from('hello-wechat-media')
  const mock = mockFetch(() => okResponse(body, { 'content-length': String(body.length) }))
  try {
    const out = await downloadMedia({ encryptedQueryParam: 'abc123' })
    assert.equal(mock.calls.length, 1)
    assert.ok(mock.calls[0].url.includes('novac2c.cdn.weixin.qq.com/c2c/download'), '应请求 CDN 白名单域名')
    assert.equal(out.toString(), 'hello-wechat-media')
  } finally {
    mock.restore()
  }
})

test('downloadMedia 携带 aesKey 时完成 AES 解密回环', async () => {
  const key = generateAesKey()
  const plaintext = Buffer.from('encrypted payload bytes 0123456789')
  const ciphertext = aes128EcbEncrypt(plaintext, key)
  const mock = mockFetch(() => okResponse(ciphertext, { 'content-length': String(ciphertext.length) }))
  try {
    const out = await downloadMedia({ encryptedQueryParam: 'abc', aesKeyBase64: encodeAesKeyForApi(key) })
    assert.equal(out.toString(), plaintext.toString())
  } finally {
    mock.restore()
  }
})

test('downloadMedia 对非 200 响应抛错', async () => {
  const mock = mockFetch(() => ({ ok: false, status: 403, headers: { get: () => null } }))
  try {
    await assert.rejects(
      () => downloadMedia({ encryptedQueryParam: 'abc' }),
      /CDN download HTTP 403/,
    )
  } finally {
    mock.restore()
  }
})

test('downloadMedia 拒绝超过 25MB 的响应（content-length 预检）', async () => {
  const mock = mockFetch(() => okResponse(Buffer.alloc(8), { 'content-length': String(26 * 1024 * 1024) }))
  try {
    await assert.rejects(() => downloadMedia({ encryptedQueryParam: 'abc' }), /maximum allowed size/)
  } finally {
    mock.restore()
  }
})
