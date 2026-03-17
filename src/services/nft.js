import { BaseService } from './base-service.js';
import { FragmentError } from '../core/errors.js';
import { ConfirmationPoller } from '../flows/polling.js';

export class NftService extends BaseService {
  async initConverting(username) {
    return this.call('initConverting', { username });
  }

  async checkConverting(id) {
    return this.call('checkConverting', { id });
  }

  async startConverting(id, { bid, transaction } = {}) {
    return this.call('startConverting', { id, bid, transaction });
  }

  async revertConverting(username, { confirmed = false } = {}) {
    return this.call('revertConverting', { username, confirmed: confirmed ? 1 : 0 });
  }

  async initNftMove(username) {
    return this.call('initNftMoveRequest', { username });
  }

  async checkNftMoving(id) {
    return this.call('checkNftMoving', { id });
  }

  async updateTransferState(params = {}) {
    return this.call('updateNftTransferState', params);
  }

  async searchTransferRecipient(query) {
    return this.call('searchNftTransferRecipient', { query });
  }

  async initTransferRequest(recipient, slug) {
    return this.call('initNftTransferRequest', { recipient, slug });
  }

  async getTransferLink(id, { showSender = 0 } = {}) {
    return this.call('getNftTransferLink', {
      id,
      show_sender: showSender ? 1 : 0,
      account: this._requireAccount(),
      device: this._requireDevice(),
      transaction: 1,
    });
  }

  async updateWithdrawalState(params = {}) {
    return this.call('updateNftWithdrawalState', params);
  }

  /** Withdraw an NFT to an external wallet — server-side, no TON signing needed. */
  async initWithdrawal({ transaction, walletAddress, keepGift, confirmHash }) {
    return this.call('initNftWithdrawalRequest', {
      transaction,
      wallet_address: walletAddress,
      keep_gift: keepGift ? 1 : 0,
      confirm_hash: confirmHash,
    });
  }

  /**
   * Convert a username to an NFT collectible.
   * Initiates conversion and polls until complete.
   * @param {string} username - Username to convert
   */
  async convert(username) {
    const init = await this.initConverting(username);
    if (init.error) {
      throw new FragmentError(`Failed to init conversion: ${init.error}`, { method: 'initConverting', response: init });
    }

    if (!init.req_id) {
      return init;
    }

    const poller = new ConfirmationPoller(this._http);
    return poller.waitForConfirmation('checkConverting', { id: init.req_id });
  }

  /**
   * Transfer an NFT to another Telegram user — returns transaction data.
   * @param {string} slug - NFT slug/identifier
   * @param {string} recipientUsername - Recipient's Telegram username
   * @param {{ showSender?: boolean }} options
   */
  async transfer(slug, recipientUsername, { showSender = false } = {}) {
    const searchResult = await this.searchTransferRecipient(recipientUsername);
    if (!searchResult.found) {
      throw new FragmentError(`Recipient not found: ${recipientUsername}`, { method: 'searchNftTransferRecipient' });
    }

    const initResult = await this.initTransferRequest(searchResult.found.recipient, slug);
    if (initResult.error) {
      throw new FragmentError(`Init failed: ${initResult.error}`, { method: 'initNftTransferRequest', response: initResult });
    }

    const linkResult = await this.getTransferLink(initResult.req_id, { showSender: showSender ? 1 : 0 });
    if (linkResult.error) {
      throw new FragmentError(`getLink failed: ${linkResult.error}`, { method: 'getNftTransferLink', response: linkResult });
    }

    return {
      reqId: initResult.req_id,
      ...linkResult,
      initResult,
    };
  }

  /**
   * Withdraw an NFT to an external TON wallet.
   * @param {string} transaction - Transaction/NFT identifier
   * @param {string} walletAddress - Destination TON wallet address
   * @param {{ keepGift?: boolean, confirmHash?: string }} options
   */
  async withdraw(transaction, walletAddress, { keepGift = false, confirmHash } = {}) {
    return this.initWithdrawal({ transaction, walletAddress, keepGift, confirmHash });
  }
}
