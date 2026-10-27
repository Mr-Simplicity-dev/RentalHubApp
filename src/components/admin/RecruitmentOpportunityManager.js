import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import React, {useContext,useState} from 'react';
import {View,StyleSheet,Switch} from 'react-native';
import Toast from 'react-native-toast-message';
import {AuthContext} from '../../context/AuthContext';
import recruitmentService from '../../services/recruitmentService';
import Input from '../common/Input';
import AppText from '../common/AppText';
import TourTarget from '../tour/TourTarget';
import {PremiumButton,PremiumCard} from '../common/PremiumLayout';
import {colors} from '../../theme';

const empty={title:'',type:'Administrative',description:'',cycle_id:'',opportunity_type:'employment',application_fee:'5000',premium_fee:'8000',is_active:true};
export default function RecruitmentOpportunityManager({status,cycles,roles,onSaved}) {
  useInterfaceLanguage();
 const {user}=useContext(AuthContext);const [form,setForm]=useState(empty);const [editing,setEditing]=useState(null);const [saving,setSaving]=useState(false);
 const change=(key,value)=>setForm(prev=>({...prev,[key]:value}));
 const save=async()=>{if(!form.title.trim()||!form.cycle_id){Toast.show({type:'error',text1:ui("Title and recruitment cycle are required")});return;}setSaving(true);try{const payload={...form,cycle_id:Number(form.cycle_id),application_fee:form.opportunity_type==='volunteer'?0:Number(form.application_fee),premium_fee:form.opportunity_type==='volunteer'?0:Number(form.premium_fee)};if(editing)await recruitmentService.updateRole(editing,payload);else await recruitmentService.createRole(payload);setForm(empty);setEditing(null);await onSaved();Toast.show({type:'success',text1:ui("Opportunity saved")});}catch(error){Toast.show({type:'error',text1:ui("Could not save opportunity"),text2:error.response?.data?.message||ui("Please try again")});}finally{setSaving(false);}};
 const toggle=async()=>{setSaving(true);try{await recruitmentService.toggleVolunteers(!status?.volunteer_applications_enabled);await onSaved();}catch(error){Toast.show({type:'error',text1:ui("Could not save volunteer setting"),text2:error.response?.data?.message});}finally{setSaving(false);}};
 return <View>
  <TourTarget id="recruitment_opportunities" label={ui("Employment and volunteer opportunities")}><PremiumCard><AppText variant="h4">{ui("Volunteer Applications")}</AppText><AppText variant="bodySm">{status?.volunteer_applications_enabled?'Volunteer opportunities are currently accepting applications.':'Volunteer applications are currently closed.'}</AppText>{user?.user_type==='super_admin'?<PremiumButton title={status?.volunteer_applications_enabled?'ON — close volunteer applications':'OFF — open volunteer applications'} onPress={toggle} loading={saving}/>:<AppText variant="caption">{ui("Managed by Super Admin, independently of employment recruitment.")}</AppText>}</PremiumCard></TourTarget>
  <PremiumCard><AppText variant="h4">{editing?ui("Edit opportunity"):'Create opportunity'}</AppText><Input label={ui("Opportunity title")} value={form.title} onChangeText={v=>change('title',v)} maxLength={255}/>
  <AppText variant="label">{ui("Opportunity type")}</AppText><View style={styles.row}>{['employment','volunteer'].map(type=><PremiumButton key={type} title={(form.opportunity_type===type?'✓ ':'')+(type==="volunteer"?ui("Volunteer"):'Employment')} variant="secondary" disabled={!!editing} onPress={()=>setForm(p=>({...p,opportunity_type:type,application_fee:type==='volunteer'?'0':'5000',premium_fee:type==='volunteer'?'0':'8000'}))}/>)}</View>
  <AppText variant="caption">{ui("Type is fixed after creation to preserve application history.")}</AppText>
  <AppText variant="label">{ui("Category")}</AppText><View style={styles.row}>{['Administrative','Technical'].map(type=><PremiumButton key={type} title={(form.type===type?'✓ ':'')+type} variant="secondary" onPress={()=>change('type',type)}/>)}</View>
  <AppText variant="label">{ui("Recruitment cycle")}</AppText>{cycles.map(cycle=><PremiumButton key={cycle.id} title={(String(form.cycle_id)===String(cycle.id)?'✓ ':'')+cycle.title} variant="secondary" onPress={()=>change('cycle_id',cycle.id)}/>)}
  <Input label={ui("Description, responsibilities, required skills and location/scope")} value={form.description||''} onChangeText={v=>change('description',v)} multiline maxLength={10000}/>
  {form.opportunity_type==='employment'?<><Input label={ui("Application fee (NGN)")} value={String(form.application_fee)} keyboardType="numeric" onChangeText={v=>change('application_fee',v)}/><Input label={ui("Premium fee (NGN)")} value={String(form.premium_fee)} keyboardType="numeric" onChangeText={v=>change('premium_fee',v)}/></>:<AppText variant="bodySm">{ui("Volunteer applications are free. No payment or premium track.")}</AppText>}
  <View style={styles.row}><AppText variant="label">{ui("Active")}</AppText><Switch value={form.is_active} onValueChange={v=>change('is_active',v)}/></View><PremiumButton title={ui("Save opportunity")} onPress={save} loading={saving}/>{editing?<PremiumButton title={ui("Cancel editing")} variant="secondary" onPress={()=>{setEditing(null);setForm(empty);}}/>:null}</PremiumCard>
  <PremiumCard><AppText variant="h4">{ui("Manage opportunities")}</AppText>{roles.map(role=><View key={role.id} style={styles.item}><AppText variant="label">{role.title}</AppText><AppText variant="caption">{role.opportunity_type==="volunteer"?'VOLUNTEER · Free':'Employment'} · {role.is_active?ui("Active"):ui("Inactive")}</AppText><PremiumButton title={ui("Edit opportunity")} variant="secondary" onPress={()=>{setEditing(role.id);setForm({...empty,...role});}}/></View>)}</PremiumCard>
 </View>;
}
const styles=StyleSheet.create({row:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:10,marginVertical:10},item:{borderTopWidth:1,borderTopColor:colors.border,paddingVertical:12}});
