const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync('app.js', 'utf8');

function setup(fetchImplementation = async () => ({type:'opaque', ok:false})) {
  const handlers = {};
  const values = {name:' Test Person ', email:'person@example.org', role:'Occupational therapist', org:'Test Clinic', use_case:'Both clinic and home', interest:'Product information'};
  const events = [], requests = [], timers = [];
  const controls = ['name','email','org'].map(name => ({name, get value(){return values[name]},set value(v){values[name]=v}}));
  const form = {hidden:false, valid:true, addEventListener:(name, fn)=>handlers[name]=fn, querySelectorAll:()=>controls, reportValidity(){return this.valid}};
  const button = {disabled:false, textContent:"Let's connect"};
  const error = {hidden:true};
  const success = {hidden:true, focused:false,focus(){this.focused=true}};
  const nodes = {'lead-form':form,'submit-button':button,'form-error':error,success,year:{}};
  const context = vm.createContext({
    location:{search:'?utm_source=expo&utm_content=parent_card',hostname:'jeklinkimm.github.io'},
    window:{mixpanel:{init(){},register(){},track(event, properties){events.push({event,properties})}}},
    document:{getElementById:id=>nodes[id], querySelectorAll:()=>[]},
    FormData:class{constructor(){return Object.entries(values)}}, URLSearchParams,AbortController,Date,
    setTimeout:fn=>(timers.push(fn),timers.length),clearTimeout(){},
    fetch:async(url,options)=>{requests.push({url,options});return fetchImplementation(url,options)}
  });
  vm.runInContext(source,context);
  return {values,form,button,error,success,events,requests,timers,context, submit:()=>handlers.submit({preventDefault(){}}),handlers};
}
test('all six answers and email survive the legacy sheet contract; UTMs are retained',async()=>{
  const h=setup();await h.submit();
  const payload=JSON.parse(h.requests[0].options.body);
  assert.equal(payload.name,'Test Person');assert.equal(payload.email,'person@example.org');assert.equal(payload.phone,payload.email);
  assert.equal(payload.demo,'Product information');assert.match(payload.ask,/Both clinic and home/);
  assert.equal(payload.utm_source,'expo');assert.equal(payload.utm_content,'parent_card');assert.equal(payload.track,'center');
  assert.equal(h.form.hidden,true);assert.equal(h.success.hidden,false);assert.equal(h.success.focused,true);
  assert.equal(h.events.find(e=>e.event==='lead_submit').properties.receipt_verified,false);
});
test('invalid form does not send or show completion',async()=>{
  const h=setup();h.form.valid=false;await h.submit();assert.equal(h.requests.length,0);assert.equal(h.success.hidden,true);
});
test('network failure keeps answers, shows an error, and allows retry',async()=>{
  let fail=true;const h=setup(async()=>{if(fail)throw Error('offline');return {type:'opaque'}});
  await h.submit();assert.equal(h.error.hidden,false);assert.equal(h.form.hidden,false);assert.equal(h.button.disabled,false);assert.equal(h.values.email,'person@example.org');
  fail=false;await h.submit();assert.equal(h.success.hidden,false);assert.equal(h.error.hidden,true);
});
test('two clicks during an in-flight request result in only one POST',async()=>{
  let complete;const h=setup(()=>new Promise(resolve=>complete=resolve));
  const first=h.submit();await h.submit();assert.equal(h.requests.length,1);complete({type:'opaque'});await first;
});
test('request timeout restores the form without claiming success',async()=>{
  const h=setup((url,options)=>new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(Error('timeout')))));
  const pending=h.submit();h.timers[0]();await pending;assert.equal(h.success.hidden,true);assert.equal(h.error.hidden,false);assert.equal(h.button.disabled,false);
});
test('contact data stays out of analytics and formula-like input is escaped',async()=>{
  const h=setup();h.values.org='=HYPERLINK("example.org")';await h.submit();
  assert.equal(JSON.parse(h.requests[0].options.body).org.charAt(0),"'");
  const log=JSON.stringify(h.events);for(const value of ['Test Person','person@example.org','HYPERLINK','Both clinic and home'])assert.equal(log.includes(value),false);
});
test('parent option retains compatibility without any hidden questionnaire',async()=>{
  const h=setup();h.values.role='Parent / caregiver';h.values.org='Individual';await h.submit();assert.equal(JSON.parse(h.requests[0].options.body).track,'parent');
});
test('readable server errors are not treated as completion',async()=>{
  const h=setup(async()=>({type:'basic',ok:false}));await h.submit();assert.equal(h.success.hidden,true);assert.equal(h.error.hidden,false);
});
