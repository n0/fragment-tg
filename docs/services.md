# Services Reference

The SDK organizes Fragment's API into 16 service modules, each accessible as a property on the `Fragment` instance.

## Stars — `fragment.stars`

Buy Telegram Stars for users.

| Method | Description | Wallet |
|--------|-------------|:------:|
| `buy(username, quantity, opts)` | Full flow: search + init + getLink | Yes |
| `searchRecipient(query, quantity)` | Search for a Stars recipient | No |
| `initBuyRequest(recipient, quantity)` | Initialize a buy request | No |
| `getBuyLink(id, opts)` | Get transaction data | Yes |
| `updateState(params)` | Get buy page state | No |
| `updatePrices({ stars, quantity })` | Get pricing | No |
| `repeat()` | Repeat last purchase | No |

## Stars Giveaway — `fragment.starsGiveaway`

Create Stars giveaways for channels/groups.

| Method | Description | Wallet |
|--------|-------------|:------:|
| `create(channel, winners, starsPerWinner)` | Full flow | Yes |
| `searchRecipient(query)` | Search channel/group | No |
| `initRequest(recipient, quantity, stars)` | Init giveaway | No |
| `getLink(id)` | Get transaction data | Yes |
| `updateState(params)` | Get giveaway state | No |
| `updatePrices({ quantity, stars })` | Get pricing | No |
| `repeat()` | Repeat last giveaway | No |

## Stars Revenue — `fragment.starsRevenue`

Withdraw Stars revenue.

| Method | Description | Wallet |
|--------|-------------|:------:|
| `initWithdrawal({ transaction, walletAddress, ... })` | Server-side withdrawal | No |
| `updateState(params)` | Get withdrawal state | No |

## Premium — `fragment.premium`

Gift Telegram Premium subscriptions.

| Method | Description | Wallet |
|--------|-------------|:------:|
| `gift(username, months, opts)` | Full flow | Yes |
| `searchRecipient(query, months)` | Search recipient | No |
| `initGiftRequest(recipient, months)` | Init gift | No |
| `getGiftLink(id, opts)` | Get transaction data | Yes |
| `updateState(params)` | Get page state | No |
| `repeat()` | Repeat last gift | No |

## Premium Giveaway — `fragment.premiumGiveaway`

Create Premium giveaways.

| Method | Description | Wallet |
|--------|-------------|:------:|
| `create(channel, winners, months)` | Full flow | Yes |
| `searchRecipient(query, opts)` | Search channel | No |
| `initRequest(recipient, quantity, months)` | Init giveaway | No |
| `getLink(id)` | Get transaction data | Yes |
| `updateState(params)` | Get state | No |
| `updatePrices(quantity)` | Get pricing | No |
| `repeat()` | Repeat last giveaway | No |

## Ads — `fragment.ads`

Top-up Telegram Ads accounts and manage revenue.

| Method | Description | Wallet |
|--------|-------------|:------:|
| `topup(username, amount, opts)` | Top-up another user's ads | Yes |
| `recharge(account, amount)` | Recharge your own ads | Yes |
| `searchTopupRecipient(query)` | Search ads account | No |
| `initTopupRequest(recipient, amount)` | Init top-up | No |
| `getTopupLink(id, opts)` | Get transaction data | Yes |
| `initRechargeRequest(account, amount)` | Init recharge | No |
| `getRechargeLink(id)` | Get transaction data | Yes |
| `initRevenueWithdrawal({ ... })` | Withdraw revenue (server-side) | No |
| `updateState(params)` | Get ads state | No |
| `updateTopupState(params)` | Get top-up state | No |
| `updateRevenueWithdrawalState(params)` | Get withdrawal state | No |
| `repeatTopup()` | Repeat last top-up | No |
| `repeatAddFunds()` | Repeat last add funds | No |

## Gateway — `fragment.gateway`

Manage Gateway API credits.

| Method | Description | Wallet |
|--------|-------------|:------:|
| `recharge(account, credits)` | Full flow | Yes |
| `initRechargeRequest(account, credits)` | Init recharge | No |
| `getRechargeLink(id)` | Get transaction data | Yes |
| `updateState(params)` | Get state | No |
| `updatePrices({ account, credits })` | Get pricing | No |
| `repeatAddFunds()` | Repeat last recharge | No |

## Auction — `fragment.auction`

Search, bid, and manage auctions.

| Method | Description | Wallet |
|--------|-------------|:------:|
| `search(query, opts)` | Search listings | No |
| `updateAuction(type, username, opts)` | Get/refresh auction state | No |
| `subscribe(type, username)` | Subscribe to notifications | No |
| `unsubscribe(type, username)` | Unsubscribe | No |
| `canSellItem(type, username, opts)` | Check if sellable | No |
| `initOffer(type, username)` | Init direct offer | No |
| `placeBid(type, username, bid)` | Place a bid | Yes |
| `makeOffer(type, username, amount)` | Make a direct offer | Yes |
| `startAuction(type, username, min, opts)` | Start an auction | Yes |
| `cancelAuction(type, username)` | Cancel an auction | Yes |
| `getBidLink(type, username, bid)` | Get bid transaction data | Yes |

