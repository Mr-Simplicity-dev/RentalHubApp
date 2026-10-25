const fs = require('fs');
const parser = require('@babel/parser');
const path = require('path');
const sizes = new Map([[12,'compact'],[13,'xs'],[14,'sm'],[15,'reading'],[16,'base'],[18,'md'],[20,'lg'],[24,'xl'],[28,'xxl'],[32,'hero']]);
let changed=0, objects=0;
function files(dir) {return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):e.name.endsWith('.js')?[path.join(dir,e.name)]:[]);}
for (const file of [...files('src/screens'), ...files('src/components'), ...files('src/navigation')]) {
 if (/components[\\/]brand[\\/]|AppText\.js$/.test(file)) continue;
 let s=fs.readFileSync(file,'utf8');
 const ast=parser.parse(s,{sourceType:'module',plugins:['jsx']});
 const edits=[];
 function walk(n,parent) {
  if(!n || typeof n!=='object')return;
  if(n.type==='ObjectExpression') {
   const props=new Map(n.properties.filter(p=>p.type==='ObjectProperty' && !p.computed).map(p=>[p.key.name||p.key.value,p]));
   const size=props.get('fontSize');
   const name=parent?.type==='ObjectProperty' ? (parent.key.name||parent.key.value||'') : '';
   if(size?.value.type==='NumericLiteral' && !/icon|badge|logo|brand|avatar|stepNumber|stepIndex|marker|pinText|mapLabel/i.test(name)) {
    const family=props.get('fontFamily');
    if(family && !(family.value.type==='MemberExpression' && family.value.object.name==='typography'))return;
    let value=size.value.value;
    if(value<13)value=13;
    if(value>=30 && /title|heading|welcome/i.test(name) && !/amount|value|balance|price/i.test(name))value=28;
    else if(value>32)value=32;
    if(value<15 && /description|subtitle|message|paragraph|consent|body|notice|hint|explanation/i.test(name))value=15;
    if(!sizes.has(value))value=[13,14,15,16,18,20,24,28,32].reduce((a,b)=>Math.abs(b-value)<Math.abs(a-value)?b:a,13);
    edits.push([size.value.start,size.value.end,'typeScale.'+sizes.get(value)]);
    const leading=Math.round(value*(value>=24?1.25:1.45));
    const lh=props.get('lineHeight');
    if(lh?.value.type==='NumericLiteral')edits.push([lh.value.start,lh.value.end,String(leading)]);
    else if(!lh)edits.push([size.end,size.end,', lineHeight: '+leading]);
    const ls=props.get('letterSpacing');
    if(ls?.value.type==='UnaryExpression' && ls.value.argument?.type==='NumericLiteral' && ls.value.operator==='-' && ls.value.argument.value>0.6)edits.push([ls.value.start,ls.value.end,'-0.3']);
    if(ls?.value.type==='NumericLiteral' && ls.value.value>0.8)edits.push([ls.value.start,ls.value.end,'0.8']);
    if(family && value>=18 && /title|heading/i.test(name) && family.value.property.name==='bold')edits.push([family.value.start,family.value.end,'typography.semibold']);
    if(family && /button.*text|primaryButtonText|submitText/i.test(name) && family.value.property.name==='bold')edits.push([family.value.start,family.value.end,'typography.semibold']);
    objects++;
   }
  }
  for(const [key,v] of Object.entries(n))if(key!=='loc')if(Array.isArray(v))v.forEach(x=>walk(x,n));else if(v && typeof v==='object')walk(v,n);
 }
 walk(ast,null);
 if(!edits.length)continue;
 const imp=ast.program.body.find(n=>n.type==='ImportDeclaration' && /(?:^|\/)theme$/.test(n.source.value));
 if(imp) {
  if(!imp.specifiers.some(x=>x.imported?.name==='typeScale')) {
   const named=imp.specifiers.filter(x=>x.type==='ImportSpecifier');
   if(!named.length)throw Error('Unexpected theme import '+file);
   const last=named[named.length-1];
   edits.push([last.end,last.end,', typeScale']);
  }
 } else {
  const relative=path.relative(path.dirname(file),'src/theme').replace(/\\/g,'/');
  edits.push([0,0,"import { typeScale } from '"+(relative.startsWith('.')?relative:'./'+relative)+"';\n"]);
 }
 for(const [a,b,t] of edits.sort((a,b)=>b[0]-a[0]))s=s.slice(0,a)+t+s.slice(b);
 parser.parse(s,{sourceType:'module',plugins:['jsx']});
 fs.writeFileSync(file,s); changed++;
}
console.log(JSON.stringify({filesUpdated:changed,textStylesStandardized:objects}));
