// dsh-bridge WeChat media.js unit tests (AES encryption/decryption)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  pkcs7Pad,
  pkcs7Unpad,
  aes128EcbEncrypt,
  aes128EcbDecrypt,
  parseAesKey,
  normalizeAesKey,
  encodeAesKeyForApi,
  generateFilekey,
  generateAesKey,
  aes128PaddedSize,
  md5,
} from '../lib/wechat/media.js'

test('pkcs7Pad adds correct padding', () => {
  const data = Buffer.from('hello') // 5 bytes
  const padded = pkcs7Pad(data)
  assert.equal(padded.length, 16) // 填充到 16
  assert.equal(padded[padded.length - 1], 11) // 填充值 = 16 - 5
  // 前 5 字节是原始数据
  assert.equal(padded.subarray(0, 5).toString(), 'hello')
})

test('pkcs7Unpad removes valid padding', () => {
  const padded = Buffer.from([0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x0b, 0x0b, 0x0b, 0x0b, 0x0b, 0x0b, 0x0b, 0x0b, 0x0b, 0x0b, 0x0b])
  const unpadded = pkcs7Unpad(padded)
  assert.equal(unpadded.toString(), 'hello')
})

test('pkcs7Unpad returns data unchanged when padding is malformed', () => {
  const bad = Buffer.from([0x61, 0x62, 0x63, 0x05]) // 错误的填充
  const result = pkcs7Unpad(bad)
  assert.deepEqual(result, bad)
})

test('AES-128-ECB encrypt/decrypt round-trip', () => {
  const plaintext = Buffer.from('secret message')
  const key = Buffer.from('0123456789abcdef') // 16 bytes
  const ciphertext = aes128EcbEncrypt(plaintext, key)
  assert.notEqual(ciphertext.toString('hex'), plaintext.toString('hex'))
  const decrypted = aes128EcbDecrypt(ciphertext, key)
  assert.equal(decrypted.toString(), 'secret message')
})

test('parseAesKey handles base64(16-byte-raw)', () => {
  const raw = Buffer.from('0123456789abcdef')
  const b64 = raw.toString('base64')
  const parsed = parseAesKey(b64)
  assert.deepEqual(parsed, raw)
})

test('parseAesKey handles base64(32-char-hex)', () => {
  const hexStr = '0123456789abcdef0123456789abcdef'
  const b64 = Buffer.from(hexStr, 'ascii').toString('base64')
  const parsed = parseAesKey(b64)
  assert.equal(parsed.toString('hex'), hexStr)
})

test('parseAesKey throws on unexpected format', () => {
  const bad = Buffer.from('short').toString('base64')
  assert.throws(() => parseAesKey(bad), /unexpected aes_key format/)
})

test('normalizeAesKey converts bare hex to base64', () => {
  const raw = Buffer.from('0123456789abcdef')
  const hex = raw.toString('hex') // 32 字符
  const normalized = normalizeAesKey(hex)
  assert.equal(normalized, Buffer.from(hex, 'hex').toString('base64'))
  // parseAesKey 应能从归一化结果正确解出原始 key
  assert.deepEqual(parseAesKey(normalized), raw)
})

test('normalizeAesKey passes through valid base64', () => {
  const raw = Buffer.from('0123456789abcdef')
  const b64 = raw.toString('base64')
  assert.equal(normalizeAesKey(b64), b64)
})

test('normalizeAesKey returns null for garbage', () => {
  assert.equal(normalizeAesKey('garbage_that_is_not_a_key!!'), null)
  assert.equal(normalizeAesKey(''), null)
  assert.equal(normalizeAesKey(undefined), null)
})

test('normalizeAesKey keeps base64(hex-string) intact', () => {
  const hexStr = '0123456789abcdef0123456789abcdef'
  const b64 = Buffer.from(hexStr, 'ascii').toString('base64')
  const normalized = normalizeAesKey(b64)
  assert.equal(normalized, b64)
  assert.equal(parseAesKey(normalized).toString('hex'), hexStr)
})

test('encodeAesKeyForApi produces base64(hex_string)', () => {
  const key = Buffer.from('0123456789abcdef')
  const encoded = encodeAesKeyForApi(key)
  const decoded = Buffer.from(encoded, 'base64').toString('ascii')
  assert.equal(decoded, key.toString('hex'))
})

test('generateFilekey produces 32-char hex', () => {
  const fk = generateFilekey()
  assert.equal(fk.length, 32)
  assert.match(fk, /^[0-9a-f]{32}$/)
})

test('generateAesKey produces 16 bytes', () => {
  const key = generateAesKey()
  assert.equal(key.length, 16)
})

test('aes128PaddedSize calculates correctly', () => {
  assert.equal(aes128PaddedSize(0), 16)
  assert.equal(aes128PaddedSize(1), 16)
  assert.equal(aes128PaddedSize(15), 16)
  assert.equal(aes128PaddedSize(16), 32)
  assert.equal(aes128PaddedSize(17), 32)
})

test('md5 hashes correctly', () => {
  const hash = md5(Buffer.from('hello'))
  assert.equal(hash, '5d41402abc4b2a76b9719d911017c592')
})
