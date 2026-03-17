# Error Handling

## Error Types

```js
import { FragmentError, AuthError, HashExpiredError } from 'fragment-tg';
```

### `FragmentError`

Base error class for all SDK errors.

```js
try {
  await fragment.buyStars('nobody', 100);
} catch (err) {
  if (err instanceof FragmentError) {
    err.message;   // human-readable description
    err.method;    // Fragment API method that failed (if applicable)
    err.response;  // raw API response (if applicable)
  }
}
```

### `AuthError`

Thrown when authentication fails — expired session, invalid cookies, or wallet proof verification failure.

```js
try {
  await fragment.call('someMethod');
} catch (err) {
  if (err instanceof AuthError) {
    // re-authenticate
    await fragment.loginWithPhone('+1234567890');
  }
}
```

### `HashExpiredError`

Thrown when the SDK can't extract an API hash from Fragment's page. This usually means Fragment changed their frontend. The SDK handles hash refresh automatically — you'll only see this if the refresh also fails.

## Common Error Patterns

### Recipient not found

```js
try {
  await fragment.buyStars('nonexistent_user', 100);
} catch (err) {
  // err.message: "Recipient not found: nonexistent_user"
  // err.method: "searchStarsRecipient"
}
```

### TonConnect not configured

```js
try {
  await fragment.placeBid('username', 'cool', 10);
} catch (err) {
  // err.message: "TonConnect account not configured — pass tonconnect.account to Fragment constructor..."
}
```

### Payment init failure

```js
try {
  await fragment.buyStars('durov', 100);
} catch (err) {
  // err.message: "Init failed: insufficient_balance"
  // err.method: "initBuyStarsRequest"
  // err.response: { error: 'insufficient_balance', ... }
}
```

### getLink failure

```js
try {
  await fragment.buyStars('durov', 100);
} catch (err) {
  // err.message: "getLink failed: wallet not linked"
  // err.method: "getBuyStarsLink"
}
```

## Inheritance Chain

```
Error
 └── FragmentError
      ├── AuthError
      └── HashExpiredError
```

All SDK errors extend `FragmentError`, so you can catch everything with a single check:

```js
try {
  await fragment.doSomething();
} catch (err) {
  if (err instanceof FragmentError) {
    // any SDK error
  } else {
    // network error, etc.
  }
}
```
