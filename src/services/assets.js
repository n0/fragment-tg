import { BaseService } from './base-service.js';
import { FragmentError } from '../core/errors.js';

const HASH_FROM_URL_REGEX = /api\?hash=([a-f0-9]+)/;

export const ASSET_TYPE = {
  USERNAMES: 1,
  NUMBERS: 3,
};

export class AssetsService extends BaseService {
  /**
   * List your owned assets.
   * @param {{ type?: 'usernames'|'numbers'|number, offsetId?: string }} options
   */
  async list({ type = 'usernames', offsetId } = {}) {
    let resolvedType = type;
    if (type === 'usernames') resolvedType = ASSET_TYPE.USERNAMES;
    else if (type === 'numbers') resolvedType = ASSET_TYPE.NUMBERS;
    return this.call('getAssetsList', { type: resolvedType, offset_id: offsetId });
  }

  async assignToTgAccount(username, assignTo, { type = '1' } = {}) {
    const result = await this.call('assignToTgAccount', { type, username, assign_to: assignTo });
    if (!result.ok && result.error) {
      throw new FragmentError(`Failed to assign @${username}: ${result.error}`, { method: 'assignToTgAccount' });
    }
    return result;
  }

  async unassignFromTgAccount(username, { type = '1' } = {}) {
    const result = await this.call('assignToTgAccount', { type, username, assign_to: '' });
    if (!result.ok && result.error) {
      throw new FragmentError(`Failed to unassign @${username}: ${result.error}`, { method: 'assignToTgAccount' });
    }
    return result;
  }

  async getBotUsernameLink(id) {
    return this.call('getBotUsernameLink', { id });
  }

  /**
   * Get the list of Telegram entities a username can be assigned to.
   * @param {string} username - Username to check
   * @returns {Promise<Array<{ assignTo: string, name: string, type: string }>>}
   */
  async getAssignTargets(username) {
    const html = await this._http.fetchHtml(`/username/${username}`);

    let targets = this.#parseTargetsFromHtml(html);
    if (targets.length > 0) return targets;

    const hashMatch = HASH_FROM_URL_REGEX.exec(html);
    if (!hashMatch) return [];

    const methods = ['getAssignPopup', 'usernameAssignPopup', 'assignPopup', 'getAssignForm'];
    for (const method of methods) {
      try {
        const result = await this._http.call(method, { username }, { retryOnHashExpired: false });
        if (result.error) continue;

        const popupHtml = result.html || result.content || result.popup || '';
        if (popupHtml) {
          targets = this.#parseTargetsFromHtml(popupHtml);
          if (targets.length > 0) return targets;
        }
      } catch {
        continue;
      }
    }

    return [];
  }

  async assign(username, assignTo) {
    return this.assignToTgAccount(username, assignTo);
  }

  async unassign(username) {
    return this.unassignFromTgAccount(username);
  }

  async listAll({ type } = {}) {
    const items = [];
    let offsetId;

    while (true) {
      const result = await this.list({ type, offsetId });
      if (result.items && Array.isArray(result.items)) {
        items.push(...result.items);
      }
      if (!result.next_offset_id || result.next_offset_id === false) break;
      offsetId = result.next_offset_id;
    }

    return items;
  }

  #parseTargetsFromHtml(html) {
    const targets = [];
    const seen = new Set();

    let match;
    const tokenRegex = /data-assign-to=["']([^"']+)["']/g;
    while ((match = tokenRegex.exec(html)) !== null) {
      const assignTo = match[1];
      if (seen.has(assignTo)) continue;
      seen.add(assignTo);

      const contextStart = Math.max(0, match.index - 200);
      const contextEnd = Math.min(html.length, match.index + 500);
      const context = html.substring(contextStart, contextEnd);

      let name = '';
      const nameMatch = context.match(/class="[^"]*(?:assign-item-name|assign-name|account-name)[^"]*"[^>]*>([^<]+)</);
      if (nameMatch) {
        name = nameMatch[1].trim();
      } else {
        const textMatch = context.match(/>([^<]{2,40})</);
        if (textMatch) name = textMatch[1].trim();
      }

      let type = 'personal';
      if (/channel/i.test(context)) type = 'channel';
      else if (/group/i.test(context)) type = 'group';
      else if (/bot/i.test(context)) type = 'bot';

      targets.push({ assignTo, name, type });
    }

    return targets;
  }
}
