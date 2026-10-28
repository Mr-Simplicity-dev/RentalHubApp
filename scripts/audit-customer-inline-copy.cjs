const fs = require('node:fs');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const { files } = require('./customer-localization-scope.cjs');
const found = [];
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  traverse(parser.parse(source, { sourceType: 'module', plugins: ['jsx'] }), {
    StringLiteral(p) {
      if (!/[a-z]{2}/i.test(p.node.value) || /^https?:|^[^\s]+@[^\s]+$/.test(p.node.value)) return;
      let value = p;
      while (value.parentPath && (value.parentPath.isConditionalExpression() || value.parentPath.isLogicalExpression())) {
        if (value.parentPath.isConditionalExpression() && value.key === 'test') return;
        if (value.parentPath.isLogicalExpression() && value.key === 'left') return;
        value = value.parentPath;
      }
      if (!value.parentPath.isJSXExpressionContainer() || !value.parentPath.parentPath.isJSXElement()) return;
      found.push({ file, text: p.node.value, start: p.node.start, end: p.node.end, line: p.node.loc.start.line });
    }
  });
}
if (require.main === module) {
  const untranslated = found.filter(row => !['RentalHub', 'Amana RentalHub NG', 'Paystack', 'NIN', 'OTP', 'USD', 'NGN'].includes(row.text));
  if (process.argv.includes('--check')) {
    if (untranslated.length) throw Error('Untranslated conditional interface copy: ' + JSON.stringify(untranslated));
    console.log('Customer conditional labels and fallback messages are localized.');
  } else console.log(JSON.stringify(found, null, 2));
}
module.exports = found;
