// dsh-bridge WeChat media download/upload + AES-128-ECB encryption
//
// iLink 媒体项（图片/文件/语音/视频）通过 CDN 加密传输：
// - 下载：CDN URL + encrypted_query_param → 下载密文 → AES-128-ECB 解密
// - 上传：明文 → AES-128-ECB 加密 → POST 到 CDN → 获取 encrypted_query_param → sendmessage
//
// 参考实现：
// - dsh-chatnode-wechat/src/gateway/media.ts（下载 + 解密）
// - hermes-agent/gateway/platforms/weixin.py（上传 + 加密）

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { createHash } from 'node:crypto'

/** 腾讯微信 CDN 基础 URL（用于媒体上传下载） */
export const WEIXIN_CDN_BASE_URL = 'https://novac2c.cdn.weixin.qq.com/c2c'

/** CDN 白名单（SSRF 防护，只允许从这些域名下载） */
export const CDN_ALLOWLIST = [
  'novac2c.cdn.weixin.qq.com',
  'ilinkai.weixin.qq.com',
  'wx.qlogo.cn',
  'thirdwx.qlogo.cn',
  'res.wx.qq.com',
  'mmbiz.qpic.cn',
  'mmbiz.qlogo.cn',
]

// ---- AES-128-ECB 加解密 + PKCS#7 填充 ----

/** PKCS#7 填充到完整 AES 块（16 字节） */
export function pkcs7Pad(data) {
  const blockSize = 16
  const padLen = blockSize - (data.length % blockSize)
  const out = Buffer.alloc(data.length + padLen)
  data.copy(out, 0)
  out.fill(padLen, data.length)
  return out
}

/** 移除 PKCS#7 填充（校验填充值，无效时返回原数据） */
export function pkcs7Unpad(data) {
  if (data.length === 0) return data
  const last = data[data.length - 1]
  if (last >= 1 && last <= 16 && data.length >= last) {
    let valid = true
    for (let i = data.length - last; i < data.length; i++) {
      if (data[i] !== last) {
        valid = false
        break
      }
    }
    if (valid) return data.subarray(0, data.length - last)
  }
  return data
}

/** AES-128-ECB 加密（用于上传媒体） */
export function aes128EcbEncrypt(plaintext, key) {
  const cipher = createCipheriv('aes-128-ecb', key, null)
  cipher.setAutoPadding(false) // 手动 PKCS#7 填充
  const padded = pkcs7Pad(plaintext)
  return Buffer.concat([cipher.update(padded), cipher.final()])
}

/** AES-128-ECB 解密（用于下载媒体） */
export function aes128EcbDecrypt(ciphertext, key) {
  const decipher = createDecipheriv('aes-128-ecb', key, null)
  decipher.setAutoPadding(false)
  const out = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return pkcs7Unpad(out)
}

// ---- iLink aes_key 解析 ----

/**
 * 解析 iLink 的 aes_key 字段（base64 编码）。
 * 支持两种格式：
 * - base64(16 字节原始 key) — 直接用
 * - base64(32 字符 hex 字符串) — 先 hex 解码再用
 */
export function parseAesKey(aesKeyBase64) {
  const decoded = Buffer.from(aesKeyBase64, 'base64')
  if (decoded.length === 16) return decoded
  if (decoded.length === 32) {
    const text = decoded.toString('ascii')
    if (/^[0-9a-fA-F]{32}$/.test(text)) return Buffer.from(text, 'hex')
  }
  throw new Error(`unexpected aes_key format (${decoded.length} decoded bytes)`)
}

/**
 * 归一化媒体项的 aes_key 到 base64(原始 16 字节) 格式，供 parseAesKey/downloadMedia 使用。
 * iLink 各字段的 aes_key 编码不一：
 *   - 图片 image_item.aeskey：常见为裸 hex 字符串（32 字符），须先 hex→raw→base64
 *   - media.aes_key / file/voice/video：多为 base64（raw 或 hex 字符串）
 * 返回 base64 字符串；无法识别时返回 null。
 */
export function normalizeAesKey(input) {
  if (!input || typeof input !== 'string') return null
  const trimmed = input.trim()
  if (!trimmed) return null
  // 裸 hex（32 字符 0-9a-f）：hex → raw16 → base64
  if (/^[0-9a-fA-F]{32}$/.test(trimmed)) {
    return Buffer.from(trimmed, 'hex').toString('base64')
  }
  // 已经是 base64：校验能否被 parseAesKey 识别
  try {
    parseAesKey(trimmed)
    return trimmed
  } catch {
    // 最后尝试：若 base64 解码后是 32 字节且是 hex，parseAesKey 已覆盖；否则视为无法解析
    return null
  }
}

/**
 * 生成用于 iLink API CDNMedia 的 aes_key 字段（上传时用）。
 * iLink 协议规范：aes_key 必须先转 hex 字符串，再 base64 编码（base64(hex_string)）。
 */
export function encodeAesKeyForApi(keyBytes) {
  const hexStr = Buffer.isBuffer(keyBytes) ? keyBytes.toString('hex') : Buffer.from(keyBytes).toString('hex')
  return Buffer.from(hexStr, 'ascii').toString('base64')
}

