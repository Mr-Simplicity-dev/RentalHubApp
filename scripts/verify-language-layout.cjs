const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const React=require('react');
const {transformSync}=require('@babel/core');
const root=path.resolve(__dirname,'..');
const catalog=require('../src/i18n/catalog.cjs');
const compile=file=>transformSync(fs.readFileSync(path.join(root,file),'utf8'),{configFile:false,babelrc:false,plugins:['@babel/plugin-transform-modules-commonjs','@babel/plugin-transform-react-jsx']}).code;
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const flatten=style=>Array.isArray(style)?Object.assign({},...style.map(flatten)):style||{};
function providerHarness({nativeRTL=false,stored='en',failRead=false,failWrite=false}={}){
 const slots=[];let cursor=0,effects=[];const calls=[],writes=[];
 const react={...React,useState(initial){const index=cursor++;if(!(index in slots))slots[index]=typeof initial==='function'?initial():initial;return[slots[index],value=>{slots[index]=typeof value==='function'?value(slots[index]):value;}];},useRef(initial){const [ref]=this.useState({current:initial});return ref;},useEffect(fn,deps){const index=cursor++,previous=slots[index];if(!previous||deps.some((value,i)=>value!==previous[i]))effects.push(fn);slots[index]=deps;},useMemo:fn=>fn(),useCallback:fn=>fn};
 react.useRef=initial=>{const index=cursor++;if(!(index in slots))slots[index]={current:initial};return slots[index];};
 const storage={getItem:async()=>{if(failRead)throw Error('read');return stored;},setItem:async(key,value)=>{await flush();if(failWrite)throw Error('write');stored=value;writes.push(value);}};
 const manager={isRTL:nativeRTL,allowRTL:value=>calls.push(['allowRTL',value]),forceRTL:value=>calls.push(['forceRTL',value]),swapLeftAndRightInRTL:value=>calls.push(['swap',value])};
 const module={exports:{}};vm.runInNewContext(compile('src/context/LanguageContext.js'),{exports:module.exports,module,require:name=>name.includes('interfaceRuntime')?require('../src/i18n/interfaceRuntime.cjs'):name==='react'?react:name==='react-native'?{I18nManager:manager,View:'View'}:name.includes('async-storage')?{__esModule:true,default:storage}:catalog});
 const render=()=>{cursor=0;effects=[];const tree=module.exports.LanguageProvider({children:React.createElement('Form',{value:'preserved'})});effects.forEach(fn=>fn());return tree;};
 return{render,calls,writes,getStored:()=>stored};
}
const visit=(node,fn)=>{if(!node||typeof node!=='object')return;if(Array.isArray(node))return node.forEach(child=>visit(child,fn));if(!node.props)return;fn(node);visit(node.props.children,fn);};
function welcome(language,width=375,height=812){
 const isRTL=language==='ar';const t=key=>catalog.UI_COPY[language]?.[key]||catalog.UI_COPY.en[key]||key;
 const native={Animated:{Value:class{constructor(value){this.value=value;}interpolate(){return this.value;}},View:'AnimatedView'},StyleSheet:{create:styles=>styles},useWindowDimensions:()=>({width,height})};
 for(const name of ['Image','StatusBar','ScrollView','TouchableOpacity','View'])native[name]=name;
 const react={...React,useEffect:()=>{},useCallback:fn=>fn,useRef:value=>({current:value}),useState:value=>[value,()=>{}]};
 const module={exports:{}};vm.runInNewContext(compile('src/screens/auth/WelcomeScreen.js'),{exports:module.exports,module,setTimeout,clearTimeout,require:name=>{
  if(name.includes('useInterfaceLanguage'))return {__esModule:true,default:()=>{}};
  if(name.includes('interfaceRuntime'))return require('../src/i18n/interfaceRuntime.cjs');
  if(name==='react')return react;if(name==='react-native')return native;if(name==='react-native-safe-area-context')return{SafeAreaView:'SafeAreaView'};
  if(name.includes('LanguageContext'))return{useLanguage:()=>({isRTL,language,t,textAlign:isRTL?'right':'left'})};
  if(name.includes('recruitmentCopy'))return require('../src/i18n/recruitmentCopy.cjs');
  if(name==='../../theme')return{colors:{navy:'#071A3D',white:'#fff',gold:'#FFC928'},radius:{pill:999,md:16},shadows:{soft:{}},typography:{},typeScale:{}};
  return{__esModule:true,default:name};
 }});
 const tree=module.exports.default({navigation:{navigate(){}}});const nodes=[];visit(tree,node=>nodes.push(node));
 const explore=nodes.find(node=>node.props.accessibilityLabel===t('welcome.explore'));
 const hints=nodes.filter(node=>flatten(node.props.style).backgroundColor==='#FFC928');
 const icons=nodes.filter(node=>node.props.name).map(node=>node.props.name);
 assert.ok(icons.includes('arrow-up'));assert.equal(icons.filter(name=>name==='arrow-forward').length,2);assert.ok(!icons.includes('arrow-back'));
 const copy=require('../src/i18n/recruitmentCopy.cjs')[language];
 const title=nodes.find(node=>node.props.children===t('welcome.title'));
 const create=nodes.find(node=>node.props.children===t('welcome.createAccount'));
 const careerTitle=nodes.find(node=>node.props.children===copy.opportunities_title);
 const apply=nodes.find(node=>node.props.children===copy.apply);
 for(const node of [title,create,careerTitle,apply])assert.equal(flatten(node.props.style).textAlign,'center');
 const createButton=nodes.find(node=>node.props.accessibilityLabel===t('welcome.createAccount'));
 const careerButton=nodes.find(node=>node.props.accessibilityLabel===copy.opportunities_title+'. '+copy.apply);
 assert.equal(flatten(createButton.props.style).justifyContent,'center');
 assert.equal(flatten(createButton.props.style).minHeight,58);
 assert.equal(flatten(tree.props.style).direction,'ltr');
 assert.equal(flatten(explore.props.style).flexDirection,'row');
 assert.ok(nodes.some(node=>node.props.children===t('welcome.exploreHint')));
 return {rootDirection:flatten(tree.props.style).direction,exploreStyle:flatten(explore.props.style),hintStyles:hints.map(node=>{const {transform,...style}=flatten(node.props.style);return style;}),icons,careerMinHeight:flatten(careerButton.props.style).minHeight};
}
(async()=>{
 for(const nativeRTL of [false,true]){
  const harness=providerHarness({nativeRTL});harness.render();await flush();let tree=harness.render();
  for(const language of ['ar','en',...catalog.SUPPORTED_LANGUAGES.map(item=>item.code),'ar','en']){
   const pending=tree.props.value.setLanguage(language);tree=harness.render();assert.equal(tree.props.value.language,language);assert.equal(tree.props.value.direction,'ltr');assert.equal(tree.props.value.textDirection,language==='ar'?'rtl':'ltr');assert.equal(tree.props.value.rtlRestartRequired,false);assert.equal(tree.props.children.props.style.direction,'ltr');assert.equal(tree.props.children.props.children.props.value,'preserved');assert.equal((await pending).restartRequired,false);tree=harness.render();
  }
  const pending=['ar','fr','en'].map(code=>tree.props.value.setLanguage(code));tree=harness.render();assert.equal(tree.props.value.language,'en');await Promise.all(pending);assert.equal(harness.getStored(),'en');assert.deepEqual(harness.calls,[['allowRTL',false],['forceRTL',false],['swap',false]]);
 }
 for(const options of [{failRead:true},{failWrite:true}]){const harness=providerHarness(options);harness.render();await flush();let tree=harness.render();await tree.props.value.setLanguage('ar');tree=harness.render();assert.equal(tree.props.value.language,'ar');}
 for(const width of [320,375,390,768])for(const {code}of catalog.SUPPORTED_LANGUAGES)welcome(code,width);
 assert.equal(welcome('en',390,800).careerMinHeight,92);
 assert.equal(welcome('en',360,720).careerMinHeight,82);
 assert.equal(welcome('en',320,640).careerMinHeight,74);
 assert.equal(JSON.stringify(welcome('en')),JSON.stringify(welcome('ar')));assert.equal(JSON.stringify(welcome('ar')),JSON.stringify(welcome('en')));
 const android=fs.readFileSync(path.join(root,'android/app/src/main/java/com/rentalhubng/MainApplication.kt'),'utf8');const ios=fs.readFileSync(path.join(root,'ios/RentalHubMobile/AppDelegate.mm'),'utf8');
 assert.ok(android.indexOf('forceRTL(this@MainApplication, false)')<android.indexOf('SoLoader.init'));assert.ok(ios.indexOf('forceRTL:NO')<ios.indexOf('return [super application:'));
 console.log('Language round-trip behavior passed for all 8 locales with both old native direction states, rapid changes and storage failures.');
 console.log('Welcome Explore controls, arrow direction and yellow hint geometry stay unchanged while text translates. Native startup clears persisted mirroring before React loads.');
})().catch(error=>{console.error(error);process.exitCode=1;});
