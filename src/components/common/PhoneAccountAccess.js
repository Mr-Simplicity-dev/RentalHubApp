import React,{useContext,useRef,useState} from 'react';
import {View} from 'react-native';
import {AuthContext} from '../../context/AuthContext';
import api from '../../services/api';
import AppText from './AppText';
import Input from './Input';
import Button from './Button';
import TurnstileWidget from './TurnstileWidget';
export default function PhoneAccountAccess(){
 const {establishSession}=useContext(AuthContext);const [open,setOpen]=useState(false);const [phone,setPhone]=useState('');const [code,setCode]=useState('');const [challenge,setChallenge]=useState('');const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const token=useRef(null);const widget=useRef(null);
 const submit=async()=>{setBusy(true);setMessage('');try{if(!challenge){if(!token.current)throw new Error('Complete the security check first.');const r=await api.post('/assisted-registration/phone/request',{phone,turnstile_token:token.current});setChallenge(r.data.data.challenge_id);setMessage(r.data.data.message);token.current=null;widget.current?.reset();}else{const r=await api.post('/assisted-registration/phone/verify',{challenge_id:challenge,code});await establishSession(r.data.data);}}catch(e){setMessage(e.response?.data?.message||e.message||'Unable to continue.');}finally{setBusy(false);}};
 return <View style={{marginTop:20,gap:12}}><Button title={open?'Close phone sign-in':'Sign in with a phone code'} variant="outline" onPress={()=>setOpen(!open)} />{open&&<><AppText>For eligible tenant and landlord accounts, including accounts created by support. Keep your code private.</AppText><Input label="Phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" editable={!challenge}/>{challenge?<Input label="Six-digit verification code" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} autoComplete="sms-otp"/>:<TurnstileWidget ref={widget} action="rentalhub_login" onToken={v=>{token.current=v;}} onExpire={()=>{token.current=null;}} onError={()=>{token.current=null;}}/>}{message?<AppText accessibilityLiveRegion="polite">{message}</AppText>:null}<Button title={challenge?'Verify and sign in':'Send verification code'} loading={busy} onPress={submit}/>{challenge&&<Button variant="outline" title="Change number or request another code" onPress={()=>{setChallenge('');setCode('');}}/>}</>}</View>;
}
