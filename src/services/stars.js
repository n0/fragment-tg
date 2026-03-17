import { BaseService } from './base-service.js';
import { FragmentError } from '../core/errors.js';

export class StarsService extends BaseService {
  async updateState(params = {}) {
    return this.call('updateStarsBuyState', params);
  }

  async updatePrices({ stars, quantity } = {}) {
    return this.call('updateStarsPrices', { stars, quantity });
  }

  async searchRecipient(query, quantity) {
    return this.call('searchStarsRecipient', { query, quantity });
  }

  async initBuyRequest(recipient, quantity) {
    return this.call('initBuyStarsRequest', { recipient, quantity: String(quantity) });
  }

  async getBuyLink(id, { showSender = 0 } = {}) {
    return this.call('getBuyStarsLink', {
      id,
      show_sender: showSender ? 1 : 0,
      account: this._requireAccount(),
      device: this._requireDevice(),
      transaction: 1,
    });
  }

  async repeat() {
    return this.call('repeatStars');
  }

  /**
   * Buy Telegram Stars — searches recipient, inits request, returns transaction data.
   * Sign the transaction externally, then call fragment.confirmPayment() with the BOC.
   *
   * @param {string} username - Telegram username
   * @param {number} quantity - Number of Stars
   * @param {{ showSender?: boolean }} options
   * @returns {Promise<{ reqId: string, transaction: object, confirmMethod: string, confirmParams: object }>}
   */
  async buy(username, quantity, { showSender = false } = {}) {
    const searchResult = await this.searchRecipient(username, quantity);
    if (!searchResult.found) {
      throw new FragmentError(`Recipient not found: ${username}`, { method: 'searchStarsRecipient' });
    }

    const initResult = await this.initBuyRequest(searchResult.found.recipient, quantity);
    if (initResult.error) {
      throw new FragmentError(`Init failed: ${initResult.error}`, { method: 'initBuyStarsRequest', response: initResult });
    }

    const linkResult = await this.getBuyLink(initResult.req_id, { showSender: showSender ? 1 : 0 });
    if (linkResult.error) {
      throw new FragmentError(`getLink failed: ${linkResult.error}`, { method: 'getBuyStarsLink', response: linkResult });
    }

    return {
      reqId: initResult.req_id,
      ...linkResult,
      initResult,
    };
  }
}
