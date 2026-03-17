import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  Fragment,
  FragmentError,
  HashExpiredError,
  AuthError,
  ASSET_TYPE,
  startTelegramOAuth,
  pollTelegramOAuth,
  completeTelegramOAuth,
  telegramOAuthFlow,
  decodeAuthData,
} from '../src/index.js';

describe('index exports', () => {
  it('exports Fragment class', () => {
    assert.equal(typeof Fragment, 'function');
    assert.equal(Fragment.name, 'Fragment');
  });

  it('exports error classes', () => {
    assert.equal(typeof FragmentError, 'function');
    assert.equal(typeof HashExpiredError, 'function');
    assert.equal(typeof AuthError, 'function');
  });

  it('exports ASSET_TYPE constant', () => {
    assert.deepEqual(ASSET_TYPE, { USERNAMES: 1, NUMBERS: 3 });
  });

  it('exports Telegram OAuth functions', () => {
    assert.equal(typeof startTelegramOAuth, 'function');
    assert.equal(typeof pollTelegramOAuth, 'function');
    assert.equal(typeof completeTelegramOAuth, 'function');
    assert.equal(typeof telegramOAuthFlow, 'function');
    assert.equal(typeof decodeAuthData, 'function');
  });
});
