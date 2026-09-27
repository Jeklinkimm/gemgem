const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync('app.js','utf8');
function setup(options={}) {
 const handlers={},values={name:' Preview Person ',email:' preview@example.org '},requests=[],events=[],embeds=[],timers=[];
 const nodes={'lead-form':{hidden:false,valid:true,addEventListener:(n,f)=>handlers[n]=f,querySelectorAll:()=>Object.keys(values).map(k=>({get value(){return values[k]},set value(v){values[k]=v}})),reportValidity(){return this.valid}},'submit-button':{},'form-error':{hidden:true},success:{hidden:true},confirmation:{focus(){},scrollIntoView(){}},'calendly-embed':{hidden:false},'preview-note':{hidden:true},year:{},'book-demo':{addEventListener:(n,f)=>handlers.book=f,setAttribute(k,v){this[k]=v}},'calendar-section':{hidden:true,focus(){},scrollIntoView(){}}};
 const context={URLSearchParams,Date,AbortController,location:{hostname:options.host||'jeklinkimm.github.io',search:options.search||'?utm_source=expo'},window:{mixpanel:{init(){if(options.analyticsFail)throw Error()},track:(e,p)=>events.push({e,p})},Calendly:{initInlineWidget(c){if(options.calendarFail)throw Error();embeds.push(c)}}},document:{getElementById:k=>nodes[k]},FormData:class{constructor(){return Object.entries(values)}},fetch:async(u,o)=>{requests.push({u,o});return options.fetch?options.fetch(u,o):{type:'opaque'}},setTimeout:fn=>(timers.push(fn),timers.length),clearTimeout(){}};
 vm.runInNewContext(source,context);
 return {nodes,values,requests,events,embeds,timers,book:async()=>{handlers.book();await Promise.resolve()},submit:()=>handlers.submit({preventDefault(){}})};
}
test('captures contact before optional calendar with prefilled details and legacy contact mapping',async()=>{
 const h=setup();assert.equal(h.embeds.length,0);await h.submit();await Promise.resolve();
 const p=JSON.parse(h.requests[0].o.body);assert.equal(p.name,'Preview Person');assert.equal(p.phone,'preview@example.org');assert.equal(p.email,p.phone);assert.equal(p.utm_source,'expo');
 assert.equal(h.nodes.success.hidden,false);assert.equal(h.nodes['lead-form'].hidden,true);assert.equal(h.embeds.length,0);assert.equal(h.nodes['calendar-section'].hidden,true);await h.book();assert.equal(h.nodes['calendar-section'].hidden,false);assert.equal(h.embeds[0].prefill.email,'preview@example.org');assert.equal(h.embeds[0].prefill.name,'Preview Person');
 await h.submit();await h.book();assert.equal(h.requests.length,1);assert.equal(h.embeds.length,1);
 assert.equal(JSON.stringify(h.events).includes('preview@example.org'),false);
});
test('invalid form sends nothing; failures preserve inputs for retry',async()=>{
 const h=setup({fetch:async()=>{throw Error('offline')}});h.nodes['lead-form'].valid=false;await h.submit();assert.equal(h.requests.length,0);
 h.nodes['lead-form'].valid=true;await h.submit();assert.equal(h.nodes.success.hidden,true);assert.equal(h.nodes['form-error'].hidden,false);assert.equal(h.nodes['submit-button'].disabled,false);assert.equal(h.values.email,'preview@example.org');assert.equal(h.embeds.length,0);
});
test('duplicate in-flight submissions are suppressed and timeout does not claim success',async()=>{
 const h=setup({fetch:(_,o)=>new Promise((resolve,reject)=>o.signal.addEventListener('abort',()=>reject(Error('timeout'))))});const first=h.submit();await h.submit();assert.equal(h.requests.length,1);h.timers[0]();await first;assert.equal(h.nodes.success.hidden,true);
});
test('calendar or analytics failure does not lose a captured contact',async()=>{
 const h=setup({calendarFail:true,analyticsFail:true});await h.submit();await h.book();assert.equal(h.nodes.success.hidden,false);assert.equal(h.nodes['form-error'].hidden,true);assert.equal(h.nodes['calendly-embed'].hidden,true);
});
test('preview bypasses writes on localhost only',async()=>{
 const h=setup({host:'127.0.0.1',search:'?preview=1'});await h.submit();assert.equal(h.requests.length,0);assert.equal(h.nodes['preview-note'].hidden,false);
 const p=setup({search:'?preview=1'});await p.submit();assert.equal(p.requests.length,1);
});
test('formula-like names are escaped only for storage, not calendar prefill',async()=>{
 const h=setup();h.values.name='=Test';await h.submit();await h.book();assert.equal(JSON.parse(h.requests[0].o.body).name,"'=Test");assert.equal(h.embeds[0].prefill.name,'=Test');
});

test('booking cannot open before a successful contact submission',async()=>{
 const h=setup({fetch:async()=>{throw Error('offline')}});await h.book();await h.submit();await h.book();assert.equal(h.embeds.length,0);assert.equal(h.nodes['calendar-section'].hidden,true);
});
