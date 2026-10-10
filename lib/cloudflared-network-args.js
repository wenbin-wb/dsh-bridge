// cloudflared 网络参数白名单（issue #71 P1-B）
//
// 取值的一手来源（访问 2026-10-10）：Cloudflare 官方 Tunnel run parameters 文档
// https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/configure-tunnels/tunnel-run-parameters/
//   --protocol         auto | http2 | quic（默认 auto）
//   --edge-ip-version  auto | 4 | 6（默认 4）
//   --region           官方当前仅收录 us（空/缺省 = 全球默认）
// --ha-connections 被 issue #71 提及，但**官方文档未收录、无官方取值依据**——
// 给用户挖坑的开关不做，故刻意不在本清单内。
//
// 设计约束（三条同时满足才允许把参数拼进启动命令）：
//   1. 默认零变化：三项全空 → 不追加任何参数，启动命令与旧版逐字一致；
//   2. 值白名单校验：非法值在保存入口就被拒绝（execFile 数组传参，天然无注入面）；
//   3. 能力门控：系统二进制版本不受控，实际二进制不认识的 flag 必须跳过并告警
//      ——cloudflared 对未知 flag 是 "Incorrect Usage" 致命错误，绝不带病启动。

/** 可配置字段（键名进入 cloudflaredConfig 持久化） */
export const CLOUDFLARED_NETWORK_FIELDS = ['protocol', 'edgeIpVersion', 'region'];

/** 字段 → CLI flag 与官方白名单取值 */
export const CLOUDFLARED_NETWORK_FLAGS = {
  protocol: { flag: '--protocol', values: ['auto', 'http2', 'quic'] },
  edgeIpVersion: { flag: '--edge-ip-version', values: ['auto', '4', '6'] },
  region: { flag: '--region', values: ['us'] },
};

/**
 * 校验网络参数（保存入口用）。
 * 语义：undefined = 不修改（不进入 values）；空串/纯空白 = 清除（恢复默认）；
 * 其余必须命中白名单，否则给出可读错误。
 *
 * @param {Record<string, unknown>} input 形如 { protocol, edgeIpVersion, region }
 * @returns {{ ok: boolean, values: Record<string, string>, errors: Record<string, string> }}
 */
export function validateCloudflaredNetworkOptions(input = {}) {
  const values = {};
  const errors = {};
  for (const field of CLOUDFLARED_NETWORK_FIELDS) {
    const v = input[field];
    if (v === undefined) continue;
    if (typeof v !== 'string') {
      errors[field] = field + ' 必须是文本';
      continue;
    }
    const trimmed = v.trim();
    if (trimmed === '') {
      values[field] = '';
      continue;
    }
    const spec = CLOUDFLARED_NETWORK_FLAGS[field];
    if (!spec.values.includes(trimmed)) {
      errors[field] = field + ' 仅支持：' + spec.values.join(' / ');
      continue;
    }
    values[field] = trimmed;
  }
  return { ok: Object.keys(errors).length === 0, values, errors };
}

/**
 * 按"已配置值 + 实际二进制能力"构造要追加的启动参数。
 *
 * @param {Record<string, string>} values 已通过 validate 的值（缺省/空 = 不追加）
 * @param {Record<string, boolean>|null} supported 能力探测结果；null = 探测失败
 *   （保守策略：全部跳过并标注原因，隧道照常以默认参数启动）
 * @returns {{ args: string[], skipped: { field: string, reason: string }[] }}
 */
export function buildCloudflaredNetworkArgs(values = {}, supported = null) {
  const args = [];
  const skipped = [];
  for (const field of CLOUDFLARED_NETWORK_FIELDS) {
    const v = values?.[field];
    if (typeof v !== 'string' || v === '') continue; // 未配置 = 零变化
    const spec = CLOUDFLARED_NETWORK_FLAGS[field];
    if (supported === null) {
      skipped.push({ field, reason: '能力探测失败，保守跳过（保持默认参数启动）' });
      continue;
    }
    if (supported[field] !== true) {
      skipped.push({ field, reason: '当前二进制不支持 ' + spec.flag + '，已跳过' });
      continue;
    }
    args.push(spec.flag, v);
  }
  return { args, skipped };
}

/**
 * 能力探测判据（纯函数）：cloudflared 对未知 flag 的输出是
 * "flag provided but not defined"（本机 2024.10.0 实测基线）；
 * 其余一切输出（接受、枚举校验失败、token 校验失败…）都证明 flag 存在。
 * @param {string} commandOutput 探测命令的 stdout+stderr
 * @returns {boolean} true = 该二进制认识这个 flag
 */
export function parseFlagSupport(commandOutput) {
  const out = String(commandOutput ?? '').trim();
  if (!out) return false; // 空输出（没跑起来/被吞）→ 保守判为不支持，绝不带病传参
  return !/flag provided but not defined/i.test(out);
}
