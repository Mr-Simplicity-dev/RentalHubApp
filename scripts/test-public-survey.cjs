const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs'),vm=require('vm'),path=require('path');
const {transformSync}=require('@babel/core');
const source=fs.readFileSync(path.join(__dirname,'../src/screens/shared/PublicSurveyScreen.js'),'utf8');
const code=transformSync(source,{configFile:false,babelrc:false,plugins:['@babel/plugin-transform-modules-commonjs','@babel/plugin-transform-react-jsx']}).code;
const flush=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};
function mount(){
 const hooks=[],effects=[],timers=new Map(),saves=[];let cursor=0,count,tree,seq=0;
 const slot=initial=>{const i=cursor++;return hooks[i]||(hooks[i]={value:typeof initial==='function'?initial():initial});};
 const react={useState:init=>{const h=slot(init);return[h.value,v=>{h.value=typeof v==='function'?v(h.value):v;}];},useRef:init=>slot(()=>({current:init})).value,useMemo:fn=>{slot(null);return fn();},useCallback:(fn,deps)=>{const h=slot(()=>({}));if(!h.value.deps||deps.some((v,i)=>v!==h.value.deps[i]))h.value={deps,fn};return h.value.fn;},useEffect:(fn,deps)=>{const h=slot(()=>({}));if(!h.value.deps||deps.some((v,i)=>v!==h.value.deps[i])){effects.push(()=>{h.value.cleanup?.();h.value.cleanup=fn();});h.value.deps=deps;}},createElement:(type,props,...children)=>({type,props:props||{},children:children.flat(Infinity)})};
 const service={publicFlags:async()=>({data:{survey_public_enabled:true}}),publicGate:async()=>({success:true}),getDefinition:async()=>({data:{questions:[{key:'T1',type:'text',prompt:'A question'}]}}),publicDraft:async p=>{saves.push(p);return{data:{resume_token:'a'.repeat(32)}};}};
 const module={exports:{}};
 vm.runInNewContext(code,{module,exports:module.exports,Date,Promise,setTimeout:fn=>{timers.set(++seq,fn);return seq;},clearTimeout:id=>timers.delete(id),require:n=>{
  if(n==='react')return react;
  if(n==='react-native')return{StyleSheet:{create:s=>s},ScrollView:'ScrollView',View:'View',TouchableOpacity:'Option'};
  if(n.includes('surveyDraftStorage'))return{surveyDraftStorage:{get:async()=>'',save:async()=>{},clear:async()=>{}}};
  if(n.includes('surveyService'))return{surveyService:service};
  if(n.includes('propertyService'))return{propertyService:{getLocationOptions:async()=>[]}};
  if(n.includes('useInterfaceLanguage'))return()=> 'en';
  if(n.includes('interfaceRuntime'))return{translateUi:s=>s};
  if(n.includes('/http'))return{getErrorMessage:(e,f)=>e.message||f,pickList:()=>[]};
  if(n.includes('/theme'))return{colors:{},radius:{},typography:{},typeScale:{}};
  if(n.includes('PremiumLayout'))return Object.fromEntries(['PremiumButton','PremiumCard','PremiumCenter','PremiumHero','StatusPill'].map(k=>[k,k]));
  if(n.includes('toast'))return{__esModule:true,default:{show(){}}};
  return n.endsWith('Input')?'Input':n.endsWith('TurnstileWidget')?'Turnstile':'Text';
 }});
 function render(){cursor=0;tree=module.exports.default({navigation:{goBack(){}}});if(count!==undefined)assert.equal(cursor,count,'Hooks must stay in the same order on every survey step');count=cursor;for(const effect of effects.splice(0))effect();return tree;}
 function nodes(){const all=[];function visit(n){if(!n||typeof n!=='object')return;all.push(n);for(const child of n.children||[])visit(child);}visit(tree);return all;}
 return{render,nodes,timers,saves};
}
test('public survey keeps hook order and saves the entered contact and origin with a draft',async()=>{
 const f=mount();f.render();await flush();f.render();
 await f.nodes().find(n=>n.type==='Turnstile').props.onToken('security-token');f.render();await flush();f.render();
 for(const [label,value] of Object.entries({'Full name':'Example person',Phone:'08030000001',Email:'person@example.test','Where do you live?':'Lokoja','State of origin':'Kogi'})){
  f.nodes().find(n=>n.type==='Input'&&n.props.label===label).props.onChangeText(value);f.render();
 }
 await f.nodes().find(n=>n.type==='PremiumButton'&&n.props.title==='Start survey').props.onPress();await flush();f.render();
 for(const timer of [...f.timers.values()])timer();await flush();
 assert.equal(f.saves.length,1);assert.equal(f.saves[0].contact.name,'Example person');assert.equal(f.saves[0].contact.location,'Lokoja');assert.equal(f.saves[0].contact.state_of_origin,'Kogi');
});
