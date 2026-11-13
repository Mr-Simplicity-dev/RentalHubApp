import React from 'react';
import {StyleSheet,TouchableOpacity,View} from 'react-native';
import AppText from './AppText';
import {colors,typography,typeScale} from '../../theme';
export default function ChoiceChips({options,value,onChange,disabled=false,accessibilityLabel}){
 return <View accessibilityLabel={accessibilityLabel} style={styles.row}>{options.map(option=>{const item=typeof option==='string'?{value:option,label:option.replace(/_/g,' ')}:option,selected=item.value===value;return <TouchableOpacity key={String(item.value)} accessibilityRole="button" accessibilityState={{selected,disabled}} disabled={disabled} onPress={()=>onChange(item.value)} activeOpacity={0.8} style={[styles.chip,selected&&styles.selected,disabled&&{opacity:0.5}]}><AppText style={[styles.text,selected&&styles.selectedText]}>{item.label}</AppText></TouchableOpacity>;})}</View>;
}
const styles=StyleSheet.create({row:{flexDirection:'row',flexWrap:'wrap',gap:8},chip:{minHeight:44,maxWidth:'100%',justifyContent:'center',borderRadius:22,borderWidth:1,borderColor:colors.border,backgroundColor:colors.white,paddingVertical:9,paddingHorizontal:14},selected:{borderColor:colors.blue,backgroundColor:colors.surfaceBlue},text:{color:colors.muted,fontFamily:typography.medium,fontSize:typeScale.sm,lineHeight:20,flexShrink:1},selectedText:{color:colors.blue,fontFamily:typography.semibold}});
