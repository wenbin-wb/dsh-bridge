import test from 'node:test';
import assert from 'node:assert/strict';
import { BridgeService } from '../lib/index.js';
import { CloudflaredManager } from '../lib/cloudflared-manager.mjs';

test('BridgeService tunnel autoStart persistence and status', async () => {
  const persisted = {};
  const service = new BridgeService({
    dshPort: 3080,
    proxyPort: 3082,
    cloudflaredConfig: { token: 'test-token', hostname: 'dsh.example.com', autoStart: true },
    customTunnelConfig: { serverUrl: 'wss://tunnel.example.com', accessToken: 'ct-token', autoStart: false },
    onPersist: async (patch) => {
      Object.assign(persisted, patch);
    },
    logger: { info: () => {}, error: () => {}, warn: () => {}, debug: () => {} },
  });

  // 1. Initial getStatus
  const status1 = await service.getStatus({ adminAuthValid: true });
  assert.equal(status1.cloudflared.autoStart, true);
  assert.equal(status1.cloudflared.tokenConfigured, true);
  assert.equal(status1.cloudflared.token, 'test-token');
  assert.equal(status1.cloudflared.hostname, 'dsh.example.com');
  assert.equal(status1.customTunnel.autoStart, false);

  // Masked token for unauthenticated visitors
  const statusMasked = await service.getStatus({ adminAuthValid: false });
  assert.equal(statusMasked.cloudflared.token, '******');

  // 2. setTunnelAutoStart for custom tunnel
  await service.setTunnelAutoStart({ tunnel: 'custom', autoStart: true });
  assert.equal(service.customTunnelConfig.autoStart, true);
  assert.equal(persisted.customTunnel?.autoStart, true);

  // 3. saveCloudflaredConfig
  await service.saveCloudflaredConfig({ token: 'new-token-123', hostname: 'ai.myhome.org' });
  assert.equal(service.cloudflaredConfig.token, 'new-token-123');
  assert.equal(service.cloudflaredConfig.hostname, 'ai.myhome.org');
  assert.equal(persisted.cloudflared?.token, 'new-token-123');

  // 4. stopCloudflared sets autoStart = false
  await service.stopCloudflared();
  assert.equal(service.cloudflaredConfig.autoStart, false);
  assert.equal(persisted.cloudflared?.autoStart, false);

  // 5. stopCustomTunnel sets autoStart = false
  await service.stopCustomTunnel();
  assert.equal(service.customTunnelConfig.autoStart, false);
  assert.equal(persisted.customTunnel?.autoStart, false);
});

test('CloudflaredManager constructs token mode vs quick tunnel correctly', () => {
  const tokenMgr = new CloudflaredManager({
    port: 3082,
    token: 'cf-secret-token',
    hostname: 'dsh.mydomain.com',
  });
  assert.equal(tokenMgr.token, 'cf-secret-token');
  assert.equal(tokenMgr.hostname, 'dsh.mydomain.com');

  const quickMgr = new CloudflaredManager({
    port: 3082,
  });
  assert.equal(quickMgr.token, null);
  assert.equal(quickMgr.hostname, null);
});

test('CustomTunnelClient strips contextHeaders and contextTimeline on /api/session.list', async () => {
  const { CustomTunnelClient } = await import('../lib/tunnel-client.mjs');
  const { createServer } = await import('node:http');

  // 创建一个模拟的 localPort HTTP 服务器
  const dummyServer = createServer((req, res) => {
    if (req.url.startsWith('/api/session.list')) {
      const payload = {
        result: {
          ok: true,
          value: {
            items: [
              {
                id: 's1',
                projections: {
                  values: {
                    title: '会话1',
                    contextHeaders: 'x'.repeat(10000),
                    contextTimeline: 'y'.repeat(1000),
                  },
                },
              },
            ],
          },
        },
      };
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(payload));
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  await new Promise((r) => dummyServer.listen(0, '127.0.0.1', r));
  const dummyPort = dummyServer.address().port;

  const sentMessages = [];
  const client = new CustomTunnelClient({
    serverUrl: 'wss://example.com',
    accessToken: 'test-token',
    localPort: dummyPort,
    logger: { info: () => {}, error: () => {}, warn: () => {} },
  });

  client._sendMessage = (msg) => {
    sentMessages.push(msg);
  };

  client._handleHttpRequest({
    requestId: 'req-1',
    method: 'GET',
    path: '/api/session.list?limit=10',
    headers: {},
  });

  // 等待请求处理完成
  await new Promise((r) => setTimeout(r, 100));

  assert.equal(sentMessages.length, 1);
  const resp = sentMessages[0];
  assert.equal(resp.requestId, 'req-1');
  assert.equal(resp.statusCode, 200);

  const bodyJson = JSON.parse(Buffer.from(resp.body, 'base64').toString('utf8'));
  const proj = bodyJson.result.value.items[0].projections.values;
  assert.equal(proj.title, '会话1');
  assert.equal(proj.contextHeaders, undefined);
  assert.equal(proj.contextTimeline, undefined);

  dummyServer.close();
});