// ---- CDN URL 构建 ----

/** 构建 CDN 下载 URL */
export function cdnDownloadUrl(cdnBaseUrl, encryptedQueryParam) {
  return `${cdnBaseUrl.replace(/\/+$/, '')}/download?encrypted_query_param=${encodeURIComponent(encryptedQueryParam)}`
}

/** 构建 CDN 上传 URL */
export function cdnUploadUrl(cdnBaseUrl, uploadParam, filekey) {
  return `${cdnBaseUrl.replace(/\/+$/, '')}/upload?encrypted_query_param=${encodeURIComponent(uploadParam)}&filekey=${filekey}`
}

// ---- SSRF 防护 ----

/**
 * 校验媒体 URL 是否在 CDN 白名单内（防 SSRF）。
 * @throws 如果 URL 不在白名单或非 http(s)
 */
export function assertWeixinCdnUrl(url, allowHosts = CDN_ALLOWLIST) {
  let parsed
  try {
    parsed = new URL(url)
  } catch {
    throw new Error(`Unparseable media URL: ${url}`)
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Media URL has disallowed scheme ${parsed.protocol}; only http/https are permitted.`)
  }
  if (!allowHosts.includes(parsed.hostname)) {
    throw new Error(`Media URL host ${parsed.hostname} is not in the WeChat CDN allowlist. Refusing to fetch to prevent SSRF.`)
  }
}

// ---- 媒体下载（解密） ----

/**
 * 下载并解密一个媒体项。
 * @param {object} opts
 * @param {string} [opts.cdnBaseUrl] CDN 基础 URL
 * @param {string} [opts.encryptedQueryParam] 加密参数（优先用）
 * @param {string} [opts.fullUrl] 完整 URL（回退）
 * @param {string} [opts.aesKeyBase64] AES key（base64）
 * @param {number} [opts.timeoutMs] 下载超时
 * @returns {Promise<Buffer>} 解密后的明文
 */
export async function downloadMedia({
  cdnBaseUrl = WEIXIN_CDN_BASE_URL,
  encryptedQueryParam,
  fullUrl,
  aesKeyBase64,
  timeoutMs = 60000,
}) {
  let url
  if (encryptedQueryParam) {
    url = cdnDownloadUrl(cdnBaseUrl, encryptedQueryParam)
  } else if (fullUrl) {
    url = fullUrl
  } else {
    throw new Error('media item had neither encrypt_query_param nor full_url')
  }
  assertWeixinCdnUrl(url)
  
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const MAX_DOWNLOAD_BYTES = 25 * 1024 * 1024; // 25MB
    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > MAX_DOWNLOAD_BYTES) {
      throw new Error(`Media file exceeds maximum allowed size (${contentLength} > 25MB)`);
    }
    const raw = Buffer.from(await response.arrayBuffer())
    if (raw.length > MAX_DOWNLOAD_BYTES) {
      throw new Error(`Media file exceeds maximum allowed size (${raw.length} > 25MB)`);
    }
    if (aesKeyBase64) {
      const key = parseAesKey(aesKeyBase64)
      return aes128EcbDecrypt(raw, key)
    }
    return raw
  } finally {
    clearTimeout(timer)
  }
}

// ---- 媒体上传（加密） ----

/**
 * 加密并上传媒体到 CDN。
 * @param {object} opts
 * @param {Buffer} opts.plaintext 明文内容
 * @param {string} opts.uploadUrl CDN 上传 URL（来自 getuploadurl）
 * @param {Buffer} opts.aesKey AES key（16 字节）
 * @param {number} [opts.timeoutMs] 上传超时
 * @returns {Promise<string>} encrypted_query_param（从响应头 x-encrypted-param）
 */
export async function uploadMedia({
  plaintext,
  uploadUrl,
  aesKey,
  timeoutMs = 60000,
}) {
  const ciphertext = aes128EcbEncrypt(plaintext, aesKey)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: ciphertext,
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`CDN upload HTTP ${response.status}`)
    const encryptedParam = response.headers.get('x-encrypted-param')
    if (!encryptedParam) throw new Error('CDN upload response missing x-encrypted-param header')
    return encryptedParam
  } finally {
    clearTimeout(timer)
  }
}

// ---- 辅助工具 ----

/** 从文件名猜测 MIME 类型 */
export function mimeFromFilename(filename) {
  const ext = filename.includes('.') ? filename.split('.').pop().toLowerCase() : ''
  const table = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp',
    mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm',
    mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4', ogg: 'audio/ogg', silk: 'audio/silk',
    pdf: 'application/pdf', zip: 'application/zip',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  }
  return table[ext] ?? 'application/octet-stream'
}

/** 计算文件 MD5 */
export function md5(data) {
  return createHash('md5').update(data).digest('hex')
}

/** 生成随机 filekey（32 字符 hex） */
export function generateFilekey() {
  return randomBytes(16).toString('hex')
}

/** 生成随机 AES key（16 字节） */
export function generateAesKey() {
  return randomBytes(16)
}

/** 计算 AES 填充后的文件大小 */
export function aes128PaddedSize(rawSize) {
  const blockSize = 16
  return rawSize + (blockSize - (rawSize % blockSize))
}
