#!/usr/bin/env node
// 假 cloudflared：行为由 FAKE_CF_MODE 环境变量驱动，供 CloudflaredManager 自愈测试使用。
// 不接触网络、不下载真实二进制；通过打印/退出码模拟 cloudflared 的握手与崩溃行为。
import { createServer } from 'node:http';
import { existsSync, writeFileSync } from 'node:fs';

const mode = process.env.FAKE_CF_MODE || 'version';

function write(s) { process.stderr.write(s + '\n'); }

// 可选：FAKE_CF_FAIL_MARKER 指向一个标记文件。首个实例创建该文件并正常启动；
// 之后（即被自愈重启出来的）实例发现文件已存在 → 模拟"重启时网络仍不通、握手失败"
// 直接秒退。用于验证：健康探针触发的整条重建链路不会把可自愈的断网推成终态 error。
const failMarker = process.env.FAKE_CF_FAIL_MARKER;
if (failMarker && existsSync(failMarker)) {
  write('ERR failed to connect (simulated: network still down)');
  setTimeout(() => process.exit(1), 30);
  // 顶层 await：阻断后续分支执行，同时让上面的 setTimeout 有机会退出
  await new Promise(() => {});
}
if (failMarker) writeFileSync(failMarker, '1');

// 可选：回显收到的 --token，用于验证 manager 的日志脱敏（真实 cloudflared 自带 ***** 掩码，
// 但脱敏不能依赖上游行为，故此处刻意原文回显）。
// FAKE_CF_SPLIT_TOKEN=1 时把 Token 切成两块分别写出（间隔 50ms），复现
// "Token 被切分在两个 stderr data 块之间"的场景——逐块独立脱敏会在此漏网。
if (process.env.FAKE_CF_ECHO_TOKEN === '1') {
  const argv = process.argv.slice(2);
  const tokenIdx = argv.indexOf('--token');
  if (tokenIdx !== -1) {
    const raw = argv[tokenIdx + 1];
    if (process.env.FAKE_CF_SPLIT_TOKEN === '1' && raw.length > 4) {
      const mid = Math.floor(raw.length / 2);
      // 管道分块只会在任意字节位置切开**同一条有序字节流**，绝不插入或重排内容。
      // 所以两半必须在字节流里相邻：先让本文件后面那些同步输出落地，再分两次写出
      // Token 的两半。若在其中间插入别的输出，就不是"跨块"，而是 Token 根本没出现。
      setTimeout(() => process.stderr.write(`INF Settings: map[token:${raw.slice(0, mid)}`), 60);
      setTimeout(() => process.stderr.write(`${raw.slice(mid)}]\n`), 160);
    } else {
      write(`INF Settings: map[no-autoupdate:true token:${raw}]`);
    }
  }
}

// ── 参数顺序校验（模拟真实 cloudflared 2024.10.0 的 flag 解析）────────────
// 若 FAKE_CF_STRICT=1：模拟真实 CLI——tunnel 子命令的全局 flag（如 --no-autoupdate）
// 必须在 run 之前；写在 run 之后会报 Incorrect Usage 并退出。
// 作用：让"flag 位置错误"这类 bug 在单测阶段暴露，而不是发布后被用户抓到。
if (process.env.FAKE_CF_STRICT === '1') {
  const argv = process.argv.slice(2);
  const runIdx = argv.indexOf('run');
  const noAutoIdx = argv.indexOf('--no-autoupdate');
  if (runIdx !== -1 && noAutoIdx > runIdx) {
    write('Incorrect Usage: flag provided but not defined: -no-autoupdate');
    process.exit(0);
  }
}

if (mode === 'version') {
  // 供 _checkManagedBinaryVersion / --version 校验用；钉死版本测试通过 binaryVersion 注入期望值
  process.stdout.write(`${process.env.FAKE_CF_VERSION || 'cloudflared version 2024.10.0 (built 2024-10-01)'}\n`);
  process.exit(0);
}

