import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Linking,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import SelectField from '../../components/common/SelectField';
import OptionPickerModal from '../../components/common/OptionPickerModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import EmptyState from '../../components/common/EmptyState';
import StatusBadge from '../../components/common/StatusBadge';
import { superAdminService } from '../../services/superAdminService';
import { authService } from '../../services/authService';
import { buildUploadUrl, getErrorMessage, pickList, pickObject } from '../../utils/http';

const sections = [
  'overview',
  'users',
  'verifications',
  'lawyer_invites',
  'analytics',
  'platform_lawyers',
  'lawyer_activity',
  'admin_management',
  'pending_approvals',
  'pricing',
  'properties',
  'reports',
  'broadcasts',
  'flags',
  'fraud',
  'logs',
];

const defaultPricingForm = {
  applies_to: 'tenant_registration',
  state_id: '',
  lga_name: '',
  amount: '',
  is_active: true,
};

const SectionButton = ({ label, active, onPress }) => (
  <TouchableOpacity style={[styles.tabBtn, active && styles.tabBtnActive]} onPress={onPress}>
    <Text style={[styles.tabText, active && styles.tabTextActive]}>
      {String(label).replace(/_/g, ' ')}
    </Text>
  </TouchableOpacity>
);

const FilterChip = ({ label, active, onPress }) => (
  <TouchableOpacity style={[styles.filterChip, active && styles.filterChipActive]} onPress={onPress}>
    <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
  </TouchableOpacity>
);

