import { BaseService } from './base-service.js';

export class WalletApiService extends BaseService {
  async verifyWallet() {
    return this.call('verifyWallet');
  }

  async checkWallet() {
    return this.call('checkWallet');
  }

  async linkWallet() {
    return this.call('linkWallet');
  }

  async kycGetToken() {
    return this.call('kycGetToken');
  }

  async kycUpdateStatus(payload) {
    return this.call('kycUpdateStatus', { payload });
  }
}
