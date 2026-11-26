import React, {useEffect,useRef,useState} from 'react';
import {View,TouchableOpacity,Switch,NativeModules} from 'react-native';
import AppText from '../common/AppText';
import {loadCallSounds,saveCallSound,saveCallPolicy,playCallSound} from '../../services/callSoundService';
export default function CallSoundSettings({admin=false}) {
  const [data,setData]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const preview=useRef(null),timer=useRef(null),alive=useRef(true),generation=useRef(0);
  const stop=()=>{generation.current++;clearTimeout(timer.current);preview.current?.stop();preview.current=null;};
  useEffect(()=>{alive.current=true;loadCallSounds().then(value=>{if(alive.current)setData(value);}).catch(()=>{if(alive.current)setError('Could not load call sounds.');});return()=>{alive.current=false;stop();};},[]);
  const save=async fn=>{setBusy(true);setError('');try{setData(await fn());}catch{setError('Could not save call sounds. Try again.');}finally{setBusy(false);}};
  const listen=async sound=>{stop();const version=generation.current;try{const player=await playCallSound(sound,false);if(!alive.current||version!==generation.current){player.stop();return;}if(player.muted)setError('Your phone is silent, in Do Not Disturb or call alerts are muted.');else setError('');preview.current=player;timer.current=setTimeout(stop,10000);}catch{setError('Could not play this sound.');}};
  return <View style={{padding:16,gap:12,borderWidth:1,borderColor:'#dce4ee',borderRadius:16,backgroundColor:'#fff',marginVertical:12}}>
    <AppText style={{fontSize:18,fontWeight:'600'}}>Call sounds</AppText>
    <AppText>Choose your incoming call sound. No religion information is collected.</AppText>
    {!!NativeModules.RentalHubIncomingCalls && <TouchableOpacity accessibilityRole="button" onPress={() => NativeModules.RentalHubIncomingCalls.openCallSettings()} style={{padding:12}}><AppText>Allow incoming calls on the lock screen</AppText></TouchableOpacity>}
    {!!error&&<AppText accessibilityRole="alert">{error}</AppText>}
    {!data&&<TouchableOpacity accessibilityRole="button" onPress={()=>loadCallSounds().then(setData).catch(()=>setError('Could not load call sounds.'))} style={{padding:12}}><AppText>Load call settings</AppText></TouchableOpacity>}
    {data&&<>
      {admin&&Object.entries({enabled:'Allow incoming call sounds',greetingEnabled:'Allow spoken greeting',ringbackEnabled:'Allow caller ringing sound'}).map(([key,label])=><View key={key} style={{flexDirection:'row',alignItems:'center',gap:8}}><AppText style={{flex:1}}>{label}</AppText><Switch accessibilityLabel={label} disabled={busy} value={data.policy[key]} onValueChange={value=>save(()=>saveCallPolicy({[key]:value}))}/></View>)}
      {['normal',...(data.isWorker&&data.policy.greetingEnabled?['greeting']:[]),'silent'].map(sound=><TouchableOpacity accessibilityRole="radio" accessibilityState={{selected:data.preference===sound,disabled:busy}} disabled={busy} key={sound} onPress={()=>save(()=>saveCallSound(sound))} style={{padding:12,borderWidth:1,borderColor:data.preference===sound?'#0A66C2':'#dce4ee',borderRadius:10}}><AppText>{data.preference===sound?'✓ ':''}{sound==='normal'?'Normal ringtone':sound==='greeting'?'Spoken greeting: Assalamu alaikum':'Silent'}</AppText></TouchableOpacity>)}
      {!data.policy.enabled&&<AppText>Call sounds are disabled by Super Admin.</AppText>}
      {data.preference==='greeting'&&!data.policy.greetingEnabled&&<AppText>The spoken greeting is disabled. Your calls use the normal ringtone.</AppText>}
      <TouchableOpacity accessibilityRole="button" onPress={()=>listen('normal')} style={{padding:12}}><AppText>Preview normal ringtone</AppText></TouchableOpacity>
      {(data.isWorker||admin)&&<TouchableOpacity accessibilityRole="button" onPress={()=>listen('greeting')} style={{padding:12}}><AppText>Preview spoken greeting</AppText></TouchableOpacity>}
      <TouchableOpacity accessibilityRole="button" onPress={stop} style={{padding:12}}><AppText>Stop preview</AppText></TouchableOpacity>
      <AppText>Phone silent settings still apply. Background alerts need notification permission.</AppText>
    </>}
  </View>;
}
