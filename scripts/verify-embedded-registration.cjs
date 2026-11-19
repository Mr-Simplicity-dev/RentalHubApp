const fs = require('fs');
const assert = require('assert/strict');
const vm = require('vm');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const s = fs.readFileSync('src/components/RegistrationCardCheckout.js', 'utf8');
const safeSrc = fs.readFileSync('src/utils/safeLinks.js', 'utf8');

let allowCode;
let redirectCode;
traverse(parser.parse(s, { sourceType: 'module', plugins: ['jsx'] }), {
  VariableDeclarator(p) {
    if (p.node.id.name === 'allowNavigation' || p.node.id.name === 'allow') {
      allowCode = s.slice(p.node.init.start, p.node.init.end);
    }
    if (p.node.id.name === 'isCheckoutCompleteRedirect') {
      redirectCode = s.slice(p.node.init.start, p.node.init.end);
    }
  },
});

const safeFns = {};
traverse(parser.parse(safeSrc, { sourceType: 'module' }), {
  VariableDeclarator(p) {
    if (['DEFAULT_ALLOWED_PROTOCOLS', 'UNSAFE_SCHEME_PATTERN', 'isAllowedExternalUrl', 'isSafeHttpsUrl'].includes(p.node.id.name)) {
      safeFns[p.node.id.name] = safeSrc.slice(p.node.init.start, p.node.init.end);
    }
  },
});

let finished = 0;
const ctx = vm.createContext({
  URL,
  finish: () => finished++,
  triggerReturn: () => finished++,
});
for (const k of ['DEFAULT_ALLOWED_PROTOCOLS', 'UNSAFE_SCHEME_PATTERN', 'isAllowedExternalUrl', 'isSafeHttpsUrl']) {
  ctx[k] = vm.runInContext('(' + safeFns[k] + ')', ctx);
}
if (redirectCode) {
  ctx.isCheckoutCompleteRedirect = vm.runInContext('(' + redirectCode + ')', ctx);
}
const allow = vm.runInContext('(' + allowCode + ')', ctx);

assert.equal(allow({ url: 'https://checkout.paystack.com/test' }), true);
assert.equal(allow({ url: 'https://bank.example/3ds' }), true);
for (const url of ['javascript:alert(1)', 'http://checkout.paystack.com/test', 'intent://bank', 'https://evil.example/register']) {
  const result = allow({ url });
  if (url.startsWith('https:')) assert.equal(result, true);
  else assert.equal(result, false);
}
assert.equal(finished, 0);
assert.equal(allow({ url: 'https://rentalhub.com.ng/register?reference=fake' }), false);
assert.equal(finished, 1);
console.log('PASS: HTTPS checkout and bank challenge allowed; unsafe schemes blocked; RentalHub return requests server verification without trusting callback payment claims.');
