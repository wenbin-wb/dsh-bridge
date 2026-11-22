// 回归用例：cloudflared 钉死版本的支持窗口（issue #108）
//
// 背景：Cloudflare 官方只支持「距最新发布一年内」的 cloudflared
// （https://github.com/cloudflare/cloudflared#deprecated-versions）。插件原先钉死
// 2024.10.0，到 2026 年已超期却毫无提示：干净环境会下载并使用官方不再支持的版本，
// 长期部署存在静默失效风险。
//
// 本用例锁死三件事：
//   1. 钉死版本与上游发布日期成对维护，且窗口截止日 = 发布日 + 12 个月；
//   2. 超期判定在边界上正确（截止日当天仍算支持，次日算超期）；
//   3. 面板画像只对「插件自管理」二进制判定超期（系统安装是用户自己的选择）。
// 另外顺带锁死 Windows ARM 的资产选择：上游没有 windows-arm64 资产，必须回落到 amd64。
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CloudflaredManager,
  checkVersionSupport,
  cloudflaredAssetFor,
  getPinnedReleaseDate,
  resolvePinnedVersion,
  supportedUntil,
  versionSupportWarning,
} from '../lib/cloudflared-manager.mjs';

const VERSION_ENV = 'DSH_BRIDGE_CLOUDFLARED_VERSION';
const noopLogger = { info: () => {}, error: () => {}, warn: () => {}, debug: () => {} };

const withEnv = (value, fn) => {
  const prev = process.env[VERSION_ENV];
  try {
    if (value === undefined) delete process.env[VERSION_ENV];
    else process.env[VERSION_ENV] = value;
    return fn();
  } finally {
    if (prev === undefined) delete process.env[VERSION_ENV];
    else process.env[VERSION_ENV] = prev;
  }
};

