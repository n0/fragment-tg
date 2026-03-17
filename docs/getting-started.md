# Getting Started

## Installation

```bash
npm install fragment-tg
```

Requires Node.js 18+ (uses built-in `fetch`).

## Basic Setup

```js
import { Fragment } from 'fragment-tg';

const fragment = new Fragment({
  cookies: {
    stel_dt: '-240',        // timezone offset
    stel_ssid: '...',       // session ID
    stel_token: '...',      // Telegram auth token
    stel_ton_token: '...',  // TON wallet token
  },
});

await fragment.init();
```

## Where Do Cookies Come From?

Fragment uses four cookies for authentication. You can get them in two ways:

### 1. From Your Browser

Log into [fragment.com](https://fragment.com), open DevTools > Application > Cookies, and copy the four `stel_*` values.

### 2. Programmatically

```js
const fragment = new Fragment({
  cookies: { stel_dt: '-240' },
});

await fragment.init();

// Step 1: Get a session cookie
await fragment.getSessionCookie();

// Step 2: Login via Telegram (user must tap "Confirm" in their Telegram app)
const result = await fragment.loginWithPhone('+1234567890', {
  onWaiting: (attempt) => console.log(`Waiting for confirmation... (${attempt})`),
});

console.log('Logged in:', result.userInfo);
console.log('Cookies:', result.cookies);
// Save these cookies for future use
```

See [Authentication](./authentication.md) for the full auth guide.

## Read-Only vs Payment Operations

Most operations (searching auctions, listing assets, reading history) work with just cookies — no wallet needed.

**Payment operations** (buying Stars, bidding, gifting Premium) also require a TonConnect identity so Fragment knows which wallet to expect the transaction from:

```js
const fragment = new Fragment({
  cookies: { /* ... */ },
  tonconnect: {
    account: JSON.stringify({
      address: '0:abc...',
      chain: '-239',
      walletStateInit: '...',
      publicKey: '...',
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
```

Payment methods return transaction data — you sign and broadcast with your own wallet, then confirm with Fragment. See [Payments](./payments.md) for the full guide.

## Quick Examples

```js
// Search auctions
const results = await fragment.searchAuctions('crypto');

// List your usernames
const usernames = await fragment.assets.listAll({ type: 'usernames' });

// Get a login code
const { code } = await fragment.getLoginCode('+1234567890');

// Check session
const valid = await fragment.isSessionValid();
```

## Next Steps

- [Authentication](./authentication.md) — programmatic login, wallet connection
- [Payments](./payments.md) — how payment flows work
- [Services](./services.md) — full API reference for all 16 services
- [Error Handling](./errors.md) — error types and handling patterns
