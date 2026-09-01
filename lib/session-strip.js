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

const STRIP_PATHS = new Set(['/api/session.list', '/api/session.history']);

/**
 * 剥离 session.list / session.history 响应中的 contextHeaders 与 contextTimeline。
 * @param {string} pathname 请求路径（不含 query）
 * @param {Buffer} bodyBuf 原始响应体
 * @returns {{ body: Buffer, stripped: boolean }} stripped=true 表示发生了剥离（调用方需更新 content-length）
 */
export function stripSessionProjections(pathname, bodyBuf) {
  const cleanPath = String(pathname || '').split('?')[0];
  if (!STRIP_PATHS.has(cleanPath) || !Buffer.isBuffer(bodyBuf)) {
    return { body: bodyBuf, stripped: false };
  }
  try {
    const json = JSON.parse(bodyBuf.toString('utf8'));
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
  } catch { /* 解析失败则原样发送 */ }
  return { body: bodyBuf, stripped: false };
}
