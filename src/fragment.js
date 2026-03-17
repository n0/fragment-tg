import { HashManager } from './core/hash-manager.js';
import { HttpClient } from './core/http-client.js';

import { StarsService } from './services/stars.js';
import { StarsGiveawayService } from './services/stars-giveaway.js';
import { StarsRevenueService } from './services/stars-revenue.js';
import { PremiumService } from './services/premium.js';
import { PremiumGiveawayService } from './services/premium-giveaway.js';
import { AdsService } from './services/ads.js';
import { GatewayService } from './services/gateway.js';
import { AuctionService } from './services/auction.js';
import { AssetsService } from './services/assets.js';
import { NftService } from './services/nft.js';
import { AuthService } from './services/auth.js';
import { WalletApiService } from './services/wallet-service.js';
import { HistoryService } from './services/history.js';
import { SessionsService } from './services/sessions.js';
import { RandomService } from './services/random.js';
import { LoginCodesService } from './services/login-codes.js';

export class Fragment {
  #options;
  #initialized = false;
  #http;

  /** @type {StarsService} */
  stars;
  /** @type {StarsGiveawayService} */
  starsGiveaway;
  /** @type {StarsRevenueService} */
  starsRevenue;
  /** @type {PremiumService} */
  premium;
  /** @type {PremiumGiveawayService} */
  premiumGiveaway;
  /** @type {AdsService} */
  ads;
  /** @type {GatewayService} */
  gateway;
  /** @type {AuctionService} */
  auction;
  /** @type {AssetsService} */
  assets;
  /** @type {NftService} */
  nft;
  /** @type {AuthService} */
  auth;
  /** @type {WalletApiService} */
  walletApi;
  /** @type {HistoryService} */
  history;
  /** @type {SessionsService} */
  sessions;
  /** @type {RandomService} */
  random;
  /** @type {LoginCodesService} */
  loginCodes;

  /**
   * Create a Fragment SDK instance.
   *
   * @param {object} options
   * @param {object} options.cookies - Fragment session cookies
   * @param {string} options.cookies.stel_dt - Timezone offset
   * @param {string} options.cookies.stel_ssid - Session ID
   * @param {string} options.cookies.stel_token - Auth token
   * @param {string} options.cookies.stel_ton_token - TON wallet token
   * @param {object} [options.tonconnect] - TonConnect identity (required for payment methods)
   * @param {string} [options.tonconnect.account] - JSON-stringified TonConnect account
   * @param {string} [options.tonconnect.device] - JSON-stringified TonConnect device info
   *
   * @example
   * // Read-only (no payments):
   * const frag = new Fragment({
   *   cookies: { stel_dt: '420', stel_ssid: '...', stel_token: '...', stel_ton_token: '...' },
   * });
   *
   * @example
   * // With TonConnect identity (for payment methods):
   * const frag = new Fragment({
   *   cookies: { ... },
   *   tonconnect: {
   *     account: JSON.stringify({ address: '0:abc...', chain: '-239', walletStateInit: '...', publicKey: '...' }),
   *     device: JSON.stringify({ platform: 'linux', appName: 'myapp', appVersion: '1.0.0', maxProtocolVersion: 2, features: [{ name: 'SendTransaction', maxMessages: 4 }] }),
   *   },
   * });
   * await frag.init();
   *
   * // Get transaction data for buying Stars:
   * const tx = await frag.buyStars('durov', 100);
   * // tx.transaction contains { validUntil, messages } — sign externally
   * // Then confirm:
   * await frag.confirmPayment(tx.confirm_method, { boc: signedBoc });
   */
  constructor(options) {
    this.#options = options;
  }

  get initialized() {
    return this.#initialized;
  }

