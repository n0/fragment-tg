import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PremiumGiveawayService } from '../../src/services/premium-giveaway.js';
import { createMockHttp, createMockTonConnect, findCall } from '../helpers.js';

describe('PremiumGiveawayService', () => {
  const tc = createMockTonConnect();

  it('updateState calls updatePremiumGiveawayState', async () => {
    const http = createMockHttp({});
    const svc = new PremiumGiveawayService(http, tc);
    await svc.updateState();
    assert.ok(findCall(http, 'updatePremiumGiveawayState'));
  });

  it('updatePrices stringifies quantity', async () => {
    const http = createMockHttp({});
    const svc = new PremiumGiveawayService(http, tc);
    await svc.updatePrices(10);
    assert.equal(findCall(http, 'updatePremiumGiveawayPrices').params.quantity, '10');
  });

  it('searchRecipient passes query, quantity, months', async () => {
    const http = createMockHttp({});
    const svc = new PremiumGiveawayService(http, tc);
    await svc.searchRecipient('ch', { quantity: 5, months: 6 });
    const call = findCall(http, 'searchPremiumGiveawayRecipient');
    assert.equal(call.params.query, 'ch');
    assert.equal(call.params.quantity, 5);
    assert.equal(call.params.months, 6);
  });

  it('getLink includes tonconnect params', async () => {
    const http = createMockHttp({});
    const svc = new PremiumGiveawayService(http, tc);
    await svc.getLink('id1');
    assert.equal(findCall(http, 'getGiveawayPremiumLink').params.account, tc.account);
  });

  describe('create (high-level)', () => {
    it('chains search → init → getLink', async () => {
      const http = createMockHttp({
        searchPremiumGiveawayRecipient: { found: { recipient: 'ch' } },
        initGiveawayPremiumRequest: { req_id: 'req' },
        getGiveawayPremiumLink: { transaction: { messages: [] } },
      });
      const svc = new PremiumGiveawayService(http, tc);

      const result = await svc.create('mychannel', 5, 6);
      assert.equal(result.reqId, 'req');
    });

    it('defaults months to 3', async () => {
      const http = createMockHttp({
        searchPremiumGiveawayRecipient: { found: { recipient: 'ch' } },
        initGiveawayPremiumRequest: { req_id: 'req' },
        getGiveawayPremiumLink: { transaction: { messages: [] } },
      });
      const svc = new PremiumGiveawayService(http, tc);
      await svc.create('ch', 5);
      assert.equal(findCall(http, 'initGiveawayPremiumRequest').params.months, '3');
    });

    it('throws when channel not found', async () => {
      const http = createMockHttp({ searchPremiumGiveawayRecipient: { found: null } });
      const svc = new PremiumGiveawayService(http, tc);
      await assert.rejects(svc.create('nope', 5), { message: /Channel not found/ });
    });
  });
});
