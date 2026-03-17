import { BASE_URL, API_PATH, DEFAULT_HEADERS } from './constants.js';
import { FragmentError, AuthError } from './errors.js';

export class HttpClient {
  /** @type {import('./hash-manager.js').HashManager} */
  #hashManager;
  #cookies;

  /**
   * @param {import('./hash-manager.js').HashManager} hashManager
   * @param {object} cookies - { stel_dt, stel_ssid, stel_token, stel_ton_token }
   */
  constructor(hashManager, cookies) {
    this.#hashManager = hashManager;
    this.#cookies = cookies;
  }

  /** Access to the hash manager (used by auth flows). */
  get hashManager() {
    return this.#hashManager;
  }

  /**
   * Make an RPC call to Fragment's API.
   * @param {string} method - API method name
   * @param {object} params - Method-specific parameters
   * @param {{ retryOnHashExpired?: boolean, captureHeaders?: boolean, pageHash?: string }} options
   * @returns {Promise<object>} Parsed JSON response, optionally with _headers and _setCookies
   */
  async call(method, params = {}, { retryOnHashExpired = true, captureHeaders = false, pageHash } = {}) {
    const hash = pageHash || await this.#hashManager.getHash();
    const url = `${BASE_URL}${API_PATH}?hash=${hash}`;

    const body = new URLSearchParams();
    body.set('method', method);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        body.set(key, String(value));
      }
    }

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        ...DEFAULT_HEADERS,
        'Cookie': this.#buildCookieString(),
      },
      body: body.toString(),
    });

    if (resp.status === 401) {
      throw new AuthError();
    }

    let data;
    try {
      data = await resp.json();
    } catch {
      const text = await resp.text().catch(() => '');
      throw new FragmentError(`Invalid JSON response from ${method}: ${text.slice(0, 200)}`, { method });
    }

    // Hash expired — refresh and retry once (skip if using a page-specific hash)
    if (data.error === 'Access denied' && retryOnHashExpired && !pageHash) {
      this.#hashManager.invalidate();
      return this.call(method, params, { retryOnHashExpired: false, captureHeaders });
    }

    // Attach response headers if requested (for auth flows that need Set-Cookie)
    if (captureHeaders) {
      data._setCookies = this.#parseSetCookies(resp);
      data._headers = resp.headers;
    }

    return data;
  }

  /**
   * GET request for non-API endpoints.
   * @param {string} path - URL path
   * @param {object} params - Query parameters
   * @returns {Promise<object>} Parsed JSON response
   */
  async get(path, params = {}) {
    const url = new URL(path, BASE_URL);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }

    const resp = await fetch(url.toString(), {
      headers: {
        ...DEFAULT_HEADERS,
        'Cookie': this.#buildCookieString(),
      },
    });

    if (resp.status === 401) {
      throw new AuthError();
    }

    return resp.json();
  }

  /**
   * Fetch a Fragment page and return raw HTML.
   * @param {string} path - URL path (e.g., '/username/coolname')
   * @returns {Promise<string>} Raw HTML
   */
  async fetchHtml(path) {
    const resp = await fetch(`${BASE_URL}${path}`, {
      headers: {
        ...DEFAULT_HEADERS,
        'Cookie': this.#buildCookieString(),
      },
    });
    return resp.text();
  }

  /** Update stored cookies (e.g., after auth sets new ones). */
  updateCookies(newCookies) {
    Object.assign(this.#cookies, newCookies);
    this.#hashManager.updateCookies(newCookies);
  }

  #buildCookieString() {
    return Object.entries(this.#cookies)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  #parseSetCookies(resp) {
    const cookies = {};
    const raw = resp.headers.getSetCookie?.() || [];
    for (const header of raw) {
      const [nameVal] = header.split(';');
      const eqIdx = nameVal.indexOf('=');
      if (eqIdx > 0) {
        const name = nameVal.substring(0, eqIdx).trim();
        const value = nameVal.substring(eqIdx + 1).trim();
        cookies[name] = value;
      }
    }
    return cookies;
  }
}
