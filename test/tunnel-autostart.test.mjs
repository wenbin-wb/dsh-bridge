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
