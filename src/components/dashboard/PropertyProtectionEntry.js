import React, {useContext} from 'react';
import {useNavigation} from '@react-navigation/native';
import {AuthContext} from '../../context/AuthContext';
import {entryFor} from '../../propertyProtection/workflow.cjs';
import {translateUi as ui} from '../../i18n/interfaceRuntime.cjs';
import {DashboardSection,ActionRow} from './DashboardKit';
export default function PropertyProtectionEntry(){const {user}=useContext(AuthContext),navigation=useNavigation(),entry=entryFor(user);if(!entry)return null;return <DashboardSection title={ui('Property Protection')}><ActionRow title={ui(entry.title)} subtitle={ui(entry.description)} icon="shield-checkmark-outline" onPress={()=>navigation.navigate('PropertyProtection',{view:entry.view})}/></DashboardSection>;}
