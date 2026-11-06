const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const s=fs.readFileSync('../services/premblyRecoveryService.js','utf8');const start=s.indexOf('const canRetryRegistrationAuthFailure ='),end=s.indexOf(';',start);const ctx={};vm.runInNewContext(s.slice(start,end+1)+'\nthis.check=canRetryRegistrationAuthFailure;',ctx);
const now=Date.now(),row={context_type:'registration',status:'not_verified',provider_message:"ErrorDetail(code='token_not_valid')",provider_reference:null,billing_status:null,updated_at:new Date(now-360000).toISOString()};
assert.equal(ctx.check(row,now),true);
for(const patch of [{updated_at:new Date(now-1000).toISOString()},{billing_status:true},{provider_reference:'provider-ref'},{status:'verified'},{status:'pending'},{context_type:'credential_revalidation'},{provider_message:'NIN does not match'},{updated_at:'invalid'}])assert.equal(ctx.check({...row,...patch},now),false);
assert.equal(ctx.check(undefined,now),false);
console.log('PASS: old authentication failure retries; cooldown, billed/referenced attempts, pending/verified results, actual identity rejection and revalidation remain protected.');
