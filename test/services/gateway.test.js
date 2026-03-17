import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GatewayService } from '../../src/services/gateway.js';
import { createMockHttp, createMockTonConnect, findCall } from '../helpers.js';

describe('GatewayService', () => {
  const tc = createMockTonConnect();

  it('updateState calls updateGatewayRechargeState', async () => {
    const http = createMockHttp({});
    const svc = new GatewayService(http, tc);
    await svc.updateState();
    assert.ok(findCall(http, 'updateGatewayRechargeState'));
  });

  it('updatePrices passes account and credits', async () => {
    const http = createMockHttp({});
    const svc = new GatewayService(http, tc);
    await svc.updatePrices({ account: 'a1', credits: 500 });
    const call = findCall(http, 'updateGatewayPrices');
    assert.equal(call.params.account, 'a1');
    assert.equal(call.params.credits, 500);
  });

  it('initRechargeRequest stringifies credits', async () => {
    const http = createMockHttp({});
    const svc = new GatewayService(http, tc);
    await svc.initRechargeRequest('a1', 500);
    const call = findCall(http, 'initGatewayRechargeRequest');
    assert.equal(call.params.credits, '500');
  });

  it('getRechargeLink includes tonconnect params', async () => {
    const http = createMockHttp({});
    const svc = new GatewayService(http, tc);
    await svc.getRechargeLink('id1');
    assert.equal(findCall(http, 'getGatewayRechargeLink').params.account, tc.account);
  });

  it('repeatAddFunds calls repeatGatewayAddFunds', async () => {
    const http = createMockHttp({});
    const svc = new GatewayService(http, tc);
    await svc.repeatAddFunds();
    assert.ok(findCall(http, 'repeatGatewayAddFunds'));
  });

  describe('recharge (high-level)', () => {
    it('chains init → getLink', async () => {
      const http = createMockHttp({
        initGatewayRechargeRequest: { req_id: 'req' },
        getGatewayRechargeLink: { transaction: { messages: [] } },
      });
      const svc = new GatewayService(http, tc);
      const result = await svc.recharge('a1', 500);
      assert.equal(result.reqId, 'req');
    });

    it('throws when init fails', async () => {
      const http = createMockHttp({ initGatewayRechargeRequest: { error: 'no credits' } });
      const svc = new GatewayService(http, tc);
      await assert.rejects(svc.recharge('a1', 500), { message: /Init failed/ });
    });

    it('throws when getLink fails', async () => {
      const http = createMockHttp({
        initGatewayRechargeRequest: { req_id: 'req' },
        getGatewayRechargeLink: { error: 'expired' },
      });
      const svc = new GatewayService(http, tc);
      await assert.rejects(svc.recharge('a1', 500), { message: /getLink failed/ });
    });
  });
});
