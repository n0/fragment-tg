import { BaseService } from './base-service.js';
import { FragmentError } from '../core/errors.js';

export class AuctionService extends BaseService {
  /**
   * Search for auctions/listings.
   * @param {string} query - Search text
   * @param {{ type?: string, offsetId?: string }} options
   */
  async search(query, { type, offsetId } = {}) {
    return this.call('searchAuctions', { query, type, offset_id: offsetId });
  }

  /**
   * Get/refresh auction state for a specific item.
   * @param {string} type - Item type (e.g., 'username')
   * @param {string} username - Item identifier
   * @param {{ lt?: string, lv?: string }} options - Long-poll params
   */
  async updateAuction(type, username, { lt, lv } = {}) {
    return this.call('updateAuction', { type, username, lt, lv });
  }

  async subscribe(type, username) {
    return this.call('subscribe', { type, username });
  }

  async unsubscribe(type, username) {
    return this.call('unsubscribe', { type, username });
  }

  async canSellItem(type, username, { auction = false } = {}) {
    return this.call('canSellItem', { type, username, auction: auction ? 1 : 0 });
  }

  async initOffer(type, username) {
    return this.call('initOfferRequest', { type, username });
  }

  /**
   * Get bid link — returns transaction data for signing.
   * @param {string} type - Item type
   * @param {string} username - Item identifier
   * @param {number|string} bid - Bid amount in TON
   */
  async getBidLink(type, username, bid) {
    return this.call('getBidLink', {
      type,
      username,
      bid: String(bid),
      account: this._requireAccount(),
      device: this._requireDevice(),
      transaction: 1,
    });
  }

  /**
   * Place a bid on an auction item — returns transaction data.
   * @param {string} type - Item type
   * @param {string} username - Item identifier
   * @param {number|string} bid - Bid amount in TON
   */
  async placeBid(type, username, bid) {
    const linkResult = await this.getBidLink(type, username, bid);
    if (linkResult.error) {
      throw new FragmentError(`getBidLink failed: ${linkResult.error}`, { method: 'getBidLink', response: linkResult });
    }
    return linkResult;
  }

  /**
   * Make a direct offer on a fixed-price item — returns transaction data.
   * @param {string} type - Item type
   * @param {string} username - Item identifier
   * @param {number|string} amount - Offer amount in TON
   */
  async makeOffer(type, username, amount) {
    const init = await this.initOffer(type, username);
    if (!init.req_id) {
      throw new FragmentError(`Failed to init offer for ${username}`, { method: 'initOfferRequest', response: init });
    }

    const linkResult = await this.call('getOfferLink', {
      id: init.req_id,
      amount: String(amount),
      account: this._requireAccount(),
      device: this._requireDevice(),
      transaction: 1,
    });
    if (linkResult.error) {
      throw new FragmentError(`getOfferLink failed: ${linkResult.error}`, { method: 'getOfferLink', response: linkResult });
    }

    return { reqId: init.req_id, ...linkResult };
  }

  /**
   * Start an auction for an owned item — returns transaction data.
   * @param {string} type - Item type
   * @param {string} username - Item to auction
   * @param {number|string} minAmount - Minimum bid in TON
   * @param {{ maxAmount?: number|string }} options
   */
  async startAuction(type, username, minAmount, { maxAmount } = {}) {
    const linkResult = await this.call('getStartAuctionLink', {
      type,
      username,
      min_amount: String(minAmount),
      ...(maxAmount !== undefined ? { max_amount: String(maxAmount) } : {}),
      account: this._requireAccount(),
      device: this._requireDevice(),
      transaction: 1,
    });
    if (linkResult.error) {
      throw new FragmentError(`getStartAuctionLink failed: ${linkResult.error}`, { method: 'getStartAuctionLink', response: linkResult });
    }
    return linkResult;
  }

  /**
   * Cancel an active auction — returns transaction data.
   * @param {string} type - Item type
   * @param {string} username - Item whose auction to cancel
   */
  async cancelAuction(type, username) {
    const linkResult = await this.call('getCancelAuctionLink', {
      type,
      username,
      account: this._requireAccount(),
      device: this._requireDevice(),
      transaction: 1,
    });
    if (linkResult.error) {
      throw new FragmentError(`getCancelAuctionLink failed: ${linkResult.error}`, { method: 'getCancelAuctionLink', response: linkResult });
    }
    return linkResult;
  }
}
