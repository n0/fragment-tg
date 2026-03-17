import { BaseService } from './base-service.js';
import { FragmentError } from '../core/errors.js';

export class StarsGiveawayService extends BaseService {
  async updateState(params = {}) {
    return this.call('updateStarsGiveawayState', params);
  }

  async updatePrices({ quantity, stars } = {}) {
    return this.call('updateStarsGiveawayPrices', { quantity, stars });
  }

  async searchRecipient(query) {
    return this.call('searchStarsGiveawayRecipient', { query });
  }

  async initRequest(recipient, quantity, stars) {
    return this.call('initGiveawayStarsRequest', {
      recipient,
      quantity: String(quantity),
      stars: String(stars),
    });
  }

  async getLink(id) {
    return this.call('getGiveawayStarsLink', {
      id,
      account: this._requireAccount(),
      device: this._requireDevice(),
      transaction: 1,
    });
  }

  async repeat() {
    return this.call('repeatStarsGiveaway');
  }

  /**
   * Create a Stars giveaway — searches channel, inits request, returns transaction data.
   * @param {string} channelUsername - Channel/group username
   * @param {number} winners - Number of winners
   * @param {number} starsPerWinner - Stars per winner
   */
  async create(channelUsername, winners, starsPerWinner) {
    const searchResult = await this.searchRecipient(channelUsername);
    if (!searchResult.found) {
      throw new FragmentError(`Channel not found: ${channelUsername}`, { method: 'searchStarsGiveawayRecipient' });
    }

    const initResult = await this.initRequest(searchResult.found.recipient, winners, starsPerWinner);
    if (initResult.error) {
      throw new FragmentError(`Init failed: ${initResult.error}`, { method: 'initGiveawayStarsRequest', response: initResult });
    }

    const linkResult = await this.getLink(initResult.req_id);
    if (linkResult.error) {
      throw new FragmentError(`getLink failed: ${linkResult.error}`, { method: 'getGiveawayStarsLink', response: linkResult });
    }

    return {
      reqId: initResult.req_id,
      ...linkResult,
      initResult,
    };
  }
}
