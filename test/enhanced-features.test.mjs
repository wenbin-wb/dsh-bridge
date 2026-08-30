import test from 'node:test';
import assert from 'node:assert/strict';
import { BridgeService, selectLanIPv4 } from '../lib/index.js';
import { ConversationBridge } from '../lib/platform/conversation-bridge.js';
import { AuthManager } from '../lib/auth/manager.js';

test('ConversationBridge /rename command renames active session', async () => {
  const sentTexts = [];
  const updatedRecords = [];

  const mockSession = {
    id: 'session-12345678',
    title: '旧标题',
  };

  const mockCtx = {
    on: () => () => {},
    effect: () => () => {},
    sessions: new Map([['session-12345678', mockSession]]),
    sessionPersistence: {
      update: async (id, data) => {
        updatedRecords.push({ id, data });
      },
    },
  };

  const mockPlatform = {
    id: 'test-platform',
    capabilities: { maxMessageChars: 2000, supportsGroup: true },
    sendText: async (peer, text) => {
      sentTexts.push(text);
      return { success: true };
    },
    sendTyping: async () => {},
  };

  const bridge = new ConversationBridge({
    ctx: mockCtx,
    logger: { info: () => {}, warn: () => {}, error: () => {} },
    platform: mockPlatform,
    config: { allowFrom: ['user1'] },
  });

  bridge.activeSessionId = 'session-12345678';

  // 1. 发送缺少参数的 /rename
  await bridge.handleInbound({ senderId: 'user1', text: '/rename' });
  assert.match(sentTexts[0], /缺少新标题参数/);

  // 2. 发送有效 /rename
  await bridge.handleInbound({ senderId: 'user1', text: '/rename 优化登录交互' });
  assert.equal(mockSession.title, '优化登录交互');
  assert.equal(updatedRecords.length, 1);
  assert.equal(updatedRecords[0].data.title, '优化登录交互');
  assert.match(sentTexts[1], /会话重命名成功/);

  // 3. 无活动会话时
  bridge.activeSessionId = null;
  await bridge.handleInbound({ senderId: 'user1', text: '/rename 另一个标题' });
  assert.match(sentTexts[2], /当前没有活动会话/);
});

test('BridgeService getSystemMetrics returns valid metrics', async () => {
  const service = new BridgeService({
    dshPort: 3080,
    proxyPort: 3082,
    logger: { info: () => {}, warn: () => {}, error: () => {} },
  });

  const metrics = service.getSystemMetrics();
  assert.ok(metrics);
  assert.ok(metrics.os);
  assert.ok(metrics.cpu);
  assert.ok(metrics.memory);
  assert.ok(metrics.uptime);
  assert.ok(typeof metrics.cpu.cores === 'number');
  assert.ok(typeof metrics.memory.usedPercent === 'number');
  assert.ok(typeof metrics.uptime.processSec === 'number');
});

test('BridgeService diagnoseNetwork runs diagnostics', async () => {
  const service = new BridgeService({
    dshPort: 3080,
    proxyPort: 3082,
    logger: { info: () => {}, warn: () => {}, error: () => {} },
  });

  const res = await service.diagnoseNetwork();
  assert.equal(res.ok, true);
  assert.ok(Array.isArray(res.results));
  assert.ok(res.results.some(r => r.item === 'local_proxy'));
  assert.ok(res.results.some(r => r.item === 'lan_interface'));
  assert.ok(res.results.some(r => r.item === 'custom_tunnel_server'));

  // 测试配置了 ws:// 协议的自建隧道地址
  service.customTunnelConfig = { serverUrl: 'ws://127.0.0.1:3082/connect' };
  service.customTunnelClient = { running: true };
  const res2 = await service.diagnoseNetwork();
  const ctItem = res2.results.find(r => r.item === 'custom_tunnel_server');
  assert.ok(ctItem);
  assert.equal(ctItem.status, 'pass');
});

test('AuthManager and backup integration', async () => {
  const auth = new AuthManager({
    logger: { info: () => {}, warn: () => {}, error: () => {} },
  });

  await auth.setEnabled(true);
  await auth.setPassword('access123');
  await auth.setAdminPassword('admin456');

  const status = auth.getStatus({ masked: false });
  assert.equal(status.enabled, true);
  assert.equal(status.hasPassword, true);
  assert.equal(status.hasAdminPassword, true);
});

