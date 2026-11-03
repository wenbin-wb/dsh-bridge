// 诊断日志的落盘通道（issue #92 报告人实测的宿主日志限制）
//
// 背景：宿主的 cordis LoggerService 默认只挂一个内存环形缓冲 exporter，没有文件
// 或 console sink；桌面端 Electron 主进程只把子进程 stdout 转发出去，stderr 仅在
// 内存里保留 64KB 尾巴。结果是插件用 logger.info/warn 打的诊断，用户**根本捞不到**，
// 排查「经代理访问 401」这类问题时只能靠猜。
//
// 这里提供一个与 restart.log 同风格的落盘通道：
//   - 追加写入 `$DSH_HOME/dsh-bridge/diagnostics.log`（默认权限 600）；
//   - 超过上限时清空重写（只保留后续诊断），避免无限增长；
//   - 同时 echo 到 stderr（CLI / Docker 场景下直接可见，桌面端也能进崩溃诊断的尾巴）；
//   - 任何失败都吞掉——诊断不得影响代理主链路。
//
// 只写诊断信息（cookie 名哈希、authority、凭据路径），不写 secret / cookie 值。
import { closeSync, fstatSync, ftruncateSync, mkdirSync, openSync, writeSync } from 'node:fs';
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
  const line = `[${now.toISOString()}] ${String(message).trimEnd()}`;
  try {
    mkdirSync(dirname(filePath), { recursive: true });
    // 路径只解析一次，之后全部基于 fd 操作（fstat / ftruncate / write），
    // 避免 check-then-use 竞态（CodeQL js/file-system-race）。
    // 注意：Windows 上以 'a'（O_APPEND）打开句柄时 ftruncate 会 EPERM，
    // 所以用 'r+'（不存在则退回 'w'），写入位置显式交给 writeSync 的 position。
    let fd;
    try {
      fd = openSync(filePath, 'r+', 0o600);
    } catch (err) {
      if (err?.code !== 'ENOENT') throw err;
      fd = openSync(filePath, 'w', 0o600);
    }
    try {
      const size = fstatSync(fd).size;
      if (size > DIAGNOSTICS_LOG_MAX_BYTES) {
        ftruncateSync(fd, 0);
        writeSync(fd, `${line}\n`, 0);
      } else {
        writeSync(fd, `${line}\n`, size);
      }
    } finally {
      closeSync(fd);
    }
  } catch { /* 日志不可写不得影响主链路 */ }
  if (echo) {
    try { console.error(line); } catch { /* stderr 不可用时忽略 */ }
  }
  return line;
}
