import React, { useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { AuthContext } from '../../context/AuthContext';
import { applicationService } from '../../services/applicationService';
import { colors, radius, typography } from '../../theme';
import { getErrorMessage, pickObject } from '../../utils/http';

const money = (value) => `₦${Number(value || 0).toLocaleString()}`;

const pretty = (value = '') =>
  String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const statusVisual = (status = 'pending') => {
  if (['approved', 'accepted'].includes(status)) {
    return { color: colors.success, bg: '#EAF9F2', icon: 'checkmark-circle' };
  }
  if (status === 'rejected') {
    return { color: colors.danger, bg: '#FFF0EF', icon: 'close-circle' };
  }
  if (status === 'withdrawn') {
    return { color: colors.muted, bg: '#EEF1F5', icon: 'remove-circle' };
  }
  return { color: '#B46B00', bg: '#FFF6DD', icon: 'time' };
};

const ApplicationDetailScreen = ({ route, navigation }) => {
  const { user } = useContext(AuthContext);
  const applicationId = route?.params?.id;
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formMode, setFormMode] = useState(null);
  const [offerAmount, setOfferAmount] = useState('');
  const [note, setNote] = useState('');

  const isTenant = user?.user_type === 'tenant';

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const loadApplication = async ({ refresh = false } = {}) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const response = await applicationService.getApplicationById(applicationId);
      setApplication(pickObject(response, ['data']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Could not load application',
        text2: getErrorMessage(error, 'Please try again.'),
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (applicationId) loadApplication();
  }, [applicationId]);

  const negotiationStatus = String(application?.negotiation_status || 'none').toLowerCase();
  const applicationStatus = String(application?.status || 'pending').toLowerCase();
  const visual = statusVisual(applicationStatus);
  const history = useMemo(
    () => Array.isArray(application?.negotiation_history) ? application.negotiation_history : [],
    [application?.negotiation_history]
  );

  const resetForm = () => {
    setFormMode(null);
    setOfferAmount('');
    setNote('');
  };

  const runAction = async (action) => {
    const numericAmount = Number(offerAmount);
    if (['tenant_offer', 'landlord_counter'].includes(action) && (!numericAmount || numericAmount <= 0)) {
      Toast.show({
        type: 'error',
        text1: 'Enter a valid rent amount',
      });
      return;
    }

    setBusy(true);
    try {
      if (action === 'tenant_offer') {
        await applicationService.updateTenantOffer(applicationId, numericAmount, note.trim());
      } else if (action === 'tenant_accept') {
        await applicationService.respondToCounterOffer(applicationId, 'accept', note.trim());
      } else if (action === 'tenant_reject') {
        await applicationService.respondToCounterOffer(applicationId, 'reject', note.trim());
      } else if (action === 'landlord_accept') {
        await applicationService.acceptTenantOffer(applicationId, note.trim());
      } else if (action === 'landlord_counter') {
        await applicationService.counterTenantOffer(applicationId, numericAmount, note.trim());
      } else if (action === 'approve') {
        await applicationService.approveApplication(applicationId);
      } else if (action === 'reject') {
        await applicationService.rejectApplication(applicationId, note.trim());
      } else if (action === 'withdraw') {
        await applicationService.withdrawApplication(applicationId);
      }
      resetForm();
      await loadApplication({ refresh: true });
      Toast.show({ type: 'success', text1: 'Application updated' });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Could not update application',
        text2: getErrorMessage(error, 'Please try again.'),
      });
    } finally {
      setBusy(false);
    }
  };

  const confirmSimpleAction = (action, title, message, destructive = false) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: title.split(' ')[0],
        style: destructive ? 'destructive' : 'default',
        onPress: () => runAction(action),
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={colors.blue} size="large" />
        <Text style={styles.loadingText}>Loading application…</Text>
      </SafeAreaView>
    );
  }

  if (!application) {
    return (
      <SafeAreaView style={styles.center}>
        <Icon name="document-text-outline" size={34} color={colors.blue} />
        <Text style={styles.notFoundTitle}>Application unavailable</Text>
        <Button title="Go back" onPress={() => navigation.goBack()} style={styles.backAction} />
      </SafeAreaView>
    );
  }

  const pending = applicationStatus === 'pending';
  const canTenantOffer = isTenant && pending && ['none', 'declined'].includes(negotiationStatus);
  const canTenantRespond = isTenant && pending && negotiationStatus === 'landlord_countered';
  const canLandlordRespond =
    !isTenant && pending && negotiationStatus === 'tenant_offered';
  const agreed = negotiationStatus === 'agreed';

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityLabel="Go back"
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Icon name="arrow-back" size={22} color={colors.navy} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>APPLICATION #{application.id}</Text>
          <Text style={styles.headerTitle}>Application details</Text>
        </View>
        <TouchableOpacity
          accessibilityLabel="Open property"
          onPress={() =>
            navigation.navigate('PropertyDetail', { id: application.property_id })
          }
          style={styles.backButton}>
          <Icon name="home-outline" size={21} color={colors.navy} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              colors={[colors.blue]}
              onRefresh={() => loadApplication({ refresh: true })}
              refreshing={refreshing}
              tintColor={colors.blue}
            />
          }
          showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <View style={[styles.heroIcon, { backgroundColor: visual.bg }]}>
              <Icon name={visual.icon} size={23} color={visual.color} />
            </View>
            <View style={styles.heroBody}>
              <Text style={styles.heroEyebrow}>CURRENT STATUS</Text>
              <Text style={styles.heroTitle}>{pretty(applicationStatus)}</Text>
              <Text style={styles.heroText}>
                {applicationStatus === 'pending'
                  ? 'This application is still active and awaiting the next step.'
                  : applicationStatus === 'approved'
                    ? 'The landlord approved this rental application.'
                    : applicationStatus === 'rejected'
                      ? 'This application was not approved.'
                      : 'This application has been withdrawn.'}
              </Text>
            </View>
          </View>

          <View style={styles.propertyCard}>
            <View style={styles.propertyHeading}>
              <View style={styles.propertyIcon}>
                <Icon name="home-outline" size={20} color={colors.blue} />
              </View>
              <View style={styles.propertyCopy}>
                <Text style={styles.propertyTitle}>
                  {application.property_title || 'Rental property'}
                </Text>
                <Text style={styles.propertyLocation}>
                  {[application.area, application.city, application.state_name]
                    .filter(Boolean)
                    .join(', ') || 'Location unavailable'}
                </Text>
              </View>
            </View>
            <View style={styles.propertyFacts}>
              <View>
                <Text style={styles.factLabel}>Listed rent</Text>
                <Text style={styles.factValue}>{money(application.rent_amount)}</Text>
              </View>
              <View>
                <Text style={styles.factLabel}>
                  {isTenant ? 'Landlord' : 'Applicant'}
                </Text>
                <Text style={styles.factValue}>
                  {isTenant ? application.landlord_name : application.tenant_name || '—'}
                </Text>
              </View>
            </View>
          </View>

          {application.message ? (
            <View style={styles.noteCard}>
              <Icon name="chatbubble-ellipses-outline" size={19} color={colors.blue} />
              <View style={styles.noteBody}>
                <Text style={styles.noteLabel}>APPLICATION NOTE</Text>
                <Text style={styles.noteText}>{application.message}</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.negotiationHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>RENT NEGOTIATION</Text>
              <Text style={styles.sectionTitle}>{pretty(negotiationStatus)}</Text>
            </View>
            {agreed ? (
              <View style={styles.agreedPill}>
                <Icon name="checkmark" size={13} color={colors.success} />
                <Text style={styles.agreedText}>Agreed</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.offerRow}>
            <View style={styles.offerCard}>
              <Text style={styles.offerLabel}>Tenant offer</Text>
              <Text style={styles.offerValue}>
                {application.proposed_rent ? money(application.proposed_rent) : '—'}
              </Text>
            </View>
            <View style={styles.offerCard}>
              <Text style={styles.offerLabel}>Landlord counter</Text>
              <Text style={styles.offerValue}>
                {application.counter_offer_rent ? money(application.counter_offer_rent) : '—'}
              </Text>
            </View>
          </View>
          {application.agreed_rent ? (
            <View style={styles.agreedCard}>
              <Text style={styles.agreedLabel}>Agreed rent</Text>
              <Text style={styles.agreedValue}>{money(application.agreed_rent)}</Text>
            </View>
          ) : null}

          {history.length ? (
            <View style={styles.timelineCard}>
              <Text style={styles.timelineTitle}>Negotiation history</Text>
              {history.map((event, index) => (
                <View key={event.id || index} style={styles.timelineItem}>
                  <View style={styles.timelineRail}>
                    <View style={styles.timelineDot} />
                    {index < history.length - 1 ? <View style={styles.timelineLine} /> : null}
                  </View>
                  <View style={styles.timelineBody}>
                    <Text style={styles.timelineAction}>{pretty(event.action_type)}</Text>
                    <Text style={styles.timelineMeta}>
                      {event.actor_name || pretty(event.actor_role)}
                      {event.offer_amount ? ` · ${money(event.offer_amount)}` : ''}
                    </Text>
                    {event.note ? <Text style={styles.timelineNote}>{event.note}</Text> : null}
                    <Text style={styles.timelineDate}>
                      {event.created_at ? new Date(event.created_at).toLocaleString() : ''}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {formMode ? (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>
                {formMode === 'tenant_offer'
                  ? 'Propose rent'
                  : formMode === 'landlord_counter'
                    ? 'Send counter-offer'
                    : formMode === 'reject'
                      ? 'Reject application'
                      : 'Add a note'}
              </Text>
              {['tenant_offer', 'landlord_counter'].includes(formMode) ? (
                <Input
                  icon="cash-outline"
                  keyboardType="numeric"
                  label="Rent amount"
                  onChangeText={setOfferAmount}
                  placeholder="Enter amount"
                  value={offerAmount}
                />
              ) : null}
              <Input
                label="Note (optional)"
                multiline
                numberOfLines={3}
                onChangeText={setNote}
                placeholder="Do not include phone numbers"
                value={note}
              />
              <View style={styles.formActions}>
                <Button
                  onPress={resetForm}
                  style={styles.formButton}
                  title="Cancel"
                  variant="outline"
                />
                <Button
                  loading={busy}
                  onPress={() => runAction(formMode)}
                  style={styles.formButton}
                  title="Continue"
                />
              </View>
            </View>
          ) : null}

          {!formMode && pending ? (
            <View style={styles.actionsCard}>
              {canTenantOffer ? (
                <Button title="Make a rent offer" onPress={() => setFormMode('tenant_offer')} />
              ) : null}
              {canTenantRespond ? (
                <>
                  <Button
                    title={`Accept ${money(application.counter_offer_rent)}`}
                    onPress={() => runAction('tenant_accept')}
                    loading={busy}
                  />
                  <Button
                    title="Decline counter-offer"
                    variant="outline"
                    onPress={() =>
                      confirmSimpleAction(
                        'tenant_reject',
                        'Decline offer',
                        'Decline the landlord’s counter-offer?',
                        true
                      )
                    }
                    style={styles.actionSpacing}
                  />
                </>
              ) : null}
              {canLandlordRespond ? (
                <>
                  <Button
                    title={`Accept ${money(application.proposed_rent)}`}
                    onPress={() => runAction('landlord_accept')}
                    loading={busy}
                  />
                  <Button
                    title="Send counter-offer"
                    variant="outline"
                    onPress={() => setFormMode('landlord_counter')}
                    style={styles.actionSpacing}
                  />
                </>
              ) : null}
              {!isTenant && (agreed || negotiationStatus === 'none') ? (
                <Button
                  title="Approve application"
                  onPress={() =>
                    confirmSimpleAction(
                      'approve',
                      'Approve application',
                      'Approve this tenant’s application?'
                    )
                  }
                  loading={busy}
                  style={styles.actionSpacing}
                />
              ) : null}
              {!isTenant ? (
                <Button
                  title="Reject application"
                  variant="outline"
                  onPress={() => setFormMode('reject')}
                  style={styles.actionSpacing}
                />
              ) : (
                <Button
                  title="Withdraw application"
                  variant="outline"
                  onPress={() =>
                    confirmSimpleAction(
                      'withdraw',
                      'Withdraw application',
                      'Withdraw this application permanently?',
                      true
                    )
                  }
                  style={styles.actionSpacing}
                />
              )}
            </View>
          ) : null}

          <View style={styles.safetyCard}>
            <Icon name="shield-checkmark-outline" size={18} color={colors.success} />
            <Text style={styles.safetyText}>
              Keep rent negotiations and payments inside RentalHub for your protection.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.surface, flex: 1 },
  keyboardView: { flex: 1 },
  center: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    flex: 1,
    justifyContent: 'center',
    padding: 25,
  },
  loadingText: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 13,
    marginTop: 12,
  },
  notFoundTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 20,
    marginTop: 13,
  },
  backAction: { marginTop: 18, minWidth: 180 },
  header: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 21,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  headerCopy: { alignItems: 'center', flex: 1 },
  eyebrow: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: 13,
    letterSpacing: 1.25,
  },
  headerTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 20,
    marginTop: 2,
  },
  content: { padding: 18, paddingBottom: 32 },
  hero: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 17,
  },
  heroIcon: {
    alignItems: 'center',
    borderRadius: 23,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  heroBody: { flex: 1, marginLeft: 12 },
  heroEyebrow: {
    color: colors.muted,
    fontFamily: typography.bold,
    fontSize: 13,
    letterSpacing: 1.25,
  },
  heroTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 20,
    marginTop: 2,
  },
  heroText: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 15,
    marginTop: 4,
  },
  propertyCard: {
    backgroundColor: colors.navy,
    borderRadius: radius.lg,
    marginTop: 13,
    padding: 18,
  },
  propertyHeading: { alignItems: 'center', flexDirection: 'row' },
  propertyIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  propertyCopy: { flex: 1, marginLeft: 11 },
  propertyTitle: {
    color: colors.white,
    fontFamily: typography.bold,
    fontSize: 18,
  },
  propertyLocation: {
    color: '#AFC2DF',
    fontFamily: typography.regular,
    fontSize: 13,
    marginTop: 3,
  },
  propertyFacts: {
    borderTopColor: 'rgba(255,255,255,0.12)',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    paddingTop: 14,
  },
  factLabel: { color: '#8FA8CA', fontFamily: typography.medium, fontSize: 13 },
  factValue: {
    color: colors.white,
    fontFamily: typography.semibold,
    fontSize: 13,
    marginTop: 3,
    maxWidth: 145,
  },
  noteCard: {
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceBlue,
    borderColor: '#CFE1FB',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 13,
    padding: 14,
  },
  noteBody: { flex: 1, marginLeft: 9 },
  noteLabel: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: 13,
    letterSpacing: 1.25,
  },
  noteText: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 17,
    marginTop: 4,
  },
  negotiationHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 25,
  },
  sectionEyebrow: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: 13,
    letterSpacing: 1.25,
  },
  sectionTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 20,
    marginTop: 3,
  },
  agreedPill: {
    alignItems: 'center',
    backgroundColor: '#EAF9F2',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  agreedText: { color: colors.success, fontFamily: typography.bold, fontSize: 13 },
  offerRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  offerCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    padding: 14,
  },
  offerLabel: { color: colors.muted, fontFamily: typography.medium, fontSize: 13 },
  offerValue: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 16,
    marginTop: 4,
  },
  agreedCard: {
    alignItems: 'center',
    backgroundColor: '#EAF9F2',
    borderColor: '#CBEEDD',
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: 10,
    padding: 14,
  },
  agreedLabel: { color: colors.success, fontFamily: typography.medium, fontSize: 13 },
  agreedValue: {
    color: '#08714A',
    fontFamily: typography.bold,
    fontSize: 20,
    marginTop: 3,
  },
  timelineCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: 14,
    padding: 16,
  },
  timelineTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 16,
    marginBottom: 14,
  },
  timelineItem: { flexDirection: 'row' },
  timelineRail: { alignItems: 'center', width: 18 },
  timelineDot: {
    backgroundColor: colors.blue,
    borderColor: colors.surfaceBlue,
    borderRadius: 6,
    borderWidth: 3,
    height: 12,
    width: 12,
  },
  timelineLine: { backgroundColor: colors.border, flex: 1, width: 1 },
  timelineBody: { flex: 1, paddingBottom: 16, paddingLeft: 9 },
  timelineAction: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: 13,
  },
  timelineMeta: {
    color: colors.blue,
    fontFamily: typography.medium,
    fontSize: 13,
    marginTop: 3,
  },
  timelineNote: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 15,
    marginTop: 5,
  },
  timelineDate: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    marginTop: 5,
  },
  formCard: {
    backgroundColor: colors.white,
    borderColor: '#BFD8FA',
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: 15,
    padding: 17,
  },
  formTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 18,
    marginBottom: 14,
  },
  formActions: { flexDirection: 'row', gap: 9 },
  formButton: { flex: 1 },
  actionsCard: { marginTop: 15 },
  actionSpacing: { marginTop: 9 },
  safetyCard: {
    alignItems: 'flex-start',
    backgroundColor: '#F0FBF6',
    borderRadius: radius.md,
    flexDirection: 'row',
    marginTop: 17,
    padding: 13,
  },
  safetyText: {
    color: colors.text,
    flex: 1,
    fontFamily: typography.medium,
    fontSize: 13,
    lineHeight: 15,
    marginLeft: 8,
  },
});

export default ApplicationDetailScreen;
