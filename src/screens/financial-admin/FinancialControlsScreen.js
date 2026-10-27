import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Share, StyleSheet, TouchableOpacity, View } from 'react-native';
import TextInput from '../../components/common/AppTextInput';
import Icon from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import { financialAdminService } from '../../services/financialAdminService';
import { trackMobileEvent } from '../../services/mobileDiagnosticsService';
import { colors, radius, shadows, typography, typeScale } from '../../theme';
import { getErrorMessage, pickList, pickObject } from '../../utils/http';
import AppText from '../../components/common/AppText';
import {
ActionRow,
  DashboardHero,
  DashboardNotice,
  DashboardScreen,
  DashboardSection,
  MetricCard,
  MetricGrid,
} from '../../components/dashboard/DashboardKit';

const formatCurrency = (value) => `₦${Number(value || 0).toLocaleString()}`;

const compactDate = (value) => {
  if (!value) return 'No date';
  try {
    return new Date(value).toLocaleString();
  } catch (_error) {
    return String(value);
  }
};

const parseRows = (response, nestedKey) => {
  if (Array.isArray(response?.data)) return response.data;
  if (nestedKey && Array.isArray(response?.data?.[nestedKey])) return response.data[nestedKey];
  return pickList(response, ['data', nestedKey].filter(Boolean));
};

