const fs = require('fs');
const file = 'src/i18n/interfaceCopy.json';
const copy = JSON.parse(fs.readFileSync(file, 'utf8'));
const customerKeys = new Set(require('./customer-localization-scope.cjs').used.keys());
let count = 0;
for (const name of fs.readdirSync('.codex-tmp').filter(n => /^customer-direct-\d+\.tsv$/.test(n))) {
  for (const line of fs.readFileSync('.codex-tmp/' + name, 'utf8').split(/\r?\n/).filter(Boolean)) {
    const [en, ...translations] = line.split('|');
    if (translations.length !== 3) throw Error('Invalid row ' + en);
    const key = en.replace(/\s+/g, ' ').trim().toLowerCase();
    copy[key] = { ...copy[key], en };
    for (const [i, locale] of ['ha', 'yo', 'ig'].entries()) {
      const text = translations[i];
      const slots = value => (value.match(/\{\w+\}/g) || []).sort().join('|');
      if (slots(en) !== slots(text)) throw Error('Changed placeholder ' + en);
      if (!copy[key][locale]) { copy[key][locale] = text; count++; }
    }
  }
}
const canon = text => text.normalize('NFKC').replace(/[’‘]/g, "'").toLowerCase().trim().replace(/^(could not|unable to|failed to) /, 'failure to ').replace(/[.!?:…]+$/, '').trim();
for (const locale of ['ha', 'yo', 'ig']) {
  const known = new Map();
  for (const row of Object.values(copy)) if (row.en && row[locale]) known.set(canon(row.en), row[locale]);
  for (const [key, row] of Object.entries(copy)) {
    if (!customerKeys.has(key)) continue;
    if (!row.en || row[locale]) continue;
    const match = known.get(canon(row.en));
    if (match) { row[locale] = match; count++; }
  }
}
fs.writeFileSync(file, JSON.stringify(copy, null, 2) + '\n');
console.log('Saved ' + count + ' direct and equivalent-phrase translations.');
