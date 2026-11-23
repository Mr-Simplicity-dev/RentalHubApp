const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm'),babel=require('@babel/core');
const client=path.resolve(__dirname,'../../client');
const {JSDOM}=require(path.join(client,'node_modules/jsdom'));
test('survey names open only the chosen respondent, show answers and can be collapsed',async()=>{
  const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'https://example.invalid'});
  const saved=new Map();for(const key of ['window','document','navigator','HTMLElement','IS_REACT_ACT_ENVIRONMENT']){saved.set(key,Object.getOwnPropertyDescriptor(global,key));Object.defineProperty(global,key,{value:key==='IS_REACT_ACT_ENVIRONMENT'?true:dom.window[key],configurable:true,writable:true});}
  const React=require(path.join(client,'node_modules/react')), {createRoot}=require(path.join(client,'node_modules/react-dom/client'));
  const host=tag=>({children})=>React.createElement(tag,null,children);
  const records=[{id:1,respondent_name:'Alice Example',respondent_code:'A1',respondent_phone:'08010000001',answers:{q:'one'},answer_details:[{key:'q',question:'Alice question',answer:'Alice answer'}]},{id:2,respondent_name:'Bob Example',respondent_code:'B2',respondent_phone:'08010000002',answers:{q:'two'},answer_details:[{key:'q',question:'Bob question',answer:'Bob answer'}]}];
  const module={exports:{}};
  const code=babel.transformSync(fs.readFileSync(path.join(__dirname,'../src/screens/shared/SurveyAnalyticsScreen.js'),'utf8'),{configFile:false,babelrc:false,presets:[['@babel/preset-react',{runtime:'classic'}]],plugins:['@babel/plugin-transform-modules-commonjs']}).code;
  const mocks={react:React,'react-native':{View:host('div'),ScrollView:host('div'),TouchableOpacity:({children,onPress})=>React.createElement('button',{onClick:onPress},children),StyleSheet:{create:x=>x}},'react-native-toast-message':{show(){}},'@react-navigation/native':{useFocusEffect:fn=>React.useEffect(fn,[fn])}};
  vm.runInNewContext(code,{module,exports:module.exports,require:name=>{
    if(mocks[name])return mocks[name];
    if(name.includes('interfaceRuntime'))return {translateUi:x=>x};
    if(name.includes('useInterfaceLanguage'))return ()=> 'en';
    if(name.includes('surveyAnalyticsService'))return {surveyAnalyticsService:{getAnalysis:async()=>({success:true,data:{meta:{total:2,completed:0},open_answers:[]}}),getResponses:async()=>({data:{responses:records,total:2}})}};
    if(name.includes('PremiumLayout'))return {PremiumCard:host('section'),PremiumCenter:()=>null,PremiumHero:()=>null,PremiumButton:({title,onPress,disabled})=>React.createElement('button',{onClick:onPress,disabled},title),InfoRow:({label,value})=>React.createElement('p',null,label+': '+value)};
    if(name.includes('AppText'))return host('span');if(name.includes('/theme'))return {colors:{},radius:{},typography:{},typeScale:{}};
    if(name.includes('/utils/http'))return {getErrorMessage:e=>e.message};if(name.includes('/utils/display'))return {formatDisplayValue:v=>String(v??'')};
    throw Error('Unexpected dependency '+name);
  }});
  const container=document.createElement('div');document.body.append(container);const root=createRoot(container);
  const click=async name=>{const button=[...container.querySelectorAll('button')].find(node=>node.textContent.includes(name));assert.ok(button);await React.act(async()=>button.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};
  try{
    await React.act(async()=>{root.render(React.createElement(module.exports.default));});
    assert.ok(container.textContent.includes('Alice Example'));assert.ok(container.textContent.includes('Bob Example'));
    assert.equal(container.textContent.includes('08010000001'),false);assert.equal(container.textContent.includes('Alice answer'),false);
    await click('Alice Example');assert.ok(container.textContent.includes('Alice answer'));assert.ok(container.textContent.includes('08010000001'));assert.equal(container.textContent.includes('Bob answer'),false);
    await click('Bob Example');assert.equal(container.textContent.includes('Alice answer'),false);assert.ok(container.textContent.includes('Bob answer'));
    await click('Bob Example');assert.equal(container.textContent.includes('Bob answer'),false);
  }finally{await React.act(async()=>root.unmount());dom.window.close();for(const[key,descriptor]of saved){if(descriptor)Object.defineProperty(global,key,descriptor);else delete global[key];}}
});
