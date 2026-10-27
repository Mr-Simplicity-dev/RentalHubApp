const fs=require('fs'),path=require('path'),parser=require('@babel/parser'),traverse=require('@babel/traverse').default;
const dictionary=require('../src/i18n/interfaceCopy.json');
const normalize=s=>s.replace(/\s+/g,' ').trim().toLowerCase();
const keys=new Set(['title','subtitle','label','placeholder','accessibilityLabel','accessibilityHint','description','eyebrow','text1','text2','emptyTitle','emptyMessage','confirmText','cancelText','helperText']);
const isDisplayKey = key => keys.has(key) || /(?:title|label|hint|placeholder|description|message|eyebrow|buttonText|loadingText|helpText)$/i.test(key || '');
const files=[];function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(/\.jsx?$/.test(p))files.push(p)}}
for(const dir of ['src/screens','src/components','src/navigation','src/services','src/context','src/utils'])walk(dir);
let count=0,changed=0;
for(const file of files){
 let source=fs.readFileSync(file,'utf8');const existing=source.includes("interfaceRuntime.cjs");
 const ast=parser.parse(source,{sourceType:'module',plugins:['jsx']});const edits=[],seen=new Set();
 function replace(start,end,text){if(seen.has(start+':'+end))return;seen.add(start+':'+end);edits.push({start,end,text});count++;}
 function known(text){const key=normalize(text);return /[a-zA-Z]/.test(text)&&dictionary[key]&&dictionary[key].ar!==undefined&&!/^https?:|@|^(RentalHub|Amana)$/.test(text);}
 function displayContext(p){let current=p;while(current.parentPath){const parent=current.parentPath;
  if(parent.isConditionalExpression()&&parent.node.test===current.node)return false;
  if(parent.isBinaryExpression()&&parent.node.operator!=='+')return false;
  if(parent.isConditionalExpression()||parent.isLogicalExpression()||parent.isBinaryExpression()){current=parent;continue;}
  if(parent.isJSXExpressionContainer())return parent.parentPath.isJSXElement()||parent.parentPath.isJSXAttribute()&&isDisplayKey(parent.parentPath.node.name.name);
  if(parent.isJSXAttribute())return isDisplayKey(parent.node.name.name);
  if(parent.isReturnStatement()){const fn=parent.getFunctionParent();const name=fn?.node.id?.name||(fn?.parentPath.isVariableDeclarator()?fn.parentPath.node.id.name:'');return /^validate(Form|Step|Password|Email|Registration)?$/i.test(name||'');}
  if(parent.isTemplateLiteral()){current=parent;continue;}
  if(parent.isObjectProperty()&&/^value\d+$/.test(parent.node.key.name||'')&&parent.parentPath.parentPath.isCallExpression()&&parent.parentPath.parentPath.node.callee.name==='ui')return true;
  if(parent.isObjectProperty())return isDisplayKey(parent.node.key.name||parent.node.key.value) || (parent.node.key.name === 'text' && Boolean(parent.findParent(p => p.isCallExpression() && p.node.callee.object?.name === 'Alert' && p.node.callee.property?.name === 'alert')));
  if(parent.isCallExpression()){const c=parent.node.callee;return c.type==='MemberExpression'&&c.object.name==='Alert'&&c.property.name==='alert'&&parent.node.arguments.indexOf(current.node)<2||c.name==='getErrorMessage'&&parent.node.arguments.indexOf(current.node)===1;}
  return false;
 }return false;}
 traverse(ast,{
  JSXText(p){const value=p.node.value;const text=value.includes('\n')?value.replace(/\s+/g,' ').trim():value;if(!known(text))return;replace(p.node.start,p.node.end,'{ui('+JSON.stringify(text)+')}');},
  TemplateLiteral(p){if(!displayContext(p))return;const text=p.node.quasis.map((q,i)=>q.value.cooked+(i<p.node.expressions.length?'{value'+i+'}':'')).join('');if(!known(text))return;const vars=p.node.expressions.map((e,i)=>'value'+i+': ('+source.slice(e.start,e.end)+')').join(', ');replace(p.node.start,p.node.end,'ui('+JSON.stringify(text)+', {'+vars+'})');p.skip();},
  StringLiteral(p){if(p.parentPath.isObjectProperty()&&p.parentPath.node.key===p.node)return;if(!known(p.node.value)||!displayContext(p))return;const call='ui('+JSON.stringify(p.node.value)+')';const parent=p.parentPath;
   if(parent.isJSXAttribute())replace(p.node.start,p.node.end,'{'+call+'}');
   else if(parent.isObjectProperty()&&parent.node.value===p.node&&!parent.getFunctionParent())replace(parent.node.start,parent.node.end,'get '+JSON.stringify(parent.node.key.name||parent.node.key.value)+'() { return '+call+'; }');
   else replace(p.node.start,p.node.end,call);
  }
 });
 if(!edits.length)continue;
 let hooks=0;
 if(!existing) traverse(ast,{Function(p){const name=p.node.id?.name||(p.parentPath.isVariableDeclarator()?p.parentPath.node.id.name:null);const c=p.parentPath.isCallExpression()?p.parentPath.node.callee:null;const wrapped=c&&(c.name==='forwardRef'||c.name==='memo'||['forwardRef','memo'].includes(c.property?.name));if(!(/^[A-Z]/.test(name||'')||wrapped))return;
  let jsx=false;p.traverse({JSXElement(){jsx=true;},JSXFragment(){jsx=true;}});if(!jsx)return;
  if(p.node.body.type==='BlockStatement')edits.push({start:p.node.body.start+1,end:p.node.body.start+1,text:'\n  useInterfaceLanguage();'});
  else{edits.push({start:p.node.body.extra?.parenStart ?? p.node.body.start,end:p.node.body.start,text:'{ useInterfaceLanguage(); return ('});edits.push({start:p.node.body.end,end:p.node.end,text:'); }'});}
  hooks++;
 }});
 const rel=path.relative(path.dirname(file),'src/i18n').replace(/\\/g,'/');const prefix=rel.startsWith('.')?rel:'./'+rel;
 source=(existing?"":"import { translateUi as ui } from '"+prefix+"/interfaceRuntime.cjs';\n"+(hooks?"import useInterfaceLanguage from '"+prefix+"/useInterfaceLanguage';\n":''))+edits.sort((a,b)=>b.start-a.start||b.end-a.end).reduce((text,e)=>text.slice(0,e.start)+e.text+text.slice(e.end),source);
 try { parser.parse(source,{sourceType:'module',plugins:['jsx']}); } catch(error) { fs.writeFileSync('.codex-tmp/localize-failed.js',source);throw new Error(file+': '+error.message); }fs.writeFileSync(file,source);changed++;
}
console.log('Localized '+count+' interface literals across '+changed+' files.');
