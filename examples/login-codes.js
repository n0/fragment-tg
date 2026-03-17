/**
 * Read login codes and manage sessions for owned phone numbers.
 */
import { Fragment } from 'fragment-tg';

const fragment = new Fragment({
  cookies: {
    stel_dt: '-240',
    stel_ssid: process.env.FRAGMENT_SSID,
    stel_token: process.env.FRAGMENT_TOKEN,
    stel_ton_token: process.env.FRAGMENT_TON_TOKEN,
  },
});

const phone = '+1234567890';

// Get the current login code
const { code, activeSessions } = await fragment.getLoginCode(phone);
console.log(`Login code: ${code}`);
console.log(`Active sessions: ${activeSessions}`);

// Toggle code forwarding
await fragment.loginCodes.toggle(phone, true);
console.log('Code forwarding enabled');

// Terminate all Telegram sessions (careful!)
// const result = await fragment.terminateAllSessions(phone);
// console.log('Sessions terminated:', result.message);
