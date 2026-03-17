/**
 * Programmatic Telegram OAuth flow for Fragment.com
 *
 * Performs the full OAuth dance with oauth.telegram.org to obtain
 * a tgAuthResult (Telegram login widget data) that Fragment accepts.
 *
 * Flow:
 *   1. GET  oauth.telegram.org/auth           → stel_ssid cookie
 *   2. POST oauth.telegram.org/auth/request   → send phone, get tsession cookies
 *   3. POST oauth.telegram.org/auth/login     → poll until user confirms in Telegram
 *   4. GET  oauth.telegram.org/auth           → stel_acid cookie
 *   5. GET  oauth.telegram.org/auth/push      → redirect with tgAuthResult
 *   6. POST fragment.com/api  method=logIn    → Fragment stel_token
 *
 * The only manual step is the user tapping "Confirm" in their Telegram app.
 */

import { AuthError, FragmentError } from '../core/errors.js';

const FRAGMENT_BOT_ID = '5444323279';
const OAUTH_BASE = 'https://oauth.telegram.org';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36';

const OAUTH_PARAMS = new URLSearchParams({
  bot_id: FRAGMENT_BOT_ID,
  origin: 'https://fragment.com',
  request_access: 'write',
  return_to: 'https://fragment.com/',
}).toString();

// ==================== Cookie Utilities ====================

function extractSetCookies(response) {
  if (typeof response.headers.getSetCookie === 'function') {
    return response.headers.getSetCookie();
  }
  const raw = response.headers.get('set-cookie');
  if (!raw) return [];
  return raw.split(/,(?=\s*\w+=)/);
}

function getCookieValue(setCookies, name) {
  for (const cookie of setCookies) {
    const match = cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
    if (match && match[1] !== 'DELETED') {
      return match[1];
    }
  }
  return null;
}

// ==================== Auth Data Extraction ====================

/**
 * Extract tgAuthResult from a redirect Location header.
 * @param {Response} response
 * @returns {string|null}
 */
function extractAuthDataFromRedirect(response) {
  const location = response.headers.get('location');
  if (!location) return null;

  try {
    const url = new URL(location);

    // Check hash fragment: fragment.com/#tgAuthResult=...
    if (url.hash) {
      const hashParams = new URLSearchParams(url.hash.slice(1));
      const result = hashParams.get('tgAuthResult');
      if (result) return result;
    }

    // Check query params
    const queryResult = url.searchParams.get('tgAuthResult');
    if (queryResult) return queryResult;
  } catch {
    // Not a valid URL
  }

  return null;
}

/**
 * Extract tgAuthResult from HTML body (JS callback or embedded JSON).
 * @param {string} html
 * @returns {string|null}
 */
function extractAuthDataFromHtml(html) {
  // Pattern 1: tgAuthResult value in JS
  const resultPatterns = [
    /tgAuthResult["':\s=]+["']([A-Za-z0-9+/=%]+)["']/,
    /auth_result["':\s=]+["']([A-Za-z0-9+/=%]+)["']/,
  ];

  for (const pattern of resultPatterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      try {
        const decoded = decodeAuthData(match[1]);
        if (decoded.id && decoded.hash) return match[1];
      } catch {
        continue;
      }
    }
  }

  // Pattern 2: JSON auth data in script tag
  const jsonMatch = html.match(
    /\{[^{}]*"id"\s*:\s*\d+[^{}]*"hash"\s*:\s*"[a-f0-9]{64}"[^{}]*\}/
  );
  if (jsonMatch) {
    try {
      const data = JSON.parse(jsonMatch[0]);
      if (data.id && data.hash) {
        return Buffer.from(
          encodeURIComponent(JSON.stringify(data))
        ).toString('base64');
      }
    } catch {
      // Not valid JSON
    }
  }

  return null;
}

/**
 * Decode base64-encoded auth data → { id, first_name, hash, ... }
 * @param {string} authData - Base64(URLEncode(JSON))
 * @returns {{ id: number, first_name: string, last_name?: string, username?: string, photo_url?: string, auth_date: number, hash: string }}
 */
export function decodeAuthData(authData) {
  const urlEncoded = Buffer.from(authData, 'base64').toString('utf8');
  const jsonStr = decodeURIComponent(urlEncoded);
  return JSON.parse(jsonStr);
}

// ==================== OAuth Flow ====================

/**
 * @typedef {object} OAuthSession
 * @property {string} stelSsid
 * @property {string|null} stelTsession
 * @property {string|null} stelTsessionPhone
 * @property {string|null} stelToken
 * @property {string|null} stelAcid
 * @property {string} phone
 */

/**
 * Step 1: Initialize OAuth session and send phone number.
 * After this, Telegram sends a login confirmation to the user's Telegram app.
 *
 * @param {string} phone - Phone number with country code (e.g., '+1234567890')
 * @returns {Promise<OAuthSession>} Session state for subsequent steps
 */
export async function startTelegramOAuth(phone) {
  // Step 0: Get stel_ssid
  const initResponse = await fetch(`${OAUTH_BASE}/auth?${OAUTH_PARAMS}`, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html',
    },
    redirect: 'manual',
  });

  const initCookies = extractSetCookies(initResponse);
  const stelSsid = getCookieValue(initCookies, 'stel_ssid');
  if (!stelSsid) {
    throw new AuthError('Failed to initialize Telegram OAuth session');
  }

  // Step 1: Send phone number
  const requestResponse = await fetch(
    `${OAUTH_BASE}/auth/request?${OAUTH_PARAMS}`,
    {
      method: 'POST',
      headers: {
        'User-Agent': USER_AGENT,
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: `stel_ssid=${stelSsid}`,
        Origin: OAUTH_BASE,
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: `phone=${encodeURIComponent(phone)}`,
    }
  );

  const requestResult = await requestResponse.text();
  if (requestResult.trim() !== 'true') {
    throw new AuthError('Failed to send auth request — check the phone number.');
  }

  const requestCookies = extractSetCookies(requestResponse);
  const stelTsession = getCookieValue(requestCookies, 'stel_tsession');
  const stelTsessionPhone = getCookieValue(requestCookies, `stel_tsession_${phone}`);

  return {
    stelSsid,
    stelTsession,
    stelTsessionPhone,
    stelToken: null,
    stelAcid: null,
    phone,
  };
}

