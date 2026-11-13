import React,{useState,useEffect,useContext,useCallback,useRef} from 'react';
import {View,Switch,StyleSheet} from 'react-native';
import {AuthContext} from '../../context/AuthContext';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import copy from '../../i18n/contactPrivacyCopy.cjs';
import api from '../../services/api';
import AppText from './AppText';
import Input from './Input';
import Button from './Button';
import {colors,radius} from '../../theme';
export default function SupportContactForms({peerId,ticketId}){
 const {user}=useContext(AuthContext),language=useInterfaceLanguage(),staff=['admin','lga_admin','super_admin','lga_support_admin','state_support_admin','super_support_admin','zonal_admin'].includes(user?.user_type),c=copy[staff?'en':language]||copy.en;
 const [rows,setRows]=useState([]),[purpose,setPurpose]=useState(''),[requested,setRequested]=useState(['email']),[values,setValues]=useState({}),[consents,setConsents]=useState({}),[details,setDetails]=useState({}),[error,setError]=useState(''),[busy,setBusy]=useState(false),[open,setOpen]=useState(false);
 const sequence=useRef(0);
 const load=useCallback(async()=>{if(!user?.id)return;const current=++sequence.current;try{const result=await api.get('/messages/private-contact-forms');if(current===sequence.current){setRows(result.data.data||[]);setError('');}}catch{if(current===sequence.current)setError(c.error);}},[c.error,user?.id]);
 useEffect(()=>{setRows([]);setValues({});setDetails({});setConsents({});setError('');load();return()=>{sequence.current++;};},[load,peerId,ticketId,user?.id]);
 const action=async run=>{if(busy)return;setBusy(true);setError('');try{await run();await load();}catch(e){setError(e.response?.data?.message||c.error);}finally{setBusy(false);}};
 const shown=rows.filter(row=>(!ticketId||Number(row.ticket_id)===Number(ticketId))&&(!peerId||Number(row.requester_id)===Number(peerId)||Number(row.customer_id)===Number(peerId)));
 if(!user?.id||!staff&&!shown.length&&!error)return null;
 return <View style={styles.card}><AppText style={styles.title}>{c.title}</AppText><Button title="↻" accessibilityLabel={c.title} variant="outline" onPress={load} disabled={busy}/>{error?<AppText style={styles.error}>{error}</AppText>:null}
 {staff&&peerId?<><Button title="Request contact details" variant="outline" onPress={()=>setOpen(!open)} />{open?<><Input label="Why are these details needed?" multiline value={purpose} maxLength={500} onChangeText={setPurpose}/>{['email','phone'].map(field=><View key={field} style={styles.row}><Switch value={requested.includes(field)} accessibilityLabel={c[field]} onValueChange={checked=>setRequested(old=>checked?[...old,field]:old.filter(f=>f!==field))}/><AppText>{c[field]}</AppText></View>)}<Button title="Request private form" disabled={busy||purpose.trim().length<10||!requested.length} onPress={()=>action(async()=>{await api.post('/messages/private-contact-forms',{customer_id:peerId,ticket_id:ticketId,fields:requested,purpose});setPurpose('');setOpen(false);})}/></>:null}</>:null}
 {shown.map(row=>{const owner=Number(row.customer_id)===Number(user?.id),closed=row.status==='withdrawn'||Date.parse(row.expires_at)<Date.now();return <View key={row.id} style={styles.form}><AppText>{row.purpose}</AppText><AppText style={styles.meta}>{closed?c.closed:row.status==='submitted'?c.submitted:c.title}</AppText>{owner&&!closed&&row.status==='requested'?<>{row.fields.map(field=><Input key={field} label={c[field]} autoCapitalize="none" keyboardType={field==='email'?'email-address':'phone-pad'} value={values[row.id]?.[field]||''} onChangeText={value=>setValues(old=>({...old,[row.id]:{...old[row.id],[field]:value}}))}/>)}<View style={styles.row}><Switch value={!!consents[row.id]} accessibilityLabel={c.consent} onValueChange={checked=>setConsents(old=>({...old,[row.id]:checked}))}/><AppText style={{flex:1}}>{c.consent}</AppText></View><Button title={c.share} disabled={busy||!consents[row.id]} onPress={()=>action(async()=>{await api.post('/messages/private-contact-forms/'+row.id,{...values[row.id],consent:true});setValues(old=>({...old,[row.id]:{}}));})}/></>:null}
 {owner&&!closed?<Button title={c.withdraw} variant="outline" disabled={busy} onPress={()=>action(()=>api.delete('/messages/private-contact-forms/'+row.id))}/>:null}
 {staff&&!closed&&row.status==='submitted'?<><Button title={c.view} variant="outline" disabled={busy} onPress={()=>action(async()=>{const response=await api.get('/messages/private-contact-forms/'+row.id+'/details');setDetails(old=>({...old,[row.id]:response.data.data}));})}/>{details[row.id]?Object.entries(details[row.id]).map(([field,value])=><AppText key={field} selectable>{c[field]}: {value}</AppText>):null}</>:null}</View>;})}</View>;
}
const styles=StyleSheet.create({card:{margin:12,padding:12,borderRadius:radius.md,backgroundColor:'#eff6ff',gap:10},title:{fontWeight:'700',color:colors.navy},form:{padding:12,borderRadius:radius.md,backgroundColor:'white',gap:10},row:{flexDirection:'row',gap:10,alignItems:'center'},error:{color:'#b91c1c'},meta:{color:colors.muted,fontSize:13,lineHeight:19}});
