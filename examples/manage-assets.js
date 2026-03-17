/**
 * List and manage owned usernames/numbers.
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

// List all owned usernames
const usernames = await fragment.assets.listAll({ type: 'usernames' });
console.log('Owned usernames:', usernames.length);

for (const item of usernames) {
  console.log(`  @${item.username}`);
}

// List owned phone numbers
const numbers = await fragment.assets.listAll({ type: 'numbers' });
console.log('Owned numbers:', numbers.length);

// Get assignment targets for a username
if (usernames.length > 0) {
  const targets = await fragment.getAssignTargets(usernames[0].username);
  console.log('Available targets:', targets);
}