const csvEscape = (value) => {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const rowsToCsv = (rows, columns) => [
  columns.map((column) => csvEscape(column.label)).join(','),
  ...rows.map((row) => columns.map((column) => csvEscape(column.value(row))).join(',')),
].join('\n');

const buildExportName = (label) =>
  `RentalHub ${label} ${new Date().toISOString().slice(0, 10)}`;

const SummaryPill = ({ label, value, tone = 'blue' }) => { useInterfaceLanguage(); return (<View style={[styles.pill, tone === 'warning' && styles.warningPill]}>
    <AppText style={[styles.pillLabel, tone === 'warning' && styles.warningText]}>{label}</AppText>
    <AppText style={[styles.pillValue, tone === 'warning' && styles.warningText]}>{value}</AppText>
  </View>); };

const EmptyState = ({ message }) => { useInterfaceLanguage(); return (<View style={styles.emptyState}>
    <Icon name="file-tray-outline" size={24} color={colors.muted} />
    <AppText style={styles.emptyText}>{message}</AppText>
  </View>); };

const FinancialControlsScreen = ({ navigation }) => {
  const interfaceLanguage = useInterfaceLanguage();
  const [loading, setLoading] = useState(true);
  const [auditRows, setAuditRows] = useState([]);
  const [auditBreakdown, setAuditBreakdown] = useState([]);
  const [performanceRows, setPerformanceRows] = useState([]);
  const [performanceStats, setPerformanceStats] = useState(null);
  const [frozenRows, setFrozenRows] = useState([]);
  const [frozenSummary, setFrozenSummary] = useState([]);
  const [commissionConfig, setCommissionConfig] = useState({});
  const [freezeModalVisible, setFreezeModalVisible] = useState(false);
  const [freezeForm, setFreezeForm] = useState({ userId: '', amount: '', reason: '' });
  const [submittingFreeze, setSubmittingFreeze] = useState(false);
  const [exporting, setExporting] = useState('');
  const [commEditVisible, setCommEditVisible] = useState(false);
  const [commEditValues, setCommEditValues] = useState({});
  const [savingComm, setSavingComm] = useState(false);

  const loadControls = useCallback(async () => {
    setLoading(true);
    try {
      const [audit, performance, frozen, config] = await Promise.all([
        financialAdminService.getAuditTrail({ limit: 20 }),
        financialAdminService.getStateAdminPerformance(),
        financialAdminService.getFrozenFunds({ status: 'frozen' }),
        financialAdminService.getCommissionConfig(),
      ]);

      setAuditRows(parseRows(audit));
      setAuditBreakdown(Array.isArray(audit?.breakdown) ? audit.breakdown : []);
      setPerformanceRows(parseRows(performance));
      setPerformanceStats(pickObject(performance, ['statistics']));
      setFrozenRows(parseRows(frozen));
      setFrozenSummary(Array.isArray(frozen?.summary) ? frozen.summary : []);
      setCommissionConfig(config?.data || {});
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: ui("Financial controls failed"),
        text2: getErrorMessage(error, 'Could not load financial controls'),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadControls();
  }, [loadControls]);

  const frozenTotal = useMemo(
    () => frozenRows.reduce((sum, row) => sum + Number(row.amount || 0), 0),
    [frozenRows, interfaceLanguage]
  );

  const auditTotal = useMemo(
    () => auditBreakdown.reduce((sum, row) => sum + Number(row.count || 0), 0),
    [auditBreakdown, interfaceLanguage]
  );

  const commissionEntries = Object.entries(commissionConfig || {});

  const shareCsv = async ({ label, rows, columns }) => {
    if (!rows.length) {
      Toast.show({
        type: 'info',
        text1: ui("Nothing to export"),
        text2: ui("{value0} has no rows in the current native data set.", {value0: (label)}),
      });
      return;
    }

    setExporting(label);
    try {
      const title = buildExportName(label);
      const csv = rowsToCsv(rows, columns);
      trackMobileEvent('financial_export_shared', {
        label,
        row_count: rows.length,
        screen: 'FinancialControls',
      });
      await Share.share({
        title,
        message: ui("{value0}\n\n{value1}", {value0: (title), value1: (csv)}),
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: ui("Export failed"),
        text2: getErrorMessage(error, 'Could not open the share sheet'),
      });
    } finally {
      setExporting('');
    }
  };

  const exportAuditTrail = () =>
    shareCsv({
      label: ui("Financial Audit Trail"),
      rows: auditRows,
      columns: [
        { label: ui("ID"), value: (row) => row.id },
        { label: ui("Action"), value: (row) => row.action_type || row.action },
        { label: ui("Amount"), value: (row) => row.amount },
        { label: ui("Description"), value: (row) => row.description || row.admin_note },
        { label: ui("Performed By"), value: (row) => row.performed_by || row.admin_name },
        { label: ui("Created At"), value: (row) => row.created_at },
      ],
    });

  const exportFrozenFunds = () =>
    shareCsv({
      label: ui("Frozen Funds"),
      rows: frozenRows,
      columns: [
        { label: ui("ID"), value: (row) => row.id },
        { label: ui("User ID"), value: (row) => row.user_id },
        { label: ui("User"), value: (row) => row.user_name || row.user_email },
        { label: ui("Amount"), value: (row) => row.amount },
        { label: ui("Reason"), value: (row) => row.reason },
        { label: ui("Status"), value: (row) => row.status },
        { label: ui("Frozen At"), value: (row) => row.frozen_at || row.created_at },
      ],
    });

  const exportStatePerformance = () =>
    shareCsv({
      label: ui("State Admin Performance"),
      rows: performanceRows,
      columns: [
        { label: ui("Admin"), value: (row) => row.admin_name || row.full_name || row.email },
        { label: ui("State"), value: (row) => row.assigned_state },
        { label: ui("City"), value: (row) => row.assigned_city },
        { label: ui("Total Paid"), value: (row) => row.total_paid },
        { label: ui("Total Pending"), value: (row) => row.total_pending },
        { label: ui("Total Withdrawn"), value: (row) => row.total_withdrawn },
      ],
    });

  const exportCommissionConfig = () =>
    shareCsv({
      label: ui("Commission Configuration"),
      rows: commissionEntries.map(([key, config]) => ({ key, ...(config || {}) })),
      columns: [
        { label: ui("Key"), value: (row) => row.key },
        { label: ui("Value"), value: (row) => row.value },
        { label: ui("Description"), value: (row) => row.description },
        { label: ui("Updated At"), value: (row) => row.updated_at },
      ],
    });

  const openCommEdit = () => {
    const values = {};
    commissionEntries.forEach(([key, config]) => {
      values[key] = String(config?.value ?? '');
    });
    setCommEditValues(values);
    setCommEditVisible(true);
  };

  const saveCommissionConfig = async () => {
    setSavingComm(true);
    try {
      await financialAdminService.updateCommissionConfig(commEditValues);
      Toast.show({ type: 'success', text1: ui("Commission config saved") });
      setCommEditVisible(false);
      loadControls();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: ui("Save failed"),
        text2: getErrorMessage(error, 'Could not update commission config'),
      });
    } finally {
      setSavingComm(false);
    }
  };

  const exportTransactions = async () => {
    setExporting('Transaction Reconciliation');
    try {
      const response = await financialAdminService.getTransactionHistory({ limit: 100 });
      const rows = parseRows(response, 'transactions');
      await shareCsv({
        label: ui("Transaction Reconciliation"),
        rows,
        columns: [
          { label: ui("ID"), value: (row) => row.id || row.transaction_id },
          { label: ui("Reference"), value: (row) => row.reference || row.payment_reference },
          { label: ui("User"), value: (row) => row.user_name || row.email || row.user_email },
          { label: ui("Amount"), value: (row) => row.amount || row.total_amount },
          { label: ui("Status"), value: (row) => row.status || row.payment_status },
          { label: ui("Type"), value: (row) => row.payment_type || row.transaction_type },
          { label: ui("Created At"), value: (row) => row.created_at || row.payment_date },
        ],
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: ui("Transactions unavailable"),
        text2: getErrorMessage(error, 'Could not fetch transaction rows for export'),
      });
    } finally {
      setExporting('');
    }
  };

  const confirmFreezeFunds = () => {
    const userId = freezeForm.userId.trim();
    const amount = Number(freezeForm.amount);
    const reason = freezeForm.reason.trim();

    if (!userId || !amount || amount <= 0 || !reason) {
      Toast.show({
        type: 'error',
        text1: ui("Complete the freeze form"),
        text2: ui("User ID, amount and reason are required."),
      });
      return;
    }

    Alert.alert(
      ui("Freeze user funds?"),
      `This will request a freeze of ${formatCurrency(amount)} for user #${userId}.`,
      [
        { text: ui("Cancel"), style: 'cancel' },
        {
          text: ui("Freeze funds"),
          style: 'destructive',
          onPress: async () => {
            setSubmittingFreeze(true);
            try {
              await financialAdminService.freezeFunds({ userId, amount, reason });
              Toast.show({ type: 'success', text1: ui("Funds freeze submitted") });
              setFreezeForm({ userId: '', amount: '', reason: '' });
              setFreezeModalVisible(false);
              loadControls();
            } catch (error) {
              Toast.show({
                type: 'error',
                text1: ui("Freeze failed"),
                text2: getErrorMessage(error, 'Could not freeze funds'),
              });
            } finally {
              setSubmittingFreeze(false);
            }
          },
        },
      ]
    );
  };

  return (
    <>
      <DashboardScreen refreshing={loading} onRefresh={loadControls}>
        <DashboardHero
          eyebrow={ui("ADVANCED FINANCE")}
          title={ui("Controls and reconciliation")}
          subtitle={ui("Audit money movement, settlement health, frozen funds, commission rules and export handoff from a native workspace.")}
          icon="shield-checkmark-outline"
          onRefresh={loadControls}
        />

        <MetricGrid>
          <MetricCard
            label={ui("Audit rows")}
            value={String(auditRows.length || auditTotal || 0)}
            icon="receipt-outline"
            color={colors.blue}
          />
          <MetricCard
            label={ui("Frozen funds")}
            value={formatCurrency(frozenTotal)}
            icon="lock-closed-outline"
            color={colors.danger}
          />
          <MetricCard
            label={ui("State admins")}
            value={String(performanceStats?.total_admins || performanceRows.length || 0)}
            icon="people-outline"
            color={colors.success}
          />
          <MetricCard
            label={ui("Config keys")}
            value={String(commissionEntries.length)}
            icon="options-outline"
            color="#A66B00"
          />
        </MetricGrid>

        <DashboardSection
          title={ui("Settlement workbench")}
          subtitle={ui("The important settlement queues are now reachable as native screens.")}
        >
          <ActionRow
            title={ui("Withdrawal approvals")}
            subtitle={ui("Approve, reject and review pending payout requests.")}
            icon="cash-outline"
            onPress={() => navigation.navigate('FinancialWithdrawals')}
          />
          <ActionRow
            title={ui("Transaction reconciliation")}
            subtitle={ui("Filter payment history and compare status, wallet credit and commission rows.")}
            icon="swap-horizontal-outline"
            onPress={() => navigation.navigate('FinancialTransactions')}
          />
          <ActionRow
            title={ui("Revenue reports")}
            subtitle={ui("Review revenue summary and recent transaction movement.")}
            icon="trending-up-outline"
            onPress={() => navigation.navigate('FinancialRevenueReport')}
          />
        </DashboardSection>

        <DashboardSection
          title={ui("Freeze controls")}
          subtitle={ui("High-risk fund actions require confirmation before they touch the backend.")}
        >
          <DashboardNotice
            variant="warning"
            title={ui("Sensitive finance action")}
            message={ui("Freeze requests are protected by the server role checks and still require a confirmation prompt in the app.")}
          />
          <ActionRow
            title={ui("Freeze user funds")}
            subtitle={ui("Open a native confirmation form for super-financial review.")}
            icon="lock-closed-outline"
            badge="Protected"
            onPress={() => setFreezeModalVisible(true)}
          />
          <View style={styles.cardStack}>
            {frozenRows.slice(0, 4).map((item) => (
              <View key={String(item.id)} style={styles.recordCard}>
                <View style={styles.recordTop}>
                  <AppText style={styles.recordTitle}>{item.user_name || item.user_email || ui("User #{value0}", {value0: (item.user_id)})}</AppText>
                  <AppText style={styles.dangerValue}>{formatCurrency(item.amount)}</AppText>
                </View>
                <AppText style={styles.recordMeta}>{item.reason || 'No freeze reason recorded'}</AppText>
                <AppText style={styles.recordDate}>{ui("Frozen ")}{compactDate(item.frozen_at || item.created_at)}</AppText>
              </View>
            ))}
            {frozenRows.length === 0 ? <EmptyState message={ui("No frozen funds found.")} /> : null}
          </View>
        </DashboardSection>

        <DashboardSection
          title={ui("Audit trail")}
          subtitle={ui("Recent money-impacting actions and reconciliation categories.")}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
            {auditBreakdown.slice(0, 8).map((item) => (
              <SummaryPill
                key={item.action_type}
                label={String(item.action_type || 'action').replace(/_/g, ' ')}
                value={String(item.count || 0)}
              />
            ))}
            {auditBreakdown.length === 0 ? <SummaryPill label={ui("audit")} value="0" tone="warning" /> : null}
          </ScrollView>

          <View style={styles.cardStack}>
            {auditRows.slice(0, 6).map((item) => (
              <View key={String(item.id)} style={styles.recordCard}>
                <View style={styles.recordTop}>
                  <AppText style={styles.recordTitle}>{String(item.action_type || 'audit').replace(/_/g, ' ')}</AppText>
                  <AppText style={styles.recordAmount}>{formatCurrency(item.amount || 0)}</AppText>
                </View>
                <AppText style={styles.recordMeta}>{item.description || item.user_email || 'No description recorded'}</AppText>
                <AppText style={styles.recordDate}>
                  {item.performed_by_name || item.admin_name || ui("System")} • {compactDate(item.performed_at || item.created_at)}
                </AppText>
              </View>
            ))}
            {auditRows.length === 0 ? <EmptyState message={ui("No audit activity returned.")} /> : null}
          </View>
        </DashboardSection>

        <DashboardSection
          title={ui("Admin performance")}
          subtitle={ui("Native view of pending, paid and withdrawn commission pressure by admin.")}
        >
          <View style={styles.statsGrid}>
            <SummaryPill label={ui("Pending")} value={formatCurrency(performanceStats?.total_pending_commissions)} tone="warning" />
            <SummaryPill label={ui("Paid")} value={formatCurrency(performanceStats?.total_paid_commissions)} />
            <SummaryPill label={ui("Withdrawn")} value={formatCurrency(performanceStats?.total_withdrawn_amount)} />
          </View>
          <View style={styles.cardStack}>
            {performanceRows.slice(0, 5).map((item) => (
              <View key={String(item.admin_id || item.id)} style={styles.recordCard}>
                <View style={styles.recordTop}>
                  <AppText style={styles.recordTitle}>{item.full_name || item.admin_name || ui("Admin #{value0}", {value0: (item.admin_id)})}</AppText>
                  <AppText style={styles.recordAmount}>{formatCurrency(item.total_pending)}</AppText>
                </View>
                <AppText style={styles.recordMeta}>
                  {(item.assigned_state || 'Unassigned state')} {item.assigned_city ? ui("• {value0}", {value0: (item.assigned_city)}) : ''}
                </AppText>
                <AppText style={styles.recordDate}>{ui("Paid")}{formatCurrency(item.total_paid)}{ui(" • Withdrawn ")}{formatCurrency(item.total_withdrawn)}
                </AppText>
              </View>
            ))}
            {performanceRows.length === 0 ? <EmptyState message={ui("No admin performance rows found.")} /> : null}
          </View>
        </DashboardSection>

        <DashboardSection
          title={ui("Commission configuration")}
          subtitle={ui("Current finance rules are visible in-app; changing them remains server-protected.")}
        >
          <ActionRow
            title={ui("Edit commission config")}
            subtitle={ui("Modify commission rates and finance rules.")}
            icon="create-outline"
            badge="Edit"
            onPress={openCommEdit}
          />
          <View style={styles.cardStack}>
            {commissionEntries.slice(0, 8).map(([key, config]) => (
              <View key={key} style={styles.configCard}>
                <View style={styles.recordTop}>
                  <AppText style={styles.recordTitle}>{key.replace(/_/g, ' ')}</AppText>
                  <AppText style={styles.recordAmount}>{Number(config?.value || 0).toLocaleString()}</AppText>
                </View>
                <AppText style={styles.recordMeta}>{config?.description || 'No description'}</AppText>
                <AppText style={styles.recordDate}>{ui("Updated ")}{compactDate(config?.updated_at)}</AppText>
              </View>
            ))}
            {commissionEntries.length === 0 ? <EmptyState message={ui("Commission config is not available for this role.")} /> : null}
          </View>
        </DashboardSection>

        <DashboardSection
          title={ui("Exports")}
          subtitle={ui("Generate CSV-style exports from the native finance data and share them through the device share sheet.")}
        >
          <ActionRow
            title={ui("Export transaction reconciliation")}
            subtitle={ui("Fetch the latest 100 transaction rows and share as CSV text.")}
            icon="download-outline"
            badge={exporting === 'Transaction Reconciliation' ? 'Preparing' : 'CSV'}
            onPress={exportTransactions}
          />
          <ActionRow
            title={ui("Export audit trail")}
            subtitle={ui("Share the currently loaded financial audit rows.")}
            icon="receipt-outline"
            badge={exporting === 'Financial Audit Trail' ? 'Preparing' : 'CSV'}
            onPress={exportAuditTrail}
          />
          <ActionRow
            title={ui("Export frozen funds")}
            subtitle={ui("Share frozen fund records visible in this workspace.")}
            icon="lock-closed-outline"
            badge={exporting === 'Frozen Funds' ? 'Preparing' : 'CSV'}
            onPress={exportFrozenFunds}
          />
          <ActionRow
            title={ui("Export state performance")}
            subtitle={ui("Share state-admin settlement and withdrawal performance rows.")}
            icon="people-outline"
            badge={exporting === 'State Admin Performance' ? 'Preparing' : 'CSV'}
            onPress={exportStatePerformance}
          />
          <ActionRow
            title={ui("Export commission config")}
            subtitle={ui("Share the active commission settings snapshot.")}
            icon="options-outline"
            badge={exporting === 'Commission Configuration' ? 'Preparing' : 'CSV'}
            onPress={exportCommissionConfig}
          />
        </DashboardSection>
      </DashboardScreen>

      <Modal visible={freezeModalVisible} transparent animationType="slide" onRequestClose={() => setFreezeModalVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setFreezeModalVisible(false)}>
          <Pressable style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <AppText style={styles.modalTitle}>{ui("Freeze user funds")}</AppText>
              <TouchableOpacity accessibilityRole="button" onPress={() => setFreezeModalVisible(false)}>
                <Icon name="close" size={22} color={colors.muted} />
              </TouchableOpacity>
            </View>
            <AppText style={styles.modalSubtitle}>{ui("Enter the user ID, amount and finance reason. The backend will still reject this if your role is not allowed.")}</AppText>
            <TextInput
              style={styles.input}
              value={freezeForm.userId}
              onChangeText={(userId) => setFreezeForm((current) => ({ ...current, userId }))}
              placeholder={ui("User ID")}
              keyboardType="number-pad"
              placeholderTextColor={colors.muted}
            />
            <TextInput
              style={styles.input}
              value={freezeForm.amount}
              onChangeText={(amount) => setFreezeForm((current) => ({ ...current, amount }))}
              placeholder={ui("Amount")}
              keyboardType="decimal-pad"
              placeholderTextColor={colors.muted}
            />
            <TextInput
              style={[styles.input, styles.reasonInput]}
              value={freezeForm.reason}
              onChangeText={(reason) => setFreezeForm((current) => ({ ...current, reason }))}
              placeholder={ui("Reason")}
              multiline
              placeholderTextColor={colors.muted}
            />
            <TouchableOpacity
              accessibilityRole="button"
              disabled={submittingFreeze}
              style={[styles.freezeButton, submittingFreeze && styles.disabledButton]}
              onPress={confirmFreezeFunds}
            >
              {submittingFreeze ? <ActivityIndicator color={colors.white} /> : <AppText style={styles.freezeButtonText}>{ui("Confirm freeze")}</AppText>}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={commEditVisible} transparent animationType="slide" onRequestClose={() => setCommEditVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setCommEditVisible(false)}>
          <Pressable style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <AppText style={styles.modalTitle}>{ui("Edit commission config")}</AppText>
              <TouchableOpacity accessibilityRole="button" onPress={() => setCommEditVisible(false)}>
                <Icon name="close" size={22} color={colors.muted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {Object.entries(commEditValues).map(([key, val]) => (
                <View key={key} style={{ marginBottom: 12 }}>
                  <AppText style={[styles.recordMeta, { marginBottom: 4 }]}>{key.replace(/_/g, ' ')}</AppText>
                  <TextInput
                    style={styles.input}
                    value={val}
                    onChangeText={(text) => setCommEditValues((prev) => ({ ...prev, [key]: text }))}
                    keyboardType="decimal-pad"
                    placeholderTextColor={colors.muted}
                  />
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity
              accessibilityRole="button"
              disabled={savingComm}
              style={[styles.freezeButton, savingComm && styles.disabledButton]}
              onPress={saveCommissionConfig}
            >
              {savingComm ? <ActivityIndicator color={colors.white} /> : <AppText style={styles.freezeButtonText}>{ui("Save changes")}</AppText>}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  pillRow: {
    gap: 8,
    paddingVertical: 2,
  },
  pill: {
    backgroundColor: colors.surfaceBlue,
    borderColor: '#C9DCF7',
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  warningPill: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  pillLabel: {
    color: colors.blue,
    fontFamily: typography.semibold,
    fontSize: typeScale.xs,
    lineHeight: 18,
    textTransform: 'capitalize',
  },
  pillValue: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: typeScale.sm,
    lineHeight: 20,
    marginTop: 2,
  },
  warningText: {
    color: '#92400E',
  },
  cardStack: {
    gap: 9,
  },
  recordCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 14,
  },
  configCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 14,
  },
  recordTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  recordTitle: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.semibold,
    fontSize: typeScale.sm,
    lineHeight: 20,
    textTransform: 'capitalize',
  },
  recordAmount: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: typeScale.xs,
    lineHeight: 18,
  },
  dangerValue: {
    color: colors.danger,
    fontFamily: typography.bold,
    fontSize: typeScale.xs,
    lineHeight: 18,
  },
  recordMeta: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginTop: 6,
  },
  recordDate: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginTop: 5,
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 7,
    padding: 18,
  },
  emptyText: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: typeScale.xs,
    lineHeight: 18,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modalBackdrop: {
    backgroundColor: 'rgba(7, 26, 61, 0.45)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    ...shadows.soft,
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalTitle: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: typeScale.lg,
    lineHeight: 28,
  },
  modalSubtitle: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: typeScale.reading,
    lineHeight: 22,
    marginTop: 6,
  },
  input: {
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.ink,
    fontFamily: typography.medium,
    fontSize: typeScale.sm,
    lineHeight: 20,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  reasonInput: {
    minHeight: 92,
    textAlignVertical: 'top',
  },
  freezeButton: {
    alignItems: 'center',
    backgroundColor: colors.danger,
    borderRadius: radius.md,
    justifyContent: 'center',
    minHeight: 50,
    marginTop: 14,
  },
  disabledButton: {
    opacity: 0.7,
  },
  freezeButtonText: {
    color: colors.white,
    fontFamily: typography.semibold,
    fontSize: typeScale.sm,
    lineHeight: 20,
  },
});

export default FinancialControlsScreen;
