import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FragmentError, HashExpiredError, AuthError } from '../../src/core/errors.js';

describe('FragmentError', () => {
  it('sets name and message', () => {
    const err = new FragmentError('something broke');
    assert.equal(err.name, 'FragmentError');
    assert.equal(err.message, 'something broke');
    assert(err instanceof Error);
  });

  it('stores method and response context', () => {
    const resp = { error: 'bad' };
    const err = new FragmentError('fail', { method: 'buyStars', response: resp });
    assert.equal(err.method, 'buyStars');
    assert.equal(err.response, resp);
  });

  it('defaults method and response to undefined', () => {
    const err = new FragmentError('fail');
    assert.equal(err.method, undefined);
    assert.equal(err.response, undefined);
  });
});

describe('HashExpiredError', () => {
  it('extends FragmentError with correct name', () => {
    const err = new HashExpiredError();
    assert.equal(err.name, 'HashExpiredError');
    assert.equal(err.message, 'API hash expired');
    assert(err instanceof FragmentError);
    assert(err instanceof Error);
  });
});

describe('AuthError', () => {
  it('extends FragmentError with custom message', () => {
    const err = new AuthError('session expired');
    assert.equal(err.name, 'AuthError');
    assert.equal(err.message, 'session expired');
    assert(err instanceof FragmentError);
  });

  it('uses default message when none provided', () => {
    const err = new AuthError();
    assert.match(err.message, /Authentication failed/);
  });
});
