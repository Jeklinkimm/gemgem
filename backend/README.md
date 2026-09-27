# Discord lead notifications — authorization pending

Prepared September 27, 2026. `Code.gs` is saved in the existing bound Apps Script editor, but **the live web app still uses version 3 without notifications**. No existing lead rows were modified.

The provided Discord webhook belongs to a forum channel. New submissions create one forum post per lead. A direct, clearly marked test post was confirmed by Discord HTTP 200 (message/thread `1553815193190928444`). This verifies the webhook only, not the Apps Script integration.

The webhook secret is stored in the project's Script Properties as `DISCORD_WEBHOOK_URL`; it is not in this repository or the frontend. Google currently denies `UrlFetchApp.fetch` because its external-request scope has not been authorized. The official authorization URL returned by Apps Script leads to a Google account redirect error in the in-app browser. Owner authorization in a regular browser is the remaining prerequisite.

## Resume activation

1. Open the existing Apps Script project `11_vnB3X-eVpjQAXyQUzlszS9CkGGMtdORDy7HKkMtuVF-pnyGOCsFt3-` as `projectalbaam@gmail.com` and complete authorization for external requests. `testDiscordConnection` logs the official authorization URL if authorization is still missing.
2. Run `testDiscordConnection` and verify its Discord message receipt.
3. Update the existing version-3 web app deployment to a new version; preserve its deployment ID/URL, execute-as and access settings. Do not create a replacement endpoint.
4. Submit one clearly marked test via the landing page and verify both the saved sheet row and Discord forum post. Do not book a Calendly meeting.
5. Update privacy.html to disclose Discord notifications and README.md to describe the active integration, then deploy the frontend docs.

The backend preserves legacy columns, adds an explicit email column and notification status/receipt columns, saves the lead before sending, uses Discord `wait=true`, prevents automatic mentions, and keeps contacts on notification failure. Failed notifications are marked `failed`; automatic retry is not configured. Prior submissions are not re-posted.

Offline checks: `node --test tests/discord.test.cjs`.
