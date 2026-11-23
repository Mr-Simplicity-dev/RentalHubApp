import React, {useEffect, useState} from 'react';
import {View} from 'react-native';
import SelectField from './SelectField';
import OptionPickerModal from './OptionPickerModal';
import AppText from './AppText';
import Button from './Button';
import {translateUi as ui} from '../../i18n/interfaceRuntime.cjs';
import recruitmentService from '../../services/recruitmentService';

export default function VolunteerServiceLocationPicker({role, states, stateValue, lgaValue, onStateChange, onLgaChange, copy}) {
  const [picker,setPicker]=useState(''),[lgas,setLgas]=useState([]),[loading,setLoading]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(0);
  useEffect(()=>{
    let active=true;setLgas([]);setError('');
    if(!stateValue){setLoading(false);return()=>{active=false;};}
    setLoading(true);
    recruitmentService.getLGAs(stateValue).then(response=>{if(active)setLgas(response?.data?.data||[]);}).catch(()=>{if(active)setError(copy.location_error);}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[stateValue,copy.location_error,retry]);
  const options=states.filter(state=>!role.service_state||state.name===role.service_state).map(state=>({value:state.displayName||state.name,label:state.name==='FCT'?'FCT (Abuja)':state.displayName||state.name}));
  return <View>
    <AppText>{role.service_state?copy.service_fct_only:copy.service_choice_hint}</AppText>
    <SelectField label={copy.service_state} value={stateValue} onPress={()=>setPicker('state')}/>
    <SelectField label={copy.service_lga} value={lgaValue} disabled={!stateValue||loading||Boolean(error)} helperText={error||(loading?copy.loading_locations:'')} onPress={()=>setPicker('lga')}/>
    {error ? <Button title={ui('Try again')} variant="outline" onPress={()=>setRetry(value=>value+1)}/> : null}
    <OptionPickerModal visible={Boolean(picker)} title={picker==='state'?copy.service_state:copy.service_lga} options={picker==='state'?options:lgas} selectedValue={picker==='state'?stateValue:lgaValue} searchable onClose={()=>setPicker('')} onSelect={item=>{if(picker==='state')onStateChange(item.value);else onLgaChange(item);setPicker('');}}/>
  </View>;
}
