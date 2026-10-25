import React,{useEffect,useState} from 'react';
import {ActivityIndicator,View} from 'react-native';
import {legalService} from '../../services/legalService';
import {useLanguage} from '../../context/LanguageContext';
import AppText from '../common/AppText';
import Button from '../common/Button';
import {DashboardSection,MetricCard,MetricGrid} from '../dashboard/DashboardKit';
import {colors,radius} from '../../theme';
const legalCopy=require('../../i18n/legalCasesCopy.cjs');
export default function TreatedCasesPanel({refreshToken=0}){
 const {language}=useLanguage();const copy=legalCopy[language]||legalCopy.en;const [data,setData]=useState(null);const [loading,setLoading]=useState(true);const [error,setError]=useState(false);const [attempt,setAttempt]=useState(0);
 useEffect(()=>{let active=true;setLoading(true);setError(false);legalService.getTreatedCases().then(response=>{const value=response?.data;if(!value?.stats||!Array.isArray(value.cases))throw Error('Invalid case response');if(active)setData(value);}).catch(()=>{if(active){setData(null);setError(true);}}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[refreshToken,attempt]);
 if(loading)return <DashboardSection title={copy.recent}><ActivityIndicator color={colors.blue}/></DashboardSection>;
 if(error)return <DashboardSection title={copy.recent}><AppText variant="bodySm">{copy.error}</AppText><Button title={copy.retry} onPress={()=>setAttempt(n=>n+1)}/></DashboardSection>;
 const date=value=>{const parsed=new Date(value);return value&&!Number.isNaN(parsed.getTime())?parsed.toLocaleDateString(language):'';};
 return <View><MetricGrid>{[['total_resolved','resolved'],['tenant_against_landlord','tenant_cases'],['landlord_against_tenant','landlord_cases']].map(([field,key])=><MetricCard key={field} label={copy[key]} value={String(data.stats[field]||0)} icon="checkmark-done-outline" color={colors.blue}/>)}</MetricGrid><DashboardSection title={copy.recent}>
 {data.cases.length?data.cases.map(item=><View key={item.id} style={{padding:16,borderRadius:radius.md,borderWidth:1,borderColor:colors.border,backgroundColor:colors.white,gap:8}}><AppText variant="label" color={colors.success}>{copy.resolved}</AppText><AppText variant="h4">{item.direction==='tenant_landlord'?copy.tenant_to_landlord:copy.landlord_to_tenant}</AppText><AppText variant="bodySm">{[item.state,date(item.resolved_at)].filter(Boolean).join(' · ')}</AppText></View>):<AppText variant="bodySm">{copy.empty}</AppText>}
 <AppText variant="caption">{copy.privacy}</AppText></DashboardSection></View>;
}
