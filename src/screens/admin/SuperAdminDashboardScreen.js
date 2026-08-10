import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {Alert,
  FlatList,
  Linking,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  View,} from 'react-native';
import Toast from 'react-native-toast-message';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import SelectField from '../../components/common/SelectField';
import OptionPickerModal from '../../components/common/OptionPickerModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import EmptyState from '../../components/common/EmptyState';
import StatusBadge from '../../components/common/StatusBadge';
import AdminAccountActions from '../../components/admin/AdminAccountActions';
import OperationNoteModal from '../../components/admin/OperationNoteModal';
import { superAdminService } from '../../services/superAdminService';
import { authService } from '../../services/authService';
import { buildUploadUrl, getErrorMessage, pickList, pickObject } from '../../utils/http';
import FlagsSection from '../../components/admin/FlagsSection';
import RegistrationAccessSection from '../../components/admin/RegistrationAccessSection';
import TenancyWorkflowSection from '../../components/admin/TenancyWorkflowSection';
import PropertyRequestWorkflowSection from '../../components/admin/PropertyRequestWorkflowSection';
import {
  ActionRow,
  DashboardHero,
} from '../../components/dashboard/DashboardKit';
import { AuthContext } from '../../context/AuthContext';
import { colors, typography, radius } from '../../theme';
import TourTarget from '../../components/tour/TourTarget';
import {
  TourScrollProvider,
  useTourScrollController,
} from '../../components/tour/TourScrollContext';
import { useAccessibilityPreferences } from '../../hooks/useAccessibilityPreferences';

import AppText from '../../components/common/AppText';
const sections = [
  'overview',
  'users',
  'verifications',
  'moderation',
  'lawyer_invites',
  'analytics',
  'platform_lawyers',
  'platform_agents',
  'lawyer_activity',
  'admin_management',
  'pending_approvals',
  'property_requests',
  'pricing',
  'registration_access',
  'properties',
  'reports',
  'broadcasts',
  'ad_spaces',
  'flags',
  'sfa_permissions',
  'fraud',
  'logs',
];

const sectionOptions = sections.map((value) => ({
  value,
  label: value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
}));

const normalizeRequestedSection = (value) => {
  const requested = String(value || '').trim().toLowerCase();
  const aliases = {
    broadcast: 'broadcasts',
    live_moderation: 'moderation',
  };
  const normalized = aliases[requested] || requested;
  return sections.includes(normalized) ? normalized : null;
};

const LGA_JURISDICTION_ROLES = new Set([
  'admin',
  'lga_admin',
  'lga_support_admin',
  'lga_financial_admin',
  'lawyer',
  'transportation_admin',
  'lga_transportation_admin',
  'fumigation_admin',
  'lga_fumigation_admin',
]);

const defaultPricingForm = {
  applies_to: 'tenant_registration',
  state_id: '',
  lga_name: '',
  amount: '',
  is_active: true,
};

const fallbackAdPlacements = [
  { value: 'home_top', label: 'Home top banner' },
  { value: 'home_featured', label: 'Home featured section' },
  { value: 'dashboard_top', label: 'Dashboard top banner' },
  { value: 'dashboard_inline', label: 'Dashboard inline banner' },
  { value: 'properties_top', label: 'Properties top banner' },
  { value: 'properties_inline', label: 'Properties inline banner' },
];

const defaultAdSpaceForm = {
  placement: 'home_top',
  title: '',
  description: '',
  sponsor_name: '',
  image_url: '',
  target_url: '',
  cta_label: 'Learn more',
  background_color: '#ffffff',
  text_color: '#111827',
  is_active: true,
  sort_order: '0',
  starts_at: '',
  ends_at: '',
};

const FilterChip = ({ label, active, onPress }) => (
  <TouchableOpacity style={[styles.filterChip, active && styles.filterChipActive]} onPress={onPress}>
    <AppText style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</AppText>
  </TouchableOpacity>
);

