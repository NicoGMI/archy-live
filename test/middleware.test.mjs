import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash,webcrypto} from 'node:crypto'
import {onRequest} from '../functions/_middleware.js'
globalThis.crypto ||= webcrypto
const env={ARCHY_PASSWORD:'test-password'},token=createHash('sha256').update('archy-live-v1|'+env.ARCHY_PASSWORD).digest('hex')
test('authenticated stale password form redirects instead of static POST 405',async()=>{let called=false;const r=await onRequest({env,request:new Request('https://example.test/?debug&v=old',{method:'POST',headers:{cookie:'archy_auth='+token},body:new URLSearchParams({pw:'test-password'})}),next:async()=>{called=true;return new Response('Method Not Allowed',{status:405})}});assert.equal(r.status,303);assert.equal(r.headers.get('location'),'/?debug&v=old');assert.equal(called,false)})
test('authenticated GET still serves app and API POST still reaches API',async()=>{for(const [method,path]of[['GET','/'],['POST','/api/actions']]){const r=await onRequest({env,request:new Request('https://example.test'+path,{method,headers:{cookie:'archy_auth='+token}}),next:async()=>new Response('OK')});assert.equal(r.status,200);assert.equal(await r.text(),'OK')}})
