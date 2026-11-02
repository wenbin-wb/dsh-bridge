// 诊断日志的落盘通道（issue #92 报告人实测的宿主日志限制）
//
// 背景：宿主的 cordis LoggerService 默认只挂一个内存环形缓冲 exporter，没有文件
// 或 console sink；桌面端 Electron 主进程只把子进程 stdout 转发出去，stderr 仅在
// 内存里保留 64KB 尾巴。结果是插件用 logger.info/warn 打的诊断，用户**根本捞不到**，
// 排查「经代理访问 401」这类问题时只能靠猜。
//
// 这里提供一个与 restart.log 同风格的落盘通道：
//   - 追加写入 `$DSH_HOME/dsh-bridge/diagnostics.log`（默认权限 600）；
//   - 超过上限时轮转一次（保留 .1），避免无限增长；
//   - 同时 echo 到 stderr（CLI / Docker 场景下直接可见，桌面端也能进崩溃诊断的尾巴）；
//   - 任何失败都吞掉——诊断不得影响代理主链路。
//
// 只写诊断信息（cookie 名哈希、authority、凭据路径），不写 secret / cookie 值。
import { appendFileSync, existsSync, mkdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

/** 单个诊断文件的大小上限（超过后轮转一次）。 */
export const DIAGNOSTICS_LOG_MAX_BYTES = 512 * 1024;

/**
 * 默认诊断日志路径：`$DSH_HOME/dsh-bridge/diagnostics.log`（与 restart.log 同目录）。
 *
 * @param {NodeJS.ProcessEnv} [env] 便于测试注入
 * @returns {string}
 */
export function defaultDiagnosticsLogPath(env = process.env) {
  const dshHome = env?.DSH_HOME || join(homedir(), '.dsh');
  return join(dshHome, 'dsh-bridge', 'diagnostics.log');
}

/**
 * 追加一行诊断日志（文件 + stderr），绝不抛出。
 *
 * @param {string} message 诊断正文（不要放 secret / 完整 cookie）
 * @param {object} [opts]
 * @param {string} [opts.filePath] 目标文件（默认 defaultDiagnosticsLogPath()）
 * @param {Date} [opts.now] 时间戳（测试注入）
 * @param {boolean} [opts.echo] 是否同时写 stderr（默认 true）
 * @returns {string} 实际写入的行（便于测试断言）
 */
export function appendDiagnostic(message, {
  filePath = defaultDiagnosticsLogPath(),
  now = new Date(),
  echo = true,
} = {}) {
  const line = `[${now.toISOString()}] ${String(message).replace(/\s+$/u, '')}`;
  try {
    mkdirSync(dirname(filePath), { recursive: true });
    if (existsSync(filePath) && statSync(filePath).size > DIAGNOSTICS_LOG_MAX_BYTES) {
      const rotated = `${filePath}.1`;
      try { rmSync(rotated, { force: true }); } catch { /* 旧备份删不掉也继续 */ }
      try { renameSync(filePath, rotated); } catch { /* 轮转失败时继续追加 */ }
    }
    appendFileSync(filePath, `${line}\n`, { mode: 0o600 });
  } catch { /* 日志不可写不得影响主链路 */ }
  if (echo) {
    try { console.error(line); } catch { /* stderr 不可用时忽略 */ }
  }
  return line;
}
