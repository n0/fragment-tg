import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { HashManager } from '../../src/core/hash-manager.js';

const originalFetch = globalThis.fetch;

function mockFetch(html) {
  return mock.fn(async () => ({
    ok: true,
    text: async () => html,
    headers: {
      get: () => null,
      getSetCookie: () => [],
    },
  }));
}

// All hash values must be valid hex [a-f0-9]+ to match HASH_REGEX
describe('HashManager', () => {
  const cookies = { stel_dt: '420', stel_ssid: 'test' };

  it('constructor stores cookies and default TTL', () => {
    const hm = new HashManager(cookies);
    assert.deepEqual(hm.cookies, cookies);
  });

  it('constructor accepts custom TTL', () => {
    const hm = new HashManager(cookies, { ttl: 1000 });
    assert.ok(hm);
  });

  it('getHash fetches fresh hash on first call', async () => {
    globalThis.fetch = mockFetch('"apiUrl":"\\/api?hash=aabbcc112233"');
    try {
      const hm = new HashManager(cookies);
      const hash = await hm.getHash();
      assert.equal(hash, 'aabbcc112233');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('getHash returns cached hash within TTL', async () => {
    globalThis.fetch = mockFetch('"apiUrl":"\\/api?hash=cafe456"');
    try {
      const hm = new HashManager(cookies, { ttl: 60_000 });
      const hash1 = await hm.getHash();
      const hash2 = await hm.getHash();
      assert.equal(hash1, 'cafe456');
      assert.equal(hash2, 'cafe456');
      assert.equal(globalThis.fetch.mock.callCount(), 1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('refreshHash always fetches fresh', async () => {
    globalThis.fetch = mockFetch('"apiUrl":"\\/api?hash=dead789"');
    try {
      const hm = new HashManager(cookies);
      await hm.refreshHash();
      await hm.refreshHash();
      assert.equal(globalThis.fetch.mock.callCount(), 2);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('refreshHash throws HashExpiredError when no hash found', async () => {
    globalThis.fetch = mockFetch('<html>no hash here</html>');
    try {
      const hm = new HashManager(cookies);
      await assert.rejects(hm.refreshHash(), { name: 'HashExpiredError' });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('fetchPage returns html, hash, tonProof, and setCookies', async () => {
    globalThis.fetch = mockFetch('"apiUrl":"\\/api?hash=abcdef123456" "ton_proof":"deadbeef"');
    try {
      const hm = new HashManager(cookies);
      const result = await hm.fetchPage('/');
      assert.equal(result.hash, 'abcdef123456');
      assert.equal(result.tonProof, 'deadbeef');
      assert.equal(typeof result.html, 'string');
      assert.equal(typeof result.setCookies, 'object');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('getTonProof fetches page if not yet loaded', async () => {
    globalThis.fetch = mockFetch('"apiUrl":"\\/api?hash=abc123" "ton_proof":"face0ff"');
    try {
      const hm = new HashManager(cookies);
      const proof = await hm.getTonProof();
      assert.equal(proof, 'face0ff');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('getTonProof returns null when no proof in page', async () => {
    globalThis.fetch = mockFetch('"apiUrl":"\\/api?hash=abc123"');
    try {
      const hm = new HashManager(cookies);
      const proof = await hm.getTonProof();
      assert.equal(proof, null);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('invalidate clears cached hash', async () => {
    globalThis.fetch = mockFetch('"apiUrl":"\\/api?hash=beef123"');
    try {
      const hm = new HashManager(cookies);
      await hm.getHash();
      assert.equal(globalThis.fetch.mock.callCount(), 1);

      hm.invalidate();
      await hm.getHash();
      assert.equal(globalThis.fetch.mock.callCount(), 2);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('updateCookies merges into stored cookies', () => {
    const hm = new HashManager({ ...cookies });
    hm.updateCookies({ stel_token: 'newtoken' });
    assert.equal(hm.cookies.stel_token, 'newtoken');
    assert.equal(hm.cookies.stel_dt, '420');
  });

  it('refreshHash captures Set-Cookie headers into cookies', async () => {
    globalThis.fetch = mock.fn(async () => ({
      ok: true,
      text: async () => '"apiUrl":"\\/api?hash=c00cafe"',
      headers: {
        get: () => null,
        getSetCookie: () => ['stel_ssid=newsession; Path=/'],
      },
    }));
    try {
      const mutableCookies = { stel_dt: '420' };
      const hm = new HashManager(mutableCookies);
      await hm.refreshHash();
      assert.equal(mutableCookies.stel_ssid, 'newsession');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
