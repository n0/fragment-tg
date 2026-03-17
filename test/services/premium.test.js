import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PremiumService } from '../../src/services/premium.js';
import { createMockHttp, createMockTonConnect, findCall } from '../helpers.js';

describe('PremiumService', () => {
  const tc = createMockTonConnect();

  describe('low-level methods', () => {
    it('updateState calls updatePremiumState', async () => {
      const http = createMockHttp({});
      const svc = new PremiumService(http, tc);
      await svc.updateState();
      assert.ok(findCall(http, 'updatePremiumState'));
    });

    it('searchRecipient calls searchPremiumGiftRecipient with months as string', async () => {
      const http = createMockHttp({});
      const svc = new PremiumService(http, tc);
      await svc.searchRecipient('user', 6);
      const call = findCall(http, 'searchPremiumGiftRecipient');
      assert.equal(call.params.query, 'user');
      assert.equal(call.params.months, '6');
    });

    it('initGiftRequest calls initGiftPremiumRequest', async () => {
      const http = createMockHttp({});
      const svc = new PremiumService(http, tc);
      await svc.initGiftRequest('r_token', 12);
      const call = findCall(http, 'initGiftPremiumRequest');
      assert.equal(call.params.recipient, 'r_token');
      assert.equal(call.params.months, '12');
    });

    it('getGiftLink includes tonconnect params', async () => {
      const http = createMockHttp({});
      const svc = new PremiumService(http, tc);
      await svc.getGiftLink('id1', { showSender: 1 });
      const call = findCall(http, 'getGiftPremiumLink');
      assert.equal(call.params.id, 'id1');
      assert.equal(call.params.account, tc.account);
      assert.equal(call.params.transaction, 1);
    });

    it('repeat calls repeatPremium', async () => {
      const http = createMockHttp({});
      const svc = new PremiumService(http, tc);
      await svc.repeat();
      assert.ok(findCall(http, 'repeatPremium'));
    });
  });

  describe('gift (high-level)', () => {
    it('chains search → init → getLink', async () => {
      const http = createMockHttp({
        searchPremiumGiftRecipient: { found: { recipient: 'r' } },
        initGiftPremiumRequest: { req_id: 'req' },
        getGiftPremiumLink: { transaction: { messages: [] }, confirm_method: 'confirm_GiftPremium' },
      });
      const svc = new PremiumService(http, tc);

      const result = await svc.gift('user', 3);
      assert.equal(result.reqId, 'req');
      assert.equal(result.confirm_method, 'confirm_GiftPremium');
    });

    it('throws when recipient not found', async () => {
      const http = createMockHttp({ searchPremiumGiftRecipient: { found: null } });
      const svc = new PremiumService(http, tc);
      await assert.rejects(svc.gift('nobody', 3), { message: /Recipient not found/ });
    });

    it('defaults months to 3', async () => {
      const http = createMockHttp({
        searchPremiumGiftRecipient: { found: { recipient: 'r' } },
        initGiftPremiumRequest: { req_id: 'req' },
        getGiftPremiumLink: { transaction: { messages: [] } },
      });
      const svc = new PremiumService(http, tc);
      await svc.gift('user');
      const call = findCall(http, 'initGiftPremiumRequest');
      assert.equal(call.params.months, '3');
    });
  });
});
