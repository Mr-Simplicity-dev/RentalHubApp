const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const {createRequire}=require('node:module'),clientRequire=createRequire(path.resolve(__dirname,'../../client/package.json'));
const {JSDOM}=clientRequire('jsdom'),dom=new JSDOM('<html><body></body></html>');global.window=dom.window;global.document=dom.window.document;global.IS_REACT_ACT_ENVIRONMENT=true;
const React=require('react'),{createRoot}=require('react-dom/client');
const guide='For calls while your phone is locked, allow notifications and background use for RentalHub. Allow Auto-start if your phone has it.';
const warning='Lock-screen call permission is off. Use the button below to allow it.';
async function fixture({permission=false,hasNativeProbe=true}={}){
 const state={permission,actions:[],removed:0},host=document.createElement('div'),root=createRoot(host);let resume;
 const text=({children})=>React.createElement('span',null,children),view=({children})=>React.createElement('div',null,children),button=({children,onPress})=>React.createElement('button',{onClick:onPress},children);
 const native={openCallSettings:()=>state.actions.push('lock-screen')};if(hasNativeProbe)native.canUseFullScreen=async()=>state.permission;
 const mocks={react:React,'react-native':{View:view,TouchableOpacity:button,Switch:()=>null,NativeModules:{RentalHubIncomingCalls:native},Platform:{OS:'android'},AppState:{addEventListener:(_,fn)=>{resume=fn;return{remove:()=>state.removed++};}},Linking:{openSettings:async()=>state.actions.push('phone-settings')}},'../common/AppText':text,'../../services/callSoundService':{loadCallSounds:async()=>({policy:{enabled:true,greetingEnabled:true},preference:'normal',isWorker:false}),playCallSound:async()=>({stop(){}})},'../../i18n/interfaceRuntime.cjs':{translateUi:value=>value},'../../i18n/useInterfaceLanguage':()=>{}};
 const module={exports:{}};const code=require('@babel/core').transformSync(fs.readFileSync('src/components/calls/CallSoundSettings.js','utf8'),{configFile:false,babelrc:false,plugins:['@babel/plugin-transform-react-jsx','@babel/plugin-transform-modules-commonjs']}).code;
 vm.runInNewContext(code,{module,exports:module.exports,require:name=>{if(!(name in mocks))throw Error(name);return mocks[name];},setTimeout,clearTimeout,Promise});
 await React.act(async()=>root.render(React.createElement(module.exports.default)));
 return{state,host,resume:async()=>React.act(async()=>resume('active')),click:async label=>React.act(async()=>{const b=[...host.querySelectorAll('button')].find(x=>x.textContent===label);assert.ok(b,label);b.dispatchEvent(new window.MouseEvent('click',{bubbles:true}));}),close:async()=>React.act(async()=>root.unmount())};
}
test('customer call settings show missing lock-screen access and provide both phone controls',async()=>{
 const f=await fixture();try{assert.ok(f.host.textContent.includes(guide));assert.ok(f.host.textContent.includes(warning));assert.ok(!f.host.textContent.includes('Allow incoming call sounds'));await f.click('Open phone settings');await f.click('Allow incoming calls on the lock screen');assert.deepEqual(f.state.actions,['phone-settings','lock-screen']);f.state.permission=true;await f.resume();assert.ok(!f.host.textContent.includes(warning));}finally{await f.close();}assert.equal(f.state.removed,1);
});
test('call settings stay usable when an older native build has no permission probe',async()=>{const f=await fixture({hasNativeProbe:false});try{assert.ok(f.host.textContent.includes('Normal ringtone'));assert.ok(!f.host.textContent.includes(warning));}finally{await f.close();}});
test('new call setup guidance is available in every supported interface language',()=>{const runtime=require('../src/i18n/interfaceRuntime.cjs');try{for(const language of ['fr','ar','ru','zh','ha','yo','ig']){runtime.setInterfaceLanguage(language);for(const line of [guide,warning,'Open phone settings','Could not open phone settings.'])assert.notEqual(runtime.translateUi(line),line,language+': '+line);}}finally{runtime.setInterfaceLanguage('en');}});
