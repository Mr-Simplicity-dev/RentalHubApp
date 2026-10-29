const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const copy = require('../src/i18n/interfaceCopy.json');
const bad = /\u00e2\u20ac|\u00c2\u00b7|\ufffd/;
function inspect(file) {
  const source = new TextDecoder('utf-8', { fatal: true }).decode(fs.readFileSync(file));
  const ast = parser.parse(source, { sourceType: 'module', plugins: ['jsx'] });
  let styles;
  traverse(ast, { VariableDeclarator(p) {
    if (p.node.id.name === 'styles') styles = vm.runInNewContext(source.slice(p.node.init.start, p.node.init.end), {
      StyleSheet: { create: value => value }, Platform: { OS: 'android' }, colors: {}, radius: {},
      shadows: { soft: {} }, typography: {}, typeScale: { xxl: 28, reading: 15, xs: 13, sm: 14 }
    });
  } });
  return { source, ast, styles };
}
const screen = inspect('src/screens/auth/RegisterScreen.js');
assert.ok(!bad.test(screen.source), 'Registration source contains mojibake');
assert.equal(screen.styles.title.fontSize, 28);
assert.equal(screen.styles.aboutTitle.textAlign, 'center');
assert.equal(screen.styles.aboutSubtitle.maxWidth, 360);
assert.equal(screen.styles.noticeCard.paddingVertical, 8);
assert.equal(screen.styles.noticeText.textAlign, 'center');
assert.equal(screen.styles.toggleBtn.minHeight, 44);
assert.equal(screen.styles.toggleBtn.flex, 1);
assert.equal(screen.styles.aboutCard.padding, 12);
assert.equal(screen.styles.lastAboutField.marginBottom, 0);
const fields = [];
traverse(screen.ast, { JSXOpeningElement(p) {
  if (p.node.name.name !== 'Input' || !p.node.attributes.some(a => a.name?.name === 'compact')) return;
  const value = p.node.attributes.find(a => a.name?.name === 'value')?.value?.expression;
  fields.push(value.property.name);
} });
assert.deepEqual(fields, ['full_name', 'email', 'phone', 'referral_code']);
const input = inspect('src/components/common/Input.js');
assert.equal(input.styles.inputContainer.minHeight, 54);
assert.equal(input.styles.compactInputContainer.minHeight, 48);
assert.equal(input.styles.container.marginBottom, 18);
assert.equal(input.styles.compactContainer.marginBottom, 10);
assert.equal(input.styles.compactInput.paddingVertical, 10);
assert.match(input.source, /compact = false/);
for (const text of ["Choose how you'll use RentalHub and tell us how to reach you.", "I'm registering as", "Enter the agent's full name.", "Enter the agent's phone number.", "I agree to RentalHub's", 'Starting payment…']) {
  const key = text.toLowerCase();
  assert.equal(copy[key].en, text);
  for (const locale of ['en', 'ar', 'fr', 'ru', 'zh', 'ha', 'yo', 'ig']) {
    assert.ok(copy[key][locale]?.trim(), locale + ' missing ' + text);
    assert.ok(!bad.test(copy[key][locale]), locale + ' corrupted ' + text);
  }
}
for (const width of [320, 360, 375, 390, 430, 768]) {
  const cardWidth = width - 2 * screen.styles.content.padding;
  assert.ok(cardWidth - 2 * screen.styles.aboutCard.padding > 200);
  assert.ok(Math.min(cardWidth, screen.styles.aboutSubtitle.maxWidth) <= cardWidth);
}
console.log('Registration layout passed: scoped compact fields, touch targets, responsive widths, valid UTF-8 and six corrected keys across eight locales.');
