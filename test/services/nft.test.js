import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NftService } from '../../src/services/nft.js';
import { createMockHttp, createMockTonConnect, findCall } from '../helpers.js';

describe('NftService', () => {
  const tc = createMockTonConnect();

  describe('low-level converting methods', () => {
    it('initConverting passes username', async () => {
      const http = createMockHttp({});
      const svc = new NftService(http, null);
      await svc.initConverting('cool');
      assert.equal(findCall(http, 'initConverting').params.username, 'cool');
    });

    it('checkConverting passes id', async () => {
      const http = createMockHttp({});
      const svc = new NftService(http, null);
      await svc.checkConverting('id1');
      assert.equal(findCall(http, 'checkConverting').params.id, 'id1');
    });

    it('startConverting passes id, bid, transaction', async () => {
      const http = createMockHttp({});
      const svc = new NftService(http, null);
      await svc.startConverting('id1', { bid: '5', transaction: 'tx1' });
      const call = findCall(http, 'startConverting');
      assert.equal(call.params.bid, '5');
    });

    it('revertConverting passes confirmed flag', async () => {
      const http = createMockHttp({});
      const svc = new NftService(http, null);
      await svc.revertConverting('cool', { confirmed: true });
      assert.equal(findCall(http, 'revertConverting').params.confirmed, 1);
    });

    it('revertConverting defaults confirmed to 0', async () => {
      const http = createMockHttp({});
      const svc = new NftService(http, null);
      await svc.revertConverting('cool');
      assert.equal(findCall(http, 'revertConverting').params.confirmed, 0);
    });

    it('initNftMove passes username', async () => {
      const http = createMockHttp({});
      const svc = new NftService(http, null);
      await svc.initNftMove('cool');
      assert.equal(findCall(http, 'initNftMoveRequest').params.username, 'cool');
    });

    it('checkNftMoving passes id', async () => {
      const http = createMockHttp({});
      const svc = new NftService(http, null);
      await svc.checkNftMoving('id1');
      assert.equal(findCall(http, 'checkNftMoving').params.id, 'id1');
    });
  });

  describe('transfer low-level methods', () => {
    it('updateTransferState calls updateNftTransferState', async () => {
      const http = createMockHttp({});
      const svc = new NftService(http, null);
      await svc.updateTransferState();
      assert.ok(findCall(http, 'updateNftTransferState'));
    });

    it('searchTransferRecipient passes query', async () => {
      const http = createMockHttp({});
      const svc = new NftService(http, null);
      await svc.searchTransferRecipient('user');
      assert.equal(findCall(http, 'searchNftTransferRecipient').params.query, 'user');
    });

    it('initTransferRequest passes recipient and slug', async () => {
      const http = createMockHttp({});
      const svc = new NftService(http, null);
      await svc.initTransferRequest('r', 'slug1');
      const call = findCall(http, 'initNftTransferRequest');
      assert.equal(call.params.recipient, 'r');
      assert.equal(call.params.slug, 'slug1');
    });

    it('getTransferLink includes tonconnect params', async () => {
      const http = createMockHttp({});
      const svc = new NftService(http, tc);
      await svc.getTransferLink('id1');
      const call = findCall(http, 'getNftTransferLink');
      assert.equal(call.params.account, tc.account);
      assert.equal(call.params.transaction, 1);
    });
  });

  describe('withdrawal methods', () => {
    it('updateWithdrawalState calls updateNftWithdrawalState', async () => {
      const http = createMockHttp({});
      const svc = new NftService(http, null);
      await svc.updateWithdrawalState();
      assert.ok(findCall(http, 'updateNftWithdrawalState'));
    });

    it('initWithdrawal passes all params', async () => {
      const http = createMockHttp({});
      const svc = new NftService(http, null);
      await svc.initWithdrawal({ transaction: 'tx', walletAddress: '0:a', keepGift: true, confirmHash: 'h' });
      const call = findCall(http, 'initNftWithdrawalRequest');
      assert.equal(call.params.wallet_address, '0:a');
      assert.equal(call.params.keep_gift, 1);
    });
  });

  describe('convert (high-level)', () => {
    it('initiates and polls until confirmed', async () => {
      let pollCount = 0;
      const http = createMockHttp({
        initConverting: { req_id: 'req1' },
        checkConverting: () => {
          pollCount++;
          return pollCount >= 2 ? { confirmed: true } : {};
        },
      });
      const svc = new NftService(http, null);
      const result = await svc.convert('cool');
      assert.equal(result.confirmed, true);
    });

    it('throws on init error', async () => {
      const http = createMockHttp({ initConverting: { error: 'already converted' } });
      const svc = new NftService(http, null);
      await assert.rejects(svc.convert('cool'), { message: /Failed to init conversion/ });
    });

    it('returns init result when no req_id (already converted)', async () => {
      const http = createMockHttp({ initConverting: { status: 'done' } });
      const svc = new NftService(http, null);
      const result = await svc.convert('cool');
      assert.equal(result.status, 'done');
    });
  });

  describe('transfer (high-level)', () => {
    it('chains search → init → getLink', async () => {
      const http = createMockHttp({
        searchNftTransferRecipient: { found: { recipient: 'r' } },
        initNftTransferRequest: { req_id: 'req' },
        getNftTransferLink: { transaction: { messages: [] } },
      });
      const svc = new NftService(http, tc);
      const result = await svc.transfer('slug1', 'user');
      assert.equal(result.reqId, 'req');
    });

    it('throws when recipient not found', async () => {
      const http = createMockHttp({ searchNftTransferRecipient: { found: null } });
      const svc = new NftService(http, tc);
      await assert.rejects(svc.transfer('s', 'nobody'), { message: /Recipient not found/ });
    });
  });

  describe('withdraw (high-level)', () => {
    it('delegates to initWithdrawal', async () => {
      const http = createMockHttp({});
      const svc = new NftService(http, null);
      await svc.withdraw('tx1', '0:abc', { keepGift: true });
      const call = findCall(http, 'initNftWithdrawalRequest');
      assert.equal(call.params.transaction, 'tx1');
      assert.equal(call.params.keep_gift, 1);
    });

    it('defaults keepGift to false', async () => {
      const http = createMockHttp({});
      const svc = new NftService(http, null);
      await svc.withdraw('tx1', '0:abc');
      assert.equal(findCall(http, 'initNftWithdrawalRequest').params.keep_gift, 0);
    });
  });
});