const SuperAdminDashboardScreen = ({ navigation, route }) => {
  const { beginImpersonation } = useContext(AuthContext);
  const { reduceMotion } = useAccessibilityPreferences();
  const tourScroll = useTourScrollController({ animated: !reduceMotion });
  const [section, setSection] = useState(
    () => normalizeRequestedSection(route?.params?.initialPanel) || 'overview'
  );
  const [showSectionPicker, setShowSectionPicker] = useState(false);
  const loadedSections = useRef(new Set());
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

  useEffect(() => {
    const applyRequestedSection = () => {
      const requestedSection = normalizeRequestedSection(route?.params?.initialPanel);
      if (requestedSection) setSection(requestedSection);
    };

    applyRequestedSection();
    return navigation.addListener('focus', applyRequestedSection);
  }, [navigation, route?.params?.initialPanel]);
  const [editingLawyerId, setEditingLawyerId] = useState(null);
  const [lawyerApplications, setLawyerApplications] = useState([]);
  const [showLawyerApplications, setShowLawyerApplications] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [selectedApplicationId, setSelectedApplicationId] = useState(null);
  const [reviewAction, setReviewAction] = useState(null); // 'approve' or 'reject'
  const [sfaList, setSfaList] = useState([]);
  const [platformAgents, setPlatformAgents] = useState([]);
  const [adSpaces, setAdSpaces] = useState([]);

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
  const [adPlacements, setAdPlacements] = useState(fallbackAdPlacements);
  const [adSpaceForm, setAdSpaceForm] = useState(defaultAdSpaceForm);
  const [editingAdSpaceId, setEditingAdSpaceId] = useState(null);

  // New state for report status changes
  const [reportStatusTargets, setReportStatusTargets] = useState({});

  // New state for bulk actions
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [selectedPropertyIds, setSelectedPropertyIds] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  const [showBulkActionPicker, setShowBulkActionPicker] = useState(false);
  const [operationPrompt, setOperationPrompt] = useState(null);

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

  const loadSfaPermissions = async () => {
    const response = await superAdminService.getSFAPermissions();
    setSfaList(pickList(response, ['data', 'permissions']) || []);
  };

  const loadPlatformAgents = async () => {
    const response = await superAdminService.getPlatformAgents();
    const payload = pickObject(response, ['data']) || response;
    setPlatformAgents(
      pickList(payload, ['agents']) || payload.agents || pickList(response, ['agents']) || []
    );
  };

  const loadAdSpaces = async () => {
    const response = await superAdminService.getAdSpaces();
    const payload = pickObject(response, ['data']) || {};
    setAdSpaces(payload.ads || []);
    setAdPlacements(payload.placements || fallbackAdPlacements);
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

  const loadSection = async (targetSection, force = false) => {
    if (!force && loadedSections.current.has(targetSection)) {
      return;
    }

    setLoading(true);
    try {
      switch (targetSection) {
        case 'overview':
        case 'analytics': {
          const response = await superAdminService.getAnalytics();
          setAnalytics(pickObject(response, ['data']) || {});
          break;
        }
        case 'users': {
          const response = await superAdminService.getUsers();
          setUsers(pickList(response, ['users', 'data']));
          break;
        }
        case 'verifications':
          await loadVerificationData();
          break;
        case 'moderation': {
          const [verificationsResponse, reportsResponse, flagsResponse, fraudResponse] = await Promise.all([
            superAdminService.getVerifications(verificationFilters),
            superAdminService.getReports(),
            superAdminService.getFlags(),
            superAdminService.getFraudFlags(),
          ]);
          setVerifications(pickList(verificationsResponse, ['data', 'verifications']));
          setReports(pickList(reportsResponse, ['reports', 'data']));
          setFlags(pickList(flagsResponse, ['flags', 'data']));
          setFraud(pickList(fraudResponse, ['flags', 'data']));
          break;
        }
        case 'lawyer_invites':
          await loadLawyerInvites();
          break;
        case 'platform_lawyers':
          await loadPlatformLawyers();
          break;
        case 'platform_agents':
          await loadPlatformAgents();
          break;
        case 'lawyer_activity': {
          const response = await superAdminService.getLawyerActivities(activityTimeRange);
          setLawyerActivities(pickList(response, ['data']));
          break;
        }
        case 'admin_management':
          await loadAdmins();
          break;
        case 'pending_approvals':
          await loadPendingAdmins();
          break;
        case 'pricing': {
          const response = await superAdminService.getPricingRules();
          const payload = pickObject(response, ['data']) || {};
          setPricingRules(payload.rules || []);
          setPricingTargets(payload.targets || []);
          setPricingLocations(payload.locations || []);
          break;
        }
        case 'properties': {
          const response = await superAdminService.getProperties();
          setProperties(pickList(response, ['properties', 'data']));
          break;
        }
        case 'reports': {
          const response = await superAdminService.getReports();
          setReports(pickList(response, ['reports', 'data']));
          break;
        }
        case 'broadcasts': {
          const response = await superAdminService.getBroadcasts();
          setBroadcasts(pickList(response, ['broadcasts', 'data']));
          break;
        }
        case 'ad_spaces':
          await loadAdSpaces();
          break;
        case 'flags': {
          const response = await superAdminService.getFlags();
          setFlags(pickList(response, ['flags', 'data']));
          break;
        }
        case 'sfa_permissions':
          await loadSfaPermissions();
          break;
        case 'fraud': {
          const response = await superAdminService.getFraudFlags();
          setFraud(pickList(response, ['flags', 'data']));
          break;
        }
        case 'logs': {
          const response = await superAdminService.getLogs();
          setLogs(pickList(response, ['logs', 'data']));
          break;
        }
        default:
          break;
      }
      loadedSections.current.add(targetSection);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load this workspace'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSection(section);
  }, [section]);

  const runAction = async (
    action,
    successMessage,
    reload = () => loadSection(section, true)
  ) => {
    try {
      setSubmitting(true);
      await action();
      if (reload) {
        await reload();
      }
      Toast.show({ type: 'success', text1: successMessage });
      return true;
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Action failed'),
      });
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const submitOperationNote = async (note) => {
    if (!operationPrompt?.target?.id) return;

    let succeeded = false;
    if (operationPrompt.type === 'ban_user') {
      succeeded = await runAction(
        () => superAdminService.banUser(operationPrompt.target.id, note),
        'User banned'
      );
    } else if (operationPrompt.type === 'reject_admin') {
      succeeded = await runAction(
        async () => {
          await superAdminService.rejectPendingAdmin(operationPrompt.target.id, note);
          await loadPendingAdmins();
        },
        'Admin rejected',
        null
      );
    } else if (operationPrompt.type === 'update_jurisdiction') {
      const jurisdiction = operationPrompt.jurisdiction || {};
      succeeded = await runAction(
        async () => {
          await superAdminService.updateAdminJurisdiction(
            operationPrompt.target.id,
            jurisdiction.state,
            jurisdiction.city || undefined,
            note
          );
          setEditingJurisdiction(null);
          setJurisdictionForm({ state: '', city: '' });
          await loadAdmins();
        },
        'Admin jurisdiction updated',
        null
      );
    }

    if (succeeded) setOperationPrompt(null);
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

  const resetAdSpaceForm = () => {
    setEditingAdSpaceId(null);
    setAdSpaceForm(defaultAdSpaceForm);
  };

  const buildAdSpacePayload = (form = adSpaceForm) => ({
    placement: form.placement,
    title: form.title.trim(),
    description: form.description.trim(),
    sponsor_name: form.sponsor_name.trim(),
    image_url: form.image_url.trim(),
    target_url: form.target_url.trim(),
    cta_label: form.cta_label.trim() || 'Learn more',
    background_color: form.background_color.trim() || '#ffffff',
    text_color: form.text_color.trim() || '#111827',
    is_active: Boolean(form.is_active),
    sort_order: Number(form.sort_order || 0),
    starts_at: form.starts_at.trim() || null,
    ends_at: form.ends_at.trim() || null,
  });

  const handleEditAdSpace = (ad) => {
    setEditingAdSpaceId(ad.id);
    setAdSpaceForm({
      placement: ad.placement || 'home_top',
      title: ad.title || '',
      description: ad.description || '',
      sponsor_name: ad.sponsor_name || '',
      image_url: ad.image_url || '',
      target_url: ad.target_url || '',
      cta_label: ad.cta_label || 'Learn more',
      background_color: ad.background_color || '#ffffff',
      text_color: ad.text_color || '#111827',
      is_active: ad.is_active === true,
      sort_order: String(ad.sort_order || 0),
      starts_at: ad.starts_at || '',
      ends_at: ad.ends_at || '',
    });
  };

  const handleSaveAdSpace = async () => {
    if (!adSpaceForm.title.trim()) {
      Toast.show({ type: 'error', text1: 'Ad title is required' });
      return;
    }

    if (!adSpaceForm.target_url.trim()) {
      Toast.show({ type: 'error', text1: 'Target URL is required' });
      return;
    }

    await runAction(
      async () => {
        const payload = buildAdSpacePayload();
        if (editingAdSpaceId) {
          await superAdminService.updateAdSpace(editingAdSpaceId, payload);
        } else {
          await superAdminService.createAdSpace(payload);
        }
        resetAdSpaceForm();
        await loadAdSpaces();
      },
      editingAdSpaceId ? 'Ad space updated' : 'Ad space created',
      null
    );
  };

  const handleToggleAdSpace = async (ad) => {
    await runAction(
      async () => {
        await superAdminService.updateAdSpace(ad.id, {
          ...ad,
          is_active: !ad.is_active,
        });
        await loadAdSpaces();
      },
      ad.is_active ? 'Ad space paused' : 'Ad space activated',
      null
    );
  };

  const handleDeleteAdSpace = (adId) => {
    Alert.alert('Delete ad space', 'Delete this ad space permanently?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          runAction(
            async () => {
              await superAdminService.deleteAdSpace(adId);
              if (editingAdSpaceId === adId) {
                resetAdSpaceForm();
              }
              await loadAdSpaces();
            },
            'Ad space deleted',
            null
          ),
      },
    ]);
  };

  const renderOverview = () => {
    const analyticEntries = Object.entries(analytics);

    return (
      <View>
        <View style={styles.card}>
          <AppText style={styles.cardTitle}>Analytics Overview</AppText>
          <AppText style={styles.meta}>
            Quick platform statistics at a glance. Use the Analytics tab for detailed metrics.
          </AppText>
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
                <AppText style={styles.analyticsValue}>
                  {typeof value === 'number' ? value.toLocaleString() : String(value)}
                </AppText>
                <AppText style={styles.analyticsLabel}>
                  {key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </AppText>
              </View>
            ))}
          </View>
        )}

        {users.length > 0 && (
          <View style={styles.card}>
            <AppText style={styles.cardTitle}>Quick Stats</AppText>
            <AppText style={styles.meta}>Total Users: {users.length}</AppText>
            <AppText style={styles.meta}>Total Properties: {properties.length}</AppText>
            <AppText style={styles.meta}>Total Reports: {reports.length}</AppText>
            <AppText style={styles.meta}>Active Lawyers: {platformLawyers.length}</AppText>
            <AppText style={styles.meta}>Pending Admins: {pendingAdmins.length}</AppText>
          </View>
        )}

        <TenancyWorkflowSection title="National Tenancy Grace and Refund Enablement" />
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
        <AppText style={styles.cardTitle}>Users ({users.length})</AppText>
        <AppText style={styles.meta}>
          Select multiple users for bulk actions (ban, unban, promote, delete).
        </AppText>
        {selectedUserIds.length > 0 && (
          <View style={styles.bulkActions}>
            <AppText style={styles.filterLabel}>{selectedUserIds.length} selected</AppText>
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
                <AppText style={styles.warnText}>Clear Selection</AppText>
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
                  {selectedUserIds.includes(item.id) && <AppText style={styles.checkmark}>✓</AppText>}
                </View>
                <View>
                  <AppText style={styles.cardTitle}>{item.full_name}</AppText>
                  <AppText style={styles.meta}>{item.email}</AppText>
                </View>
              </View>
            </TouchableOpacity>
            <AppText style={styles.meta}>Role: {item.user_type}</AppText>
            {item.state_name ? <AppText style={styles.meta}>State: {item.state_name}</AppText> : null}
            {item.is_banned !== undefined && <StatusBadge status={item.is_banned ? 'banned' : 'active'} />}
            <View style={styles.row}>
              {item.is_banned ? (
                <TouchableOpacity onPress={() => runAction(() => superAdminService.unbanUser(item.id), 'User unbanned')}>
                  <AppText style={styles.linkText}>Unban</AppText>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => setOperationPrompt({ type: 'ban_user', target: item })}>
                  <AppText style={styles.warnText}>Ban</AppText>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => runAction(() => superAdminService.promoteUser(item.id), 'User promoted')}>
                <AppText style={styles.linkText}>Promote</AppText>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => runAction(() => superAdminService.deleteUser(item.id), 'User deleted')}>
                <AppText style={styles.warnText}>Delete</AppText>
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
        <AppText style={styles.cardTitle}>Verification Filters</AppText>
        <Input
          label="Search"
          value={verificationFilters.search}
          onChangeText={(value) =>
            setVerificationFilters((prev) => ({ ...prev, search: value }))
          }
          placeholder="Name, email, NIN, passport"
        />
        <AppText style={styles.filterLabel}>Status</AppText>
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

        <AppText style={styles.filterLabel}>Role</AppText>
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
            <AppText style={styles.cardTitle}>{item.full_name}</AppText>
            <AppText style={styles.meta}>{item.email}</AppText>
            <AppText style={styles.meta}>Role: {item.user_type}</AppText>
            <AppText style={styles.meta}>Document: {item.identity_document_type || 'nin'}</AppText>
            <AppText style={styles.meta}>Number: {documentNumber || '-'}</AppText>
            <AppText style={styles.meta}>Status: {reviewStatus}</AppText>
            <AppText style={styles.meta}>Verified By: {item.identity_verified_by_name || '-'}</AppText>
            {item.passport_photo_url ? (
              <TouchableOpacity
                onPress={() => Linking.openURL(buildUploadUrl(item.passport_photo_url))}
              >
                <AppText style={styles.linkText}>Open passport photo</AppText>
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
                  <AppText style={styles.linkText}>Approve</AppText>
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
                  <AppText style={styles.warnText}>Reject</AppText>
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
                  <AppText style={styles.warnText}>Delete</AppText>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        );
      })}

      <View style={styles.card}>
        <AppText style={styles.cardTitle}>Admin Verification Performance</AppText>
        {adminPerformance.length === 0 ? (
          <AppText style={styles.meta}>No admin verification activity yet.</AppText>
        ) : (
          adminPerformance.map((item) => (
            <View key={item.id} style={styles.listRow}>
              <AppText style={styles.listTitle}>{item.full_name}</AppText>
              <AppText style={styles.meta}>{item.email}</AppText>
              <AppText style={styles.meta}>Verified: {item.credentials_verified_count ?? 0}</AppText>
              <AppText style={styles.meta}>
                Last activity:{' '}
                {item.last_verification_at
                  ? new Date(item.last_verification_at).toLocaleString()
                  : 'No activity'}
              </AppText>
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
        <AppText style={styles.cardTitle}>Lawyer Invite Search</AppText>
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
          <AppText style={styles.meta}>No lawyer invites found.</AppText>
        </View>
      ) : null}

      {lawyerInvites.map((invite) => (
        <View key={invite.id} style={styles.card}>
          <AppText style={styles.cardTitle}>{invite.client_name}</AppText>
          <AppText style={styles.meta}>Assigned By: {invite.assigned_by_name || invite.client_name || '-'}</AppText>
          <AppText style={styles.meta}>Role: {invite.client_role}</AppText>
          <AppText style={styles.meta}>Lawyer Email: {invite.lawyer_email}</AppText>
          <AppText style={styles.meta}>Status: {getInviteStatusLabel(invite)}</AppText>
          <AppText style={styles.meta}>
            Expires:{' '}
            {invite.expires_at ? new Date(invite.expires_at).toLocaleString() : '-'}
          </AppText>
          <AppText style={styles.meta}>
            Last Sent:{' '}
            {invite.last_sent_at ? new Date(invite.last_sent_at).toLocaleString() : '-'}
          </AppText>
          <AppText style={styles.meta}>Resends: {invite.resent_count ?? 0}</AppText>

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
                  <AppText style={styles.linkText}>Save Email</AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setEditingInviteId(null);
                    setEditingInviteEmail('');
                  }}
                >
                  <AppText style={styles.warnText}>Cancel</AppText>
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
                <AppText style={styles.linkText}>Resend Invite</AppText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setEditingInviteId(invite.id);
                  setEditingInviteEmail(invite.lawyer_email || '');
                }}
              >
                <AppText style={styles.linkText}>Change Email</AppText>
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
        <AppText style={styles.cardTitle}>Location Pricing Rules</AppText>
        <AppText style={styles.meta}>
          Configure final amounts by state or local government area. LGA rules override state rules.
        </AppText>
        <View style={styles.targetGrid}>
          {pricingTargets.map((target) => (
            <View key={target.key} style={styles.targetCard}>
              <AppText style={styles.listTitle}>{target.label}</AppText>
              <AppText style={styles.meta}>
                Base fee: N{Number(target.base_amount || 0).toLocaleString()}
              </AppText>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <AppText style={styles.cardTitle}>
          {editingPricingRuleId ? 'Edit Pricing Rule' : 'Create Pricing Rule'}
        </AppText>
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
          <AppText style={styles.meta}>Rule is active</AppText>
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
            <AppText style={styles.cardTitle}>{target?.label || rule.applies_to}</AppText>
            <AppText style={styles.meta}>State: {rule.state_name}</AppText>
            <AppText style={styles.meta}>LGA: {rule.lga_name || 'Whole state'}</AppText>
            <AppText style={styles.meta}>
              Amount: N{Number(rule.amount || 0).toLocaleString()}
            </AppText>
            <AppText style={styles.meta}>Status: {rule.is_active ? 'Active' : 'Inactive'}</AppText>
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
                <AppText style={styles.linkText}>Edit</AppText>
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
                <AppText style={styles.linkText}>{rule.is_active ? 'Disable' : 'Enable'}</AppText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  runAction(
                    () => superAdminService.deletePricingRule(rule.id),
                    'Pricing rule deleted'
                  )
                }
              >
                <AppText style={styles.warnText}>Delete</AppText>
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
        <AppText style={styles.cardTitle}>Properties ({properties.length})</AppText>
        <AppText style={styles.meta}>
          Select multiple properties for bulk actions, or manage individually below.
        </AppText>
        {selectedPropertyIds.length > 0 && (
          <View style={styles.bulkActions}>
            <AppText style={styles.filterLabel}>{selectedPropertyIds.length} selected</AppText>
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
                <AppText style={styles.warnText}>Clear Selection</AppText>
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
                    {selectedPropertyIds.includes(item.id) && <AppText style={styles.checkmark}>✓</AppText>}
                  </View>
                  <AppText style={styles.cardTitle}>{item.title}</AppText>
                </View>
              </TouchableOpacity>
              {item.is_featured !== undefined && (
                <StatusBadge status={item.is_featured ? 'featured' : 'standard'} />
              )}
            </View>
            <AppText style={styles.meta}>{item.landlord_name || 'No landlord'}</AppText>
            {item.state_name ? <AppText style={styles.meta}>State: {item.state_name}</AppText> : null}
            {item.city ? <AppText style={styles.meta}>City: {item.city}</AppText> : null}
            {item.price ? <AppText style={styles.meta}>Price: N{Number(item.price).toLocaleString()}</AppText> : null}
            <StatusBadge status={item.status || 'active'} />
            <View style={styles.row}>
              <TouchableOpacity onPress={() => runAction(() => superAdminService.unlistProperty(item.id), 'Property unlisted')}>
                <AppText style={styles.warnText}>Unlist</AppText>
              </TouchableOpacity>
              {item.is_featured ? (
                <TouchableOpacity onPress={() => runAction(() => superAdminService.unfeatureProperty(item.id), 'Property unfeatured')}>
                  <AppText style={styles.linkText}>Unfeature</AppText>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => runAction(() => superAdminService.featureProperty(item.id), 'Property featured')}>
                  <AppText style={styles.linkText}>Feature</AppText>
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

  const renderModeration = () => {
    const pendingVerifications = verifications.filter((item) => {
      const status = item.identity_verification_status || (item.identity_verified ? 'verified' : 'pending');
      return status === 'pending';
    });
    const openReports = reports.filter((item) => !['resolved', 'dismissed'].includes(item.status));
    const openFraud = fraud.filter((item) => !['resolved', 'closed'].includes(item.status));

    return (
      <>
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={styles.flex1}>
              <AppText style={styles.cardTitle}>Live Moderation Queue</AppText>
              <AppText style={styles.meta}>
                Review identity checks, user reports, and fraud flags from one native screen.
              </AppText>
            </View>
            <View style={styles.liveDot} />
          </View>
          <View style={styles.analyticsGrid}>
            <View style={styles.analyticsCard}>
              <AppText style={styles.analyticsValue}>{pendingVerifications.length}</AppText>
              <AppText style={styles.analyticsLabel}>Verifications</AppText>
            </View>
            <View style={styles.analyticsCard}>
              <AppText style={styles.analyticsValue}>{openReports.length}</AppText>
              <AppText style={styles.analyticsLabel}>Reports</AppText>
            </View>
            <View style={styles.analyticsCard}>
              <AppText style={styles.analyticsValue}>{openFraud.length}</AppText>
              <AppText style={styles.analyticsLabel}>Fraud Flags</AppText>
            </View>
          </View>
          <Button
            title="Refresh Moderation"
            onPress={() =>
              runAction(
                async () => {
                  await Promise.all([loadVerificationData(), loadAll()]);
                },
                'Moderation queue refreshed',
                null
              )
            }
            loading={submitting}
          />
        </View>

        <AppText style={styles.sectionTitle}>Pending Verifications</AppText>
        {pendingVerifications.length === 0 ? (
          <AppText style={styles.meta}>No pending identity verifications.</AppText>
        ) : (
          pendingVerifications.slice(0, 6).map((item) => (
            <View key={`verification-${item.id}`} style={styles.card}>
              <AppText style={styles.cardTitle}>{item.full_name}</AppText>
              <AppText style={styles.meta}>{item.email}</AppText>
              <View style={styles.row}>
                <TouchableOpacity
                  onPress={() =>
                    runAction(
                      () => superAdminService.approveVerification(item.id),
                      'Verification approved'
                    )
                  }
                >
                  <AppText style={styles.linkText}>Approve</AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    runAction(
                      () => superAdminService.rejectVerification(item.id),
                      'Verification rejected'
                    )
                  }
                >
                  <AppText style={styles.warnText}>Reject</AppText>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <AppText style={styles.sectionTitle}>Open Reports</AppText>
        {openReports.length === 0 ? (
          <AppText style={styles.meta}>No open reports.</AppText>
        ) : (
          openReports.slice(0, 6).map((item) => (
            <View key={`report-${item.id}`} style={styles.card}>
              <AppText style={styles.cardTitle}>{item.reason || item.report_reason || `Report #${item.id}`}</AppText>
              <StatusBadge status={item.status || 'open'} />
              <TouchableOpacity
                onPress={() =>
                  runAction(
                    () => superAdminService.resolveReport(item.id),
                    'Report resolved'
                  )
                }
              >
                <AppText style={styles.linkText}>Resolve</AppText>
              </TouchableOpacity>
            </View>
          ))
        )}

        <AppText style={styles.sectionTitle}>Fraud Flags</AppText>
        {openFraud.length === 0 ? (
          <AppText style={styles.meta}>No open fraud flags.</AppText>
        ) : (
          openFraud.slice(0, 6).map((item) => (
            <View key={`fraud-${item.id}`} style={styles.card}>
              <AppText style={styles.cardTitle}>{item.rule || 'Fraud flag'}</AppText>
              <AppText style={styles.meta}>Score: {item.score ?? '-'}</AppText>
              <TouchableOpacity
                onPress={() =>
                  runAction(
                    () => superAdminService.resolveFraudFlag(item.id),
                    'Fraud flag resolved'
                  )
                }
              >
                <AppText style={styles.linkText}>Resolve</AppText>
              </TouchableOpacity>
            </View>
          ))
        )}
      </>
    );
  };

  const renderReports = () => {
    const reportStatusOptions = ['open', 'investigating', 'resolved', 'dismissed'];

    return (
      <>
        <View style={styles.card}>
          <AppText style={styles.cardTitle}>Reports ({reports.length})</AppText>
          <AppText style={styles.meta}>
            Manage reported content. Update status to track investigation progress.
          </AppText>
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
              <AppText style={styles.cardTitle}>{item.reason || item.report_reason || `Report #${item.id}`}</AppText>
              <View style={styles.rowBetween}>
                <StatusBadge status={item.status || 'open'} />
                <TouchableOpacity onPress={() => toggleReportStatusPicker(item.id)}>
                  <AppText style={styles.linkText}>Change Status</AppText>
                </TouchableOpacity>
              </View>
              {item.reporter_name ? (
                <AppText style={styles.meta}>Reported by: {item.reporter_name}</AppText>
              ) : null}
              {item.reported_user_name ? (
                <AppText style={styles.meta}>Against: {item.reported_user_name}</AppText>
              ) : null}
              {item.property_title ? (
                <AppText style={styles.meta}>Property: {item.property_title}</AppText>
              ) : null}
              {item.description ? (
                <AppText style={styles.meta}>Details: {item.description}</AppText>
              ) : null}
              {item.created_at ? (
                <AppText style={styles.meta}>
                  Created: {new Date(item.created_at).toLocaleString()}
                </AppText>
              ) : null}

              {reportStatusTargets[item.id] && (
                <View style={styles.statusOptions}>
                  <AppText style={styles.filterLabel}>Set Status:</AppText>
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
                  <AppText style={styles.linkText}>Resolve</AppText>
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
        <AppText style={styles.cardTitle}>Send Broadcast</AppText>
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
          <AppText style={styles.cardTitle}>{item.title}</AppText>
          <AppText style={styles.meta}>{item.message}</AppText>
          <AppText style={styles.meta}>Target: {item.target_role || 'all'}</AppText>
        </View>
      ))}
    </>
  );

  const renderFlags = () => (
    <FlagsSection
      flags={flags}
      onToggle={(key, enabled) =>
        runAction(() => superAdminService.updateFlag(key, enabled), 'Flag updated')
      }
    />
  );

  const renderRegistrationAccess = () => <RegistrationAccessSection />;

  const renderPropertyRequests = () => (
    <PropertyRequestWorkflowSection mode="support" title="Tenant Property Requests" />
  );

  const renderSfaPermissions = () => (
    <>
      <AppText style={styles.sectionTitle}>Super Financial Admin Permissions</AppText>
      {sfaList.length === 0 ? (
        <AppText style={styles.meta}>No SFA records found.</AppText>
      ) : (
        sfaList.map((item) => (
          <View key={item.id || item.super_financial_admin_id} style={styles.card}>
            <AppText style={styles.cardTitle}>{item.full_name || item.email}</AppText>
            <AppText style={styles.meta}>Approve admins: {String(item.can_approve_admins)}</AppText>
            <TouchableOpacity
              onPress={() =>
                runAction(
                  () =>
                    superAdminService.updateSFAPermission(item.super_financial_admin_id, {
                      can_approve_admins: !item.can_approve_admins,
                    }),
                  'SFA permissions updated',
                  loadSfaPermissions
                )
              }
            >
              <AppText style={styles.linkText}>Toggle approve admins</AppText>
            </TouchableOpacity>
          </View>
        ))
      )}
    </>
  );

  const renderPlatformAgents = () => (
    <>
      <AppText style={styles.sectionTitle}>Platform Agents</AppText>
      {platformAgents.length === 0 ? (
        <AppText style={styles.meta}>No platform agents loaded.</AppText>
      ) : (
        platformAgents.map((agent) => (
          <View key={agent.id} style={styles.card}>
            <AppText style={styles.cardTitle}>{agent.full_name || agent.email}</AppText>
            <AppText style={styles.meta}>{agent.email}</AppText>
            <AppText style={styles.meta}>Status: {agent.status || 'active'}</AppText>
          </View>
        ))
      )}
    </>
  );

  const renderAdSpaces = () => (
    <>
      <View style={styles.card}>
        <AppText style={styles.sectionTitle}>{editingAdSpaceId ? 'Edit Ad Space' : 'Create Ad Space'}</AppText>
        <AppText style={styles.meta}>Create, update, pause, and delete sponsored placements from mobile.</AppText>

        <AppText style={styles.filterLabel}>Placement</AppText>
        <View style={styles.filtersRow}>
          {adPlacements.map((placement) => (
            <FilterChip
              key={placement.value}
              label={placement.label}
              active={adSpaceForm.placement === placement.value}
              onPress={() =>
                setAdSpaceForm((prev) => ({ ...prev, placement: placement.value }))
              }
            />
          ))}
        </View>

        <Input
          label="Title"
          value={adSpaceForm.title}
          onChangeText={(value) => setAdSpaceForm((prev) => ({ ...prev, title: value }))}
          placeholder="Ad headline"
        />
        <Input
          label="Sponsor"
          value={adSpaceForm.sponsor_name}
          onChangeText={(value) => setAdSpaceForm((prev) => ({ ...prev, sponsor_name: value }))}
          placeholder="Sponsor name"
        />
        <AppText style={styles.filterLabel}>Description</AppText>
        <TextInput
          value={adSpaceForm.description}
          onChangeText={(value) => setAdSpaceForm((prev) => ({ ...prev, description: value }))}
          placeholder="Short ad message"
          multiline
          style={styles.textArea}
        />
        <Input
          label="Image URL"
          value={adSpaceForm.image_url}
          onChangeText={(value) => setAdSpaceForm((prev) => ({ ...prev, image_url: value }))}
          placeholder="https://... or /uploads/ad-spaces/image.jpg"
          autoCapitalize="none"
        />
        <Input
          label="Target URL"
          value={adSpaceForm.target_url}
          onChangeText={(value) => setAdSpaceForm((prev) => ({ ...prev, target_url: value }))}
          placeholder="/register, /properties/123, or https://..."
          autoCapitalize="none"
        />
        <Input
          label="CTA Label"
          value={adSpaceForm.cta_label}
          onChangeText={(value) => setAdSpaceForm((prev) => ({ ...prev, cta_label: value }))}
          placeholder="Learn more"
        />
        <View style={styles.row}>
          <View style={styles.flex1}>
            <Input
              label="Background Color"
              value={adSpaceForm.background_color}
              onChangeText={(value) => setAdSpaceForm((prev) => ({ ...prev, background_color: value }))}
              placeholder="#ffffff"
              autoCapitalize="none"
            />
          </View>
          <View style={styles.flex1}>
            <Input
              label="Text Color"
              value={adSpaceForm.text_color}
              onChangeText={(value) => setAdSpaceForm((prev) => ({ ...prev, text_color: value }))}
              placeholder="#111827"
              autoCapitalize="none"
            />
          </View>
        </View>
        <Input
          label="Sort Order"
          value={adSpaceForm.sort_order}
          onChangeText={(value) => setAdSpaceForm((prev) => ({ ...prev, sort_order: value }))}
          keyboardType="number-pad"
        />
        <Input
          label="Starts At"
          value={adSpaceForm.starts_at}
          onChangeText={(value) => setAdSpaceForm((prev) => ({ ...prev, starts_at: value }))}
          placeholder="YYYY-MM-DDTHH:mm or leave blank"
          autoCapitalize="none"
        />
        <Input
          label="Ends At"
          value={adSpaceForm.ends_at}
          onChangeText={(value) => setAdSpaceForm((prev) => ({ ...prev, ends_at: value }))}
          placeholder="YYYY-MM-DDTHH:mm or leave blank"
          autoCapitalize="none"
        />

        <View style={styles.switchRow}>
          <AppText style={styles.filterLabel}>Active</AppText>
          <Switch
            value={adSpaceForm.is_active}
            onValueChange={(value) => setAdSpaceForm((prev) => ({ ...prev, is_active: value }))}
          />
        </View>

        <View
          style={[
            styles.adPreview,
            { backgroundColor: adSpaceForm.background_color || '#ffffff' },
          ]}
        >
          <AppText style={[styles.cardTitle, { color: adSpaceForm.text_color || '#111827' }]}>
            {adSpaceForm.title || 'Ad preview title'}
          </AppText>
          <AppText style={[styles.meta, { color: adSpaceForm.text_color || '#111827' }]}>
            {adSpaceForm.description || 'Description preview'}
          </AppText>
        </View>

        <View style={styles.row}>
          <Button
            title={editingAdSpaceId ? 'Update Ad' : 'Create Ad'}
            onPress={handleSaveAdSpace}
            loading={submitting}
            size="sm"
          />
          {editingAdSpaceId ? (
            <Button title="New Ad" variant="outline" onPress={resetAdSpaceForm} size="sm" />
          ) : null}
        </View>
      </View>

      <AppText style={styles.sectionTitle}>Ad Spaces</AppText>
      {adSpaces.length === 0 ? (
        <EmptyState
          icon="megaphone-outline"
          title="No ad spaces configured"
          message="Create a sponsored placement above."
        />
      ) : (
        adSpaces.map((ad) => (
          <View key={ad.id} style={styles.card}>
            <AppText style={styles.cardTitle}>{ad.title || ad.placement}</AppText>
            <AppText style={styles.meta}>Placement: {ad.placement}</AppText>
            <AppText style={styles.meta}>Sponsor: {ad.sponsor_name || '-'}</AppText>
            <AppText style={styles.meta}>Target: {ad.target_url || '-'}</AppText>
            <AppText style={styles.meta}>Active: {ad.is_active ? 'Yes' : 'No'}</AppText>
            <AppText style={styles.meta}>Impressions: {ad.impression_count ?? 0}</AppText>
            <AppText style={styles.meta}>Clicks: {ad.click_count ?? 0}</AppText>
            <View style={styles.row}>
              <TouchableOpacity onPress={() => handleEditAdSpace(ad)}>
                <AppText style={styles.linkText}>Edit</AppText>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleToggleAdSpace(ad)}>
                <AppText style={styles.linkText}>{ad.is_active ? 'Pause' : 'Activate'}</AppText>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteAdSpace(ad.id)}>
                <AppText style={styles.warnText}>Delete</AppText>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </>
  );

  const renderFraud = () =>
    fraud.map((item) => (
      <View key={item.id} style={styles.card}>
        <AppText style={styles.cardTitle}>{item.rule || 'Fraud rule'}</AppText>
        <AppText style={styles.meta}>Score: {item.score}</AppText>
        <TouchableOpacity onPress={() => runAction(() => superAdminService.resolveFraudFlag(item.id), 'Fraud flag resolved')}>
          <AppText style={styles.linkText}>Resolve</AppText>
        </TouchableOpacity>
      </View>
    ));

  const renderLogs = () =>
    logs.map((item, index) => (
      <View key={`${item.id || 'log'}-${index}`} style={styles.card}>
        <AppText style={styles.cardTitle}>{item.action || item.event_type || 'Audit log'}</AppText>
        <AppText style={styles.meta}>{item.user_name || item.actor_name || 'System'}</AppText>
        <AppText style={styles.meta}>
          {item.created_at ? new Date(item.created_at).toLocaleString() : ''}
        </AppText>
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
          <AppText style={styles.cardTitle}>Analytics Dashboard</AppText>
          <AppText style={styles.filterLabel}>Time Range</AppText>
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
                <AppText style={styles.analyticsValue}>
                  {typeof value === 'number' ? value.toLocaleString() : String(value)}
                </AppText>
                <AppText style={styles.analyticsLabel}>
                  {key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </AppText>
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
          <AppText style={styles.cardTitle}>Platform Lawyers</AppText>
          <TouchableOpacity
            style={styles.smallBtn}
            onPress={() => {
              resetLawyerForm();
              setShowAddLawyerModal(true);
            }}
          >
            <AppText style={styles.smallBtnText}>+ Add Lawyer</AppText>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          onPress={() => {
            loadLawyerApplications();
            setShowLawyerApplications(!showLawyerApplications);
          }}
        >
          <AppText style={styles.linkText}>
            {showLawyerApplications ? 'Hide' : 'View'} Pending Applications
          </AppText>
        </TouchableOpacity>
      </View>

      {showLawyerApplications && (
        <>
          {lawyerApplications.length === 0 ? (
            <EmptyState title="No pending applications" message="No lawyer applications awaiting review." />
          ) : (
            lawyerApplications.map((app) => (
              <View key={app.id} style={styles.card}>
                <AppText style={styles.cardTitle}>{app.full_name || app.name}</AppText>
                {app.email ? <AppText style={styles.meta}>Email: {app.email}</AppText> : null}
                {app.phone ? <AppText style={styles.meta}>Phone: {app.phone}</AppText> : null}
                {app.specialization ? <AppText style={styles.meta}>Specialization: {app.specialization}</AppText> : null}
                {app.license_number ? <AppText style={styles.meta}>License: {app.license_number}</AppText> : null}
                {app.state_name ? <AppText style={styles.meta}>State: {app.state_name}</AppText> : null}
                {app.notes ? <AppText style={styles.meta}>Notes: {app.notes}</AppText> : null}
                <View style={styles.row}>
                  <TouchableOpacity onPress={() => handleReviewApplication(app.id, 'approve')}>
                    <AppText style={styles.linkText}>Approve</AppText>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleReviewApplication(app.id, 'reject')}>
                    <AppText style={styles.warnText}>Reject</AppText>
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
              <AppText style={styles.cardTitle}>{lawyer.full_name || lawyer.name}</AppText>
              <StatusBadge status={lawyer.status || lawyer.invite_status || 'active'} />
            </View>
            {lawyer.email ? <AppText style={styles.meta}>Email: {lawyer.email}</AppText> : null}
            {lawyer.phone ? <AppText style={styles.meta}>Phone: {lawyer.phone}</AppText> : null}
            {lawyer.specialization ? <AppText style={styles.meta}>Specialization: {lawyer.specialization}</AppText> : null}
            {lawyer.license_number ? <AppText style={styles.meta}>License: {lawyer.license_number}</AppText> : null}
            {lawyer.state_name ? <AppText style={styles.meta}>State: {lawyer.state_name}</AppText> : null}

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
                  <AppText style={styles.linkText}>Resend Invite</AppText>
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
                <AppText style={styles.linkText}>Edit</AppText>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteLawyer(lawyer.id, lawyer.full_name || lawyer.name)}>
                <AppText style={styles.warnText}>Remove</AppText>
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
            <AppText style={styles.cardTitle}>{editingLawyerId ? 'Edit Platform Lawyer' : 'Add Platform Lawyer'}</AppText>
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
            <AppText style={styles.cardTitle}>
              {reviewAction === 'approve' ? 'Approve Application' : 'Reject Application'}
            </AppText>
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
          <AppText style={styles.cardTitle}>Lawyer Activity Stats</AppText>
          <AppText style={styles.filterLabel}>Time Range</AppText>
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
              <AppText style={styles.cardTitle}>{activity.lawyer_name || activity.full_name || 'Lawyer'}</AppText>
              {activity.email ? <AppText style={styles.meta}>Email: {activity.email}</AppText> : null}
              <View style={styles.activityStatRow}>
                {activity.properties_managed !== undefined && (
                  <View style={styles.activityStat}>
                    <AppText style={styles.analyticsValue}>{activity.properties_managed}</AppText>
                    <AppText style={styles.analyticsLabel}>Properties</AppText>
                  </View>
                )}
                {activity.clients_served !== undefined && (
                  <View style={styles.activityStat}>
                    <AppText style={styles.analyticsValue}>{activity.clients_served}</AppText>
                    <AppText style={styles.analyticsLabel}>Clients</AppText>
                  </View>
                )}
                {activity.documents_filed !== undefined && (
                  <View style={styles.activityStat}>
                    <AppText style={styles.analyticsValue}>{activity.documents_filed}</AppText>
                    <AppText style={styles.analyticsLabel}>Documents</AppText>
                  </View>
                )}
                {activity.disputes_handled !== undefined && (
                  <View style={styles.activityStat}>
                    <AppText style={styles.analyticsValue}>{activity.disputes_handled}</AppText>
                    <AppText style={styles.analyticsLabel}>Disputes</AppText>
                  </View>
                )}
                {activity.agreements_generated !== undefined && (
                  <View style={styles.activityStat}>
                    <AppText style={styles.analyticsValue}>{activity.agreements_generated}</AppText>
                    <AppText style={styles.analyticsLabel}>Agreements</AppText>
                  </View>
                )}
              </View>
              {activity.last_active_at ? (
                <AppText style={styles.meta}>
                  Last active: {new Date(activity.last_active_at).toLocaleString()}
                </AppText>
              ) : null}
              {activity.total_hours_logged ? (
                <AppText style={styles.meta}>Total hours logged: {activity.total_hours_logged}</AppText>
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
              const response = await superAdminService.impersonateAdmin(adminId);
              if (!response?.success || !response?.data?.token || !response?.data?.user) {
                throw new Error(
                  response?.message ||
                  'The server did not return a complete impersonation session.'
                );
              }
              await beginImpersonation(response.data);
              Toast.show({ type: 'success', text1: `Now impersonating ${adminName}` });
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

    const targetAdmin =
      admins.find((admin) => String(admin.id) === String(adminId)) || { id: adminId };
    if (
      LGA_JURISDICTION_ROLES.has(String(targetAdmin.user_type || '').toLowerCase()) &&
      !jurisdictionForm.city.trim()
    ) {
      Toast.show({
        type: 'error',
        text1: 'Local government is required for this LGA role',
      });
      return;
    }

    setOperationPrompt({
      type: 'update_jurisdiction',
      target: targetAdmin,
      jurisdiction: {
        state: jurisdictionForm.state.trim(),
        city: jurisdictionForm.city.trim(),
      },
    });
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
        <AppText style={styles.cardTitle}>Admin Management</AppText>
        <AppText style={styles.meta}>
          Manage admin accounts, impersonate admins, and edit jurisdictions.
        </AppText>
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
                <AppText style={styles.cardTitle}>{admin.full_name}</AppText>
                <AppText style={styles.meta}>{expandedAdminId === admin.id ? '▲' : '▼'}</AppText>
              </View>
            </TouchableOpacity>
            <AppText style={styles.meta}>Email: {admin.email}</AppText>
            {admin.assigned_state ? (
              <AppText style={styles.meta}>Jurisdiction: {admin.assigned_state}{admin.assigned_city ? ` - ${admin.assigned_city}` : ''}</AppText>
            ) : (
              <AppText style={styles.meta}>Jurisdiction: Not assigned</AppText>
            )}
            <AppText style={styles.meta}>
              Verified: {admin.credentials_verified_count ?? 0} users
            </AppText>
            {admin.last_verification_at ? (
              <AppText style={styles.meta}>
                Last activity: {new Date(admin.last_verification_at).toLocaleString()}
              </AppText>
            ) : null}

            <View style={styles.row}>
              <TouchableOpacity onPress={() => handleImpersonateAdmin(admin.id, admin.full_name)}>
                <AppText style={styles.linkText}>Impersonate</AppText>
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
                <AppText style={styles.linkText}>Edit Jurisdiction</AppText>
              </TouchableOpacity>
            </View>

            {expandedAdminId === admin.id && (
              <View style={styles.expandedSection}>
                <AppText style={styles.filterLabel}>State Users</AppText>
                {loadingStateUsers ? (
                  <AppText style={styles.meta}>Loading...</AppText>
                ) : adminStateUsers.length === 0 ? (
                  <AppText style={styles.meta}>No users in this admin's jurisdiction.</AppText>
                ) : (
                  adminStateUsers.map((user) => (
                    <View key={user.id} style={styles.listRow}>
                      <AppText style={styles.listTitle}>{user.full_name || user.name}</AppText>
                      <AppText style={styles.meta}>{user.email}</AppText>
                      <AppText style={styles.meta}>Role: {user.user_type}</AppText>
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
                  label={
                    LGA_JURISDICTION_ROLES.has(String(admin.user_type || '').toLowerCase())
                      ? 'Local government'
                      : 'City (optional)'
                  }
                  value={jurisdictionForm.city}
                  onChangeText={(v) => setJurisdictionForm((prev) => ({ ...prev, city: v }))}
                  placeholder="Enter city or LGA name"
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
        <AppText style={styles.cardTitle}>Pending Admin Approvals</AppText>
        <AppText style={styles.meta}>
          Review and approve/reject admin account requests.
        </AppText>
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
            <AppText style={styles.cardTitle}>{admin.full_name || admin.name || 'Unknown'}</AppText>
            <AppText style={styles.meta}>Email: {admin.email}</AppText>
            {admin.phone ? <AppText style={styles.meta}>Phone: {admin.phone}</AppText> : null}
            {admin.state_name || admin.state ? (
              <AppText style={styles.meta}>State: {admin.state_name || admin.state}</AppText>
            ) : null}
            {admin.city ? <AppText style={styles.meta}>City: {admin.city}</AppText> : null}
            {admin.role_requested ? (
              <AppText style={styles.meta}>Role requested: {admin.role_requested}</AppText>
            ) : null}
            {admin.created_at ? (
              <AppText style={styles.meta}>
                Requested: {new Date(admin.created_at).toLocaleDateString()}
              </AppText>
            ) : null}
            {admin.reason ? (
              <AppText style={styles.meta}>Reason: {admin.reason}</AppText>
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
                <AppText style={styles.linkText}>Approve</AppText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setOperationPrompt({ type: 'reject_admin', target: admin })}
              >
                <AppText style={styles.warnText}>Reject</AppText>
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
    moderation: renderModeration(),
    lawyer_invites: renderLawyerInvites(),
    analytics: renderStructuredAnalytics(),
    platform_lawyers: renderPlatformLawyers(),
    platform_agents: renderPlatformAgents(),
    lawyer_activity: renderLawyerActivity(),
    admin_management: renderAdminManagement(),
    pending_approvals: renderPendingApprovals(),
    property_requests: renderPropertyRequests(),
    pricing: renderPricing(),
    registration_access: renderRegistrationAccess(),
    properties: renderProperties(),
    reports: renderReports(),
    broadcasts: renderBroadcasts(),
    ad_spaces: renderAdSpaces(),
    flags: renderFlags(),
    sfa_permissions: renderSfaPermissions(),
    fraud: renderFraud(),
    logs: renderLogs(),
  }[section];
  const selectedSection = sectionOptions.find((item) => item.value === section);

  return (
    <TourScrollProvider controller={tourScroll}>
    <ScrollView
      ref={tourScroll.scrollRef}
      style={styles.screen}
      contentContainerStyle={styles.content}
      onScroll={tourScroll.onScroll}
      scrollEventThrottle={16}
    >
      <DashboardHero
        eyebrow="PLATFORM OPERATIONS"
        title="Super Admin"
        subtitle="Choose one focused workspace at a time. Data is loaded only when that workspace is opened."
        icon="shield-checkmark-outline"
        onRefresh={() => loadSection(section, true)}
        tourTarget="super_overview"
      />
      <AdminAccountActions navigation={navigation} />
      <ActionRow
        title={selectedSection?.label || 'Choose workspace'}
        subtitle="Tap to switch administrative workspace"
        icon="apps-outline"
        badge="Workspace"
        tourTarget="super_workspace"
        onPress={() => setShowSectionPicker(true)}
      />

      <TourTarget
        id={
          ['verifications', 'fraud'].includes(section)
            ? 'super_trust'
            : section === 'analytics'
              ? 'super_analytics'
              : undefined
        }
        label={selectedSection?.label}
        disabled={
          loading || !['verifications', 'fraud', 'analytics'].includes(section)
        }
      >
        <View style={styles.tourSectionAnchor}>
          <Icon name="sparkles-outline" size={18} color={colors.gold} />
          <AppText style={styles.tourSectionAnchorText}>
            {selectedSection?.label || 'Selected workspace'}
          </AppText>
        </View>
      </TourTarget>
      <View>
        {loading ? <AppText style={styles.meta}>Loading...</AppText> : renderedSection}
      </View>

      <OperationNoteModal
        visible={Boolean(operationPrompt)}
        title={
          operationPrompt?.type === 'ban_user'
            ? 'Ban user account'
            : operationPrompt?.type === 'update_jurisdiction'
              ? 'Update admin jurisdiction'
              : 'Reject admin request'
        }
        message={
          operationPrompt?.type === 'ban_user'
            ? `${operationPrompt?.target?.full_name || operationPrompt?.target?.email || 'This user'} will be blocked from accessing RentalHub.`
            : operationPrompt?.type === 'update_jurisdiction'
              ? `${operationPrompt?.target?.full_name || operationPrompt?.target?.email || 'This admin'} will be assigned to ${operationPrompt?.jurisdiction?.city ? `${operationPrompt.jurisdiction.city}, ` : ''}${operationPrompt?.jurisdiction?.state || 'the selected jurisdiction'}.`
              : `${operationPrompt?.target?.full_name || operationPrompt?.target?.email || 'This applicant'} will be rejected and the pending account removed.`
        }
        label={
          operationPrompt?.type === 'ban_user'
            ? 'Ban reason'
            : operationPrompt?.type === 'update_jurisdiction'
              ? 'Change reason'
              : 'Rejection reason'
        }
        placeholder={
          operationPrompt?.type === 'ban_user'
            ? 'Explain why this user must be banned'
            : operationPrompt?.type === 'update_jurisdiction'
              ? 'Explain why this jurisdiction is changing'
              : 'Explain why this admin request is rejected'
        }
        confirmText={
          operationPrompt?.type === 'ban_user'
            ? 'Ban user'
            : operationPrompt?.type === 'update_jurisdiction'
              ? 'Update jurisdiction'
              : 'Reject admin'
        }
        icon={
          operationPrompt?.type === 'ban_user'
            ? 'ban-outline'
            : operationPrompt?.type === 'update_jurisdiction'
              ? 'location-outline'
              : 'close-circle-outline'
        }
        variant={operationPrompt?.type === 'update_jurisdiction' ? 'primary' : 'danger'}
        loading={submitting}
        onCancel={() => setOperationPrompt(null)}
        onConfirm={submitOperationNote}
      />

      <OptionPickerModal
        visible={showSectionPicker}
        title="Choose workspace"
        options={sectionOptions}
        selectedValue={section}
        searchable
        searchPlaceholder="Search workspaces"
        onClose={() => setShowSectionPicker(false)}
        onSelect={(item) => {
          setSection(item.value);
          setShowSectionPicker(false);
        }}
      />

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
    </TourScrollProvider>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 24 },
  title: { fontFamily: typography.bold, fontSize: 32, color: colors.ink, marginBottom: 12 },
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
  sectionTitle: { fontFamily: typography.bold, fontSize: 18, color: colors.ink, marginBottom: 8 },
  meta: { marginTop: 4, color: '#475569' },
  tourSectionAnchor: {
    alignItems: 'center',
    backgroundColor: colors.navy,
    borderColor: colors.gold,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  tourSectionAnchorText: {
    color: colors.white,
    fontFamily: typography.semibold,
    fontSize: 14,
    marginLeft: 9,
  },
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
    fontFamily: typography.bold,
    color: '#0f172a',
  },
  analyticsLabel: {
    fontSize: 13,
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
    fontFamily: typography.bold,
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
  adPreview: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    marginTop: 10,
    padding: 12,
  },
  liveDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22c55e',
    marginLeft: 10,
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
