/**
 * Buy Telegram Stars — demonstrates the payment flow.
 *
 * The SDK handles the Fragment API side. You sign the transaction
 * externally with your own wallet, then confirm.
 */
import { Fragment } from 'fragment-tg';

const fragment = new Fragment({
  cookies: {
    stel_dt: '-240',
    stel_ssid: process.env.FRAGMENT_SSID,
    stel_token: process.env.FRAGMENT_TOKEN,
    stel_ton_token: process.env.FRAGMENT_TON_TOKEN,
  },
  tonconnect: {
    account: process.env.TONCONNECT_ACCOUNT, // JSON string
    device: process.env.TONCONNECT_DEVICE,   // JSON string
  },
});

// Step 1: Get transaction data from Fragment
const tx = await fragment.buyStars('durov', 100, { showSender: true });

console.log('Request ID:', tx.reqId);
console.log('Transaction:', JSON.stringify(tx.transaction, null, 2));
// tx.transaction = { validUntil, messages: [{ address, amount, payload }] }

// Step 2: Sign and broadcast with your wallet
// const boc = await yourWallet.sendTransaction(tx.transaction);

// Step 3: Confirm with Fragment
// await fragment.confirmPayment(tx.confirm_method, { boc });
// console.log('Payment confirmed!');
