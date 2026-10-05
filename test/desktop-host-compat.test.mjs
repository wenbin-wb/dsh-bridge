// test/desktop-host-compat.test.mjs
// 桌面版（Electron）兼容回归用例。
// 背景：桌面宿主是 Electron 以 RunAsNode 跑的同一套 dsh，profile 名为 `desktop`，
// 进程生死由壳经 IPC 管理。插件绝不能按 Web/CLI 假设自行重启宿主，也不能把包
// 装进宿主不加载的 profile。
import test from 'node:test';
import assert from 'node:assert/strict';
import { BridgeService, isDesktopHost, currentProfileName, resolveMobileUiEnabled, readUiPageTweaksPref } from '../lib/index.js';

const quietLogger = { info() {}, warn() {}, error() {}, debug() {} };
const makeService = () => new BridgeService({
  dshPort: 3080, proxyPort: 3082, home: {}, logger: quietLogger,
});

// 模拟子进程成功（退出码 0）的 spawn
const mockSpawnOk = (onCall) => (cmd, args) => {
  onCall?.(cmd, args);
  return {
    stdout: { on: (e, cb) => { if (e === 'data') setTimeout(() => cb(Buffer.from('ok')), 0); } },
    stderr: { on: () => {} },
    on: (event, cb) => { if (event === 'close') setTimeout(() => cb(0), 5); },
  };
};

const DESKTOP_VERSIONS = { node: '22.0.0', electron: '44.0.0' };
const DESKTOP_ARGV1 = '/Applications/DeepSeek Harness.app/Contents/Resources/app.asar/dsh/node_modules/@deepseek-ai/dsh-desktop-host/lib/index.js';
const PLAIN_VERSIONS = { node: process.versions.node };
const PLAIN_ARGV1 = '/home/wenbin/projects/dsh-bridge/lib/index.js';

test('isDesktopHost：versions.electron 存在即判为桌面端（RunAsNode 官方行为）', () => {
  assert.equal(isDesktopHost({ versions: DESKTOP_VERSIONS, argv1: PLAIN_ARGV1 }), true);
});

test('isDesktopHost：主模块路径含 desktop-host 即判为桌面端（大小写不敏感）', () => {
  assert.equal(isDesktopHost({ versions: PLAIN_VERSIONS, argv1: DESKTOP_ARGV1 }), true);
  assert.equal(
    isDesktopHost({ versions: PLAIN_VERSIONS, argv1: '/x/DESKTOP-HOST/lib/index.js' }),
    true,
  );
});

test('isDesktopHost：路径仅含子串（如 desktop-host-compat 测试文件）不误判', () => {
  // 回归：本用例文件名 test/desktop-host-compat.test.mjs 曾触发朴素子串匹配，
  // 导致 Web/CLI 环境被误判为桌面端。必须按路径分段匹配。
  assert.equal(
    isDesktopHost({ versions: PLAIN_VERSIONS, argv1: '/repo/test/desktop-host-compat.test.mjs' }),
    false,
  );
  assert.equal(
    isDesktopHost({ versions: PLAIN_VERSIONS, argv1: '/home/u/my-desktop-host-backup/dsh.js' }),
    false,
  );
});

test('isDesktopHost：普通 Node 判为非桌面端（fail-open，绝不拦正常用户）', () => {
  assert.equal(isDesktopHost({ versions: PLAIN_VERSIONS, argv1: PLAIN_ARGV1 }), false);
  assert.equal(isDesktopHost({}), false);
  assert.equal(isDesktopHost({ versions: {}, argv1: '' }), false);
});

test('isDesktopHost：脏输入不抛错，一律 fail-open', () => {
  assert.equal(isDesktopHost({ versions: null, argv1: null }), false);
  assert.equal(isDesktopHost({ versions: { electron: '' }, argv1: null }), false);
  assert.equal(isDesktopHost({ versions: { electron: 123 }, argv1: 42 }), false);
});

test('currentProfileName：桌面端 desktop，其余 web', () => {
  assert.equal(
    currentProfileName({ versions: DESKTOP_VERSIONS, argv1: PLAIN_ARGV1 }),
    'desktop',
  );
  assert.equal(
    currentProfileName({ versions: PLAIN_VERSIONS, argv1: PLAIN_ARGV1 }),
    'web',
  );
});

test('P0：桌面端 restartDsh 直接拒绝，绝不派生 helper（不调用 spawn）', async () => {
  const service = makeService();
  let spawned = false;
  const result = await service.restartDsh({
    processVersions: DESKTOP_VERSIONS,
    argv1: DESKTOP_ARGV1,
    spawnImpl: () => { spawned = true; throw new Error('must not spawn'); },
    scheduleExit: () => {},
  });
  assert.equal(result.ok, false);
  assert.equal(result.desktopManaged, true);
  assert.match(result.error, /桌面版/);
  assert.equal(spawned, false, '桌面端重启绝不能派生任何子进程');
});