  /**
   * Initialize the SDK — fetches initial hash.
   * Called automatically on first API call if not called explicitly.
   */
  async init() {
    if (this.#initialized) return;

    const hashManager = new HashManager(this.#options.cookies);
    this.#http = new HttpClient(hashManager, this.#options.cookies);

    const tonconnect = this.#options.tonconnect || null;
    const args = [this.#http, tonconnect];

    this.stars = new StarsService(...args);
    this.starsGiveaway = new StarsGiveawayService(...args);
    this.starsRevenue = new StarsRevenueService(...args);
    this.premium = new PremiumService(...args);
    this.premiumGiveaway = new PremiumGiveawayService(...args);
    this.ads = new AdsService(...args);
    this.gateway = new GatewayService(...args);
    this.auction = new AuctionService(...args);
    this.assets = new AssetsService(...args);
    this.nft = new NftService(...args);
    this.auth = new AuthService(...args);
    this.walletApi = new WalletApiService(...args);
    this.history = new HistoryService(...args);
    this.sessions = new SessionsService(...args);
    this.random = new RandomService(...args);
    this.loginCodes = new LoginCodesService(...args);

    this.#initialized = true;
  }

  async #ensureInit() {
    if (!this.#initialized) await this.init();
  }

  // =====================================================
  //  PAYMENT CONFIRMATION
  // =====================================================

  /**
   * Confirm a payment with Fragment after signing the transaction externally.
   * Call this after you've signed and broadcast the TON transaction.
   *
   * @param {string} confirmMethod - The confirm_method from the transaction response
   * @param {{ boc: string }} params - The signed BOC (base64-encoded)
   */
  async confirmPayment(confirmMethod, { boc }) {
    await this.#ensureInit();
    const tonconnect = this.#options.tonconnect || {};
    return this.#http.call(confirmMethod, {
      account: tonconnect.account,
      device: tonconnect.device,
      boc,
    });
  }

  // =====================================================
  //  TOP-LEVEL CONVENIENCE METHODS
  // =====================================================

  /**
   * Buy Telegram Stars — returns transaction data for external signing.
   * @param {string} username - Telegram username
   * @param {number} quantity - Number of Stars
   * @param {{ showSender?: boolean }} options
   */
  async buyStars(username, quantity, options) {
    await this.#ensureInit();
    return this.stars.buy(username, quantity, options);
  }

  /**
   * Gift Telegram Premium — returns transaction data for external signing.
   * @param {string} username - Recipient's Telegram username
   * @param {3|6|12} months - Duration in months
   * @param {{ showSender?: boolean }} options
   */
  async giftPremium(username, months = 3, options) {
    await this.#ensureInit();
    return this.premium.gift(username, months, options);
  }

  /**
   * Create a Stars giveaway — returns transaction data for external signing.
   * @param {string} channelUsername - Channel username
   * @param {number} winners - Number of winners
   * @param {number} starsPerWinner - Stars per winner
   */
  async createStarsGiveaway(channelUsername, winners, starsPerWinner) {
    await this.#ensureInit();
    return this.starsGiveaway.create(channelUsername, winners, starsPerWinner);
  }

  /**
   * Create a Premium giveaway — returns transaction data for external signing.
   * @param {string} channelUsername - Channel username
   * @param {number} winners - Number of winners
   * @param {3|6|12} months - Premium duration per winner
   */
  async createPremiumGiveaway(channelUsername, winners, months = 3) {
    await this.#ensureInit();
    return this.premiumGiveaway.create(channelUsername, winners, months);
  }

  /**
   * Top-up another user's Telegram Ads account — returns transaction data.
   * @param {string} username - Recipient username or account ID
   * @param {number|string} amount - Amount in TON
   * @param {{ showSender?: boolean }} options
   */
  async topupAds(username, amount, options) {
    await this.#ensureInit();
    return this.ads.topup(username, amount, options);
  }

  /**
   * Recharge your own Telegram Ads account — returns transaction data.
   * @param {string} account - Your ads account ID
   * @param {number|string} amount - Amount in TON
   */
  async rechargeAds(account, amount) {
    await this.#ensureInit();
    return this.ads.recharge(account, amount);
  }

  /**
   * Place a bid on an auction item — returns transaction data.
   * @param {string} type - Item type (e.g., 'username')
   * @param {string} username - Item identifier
   * @param {number|string} bid - Bid amount in TON
   */
  async placeBid(type, username, bid) {
    await this.#ensureInit();
    return this.auction.placeBid(type, username, bid);
  }

  /**
   * Search for auctions/listings.
   * @param {string} query - Search text
   * @param {{ type?: string }} options
   */
  async searchAuctions(query, options) {
    await this.#ensureInit();
    return this.auction.search(query, options);
  }

  /**
   * Convert a username to an NFT collectible.
   * @param {string} username - Username to convert
   */
  async convertToNft(username) {
    await this.#ensureInit();
    return this.nft.convert(username);
  }

  /**
   * Transfer an NFT — returns transaction data for external signing.
   * @param {string} slug - NFT slug
   * @param {string} recipientUsername - Recipient's username
   * @param {{ showSender?: boolean }} options
   */
  async transferNft(slug, recipientUsername, options) {
    await this.#ensureInit();
    return this.nft.transfer(slug, recipientUsername, options);
  }

  /**
   * Withdraw an NFT to an external TON wallet.
   * @param {string} transaction - Transaction/NFT identifier
   * @param {string} walletAddress - Destination TON address
   * @param {{ keepGift?: boolean, confirmHash?: string }} options
   */
  async withdrawNft(transaction, walletAddress, options) {
    await this.#ensureInit();
    return this.nft.withdraw(transaction, walletAddress, options);
  }

  // =====================================================
  //  ASSET MANAGEMENT
  // =====================================================

  async assignUsername(username, assignTo) {
    await this.#ensureInit();
    return this.assets.assign(username, assignTo);
  }

  async unassignUsername(username) {
    await this.#ensureInit();
    return this.assets.unassign(username);
  }

  async getAssignTargets(username) {
    await this.#ensureInit();
    return this.assets.getAssignTargets(username);
  }

  // =====================================================
  //  NUMBER SESSION MANAGEMENT
  // =====================================================

  async getLoginCode(number) {
    await this.#ensureInit();
    return this.loginCodes.getCode(number);
  }

  async terminateAllSessions(number) {
    await this.#ensureInit();
    return this.loginCodes.terminateAllSessions(number);
  }

  // =====================================================
  //  AUTH
  // =====================================================

  async getSessionCookie() {
    await this.#ensureInit();
    return this.auth.getSessionCookie();
  }

  async authenticateTelegram(telegramUser) {
    await this.#ensureInit();
    return this.auth.authenticateTelegram(telegramUser);
  }

  /**
   * Connect a TON wallet using a pre-signed proof.
   * @param {{ account: string, device: string, proof: string }} params
   */
  async connectWallet(params) {
    await this.#ensureInit();
    return this.auth.connectWallet(params);
  }

  async disconnectWallet() {
    await this.#ensureInit();
    return this.auth.disconnectWallet();
  }

  async loginWithPhone(phone, options) {
    await this.#ensureInit();
    return this.auth.loginWithPhone(phone, options);
  }

  async isSessionValid() {
    await this.#ensureInit();
    return this.auth.isSessionValid();
  }

  // =====================================================
  //  LOW-LEVEL
  // =====================================================

  /**
   * Make a raw API call to any Fragment method.
   * @param {string} method - API method name
   * @param {object} params - Method parameters
   */
  async call(method, params = {}) {
    await this.#ensureInit();
    return this.#http.call(method, params);
  }

  /**
   * Get raw TON payment data (Tonkeeper format).
   * @param {string} requestId - Payment request ID
   */
  async getRawPaymentData(requestId) {
    await this.#ensureInit();
    return this.#http.get('/tonkeeper/rawRequest', { id: requestId });
  }
}
