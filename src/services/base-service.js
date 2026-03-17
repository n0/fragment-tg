import { FragmentError } from '../core/errors.js';

export class BaseService {
  /** @type {import('../core/http-client.js').HttpClient} */
  _http;
  /** @type {{ account: string, device: string } | null} */
  _tonconnect;

  constructor(http, tonconnect) {
    this._http = http;
    this._tonconnect = tonconnect;
  }

  /** Shortcut for making an API call. */
  async call(method, params = {}) {
    return this._http.call(method, params);
  }

  /** Get TonConnect account JSON, or throw if not configured. */
  _requireAccount() {
    if (!this._tonconnect?.account) {
      throw new FragmentError(
        'TonConnect account not configured — pass tonconnect.account to Fragment constructor for payment methods'
      );
    }
    return this._tonconnect.account;
  }

  /** Get TonConnect device JSON, or throw if not configured. */
  _requireDevice() {
    if (!this._tonconnect?.device) {
      throw new FragmentError(
        'TonConnect device not configured — pass tonconnect.device to Fragment constructor for payment methods'
      );
    }
    return this._tonconnect.device;
  }
}
