const fs=require('node:fs');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const path=require('node:path');
const {transformSync}=require('@babel/core');
const copy=require('../src/i18n/legalCasesCopy.cjs');
const source=fs.readFileSync(path.join(__dirname,'../src/components/legal/TreatedCasesPanel.js'),'utf8');
const compiled=transformSync(source,{configFile:false,babelrc:false,plugins:['@babel/plugin-transform-modules-commonjs','@babel/plugin-transform-react-jsx']}).code;
async function renderFixture(response,fail=false){
 const states=[];let cursor=0,mounted=false;const effects=[];
 const React={createElement:(type,props,...children)=>({type,props:props||{},children}),useState:value=>{const i=cursor++;if(!(i in states))states[i]=value;return[states[i],value=>{states[i]=typeof value==='function'?value(states[i]):value;}];},useEffect:callback=>{if(!mounted)effects.push(callback);}};
 const module={exports:{}};
 vm.runInNewContext(compiled,{module,exports:module.exports,require:name=>{
  if(name==='react')return React;
  if(name==='react-native')return{View:'View',ActivityIndicator:'ActivityIndicator'};
  if(name==='../../services/legalService')return{legalService:{getTreatedCases:async()=>{if(fail)throw Error('Unavailable');return response;}}};
  if(name==='../../context/LanguageContext')return{useLanguage:()=>({language:'en'})};
  if(name==='../../i18n/legalCasesCopy.cjs')return copy;
  if(name==='../common/AppText')return'AppText';if(name==='../common/Button')return'Button';
  if(name==='../dashboard/DashboardKit')return{DashboardSection:'DashboardSection',MetricGrid:'MetricGrid',MetricCard:'MetricCard'};
  if(name==='../../theme')return{colors:{blue:'blue',white:'white'},radius:{md:16}};
  throw Error('Unexpected import '+name);
 }});
 const Component=module.exports.default;Component({});mounted=true;effects.forEach(effect=>effect());await new Promise(resolve=>setImmediate(resolve));cursor=0;return Component({});
}
function nodes(tree,type){if(!tree||typeof tree!=='object')return[];if(Array.isArray(tree))return tree.flatMap(item=>nodes(item,type));return[...(tree.type===type?[tree]:[]),...nodes(tree.children,type)];}
(async()=>{
 const tree=await renderFixture({success:true,data:{stats:{total_resolved:12,tenant_against_landlord:7,landlord_against_tenant:5},cases:[{id:1,direction:'tenant_landlord',state:'Lagos',resolved_at:'2026-09-20',email:'private@example.test',full_name:'PRIVATE NAME'}]}});
 assert.deepEqual(nodes(tree,'MetricCard').map(node=>node.props.value),['12','7','5']);assert.match(JSON.stringify(tree),/Lagos/);assert.doesNotMatch(JSON.stringify(tree),/private@example.test|PRIVATE NAME/);
 const empty=await renderFixture({data:{stats:{total_resolved:0},cases:[]}});assert.ok(JSON.stringify(empty).includes(copy.en.empty));
 const failure=await renderFixture(null,true);assert.ok(JSON.stringify(failure).includes(copy.en.error));assert.equal(nodes(failure,'MetricCard').length,0);assert.equal(nodes(failure,'Button').length,1);
 for(const locale of Object.keys(copy))assert.deepEqual(Object.keys(copy[locale]).sort(),Object.keys(copy.en).sort());
 console.log('Shared Android/iOS case panel: nested totals, case data, privacy, empty state, error state and eight locales passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
