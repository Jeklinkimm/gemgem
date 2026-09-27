# Discord lead notifications

Activated September 27, 2026 in Apps Script web-app version 6, preserving the existing endpoint and owner/access settings. Google external-request authorization is complete.

Each new contact is stored in the existing `리드` sheet first, then sent as a separate Discord forum post containing name, email, KST submission time, and a link to the sheet row. Existing rows are preserved and are not replayed.

The secret is stored only in Script Properties as `DISCORD_WEBHOOK_URL`. Never put it in the frontend or repository. `Code.gs` is the source for the bound Apps Script project; pushing this repository does not deploy Apps Script.

The backend adds explicit email and Discord status/timestamp/message receipt/retry-time columns. Status is `pending`, `sent`, `rate_limited`, or `failed`. A Discord HTTP 200 plus message ID is required before marking sent. Mentions are disabled. Formula-like values are escaped in spreadsheet cells.

Discord returned intermittent HTTP 429 during verification. Explicit 429 responses retry at most twice, honoring the response delay when it is at most 10 seconds; longer limits stop without retrying early. Network failures and other ambiguous errors are not automatically retried to avoid duplicate notifications. Rate-limited contacts are queued with their earliest retry time. The installed time-driven `retryDiscordNotifications` trigger checks every five minutes and processes at most three due contacts, stopping if the shared limit is hit. Sent contacts and old rows are skipped. Other failed contacts remain in the sheet for manual review. Delivery can be delayed by Discord limits.

`testDiscordConnection` sends one labeled test forum post. `testLeadDelivery` also saves a labeled test contact. Offline checks: `node --test tests/discord.test.cjs`.