const SuperAdminDashboardScreen = () => {
  const [section, setSection] = useState('overview');
  const [analytics, setAnalytics] = useState({});
  const [users, setUsers] = useState([]);
  const [verifications, setVerifications] = useState([]);
  const [properties, setProperties] = useState([]);
  const [reports, setReports] = useState([]);
  const [broadcasts, setBroadcasts] = useState([]);
  const [lawyerInvites, setLawyerInvites] = useState([]);
  const [flags, setFlags] = useState([]);
  const [fraud, setFraud] = useState([]);
  const [logs, setLogs] = useState([]);
  const [adminPerformance, setAdminPerformance] = useState([]);
  const [pricingRules, setPricingRules] = useState([]);
  const [pricingTargets, setPricingTargets] = useState([]);
  const [pricingLocations, setPricingLocations] = useState([]);
  const [editingPricingRuleId, setEditingPricingRuleId] = useState(null);
  const [showPricingStatePicker, setShowPricingStatePicker] = useState(false);
  const [showPricingLgaPicker, setShowPricingLgaPicker] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({
    title: '',
    message: '',
    target_role: '',
  });
  const [verificationFilters, setVerificationFilters] = useState({
    search: '',
    status: 'pending',
    user_type: 'all',
  });
  const [pricingForm, setPricingForm] = useState(defaultPricingForm);
  const [lawyerInviteSearch, setLawyerInviteSearch] = useState('');
  const [editingInviteId, setEditingInviteId] = useState(null);
  const [editingInviteEmail, setEditingInviteEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // New state for analytics tab
  const [analyticsTimeRange, setAnalyticsTimeRange] = useState('week');

  // New state for platform lawyers
  const [platformLawyers, setPlatformLawyers] = useState([]);
  const [showAddLawyerModal, setShowAddLawyerModal] = useState(false);
  const [lawyerForm, setLawyerForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    state_id: '',
    specialization: '',
    license_number: '',
  });
  const [editingLawyerId, setEditingLawyerId] = useState(null);
  const [lawyerApplications, setLawyerApplications] = useState([]);
  const [showLawyerApplications, setShowLawyerApplications] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [selectedApplicationId, setSelectedApplicationId] = useState(null);
  const [reviewAction, setReviewAction] = useState(null); // 'approve' or 'reject'

  // New state for lawyer activity
  const [lawyerActivities, setLawyerActivities] = useState([]);
  const [activityTimeRange, setActivityTimeRange] = useState('7days');

  // New state for admin management
  const [admins, setAdmins] = useState([]);
  const [expandedAdminId, setExpandedAdminId] = useState(null);
  const [adminStateUsers, setAdminStateUsers] = useState([]);
  const [loadingStateUsers, setLoadingStateUsers] = useState(false);
  const [editingJurisdiction, setEditingJurisdiction] = useState(null);
  const [jurisdictionForm, setJurisdictionForm] = useState({ state: '', city: '' });

  // New state for pending admin approvals
  const [pendingAdmins, setPendingAdmins] = useState([]);

  // New state for report status changes
  const [reportStatusTargets, setReportStatusTargets] = useState({});

  // New state for bulk actions
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [selectedPropertyIds, setSelectedPropertyIds] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  const [showBulkActionPicker, setShowBulkActionPicker] = useState(false);

  const selectedPricingState = useMemo(
    () => pricingLocations.find((item) => String(item.id) === String(pricingForm.state_id)),
    [pricingForm.state_id, pricingLocations]
  );

  const availablePricingLgas = selectedPricingState?.lgas || [];

  const loadLawyerInvites = async (search = lawyerInviteSearch) => {
    const response = await authService.getLawyerInvites({
      search: search || undefined,
    });
    setLawyerInvites(pickList(response, ['data']));
  };

  const loadVerificationData = async (filters = verificationFilters) => {
    const [verificationsResponse, performanceResponse] = await Promise.all([
      superAdminService.getVerifications(filters),
      superAdminService.getAdminsPerformance(),
    ]);

    setVerifications(pickList(verificationsResponse, ['data', 'verifications']));
    setAdminPerformance(pickList(performanceResponse, ['data']));
  };

  const loadPlatformLawyers = async () => {
    const response = await superAdminService.getPlatformLawyers();
    setPlatformLawyers(pickList(response, ['data']));
  };

  const loadLawyerApplications = async () => {
    const response = await superAdminService.getPlatformLawyers();
    const lawyers = pickList(response, ['data']);
    // Filter for pending applications from the lawyers list if available
    // Or load separately if there's a dedicated endpoint
    setLawyerApplications(lawyers.filter((l) => l.status === 'pending_application' || l.application_status === 'pending'));
  };

  const loadLawyerActivitiesData = async (timeRange) => {
    const response = await superAdminService.getLawyerActivities(timeRange || activityTimeRange);
    setLawyerActivities(pickList(response, ['data']));
  };

  const loadAdmins = async () => {
    const response = await superAdminService.getAdminsPerformance();
    setAdmins(pickList(response, ['data']));
  };

  const loadAdminStateUsers = async (adminId) => {
    setLoadingStateUsers(true);
    try {
      const response = await superAdminService.getAdminStateUsers(adminId);
      setAdminStateUsers(pickList(response, ['data']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load admin state users'),
      });
    } finally {
      setLoadingStateUsers(false);
    }
  };

  const loadPendingAdmins = async () => {
    const response = await superAdminService.getPendingAdmins();
    setPendingAdmins(pickList(response, ['data']));
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [
        usersResponse,
        propertiesResponse,
        analyticsResponse,
        reportsResponse,
        broadcastsResponse,
        lawyerInvitesResponse,
        flagsResponse,
        fraudResponse,
        logsResponse,
        pricingResponse,
        platformLawyersResponse,
        lawyerActivitiesResponse,
        pendingAdminsResponse,
      ] = await Promise.all([
        superAdminService.getUsers(),
        superAdminService.getProperties(),
        superAdminService.getAnalytics(),
        superAdminService.getReports(),
        superAdminService.getBroadcasts(),
        authService.getLawyerInvites(),
        superAdminService.getFlags(),
        superAdminService.getFraudFlags(),
        superAdminService.getLogs(),
        superAdminService.getPricingRules(),
        superAdminService.getPlatformLawyers(),
        superAdminService.getLawyerActivities('7days'),
        superAdminService.getPendingAdmins(),
      ]);

      setUsers(pickList(usersResponse, ['users', 'data']));
      setProperties(pickList(propertiesResponse, ['properties', 'data']));
      setAnalytics(pickObject(analyticsResponse, ['data']) || {});
      setReports(pickList(reportsResponse, ['reports', 'data']));
      setBroadcasts(pickList(broadcastsResponse, ['broadcasts', 'data']));
      setLawyerInvites(pickList(lawyerInvitesResponse, ['data']));
      setFlags(pickList(flagsResponse, ['flags', 'data']));
      setFraud(pickList(fraudResponse, ['flags', 'data']));
      setLogs(pickList(logsResponse, ['logs', 'data']));

      const pricingPayload = pickObject(pricingResponse, ['data']) || {};
      setPricingRules(pricingPayload.rules || []);
      setPricingTargets(pricingPayload.targets || []);
      setPricingLocations(pricingPayload.locations || []);

      setPlatformLawyers(pickList(platformLawyersResponse, ['data']));
      setLawyerActivities(pickList(lawyerActivitiesResponse, ['data']));
      setPendingAdmins(pickList(pendingAdminsResponse, ['data']));

      await loadVerificationData();
      await loadAdmins();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load super admin data'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const runAction = async (action, successMessage, reload = loadAll) => {
    try {
      setSubmitting(true);
      await action();
      if (reload) {
        await reload();
      }
      Toast.show({ type: 'success', text1: successMessage });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Action failed'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetPricingForm = () => {
    setEditingPricingRuleId(null);
    setPricingForm(defaultPricingForm);
  };

  const handleSavePricingRule = async () => {
    if (!pricingForm.state_id) {
      Toast.show({ type: 'error', text1: 'Select a state' });
      return;
    }

    if (!pricingForm.amount) {
      Toast.show({ type: 'error', text1: 'Enter the amount to charge' });
      return;
    }

    const payload = {
      applies_to: pricingForm.applies_to,
      state_id: Number(pricingForm.state_id),
      lga_name: pricingForm.lga_name || undefined,
      amount: Number(pricingForm.amount),
      is_active: pricingForm.is_active,
    };

    await runAction(
      async () => {
        if (editingPricingRuleId) {
          await superAdminService.updatePricingRule(editingPricingRuleId, payload);
        } else {
          await superAdminService.createPricingRule(payload);
        }
        resetPricingForm();
      },
      editingPricingRuleId ? 'Pricing rule updated' : 'Pricing rule created'
    );
  };

  const renderOverview = () => {
    const analyticEntries = Object.entries(analytics);

    return (
      <View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Analytics Overview</Text>
          <Text style={styles.meta}>
            Quick platform statistics at a glance. Use the Analytics tab for detailed metrics.
          </Text>
        </View>

        {analyticEntries.length === 0 ? (
          <EmptyState
            icon="stats-chart-outline"
            title="No analytics data"
            message="Data will populate once users interact with the platform."
          />
        ) : (
          <View style={styles.analyticsGrid}>
            {analyticEntries.map(([key, value]) => (
              <View key={key} style={styles.analyticsCard}>
                <Text style={styles.analyticsValue}>
                  {typeof value === 'number' ? value.toLocaleString() : String(value)}
                </Text>
                <Text style={styles.analyticsLabel}>
                  {key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </Text>
              </View>
            ))}
          </View>
        )}

        {users.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Quick Stats</Text>
            <Text style={styles.meta}>Total Users: {users.length}</Text>
            <Text style={styles.meta}>Total Properties: {properties.length}</Text>
            <Text style={styles.meta}>Total Reports: {reports.length}</Text>
            <Text style={styles.meta}>Active Lawyers: {platformLawyers.length}</Text>
            <Text style={styles.meta}>Pending Admins: {pendingAdmins.length}</Text>
          </View>
        )}
      </View>
    );
  };

  const toggleUserSelection = (id) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkUserAction = async () => {
    if (selectedUserIds.length === 0) {
      Toast.show({ type: 'error', text1: 'Select at least one user' });
      return;
    }
    if (!bulkAction) {
      Toast.show({ type: 'error', text1: 'Select a bulk action' });
      return;
    }
    await runAction(
      async () => {
        await superAdminService.bulkUserAction(selectedUserIds, bulkAction);
        setSelectedUserIds([]);
        setBulkAction('');
      },
      `Bulk action "${bulkAction}" completed on ${selectedUserIds.length} users`
    );
  };

  const renderUsers = () => (
    <>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Users ({users.length})</Text>
        <Text style={styles.meta}>
          Select multiple users for bulk actions (ban, unban, promote, delete).
        </Text>
        {selectedUserIds.length > 0 && (
          <View style={styles.bulkActions}>
            <Text style={styles.filterLabel}>{selectedUserIds.length} selected</Text>
            <View style={styles.filtersRow}>
              {['ban', 'unban', 'promote', 'delete'].map((action) => (
                <FilterChip
                  key={action}
                  label={action}
                  active={bulkAction === action}
                  onPress={() => setBulkAction(action)}
                />
              ))}
            </View>
            <View style={styles.row}>
              <Button
                title={`Apply to ${selectedUserIds.length}`}
                onPress={handleBulkUserAction}
                loading={submitting}
                size="sm"
              />
              <TouchableOpacity onPress={() => setSelectedUserIds([])}>
                <Text style={styles.warnText}>Clear Selection</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {users.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="No users"
          message="Registered users will appear here."
        />
      ) : (
        users.map((item) => (
          <View key={item.id} style={styles.card}>
            <TouchableOpacity onPress={() => toggleUserSelection(item.id)}>
              <View style={styles.checkboxRow}>
                <View style={[styles.checkbox, selectedUserIds.includes(item.id) && styles.checkboxActive]}>
                  {selectedUserIds.includes(item.id) && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <View>
                  <Text style={styles.cardTitle}>{item.full_name}</Text>
                  <Text style={styles.meta}>{item.email}</Text>
                </View>
              </View>
            </TouchableOpacity>
            <Text style={styles.meta}>Role: {item.user_type}</Text>
            {item.state_name ? <Text style={styles.meta}>State: {item.state_name}</Text> : null}
            {item.is_banned !== undefined && <StatusBadge status={item.is_banned ? 'banned' : 'active'} />}
            <View style={styles.row}>
              <TouchableOpacity onPress={() => runAction(() => superAdminService.banUser(item.id), 'User banned')}>
                <Text style={styles.warnText}>Ban</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => runAction(() => superAdminService.unbanUser(item.id), 'User unbanned')}>
                <Text style={styles.linkText}>Unban</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => runAction(() => superAdminService.promoteUser(item.id), 'User promoted')}>
                <Text style={styles.linkText}>Promote</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => runAction(() => superAdminService.deleteUser(item.id), 'User deleted')}>
                <Text style={styles.warnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </>
  );

  const renderVerifications = () => (
    <>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Verification Filters</Text>
        <Input
          label="Search"
          value={verificationFilters.search}
          onChangeText={(value) =>
            setVerificationFilters((prev) => ({ ...prev, search: value }))
          }
          placeholder="Name, email, NIN, passport"
        />
        <Text style={styles.filterLabel}>Status</Text>
        <View style={styles.filtersRow}>
          {['pending', 'verified', 'rejected', 'all'].map((value) => (
            <FilterChip
              key={value}
              label={value}
              active={verificationFilters.status === value}
              onPress={() =>
                setVerificationFilters((prev) => ({ ...prev, status: value }))
              }
            />
          ))}
        </View>

        <Text style={styles.filterLabel}>Role</Text>
        <View style={styles.filtersRow}>
          {['all', 'admin', 'landlord', 'tenant'].map((value) => (
            <FilterChip
              key={value}
              label={value}
              active={verificationFilters.user_type === value}
              onPress={() =>
                setVerificationFilters((prev) => ({ ...prev, user_type: value }))
              }
            />
          ))}
        </View>

        <Button
          title="Apply Filters"
          onPress={() => runAction(() => loadVerificationData(), 'Verification filters applied', null)}
        />
      </View>

      {verifications.map((item) => {
        const reviewStatus = item.identity_verification_status || (item.identity_verified ? 'verified' : 'pending');
        const documentNumber =
          item.identity_document_type === 'passport'
            ? item.international_passport_number
            : item.nin;

        return (
          <View key={item.id} style={styles.card}>
            <Text style={styles.cardTitle}>{item.full_name}</Text>
            <Text style={styles.meta}>{item.email}</Text>
            <Text style={styles.meta}>Role: {item.user_type}</Text>
            <Text style={styles.meta}>Document: {item.identity_document_type || 'nin'}</Text>
            <Text style={styles.meta}>Number: {documentNumber || '-'}</Text>
            <Text style={styles.meta}>Status: {reviewStatus}</Text>
            <Text style={styles.meta}>Verified By: {item.identity_verified_by_name || '-'}</Text>
            {item.passport_photo_url ? (
              <TouchableOpacity
                onPress={() => Linking.openURL(buildUploadUrl(item.passport_photo_url))}
              >
                <Text style={styles.linkText}>Open passport photo</Text>
              </TouchableOpacity>
            ) : null}
            <View style={styles.row}>
              {(reviewStatus === 'pending' || reviewStatus === 'rejected') ? (
                <TouchableOpacity
                  onPress={() =>
                    runAction(
                      () => superAdminService.approveVerification(item.id),
                      'Verification approved'
                    )
                  }
                >
                  <Text style={styles.linkText}>Approve</Text>
                </TouchableOpacity>
              ) : null}
              {reviewStatus === 'pending' ? (
                <TouchableOpacity
                  onPress={() =>
                    runAction(
                      () => superAdminService.rejectVerification(item.id),
                      'Verification rejected'
                    )
                  }
                >
                  <Text style={styles.warnText}>Reject</Text>
                </TouchableOpacity>
              ) : null}
              {reviewStatus === 'rejected' ? (
                <TouchableOpacity
                  onPress={() =>
                    runAction(
                      () => superAdminService.deleteRejectedVerification(item.id),
                      'Rejected verification deleted'
                    )
                  }
                >
                  <Text style={styles.warnText}>Delete</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        );
      })}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Admin Verification Performance</Text>
        {adminPerformance.length === 0 ? (
          <Text style={styles.meta}>No admin verification activity yet.</Text>
        ) : (
          adminPerformance.map((item) => (
            <View key={item.id} style={styles.listRow}>
              <Text style={styles.listTitle}>{item.full_name}</Text>
              <Text style={styles.meta}>{item.email}</Text>
              <Text style={styles.meta}>Verified: {item.credentials_verified_count ?? 0}</Text>
              <Text style={styles.meta}>
                Last activity:{' '}
                {item.last_verification_at
                  ? new Date(item.last_verification_at).toLocaleString()
                  : 'No activity'}
              </Text>
            </View>
          ))
        )}
      </View>
    </>
  );

  const getInviteStatusLabel = (invite) => {
    const isExpired =
      invite.status !== 'accepted' &&
      invite.expires_at &&
      new Date(invite.expires_at).getTime() < Date.now();

    if (invite.status === 'accepted') return 'Accepted';
    if (isExpired) return 'Expired';
    return 'Pending';
  };

  const renderLawyerInvites = () => (
    <>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Lawyer Invite Search</Text>
        <Input
          label="Search"
          value={lawyerInviteSearch}
          onChangeText={setLawyerInviteSearch}
          placeholder="Client or lawyer email"
        />
        <Button
          title="Apply Search"
          onPress={() => runAction(() => loadLawyerInvites(), 'Lawyer invites refreshed', null)}
        />
      </View>

      {lawyerInvites.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.meta}>No lawyer invites found.</Text>
        </View>
      ) : null}

      {lawyerInvites.map((invite) => (
        <View key={invite.id} style={styles.card}>
          <Text style={styles.cardTitle}>{invite.client_name}</Text>
          <Text style={styles.meta}>Assigned By: {invite.assigned_by_name || invite.client_name || '-'}</Text>
          <Text style={styles.meta}>Role: {invite.client_role}</Text>
          <Text style={styles.meta}>Lawyer Email: {invite.lawyer_email}</Text>
          <Text style={styles.meta}>Status: {getInviteStatusLabel(invite)}</Text>
          <Text style={styles.meta}>
            Expires:{' '}
            {invite.expires_at ? new Date(invite.expires_at).toLocaleString() : '-'}
          </Text>
          <Text style={styles.meta}>
            Last Sent:{' '}
            {invite.last_sent_at ? new Date(invite.last_sent_at).toLocaleString() : '-'}
          </Text>
          <Text style={styles.meta}>Resends: {invite.resent_count ?? 0}</Text>

          {editingInviteId === invite.id ? (
            <>
              <Input
                label="New Lawyer Email"
                value={editingInviteEmail}
                onChangeText={setEditingInviteEmail}
                placeholder="lawyer@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <View style={styles.row}>
                <TouchableOpacity
                  onPress={() =>
                    runAction(
                      async () => {
                        await authService.updateLawyerInviteEmail(invite.id, editingInviteEmail.trim());
                        setEditingInviteId(null);
                        setEditingInviteEmail('');
                        await loadLawyerInvites();
                      },
                      'Lawyer email updated',
                      null
                    )
                  }
                >
                  <Text style={styles.linkText}>Save Email</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setEditingInviteId(null);
                    setEditingInviteEmail('');
                  }}
                >
                  <Text style={styles.warnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : null}

          {invite.status !== 'accepted' ? (
            <View style={styles.row}>
              <TouchableOpacity
                onPress={() =>
                  runAction(
                    async () => {
                      await authService.resendLawyerInvite(invite.id);
                      await loadLawyerInvites();
                    },
                    'Lawyer invite resent',
                    null
                  )
                }
              >
                <Text style={styles.linkText}>Resend Invite</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setEditingInviteId(invite.id);
                  setEditingInviteEmail(invite.lawyer_email || '');
                }}
              >
                <Text style={styles.linkText}>Change Email</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      ))}
    </>
  );

  const renderPricing = () => (
    <>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Location Pricing Rules</Text>
        <Text style={styles.meta}>
          Configure final amounts by state or local government area. LGA rules override state rules.
        </Text>
        <View style={styles.targetGrid}>
          {pricingTargets.map((target) => (
            <View key={target.key} style={styles.targetCard}>
              <Text style={styles.listTitle}>{target.label}</Text>
              <Text style={styles.meta}>
                Base fee: N{Number(target.base_amount || 0).toLocaleString()}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {editingPricingRuleId ? 'Edit Pricing Rule' : 'Create Pricing Rule'}
        </Text>
        <View style={styles.filtersRow}>
          {pricingTargets.map((target) => (
            <FilterChip
              key={target.key}
              label={target.label}
              active={pricingForm.applies_to === target.key}
              onPress={() =>
                setPricingForm((prev) => ({ ...prev, applies_to: target.key }))
              }
            />
          ))}
        </View>

        <Input
          label="Amount (NGN)"
          value={pricingForm.amount}
          onChangeText={(value) => setPricingForm((prev) => ({ ...prev, amount: value }))}
          keyboardType="numeric"
          placeholder="Enter final amount"
        />

        <SelectField
          label="State"
          value={selectedPricingState?.state_name}
          placeholder="Select state"
          onPress={() => setShowPricingStatePicker(true)}
        />

        <SelectField
          label="Local Government Area"
          value={pricingForm.lga_name}
          placeholder={selectedPricingState ? 'Whole state or choose LGA' : 'Choose state first'}
          onPress={() => setShowPricingLgaPicker(true)}
          disabled={!selectedPricingState}
          helperText="Leave empty to apply the amount to the whole state."
        />

        <View style={styles.switchRow}>
          <Text style={styles.meta}>Rule is active</Text>
          <Switch
            value={pricingForm.is_active}
            onValueChange={(value) =>
              setPricingForm((prev) => ({ ...prev, is_active: value }))
            }
          />
        </View>

        <Button
          title={editingPricingRuleId ? 'Update Pricing Rule' : 'Create Pricing Rule'}
          onPress={handleSavePricingRule}
          loading={submitting}
        />
        {editingPricingRuleId ? (
          <Button
            title="Cancel Edit"
            variant="outline"
            onPress={resetPricingForm}
            style={styles.marginTop}
          />
        ) : null}
      </View>

      {pricingRules.map((rule) => {
        const target = pricingTargets.find((item) => item.key === rule.applies_to);

        return (
          <View key={rule.id} style={styles.card}>
            <Text style={styles.cardTitle}>{target?.label || rule.applies_to}</Text>
            <Text style={styles.meta}>State: {rule.state_name}</Text>
            <Text style={styles.meta}>LGA: {rule.lga_name || 'Whole state'}</Text>
            <Text style={styles.meta}>
              Amount: N{Number(rule.amount || 0).toLocaleString()}
            </Text>
            <Text style={styles.meta}>Status: {rule.is_active ? 'Active' : 'Inactive'}</Text>
            <View style={styles.row}>
              <TouchableOpacity
                onPress={() => {
                  setEditingPricingRuleId(rule.id);
                  setPricingForm({
                    applies_to: rule.applies_to,
                    state_id: String(rule.state_id),
                    lga_name: rule.lga_name || '',
                    amount: String(rule.amount),
                    is_active: rule.is_active === true,
                  });
                  setSection('pricing');
                }}
              >
                <Text style={styles.linkText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  runAction(
                    () =>
                      superAdminService.updatePricingRule(rule.id, {
                        applies_to: rule.applies_to,
                        state_id: rule.state_id,
                        lga_name: rule.lga_name || undefined,
                        amount: rule.amount,
                        is_active: !rule.is_active,
                      }),
                    `Pricing rule ${rule.is_active ? 'disabled' : 'enabled'}`
                  )
                }
              >
                <Text style={styles.linkText}>{rule.is_active ? 'Disable' : 'Enable'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  runAction(
                    () => superAdminService.deletePricingRule(rule.id),
                    'Pricing rule deleted'
                  )
                }
              >
                <Text style={styles.warnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </>
  );

  const togglePropertySelection = (id) => {
    setSelectedPropertyIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkPropertyAction = async () => {
    if (selectedPropertyIds.length === 0) {
      Toast.show({ type: 'error', text1: 'Select at least one property' });
      return;
    }
    if (!bulkAction) {
      Toast.show({ type: 'error', text1: 'Select a bulk action' });
      return;
    }
    await runAction(
      async () => {
        await superAdminService.bulkPropertyAction(selectedPropertyIds, bulkAction);
        setSelectedPropertyIds([]);
        setBulkAction('');
      },
      `Bulk action "${bulkAction}" completed on ${selectedPropertyIds.length} properties`
    );
  };

  const renderProperties = () => (
    <>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Properties ({properties.length})</Text>
        <Text style={styles.meta}>
          Select multiple properties for bulk actions, or manage individually below.
        </Text>
        {selectedPropertyIds.length > 0 && (
          <View style={styles.bulkActions}>
            <Text style={styles.filterLabel}>{selectedPropertyIds.length} selected</Text>
            <View style={styles.filtersRow}>
              {['unlist', 'feature', 'unfeature', 'delete'].map((action) => (
                <FilterChip
                  key={action}
                  label={action}
                  active={bulkAction === action}
                  onPress={() => setBulkAction(action)}
                />
              ))}
            </View>
            <View style={styles.row}>
              <Button
                title={`Apply to ${selectedPropertyIds.length}`}
                onPress={handleBulkPropertyAction}
                loading={submitting}
                size="sm"
              />
              <TouchableOpacity onPress={() => setSelectedPropertyIds([])}>
                <Text style={styles.warnText}>Clear Selection</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {properties.length === 0 ? (
        <EmptyState
          icon="home-outline"
          title="No properties"
          message="Properties will appear here once listed."
        />
      ) : (
        properties.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.rowBetween}>
              <TouchableOpacity onPress={() => togglePropertySelection(item.id)}>
                <View style={styles.checkboxRow}>
                  <View style={[styles.checkbox, selectedPropertyIds.includes(item.id) && styles.checkboxActive]}>
                    {selectedPropertyIds.includes(item.id) && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                </View>
              </TouchableOpacity>
              {item.is_featured !== undefined && (
                <StatusBadge status={item.is_featured ? 'featured' : 'standard'} />
              )}
            </View>
            <Text style={styles.meta}>{item.landlord_name || 'No landlord'}</Text>
            {item.state_name ? <Text style={styles.meta}>State: {item.state_name}</Text> : null}
            {item.city ? <Text style={styles.meta}>City: {item.city}</Text> : null}
            {item.price ? <Text style={styles.meta}>Price: N{Number(item.price).toLocaleString()}</Text> : null}
            <StatusBadge status={item.status || 'active'} />
            <View style={styles.row}>
              <TouchableOpacity onPress={() => runAction(() => superAdminService.unlistProperty(item.id), 'Property unlisted')}>
                <Text style={styles.warnText}>Unlist</Text>
              </TouchableOpacity>
              {item.is_featured ? (
                <TouchableOpacity onPress={() => runAction(() => superAdminService.unfeatureProperty(item.id), 'Property unfeatured')}>
                  <Text style={styles.linkText}>Unfeature</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => runAction(() => superAdminService.featureProperty(item.id), 'Property featured')}>
                  <Text style={styles.linkText}>Feature</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))
      )}
    </>
  );

  const handleUpdateReportStatus = async (reportId, status) => {
    await runAction(
      async () => {
        await superAdminService.updateReportStatus(reportId, status);
        setReportStatusTargets((prev) => {
          const updated = { ...prev };
          delete updated[reportId];
          return updated;
        });
      },
      `Report status changed to ${status}`
    );
  };

  const toggleReportStatusPicker = (reportId) => {
    setReportStatusTargets((prev) => {
      if (prev[reportId]) {
        const updated = { ...prev };
        delete updated[reportId];
        return updated;
      }
      return { ...prev, [reportId]: true };
    });
  };

  const renderReports = () => {
    const reportStatusOptions = ['open', 'investigating', 'resolved', 'dismissed'];

    return (
      <>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Reports ({reports.length})</Text>
          <Text style={styles.meta}>
            Manage reported content. Update status to track investigation progress.
          </Text>
        </View>

        {reports.length === 0 ? (
          <EmptyState
            icon="flag-outline"
            title="No reports"
            message="User reports will appear here."
          />
        ) : (
          reports.map((item) => (
            <View key={item.id} style={styles.card}>
              <Text style={styles.cardTitle}>{item.reason || item.report_reason || `Report #${item.id}`}</Text>
              <View style={styles.rowBetween}>
                <StatusBadge status={item.status || 'open'} />
                <TouchableOpacity onPress={() => toggleReportStatusPicker(item.id)}>
                  <Text style={styles.linkText}>Change Status</Text>
                </TouchableOpacity>
              </View>
              {item.reporter_name ? (
                <Text style={styles.meta}>Reported by: {item.reporter_name}</Text>
              ) : null}
              {item.reported_user_name ? (
                <Text style={styles.meta}>Against: {item.reported_user_name}</Text>
              ) : null}
              {item.property_title ? (
                <Text style={styles.meta}>Property: {item.property_title}</Text>
              ) : null}
              {item.description ? (
                <Text style={styles.meta}>Details: {item.description}</Text>
              ) : null}
              {item.created_at ? (
                <Text style={styles.meta}>
                  Created: {new Date(item.created_at).toLocaleString()}
                </Text>
              ) : null}

              {reportStatusTargets[item.id] && (
                <View style={styles.statusOptions}>
                  <Text style={styles.filterLabel}>Set Status:</Text>
                  <View style={styles.filtersRow}>
                    {reportStatusOptions.map((status) => (
                      <FilterChip
                        key={status}
                        label={status}
                        active={(item.status || 'open') === status}
                        onPress={() => handleUpdateReportStatus(item.id, status)}
                      />
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.row}>
                <TouchableOpacity onPress={() => runAction(() => superAdminService.resolveReport(item.id), 'Report resolved')}>
                  <Text style={styles.linkText}>Resolve</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </>
    );
  };

  const renderBroadcasts = () => (
    <>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Send Broadcast</Text>
        <Input
          label="Title"
          value={broadcastForm.title}
          onChangeText={(value) => setBroadcastForm((prev) => ({ ...prev, title: value }))}
        />
        <Input
          label="Message"
          value={broadcastForm.message}
          onChangeText={(value) => setBroadcastForm((prev) => ({ ...prev, message: value }))}
          multiline
          numberOfLines={4}
        />
        <Input
          label="Target Role"
          value={broadcastForm.target_role}
          onChangeText={(value) =>
            setBroadcastForm((prev) => ({ ...prev, target_role: value }))
          }
          placeholder="tenant, landlord, admin, lawyer"
        />
        <Button
          title="Send Broadcast"
          onPress={() =>
            runAction(() => superAdminService.createBroadcast(broadcastForm), 'Broadcast sent')
          }
        />
      </View>

      {broadcasts.map((item) => (
        <View key={item.id} style={styles.card}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.meta}>{item.message}</Text>
          <Text style={styles.meta}>Target: {item.target_role || 'all'}</Text>
        </View>
      ))}
    </>
  );

  const renderFlags = () =>
    flags.map((item) => (
      <View key={item.key || item.id} style={styles.card}>
        <Text style={styles.cardTitle}>{item.key || item.name}</Text>
        <Text style={styles.meta}>Enabled: {String(item.enabled)}</Text>
        <TouchableOpacity
          onPress={() =>
            runAction(
              () => superAdminService.updateFlag(item.key, !item.enabled),
              'Flag updated'
            )
          }
        >
          <Text style={styles.linkText}>Toggle Flag</Text>
        </TouchableOpacity>
      </View>
    ));

  const renderFraud = () =>
    fraud.map((item) => (
      <View key={item.id} style={styles.card}>
        <Text style={styles.cardTitle}>{item.rule || 'Fraud rule'}</Text>
        <Text style={styles.meta}>Score: {item.score}</Text>
        <TouchableOpacity onPress={() => runAction(() => superAdminService.resolveFraudFlag(item.id), 'Fraud flag resolved')}>
          <Text style={styles.linkText}>Resolve</Text>
        </TouchableOpacity>
      </View>
    ));

  const renderLogs = () =>
    logs.map((item, index) => (
      <View key={`${item.id || 'log'}-${index}`} style={styles.card}>
        <Text style={styles.cardTitle}>{item.action || item.event_type || 'Audit log'}</Text>
        <Text style={styles.meta}>{item.user_name || item.actor_name || 'System'}</Text>
        <Text style={styles.meta}>
          {item.created_at ? new Date(item.created_at).toLocaleString() : ''}
        </Text>
      </View>
    ));

  // ===================== NEW: ANALYTICS TAB =====================
  const renderStructuredAnalytics = () => {
    const analyticEntries = Object.entries(analytics);
    const timeRangeOptions = [
      { label: 'Today', value: 'today' },
      { label: 'This Week', value: 'week' },
      { label: 'This Month', value: 'month' },
      { label: 'All Time', value: 'all' },
    ];

    return (
      <View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Analytics Dashboard</Text>
          <Text style={styles.filterLabel}>Time Range</Text>
          <View style={styles.filtersRow}>
            {timeRangeOptions.map((opt) => (
              <FilterChip
                key={opt.value}
                label={opt.label}
                active={analyticsTimeRange === opt.value}
                onPress={() => setAnalyticsTimeRange(opt.value)}
              />
            ))}
          </View>
          <Button
            title="Refresh Analytics"
            onPress={() => runAction(() => loadAll(), 'Analytics refreshed', null)}
            loading={submitting}
          />
        </View>

        {analyticEntries.length === 0 ? (
          <EmptyState
            icon="analytics-outline"
            title="No analytics data"
            message="Data will appear once users interact with the platform."
          />
        ) : (
          <View style={styles.analyticsGrid}>
            {analyticEntries.map(([key, value]) => (
              <View key={key} style={styles.analyticsCard}>
                <Text style={styles.analyticsValue}>
                  {typeof value === 'number' ? value.toLocaleString() : String(value)}
                </Text>
                <Text style={styles.analyticsLabel}>
                  {key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  // ===================== NEW: PLATFORM LAWYERS TAB =====================
  const resetLawyerForm = () => {
    setLawyerForm({
      full_name: '',
      email: '',
      phone: '',
      state_id: '',
      specialization: '',
      license_number: '',
    });
    setEditingLawyerId(null);
  };

  const handleSaveLawyer = async () => {
    if (!lawyerForm.full_name || !lawyerForm.email) {
      Toast.show({ type: 'error', text1: 'Full name and email are required' });
      return;
    }

    await runAction(
      async () => {
        if (editingLawyerId) {
          await superAdminService.updatePlatformLawyer(editingLawyerId, lawyerForm);
        } else {
          await superAdminService.createManualPlatformLawyer(lawyerForm);
        }
        resetLawyerForm();
        setShowAddLawyerModal(false);
        await loadPlatformLawyers();
      },
      editingLawyerId ? 'Platform lawyer updated' : 'Platform lawyer created',
      null
    );
  };

  const handleDeleteLawyer = (lawyerId, lawyerName) => {
    Alert.alert(
      'Delete Platform Lawyer',
      `Are you sure you want to remove ${lawyerName} from platform lawyers?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            runAction(
              async () => {
                await superAdminService.deletePlatformLawyer(lawyerId);
                await loadPlatformLawyers();
              },
              'Platform lawyer removed',
              null
            ),
        },
      ]
    );
  };

  const handleReviewApplication = (applicationId, action) => {
    setSelectedApplicationId(applicationId);
    setReviewAction(action);
    setReviewNote('');
    setShowReviewDialog(true);
  };

  const confirmReviewApplication = async () => {
    if (!selectedApplicationId || !reviewAction) return;

    await runAction(
      async () => {
        if (reviewAction === 'approve') {
          await superAdminService.approvePlatformLawyerApplication(selectedApplicationId, reviewNote);
        } else {
          await superAdminService.rejectPlatformLawyerApplication(selectedApplicationId, reviewNote);
        }
        setShowReviewDialog(false);
        setSelectedApplicationId(null);
        setReviewAction(null);
        setReviewNote('');
        await loadPlatformLawyers();
        await loadLawyerApplications();
      },
      reviewAction === 'approve' ? 'Lawyer application approved' : 'Lawyer application rejected',
      null
    );
  };

  const renderPlatformLawyers = () => (
    <>
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Platform Lawyers</Text>
          <TouchableOpacity
            style={styles.smallBtn}
            onPress={() => {
              resetLawyerForm();
              setShowAddLawyerModal(true);
            }}
          >
            <Text style={styles.smallBtnText}>+ Add Lawyer</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          onPress={() => {
            loadLawyerApplications();
            setShowLawyerApplications(!showLawyerApplications);
          }}
        >
          <Text style={styles.linkText}>
            {showLawyerApplications ? 'Hide' : 'View'} Pending Applications
          </Text>
        </TouchableOpacity>
      </View>

      {showLawyerApplications && (
        <>
          {lawyerApplications.length === 0 ? (
            <EmptyState title="No pending applications" message="No lawyer applications awaiting review." />
          ) : (
            lawyerApplications.map((app) => (
              <View key={app.id} style={styles.card}>
                <Text style={styles.cardTitle}>{app.full_name || app.name}</Text>
                {app.email ? <Text style={styles.meta}>Email: {app.email}</Text> : null}
                {app.phone ? <Text style={styles.meta}>Phone: {app.phone}</Text> : null}
                {app.specialization ? <Text style={styles.meta}>Specialization: {app.specialization}</Text> : null}
                {app.license_number ? <Text style={styles.meta}>License: {app.license_number}</Text> : null}
                {app.state_name ? <Text style={styles.meta}>State: {app.state_name}</Text> : null}
                {app.notes ? <Text style={styles.meta}>Notes: {app.notes}</Text> : null}
                <View style={styles.row}>
                  <TouchableOpacity onPress={() => handleReviewApplication(app.id, 'approve')}>
                    <Text style={styles.linkText}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleReviewApplication(app.id, 'reject')}>
                    <Text style={styles.warnText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </>
      )}

      {platformLawyers.length === 0 ? (
        <EmptyState
          icon="briefcase-outline"
          title="No platform lawyers"
          message="Add a lawyer manually or review pending applications."
        />
      ) : (
        platformLawyers.map((lawyer) => (
          <View key={lawyer.id} style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>{lawyer.full_name || lawyer.name}</Text>
              <StatusBadge status={lawyer.status || lawyer.invite_status || 'active'} />
            </View>
            {lawyer.email ? <Text style={styles.meta}>Email: {lawyer.email}</Text> : null}
            {lawyer.phone ? <Text style={styles.meta}>Phone: {lawyer.phone}</Text> : null}
            {lawyer.specialization ? <Text style={styles.meta}>Specialization: {lawyer.specialization}</Text> : null}
            {lawyer.license_number ? <Text style={styles.meta}>License: {lawyer.license_number}</Text> : null}
            {lawyer.state_name ? <Text style={styles.meta}>State: {lawyer.state_name}</Text> : null}

            <View style={styles.row}>
              {lawyer.invite_status !== 'accepted' ? (
                <TouchableOpacity
                  onPress={() =>
                    runAction(
                      async () => {
                        await superAdminService.resendPlatformLawyerInvite(lawyer.id);
                        await loadPlatformLawyers();
                      },
                      'Invite resent',
                      null
                    )
                  }
                >
                  <Text style={styles.linkText}>Resend Invite</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                onPress={() => {
                  setEditingLawyerId(lawyer.id);
                  setLawyerForm({
                    full_name: lawyer.full_name || lawyer.name || '',
                    email: lawyer.email || '',
                    phone: lawyer.phone || '',
                    state_id: String(lawyer.state_id || ''),
                    specialization: lawyer.specialization || '',
                    license_number: lawyer.license_number || '',
                  });
                  setShowAddLawyerModal(true);
                }}
              >
                <Text style={styles.linkText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteLawyer(lawyer.id, lawyer.full_name || lawyer.name)}>
                <Text style={styles.warnText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      {/* Add/Edit Lawyer Modal */}
      <ConfirmDialog
        visible={showAddLawyerModal}
        title={editingLawyerId ? 'Edit Platform Lawyer' : 'Add Platform Lawyer'}
        message=""
        confirmText={editingLawyerId ? 'Update' : 'Add Lawyer'}
        cancelText="Cancel"
        onConfirm={handleSaveLawyer}
        onCancel={() => {
          setShowAddLawyerModal(false);
          resetLawyerForm();
        }}
        loading={submitting}
        variant="primary"
      />
      {showAddLawyerModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.cardTitle}>{editingLawyerId ? 'Edit Platform Lawyer' : 'Add Platform Lawyer'}</Text>
            <Input
              label="Full Name"
              value={lawyerForm.full_name}
              onChangeText={(v) => setLawyerForm((prev) => ({ ...prev, full_name: v }))}
              placeholder="Enter lawyer name"
            />
            <Input
              label="Email"
              value={lawyerForm.email}
              onChangeText={(v) => setLawyerForm((prev) => ({ ...prev, email: v }))}
              placeholder="lawyer@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Input
              label="Phone"
              value={lawyerForm.phone}
              onChangeText={(v) => setLawyerForm((prev) => ({ ...prev, phone: v }))}
              placeholder="Phone number"
              keyboardType="phone-pad"
            />
            <Input
              label="Specialization"
              value={lawyerForm.specialization}
              onChangeText={(v) => setLawyerForm((prev) => ({ ...prev, specialization: v }))}
              placeholder="e.g. Property Law, Litigation"
            />
            <Input
              label="License Number"
              value={lawyerForm.license_number}
              onChangeText={(v) => setLawyerForm((prev) => ({ ...prev, license_number: v }))}
              placeholder="License number"
            />
            <SelectField
              label="State"
              value={lawyerForm.state_id ? pricingLocations.find((s) => String(s.id) === lawyerForm.state_id)?.state_name : ''}
              placeholder="Select state"
              onPress={() => setShowPricingStatePicker(true)}
            />
            <View style={styles.row}>
              <Button
                title={editingLawyerId ? 'Update' : 'Add Lawyer'}
                onPress={handleSaveLawyer}
                loading={submitting}
                style={styles.flex1}
              />
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => {
                  setShowAddLawyerModal(false);
                  resetLawyerForm();
                }}
                style={styles.flex1}
              />
            </View>
          </View>
        </View>
      )}

      {/* Review Application Dialog */}
      <ConfirmDialog
        visible={showReviewDialog}
        title={reviewAction === 'approve' ? 'Approve Application' : 'Reject Application'}
        message={reviewAction === 'approve' ? 'Add a review note (optional):' : 'Provide a reason for rejection:'}
        confirmText={reviewAction === 'approve' ? 'Approve' : 'Reject'}
        cancelText="Cancel"
        onConfirm={confirmReviewApplication}
        onCancel={() => {
          setShowReviewDialog(false);
          setSelectedApplicationId(null);
          setReviewAction(null);
          setReviewNote('');
        }}
        loading={submitting}
        variant={reviewAction === 'approve' ? 'primary' : 'danger'}
      />
      {showReviewDialog && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.cardTitle}>
              {reviewAction === 'approve' ? 'Approve Application' : 'Reject Application'}
            </Text>
            <TextInput
              style={styles.textArea}
              value={reviewNote}
              onChangeText={setReviewNote}
              placeholder={reviewAction === 'approve' ? 'Review note (optional)...' : 'Reason for rejection...'}
              multiline
              numberOfLines={4}
            />
            <View style={styles.row}>
              <Button
                title={reviewAction === 'approve' ? 'Approve' : 'Reject'}
                variant={reviewAction === 'approve' ? 'primary' : 'danger'}
                onPress={confirmReviewApplication}
                loading={submitting}
                style={styles.flex1}
              />
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => {
                  setShowReviewDialog(false);
                  setSelectedApplicationId(null);
                  setReviewAction(null);
                  setReviewNote('');
                }}
                style={styles.flex1}
              />
            </View>
          </View>
        </View>
      )}
    </>
  );

  // ===================== NEW: LAWYER ACTIVITY TAB =====================
  const renderLawyerActivity = () => {
    const timeRangeOptions = [
      { label: '24 Hours', value: '24hours' },
      { label: '7 Days', value: '7days' },
      { label: '30 Days', value: '30days' },
      { label: '90 Days', value: '90days' },
    ];

    return (
      <View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Lawyer Activity Stats</Text>
          <Text style={styles.filterLabel}>Time Range</Text>
          <View style={styles.filtersRow}>
            {timeRangeOptions.map((opt) => (
              <FilterChip
                key={opt.value}
                label={opt.label}
                active={activityTimeRange === opt.value}
                onPress={() => {
                  setActivityTimeRange(opt.value);
                  loadLawyerActivitiesData(opt.value);
                }}
              />
            ))}
          </View>
        </View>

        {lawyerActivities.length === 0 ? (
          <EmptyState
            icon="pulse-outline"
            title="No activity data"
            message="Lawyer activity statistics will appear here."
          />
        ) : (
          lawyerActivities.map((activity, index) => (
            <View key={activity.id || index} style={styles.card}>
              <Text style={styles.cardTitle}>{activity.lawyer_name || activity.full_name || 'Lawyer'}</Text>
              {activity.email ? <Text style={styles.meta}>Email: {activity.email}</Text> : null}
              <View style={styles.activityStatRow}>
                {activity.properties_managed !== undefined && (
                  <View style={styles.activityStat}>
                    <Text style={styles.analyticsValue}>{activity.properties_managed}</Text>
                    <Text style={styles.analyticsLabel}>Properties</Text>
                  </View>
                )}
                {activity.clients_served !== undefined && (
                  <View style={styles.activityStat}>
                    <Text style={styles.analyticsValue}>{activity.clients_served}</Text>
                    <Text style={styles.analyticsLabel}>Clients</Text>
                  </View>
                )}
                {activity.documents_filed !== undefined && (
                  <View style={styles.activityStat}>
                    <Text style={styles.analyticsValue}>{activity.documents_filed}</Text>
                    <Text style={styles.analyticsLabel}>Documents</Text>
                  </View>
                )}
                {activity.disputes_handled !== undefined && (
                  <View style={styles.activityStat}>
                    <Text style={styles.analyticsValue}>{activity.disputes_handled}</Text>
                    <Text style={styles.analyticsLabel}>Disputes</Text>
                  </View>
                )}
                {activity.agreements_generated !== undefined && (
                  <View style={styles.activityStat}>
                    <Text style={styles.analyticsValue}>{activity.agreements_generated}</Text>
                    <Text style={styles.analyticsLabel}>Agreements</Text>
                  </View>
                )}
              </View>
              {activity.last_active_at ? (
                <Text style={styles.meta}>
                  Last active: {new Date(activity.last_active_at).toLocaleString()}
                </Text>
              ) : null}
              {activity.total_hours_logged ? (
                <Text style={styles.meta}>Total hours logged: {activity.total_hours_logged}</Text>
              ) : null}
            </View>
          ))
        )}
      </View>
    );
  };

  // ===================== NEW: ADMIN MANAGEMENT TAB =====================
  const handleImpersonateAdmin = async (adminId, adminName) => {
    Alert.alert(
      'Impersonate Admin',
      `You are about to impersonate ${adminName}. This will log you in as this admin. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Impersonate',
          onPress: async () => {
            try {
              setSubmitting(true);
              await superAdminService.impersonateAdmin(adminId);
              Toast.show({ type: 'success', text1: `Now impersonating ${adminName}` });
              // The app should navigate/login as the impersonated admin
            } catch (error) {
              Toast.show({
                type: 'error',
                text1: 'Failed',
                text2: getErrorMessage(error, 'Could not impersonate admin'),
              });
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const handleUpdateJurisdiction = async (adminId) => {
    if (!jurisdictionForm.state) {
      Toast.show({ type: 'error', text1: 'State is required' });
      return;
    }

    await runAction(
      async () => {
        await superAdminService.updateAdminJurisdiction(
          adminId,
          jurisdictionForm.state,
          jurisdictionForm.city || undefined
        );
        setEditingJurisdiction(null);
        setJurisdictionForm({ state: '', city: '' });
        await loadAdmins();
      },
      'Admin jurisdiction updated',
      null
    );
  };

  const toggleAdminExpand = (adminId) => {
    if (expandedAdminId === adminId) {
      setExpandedAdminId(null);
      setAdminStateUsers([]);
    } else {
      setExpandedAdminId(adminId);
      loadAdminStateUsers(adminId);
    }
  };

  const renderAdminManagement = () => (
    <>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Admin Management</Text>
        <Text style={styles.meta}>
          Manage admin accounts, impersonate admins, and edit jurisdictions.
        </Text>
      </View>

      {admins.length === 0 ? (
        <EmptyState
          icon="shield-checkmark-outline"
          title="No admins found"
          message="Admin accounts will appear here once they are created."
        />
      ) : (
        admins.map((admin) => (
          <View key={admin.id} style={styles.card}>
            <TouchableOpacity onPress={() => toggleAdminExpand(admin.id)}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>{admin.full_name}</Text>
                <Text style={styles.meta}>{expandedAdminId === admin.id ? '▲' : '▼'}</Text>
              </View>
            </TouchableOpacity>
            <Text style={styles.meta}>Email: {admin.email}</Text>
            {admin.assigned_state ? (
              <Text style={styles.meta}>Jurisdiction: {admin.assigned_state}{admin.assigned_city ? ` - ${admin.assigned_city}` : ''}</Text>
            ) : (
              <Text style={styles.meta}>Jurisdiction: Not assigned</Text>
            )}
            <Text style={styles.meta}>
              Verified: {admin.credentials_verified_count ?? 0} users
            </Text>
            {admin.last_verification_at ? (
              <Text style={styles.meta}>
                Last activity: {new Date(admin.last_verification_at).toLocaleString()}
              </Text>
            ) : null}

            <View style={styles.row}>
              <TouchableOpacity onPress={() => handleImpersonateAdmin(admin.id, admin.full_name)}>
                <Text style={styles.linkText}>Impersonate</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setEditingJurisdiction(admin.id);
                  setJurisdictionForm({
                    state: admin.assigned_state || '',
                    city: admin.assigned_city || '',
                  });
                }}
              >
                <Text style={styles.linkText}>Edit Jurisdiction</Text>
              </TouchableOpacity>
            </View>

            {expandedAdminId === admin.id && (
              <View style={styles.expandedSection}>
                <Text style={styles.filterLabel}>State Users</Text>
                {loadingStateUsers ? (
                  <Text style={styles.meta}>Loading...</Text>
                ) : adminStateUsers.length === 0 ? (
                  <Text style={styles.meta}>No users in this admin's jurisdiction.</Text>
                ) : (
                  adminStateUsers.map((user) => (
                    <View key={user.id} style={styles.listRow}>
                      <Text style={styles.listTitle}>{user.full_name || user.name}</Text>
                      <Text style={styles.meta}>{user.email}</Text>
                      <Text style={styles.meta}>Role: {user.user_type}</Text>
                    </View>
                  ))
                )}
              </View>
            )}

            {editingJurisdiction === admin.id && (
              <View style={styles.inlineForm}>
                <Input
                  label="State"
                  value={jurisdictionForm.state}
                  onChangeText={(v) => setJurisdictionForm((prev) => ({ ...prev, state: v }))}
                  placeholder="Enter state name"
                />
                <Input
                  label="City (optional)"
                  value={jurisdictionForm.city}
                  onChangeText={(v) => setJurisdictionForm((prev) => ({ ...prev, city: v }))}
                  placeholder="Enter city name"
                />
                <View style={styles.row}>
                  <Button
                    title="Save"
                    onPress={() => handleUpdateJurisdiction(admin.id)}
                    loading={submitting}
                    size="sm"
                  />
                  <Button
                    title="Cancel"
                    variant="outline"
                    onPress={() => {
                      setEditingJurisdiction(null);
                      setJurisdictionForm({ state: '', city: '' });
                    }}
                    size="sm"
                  />
                </View>
              </View>
            )}
          </View>
        ))
      )}
    </>
  );

  // ===================== NEW: PENDING ADMIN APPROVALS TAB =====================
  const renderPendingApprovals = () => (
    <>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Pending Admin Approvals</Text>
        <Text style={styles.meta}>
          Review and approve/reject admin account requests.
        </Text>
        <Button
          title="Refresh"
          onPress={() => runAction(() => loadPendingAdmins(), 'Pending admins refreshed', null)}
          loading={submitting}
          size="sm"
        />
      </View>

      {pendingAdmins.length === 0 ? (
        <EmptyState
          icon="checkmark-circle-outline"
          title="No pending approvals"
          message="All admin requests have been processed."
        />
      ) : (
        pendingAdmins.map((admin) => (
          <View key={admin.id} style={styles.card}>
            <Text style={styles.cardTitle}>{admin.full_name || admin.name || 'Unknown'}</Text>
            <Text style={styles.meta}>Email: {admin.email}</Text>
            {admin.phone ? <Text style={styles.meta}>Phone: {admin.phone}</Text> : null}
            {admin.state_name || admin.state ? (
              <Text style={styles.meta}>State: {admin.state_name || admin.state}</Text>
            ) : null}
            {admin.city ? <Text style={styles.meta}>City: {admin.city}</Text> : null}
            {admin.role_requested ? (
              <Text style={styles.meta}>Role requested: {admin.role_requested}</Text>
            ) : null}
            {admin.created_at ? (
              <Text style={styles.meta}>
                Requested: {new Date(admin.created_at).toLocaleDateString()}
              </Text>
            ) : null}
            {admin.reason ? (
              <Text style={styles.meta}>Reason: {admin.reason}</Text>
            ) : null}
            <StatusBadge status={admin.status || 'pending'} />

            <View style={styles.row}>
              <TouchableOpacity
                onPress={() =>
                  runAction(
                    async () => {
                      await superAdminService.approvePendingAdmin(admin.id);
                      await loadPendingAdmins();
                    },
                    'Admin approved',
                    null
                  )
                }
              >
                <Text style={styles.linkText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  runAction(
                    async () => {
                      await superAdminService.rejectPendingAdmin(admin.id);
                      await loadPendingAdmins();
                    },
                    'Admin rejected',
                    null
                  )
                }
              >
                <Text style={styles.warnText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </>
  );

  const renderedSection = {
    overview: renderOverview(),
    users: renderUsers(),
    verifications: renderVerifications(),
    lawyer_invites: renderLawyerInvites(),
    analytics: renderStructuredAnalytics(),
    platform_lawyers: renderPlatformLawyers(),
    lawyer_activity: renderLawyerActivity(),
    admin_management: renderAdminManagement(),
    pending_approvals: renderPendingApprovals(),
    pricing: renderPricing(),
    properties: renderProperties(),
    reports: renderReports(),
    broadcasts: renderBroadcasts(),
    flags: renderFlags(),
    fraud: renderFraud(),
    logs: renderLogs(),
  }[section];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Super Admin Control Center</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabRow}>
        {sections.map((item) => (
          <SectionButton
            key={item}
            label={item}
            active={section === item}
            onPress={() => setSection(item)}
          />
        ))}
      </ScrollView>

      {loading ? <Text style={styles.meta}>Loading...</Text> : renderedSection}

      <OptionPickerModal
        visible={showPricingStatePicker}
        title="Select State"
        options={pricingLocations}
        selectedValue={pricingForm.state_id}
        searchable
        searchPlaceholder="Search states"
        getOptionLabel={(item) => item.state_name}
        getOptionValue={(item) => item.id}
        onClose={() => setShowPricingStatePicker(false)}
        onSelect={(item) =>
          setPricingForm((prev) => ({
            ...prev,
            state_id: String(item.id),
            lga_name: '',
          }))
        }
      />

      <OptionPickerModal
        visible={showPricingLgaPicker}
        title="Select Local Government Area"
        options={availablePricingLgas}
        selectedValue={pricingForm.lga_name}
        searchable
        searchPlaceholder="Search LGAs"
        getOptionLabel={(item) => String(item)}
        getOptionValue={(item) => String(item)}
        onClose={() => setShowPricingLgaPicker(false)}
        onSelect={(item) =>
          setPricingForm((prev) => ({
            ...prev,
            lga_name: String(item),
          }))
        }
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 24 },
  title: { fontSize: 28, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
  tabRow: { marginBottom: 12 },
  tabBtn: {
    marginRight: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  tabBtnActive: { backgroundColor: '#0284c7', borderColor: '#0284c7' },
  tabText: { color: '#1d4ed8', fontWeight: '700', textTransform: 'capitalize' },
  tabTextActive: { color: '#ffffff' },
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  meta: { marginTop: 4, color: '#475569' },
  row: { flexDirection: 'row', gap: 16, marginTop: 10, flexWrap: 'wrap' },
  linkText: { color: '#0284c7', fontWeight: '700', marginTop: 8 },
  warnText: { color: '#dc2626', fontWeight: '700', marginTop: 8 },
  filterLabel: {
    marginBottom: 8,
    color: '#334155',
    fontWeight: '700',
  },
  filtersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: '#ffffff',
  },
  filterChipActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#38bdf8',
  },
  filterChipText: {
    color: '#475569',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  filterChipTextActive: {
    color: '#0369a1',
  },
  listRow: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
    marginTop: 10,
  },
  listTitle: {
    fontWeight: '700',
    color: '#0f172a',
  },
  targetGrid: {
    gap: 10,
    marginTop: 10,
  },
  targetCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#f8fafc',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  marginTop: {
    marginTop: 10,
  },
  // ===================== NEW STYLES =====================
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  analyticsCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    minWidth: '47%',
    flex: 1,
    alignItems: 'center',
  },
  analyticsValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
  },
  analyticsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 4,
    textTransform: 'capitalize',
    textAlign: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  smallBtn: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  smallBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxActive: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7',
  },
  checkmark: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bulkActions: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  statusOptions: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  activityStatRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  activityStat: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    minWidth: 60,
  },
  expandedSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  inlineForm: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 8,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#0f172a',
    backgroundColor: '#ffffff',
    textAlignVertical: 'top',
    minHeight: 80,
    marginBottom: 12,
  },
  flex1: {
    flex: 1,
  },
});

export default SuperAdminDashboardScreen;
