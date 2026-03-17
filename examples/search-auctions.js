/**
 * Search Fragment auctions — no wallet needed.
 */
import { Fragment } from 'fragment-tg';

const fragment = new Fragment({
  cookies: {
    stel_dt: '-240',
    stel_ssid: process.env.FRAGMENT_SSID,
    stel_token: process.env.FRAGMENT_TOKEN,
  },
});

const results = await fragment.searchAuctions('crypto', { type: 'username' });

for (const item of results.items || []) {
  console.log(`@${item.username} — ${item.price} TON`);
}
