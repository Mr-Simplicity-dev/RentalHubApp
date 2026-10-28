const fs=require('fs'),path=require('path'),parser=require('@babel/parser'),traverse=require('@babel/traverse').default;
const root=path.resolve('src');const navigation=path.join(root,'navigation/AppNavigator.js');
const parse=file=>parser.parse(fs.readFileSync(file,'utf8'),{sourceType:'module',plugins:['jsx']});
const ast=parse(navigation),imports=new Map(),functions=new Map();
traverse(ast,{ImportDeclaration(p){for(const x of p.node.specifiers)imports.set(x.local.name,p.node.source.value)},VariableDeclarator(p){if(p.node.id.type==='Identifier'&&['ArrowFunctionExpression','FunctionExpression'].includes(p.node.init?.type))functions.set(p.node.id.name,p.node.init)}});
const functionNames=new Set(),components=new Set();function collect(name){if(functionNames.has(name)||!functions.has(name))return;functionNames.add(name);traverse(functions.get(name),{noScope:true,JSXAttribute(p){if(p.node.name.name==='component'&&p.node.value?.expression?.type==='Identifier')components.add(p.node.value.expression.name)},CallExpression(p){if(p.node.callee.type==='Identifier')collect(p.node.callee.name)}})}
for(const name of ['GuestStack','MainTabs','TenantRoot','LandlordRoot','AgentRoot','LawyerRoot','MarketingAgentRoot','DesktopOnlyRoot'])collect(name);
function resolve(from,spec){if(!spec.startsWith('.'))return;const p=path.resolve(path.dirname(from),spec);for(const f of [p,p+'.js',p+'.jsx',p+'.cjs',path.join(p,'index.js')])if(fs.existsSync(f)&&fs.statSync(f).isFile())return f}
const files=new Set();const excluded=file=>/[/\\](admin|state-admin|finance-admin|support-admin|recruitment-admin)[/\\]/i.test(file)||/[/\\][^/\\]*(Admin|Impersonation)[^/\\]*\.(js|jsx)$/.test(file)||file.includes(path.sep+'i18n'+path.sep)||file===navigation;
function visit(file){if(!file||!file.startsWith(root)||excluded(file)||files.has(file)||!/[.]c?jsx?$/.test(file))return;files.add(file);traverse(parse(file),{ImportDeclaration(p){visit(resolve(file,p.node.source.value))},CallExpression(p){if(p.node.callee.name==='require'&&p.node.arguments[0]?.type==='StringLiteral')visit(resolve(file,p.node.arguments[0].value))}})}
for(const name of components)visit(resolve(navigation,imports.get(name)||''));
visit(path.join(root,'App.js'));
const used=new Map();
const adminOnlyText=text=>/administrator session|impersonat|super.admin session|signed-in super admin/i.test(text)||/^use\w+ must be|^[A-Z]+(?:_[A-Z]+)+$/.test(text);
function extract(ast,partial=false){traverse(ast,{noScope:partial,CallExpression(p){if(p.node.callee.name!=='ui')return;const arg=p.node.arguments[0];const value=arg?.type==='Identifier'&&!partial?p.scope.getBinding(arg.name)?.path.node.init:arg;if(value?.type==='StringLiteral'){const text=value.value;if(!adminOnlyText(text))used.set(text.replace(/\s+/g,' ').trim().toLowerCase(),text)}},NewExpression(p){if(p.node.callee.name==='Error'&&p.node.arguments[0]?.type==='StringLiteral'){const text=p.node.arguments[0].value;used.set(text.replace(/\s+/g,' ').trim().toLowerCase(),text)}}})}
for(const file of files)extract(parse(file));for(const name of functionNames)extract(functions.get(name),true);
for(const [key,text]of used)if(adminOnlyText(text))used.delete(key);
module.exports={files:[...files],used,navigationFunctions:[...functionNames]};
if(require.main===module)console.log(JSON.stringify({files:files.size,phrases:used.size,functions:[...functionNames]}));