## Assets — `fragment.assets`

Manage owned usernames and phone numbers.

| Method | Description | Wallet |
|--------|-------------|:------:|
| `list(opts)` | List owned assets | No |
| `listAll(opts)` | List all (paginated) | No |
| `assign(username, assignTo)` | Assign to Telegram entity | No |
| `unassign(username)` | Unassign | No |
| `getAssignTargets(username)` | Get available targets | No |
| `assignToTgAccount(username, assignTo, opts)` | Low-level assign | No |
| `unassignFromTgAccount(username, opts)` | Low-level unassign | No |
| `getBotUsernameLink(id)` | Get BotFather link | No |

## NFT — `fragment.nft`

Convert, transfer, and withdraw NFT collectibles.

| Method | Description | Wallet |
|--------|-------------|:------:|
| `convert(username)` | Convert username to NFT (polls) | No |
| `transfer(slug, recipient, opts)` | Full transfer flow | Yes |
| `withdraw(transaction, walletAddress, opts)` | Withdraw to external wallet | No |
| `initConverting(username)` | Init conversion | No |
| `checkConverting(id)` | Check conversion status | No |
| `startConverting(id, opts)` | Start conversion | No |
| `revertConverting(username, opts)` | Cancel conversion | No |
| `initNftMove(username)` | Init move | No |
| `checkNftMoving(id)` | Check move status | No |
| `searchTransferRecipient(query)` | Search recipient | No |
| `initTransferRequest(recipient, slug)` | Init transfer | No |
| `getTransferLink(id, opts)` | Get transaction data | Yes |
| `initWithdrawal({ ... })` | Init withdrawal | No |
| `updateTransferState(params)` | Get transfer state | No |
| `updateWithdrawalState(params)` | Get withdrawal state | No |

## Auth — `fragment.auth`

Authentication and session management.

| Method | Description |
|--------|-------------|
| `logIn(authData)` | Log in with base64 auth data |
| `logOut()` | Log out |
| `authenticateTelegram(telegramUser)` | Log in with Telegram user object |
| `loginWithPhone(phone, opts)` | Full phone login flow |
| `startLogin(phone)` | Start OAuth step |
| `pollLogin(session)` | Poll for confirmation |
| `completeLogin(session)` | Complete OAuth |
| `connectWallet({ account, device, proof })` | Connect wallet with signed proof |
| `disconnectWallet()` | Disconnect wallet |
| `getTonProof()` | Get ton_proof challenge |
| `getTonAuthLink()` | Get QR code auth link |
| `checkTonProofAuth({ account, device, proof })` | Verify wallet proof |
| `tonLogOut()` | Disconnect wallet (low-level) |
| `getSessionCookie()` | Get initial session |
| `isSessionValid()` | Check session validity |

## Wallet API — `fragment.walletApi`

Wallet verification and KYC.

| Method | Description |
|--------|-------------|
| `verifyWallet()` | Verify wallet ownership |
| `checkWallet()` | Check wallet status |
| `linkWallet()` | Link wallet to account |
| `kycGetToken()` | Get SumSub KYC token |
| `kycUpdateStatus(payload)` | Update KYC status |

## History — `fragment.history`

Transaction and ownership history.

| Method | Description |
|--------|-------------|
| `getBids(opts)` | Get bid history |
| `getPremium(opts)` | Get premium gift history |
| `getOrders(opts)` | Get order history |
| `getOwners(opts)` | Get ownership history |

## Sessions — `fragment.sessions`

TON wallet session management.

| Method | Description |
|--------|-------------|
| `terminateSession(sessionId)` | Terminate a TON session |

## Random — `fragment.random`

Provably fair random numbers.

| Method | Description | Wallet |
|--------|-------------|:------:|
| `getLink()` | Get random number tx data | Yes |
| `updateState()` | Get state | No |
| `repeat()` | Repeat last generation | No |

## Login Codes — `fragment.loginCodes`

Login code forwarding for owned phone numbers.

| Method | Description |
|--------|-------------|
| `getCode(number)` | Get current login code |
| `terminateAllSessions(number)` | Terminate all sessions (2-step) |
| `getTerminateConfirmation(number)` | Get terminate confirmation |
| `updateState(number, opts)` | Get code state |
| `toggle(number, canReceive)` | Toggle code forwarding |
| `terminatePhoneSessions(number, hash)` | Low-level terminate |
