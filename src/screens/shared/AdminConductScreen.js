import {PremiumScreen,PremiumPageHeader,PremiumCard,PremiumSectionTitle,StatusPill,EmptyPanel} from '../../components/common/PremiumLayout';
import OperationNoteModal from '../../components/admin/OperationNoteModal';
import {colors,typography,typeScale} from '../../theme';
import React, { useContext, useEffect, useState } from 'react';
import { View, Switch, Alert, StyleSheet } from 'react-native';
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
    [decision, setDecision] = useState(null);
  const {
    openNativeCheckout,
    NativePaystackCheckoutModal
  } = useNativePaystackCheckout();
  const reviewer = user?.user_type === 'super_admin' || user?.user_type === 'recruitment_admin' || user?.is_recruitment_admin;
  const load = async () => {
    if(user?.user_type !== 'super_admin') setData((await api.get('/admin-conduct/mine')).data.data);
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
  return <><PremiumScreen contentStyle={styles.page}><PremiumPageHeader eyebrow="Staff governance" title={user?.user_type==='super_admin'?'Code of Conduct management':'Admin Code of Conduct'} subtitle={user?.user_type==='super_admin'?'Approve staff documents and review submissions. Super Admin does not sign these staff forms.':'Read the rules for your role, then choose free physical delivery or optional electronic signing and submission.'}/>
  {message?<AppText accessibilityRole="alert" style={styles.notice}>{message}</AppText>:null}
  {user?.user_type!=='super_admin'?<><PremiumCard style={styles.card}><StatusPill label="Free physical delivery" color={colors.success}/><AppText style={styles.body}>Download, print and sign your document. Deliver it to Recruitment yourself.</AppText></PremiumCard><PremiumCard style={styles.card}><StatusPill label="Optional · ₦5,000" color={colors.blue}/><AppText style={styles.heading}>Electronic signing and submission</AppText><AppText style={styles.body}>Read the document, sign below and confirm payment. Signing and confirmed payment are both required.</AppText></PremiumCard></>:null}
  {user?.user_type!=='super_admin'&&!data.documents.length?<EmptyPanel title="No approved document for your role yet" message="Please contact Recruitment before signing or making a payment."/>:null}
  {data.documents.map(d=><PremiumCard key={d.id} style={styles.card}><PremiumSectionTitle title={d.role.replace(/_/g,' ')+' — '+d.version} subtitle="Read the approved document before signing. Keep a copy for your records."/><Button title="Download and read / print for free physical submission" variant="secondary" disabled={busy} onPress={()=>run(async()=>{await download('/admin-conduct/documents/'+d.id+'/download','Code-of-Conduct.pdf','application/pdf');setRead(d.id);})}/><Input label="Your full account name" value={name} onChangeText={setName}/><View style={styles.consent}><Switch accessibilityLabel="Agree and sign electronically" value={consent} onValueChange={setConsent}/><AppText style={[styles.body,{flex:1}]}>{data.consent}</AppText></View><Button title="Sign electronically" disabled={busy||!consent||read!==d.id||!name.trim()} onPress={()=>run(()=>api.post('/admin-conduct/sign',{document_id:d.id,document_hash:d.sha256,signed_name:name,consent:true}))}/></PremiumCard>)}
  {data.submissions.length?<PremiumSectionTitle title="My submissions" subtitle="Follow the payment and Recruitment review status of each document."/>:null}
  {data.submissions.map(s=><PremiumCard key={s.id} style={styles.card}><StatusPill label={s.status.replace(/_/g,' ')} color={s.status==='accepted'?colors.success:colors.warning}/>{s.review_note?<AppText style={styles.notice}>Recruitment: {s.review_note}</AppText>:null}{s.status==='returned'?<AppText style={styles.body}>Read the review note. You can sign the document again. Your existing payment will be reused.</AppText>:null}{s.status==='pending_payment'?<><Button title="Pay ₦5,000 and submit" disabled={busy} onPress={()=>run(async()=>{const r=await api.post('/admin-conduct/'+s.id+'/pay');openNativeCheckout({transaction:r.data.data,title:'Code of Conduct submission',amountLabel:'₦5,000',onSuccess:()=>run(()=>api.post('/admin-conduct/'+s.id+'/verify'))});return r;})}/><Button title="Already paid? Check payment" variant="secondary" disabled={busy} onPress={()=>run(()=>api.post('/admin-conduct/'+s.id+'/verify'))}/></>:<><Button title="Download signed document pack" variant="secondary" disabled={busy} onPress={()=>run(()=>download('/admin-conduct/'+s.id+'/signed-copy','Signed-Code-of-Conduct.zip','application/zip'))}/><Button title="Download signature and receipt" variant="secondary" disabled={busy} onPress={()=>run(()=>download('/admin-conduct/'+s.id+'/receipt','Conduct-receipt.pdf','application/pdf'))}/></>}</PremiumCard>)}
  {user?.user_type==='super_admin'?<><PremiumSectionTitle title="Document adoption" subtitle="Read the exact version before adopting it. Draft documents cannot be used for staff signing."/>{!documents.length?<EmptyPanel title="No document versions to show"/>:null}{documents.map(d=><PremiumCard key={d.id} style={styles.card}><StatusPill label={d.active?'Active':'Draft'} color={d.active?colors.success:colors.warning}/><AppText style={styles.heading}>{d.role.replace(/_/g,' ')}</AppText><AppText style={styles.meta}>Version {d.version}</AppText><Button title="Read draft" variant="secondary" disabled={busy} onPress={()=>run(()=>download('/admin-conduct/documents/'+d.id+'/download','Conduct-draft.pdf','application/pdf'))}/><Button title="Adopt this exact version" disabled={busy||d.active} onPress={()=>Alert.alert('Adopt Code of Conduct','Confirm this exact document is approved for this role.',[{text:'Cancel',style:'cancel'},{text:'Adopt',onPress:()=>run(()=>api.post('/admin-conduct/documents/'+d.id+'/adopt',{confirm:true}))}])}/></PremiumCard>)}</>:null}
  {reviewer?<><PremiumSectionTitle title="Recruitment submissions" subtitle="Read the signed document pack before accepting it or returning it for correction."/>{!queue.length?<EmptyPanel title="No submissions awaiting display"/>:null}{queue.map(s=><PremiumCard key={s.id} style={styles.card}><AppText style={styles.heading}>{s.full_name}</AppText><AppText style={styles.meta}>{s.user_type.replace(/_/g,' ')} · Version {s.version}</AppText><StatusPill label={s.status.replace(/_/g,' ')} color={s.status==='accepted'?colors.success:colors.warning}/><Button title="Read signed document pack" variant="secondary" disabled={busy} onPress={()=>run(()=>download('/admin-conduct/'+s.id+'/signed-copy','Signed-Code-of-Conduct.zip','application/zip'))}/>{['accepted','returned'].map(status=><Button key={status} title={status==='accepted'?'Accept':'Return for correction'} variant={status==='accepted'?'primary':'secondary'} disabled={busy||s.status==='accepted'||Number(s.user_id)===Number(user.id)} onPress={()=>setDecision({submission:s,status})}/>)}</PremiumCard>)}</>:null}
  </PremiumScreen><OperationNoteModal visible={Boolean(decision)} title="Record Recruitment decision" message="Explain the evidence you reviewed. The note is kept with this submission." label="Recruitment review note" minLength={5} maxLength={2000} loading={busy} onCancel={()=>setDecision(null)} onConfirm={async note=>{if(await run(()=>api.post('/admin-conduct/'+decision.submission.id+'/review',{status:decision.status,note})))setDecision(null);}}/>{NativePaystackCheckoutModal}</>;
}
const styles=StyleSheet.create({page:{gap:16},card:{gap:12,marginBottom:0},heading:{color:colors.ink,fontFamily:typography.semibold,fontSize:typeScale.base,lineHeight:24},body:{color:colors.text,fontSize:typeScale.reading,lineHeight:23},meta:{color:colors.muted,fontSize:typeScale.sm,lineHeight:21},notice:{color:colors.navySoft,backgroundColor:colors.surfaceBlue,padding:12,borderRadius:12,fontSize:typeScale.reading,lineHeight:23},consent:{flexDirection:'row',alignItems:'flex-start',gap:10,padding:12,borderWidth:1,borderColor:colors.border,borderRadius:12}});
