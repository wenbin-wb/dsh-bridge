import test from 'node:test';
import assert from 'node:assert/strict';
import { BridgeService } from '../lib/index.js';
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
