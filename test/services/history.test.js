import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { HistoryService } from '../../src/services/history.js';
import { createMockHttp, findCall } from '../helpers.js';

describe('HistoryService', () => {
  it('getBids calls getBidsHistory with type and offset_id', async () => {
    const http = createMockHttp({});
    const svc = new HistoryService(http, null);
    await svc.getBids({ type: 'username', offsetId: '5' });
    const call = findCall(http, 'getBidsHistory');
    assert.equal(call.params.type, 'username');
    assert.equal(call.params.offset_id, '5');
  });

  it('getBids defaults to empty options', async () => {
    const http = createMockHttp({});
    const svc = new HistoryService(http, null);
    await svc.getBids();
    assert.ok(findCall(http, 'getBidsHistory'));
  });

  it('getPremium calls getPremiumHistory', async () => {
    const http = createMockHttp({});
    const svc = new HistoryService(http, null);
    await svc.getPremium({ type: 'gift' });
    assert.equal(findCall(http, 'getPremiumHistory').params.type, 'gift');
  });

  it('getOrders calls getOrdersHistory', async () => {
    const http = createMockHttp({});
    const svc = new HistoryService(http, null);
    await svc.getOrders();
    assert.ok(findCall(http, 'getOrdersHistory'));
  });

  it('getOwners calls getOwnersHistory', async () => {
    const http = createMockHttp({});
    const svc = new HistoryService(http, null);
    await svc.getOwners({ offsetId: '10' });
    assert.equal(findCall(http, 'getOwnersHistory').params.offset_id, '10');
  });
});
