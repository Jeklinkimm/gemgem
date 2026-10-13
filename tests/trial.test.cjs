const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../partner-trial/trial.js'),'utf8');
function setup({preview=false,publicPreviewQuery=false,readiness='ready',fetchImpl=async()=>({type:'opaque'})}={}){
  const nodes={};const data={name:'Alex Example',email:'alex@example.org',org:'Example Clinic',country:'Canada',device:'ipad',readiness};
  const get=id=>nodes[id]||(nodes[id]={hidden:true,disabled:false,textContent:'',listeners:{},addEventListener(e,fn){this.listeners[e]=fn;},querySelectorAll(){return [];},reportValidity(){return true;},focus(){this.focused=true;},scrollIntoView(){}});
  let calls=0;
  get('trial-form').hidden=false;
  const context=vm.createContext({document:{getElementById:get},location:{hostname:preview?'localhost':'jeklinkimm.github.io',search:preview||publicPreviewQuery?'?preview=1':''},URLSearchParams,FormData:class{[Symbol.iterator](){return Object.entries(data)[Symbol.iterator]();}},AbortController,setTimeout,clearTimeout,Date,fetch:async(...args)=>{calls++;return fetchImpl(...args);}});
  vm.runInContext(source,context);
  return {nodes,data,context,fn:expression=>vm.runInContext(expression,context),submit:()=>get('trial-form').listeners.submit({preventDefault(){}}),calls:()=>calls};
}
test('stores qualification in existing org, region and ask columns',()=>{
  const s=setup();const p=s.fn("buildTrialPayload({name:'Alex',email:'alex@example.org',org:'Clinic',country:'Canada',device:'ipad',readiness:'approval'})");
  assert.equal(p.org,'Clinic');assert.equal(p.region,'Canada');assert.equal(p.phone,p.email);
  assert.match(p.ask,/Device: iPad/);assert.match(p.ask,/Internal review or approval needed/);
});
test('escapes spreadsheet formulas and rejects invalid options',()=>{
  const s=setup();const p=s.fn("buildTrialPayload({name:'=formula',email:'alex@example.org',org:'+Clinic',country:'Canada',device:'ipad',readiness:'ready'})");
  assert.equal(p.name,"'=formula");assert.equal(p.org,"'+Clinic");
  assert.throws(()=>s.fn("buildTrialPayload({name:'Alex',email:'alex@example.org',org:'Clinic',country:'Canada',device:'unknown',readiness:'ready'})"));
});
test('ready and approval routes explain actual next steps, not account delivery',async()=>{
  for(const readiness of ['ready','approval']){
    const s=setup({readiness});await s.submit();
    assert.equal(s.calls(),1);assert.equal(s.nodes.success.hidden,false);assert.equal(s.nodes['question-call'].hidden,true);
    assert.doesNotMatch(s.nodes['success-message'].textContent,/account is ready|signed|password/i);
  }
});
test('questions route offers optional call only after submission',async()=>{
  const s=setup({readiness:'questions'});assert.equal(s.nodes['question-call'],undefined);
  await s.submit();assert.equal(s.nodes['question-call'].hidden,false);
});
test('local preview sends no request; success suppresses duplicate submissions',async()=>{
  const s=setup({preview:true});await s.submit();await s.submit();
  assert.equal(s.calls(),0);assert.equal(s.nodes['success-title'].textContent,'Preview complete.');
});
test('transport failure retains form and allows retry',async()=>{
  const s=setup({fetchImpl:async()=>{throw new Error('offline');}});await s.submit();
  assert.equal(s.nodes['form-error'].hidden,false);assert.equal(s.nodes['submit-button'].disabled,false);
  assert.equal(s.nodes['trial-form'].hidden,false);
  assert.equal(s.nodes.success.hidden,true);await s.submit();assert.equal(s.calls(),2);
});
test('public preview query does not bypass submission',async()=>{
  const s=setup({publicPreviewQuery:true});await s.submit();assert.equal(s.calls(),1);
});
