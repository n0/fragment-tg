import { BaseService } from './base-service.js';
import { FragmentError } from '../core/errors.js';

export class PremiumService extends BaseService {
  async updateState(params = {}) {
    return this.call('updatePremiumState', params);
  }

  async searchRecipient(query, months) {
    return this.call('searchPremiumGiftRecipient', { query, months: String(months) });
  }

  async initGiftRequest(recipient, months) {
    return this.call('initGiftPremiumRequest', { recipient, months: String(months) });
  }

  async getGiftLink(id, { showSender = 0 } = {}) {
    return this.call('getGiftPremiumLink', {
      id,
      show_sender: showSender ? 1 : 0,
      account: this._requireAccount(),
      device: this._requireDevice(),
      transaction: 1,
    });
  }

  async repeat() {
    return this.call('repeatPremium');
  }

  /**
   * Gift Telegram Premium — searches recipient, inits request, returns transaction data.
   * @param {string} username - Recipient's Telegram username
   * @param {3|6|12} months - Subscription duration
   * @param {{ showSender?: boolean }} options
   */
  async gift(username, months = 3, { showSender = false } = {}) {
    const searchResult = await this.searchRecipient(username, months);
    if (!searchResult.found) {
      throw new FragmentError(`Recipient not found: ${username}`, { method: 'searchPremiumGiftRecipient' });
    }

    const initResult = await this.initGiftRequest(searchResult.found.recipient, months);
    if (initResult.error) {
      throw new FragmentError(`Init failed: ${initResult.error}`, { method: 'initGiftPremiumRequest', response: initResult });
    }

    const linkResult = await this.getGiftLink(initResult.req_id, { showSender: showSender ? 1 : 0 });
    if (linkResult.error) {
      throw new FragmentError(`getLink failed: ${linkResult.error}`, { method: 'getGiftPremiumLink', response: linkResult });
    }

    return {
      reqId: initResult.req_id,
      ...linkResult,
      initResult,
    };
  }
}
