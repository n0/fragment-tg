import { BaseService } from './base-service.js';

export class RandomService extends BaseService {
  async updateState() {
    return this.call('updateRandom');
  }

  async repeat() {
    return this.call('repeatRandom');
  }

  /**
   * Get random number generation link — returns transaction data.
   * Pays a small TON fee to produce a verifiable random number.
   */
  async getLink() {
    return this.call('getRandomNumberLink', {
      account: this._requireAccount(),
      device: this._requireDevice(),
      transaction: 1,
    });
  }
}
