const CONFIG = {
  SHEETS_WEBHOOK: 'https://script.google.com/macros/s/AKfycbw1VbabSevaAc_DXiqG7VVd3Bs_Zaj-2RfK8eC_wPuCRYsVlon9BO9NJS0M_5YcSqNj/exec',
  CALENDLY_URL: 'https://calendly.com/jeklinkim-gemgem/15-minute-aacpdm-intro-call'
};
const params = new URLSearchParams(location.search);
const isLocal = ['localhost', '127.0.0.1', '::1'].includes(location.hostname);
const preview = isLocal && params.get('preview') === '1';
const channel = Object.fromEntries(['utm_source', 'utm_content', 'utm_medium', 'utm_campaign'].map(key => [key, (params.get(key) || '').slice(0, 200)]));
channel.form_version = 'us-cp-contact-first-v6';
let analyticsReady = false;
if (window.mixpanel && !isLocal) {
  try {
    window.mixpanel.init('7d0c521971a70f26652f621797d6efaa', { persistence: 'localStorage', autocapture: false, record_sessions_percent: 0 });
    analyticsReady = true;
  } catch (_) { /* Contact requests work without analytics. */ }
}
function track(event, properties = {}) {
  if (analyticsReady) {
    try { window.mixpanel.track(event, { ...channel, ...properties }); } catch (_) {}
  }
}
function sheetText(value) { return /^[=+\-@]/.test(value) ? "'" + value : value; }
function buildPayload(contact) {
  const name = sheetText(contact.name), email = sheetText(contact.email);
  return {
    name, email, phone: email, role: '', org: '', orgtype: '', use_case: '', interest: '',
    ...Object.fromEntries(Object.entries(channel).map(([k,v]) => [k, sheetText(v)])),
    channel: sheetText(channel.utm_source || 'direct'), track: 'center',
    demo: '', ask: 'Please contact me about GemGem400.',
    submitted_at: new Date().toISOString(), consent: 'Contact about this inquiry; privacy notice 2026-09-27'
  };
}
let calendarScriptPromise;
function loadCalendly() {
  if (window.Calendly) return Promise.resolve();
  if (!calendarScriptPromise) calendarScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://assets.calendly.com/assets/external/widget.js';
    script.async = true;
    const timeout = setTimeout(() => reject(new Error('Calendar timeout')), 15000);
    script.onload = () => { clearTimeout(timeout); window.Calendly ? resolve() : reject(new Error('Calendar unavailable')); };
    script.onerror = () => { clearTimeout(timeout); reject(new Error('Calendar unavailable')); };
    document.head.appendChild(script);
  });
  return calendarScriptPromise;
}
async function showCalendar(contact) {
  const container = document.getElementById('calendly-embed');
  try {
    await loadCalendly();
    window.Calendly.initInlineWidget({
      url: CONFIG.CALENDLY_URL + '?hide_event_type_details=1&primary_color=087db7',
      parentElement: container, resize: true,
      prefill: { name: contact.name, email: contact.email },
      utm: { utmSource: channel.utm_source, utmContent: channel.utm_content, utmMedium: channel.utm_medium, utmCampaign: channel.utm_campaign }
    });
  } catch (_) {
    container.hidden = true; // Contact was sent; a calendar outage must not show a failed submission.
  }
}
const form = document.getElementById('lead-form');
const button = document.getElementById('submit-button');
const error = document.getElementById('form-error');
const success = document.getElementById('success');
const confirmation = document.getElementById('confirmation');
const bookButton = document.getElementById('book-demo');
const calendarSection = document.getElementById('calendar-section');
let submitting = false, submitted = false, capturedContact = null, calendarOpened = false;
bookButton.addEventListener('click', () => {
  if (!submitted || !capturedContact) return;
  calendarSection.hidden = false;
  bookButton.setAttribute('aria-expanded', 'true');
  calendarSection.focus();
  calendarSection.scrollIntoView({ behavior: 'auto', block: 'start' });
  if (calendarOpened) return;
  calendarOpened = true;
  track('lead_calendar_open');
  void showCalendar(capturedContact);
});
if (preview) document.getElementById('preview-note').hidden = false;
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (submitting || submitted) return;
  for (const input of form.querySelectorAll('input')) input.value = input.value.trim();
  if (!form.reportValidity()) return;
  const contact = Object.fromEntries(new FormData(form));
  submitting = true; error.hidden = true; button.disabled = true; button.textContent = 'Sending…';
  track('lead_submit_attempt');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    if (!preview) {
      const response = await fetch(CONFIG.SHEETS_WEBHOOK, {
        method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(buildPayload(contact)), signal: controller.signal
      });
      if (response.type !== 'opaque' && !response.ok) throw new Error('Request failed');
    }
    // Legacy Apps Script transport is opaque: it cannot confirm a stored row to this browser.
    submitted = true; capturedContact = contact;
    track('lead_submit', { receipt_verified: false });
    form.hidden = true; success.hidden = false;
    confirmation.focus();
    confirmation.scrollIntoView({ behavior: 'auto', block: 'start' });
  } catch (_) {
    track('lead_webhook_error');
    error.hidden = false; button.disabled = false; button.textContent = 'Submit';
  } finally {
    clearTimeout(timeout); submitting = false;
  }
});
const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();
track('lead_view');