test('钉死版本与上游发布日期成对维护且格式合法', () => {
  const version = resolvePinnedVersion();
  // 与 parseCloudflaredVersion 的捕获组同形：YYYY.M.P
  assert.match(version, /^\d{4}\.\d+\.\d+$/);
  assert.match(getPinnedReleaseDate(), /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(!Number.isNaN(new Date(`${getPinnedReleaseDate()}T00:00:00Z`).getTime()), '发布日期必须可解析');
});

test('支持窗口 = 上游发布日 + 12 个月（UTC 日期）', () => {
  assert.equal(supportedUntil('2026-10-30'), '2027-10-30');
  assert.equal(supportedUntil('2024-10-10'), '2025-10-10');
  // 非法输入不猜，返回 null
  assert.equal(supportedUntil('not-a-date'), null);
});

test('超期判定：截止日当天仍受支持，次日零点才超期（不提前到 23:59:59 之后）', () => {
  const until = supportedUntil('2026-10-30');
  const lastDay = new Date(`${until}T23:59:59Z`).getTime();
  const lastMilli = new Date(`${until}T23:59:59.999Z`).getTime();
  const nextDay = new Date(`${until}T00:00:00Z`).getTime() + 24 * 60 * 60 * 1000;

  assert.equal(checkVersionSupport({ releasedAt: '2026-10-30', now: lastDay }).outdated, false, '截止日 23:59:59 不应报超期');
  assert.equal(checkVersionSupport({ releasedAt: '2026-10-30', now: lastMilli }).outdated, false, '截止日最后一毫秒仍受支持');
  assert.equal(checkVersionSupport({ releasedAt: '2026-10-30', now: nextDay - 1 }).outdated, false, '次日零点前一毫秒仍受支持');
  assert.equal(checkVersionSupport({ releasedAt: '2026-10-30', now: nextDay }).outdated, true, '次日零点起算超期');
  // 回填一个明显过期的发布时间，验证历史场景（issue #108 报的就是 2024.10.0 超期）
  assert.equal(checkVersionSupport({ releasedAt: '2024-10-10', now: Date.parse('2026-11-09T00:00:00Z') }).outdated, true);
  // 时钟异常（NaN）不得静默判成"超期"
  assert.equal(checkVersionSupport({ releasedAt: '2026-10-30', now: Number.NaN }).outdated, false);
});

test('当前钉死版本未超期（否则必须升级 pin 或补提示，本用例会拦住）', () => {
  const { outdated, supportedUntil: until } = checkVersionSupport();
  assert.equal(outdated, false, `钉死版本 ${resolvePinnedVersion()} 已超出支持窗口（支持至 ${until}）：请同步升级 CLOUDFLARED_VERSION/CLOUDFLARED_RELEASED_AT`);
  assert.equal(until, supportedUntil(getPinnedReleaseDate()));
});

test('DSH_BRIDGE_CLOUDFLARED_VERSION 可覆盖钉死版本，非法值回落到钉死值', () => {
  withEnv(undefined, () => {
    assert.match(resolvePinnedVersion(), /^\d{4}\.\d+\.\d+$/);
  });
  withEnv('2026.10.7', () => {
    assert.equal(resolvePinnedVersion(), '2026.10.7');
  });
  // 注入风险面：只接受纯版本号，任何额外字符都不得进入下载 URL
  for (const bad of ['../evil', '2026.10.7; rm -rf /', '', '   ', 'latest', '2026.10.7/../../x']) {
    withEnv(bad, () => {
      assert.match(resolvePinnedVersion(), /^\d{4}\.\d+\.\d+$/, `非法覆盖值 ${JSON.stringify(bad)} 必须被忽略`);
    });
  }
});

test('面板画像：只有插件自管理二进制才判定超期', () => {
  const now = Date.now();

  const managed = new CloudflaredManager({ port: 3082, token: 't', logger: noopLogger });
  managed.binaryPath = '/fake/bin/cloudflared';
  managed.binarySource = 'managed';
  managed.binaryVersionActual = resolvePinnedVersion();
  const managedInfo = managed.getBinaryInfo();
  assert.equal(managedInfo.source, 'managed');
  assert.equal(managedInfo.outdated, false, `当前钉死版本不应超期（now=${now}）`);
  assert.equal(managedInfo.supportedUntil, supportedUntil(getPinnedReleaseDate()));

  // 系统安装：版本由用户维护，插件不评判（即便版本很旧也不得报 outdated）
  const system = new CloudflaredManager({ port: 3082, token: 't', logger: noopLogger });
  system.binaryPath = '/usr/local/bin/cloudflared';
  system.binarySource = 'system';
  system.binaryVersionActual = '2024.10.0';
  assert.deepEqual(system.getBinaryInfo(), {
    path: '/usr/local/bin/cloudflared',
    version: '2024.10.0',
    source: 'system',
    outdated: false,
    supportedUntil: null,
  });

  // 未启动（source=null）：没有二进制就谈不上版本支持窗口
  const idle = new CloudflaredManager({ port: 3082, token: 't', logger: noopLogger });
  assert.deepEqual(idle.getBinaryInfo(), {
    path: null, version: null, source: null, outdated: false, supportedUntil: null,
  });
});

test('支持窗口只对「实际在跑的版本 === 钉死版本」判定：覆盖/显式指定版本一律不报超期', () => {
  // 场景 1：构造时显式指定了别的版本（等价于 env 覆盖或测试注入）——
  // 该版本的发布时间未知，不能拿钉死版本的日期去判它超期（否则等于编造）
  const overridden = new CloudflaredManager({
    port: 3082, token: 't', binaryVersion: '2024.10.0', logger: noopLogger,
  });
  overridden.binaryPath = '/fake/bin/cloudflared';
  overridden.binarySource = 'managed';
  overridden.binaryVersionActual = '2024.10.0';
  assert.deepEqual(overridden.getBinaryInfo(), {
    path: '/fake/bin/cloudflared',
    version: '2024.10.0',
    source: 'managed',
    // 2024.10.0 事实上早已超出窗口，但插件**不知道它的发布日期**，因此不谎报也不误报
    outdated: false,
    supportedUntil: null,
  });

  // 场景 2：环境变量覆盖钉死版本 → 构造函数默认值随之变化，同样不算超期
  withEnv('2024.10.0', () => {
    const mgr = new CloudflaredManager({ port: 3082, token: 't', logger: noopLogger });
    assert.equal(mgr.binaryVersion, '2024.10.0');
    mgr.binaryPath = '/fake/bin/cloudflared';
    mgr.binarySource = 'managed';
    mgr.binaryVersionActual = '2024.10.0';
    assert.equal(mgr.getBinaryInfo().outdated, false);
    assert.equal(mgr.getBinaryInfo().supportedUntil, null);
  });
});

test('Windows ARM 回落到 amd64 资产（上游没有 windows-arm64 资产，旧映射会 404）', () => {
  assert.equal(cloudflaredAssetFor('win32', 'arm64').file, 'cloudflared-windows-amd64.exe');
  assert.equal(cloudflaredAssetFor('win32', 'x64').file, 'cloudflared-windows-amd64.exe');
  assert.equal(cloudflaredAssetFor('darwin', 'arm64').file, 'cloudflared-darwin-arm64.tgz');
  assert.equal(cloudflaredAssetFor('linux', 'x64').file, 'cloudflared-linux-amd64');
  assert.equal(cloudflaredAssetFor('linux', 'arm64').file, 'cloudflared-linux-arm64');
  // 不支持的平台必须显式报错，而不是拼出一个必然 404 的 URL
  assert.throws(() => cloudflaredAssetFor('freebsd', 'x64'), /不支持的平台/);
});

test('超期告警文案：超期必须给出截止日与处置建议，未超期不得产生噪音', () => {
  // 未超期（当前钉死版本）：不得返回文案
  assert.equal(versionSupportWarning(), null);

  // 历史场景（issue #108 报的 2024.10.0）：必须给出截止日与两条处置路径
  const warning = versionSupportWarning('2024.10.0', '2024-10-10', Date.parse('2026-11-09T00:00:00Z'));
  assert.ok(warning, '超期版本必须产生告警');
  assert.match(warning, /2024\.10\.0/, '必须写明是哪个版本超期');
  assert.match(warning, /支持至 2025-10-10/, '必须给出支持窗口截止日');
  assert.match(warning, /升级插件/, '必须给出升级插件这条处置路径');
  assert.match(warning, /系统安装的 cloudflared/, '必须给出改用系统安装这条处置路径');
  assert.match(warning, /DSH_BRIDGE_CLOUDFLARED_VERSION/, '必须给出临时逃生口');
});
