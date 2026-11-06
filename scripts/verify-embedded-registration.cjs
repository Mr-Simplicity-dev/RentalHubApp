const fs=require('fs'),assert=require('assert/strict'),vm=require('vm'),parser=require('@babel/parser'),traverse=require('@babel/traverse').default;
const s=fs.readFileSync('src/components/RegistrationCardCheckout.js','utf8');let code;traverse(parser.parse(s,{sourceType:'module',plugins:['jsx']}),{VariableDeclarator(p){if(p.node.id.name==='allow')code=s.slice(p.node.init.start,p.node.init.end);}});
let finished=0;const allow=vm.runInNewContext('('+code+')',{URL,finish:()=>finished++});
assert.equal(allow({url:'https://checkout.paystack.com/test'}),true);assert.equal(allow({url:'https://bank.example/3ds'}),true);
for(const url of ['javascript:alert(1)','http://checkout.paystack.com/test','intent://bank','https://evil.example/register']){const result=allow({url});if(url.startsWith('https:'))assert.equal(result,true);else assert.equal(result,false);}
assert.equal(finished,0);assert.equal(allow({url:'https://rentalhub.com.ng/register?reference=fake'}),false);assert.equal(finished,1);
console.log('PASS: HTTPS checkout and bank challenge allowed; unsafe schemes blocked; RentalHub return requests server verification without trusting callback payment claims.');
