/**
 * Shared test utilities — mock HTTP client, mock HashManager, factory helpers.
 */

/**
 * Create a mock HttpClient that records calls and returns canned responses.
 * @param {object} responses - Map of method names to response objects or functions
 */
export function createMockHttp(responses = {}) {
  const calls = [];

  const hashManager = {
    getHash: async () => 'testhash123',
    refreshHash: async () => 'testhash123',
    fetchPage: async (path) => ({ html: '<html></html>', setCookies: {}, tonProof: 'test-proof', hash: 'abc123' }),
    getTonProof: async () => 'test-ton-proof',
    invalidate: () => {},
    updateCookies: () => {},
    get cookies() { return {}; },
  };

  return {
    calls,
    hashManager,

    async call(method, params = {}, options = {}) {
      calls.push({ method, params, options });
      const handler = responses[method];
      if (typeof handler === 'function') return handler(params, options);
      if (handler !== undefined) return handler;
      return { ok: true };
    },

    async get(path, params = {}) {
      calls.push({ type: 'get', path, params });
      return responses._get || { ok: true };
    },

    async fetchHtml(path) {
      calls.push({ type: 'fetchHtml', path });
      return responses._fetchHtml || '<html></html>';
    },

    updateCookies(newCookies) {
      calls.push({ type: 'updateCookies', cookies: newCookies });
    },
  };
}

/**
 * Create a mock TonConnect config for payment-requiring services.
 */
export function createMockTonConnect() {
  return {
    account: JSON.stringify({ address: '0:abc123', chain: '-239', walletStateInit: 'init', publicKey: 'pubkey' }),
    device: JSON.stringify({ platform: 'linux', appName: 'test', appVersion: '1.0.0', maxProtocolVersion: 2, features: [] }),
  };
}

/**
 * Assert that the mock HTTP client was called with a specific method.
 * @returns {object} The matching call record
 */
export function findCall(mockHttp, methodName) {
  return mockHttp.calls.find(c => c.method === methodName);
}

/**
 * Assert that the last call matches.
 */
export function lastCall(mockHttp) {
  return mockHttp.calls[mockHttp.calls.length - 1];
}
