import { BaseService } from './base-service.js';
import { FragmentError } from '../core/errors.js';

const CODE_REGEX = /class="[^"]*table-cell-value[^"]*"[^>]*>([^<]+)</;
const ROW_REGEX = /<tr[\s>]/g;

export class LoginCodesService extends BaseService {
  async updateState(number, { lt, fromApp } = {}) {
    return this.call('updateLoginCodes', { number: this.#stripPlus(number), lt, from_app: fromApp });
  }

  async toggle(number, canReceive) {
    return this.call('toggleLoginCodes', { number: this.#stripPlus(number), can_receive: canReceive ? 1 : 0 });
  }

  async terminatePhoneSessions(number, terminateHash) {
    const params = { number: this.#stripPlus(number) };
    if (terminateHash) params.terminate_hash = terminateHash;
    return this.call('terminatePhoneSessions', params);
  }

  /**
   * Get the current login code for a phone number.
   * @param {string} number - Phone number (e.g., '+1234567890')
   */
  async getCode(number) {
    const cleanNumber = this.#stripPlus(number);
    const result = await this.call('updateLoginCodes', {
      number: cleanNumber,
      lt: '0',
      from_app: '1',
    });

    if (result.html) {
      return { ...this.#parseCodeFromHtml(result.html), raw: result };
    }

    return { code: null, activeSessions: 0, raw: result };
  }

  async getTerminateConfirmation(number) {
    const result = await this.terminatePhoneSessions(number);
    return {
      terminateHash: result.terminate_hash || null,
      confirmMessage: result.confirm_message || null,
      confirmButton: result.confirm_button || null,
      raw: result,
    };
  }

  /**
   * Terminate all Telegram sessions for a phone number.
   * @param {string} number - Phone number
   */
  async terminateAllSessions(number) {
    const confirmation = await this.getTerminateConfirmation(number);

    if (confirmation.raw.error) {
      throw new FragmentError(
        `Cannot terminate sessions: ${confirmation.raw.error}`,
        { method: 'terminatePhoneSessions' }
      );
    }

    if (!confirmation.terminateHash) {
      throw new FragmentError(
        'No terminate_hash returned — you may not own this number or have no active sessions',
        { method: 'terminatePhoneSessions', response: confirmation.raw }
      );
    }

    const result = await this.terminatePhoneSessions(number, confirmation.terminateHash);

    if (result.error) {
      throw new FragmentError(
        `Termination failed: ${result.error}`,
        { method: 'terminatePhoneSessions' }
      );
    }

    return {
      success: true,
      message: result.msg || null,
    };
  }

  #stripPlus(number) {
    return typeof number === 'string' ? number.replace(/^\+/, '') : number;
  }

  #parseCodeFromHtml(html) {
    const codeMatch = CODE_REGEX.exec(html);
    const code = codeMatch ? codeMatch[1].trim() : null;

    let activeSessions = 0;
    while (ROW_REGEX.exec(html) !== null) {
      activeSessions++;
    }

    return { code, activeSessions };
  }
}
