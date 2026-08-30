// AbortSignal 兼容垫片回归测试（移动端发消息报 AbortSignal.any is not a function）
//
// 真实场景：低版本 Node（<20.3）运行 DSH 时，@deepseek-ai/dsh-timeout 在每次
// agent 请求上调用 AbortSignal.any([upstream, timer.signal]) 直接抛错。
// 本测试用可注入的假环境验证垫片语义；Node 24 本身有 AbortSignal.any，
// 所以只能通过假环境覆盖"缺失 → 安装 → 行为正确"的链路。
import test from 'node:test'
import assert from 'node:assert/strict'
import { installAbortSignalCompat } from '../lib/compat.js'

/** 构造一个没有 any/timeout 的最小 AbortSignal/AbortController 环境 */
function makeLegacyEnvironment() {
  class FakeSignal {
    constructor() {
      this.aborted = false
      this.reason = undefined
      this._listeners = []
    }
    addEventListener(type, fn) { if (type === 'abort') this._listeners.push(fn) }
    removeEventListener(type, fn) { this._listeners = this._listeners.filter((l) => l !== fn) }
  }
  class FakeController {
    constructor() {
      this.signal = new FakeSignal()
    }
    abort(reason) {
      if (this.signal.aborted) return
      this.signal.aborted = true
      this.signal.reason = reason
      for (const fn of [...this.signal._listeners]) fn(this.signal)
    }
  }
  const target = { AbortSignal: FakeSignal, AbortController: FakeController }
  return { target }
}

test('垫片在缺失 AbortSignal.any 时安装并返回 true，在已有时不重复安装', () => {
  const legacy = makeLegacyEnvironment()
  assert.equal(installAbortSignalCompat(legacy.target), true)
  assert.equal(typeof legacy.target.AbortSignal.any, 'function')
  assert.equal(typeof legacy.target.AbortSignal.timeout, 'function')

  // 现代环境（本测试运行于 Node 24，any 已存在）→ 不做任何事
  assert.equal(installAbortSignalCompat(globalThis), false)
})

test('垫片 any()：任一源信号中止时组合信号以相同 reason 中止', async () => {
  const { target } = makeLegacyEnvironment()
  installAbortSignalCompat(target)

  const controller = new target.AbortController()
  const combined = target.AbortSignal.any([controller.signal, target.AbortSignal.timeout(60_000)])
  assert.equal(combined.aborted, false)

  controller.abort(new Error('user cancelled'))
  assert.equal(combined.aborted, true)
  assert.match(String(combined.reason), /user cancelled/)
})

test('垫片 any()：timeout 信号到时后中止组合信号', async () => {
  const { target } = makeLegacyEnvironment()
  installAbortSignalCompat(target)

  const upstream = new target.AbortController()
  const combined = target.AbortSignal.any([upstream.signal, target.AbortSignal.timeout(20)])
  assert.equal(combined.aborted, false)

  await new Promise((r) => setTimeout(r, 80))
  assert.equal(combined.aborted, true, 'timeout 到期必须中止组合信号')
})

test('垫片 any()：已中止的源信号立即中止返回值（规范语义）', () => {
  const { target } = makeLegacyEnvironment()
  installAbortSignalCompat(target)

  const done = new target.AbortController()
  done.abort('already')
  const combined = target.AbortSignal.any([done.signal])
  assert.equal(combined.aborted, true)
  assert.match(String(combined.reason), /already/)
})

test('垫片 any()：空数组与非信号元素安全处理', () => {
  const { target } = makeLegacyEnvironment()
  installAbortSignalCompat(target)

  const empty = target.AbortSignal.any([])
  assert.equal(empty.aborted, false)

  const tolerant = target.AbortSignal.any([null, undefined])
  assert.equal(tolerant.aborted, false)
})

test('垫片 timeout()：到时中止且 reason 携带超时语义', async () => {
  const { target } = makeLegacyEnvironment()
  installAbortSignalCompat(target)

  const signal = target.AbortSignal.timeout(20)
  assert.equal(signal.aborted, false)
  await new Promise((r) => setTimeout(r, 80))
  assert.equal(signal.aborted, true)
  assert.ok(signal.reason)
})
