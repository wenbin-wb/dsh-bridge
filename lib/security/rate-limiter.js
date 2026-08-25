// 滑动窗口请求速率限制器 (Rate Limiter)
// 防范暴力破解、高频遍历与 DoS 攻击

export class RateLimiter {
  /**
   * @param {object} options
   * @param {number} options.maxRequests 窗口期内允许的最大请求数（默认 30）
   * @param {number} options.windowMs 时间窗口毫秒数（默认 60000ms = 1分钟）
   */
  constructor({ maxRequests = 30, windowMs = 60000 } = {}) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    /** @type {Map<string, number[]>} key -> timestamp[] */
    this.records = new Map();

    // 定期清理过期记录（每 5 分钟清理一次）
    this.cleanupTimer = setInterval(() => this.cleanup(), 5 * 60 * 1000);
    if (this.cleanupTimer.unref) this.cleanupTimer.unref();
  }

  /**
   * 检查指定 Key（如 IP / 用户 / Session）是否允许本次请求
   * @param {string} key 限制标识
   * @param {number} [customMax] 单次自定义最大请求数
   * @returns {{ allowed: boolean, remaining: number, retryAfterSec: number }}
   */
  check(key = 'default', customMax) {
    const limit = customMax || this.maxRequests;
    const now = Date.now();
    const windowStart = now - this.windowMs;

    let timestamps = this.records.get(key);
    if (!timestamps) {
      timestamps = [];
      this.records.set(key, timestamps);
    }

    // 过滤掉当前窗口期之前的记录
    const valid = timestamps.filter(t => t > windowStart);
    this.records.set(key, valid);

    if (valid.length >= limit) {
      const oldestInWindow = valid[0];
      const resetTime = oldestInWindow + this.windowMs;
      const retryAfterSec = Math.max(1, Math.ceil((resetTime - now) / 1000));
      return {
        allowed: false,
        remaining: 0,
        retryAfterSec,
      };
    }

    valid.push(now);
    return {
      allowed: true,
      remaining: limit - valid.length,
      retryAfterSec: 0,
    };
  }

  /**
   * 重置指定 key 或全部记录
   * @param {string} [key]
   */
  reset(key) {
    if (key) this.records.delete(key);
    else this.records.clear();
  }

  /**
   * 清理所有过期记录
   */
  cleanup() {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    for (const [key, list] of this.records.entries()) {
      const valid = list.filter(t => t > windowStart);
      if (valid.length === 0) {
        this.records.delete(key);
      } else {
        this.records.set(key, valid);
      }
    }
  }

  dispose() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.records.clear();
  }
}
