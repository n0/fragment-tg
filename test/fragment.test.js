import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { Fragment } from '../src/fragment.js';

const originalFetch = globalThis.fetch;

// Hash must be hex-only [a-f0-9]+ to match HASH_REGEX
const MOCK_HASH = 'abcdef123456';
const MOCK_PAGE_HTML = `"apiUrl":"\\/api?hash=${MOCK_HASH}"`;

function setupMockFetch(apiHandler) {
  globalThis.fetch = mock.fn(async (url, opts) => {
    const urlStr = String(url);

    // Page fetch (HashManager)
    if (!urlStr.includes('/api?') && !urlStr.includes('/tonkeeper')) {
      return {
        ok: true,
        text: async () => MOCK_PAGE_HTML,
        headers: { get: () => null, getSetCookie: () => [] },
      };
    }

    // API calls
    if (apiHandler) {
      const method = opts?.body ? new URLSearchParams(opts.body).get('method') : null;
      const result = apiHandler(method, opts);
      if (result !== undefined) {
        return {
          status: 200,
          json: async () => result,
          headers: { get: () => null, getSetCookie: () => [] },
        };
      }
    }

    return {
      status: 200,
      json: async () => ({ ok: true }),
      headers: { get: () => null, getSetCookie: () => [] },
    };
  });
}

function teardown() {
  globalThis.fetch = originalFetch;
}

