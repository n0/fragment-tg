import { BaseService } from './base-service.js';
import { FragmentError, AuthError } from '../core/errors.js';
import {
  startTelegramOAuth,
  pollTelegramOAuth,
  completeTelegramOAuth,
  telegramOAuthFlow,
  decodeAuthData,
} from '../auth/telegram-oauth.js';

export class AuthService extends BaseService {
  /**
   * Log in via Telegram auth widget data.
   * @param {string} authData - Base64-encoded Telegram auth data
   */
  async logIn(authData) {
    return this.call('logIn', { auth: authData });
  }

  async logOut() {
    return this.call('logOut');
  }

  /**
   * Get a TonConnect v1 auth link (QR code flow).
   * @returns {Promise<{ qr_link: string, link: string, check_method: string, check_params: object }>}
   */
  async getTonAuthLink() {
    return this.call('getTonAuthLink');
  }

  /**
   * Verify TonConnect wallet proof-of-ownership.
   * Pass a pre-signed proof from your external wallet.
   *
   * @param {{ account: string, device: string, proof: string }} params - JSON strings
   * @returns {Promise<{ verified: boolean, error?: string }>}
   */
  async checkTonProofAuth({ account, device, proof }) {
    return this._http.call('checkTonProofAuth', { account, device, proof }, { captureHeaders: true });
  }

  /** Disconnect TON wallet from Fragment account. */
  async tonLogOut() {
    return this.call('tonLogOut');
  }

  /**
   * Authenticate a Telegram user object (from Telegram Login Widget).
   * @param {{ id: number, first_name: string, username?: string, photo_url?: string, auth_date: number, hash: string }} telegramUser
   */
  async authenticateTelegram(telegramUser) {
    const authData = Buffer.from(
      encodeURIComponent(JSON.stringify(telegramUser))
    ).toString('base64');

    const result = await this._http.call('logIn', { auth: authData }, { captureHeaders: true });

    if (result.error) {
      throw new FragmentError(`Telegram login failed: ${result.error}`, { method: 'logIn', response: result });
    }

    const newCookies = result._setCookies || {};
    if (Object.keys(newCookies).length > 0) {
      this._http.updateCookies(newCookies);
    }

    return {
      success: true,
      cookies: newCookies,
      response: result,
    };
  }

  /**
   * Connect a TON wallet using a pre-signed proof.
   * Use this after signing the ton_proof challenge externally.
   *
   * @param {{ account: string, device: string, proof: string }} params - JSON-stringified TonConnect data
   * @returns {Promise<{ verified: boolean, cookies: object }>}
   */
  async connectWallet({ account, device, proof }) {
    const result = await this.checkTonProofAuth({ account, device, proof });

    if (!result.verified) {
      throw new AuthError(`Wallet proof verification failed: ${result.error || 'unknown reason'}`);
    }

    const newCookies = result._setCookies || {};
    if (Object.keys(newCookies).length > 0) {
      this._http.updateCookies(newCookies);
    }

    return {
      verified: true,
      cookies: newCookies,
      response: result,
    };
  }

  /**
   * Get the ton_proof challenge from Fragment's page.
   * Sign this externally with your wallet, then pass to connectWallet().
   * @returns {Promise<string|null>}
   */
  async getTonProof() {
    return this._http.hashManager.getTonProof();
  }

  async disconnectWallet() {
    const result = await this.tonLogOut();
    this._http.updateCookies({ stel_ton_token: '' });
    return result;
  }

  async isSessionValid() {
    try {
      const data = await this.call('updateRandom');
      return !data.error;
    } catch {
      return false;
    }
  }

  /**
   * Get the initial session cookie (stel_ssid) from Fragment.
   * @returns {Promise<{ cookies: object, hash: string, tonProof: string|null }>}
   */
  async getSessionCookie() {
    const pageData = await this._http.hashManager.fetchPage('/');
    const newCookies = pageData.setCookies || {};

    if (Object.keys(newCookies).length > 0) {
      this._http.updateCookies(newCookies);
    }

    return {
      cookies: newCookies,
      hash: pageData.hash,
      tonProof: pageData.tonProof,
    };
  }

  /** Start Telegram OAuth flow with a phone number. */
  async startLogin(phone) {
    return startTelegramOAuth(phone);
  }

  /** Poll once to check if user confirmed the Telegram login. */
  async pollLogin(oauthSession) {
    return pollTelegramOAuth(oauthSession);
  }

  /** Complete the OAuth flow after user confirms. */
  async completeLogin(oauthSession) {
    return completeTelegramOAuth(oauthSession);
  }

  /**
   * Full login flow: phone -> Telegram confirmation -> Fragment stel_token.
   *
   * @param {string} phone - Phone number with country code
   * @param {{ pollInterval?: number, maxAttempts?: number, onWaiting?: (attempt: number) => void }} options
   */
  async loginWithPhone(phone, {
    pollInterval = 3000,
    maxAttempts = 60,
    onWaiting,
  } = {}) {
    const { authData, userInfo } = await telegramOAuthFlow(phone, {
      pollInterval,
      maxAttempts,
      onWaiting,
    });

    const decoded = decodeAuthData(authData);
    const loginResult = await this.authenticateTelegram(decoded);

    return {
      success: true,
      cookies: { ...loginResult.cookies },
      userInfo,
    };
  }
}
