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
assert.deepEqual(fields, ['full_name', 'email', 'phone', 'referral_code', 'nin', 'international_passport_number', 'nationality', 'password', 'confirm_password']);
const selector = inspect('src/components/common/SelectField.js');
assert.equal(selector.styles.field.minHeight, 54);
assert.equal(selector.styles.compactField.minHeight, 48);
assert.equal(selector.styles.compactContainer.marginBottom, 10);
assert.match(selector.source, /compact = false/);
assert.equal(screen.styles.reviewCard.padding, 14);
assert.equal(screen.styles.reviewHeadingCopy.flex, 1);
assert.equal(screen.styles.editButton.width, 44);
assert.equal(screen.styles.termsRow.minHeight, 44);
assert.equal(copy['our special team will be assigned to assist with tenancy and property disputes (fee applies).'].en, 'Our special team will be assigned to assist with tenancy and property disputes (fee applies).');
let selectors = 0;
traverse(screen.ast, { JSXOpeningElement(p) {
  if (p.node.name.name !== 'SelectField') return;
  assert.ok(p.node.attributes.some(a => a.name?.name === 'compact'));
  const label = p.node.attributes.find(a => a.name?.name === 'label');
  if (screen.source.slice(label.start, label.end).includes('Local Government Area')) {
    const disabled = p.node.attributes.find(a => a.name?.name === 'disabled');
    assert.equal(screen.source.slice(disabled.value.expression.start, disabled.value.expression.end), '!selectedState');
  }
  selectors++;
} });
assert.equal(selectors, 2);
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