test('P0：非桌面端 restartDsh 不受桌面拦截影响', async () => {
  const service = makeService();
  // 无托管器 + 注入全部依赖：会走到 helper 分支并成功派生（mock）
  let spawnedCmd = null;
  const result = await service.restartDsh({
    processVersions: PLAIN_VERSIONS,
    argv1: PLAIN_ARGV1,
    env: {},
    cgroup: '',
    spawnImpl: (cmd, args) => {
      spawnedCmd = cmd;
      return { once: (e, cb) => { if (e === 'spawn') setTimeout(cb, 0); }, unref: () => {} };
    },
    scheduleExit: () => {},
  });
  assert.equal(result.ok, true, `非桌面端应照常重启：${result.error}`);
  assert.ok(spawnedCmd, '应派生重启助手');
});

test('P1：upgradePlugin 默认用 web profile（Web/CLI 行为不变）', async () => {
  const service = makeService();
  let actualArgs = null;
  const result = await service.upgradePlugin({
    version: '2.12.1',
    spawnImpl: mockSpawnOk((cmd, args) => { actualArgs = { cmd, args }; }),
  });
  assert.equal(result.ok, true, `升级应成功：${result.error}`);
  assert.deepEqual(
    actualArgs.args.slice(0, 4),
    ['plugin', '--profile', 'web', 'add'],
    `默认 profile 必须是 web：${actualArgs.args.join(' ')}`,
  );
});

test('P1：upgradePlugin 显式 desktop 时装进 desktop profile', async () => {
  const service = makeService();
  let actualArgs = null;
  const result = await service.upgradePlugin({
    version: '2.12.1',
    profile: 'desktop',
    spawnImpl: mockSpawnOk((cmd, args) => { actualArgs = { cmd, args }; }),
  });
  assert.equal(result.ok, true, `升级应成功：${result.error}`);
  assert.deepEqual(
    actualArgs.args.slice(0, 4),
    ['plugin', '--profile', 'desktop', 'add'],
    `必须装进 desktop profile：${actualArgs.args.join(' ')}`,
  );
});

test('P1：upgradePlugin 的 profile 只认白名单，注入字符串被丢弃', async () => {
  const service = makeService();
  let actualArgs = null;
  const result = await service.upgradePlugin({
    version: '2.12.1',
    profile: 'web; touch /tmp/pwned',
    spawnImpl: mockSpawnOk((cmd, args) => { actualArgs = { cmd, args }; }),
  });
  assert.equal(result.ok, true);
  const joined = actualArgs.args.join(' ');
  assert.ok(!joined.includes('touch'), `注入字符串绝不能进入命令：${joined}`);
  assert.ok(
    joined.includes('--profile web') || joined.includes('--profile desktop'),
    `必须回退到合法 profile：${joined}`,
  );
});

// ---------- Issue #56 §4：包级别 mobileUi opt-in ----------

test('resolveMobileUiEnabled：默认开启（不误伤正常用户）', () => {
  assert.equal(resolveMobileUiEnabled(), true);
  assert.equal(resolveMobileUiEnabled({}), true);
  assert.equal(resolveMobileUiEnabled({ mobileUi: true }), true);
});

test('resolveMobileUiEnabled：宿主 mobileUi:false 即关闭整层页面改写', () => {
  assert.equal(resolveMobileUiEnabled({ mobileUi: false }), false);
  assert.equal(resolveMobileUiEnabled({ mobileUi: 'off' }), false);
  assert.equal(resolveMobileUiEnabled({ mobileUi: '0' }), false);
});

test('readUiPageTweaksPref：缺文件/坏 JSON 默认开，仅显式 false 关闭', async () => {
  const { join } = await import('node:path');
  const { tmpdir } = await import('node:os');
  const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs');
  const dir = mkdtempSync(join(tmpdir(), 'dsh-bridge-pref-'));
  try {
    const f = join(dir, 'config.json');
    assert.equal(readUiPageTweaksPref(join(dir, 'missing.json')), true);
    writeFileSync(f, '{broken');
    assert.equal(readUiPageTweaksPref(f), true);
    writeFileSync(f, JSON.stringify({ ui: { pageTweaks: false } }));
    assert.equal(readUiPageTweaksPref(f), false);
    writeFileSync(f, JSON.stringify({ ui: { pageTweaks: true } }));
    assert.equal(readUiPageTweaksPref(f), true);
    writeFileSync(f, JSON.stringify({}));
    assert.equal(readUiPageTweaksPref(f), true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('M1 回归：apply() 内 configFile 必须先声明后使用（TDZ 曾致加载即崩）', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, resolve } = await import('node:path');
  const src = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '..', 'lib/index.js'), 'utf8');
  const def = src.indexOf('const configFile = join(');
  const use = src.indexOf('const uiPageTweaks = readUiPageTweaksPref(configFile);');
  assert.ok(def > 0 && use > 0, '锚点均应存在');
  assert.ok(def < use, 'configFile 声明必须在使用之前，否则 apply() 抛 ReferenceError');
});

test('resolveMobileUiEnabled：环境变量 DSH_BRIDGE_MOBILE_UI=0 即关闭', () => {
  const prev = process.env.DSH_BRIDGE_MOBILE_UI;
  try {
    process.env.DSH_BRIDGE_MOBILE_UI = '0';
    assert.equal(resolveMobileUiEnabled({}), false);
    process.env.DSH_BRIDGE_MOBILE_UI = '1';
    assert.equal(resolveMobileUiEnabled({}), true);
  } finally {
    if (prev === undefined) delete process.env.DSH_BRIDGE_MOBILE_UI;
    else process.env.DSH_BRIDGE_MOBILE_UI = prev;
  }
});
