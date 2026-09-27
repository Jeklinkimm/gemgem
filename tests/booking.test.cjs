const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync('app.js', 'utf8');
function run(mixpanel) {
  const handlers = {};
  vm.runInNewContext(source, {
    URLSearchParams, Date,
    location: {search: '?utm_source=expo&utm_content=parent_card', hostname: 'jeklinkimm.github.io'},
    window: {mixpanel},
    document: {getElementById: () => ({}), querySelectorAll: () => [{addEventListener: (name, fn) => {handlers[name] = fn}}]}
  });
  return handlers;
}
test('booking scrolls inline and retains an external fallback without analytics', () => {
  for (const analytics of [undefined, {init(){throw Error('blocked')}}, {init(){}, track(){throw Error('blocked')}}]) {
    const handlers = run(analytics);
    assert.doesNotThrow(() => handlers.click());
  }
  const html = fs.readFileSync('index.html', 'utf8');
  assert.match(html, /data-booking href="#survey"/);
  assert.match(html, /id="survey" class="calendar-section"/);
  assert.match(html, /class="calendly-inline-widget"/);
  assert.match(html, /href="https:\/\/calendly.com\/jeklinkim-gemgem\/15-minute-aacpdm-intro-call"/);
  assert.doesNotMatch(html, /<form\b/);
});
test('records campaign-attributed clicks, never a booking confirmation', () => {
  const events = [];
  const handlers = run({init(){}, track: (name, properties) => events.push({name, properties})});
  handlers.click();
  assert.deepEqual(events.map(e => e.name), ['lead_view', 'lead_cta_click']);
  assert.equal(events[1].properties.utm_source, 'expo');
  assert.equal(events[1].properties.utm_content, 'parent_card');
});
