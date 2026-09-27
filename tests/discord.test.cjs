const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function setup(code=200, retryAfter=1) {
  const sleeps=[];
  const rows=[['submitted_at','name','phone'],['old date','Existing lead','123']],posts=[];
  let unlocked=false;
  const sh={getDataRange:()=>({getValues:()=>rows}),getLastRow:()=>rows.length,getLastColumn:()=>rows[0].length,getSheetId:()=>7,
    getRange:(r,c,n,w)=>({getValues:()=>[rows[r-1].slice(c-1,c-1+w)],setValues:values=>{rows[r-1]=values[0]},setValue:value=>{rows[r-1][c-1]=value}}),appendRow:row=>rows.push(row)};
  const context={console:{warn(){}},Date,SpreadsheetApp:{getActiveSpreadsheet:()=>({getSheetByName:()=>sh,getUrl:()=> 'https://docs.google.com/spreadsheets/d/test/edit'}),flush(){}},LockService:{getScriptLock:()=>({tryLock:()=>true,waitLock(){},releaseLock(){unlocked=true}})},PropertiesService:{getScriptProperties:()=>({getProperty:()=> 'https://discord.com/api/webhooks/123/test-only'})},Utilities:{formatDate:()=> '2026-09-27 12:00',sleep:ms=>sleeps.push(ms)},UrlFetchApp:{fetch:(url,opts)=>{posts.push({url,body:JSON.parse(opts.payload)});return {getResponseCode:()=>Array.isArray(code)?code[Math.min(posts.length-1,code.length-1)]:code,getAllHeaders:()=>({'Retry-After':retryAfter}),getContentText:()=>JSON.stringify({id:'1234567890123456789'})}}},ContentService:{createTextOutput:s=>s}};
  vm.runInNewContext(fs.readFileSync('backend/Code.gs','utf8'),context);
  return {rows,posts,sleeps,retry:()=>context.retryDiscordNotifications(),submit:d=>context.doPost({postData:{contents:JSON.stringify(d)}}),unlocked:()=>unlocked};
}
test('stores lead and Discord receipt while preserving existing rows and blocking mentions',()=>{
  const h=setup();assert.equal(h.submit({name:'@everyone',email:'test@example.org',phone:'test@example.org'}),'ok');
  assert.deepEqual(h.rows[1],['old date','Existing lead','123']);
  const row=Object.fromEntries(h.rows[0].map((k,i)=>[k,h.rows[2][i]]));
  assert.equal(row.name,"'@everyone");assert.equal(row.email,'test@example.org');assert.equal(row.discord_status,'sent');
  assert.equal(row.discord_message_id,"'1234567890123456789");assert.deepEqual(h.posts[0].body.allowed_mentions.parse,[]);
  assert.equal(h.posts[0].body.thread_name,'새 문의 - @everyone');assert.match(h.posts[0].url,/\?wait=true$/);assert.ok(h.unlocked());
});
test('Discord outage preserves contact and marks notification failed without claiming delivery',()=>{
  const h=setup(500);assert.equal(h.submit({name:'Test',email:'test@example.org'}),'ok');
  const row=Object.fromEntries(h.rows[0].map((k,i)=>[k,h.rows[2][i]]));
  assert.equal(row.email,'test@example.org');assert.equal(row.discord_status,'failed');assert.equal(row.discord_message_id,'');assert.ok(h.unlocked());
});
test('invalid submission makes no row and sends no notification',()=>{
  const h=setup();assert.throws(()=>h.submit({name:''}));assert.equal(h.rows.length,2);assert.equal(h.posts.length,0);
});

test('rate limits wait before retry without saving duplicate leads',()=>{
  const h=setup([429,200],3);h.submit({name:'Test',email:'test@example.org'});
  assert.equal(h.rows.length,3);assert.equal(h.posts.length,2);assert.deepEqual(h.sleeps,[3250]);
  assert.equal(h.rows[2][h.rows[0].indexOf('discord_status')],'sent');
});
test('long rate limits do not retry before the requested delay',()=>{
  const h=setup(429,60);h.submit({name:'Test',email:'test@example.org'});
  assert.equal(h.posts.length,1);assert.equal(h.sleeps.length,0);
  assert.equal(h.rows[2][h.rows[0].indexOf('discord_status')],'rate_limited');
});

test('scheduled retry respects due time and does not repost successful contacts',()=>{
  const h=setup([429,200],60);h.submit({name:'Test',email:'test@example.org'});
  h.retry();assert.equal(h.posts.length,1);
  h.rows[2][h.rows[0].indexOf('discord_retry_at')]='2020-01-01T00:00:00Z';
  h.retry();assert.equal(h.posts.length,2);
  assert.equal(h.rows[2][h.rows[0].indexOf('discord_status')],'sent');
  h.retry();assert.equal(h.posts.length,2);
});
