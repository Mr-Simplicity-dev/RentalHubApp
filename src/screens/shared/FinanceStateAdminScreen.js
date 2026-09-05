import React, { useCallback, useContext, useState } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { useFocusEffect } from '@react-navigation/native';
import Input from '../../components/common/Input';
import {
  InfoRow,
  PremiumButton,
  PremiumCard,
  PremiumCenter,
  PremiumHero,
  StatusPill,
} from '../../components/common/PremiumLayout';
import { AuthContext } from '../../context/AuthContext';
import { financialAdminService } from '../../services/financialAdminService';
import { getErrorMessage, pickList } from '../../utils/http';
import { colors, radius, typography } from '../../theme';
import AppText from '../../components/common/AppText';

const formatNaira = (value) => `₦${Number(value || 0).toLocaleString()}`;

const FinanceStateAdminScreen = () => {
  const { user } = useContext(AuthContext);
  const isSuperAdmin = user?.user_type === 'super_admin';

  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rateModal, setRateModal] = useState(null); // { admin }
  const [fundsModal, setFundsModal] = useState(null); // { admin, action }
  const [createOpen, setCreateOpen] = useState(false);
  const [rateValue, setRateValue] = useState('');
  const [reason, setReason] = useState('');
  const [createForm, setCreateForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    assigned_state: '',
    assigned_city: '',
    commission_rate: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await financialAdminService.getStateAdmins();
      setAdmins(pickList(response?.data || response, ['data']));
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(err, 'Could not load state admins'),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openRate = (admin) => {
    setRateModal(admin);
    setRateValue(String(Number(admin.admin_commission_rate || 0) * 100));
    setError('');
  };

  const submitRate = async () => {
    const pct = Number(rateValue);
    if (!Number.isFinite(pct) || pct < 1 || pct > 20) {
      setError('Commission rate must be between 1% and 20%.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await financialAdminService.updateStateAdminCommissionRate({
        admin_id: rateModal.id,
        commission_rate: pct / 100,
      });
      Toast.show({ type: 'success', text1: 'Commission rate updated' });
      setRateModal(null);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not update the rate'));
    } finally {
      setBusy(false);
    }
  };

  const openFunds = (admin, action) => {
    setFundsModal({ admin, action });
    setReason('');
    setError('');
  };

  const submitFunds = async () => {
    if (!reason.trim()) {
      setError('A reason is required.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await financialAdminService.manageStateAdminFunds({
        admin_id: fundsModal.admin.id,
        action: fundsModal.action,
        reason: reason.trim(),
      });
      Toast.show({
        type: 'success',
        text1: fundsModal.action === 'freeze' ? 'Funds frozen' : 'Funds unfrozen',
      });
      setFundsModal(null);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not update funds'));
    } finally {
      setBusy(false);
    }
  };

  const setCreateField = (key) => (value) =>
    setCreateForm((prev) => ({ ...prev, [key]: value }));

  const submitCreate = async () => {
    const { full_name, email, phone, password, assigned_state, assigned_city, commission_rate } = createForm;
    if (!full_name || !email || !phone || !password || !assigned_state) {
      setError('Fill in all required fields.');
      return;
    }
    if (password.length < 10) {
      setError('Password must be at least 10 characters.');
      return;
    }
    if (commission_rate && (Number(commission_rate) < 1 || Number(commission_rate) > 20)) {
      setError('Commission rate must be between 1% and 20%.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await financialAdminService.createStateAdmin({
        full_name: full_name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
        assigned_state: assigned_state.trim(),
        assigned_city: assigned_city.trim() || undefined,
        commission_rate: commission_rate ? Number(commission_rate) / 100 : undefined,
      });
      Toast.show({ type: 'success', text1: 'State admin created' });
      setCreateOpen(false);
      setCreateForm({ full_name: '', email: '', phone: '', password: '', assigned_state: '', assigned_city: '', commission_rate: '' });
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not create the state admin'));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <PremiumCenter loading title="Loading state admins" />;
  }

  return (
    <>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <PremiumHero
          eyebrow="Super finance"
          title="State admin management"
          subtitle="Manage state financial admins, their commission rates and fund freezes."
          icon="people-outline"
        />

        {isSuperAdmin ? (
          <PremiumButton
            title="Create state admin"
            onPress={() => {
              setCreateOpen(true);
              setError('');
            }}
            icon="person-add-outline"
            style={styles.createBtn}
          />
        ) : null}

        {admins.length === 0 ? (
          <PremiumCard>
            <AppText style={styles.empty}>No state admins found.</AppText>
          </PremiumCard>
        ) : (
          admins.map((admin) => (
            <PremiumCard key={admin.id}>
              <View style={styles.cardTop}>
                <View style={styles.cardCopy}>
                  <AppText style={styles.cardTitle}>{admin.full_name}</AppText>
                  <AppText style={styles.cardMeta}>
                    {admin.assigned_state || 'Unassigned'}
                    {admin.assigned_city ? ` · ${admin.assigned_city}` : ''}
                  </AppText>
                </View>
                {admin.is_funds_frozen ? (
                  <StatusPill label="Frozen" color={colors.danger} />
                ) : (
                  <StatusPill label={admin.is_active ? 'Active' : 'Inactive'} color={admin.is_active ? colors.success : colors.muted} />
                )}
              </View>
              <InfoRow icon="wallet-outline" label="Wallet" value={formatNaira(admin.admin_wallet_balance)} />
              <InfoRow
                icon="percent-outline"
                label="Commission rate"
                value={`${Number(admin.admin_commission_rate || 0) * 100}%`}
              />
              <InfoRow icon="cash-outline" label="Paid commissions" value={formatNaira(admin.paid_commission)} />
              <InfoRow icon="receipt-outline" label="Pending commission" value={formatNaira(admin.pending_commission)} />

              <View style={styles.actions}>
                <PremiumButton
                  title="Set rate"
                  onPress={() => openRate(admin)}
                  icon="options-outline"
                  style={styles.actionButton}
                />
                <PremiumButton
                  title={admin.is_funds_frozen ? 'Unfreeze' : 'Freeze'}
                  variant={admin.is_funds_frozen ? 'primary' : 'danger'}
                  onPress={() => openFunds(admin, admin.is_funds_frozen ? 'unfreeze' : 'freeze')}
                  icon={admin.is_funds_frozen ? 'lock-open-outline' : 'lock-closed-outline'}
                  style={styles.actionButton}
                />
              </View>
            </PremiumCard>
          ))
        )}
      </ScrollView>

      {rateModal ? (
        <Modal transparent visible animationType="fade" onRequestClose={() => setRateModal(null)}>
          <View style={styles.overlay}>
            <View style={styles.modalCard}>
              <AppText style={styles.modalTitle}>Set commission rate</AppText>
              <AppText style={styles.modalSubtitle}>{rateModal.full_name}</AppText>
              <Input
                label="Rate (%)"
                value={rateValue}
                onChangeText={setRateValue}
                placeholder="1 – 20"
                keyboardType="numeric"
                containerStyle={styles.fieldGap}
              />
              {error ? <AppText style={styles.error}>{error}</AppText> : null}
              <View style={styles.modalActions}>
                <PremiumButton title="Cancel" variant="ghost" onPress={() => setRateModal(null)} disabled={busy} style={styles.actionButton} />
                <PremiumButton title={busy ? 'Saving…' : 'Save'} onPress={submitRate} loading={busy} style={styles.actionButton} />
              </View>
            </View>
          </View>
        </Modal>
      ) : null}

      {fundsModal ? (
        <Modal transparent visible animationType="fade" onRequestClose={() => setFundsModal(null)}>
          <View style={styles.overlay}>
            <View style={styles.modalCard}>
              <AppText style={styles.modalTitle}>
                {fundsModal.action === 'freeze' ? 'Freeze funds' : 'Unfreeze funds'}
              </AppText>
              <AppText style={styles.modalSubtitle}>{fundsModal.admin.full_name}</AppText>
              <Input
                label="Reason"
                value={reason}
                onChangeText={setReason}
                placeholder="Why are you changing this admin's funds status?"
                multiline
                numberOfLines={3}
                containerStyle={styles.fieldGap}
              />
              {error ? <AppText style={styles.error}>{error}</AppText> : null}
              <View style={styles.modalActions}>
                <PremiumButton title="Cancel" variant="ghost" onPress={() => setFundsModal(null)} disabled={busy} style={styles.actionButton} />
                <PremiumButton title={busy ? 'Working…' : 'Confirm'} onPress={submitFunds} loading={busy} style={styles.actionButton} />
              </View>
            </View>
          </View>
        </Modal>
      ) : null}

      {createOpen ? (
        <Modal transparent visible animationType="slide" onRequestClose={() => setCreateOpen(false)}>
          <View style={styles.overlay}>
            <ScrollView style={styles.createScroll}>
              <View style={styles.modalCard}>
                <AppText style={styles.modalTitle}>Create state admin</AppText>
                <Input label="Full name" value={createForm.full_name} onChangeText={setCreateField('full_name')} />
                <Input label="Email" value={createForm.email} onChangeText={setCreateField('email')} keyboardType="email-address" containerStyle={styles.fieldGap} />
                <Input label="Phone" value={createForm.phone} onChangeText={setCreateField('phone')} keyboardType="phone-pad" containerStyle={styles.fieldGap} />
                <Input label="Assigned state" value={createForm.assigned_state} onChangeText={setCreateField('assigned_state')} containerStyle={styles.fieldGap} />
                <Input label="Assigned LGA/city (optional)" value={createForm.assigned_city} onChangeText={setCreateField('assigned_city')} containerStyle={styles.fieldGap} />
                <Input label="Commission rate % (1–20, optional)" value={createForm.commission_rate} onChangeText={setCreateField('commission_rate')} keyboardType="numeric" containerStyle={styles.fieldGap} />
                <Input
                  label="Temporary password"
                  value={createForm.password}
                  onChangeText={setCreateField('password')}
                  secureTextEntry
                  containerStyle={styles.fieldGap}
                />
                {error ? <AppText style={styles.error}>{error}</AppText> : null}
                <View style={styles.modalActions}>
                  <PremiumButton title="Cancel" variant="ghost" onPress={() => setCreateOpen(false)} disabled={busy} style={styles.actionButton} />
                  <PremiumButton title={busy ? 'Creating…' : 'Create'} onPress={submitCreate} loading={busy} style={styles.actionButton} />
                </View>
              </View>
            </ScrollView>
          </View>
        </Modal>
      ) : null}
    </>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    padding: 18,
    paddingBottom: 36,
  },
  createBtn: {
    marginBottom: 14,
  },
  cardTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardCopy: {
    flex: 1,
  },
  cardTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 16,
  },
  cardMeta: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 12,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    minWidth: 110,
  },
  empty: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
  },
  fieldGap: {
    marginTop: 12,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(7, 26, 61, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  createScroll: {
    flexGrow: 0,
  },
  modalCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 20,
  },
  modalTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 18,
  },
  modalSubtitle: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    marginTop: 4,
  },
  error: {
    color: colors.danger,
    fontFamily: typography.medium,
    fontSize: 13,
    marginTop: 10,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
});

export default FinanceStateAdminScreen;
