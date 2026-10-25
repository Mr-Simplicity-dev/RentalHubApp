import React,{useState} from 'react';
import {useLanguage} from '../../context/LanguageContext';
import {ActionRow,DashboardHero,DashboardScreen,DashboardSection} from '../../components/dashboard/DashboardKit';
import TreatedCasesPanel from '../../components/legal/TreatedCasesPanel';
const legalCopy=require('../../i18n/legalCasesCopy.cjs');
export default function LawyersDirectoryScreen({navigation}){
 const {language}=useLanguage();const copy=legalCopy[language]||legalCopy.en;const [refreshToken,setRefreshToken]=useState(0);const refresh=()=>setRefreshToken(n=>n+1);
 return <DashboardScreen onRefresh={refresh} refreshing={false}><DashboardHero title={copy.title} subtitle={copy.intro} icon="scale-outline" onRefresh={refresh}/><TreatedCasesPanel refreshToken={refreshToken}/><DashboardSection title={copy.assistance}><ActionRow title={copy.assistance} icon="shield-checkmark-outline" onPress={()=>navigation.navigate('LegalSupport')}/></DashboardSection></DashboardScreen>;
}
