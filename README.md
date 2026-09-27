# GemGem400 U.S. CP landing page

Public URL: https://jeklinkimm.github.io/gemgem/

Centered official GemGem400 logo → short headline → original children-playing image → name/email form → “Submit”. Successful contact submission replaces the form with “Thanks! We’ll be in touch.” and an arrow-free “Book a 15-minute demo” button. Only clicking that optional button reveals and loads the inline Calendly calendar, prefilling name and email. Everything stays on the same page. Repeated clicks do not create additional widgets or contact submissions. The `#survey` anchor still points to the contact form.

Self-hosted Pretendard uses one family and 400/600 weights. The original photo retains its aspect ratio. Logo and blue colors follow the user's supplied logo.

## Data and booking

The existing Google Apps Script webhook processes contact requests. Legacy `phone` receives the email; `ask` explains the follow-up request. No extra qualification fields are collected. Input is trimmed and spreadsheet formula-like strings are escaped for storage only. Names and email addresses are not sent to Mixpanel or saved in browser storage. Mixpanel events: `lead_view`, `lead_submit_attempt`, `lead_calendar_open`, `lead_submit` (receipt_verified:false), and `lead_webhook_error`; submission is not a confirmed booking.

The cross-origin Apps Script request uses the existing `no-cors` transport, so browsers cannot inspect storage acknowledgment. A clearly marked integration test (`[TEST] Lead-first QA 2026-09-27`, `qa-lead-first@example.org`, no follow-up needed) returned HTTP 200 `ok` from the real endpoint on September 27. The destination spreadsheet row was not independently inspected. Network errors/timeouts preserve inputs and allow retry. Duplicate submissions are suppressed after success and while in flight.

Calendly loads only when the optional booking button is clicked after successful contact submission. Its failure never changes a sent request into a failed request; an external fallback remains available. The existing event URL and availability are unchanged:
https://calendly.com/jeklinkim-gemgem/15-minute-aacpdm-intro-call

Official integration reference: https://calendly.com/help/how-to-pre-fill-invitee-information-in-an-embed

## Preview and checks

No build step. Run `python3 -m http.server 8769 --bind 127.0.0.1`.
Open `http://127.0.0.1:8769/?preview=1` for a labeled preview that skips the contact POST; it still loads the real Calendly widget after submission, so use fictional contact data and do not confirm a booking. The preview bypass is allowed only on localhost, never on the public site.

Run `node --test tests/booking.test.cjs`. Tests cover payload compatibility, contact-first flow, prefilling, invalid/failed/timed-out requests, duplicates, calendar/analytics failure isolation, preview gating, and formula escaping. They do not send live requests.

## Publishing

GitHub Pages serves main at the repository root. Push and verify Pages deployment. Do not include unrelated untracked `direction.html`.
