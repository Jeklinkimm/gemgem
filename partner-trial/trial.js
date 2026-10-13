'use strict';
const WEBHOOK='https://script.google.com/macros/s/AKfycbw1VbabSevaAc_DXiqG7VVd3Bs_Zaj-2RfK8eC_wPuCRYsVlon9BO9NJS0M_5YcSqNj/exec';
const DEVICE_LABELS={ipad:'iPad',iphone:'iPhone',android_tablet:'Android tablet',android_phone:'Android phone',not_sure:'Not sure yet'};
const READINESS_LABELS={ready:'Ready to start',approval:'Internal review or approval needed',questions:'Questions before starting'};
const params=new URLSearchParams(location.search);
const preview=['localhost','127.0.0.1','::1'].includes(location.hostname)&&params.get('preview')==='1';
function sheetText(value){const text=String(value||'').trim();return /^[=+\-@]/.test(text)?"'"+text:text;}
function buildTrialPayload(contact,query=params){
  const device=DEVICE_LABELS[contact.device];const readiness=READINESS_LABELS[contact.readiness];
  if(!device||!readiness)throw new Error('Invalid trial options');
  const fields=Object.fromEntries(['name','email','org','country'].map(k=>[k,String(contact[k]||'').trim()]));
  if(!fields.name||fields.name.length>120||!fields.org||fields.org.length>200||!fields.country||fields.country.length>100||fields.email.length>254||!/^\S+@\S+\.\S+$/.test(fields.email))throw new Error('Invalid contact details');
  return {
    name:sheetText(fields.name),email:sheetText(fields.email),phone:sheetText(fields.email),org:sheetText(fields.org),region:sheetText(fields.country),
    track:'center',role:'',orgtype:'',channel:sheetText(query.get('utm_source')||'partner-trial'),
    utm_source:sheetText((query.get('utm_source')||'').slice(0,200)),utm_content:sheetText((query.get('utm_content')||'').slice(0,200)),
    ask:sheetText('GemGem400 1-month partner trial request. Country: '+fields.country+'. Device: '+device+'. Readiness: '+readiness+'. Free month starts at activation; 15-minute Zoom feedback after use. Form version: partner-trial-20261013.'),
    submitted_at:new Date().toISOString()
  };
}
function nextStep(readiness){
  if(readiness==='ready')return {message:"We'll check your setup and email the free trial & feedback agreement and account instructions.",next:'Your free month begins when your account is activated.',call:false};
  if(readiness==='approval')return {message:"We'll email information your team can review before signing or setting up an account.",next:'You can take time for the internal review before activating the free month.',call:false};
  return {message:"We'll reply by email to help with your questions.",next:'If you prefer to talk, you can choose a time below.',call:true};
}
const form=document.getElementById('trial-form'),button=document.getElementById('submit-button'),error=document.getElementById('form-error'),success=document.getElementById('success');
let submitting=false,submitted=false;
if(preview)document.getElementById('preview-note').hidden=false;
form.addEventListener('submit',async event=>{
  event.preventDefault();if(submitting||submitted)return;
  for(const input of form.querySelectorAll('input:not([type=radio])'))input.value=input.value.trim();
  if(!form.reportValidity())return;
  const contact=Object.fromEntries(new FormData(form));let payload;
  try{payload=buildTrialPayload(contact);}catch(_){error.hidden=false;return;}
  submitting=true;error.hidden=true;button.disabled=true;button.textContent='Sending...';
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);
  try{
    if(!preview){
      const response=await fetch(WEBHOOK,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain'},body:JSON.stringify(payload),signal:controller.signal});
      if(response.type!=='opaque'&&!response.ok)throw new Error('Request failed');
    }
    // The legacy cross-origin transport cannot acknowledge a saved row to the browser.
    submitted=true;const step=nextStep(contact.readiness);
    document.getElementById('success-message').textContent=step.message;
    document.getElementById('success-next').textContent=step.next;
    document.getElementById('question-call').hidden=!step.call;
    document.getElementById('success-preview').hidden=!preview;
    if(preview)document.getElementById('success-title').textContent='Preview complete.';
    form.hidden=true;success.hidden=false;success.focus();success.scrollIntoView({behavior:'auto',block:'start'});
  }catch(_){error.hidden=false;button.disabled=false;button.textContent='Request a 1-month partner trial';}
  finally{clearTimeout(timeout);submitting=false;}
});
