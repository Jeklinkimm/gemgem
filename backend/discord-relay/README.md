# Discord outbound relay — awaiting Cloudflare login and deployment

This Worker separates Discord outbound delivery from Apps Script's shared egress network. It is prepared and tested locally; it is not deployed or active yet. The public landing page and spreadsheet remain unchanged.

## Evidence, September 27, 2026

- Multiple Apps Script POST attempts received HTTP 429 with delays lasting many minutes.
- At 18:39:34 UTC, a single read-only webhook GET from Apps Script also received HTTP 429, `Content-Type: text/plain; charset=UTF-8`, `Retry-After: 2305`, and no Discord rate-limit scope/bucket headers.
- The Discord channel's post and message slowmodes are off.
- This rules out a restriction confined to creating forum posts. A shared egress/network restriction is the leading explanation; the precise upstream policy is not identified from the available response.
- The old code only tracked retry times per contact. A second contact during the same cooldown made another request. A regression test reproduced this bug, and shared cooldown state now prevents it.

## Deployment steps

1. Sign in to the user's Cloudflare account and deploy this Worker (`wrangler deploy` or Dashboard editor).
2. Set Worker secrets `DISCORD_WEBHOOK_URL` and a new random 32-byte `DISCORD_RELAY_TOKEN`. Never put values in source or public assets. User authorization is required to provision the new service and store the webhook there.
3. Set matching `DISCORD_RELAY_TOKEN` and `DISCORD_RELAY_URL=https://<worker>.<account>.workers.dev/send` in Apps Script properties. These two values are required together; partial configuration fails closed.
4. Honor all existing cooldown deadlines; do not clear them to force a send. The current shared deadline was initialized to 2026-09-27T19:18:00Z based on the latest response.
5. Verify a due queued inquiry yields a real Discord receipt and `sent` sheet status. Do not claim local tests prove live delivery.
6. Add Cloudflare processing to the privacy notice when activating the relay.

The Worker only accepts a secret-authenticated POST to `/send`; no browser CORS access is enabled. It fixes the upstream Discord destination in a server secret, disables mentions, rejects oversized messages, and returns only the message ID or a sanitized error. It forwards 429 delays to the existing Apps Script queue. Ambiguous network errors are not automatically replayed, because delivery may already have happened.

Tests: `node --test tests/discord-relay.test.mjs tests/discord.test.cjs`.
