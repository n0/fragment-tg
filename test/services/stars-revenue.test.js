import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { StarsRevenueService } from '../../src/services/stars-revenue.js';
import { createMockHttp, findCall } from '../helpers.js';

describe('StarsRevenueService', () => {
  it('updateState calls updateStarsRevenueWithdrawalState', async () => {
    const http = createMockHttp({});
    const svc = new StarsRevenueService(http, null);
    await svc.updateState();
    assert.ok(findCall(http, 'updateStarsRevenueWithdrawalState'));
  });

  it('initWithdrawal passes all params', async () => {
    const http = createMockHttp({});
    const svc = new StarsRevenueService(http, null);
    await svc.initWithdrawal({
      transaction: 'tx1',
      walletAddress: '0:abc',
      withdrawalData: 'data',
      confirmHash: 'h',
    });
    const call = findCall(http, 'initStarsRevenueWithdrawalRequest');
    assert.equal(call.params.transaction, 'tx1');
    assert.equal(call.params.wallet_address, '0:abc');
    assert.equal(call.params.withdrawal_data, 'data');
    assert.equal(call.params.confirm_hash, 'h');
  });
});
