# GemGem400 U.S. CP landing page

Public URL: https://jeklinkimm.github.io/gemgem/

Minimal page: brand → headline → original children-playing image → booking button → inline Calendly calendar. Mobile uses a single column with 18px button text and the same Pretendard family throughout. Image preserves its full aspect ratio. The `#survey` anchor and booking button scroll to the calendar on the same page.

The official auto-resizing Calendly embed shows the existing 15-minute event:
https://calendly.com/jeklinkim-gemgem/15-minute-aacpdm-intro-call

Calendly currently collects name and email after time selection, within the embedded calendar. Event details are hidden in the embed to avoid duplicate text. Its title/description still refer to AACPDM; those account settings have not been edited. The landing page no longer submits to Google Sheets or collects contact details. Historical submissions remain untouched.

## Preview and checks

No build step. Run `python3 -m http.server 8769 --bind 127.0.0.1`.
Run `node --test tests/booking.test.cjs` for analytics-failure and click-event checks.

Mixpanel records `lead_view` and `lead_cta_click` with campaign tags. A click is not recorded as a confirmed booking. Tracking errors do not block booking. A small external fallback link works without JavaScript if the embed cannot load. Autocapture and session recording are disabled. Analytics is disabled on localhost. Self-hosted Pretendard Variable v1.3.9 uses the SIL Open Font License in `fonts/OFL.txt`.

## Publishing

GitHub Pages serves main at the repository root. Push and verify Pages deployment. Do not include unrelated untracked `direction.html`.
