const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs');
const {createCallSoundSession,ringingExpiry}=require('../src/utils/callSoundSession.cjs');
const policy={enabled:true,greetingEnabled:true,ringbackEnabled:true};
const expires=()=>new Date(Date.now()+40000).toISOString();
const timers={setTimeout:()=>1,clearTimeout:()=>{}};
test('one incoming call plays once and stops immediately when accepted',async()=>{
 let starts=0,stops=0;const session=createCallSoundSession({timers,loadSettings:async()=>({policy,effectiveSound:'greeting'}),play:async sound=>{assert.equal(sound,'greeting');starts++;return{stop:()=>stops++};}});
 await session.start('one','incoming',expires());await session.start('one','incoming',expires());assert.equal(starts,1);session.stop();session.stop();assert.equal(stops,1);
});
test('accepting during settings lookup cannot start a late ringtone',async()=>{
 let release,starts=0;const settings=new Promise(resolve=>{release=resolve;});const session=createCallSoundSession({timers,loadSettings:()=>settings,play:async()=>{starts++;}});
 const playing=session.start('one','incoming',expires());session.stop();release({policy,effectiveSound:'normal'});await playing;assert.equal(starts,0);
});
test('accepting during asynchronous audio setup releases the late player',async()=>{
 let release,stops=0;const ready=new Promise(resolve=>{release=resolve;});const session=createCallSoundSession({timers,loadSettings:async()=>({policy,effectiveSound:'normal'}),play:()=>ready});
 const playing=session.start('one','incoming',expires());await Promise.resolve();session.stop();release({stop:()=>stops++});await playing;assert.equal(stops,1);
});
test('disabled, silent, expired and disabled ringback calls do not play',async()=>{
 let starts=0;for(const settings of [{policy:{...policy,enabled:false},effectiveSound:'normal'},{policy,effectiveSound:'silent'},{policy:{...policy,ringbackEnabled:false},effectiveSound:'normal'}]){
 const session=createCallSoundSession({timers,loadSettings:async()=>settings,play:async()=>{starts++;return{stop(){}};}});await session.start('one',settings.policy.ringbackEnabled===false?'outgoing':'incoming',expires());session.stop();}
 const expired=createCallSoundSession({timers,loadSettings:async()=>{throw Error('Must not load');},play:()=>{starts++;}});await expired.start('old','incoming','2000-01-01');assert.equal(starts,0);
});
test('caller hears ringback; browser playback failure leaves the call usable',async()=>{
 let blocked=false;const session=createCallSoundSession({timers,loadSettings:async()=>({policy,effectiveSound:'greeting'}),play:async sound=>{assert.equal(sound,'ringback');throw Error('NotAllowedError');},onBlocked:value=>{blocked=value;}});await session.start('one','outgoing',expires());assert.equal(blocked,true);session.stop();
});
test('ring timeout stops playback and legacy call payloads get a bounded expiry',async()=>{
 let expire,stops=0;const session=createCallSoundSession({timers:{setTimeout:fn=>{expire=fn;return 1;},clearTimeout(){}},loadSettings:async()=>({policy,effectiveSound:'normal'}),play:async()=>({stop:()=>stops++})});await session.start('one','incoming',expires());expire();assert.equal(stops,1);assert.equal(ringingExpiry({},0),'1970-01-01T00:00:45.000Z');
});
test('both custom OS sounds are valid short WAV files and wired into Android/iOS',()=>{
 const project=fs.readFileSync('ios/RentalHubMobile.xcodeproj/project.pbxproj','utf8');
 for(const name of ['normal','greeting']){const b=fs.readFileSync('assets/call-sounds/call_'+name+'.wav');assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WAVE');assert.ok(b.length<1000000);assert.ok(project.includes('call_'+name+'.wav in Resources'));assert.ok(fs.readFileSync('android/app/src/main/res/raw/call_'+name+'.wav').equals(b));}
 const native=fs.readFileSync('android/app/src/main/java/com/rentalhubng/RentalHubCallSoundPackage.kt','utf8');assert.match(native,/RINGER_MODE_NORMAL/);assert.match(native,/INTERRUPTION_FILTER_ALL/);
});

test('native playback honours silent mode and releases audio once',async()=>{
 const vm=require('vm'),{transformSync}=require('@babel/core');
 const source=fs.readFileSync('src/services/callSoundService.js','utf8');
 const code=transformSync(source,{configFile:false,babelrc:false,plugins:['@babel/plugin-transform-modules-commonjs']}).code;
 let allowed=false,created=0,paused=0,removed=0,mode;
 const module={exports:{}};
 vm.runInNewContext(code,{module,exports:module.exports,require:name=>{
  if(name==='expo-audio')return{setAudioModeAsync:async value=>{mode=value;},createAudioPlayer:()=>{created++;return{play(){},pause(){paused++;},remove(){removed++;}};}};
  if(name==='react-native')return{Platform:{OS:'android'},NativeModules:{RentalHubCallSound:{canPlay:async()=>allowed}}};
  if(name==='./api')return{};
  if(name.endsWith('.wav'))return 1;
  throw Error('Unexpected module '+name);
 }});
 const muted=await module.exports.playCallSound('normal');assert.equal(muted.muted,true);assert.equal(created,0);
 allowed=true;const playback=await module.exports.playCallSound('greeting');assert.equal(created,1);assert.equal(mode.playsInSilentMode,false);assert.equal(mode.shouldPlayInBackground,false);playback.stop();playback.stop();assert.equal(paused,1);assert.equal(removed,1);
});

test('push recovery is guarded on logged-out screens and calls do not inflate badges',()=>{
 const realtime=fs.readFileSync('src/context/RealtimeContext.js','utf8');assert.match(realtime,/if \(!isAuthenticated \|\| !user\?\.id \|\| disposed\) return/);assert.match(realtime,/generation !== recoveryGeneration/);assert.match(realtime,/current\?\.status === 'accepted'/);
 const push=fs.readFileSync('src/services/pushNotificationService.js','utf8');assert.match(push,/shouldSetBadge: !isIncomingCall/);assert.match(push,/shouldPlaySound: !isIncomingCall/);
});