describe('Fragment', () => {
  describe('constructor', () => {
    it('creates instance without initializing', () => {
      const f = new Fragment({ cookies: { stel_dt: '420' } });
      assert.equal(f.initialized, false);
    });

    it('does not require tonconnect', () => {
      const f = new Fragment({ cookies: {} });
      assert.ok(f);
    });
  });

  describe('init', () => {
    it('sets initialized to true', async () => {
      setupMockFetch();
      try {
        const f = new Fragment({ cookies: { stel_dt: '420' } });
        await f.init();
        assert.equal(f.initialized, true);
      } finally { teardown(); }
    });

    it('is idempotent', async () => {
      setupMockFetch();
      try {
        const f = new Fragment({ cookies: { stel_dt: '420' } });
        await f.init();
        await f.init();
        assert.equal(f.initialized, true);
      } finally { teardown(); }
    });

    it('wires up all 16 service properties', async () => {
      setupMockFetch();
      try {
        const f = new Fragment({ cookies: { stel_dt: '420' } });
        await f.init();
        const services = [
          'stars', 'starsGiveaway', 'starsRevenue', 'premium', 'premiumGiveaway',
          'ads', 'gateway', 'auction', 'assets', 'nft', 'auth', 'walletApi',
          'history', 'sessions', 'random', 'loginCodes',
        ];
        for (const name of services) {
          assert.ok(f[name], `Missing service: ${name}`);
        }
      } finally { teardown(); }
    });
  });

  describe('auto-init', () => {
    it('init is called automatically when calling convenience methods', async () => {
      setupMockFetch(() => ({ items: [] }));
      try {
        const f = new Fragment({ cookies: { stel_dt: '420' } });
        assert.equal(f.initialized, false);
        await f.searchAuctions('test');
        assert.equal(f.initialized, true);
      } finally { teardown(); }
    });
  });

  describe('confirmPayment', () => {
    it('calls the confirm method with boc and tonconnect data', async () => {
      const apiCalls = [];
      setupMockFetch((method, opts) => {
        apiCalls.push({ method, body: opts?.body });
        return { confirmed: true };
      });

      try {
        const f = new Fragment({
          cookies: { stel_dt: '420' },
          tonconnect: {
            account: '{"address":"0:abc"}',
            device: '{"platform":"test"}',
          },
        });
        await f.init();
        const result = await f.confirmPayment('confirm_BuyStars', { boc: 'base64boc' });

        assert.equal(result.confirmed, true);
        const confirmCall = apiCalls.find(c => c.method === 'confirm_BuyStars');
        assert.ok(confirmCall);
        assert.match(confirmCall.body, /boc=base64boc/);
      } finally { teardown(); }
    });
  });

  describe('convenience methods delegate to services', () => {
    async function createFragment() {
      setupMockFetch();
      const f = new Fragment({ cookies: { stel_dt: '420' } });
      await f.init();
      teardown();
      return f;
    }

    it('searchAuctions delegates to auction.search', async () => {
      const f = await createFragment();
      let called = false;
      f.auction.search = async () => { called = true; return { items: [] }; };
      await f.searchAuctions('test');
      assert.ok(called);
    });

    it('assignUsername delegates to assets.assign', async () => {
      const f = await createFragment();
      let calledWith = null;
      f.assets.assign = async (u, t) => { calledWith = { u, t }; };
      await f.assignUsername('cool', 'target');
      assert.deepEqual(calledWith, { u: 'cool', t: 'target' });
    });

    it('unassignUsername delegates to assets.unassign', async () => {
      const f = await createFragment();
      let called = false;
      f.assets.unassign = async () => { called = true; };
      await f.unassignUsername('cool');
      assert.ok(called);
    });

    it('getAssignTargets delegates to assets.getAssignTargets', async () => {
      const f = await createFragment();
      f.assets.getAssignTargets = async () => [{ assignTo: 't', name: 'Test' }];
      const result = await f.getAssignTargets('cool');
      assert.equal(result.length, 1);
    });

    it('getLoginCode delegates to loginCodes.getCode', async () => {
      const f = await createFragment();
      f.loginCodes.getCode = async () => ({ code: '12345', activeSessions: 1 });
      const result = await f.getLoginCode('+123');
      assert.equal(result.code, '12345');
    });

    it('terminateAllSessions delegates to loginCodes', async () => {
      const f = await createFragment();
      f.loginCodes.terminateAllSessions = async () => ({ success: true });
      const result = await f.terminateAllSessions('+123');
      assert.equal(result.success, true);
    });

    it('isSessionValid delegates to auth.isSessionValid', async () => {
      const f = await createFragment();
      f.auth.isSessionValid = async () => true;
      assert.equal(await f.isSessionValid(), true);
    });

    it('disconnectWallet delegates to auth.disconnectWallet', async () => {
      const f = await createFragment();
      let called = false;
      f.auth.disconnectWallet = async () => { called = true; };
      await f.disconnectWallet();
      assert.ok(called);
    });

    it('buyStars delegates to stars.buy', async () => {
      const f = await createFragment();
      let args = null;
      f.stars.buy = async (...a) => { args = a; return { reqId: 'r' }; };
      await f.buyStars('user', 100, { showSender: true });
      assert.deepEqual(args, ['user', 100, { showSender: true }]);
    });

    it('giftPremium delegates to premium.gift', async () => {
      const f = await createFragment();
      let args = null;
      f.premium.gift = async (...a) => { args = a; return {}; };
      await f.giftPremium('user', 6);
      assert.equal(args[0], 'user');
      assert.equal(args[1], 6);
    });

    it('placeBid delegates to auction.placeBid', async () => {
      const f = await createFragment();
      let args = null;
      f.auction.placeBid = async (...a) => { args = a; return {}; };
      await f.placeBid('username', 'cool', 10);
      assert.deepEqual(args, ['username', 'cool', 10]);
    });

    it('convertToNft delegates to nft.convert', async () => {
      const f = await createFragment();
      f.nft.convert = async (u) => ({ converted: u });
      const result = await f.convertToNft('cool');
      assert.equal(result.converted, 'cool');
    });
  });

  describe('call (raw API)', () => {
    it('makes a raw API call', async () => {
      let capturedMethod = null;
      setupMockFetch((method) => {
        capturedMethod = method;
        return { result: 'raw' };
      });

      try {
        const f = new Fragment({ cookies: {} });
        const result = await f.call('customMethod', { key: 'val' });
        assert.equal(result.result, 'raw');
        assert.equal(capturedMethod, 'customMethod');
      } finally { teardown(); }
    });
  });

  describe('getRawPaymentData', () => {
    it('makes GET request to tonkeeper endpoint', async () => {
      let capturedUrl = null;
      globalThis.fetch = mock.fn(async (url) => {
        const urlStr = String(url);
        if (urlStr.includes('/tonkeeper')) {
          capturedUrl = urlStr;
        }
        if (!urlStr.includes('/api?') && !urlStr.includes('/tonkeeper')) {
          return {
            ok: true,
            text: async () => MOCK_PAGE_HTML,
            headers: { get: () => null, getSetCookie: () => [] },
          };
        }
        return {
          status: 200,
          json: async () => ({ payment: 'data' }),
          headers: { get: () => null, getSetCookie: () => [] },
        };
      });

      try {
        const f = new Fragment({ cookies: {} });
        await f.init();
        const result = await f.getRawPaymentData('abc123');
        assert.equal(result.payment, 'data');
        assert.match(capturedUrl, /tonkeeper\/rawRequest/);
        assert.match(capturedUrl, /id=abc123/);
      } finally { teardown(); }
    });
  });
});
