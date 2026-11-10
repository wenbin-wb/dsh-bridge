// 宿主系统内存占用取数（issue #104）
//
// 背景：运维监控看板的「系统内存占用」原先一律用 `totalmem() - freemem()`。
// 这在 Linux / Windows 上接近任务管理器的口径，但 **macOS 上是错的**：
// `os.freemem()`（libuv → host_statistics64）只返回完全空闲（free）的页，
// inactive / speculative / purgeable 这些随时可回收的缓存全部被算作「已用」，
// 于是 32 GB 机器常年显示 31.8 GB（99%）、进度条飘红，与「活动监视器」差出十几 GB。
//
// 因此 macOS 单独取数：解析 `vm_stat` 的页统计，按活动监视器口径计算
//   已用 = active + wired down + occupied by compressor − purgeable
// （`vm_stat` 是 macOS 自带命令，不需要任何第三方依赖；取数失败时回退旧口径，
//  绝不因为统计失败让看板整体不可用。）
//
// 3 秒缓存：看板会周期性轮询，每次都拉子进程既慢又浪费；缓存只是"少拉几次"，
// 不是"永远不更新"——超过 TTL 必然重新取数。
import { execFileSync } from 'node:child_process'
import { freemem, totalmem } from 'node:os'

/** macOS 的虚拟内存统计命令（系统自带，无第三方依赖）。 */
export const DARWIN_VM_STAT_PATH = '/usr/bin/vm_stat'
/** vm_stat 缓存有效期：与看板轮询频率匹配，避免每次轮询都拉子进程。 */
export const VM_STAT_CACHE_TTL_MS = 3000
/** 子进程硬超时（远程/外部命令防失控）：vm_stat 正常在毫秒级返回。 */
const VM_STAT_TIMEOUT_MS = 1500

/** 模块级共享缓存（同一进程内所有调用共用；测试可传自己的 cache 或用 null 关闭）。 */
const sharedVmStatCache = { at: 0, usedBytes: null }

/**
 * 解析 `vm_stat` 输出。
 *
 * 真实输出形如：
 *   Mach Virtual Memory Statistics: (page size of 16384 bytes)
 *   Pages free:                               12345.
 *   Pages active:                            875432.
 *   Pages wired down:                        164000.
 *   Pages occupied by compressor:            124000.
 *   Pages purgeable:                          13000.
 * 注意行尾带句点、label 里可能带引号（如 "Translation faults"），逐行宽松解析。
 *
 * @param {string} text vm_stat 原文
 * @returns {{ pageSize: number|null, pages: Record<string, number> }}
 */
export function parseVmStat(text) {
  const pages = {}
  let pageSize = null
  if (typeof text !== 'string' || text === '') return { pageSize, pages }

  const sizeMatch = /\(page size of (\d+) bytes\)/.exec(text)
  if (sizeMatch) pageSize = Number(sizeMatch[1])

  for (const rawLine of text.split(/\r?\n/)) {
    // label 允许带引号；数值可能带千分位之外的尾点（vm_stat 用 `12345.` 结尾）
    const m = /^\s*"?([A-Za-z][A-Za-z0-9 ()]*?)"?:\s+(\d+)\.?\s*$/.exec(rawLine)
    if (!m) continue
    pages[normalizePageLabel(m[1])] = Number(m[2])
  }
  return { pageSize, pages }
}

/** label 归一化：小写 + 去掉分隔符（"Pages wired down" → "pageswireddown"）。 */
function normalizePageLabel(label) {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '')
}

/**
 * 按「活动监视器」口径计算 macOS 已用内存。
 *
 * 公式：active + wired down + occupied by compressor − purgeable。
 * 取不到页大小或关键页计数时返回 null（调用方回退旧口径），
 * 绝不把「解析失败」当成「内存几乎全空」。
 *
 * @param {{ pageSize: number|null, pages: Record<string, number> }} vmStat parseVmStat 结果
 * @param {number} totalBytes 物理内存总量（用于夹取，防止口径溢出）
 * @returns {number|null} 已用字节数
 */
export function darwinUsedBytesFromVmStat(vmStat, totalBytes) {
  const pageSize = Number(vmStat?.pageSize)
  if (!Number.isFinite(pageSize) || pageSize <= 0) return null
  const pages = vmStat?.pages ?? {}
  const count = (key) => (Number.isFinite(pages[key]) ? pages[key] : 0)

  const active = count('pagesactive')
  const wired = count('pageswireddown')
  const compressed = count('pagesoccupiedbycompressor')
  // 三个核心页计数全为 0 说明解析没命中（真实机器不可能），按失败处理先行回退
  if (active + wired + compressed === 0) return null

  const purgeable = count('pagespurgeable')
  const used = Math.max(0, (active + wired + compressed - purgeable) * pageSize)
  const total = Number(totalBytes)
  return Number.isFinite(total) && total > 0 ? Math.min(total, used) : used
}

