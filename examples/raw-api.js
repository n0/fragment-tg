/**
 * Make raw API calls to Fragment for methods not covered by services.
 */
import { Fragment } from 'fragment-tg';

const fragment = new Fragment({
  cookies: {
    stel_dt: '-240',
    stel_ssid: process.env.FRAGMENT_SSID,
    stel_token: process.env.FRAGMENT_TOKEN,
  },
});

// Call any Fragment API method directly
const result = await fragment.call('searchAuctions', {
  query: 'bitcoin',
  type: 'username',
});

console.log(JSON.stringify(result, null, 2));
