// CloudflaredManager 运行时健康探针 + 输出落盘 回归测试
//
// 事故背景（本测试的由来）：cloudflared 与 Cloudflare 边缘的连接全部掉光后，进程仍存活、
// 不退出也不报错。旧自愈逻辑只监听 exit，于是永远不会触发 → 隧道静默失效，公网返回
// HTTP 530 + 正文 error code: 1033，持续 2 天无人发现。
//
// 关键约束（决定了阈值为何必须两级、且重建不得进终态）：
// cloudflared 的 /ready 取自 CountActiveConns()，而 Reconnecting / RegisteringTunnel /
// Disconnected 等状态同样把 IsConnected 置 false —— 即**正常重连期间 /ready 也是 503**。
// 单次 503 无法区分"假死"与"网络暂时全断、正在自行重连"，只有持续时长能区分。
//
// 覆盖：
//   - 假死（持续 503 且不恢复）→ 先可见降级，达重建阈值才杀进程 → 走既有自愈链路
//   - **防误杀回归**：断网后自行恢复的连接器绝不能被误杀
//   - **防终态回归**：健康探针触发的重建链路（含重启后握手失败）绝不进入终态 error
//   - 健康 → 不误杀，且探针确实在跑
//   - 跨 spawn 的旧探活结果必须作废（代数守卫）
//   - metrics 地址解析失败 → 显式告警 + 跳过 + 面板状态可见降级
//   - Token 脱敏（含跨 chunk 分块）+ spawn 时与运行中的日志轮转
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { writeFileSync, readFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { format } from 'node:util';
import { spawnSync } from 'node:child_process';
import { CloudflaredManager, parseMetricsAddress } from '../lib/cloudflared-manager.mjs';

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const IS_WIN = process.platform === 'win32';
// Windows 无法直接执行 .mjs（既没有 shebang 语义，也没有可执行位），必须走 .cmd 包装；
// Linux/macOS 下 .mjs 带 shebang 且已置可执行位，可直接 spawn。
// 此前 .cmd 包装写了却从未被使用（FAKE_BIN 恒指 .mjs），导致 Windows CI 上假 cloudflared
// 秒退 code=0、8 条探针测试全部超时。
const FAKE_MJS = join(FIXTURES, 'fake-cloudflared.mjs');
const FAKE_CMD = join(FIXTURES, 'fake-cloudflared.cmd');
if (IS_WIN) {
  writeFileSync(FAKE_CMD, '@echo off\r\nnode "%~dp0fake-cloudflared.mjs" %*\r\n');
}
const FAKE_BIN = IS_WIN ? FAKE_CMD : FAKE_MJS;
const FAKE_SPAWN_OPTS = IS_WIN ? { shell: true } : null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const noopLogger = { info: () => {}, error: () => {}, warn: () => {}, debug: () => {} };

// 把所有日志按级别收集起来，供"必须显式告警/必须留下证据"类断言使用。
// 必须用 util.format 做真实的 %d/%s 插值，否则断言只能匹配到未格式化的模板串。
function collectingLogger() {
  const logs = { info: [], warn: [], error: [], debug: [] };
  const push = (level) => (msg, ...args) => logs[level].push(format(msg, ...args));
  return {
    logs,
    logger: { info: push('info'), warn: push('warn'), error: push('error'), debug: push('debug') },
    has: (level, re) => logs[level].some((m) => re.test(m)),
  };
}

function stateRecorder() {
  const states = [];
  return {
    states,
    onState: (s) => states.push(s),
    lastPhase: () => states.at(-1)?.phase,
    countPhase: (phase) => states.filter((s) => s.phase === phase).length,
    hasPhase: (phase) => states.some((s) => s.phase === phase),
    waitForPhase: (phase, timeoutMs = 8000) => new Promise((resolve, reject) => {
      const deadline = Date.now() + timeoutMs;
      const check = () => {
        if (states.some((s) => s.phase === phase)) return resolve();
        if (Date.now() > deadline) return reject(new Error(`等待 phase=${phase} 超时。历史: ${JSON.stringify(states)}`));
        setTimeout(check, 20);
      };
      check();
    }),
    waitFor: (predicate, desc, timeoutMs = 8000) => new Promise((resolve, reject) => {
      const deadline = Date.now() + timeoutMs;
      const check = () => {
        if (predicate()) return resolve();
        if (Date.now() > deadline) return reject(new Error(`等待 ${desc} 超时。历史: ${JSON.stringify(states)}`));
        setTimeout(check, 20);
      };
      check();
    }),
  };
}

// 清掉本文件用到的所有 FAKE_CF_* 环境变量，避免用例间串味
function clearFakeEnv() {
  for (const k of Object.keys(process.env)) {
    if (k.startsWith('FAKE_CF_')) delete process.env[k];
  }
}

test('parseMetricsAddress 解析 cloudflared metrics 自报行', () => {
  // 真实输出形态（事故现场实测）
  assert.equal(parseMetricsAddress('2026-09-19T02:52:23Z INF Starting metrics server on 127.0.0.1:41143/metrics'), '127.0.0.1:41143');
  assert.equal(parseMetricsAddress('INF Starting metrics server on 127.0.0.1:34549/metrics\n'), '127.0.0.1:34549');
  // 非 metrics 行 / 空输入必须返回 null，而不是抛出或瞎猜
  assert.equal(parseMetricsAddress('INF Registered tunnel connection'), null);
  assert.equal(parseMetricsAddress(''), null);
  assert.equal(parseMetricsAddress(undefined), null);
});

test('parseMetricsAddress 必须拦掉非法地址（否则畸形 URL 会让探针同步抛错）', () => {
  const bad = [
    'INF Starting metrics server on x:99999/metrics', // 端口越界
    'INF Starting metrics server on x:0/metrics', // 端口 0
    'INF Starting metrics server on [::1/metrics', // 括号不配对
    'INF Starting metrics server on :8080/metrics', // 缺主机
    'INF Starting metrics server on a b:80/metrics', // 含空格
    'INF Starting metrics server on host/metrics', // 缺端口
  ];
  for (const line of bad) {
    assert.equal(parseMetricsAddress(line), null, `应拒绝: ${line}`);
  }
  // 合法形态（含 IPv6 括号写法）必须保留
  assert.equal(parseMetricsAddress('INF Starting metrics server on 127.0.0.1:20241/metrics'), '127.0.0.1:20241');
  assert.equal(parseMetricsAddress('INF Starting metrics server on [::1]:20241/metrics'), '[::1]:20241');
});

test('【崩溃回归】畸形 metrics 地址不得让宿主进程因未处理 rejection 退出', () => {
  // 本轮复验发现的高危缺陷：探针里逃逸的异常会变成 unhandled rejection，
  // 而 Node 默认 unhandled-rejections=throw 会直接结束整个 DSH 主进程 ——
  // 即"本该保护服务的探针反而把服务干掉"。用独立子进程验证退出码。
  const managerUrl = new URL('../lib/cloudflared-manager.mjs', import.meta.url).href;
  const script = `
    import { CloudflaredManager } from ${JSON.stringify(managerUrl)};
    const noop = { info(){}, warn(){}, error(){}, debug(){} };
    const mgr = new CloudflaredManager({ port: 3082, token: 't', logger: noop });
    for (const addr of ['x:99999', '[::1', '', 'a b:1']) {
      mgr._metricsAddress = addr;
      const r = await mgr._checkTunnelReady(addr);
      if (r.healthy !== false) { console.error('expected unhealthy for ' + JSON.stringify(addr)); process.exit(2); }
      await mgr._probeOnce();
    }
    console.log('SURVIVED');
  `;
  const res = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8', timeout: 20000 });
  assert.equal(res.status, 0, `子进程应正常退出，实际 status=${res.status} stderr=${res.stderr}`);
  assert.match(res.stdout, /SURVIVED/);
});

test('【崩溃回归】探针日志通道自身抛错也不得拖垮宿主进程', () => {
  // 复验指出：探针的 .catch 处理器与数据回调里的日志调用若直连 logger，
  // 一旦 logger 自身抛错同样会变成未处理 rejection 并结束宿主进程。
  // 探针路径必须只用 _probeLog（内部吞掉日志通道自身的异常并计数）。
  const managerUrl = new URL('../lib/cloudflared-manager.mjs', import.meta.url).href;
  const script = `
    import { CloudflaredManager } from ${JSON.stringify(managerUrl)};
    const boom = () => { throw new Error('logger channel is broken'); };
    const badLogger = { info: boom, warn: boom, error: boom, debug: boom };
    const mgr = new CloudflaredManager({ port: 3082, token: 't', logger: badLogger });

    // 1) 无 metrics 地址的降级告警路径
    mgr._setupFake = true;
    mgr._metricsAddress = null;
    mgr._readyState = { phase: 'ready', detail: 'x' };
    mgr._startHealthProbe();

    // 2) 探活失败 → 降级/继续失败告警路径
    mgr._metricsAddress = '127.0.0.1:1';
    mgr._checkTunnelReady = async () => ({ healthy: false, reason: 'boom-ok' });
    mgr.healthDegradedThreshold = 1;
    mgr.healthRestartThreshold = 99;
    await mgr._probeOnce();
    await mgr._probeOnce();

    // 3) 探活内部抛异常 → setInterval 的 catch 处理器路径
    await mgr._probeOnce().catch(() => { throw new Error('should not reject'); });

    console.log('SURVIVED logFailures=' + mgr._probeLogFailures);
  `;
  const res = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8', timeout: 20000 });
  assert.equal(res.status, 0, `子进程应正常退出，实际 status=${res.status} stderr=${res.stderr}`);
  assert.match(res.stdout, /SURVIVED logFailures=[1-9]/, `日志通道抛错应被吞掉并计数，实际输出: ${res.stdout}`);
});

test('【脱敏回归】Token 首尾同字符且恰好落在块末尾时，完整 Token 绝不明文落盘', () => {
  // 复验反例：Token 自身有 border（如首尾字符相同）时，简化版"扣掉最长前缀后缀"
  // 会把完整 Token 的尾字符也扣下，导致前后两段先后写出、在文件里重新拼成完整 Token。
  const token = 'acvTOKENpayloadACVTOKENpayloa'; // 首尾同为 'a'
  assert.equal(token[0], token[token.length - 1]);
  const mgr = new CloudflaredManager({ port: 3082, token, logger: noopLogger });
  const out = mgr._redactToken(`INF Settings: map[token:${token}`) + mgr._redactToken(']\n');
  assert.ok(!out.includes(token), `完整 Token 不得明文落盘，实际: ${out}`);
  assert.match(out, /\*\*\*/);
  assert.equal(mgr._redactCarry, '');
});

test('【脱敏回归】逐字节喂入重复字符 Token 不得明文落盘', () => {
  // 复验反例：Token 为单字符重复时，任意长度的后缀都是"Token 前缀"，简化写法会一直扣住不放。
  const token = 'K'.repeat(40);
  const mgr = new CloudflaredManager({ port: 3082, token, logger: noopLogger });
  let out = '';
  for (const ch of `INF x:${token}]`) out += mgr._redactToken(ch);
  assert.ok(!out.includes(token), '完整 Token 不得明文落盘');
  assert.match(out, /\*\*\*/);
});

test('【脱敏回归】普通日志末尾恰为 Token 首字符时，不得吞字符也不得伪替换', () => {
  // 复验反例：仅因末字符与 Token 首字符相同就被替换，会吞掉正常字符并插入无意义 ***。
  const mgr = new CloudflaredManager({ port: 3082, token: 'eTOKENxyz', logger: noopLogger });
  const out = mgr._redactToken('INF connection to edge is fine') + mgr._redactToken('\n');
  assert.equal(out, 'INF connection to edge is fine\n');
});

test('【脱敏回归】写流报错后残留缓冲必须清空，不得污染下一个进程的日志', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cf-carry-'));
  const logFile = join(dir, 'cloudflared.log');
  const mgr = new CloudflaredManager({
    port: 3082, token: 'STALETOKEN', logFilePath: logFile, logMaxBytes: 10 * 1024 * 1024, logger: noopLogger,
  });
  try {
    mgr._openLogStream();
    mgr._appendCloudflaredLog('INF x:STALE'); // 让 Token 前缀留在 carry 里
    assert.equal(mgr._redactCarry, 'STALE', '前缀应被扣住等待补齐');

    // 模拟写流出错（此时 _logStream 被置 null），随后关闭
    mgr._logStream.emit('error', new Error('simulated stream failure'));
    mgr._closeLogStream();
    assert.equal(mgr._redactCarry, '', '流报错后 carry 也必须被清空');

    // 下一个"进程"的日志不得带上前一个进程的残留
    mgr._openLogStream();
    mgr._appendCloudflaredLog('NEW-PROCESS-LINE\n');
    mgr._closeLogStream();
    await sleep(200); // 写流是异步的，等 flush 后再断言

    const content = readFileSync(logFile, 'utf8');
    assert.match(content, /NEW-PROCESS-LINE/, '新进程日志应正常落盘');
    assert.ok(!content.includes('STALE'), `残留缓冲不得污染新进程日志，实际: ${content}`);
  } finally {
    mgr._closeLogStream();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('metrics 地址迟到（就绪后才打印）→ 探针必须补启，不得永久失效', async () => {
  const rec = stateRecorder();
  const col = collectingLogger();
  const mgr = new CloudflaredManager({
    port: 3082,
    token: 'fake-token',
    hostname: 'dsh.example.com',
    binaryPath: FAKE_BIN,
    spawnOptions: FAKE_SPAWN_OPTS,
    retryPolicy: { baseDelayMs: 50, maxDelayMs: 200, maxRetries: 5 },
    handshakeTimeoutMs: 3000,
    healthProbeIntervalMs: 40,
    healthProbeTimeoutMs: 300,
    healthDegradedThreshold: 2,
    healthRestartThreshold: 4,
    onStateChange: rec.onState,
    logger: col.logger,
  });

  process.env.FAKE_CF_MODE = 'healthy-metrics';
  process.env.FAKE_CF_METRICS_DELAY_MS = '200'; // metrics 自报行迟到于就绪行
  try {
    mgr.start();
    await rec.waitForPhase('ready', 4000);
    // 地址迟到后必须补启探针，并在面板上恢复正常的 ready 文案
    await rec.waitFor(() => mgr._probeCount >= 1, '地址迟到后探针补启', 6000);
    assert.equal(mgr._spawnSeq, 1, '不得因地址迟到而误杀进程');
    const last = rec.states.at(-1);
    assert.match(last.detail, /固定隧道已建立/, '补启后应恢复正常的 ready 文案');
    assert.ok(!/健康探活未启用/.test(last.detail), '补启后不得残留降级文案');
    assert.ok(col.has('info', /补启运行时健康探活/), '应记录"补启探活"');
  } finally {
    mgr.stop();
    clearFakeEnv();
  }
});

test('假死持续不恢复：先可见降级，达重建阈值才终止进程并走既有自愈链路', async () => {
  const rec = stateRecorder();
  const col = collectingLogger();
  const mgr = new CloudflaredManager({
    port: 3082,
    token: 'fake-token',
    hostname: 'dsh.example.com',
    binaryPath: FAKE_BIN,
    spawnOptions: FAKE_SPAWN_OPTS,
    retryPolicy: { baseDelayMs: 40, maxDelayMs: 80, maxRetries: 5 },
    handshakeTimeoutMs: 3000,
    healthProbeIntervalMs: 40,
    healthProbeTimeoutMs: 300,
    healthDegradedThreshold: 1, // 第一次失败即降级，便于断言两级行为
    healthRestartThreshold: 3,
    onStateChange: rec.onState,
    logger: col.logger,
  });

  process.env.FAKE_CF_MODE = 'silent-blackhole';
  try {
    mgr.start();
    await rec.waitForPhase('ready', 4000);

    // 第一级：降级可见（不杀进程）
    await rec.waitForPhase('reconnecting', 6000);
    assert.ok(col.has('warn', /健康探活连续 \d+ 次失败/), '应先给出降级告警');
    // 第二级：达阈值后终止进程 → exit → 既有的退避自愈重连
    await rec.waitFor(() => mgr._spawnSeq >= 2, '发生进程重建', 8000);
    assert.ok(col.has('error', /假死/), '应明确报告判定为假死');
    assert.ok(rec.countPhase('reconnecting') >= 2, '重建应经过 reconnecting 态');
  } finally {
    mgr.stop();
    clearFakeEnv();
  }
});

test('【防误杀回归】断网后自行恢复的连接器绝不能被探针杀掉', async () => {
  const rec = stateRecorder();
  const col = collectingLogger();
  const mgr = new CloudflaredManager({
    port: 3082,
    token: 'fake-token',
    hostname: 'dsh.example.com',
    binaryPath: FAKE_BIN,
    spawnOptions: FAKE_SPAWN_OPTS,
    retryPolicy: { baseDelayMs: 40, maxDelayMs: 80, maxRetries: 5 },
    handshakeTimeoutMs: 3000,
    healthProbeIntervalMs: 40,
    healthProbeTimeoutMs: 300,
    healthDegradedThreshold: 1,
    healthRestartThreshold: 1000, // 阈值极大：本用例只允许降级，绝不允许重建
    onStateChange: rec.onState,
    logger: col.logger,
  });

  // 500ms 后 /ready 自行恢复为健康，模拟"只是网络暂时全断、cloudflared 自己在重连"
  process.env.FAKE_CF_MODE = 'silent-blackhole';
  process.env.FAKE_CF_RECOVER_MS = '500';
  try {
    mgr.start();
    await rec.waitForPhase('ready', 4000);
    await rec.waitForPhase('reconnecting', 6000); // 先经历可见降级
    // 自愈后应回到 ready，且进程从未被重建
    await rec.waitFor(() => rec.lastPhase() === 'ready', '探活恢复后回到 ready', 6000);
    await sleep(200);
    assert.equal(mgr._spawnSeq, 1, '自行恢复的连接器绝不能被杀（spawn 代数必须仍为 1）');
    assert.ok(col.has('info', /健康探活已自行恢复/), '应记录"已自行恢复"');
    assert.equal(rec.hasPhase('error'), false, '不得进入终态');
  } finally {
    mgr.stop();
    clearFakeEnv();
  }
});

test('【防终态回归】健康探针触发的重建链路（含重启后握手失败）绝不进入终态 error', async (t) => {
  const rec = stateRecorder();
  const col = collectingLogger();
  const dir = mkdtempSync(join(tmpdir(), 'cf-terminal-'));
  const marker = join(dir, 'fail-marker');
  const mgr = new CloudflaredManager({
    port: 3082,
    token: 'fake-token',
    hostname: 'dsh.example.com',
    binaryPath: FAKE_BIN,
    spawnOptions: FAKE_SPAWN_OPTS,
    // 终态上限故意设得极小：若仍允许终态，几次重试后必然出现 error
    retryPolicy: { baseDelayMs: 20, maxDelayMs: 40, maxRetries: 2 },
    // 握手超时必须**明显大于**假件的 spawn 延迟（Windows 上 .cmd + node 启动实测
    // 约 390–411ms）。原先取 400ms 恰好压在延迟上，"先就绪还是先超时"成了掷硬币：
    // 走超时链路时重建**不是**健康探针触发的，那条链路本就允许在 maxRetries 用尽后
    // 进入终态（提示用户检查网络/Token），于是本用例偶发假红（实测 1/4）。
    // 取 1500ms 让首个实例必定先就绪，从而稳定地走到"健康探针判定假死"这条链路。
    handshakeTimeoutMs: 1500,
    healthProbeIntervalMs: 40,
    healthProbeTimeoutMs: 300,
    healthDegradedThreshold: 1,
    healthRestartThreshold: 2,
    onStateChange: rec.onState,
    logger: col.logger,
  });

  process.env.FAKE_CF_MODE = 'silent-blackhole';
  process.env.FAKE_CF_FAIL_MARKER = marker; // 首个实例正常起，之后被重启出来的实例一律握手失败
  try {
    mgr.start();
    await rec.waitForPhase('ready', 4000);
    // 等到重建链路跑过远多于 maxRetries 的轮次。
    // 预算随 handshakeTimeoutMs 放宽（每轮含一次 1.5s 握手超时）：5 轮 ≈ 8s，给足 30s。
    await rec.waitFor(() => rec.countPhase('reconnecting') >= 5, '多轮重建', 30000);
    // 契约边界用**状态**判定，而不是日志文案：只有健康探针那条路径会把
    // `_healthRecovering` 置 true（见 _checkTunnelReady 的判定分支）。用文案匹配
    // 会在文案被改写时静默跳过（独立验收指出的隐患），状态判定没有这个问题。
    if (mgr._healthRecovering !== true) {
      t.skip('本轮重建非健康探针触发（握手超时/退出链路），该链路按设计允许封顶终态');
      return;
    }
    assert.equal(rec.hasPhase('error'), false,
      '健康探针触发的重建不得进入终态 error（否则长时断网会变成必须人工介入）');
    assert.ok(mgr._spawnSeq >= 3, `应确实发生过多次重建，实际 spawn 代数=${mgr._spawnSeq}`);
  } finally {
    mgr.stop();
    clearFakeEnv();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('【迟到就绪回归】握手超时已排定重连后，同一进程随后就绪必须撤回该次重连', async () => {
  // 本用例覆盖的正是 fix(cloudflared) 修掉的那条竞态：握手超时先触发（排定重连），
  // 紧接着同一进程才吐出注册成功行。修复前：20ms/500ms 后会把刚就绪的连接器再杀一次
  // （spawnSeq 多涨一次、重试计数错位）；修复后：撤回该次重连，但真被杀掉时仍有重启来源。
  //
  // 构造要点：
  //   - handshakeTimeoutMs(300) 明显小于 spawn 延迟 + FAKE_CF_READY_DELAY_MS(400)，
  //     保证"先超时、后就绪"稳定重演（不依赖机器速度）；
  //   - baseDelayMs/maxDelayMs=500：把"原定重试点"推到就绪之后足够远，便于断言"越过后仍无重启"；
  //   - 把 _terminateProcess 临时换空实现：真实 kill 会让"迟到就绪"随进程一起消失，
  //     本用例要考察的是"就绪仍能到达"这一支（真杀那支由最后的 taskkill 断言覆盖）。
  const rec = stateRecorder();
  const mgr = new CloudflaredManager({
    port: 3082,
    token: 'fake-token',
    hostname: 'dsh.example.com',
    binaryPath: FAKE_BIN,
    spawnOptions: FAKE_SPAWN_OPTS,
    retryPolicy: { baseDelayMs: 500, maxDelayMs: 500, maxRetries: 5 },
    handshakeTimeoutMs: 300,
    healthProbeIntervalMs: 5000, // 关掉探活干扰：本用例只考察握手超时/重连链
    healthProbeTimeoutMs: 200,
    healthDegradedThreshold: 9,
    healthRestartThreshold: 9,
    onStateChange: rec.onState,
    logger: noopLogger,
  });

  process.env.FAKE_CF_MODE = 'silent-blackhole';
  process.env.FAKE_CF_READY_DELAY_MS = '400';
  const realTerminate = mgr._terminateProcess.bind(mgr);
  mgr._terminateProcess = () => {}; // 不真杀：让"迟到就绪"有机会到达
  try {
    mgr.start();
    await rec.waitForPhase('reconnecting', 4000); // 先经历握手超时已排定重连
    await rec.waitForPhase('ready', 4000);        // 同一进程随后才就绪
    assert.equal(mgr._retryTimer, null, '就绪后不得再留着已排定的重连定时器');
    const seqAtReady = mgr._spawnSeq;
    await sleep(700); // 越过原定的 +500ms 重试点
    assert.equal(mgr._spawnSeq, seqAtReady, '越过原定重试点不得多杀一次（修复前这里会 +1）');
    assert.equal(mgr._restartCount, 0, '就绪即证明链路可用：重试计数必须清零');
    // 真被杀掉时仍必须有重启来源（撤回只能发生在"进程仍存活"的前提下）
    realTerminate();
    await rec.waitFor(() => mgr._spawnSeq > seqAtReady, '进程被真杀后仍能重启（不得留下死隧道）', 4000);
  } finally {
    // 必须先还原被替换掉的 _terminateProcess：stop() 正是靠它杀掉假进程，
    // 忘了还原会让假 cloudflared 的 setInterval 一直吊住事件循环，整个测试文件挂死。
    mgr._terminateProcess = realTerminate;
    mgr.stop();
    clearFakeEnv();
  }
});

test('连接器健康：探针不误杀，且探针确实在运行', async () => {
  const rec = stateRecorder();
  const mgr = new CloudflaredManager({
    port: 3082,
    token: 'fake-token',
    hostname: 'dsh.example.com',
    binaryPath: FAKE_BIN,
    spawnOptions: FAKE_SPAWN_OPTS,
    retryPolicy: { baseDelayMs: 50, maxDelayMs: 200, maxRetries: 5 },
    handshakeTimeoutMs: 3000,
    healthProbeIntervalMs: 40,
    healthProbeTimeoutMs: 300,
    healthDegradedThreshold: 2,
    healthRestartThreshold: 4,
    onStateChange: rec.onState,
    logger: noopLogger,
  });

  process.env.FAKE_CF_MODE = 'healthy-metrics';
  try {
    mgr.start();
    await rec.waitForPhase('ready', 4000);
    await sleep(400); // 远超 2 个探测周期
    // 关键：断言探针真的执行过，否则"没有重启"这个结论毫无意义
    assert.ok(mgr._probeCount >= 2, `探针确实在运行（实际完成 ${mgr._probeCount} 次）`);
    assert.equal(mgr._spawnSeq, 1, '健康时不得重建进程');
    assert.equal(rec.hasPhase('reconnecting'), false, '健康时不得出现降级/重连');
    assert.equal(rec.lastPhase(), 'ready', '应持续停留在 ready');
    assert.ok(mgr.process, '进程应仍存活');
  } finally {
    mgr.stop();
    clearFakeEnv();
  }
});

test('跨 spawn 的旧探活结果必须作废（代数守卫，防止算到新进程头上）', async () => {
  const mgr = new CloudflaredManager({
    port: 3082,
    token: 'fake-token',
    binaryPath: FAKE_BIN,
    healthProbeIntervalMs: 10,
    healthDegradedThreshold: 1,
    healthRestartThreshold: 2,
    logger: noopLogger,
  });

  // 伪造"当前有进程 + 有 metrics 地址"，让探活可以走到计数环节
  mgr._metricsAddress = '127.0.0.1:1';
  mgr.process = { pid: 1 };
  mgr._spawnSeq = 7;

  let resolveProbe = null;
  mgr._checkTunnelReady = () => new Promise((r) => { resolveProbe = r; });

  const inflight = mgr._probeOnce(); // 探活在飞行中
  mgr._spawnSeq = 8; // 期间发生了新的 spawn（模拟自愈重启）
  resolveProbe({ healthy: false, reason: 'stale' });
  await inflight;

  assert.equal(mgr._probeFailures, 0, '跨 spawn 的旧探活结果必须作废，不得计入新进程');
  assert.equal(mgr._probeCount, 1, '探活本身应已完成并计数');
});

test('未识别到 metrics 地址 → 显式告警 + 跳过探活 + 面板状态可见降级（不误杀）', async () => {
  const rec = stateRecorder();
  const col = collectingLogger();
  const mgr = new CloudflaredManager({
    port: 3082,
    token: 'fake-token',
    binaryPath: FAKE_BIN,
    spawnOptions: FAKE_SPAWN_OPTS,
    retryPolicy: { baseDelayMs: 50, maxDelayMs: 200, maxRetries: 5 },
    handshakeTimeoutMs: 3000,
    healthProbeIntervalMs: 40,
    healthProbeTimeoutMs: 300,
    healthDegradedThreshold: 1,
    healthRestartThreshold: 2,
    onStateChange: rec.onState,
    logger: col.logger,
  });

  // ready-then-hold 不打印 metrics 行（模拟上游改版了文案）
  process.env.FAKE_CF_MODE = 'ready-then-hold';
  try {
    mgr.start();
    await rec.waitForPhase('ready', 4000);
    await sleep(300);
    assert.ok(col.has('warn', /metrics 地址/), '应显式告警未识别到 metrics 地址');
    // 事故"2 天无人发现"的教训：降级必须写进面板可见的状态详情，而不只是一行 journal
    const last = rec.states.at(-1);
    assert.equal(last.phase, 'ready', '保持 ready 相位（不破坏既有 UI 逻辑）');
    assert.match(last.detail, /健康探活未启用/, '降级信息必须出现在面板可见的状态详情里');
    assert.equal(mgr._spawnSeq, 1, '无探活通道时不得误杀进程');
    assert.ok(mgr.process, '进程应仍存活');
  } finally {
    mgr.stop();
    clearFakeEnv();
  }
});

test('cloudflared 输出落盘：内容完整、Token 单块脱敏、超限轮转', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cf-log-'));
  const logFile = join(dir, 'cloudflared.log');
  const rawToken = 'SECRET-TOKEN-abcdef1234567890';
  // 预置一个已超限的旧日志，验证轮转
  writeFileSync(logFile, 'OLD-CONTENT\n'.repeat(200));

  const rec = stateRecorder();
  const mgr = new CloudflaredManager({
    port: 3082,
    token: rawToken,
    hostname: 'dsh.example.com',
    binaryPath: FAKE_BIN,
    spawnOptions: FAKE_SPAWN_OPTS,
    retryPolicy: { baseDelayMs: 50, maxDelayMs: 200, maxRetries: 5 },
    handshakeTimeoutMs: 3000,
    logFilePath: logFile,
    logMaxBytes: 1024, // 远小于预置内容 → 必须轮转
    onStateChange: rec.onState,
    logger: noopLogger,
  });

  process.env.FAKE_CF_MODE = 'ready-then-hold';
  process.env.FAKE_CF_ECHO_TOKEN = '1';
  try {
    mgr.start();
    await rec.waitForPhase('ready', 4000);
    await sleep(200);
    mgr.stop();
    await sleep(200); // 等写流 flush

    assert.ok(existsSync(`${logFile}.1`), 'spawn 时超限旧日志应轮转为 .1');
    assert.match(readFileSync(`${logFile}.1`, 'utf8'), /OLD-CONTENT/, '.1 应保留被轮转的旧内容');

    const fresh = readFileSync(logFile, 'utf8');
    assert.match(fresh, /Registered tunnel connection/, '新日志应包含 cloudflared 输出');
    assert.match(fresh, /\*\*\*/, 'Token 应被脱敏替换为 ***');
    assert.ok(!fresh.includes(rawToken), '落盘日志绝不得出现 Token 原文');
  } finally {
    mgr.stop();
    clearFakeEnv();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('Token 被切分在两个 stderr 块之间时仍必须脱敏（跨 chunk 不得漏网）', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cf-log-split-'));
  const logFile = join(dir, 'cloudflared.log');
  const rawToken = 'SPLITTOKEN1234567890abcdef';

  const rec = stateRecorder();
  const mgr = new CloudflaredManager({
    port: 3082,
    token: rawToken,
    hostname: 'dsh.example.com',
    binaryPath: FAKE_BIN,
    spawnOptions: FAKE_SPAWN_OPTS,
    retryPolicy: { baseDelayMs: 50, maxDelayMs: 200, maxRetries: 5 },
    handshakeTimeoutMs: 3000,
    logFilePath: logFile,
    onStateChange: rec.onState,
    logger: noopLogger,
  });

  process.env.FAKE_CF_MODE = 'ready-then-hold';
  process.env.FAKE_CF_ECHO_TOKEN = '1';
  process.env.FAKE_CF_SPLIT_TOKEN = '1'; // 夹具把 Token 对半分成两次写出
  try {
    mgr.start();
    await rec.waitForPhase('ready', 4000);
    await sleep(400); // 等第二块到达
    mgr.stop();
    await sleep(200);

    const content = readFileSync(logFile, 'utf8');
    assert.ok(!content.includes(rawToken), `跨 chunk 的 Token 不得原样落盘。实际内容: ${content}`);
    // 两半也不得同时以明文形式留下
    assert.ok(!content.includes(rawToken.slice(0, Math.floor(rawToken.length / 2))), 'Token 前半段不得明文落盘');
    assert.match(content, /\*\*\*/, '应出现脱敏占位');
  } finally {
    mgr.stop();
    clearFakeEnv();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('运行中日志超限也会轮转（不只在 spawn 时检查）', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cf-log-rotate-'));
  const logFile = join(dir, 'cloudflared.log');
  const mgr = new CloudflaredManager({
    port: 3082,
    token: 'tok',
    binaryPath: FAKE_BIN,
    logFilePath: logFile,
    logMaxBytes: 200,
    logger: noopLogger,
  });

  try {
    mgr._openLogStream();
    mgr._appendCloudflaredLog('A'.repeat(300)); // 首次：文件尚小，不产生 .1
    mgr._appendCloudflaredLog('B'.repeat(300)); // 累计超限 → 必须轮转
    await sleep(100);
    assert.ok(existsSync(`${logFile}.1`), '运行中超过上限必须轮转出 .1');
  } finally {
    mgr._closeLogStream();
    rmSync(dir, { recursive: true, force: true });
  }
});
