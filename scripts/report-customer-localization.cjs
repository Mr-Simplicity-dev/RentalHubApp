const fs = require('node:fs');
const { files, used } = require('./customer-localization-scope.cjs');
const copy = JSON.parse(fs.readFileSync('src/i18n/interfaceCopy.json', 'utf8'));
const locales = ['ha', 'yo', 'ig'];
const missing = Object.fromEntries(locales.map(locale => [locale,
  [...used].filter(([key]) => !copy[key]?.[locale]?.trim()).map(([key, en]) => ({ key, en }))
]));
const counts = Object.fromEntries(locales.map(locale => [locale, {
  total: used.size, translated: used.size - missing[locale].length, missing: missing[locale].length
}]));
const report = { scope: 'Public and all non-administrator role navigation, including tenants, landlords, agents, lawyers and marketing agents; reachable static interface copy only', files: files.length, counts, missing };
fs.writeFileSync('docs/mobile-nigerian-language-gaps.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ files: files.length, counts }, null, 2));
