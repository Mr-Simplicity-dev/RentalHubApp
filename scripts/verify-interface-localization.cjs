const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const parser=require('@babel/parser'),traverse=require('@babel/traverse').default;
const copy=require('../src/i18n/interfaceCopy.json');
const locales=process.argv.includes('--arabic') ? ['en','ar'] : ['en','fr','ar','ru','zh','ha','yo','ig'];
const files=[];function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory()){if(!p.includes('i18n'))walk(p);}else if(/\.js$/.test(p))files.push(p);}}walk('src');
let uses=0;const checked=new Set();
for(const file of files){traverse(parser.parse(fs.readFileSync(file,'utf8'),{sourceType:'module',plugins:['jsx']}),{CallExpression(p){if(p.node.callee.name!=='ui')return;
 assert.ok(!(p.parentPath.isBinaryExpression()&&p.parentPath.node.operator!=='+'),file+' translates a comparison value');
 if(p.parentPath.isObjectProperty()&&p.parentPath.node.value===p.node)assert.ok(!['user_type','status','payment_status','payment_method','role','route','value','action','type'].includes(p.parentPath.node.key.name),file+' translates an internal value');
 if(p.parentPath.isCallExpression()){const c=p.parentPath.node.callee;assert.ok(!(c.type==='MemberExpression'&&['navigate','replace','get','post','patch','delete'].includes(c.property.name)&&p.parentPath.node.arguments[0]===p.node),file+' translates a route or API path');}
 if(p.node.arguments[0]?.type!=='StringLiteral')return;uses++;const text=p.node.arguments[0].value,key=text.replace(/\s+/g,' ').trim().toLowerCase();checked.add(key);
 for(const locale of locales){assert.equal(typeof copy[key]?.[locale],'string',locale+' missing '+text);assert.ok(copy[key][locale].trim(),locale+' empty '+text);const placeholders=s=>(s.match(/\{value\d+\}|\{count\}/g)||[]).sort().join('|');assert.equal(placeholders(copy[key][locale]),placeholders(text),locale+' changed placeholders for '+text);}
}});}
const runtime=require('../src/i18n/interfaceRuntime.cjs');runtime.setInterfaceLanguage('ar');assert.equal(runtime.translateUi(' Password '),' كلمة المرور ');assert.equal(runtime.translateUi('Customer_Name_123'),'Customer_Name_123');runtime.setInterfaceLanguage('en');
console.log(uses+' translated UI calls, '+checked.size+' unique phrases: requested locales present; placeholders, internal enums and API/navigation paths preserved.');
