const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createMfaVerification } = require('../src/services/mfaVerification.cjs');
test('parallel dashboard requests verify one code and late failures reuse that result',async()=>{
  let prompts=0,verifications=0,release;
  const flow=createMfaVerification({requestCode:async()=>{prompts++;return '123456';},verify:async()=>{verifications++;await new Promise(r=>{release=r;});}});
  const a=flow.ensure(0),b=flow.ensure(0);
  await new Promise(setImmediate);release();await Promise.all([a,b]);
  await flow.ensure(0);assert.equal(prompts,1);assert.equal(verifications,1);assert.equal(flow.generation(),1);
});
test('invalid codes retry but lockouts do not and failed checks never advance the generation',async()=>{
  let calls=0;
  const flow=createMfaVerification({requestCode:async()=> '123456',verify:async()=>{calls++;throw {response:{data:{code:calls===1?'TOTP_INVALID':'TOTP_LOCKED'}}};}});
  await assert.rejects(flow.ensure(0));assert.equal(calls,2);assert.equal(flow.generation(),0);
});
test('cancel does not verify or authorize pending requests',async()=>{
  let calls=0;
  const flow=createMfaVerification({requestCode:async()=>{throw Error('cancel');},verify:async()=>{calls++;}});
  await assert.rejects(flow.ensure(0));assert.equal(calls,0);assert.equal(flow.generation(),0);
});
