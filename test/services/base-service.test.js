import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BaseService } from '../../src/services/base-service.js';
import { createMockHttp, createMockTonConnect } from '../helpers.js';

describe('BaseService', () => {
  describe('call', () => {
    it('delegates to http.call with method and params', async () => {
      const http = createMockHttp({ testMethod: { result: 42 } });
      const svc = new BaseService(http, null);

      const result = await svc.call('testMethod', { foo: 'bar' });
      assert.deepEqual(result, { result: 42 });
      assert.equal(http.calls[0].method, 'testMethod');
      assert.equal(http.calls[0].params.foo, 'bar');
    });

    it('defaults params to empty object', async () => {
      const http = createMockHttp({});
      const svc = new BaseService(http, null);

      await svc.call('noParams');
      assert.deepEqual(http.calls[0].params, {});
    });
  });

  describe('_requireAccount', () => {
    it('returns account when tonconnect is configured', () => {
      const tc = createMockTonConnect();
      const svc = new BaseService(createMockHttp(), tc);

      const account = svc._requireAccount();
      assert.equal(account, tc.account);
    });

    it('throws FragmentError when tonconnect is null', () => {
      const svc = new BaseService(createMockHttp(), null);

      assert.throws(() => svc._requireAccount(), {
        name: 'FragmentError',
        message: /TonConnect account not configured/,
      });
    });

    it('throws FragmentError when account is missing', () => {
      const svc = new BaseService(createMockHttp(), { device: 'x' });

      assert.throws(() => svc._requireAccount(), {
        name: 'FragmentError',
        message: /TonConnect account not configured/,
      });
    });
  });

  describe('_requireDevice', () => {
    it('returns device when tonconnect is configured', () => {
      const tc = createMockTonConnect();
      const svc = new BaseService(createMockHttp(), tc);

      const device = svc._requireDevice();
      assert.equal(device, tc.device);
    });

    it('throws FragmentError when tonconnect is null', () => {
      const svc = new BaseService(createMockHttp(), null);

      assert.throws(() => svc._requireDevice(), {
        name: 'FragmentError',
        message: /TonConnect device not configured/,
      });
    });
  });
});
