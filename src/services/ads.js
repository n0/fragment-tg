import { BaseService } from './base-service.js';
import { FragmentError } from '../core/errors.js';

export class AdsService extends BaseService {
  async updateState(params = {}) {
    return this.call('updateAdsState', params);
  }

  async updateTopupState(params = {}) {
    return this.call('updateAdsTopupState', params);
  }

  async updateRevenueWithdrawalState(params = {}) {
    return this.call('updateAdsRevenueWithdrawalState', params);
  }

  async searchTopupRecipient(query) {
    return this.call('searchAdsTopupRecipient', { query });
  }

  async initTopupRequest(recipient, amount) {
    return this.call('initAdsTopupRequest', { recipient, amount: String(amount) });
  }

  async getTopupLink(id, { showSender = 0 } = {}) {
    return this.call('getAdsTopupLink', {
      id,
      show_sender: showSender ? 1 : 0,
      account: this._requireAccount(),
      device: this._requireDevice(),
      transaction: 1,
    });
  }

  async repeatTopup() {
    return this.call('repeatAdsTopup');
  }

  async initRechargeRequest(account, amount) {
    return this.call('initAdsRechargeRequest', { account, amount: String(amount) });
  }

  async getRechargeLink(id) {
    return this.call('getAdsRechargeLink', {
      id,
      account: this._requireAccount(),
      device: this._requireDevice(),
      transaction: 1,
    });
  }

  async repeatAddFunds() {
    return this.call('repeatAdsAddFunds');
  }

  /** Revenue withdrawal — server-side, no TON signing needed. */
  async initRevenueWithdrawal({ transaction, walletAddress, confirmHash }) {
    return this.call('initAdsRevenueWithdrawalRequest', {
      transaction,
      wallet_address: walletAddress,
      confirm_hash: confirmHash,
    });
  }

  /**
   * Top-up another user's ads account — returns transaction data.
   * @param {string} username - Recipient's username or account ID
   * @param {number|string} amount - Amount in TON
   * @param {{ showSender?: boolean }} options
   */
  async topup(username, amount, { showSender = false } = {}) {
    const searchResult = await this.searchTopupRecipient(username);
    if (!searchResult.found) {
      throw new FragmentError(`Ads account not found: ${username}`, { method: 'searchAdsTopupRecipient' });
    }

    const initResult = await this.initTopupRequest(searchResult.found.recipient, amount);
    if (initResult.error) {
      throw new FragmentError(`Init failed: ${initResult.error}`, { method: 'initAdsTopupRequest', response: initResult });
    }

    const linkResult = await this.getTopupLink(initResult.req_id, { showSender: showSender ? 1 : 0 });
    if (linkResult.error) {
      throw new FragmentError(`getLink failed: ${linkResult.error}`, { method: 'getAdsTopupLink', response: linkResult });
    }

    return {
      reqId: initResult.req_id,
      ...linkResult,
      initResult,
    };
  }

  /**
   * Recharge your own ads account — returns transaction data.
   * @param {string} account - Your ads account ID
   * @param {number|string} amount - Amount in TON
   */
  async recharge(account, amount) {
    const initResult = await this.initRechargeRequest(account, amount);
    if (initResult.error) {
      throw new FragmentError(`Init failed: ${initResult.error}`, { method: 'initAdsRechargeRequest', response: initResult });
    }

    const linkResult = await this.getRechargeLink(initResult.req_id);
    if (linkResult.error) {
      throw new FragmentError(`getLink failed: ${linkResult.error}`, { method: 'getAdsRechargeLink', response: linkResult });
    }

    return {
      reqId: initResult.req_id,
      ...linkResult,
      initResult,
    };
  }
}
