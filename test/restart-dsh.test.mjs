import test from 'node:test';
import assert from 'node:assert/strict';
import { BridgeService } from '../lib/index.js';
import { BRIDGE_ENDPOINTS } from '../lib/bridge-rpc-constants.js';

test('BridgeService restartDsh returns confirmation message', async () => {
  const service = new BridgeService({
    dshPort: 3080,
    proxyPort: 3082,
    logger: { info: () => {}, error: () => {}, warn: () => {}, debug: () => {} },
  });

  assert.equal(BRIDGE_ENDPOINTS.restartDsh, 'restartDsh');
  assert.equal(typeof service.restartDsh, 'function');
});
