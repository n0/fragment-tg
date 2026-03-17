import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import {
  startTelegramOAuth,
  pollTelegramOAuth,
  completeTelegramOAuth,
  telegramOAuthFlow,
  decodeAuthData,
} from '../../src/auth/telegram-oauth.js';

const originalFetch = globalThis.fetch;

function teardown() {
  globalThis.fetch = originalFetch;
}

describe('decodeAuthData', () => {
  it('decodes base64(urlEncode(json)) format', () => {
    const user = { id: 123, first_name: 'John', auth_date: 1000, hash: 'abc' };
    const encoded = Buffer.from(encodeURIComponent(JSON.stringify(user))).toString('base64');
    const decoded = decodeAuthData(encoded);
    assert.equal(decoded.id, 123);
    assert.equal(decoded.first_name, 'John');
    assert.equal(decoded.hash, 'abc');
  });

  it('handles unicode characters', () => {
    const user = { id: 1, first_name: 'Пользователь', auth_date: 1, hash: 'h' };
    const encoded = Buffer.from(encodeURIComponent(JSON.stringify(user))).toString('base64');
    const decoded = decodeAuthData(encoded);
    assert.equal(decoded.first_name, 'Пользователь');
  });
});

describe('startTelegramOAuth', () => {
  it('gets stel_ssid and sends phone, returns session', async () => {
    let callCount = 0;
    globalThis.fetch = mock.fn(async (url) => {
      callCount++;
      if (callCount === 1) {
        // Init — return stel_ssid
        return {
          headers: {
            get: () => null,
            getSetCookie: () => ['stel_ssid=sess123; Path=/'],
          },
        };
      }
      // Request — accept phone
      return {
        text: async () => 'true',
        headers: {
          get: () => null,
          getSetCookie: () => ['stel_tsession=ts123; Path=/'],
        },
      };
    });

    try {
      const session = await startTelegramOAuth('+1234567890');
      assert.equal(session.stelSsid, 'sess123');
      assert.equal(session.stelTsession, 'ts123');
      assert.equal(session.phone, '+1234567890');
      assert.equal(session.stelToken, null);
    } finally {
      teardown();
    }
  });

  it('throws AuthError when no stel_ssid returned', async () => {
    globalThis.fetch = mock.fn(async () => ({
      headers: {
        get: () => null,
        getSetCookie: () => [],
      },
    }));

    try {
      await assert.rejects(startTelegramOAuth('+123'), { name: 'AuthError' });
    } finally {
      teardown();
    }
  });

  it('throws AuthError when phone request fails', async () => {
    let callCount = 0;
    globalThis.fetch = mock.fn(async () => {
      callCount++;
      if (callCount === 1) {
        return {
          headers: { get: () => null, getSetCookie: () => ['stel_ssid=s; Path=/'] },
        };
      }
      return {
        text: async () => 'false',
        headers: { get: () => null, getSetCookie: () => [] },
      };
    });

    try {
      await assert.rejects(startTelegramOAuth('+bad'), { name: 'AuthError', message: /check the phone number/ });
    } finally {
      teardown();
    }
  });
});

describe('pollTelegramOAuth', () => {
  it('returns true when stel_token is set', async () => {
    globalThis.fetch = mock.fn(async () => ({
      headers: {
        get: () => null,
        getSetCookie: () => ['stel_token=confirmed123; Path=/'],
      },
    }));

    try {
      const session = { stelSsid: 's', stelTsession: 't', stelTsessionPhone: null, phone: '+1' };
      const confirmed = await pollTelegramOAuth(session);
      assert.equal(confirmed, true);
      assert.equal(session.stelToken, 'confirmed123');
    } finally {
      teardown();
    }
  });

  it('returns false when still waiting', async () => {
    globalThis.fetch = mock.fn(async () => ({
      headers: {
        get: () => null,
        getSetCookie: () => [],
      },
    }));

    try {
      const session = { stelSsid: 's', stelTsession: 't', phone: '+1' };
      const confirmed = await pollTelegramOAuth(session);
      assert.equal(confirmed, false);
    } finally {
      teardown();
    }
  });
});

