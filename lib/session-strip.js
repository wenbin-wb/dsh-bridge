// DSH Bridge - 会话响应投影剥离（共享逻辑）
//
// contextHeaders / contextTimeline 是 DSH 会话投影里的两个大字段：每轮完整系统提示
// + 工具定义（单会话 4.8MB+，session.list 数百会话可达 60MB+），但没有客户端 UI
// 读取它们（会话打开时通过 WebSocket 实时获取，见 dsh-session-projection-cache 注释）。
// 剥离后可大幅降低传输体积（session.history gzip 1.2MB -> ~150KB，约 8 倍）。
//
// 本模块被两个转发层复用：
//   - tunnel-client.mjs（自建隧道）
//   - index.js ProxyServer（局域网 / Cloudflare 隧道 / 外部隧道登记 —— 所有公网入口）
// 命中失败（非 200 / 解析失败 / 结构不符）时原样返回，绝不破坏响应。
//
// DSH web 服务器默认开启 gzip 压缩（compression: gzip, level 1, threshold 1KB），
// 所以 API 响应可能是 gzip 编码的。必须先解压才能 JSON.parse，否则解析失败，
// catch {} 静默跳过剥离 → 完整 58MB+ 响应原样传输 → 隧道慢。

import { gunzipSync } from 'node:zlib';

const STRIP_PATHS = new Set(['/api/session.list', '/api/session.history']);

/**
 * 剥离 session.list / session.history 响应中的 contextHeaders 与 contextTimeline。
 * @param {string} pathname 请求路径（不含 query）
 * @param {Buffer} bodyBuf 原始响应体
 * @param {string} [contentEncoding] 响应的 content-encoding 头值（用于判断是否 gzip）
 * @returns {{ body: Buffer, stripped: boolean }} stripped=true 表示发生了剥离（调用方需更新 content-length 和 content-encoding）
 */
export function stripSessionProjections(pathname, bodyBuf, contentEncoding) {
  const cleanPath = String(pathname || '').split('?')[0];
  if (!STRIP_PATHS.has(cleanPath) || !Buffer.isBuffer(bodyBuf)) {
    return { body: bodyBuf, stripped: false };
  }
  try {
    // 如果 DSH 服务器 gzip 压缩了响应，先解压再解析
    const isGzipped = String(contentEncoding ?? '').toLowerCase() === 'gzip';
    const parseBuf = isGzipped ? gunzipSync(bodyBuf) : bodyBuf;
    const json = JSON.parse(parseBuf.toString('utf8'));
    if (json?.result?.ok) {
      const v = json.result.value;
      let changed = false;
      // session.list: items[].projections.values
      if (v?.items) {
        for (const item of v.items) {
          const proj = item?.projections?.values;
          if (proj && (proj.contextHeaders !== undefined || proj.contextTimeline !== undefined)) {
            delete proj.contextHeaders;
            delete proj.contextTimeline;
            changed = true;
          }
        }
      }
      // session.history: projections.values
      if (v?.projections?.values) {
        const proj = v.projections.values;
        if (proj.contextHeaders !== undefined || proj.contextTimeline !== undefined) {
          delete proj.contextHeaders;
          delete proj.contextTimeline;
          changed = true;
        }
      }
      if (changed) {
        return { body: Buffer.from(JSON.stringify(json), 'utf8'), stripped: true };
      }
    }
  } catch { /* 解析/解压失败则原样发送 */ }
  return { body: bodyBuf, stripped: false };
}
