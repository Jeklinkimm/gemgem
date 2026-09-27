# GemGem400 U.S. CP program inquiry page

Public URL: https://jeklinkimm.github.io/gemgem/

English B2B landing page aligned with the September 2026 AACPDM booth brief: **Make movement feel like play.** Tablet-based hand and upper-limb games for clinician-guided practice. No clinical-outcome or assessment-accuracy claims.

## Layout

- Desktop: headline and gameplay beside the inquiry form; no long introduction before the form.
- Mobile: short introduction → form → gameplay and supporting details.
- Header and mobile introduction link directly to `#survey`.
- Six fields on one page, with no Next/Back navigation or conditional steps: name, email, role, organization, intended setting, requested follow-up.
- Existing QR URLs, including `?utm_source=expo&utm_content=parent_card`, continue working and preserve campaign tags. They no longer select different questionnaires.

## Files and local preview

`index.html`, `site.css`, `app.js`, `privacy.html`, existing `img/` assets. No build step.

```sh
python3 -m http.server 8769 --bind 127.0.0.1
node --test tests/form.test.cjs
```

## Submission and legacy Google Sheet compatibility

The Google Apps Script webhook and Mixpanel project token in `app.js` are the existing public configuration. No backend deployment was changed.

The legacy script uses fixed columns. Preserve these mappings until it is deliberately migrated:

| Current answer | Named payload field | Existing sheet column |
| --- | --- | --- |
| Name | `name` | `name` |
| Email | `email` | **`phone` (now stores contact email)** |
| Role | `role` | `role` and `orgtype` |
| Organization | `org` | `org` |
| Intended setting | `use_case` | included in `ask` |
| Requested next step | `interest` | `demo` and included in `ask` |
| Campaign | `utm_*` | existing `utm_source`, `utm_content`, and `channel` |

`track` remains `center` or `parent` for compatibility; the parent option uses the same one-page form. Do not drop `phone` or `ask` without updating the deployed sheet handler: unknown new keys may otherwise be discarded by its fixed column list. Formula-like user strings are escaped before sending.

Submissions use `POST`, `text/plain`, and `no-cors`, as before. A fulfilled opaque response cannot prove the row was stored in Google Sheets. The UI says the request was sent, not that a booking was confirmed, and supplies a direct email fallback. Network failure, readable HTTP error, or a 20-second timeout keeps answers visible and allows retry. Duplicate clicks while a request is in flight are suppressed. Automated tests mock the transport and **do not create production leads**. End-to-end sheet receipt has not been reverified.

## Analytics and privacy

Events: `lead_view`, `lead_cta_click`, `lead_start`, `lead_field_complete` (field ID only), `lead_submit_attempt`, `lead_submit` (`receipt_verified: false`), `lead_webhook_error`.

Names, emails, organizations, and answers are **not sent to Mixpanel** or copied into local storage. This replaces the old full-payload event/local backup. Analytics is disabled on localhost; an unavailable analytics library does not block the form. Autocapture and session recording are disabled. The English privacy notice describes the actual services used.

## Publishing

GitHub Pages serves `main` at the repository root. Push a commit to `main` and check the Pages build before reporting deployment complete. Existing untracked `direction.html` is unrelated and should not be included.
