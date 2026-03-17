import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AssetsService, ASSET_TYPE } from '../../src/services/assets.js';
import { createMockHttp, findCall } from '../helpers.js';

describe('AssetsService', () => {
  describe('ASSET_TYPE', () => {
    it('has USERNAMES = 1 and NUMBERS = 3', () => {
      assert.equal(ASSET_TYPE.USERNAMES, 1);
      assert.equal(ASSET_TYPE.NUMBERS, 3);
    });
  });

  describe('list', () => {
    it('resolves "usernames" to type 1', async () => {
      const http = createMockHttp({});
      const svc = new AssetsService(http, null);
      await svc.list({ type: 'usernames' });
      assert.equal(findCall(http, 'getAssetsList').params.type, 1);
    });

    it('resolves "numbers" to type 3', async () => {
      const http = createMockHttp({});
      const svc = new AssetsService(http, null);
      await svc.list({ type: 'numbers' });
      assert.equal(findCall(http, 'getAssetsList').params.type, 3);
    });

    it('defaults to usernames', async () => {
      const http = createMockHttp({});
      const svc = new AssetsService(http, null);
      await svc.list();
      assert.equal(findCall(http, 'getAssetsList').params.type, 1);
    });

    it('passes numeric type directly', async () => {
      const http = createMockHttp({});
      const svc = new AssetsService(http, null);
      await svc.list({ type: 3 });
      assert.equal(findCall(http, 'getAssetsList').params.type, 3);
    });

    it('passes offsetId as offset_id', async () => {
      const http = createMockHttp({});
      const svc = new AssetsService(http, null);
      await svc.list({ offsetId: 'page2' });
      assert.equal(findCall(http, 'getAssetsList').params.offset_id, 'page2');
    });
  });

  describe('assignToTgAccount', () => {
    it('calls assignToTgAccount with username and assignTo', async () => {
      const http = createMockHttp({ assignToTgAccount: { ok: true } });
      const svc = new AssetsService(http, null);
      await svc.assignToTgAccount('cool', 'target1');
      const call = findCall(http, 'assignToTgAccount');
      assert.equal(call.params.username, 'cool');
      assert.equal(call.params.assign_to, 'target1');
      assert.equal(call.params.type, '1');
    });

    it('throws on error response', async () => {
      const http = createMockHttp({ assignToTgAccount: { error: 'already assigned' } });
      const svc = new AssetsService(http, null);
      await assert.rejects(svc.assignToTgAccount('cool', 't1'), { message: /Failed to assign/ });
    });
  });

  describe('unassignFromTgAccount', () => {
    it('passes empty assign_to', async () => {
      const http = createMockHttp({ assignToTgAccount: { ok: true } });
      const svc = new AssetsService(http, null);
      await svc.unassignFromTgAccount('cool');
      assert.equal(findCall(http, 'assignToTgAccount').params.assign_to, '');
    });
  });

  describe('getBotUsernameLink', () => {
    it('calls getBotUsernameLink with id', async () => {
      const http = createMockHttp({});
      const svc = new AssetsService(http, null);
      await svc.getBotUsernameLink('link1');
      assert.equal(findCall(http, 'getBotUsernameLink').params.id, 'link1');
    });
  });

  describe('assign / unassign convenience', () => {
    it('assign delegates to assignToTgAccount', async () => {
      const http = createMockHttp({ assignToTgAccount: { ok: true } });
      const svc = new AssetsService(http, null);
      await svc.assign('cool', 'target');
      assert.equal(findCall(http, 'assignToTgAccount').params.assign_to, 'target');
    });

    it('unassign delegates to unassignFromTgAccount', async () => {
      const http = createMockHttp({ assignToTgAccount: { ok: true } });
      const svc = new AssetsService(http, null);
      await svc.unassign('cool');
      assert.equal(findCall(http, 'assignToTgAccount').params.assign_to, '');
    });
  });

  describe('listAll', () => {
    it('paginates until no next_offset_id', async () => {
      let page = 0;
      const http = createMockHttp({
        getAssetsList: () => {
          page++;
          if (page === 1) return { items: ['a', 'b'], next_offset_id: 'p2' };
          if (page === 2) return { items: ['c'], next_offset_id: false };
          return { items: [] };
        },
      });
      const svc = new AssetsService(http, null);
      const all = await svc.listAll();
      assert.deepEqual(all, ['a', 'b', 'c']);
      assert.equal(page, 2);
    });

    it('returns empty array when no items', async () => {
      const http = createMockHttp({ getAssetsList: { items: [], next_offset_id: false } });
      const svc = new AssetsService(http, null);
      const all = await svc.listAll();
      assert.deepEqual(all, []);
    });
  });

  describe('getAssignTargets', () => {
    it('parses targets from HTML with data-assign-to attributes', async () => {
      const html = `
        <div data-assign-to="tok1" class="item">
          <span class="assign-item-name">My Account</span>
        </div>
        <div data-assign-to="tok2" class="item">
          <span class="assign-item-name">My Channel</span> channel
        </div>
      `;
      const http = createMockHttp({ _fetchHtml: html });
      const svc = new AssetsService(http, null);
      const targets = await svc.getAssignTargets('cool');
      assert.equal(targets.length, 2);
      assert.equal(targets[0].assignTo, 'tok1');
      assert.equal(targets[0].name, 'My Account');
    });

    it('returns empty array when no targets found and no hash', async () => {
      const http = createMockHttp({ _fetchHtml: '<html>nothing</html>' });
      const svc = new AssetsService(http, null);
      const targets = await svc.getAssignTargets('cool');
      assert.deepEqual(targets, []);
    });
  });
});
