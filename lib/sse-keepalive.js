// SSE 空闲保活（issue #71）
//
// 背景：DSH 的 `/plugins/events` 等 `text/event-stream` 端点在首帧之后可以长时间
// 不产生任何字节（宿主自身不发心跳）。经本插件反向代理出去的链路——局域网 3082、
// Cloudflare 隧道、外部隧道登记、自建隧道本地腿——此前原样 pipe，链路空闲后会被
// 中间设备按空闲流回收掐断。issue #71 实测：空闲的 /plugins/events 在 Cloudflare
// 边缘 5/5 于 125.5–126.1s 被远端 cancel（cloudflared 日志 `stream ... canceled by
// remote`），而每 ~20s 有帧流动的对照流全部存活；本机 dsh.ypbin.cn 独立复现同样
// 在 126.9s 被掐。结果是远端面板实时通道每约 2 分钟断一次，必须手动刷新。
//
// 处理方式：对满足护栏条件的 SSE 响应，在代理侧静默超过
// SSE_KEEPALIVE_INTERVAL_MS 时向客户端写入一帧 SSE 注释行 `: keepalive\n\n`。
// SSE 规范（WHATWG EventSource）规定以 ':' 开头的行为注释、客户端必须忽略，
// 因此对任何合规解析器零影响；本仓库 dsh-taskboard 的 `: ping` 已是同类先例。
//
// 三个安全护栏（缺一不注入，见 isSseKeepaliveCandidate）：
//   1. content-type 必须是 text/event-stream —— 只碰真正的事件流；
//   2. 未压缩（无 gzip/br/deflate content-encoding）——往压缩流里插明文会直接
//      损坏字节流，客户端 gunzip 即报错；
//   3. 无 content-length —— 定长响应插入额外字节会破坏消息帧界。
//
// 开关：ProxyServer 的 `sseKeepalive`（默认 true，cordis 配置 `sseKeepalive` 可关）。
// 间隔固定 25s：远小于实测 126s 回收窗口，也低于常见 60s 空闲阈值；每 25s 仅
// 12 字节，带宽代价可忽略。

/** 保活帧：SSE 注释行，规范要求客户端忽略 */
export const SSE_KEEPALIVE_FRAME = ': keepalive\n\n';

/** 静默多久注入一帧（远小于 Cloudflare 实测 ~126s 空闲回收窗口） */
export const SSE_KEEPALIVE_INTERVAL_MS = 25_000;

/**
 * 判定一份上游响应头是否允许注入 SSE 保活帧。三条护栏见文件头注释。
 * @param {Record<string, string | string[] | undefined>} [headers] 上游响应头
 * @returns {boolean} true = 可以注入
 */
export function isSseKeepaliveCandidate(headers = {}) {
  const contentType = String(headers['content-type'] ?? '');
  if (!contentType.toLowerCase().includes('text/event-stream')) return false;
  // 定长响应绝不能插字节（消息帧界会被破坏）
  if (headers['content-length'] !== undefined && headers['content-length'] !== null) return false;
  // 压缩流绝不能插明文（会损坏 gzip/br 字节流）
  const encoding = String(headers['content-encoding'] ?? '');
  if (/(^|,\s*)(gzip|br|deflate)(\s*,|$)/i.test(encoding)) return false;
  return true;
}

/**
 * 创建一个 SSE 空闲保活计时器。
 *
 * 语义：
 *   - 创建即开始第一段静默倒计时（上游首帧通常紧随其后，会重置计时）；
 *   - `poke()` 表示"刚见到上游数据"，从零重新起算静默窗口；
 *   - 静默满 intervalMs 写入一帧保活，并继续按 intervalMs 周期写（直到有数据或停止）；
 *   - `stop()` 幂等终止，之后 poke/写入均不再发生；
 *   - `write` 抛错视为连接已坏：停表且不向外抛（定时器回调里的异常会打崩事件循环），
 *     通过 onWriteError 上报，连接收尾由调用方的 close/error 负责。
 *
 * @param {object} options
 * @param {(frame: string) => void} options.write 写一帧的回调（调用方负责判断连接可写）
 * @param {number} [options.intervalMs] 静默间隔，默认 SSE_KEEPALIVE_INTERVAL_MS
 * @param {{ setTimeout: Function, clearTimeout: Function }} [options.timers] 可注入定时器（测试用）
 * @param {(err: unknown) => void} [options.onWriteError] 写失败回调
 * @returns {{ poke: () => void, stop: () => void, readonly stopped: boolean }}
 */
export function createSseKeepalive(options = {}) {
  const { write, intervalMs = SSE_KEEPALIVE_INTERVAL_MS, timers, onWriteError } = options;
  if (typeof write !== 'function') throw new TypeError('createSseKeepalive: write 必须是函数');
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    throw new RangeError(`createSseKeepalive: intervalMs 必须是正数，收到 ${intervalMs}`);
  }
  const setT = timers?.setTimeout ?? globalThis.setTimeout;
  const clearT = timers?.clearTimeout ?? globalThis.clearTimeout;

  let timer = null;
  let stopped = false;

  const schedule = () => {
    if (stopped) return;
    timer = setT(() => {
      timer = null;
      if (stopped) return;
      try {
        write(SSE_KEEPALIVE_FRAME);
      } catch (err) {
        stopped = true;
        try { onWriteError?.(err); } catch { /* 上报失败不得影响事件循环 */ }
        return;
      }
      schedule();
    }, intervalMs);
  };

  const poke = () => {
    if (stopped) return;
    // 从"最后一次见到上游数据"重新起算：清掉旧倒计时再排新的
    if (timer !== null) clearT(timer);
    schedule();
  };

  const stop = () => {
    stopped = true;
    if (timer !== null) {
      clearT(timer);
      timer = null;
    }
  };

  schedule();
  return {
    poke,
    stop,
    get stopped() { return stopped; },
  };
}
