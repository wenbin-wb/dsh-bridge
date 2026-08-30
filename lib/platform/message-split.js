// 出站消息分块与 SEND_FILE 指令解析（平台无关纯函数）
// 自 conversation-bridge.js 拆出：按平台 maxMessageChars 分块、保留 fenced code block、
// [SEND_FILE: ...] 显式指令提取与路径解析。
import { statSync } from 'node:fs'
import { isAbsolute, normalize, resolve } from 'node:path'

const FENCE_RE = /^```([^\n`]*)\s*$/

function normalizeMarkdownBlocks(content) {
  const lines = content.split('\n')
  const out = []
  let blankRun = 0
  let inCode = false
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '')
    if (FENCE_RE.test(line.trim())) {
      inCode = !inCode
      out.push(line)
      blankRun = 0
      continue
    }
    if (inCode) {
      out.push(line)
      continue
    }
    if (!line.trim()) {
      blankRun += 1
      if (blankRun <= 1) out.push('')
      continue
    }
    blankRun = 0
    out.push(line)
  }
  return out.join('\n').trim()
}

function splitMarkdownBlocks(content) {
  const blocks = []
  let current = []
  let inCode = false
  const flush = () => {
    const block = current.join('\n').trim()
    if (block) blocks.push(block)
    current = []
  }
  for (const raw of content.split('\n')) {
    const line = raw.replace(/\s+$/, '')
    if (FENCE_RE.test(line.trim())) {
      if (!inCode && current.length) flush()
      current.push(line)
      inCode = !inCode
      if (!inCode) flush()
      continue
    }
    if (inCode) {
      current.push(line)
      continue
    }
    if (!line.trim()) {
      flush()
      continue
    }
    current.push(line)
  }
  flush()
  return blocks
}

function hardSplit(text, max) {
  const chunks = []
  let rest = text
  while (rest.length > max) {
    chunks.push(rest.slice(0, max))
    rest = rest.slice(max)
  }
  if (rest) chunks.push(rest)
  return chunks
}

function packBlocks(blocks, max) {
  const units = []
  let current = ''
  for (const block of blocks) {
    const candidate = current ? `${current}\n\n${block}` : block
    if (candidate.length <= max) {
      current = candidate
      continue
    }
    if (current) units.push(current)
    if (block.length <= max) {
      current = block
    } else {
      units.push(...hardSplit(block, max))
      current = ''
    }
  }
  if (current) units.push(current)
  return units
}

export function splitForIM(content, max = 2000) {
  // 安全检查：防止畸形输入导致无限循环或崩溃
  if (typeof content !== 'string' || content.length === 0) return []
  if (content.length > 1_000_000) {
    content = content.slice(0, 1_000_000) + '\n\n[已截断：内容过长]'
  }
  const normalized = normalizeMarkdownBlocks(content)
  if (!normalized) return []
  if (normalized.length <= max) return [normalized]
  return packBlocks(splitMarkdownBlocks(normalized), max)
}

export function textOfAssistantMessage(message) {
  return (message.content ?? [])
    .filter((block) => block?.type === 'text')
    .map((block) => block.text)
    .join('\n')
}

/**
 * 尝试将任意路径（绝对或相对当前工作区）解析为真实存在的本地文件绝对路径
 */
export function resolveFilePath(rawPath, cwd = process.cwd()) {
  if (typeof rawPath !== 'string') return null
  let p = rawPath.trim()
    .replace(/^["'`]|["'`]$/g, '')
    .replace(/^file:\/\/\/?/, '')
    .replace(/^[📁📄📦\s]+/, '')
  if (!p) return null
  // 排除 HTTP/HTTPS 网址
  if (/^https?:\/\//i.test(p)) return null
  const resolved = isAbsolute(p) ? normalize(p) : resolve(cwd, p)
  try {
    if (statSync(resolved).isFile()) {
      return resolved
    }
  } catch {}
  return null
}

/**
 * 提取并过滤文本中的 [SEND_FILE: <path>] 显式发送指令
 * 由 AI 根据用户意图显式决定何时向用户发送文件附件，杜绝底层盲目扫描与误发。
 * @param {string} text - 原始助手回复文本
 * @param {string} cwd - 会话当前工作目录
 * @returns {{ cleanText: string, files: string[] }}
 */
export function extractAndStripSendFileDirectives(text, cwd = process.cwd()) {
  if (typeof text !== 'string' || !text.trim()) {
    return { cleanText: text || '', files: [] }
  }

  const files = []
  const directiveRegex = /\[(?:SEND_FILE|SEND-FILE|send_file|send-file|SEND_MEDIA|send_media):\s*[`"']?([^\]`"'\r\n]+?)[`"']?\s*\]/gi

  let m
  const re = new RegExp(directiveRegex)
  while ((m = re.exec(text)) !== null) {
    const rawPath = m[1].trim()
    const resolved = resolveFilePath(rawPath, cwd)
    if (resolved && !files.includes(resolved)) {
      files.push(resolved)
    }
  }

  // 从聊天正文中彻底剔除控制指令（保持 IM 聊天气泡的干净整洁）
  const cleanText = text.replace(directiveRegex, '').replace(/\n{3,}/g, '\n\n').trim()

  return { cleanText, files }
}

/**
 * 提取文本中的产物文件路径（基于显式指令）
 */
export function extractFilePathsFromText(text, cwd = process.cwd()) {
  return extractAndStripSendFileDirectives(text, cwd).files
}

// ---------------------------------------------------------------------------
// digest 摘要
