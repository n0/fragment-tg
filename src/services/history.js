import { BaseService } from './base-service.js';

export class HistoryService extends BaseService {
  async getBids({ type, offsetId } = {}) {
    return this.call('getBidsHistory', { type, offset_id: offsetId });
  }

  async getPremium({ type, offsetId } = {}) {
    return this.call('getPremiumHistory', { type, offset_id: offsetId });
  }

  async getOrders({ type, offsetId } = {}) {
    return this.call('getOrdersHistory', { type, offset_id: offsetId });
  }

  async getOwners({ type, offsetId } = {}) {
    return this.call('getOwnersHistory', { type, offset_id: offsetId });
  }
}
