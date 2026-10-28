const fs = require('node:fs');
const { used } = require('./customer-localization-scope.cjs');
const file = 'src/i18n/interfaceCopy.json';
const copy = JSON.parse(fs.readFileSync(file, 'utf8'));
const removed = JSON.parse(fs.readFileSync('.codex-tmp/removed-admin-translation-keys.json', 'utf8'));
let count = 0;
for (const key of removed) {
  if (used.has(key) || !copy[key]) continue;
  for (const locale of Object.keys(copy[key])) {
    if (locale !== 'en') { delete copy[key][locale]; count++; }
  }
}
for (const [key, ar] of Object.entries({ '/month, you can put': '/شهر، يمكنك إدخال', '/year).': '/سنة).', '/month': '/شهر' })) {
  if (copy[key]) copy[key].ar = ar;
}
fs.writeFileSync(file, JSON.stringify(copy, null, 2) + '\n');
console.log('Removed ' + count + ' unused admin-only translations; shared customer copy retained.');
