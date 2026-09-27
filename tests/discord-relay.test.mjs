import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHandler } from '../backend/discord-relay/worker.mjs';
const env = { DISCORD_RELAY_TOKEN: 'test-only-relay-token', DISCORD_WEBHOOK_URL: 'https://discord.com/api/webhooks/123/test-only' };
const request = (body = { thread_name: 'Test', content: 'Test inquiry', allowed_mentions: {parse:['everyone']} }, token = env.DISCORD_RELAY_TOKEN) => new Request('https://relay.example/send', {method:'POST', headers:{authorization:'Bearer '+token}, body:JSON.stringify(body)});
test('unauthorized callers cannot forward Discord messages', async()=>{
  const handler=createHandler(()=>{throw Error('must not send')});
  assert.equal((await handler(request(undefined,'wrong'),env)).status,401);
});
test('only a Discord receipt produces success and mentions are forced off', async()=>{
  let actual;
  const handler=createHandler(async(url,options)=>{actual={url,body:JSON.parse(options.body)};return Response.json({id:'1234567890123456789',token:'must-not-be-forwarded'});});
  const response=await handler(request(),env);
  assert.equal(response.status,200);assert.deepEqual(await response.json(),{id:'1234567890123456789'});
  assert.deepEqual(actual.body.allowed_mentions,{parse:[]});assert.match(actual.url,/wait=true$/);
});
test('429 preserves the longest mandated delay without automatic immediate retries', async()=>{
  let calls=0;
  const handler=createHandler(async()=>{calls++;return Response.json({retry_after:900},{status:429,headers:{'Retry-After':'1200'}})});
  const response=await handler(request(),env);
  assert.equal(response.status,429);assert.equal((await response.json()).retry_after,1200);assert.equal(calls,1);
});
test('invalid input and request-controlled webhook destinations are rejected or ignored', async()=>{
  let calls=0;const handler=createHandler(async(url)=>{calls++;assert.match(url,/discord\.com/);return Response.json({id:'123'});});
  assert.equal((await handler(request({thread_name:'Test',content:''}),env)).status,400);
  assert.equal(calls,0);
  assert.equal((await handler(request({thread_name:'Test',content:'Test',url:'https://evil.example'}),env)).status,200);
});
test('network failure and missing receipt cannot claim delivery or leak secrets', async()=>{
  for(const upstream of [()=>{throw Error(env.DISCORD_WEBHOOK_URL)},()=>Response.json({})]) {
    const response=await createHandler(upstream)(request(),env);
    assert.equal(response.status,502);assert.ok(!(await response.text()).includes('webhooks'));
  }
});
