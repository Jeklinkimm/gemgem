# Partner trial request

Public URL after Pages deployment: `https://gemgem400.com/partner-trial/`.

Dedicated request form; the existing homepage remains a separate contact entry. Six required answers: name, email, organization, country, device and readiness. All answers use the existing Apps Script payload: organization goes to `org`, country to `region`, and device/readiness/trial purpose to `ask`. Email is also retained in the legacy `phone` field. No backend deployment or new spreadsheet columns are required.

Requests go to the existing Sheets endpoint, which also runs existing Discord notifications. Frontend checks cannot verify a saved row because this endpoint uses opaque cross-origin transport. The completion text says the request was sent; it does not claim a storage receipt, signed document or provisioned account. Tests mock the transport; no live test contact is submitted.

Ready / internal approval / questions receive different next-step instructions. The existing Calendly intro-call URL is offered only to the questions route after submitting. No mandatory call before a trial and no feedback booking CTA at entry.

Preview: run the repository's HTTP server and open `/partner-trial/?preview=1` on localhost. Preview never posts. The query cannot suppress submission on the public hostname.

Automatic document signature and account delivery are not connected. They require the approved agreement, signing service and real account issuance/activation system. The requested commercial sequence is application, agreement, free month from activation, then 15-minute Zoom feedback. Until integrations exist, staff follow up by email; the page states that accurately.

Offline tests: `node --test tests/trial.test.cjs`.
