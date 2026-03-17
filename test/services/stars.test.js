import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { StarsService } from '../../src/services/stars.js';
import { createMockHttp, createMockTonConnect, findCall } from '../helpers.js';

describe('StarsService', () => {
  const tc = createMockTonConnect();

  describe('updateState', () => {
    it('calls updateStarsBuyState', async () => {
      const http = createMockHttp({});
      const svc = new StarsService(http, tc);
      await svc.updateState({ some: 'param' });
      assert.equal(findCall(http, 'updateStarsBuyState').params.some, 'param');
    });
  });

  describe('updatePrices', () => {
    it('calls updateStarsPrices with stars and quantity', async () => {
      const http = createMockHttp({});
      const svc = new StarsService(http, tc);
      await svc.updatePrices({ stars: 50, quantity: 100 });
      const call = findCall(http, 'updateStarsPrices');
      assert.equal(call.params.stars, 50);
      assert.equal(call.params.quantity, 100);
    });
  });

  describe('searchRecipient', () => {
    it('calls searchStarsRecipient with query and quantity', async () => {
      const http = createMockHttp({});
      const svc = new StarsService(http, tc);
      await svc.searchRecipient('durov', 100);
      const call = findCall(http, 'searchStarsRecipient');
      assert.equal(call.params.query, 'durov');
      assert.equal(call.params.quantity, 100);
    });
  });

  describe('initBuyRequest', () => {
    it('calls initBuyStarsRequest with string quantity', async () => {
      const http = createMockHttp({});
      const svc = new StarsService(http, tc);
      await svc.initBuyRequest('recipient_token', 200);
      const call = findCall(http, 'initBuyStarsRequest');
      assert.equal(call.params.recipient, 'recipient_token');
      assert.equal(call.params.quantity, '200');
    });
  });

  describe('getBuyLink', () => {
    it('calls getBuyStarsLink with TonConnect params', async () => {
      const http = createMockHttp({});
      const svc = new StarsService(http, tc);
      await svc.getBuyLink('req123', { showSender: 1 });
      const call = findCall(http, 'getBuyStarsLink');
      assert.equal(call.params.id, 'req123');
      assert.equal(call.params.show_sender, 1);
      assert.equal(call.params.account, tc.account);
      assert.equal(call.params.device, tc.device);
      assert.equal(call.params.transaction, 1);
    });

    it('throws when tonconnect not configured', async () => {
      const http = createMockHttp({});
      const svc = new StarsService(http, null);
      await assert.rejects(svc.getBuyLink('req1'), { name: 'FragmentError' });
    });
  });

  describe('repeat', () => {
    it('calls repeatStars', async () => {
      const http = createMockHttp({});
      const svc = new StarsService(http, tc);
      await svc.repeat();
      assert.ok(findCall(http, 'repeatStars'));
    });
  });

  describe('buy (high-level)', () => {
    it('chains search → init → getLink and returns result', async () => {
      const http = createMockHttp({
        searchStarsRecipient: { found: { recipient: 'r_token' } },
        initBuyStarsRequest: { req_id: 'req_1' },
        getBuyStarsLink: { transaction: { validUntil: 999, messages: [] }, confirm_method: 'confirm_BuyStars' },
      });
      const svc = new StarsService(http, tc);

      const result = await svc.buy('durov', 100);

      assert.equal(result.reqId, 'req_1');
      assert.ok(result.transaction);
      assert.equal(result.confirm_method, 'confirm_BuyStars');
      assert.equal(http.calls.length, 3);
    });

    it('throws when recipient not found', async () => {
      const http = createMockHttp({
        searchStarsRecipient: { found: null },
      });
      const svc = new StarsService(http, tc);

      await assert.rejects(svc.buy('nobody', 100), {
        name: 'FragmentError',
        message: /Recipient not found/,
      });
    });

    it('throws when init returns error', async () => {
      const http = createMockHttp({
        searchStarsRecipient: { found: { recipient: 'r' } },
        initBuyStarsRequest: { error: 'limit reached' },
      });
      const svc = new StarsService(http, tc);

      await assert.rejects(svc.buy('durov', 100), {
        name: 'FragmentError',
        message: /Init failed.*limit reached/,
      });
    });

    it('throws when getLink returns error', async () => {
      const http = createMockHttp({
        searchStarsRecipient: { found: { recipient: 'r' } },
        initBuyStarsRequest: { req_id: 'req' },
        getBuyStarsLink: { error: 'wallet not linked' },
      });
      const svc = new StarsService(http, tc);

      await assert.rejects(svc.buy('durov', 100), {
        name: 'FragmentError',
        message: /getLink failed/,
      });
    });

    it('passes showSender option correctly', async () => {
      const http = createMockHttp({
        searchStarsRecipient: { found: { recipient: 'r' } },
        initBuyStarsRequest: { req_id: 'req' },
        getBuyStarsLink: { transaction: { messages: [] } },
      });
      const svc = new StarsService(http, tc);

      await svc.buy('durov', 100, { showSender: true });
      const call = findCall(http, 'getBuyStarsLink');
      assert.equal(call.params.show_sender, 1);
    });
  });
});
