/**
 * Programmatic login via phone number.
 *
 * The only manual step is the user tapping "Confirm" in their Telegram app.
 */
import { Fragment } from 'fragment.js';

const fragment = new Fragment({
  cookies: { stel_dt: '-240' },
});

await fragment.init();

// Get initial session cookie
const session = await fragment.getSessionCookie();
console.log('Session established');

// Login via Telegram OAuth
const result = await fragment.loginWithPhone('+1234567890', {
  pollInterval: 3000,
  maxAttempts: 60,
  onWaiting: (attempt) => {
    process.stdout.write(`\rWaiting for Telegram confirmation... (${attempt}/60)`);
  },
});

console.log('\nLogged in as:', result.userInfo.firstName);
console.log('Cookies to save:', JSON.stringify(result.cookies, null, 2));
