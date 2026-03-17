# fragment.js

The JavaScript SDK for [Fragment.com](https://fragment.com).

Buy Stars, gift Premium, bid on auctions, manage usernames, read login codes — everything Fragment does, from code.

Zero dependencies. Works with any TON wallet.

## Install

```bash
npm install fragment.js
```

> Node.js 18+

## Usage

```js
import { Fragment } from 'fragment.js';

const fragment = new Fragment({
  cookies: {
    stel_dt: '-240',
    stel_ssid: '...',
    stel_token: '...',
    stel_ton_token: '...',
  },
});

// Search auctions
const results = await fragment.searchAuctions('crypto');

// List your usernames
const usernames = await fragment.assets.listAll({ type: 'usernames' });

// Assign a username to your account
await fragment.assignUsername('coolname', targetToken);

// Get a login code for an owned number
const { code } = await fragment.getLoginCode('+1234567890');

// Check if your session is alive
const valid = await fragment.isSessionValid();
```

## Payments

Payment methods return transaction data for external signing — the SDK never touches your keys.

```js
const fragment = new Fragment({
  cookies: { /* ... */ },
  tonconnect: {
    account: JSON.stringify({ address: '0:abc...', chain: '-239', ... }),
    device: JSON.stringify({ platform: 'linux', appName: 'MyApp', ... }),
  },
});

// 1. Get transaction from Fragment
const tx = await fragment.buyStars('durov', 100);

// 2. Sign with your wallet
const boc = await wallet.sendTransaction(tx.transaction);

// 3. Confirm
await fragment.confirmPayment(tx.confirm_method, { boc });
```

## Auth

Login programmatically with a phone number. The only manual step is tapping "Confirm" in Telegram.

```js
const fragment = new Fragment({ cookies: { stel_dt: '-240' } });
await fragment.init();
await fragment.getSessionCookie();

const result = await fragment.loginWithPhone('+1234567890', {
  onWaiting: (n) => console.log(`Waiting... (${n})`),
});

console.log(result.userInfo);  // { id, firstName, username }
console.log(result.cookies);   // save for reuse
```

## Services

16 service modules covering the full Fragment API.

| Service | What it does | Wallet? |
|---------|-------------|:-------:|
| **`stars`** | Buy Telegram Stars | Yes |
| **`premium`** | Gift Telegram Premium | Yes |
| **`starsGiveaway`** | Create Stars giveaways | Yes |
| **`premiumGiveaway`** | Create Premium giveaways | Yes |
| **`ads`** | Telegram Ads top-ups & revenue | Partial |
| **`gateway`** | Gateway API credits | Yes |
| **`auction`** | Search, bid, sell, cancel | Partial |
| **`assets`** | Manage usernames & numbers | No |
| **`nft`** | Convert, transfer, withdraw | Partial |
| **`auth`** | Login, sessions, wallet proof | No |
| **`walletApi`** | Wallet verification & KYC | No |
| **`history`** | Transaction history | No |
| **`sessions`** | TON session management | No |
| **`random`** | Provably fair random numbers | Yes |
| **`loginCodes`** | Login code forwarding | No |
| **`starsRevenue`** | Stars revenue withdrawal | No |

## Escape Hatch

Call any Fragment API method directly:

```js
const result = await fragment.call('someNewMethod', { param: 'value' });
```

## Documentation

| Guide | Description |
|-------|-------------|
| [Getting Started](./docs/getting-started.md) | Installation, setup, first steps |
| [Authentication](./docs/authentication.md) | Cookies, phone login, wallet connection |
| [Payments](./docs/payments.md) | How payment flows work, all payment methods |
| [Services](./docs/services.md) | Full API reference for all 16 services |
| [Error Handling](./docs/errors.md) | Error types and handling patterns |

## Examples

| Example | Description |
|---------|-------------|
| [search-auctions.js](./examples/search-auctions.js) | Search Fragment marketplace |
| [manage-assets.js](./examples/manage-assets.js) | List and assign usernames |
| [login-codes.js](./examples/login-codes.js) | Read codes, manage sessions |
| [buy-stars.js](./examples/buy-stars.js) | Full payment flow |
| [auth-phone.js](./examples/auth-phone.js) | Programmatic phone login |
| [raw-api.js](./examples/raw-api.js) | Direct API calls |

## License

MIT
