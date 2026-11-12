import React,{useState} from 'react';
import {Linking,View} from 'react-native';
import api from '../../services/api';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import copy from '../../i18n/supportChannelCopy.cjs';
import Button from './Button';
import AppText from './AppText';
export default function WhatsAppSupportEntry(){const lang=useInterfaceLanguage(),c=copy[lang]||copy.en,[busy,setBusy]=useState(false),[error,setError]=useState('');return <View style={{padding:12,gap:8}}><Button title={c.label} loading={busy} variant="secondary" onPress={async()=>{if(busy)return;setBusy(true);setError('');try{const r=await api.get('/support-channels');const data=r.data.data;if(!data?.whatsapp_ready||!/^https:\/\/wa\.me\/\d+$/.test(data.whatsapp_url||'')){setError(c.unavailable);return;}await Linking.openURL(data.whatsapp_url);}catch{setError(c.failed);}finally{setBusy(false);}}}/><AppText>{error||c.hint}</AppText></View>;}
