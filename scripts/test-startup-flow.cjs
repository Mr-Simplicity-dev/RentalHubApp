const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs'),path=require('path'),vm=require('vm');
const {transformSync}=require('@babel/core');
const React=require('react');
const compile=file=>transformSync(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),{configFile:false,babelrc:false,plugins:['@babel/plugin-transform-modules-commonjs','@babel/plugin-transform-react-jsx']}).code;
function startup(loading){
 let fontsReady=true; let auth={loading,isAuthenticated:false,user:null},cursor=0,now=0,seq=0;const slots=[],effects=[],timers=new Map(),events=[];
 const slot=initial=>{const i=cursor++;return slots[i]||(slots[i]={value:typeof initial==='function'?initial():initial});};
 const react={...React,useContext:()=>auth,useState:initial=>{const s=slot(initial);return[s.value,v=>{s.value=typeof v==='function'?v(s.value):v;}];},useEffect:(fn,deps)=>{const s=slot(()=>({}));if(!s.value.deps||deps.some((v,i)=>v!==s.value.deps[i])){effects.push(()=>{s.value.cleanup?.();s.value.cleanup=fn();});s.value.deps=deps;}}};
 const module={exports:{}};
 vm.runInNewContext(compile('src/App.js'),{module,exports:module.exports,setTimeout:(fn,ms)=>{timers.set(++seq,{fn,at:now+ms});return seq;},clearTimeout:id=>timers.delete(id),require:name=>{
  if(name==='react')return react;
  if(name==='react-native')return{StatusBar:'StatusBar'};
  if(name==='expo-font')return{useFonts:()=>[fontsReady,null]};
  if(name.includes('AuthContext'))return{AuthContext:{},AuthProvider:'AuthProvider'};
  if(name.includes('mobileDiagnosticsService'))return{trackMobileEvent:name=>events.push(name)};
  if(name.includes('appUpdateService'))return{checkForAppUpdate:async()=>events.push('update-check')};
  if(name.includes('offlineActionQueueService'))return{hydrateOfflineQueue:async()=>{},flushOfflineQueue:async()=>{}};
  if(name.includes('networkStatusService'))return{subscribeNetworkStatus:()=>()=>{}};
  return{__esModule:true,default:name};
 }});
 const render=()=>{cursor=0;const tree=module.exports.AppContent({fontsReady});for(const fn of effects.splice(0))fn();return tree;};
 const advance=ms=>{now+=ms;for(const [id,timer]of [...timers])if(timer.at<=now){timers.delete(id);timer.fn();}};
 const contains=(tree,name)=>{if(!tree||typeof tree!=='object')return false;if(tree.type?.name===name||String(tree.type).includes(name))return true;return React.Children.toArray(tree.props?.children).some(child=>contains(child,name));};
 return{render,renderRoot:()=>module.exports.default(),setFontsReady:ready=>{fontsReady=ready;},advance,contains,events,setAuth:next=>{auth={...auth,...next};},unmount:()=>slots.forEach(s=>s.value?.cleanup?.())};
}
test('one short splash leads straight to navigation and does not restart on sign-in',()=>{
 const f=startup(false);assert.ok(f.contains(f.render(),'BrandSplash'));f.advance(3199);assert.ok(f.contains(f.render(),'BrandSplash'));f.advance(1);assert.ok(f.contains(f.render(),'AppNavigator'));
 f.setAuth({isAuthenticated:true,user:{id:1,user_type:'tenant'}});assert.ok(f.contains(f.render(),'AppNavigator'));assert.equal(f.events.filter(e=>e==='app_opened').length,1);assert.equal(f.events.filter(e=>e==='update-check').length,1);f.unmount();
});
test('slow session restoration keeps the same splash and never flashes a guest screen',()=>{
 const f=startup(true);assert.ok(f.contains(f.render(),'BrandSplash'));f.advance(10000);assert.ok(f.contains(f.render(),'BrandSplash'));f.setAuth({loading:false,isAuthenticated:true,user:{id:1}});assert.ok(f.contains(f.render(),'AppNavigator'));f.unmount();
});
test('font loading shows the brand immediately and preserves its full reading time',()=>{
 const f=startup(false);f.setFontsReady(false);
 assert.ok(f.contains(f.renderRoot(),'AppContent'));
 assert.ok(f.contains(f.render(),'BrandSplash'));
 f.advance(10000);assert.ok(f.contains(f.render(),'BrandSplash'));
 f.setFontsReady(true);assert.ok(f.contains(f.render(),'BrandSplash'));
 f.advance(3199);assert.ok(f.contains(f.render(),'BrandSplash'));
 f.advance(1);assert.ok(f.contains(f.render(),'AppNavigator'));f.unmount();
});
test('Android 12 inherits the branded window background during React startup',()=>{
 const base=fs.readFileSync(path.join(__dirname,'../android/app/src/main/res/values/styles.xml'),'utf8');
 const android12=fs.readFileSync(path.join(__dirname,'../android/app/src/main/res/values-v31/styles.xml'),'utf8');
 assert.match(base, /android:windowBackground">@drawable\/launch_screen/);
 assert.ok(!android12.includes('name="AppTheme"'));
 assert.match(android12, /parent="LaunchThemeBase"/);
 assert.match(android12, /android:windowSplashScreenBrandingImage/);
 const splash=fs.readFileSync(path.join(__dirname,'../src/components/brand/BrandSplash.js'),'utf8');
 assert.ok(!splash.includes('copyOpacity'));
});
test('native screen restoration is configured before React starts, with no second navigator splash',()=>{
 const activity=fs.readFileSync(path.join(__dirname,'../android/app/src/main/java/com/rentalhubng/MainActivity.kt'),'utf8');
 assert.ok(activity.indexOf('supportFragmentManager.fragmentFactory = RNScreensFragmentFactory()')<activity.indexOf('super.onCreate(savedInstanceState)'));
 assert.ok(!activity.includes('setKeepOnScreenCondition'));
 const navigation=fs.readFileSync(path.join(__dirname,'../src/navigation/AppNavigator.js'),'utf8');assert.ok(!navigation.includes('BrandSplash'));assert.ok(!navigation.includes('flashHeld'));
});
function updateService(request){
 const module={exports:{}};vm.runInNewContext(compile('src/services/appUpdateService.js'),{module,exports:module.exports,Date,URL,require:name=>{
  if(name==='react-native')return{Platform:{OS:'android'},NativeModules:{RentalHubUpdate:{cancelUpdateNotification:async()=>true}}};
  if(name.includes('mobileDiagnosticsService'))return{checkMobileAppVersion:request,trackMobileEvent(){}};
  if(name==='./api')return{API_ORIGIN:'https://rentalhub.com.ng'};
  if(name.includes('interfaceRuntime'))return{translateUi:s=>s};
  throw Error(name);
 }});return module.exports;
}
test('startup and Welcome share one version check instead of requesting it twice',async()=>{
 let calls=0,finish;const service=updateService(()=>{calls++;return new Promise(resolve=>{finish=resolve;});});const first=service.checkForAppUpdate(),second=service.checkForAppUpdate();assert.equal(calls,1);finish({data:{update_available:true,latest_version:'1.0.69'}});assert.equal((await first).latest_version,'1.0.69');assert.equal((await second).latest_version,'1.0.69');await service.checkForAppUpdate();assert.equal(calls,1);const refresh=service.checkForAppUpdate({force:true});assert.equal(calls,2);finish({data:{update_available:true,latest_version:'1.0.70'}});assert.equal((await refresh).latest_version,'1.0.70');
});
test('a failed version check can retry and never blocks startup',async()=>{
 let calls=0;const service=updateService(async()=>{if(++calls===1)throw Error('Offline');return{data:{update_available:false}};});await assert.rejects(service.checkForAppUpdate(),/Offline/);assert.equal((await service.checkForAppUpdate()).update_available,false);assert.equal(calls,2);
});

test('Android back navigation removes its listener using the supported subscription API',()=>{const parser=require('@babel/parser'),traverse=require('@babel/traverse').default;const source=fs.readFileSync(path.join(__dirname,'../src/navigation/AppNavigator.js'),'utf8');let effect;traverse(parser.parse(source,{sourceType:'module',plugins:['jsx']}),{CallExpression(p){if(p.node.callee.name==='useEffect'&&source.slice(p.node.arguments[0].start,p.node.arguments[0].end).includes('const onBackPress'))effect=source.slice(p.node.arguments[0].start,p.node.arguments[0].end);}});assert.ok(effect);let handler,ready=false,back=0,removed=false;const cleanup=vm.runInNewContext('('+effect+')()',{BackHandler:{addEventListener:(_,fn)=>{handler=fn;return{remove:()=>{removed=true;}};}},navigationRef:{isReady:()=>ready,canGoBack:()=>true,goBack:()=>back++}});assert.equal(handler(),false);ready=true;assert.equal(handler(),true);assert.equal(back,1);cleanup();assert.equal(removed,true);});
