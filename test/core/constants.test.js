import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  BASE_URL,
  API_PATH,
  HASH_REGEX,
  DEFAULT_HEADERS,
  POLL_INTERVAL_MS,
  MAX_POLL_ATTEMPTS,
  HASH_TTL_MS,
} from '../../src/core/constants.js';

describe('constants', () => {
  it('BASE_URL points to fragment.com', () => {
    assert.equal(BASE_URL, 'https://fragment.com');
  });

  it('API_PATH is /api', () => {
    assert.equal(API_PATH, '/api');
  });

  it('HASH_REGEX matches apiUrl hash pattern', () => {
    const html = '"apiUrl":"\\/api?hash=abc123def456"';
    const match = HASH_REGEX.exec(html);
    assert.ok(match);
    assert.equal(match[1], 'abc123def456');
  });

  it('HASH_REGEX does not match invalid patterns', () => {
    assert.equal(HASH_REGEX.exec('"apiUrl":"nope"'), null);
  });

  it('DEFAULT_HEADERS includes required headers', () => {
    assert.ok(DEFAULT_HEADERS['Content-Type']);
    assert.ok(DEFAULT_HEADERS['X-Requested-With']);
    assert.ok(DEFAULT_HEADERS['User-Agent']);
  });

  it('polling constants are reasonable numbers', () => {
    assert.equal(typeof POLL_INTERVAL_MS, 'number');
    assert.ok(POLL_INTERVAL_MS > 0);
    assert.equal(typeof MAX_POLL_ATTEMPTS, 'number');
    assert.ok(MAX_POLL_ATTEMPTS > 0);
  });

  it('HASH_TTL_MS is 5 minutes', () => {
    assert.equal(HASH_TTL_MS, 300_000);
  });
});
