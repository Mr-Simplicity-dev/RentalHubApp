import React, { useContext, useEffect, useState } from 'react';
import { ScrollView, View, Alert } from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import AppText from '../../components/common/AppText';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import LanguageSkillsField from '../../components/common/LanguageSkillsField';
const {
  languages
} = require('../../data/languagePolicy.cjs');
export default function SupportLanguageScreen() {
  const {
      user
    } = useContext(AuthContext),
    [skills, setSkills] = useState([]),
    [rows, setRows] = useState([]),
    [misses, setMisses] = useState([]),
    [note, setNote] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false);
  const senior = ['super_support_admin', 'super_admin'].includes(user?.user_type);
  const load = async () => {
    const r = await api.get('/support-languages/profile');
    setSkills(r.data.data.skills);
    if (senior) {
      setRows((await api.get('/support-languages/review')).data.data);
      setMisses((await api.get('/support-languages/monitor')).data.data);
    }
  };
  useEffect(() => {
    load().catch(() => setMessage('Could not load language desk.'));
  }, []);
  const run = async fn => {
    setBusy(true);
    try {
      const r = await fn();
      setMessage(r.data.message || 'Saved.');
      await load();
    } catch (e) {
      setMessage(e.response?.data?.message || 'Could not save.');
    } finally {
      setBusy(false);
    }
  };
  return <ScrollView contentContainerStyle={{
    padding: 20,
    gap: 12
  }}><AppText style={{
      fontSize: 24
    }}>Support languages and availability</AppText><AppText>{message}</AppText><LanguageSkillsField english value={skills} onChange={setSkills} /><Button disabled={busy} title="Send skills for assessment" onPress={() => run(() => api.put('/support-languages/profile', {
      skills
    }))} /><Button disabled={busy} title="Available for 1 hour" onPress={() => run(() => api.put('/support-languages/availability', {
      available: true,
      minutes: 60
    }))} /><Button disabled={busy} title="Unavailable / on break" onPress={() => run(() => api.put('/support-languages/availability', {
      available: false
    }))} />{senior && <><AppText>Language assessments</AppText><Input label="Assessment note (at least 10 characters)" value={note} onChangeText={setNote} />{rows.map(row => <View key={row.user_id + row.language_id} style={{
        padding: 12,
        borderWidth: 1,
        borderColor: '#94a3b8',
        gap: 8
      }}><AppText>{row.full_name} — {languages.find(x => x.id === row.language_id)?.name}: speaking {row.oral}; writing {row.written}; {row.status}</AppText>{['approved', 'rejected'].map(status => <Button key={status} disabled={busy || note.trim().length < 10 || Number(row.user_id) === Number(user.id)} title={status === 'approved' ? 'Approve' : 'Reject'} onPress={() => run(() => api.post('/support-languages/review', {
          user_id: row.user_id,
          language_id: row.language_id,
          status,
          note
        }))} />)}</View>)}<AppText>Requests that waited too long</AppText><AppText>Review the reason first. This is not proof of misconduct.</AppText>{misses.map(row => <View key={row.id} style={{
        gap: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: '#94a3b8'
      }}><AppText>Ticket #{row.ticket_id} — {row.full_name} — {row.reason} — {row.created_at} — {row.review_status || 'pending'}</AppText><AppText>{row.review_note || ''}</AppText>{['excused', 'needs_followup'].map(status => <Button key={status} title={status === 'excused' ? 'Record valid reason' : 'Needs follow-up'} disabled={busy || note.trim().length < 10 || Number(row.agent_id) === Number(user.id)} onPress={() => run(() => api.post('/support-languages/monitor/' + row.id + '/review', {
          status,
          note
        }))} />)}</View>)}</>}</ScrollView>;
}
