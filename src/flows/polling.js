import { POLL_INTERVAL_MS, MAX_POLL_ATTEMPTS } from '../core/constants.js';
import { FragmentError } from '../core/errors.js';

export class ConfirmationPoller {
  #http;

  /** @param {import('../core/http-client.js').HttpClient} httpClient */
  constructor(httpClient) {
    this.#http = httpClient;
  }

  /**
   * Poll a check_method until { confirmed: true } is received.
   * Mirrors QR.checkAction from auction.js (700ms interval).
   *
   * @param {string} method - API method to poll (e.g., 'checkConverting')
   * @param {object} params - Parameters to send with each poll
   * @param {{ interval?: number, maxAttempts?: number }} options
   * @returns {Promise<object>} The final confirmed response
   */
  async waitForConfirmation(method, params = {}, {
    interval = POLL_INTERVAL_MS,
    maxAttempts = MAX_POLL_ATTEMPTS,
  } = {}) {
    for (let i = 0; i < maxAttempts; i++) {
      await this.#sleep(interval);

      const result = await this.#http.call(method, params);

      if (result.confirmed) {
        return result;
      }

      if (result.error) {
        throw new FragmentError(`Confirmation poll error: ${result.error}`, { method, response: result });
      }
    }

    throw new FragmentError(
      `Payment confirmation timed out after ${maxAttempts} attempts (~${Math.round(maxAttempts * interval / 1000)}s)`,
      { method }
    );
  }

  #sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
