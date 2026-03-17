import { BaseService } from './base-service.js';
import { FragmentError } from '../core/errors.js';

export class PremiumGiveawayService extends BaseService {
  async updateState(params = {}) {
    return this.call('updatePremiumGiveawayState', params);
  }

  async updatePrices(quantity) {
    return this.call('updatePremiumGiveawayPrices', { quantity: String(quantity) });
  }

  async searchRecipient(query, { quantity, months } = {}) {
    return this.call('searchPremiumGiveawayRecipient', { query, quantity, months });
  }

  async initRequest(recipient, quantity, months) {
    return this.call('initGiveawayPremiumRequest', {
      recipient,
      quantity: String(quantity),
      months: String(months),
    });
  }

  async getLink(id) {
    return this.call('getGiveawayPremiumLink', {
      id,
      account: this._requireAccount(),
      device: this._requireDevice(),
      transaction: 1,
    });
  }

  async repeat() {
    return this.call('repeatPremiumGiveaway');
  }

  /**
   * Create a Premium giveaway — searches channel, inits request, returns transaction data.
   * @param {string} channelUsername - Channel/group username
   * @param {number} winners - Number of winners
   * @param {3|6|12} months - Premium duration per winner
   */
  async create(channelUsername, winners, months = 3) {
    const searchResult = await this.searchRecipient(channelUsername, { quantity: winners, months });
    if (!searchResult.found) {
      throw new FragmentError(`Channel not found: ${channelUsername}`, { method: 'searchPremiumGiveawayRecipient' });
    }

    const initResult = await this.initRequest(searchResult.found.recipient, winners, months);
    if (initResult.error) {
      throw new FragmentError(`Init failed: ${initResult.error}`, { method: 'initGiveawayPremiumRequest', response: initResult });
    }

    const linkResult = await this.getLink(initResult.req_id);
    if (linkResult.error) {
      throw new FragmentError(`getLink failed: ${linkResult.error}`, { method: 'getGiveawayPremiumLink', response: linkResult });
    }

    return {
      reqId: initResult.req_id,
      ...linkResult,
      initResult,
    };
  }
}
