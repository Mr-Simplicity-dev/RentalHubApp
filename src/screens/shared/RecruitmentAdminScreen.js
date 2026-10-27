import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import RecruitmentOpportunityManager from '../../components/admin/RecruitmentOpportunityManager';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import TextInput from '../../components/common/AppTextInput';
import Icon from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import recruitmentService from '../../services/recruitmentService';
import { colors, radius, typography, typeScale } from '../../theme';
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
const paymentOptions = ['all', 'not_applicable', 'pending', 'paid', 'failed'];

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

const Chip = ({ label, active, onPress }) => { useInterfaceLanguage(); return (<TouchableOpacity
    accessibilityRole="button"
    style={[styles.chip, active && styles.chipActive]}
    onPress={onPress}
  >
    <AppText style={[styles.chipText, active && styles.chipTextActive]}>{label.replace(/_/g, ' ')}</AppText>
  </TouchableOpacity>); };

const ApplicantCard = ({ applicant, onDecision, onReport }) => {
  useInterfaceLanguage();
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
        <AppText style={styles.detailText}>{ui("Role: ")}{applicant.role_title || ui("N/A")} {applicant.opportunity_type==="volunteer"?'· VOLUNTEER':''}</AppText>
        <AppText style={styles.detailText}>{ui("Payment: ")}{applicant.opportunity_type==="volunteer"?'Not Applicable':(applicant.payment_status||ui("pending"))}</AppText>
        <AppText style={styles.detailText}>{ui("Location: ")}{[applicant.state_name, applicant.lga_name].filter(Boolean).join(', ') || ui("N/A")}</AppText>
        <AppText style={styles.detailText}>{ui("Interview: ")}{score != null ? ui("{value0}%", {value0: (Math.round(Number(score)))}) : 'Not completed'}</AppText>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => onDecision(applicant, 'shortlist')}>
          <AppText style={styles.actionText}>{ui("Shortlist")}</AppText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => onDecision(applicant, 'approve')}>
          <AppText style={styles.approveText}>{ui("Approve")}</AppText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => onDecision(applicant, 'reject')}>
          <AppText style={styles.rejectText}>{ui("Reject")}</AppText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => onReport(applicant)}>
          <AppText style={styles.reportText}>{ui("Report")}</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const RecruitmentAdminScreen = ({ navigation }) => {
  const interfaceLanguage = useInterfaceLanguage();
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
    opportunity_type: '',
    status: 'all',
    payment_status: 'all',
    cycle_id: '',
    role_id: '',
    search: '',
    page: 1,
  });

  const queryParams = useMemo(() => {
    const params = { limit: 25, page: filters.page };
    if(filters.opportunity_type)params.opportunity_type=filters.opportunity_type;
    if (filters.status !== 'all') params.status = filters.status;
    if (filters.payment_status !== 'all') params.payment_status = filters.payment_status;
    if (filters.cycle_id) params.cycle_id = filters.cycle_id;
    if (filters.role_id) params.role_id = filters.role_id;
    if (filters.search.trim()) params.search = filters.search.trim();
    return params;
  }, [filters, interfaceLanguage]);

  const loadData = useCallback(async ({ soft = false } = {}) => {
    if (soft) setRefreshing(true);
    else setLoading(true);

    try {
      const [statusRes, cyclesRes, rolesRes, analyticsRes, applicantsRes] = await Promise.all([
        recruitmentService.getStatus(),
        recruitmentService.getAdminCycles(),
        recruitmentService.getAdminRoles(),
        recruitmentService.getAnalytics({cycle_id:filters.cycle_id||undefined,opportunity_type:filters.opportunity_type||undefined}),
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
        text1: ui("Recruitment admin failed"),
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
      `${applicant.full_name || applicant.reference_number || ui("This applicant")} will be marked ${actionLabel}.`,
      [
        { text: ui("Cancel"), style: 'cancel' },
        {
          text: actionLabel,
          style: action === 'reject' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              const payload = { notes: `Updated from RentalHub mobile recruitment admin` };
              if (action === 'approve') await recruitmentService.approveApplicant(applicant.id, payload);
              if (action === 'reject') await recruitmentService.rejectApplicant(applicant.id, { ...payload, reason: 'Rejected from mobile recruitment admin' });
              if (action === 'shortlist') await recruitmentService.shortlistApplicant(applicant.id, payload);
              Toast.show({ type: 'success', text1: ui("Applicant {value0}ed", {value0: (actionLabel)}) });
              loadData({ soft: true });
            } catch (err) {
              Toast.show({
                type: 'error',
                text1: ui("Decision failed"),
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
        text1: ui("Applicant details unavailable"),
        text2: getErrorMessage(err, 'Could not load the full applicant record'),
      });
    }
  };

  const sendExportEmail = () => {
    Alert.alert(
      ui("Email recruitment export?"),
      ui("This sends a CSV export for the current filters to the configured recruitment email."),
      [
        { text: ui("Cancel"), style: 'cancel' },
        {
          text: ui("Send export"),
          onPress: async () => {
            try {
              await recruitmentService.emailDocuments({
                ...queryParams,
                application_ids: applicants.map((applicant) => applicant.id).filter(Boolean),
              });
              Toast.show({ type: 'success', text1: ui("Recruitment export sent") });
            } catch (err) {
              Toast.show({
                type: 'error',
                text1: ui("Export failed"),
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
        eyebrow={ui("RECRUITMENT ADMIN")}
        title={ui("Hiring command centre")}
        subtitle={ui("Filter candidates, review interview/payment health, make decisions and export reports natively.")}
        icon="briefcase-outline"
        onRefresh={() => loadData({ soft: true })}
      />

      <AdminAccountActions navigation={navigation} />

      <MetricGrid tourTarget="recruitment_overview" tourLabel={ui("Recruitment overview")}>
        <MetricCard label={ui("Volunteers")} value={String(analytics?.volunteer_applicants||0)} icon="heart-outline" color={colors.success} />
        <MetricCard label={ui("Applicants")} value={String(analytics?.total_applicants || pagination?.total || applicants.length)} icon="people-outline" color={colors.blue} />
        <MetricCard label={ui("Fees")} value={formatCurrency(paidFees)} icon="card-outline" color={colors.success} />
        <MetricCard label={ui("Interviews")} value={String(completedInterviews)} icon="videocam-outline" color="#A66B00" />
        <MetricCard label={ui("Avg score")} value={`${Math.round(Number(averageScore || 0))}%`} icon="school-outline" color={colors.navy} />
      </MetricGrid>

      <RecruitmentOpportunityManager status={status} cycles={cycles} roles={roles} onSaved={loadData} />
      <DashboardSection title={ui("Recruitment status")}>
        <DashboardNotice
          title={status?.is_active ? 'Recruitment is open' : 'Recruitment is closed'}
          message={status?.message || 'Use this workspace to monitor cycles, roles, applicants and hiring decisions.'}
          variant={status?.is_active ? 'info' : 'warning'}
        />
      </DashboardSection>

      <DashboardSection
        title={ui("Filters")}
        subtitle={ui("Narrow candidates by status, payment, cycle, role, and search text.")}
        tourTarget="recruitment_filters"
      >
        <TextInput
          value={filters.search}
          onChangeText={(search) => updateFilter('search', search)}
          placeholder={ui("Search name, email, phone or reference")}
          placeholderTextColor={colors.muted}
          style={styles.searchInput}
        />

        <AppText style={styles.filterLabel}>{ui("Opportunity type")}</AppText><View style={styles.chipRow}>{['','employment','volunteer'].map(type=><Chip key={type||'all'} label={type||'All opportunities'} active={filters.opportunity_type===type} onPress={()=>{updateFilter('opportunity_type',type);updateFilter('payment_status','all');}}/>)}</View>
        <AppText style={styles.filterLabel}>{ui("Status")}</AppText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {statusOptions.map((option) => (
            <Chip key={option} label={option} active={filters.status === option} onPress={() => updateFilter('status', option)} />
          ))}
        </ScrollView>

        <AppText style={styles.filterLabel}>{ui("Payment")}</AppText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {paymentOptions.map((option) => (
            <Chip key={option} label={option} active={filters.payment_status === option} onPress={() => updateFilter('payment_status', option)} />
          ))}
        </ScrollView>

        <AppText style={styles.filterLabel}>{ui("Cycles")}</AppText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <Chip label={ui("All cycles")} active={!filters.cycle_id} onPress={() => updateFilter('cycle_id', '')} />
          {cycles.map((cycle) => (
            <Chip
              key={String(cycle.id)}
              label={cycle.title || cycle.name || ui("Cycle {value0}", {value0: (cycle.id)})}
              active={String(filters.cycle_id) === String(cycle.id)}
              onPress={() => updateFilter('cycle_id', String(cycle.id))}
            />
          ))}
        </ScrollView>

        <AppText style={styles.filterLabel}>{ui("Roles")}</AppText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <Chip label={ui("All roles")} active={!filters.role_id} onPress={() => updateFilter('role_id', '')} />
          {roles.map((role) => (
            <Chip
              key={String(role.id)}
              label={role.title || ui("Role {value0}", {value0: (role.id)})}
              active={String(filters.role_id) === String(role.id)}
              onPress={() => updateFilter('role_id', String(role.id))}
            />
          ))}
        </ScrollView>
      </DashboardSection>

      <DashboardSection
        title={ui("Hiring funnel")}
        subtitle={ui("Status breakdown from the current analytics set.")}
      >
        <View style={styles.funnelGrid}>
          {funnel.length ? funnel.map((item) => (
            <View key={item.status || 'unknown'} style={styles.funnelCard}>
              <AppText style={styles.funnelLabel}>{String(item.status || 'unknown').replace(/_/g, ' ')}</AppText>
              <AppText style={styles.funnelValue}>{item.count || 0}</AppText>
            </View>
          )) : (
            <View style={styles.funnelCard}>
              <AppText style={styles.funnelLabel}>{ui("No funnel data")}</AppText>
              <AppText style={styles.funnelValue}>0</AppText>
            </View>
          )}
        </View>
      </DashboardSection>

      <DashboardSection
        title={ui("Candidates")}
        subtitle={ui("{value0} matching applicants", {value0: (pagination?.total || applicants.length)})}
        tourTarget="recruitment_candidates"
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
            <AppText style={styles.emptyText}>{ui("No applicants match the current filters.")}</AppText>
          </View>
        ) : null}
      </DashboardSection>

      <DashboardSection
        title={ui("Reports and exports")}
        subtitle={ui("Candidate reports, filtered CSV email exports and hiring decisions stay inside the mobile workflow.")}
        tourTarget="recruitment_reports"
      >
        <ActionRow
          title={ui("Email filtered CSV export")}
          subtitle={ui("Send applicant summary for the current filters.")}
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
                <AppText style={styles.modalEyebrow}>{ui("APPLICANT REPORT")}</AppText>
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
                <AppText style={styles.modalMuted}>{ui("Loading applicant record…")}</AppText>
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
                  ['Payment', detailModal.applicant?.opportunity_type==='volunteer'?'Not Applicable':detailModal.applicant?.payment_status],
                  ['Opportunity type',detailModal.applicant?.opportunity_type||'employment'],
                  ['Volunteer motivation',detailModal.applicant?.volunteer_motivation],
                  ['Availability',detailModal.applicant?.availability],
                  ['Interview score', detailModal.applicant?.interview_score ?? detailModal.applicant?.score],
                  ['Education', detailModal.applicant?.highest_education],
                  ['Experience', detailModal.applicant?.years_of_experience],
                  ['Submitted', detailModal.applicant?.created_at],
                ].map(([label, value]) => (
                  <View key={label} style={styles.detailRow}>
                    <AppText style={styles.detailLabel}>{label}</AppText>
                    <AppText style={styles.detailValue}>{value || ui("N/A")}</AppText>
                  </View>
                ))}
                {detailModal.applicant?.suitability_reason ? (
                  <View style={styles.detailBlock}>
                    <AppText style={styles.detailLabel}>{ui("Suitability note")}</AppText>
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
    fontSize: typeScale.sm,
    lineHeight: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  filterLabel: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: typeScale.xs,
    lineHeight: 18,
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
    fontSize: typeScale.xs,
    lineHeight: 18,
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
    fontSize: typeScale.xs,
    lineHeight: 18,
    textTransform: 'capitalize',
  },
  funnelValue: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: typeScale.xl,
    lineHeight: 32,
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
    fontSize: typeScale.base,
    lineHeight: 24,
  },
  applicantMeta: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: typeScale.xs,
    lineHeight: 18,
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
    fontSize: typeScale.xs,
    lineHeight: 18,
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
    fontSize: typeScale.xs,
    lineHeight: 18,
  },
  approveText: {
    color: colors.success,
    fontFamily: typography.bold,
    fontSize: typeScale.xs,
    lineHeight: 18,
  },
  rejectText: {
    color: colors.danger,
    fontFamily: typography.bold,
    fontSize: typeScale.xs,
    lineHeight: 18,
  },
  reportText: {
    color: colors.navy,
    fontFamily: typography.bold,
    fontSize: typeScale.xs,
    lineHeight: 18,
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
    fontSize: typeScale.xs,
    lineHeight: 18,
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
    fontSize: typeScale.xs,
    lineHeight: 18,
    letterSpacing: 0.5,
  },
  modalTitle: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: typeScale.lg,
    lineHeight: 28,
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
    fontSize: typeScale.xs,
    lineHeight: 18,
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
    fontSize: typeScale.xs,
    lineHeight: 18,
    textTransform: 'uppercase',
  },
  detailValue: {
    color: colors.ink,
    fontFamily: typography.medium,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginTop: 3,
  },
});

export default RecruitmentAdminScreen;
