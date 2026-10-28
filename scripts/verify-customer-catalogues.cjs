const assert = require('node:assert/strict');
const locales = ['ha', 'yo', 'ig'];
const catalogues = {
  interface: require('../src/i18n/catalog.cjs').UI_COPY,
  careers: require('../src/i18n/recruitmentCopy.cjs'),
  cases: require('../src/i18n/legalCasesCopy.cjs'),
  consent: require('../src/i18n/propertyRequestConsent.cjs')
};
const slots = text => (text.match(/\{\{?\w+\}?\}/g) || []).sort();
let checked = 0;
function verify(en, translated, name) {
  if (typeof en === 'string') {
    assert.equal(typeof translated, 'string', name + ' missing');
    assert.ok(translated.trim(), name + ' empty');
    assert.deepEqual(slots(translated), slots(en), name + ' placeholders');
    checked++;
    return;
  }
  for (const [key, value] of Object.entries(en)) verify(value, translated?.[key], name + '.' + key);
}
for (const [name, catalogue] of Object.entries(catalogues)) {
  for (const locale of locales) verify(catalogue.en, catalogue[locale], name + '.' + locale);
}
console.log(checked + ' customer catalogue translations checked, including Careers, cases and WhatsApp consent.');
