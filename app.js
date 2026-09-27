/* The existing Google Sheets deployment uses a fixed legacy column list.
   Keep contact and fit information in those columns as well as named v2 fields. */
const CONFIG = {
  MIXPANEL_TOKEN: '7d0c521971a70f26652f621797d6efaa',
  SHEETS_WEBHOOK: 'https://script.google.com/macros/s/AKfycbw1VbabSevaAc_DXiqG7VVd3Bs_Zaj-2RfK8eC_wPuCRYsVlon9BO9NJS0M_5YcSqNj/exec'
};
const params = new URLSearchParams(location.search);
const channel = {
  utm_source: (params.get('utm_source') || 'direct').slice(0, 200),
  utm_content: (params.get('utm_content') || 'none').slice(0, 200),
  utm_medium: (params.get('utm_medium') || '').slice(0, 200),
  utm_campaign: (params.get('utm_campaign') || '').slice(0, 200),
  form_version: 'us-cp-15min-1to1-v2'
};
let analyticsReady = false;
if (window.mixpanel && !['localhost', '127.0.0.1', '::1'].includes(location.hostname)) {
  try {
    window.mixpanel.init(CONFIG.MIXPANEL_TOKEN, { persistence: 'localStorage', autocapture: false, record_sessions_percent: 0 });
    window.mixpanel.register(channel);
    analyticsReady = true;
  } catch (_) { /* Inquiry submission works without analytics. */ }
}
function track(event, properties = {}) {
  // Never send names, email addresses, organization names, or form answers to analytics.
  if (analyticsReady) {
    try { window.mixpanel.track(event, { ...channel, ...properties }); } catch (_) {}
  }
}
// Prevent spreadsheet formula evaluation when the legacy webhook appends plain strings.
function sheetText(value) {
  return /^[=+\-@]/.test(value) ? "'" + value : value;
}
function buildPayload(form) {
  const values = Object.fromEntries(new FormData(form));
  const fields = ['name', 'email', 'role', 'org', 'use_case', 'interest'];
  const answers = Object.fromEntries(fields.map(key => [key, sheetText(String(values[key] || '').trim())]));
  return {
    ...answers, ...Object.fromEntries(Object.entries(channel).map(([key, value]) => [key, sheetText(value)])),
    submitted_at: new Date().toISOString(),
    track: answers.role === 'Parent / caregiver' ? 'parent' : 'center',
    phone: answers.email, // Legacy contact column: preserve the email without a backend migration.
    channel: sheetText(channel.utm_source),
    orgtype: answers.role,
    demo: '15-minute 1:1 with GemGem',
    ask: 'Setting: ' + answers.use_case + '; 1:1 discussion topic: ' + answers.interest,
    consent: 'Contact about this inquiry; privacy notice 2026-09-26'
  };
}
const form = document.getElementById('lead-form');
const button = document.getElementById('submit-button');
const error = document.getElementById('form-error');
const success = document.getElementById('success');
let started = false;
let submitting = false;
form.addEventListener('input', () => {
  if (!started) { started = true; track('lead_start'); }
});
form.addEventListener('change', event => {
  if (!started) { started = true; track('lead_start'); }
  if (event.target.name) track('lead_field_complete', { field_id: event.target.name });
});
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (submitting) return;
  for (const input of form.querySelectorAll('input')) input.value = input.value.trim();
  if (!form.reportValidity()) return;
  submitting = true;
  error.hidden = true;
  button.disabled = true;
  button.textContent = 'Sending…';
  track('lead_submit_attempt');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(CONFIG.SHEETS_WEBHOOK, {
      method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(buildPayload(form)), signal: controller.signal
    });
    if (response.type !== 'opaque' && !response.ok) throw new Error('Request failed');
    // Apps Script returns an opaque response: delivery was attempted, sheet receipt cannot be read here.
    track('lead_submit', { receipt_verified: false });
    form.hidden = true;
    success.hidden = false;
    success.focus();
  } catch (_) {
    track('lead_webhook_error');
    error.hidden = false;
    button.disabled = false;
    button.textContent = "Request a 1:1 ↗";
  } finally {
    clearTimeout(timeout);
    submitting = false;
  }
});
document.querySelectorAll('a[href="#survey"]').forEach(link => link.addEventListener('click', () => track('lead_cta_click')));
document.getElementById('year').textContent = new Date().getFullYear();
track('lead_view');
