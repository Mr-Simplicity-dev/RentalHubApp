import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import { financialAdminService } from '../../services/financialAdminService';
import { trackMobileEvent } from '../../services/mobileDiagnosticsService';
import { colors, radius, shadows, typography } from '../../theme';
import { getErrorMessage, pickList, pickObject } from '../../utils/http';
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

const SummaryPill = ({ label, value, tone = 'blue' }) => (
  <View style={[styles.pill, tone === 'warning' && styles.warningPill]}>
    <Text style={[styles.pillLabel, tone === 'warning' && styles.warningText]}>{label}</Text>
    <Text style={[styles.pillValue, tone === 'warning' && styles.warningText]}>{value}</Text>
  </View>
);

const EmptyState = ({ message }) => (
  <View style={styles.emptyState}>
    <Icon name="file-tray-outline" size={24} color={colors.muted} />
    <Text style={styles.emptyText}>{message}</Text>
  </View>
);

const FinancialControlsScreen = ({ navigation }) => {
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
        text1: 'Financial controls failed',
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
    [frozenRows]
  );

  const auditTotal = useMemo(
    () => auditBreakdown.reduce((sum, row) => sum + Number(row.count || 0), 0),
    [auditBreakdown]
  );

  const commissionEntries = Object.entries(commissionConfig || {});

  const shareCsv = async ({ label, rows, columns }) => {
    if (!rows.length) {
      Toast.show({
        type: 'info',
        text1: 'Nothing to export',
        text2: `${label} has no rows in the current native data set.`,
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
        message: `${title}\n\n${csv}`,
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Export failed',
        text2: getErrorMessage(error, 'Could not open the share sheet'),
      });
    } finally {
      setExporting('');
    }
  };

  const exportAuditTrail = () =>
    shareCsv({
      label: 'Financial Audit Trail',
      rows: auditRows,
      columns: [
        { label: 'ID', value: (row) => row.id },
        { label: 'Action', value: (row) => row.action_type || row.action },
        { label: 'Amount', value: (row) => row.amount },
        { label: 'Description', value: (row) => row.description || row.admin_note },
        { label: 'Performed By', value: (row) => row.performed_by || row.admin_name },
        { label: 'Created At', value: (row) => row.created_at },
      ],
    });

  const exportFrozenFunds = () =>
    shareCsv({
      label: 'Frozen Funds',
      rows: frozenRows,
      columns: [
        { label: 'ID', value: (row) => row.id },
        { label: 'User ID', value: (row) => row.user_id },
        { label: 'User', value: (row) => row.user_name || row.user_email },
        { label: 'Amount', value: (row) => row.amount },
        { label: 'Reason', value: (row) => row.reason },
        { label: 'Status', value: (row) => row.status },
        { label: 'Frozen At', value: (row) => row.frozen_at || row.created_at },
      ],
    });

  const exportStatePerformance = () =>
    shareCsv({
      label: 'State Admin Performance',
      rows: performanceRows,
      columns: [
        { label: 'Admin', value: (row) => row.admin_name || row.full_name || row.email },
        { label: 'State', value: (row) => row.assigned_state },
        { label: 'City', value: (row) => row.assigned_city },
        { label: 'Total Paid', value: (row) => row.total_paid },
        { label: 'Total Pending', value: (row) => row.total_pending },
        { label: 'Total Withdrawn', value: (row) => row.total_withdrawn },
      ],
    });

  const exportCommissionConfig = () =>
    shareCsv({
      label: 'Commission Configuration',
      rows: commissionEntries.map(([key, config]) => ({ key, ...(config || {}) })),
      columns: [
        { label: 'Key', value: (row) => row.key },
        { label: 'Value', value: (row) => row.value },
        { label: 'Description', value: (row) => row.description },
        { label: 'Updated At', value: (row) => row.updated_at },
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
      Toast.show({ type: 'success', text1: 'Commission config saved' });
      setCommEditVisible(false);
      loadControls();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Save failed',
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
        label: 'Transaction Reconciliation',
        rows,
        columns: [
          { label: 'ID', value: (row) => row.id || row.transaction_id },
          { label: 'Reference', value: (row) => row.reference || row.payment_reference },
          { label: 'User', value: (row) => row.user_name || row.email || row.user_email },
          { label: 'Amount', value: (row) => row.amount || row.total_amount },
          { label: 'Status', value: (row) => row.status || row.payment_status },
          { label: 'Type', value: (row) => row.payment_type || row.transaction_type },
          { label: 'Created At', value: (row) => row.created_at || row.payment_date },
        ],
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Transactions unavailable',
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
        text1: 'Complete the freeze form',
        text2: 'User ID, amount and reason are required.',
      });
      return;
    }

    Alert.alert(
      'Freeze user funds?',
      `This will request a freeze of ${formatCurrency(amount)} for user #${userId}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Freeze funds',
          style: 'destructive',
          onPress: async () => {
            setSubmittingFreeze(true);
            try {
              await financialAdminService.freezeFunds({ userId, amount, reason });
              Toast.show({ type: 'success', text1: 'Funds freeze submitted' });
              setFreezeForm({ userId: '', amount: '', reason: '' });
              setFreezeModalVisible(false);
              loadControls();
            } catch (error) {
              Toast.show({
                type: 'error',
                text1: 'Freeze failed',
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
          eyebrow="ADVANCED FINANCE"
          title="Controls and reconciliation"
          subtitle="Audit money movement, settlement health, frozen funds, commission rules and export handoff from a native workspace."
          icon="shield-checkmark-outline"
          onRefresh={loadControls}
        />

        <MetricGrid>
          <MetricCard
            label="Audit rows"
            value={String(auditRows.length || auditTotal || 0)}
            icon="receipt-outline"
            color={colors.blue}
          />
          <MetricCard
            label="Frozen funds"
            value={formatCurrency(frozenTotal)}
            icon="lock-closed-outline"
            color={colors.danger}
          />
          <MetricCard
            label="State admins"
            value={String(performanceStats?.total_admins || performanceRows.length || 0)}
            icon="people-outline"
            color={colors.success}
          />
          <MetricCard
            label="Config keys"
            value={String(commissionEntries.length)}
            icon="options-outline"
            color="#A66B00"
          />
        </MetricGrid>

        <DashboardSection
          title="Settlement workbench"
          subtitle="The important settlement queues are now reachable as native screens."
        >
          <ActionRow
            title="Withdrawal approvals"
            subtitle="Approve, reject and review pending payout requests."
            icon="cash-outline"
            onPress={() => navigation.navigate('FinancialWithdrawals')}
          />
          <ActionRow
            title="Transaction reconciliation"
            subtitle="Filter payment history and compare status, wallet credit and commission rows."
            icon="swap-horizontal-outline"
            onPress={() => navigation.navigate('FinancialTransactions')}
          />
          <ActionRow
            title="Revenue reports"
            subtitle="Review revenue summary and recent transaction movement."
            icon="trending-up-outline"
            onPress={() => navigation.navigate('FinancialRevenueReport')}
          />
        </DashboardSection>

        <DashboardSection
          title="Freeze controls"
          subtitle="High-risk fund actions require confirmation before they touch the backend."
        >
          <DashboardNotice
            variant="warning"
            title="Sensitive finance action"
            message="Freeze requests are protected by the server role checks and still require a confirmation prompt in the app."
          />
          <ActionRow
            title="Freeze user funds"
            subtitle="Open a native confirmation form for super-financial review."
            icon="lock-closed-outline"
            badge="Protected"
            onPress={() => setFreezeModalVisible(true)}
          />
          <View style={styles.cardStack}>
            {frozenRows.slice(0, 4).map((item) => (
              <View key={String(item.id)} style={styles.recordCard}>
                <View style={styles.recordTop}>
                  <Text style={styles.recordTitle}>{item.user_name || item.user_email || `User #${item.user_id}`}</Text>
                  <Text style={styles.dangerValue}>{formatCurrency(item.amount)}</Text>
                </View>
                <Text style={styles.recordMeta}>{item.reason || 'No freeze reason recorded'}</Text>
                <Text style={styles.recordDate}>Frozen {compactDate(item.frozen_at || item.created_at)}</Text>
              </View>
            ))}
            {frozenRows.length === 0 ? <EmptyState message="No frozen funds found." /> : null}
          </View>
        </DashboardSection>

        <DashboardSection
          title="Audit trail"
          subtitle="Recent money-impacting actions and reconciliation categories."
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
            {auditBreakdown.slice(0, 8).map((item) => (
              <SummaryPill
                key={item.action_type}
                label={String(item.action_type || 'action').replace(/_/g, ' ')}
                value={String(item.count || 0)}
              />
            ))}
            {auditBreakdown.length === 0 ? <SummaryPill label="audit" value="0" tone="warning" /> : null}
          </ScrollView>

          <View style={styles.cardStack}>
            {auditRows.slice(0, 6).map((item) => (
              <View key={String(item.id)} style={styles.recordCard}>
                <View style={styles.recordTop}>
                  <Text style={styles.recordTitle}>{String(item.action_type || 'audit').replace(/_/g, ' ')}</Text>
                  <Text style={styles.recordAmount}>{formatCurrency(item.amount || 0)}</Text>
                </View>
                <Text style={styles.recordMeta}>{item.description || item.user_email || 'No description recorded'}</Text>
                <Text style={styles.recordDate}>
                  {item.performed_by_name || item.admin_name || 'System'} • {compactDate(item.performed_at || item.created_at)}
                </Text>
              </View>
            ))}
            {auditRows.length === 0 ? <EmptyState message="No audit activity returned." /> : null}
          </View>
        </DashboardSection>

        <DashboardSection
          title="Admin performance"
          subtitle="Native view of pending, paid and withdrawn commission pressure by admin."
        >
          <View style={styles.statsGrid}>
            <SummaryPill label="Pending" value={formatCurrency(performanceStats?.total_pending_commissions)} tone="warning" />
            <SummaryPill label="Paid" value={formatCurrency(performanceStats?.total_paid_commissions)} />
            <SummaryPill label="Withdrawn" value={formatCurrency(performanceStats?.total_withdrawn_amount)} />
          </View>
          <View style={styles.cardStack}>
            {performanceRows.slice(0, 5).map((item) => (
              <View key={String(item.admin_id || item.id)} style={styles.recordCard}>
                <View style={styles.recordTop}>
                  <Text style={styles.recordTitle}>{item.full_name || item.admin_name || `Admin #${item.admin_id}`}</Text>
                  <Text style={styles.recordAmount}>{formatCurrency(item.total_pending)}</Text>
                </View>
                <Text style={styles.recordMeta}>
                  {(item.assigned_state || 'Unassigned state')} {item.assigned_city ? `• ${item.assigned_city}` : ''}
                </Text>
                <Text style={styles.recordDate}>
                  Paid {formatCurrency(item.total_paid)} • Withdrawn {formatCurrency(item.total_withdrawn)}
                </Text>
              </View>
            ))}
            {performanceRows.length === 0 ? <EmptyState message="No admin performance rows found." /> : null}
          </View>
        </DashboardSection>

        <DashboardSection
          title="Commission configuration"
          subtitle="Current finance rules are visible in-app; changing them remains server-protected."
        >
          <ActionRow
            title="Edit commission config"
            subtitle="Modify commission rates and finance rules."
            icon="create-outline"
            badge="Edit"
            onPress={openCommEdit}
          />
          <View style={styles.cardStack}>
            {commissionEntries.slice(0, 8).map(([key, config]) => (
              <View key={key} style={styles.configCard}>
                <View style={styles.recordTop}>
                  <Text style={styles.recordTitle}>{key.replace(/_/g, ' ')}</Text>
                  <Text style={styles.recordAmount}>{Number(config?.value || 0).toLocaleString()}</Text>
                </View>
                <Text style={styles.recordMeta}>{config?.description || 'No description'}</Text>
                <Text style={styles.recordDate}>Updated {compactDate(config?.updated_at)}</Text>
              </View>
            ))}
            {commissionEntries.length === 0 ? <EmptyState message="Commission config is not available for this role." /> : null}
          </View>
        </DashboardSection>

        <DashboardSection
          title="Exports"
          subtitle="Generate CSV-style exports from the native finance data and share them through the device share sheet."
        >
          <ActionRow
            title="Export transaction reconciliation"
            subtitle="Fetch the latest 100 transaction rows and share as CSV text."
            icon="download-outline"
            badge={exporting === 'Transaction Reconciliation' ? 'Preparing' : 'CSV'}
            onPress={exportTransactions}
          />
          <ActionRow
            title="Export audit trail"
            subtitle="Share the currently loaded financial audit rows."
            icon="receipt-outline"
            badge={exporting === 'Financial Audit Trail' ? 'Preparing' : 'CSV'}
            onPress={exportAuditTrail}
          />
          <ActionRow
            title="Export frozen funds"
            subtitle="Share frozen fund records visible in this workspace."
            icon="lock-closed-outline"
            badge={exporting === 'Frozen Funds' ? 'Preparing' : 'CSV'}
            onPress={exportFrozenFunds}
          />
          <ActionRow
            title="Export state performance"
            subtitle="Share state-admin settlement and withdrawal performance rows."
            icon="people-outline"
            badge={exporting === 'State Admin Performance' ? 'Preparing' : 'CSV'}
            onPress={exportStatePerformance}
          />
          <ActionRow
            title="Export commission config"
            subtitle="Share the active commission settings snapshot."
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
              <Text style={styles.modalTitle}>Freeze user funds</Text>
              <TouchableOpacity accessibilityRole="button" onPress={() => setFreezeModalVisible(false)}>
                <Icon name="close" size={22} color={colors.muted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Enter the user ID, amount and finance reason. The backend will still reject this if your role is not allowed.
            </Text>
            <TextInput
              style={styles.input}
              value={freezeForm.userId}
              onChangeText={(userId) => setFreezeForm((current) => ({ ...current, userId }))}
              placeholder="User ID"
              keyboardType="number-pad"
              placeholderTextColor={colors.muted}
            />
            <TextInput
              style={styles.input}
              value={freezeForm.amount}
              onChangeText={(amount) => setFreezeForm((current) => ({ ...current, amount }))}
              placeholder="Amount"
              keyboardType="decimal-pad"
              placeholderTextColor={colors.muted}
            />
            <TextInput
              style={[styles.input, styles.reasonInput]}
              value={freezeForm.reason}
              onChangeText={(reason) => setFreezeForm((current) => ({ ...current, reason }))}
              placeholder="Reason"
              multiline
              placeholderTextColor={colors.muted}
            />
            <TouchableOpacity
              accessibilityRole="button"
              disabled={submittingFreeze}
              style={[styles.freezeButton, submittingFreeze && styles.disabledButton]}
              onPress={confirmFreezeFunds}
            >
              {submittingFreeze ? <ActivityIndicator color={colors.white} /> : <Text style={styles.freezeButtonText}>Confirm freeze</Text>}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={commEditVisible} transparent animationType="slide" onRequestClose={() => setCommEditVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setCommEditVisible(false)}>
          <Pressable style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit commission config</Text>
              <TouchableOpacity accessibilityRole="button" onPress={() => setCommEditVisible(false)}>
                <Icon name="close" size={22} color={colors.muted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {Object.entries(commEditValues).map(([key, val]) => (
                <View key={key} style={{ marginBottom: 12 }}>
                  <Text style={[styles.recordMeta, { marginBottom: 4 }]}>{key.replace(/_/g, ' ')}</Text>
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
              {savingComm ? <ActivityIndicator color={colors.white} /> : <Text style={styles.freezeButtonText}>Save changes</Text>}
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
    fontSize: 10,
    textTransform: 'capitalize',
  },
  pillValue: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 14,
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
    fontSize: 14,
    textTransform: 'capitalize',
  },
  recordAmount: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: 13,
  },
  dangerValue: {
    color: colors.danger,
    fontFamily: typography.bold,
    fontSize: 13,
  },
  recordMeta: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  recordDate: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 11,
    lineHeight: 16,
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
    fontSize: 12,
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
    fontFamily: typography.bold,
    fontSize: 20,
  },
  modalSubtitle: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  input: {
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.ink,
    fontFamily: typography.medium,
    fontSize: 14,
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
    fontFamily: typography.bold,
    fontSize: 14,
  },
});

export default FinancialControlsScreen;
