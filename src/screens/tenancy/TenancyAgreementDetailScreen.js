import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { AuthContext } from '../../context/AuthContext';
import {
  tenancyAgreementService,
  tenancyAgreementStatusVisual,
  TENANCY_AGREEMENT_STATUS_LABELS,
} from '../../services/tenancyAgreementService';
import { colors, radius, typography } from '../../theme';
import { getErrorMessage, pickObject } from '../../utils/http';

import AppText from '../../components/common/AppText';

const formatCurrency = (value) =>
  `₦${Number(value || 0).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' });
};

const EVENT_LABELS = {
  AGREEMENT_CREATED: 'Agreement created',
  AGREEMENT_SENT_TO_LANDLORD: 'Sent to landlord',
  LANDLORD_ACCEPTED_TERMS: 'Landlord accepted terms',
  LANDLORD_SIGNED: 'Landlord signed',
  AGREEMENT_SENT_TO_TENANT: 'Sent to tenant',
  TENANT_ACCEPTED_TERMS: 'Tenant accepted terms',
  TENANT_SIGNED: 'Tenant signed',
  AGREEMENT_FULLY_EXECUTED: 'Agreement fully executed',
  AGREEMENT_DECLINED: 'Agreement declined',
  AMENDMENT_REQUESTED: 'Amendment requested',
  NEW_VERSION_CREATED: 'New version created',
};

const Row = ({ label, value }) => (
  <View style={styles.row}>
    <AppText style={styles.rowLabel}>{label}</AppText>
    <AppText style={styles.rowValue}>{value || '—'}</AppText>
  </View>
);

const TenancyAgreementDetailScreen = ({ route, navigation }) => {
  const { id } = route.params || {};
  const { user } = useContext(AuthContext);
  const role = user?.user_type === 'landlord' ? 'landlord' : user?.user_type === 'tenant' ? 'tenant' : null;

  const [agreement, setAgreement] = useState(null);
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState('');
  const [consent, setConsent] = useState(false);
  const [signatoryName, setSignatoryName] = useState(user?.full_name || '');
  const [declineReason, setDeclineReason] = useState('');

  const load = useCallback(async ({ refresh = false } = {}) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const [detailResponse, auditResponse] = await Promise.all([
        tenancyAgreementService.getById(id),
        tenancyAgreementService.getAudit(id),
      ]);
      setAgreement(pickObject(detailResponse, ['data']));
      setAudit(Array.isArray(auditResponse?.data) ? auditResponse.data : []);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Could not load agreement',
        text2: getErrorMessage(error, 'Please try again.'),
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const terms = agreement?.terms || {};
  const signatures = useMemo(() => agreement?.signatures || [], [agreement]);

  const canReview = role && (
    (role === 'landlord' && agreement?.status === 'PENDING_LANDLORD_REVIEW') ||
    (role === 'tenant' && agreement?.status === 'PENDING_TENANT_REVIEW')
  );
  const canSign = role && (
    (role === 'landlord' && agreement?.status === 'PENDING_LANDLORD_SIGNATURE') ||
    (role === 'tenant' && agreement?.status === 'PENDING_TENANT_SIGNATURE')
  );
  const canDecline = role && agreement && [
    'PENDING_LANDLORD_REVIEW',
    'PENDING_LANDLORD_SIGNATURE',
    'PENDING_TENANT_REVIEW',
    'PENDING_TENANT_SIGNATURE',
  ].includes(agreement.status);

  const run = async (label, fn, successMessage) => {
    setBusy(label);
    try {
      await fn();
      Toast.show({ type: 'success', text1: successMessage });
      await load({ refresh: true });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Not confirmed',
        text2: getErrorMessage(error, 'Your signature was not confirmed. Please reconnect and try again.'),
      });
    } finally {
      setBusy('');
    }
  };

  const handleReview = () =>
    run('review', () => tenancyAgreementService.review(id, role), 'Agreement reviewed');

  const handleSign = () => {
    if (!consent) {
      Toast.show({ type: 'error', text1: 'Please confirm you reviewed the agreement' });
      return;
    }
    if (!String(signatoryName).trim()) {
      Toast.show({ type: 'error', text1: 'Please enter your full name' });
      return;
    }
    Alert.alert(
      'Sign agreement?',
      'Your electronic signature will be recorded with a timestamp and the document hash.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign',
          onPress: () =>
            run(
              'sign',
              () => tenancyAgreementService.sign(id, { role, consent: true, signatoryName: String(signatoryName).trim() }),
              'Agreement signed'
            ),
        },
      ]
    );
  };

  const handleDecline = () => {
    if (!declineReason.trim()) {
      Toast.show({ type: 'error', text1: 'Please provide a reason' });
      return;
    }
    Alert.alert('Decline agreement?', 'This will be shown to the other party.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline',
        style: 'destructive',
        onPress: () => run('decline', () => tenancyAgreementService.decline(id, { role, reason: declineReason.trim() }), 'Agreement declined'),
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={colors.blue} size="large" />
        <AppText style={styles.loadingText}>Loading agreement…</AppText>
      </SafeAreaView>
    );
  }

  if (!agreement) {
    return (
      <SafeAreaView style={styles.center}>
        <Icon name="alert-circle-outline" size={34} color={colors.muted} />
        <AppText style={styles.emptyTitle}>Agreement unavailable</AppText>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <AppText style={styles.backButtonText}>Go back</AppText>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const visual = tenancyAgreementStatusVisual(agreement.status);

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack}>
          <Icon name="chevron-back" size={22} color={colors.ink} />
        </TouchableOpacity>
        <AppText style={styles.headerTitle} numberOfLines={1}>Tenancy agreement</AppText>
        <View style={styles.headerIcon}>
          <Icon name="document-text-outline" size={20} color={colors.blue} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl colors={[colors.blue]} onRefresh={() => load({ refresh: true })} refreshing={refreshing} tintColor={colors.blue} />}
        showsVerticalScrollIndicator={false}>

        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View style={[styles.statusIcon, { backgroundColor: visual.bg }]}>
              <Icon name={visual.icon} size={20} color={visual.color} />
            </View>
            <View style={styles.cardHeading}>
              <AppText style={styles.cardTitle} numberOfLines={2}>{agreement.property_title || 'Property'}</AppText>
              <AppText style={styles.cardMeta}>{agreement.full_address || '—'}</AppText>
            </View>
          </View>
          <View style={[styles.statusPill, { backgroundColor: visual.bg }]}>
            <AppText style={[styles.statusText, { color: visual.color }]}>
              {TENANCY_AGREEMENT_STATUS_LABELS[agreement.status] || agreement.status}
            </AppText>
          </View>
        </View>

        <View style={styles.section}>
          <AppText style={styles.sectionTitle}>Summary</AppText>
          <Row label="Agreement ID" value={`#${agreement.id}`} />
          <Row label="Version" value={String(agreement.current_version)} />
          <Row label="Jurisdiction" value={[terms.state, terms.lga].filter(Boolean).join(' · ')} />
          <Row label="Rent" value={formatCurrency(terms.rentAmount)} />
          <Row label="Commencement" value={formatDate(terms.commencementDate)} />
          <Row label="Expiry" value={formatDate(terms.expiryDate)} />
          <Row label="Deposit" value={formatCurrency(terms.deposit)} />
          <Row label="Notice period" value={`${terms.noticeConfiguration?.noticePeriodDays ?? '—'} days`} />
          {terms.tenancyLawReference ? <Row label="Governing law" value={terms.tenancyLawReference} /> : null}
        </View>

        {Array.isArray(terms.statutoryClauses) && terms.statutoryClauses.length > 0 ? (
          <View style={styles.section}>
            <AppText style={styles.sectionTitle}>Clauses</AppText>
            {terms.statutoryClauses.map((clause, index) => (
              <AppText key={index} style={styles.clause}>• {clause}</AppText>
            ))}
          </View>
        ) : null}

        <View style={styles.section}>
          <AppText style={styles.sectionTitle}>Signatures</AppText>
          {signatures.length === 0 ? (
            <AppText style={styles.mutedText}>No signatures recorded yet.</AppText>
          ) : signatures.map((signature) => (
            <View key={signature.id} style={styles.signatureRow}>
              <Icon name="checkmark-circle" size={18} color={colors.success} />
              <View style={styles.signatureBody}>
                <AppText style={styles.signatureRole}>{String(signature.signer_role).toUpperCase()}</AppText>
                <AppText style={styles.signatureMeta}>
                  {signature.signatory_name} · {formatDate(signature.signed_at)}
                </AppText>
              </View>
            </View>
          ))}
        </View>

        {(canReview || canSign || canDecline) ? (
          <View style={styles.actionCard}>
            <AppText style={styles.actionTitle}>Your action</AppText>
            <AppText style={styles.actionHint}>
              Signing is an electronic execution recorded with a timestamp, your account and the document hash.
            </AppText>

            {canReview ? (
              <TouchableOpacity disabled={busy === 'review'} onPress={handleReview} style={styles.primaryButton}>
                {busy === 'review' ? <ActivityIndicator color={colors.white} size="small" /> : (
                  <>
                    <AppText style={styles.primaryButtonText}>I have reviewed the agreement</AppText>
                    <Icon name="checkmark" size={17} color={colors.white} />
                  </>
                )}
              </TouchableOpacity>
            ) : null}

            {canSign ? (
              <View style={styles.signBlock}>
                <AppText style={styles.inputLabel}>Full name</AppText>
                <TextInput
                  value={signatoryName}
                  onChangeText={setSignatoryName}
                  placeholder="Your full name"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                  autoCorrect={false}
                />
                <TouchableOpacity onPress={() => setConsent((current) => !current)} style={styles.consentRow}>
                  <Icon name={consent ? 'checkbox' : 'square-outline'} size={22} color={consent ? colors.success : colors.muted} />
                  <AppText style={styles.consentText}>
                    I confirm that I have reviewed this agreement and agree to sign it electronically.
                  </AppText>
                </TouchableOpacity>
                <TouchableOpacity disabled={busy === 'sign'} onPress={handleSign} style={styles.signButton}>
                  {busy === 'sign' ? <ActivityIndicator color={colors.white} size="small" /> : (
                    <>
                      <AppText style={styles.primaryButtonText}>Sign agreement</AppText>
                      <Icon name="create" size={17} color={colors.white} />
                    </>
                  )}
                </TouchableOpacity>
                <AppText style={styles.offlineHint}>
                  If your connection drops, your signature will not be recorded — reconnect and try again.
                </AppText>
              </View>
            ) : null}

            {canDecline ? (
              <View style={styles.declineBlock}>
                <AppText style={styles.inputLabel}>Decline reason</AppText>
                <TextInput
                  value={declineReason}
                  onChangeText={setDeclineReason}
                  placeholder="Reason for declining"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                />
                <TouchableOpacity disabled={busy === 'decline'} onPress={handleDecline} style={styles.declineButton}>
                  {busy === 'decline' ? <ActivityIndicator color={colors.danger} size="small" /> : (
                    <AppText style={styles.declineButtonText}>Decline agreement</AppText>
                  )}
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.section}>
          <AppText style={styles.sectionTitle}>History</AppText>
          {audit.length === 0 ? (
            <AppText style={styles.mutedText}>No activity recorded yet.</AppText>
          ) : audit.map((event) => (
            <View key={event.id} style={styles.historyRow}>
              <View style={styles.historyDot} />
              <View style={styles.historyBody}>
                <AppText style={styles.historyTitle}>
                  {EVENT_LABELS[event.event_type] || event.event_type}{event.version ? ` · v${event.version}` : ''}
                </AppText>
                <AppText style={styles.historyMeta}>
                  {formatDate(event.created_at)}{event.actor_role ? ` · ${event.actor_role}` : ''}
                </AppText>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.surface, flex: 1 },
  header: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  headerBack: { alignItems: 'center', height: 36, justifyContent: 'center', width: 36 },
  headerTitle: { color: colors.ink, flex: 1, fontFamily: typography.bold, fontSize: 17, textAlign: 'center' },
  headerIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  content: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 15,
  },
  cardTop: { alignItems: 'flex-start', flexDirection: 'row' },
  statusIcon: { alignItems: 'center', borderRadius: 20, height: 40, justifyContent: 'center', width: 40 },
  cardHeading: { flex: 1, marginLeft: 11 },
  cardTitle: { color: colors.ink, fontFamily: typography.bold, fontSize: 17, lineHeight: 21 },
  cardMeta: { color: colors.muted, fontFamily: typography.regular, fontSize: 13, marginTop: 4 },
  statusPill: { alignSelf: 'flex-start', borderRadius: radius.pill, marginTop: 12, paddingHorizontal: 10, paddingVertical: 6 },
  statusText: { fontFamily: typography.bold, fontSize: 12, textTransform: 'uppercase' },
  section: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: 14,
    padding: 15,
  },
  sectionTitle: { color: colors.ink, fontFamily: typography.bold, fontSize: 16, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  rowLabel: { color: colors.muted, flex: 1, fontFamily: typography.regular, fontSize: 13 },
  rowValue: { color: colors.ink, flex: 1.3, fontFamily: typography.semibold, fontSize: 13, textAlign: 'right' },
  clause: { color: colors.text, fontFamily: typography.regular, fontSize: 13, lineHeight: 19, marginBottom: 6 },
  mutedText: { color: colors.muted, fontFamily: typography.regular, fontSize: 13 },
  signatureRow: { alignItems: 'center', flexDirection: 'row', marginBottom: 10 },
  signatureBody: { flex: 1, marginLeft: 9 },
  signatureRole: { color: colors.ink, fontFamily: typography.bold, fontSize: 13 },
  signatureMeta: { color: colors.muted, fontFamily: typography.regular, fontSize: 12, marginTop: 2 },
  actionCard: {
    backgroundColor: '#FFF9EC',
    borderColor: '#F2D9A6',
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: 14,
    padding: 15,
  },
  actionTitle: { color: '#7A4A00', fontFamily: typography.bold, fontSize: 16 },
  actionHint: { color: '#7A4A00', fontFamily: typography.regular, fontSize: 12, lineHeight: 18, marginTop: 6 },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.blue,
    borderRadius: radius.sm,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    marginTop: 13,
    minHeight: 46,
  },
  primaryButtonText: { color: colors.white, fontFamily: typography.semibold, fontSize: 14 },
  signBlock: { marginTop: 13 },
  inputLabel: { color: '#7A4A00', fontFamily: typography.semibold, fontSize: 12, marginBottom: 5 },
  input: {
    backgroundColor: colors.white,
    borderColor: '#E4CD9A',
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.ink,
    fontFamily: typography.regular,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  consentRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 8, marginTop: 12 },
  consentText: { color: '#7A4A00', flex: 1, fontFamily: typography.regular, fontSize: 12, lineHeight: 18 },
  signButton: {
    alignItems: 'center',
    backgroundColor: colors.success,
    borderRadius: radius.sm,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    marginTop: 13,
    minHeight: 46,
  },
  offlineHint: { color: '#8A6A2A', fontFamily: typography.regular, fontSize: 11, marginTop: 8 },
  declineBlock: { borderTopColor: '#F2D9A6', borderTopWidth: 1, marginTop: 16, paddingTop: 14 },
  declineButton: {
    alignItems: 'center',
    borderColor: '#F0B4AE',
    borderRadius: radius.sm,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: 12,
    minHeight: 44,
  },
  declineButtonText: { color: colors.danger, fontFamily: typography.semibold, fontSize: 14 },
  historyRow: { flexDirection: 'row', marginBottom: 11 },
  historyDot: { backgroundColor: colors.border, borderRadius: 4, height: 8, marginTop: 5, width: 8 },
  historyBody: { flex: 1, marginLeft: 10 },
  historyTitle: { color: colors.ink, fontFamily: typography.semibold, fontSize: 13 },
  historyMeta: { color: colors.muted, fontFamily: typography.regular, fontSize: 12, marginTop: 2 },
  center: { alignItems: 'center', backgroundColor: colors.surface, flex: 1, justifyContent: 'center', padding: 24 },
  loadingText: { color: colors.muted, fontFamily: typography.medium, fontSize: 13, marginTop: 12 },
  emptyTitle: { color: colors.ink, fontFamily: typography.bold, fontSize: 18, marginTop: 14 },
  backButton: {
    backgroundColor: colors.blue,
    borderRadius: radius.pill,
    marginTop: 18,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  backButtonText: { color: colors.white, fontFamily: typography.semibold, fontSize: 13 },
});

export default TenancyAgreementDetailScreen;
