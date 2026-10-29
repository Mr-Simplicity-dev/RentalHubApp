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
function providerHarness({nativeRTL=false,stored='en',failRead=false,failWrite=false,user=null}={}){
 const slots=[];let cursor=0,effects=[];const calls=[],writes=[];
 const react={...React,useContext:()=>({user}),useState(initial){const index=cursor++;if(!(index in slots))slots[index]=typeof initial==='function'?initial():initial;return[slots[index],value=>{slots[index]=typeof value==='function'?value(slots[index]):value;}];},useRef(initial){const [ref]=this.useState({current:initial});return ref;},useEffect(fn,deps){const index=cursor++,previous=slots[index];if(!previous||deps.some((value,i)=>value!==previous[i]))effects.push(fn);slots[index]=deps;},useMemo:fn=>fn(),useCallback:fn=>fn};
 react.useRef=initial=>{const index=cursor++;if(!(index in slots))slots[index]={current:initial};return slots[index];};
 const storage={getItem:async()=>{if(failRead)throw Error('read');return stored;},setItem:async(key,value)=>{await flush();if(failWrite)throw Error('write');stored=value;writes.push(value);}};
 const manager={isRTL:nativeRTL,allowRTL:value=>calls.push(['allowRTL',value]),forceRTL:value=>calls.push(['forceRTL',value]),swapLeftAndRightInRTL:value=>calls.push(['swap',value])};
 const module={exports:{}};vm.runInNewContext(compile('src/context/LanguageContext.js'),{exports:module.exports,module,require:name=>name.includes('AuthContext')?{AuthContext:{}}:name.includes('interfaceRuntime')?require('../src/i18n/interfaceRuntime.cjs'):name==='react'?react:name==='react-native'?{I18nManager:manager,View:'View'}:name.includes('async-storage')?{__esModule:true,default:storage}:catalog});
 const render=()=>{cursor=0;effects=[];const tree=module.exports.LanguageProvider({children:React.createElement('Form',{value:'preserved'})});effects.forEach(fn=>fn());return tree;};
 return{render,calls,writes,getStored:()=>stored};
}
const visit=(node,fn)=>{if(!node||typeof node!=='object')return;if(Array.isArray(node))return node.forEach(child=>visit(child,fn));if(!node.props)return;fn(node);visit(node.props.children,fn);};
function welcome(language,width=375,height=812,fontScale=1){
 const isRTL=language==='ar';const t=key=>catalog.UI_COPY[language]?.[key]||catalog.UI_COPY.en[key]||key;
 const native={Animated:{Value:class{constructor(value){this.value=value;}interpolate(){return this.value;}},View:'AnimatedView'},StyleSheet:{create:styles=>styles},useWindowDimensions:()=>({width,height,fontScale})};
 for(const name of ['Image','StatusBar','ScrollView','TouchableOpacity','View'])native[name]=name;
 const react={...React,useEffect:()=>{},useCallback:fn=>fn,useRef:value=>({current:value}),useState:value=>[value,()=>{}]};
 const routes=[],timers=[];
 const module={exports:{}};vm.runInNewContext(compile('src/screens/auth/WelcomeScreen.js'),{exports:module.exports,module,setTimeout:fn=>timers.push(fn),clearTimeout:()=>{},require:name=>{
  if(name.includes('useInterfaceLanguage'))return {__esModule:true,default:()=>{}};
  if(name.includes('interfaceRuntime'))return require('../src/i18n/interfaceRuntime.cjs');
  if(name==='react')return react;if(name==='react-native')return native;if(name==='react-native-safe-area-context')return{SafeAreaView:'SafeAreaView'};
  if(name.includes('LanguageContext'))return{useLanguage:()=>({isRTL,language,t,textAlign:isRTL?'right':'left'})};
  if(name.includes('recruitmentCopy'))return require('../src/i18n/recruitmentCopy.cjs');
  if(name==='../../theme')return{colors:{navy:'#071A3D',white:'#fff',gold:'#FFC928'},radius:{pill:999,md:16},shadows:{soft:{}},typography:{},typeScale:{}};
  return{__esModule:true,default:name};
 }});
 const tree=module.exports.default({navigation:{navigate(route){routes.push(route);}}});const nodes=[];visit(tree,node=>nodes.push(node));
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
 const scroll=nodes.find(node=>node.type==='ScrollView');
 const scrollNodes=[];visit(scroll,node=>scrollNodes.push(node));
 assert.ok(scrollNodes.includes(explore));assert.ok(scrollNodes.includes(careerButton));
 const languageNode=nodes.find(node=>node.props.fullWidth&&node.props.tone==='dark');
 assert.ok(scrollNodes.includes(languageNode));
 const languageRow=nodes.find(node=>node.props.children===languageNode);
 const gap=flatten(languageRow.props.style).marginBottom;
 assert.ok(gap>=24&&gap<=40);
 assert.equal(flatten(scroll.props.contentContainerStyle).flexGrow,undefined);
 assert.equal(flatten(scroll.props.contentContainerStyle).justifyContent,undefined);
 assert.equal(flatten(careerButton.props.style).flexDirection,width<360||fontScale>1.3?'column':'row');
 assert.equal(flatten(careerButton.props.style).borderWidth,1);
 assert.equal(flatten(careerButton.props.style).height,undefined);
 const login=nodes.find(node=>node.props.accessibilityLabel===t('welcome.signIn'));
 for(const [button,route]of [[explore,'Home'],[createButton,'Register'],[login,'Login'],[careerButton,'Careers']]){
  const count=routes.length;button.props.onPress();button.props.onPress();assert.equal(routes.length,count+1);assert.equal(routes.at(-1),route);timers.splice(0).forEach(fn=>fn());
 }
 return {rootDirection:flatten(tree.props.style).direction,exploreStyle:flatten(explore.props.style),hintStyles:hints.map(node=>{const {transform,...style}=flatten(node.props.style);return style;}),icons,careerMinHeight:flatten(careerButton.props.style).minHeight};
}
async function languageDropdown(){
 const changes=[],react={...React,useMemo:fn=>fn(),useState:value=>[value,()=>{}]};
 const native={StyleSheet:{create:value=>value}};
 for(const name of ['FlatList','Modal','Pressable','TouchableOpacity','View'])native[name]=name;
 const module={exports:{}};
 vm.runInNewContext(compile('src/components/common/LanguageDropdown.js'),{exports:module.exports,module,require:name=>{
  if(name==='react')return react;if(name==='react-native')return native;
  if(name.includes('useInterfaceLanguage'))return{__esModule:true,default:()=>{}};
  if(name.includes('interfaceRuntime'))return require('../src/i18n/interfaceRuntime.cjs');
  if(name.includes('LanguageContext'))return{useLanguage:()=>({language:'en',languages:catalog.SUPPORTED_LANGUAGES,setLanguage:async code=>changes.push(code),t:key=>catalog.UI_COPY.en[key]})};
  if(name==='../../theme')return{colors:{},radius:{},shadows:{soft:{}},typography:{},typeScale:{}};
  return{__esModule:true,default:name};
 }});
 const nodes=[];visit(module.exports.default({tone:'dark',fullWidth:true}),node=>nodes.push(node));
 const trigger=nodes.find(node=>node.props.accessibilityHint===catalog.UI_COPY.en['welcome.languageHelp']);
 assert.equal(flatten(trigger.props.style).paddingVertical,8);
 assert.equal(flatten(trigger.props.style).minHeight,56);
 assert.equal(trigger.props.accessibilityRole,'button');
 assert.equal(typeof trigger.props.onPress,'function');
 for(const name of ['language-outline','chevron-down'])assert.ok(nodes.some(node=>node.props.name===name));
 const list=nodes.find(node=>node.type==='FlatList');
 await list.props.renderItem({item:catalog.SUPPORTED_LANGUAGES.find(option=>option.code==='ar')}).props.onPress();
 assert.deepEqual(changes,['ar']);
}
(async()=>{
 await languageDropdown();
 for(const nativeRTL of [false,true]){
  const harness=providerHarness({nativeRTL});harness.render();await flush();let tree=harness.render();
  for(const language of ['ar','en',...catalog.SUPPORTED_LANGUAGES.map(item=>item.code),'ar','en']){
   const pending=tree.props.value.setLanguage(language);tree=harness.render();assert.equal(tree.props.value.language,language);assert.equal(tree.props.value.direction,'ltr');assert.equal(tree.props.value.textDirection,language==='ar'?'rtl':'ltr');assert.equal(tree.props.value.rtlRestartRequired,false);assert.equal(tree.props.children.props.style.direction,'ltr');assert.equal(tree.props.children.props.children.props.value,'preserved');assert.equal((await pending).restartRequired,false);tree=harness.render();
  }
  const pending=['ar','fr','en'].map(code=>tree.props.value.setLanguage(code));tree=harness.render();assert.equal(tree.props.value.language,'en');await Promise.all(pending);assert.equal(harness.getStored(),'en');assert.deepEqual(harness.calls,[['allowRTL',false],['forceRTL',false],['swap',false]]);
 }
 for(const options of [{failRead:true},{failWrite:true}]){const harness=providerHarness(options);harness.render();await flush();let tree=harness.render();await tree.props.value.setLanguage('ar');tree=harness.render();assert.equal(tree.props.value.language,'ar');}
 for(const role of ['admin','super_admin','state_support_admin','recruitment_admin']){const harness=providerHarness({stored:'yo',user:{user_type:role}});harness.render();await flush();let tree=harness.render();assert.equal(tree.props.value.language,'en');assert.equal(tree.props.value.languageSelectionEnabled,false);await tree.props.value.setLanguage('ha');tree=harness.render();assert.equal(tree.props.value.language,'en');assert.equal(harness.getStored(),'yo');}
 for(const [width,height] of [[320,568],[360,640],[375,812],[390,844],[412,915],[430,1000],[768,600]])for(const {code}of catalog.SUPPORTED_LANGUAGES)for(const fontScale of [1,1.5])welcome(code,width,height,fontScale);
 assert.equal(welcome('en',390,800).careerMinHeight,68);
 assert.equal(welcome('en',360,720).careerMinHeight,68);
 assert.equal(welcome('en',320,640).careerMinHeight,72);
 assert.equal(JSON.stringify(welcome('en')),JSON.stringify(welcome('ar')));assert.equal(JSON.stringify(welcome('ar')),JSON.stringify(welcome('en')));
 const android=fs.readFileSync(path.join(root,'android/app/src/main/java/com/rentalhubng/MainApplication.kt'),'utf8');const ios=fs.readFileSync(path.join(root,'ios/RentalHubMobile/AppDelegate.mm'),'utf8');
 assert.ok(android.indexOf('forceRTL(this@MainApplication, false)')<android.indexOf('SoLoader.init'));assert.ok(ios.indexOf('forceRTL:NO')<ios.indexOf('return [super application:'));
 console.log('Language round-trip behavior passed for all 8 locales with both old native direction states, rapid changes and storage failures.');
 console.log('Welcome Explore controls, arrow direction and yellow hint geometry stay unchanged while text translates. Native startup clears persisted mirroring before React loads.');
 console.log('Welcome compact flow verified at seven screen sizes and two font scales across eight locales; Home, Register, Login and Careers handlers and navigation debounce passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
