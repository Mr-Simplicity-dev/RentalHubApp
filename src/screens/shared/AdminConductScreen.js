import React, { useContext, useEffect, useState } from 'react';
import { ScrollView, View, Switch, Alert } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import AppText from '../../components/common/AppText';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import useNativePaystackCheckout from '../../hooks/useNativePaystackCheckout';
export default function AdminConductScreen() {
  const {
      user
    } = useContext(AuthContext),
    [data, setData] = useState({
      documents: [],
      submissions: []
    }),
    [name, setName] = useState(''),
    [consent, setConsent] = useState(false),
    [read, setRead] = useState(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [queue, setQueue] = useState([]),
    [documents, setDocuments] = useState([]),
    [note, setNote] = useState('');
  const {
    openNativeCheckout,
    NativePaystackCheckoutModal
  } = useNativePaystackCheckout();
  const reviewer = user?.user_type === 'super_admin' || user?.user_type === 'recruitment_admin' || user?.is_recruitment_admin;
  const load = async () => {
    setData((await api.get('/admin-conduct/mine')).data.data);
    if (reviewer) setQueue((await api.get('/admin-conduct/queue')).data.data);
    if (user?.user_type === 'super_admin') setDocuments((await api.get('/admin-conduct/documents')).data.data);
  };
  useEffect(() => {
    load().catch(() => setMessage('Could not load Code of Conduct.'));
  }, []);
  const run = async fn => {
    setBusy(true);
    try {
      const r = await fn();
      setMessage(r?.data?.message || 'Saved.');
      await load();
      return r;
    } catch (e) {
      setMessage(e.response?.data?.message || 'Could not complete this action. Please retry.');
      return null;
    } finally {
      setBusy(false);
    }
  };
  const download = async (url, name, mime) => {
    const r = await api.get(url, {
        responseType: 'arraybuffer'
      }),
      file = new File(Paths.cache, name);
    file.create({
      overwrite: true
    });
    file.write(new Uint8Array(r.data));
    try {
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri, {
        mimeType: mime,
        dialogTitle: name
      });else throw new Error('Use the web dashboard to download this file.');
    } finally {
      file.delete();
    }
  };
  return <ScrollView contentContainerStyle={{
    padding: 20,
    gap: 14
  }}><AppText style={{
      fontSize: 24
    }}>Admin Code of Conduct</AppText><AppText>Physical delivery to Recruitment is free. Optional electronic signing and submission costs ₦5,000.</AppText><AppText>{message}</AppText>{!data.documents.length && <AppText>No approved document is available for your role yet. Contact Recruitment.</AppText>}{data.documents.map(d => <View key={d.id} style={{
      gap: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: '#94a3b8',
      borderRadius: 12
    }}><AppText>{d.role} — {d.version}</AppText><Button title="Download and read / print for free physical submission" onPress={() => run(async () => {
        await download('/admin-conduct/documents/' + d.id + '/download', 'Code-of-Conduct.pdf', 'application/pdf');
        setRead(d.id);
      })} /><Input label="Your full account name" value={name} onChangeText={setName} /><AppText>{data.consent}</AppText><Switch accessibilityLabel="Agree and sign electronically" value={consent} onValueChange={setConsent} /><Button title="Sign electronically" disabled={busy || !consent || read !== d.id || !name.trim()} onPress={() => run(() => api.post('/admin-conduct/sign', {
        document_id: d.id,
        document_hash: d.sha256,
        signed_name: name,
        consent: true
      }))} /></View>)}{data.submissions.map(s => <View key={s.id} style={{
      gap: 10,
      padding: 14,
      borderWidth: 1,
      borderColor: '#94a3b8'
    }}><AppText>Status: {s.status}</AppText>{s.review_note && <AppText>{s.review_note}</AppText>}{s.status === 'pending_payment' ? <><Button title="Pay ₦5,000 and submit" disabled={busy} onPress={() => run(async () => {
          const r = await api.post('/admin-conduct/' + s.id + '/pay');
          openNativeCheckout({
            transaction: r.data.data,
            title: 'Code of Conduct submission',
            amountLabel: '₦5,000',
            onSuccess: () => run(() => api.post('/admin-conduct/' + s.id + '/verify'))
          });
          return r;
        })} /><Button title="Already paid? Check payment" disabled={busy} onPress={() => run(() => api.post('/admin-conduct/' + s.id + '/verify'))} /></> : <><Button title="Download signed document pack" onPress={() => run(() => download('/admin-conduct/' + s.id + '/signed-copy', 'Signed-Code-of-Conduct.zip', 'application/zip'))} /><Button title="Download signature and receipt" onPress={() => run(() => download('/admin-conduct/' + s.id + '/receipt', 'Conduct-receipt.pdf', 'application/pdf'))} /></>}</View>)}{reviewer && <View style={{
      gap: 12
    }}><AppText style={{
        fontSize: 22
      }}>Recruitment submissions</AppText><Input label="Review note" value={note} onChangeText={setNote} />{queue.map(s => <View key={s.id} style={{
        gap: 10,
        padding: 12,
        borderWidth: 1,
        borderColor: '#94a3b8'
      }}><AppText>{s.full_name} — {s.user_type} — {s.status}</AppText><Button title="Read signed document pack" onPress={() => run(() => download('/admin-conduct/' + s.id + '/signed-copy', 'Signed-Code-of-Conduct.zip', 'application/zip'))} />{['accepted', 'returned'].map(status => <Button key={status} title={status === 'accepted' ? 'Accept' : 'Return for correction'} disabled={busy || note.trim().length < 5 || s.status === 'accepted' || Number(s.user_id) === Number(user.id)} onPress={() => run(() => api.post('/admin-conduct/' + s.id + '/review', {
          status,
          note
        }))} />)}</View>)}</View>}
 {user?.user_type === 'super_admin' && <View style={{
      gap: 12
    }}><AppText style={{
        fontSize: 22
      }}>Document adoption</AppText><AppText>Read each draft before adopting it for use.</AppText>{documents.map(d => <View key={d.id} style={{
        gap: 8
      }}><AppText>{d.role} — {d.version} — {d.active ? 'Active' : 'Not active'}</AppText><Button title="Read draft" onPress={() => run(() => download('/admin-conduct/documents/' + d.id + '/download', 'Conduct-draft.pdf', 'application/pdf'))} /><Button title="Adopt this exact version" disabled={busy || d.active} onPress={() => Alert.alert('Adopt Code of Conduct', 'Confirm this exact document is approved for this role.', [{
          text: 'Cancel',
          style: 'cancel'
        }, {
          text: 'Adopt',
          onPress: () => run(() => api.post('/admin-conduct/documents/' + d.id + '/adopt', {
            confirm: true
          }))
        }])} /></View>)}</View>}
 {NativePaystackCheckoutModal}</ScrollView>;
}
