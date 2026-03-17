import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AuthService } from '../../src/services/auth.js';
import { createMockHttp, findCall } from '../helpers.js';

describe('AuthService', () => {
  describe('logIn', () => {
    it('calls logIn with auth data', async () => {
      const http = createMockHttp({});
      const svc = new AuthService(http, null);
      await svc.logIn('base64data');
      assert.equal(findCall(http, 'logIn').params.auth, 'base64data');
    });
  });

  describe('logOut', () => {
    it('calls logOut', async () => {
      const http = createMockHttp({});
      const svc = new AuthService(http, null);
      await svc.logOut();
      assert.ok(findCall(http, 'logOut'));
    });
  });

  describe('getTonAuthLink', () => {
    it('calls getTonAuthLink', async () => {
      const http = createMockHttp({});
      const svc = new AuthService(http, null);
      await svc.getTonAuthLink();
      assert.ok(findCall(http, 'getTonAuthLink'));
    });
  });

  describe('checkTonProofAuth', () => {
    it('calls with captureHeaders', async () => {
      const http = createMockHttp({
        checkTonProofAuth: { verified: true },
      });
      const svc = new AuthService(http, null);
      await svc.checkTonProofAuth({ account: 'a', device: 'd', proof: 'p' });
      const call = findCall(http, 'checkTonProofAuth');
      assert.equal(call.params.account, 'a');
      assert.equal(call.params.proof, 'p');
      assert.equal(call.options.captureHeaders, true);
    });
  });

  describe('tonLogOut', () => {
    it('calls tonLogOut', async () => {
      const http = createMockHttp({});
      const svc = new AuthService(http, null);
      await svc.tonLogOut();
      assert.ok(findCall(http, 'tonLogOut'));
    });
  });

  describe('authenticateTelegram', () => {
    it('base64-encodes user data and calls logIn', async () => {
      const http = createMockHttp({
        logIn: (params, opts) => ({ ok: true, _setCookies: { stel_token: 'tok' } }),
      });
      const svc = new AuthService(http, null);
      const result = await svc.authenticateTelegram({ id: 123, first_name: 'John', auth_date: 1000, hash: 'abc' });
      assert.equal(result.success, true);
      assert.equal(result.cookies.stel_token, 'tok');
    });

    it('throws on error response', async () => {
      const http = createMockHttp({
        logIn: { error: 'invalid auth data' },
      });
      const svc = new AuthService(http, null);
      await assert.rejects(svc.authenticateTelegram({ id: 1 }), { message: /Telegram login failed/ });
    });

    it('updates http cookies on success', async () => {
      const http = createMockHttp({
        logIn: (params, opts) => ({ ok: true, _setCookies: { stel_token: 'new' } }),
      });
      const svc = new AuthService(http, null);
      await svc.authenticateTelegram({ id: 1 });
      const updateCall = http.calls.find(c => c.type === 'updateCookies');
      assert.ok(updateCall);
      assert.equal(updateCall.cookies.stel_token, 'new');
    });
  });

  describe('connectWallet', () => {
    it('calls checkTonProofAuth and updates cookies', async () => {
      const http = createMockHttp({
        checkTonProofAuth: (params, opts) => ({ verified: true, _setCookies: { stel_ton_token: 'wallet' } }),
      });
      const svc = new AuthService(http, null);
      const result = await svc.connectWallet({ account: 'a', device: 'd', proof: 'p' });
      assert.equal(result.verified, true);
      assert.equal(result.cookies.stel_ton_token, 'wallet');
    });

    it('throws AuthError when verification fails', async () => {
      const http = createMockHttp({
        checkTonProofAuth: { verified: false, error: 'bad proof' },
      });
      const svc = new AuthService(http, null);
      await assert.rejects(svc.connectWallet({ account: 'a', device: 'd', proof: 'p' }), {
        name: 'AuthError',
        message: /bad proof/,
      });
    });
  });

  describe('getTonProof', () => {
    it('delegates to hashManager.getTonProof', async () => {
      const http = createMockHttp({});
      const svc = new AuthService(http, null);
      const proof = await svc.getTonProof();
      assert.equal(proof, 'test-ton-proof');
    });
  });

  describe('disconnectWallet', () => {
    it('calls tonLogOut and clears stel_ton_token', async () => {
      const http = createMockHttp({});
      const svc = new AuthService(http, null);
      await svc.disconnectWallet();
      assert.ok(findCall(http, 'tonLogOut'));
      const updateCall = http.calls.find(c => c.type === 'updateCookies');
      assert.equal(updateCall.cookies.stel_ton_token, '');
    });
  });

  describe('isSessionValid', () => {
    it('returns true when updateRandom succeeds', async () => {
      const http = createMockHttp({ updateRandom: { ok: true } });
      const svc = new AuthService(http, null);
      assert.equal(await svc.isSessionValid(), true);
    });

    it('returns false when updateRandom returns error', async () => {
      const http = createMockHttp({ updateRandom: { error: 'invalid' } });
      const svc = new AuthService(http, null);
      assert.equal(await svc.isSessionValid(), false);
    });

    it('returns false when call throws', async () => {
      const http = createMockHttp({});
      http.call = async () => { throw new Error('network'); };
      const svc = new AuthService(http, null);
      assert.equal(await svc.isSessionValid(), false);
    });
  });

  describe('getSessionCookie', () => {
    it('fetches page and returns cookies, hash, tonProof', async () => {
      const http = createMockHttp({});
      const svc = new AuthService(http, null);
      const result = await svc.getSessionCookie();
      assert.equal(typeof result.hash, 'string');
      assert.equal(typeof result.tonProof, 'string');
      assert.equal(typeof result.cookies, 'object');
    });
  });
});
