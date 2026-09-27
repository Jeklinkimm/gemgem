# GemGem400 U.S. CP landing page

Public URL: https://jeklinkimm.github.io/gemgem/

Centered official GemGem400 logo → short headline → original children-playing image → “Request a 15-minute demo” link → name/email form with a separate “Submit” button. The CTA scrolls directly to the visible form at `#survey` on the same page. On successful transport, the form is replaced by a confirmation and optional inline Calendly calendar on the same page. Name and email are prefilled through Calendly's official embed API. No meeting is required to leave a request.

Self-hosted Pretendard uses one family and 400/600 weights. The original photo retains its aspect ratio. Logo and blue colors follow the user's supplied logo.

## Data and booking

The existing Google Apps Script webhook processes demo requests. Legacy `phone` receives the email; `ask` explains the follow-up request. No extra qualification fields are collected. Input is trimmed and spreadsheet formula-like strings are escaped for storage only. Names and email addresses are not sent to Mixpanel or saved in browser storage. Mixpanel events: `lead_view`, `lead_submit_attempt`, `lead_submit` (receipt_verified:false), and `lead_webhook_error`; submission is not a confirmed booking.

The cross-origin Apps Script request uses the existing `no-cors` transport, so browsers cannot inspect storage acknowledgment. A clearly marked integration test (`[TEST] Lead-first QA 2026-09-27`, `qa-lead-first@example.org`, no follow-up needed) returned HTTP 200 `ok` from the real endpoint on September 27. The destination spreadsheet row was not independently inspected. Network errors/timeouts preserve inputs and allow retry. Duplicate submissions are suppressed after success and while in flight.

Calendly loads only after submission. Its failure never changes a sent request into a failed request; an external fallback remains available. The existing event URL and availability are unchanged:
https://calendly.com/jeklinkim-gemgem/15-minute-aacpdm-intro-call

Official integration reference: https://calendly.com/help/how-to-pre-fill-invitee-information-in-an-embed

## Preview and checks

No build step. Run `python3 -m http.server 8769 --bind 127.0.0.1`.
Open `http://127.0.0.1:8769/?preview=1` for a labeled preview that skips the contact POST; it still loads the real Calendly widget after submission, so use fictional contact data and do not confirm a booking. The preview bypass is allowed only on localhost, never on the public site.

Run `node --test tests/booking.test.cjs`. Tests cover payload compatibility, contact-first flow, prefilling, invalid/failed/timed-out requests, duplicates, calendar/analytics failure isolation, preview gating, and formula escaping. They do not send live requests.

## Publishing

GitHub Pages serves main at the repository root. Push and verify Pages deployment. Do not include unrelated untracked `direction.html`.
