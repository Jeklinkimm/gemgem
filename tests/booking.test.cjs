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
test('inline booking retains an external fallback without analytics', () => {
  for (const analytics of [undefined, {init(){throw Error('blocked')}}, {init(){}, track(){throw Error('blocked')}}]) {
    assert.doesNotThrow(() => run(analytics));
  }
  const html = fs.readFileSync('index.html', 'utf8');
  assert.doesNotMatch(html, /class="booking-button"/);
  assert.match(html, /id="survey" class="calendar-section"/);
  assert.match(html, /class="calendly-inline-widget"/);
  assert.match(html, /href="https:\/\/calendly.com\/jeklinkim-gemgem\/15-minute-aacpdm-intro-call"/);
  assert.doesNotMatch(html, /<form\b/);
});
test('records campaign-attributed page views, never a booking confirmation', () => {
  const events = [];
  const handlers = run({init(){}, track: (name, properties) => events.push({name, properties})});
  assert.deepEqual(events.map(e => e.name), ['lead_view']);
  assert.equal(events[0].properties.utm_source, 'expo');
  assert.equal(events[0].properties.utm_content, 'parent_card');
});
