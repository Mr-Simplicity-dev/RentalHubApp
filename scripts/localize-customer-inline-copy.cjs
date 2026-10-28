const fs = require('node:fs');
const parser = require('@babel/parser');
const rows = require('./audit-customer-inline-copy.cjs');
const groups = new Map();
for (const row of rows) {
  if (['RentalHub', 'Amana RentalHub NG', 'Paystack', 'NIN', 'OTP', 'USD', 'NGN'].includes(row.text)) continue;
  const group = groups.get(row.file) || [];
  group.push(row);
  groups.set(row.file, group);
}
let count = 0;
for (const [file, rows] of groups) {
  let source = fs.readFileSync(file, 'utf8');
  if (!/translateUi as ui/.test(source)) throw Error('Missing translation import: ' + file);
  for (const row of rows.sort((a, b) => b.start - a.start)) {
    source = source.slice(0, row.start) + 'ui(' + source.slice(row.start, row.end) + ')' + source.slice(row.end);
    count++;
  }
  parser.parse(source, { sourceType: 'module', plugins: ['jsx'] });
  fs.writeFileSync(file, source);
}
console.log('Localized ' + count + ' conditional/fallback labels in ' + groups.size + ' customer files.');
