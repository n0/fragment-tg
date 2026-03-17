import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LoginCodesService } from '../../src/services/login-codes.js';
import { createMockHttp, findCall } from '../helpers.js';

describe('LoginCodesService', () => {
  describe('updateState', () => {
    it('strips + from number and passes params', async () => {
      const http = createMockHttp({});
      const svc = new LoginCodesService(http, null);
      await svc.updateState('+1234567890', { lt: '0', fromApp: '1' });
      const call = findCall(http, 'updateLoginCodes');
      assert.equal(call.params.number, '1234567890');
      assert.equal(call.params.lt, '0');
      assert.equal(call.params.from_app, '1');
    });
  });

  describe('toggle', () => {
    it('passes can_receive as 1 when true', async () => {
      const http = createMockHttp({});
      const svc = new LoginCodesService(http, null);
      await svc.toggle('+123', true);
      assert.equal(findCall(http, 'toggleLoginCodes').params.can_receive, 1);
    });

    it('passes can_receive as 0 when false', async () => {
      const http = createMockHttp({});
      const svc = new LoginCodesService(http, null);
      await svc.toggle('+123', false);
      assert.equal(findCall(http, 'toggleLoginCodes').params.can_receive, 0);
    });
  });

  describe('terminatePhoneSessions', () => {
    it('calls without hash for step 1', async () => {
      const http = createMockHttp({});
      const svc = new LoginCodesService(http, null);
      await svc.terminatePhoneSessions('+123');
      const call = findCall(http, 'terminatePhoneSessions');
      assert.equal(call.params.number, '123');
      assert.equal(call.params.terminate_hash, undefined);
    });

    it('calls with hash for step 2', async () => {
      const http = createMockHttp({});
      const svc = new LoginCodesService(http, null);
      await svc.terminatePhoneSessions('+123', 'hash123');
      const call = findCall(http, 'terminatePhoneSessions');
      assert.equal(call.params.terminate_hash, 'hash123');
    });
  });

  describe('getCode', () => {
    it('parses code from HTML response', async () => {
      const http = createMockHttp({
        updateLoginCodes: {
          html: '<tr><td class="table-cell-value">54321</td></tr><tr><td>other</td></tr>',
        },
      });
      const svc = new LoginCodesService(http, null);
      const result = await svc.getCode('+1234567890');
      assert.equal(result.code, '54321');
      assert.equal(result.activeSessions, 2);
    });

    it('returns null code when no HTML', async () => {
      const http = createMockHttp({ updateLoginCodes: {} });
      const svc = new LoginCodesService(http, null);
      const result = await svc.getCode('+123');
      assert.equal(result.code, null);
      assert.equal(result.activeSessions, 0);
    });

    it('passes from_app flag', async () => {
      const http = createMockHttp({});
      const svc = new LoginCodesService(http, null);
      await svc.getCode('+123');
      const call = findCall(http, 'updateLoginCodes');
      assert.equal(call.params.from_app, '1');
      assert.equal(call.params.lt, '0');
    });
  });

  describe('getTerminateConfirmation', () => {
    it('returns terminateHash and confirmMessage', async () => {
      const http = createMockHttp({
        terminatePhoneSessions: { terminate_hash: 'h1', confirm_message: 'Are you sure?', confirm_button: 'Yes' },
      });
      const svc = new LoginCodesService(http, null);
      const result = await svc.getTerminateConfirmation('+123');
      assert.equal(result.terminateHash, 'h1');
      assert.equal(result.confirmMessage, 'Are you sure?');
      assert.equal(result.confirmButton, 'Yes');
    });

    it('returns null when no hash', async () => {
      const http = createMockHttp({ terminatePhoneSessions: {} });
      const svc = new LoginCodesService(http, null);
      const result = await svc.getTerminateConfirmation('+123');
      assert.equal(result.terminateHash, null);
    });
  });

  describe('terminateAllSessions', () => {
    it('two-step flow: get hash then terminate', async () => {
      let callCount = 0;
      const http = createMockHttp({
        terminatePhoneSessions: () => {
          callCount++;
          if (callCount === 1) return { terminate_hash: 'h1', confirm_message: 'Sure?' };
          return { msg: 'Sessions terminated' };
        },
      });
      const svc = new LoginCodesService(http, null);
      const result = await svc.terminateAllSessions('+123');
      assert.equal(result.success, true);
      assert.equal(result.message, 'Sessions terminated');
      assert.equal(callCount, 2);
    });

    it('throws when first step returns error', async () => {
      const http = createMockHttp({
        terminatePhoneSessions: { error: 'not found' },
      });
      const svc = new LoginCodesService(http, null);
      await assert.rejects(svc.terminateAllSessions('+123'), { message: /Cannot terminate sessions/ });
    });

    it('throws when no terminate_hash returned', async () => {
      const http = createMockHttp({ terminatePhoneSessions: {} });
      const svc = new LoginCodesService(http, null);
      await assert.rejects(svc.terminateAllSessions('+123'), { message: /No terminate_hash/ });
    });

    it('throws when second step returns error', async () => {
      let callCount = 0;
      const http = createMockHttp({
        terminatePhoneSessions: () => {
          callCount++;
          if (callCount === 1) return { terminate_hash: 'h1' };
          return { error: 'expired' };
        },
      });
      const svc = new LoginCodesService(http, null);
      await assert.rejects(svc.terminateAllSessions('+123'), { message: /Termination failed/ });
    });
  });
});