if (mode === 'crash-after-ready') {
  // 模拟：tunnel run 打出手握就绪文本 → 保持运行 → 一段时间后崩溃退出
  write('Registered tunnel connection');
  const delay = Number(process.env.FAKE_CF_READY_MS || 300);
  const crashIn = Number(process.env.FAKE_CF_CRASH_MS || 1500);
  setTimeout(() => {
    write('Registered tunnel connection'); // 确保 tryResolve 已触发
    setTimeout(() => process.exit(1), crashIn);
  }, delay);
  // 保持进程存活直到 exit
  setInterval(() => {}, 1000);
} else if (mode === 'exit-fast') {
  // 模拟：立即退出且无就绪文本（启动失败，如 token 错误）
  write('ERR failed to connect');
  setTimeout(() => process.exit(1), Number(process.env.FAKE_CF_EXIT_MS || 50));
} else if (mode === 'hang') {
  // 模拟：启动后不打印就绪、一直挂着（握手超时场景）
  write('Connecting...');
  setInterval(() => {}, 1000);
} else if (mode === 'fatal') {
  // 模拟确定性配置错误：打印 Incorrect Usage 后退出（如 CLI flag 顺序错误）
  write('Incorrect Usage: flag provided but not defined: -no-autoupdate');
  setTimeout(() => process.exit(0), 20);
} else if (mode === 'ready-then-hold') {
  write('Registered tunnel connection');
  setInterval(() => {}, 1000);
} else if (mode === 'silent-blackhole' || mode === 'healthy-metrics') {
  // 模拟"进程存活但边缘连接已全部掉光"（silent-blackhole），或健康的连接器（healthy-metrics）。
  // 起一个本地 metrics 服务自报 /ready 的 readyConnections，并打印真实 cloudflared 的
  // metrics 自报日志行——manager 的运行时健康探针即据此发现端口并判定存活。
  // FAKE_CF_RECOVER_MS：模拟"只是网络暂时全断、随后自行重连成功"——
  // 该时刻之后 /ready 恢复为 200 + readyConnections=2，用于验证探针不会误杀自愈中的连接器。
  const recoverMs = Number(process.env.FAKE_CF_RECOVER_MS || 0);
  const startedAt = Date.now();
  const server = createServer((req, res) => {
    if (req.url !== '/ready') {
      res.writeHead(404);
      res.end();
      return;
    }
    const healthy = mode === 'healthy-metrics'
      || (recoverMs > 0 && Date.now() - startedAt >= recoverMs);
    const status = healthy ? 200 : 503;
    const readyConnections = healthy ? 2 : 0;
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ status, readyConnections, connectorId: 'fake-connector' }));
  });
  server.listen(Number(process.env.FAKE_CF_METRICS_PORT || 0), '127.0.0.1', () => {
    // 顺序与真实 cloudflared 一致：先起 metrics，再注册隧道连接。
    // FAKE_CF_METRICS_DELAY_MS>0 时让 metrics 自报行"迟到"于就绪行，用于验证：
    // 地址迟到时探针必须补启，而不是永久不启用（安全网静默失效）。
    const metricsDelay = Number(process.env.FAKE_CF_METRICS_DELAY_MS || 0);
    // FAKE_CF_READY_DELAY_MS>0 时让"就绪行"晚于握手超时才出现，复现迟到的就绪：
    // manager 已按超时杀掉进程并排定重试，随后同一进程才吐出就绪行。
    const readyDelay = Number(process.env.FAKE_CF_READY_DELAY_MS || 0);
    const line = () => write(`INF Starting metrics server on 127.0.0.1:${server.address().port}/metrics`);
    const ready = () => write('Registered tunnel connection');
    if (metricsDelay > 0) {
      if (readyDelay > 0) setTimeout(ready, readyDelay); else ready();
      setTimeout(line, metricsDelay);
    } else if (readyDelay > 0) {
      line();
      setTimeout(ready, readyDelay);
    } else {
      line();
      ready();
    }
  });
  setInterval(() => {}, 1000);
}
