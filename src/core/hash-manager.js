import { BASE_URL, HASH_REGEX, HASH_TTL_MS, DEFAULT_HEADERS } from './constants.js';
import { FragmentError, HashExpiredError } from './errors.js';

// Regex to extract Wallet.init options containing ton_proof
const TON_PROOF_REGEX = /Wallet\.init\((\{[^}]*"ton_proof"\s*:\s*"[^"]*"[^}]*\})\)/;
const TON_PROOF_VALUE_REGEX = /"ton_proof"\s*:\s*"([^"]*)"/;

export class HashManager {
  #hash = null;
  #fetchedAt = 0;
  #cookies;
  #ttl;

  /** Last fetched page data (ton_proof, set-cookie headers, etc.) */
  #pageData = null;

  /**
   * @param {object} cookies - { stel_dt, stel_ssid, stel_token, stel_ton_token }
   * @param {{ ttl?: number }} options
   */
  constructor(cookies, { ttl = HASH_TTL_MS } = {}) {
    this.#cookies = cookies;
    this.#ttl = ttl;
  }

  /** Get current hash, fetching a fresh one if expired or missing. */
  async getHash() {
    if (this.#hash && Date.now() - this.#fetchedAt < this.#ttl) {
      return this.#hash;
    }
    return this.refreshHash();
  }

  /** Force-fetch a new hash from the Fragment homepage. */
  async refreshHash() {
    const resp = await this.#fetchPage('/');
    const html = await resp.text();

    const hash = this.#extractHash(html);
    if (!hash) {
      throw new HashExpiredError();
    }

    // Extract ton_proof if present
    const tonProof = this.#extractTonProof(html);

    // Capture Set-Cookie headers and apply to cookie jar
    const setCookies = this.#extractSetCookies(resp);
    if (Object.keys(setCookies).length > 0) {
      Object.assign(this.#cookies, setCookies);
    }

    this.#hash = hash;
    this.#fetchedAt = Date.now();
    this.#pageData = { tonProof, setCookies, html };

    return hash;
  }

  /**
   * Fetch a page and return the raw HTML + response headers.
   * Used by auth flows to get ton_proof and capture cookies.
   * @param {string} path - URL path (e.g., '/', '/auth')
   * @returns {Promise<{ html: string, headers: Headers, setCookies: object }>}
   */
  async fetchPage(path = '/') {
    const resp = await this.#fetchPage(path);
    const html = await resp.text();
    const setCookies = this.#extractSetCookies(resp);
    const tonProof = this.#extractTonProof(html);
    const hash = this.#extractHash(html);

    if (hash) {
      this.#hash = hash;
      this.#fetchedAt = Date.now();
    }

    return { html, setCookies, tonProof, hash };
  }

  /**
   * Get the ton_proof challenge from the last fetched page.
   * If not yet fetched, fetches the homepage first.
   * @returns {Promise<string|null>}
   */
  async getTonProof() {
    if (!this.#pageData) {
      await this.refreshHash();
    }
    return this.#pageData?.tonProof || null;
  }

  /** Invalidate the cached hash so next getHash() will fetch fresh. */
  invalidate() {
    this.#hash = null;
    this.#fetchedAt = 0;
    this.#pageData = null;
  }

  /** Update cookies (e.g., after auth sets new cookies). */
  updateCookies(newCookies) {
    Object.assign(this.#cookies, newCookies);
  }

  /** Get current cookie reference. */
  get cookies() {
    return this.#cookies;
  }

  async #fetchPage(path) {
    const cookieStr = this.#buildCookieString();
    const resp = await fetch(BASE_URL + path, {
      headers: {
        'User-Agent': DEFAULT_HEADERS['User-Agent'],
        'Cookie': cookieStr,
      },
      redirect: 'follow',
    });

    if (!resp.ok) {
      throw new FragmentError(`Failed to fetch ${path}: HTTP ${resp.status}`);
    }

    return resp;
  }

  #buildCookieString() {
    return Object.entries(this.#cookies)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  #extractHash(html) {
    const match = HASH_REGEX.exec(html);
    return match ? match[1] : null;
  }

  #extractTonProof(html) {
    const match = TON_PROOF_VALUE_REGEX.exec(html);
    return match ? match[1] : null;
  }

  /**
   * Parse Set-Cookie headers from a response into a { name: value } object.
   */
  #extractSetCookies(resp) {
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
