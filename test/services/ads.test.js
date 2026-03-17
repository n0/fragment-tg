import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AdsService } from '../../src/services/ads.js';
import { createMockHttp, createMockTonConnect, findCall } from '../helpers.js';

describe('AdsService', () => {
  const tc = createMockTonConnect();

  describe('low-level methods', () => {
    it('updateState calls updateAdsState', async () => {
      const http = createMockHttp({});
      const svc = new AdsService(http, tc);
      await svc.updateState();
      assert.ok(findCall(http, 'updateAdsState'));
    });

    it('updateTopupState calls updateAdsTopupState', async () => {
      const http = createMockHttp({});
      const svc = new AdsService(http, tc);
      await svc.updateTopupState();
      assert.ok(findCall(http, 'updateAdsTopupState'));
    });

    it('updateRevenueWithdrawalState calls updateAdsRevenueWithdrawalState', async () => {
      const http = createMockHttp({});
      const svc = new AdsService(http, tc);
      await svc.updateRevenueWithdrawalState();
      assert.ok(findCall(http, 'updateAdsRevenueWithdrawalState'));
    });

    it('searchTopupRecipient passes query', async () => {
      const http = createMockHttp({});
      const svc = new AdsService(http, tc);
      await svc.searchTopupRecipient('someuser');
      assert.equal(findCall(http, 'searchAdsTopupRecipient').params.query, 'someuser');
    });

    it('initTopupRequest stringifies amount', async () => {
      const http = createMockHttp({});
      const svc = new AdsService(http, tc);
      await svc.initTopupRequest('r_token', 50);
      const call = findCall(http, 'initAdsTopupRequest');
      assert.equal(call.params.recipient, 'r_token');
      assert.equal(call.params.amount, '50');
    });

    it('getTopupLink includes tonconnect params', async () => {
      const http = createMockHttp({});
      const svc = new AdsService(http, tc);
      await svc.getTopupLink('id1', { showSender: 1 });
      const call = findCall(http, 'getAdsTopupLink');
      assert.equal(call.params.account, tc.account);
      assert.equal(call.params.transaction, 1);
    });

    it('initRechargeRequest stringifies amount', async () => {
      const http = createMockHttp({});
      const svc = new AdsService(http, tc);
      await svc.initRechargeRequest('acc1', 100);
      const call = findCall(http, 'initAdsRechargeRequest');
      assert.equal(call.params.account, 'acc1');
      assert.equal(call.params.amount, '100');
    });

    it('getRechargeLink includes tonconnect params', async () => {
      const http = createMockHttp({});
      const svc = new AdsService(http, tc);
      await svc.getRechargeLink('id2');
      assert.equal(findCall(http, 'getAdsRechargeLink').params.account, tc.account);
    });

    it('repeatTopup calls repeatAdsTopup', async () => {
      const http = createMockHttp({});
      const svc = new AdsService(http, tc);
      await svc.repeatTopup();
      assert.ok(findCall(http, 'repeatAdsTopup'));
    });

    it('repeatAddFunds calls repeatAdsAddFunds', async () => {
      const http = createMockHttp({});
      const svc = new AdsService(http, tc);
      await svc.repeatAddFunds();
      assert.ok(findCall(http, 'repeatAdsAddFunds'));
    });

    it('initRevenueWithdrawal passes correct params', async () => {
      const http = createMockHttp({});
      const svc = new AdsService(http, tc);
      await svc.initRevenueWithdrawal({ transaction: 'tx1', walletAddress: '0:abc', confirmHash: 'h' });
      const call = findCall(http, 'initAdsRevenueWithdrawalRequest');
      assert.equal(call.params.transaction, 'tx1');
      assert.equal(call.params.wallet_address, '0:abc');
      assert.equal(call.params.confirm_hash, 'h');
    });
  });

  describe('topup (high-level)', () => {
    it('chains search → init → getLink', async () => {
      const http = createMockHttp({
        searchAdsTopupRecipient: { found: { recipient: 'r' } },
        initAdsTopupRequest: { req_id: 'req' },
        getAdsTopupLink: { transaction: { messages: [] } },
      });
      const svc = new AdsService(http, tc);
      const result = await svc.topup('user', 50);
      assert.equal(result.reqId, 'req');
    });

    it('throws when account not found', async () => {
      const http = createMockHttp({ searchAdsTopupRecipient: { found: null } });
      const svc = new AdsService(http, tc);
      await assert.rejects(svc.topup('nobody', 50), { message: /Ads account not found/ });
    });
  });

  describe('recharge (high-level)', () => {
    it('chains init → getLink', async () => {
      const http = createMockHttp({
        initAdsRechargeRequest: { req_id: 'req' },
        getAdsRechargeLink: { transaction: { messages: [] } },
      });
      const svc = new AdsService(http, tc);
      const result = await svc.recharge('acc1', 100);
      assert.equal(result.reqId, 'req');
    });

    it('throws when init fails', async () => {
      const http = createMockHttp({ initAdsRechargeRequest: { error: 'bad' } });
      const svc = new AdsService(http, tc);
      await assert.rejects(svc.recharge('acc1', 100), { message: /Init failed/ });
    });
  });
});
