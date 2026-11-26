import React, { useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import Toast from 'react-native-toast-message';
import { AuthContext } from '../../context/AuthContext';
import AppText from '../../components/common/AppText';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import SelectField from '../../components/common/SelectField';
import OptionPickerModal from '../../components/common/OptionPickerModal';
import EmptyState from '../../components/common/EmptyState';
import StatusBadge from '../../components/common/StatusBadge';
import OperationNoteModal from '../../components/admin/OperationNoteModal';
import MyStaffIdentityScreen from '../shared/MyStaffIdentityScreen';
import staffVerificationService, { resolveStaffPhotoUrl } from '../../services/staffVerificationService';
import { getErrorMessage } from '../../utils/http';
import { actionsForStatus, canManageStaff, freshForm, identityPayload } from '../../utils/staffIdentityManagement.cjs';
import { colors, radius, typography, typeScale } from '../../theme';

const PAGE_SIZE = 50;
const statuses = ['', 'pending_approval', 'active', 'suspended', 'revoked', 'rejected'];
const label = value => String(value || '').replace(/_/g, ' ').replace(/^./, character => character.toUpperCase());
const date = value => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString() : 'Not recorded';
const unwrap = response => {
  if (!response.data?.success || response.data.data === undefined) throw Error(response.data?.message || 'The staff identity request could not be completed.');
  return response.data.data;
};

// Old saved links remain useful, but never show personal enrolment to Super Admin.
export function StaffIdentityEntryScreen(props) {
  const { user } = useContext(AuthContext);
  const manager = canManageStaff(user);
  useLayoutEffect(() => { props.navigation.setOptions({ title: manager ? 'Staff Identity Management' : 'My Staff Identity' }); }, [manager, props.navigation]);
  return manager ? <StaffIdentityManagementScreen {...props} /> : <MyStaffIdentityScreen {...props} />;
}

export default function StaffIdentityManagementScreen({ navigation }) {
  const { user, isImpersonating } = useContext(AuthContext);
  const allowed = canManageStaff(user), scope = `${user?.id}:${user?.user_type}`;
  const scopeRef = useRef(scope); scopeRef.current = scope;
  const alive = useRef(true), sequence = useRef(0), userSequence = useRef(0), busyRef = useRef(false);
  const [tab, setTab] = useState('identities'), [loadedTab, setLoadedTab] = useState('');
  const [catalog, setCatalog] = useState(null), [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [search, setSearch] = useState(''), [status, setStatus] = useState('');
  const [filters, setFilters] = useState({ search: '', status: '' });
  const [hasMore, setHasMore] = useState(false), [offset, setOffset] = useState(0);
  const [editor, setEditor] = useState(null), [form, setForm] = useState(freshForm), [formError, setFormError] = useState('');
  const [users, setUsers] = useState([]), [userSearch, setUserSearch] = useState(''), [usersLoading, setUsersLoading] = useState(false);
  const [picker, setPicker] = useState(null), [decision, setDecision] = useState(null);
  const validScope = () => alive.current && scopeRef.current === scope;
  const writable = allowed && !isImpersonating;

  useEffect(() => { alive.current = true; return () => { alive.current = false; sequence.current++; }; }, []);

  const load = useCallback(async (append = false, nextOffset = 0) => {
    if (!allowed) return;
    const request = ++sequence.current;
    setLoading(true); setError('');
    try {
      const [meta, response] = await Promise.all([
        staffVerificationService.getAdminCatalog(),
        tab === 'identities' ? staffVerificationService.listIdentities({ ...filters, limit: PAGE_SIZE, offset: nextOffset }) :
          tab === 'history' ? staffVerificationService.getAdminHistory() : staffVerificationService.listImpersonationReports(),
      ]);
      const data = unwrap(response), settings = unwrap(meta);
      if (!alive.current || scopeRef.current !== scope || request !== sequence.current) return;
      const list = tab === 'history' ? [
        ...(data.events || []).map(item => ({ ...item, _kind: 'event' })),
        ...(data.challenges || []).map(item => ({ ...item, _kind: 'challenge' })),
        ...(data.suspicious_activity || []).map(item => ({ ...item, _kind: 'suspicious' })),
      ] : data;
      if (!Array.isArray(list)) throw Error('The staff identity response was not a list.');
      setCatalog(settings); setLoadedTab(tab);
      setRows(previous => append ? [...new Map([...previous, ...list].map(item => [String(item.id), item])).values()] : list);
      setOffset(nextOffset + list.length); setHasMore(tab === 'identities' && list.length === PAGE_SIZE);
    } catch (err) {
      if (alive.current && scopeRef.current === scope && request === sequence.current) setError(getErrorMessage(err, 'Could not load staff identity management.'));
    } finally { if (alive.current && scopeRef.current === scope && request === sequence.current) setLoading(false); }
  }, [allowed, scope, tab, filters]);

  useEffect(() => {
    setRows([]); setLoadedTab(''); setEditor(null); setDecision(null); setPicker(null); setUsers([]);
    if (allowed) void load();
    return () => { sequence.current++; };
  }, [load, allowed]);

  const findUsers = async () => {
    if (!writable || usersLoading) return;
    const request = ++userSequence.current;
    setUsersLoading(true); setFormError('');
    try { const found = unwrap(await staffVerificationService.getEligibleUsers(userSearch)); if (validScope() && request === userSequence.current) setUsers(Array.isArray(found) ? found : []); }
    catch (err) { if (validScope() && request === userSequence.current) setFormError(getErrorMessage(err, 'Could not search staff accounts.')); }
    finally { if (validScope() && request === userSequence.current) setUsersLoading(false); }
  };

  const perform = async operation => {
    if (!writable || !validScope() || busyRef.current) return false;
    busyRef.current = true; setBusy(true); setFormError('');
    try {
      unwrap(await operation());
      if (!validScope()) return false;
      Toast.show({ type: 'success', text1: 'Staff identity updated' });
      setDecision(null); setEditor(null); await load(); return true;
    } catch (err) {
      if (validScope()) { const message = getErrorMessage(err, 'Could not save this change.'); setFormError(message); Toast.show({ type: 'error', text1: 'Could not save', text2: message }); }
      return false;
    } finally { busyRef.current = false; if (validScope()) setBusy(false); }
  };

  const saveIdentity = async () => {
    try {
      const body = identityPayload(form, catalog || {}, editor?.creating);
      await perform(() => editor.creating ? staffVerificationService.createIdentity(body) : staffVerificationService.updateIdentity(editor.id, body));
    } catch (err) { setFormError(err.message); }
  };

  const photo = async identity => {
    if (!writable || busyRef.current) return;
    let asset;
    try {
      const picked = await DocumentPicker.getDocumentAsync({ type: ['image/jpeg', 'image/png', 'image/webp'], copyToCacheDirectory: true, multiple: false });
      if (picked.canceled || !validScope()) return;
      asset = picked.assets?.[0];
      if (!asset) throw Error('Select a photograph.');
      if (asset.size > 3 * 1024 * 1024) throw Error('Choose a photograph no larger than 3 MB.');
      const mimeType = asset.mimeType || ({ jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }[asset.name?.split('.').pop()?.toLowerCase()]);
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) throw Error('Choose a JPEG, PNG or WebP photograph.');
      await perform(() => staffVerificationService.uploadIdentityPhoto(identity.id, { ...asset, mimeType }));
    } catch (err) { if (validScope()) Toast.show({ type: 'error', text1: 'Photo not saved', text2: getErrorMessage(err, 'Could not upload this photograph.') }); }
    finally { if (asset?.uri?.startsWith(`${Paths.cache.uri.replace(/\/$/, '')}/`)) { try { new File(asset.uri).delete(); } catch {} } }
  };

  const confirmDecision = note => {
    const chosen = decision;
    if (!chosen) return;
    if (chosen.kind === 'regenerate') return perform(() => staffVerificationService.regenerateIdentityId(chosen.record.id));
    if (chosen.kind === 'report') return perform(() => staffVerificationService.updateImpersonationReport(chosen.record.id, {
      status: chosen.action, investigation_notes: [chosen.record.investigation_notes, note].filter(Boolean).join('\n'),
    }));
    return perform(() => staffVerificationService.updateIdentityStatus(chosen.record.id, chosen.action, note));
  };

  const edit = record => { userSequence.current++; setUsersLoading(false); setFormError(''); setUserSearch(''); setUsers([]); setForm(freshForm(record || {})); setEditor(record ? { ...record, creating: false } : { creating: true }); };
  const button = (title, onPress, disabled = false) => <Button key={title} title={title} onPress={onPress} disabled={disabled || busy} variant="outline" style={styles.actionButton} />;

  if (!allowed) return <View style={styles.restricted}><EmptyState title="Super Admin access required" message="Staff Identity Management is available only to Super Admin." /></View>;

  const renderIdentity = item => <View style={styles.card}>
    <View style={styles.identityHeading}>
      {resolveStaffPhotoUrl(item.official_photo_url) ? <Image source={{ uri: resolveStaffPhotoUrl(item.official_photo_url) }} style={styles.photo} accessibilityLabel="Official staff photograph" /> : null}
      <View style={styles.grow}><AppText style={styles.name}>{item.full_name}</AppText><AppText selectable style={styles.code}>{item.staff_verification_id}</AppText><AppText style={styles.copy}>{item.official_role} · {item.department}</AppText></View>
    </View>
    <View style={styles.tags}><StatusBadge status={item.status} /><AppText style={styles.small}>{item.engagement_type_label || label(item.engagement_type)}</AppText></View>
    <AppText style={styles.small}>{item.account_email || 'No account email recorded'}</AppText>
    <AppText style={styles.copy}>Valid from: {date(item.valid_from)}{ '\n' }Expires: {item.expires_at ? date(item.expires_at) : 'No expiry set'}</AppText>
    <AppText style={styles.small}>Current verification: {label(item.effective_state || item.status)}</AppText>
    <AppText style={styles.copy}>Approved activities: {(item.approved_activities_detailed || []).map(activity => activity.label).join('; ') || 'None assigned'}</AppText>
    <AppText style={styles.small}>Financial collection authorised: {item.financial_collection_authorized ? 'Yes — approved channels only' : 'No'}</AppText>
    {item.status_reason ? <AppText style={styles.note}>{item.status_reason}</AppText> : null}
    <View style={styles.actions}>
      {button('Edit', () => edit(item), !writable)}
      {button('Official photo', () => photo(item), !writable)}
      {actionsForStatus(item.status).map(action => button(label(action), () => setDecision({ kind: 'status', record: item, action }), !writable))}
      {button('Regenerate ID', () => setDecision({ kind: 'regenerate', record: item }), !writable)}
      {button('View public verification', () => navigation.navigate('VerifyStaffDetail', { staffId: item.staff_verification_id }))}
    </View>
  </View>;

  const renderHistory = item => <View style={styles.card}>
    <AppText style={styles.name}>{item._kind === 'suspicious' ? 'Suspicious activity' : item._kind === 'challenge' ? 'Live verification request' : label(item.event_type)}</AppText>
    <AppText style={styles.copy}>{item.staff_name || 'Staff identity event'}{item.staff_verification_id ? ` · ${item.staff_verification_id}` : ''}</AppText>
    <AppText style={styles.small}>{date(item.created_at || item.last_seen)}</AppText>
    {item._kind === 'suspicious' ? <AppText style={styles.copy}>IP: {item.ip_address}{'\n'}Failed lookups: {item.failed_lookups} · Rejected challenges: {item.rejected_challenges} · Wrong staff attempts: {item.wrong_staff_attempts}</AppText> : <>
      <AppText style={styles.copy}>{item.purpose || item.actor_name || 'System event'}</AppText>
      <AppText style={styles.small}>{label(item.outcome || item.status)}</AppText>
      {item.challenge_reference ? <AppText selectable style={styles.code}>{item.challenge_reference}</AppText> : null}
    </>}
  </View>;

  const renderReport = item => <View style={styles.card}>
    <AppText style={styles.name}>{item.report_reference}</AppText><StatusBadge status={item.status} />
    <AppText style={styles.copy}>{label(item.category)} · {item.linked_staff_name || item.claimed_name || 'Unidentified person'}</AppText>
    <AppText style={styles.copy}>{item.description}</AppText>
    <AppText style={styles.small}>Staff ID claimed: {item.reported_staff_id || 'Not provided'}{'\n'}Location: {item.incident_location || 'Not provided'}</AppText>
    <AppText style={styles.small}>Reporter (confidential): {item.reporter_name || 'Anonymous'}{item.reporter_contact ? ` · ${item.reporter_contact}` : ''}</AppText>
    <AppText style={styles.small}>{date(item.created_at)}{item.reviewed_by_name ? ` · Reviewed by ${item.reviewed_by_name}` : ''}</AppText>
    {item.investigation_notes ? <AppText style={styles.note}>{item.investigation_notes}</AppText> : null}
    <View style={styles.actions}>{['investigating', 'resolved', 'dismissed', 'open'].filter(next => next !== item.status).map(next => button({ investigating: 'Mark investigating', resolved: 'Mark resolved', dismissed: 'Dismiss report', open: 'Reopen report' }[next], () => setDecision({ kind: 'report', record: item, action: next }), !writable))}</View>
  </View>;

  const header = <View style={styles.header}>
    <AppText style={styles.eyebrow}>SUPER ADMIN GOVERNANCE</AppText>
    <AppText style={styles.title}>Staff Identity Management</AppText>
    <AppText style={styles.copy}>Manage official staff IDs, approved activities and impersonation investigations. This is not personal staff enrolment.</AppText>
    <AppText style={styles.notice}>A staff ID does not allow payments into a personal account. Use RentalHub’s approved payment channels.</AppText>
    {isImpersonating ? <AppText style={styles.notice}>Return to your own Super Admin account to make changes.</AppText> : null}
    <View style={styles.actions}>{['identities', 'history', 'reports'].map(value => <Button key={value} title={{ identities: 'Staff IDs', history: 'History', reports: 'Reports' }[value]} onPress={() => setTab(value)} disabled={busy} variant={value === tab ? 'primary' : 'outline'} style={styles.actionButton} />)}</View>
    {tab === 'identities' ? <>
      <Input label="Search staff IDs" value={search} onChangeText={setSearch} placeholder="Name, staff ID, role, department or email" compact />
      <SelectField label="Status" value={status ? label(status) : 'All statuses'} onPress={() => setPicker('status')} compact />
      <View style={styles.actions}>{button('Apply filters', () => setFilters({ search: search.trim(), status }))}{button('Register staff identity', () => edit(null), !writable || !catalog)}</View>
    </> : <AppText style={styles.small}>{tab === 'history' ? 'Latest 100 events and live challenges, plus suspicious activity in the last 24 hours.' : 'Latest 100 impersonation reports. Record investigation notes when changing a report.'}</AppText>}
    {error ? <View accessibilityRole="alert"><AppText style={styles.error}>{error}</AppText>{button('Retry', () => load())}</View> : null}
  </View>;

  const pickerOptions = picker === 'status' ? statuses.map(value => ({ value, label: value ? label(value) : 'All statuses' })) : picker === 'engagement' ? Object.entries(catalog?.engagement_types || {}).map(([value, text]) => ({ value, label: text })) : users.map(item => ({ value: String(item.id), label: `${item.full_name} · ${item.email} · ${label(item.user_type)}` }));

  const renderPicker = () => (<OptionPickerModal visible={!!picker} title={picker === 'user' ? 'Choose staff account' : picker === 'engagement' ? 'Engagement type' : 'Filter status'} options={pickerOptions}
      selectedValue={picker === 'status' ? status : picker === 'engagement' ? form.engagement_type : form.user_id} searchable={picker === 'user'}
      onClose={() => setPicker(null)} onSelect={item => {
        if (picker === 'status') setStatus(item.value);
        else if (picker === 'engagement') setForm(previous => ({ ...previous, engagement_type: item.value }));
        else { const selected = users.find(record => String(record.id) === item.value); setForm(previous => ({ ...previous, user_id: item.value, full_name: selected?.full_name || previous.full_name })); }
      }} />);

  return <View style={styles.screen}>
    <FlatList data={loadedTab === tab ? rows : []} keyExtractor={(item, index) => `${tab}:${item._kind || ''}:${item.id || item.ip_address || index}`} ListHeaderComponent={header}
      contentContainerStyle={styles.list} renderItem={({ item }) => tab === 'identities' ? renderIdentity(item) : tab === 'history' ? renderHistory(item) : renderReport(item)}
      refreshing={loading} onRefresh={() => load()} keyboardShouldPersistTaps="handled"
      ListEmptyComponent={!loading && !error ? <EmptyState title="No records to show" message="Try another filter or register an eligible staff account." /> : null}
      ListFooterComponent={loading ? <ActivityIndicator color={colors.blue} style={styles.spinner} /> : hasMore && tab === 'identities' ? <Button title="Load more staff IDs" onPress={() => load(true, offset)} variant="outline" /> : null} />

    <Modal visible={!!editor} animationType="slide" onRequestClose={() => { if (!busy) setEditor(null); }}>
      <SafeAreaView style={styles.screen}>
        <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
            <AppText style={styles.title}>{editor?.creating ? 'Register staff identity' : 'Edit staff identity'}</AppText>
            <AppText style={styles.copy}>Use an existing staff account. New staff identities start as Pending Approval.</AppText>
            {editor?.creating ? <>
              <Input label="Find an existing staff account" value={userSearch} onChangeText={setUserSearch} compact />
              <Button title={usersLoading ? 'Searching…' : 'Search staff accounts'} onPress={findUsers} disabled={usersLoading || busy} variant="outline" />
              <SelectField label="Staff account" value={users.find(item => String(item.id) === form.user_id)?.full_name || (form.user_id ? `Account ${form.user_id}` : '')} placeholder="Search, then choose a staff account" onPress={() => setPicker('user')} disabled={usersLoading || busy} />
            </> : null}
            {['full_name', 'official_role', 'department'].map(key => <Input key={key} label={{ full_name: 'Full registered name', official_role: 'Official role', department: 'Department' }[key]} value={form[key]} onChangeText={value => setForm(previous => ({ ...previous, [key]: value }))} maxLength={key === 'full_name' ? 255 : 150} editable={!busy} compact />)}
            <SelectField label="Engagement type" value={catalog?.engagement_types?.[form.engagement_type]} onPress={() => setPicker('engagement')} disabled={busy} compact />
            <AppText style={styles.name}>Approved activities</AppText>
            {(catalog?.approved_activity_catalog || []).map(activity => <View key={activity.code} style={styles.switchRow}><AppText style={[styles.copy, styles.grow]}>{activity.label}</AppText><Switch accessibilityLabel={activity.label} value={form.approved_activities.includes(activity.code)} disabled={busy} onValueChange={selected => setForm(previous => ({ ...previous, approved_activities: selected ? [...previous.approved_activities, activity.code] : previous.approved_activities.filter(code => code !== activity.code) }))} /></View>)}
            <View style={styles.switchRow}><AppText style={[styles.copy, styles.grow]}>Financial collection authorised through approved channels</AppText><Switch accessibilityLabel="Financial collection authorised" value={form.financial_collection_authorized} disabled={busy} onValueChange={value => setForm(previous => ({ ...previous, financial_collection_authorized: value }))} /></View>
            <Input label="Valid from (YYYY-MM-DD)" value={form.valid_from} onChangeText={value => setForm(previous => ({ ...previous, valid_from: value }))} autoCapitalize="none" maxLength={10} editable={!busy} compact />
            <Input label="Expiry date (optional, YYYY-MM-DD)" value={form.expires_at} onChangeText={value => setForm(previous => ({ ...previous, expires_at: value }))} autoCapitalize="none" maxLength={10} editable={!busy} compact />
            {formError ? <AppText accessibilityRole="alert" style={styles.error}>{formError}</AppText> : null}
            <Button title={busy ? 'Saving…' : editor?.creating ? 'Create pending staff identity' : 'Save staff identity'} onPress={saveIdentity} disabled={busy || !writable || !catalog} />
            <Button title="Cancel" onPress={() => setEditor(null)} disabled={busy} variant="outline" />
          </ScrollView>
        </KeyboardAvoidingView>
        {editor ? renderPicker() : null}
      </SafeAreaView>
    </Modal>
    {!editor ? renderPicker() : null}
    <OperationNoteModal visible={!!decision} title={decision?.kind === 'regenerate' ? 'Regenerate staff ID' : `${label(decision?.action)} ${decision?.kind === 'report' ? 'report' : 'staff identity'}`}
      message={decision?.kind === 'regenerate' ? 'The old Staff Verification ID will stop working. Confirm that a new ID should be generated.' : `Record the reason for this decision: ${decision?.record?.full_name || decision?.record?.report_reference || ''}.`}
      label={decision?.kind === 'report' ? 'Investigation note' : 'Reason'} required={decision?.kind !== 'regenerate'} maxLength={1000} loading={busy} onCancel={() => { if (!busy) setDecision(null); }} onConfirm={confirmDecision} />
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  restricted: { flex: 1, padding: 20, justifyContent: 'center' },
  list: { padding: 16, paddingBottom: 32, gap: 14 },
  header: { gap: 10, marginBottom: 14 },
  eyebrow: { fontSize: typeScale.xs, fontFamily: typography.semibold, color: colors.blue, letterSpacing: 1 },
  title: { fontSize: typeScale.xl, lineHeight: 30, fontFamily: typography.bold, color: colors.navy },
  name: { fontSize: typeScale.base, fontFamily: typography.semibold, color: colors.navy, lineHeight: 24 },
  copy: { fontSize: typeScale.sm, color: colors.text, lineHeight: 22 },
  small: { fontSize: typeScale.xs, color: colors.muted, lineHeight: 19 },
  code: { fontSize: typeScale.sm, fontFamily: typography.semibold, color: colors.blue, lineHeight: 22 },
  card: { padding: 16, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, gap: 10 },
  identityHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  photo: { width: 54, height: 68, borderRadius: 9, backgroundColor: colors.surface },
  grow: { flex: 1, minWidth: 0 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionButton: { flexGrow: 1, flexBasis: 130, minHeight: 44, marginBottom: 0 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  notice: { padding: 12, borderRadius: radius.md, backgroundColor: '#EAF2FF', color: colors.navy, fontSize: typeScale.sm, lineHeight: 21 },
  note: { padding: 12, backgroundColor: colors.surface, borderRadius: 8, color: colors.text, fontSize: typeScale.sm, lineHeight: 21 },
  error: { color: colors.danger, fontSize: typeScale.sm, lineHeight: 22 },
  spinner: { marginVertical: 18 },
});