test('BridgeService listRemoteDirectories & addWorkspace', async () => {
  const registered = [];
  const mockCtx = {
    workspaceRegistry: {
      list: async () => registered,
      add: async (entry) => { registered.push(entry); },
    },
  };

  const service = new BridgeService({
    dshPort: 3080,
    proxyPort: 3082,
    logger: { info: () => {}, warn: () => {}, error: () => {} },
  });
  service.ctx = mockCtx;

  // 1. 测试列出目录
  const dirRes = await service.listRemoteDirectories();
  assert.equal(dirRes.ok, true);
  assert.ok(dirRes.currentPath);
  assert.ok(Array.isArray(dirRes.roots));
  assert.ok(Array.isArray(dirRes.drives));
  assert.ok(Array.isArray(dirRes.entries));

  // 2. 测试添加当前项目作为工作区
  const currentDir = process.cwd();
  const addRes = await service.addWorkspace(currentDir);
  assert.equal(addRes.ok, true);
  assert.equal(addRes.path, currentDir);
  assert.equal(addRes.registered, true);

  // 3. 测试获取工作区列表
  const wsList = await service.getWorkspaces();
  assert.ok(Array.isArray(wsList));
  assert.ok(wsList.some(w => w.path === currentDir));

  // 4. 测试添加不存在路径报错
  const failRes = await service.addWorkspace('C:\\non_existent_folder_xyz_12345');
  assert.equal(failRes.ok, false);
  assert.ok(failRes.error);
});

test('ConversationBridge /addworkspace and /workspaces commands', async () => {
  const registered = [];
  const mockCtx = {
    on: () => () => {},
    effect: () => () => {},
    workspaceRegistry: {
      list: async () => registered,
      add: async (entry) => { registered.push(entry); },
    },
    sessions: new Map(),
    agents: new Map(),
  };

  const sentTexts = [];
  const mockPlatform = {
    id: 'test-platform',
    capabilities: { maxMessageChars: 2000, supportsGroup: true },
    sendText: async (peer, text) => {
      sentTexts.push(text);
      return { success: true };
    },
    sendTyping: async () => {},
  };

  const bridge = new ConversationBridge({
    ctx: mockCtx,
    logger: { info: () => {}, warn: () => {}, error: () => {} },
    platform: mockPlatform,
    config: { allowFrom: ['user1'] },
  });

  const currentDir = process.cwd();

  // 1. 发送缺少参数的 /addworkspace
  await bridge.handleInbound({ senderId: 'user1', text: '/addworkspace' });
  assert.match(sentTexts[0], /缺少工作区路径/);

  // 2. 发送有效 /addworkspace <当前路径>
  await bridge.handleInbound({ senderId: 'user1', text: `/addworkspace ${currentDir}` });
  assert.equal(registered.length, 1);
  assert.equal(registered[0].path, currentDir);
  assert.match(sentTexts[1], /工作区添加成功/);

  // 3. 发送 /workspaces 列出
  await bridge.handleInbound({ senderId: 'user1', text: '/workspaces' });
  assert.match(sentTexts[2], /可用工作区/);
  assert.ok(sentTexts[2].includes(currentDir));
});

test('selectLanIPv4 优先选择物理局域网网卡并过滤虚拟网卡 (WSL/VMware/Docker)', () => {
  const ip = selectLanIPv4();
  if (ip) {
    assert.match(ip, /^\d+\.\d+\.\d+\.\d+$/);
    assert.ok(!ip.startsWith('127.'));
  }
});

test('listAllLanIPv4 & BridgeService 多网卡 IP 选择与持久化 (Issue #5)', async () => {
  const persisted = [];
  const service = new BridgeService({
    dshPort: 3080,
    proxyPort: 3082,
    lanConfig: { selectedIp: '192.168.1.100' },
    onPersist: async (patch) => {
      persisted.push(patch);
    },
  });

  const status = await service.getStatus();
  assert.ok(status.lan);
  assert.ok(Array.isArray(status.lan.interfaces));

  // 1. 设置有效自定义 IP
  await service.setLanIp({ ip: '10.0.0.5' });
  assert.equal(service.selectedLanIp, '10.0.0.5');
  assert.deepEqual(persisted[persisted.length - 1], { lan: { selectedIp: '10.0.0.5' } });

  // 2. 清除自定义 IP 恢复自动推荐
  await service.setLanIp({ ip: '' });
  assert.equal(service.selectedLanIp, null);
  assert.deepEqual(persisted[persisted.length - 1], { lan: { selectedIp: null } });
});