describe('completeTelegramOAuth', () => {
  it('throws AuthError when stelToken not set', async () => {
    const session = { stelToken: null };
    await assert.rejects(completeTelegramOAuth(session), { name: 'AuthError', message: /not confirmed/ });
  });

  it('extracts auth data from redirect Location header', async () => {
    const user = { id: 42, first_name: 'Test', auth_date: 1, hash: 'abc123abc123abc123abc123abc123abc123abc123abc123abc123abc123abcd' };
    const authData = Buffer.from(encodeURIComponent(JSON.stringify(user))).toString('base64');

    globalThis.fetch = mock.fn(async () => ({
      headers: {
        get: (name) => {
          if (name === 'location') return `https://fragment.com/#tgAuthResult=${authData}`;
          return null;
        },
        getSetCookie: () => ['stel_acid=acid1; Path=/'],
      },
      text: async () => '',
    }));

    try {
      const session = { stelSsid: 's', stelToken: 'tok', stelAcid: null, phone: '+1' };
      const result = await completeTelegramOAuth(session);
      assert.equal(result.authData, authData);
      assert.equal(result.userInfo.id, 42);
      assert.equal(result.userInfo.firstName, 'Test');
    } finally {
      teardown();
    }
  });

  it('falls back to HTML extraction then push flow', async () => {
    const user = { id: 99, first_name: 'Push', auth_date: 1, hash: 'abc123abc123abc123abc123abc123abc123abc123abc123abc123abc123abcd' };
    const authData = Buffer.from(encodeURIComponent(JSON.stringify(user))).toString('base64');

    let callCount = 0;
    globalThis.fetch = mock.fn(async () => {
      callCount++;
      if (callCount <= 1) {
        // GET /auth — no redirect, no auth data in HTML
        return {
          headers: {
            get: () => null,
            getSetCookie: () => [],
          },
          text: async () => '<html>nothing here</html>',
        };
      }
      // GET /auth/push — redirect with auth
      return {
        headers: {
          get: (name) => {
            if (name === 'location') return `https://fragment.com/#tgAuthResult=${authData}`;
            return null;
          },
          getSetCookie: () => [],
        },
        text: async () => '',
      };
    });

    try {
      const session = { stelSsid: 's', stelToken: 'tok', stelAcid: null, phone: '+1' };
      const result = await completeTelegramOAuth(session);
      assert.equal(result.userInfo.id, 99);
    } finally {
      teardown();
    }
  });
});

describe('telegramOAuthFlow', () => {
  it('runs full flow: start → poll → complete', async () => {
    const user = { id: 1, first_name: 'Full', auth_date: 1, hash: 'abc123abc123abc123abc123abc123abc123abc123abc123abc123abc123abcd' };
    const authData = Buffer.from(encodeURIComponent(JSON.stringify(user))).toString('base64');

    let callCount = 0;
    globalThis.fetch = mock.fn(async () => {
      callCount++;
      // Call 1: Init (GET /auth) → stel_ssid
      if (callCount === 1) {
        return {
          headers: { get: () => null, getSetCookie: () => ['stel_ssid=s1; Path=/'] },
        };
      }
      // Call 2: Request (POST /auth/request) → accept phone
      if (callCount === 2) {
        return {
          text: async () => 'true',
          headers: { get: () => null, getSetCookie: () => [] },
        };
      }
      // Call 3: Login poll → confirmed
      if (callCount === 3) {
        return {
          headers: { get: () => null, getSetCookie: () => ['stel_token=tok1; Path=/'] },
        };
      }
      // Call 4: Complete (GET /auth) → redirect with auth
      return {
        headers: {
          get: (name) => name === 'location' ? `https://fragment.com/#tgAuthResult=${authData}` : null,
          getSetCookie: () => [],
        },
        text: async () => '',
      };
    });

    try {
      let waitingCalls = 0;
      const result = await telegramOAuthFlow('+123', {
        pollInterval: 1,
        maxAttempts: 5,
        onWaiting: () => { waitingCalls++; },
      });
      assert.equal(result.userInfo.id, 1);
      assert.ok(result.authData);
      assert.ok(waitingCalls >= 1);
    } finally {
      teardown();
    }
  });

  it('throws after maxAttempts when never confirmed', async () => {
    let callCount = 0;
    globalThis.fetch = mock.fn(async () => {
      callCount++;
      if (callCount === 1) {
        return { headers: { get: () => null, getSetCookie: () => ['stel_ssid=s; Path=/'] } };
      }
      if (callCount === 2) {
        return { text: async () => 'true', headers: { get: () => null, getSetCookie: () => [] } };
      }
      // Never return stel_token
      return { headers: { get: () => null, getSetCookie: () => [] } };
    });

    try {
      await assert.rejects(
        telegramOAuthFlow('+123', { pollInterval: 1, maxAttempts: 3 }),
        { name: 'AuthError', message: /not confirmed/ }
      );
    } finally {
      teardown();
    }
  });
});
