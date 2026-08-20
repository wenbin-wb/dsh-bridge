// dsh-bridge 平台管理器
//
// 注册/协调多个 IM 平台适配器（Platform 子类），向主插件与 RPC 层提供：
//   - 统一的多平台状态聚合（getStatus）
//   - 平台实例查找（get）
//   - 统一生命周期（dispose）
//
// 主插件注入已构造的平台实例列表，本类只负责登记与聚合，不负责构造平台。

export class PlatformManager {
  /**
   * @param {object} opts
   * @param {object} opts.logger       日志器
   */
  constructor({ logger } = {}) {
    this.logger = logger
    this.platforms = new Map() // platformId -> Platform
  }

  /** 注册一个平台实例。重复注册同 id 时替换旧实例并 dispose 旧的。 */
  register(platform) {
    if (!platform || !platform.id) {
      this.logger?.warn?.('[dsh-bridge] PlatformManager.register: 平台缺少 id，已忽略')
      return platform
    }
    const existing = this.platforms.get(platform.id)
    if (existing && existing !== platform) {
      try {
        const result = existing.dispose()
        if (result instanceof Promise) {
          // 异步 dispose，记录警告（当前架构假定同步清理）
          this.logger?.warn?.(`[dsh-bridge] Platform ${platform.id} dispose is async but not awaited (may leave dangling resources)`)
        }
      } catch { /* 忽略 */ }
    }
    this.platforms.set(platform.id, platform)
    this.logger?.info?.(`[dsh-bridge] platform registered: ${platform.id} (${platform.name ?? ''})`)
    return platform
  }

  /** 获取平台实例；不存在返回 undefined。 */
  get(platformId) {
    return this.platforms.get(platformId)
  }

  /** 所有已注册平台 id。 */
  list() {
    return [...this.platforms.values()]
  }

  /** 聚合所有平台状态：{ [platformId]: status }。 */
  getStatus() {
    const out = {}
    for (const [id, platform] of this.platforms) {
      try {
        out[id] = platform.getStatus()
      } catch (err) {
        // 防御性读取 platform.name（getter 可能抛异常）
        let name = id
        try { name = platform.name ?? id } catch { /* 忽略 */ }
        out[id] = { id, name, status: 'error', error: err?.message ?? String(err) }
      }
    }
    return out
  }

  /** 释放所有平台。 */
  dispose() {
    for (const platform of this.platforms.values()) {
      try { platform.dispose() } catch { /* 忽略 */ }
    }
    this.platforms.clear()
  }
}
