import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SessionsService } from '../../src/services/sessions.js';
import { createMockHttp, findCall } from '../helpers.js';

describe('SessionsService', () => {
  it('terminateSession calls tonTerminateSession with session_id', async () => {
    const http = createMockHttp({});
    const svc = new SessionsService(http, null);
    await svc.terminateSession('sess123');
    const call = findCall(http, 'tonTerminateSession');
    assert.equal(call.params.session_id, 'sess123');
  });
});
