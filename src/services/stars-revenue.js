import { BaseService } from './base-service.js';

export class StarsRevenueService extends BaseService {
  async updateState(params = {}) {
    return this.call('updateStarsRevenueWithdrawalState', params);
  }

  /**
   * Withdraw Stars revenue to a TON wallet.
   * Server-side operation — no TON transaction signing needed.
   */
  async initWithdrawal({ transaction, walletAddress, withdrawalData, confirmHash }) {
    return this.call('initStarsRevenueWithdrawalRequest', {
      transaction,
      wallet_address: walletAddress,
      withdrawal_data: withdrawalData,
      confirm_hash: confirmHash,
    });
  }
}
