const params = new URLSearchParams(location.search);
const channel = Object.fromEntries(['utm_source', 'utm_content', 'utm_medium', 'utm_campaign'].map(key => [key, (params.get(key) || '').slice(0, 200)]));
channel.page_version = 'us-cp-calendly-inline-v4';
let analyticsReady = false;
if (window.mixpanel && !['localhost', '127.0.0.1', '::1'].includes(location.hostname)) {
  try {
    window.mixpanel.init('7d0c521971a70f26652f621797d6efaa', { persistence: 'localStorage', autocapture: false, record_sessions_percent: 0 });
    analyticsReady = true;
  } catch (_) { /* The booking link works independently of analytics. */ }
}
function track(event) {
  if (analyticsReady) {
    try { window.mixpanel.track(event, channel); } catch (_) {}
  }
}
document.querySelectorAll('[data-booking]').forEach(link => link.addEventListener('click', () => track('lead_cta_click')));
const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();
track('lead_view');
