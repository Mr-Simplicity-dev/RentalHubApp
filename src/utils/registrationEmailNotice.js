import {Alert} from 'react-native';
import {getInterfaceLanguage} from '../i18n/interfaceRuntime.cjs';
import copy from '../i18n/registrationEmailCopy.cjs';
const announced=new Set();
export function announceRegistrationEmail(data){const user=data?.user,delivery=data?.email_verification;if(!user?.email||!delivery?.required||announced.has(user.id))return;announced.add(user.id);const text=copy[getInterfaceLanguage()]||copy.en;Alert.alert(text.title,(delivery.sent===true?text.sent.replace('{{email}}',user.email):text.failed)+'\n\n'+text.help);}
