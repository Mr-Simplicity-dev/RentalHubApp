const fs = require('fs'), parser = require('@babel/parser'), traverse = require('@babel/traverse').default;
const { files } = require('../scripts/customer-localization-scope.cjs');
const rows=[];
for(const file of files)traverse(parser.parse(fs.readFileSync(file,'utf8'),{sourceType:'module',plugins:['jsx']}),{CallExpression(p){if(p.node.callee.name==='ui'&&!p.getFunctionParent())rows.push({file,line:p.node.loc.start.line,text:p.node.arguments[0]?.value});}});
console.log(JSON.stringify(rows,null,2));