/** 读一次 vm_stat（失败返回 null，由调用方回退；绝不抛出到看板）。 */
function execVmStat(execImpl) {
  const run = execImpl || ((file, args) => execFileSync(file, args, { encoding: 'utf8', timeout: VM_STAT_TIMEOUT_MS }))
  try {
    const out = run(DARWIN_VM_STAT_PATH, [])
    return typeof out === 'string' ? out : String(out ?? '')
  } catch {
    return null
  }
}

/** 组装对外的内存指标（百分比夹取到 0..100，避免异常输入画出越界进度条）。 */
function buildMemory({ totalBytes, freeBytes, usedBytes, source }) {
  const total = Number.isFinite(totalBytes) && totalBytes > 0 ? totalBytes : 0
  const used = Math.max(0, Math.min(total || Number.MAX_SAFE_INTEGER, Number(usedBytes) || 0))
  const clampedFree = Math.max(0, Number(freeBytes) || 0)
  const percent = total > 0 ? Math.round((used / total) * 100) : 0
  return {
    totalBytes: total,
    freeBytes: clampedFree,
    usedBytes: used,
    usedPercent: Math.max(0, Math.min(100, percent)),
    // 口径来源：'vm_stat' = macOS 活动监视器口径，'os' = totalmem-freemem，
    // 'os-fallback' = macOS 上 vm_stat 取数失败后的回退（旧口径）
    source,
  }
}

/**
 * 读取宿主内存占用。
 *
 * 非 darwin 保持原逻辑（totalmem - freemem，与任务管理器口径接近）；
 * darwin 用 vm_stat 复算并缓存 3 秒，取数失败回退旧口径。
 *
 * @param {object} [opts]
 * @param {string} [opts.platformName=process.platform] 便于单测注入平台
 * @param {number} [opts.totalBytes] 物理内存总量（默认 os.totalmem()）
 * @param {number} [opts.freeBytes] 空闲内存（默认 os.freemem()）
 * @param {(file: string, args: string[]) => string} [opts.execImpl] 执行器（测试注入）
 * @param {number} [opts.now] 当前时间（测试注入，用于缓存 TTL 断言）
 * @param {{at: number, usedBytes: number|null}|null} [opts.cache] 缓存对象；null 关闭缓存
 * @param {number} [opts.cacheTtlMs=VM_STAT_CACHE_TTL_MS] 缓存有效期
 * @returns {{totalBytes: number, freeBytes: number, usedBytes: number, usedPercent: number, source: 'vm_stat'|'os'|'os-fallback'}}
 */
export function readSystemMemory({
  platformName = process.platform,
  totalBytes = totalmem(),
  freeBytes = freemem(),
  execImpl,
  now = Date.now(),
  cache = sharedVmStatCache,
  cacheTtlMs = VM_STAT_CACHE_TTL_MS,
} = {}) {
  const total = Number.isFinite(totalBytes) && totalBytes > 0 ? totalBytes : totalmem()
  const free = Number.isFinite(freeBytes) ? freeBytes : freemem()

  // 非 macOS：沿用原口径，零成本、零子进程
  if (platformName !== 'darwin') {
    return buildMemory({ totalBytes: total, freeBytes: free, usedBytes: total - free, source: 'os' })
  }

  const cached = cache && Number.isFinite(cache.usedBytes) && now - cache.at < cacheTtlMs
    ? cache.usedBytes
    : null
  if (cached !== null) {
    return buildMemory({ totalBytes: total, freeBytes: total - cached, usedBytes: cached, source: 'vm_stat' })
  }

  const text = execVmStat(execImpl)
  const used = text === null ? null : darwinUsedBytesFromVmStat(parseVmStat(text), total)
  if (used === null) {
    // 取数失败：回退旧口径（可能是 99%，但至少看板可用），并如实标注来源
    return buildMemory({ totalBytes: total, freeBytes: free, usedBytes: total - free, source: 'os-fallback' })
  }

  if (cache) {
    cache.at = now
    cache.usedBytes = used
  }
  // freeBytes 由 used 反推，保证「已用 + 空闲 = 总量」在看板上自洽
  return buildMemory({ totalBytes: total, freeBytes: total - used, usedBytes: used, source: 'vm_stat' })
}

/** 清空模块级缓存（仅测试使用）。 */
export function resetSystemMemoryCache() {
  sharedVmStatCache.at = 0
  sharedVmStatCache.usedBytes = null
}
