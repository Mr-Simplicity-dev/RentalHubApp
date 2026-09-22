import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { rentCalculatorService } from '../../services/rentCalculatorService';
import { propertyService } from '../../services/propertyService';
import { recruitmentService } from '../../services/recruitmentService';
import { colors, radius, typography } from '../../theme';
import { getErrorMessage } from '../../utils/http';

import AppText from '../../components/common/AppText';

const EMPTY = {
  state_id: '',
  state_name: '',
  lga_id: '',
  agent_fee_pct: '',
  legal_fee_pct: '',
  caution_months: '',
  agreement_fee: '',
  service_charge: '',
  governance_note: '',
};

const scopeLabel = (fee) => {
  if (fee.state_id === null || fee.state_id === undefined) return 'Global default';
  if (fee.lga_id) return `${fee.state_name || `State #${fee.state_id}`} · ${fee.lga_name || `LGA #${fee.lga_id}`}`;
  return `${fee.state_name || `State #${fee.state_id}`} (state-wide)`;
};

const RentCalculatorFeesAdminScreen = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fees, setFees] = useState([]);
  const [states, setStates] = useState([]);
  const [lgas, setLgas] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [feesRes, statesRes] = await Promise.all([
        rentCalculatorService.adminGetFees(),
        propertyService.getLocationOptions(),
      ]);
      setFees(Array.isArray(feesRes?.data) ? feesRes.data : []);
      setStates(Array.isArray(statesRes?.data) ? statesRes.data : []);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Could not load calculator fees', text2: getErrorMessage(error, 'Please try again.') });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!form.state_id) {
      setLgas([]);
      return undefined;
    }
    const selected = states.find((state) => String(state.id) === String(form.state_id));
    const stateName = selected?.name || selected?.state_name;
    if (!stateName) return undefined;
    let active = true;
    recruitmentService
      .getLGAs(stateName)
      .then((response) => {
        if (!active) return;
        setLgas((response?.data?.data || []).map((lga, index) => (typeof lga === 'string' ? { id: index + 1, name: lga } : lga)));
      })
      .catch(() => {
        if (active) setLgas([]);
      });
    return () => {
      active = false;
    };
  }, [form.state_id, states]);

  const submit = async () => {
    if (!form.agent_fee_pct || !form.legal_fee_pct || !form.caution_months || !form.agreement_fee) {
      Toast.show({ type: 'error', text1: 'Agent %, legal %, caution months and agreement fee are required' });
      return;
    }
    if (!form.governance_note.trim()) {
      Toast.show({ type: 'error', text1: 'A governance note is required' });
      return;
    }
    setSaving(true);
    try {
      const selected = states.find((state) => String(state.id) === String(form.state_id));
      await rentCalculatorService.adminUpsertFee({
        state_id: form.state_id ? parseInt(form.state_id, 10) : undefined,
        state_name: selected?.name || selected?.state_name,
        lga_id: form.lga_id ? parseInt(form.lga_id, 10) : undefined,
        agent_fee_pct: parseFloat(form.agent_fee_pct),
        legal_fee_pct: parseFloat(form.legal_fee_pct),
        caution_months: parseFloat(form.caution_months),
        agreement_fee: parseFloat(form.agreement_fee),
        service_charge: parseFloat(form.service_charge || '0'),
        governance_note: form.governance_note.trim(),
      });
      Toast.show({ type: 'success', text1: 'Calculator fees saved' });
      setShowForm(false);
      setForm(EMPTY);
      await load();
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Could not save fees', text2: getErrorMessage(error, 'Please try again.') });
    } finally {
      setSaving(false);
    }
  };

  const remove = (fee) => {
    Alert.alert('Delete calculator fees?', 'Removes this location rule. The global default remains.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await rentCalculatorService.adminDeleteFee(fee.id, 'Removed from mobile admin');
            Toast.show({ type: 'success', text1: 'Fee rule deleted' });
            await load();
          } catch (error) {
            Toast.show({ type: 'error', text1: 'Could not delete', text2: getErrorMessage(error, 'Please try again.') });
          }
        },
      },
    ]);
  };

  const field = (key, label, keyboardType = 'numeric') => (
    <>
      <AppText style={styles.label}>{label}</AppText>
      <TextInput
        value={String(form[key])}
        onChangeText={(value) => setForm((prev) => ({ ...prev, [key]: value }))}
        keyboardType={keyboardType}
        placeholder="0"
        placeholderTextColor={colors.muted}
        style={styles.input}
      />
    </>
  );

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View style={styles.headerBody}>
            <AppText style={styles.title}>Rent Calculator Fees</AppText>
            <AppText style={styles.subtitle}>
              Location-based agent/legal/caution fee rates used by the rent calculator. A global default applies where no state rule exists.
            </AppText>
          </View>
          <TouchableOpacity onPress={() => { setShowForm((v) => !v); setForm(EMPTY); }} style={styles.addButton}>
            <Icon name={showForm ? 'close' : 'add'} size={20} color={colors.white} />
          </TouchableOpacity>
        </View>

        {showForm ? (
          <View style={styles.card}>
            <AppText style={styles.cardTitle}>New / update fee rule</AppText>

            <AppText style={styles.label}>State (optional — leave empty for global)</AppText>
            <View style={styles.chipWrap}>
              {states.map((state) => {
                const selected = String(state.id) === String(form.state_id);
                return (
                  <TouchableOpacity
                    key={state.id}
                    onPress={() => setForm((prev) => ({ ...prev, state_id: selected ? '' : String(state.id), lga_id: '' }))}
                    style={[styles.chip, selected && styles.chipActive]}
                  >
                    <AppText style={[styles.chipText, selected && styles.chipTextActive]}>{state.name || state.state_name}</AppText>
                  </TouchableOpacity>
                );
              })}
            </View>

            {lgas.length > 0 ? (
              <>
                <AppText style={styles.label}>LGA (optional — state-wide if none)</AppText>
                <View style={styles.chipWrap}>
                  {lgas.map((lga) => {
                    const selected = String(lga.id) === String(form.lga_id);
                    return (
                      <TouchableOpacity
                        key={lga.id}
                        onPress={() => setForm((prev) => ({ ...prev, lga_id: selected ? '' : String(lga.id) }))}
                        style={[styles.chip, selected && styles.chipActive]}
                      >
                        <AppText style={[styles.chipText, selected && styles.chipTextActive]}>{lga.name || lga.lga_name}</AppText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            ) : null}

            {field('agent_fee_pct', 'Agent fee (%) *')}
            {field('legal_fee_pct', 'Legal fee (%) *')}
            {field('caution_months', 'Caution (months) *')}
            {field('agreement_fee', 'Agreement fee (₦) *')}
            {field('service_charge', 'Service charge (₦)')}

            <AppText style={styles.label}>Governance note *</AppText>
            <TextInput
              value={form.governance_note}
              onChangeText={(value) => setForm((prev) => ({ ...prev, governance_note: value }))}
              placeholder="Why this rate changed"
              placeholderTextColor={colors.muted}
              multiline
              style={[styles.input, styles.textarea]}
            />

            <TouchableOpacity disabled={saving} onPress={submit} style={styles.primaryButton}>
              {saving ? <ActivityIndicator color={colors.white} size="small" /> : (
                <AppText style={styles.primaryButtonText}>Save fee rule</AppText>
              )}
            </TouchableOpacity>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.blue} size="large" />
            <AppText style={styles.loadingText}>Loading calculator fees…</AppText>
          </View>
        ) : fees.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="calculator-outline" size={30} color={colors.muted} />
            <AppText style={styles.emptyTitle}>No fee rules configured</AppText>
            <AppText style={styles.emptyText}>The calculator uses platform defaults until a rule is added.</AppText>
          </View>
        ) : fees.map((fee) => (
          <View key={fee.id} style={styles.feeCard}>
            <View style={styles.feeBody}>
              <AppText style={styles.feeTitle}>{scopeLabel(fee)}</AppText>
              <AppText style={styles.feeMeta}>
                Agent {fee.agent_fee_pct}% · Legal {fee.legal_fee_pct}% · Caution {fee.caution_months}mo
              </AppText>
              <AppText style={styles.feeMeta}>
                Agreement ₦{Number(fee.agreement_fee || 0).toLocaleString()} · Service ₦{Number(fee.service_charge || 0).toLocaleString()}
              </AppText>
            </View>
            <TouchableOpacity onPress={() => remove(fee)} style={styles.deleteButton}>
              <Icon name="trash-outline" size={18} color={colors.danger} />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.surface, flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  headerRow: { alignItems: 'flex-start', flexDirection: 'row' },
  headerBody: { flex: 1, marginRight: 12 },
  title: { color: colors.ink, fontFamily: typography.bold, fontSize: 19 },
  subtitle: { color: colors.muted, fontFamily: typography.regular, fontSize: 12, lineHeight: 18, marginTop: 5 },
  addButton: {
    alignItems: 'center',
    backgroundColor: colors.blue,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  card: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: 14,
    padding: 15,
  },
  cardTitle: { color: colors.ink, fontFamily: typography.bold, fontSize: 15, marginBottom: 8 },
  label: { color: colors.text, fontFamily: typography.semibold, fontSize: 12, marginBottom: 6, marginTop: 12 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  chipActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  chipText: { color: colors.text, fontFamily: typography.medium, fontSize: 12 },
  chipTextActive: { color: colors.white, fontFamily: typography.semibold },
  input: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.ink,
    fontFamily: typography.regular,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  textarea: { minHeight: 74, textAlignVertical: 'top' },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.blue,
    borderRadius: radius.sm,
    justifyContent: 'center',
    marginTop: 16,
    minHeight: 46,
  },
  primaryButtonText: { color: colors.white, fontFamily: typography.semibold, fontSize: 14 },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  loadingText: { color: colors.muted, fontFamily: typography.medium, fontSize: 13, marginTop: 12 },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { color: colors.ink, fontFamily: typography.bold, fontSize: 17, marginTop: 12 },
  emptyText: { color: colors.muted, fontFamily: typography.regular, fontSize: 13, marginTop: 6, textAlign: 'center' },
  feeCard: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 10,
    padding: 14,
  },
  feeBody: { flex: 1 },
  feeTitle: { color: colors.ink, fontFamily: typography.semibold, fontSize: 14 },
  feeMeta: { color: colors.muted, fontFamily: typography.regular, fontSize: 12, marginTop: 3 },
  deleteButton: { alignItems: 'center', height: 36, justifyContent: 'center', width: 36 },
});

export default RentCalculatorFeesAdminScreen;
