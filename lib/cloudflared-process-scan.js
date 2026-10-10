// "同 token 的另一个 cloudflared" 检测（issue #71 第 4 条）
//
// 场景：用户的系统服务（Windows 服务 / systemd unit）与插件用同一个 tunnel token
// 同时运行——两边互相看不见，面板只显示"半张图"（对方假死/503 时插件无从得知）。
// issue 实测：系统服务 Cloudflared 已 503/readyConnections=0 持续 50 分钟，插件毫不知情。
//
// 设计原则：
//   1. 只在隧道启动时扫一次，异步执行，绝不阻塞启动；
//   2. 比对逻辑全部是纯函数（进程列表与文件读取都可注入，便于单测）；
//   3. 全链路 fail-open：进程表读不到、token-file 读不到 → 返回"未确认"而不是报错
//      （在部分环境进程扫描会被权限/安全软件拦截，这是预期降级而非故障）；
//   4. 绝不打印 token 本体：结果只含 PID 与来源 flag。

import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

/**
 * 从一条进程命令行提取 cloudflared 的鉴权凭据。
 * 支持：--token X / --token=X / --token-file X / --token-file=X（值可带引号）。
 * @param {string} cmdline
 * @returns {{ via: 'token'|'token-file', value: string }|null} 非 cloudflared 或未带凭据 → null
 */
export function extractCloudflaredAuth(cmdline) {
  const s = String(cmdline ?? '');
  if (!s.includes('cloudflared')) return null;
  const tokens = s.match(/(?:[^\s"]+|"[^"]*")+/g) ?? [];
  const clean = tokens.map((t) => t.replace(/^"|"$/g, ''));
  for (let i = 0; i < clean.length; i++) {
    const t = clean[i];
    if (t === '--token' || t === '--token-file') {
      const v = clean[i + 1];
      if (v) return { via: t === '--token' ? 'token' : 'token-file', value: v };
      return null;
    }
    if (t.startsWith('--token=')) {
      const v = t.slice('--token='.length);
      return v ? { via: 'token', value: v } : null;
    }
    if (t.startsWith('--token-file=')) {
      const v = t.slice('--token-file='.length);
      return v ? { via: 'token-file', value: v } : null;
    }
  }
  return null;
}

/**
 * 在候选进程里找与自己 token 相同的 cloudflared。
 * @param {object} opts
 * @param {string} opts.myToken 本插件正在使用的 tunnel token
 * @param {{pid:number, cmdline:string}[]} opts.processes 候选进程（调用方已预筛或不过滤均可）
 * @param {number[]} [opts.excludePids] 排除的 PID（自己拉起的 cloudflared）
 * @param {(path:string)=>string} [opts.readFileFn] 读 token-file 的注入点
 * @returns {{pid:number, via:string}|null} 命中 → 返回；token-file 读不到 → 视为无法确认，不告警
 */
export function findSameTokenRunner({ myToken, processes, excludePids = [], readFileFn }) {
  const my = String(myToken ?? '').trim();
  if (!my || !Array.isArray(processes)) return null;
  const read = readFileFn ?? ((p) => readFileSync(p, 'utf8'));
  const excluded = new Set(excludePids.map(Number));
  for (const p of processes) {
    if (!p || excluded.has(Number(p.pid))) continue;
    const auth = extractCloudflaredAuth(p.cmdline);
    if (!auth) continue;
    if (auth.via === 'token') {
      if (String(auth.value).trim() === my) return { pid: Number(p.pid), via: 'token' };
    } else {
      let fileToken;
      try { fileToken = String(read(auth.value)).trim(); } catch { fileToken = null; }
      // 文件读不到（权限/路径失效）→ 无法确认，fail-open 不告警
      if (fileToken && fileToken === my) return { pid: Number(p.pid), via: 'token-file' };
    }
  }
  return null;
}

/** 解析 `ps -Ao pid=,command=` 输出（macOS 用） */
export function parsePsProcesses(output) {
  const out = [];
  for (const line of String(output ?? '').split('\n')) {
    const m = /^\s*(\d+)\s+(.*)$/.exec(line);
    if (m) out.push({ pid: Number(m[1]), cmdline: m[2] });
  }
  return out;
}

/** 解析 PowerShell "PID CMDLINE" 行输出（Windows 用） */
export function parsePowerShellProcesses(output) {
  const out = [];
  for (const line of String(output ?? '').split('\n')) {
    const m = /^\s*(\d+)\s+(.*)$/.exec(line);
    if (m) out.push({ pid: Number(m[1]), cmdline: m[2] });
  }
  return out;
}

/** Linux：直接读 /proc（同机进程 cmdline 通常可读；个别 pid 读失败就跳过） */
export function listLinuxProcesses({ readdirFn = readdirSync, readFileFn = readFileSync } = {}) {
  const out = [];
  let entries;
  try { entries = readdirFn('/proc'); } catch { return out; }
  for (const name of entries) {
    if (!/^\d+$/.test(name)) continue;
    try {
      const cmdline = String(readFileFn('/proc/' + name + '/cmdline', 'utf8')).replace(/\0/g, ' ').trim();
      if (cmdline.includes('cloudflared')) out.push({ pid: Number(name), cmdline });
    } catch { /* 个别进程无权限/已退出：跳过 */ }
  }
  return out;
}

/** 平台无关的默认进程枚举：Linux=/proc，macOS=ps，Windows=PowerShell；任何失败 → []（fail-open） */
export function listCloudflaredProcesses({ platformName = process.platform, execFn = execFileSync } = {}) {
  try {
    if (platformName === 'linux') return listLinuxProcesses();
    if (platformName === 'darwin') {
      const out = execFn('ps', ['-Ao', 'pid=,command='], { encoding: 'utf8', timeout: 3000 });
      return parsePsProcesses(out).filter((p) => p.cmdline.includes('cloudflared'));
    }
    if (platformName === 'win32') {
      const script = '$ErrorActionPreference="SilentlyContinue";'
        + 'Get-CimInstance Win32_Process |'
        + 'Where-Object { $_.CommandLine -like "*cloudflared*" } |'
        + 'ForEach-Object { "$($_.ProcessId) $($_.CommandLine)" }';
      const out = execFn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script],
        { encoding: 'utf8', timeout: 5000 });
      return parsePowerShellProcesses(out);
    }
    return [];
  } catch {
    return []; // 权限不足 / 安全软件拦截 / 超时：一律静默降级为"未检出"，绝不影响隧道启动
  }
}

/**
 * 扫描"与本插件同 token 的另一个 cloudflared"（启动时调用一次）。
 * @param {object} opts
 * @param {string} opts.myToken
 * @param {() => number[]} [opts.getExcludePids] 结果计算前才求值（拿到自己子进程的 PID）
 * @param {() => {pid:number,cmdline:string}[]} [opts.listProcesses]
 * @param {(path:string)=>string} [opts.readFileFn]
 * @returns {Promise<{pid:number, via:string}|null>}
 */
export async function scanSameTokenRunner({ myToken, getExcludePids, listProcesses, readFileFn } = {}) {
  try {
    if (!myToken || !String(myToken).trim()) return null;
    const processes = (listProcesses ?? listCloudflaredProcesses)();
    const excludePids = typeof getExcludePids === 'function' ? (getExcludePids() ?? []) : [];
    return findSameTokenRunner({ myToken, processes, excludePids, readFileFn });
  } catch {
    return null; // fail-open：探测失败等价于"未检出"
  }
}
