# Payments

Payment operations on Fragment require TON blockchain transactions. This SDK handles the Fragment API side — you handle wallet signing externally.

## How It Works

Every payment follows the same three-step pattern:

```
1. SDK calls Fragment API   →  returns transaction data
2. You sign with your wallet →  produces a signed BOC
3. SDK confirms with Fragment →  payment complete
```

The SDK never touches your private keys.

## Setup

Payment methods require a TonConnect identity in the constructor:

```js
import { Fragment } from 'fragment-tg';

const fragment = new Fragment({
  cookies: { /* ... */ },
  tonconnect: {
    account: JSON.stringify({
      address: '0:abc...',        // raw wallet address
      chain: '-239',              // TON mainnet
      walletStateInit: '...',     // base64 state init
      publicKey: '...',           // hex public key
    }),
    device: JSON.stringify({
      platform: 'linux',
      appName: 'MyApp',
      appVersion: '1.0.0',
      maxProtocolVersion: 2,
      features: [{ name: 'SendTransaction', maxMessages: 4 }],
    }),
  },
});

await fragment.init();
```

## Example: Buying Stars

```js
// Step 1: Get transaction data from Fragment
const tx = await fragment.buyStars('durov', 100);

// tx contains:
// {
//   reqId: 'abc123',
//   transaction: {
//     validUntil: 1234567890,
//     messages: [{ address: '...', amount: '...', payload: '...' }]
//   },
//   confirm_method: 'confirm_BuyStars',
//   confirm_params: { ... },
// }

// Step 2: Sign and broadcast with your wallet
const boc = await yourWallet.sendTransaction(tx.transaction);

// Step 3: Confirm with Fragment
await fragment.confirmPayment(tx.confirm_method, { boc });
```

## All Payment Methods

### Stars & Premium

```js
// Buy Stars
const tx = await fragment.buyStars(username, quantity, { showSender: true });

// Gift Premium
const tx = await fragment.giftPremium(username, 3); // 3, 6, or 12 months

// Stars Giveaway
const tx = await fragment.createStarsGiveaway(channelUsername, winners, starsPerWinner);

// Premium Giveaway
const tx = await fragment.createPremiumGiveaway(channelUsername, winners, months);
```

### Ads & Gateway

```js
// Top-up another user's ads account
const tx = await fragment.topupAds(username, amount);

// Recharge your own ads account
const tx = await fragment.rechargeAds(accountId, amount);

// Recharge Gateway API credits
const tx = await fragment.gateway.recharge(accountId, credits);
```

### Auctions

```js
// Place a bid
const tx = await fragment.placeBid('username', 'coolname', '10.5');

// Make a direct offer
const tx = await fragment.auction.makeOffer('username', 'coolname', '50');

// Start an auction for an owned item
const tx = await fragment.auction.startAuction('username', 'myname', '5', { maxAmount: '100' });

// Cancel an auction
const tx = await fragment.auction.cancelAuction('username', 'myname');
```

### NFTs

```js
// Transfer an NFT to another user
const tx = await fragment.transferNft('nft-slug', 'recipientUsername');

// Withdraw an NFT to an external wallet (no signing needed)
await fragment.withdrawNft('transaction-id', '0:wallet-address');
```

### Random Numbers

```js
// Get a provably fair random number (requires TON fee)
const tx = await fragment.random.getLink();
```

## Non-Payment Operations

These don't require TonConnect or wallet signing:

- `fragment.ads.initRevenueWithdrawal(...)` — server-side withdrawal
- `fragment.starsRevenue.initWithdrawal(...)` — server-side withdrawal
- `fragment.nft.convert(username)` — NFT conversion (server-side with polling)
- `fragment.withdrawNft(...)` — NFT withdrawal to external wallet

## Error Handling

```js
import { FragmentError, AuthError } from 'fragment-tg';

try {
  const tx = await fragment.buyStars('nobody', 100);
} catch (err) {
  if (err.message.includes('Recipient not found')) {
    // user doesn't exist
  }
  if (err.message.includes('TonConnect account not configured')) {
    // forgot to pass tonconnect in constructor
  }
}
```
