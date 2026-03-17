import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ConfirmationPoller } from '../../src/flows/polling.js';
import { createMockHttp } from '../helpers.js';

describe('ConfirmationPoller', () => {
  it('resolves immediately when first poll returns confirmed', async () => {
    const http = createMockHttp({
      checkConverting: { confirmed: true, result: 'done' },
    });

    const poller = new ConfirmationPoller(http);
    const result = await poller.waitForConfirmation('checkConverting', { id: '1' }, {
      interval: 1,
      maxAttempts: 5,
    });

    assert.equal(result.confirmed, true);
    assert.equal(result.result, 'done');
  });

  it('polls multiple times until confirmed', async () => {
    let callCount = 0;
    const http = createMockHttp({
      checkStatus: () => {
        callCount++;
        return callCount >= 3 ? { confirmed: true } : { confirmed: false };
      },
    });

    const poller = new ConfirmationPoller(http);
    const result = await poller.waitForConfirmation('checkStatus', {}, {
      interval: 1,
      maxAttempts: 10,
    });

    assert.equal(result.confirmed, true);
    assert.equal(callCount, 3);
  });

  it('throws on error response during polling', async () => {
    const http = createMockHttp({
      checkBad: { error: 'something went wrong' },
    });

    const poller = new ConfirmationPoller(http);
    await assert.rejects(
      poller.waitForConfirmation('checkBad', {}, { interval: 1, maxAttempts: 3 }),
      { name: 'FragmentError', message: /something went wrong/ }
    );
  });

  it('throws on timeout after maxAttempts', async () => {
    const http = createMockHttp({
      checkSlow: { confirmed: false },
    });

    const poller = new ConfirmationPoller(http);
    await assert.rejects(
      poller.waitForConfirmation('checkSlow', {}, { interval: 1, maxAttempts: 3 }),
      { name: 'FragmentError', message: /timed out/ }
    );
  });

  it('passes params to each poll call', async () => {
    const http = createMockHttp({
      checkIt: { confirmed: true },
    });

    const poller = new ConfirmationPoller(http);
    await poller.waitForConfirmation('checkIt', { id: 'req99' }, { interval: 1 });

    const call = http.calls.find(c => c.method === 'checkIt');
    assert.equal(call.params.id, 'req99');
  });
});
