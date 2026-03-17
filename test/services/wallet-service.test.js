import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { WalletApiService } from '../../src/services/wallet-service.js';
import { createMockHttp, findCall } from '../helpers.js';

describe('WalletApiService', () => {
  it('verifyWallet calls verifyWallet', async () => {
    const http = createMockHttp({});
    const svc = new WalletApiService(http, null);
    await svc.verifyWallet();
    assert.ok(findCall(http, 'verifyWallet'));
  });

  it('checkWallet calls checkWallet', async () => {
    const http = createMockHttp({});
    const svc = new WalletApiService(http, null);
    await svc.checkWallet();
    assert.ok(findCall(http, 'checkWallet'));
  });

  it('linkWallet calls linkWallet', async () => {
    const http = createMockHttp({});
    const svc = new WalletApiService(http, null);
    await svc.linkWallet();
    assert.ok(findCall(http, 'linkWallet'));
  });

  it('kycGetToken calls kycGetToken', async () => {
    const http = createMockHttp({});
    const svc = new WalletApiService(http, null);
    await svc.kycGetToken();
    assert.ok(findCall(http, 'kycGetToken'));
  });

  it('kycUpdateStatus passes payload', async () => {
    const http = createMockHttp({});
    const svc = new WalletApiService(http, null);
    await svc.kycUpdateStatus('{"status":"done"}');
    assert.equal(findCall(http, 'kycUpdateStatus').params.payload, '{"status":"done"}');
  });
});
