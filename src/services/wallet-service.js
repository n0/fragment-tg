import { BaseService } from './base-service.js';

export class WalletApiService extends BaseService {
  async verifyWallet() {
    return this.call('verifyWallet');
  }

  async checkWallet() {
    return this.call('checkWallet', {
      account: this._requireAccount(),
      device: this._requireDevice(),
    });
  }

  async linkWallet() {
    return this.call('linkWallet', {
      account: this._requireAccount(),
      device: this._requireDevice(),
    });
  }

  async kycGetToken() {
    return this.call('kycGetToken');
  }

  async kycUpdateStatus(payload) {
    return this.call('kycUpdateStatus', { payload });
  }
}
