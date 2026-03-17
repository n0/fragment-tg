import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { HttpClient } from '../../src/core/http-client.js';

const originalFetch = globalThis.fetch;

function createMockHashManager(hash = 'testhash') {
  return {
    getHash: async () => hash,
    invalidate: mock.fn(),
    updateCookies: mock.fn(),
  };
}

function setupFetch(response = {}, status = 200) {
  globalThis.fetch = mock.fn(async () => ({
    status,
    ok: status >= 200 && status < 300,
    json: async () => response,
    text: async () => JSON.stringify(response),
    headers: {
      get: () => null,
      getSetCookie: () => [],
    },
  }));
}

describe('HttpClient', () => {
  const cookies = { stel_dt: '420', stel_ssid: 'sess', stel_token: 'tok' };

  it('constructor stores hashManager reference', () => {
    const hm = createMockHashManager();
    const client = new HttpClient(hm, cookies);
    assert.equal(client.hashManager, hm);
  });

  describe('call', () => {
    it('sends POST to correct URL with method in body', async () => {
      setupFetch({ ok: true });
      const client = new HttpClient(createMockHashManager('abc'), cookies);

      await client.call('searchAuctions', { query: 'test' });

      const [url, opts] = globalThis.fetch.mock.calls[0].arguments;
      assert.match(url, /fragment\.com\/api\?hash=abc/);
      assert.equal(opts.method, 'POST');
      assert.match(opts.body, /method=searchAuctions/);
      assert.match(opts.body, /query=test/);
    });

    it('sends cookies in Cookie header', async () => {
      setupFetch({ ok: true });
      const client = new HttpClient(createMockHashManager(), cookies);

      await client.call('test');

      const [, opts] = globalThis.fetch.mock.calls[0].arguments;
      assert.match(opts.headers.Cookie, /stel_dt=420/);
      assert.match(opts.headers.Cookie, /stel_ssid=sess/);
    });

    it('returns parsed JSON response', async () => {
      setupFetch({ items: [1, 2, 3] });
      const client = new HttpClient(createMockHashManager(), cookies);

      const result = await client.call('getAssets');
      assert.deepEqual(result, { items: [1, 2, 3] });
    });

    it('throws AuthError on 401', async () => {
      setupFetch({}, 401);
      const client = new HttpClient(createMockHashManager(), cookies);

      await assert.rejects(client.call('test'), { name: 'AuthError' });
    });

    it('retries once on "Access denied" (hash expired)', async () => {
      let callCount = 0;
      globalThis.fetch = mock.fn(async () => {
        callCount++;
        return {
          status: 200,
          json: async () => callCount === 1 ? { error: 'Access denied' } : { ok: true },
          headers: { get: () => null, getSetCookie: () => [] },
        };
      });

      const hm = createMockHashManager();
      const client = new HttpClient(hm, cookies);
      const result = await client.call('test');

      assert.deepEqual(result, { ok: true });
      assert.equal(hm.invalidate.mock.callCount(), 1);
      assert.equal(callCount, 2);
    });

    it('does not retry on Access denied when retryOnHashExpired is false', async () => {
      setupFetch({ error: 'Access denied' });
      const client = new HttpClient(createMockHashManager(), cookies);

      const result = await client.call('test', {}, { retryOnHashExpired: false });
      assert.equal(result.error, 'Access denied');
    });

    it('skips null/undefined params', async () => {
      setupFetch({ ok: true });
      const client = new HttpClient(createMockHashManager(), cookies);

      await client.call('test', { a: 'yes', b: null, c: undefined, d: 0 });

      const body = globalThis.fetch.mock.calls[0].arguments[1].body;
      assert.match(body, /a=yes/);
      assert.match(body, /d=0/);
      assert.doesNotMatch(body, /\bb=/);
      assert.doesNotMatch(body, /\bc=/);
    });

    it('captures Set-Cookie headers when captureHeaders is true', async () => {
      globalThis.fetch = mock.fn(async () => ({
        status: 200,
        json: async () => ({ verified: true }),
        headers: {
          get: () => null,
          getSetCookie: () => ['stel_ton_token=newtoken; Path=/'],
        },
      }));

      const client = new HttpClient(createMockHashManager(), cookies);
      const result = await client.call('checkTonProofAuth', {}, { captureHeaders: true });

      assert.equal(result.verified, true);
      assert.equal(result._setCookies.stel_ton_token, 'newtoken');
    });
  });

  describe('get', () => {
    it('sends GET request with query params', async () => {
      setupFetch({ data: 'result' });
      const client = new HttpClient(createMockHashManager(), cookies);

      const result = await client.get('/tonkeeper/rawRequest', { id: '123' });

      const [url] = globalThis.fetch.mock.calls[0].arguments;
      assert.match(url, /\/tonkeeper\/rawRequest/);
      assert.match(url, /id=123/);
      assert.deepEqual(result, { data: 'result' });
    });
  });

  describe('fetchHtml', () => {
    it('returns raw HTML', async () => {
      globalThis.fetch = mock.fn(async () => ({
        text: async () => '<html><body>Fragment</body></html>',
        headers: { get: () => null },
      }));

      const client = new HttpClient(createMockHashManager(), cookies);
      const html = await client.fetchHtml('/username/cool');

      assert.match(html, /Fragment/);
      const [url] = globalThis.fetch.mock.calls[0].arguments;
      assert.match(url, /fragment\.com\/username\/cool/);
    });
  });

  describe('updateCookies', () => {
    it('merges new cookies and notifies hash manager', () => {
      const hm = createMockHashManager();
      const mutableCookies = { ...cookies };
      const client = new HttpClient(hm, mutableCookies);

      client.updateCookies({ stel_ton_token: 'wallet123' });

      assert.equal(mutableCookies.stel_ton_token, 'wallet123');
      assert.equal(hm.updateCookies.mock.callCount(), 1);
    });
  });
});

// Restore fetch after all tests
globalThis.fetch = originalFetch;
