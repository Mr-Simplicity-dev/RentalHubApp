import React, { useState } from 'react';
import { View, Modal, TouchableOpacity, FlatList } from 'react-native';
import TextInput from './AppTextInput';
import AppText from './AppText';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import { translateUi as translate } from '../../i18n/interfaceRuntime.cjs';
const {
  languages,
  PIDGIN,
  LEVELS
} = require('../../data/languagePolicy.cjs');
export default function LanguageSkillsField({
  value = [],
  onChange,
  preference = false,
  english = false
}) {
  useInterfaceLanguage();
  const ui = value => english ? value : translate(value);
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState(''),
    [level, setLevel] = useState(null);
  const selected = Array.isArray(value) ? value : [];
  const button = {
    minHeight: 48,
    padding: 12,
    borderWidth: 1,
    borderColor: '#94a3b8',
    borderRadius: 10,
    marginVertical: 4
  };
  const name = id => languages.find(x => x.id === id)?.name || id;
  const choose = id => {
    if (preference) onChange(id);else if (selected.length < 5 && !selected.some(x => x.language_id === id)) onChange([...selected, {
      language_id: id,
      oral: '',
      written: ''
    }]);
    setOpen(false);
  };
  return <View style={{
    padding: 12,
    borderWidth: 1,
    borderColor: '#94a3b8',
    borderRadius: 12,
    marginVertical: 12
  }}><AppText>{ui(preference ? 'Which language would you like us to use?' : 'Languages you understand and can speak')}</AppText>{!preference && <AppText>{ui('Select 2 to 5 languages, including Nigerian Pidgin. Give honest skill levels.')} ({selected.length}/5)</AppText>}
 <TouchableOpacity accessibilityRole="button" style={button} disabled={!preference && selected.length >= 5} onPress={() => {
      setQuery('');
      setOpen(true);
    }}><AppText>{preference && value ? name(value) : ui('Choose a language')}</AppText></TouchableOpacity>
 {!preference && selected.map(row => <View key={row.language_id} style={{
      marginVertical: 8
    }}><AppText>{name(row.language_id)}{row.language_id === PIDGIN ? ' *' : ''}</AppText>{['oral', 'written'].map(field => <TouchableOpacity key={field} style={button} onPress={() => setLevel({
        id: row.language_id,
        field
      })}><AppText>{ui(field === 'oral' ? 'Speaking / understanding (or signing)' : 'Reading / writing')}: {ui(row[field] || 'Choose your level')}</AppText></TouchableOpacity>)}<TouchableOpacity style={button} onPress={() => onChange(selected.filter(x => x !== row))}><AppText>{ui('Remove')}</AppText></TouchableOpacity></View>)}
 <Modal visible={open || !!level} transparent={false} onRequestClose={() => {
      setOpen(false);
      setLevel(null);
    }}><View style={{
        flex: 1,
        padding: 20,
        paddingTop: 48
      }}><TouchableOpacity style={button} onPress={() => {
          setOpen(false);
          setLevel(null);
        }}><AppText>{ui('Back')}</AppText></TouchableOpacity>{level ? <View>{(level.field === 'written' ? ['none', ...LEVELS] : LEVELS).map(v => <TouchableOpacity key={v} style={button} onPress={() => {
            onChange(selected.map(row => row.language_id === level.id ? {
              ...row,
              [level.field]: v
            } : row));
            setLevel(null);
          }}><AppText>{ui(v === 'none' ? 'Not yet' : v === 'basic' ? 'Basic — simple words and sentences' : v === 'conversational' ? 'Conversational — everyday discussions' : 'Fluent — detailed explanations')}</AppText></TouchableOpacity>)}</View> : <><TextInput accessibilityLabel={ui('Search languages')} placeholder={ui('Search languages')} style={button} value={query} onChangeText={setQuery} /><FlatList keyboardShouldPersistTaps="handled" data={languages.filter(x => x.name.toLowerCase().includes(query.toLowerCase()) && (preference || !selected.some(s => s.language_id === x.id)))} keyExtractor={x => x.id} renderItem={({
            item
          }) => <TouchableOpacity style={button} onPress={() => choose(item.id)}><AppText>{item.name}</AppText></TouchableOpacity>} /></>}</View></Modal></View>;
}
