import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AuctionService } from '../../src/services/auction.js';
import { createMockHttp, createMockTonConnect, findCall } from '../helpers.js';

describe('AuctionService', () => {
  const tc = createMockTonConnect();

  describe('read-only methods', () => {
    it('search passes query, type, offsetId', async () => {
      const http = createMockHttp({});
      const svc = new AuctionService(http, null);
      await svc.search('cool', { type: 'username', offsetId: '10' });
      const call = findCall(http, 'searchAuctions');
      assert.equal(call.params.query, 'cool');
      assert.equal(call.params.type, 'username');
      assert.equal(call.params.offset_id, '10');
    });

    it('updateAuction passes type, username, lt, lv', async () => {
      const http = createMockHttp({});
      const svc = new AuctionService(http, null);
      await svc.updateAuction('username', 'cool', { lt: '1', lv: '2' });
      const call = findCall(http, 'updateAuction');
      assert.equal(call.params.type, 'username');
      assert.equal(call.params.username, 'cool');
    });

    it('subscribe calls subscribe method', async () => {
      const http = createMockHttp({});
      const svc = new AuctionService(http, null);
      await svc.subscribe('username', 'cool');
      assert.equal(findCall(http, 'subscribe').params.username, 'cool');
    });

    it('unsubscribe calls unsubscribe method', async () => {
      const http = createMockHttp({});
      const svc = new AuctionService(http, null);
      await svc.unsubscribe('username', 'cool');
      assert.equal(findCall(http, 'unsubscribe').params.username, 'cool');
    });

    it('canSellItem passes auction flag', async () => {
      const http = createMockHttp({});
      const svc = new AuctionService(http, null);
      await svc.canSellItem('username', 'cool', { auction: true });
      assert.equal(findCall(http, 'canSellItem').params.auction, 1);
    });

    it('canSellItem defaults auction to 0', async () => {
      const http = createMockHttp({});
      const svc = new AuctionService(http, null);
      await svc.canSellItem('username', 'cool');
      assert.equal(findCall(http, 'canSellItem').params.auction, 0);
    });

    it('initOffer calls initOfferRequest', async () => {
      const http = createMockHttp({});
      const svc = new AuctionService(http, null);
      await svc.initOffer('username', 'cool');
      assert.equal(findCall(http, 'initOfferRequest').params.username, 'cool');
    });
  });

  describe('getBidLink', () => {
    it('includes tonconnect params and bid as string', async () => {
      const http = createMockHttp({});
      const svc = new AuctionService(http, tc);
      await svc.getBidLink('username', 'cool', 10.5);
      const call = findCall(http, 'getBidLink');
      assert.equal(call.params.bid, '10.5');
      assert.equal(call.params.account, tc.account);
      assert.equal(call.params.transaction, 1);
    });

    it('throws without tonconnect', async () => {
      const svc = new AuctionService(createMockHttp({}), null);
      await assert.rejects(svc.getBidLink('u', 'c', 1), { name: 'FragmentError' });
    });
  });

  describe('placeBid (high-level)', () => {
    it('returns link result on success', async () => {
      const http = createMockHttp({
        getBidLink: { transaction: { messages: [] }, confirm_method: 'confirm_Bid' },
      });
      const svc = new AuctionService(http, tc);
      const result = await svc.placeBid('username', 'cool', 10);
      assert.equal(result.confirm_method, 'confirm_Bid');
    });

    it('throws on error', async () => {
      const http = createMockHttp({ getBidLink: { error: 'too low' } });
      const svc = new AuctionService(http, tc);
      await assert.rejects(svc.placeBid('u', 'c', 1), { message: /getBidLink failed/ });
    });
  });

  describe('makeOffer (high-level)', () => {
    it('chains initOffer → getOfferLink', async () => {
      const http = createMockHttp({
        initOfferRequest: { req_id: 'req1' },
        getOfferLink: { transaction: { messages: [] } },
      });
      const svc = new AuctionService(http, tc);
      const result = await svc.makeOffer('username', 'cool', 50);
      assert.equal(result.reqId, 'req1');
    });

    it('throws when initOffer fails', async () => {
      const http = createMockHttp({ initOfferRequest: {} });
      const svc = new AuctionService(http, tc);
      await assert.rejects(svc.makeOffer('u', 'c', 50), { message: /Failed to init offer/ });
    });
  });

  describe('startAuction (high-level)', () => {
    it('passes min and max amount', async () => {
      const http = createMockHttp({
        getStartAuctionLink: { transaction: { messages: [] } },
      });
      const svc = new AuctionService(http, tc);
      await svc.startAuction('username', 'cool', 5, { maxAmount: 100 });
      const call = findCall(http, 'getStartAuctionLink');
      assert.equal(call.params.min_amount, '5');
      assert.equal(call.params.max_amount, '100');
    });

    it('omits max_amount when not provided', async () => {
      const http = createMockHttp({
        getStartAuctionLink: { transaction: { messages: [] } },
      });
      const svc = new AuctionService(http, tc);
      await svc.startAuction('username', 'cool', 5);
      const call = findCall(http, 'getStartAuctionLink');
      assert.equal(call.params.max_amount, undefined);
    });
  });

  describe('cancelAuction (high-level)', () => {
    it('returns link result on success', async () => {
      const http = createMockHttp({
        getCancelAuctionLink: { transaction: { messages: [] } },
      });
      const svc = new AuctionService(http, tc);
      const result = await svc.cancelAuction('username', 'cool');
      assert.ok(result.transaction);
    });

    it('throws on error', async () => {
      const http = createMockHttp({ getCancelAuctionLink: { error: 'not yours' } });
      const svc = new AuctionService(http, tc);
      await assert.rejects(svc.cancelAuction('u', 'c'), { message: /getCancelAuctionLink failed/ });
    });
  });
});
