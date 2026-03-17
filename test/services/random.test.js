import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RandomService } from '../../src/services/random.js';
import { createMockHttp, createMockTonConnect, findCall } from '../helpers.js';

describe('RandomService', () => {
  it('updateState calls updateRandom', async () => {
    const http = createMockHttp({});
    const svc = new RandomService(http, null);
    await svc.updateState();
    assert.ok(findCall(http, 'updateRandom'));
  });

  it('repeat calls repeatRandom', async () => {
    const http = createMockHttp({});
    const svc = new RandomService(http, null);
    await svc.repeat();
    assert.ok(findCall(http, 'repeatRandom'));
  });

  it('getLink includes tonconnect params', async () => {
    const tc = createMockTonConnect();
    const http = createMockHttp({});
    const svc = new RandomService(http, tc);
    await svc.getLink();
    const call = findCall(http, 'getRandomNumberLink');
    assert.equal(call.params.account, tc.account);
    assert.equal(call.params.device, tc.device);
    assert.equal(call.params.transaction, 1);
  });

  it('getLink throws without tonconnect', async () => {
    const http = createMockHttp({});
    const svc = new RandomService(http, null);
    await assert.rejects(svc.getLink(), { name: 'FragmentError', message: /TonConnect/ });
  });
});
