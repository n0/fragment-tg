# Authentication

Fragment uses four cookies for session management. This guide covers every way to obtain and use them.

## Cookie Reference

| Cookie | Purpose | Set By |
|--------|---------|--------|
| `stel_dt` | Timezone offset | You (client-set) |
| `stel_ssid` | Server session ID | `GET fragment.com/` |
| `stel_token` | Telegram auth | `logIn` API call |
| `stel_ton_token` | TON wallet proof | `checkTonProofAuth` API call |

## Using Existing Cookies

If you already have cookies (from a browser session or a previous login):

```js
import { Fragment } from 'fragment-tg';

const fragment = new Fragment({
  cookies: {
    stel_dt: '-240',
    stel_ssid: 'your-session-id',
    stel_token: 'your-telegram-token',
    stel_ton_token: 'your-wallet-token',
  },
});

await fragment.init();
const valid = await fragment.isSessionValid();
```

## Programmatic Phone Login

Full flow from phone number to authenticated session. The only manual step is the user tapping "Confirm" in their Telegram app.

```js
const fragment = new Fragment({
  cookies: { stel_dt: '-240' },
});

await fragment.init();

// Get initial session cookie
await fragment.getSessionCookie();

// Start login — polls until user confirms in Telegram
const result = await fragment.loginWithPhone('+1234567890', {
  pollInterval: 3000,   // check every 3 seconds
  maxAttempts: 60,      // timeout after 3 minutes
  onWaiting: (attempt) => console.log(`Attempt ${attempt}/60...`),
});

console.log(result.userInfo);   // { id, firstName, lastName, username }
console.log(result.cookies);    // save these for reuse
```

## Step-by-Step OAuth

For more control over the Telegram OAuth flow:

```js
import { startTelegramOAuth, pollTelegramOAuth, completeTelegramOAuth } from 'fragment-tg';

// Step 1: Send login request to the phone
const session = await startTelegramOAuth('+1234567890');

// Step 2: Poll until user confirms
let confirmed = false;
while (!confirmed) {
  await new Promise(r => setTimeout(r, 3000));
  confirmed = await pollTelegramOAuth(session);
}

// Step 3: Get auth data
const { authData, userInfo } = await completeTelegramOAuth(session);

// Step 4: Log into Fragment
await fragment.authenticateTelegram(userInfo);
```

## Wallet Connection

After logging in with Telegram, you can connect a TON wallet. This requires signing a `ton_proof` challenge with your wallet's private key.

```js
// Get the challenge from Fragment
const tonProof = await fragment.auth.getTonProof();

// Sign it externally with your wallet (this is wallet-specific)
const signedProof = yourWallet.signTonProof(tonProof, 'fragment.com');

// Submit the signed proof to Fragment
const result = await fragment.connectWallet({
  account: JSON.stringify({
    address: walletAddress,
    chain: '-239',
    walletStateInit: stateInitBase64,
    publicKey: publicKeyHex,
  }),
  device: JSON.stringify({
    platform: 'linux',
    appName: 'MyApp',
    appVersion: '1.0.0',
    maxProtocolVersion: 2,
    features: [{ name: 'SendTransaction', maxMessages: 4 }],
  }),
  proof: JSON.stringify(signedProof),
});

console.log('Wallet connected:', result.verified);
console.log('New cookies:', result.cookies);
// result.cookies.stel_ton_token is now set
```

## Disconnecting

```js
await fragment.disconnectWallet();  // clears stel_ton_token
await fragment.auth.logOut();       // clears stel_token
```

## Session Validation

```js
const valid = await fragment.isSessionValid();
if (!valid) {
  // re-authenticate
}
```