/**
 * Step 2: Poll oauth.telegram.org until the user confirms in Telegram.
 *
 * @param {OAuthSession} session - From startTelegramOAuth()
 * @returns {Promise<boolean>} true if user confirmed, false if still waiting
 */
export async function pollTelegramOAuth(session) {
  const cookies = [
    `stel_ssid=${session.stelSsid}`,
    session.stelTsession ? `stel_tsession=${session.stelTsession}` : '',
    session.stelTsessionPhone
      ? `stel_tsession_${session.phone}=${session.stelTsessionPhone}`
      : '',
  ]
    .filter(Boolean)
    .join('; ');

  const loginResponse = await fetch(
    `${OAUTH_BASE}/auth/login?${OAUTH_PARAMS}`,
    {
      method: 'POST',
      headers: {
        'User-Agent': USER_AGENT,
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: cookies,
        Origin: OAUTH_BASE,
        'X-Requested-With': 'XMLHttpRequest',
      },
    }
  );

  const loginCookies = extractSetCookies(loginResponse);
  const stelToken = getCookieValue(loginCookies, 'stel_token');

  if (stelToken) {
    session.stelToken = stelToken;
    return true;
  }

  return false;
}

/**
 * Step 3: Complete OAuth — get tgAuthResult from Telegram.
 * Call this after pollTelegramOAuth() returns true.
 *
 * @param {OAuthSession} session - Session with stelToken set
 * @returns {Promise<{ authData: string, userInfo: { id: number, firstName: string, lastName: string|null, username: string|null } }>}
 */
export async function completeTelegramOAuth(session) {
  if (!session.stelToken) {
    throw new AuthError('Cannot complete OAuth — user has not confirmed yet');
  }

  // Step 3: GET /auth to get stel_acid
  const authResponse = await fetch(`${OAUTH_BASE}/auth?${OAUTH_PARAMS}`, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html',
      Cookie: `stel_ssid=${session.stelSsid}; stel_token=${session.stelToken}`,
      Referer: `${OAUTH_BASE}/auth?${OAUTH_PARAMS}`,
    },
    redirect: 'manual',
  });

  const authCookies = extractSetCookies(authResponse);
  session.stelAcid = getCookieValue(authCookies, 'stel_acid');

  // Check if redirect already has auth data
  let authData = extractAuthDataFromRedirect(authResponse);

  if (!authData) {
    const authBody = await authResponse.text();
    authData = extractAuthDataFromHtml(authBody);
  }

  if (!authData) {
    // Step 4: GET /auth/push to authorize the bot
    const pushCookie = [
      `stel_ssid=${session.stelSsid}`,
      `stel_token=${session.stelToken}`,
      session.stelAcid ? `stel_acid=${session.stelAcid}` : '',
    ]
      .filter(Boolean)
      .join('; ');

    const pushResponse = await fetch(
      `${OAUTH_BASE}/auth/push?${OAUTH_PARAMS}`,
      {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html',
          Cookie: pushCookie,
          Referer: `${OAUTH_BASE}/auth?${OAUTH_PARAMS}`,
        },
        redirect: 'manual',
      }
    );

    // Update stel_token if refreshed
    const pushCookies = extractSetCookies(pushResponse);
    const refreshedToken = getCookieValue(pushCookies, 'stel_token');
    if (refreshedToken) {
      session.stelToken = refreshedToken;
    }

    authData = extractAuthDataFromRedirect(pushResponse);

    if (!authData) {
      const pushBody = await pushResponse.text();
      authData = extractAuthDataFromHtml(pushBody);
    }
  }

  if (!authData) {
    throw new AuthError('Failed to extract auth data from Telegram OAuth flow');
  }

  const decoded = decodeAuthData(authData);

  return {
    authData,
    userInfo: {
      id: decoded.id,
      firstName: decoded.first_name,
      lastName: decoded.last_name || null,
      username: decoded.username || null,
    },
  };
}

/**
 * Full convenience flow: start → poll (with interval) → complete → login to Fragment.
 *
 * @param {string} phone - Phone number with country code
 * @param {{ pollInterval?: number, maxAttempts?: number, onWaiting?: (attempt: number) => void }} options
 * @returns {Promise<{ authData: string, userInfo: object, session: OAuthSession }>}
 */
export async function telegramOAuthFlow(phone, {
  pollInterval = 3000,
  maxAttempts = 60,
  onWaiting,
} = {}) {
  // Start
  const session = await startTelegramOAuth(phone);

  // Poll
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (onWaiting) onWaiting(attempt);
    await new Promise(r => setTimeout(r, pollInterval));

    const confirmed = await pollTelegramOAuth(session);
    if (confirmed) {
      // Complete
      const result = await completeTelegramOAuth(session);
      return { ...result, session };
    }
  }

  throw new AuthError(
    `Telegram login not confirmed after ${maxAttempts} attempts (${(maxAttempts * pollInterval / 1000).toFixed(0)}s timeout)`
  );
}
