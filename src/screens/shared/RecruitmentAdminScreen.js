import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import recruitmentService from '../../services/recruitmentService';
import { colors, radius, typography } from '../../theme';
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
import AdminAccountActions from '../../components/admin/AdminAccountActions';

import AppText from '../../components/common/AppText';
const statusOptions = ['all', 'submitted', 'under_review', 'shortlisted', 'approved', 'rejected', 'disqualified'];
const paymentOptions = ['all', 'pending', 'paid', 'failed'];

const formatCurrency = (value) => `₦${Number(value || 0).toLocaleString()}`;

const getList = (response) => {
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.data)) return response.data;
  return pickList(response, ['data']);
};

const getObject = (response) => {
  if (response?.data?.data && typeof response.data.data === 'object') return response.data.data;
  return pickObject(response?.data || response, ['data']);
};

const Chip = ({ label, active, onPress }) => (
  <TouchableOpacity
    accessibilityRole="button"
    style={[styles.chip, active && styles.chipActive]}
    onPress={onPress}
  >
    <AppText style={[styles.chipText, active && styles.chipTextActive]}>{label.replace(/_/g, ' ')}</AppText>
  </TouchableOpacity>
);

const ApplicantCard = ({ applicant, onDecision, onReport }) => {
  const score = applicant.interview_score ?? applicant.score;
  const hasViolation = applicant.violation_detected || applicant.status === 'disqualified';

  return (
    <View style={styles.applicantCard}>
      <View style={styles.applicantHeader}>
        <View style={styles.avatar}>
          <AppText style={styles.avatarText}>{String(applicant.full_name || applicant.email_address || '?').slice(0, 1).toUpperCase()}</AppText>
        </View>
        <View style={styles.applicantMain}>
          <AppText style={styles.applicantName}>{applicant.full_name || 'Unnamed applicant'}</AppText>
          <AppText style={styles.applicantMeta}>{applicant.reference_number || applicant.email_address || 'No reference'}</AppText>
        </View>
        <AppText style={[styles.statusBadge, hasViolation && styles.statusDanger]}>{applicant.status || 'draft'}</AppText>
      </View>

      <View style={styles.detailGrid}>
        <AppText style={styles.detailText}>Role: {applicant.role_title || 'N/A'}</AppText>
        <AppText style={styles.detailText}>Payment: {applicant.payment_status || 'pending'}</AppText>
        <AppText style={styles.detailText}>Location: {[applicant.state_name, applicant.lga_name].filter(Boolean).join(', ') || 'N/A'}</AppText>
        <AppText style={styles.detailText}>Interview: {score != null ? `${Math.round(Number(score))}%` : 'Not completed'}</AppText>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => onDecision(applicant, 'shortlist')}>
          <AppText style={styles.actionText}>Shortlist</AppText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => onDecision(applicant, 'approve')}>
          <AppText style={styles.approveText}>Approve</AppText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => onDecision(applicant, 'reject')}>
          <AppText style={styles.rejectText}>Reject</AppText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => onReport(applicant)}>
          <AppText style={styles.reportText}>Report</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const RecruitmentAdminScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState(null);
  const [roles, setRoles] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [detailModal, setDetailModal] = useState({
    applicant: null,
    loading: false,
    visible: false,
  });
  const [filters, setFilters] = useState({
    status: 'all',
    payment_status: 'all',
    cycle_id: '',
    role_id: '',
    search: '',
    page: 1,
  });

  const queryParams = useMemo(() => {
    const params = { limit: 25, page: filters.page };
    if (filters.status !== 'all') params.status = filters.status;
    if (filters.payment_status !== 'all') params.payment_status = filters.payment_status;
    if (filters.cycle_id) params.cycle_id = filters.cycle_id;
    if (filters.role_id) params.role_id = filters.role_id;
    if (filters.search.trim()) params.search = filters.search.trim();
    return params;
  }, [filters]);

  const loadData = useCallback(async ({ soft = false } = {}) => {
    if (soft) setRefreshing(true);
    else setLoading(true);

    try {
      const [statusRes, cyclesRes, rolesRes, analyticsRes, applicantsRes] = await Promise.all([
        recruitmentService.getStatus(),
        recruitmentService.getAdminCycles(),
        recruitmentService.getAdminRoles(),
        recruitmentService.getAnalytics(filters.cycle_id ? { cycle_id: filters.cycle_id } : {}),
        recruitmentService.getApplicants(queryParams),
      ]);

      setStatus(getObject(statusRes));
      setCycles(getList(cyclesRes));
      setRoles(getList(rolesRes));
      setAnalytics(getObject(analyticsRes));
      setApplicants(getList(applicantsRes));
      setPagination(applicantsRes?.data?.pagination || applicantsRes?.pagination || null);
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Recruitment admin failed',
        text2: getErrorMessage(err, 'Could not load recruitment admin overview'),
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters.cycle_id, queryParams]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const funnel = Array.isArray(analytics?.conversion_funnel) ? analytics.conversion_funnel : [];
  const paidFees = analytics?.total_fees_collected || 0;
  const completedInterviews = analytics?.interview?.completed || 0;
  const averageScore = analytics?.interview?.average_score || 0;

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value, page: 1 }));
  };

  const confirmDecision = (applicant, action) => {
    const actionLabel = action === 'shortlist' ? 'shortlist' : action;
    Alert.alert(
      `${actionLabel.charAt(0).toUpperCase()}${actionLabel.slice(1)} applicant?`,
      `${applicant.full_name || applicant.reference_number || 'This applicant'} will be marked ${actionLabel}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: actionLabel,
          style: action === 'reject' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              const payload = { notes: `Updated from RentalHub mobile recruitment admin` };
              if (action === 'approve') await recruitmentService.approveApplicant(applicant.id, payload);
              if (action === 'reject') await recruitmentService.rejectApplicant(applicant.id, { ...payload, reason: 'Rejected from mobile recruitment admin' });
              if (action === 'shortlist') await recruitmentService.shortlistApplicant(applicant.id, payload);
              Toast.show({ type: 'success', text1: `Applicant ${actionLabel}ed` });
              loadData({ soft: true });
            } catch (err) {
              Toast.show({
                type: 'error',
                text1: 'Decision failed',
                text2: getErrorMessage(err, 'Could not update applicant'),
              });
            }
          },
        },
      ]
    );
  };

  const closeApplicantDetails = () => {
    setDetailModal({ applicant: null, loading: false, visible: false });
  };

  const openApplicantReport = async (applicant) => {
    setDetailModal({ applicant, loading: true, visible: true });
    try {
      const response = await recruitmentService.getApplicantDetail(applicant.id);
      setDetailModal({
        applicant: {
          ...applicant,
          ...getObject(response),
        },
        loading: false,
        visible: true,
      });
    } catch (err) {
      setDetailModal({ applicant, loading: false, visible: true });
      Toast.show({
        type: 'error',
        text1: 'Applicant details unavailable',
        text2: getErrorMessage(err, 'Could not load the full applicant record'),
      });
    }
  };

  const sendExportEmail = () => {
    Alert.alert(
      'Email recruitment export?',
      'This sends a CSV export for the current filters to the configured recruitment email.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send export',
          onPress: async () => {
            try {
              await recruitmentService.emailDocuments({
                ...queryParams,
                application_ids: applicants.map((applicant) => applicant.id).filter(Boolean),
              });
              Toast.show({ type: 'success', text1: 'Recruitment export sent' });
            } catch (err) {
              Toast.show({
                type: 'error',
                text1: 'Export failed',
                text2: getErrorMessage(err, 'Could not send recruitment export'),
              });
            }
          },
        },
      ]
    );
  };

  return (
    <DashboardScreen refreshing={loading || refreshing} onRefresh={() => loadData({ soft: true })}>
      <DashboardHero
        eyebrow="RECRUITMENT ADMIN"
        title="Hiring command centre"
        subtitle="Filter candidates, review interview/payment health, make decisions and export reports natively."
        icon="briefcase-outline"
        onRefresh={() => loadData({ soft: true })}
      />

      <AdminAccountActions navigation={navigation} />

      <MetricGrid>
        <MetricCard label="Applicants" value={String(analytics?.total_applicants || pagination?.total || applicants.length)} icon="people-outline" color={colors.blue} />
        <MetricCard label="Fees" value={formatCurrency(paidFees)} icon="card-outline" color={colors.success} />
        <MetricCard label="Interviews" value={String(completedInterviews)} icon="videocam-outline" color="#A66B00" />
        <MetricCard label="Avg score" value={`${Math.round(Number(averageScore || 0))}%`} icon="school-outline" color={colors.navy} />
      </MetricGrid>

      <DashboardSection title="Recruitment status">
        <DashboardNotice
          title={status?.is_active ? 'Recruitment is open' : 'Recruitment is closed'}
          message={status?.message || 'Use this workspace to monitor cycles, roles, applicants and hiring decisions.'}
          variant={status?.is_active ? 'info' : 'warning'}
        />
      </DashboardSection>

      <DashboardSection
        title="Filters"
        subtitle="Narrow candidates by status, payment, cycle, role, and search text."
      >
        <TextInput
          value={filters.search}
          onChangeText={(search) => updateFilter('search', search)}
          placeholder="Search name, email, phone or reference"
          placeholderTextColor={colors.muted}
          style={styles.searchInput}
        />

        <AppText style={styles.filterLabel}>Status</AppText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {statusOptions.map((option) => (
            <Chip key={option} label={option} active={filters.status === option} onPress={() => updateFilter('status', option)} />
          ))}
        </ScrollView>

        <AppText style={styles.filterLabel}>Payment</AppText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {paymentOptions.map((option) => (
            <Chip key={option} label={option} active={filters.payment_status === option} onPress={() => updateFilter('payment_status', option)} />
          ))}
        </ScrollView>

        <AppText style={styles.filterLabel}>Cycles</AppText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <Chip label="All cycles" active={!filters.cycle_id} onPress={() => updateFilter('cycle_id', '')} />
          {cycles.map((cycle) => (
            <Chip
              key={String(cycle.id)}
              label={cycle.title || cycle.name || `Cycle ${cycle.id}`}
              active={String(filters.cycle_id) === String(cycle.id)}
              onPress={() => updateFilter('cycle_id', String(cycle.id))}
            />
          ))}
        </ScrollView>

        <AppText style={styles.filterLabel}>Roles</AppText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <Chip label="All roles" active={!filters.role_id} onPress={() => updateFilter('role_id', '')} />
          {roles.map((role) => (
            <Chip
              key={String(role.id)}
              label={role.title || `Role ${role.id}`}
              active={String(filters.role_id) === String(role.id)}
              onPress={() => updateFilter('role_id', String(role.id))}
            />
          ))}
        </ScrollView>
      </DashboardSection>

      <DashboardSection
        title="Hiring funnel"
        subtitle="Status breakdown from the current analytics set."
      >
        <View style={styles.funnelGrid}>
          {funnel.length ? funnel.map((item) => (
            <View key={item.status || 'unknown'} style={styles.funnelCard}>
              <AppText style={styles.funnelLabel}>{String(item.status || 'unknown').replace(/_/g, ' ')}</AppText>
              <AppText style={styles.funnelValue}>{item.count || 0}</AppText>
            </View>
          )) : (
            <View style={styles.funnelCard}>
              <AppText style={styles.funnelLabel}>No funnel data</AppText>
              <AppText style={styles.funnelValue}>0</AppText>
            </View>
          )}
        </View>
      </DashboardSection>

      <DashboardSection
        title="Candidates"
        subtitle={`${pagination?.total || applicants.length} matching applicants`}
      >
        {applicants.map((applicant) => (
          <ApplicantCard
            key={String(applicant.id)}
            applicant={applicant}
            onDecision={confirmDecision}
            onReport={openApplicantReport}
          />
        ))}
        {!applicants.length ? (
          <View style={styles.emptyCard}>
            <Icon name="search-outline" size={24} color={colors.muted} />
            <AppText style={styles.emptyText}>No applicants match the current filters.</AppText>
          </View>
        ) : null}
      </DashboardSection>

      <DashboardSection
        title="Reports and exports"
        subtitle="Candidate reports, filtered CSV email exports and hiring decisions stay inside the mobile workflow."
      >
        <ActionRow
          title="Email filtered CSV export"
          subtitle="Send applicant summary for the current filters."
          icon="mail-outline"
          onPress={sendExportEmail}
        />
      </DashboardSection>

      <Modal
        animationType="slide"
        transparent
        visible={detailModal.visible}
        onRequestClose={closeApplicantDetails}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeApplicantDetails}>
          <Pressable style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <AppText style={styles.modalEyebrow}>APPLICANT REPORT</AppText>
                <AppText style={styles.modalTitle}>
                  {detailModal.applicant?.full_name || 'Applicant details'}
                </AppText>
              </View>
              <TouchableOpacity accessibilityRole="button" onPress={closeApplicantDetails}>
                <Icon name="close" size={22} color={colors.muted} />
              </TouchableOpacity>
            </View>

            {detailModal.loading ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator color={colors.blue} />
                <AppText style={styles.modalMuted}>Loading applicant record…</AppText>
              </View>
            ) : (
              <ScrollView contentContainerStyle={styles.detailList}>
                {[
                  ['Reference', detailModal.applicant?.reference_number],
                  ['Email', detailModal.applicant?.email_address],
                  ['Phone', detailModal.applicant?.phone_number],
                  ['Role', detailModal.applicant?.role_title],
                  ['Location', [detailModal.applicant?.state_name, detailModal.applicant?.lga_name].filter(Boolean).join(', ')],
                  ['Status', detailModal.applicant?.status],
                  ['Payment', detailModal.applicant?.payment_status],
                  ['Interview score', detailModal.applicant?.interview_score ?? detailModal.applicant?.score],
                  ['Education', detailModal.applicant?.highest_education],
                  ['Experience', detailModal.applicant?.years_of_experience],
                  ['Submitted', detailModal.applicant?.created_at],
                ].map(([label, value]) => (
                  <View key={label} style={styles.detailRow}>
                    <AppText style={styles.detailLabel}>{label}</AppText>
                    <AppText style={styles.detailValue}>{value || 'N/A'}</AppText>
                  </View>
                ))}
                {detailModal.applicant?.suitability_reason ? (
                  <View style={styles.detailBlock}>
                    <AppText style={styles.detailLabel}>Suitability note</AppText>
                    <AppText style={styles.detailValue}>{detailModal.applicant.suitability_reason}</AppText>
                  </View>
                ) : null}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </DashboardScreen>
  );
};

const styles = StyleSheet.create({
  searchInput: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.ink,
    fontFamily: typography.medium,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  filterLabel: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 13,
    marginTop: 7,
  },
  chipRow: {
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: colors.blue,
    borderColor: colors.blue,
  },
  chipText: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: 13,
    textTransform: 'capitalize',
  },
  chipTextActive: {
    color: colors.white,
  },
  funnelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  funnelCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 12,
    width: '48%',
  },
  funnelLabel: {
    color: colors.muted,
    fontFamily: typography.semibold,
    fontSize: 13,
    textTransform: 'capitalize',
  },
  funnelValue: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 24,
    marginTop: 4,
  },
  applicantCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 14,
  },
  applicantHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  avatarText: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: 16,
  },
  applicantMain: {
    flex: 1,
  },
  applicantName: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 16,
  },
  applicantMeta: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 13,
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: '#ECFDF3',
    borderRadius: radius.pill,
    color: colors.success,
    fontFamily: typography.bold,
    fontSize: 13,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
    textTransform: 'capitalize',
  },
  statusDanger: {
    backgroundColor: '#FEF3F2',
    color: colors.danger,
  },
  detailGrid: {
    gap: 3,
    marginTop: 11,
  },
  detailText: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 17,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    backgroundColor: colors.surfaceBlue,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  actionText: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: 13,
  },
  approveText: {
    color: colors.success,
    fontFamily: typography.bold,
    fontSize: 13,
  },
  rejectText: {
    color: colors.danger,
    fontFamily: typography.bold,
    fontSize: 13,
  },
  reportText: {
    color: colors.navy,
    fontFamily: typography.bold,
    fontSize: 13,
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 8,
    padding: 18,
  },
  emptyText: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 13,
    textAlign: 'center',
  },
  modalBackdrop: {
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '82%',
    padding: 18,
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalEyebrow: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: 13,
    letterSpacing: 0.5,
  },
  modalTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 20,
    marginTop: 3,
  },
  modalLoading: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 28,
  },
  modalMuted: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 13,
  },
  detailList: {
    gap: 9,
    paddingBottom: 22,
  },
  detailRow: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 11,
  },
  detailBlock: {
    backgroundColor: '#F8FAFC',
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 12,
  },
  detailLabel: {
    color: colors.muted,
    fontFamily: typography.semibold,
    fontSize: 13,
    textTransform: 'uppercase',
  },
  detailValue: {
    color: colors.ink,
    fontFamily: typography.medium,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 3,
  },
});

export default RecruitmentAdminScreen;
