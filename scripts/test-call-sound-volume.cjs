const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
test('Android and iOS play call tones at full app gain without changing the phone volume',async()=>{
 const code=require('@babel/core').transformSync(fs.readFileSync('src/services/callSoundService.js','utf8'),{configFile:false,babelrc:false,plugins:['@babel/plugin-transform-modules-commonjs']}).code;
 for(const os of ['android','ios']){let played=0;const module={exports:{}};vm.runInNewContext(code,{module,exports:module.exports,require:name=>{
  if(name==='react-native')return{Platform:{OS:os},NativeModules:{RentalHubCallSound:{canPlay:async()=>true}}};
  if(name==='expo-audio')return{setAudioModeAsync:async value=>assert.equal(value.playsInSilentMode,false),createAudioPlayer:()=>({play(){assert.equal(this.volume,1);played++;},pause(){},remove(){}})};
  if(name==='./api')return{};if(name.endsWith('.wav'))return 1;throw Error(name);
 }});for(const sound of ['normal','greeting','ringback']){const player=await module.exports.playCallSound(sound);player.stop();}assert.equal(played,3);}
});

test('both incoming ringtones have useful headroom without clipped samples',()=>{for(const sound of ['normal','greeting']){const b=fs.readFileSync('assets/call-sounds/call_'+sound+'.wav');let offset=12,peak=0,found=false;while(offset+8<=b.length){const size=b.readUInt32LE(offset+4);if(b.toString('ascii',offset,offset+4)==='data'){for(let i=offset+8;i<offset+8+size;i+=2)peak=Math.max(peak,Math.abs(b.readInt16LE(i))/32768);found=true;break;}offset+=8+size+size%2;}assert.equal(found,true);assert.ok(peak>.85&&peak<.95);const manifest=require('../assets/call-sounds/manifest.json');assert.equal(manifest.files.find(x=>x.name==='call_'+sound+'.wav').downloadName,'call_'+sound+'_v2.wav');}});
