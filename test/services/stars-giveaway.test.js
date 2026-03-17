import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { StarsGiveawayService } from '../../src/services/stars-giveaway.js';
import { createMockHttp, createMockTonConnect, findCall } from '../helpers.js';

describe('StarsGiveawayService', () => {
  const tc = createMockTonConnect();

  it('updateState calls updateStarsGiveawayState', async () => {
    const http = createMockHttp({});
    const svc = new StarsGiveawayService(http, tc);
    await svc.updateState();
    assert.ok(findCall(http, 'updateStarsGiveawayState'));
  });

  it('updatePrices calls updateStarsGiveawayPrices', async () => {
    const http = createMockHttp({});
    const svc = new StarsGiveawayService(http, tc);
    await svc.updatePrices({ quantity: 10, stars: 50 });
    const call = findCall(http, 'updateStarsGiveawayPrices');
    assert.equal(call.params.quantity, 10);
    assert.equal(call.params.stars, 50);
  });

  it('searchRecipient calls searchStarsGiveawayRecipient', async () => {
    const http = createMockHttp({});
    const svc = new StarsGiveawayService(http, tc);
    await svc.searchRecipient('channel');
    assert.equal(findCall(http, 'searchStarsGiveawayRecipient').params.query, 'channel');
  });

  it('initRequest stringifies quantity and stars', async () => {
    const http = createMockHttp({});
    const svc = new StarsGiveawayService(http, tc);
    await svc.initRequest('r', 5, 100);
    const call = findCall(http, 'initGiveawayStarsRequest');
    assert.equal(call.params.quantity, '5');
    assert.equal(call.params.stars, '100');
  });

  it('getLink includes tonconnect params', async () => {
    const http = createMockHttp({});
    const svc = new StarsGiveawayService(http, tc);
    await svc.getLink('id1');
    const call = findCall(http, 'getGiveawayStarsLink');
    assert.equal(call.params.account, tc.account);
    assert.equal(call.params.transaction, 1);
  });

  describe('create (high-level)', () => {
    it('chains search → init → getLink', async () => {
      const http = createMockHttp({
        searchStarsGiveawayRecipient: { found: { recipient: 'ch' } },
        initGiveawayStarsRequest: { req_id: 'req' },
        getGiveawayStarsLink: { transaction: { messages: [] } },
      });
      const svc = new StarsGiveawayService(http, tc);

      const result = await svc.create('mychannel', 5, 100);
      assert.equal(result.reqId, 'req');
      assert.equal(http.calls.length, 3);
    });

    it('throws when channel not found', async () => {
      const http = createMockHttp({ searchStarsGiveawayRecipient: { found: null } });
      const svc = new StarsGiveawayService(http, tc);
      await assert.rejects(svc.create('nope', 5, 100), { message: /Channel not found/ });
    });
  });
});
