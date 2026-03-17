import { BaseService } from './base-service.js';
import { FragmentError } from '../core/errors.js';

export class GatewayService extends BaseService {
  async updateState(params = {}) {
    return this.call('updateGatewayRechargeState', params);
  }

  async updatePrices({ account, credits } = {}) {
    return this.call('updateGatewayPrices', { account, credits });
  }

  async initRechargeRequest(account, credits) {
    return this.call('initGatewayRechargeRequest', {
      account,
      credits: String(credits),
    });
  }

  async getRechargeLink(id) {
    return this.call('getGatewayRechargeLink', {
      id,
      account: this._requireAccount(),
      device: this._requireDevice(),
      transaction: 1,
    });
  }

  async repeatAddFunds() {
    return this.call('repeatGatewayAddFunds');
  }

  /**
   * Recharge Gateway API credits — returns transaction data.
   * @param {string} account - Gateway account ID
   * @param {number|string} credits - Number of credits
   */
  async recharge(account, credits) {
    const initResult = await this.initRechargeRequest(account, credits);
    if (initResult.error) {
      throw new FragmentError(`Init failed: ${initResult.error}`, { method: 'initGatewayRechargeRequest', response: initResult });
    }

    const linkResult = await this.getRechargeLink(initResult.req_id);
    if (linkResult.error) {
      throw new FragmentError(`getLink failed: ${linkResult.error}`, { method: 'getGatewayRechargeLink', response: linkResult });
    }

    return {
      reqId: initResult.req_id,
      ...linkResult,
      initResult,
    };
  }
}
