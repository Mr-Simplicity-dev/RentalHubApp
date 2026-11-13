import React,{useContext} from 'react';
import {View,StyleSheet} from 'react-native';
import {AuthContext} from '../../context/AuthContext';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import copy from '../../i18n/registrationEmailCopy.cjs';
import AppText from './AppText';
import Button from './Button';
import {colors,typography} from '../../theme';
export default function EmailVerificationNotice({navigation}){const {user}=useContext(AuthContext),language=useInterfaceLanguage(),text=copy[language]||copy.en;if(!['tenant','landlord'].includes(user?.user_type)||!user.email||user.email_verified===true)return null;return <View accessibilityLiveRegion="polite" style={styles.card}><AppText style={styles.title}>{text.title}</AppText><AppText style={styles.body}>{text.pending}</AppText><AppText selectable style={styles.body}>{user.email}</AppText><AppText style={styles.body}>{text.help}</AppText><Button title={text.action} variant="outline" onPress={()=>navigation.navigate('VerifyEmail',{email:user.email})}/></View>;}
const styles=StyleSheet.create({card:{backgroundColor:colors.surfaceBlue,borderColor:colors.border,borderWidth:1,borderRadius:16,padding:16,gap:9,marginVertical:12},title:{fontFamily:typography.semibold,color:colors.navy,fontSize:18,lineHeight:25},body:{color:colors.text,fontSize:15,lineHeight:23}});
