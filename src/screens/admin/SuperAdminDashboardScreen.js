import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import React, { useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Image, Modal, ScrollView, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';
import TextInput from '../../components/common/AppTextInput';
import Toast from 'react-native-toast-message';
import * as Notifications from 'expo-notifications';
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
import { notificationService } from '../../services/notificationService';
import { API_BASE_URL } from '../../services/api';
import { storageService } from '../../services/storageService';
import { getErrorMessage, pickList, pickObject } from '../../utils/http';
import { formatDisplayValue, isPlainTextValue } from '../../utils/display';
import FlagsSection from '../../components/admin/FlagsSection';
import RegistrationAccessSection from '../../components/admin/RegistrationAccessSection';
import TenancyWorkflowSection from '../../components/admin/TenancyWorkflowSection';
import PropertyRequestWorkflowSection from '../../components/admin/PropertyRequestWorkflowSection';
import {
  ActionRow,
  DashboardHero,
} from '../../components/dashboard/DashboardKit';
import WorkspaceBoard from '../../components/dashboard/WorkspaceBoard';
import { AuthContext } from '../../context/AuthContext';
import { colors, typography, radius, typeScale } from '../../theme';
import TourTarget from '../../components/tour/TourTarget';
import {
  TourScrollProvider,
  useTourScrollController,
} from '../../components/tour/TourScrollContext';
import { useAccessibilityPreferences } from '../../hooks/useAccessibilityPreferences';
import Icon from 'react-native-vector-icons/Ionicons';

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

// One home for every super-admin workspace, grouped by the job it belongs to.
// An item either switches an inline section (`section`) or opens a separate screen (`route`).
const WORKSPACE_GROUPS = [
  {
    get "title"() { return ui("People & Verification"); },
    icon: 'people-outline',
    items: [
      { get "label"() { return ui("Users"); }, section: 'users', icon: 'people-outline' },
      { get "label"() { return ui("Verifications"); }, section: 'verifications', icon: 'shield-checkmark-outline' },
      { get "label"() { return ui("Lawyer Invites"); }, section: 'lawyer_invites', icon: 'mail-outline' },
      { get "label"() { return ui("Admin Management"); }, section: 'admin_management', icon: 'construct-outline' },
      { get "label"() { return ui("Pending Approvals"); }, section: 'pending_approvals', icon: 'hourglass-outline' },
      { get "label"() { return ui("Assisted registration"); }, route: 'AssistedRegistration', icon: 'person-add-outline' },
      { get "label"() { return ui("Admin Accounts & Reminders"); }, route: 'AdminAccounts', icon: 'person-add-outline' },
    ],
  },
  {
    get "title"() { return ui("Properties & Trust"); },
    icon: 'home-outline',
    items: [
      { get "label"() { return ui("Properties"); }, section: 'properties', icon: 'home-outline' },
      { get "label"() { return ui("Property Requests"); }, section: 'property_requests', icon: 'document-text-outline' },
      { get "label"() { return ui("Moderation"); }, section: 'moderation', icon: 'shield-outline' },
      { get "label"() { return ui("Content Moderation"); }, route: 'ContentModeration', icon: 'images-outline' },
      { get "label"() { return ui("Ratings & Credentials"); }, route: 'ModerationHub', icon: 'star-outline' },
      { get "label"() { return ui("Reports"); }, section: 'reports', icon: 'flag-outline' },
      { get "label"() { return ui("Fraud"); }, section: 'fraud', icon: 'alert-circle-outline' },
    ],
  },
  {
    get "title"() { return ui("Money"); },
    icon: 'cash-outline',
    items: [
      { get "label"() { return ui("Pricing"); }, section: 'pricing', icon: 'pricetags-outline' },
      { get "label"() { return ui("Rent Savings Setup Fees"); }, route: 'RentSavingsSetupFees', icon: 'cash-outline' },
      { get "label"() { return ui("Rent Savings Withdrawals"); }, route: 'RentSavingsAdmin', icon: 'wallet-outline' },
      { get "label"() { return ui("Rent Calculator Fees"); }, route: 'RentCalculatorFeesAdmin', icon: 'calculator-outline' },
      { get "label"() { return ui("Agent Commissions"); }, route: 'AgentCommissionAdmin', icon: 'trending-up-outline' },
      { get "label"() { return ui("Registration Access"); }, section: 'registration_access', icon: 'key-outline' },
      { get "label"() { return ui("SFA Permissions"); }, section: 'sfa_permissions', icon: 'lock-open-outline' },
    ],
  },
  {
    get "title"() { return ui("Growth & Marketing"); },
    icon: 'trending-up-outline',
    items: [
      { get "label"() { return ui("Analytics"); }, section: 'analytics', icon: 'analytics-outline' },
      { get "label"() { return ui("Survey Analytics"); }, route: 'SurveyAnalytics', icon: 'clipboard-outline' },
      { get "label"() { return ui("Tour Analytics"); }, route: 'TourAnalytics', icon: 'map-outline' },
      { get "label"() { return ui("Email & SMS Marketing"); }, route: 'MarketingOps', icon: 'mail-outline' },
      { get "label"() { return ui("WhatsApp Marketing"); }, route: 'WhatsappMarketing', icon: 'logo-whatsapp' },
      { get "label"() { return ui("Campaign Builder"); }, route: 'MarketingBuilder', icon: 'megaphone-outline' },
      { get "label"() { return ui("Email Template Editor"); }, route: 'EmailTemplateEditor', icon: 'code-outline' },
      { get "label"() { return ui("SEO Tools"); }, route: 'SeoTools', icon: 'search-outline' },
      { get "label"() { return ui("Diaspora Desk"); }, route: 'DiasporaDesk', icon: 'globe-outline' },
      { get "label"() { return ui("Broadcasts"); }, section: 'broadcasts', icon: 'radio-outline' },
      { get "label"() { return ui("Ad Spaces"); }, section: 'ad_spaces', icon: 'image-outline' },
    ],
  },
  {
    get "title"() { return ui("Operations"); },
    icon: 'construct-outline',
    items: [
      { get "label"() { return ui("Fumigation Oversight"); }, route: 'SuperAdminFumigationDashboard', icon: 'sparkles-outline' },
      { get "label"() { return ui("Transport Oversight"); }, route: 'SuperAdminTransportationDashboard', icon: 'car-outline' },
      { get "label"() { return ui("Support Governance"); }, route: 'SuperAdminSupportGovernance', icon: 'headset-outline' },
      { get "label"() { return ui("Notifications"); }, route: 'Notifications', icon: 'notifications-outline' },
      { get "label"() { return ui("Appeals"); }, route: 'AdminAppeals', icon: 'git-compare-outline' },
      { get "label"() { return ui("Voice Monitor"); }, route: 'VoiceMonitor', icon: 'call-outline' },
      { get "label"() { return ui("Court Bundle"); }, route: 'CourtBundle', icon: 'briefcase-outline' },
      { get "label"() { return ui("State Admin Management"); }, route: 'FinanceStateAdmins', icon: 'business-outline' },
      { get "label"() { return ui("Service Bookings"); }, route: 'ServiceBookings', icon: 'calendar-outline' },
    ],
  },
  {
    get "title"() { return ui("Platform"); },
    icon: 'server-outline',
    items: [
      { get "label"() { return ui("Platform Lawyers"); }, section: 'platform_lawyers', icon: 'briefcase-outline' },
      { get "label"() { return ui("Platform Agents"); }, section: 'platform_agents', icon: 'people-circle-outline' },
      { get "label"() { return ui("Lawyer Activity"); }, section: 'lawyer_activity', icon: 'pulse-outline' },
      { get "label"() { return ui("Flags"); }, section: 'flags', icon: 'toggle-outline' },
      { get "label"() { return ui("Logs"); }, section: 'logs', icon: 'list-outline' },
    ],
  },
];

const sectionOptions = [
  { value: '__home', get "label"() { return ui("Home"); }, __header: true },
  { value: 'overview', get "label"() { return ui("Overview"); }, section: 'overview', icon: 'grid-outline' },
  ...WORKSPACE_GROUPS.flatMap((group) => [
    { value: `__header_${group.title}`, label: group.title, __header: true },
    ...group.items.map((item) => ({
      ...item,
      value: item.section || item.route,
      group: group.title,
    })),
  ]),
];

const normalizeRequestedSection = (value) => {
  const requested = String(value || '').trim().toLowerCase();
  const aliases = {
    broadcast: 'broadcasts',
    live_moderation: 'moderation',
  };
  const normalized = aliases[requested] || requested;
  return sections.includes(normalized) ? normalized : null;
};

// Analytics values can be numbers, arrays of rows (usersByRole, userGrowth,
// propertiesByState) or plain objects. Render arrays as labelled rows instead
// of the default "[object Object]" string coercion.
const formatAnalyticsValue = (value) => {
  if (typeof value === 'number') return value.toLocaleString();
  if (value === null || value === undefined) return '—';
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? '' : 's'}`;
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    return `${keys.length} field${keys.length === 1 ? '' : 's'}`;
  }
  return String(value);
};

const analyticsBreakdownRows = (value) => {
  if (!Array.isArray(value)) return [];
  return value.map((row, index) => {
    if (row && typeof row === 'object') {
      const rawLabel =
        row.role || row.state || row.month || row.label || row.name || row.key || `Row ${index + 1}`;
      const rawCount = row.count ?? row.users ?? row.total ?? row.value ?? row.amount ?? '';
      return {
        label: formatDisplayValue(rawLabel).replace(/_/g, ' '),
        count: isPlainTextValue(rawCount) ? rawCount : formatDisplayValue(rawCount),
      };
    }
    return { label: formatDisplayValue(row), count: '' };
  });
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
  { value: 'home_top', get "label"() { return ui("Home top banner"); } },
  { value: 'home_featured', get "label"() { return ui("Home featured section"); } },
  { value: 'dashboard_top', get "label"() { return ui("Dashboard top banner"); } },
  { value: 'dashboard_inline', get "label"() { return ui("Dashboard inline banner"); } },
  { value: 'properties_top', get "label"() { return ui("Properties top banner"); } },
  { value: 'properties_inline', get "label"() { return ui("Properties inline banner"); } },
];

const defaultAdSpaceForm = {
  placement: 'home_top',
  title: '',
  description: '',
  sponsor_name: '',
  image_url: '',
  target_url: '',
  get "cta_label"() { return ui("Learn more"); },
  background_color: '#ffffff',
  text_color: '#111827',
  is_active: true,
  sort_order: '0',
  starts_at: '',
  ends_at: '',
};

const FilterChip = ({ label, active, onPress }) => { useInterfaceLanguage(); return (<TouchableOpacity style={[styles.filterChip, active && styles.filterChipActive]} onPress={onPress}>
    <AppText style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</AppText>
  </TouchableOpacity>); };

const SuperAdminDashboardScreen = ({ navigation, route }) => {
  useInterfaceLanguage();
  const { beginImpersonation } = useContext(AuthContext);
  const { reduceMotion } = useAccessibilityPreferences();
  const tourScroll = useTourScrollController({ animated: !reduceMotion });
  const [section, setSection] = useState(
    () => normalizeRequestedSection(route?.params?.initialPanel) || 'overview'
  );
  // Switching workspaces stays inside this screen, so the navigator has no back
  // entry to offer. Put a real top-left back arrow in the header instead.
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft:
        section === 'overview'
          ? undefined
          : () => (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={ui("Back to overview")}
                activeOpacity={0.7}
                onPress={() => setSection('overview')}
                style={styles.headerBack}
              >
                <Icon name="arrow-back" size={22} color={colors.navy} />
              </TouchableOpacity>
            ),
    });
  }, [navigation, section]);

  const [showSectionPicker, setShowSectionPicker] = useState(false);
  const loadedSections = useRef(new Set());
  const [analytics, setAnalytics] = useState({});
  const [users, setUsers] = useState([]);
  const [verifications, setVerifications] = useState([]);
  const [passportPreview, setPassportPreview] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
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
    status: 'all',
    user_type: 'all',
  });
  const [availableUserTypes, setAvailableUserTypes] = useState([]);
  const [logSearch, setLogSearch] = useState('');
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

  useLayoutEffect(() => {
    navigation.setOptions({ headerRight: () => (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={ui("Notifications{value0}", {value0: (unreadCount ? `, ${unreadCount} unread` : '')})}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Notifications')}
            style={styles.headerBell}
          >
            <Icon name="notifications-outline" size={20} color={colors.white} />
            {unreadCount > 0 ? (
              <View style={styles.headerBellBadge}>
                <AppText style={styles.headerBellBadgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </AppText>
              </View>
            ) : null}
          </TouchableOpacity>
    ) });
    return () => navigation.setOptions({ headerRight: undefined });
  }, [navigation, unreadCount]);

  const loadUnreadCount = async () => {
    try {
      const response = await notificationService.getUnreadActivity();
      setUnreadCount(Number(response?.data?.total || 0));
    } catch (error) {
      // keep the previous count
    }
  };

  useEffect(() => {
    loadUnreadCount();
    const focusSub = navigation.addListener('focus', loadUnreadCount);
    const receivedSub = Notifications.addNotificationReceivedListener(() => {
      loadUnreadCount();
    });
    return () => {
      focusSub();
      receivedSub.remove();
    };
  }, [navigation]);
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
    setAvailableUserTypes(
      Array.isArray(verificationsResponse?.available_user_types)
        ? verificationsResponse.available_user_types.map((row) => row.role).filter(Boolean)
        : []
    );
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
        text1: ui("Failed"),
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
        text1: ui("Failed"),
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
        text1: ui("Failed"),
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
        text1: ui("Failed"),
        text2: getErrorMessage(error, ui("Action failed")),
      });
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  // Many super-admin actions require a written reason for the audit trail. Every one
  // of them opens this prompt and receives the note in its `run` callback.
  const openOperationPrompt = (config) => {
    setOperationPrompt({
      variant: 'primary',
      label: ui("Reason"),
      confirmText: ui("Confirm action"),
      icon: 'document-text-outline',
      ...config,
    });
  };

  const submitOperationNote = async (note) => {
    if (!operationPrompt?.run) return;

    const succeeded = await runAction(
      () => operationPrompt.run(note),
      operationPrompt.successMessage || 'Action completed',
      operationPrompt.reload
    );

    if (succeeded) setOperationPrompt(null);
  };

  const resetPricingForm = () => {
    setEditingPricingRuleId(null);
    setPricingForm(defaultPricingForm);
  };

  const handleSavePricingRule = async () => {
    if (!pricingForm.state_id) {
      Toast.show({ type: 'error', text1: ui("Select a state") });
      return;
    }

    if (!pricingForm.amount) {
      Toast.show({ type: 'error', text1: ui("Enter the amount to charge") });
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
    cta_label: form.cta_label.trim() || ui("Learn more"),
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
      cta_label: ad.cta_label || ui("Learn more"),
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
      Toast.show({ type: 'error', text1: ui("Ad title is required") });
      return;
    }

    if (!adSpaceForm.target_url.trim()) {
      Toast.show({ type: 'error', text1: ui("Target URL is required") });
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
    Alert.alert(ui("Delete ad space"), ui("Delete this ad space permanently?"), [
      { text: ui("Cancel"), style: 'cancel' },
      {
        text: ui("Delete"),
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

  // Workspace items are either an inline section or a separate screen.
  const openWorkspace = (item) => {
    if (!item) return;
    if (item.section) {
      setSection(item.section);
      return;
    }
    if (item.route) {
      navigation.navigate(item.route);
    }
  };

  const overviewGroups = useMemo(
    () =>
      WORKSPACE_GROUPS.map((group) => ({
        ...group,
        items: group.items.map((item) => ({
          ...item,
          onPress: () => openWorkspace(item),
        })),
      })),
    []
  );

  const renderOverview = () => {
    const analyticEntries = Object.entries(analytics);

    // Responsive summary cards. Values come from the existing super-admin
    // analytics API; each card opens its existing section.
    const summaryCards = [
      {
        key: 'properties',
        label: ui("Total Properties"),
        icon: 'home-outline',
        section: 'properties',
        value: Number(analytics.totalProperties ?? properties.length) || 0,
      },
      {
        key: 'applications',
        label: ui("Applications"),
        icon: 'documents-outline',
        section: 'property_requests',
        value: Number(analytics.totalApplications ?? 0) || 0,
      },
      {
        key: 'verified',
        label: ui("Verified Users"),
        icon: 'shield-checkmark-outline',
        section: 'verifications',
        value: Number(analytics.verifiedUsers ?? 0) || 0,
      },
      {
        key: 'notifications',
        label: ui("Notifications"),
        icon: 'notifications-outline',
        route: 'Notifications',
        value: unreadCount,
        badge: true,
      },
    ];

    return (
      <View>
        <View style={styles.card}>
          <AppText style={styles.cardTitle}>{ui("Analytics Overview")}</AppText>
          <AppText style={styles.meta}>{ui("Quick platform statistics at a glance. Use the Analytics tab for detailed metrics.")}</AppText>
        </View>

        <View style={styles.summaryGrid}>
          {summaryCards.map((card) => (
            <TouchableOpacity
              key={card.key}
              accessibilityRole="button"
              accessibilityLabel={ui("{value0}: {value1}", {value0: (card.label), value1: (card.value.toLocaleString())})}
              activeOpacity={0.85}
              onPress={() =>
                card.section
                  ? setSection(card.section)
                  : card.route
                    ? navigation.navigate(card.route)
                    : null
              }
              style={styles.summaryCard}
            >
              <View style={styles.summaryCardTop}>
                <AppText style={styles.summaryCardLabel}>{card.label}</AppText>
                <View>
                  <Icon name={card.icon} size={20} color={colors.blue} />
                  {card.badge && Number(card.value) > 0 ? (
                    <View style={styles.summaryBadge}>
                      <AppText style={styles.summaryBadgeText}>
                        {Number(card.value) > 99 ? '99+' : card.value}
                      </AppText>
                    </View>
                  ) : null}
                </View>
              </View>
              <AppText style={styles.summaryCardValue}>{card.value.toLocaleString()}</AppText>
              <AppText style={styles.summaryCardHint}>{ui("Tap to view →")}</AppText>
            </TouchableOpacity>
          ))}
        </View>

        <WorkspaceBoard groups={overviewGroups} collapsible visibleGroups={1} />

        {analyticEntries.length === 0 ? (
          <EmptyState
            icon="stats-chart-outline"
            title={ui("No analytics data")}
            message={ui("Data will populate once users interact with the platform.")}
          />
        ) : (
          <View style={styles.analyticsGrid}>
            {analyticEntries.map(([key, value]) => {
              const rows = analyticsBreakdownRows(value);
              const isBreakdown = rows.length > 0;
              return (
                <View
                  key={key}
                  style={[styles.analyticsCard, isBreakdown ? styles.analyticsCardWide : null]}
                >
                  <AppText style={styles.analyticsLabel}>
                    {key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </AppText>
                  {isBreakdown ? (
                    rows.slice(0, 12).map((row) => (
                      <View key={`${key}-${row.label}`} style={styles.breakdownRow}>
                        <AppText style={styles.breakdownLabel} numberOfLines={1}>{row.label}</AppText>
                        <AppText style={styles.breakdownValue}>
                          {typeof row.count === 'number' ? row.count.toLocaleString() : row.count}
                        </AppText>
                      </View>
                    ))
                  ) : (
                    <AppText style={styles.analyticsValue}>{formatAnalyticsValue(value)}</AppText>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {users.length > 0 && (
          <View style={styles.card}>
            <AppText style={styles.cardTitle}>{ui("Quick Stats")}</AppText>
            <AppText style={styles.meta}>{ui("Total Users: ")}{users.length}</AppText>
            <AppText style={styles.meta}>{ui("Total Properties: ")}{properties.length}</AppText>
            <AppText style={styles.meta}>{ui("Total Reports: ")}{reports.length}</AppText>
            <AppText style={styles.meta}>{ui("Active Lawyers: ")}{platformLawyers.length}</AppText>
            <AppText style={styles.meta}>{ui("Pending Admins: ")}{pendingAdmins.length}</AppText>
          </View>
        )}

        <TenancyWorkflowSection title={ui("National Tenancy Grace and Refund Enablement")} />
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
      Toast.show({ type: 'error', text1: ui("Select at least one user") });
      return;
    }
    if (!bulkAction) {
      Toast.show({ type: 'error', text1: ui("Select a bulk action") });
      return;
    }
    const bulkUserCount = selectedUserIds.length;
    openOperationPrompt({
      type: 'bulk_users',
      target: { id: 'bulk-users' },
      title: ui("Bulk {value0} users", {value0: (bulkAction)}),
      message: ui("{value0} will be applied to {value1} selected user{value2}.", {value0: (bulkAction), value1: (bulkUserCount), value2: (bulkUserCount === 1 ? '' : ui("s"))}),
      label: ui("Reason"),
      placeholder: ui("Explain why this bulk action is needed"),
      confirmText: ui("Apply to {value0}", {value0: (bulkUserCount)}),
      icon: 'people-outline',
      variant: bulkAction === 'ban' || bulkAction === 'delete' ? 'danger' : 'primary',
      successMessage: ui("Bulk action \"{value0}\" completed on {value1} users", {value0: (bulkAction), value1: (bulkUserCount)}),
      run: async (note) => {
        await superAdminService.bulkUserAction(selectedUserIds, bulkAction, note);
        setSelectedUserIds([]);
        setBulkAction('');
      },
    });
  };

  const renderUsers = () => (
    <>
      <View style={styles.card}>
        <AppText style={styles.cardTitle}>{ui("Users (")}{users.length})</AppText>
        <AppText style={styles.meta}>{ui("Select multiple users for bulk actions (ban, unban, promote, delete).")}</AppText>
        {selectedUserIds.length > 0 && (
          <View style={styles.bulkActions}>
            <AppText style={styles.filterLabel}>{selectedUserIds.length}{ui(" selected")}</AppText>
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
                title={ui("Apply to {value0}", {value0: (selectedUserIds.length)})}
                onPress={handleBulkUserAction}
                loading={submitting}
                size="sm"
              />
              <TouchableOpacity onPress={() => setSelectedUserIds([])}>
                <AppText style={styles.warnText}>{ui("Clear Selection")}</AppText>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {users.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title={ui("No users")}
          message={ui("Registered users will appear here.")}
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
            <AppText style={styles.meta}>{ui("Role: ")}{item.user_type}</AppText>
            {item.state_name ? <AppText style={styles.meta}>{ui("State: ")}{item.state_name}</AppText> : null}
            {item.is_banned !== undefined && <StatusBadge status={item.is_banned ? 'banned' : 'active'} />}
            <View style={styles.row}>
              {item.is_banned ? (
                <TouchableOpacity onPress={() => runAction(() => superAdminService.unbanUser(item.id), 'User unbanned')}>
                  <AppText style={styles.linkText}>{ui("Unban")}</AppText>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() =>
                    openOperationPrompt({
                      type: 'ban_user',
                      target: item,
                      title: ui("Ban user account"),
                      message: ui("{value0} will be blocked from accessing RentalHub.", {value0: (item.full_name || item.email || 'This user')}),
                      label: ui("Ban reason"),
                      placeholder: ui("Explain why this user must be banned"),
                      confirmText: ui("Ban user"),
                      icon: 'ban-outline',
                      variant: 'danger',
                      successMessage: ui("User banned"),
                      run: (note) => superAdminService.banUser(item.id, note),
                    })
                  }
                >
                  <AppText style={styles.warnText}>{ui("Ban")}</AppText>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => runAction(() => superAdminService.promoteUser(item.id), 'User promoted')}>
                <AppText style={styles.linkText}>{ui("Promote")}</AppText>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => runAction(() => superAdminService.deleteUser(item.id), 'User deleted')}>
                <AppText style={styles.warnText}>{ui("Delete")}</AppText>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </>
  );

  const openPassportPhoto = async (item) => {
    const filename = String(item.passport_photo_url || '')
      .replace(/\\/g, '/')
      .split('/')
      .pop();
    if (!filename) return;
    try {
      const token = await storageService.getToken();
      setPassportPreview({
        uri: `${API_BASE_URL}/users/passport-photo/${encodeURIComponent(filename)}`,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        name: item.full_name || item.email || 'User',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: ui("Could not open passport photo"),
        text2: getErrorMessage(error, ui("Please try again.")),
      });
    }
  };

  const renderVerifications = () => (
    <>
      <View style={styles.card}>
        <AppText style={styles.cardTitle}>{ui("Verification Filters")}</AppText>
        <Input
          label={ui("Search")}
          value={verificationFilters.search}
          onChangeText={(value) =>
            setVerificationFilters((prev) => ({ ...prev, search: value }))
          }
          placeholder={ui("Name, email, NIN, passport")}
        />
        <AppText style={styles.filterLabel}>{ui("Status")}</AppText>
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

        <AppText style={styles.filterLabel}>{ui("Role")}</AppText>
        <View style={styles.filtersRow}>
          {[
            'all',
            ...(availableUserTypes.length
              ? availableUserTypes
              : ['tenant', 'landlord', 'agent', 'lawyer']),
          ].map((value) => (
            <FilterChip
              key={value}
              label={value.replace(/_/g, ' ')}
              active={verificationFilters.user_type === value}
              onPress={() =>
                setVerificationFilters((prev) => ({ ...prev, user_type: value }))
              }
            />
          ))}
        </View>

        <Button
          title={ui("Apply Filters")}
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
            <AppText style={styles.meta}>{ui("Role: ")}{item.user_type}</AppText>
            <AppText style={styles.meta}>{ui("Document: ")}{item.identity_document_type || ui("nin")}</AppText>
            <AppText style={styles.meta}>{ui("Number: ")}{documentNumber || '-'}</AppText>
            <AppText style={styles.meta}>{ui("Status: ")}{reviewStatus}</AppText>
            <AppText style={styles.meta}>{ui("Verified By: ")}{item.identity_verified_by_name || '-'}</AppText>
            {item.passport_photo_url ? (
              <TouchableOpacity
                onPress={() => openPassportPhoto(item)}
              >
                <AppText style={styles.linkText}>{ui("Open passport photo")}</AppText>
              </TouchableOpacity>
            ) : null}
            <View style={styles.row}>
              {(reviewStatus === "pending" || reviewStatus === "rejected") ? (
                <TouchableOpacity
                  onPress={() =>
                    runAction(
                      () => superAdminService.approveVerification(item.id),
                      'Verification approved'
                    )
                  }
                >
                  <AppText style={styles.linkText}>{ui("Approve")}</AppText>
                </TouchableOpacity>
              ) : null}
              {reviewStatus === "pending" ? (
                <TouchableOpacity
                  onPress={() =>
                    openOperationPrompt({
                      type: 'reject_verification',
                      target: item,
                      title: ui("Reject verification"),
                      message: ui("{value0}'s identity verification will be rejected.", {value0: (item.full_name || item.email || 'This user')}),
                      label: ui("Rejection reason"),
                      placeholder: ui("Explain why this verification is rejected"),
                      confirmText: ui("Reject verification"),
                      icon: 'close-circle-outline',
                      variant: 'danger',
                      successMessage: ui("Verification rejected"),
                      run: (note) => superAdminService.rejectVerification(item.id, note),
                    })
                  }
                >
                  <AppText style={styles.warnText}>{ui("Reject")}</AppText>
                </TouchableOpacity>
              ) : null}
              {reviewStatus === "rejected" ? (
                <TouchableOpacity
                  onPress={() =>
                    openOperationPrompt({
                      type: 'delete_verification',
                      target: item,
                      title: ui("Delete rejected verification"),
                      message: ui("{value0}'s rejected verification will be removed.", {value0: (item.full_name || item.email || 'This record')}),
                      label: ui("Delete reason"),
                      placeholder: ui("Explain why this record is being deleted"),
                      confirmText: ui("Delete record"),
                      icon: 'trash-outline',
                      variant: 'danger',
                      successMessage: ui("Rejected verification deleted"),
                      run: (note) =>
                        superAdminService.deleteRejectedVerification(item.id, note),
                    })
                  }
                >
                  <AppText style={styles.warnText}>{ui("Delete")}</AppText>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        );
      })}

      {verifications.length === 0 ? (
        <EmptyState
          icon="shield-checkmark-outline"
          title={ui("No verifications found")}
          message={ui("No users match these filters. Try a different status or role.")}
        />
      ) : null}

      <View style={styles.card}>
        <AppText style={styles.cardTitle}>{ui("Admin Verification Performance")}</AppText>
        {adminPerformance.length === 0 ? (
          <AppText style={styles.meta}>{ui("No admin verification activity yet.")}</AppText>
        ) : (
          adminPerformance.map((item) => (
            <View key={item.id} style={styles.listRow}>
              <AppText style={styles.listTitle}>{item.full_name}</AppText>
              <AppText style={styles.meta}>{item.email}</AppText>
              <AppText style={styles.meta}>{ui("Verified: ")}{item.credentials_verified_count ?? 0}</AppText>
              <AppText style={styles.meta}>{ui("Last activity:")}{' '}
                {item.last_verification_at
                  ? new Date(item.last_verification_at).toLocaleString()
                  : 'No activity'}
              </AppText>
            </View>
          ))
        )}
      </View>

      <Modal
        visible={Boolean(passportPreview)}
        transparent
        animationType="fade"
        onRequestClose={() => setPassportPreview(null)}
      >
        <View style={styles.photoModalOverlay}>
          <View style={styles.photoModalCard}>
            <View style={styles.photoModalHeader}>
              <AppText style={styles.photoModalTitle}>
                {passportPreview?.name || 'Passport photo'}
              </AppText>
              <TouchableOpacity onPress={() => setPassportPreview(null)}>
                <Icon name="close" size={24} color={colors.ink} />
              </TouchableOpacity>
            </View>
            {passportPreview ? (
              <Image
                source={{ uri: passportPreview.uri, headers: passportPreview.headers }}
                resizeMode="contain"
                style={styles.photoModalImage}
              />
            ) : null}
          </View>
        </View>
      </Modal>
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
        <AppText style={styles.cardTitle}>{ui("Lawyer Invite Search")}</AppText>
        <Input
          label={ui("Search")}
          value={lawyerInviteSearch}
          onChangeText={setLawyerInviteSearch}
          placeholder={ui("Client or lawyer email")}
        />
        <Button
          title={ui("Apply Search")}
          onPress={() => runAction(() => loadLawyerInvites(), 'Lawyer invites refreshed', null)}
        />
      </View>

      {lawyerInvites.length === 0 ? (
        <View style={styles.card}>
          <AppText style={styles.meta}>{ui("No lawyer invites found.")}</AppText>
        </View>
      ) : null}

      {lawyerInvites.map((invite) => (
        <View key={invite.id} style={styles.card}>
          <AppText style={styles.cardTitle}>{invite.client_name}</AppText>
          <AppText style={styles.meta}>{ui("Assigned By: ")}{invite.assigned_by_name || invite.client_name || '-'}</AppText>
          <AppText style={styles.meta}>{ui("Role: ")}{invite.client_role}</AppText>
          <AppText style={styles.meta}>{ui("Lawyer Email: ")}{invite.lawyer_email}</AppText>
          <AppText style={styles.meta}>{ui("Status: ")}{getInviteStatusLabel(invite)}</AppText>
          <AppText style={styles.meta}>{ui("Expires:")}{' '}
            {invite.expires_at ? new Date(invite.expires_at).toLocaleString() : '-'}
          </AppText>
          <AppText style={styles.meta}>{ui("Last Sent:")}{' '}
            {invite.last_sent_at ? new Date(invite.last_sent_at).toLocaleString() : '-'}
          </AppText>
          <AppText style={styles.meta}>{ui("Resends: ")}{invite.resent_count ?? 0}</AppText>

          {editingInviteId === invite.id ? (
            <>
              <Input
                label={ui("New Lawyer Email")}
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
                  <AppText style={styles.linkText}>{ui("Save Email")}</AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setEditingInviteId(null);
                    setEditingInviteEmail('');
                  }}
                >
                  <AppText style={styles.warnText}>{ui("Cancel")}</AppText>
                </TouchableOpacity>
              </View>
            </>
          ) : null}

          {invite.status !== "accepted" ? (
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
                <AppText style={styles.linkText}>{ui("Resend Invite")}</AppText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setEditingInviteId(invite.id);
                  setEditingInviteEmail(invite.lawyer_email || '');
                }}
              >
                <AppText style={styles.linkText}>{ui("Change Email")}</AppText>
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
        <AppText style={styles.cardTitle}>{ui("Location Pricing Rules")}</AppText>
        <AppText style={styles.meta}>{ui("Configure final amounts by state or local government area. LGA rules override state rules.")}</AppText>
        <View style={styles.targetGrid}>
          {pricingTargets.map((target) => (
            <View key={target.key} style={styles.targetCard}>
              <AppText style={styles.listTitle}>{target.label}</AppText>
              <AppText style={styles.meta}>{ui("Base fee: ₦")}{Number(target.base_amount || 0).toLocaleString()}
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
          label={ui("Amount (NGN)")}
          value={pricingForm.amount}
          onChangeText={(value) => setPricingForm((prev) => ({ ...prev, amount: value }))}
          keyboardType="numeric"
          placeholder={ui("Enter final amount")}
        />

        <SelectField
          label={ui("State")}
          value={selectedPricingState?.state_name}
          placeholder={ui("Select state")}
          onPress={() => setShowPricingStatePicker(true)}
        />

        <SelectField
          label={ui("Local Government Area")}
          value={pricingForm.lga_name}
          placeholder={selectedPricingState ? 'Whole state or choose LGA' : 'Choose state first'}
          onPress={() => setShowPricingLgaPicker(true)}
          disabled={!selectedPricingState}
          helperText={ui("Leave empty to apply the amount to the whole state.")}
        />

        <View style={styles.switchRow}>
          <AppText style={styles.meta}>{ui("Rule is active")}</AppText>
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
            title={ui("Cancel Edit")}
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
            <AppText style={styles.meta}>{ui("State: ")}{rule.state_name}</AppText>
            <AppText style={styles.meta}>{ui("LGA: ")}{rule.lga_name || 'Whole state'}</AppText>
            <AppText style={styles.meta}>{ui("Amount: ₦")}{Number(rule.amount || 0).toLocaleString()}
            </AppText>
            <AppText style={styles.meta}>{ui("Status: ")}{rule.is_active ? ui("Active") : ui("Inactive")}</AppText>
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
                <AppText style={styles.linkText}>{ui("Edit")}</AppText>
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
                <AppText style={styles.linkText}>{rule.is_active ? 'Disable' : ui("Enable")}</AppText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  runAction(
                    () => superAdminService.deletePricingRule(rule.id),
                    'Pricing rule deleted'
                  )
                }
              >
                <AppText style={styles.warnText}>{ui("Delete")}</AppText>
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
      Toast.show({ type: 'error', text1: ui("Select at least one property") });
      return;
    }
    if (!bulkAction) {
      Toast.show({ type: 'error', text1: ui("Select a bulk action") });
      return;
    }
    const bulkPropertyCount = selectedPropertyIds.length;
    openOperationPrompt({
      type: 'bulk_properties',
      target: { id: 'bulk-properties' },
      title: ui("Bulk {value0} properties", {value0: (bulkAction)}),
      message: ui("{value0} will be applied to {value1} selected propert{value2}.", {value0: (bulkAction), value1: (bulkPropertyCount), value2: (bulkPropertyCount === 1 ? 'y' : 'ies')}),
      label: ui("Reason"),
      placeholder: ui("Explain why this bulk action is needed"),
      confirmText: ui("Apply to {value0}", {value0: (bulkPropertyCount)}),
      icon: 'home-outline',
      variant: 'danger',
      successMessage: ui("Bulk action \"{value0}\" completed on {value1} properties", {value0: (bulkAction), value1: (bulkPropertyCount)}),
      run: async (note) => {
        await superAdminService.bulkPropertyAction(selectedPropertyIds, bulkAction, note);
        setSelectedPropertyIds([]);
        setBulkAction('');
      },
    });
  };

  const renderProperties = () => (
    <>
      <View style={styles.card}>
        <AppText style={styles.cardTitle}>{ui("Properties (")}{properties.length})</AppText>
        <AppText style={styles.meta}>{ui("Select multiple properties for bulk actions, or manage individually below.")}</AppText>
        {selectedPropertyIds.length > 0 && (
          <View style={styles.bulkActions}>
            <AppText style={styles.filterLabel}>{selectedPropertyIds.length}{ui(" selected")}</AppText>
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
                title={ui("Apply to {value0}", {value0: (selectedPropertyIds.length)})}
                onPress={handleBulkPropertyAction}
                loading={submitting}
                size="sm"
              />
              <TouchableOpacity onPress={() => setSelectedPropertyIds([])}>
                <AppText style={styles.warnText}>{ui("Clear Selection")}</AppText>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {properties.length === 0 ? (
        <EmptyState
          icon="home-outline"
          title={ui("No properties")}
          message={ui("Properties will appear here once listed.")}
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
            {item.state_name ? <AppText style={styles.meta}>{ui("State: ")}{item.state_name}</AppText> : null}
            {item.city ? <AppText style={styles.meta}>{ui("City: ")}{item.city}</AppText> : null}
            {item.price ? <AppText style={styles.meta}>{ui("Price: ₦")}{Number(item.price).toLocaleString()}</AppText> : null}
            <StatusBadge status={item.status || 'active'} />
            <View style={styles.row}>
              <TouchableOpacity
                onPress={() =>
                  openOperationPrompt({
                    type: 'unlist_property',
                    target: item,
                    title: ui("Unlist property"),
                    message: ui("{value0} will be hidden from listings.", {value0: (item.title || 'This property')}),
                    label: ui("Unlist reason"),
                    placeholder: ui("Explain why this property is being unlisted"),
                    confirmText: ui("Unlist property"),
                    icon: 'eye-off-outline',
                    variant: 'danger',
                    successMessage: ui("Property unlisted"),
                    run: (note) => superAdminService.unlistProperty(item.id, note),
                  })
                }
              >
                <AppText style={styles.warnText}>{ui("Unlist")}</AppText>
              </TouchableOpacity>
              {item.is_featured ? (
                <TouchableOpacity
                  onPress={() =>
                    openOperationPrompt({
                      type: 'unfeature_property',
                      target: item,
                      title: ui("Remove from featured"),
                      message: ui("{value0} will no longer be featured.", {value0: (item.title || 'This property')}),
                      label: ui("Unfeature reason"),
                      placeholder: ui("Explain why this property is being unfeatured"),
                      confirmText: ui("Unfeature property"),
                      icon: 'star-outline',
                      variant: 'danger',
                      successMessage: ui("Property unfeatured"),
                      run: (note) => superAdminService.unfeatureProperty(item.id, note),
                    })
                  }
                >
                  <AppText style={styles.linkText}>{ui("Unfeature")}</AppText>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() =>
                    openOperationPrompt({
                      type: 'feature_property',
                      target: item,
                      title: ui("Feature property"),
                      message: ui("{value0} will be highlighted as featured.", {value0: (item.title || 'This property')}),
                      label: ui("Feature reason"),
                      placeholder: ui("Explain why this property should be featured"),
                      confirmText: ui("Feature property"),
                      icon: 'star-outline',
                      successMessage: ui("Property featured"),
                      run: (note) => superAdminService.featureProperty(item.id, note),
                    })
                  }
                >
                  <AppText style={styles.linkText}>{ui("Feature")}</AppText>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))
      )}
    </>
  );

  const handleUpdateReportStatus = async (reportId, status) => {
    const applyStatus = async (note) => {
      await superAdminService.updateReportStatus(reportId, status, note);
      setReportStatusTargets((prev) => {
        const updated = { ...prev };
        delete updated[reportId];
        return updated;
      });
    };

    // The backend only demands an investigation note for closing statuses.
    if (status !== 'resolved' && status !== 'dismissed') {
      await runAction(() => applyStatus(''), `Report status changed to ${status}`);
      return;
    }

    openOperationPrompt({
      type: 'report_status',
      target: { id: reportId },
      title: ui("Mark report {value0}", {value0: (status)}),
      message: ui("This report will be marked as {value0}.", {value0: (status)}),
      label: ui("Investigation note"),
      placeholder: ui("Summarise what the investigation found"),
      confirmText: ui("Mark {value0}", {value0: (status)}),
      icon: 'document-text-outline',
      variant: status === 'dismissed' ? 'danger' : 'primary',
      successMessage: ui("Report status changed to {value0}", {value0: (status)}),
      run: (note) => applyStatus(note),
    });
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
              <AppText style={styles.cardTitle}>{ui("Live Moderation Queue")}</AppText>
              <AppText style={styles.meta}>{ui("Review identity checks, user reports, and fraud flags from one native screen.")}</AppText>
            </View>
            <View style={styles.liveDot} />
          </View>
          <View style={styles.analyticsGrid}>
            <View style={styles.analyticsCard}>
              <AppText style={styles.analyticsValue}>{pendingVerifications.length}</AppText>
              <AppText style={styles.analyticsLabel}>{ui("Verifications")}</AppText>
            </View>
            <View style={styles.analyticsCard}>
              <AppText style={styles.analyticsValue}>{openReports.length}</AppText>
              <AppText style={styles.analyticsLabel}>{ui("Reports")}</AppText>
            </View>
            <View style={styles.analyticsCard}>
              <AppText style={styles.analyticsValue}>{openFraud.length}</AppText>
              <AppText style={styles.analyticsLabel}>{ui("Fraud Flags")}</AppText>
            </View>
          </View>
          <Button
            title={ui("Refresh Moderation")}
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

        <AppText style={styles.sectionTitle}>{ui("Pending Verifications")}</AppText>
        {pendingVerifications.length === 0 ? (
          <AppText style={styles.meta}>{ui("No pending identity verifications.")}</AppText>
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
                  <AppText style={styles.linkText}>{ui("Approve")}</AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    openOperationPrompt({
                      type: 'reject_verification',
                      target: item,
                      title: ui("Reject verification"),
                      message: ui("{value0}'s identity verification will be rejected.", {value0: (item.full_name || item.email || 'This user')}),
                      label: ui("Rejection reason"),
                      placeholder: ui("Explain why this verification is rejected"),
                      confirmText: ui("Reject verification"),
                      icon: 'close-circle-outline',
                      variant: 'danger',
                      successMessage: ui("Verification rejected"),
                      run: (note) => superAdminService.rejectVerification(item.id, note),
                    })
                  }
                >
                  <AppText style={styles.warnText}>{ui("Reject")}</AppText>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <AppText style={styles.sectionTitle}>{ui("Open Reports")}</AppText>
        {openReports.length === 0 ? (
          <AppText style={styles.meta}>{ui("No open reports.")}</AppText>
        ) : (
          openReports.slice(0, 6).map((item) => (
            <View key={`report-${item.id}`} style={styles.card}>
              <AppText style={styles.cardTitle}>{item.reason || item.report_reason || ui("Report #{value0}", {value0: (item.id)})}</AppText>
              <StatusBadge status={item.status || 'open'} />
              <TouchableOpacity
                onPress={() =>
                  openOperationPrompt({
                    type: 'resolve_report',
                    target: item,
                    title: ui("Resolve report"),
                    message: ui("{value0} will be marked resolved.", {value0: (item.reason || item.report_reason || ui("Report #{value0}", {value0: (item.id)}))}),
                    label: ui("Investigation note"),
                    placeholder: ui("Summarise what the investigation found"),
                    confirmText: ui("Resolve report"),
                    icon: 'checkmark-circle-outline',
                    successMessage: ui("Report resolved"),
                    run: (note) => superAdminService.resolveReport(item.id, note),
                  })
                }
              >
                <AppText style={styles.linkText}>{ui("Resolve")}</AppText>
              </TouchableOpacity>
            </View>
          ))
        )}

        <AppText style={styles.sectionTitle}>{ui("Fraud Flags")}</AppText>
        {openFraud.length === 0 ? (
          <AppText style={styles.meta}>{ui("No open fraud flags.")}</AppText>
        ) : (
          openFraud.slice(0, 6).map((item) => (
            <View key={`fraud-${item.id}`} style={styles.card}>
              <AppText style={styles.cardTitle}>{item.rule || 'Fraud flag'}</AppText>
              <AppText style={styles.meta}>{ui("Score: ")}{item.score ?? '-'}</AppText>
              <TouchableOpacity
                onPress={() =>
                  openOperationPrompt({
                    type: 'resolve_fraud',
                    target: item,
                    title: ui("Resolve fraud flag"),
                    message: ui("{value0} will be marked resolved.", {value0: (item.rule || 'This fraud flag')}),
                    label: ui("Resolution note"),
                    placeholder: ui("Explain how this flag was investigated and resolved"),
                    confirmText: ui("Resolve flag"),
                    icon: 'shield-checkmark-outline',
                    successMessage: ui("Fraud flag resolved"),
                    run: (note) => superAdminService.resolveFraudFlag(item.id, note),
                  })
                }
              >
                <AppText style={styles.linkText}>{ui("Resolve")}</AppText>
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
          <AppText style={styles.cardTitle}>{ui("Reports (")}{reports.length})</AppText>
          <AppText style={styles.meta}>{ui("Manage reported content. Update status to track investigation progress.")}</AppText>
        </View>

        {reports.length === 0 ? (
          <EmptyState
            icon="flag-outline"
            title={ui("No reports")}
            message={ui("User reports will appear here.")}
          />
        ) : (
          reports.map((item) => (
            <View key={item.id} style={styles.card}>
              <AppText style={styles.cardTitle}>{item.reason || item.report_reason || ui("Report #{value0}", {value0: (item.id)})}</AppText>
              <View style={styles.rowBetween}>
                <StatusBadge status={item.status || 'open'} />
                <TouchableOpacity onPress={() => toggleReportStatusPicker(item.id)}>
                  <AppText style={styles.linkText}>{ui("Change Status")}</AppText>
                </TouchableOpacity>
              </View>
              {item.reporter_name ? (
                <AppText style={styles.meta}>{ui("Reported by: ")}{item.reporter_name}</AppText>
              ) : null}
              {item.reported_user_name ? (
                <AppText style={styles.meta}>{ui("Against: ")}{item.reported_user_name}</AppText>
              ) : null}
              {item.property_title ? (
                <AppText style={styles.meta}>{ui("Property: ")}{item.property_title}</AppText>
              ) : null}
              {item.description ? (
                <AppText style={styles.meta}>{ui("Details: ")}{item.description}</AppText>
              ) : null}
              {item.created_at ? (
                <AppText style={styles.meta}>{ui("Created:")}{new Date(item.created_at).toLocaleString()}
                </AppText>
              ) : null}

              {reportStatusTargets[item.id] && (
                <View style={styles.statusOptions}>
                  <AppText style={styles.filterLabel}>{ui("Set Status:")}</AppText>
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
                <TouchableOpacity
                  onPress={() =>
                    openOperationPrompt({
                      type: 'resolve_report',
                      target: item,
                      title: ui("Resolve report"),
                      message: ui("{value0} will be marked resolved.", {value0: (item.reason || item.report_reason || ui("Report #{value0}", {value0: (item.id)}))}),
                      label: ui("Investigation note"),
                      placeholder: ui("Summarise what the investigation found"),
                      confirmText: ui("Resolve report"),
                      icon: 'checkmark-circle-outline',
                      successMessage: ui("Report resolved"),
                      run: (note) => superAdminService.resolveReport(item.id, note),
                    })
                  }
                >
                  <AppText style={styles.linkText}>{ui("Resolve")}</AppText>
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
        <AppText style={styles.cardTitle}>{ui("Send Broadcast")}</AppText>
        <Input
          label={ui("Title")}
          value={broadcastForm.title}
          onChangeText={(value) => setBroadcastForm((prev) => ({ ...prev, title: value }))}
        />
        <Input
          label={ui("Message")}
          value={broadcastForm.message}
          onChangeText={(value) => setBroadcastForm((prev) => ({ ...prev, message: value }))}
          multiline
          numberOfLines={4}
        />
        <Input
          label={ui("Target Role")}
          value={broadcastForm.target_role}
          onChangeText={(value) =>
            setBroadcastForm((prev) => ({ ...prev, target_role: value }))
          }
          placeholder={ui("tenant, landlord, admin, lawyer")}
        />
        <Button
          title={ui("Send Broadcast")}
          onPress={() =>
            runAction(() => superAdminService.createBroadcast(broadcastForm), 'Broadcast sent')
          }
        />
      </View>

      {broadcasts.length === 0 ? (
        <EmptyState
          icon="megaphone-outline"
          title={ui("No broadcasts yet")}
          message={ui("Broadcasts you send will be listed here.")}
        />
      ) : (
        broadcasts.map((item) => (
          <View key={item.id} style={styles.card}>
            <AppText style={styles.cardTitle}>{item.title}</AppText>
            <AppText style={styles.meta}>{item.message}</AppText>
            <AppText style={styles.meta}>{ui("Target: ")}{item.target_role || ui("all")}</AppText>
          </View>
        ))
      )}
    </>
  );

  const renderFlags = () => (
    <FlagsSection
      flags={flags}
      onToggle={(key, enabled) =>
        openOperationPrompt({
          type: 'toggle_flag',
          target: { id: key },
          title: ui("{value0} feature flag", {value0: (enabled ? ui("Enable") : 'Disable')}),
          message: ui("{value0} will be turned {value1}.", {value0: (key), value1: (enabled ? ui("on") : 'off')}),
          label: ui("Change reason"),
          placeholder: ui("Explain why this flag is changing"),
          confirmText: enabled ? ui("Enable flag") : ui("Disable flag"),
          icon: 'toggle-outline',
          variant: enabled ? 'primary' : 'danger',
          successMessage: ui("Flag updated"),
          run: (note) => superAdminService.updateFlag(key, enabled, note),
        })
      }
    />
  );

  const renderRegistrationAccess = () => <RegistrationAccessSection />;

  const renderPropertyRequests = () => (
    <PropertyRequestWorkflowSection mode="support" title={ui("Tenant Property Requests")} />
  );

  const renderSfaPermissions = () => (
    <>
      <AppText style={styles.sectionTitle}>{ui("Super Financial Admin Permissions")}</AppText>
      {sfaList.length === 0 ? (
        <AppText style={styles.meta}>{ui("No SFA records found.")}</AppText>
      ) : (
        sfaList.map((item) => (
          <View key={item.id || item.super_financial_admin_id} style={styles.card}>
            <AppText style={styles.cardTitle}>{item.full_name || item.email}</AppText>
            <AppText style={styles.meta}>{ui("Approve admins: ")}{String(item.can_approve_admins)}</AppText>
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
              <AppText style={styles.linkText}>{ui("Toggle approve admins")}</AppText>
            </TouchableOpacity>
          </View>
        ))
      )}
    </>
  );

  const renderPlatformAgents = () => (
    <>
      <AppText style={styles.sectionTitle}>{ui("Platform Agents")}</AppText>
      {platformAgents.length === 0 ? (
        <AppText style={styles.meta}>{ui("No platform agents loaded.")}</AppText>
      ) : (
        platformAgents.map((agent) => (
          <View key={agent.id} style={styles.card}>
            <AppText style={styles.cardTitle}>{agent.full_name || agent.email}</AppText>
            <AppText style={styles.meta}>{agent.email}</AppText>
            <AppText style={styles.meta}>{ui("Status: ")}{agent.status || ui("active")}</AppText>
          </View>
        ))
      )}
    </>
  );

  const renderAdSpaces = () => (
    <>
      <View style={styles.card}>
        <AppText style={styles.sectionTitle}>{editingAdSpaceId ? 'Edit Ad Space' : 'Create Ad Space'}</AppText>
        <AppText style={styles.meta}>{ui("Create, update, pause, and delete sponsored placements from mobile.")}</AppText>

        <AppText style={styles.filterLabel}>{ui("Placement")}</AppText>
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
          label={ui("Title")}
          value={adSpaceForm.title}
          onChangeText={(value) => setAdSpaceForm((prev) => ({ ...prev, title: value }))}
          placeholder={ui("Ad headline")}
        />
        <Input
          label={ui("Sponsor")}
          value={adSpaceForm.sponsor_name}
          onChangeText={(value) => setAdSpaceForm((prev) => ({ ...prev, sponsor_name: value }))}
          placeholder={ui("Sponsor name")}
        />
        <AppText style={styles.filterLabel}>{ui("Description")}</AppText>
        <TextInput
          value={adSpaceForm.description}
          onChangeText={(value) => setAdSpaceForm((prev) => ({ ...prev, description: value }))}
          placeholder={ui("Short ad message")}
          multiline
          style={styles.textArea}
        />
        <Input
          label={ui("Image URL")}
          value={adSpaceForm.image_url}
          onChangeText={(value) => setAdSpaceForm((prev) => ({ ...prev, image_url: value }))}
          placeholder="https://... or /uploads/ad-spaces/image.jpg"
          autoCapitalize="none"
        />
        <Input
          label={ui("Target URL")}
          value={adSpaceForm.target_url}
          onChangeText={(value) => setAdSpaceForm((prev) => ({ ...prev, target_url: value }))}
          placeholder={ui("/register, /properties/123, or https://...")}
          autoCapitalize="none"
        />
        <Input
          label={ui("CTA Label")}
          value={adSpaceForm.cta_label}
          onChangeText={(value) => setAdSpaceForm((prev) => ({ ...prev, cta_label: value }))}
          placeholder={ui("Learn more")}
        />
        <View style={styles.row}>
          <View style={styles.flex1}>
            <Input
              label={ui("Background Color")}
              value={adSpaceForm.background_color}
              onChangeText={(value) => setAdSpaceForm((prev) => ({ ...prev, background_color: value }))}
              placeholder="#ffffff"
              autoCapitalize="none"
            />
          </View>
          <View style={styles.flex1}>
            <Input
              label={ui("Text Color")}
              value={adSpaceForm.text_color}
              onChangeText={(value) => setAdSpaceForm((prev) => ({ ...prev, text_color: value }))}
              placeholder="#111827"
              autoCapitalize="none"
            />
          </View>
        </View>
        <Input
          label={ui("Sort Order")}
          value={adSpaceForm.sort_order}
          onChangeText={(value) => setAdSpaceForm((prev) => ({ ...prev, sort_order: value }))}
          keyboardType="number-pad"
        />
        <Input
          label={ui("Starts At")}
          value={adSpaceForm.starts_at}
          onChangeText={(value) => setAdSpaceForm((prev) => ({ ...prev, starts_at: value }))}
          placeholder={ui("YYYY-MM-DDTHH:mm or leave blank")}
          autoCapitalize="none"
        />
        <Input
          label={ui("Ends At")}
          value={adSpaceForm.ends_at}
          onChangeText={(value) => setAdSpaceForm((prev) => ({ ...prev, ends_at: value }))}
          placeholder={ui("YYYY-MM-DDTHH:mm or leave blank")}
          autoCapitalize="none"
        />

        <View style={styles.switchRow}>
          <AppText style={styles.filterLabel}>{ui("Active")}</AppText>
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
            <Button title={ui("New Ad")} variant="outline" onPress={resetAdSpaceForm} size="sm" />
          ) : null}
        </View>
      </View>

      <AppText style={styles.sectionTitle}>{ui("Ad Spaces")}</AppText>
      {adSpaces.length === 0 ? (
        <EmptyState
          icon="megaphone-outline"
          title={ui("No ad spaces configured")}
          message={ui("Create a sponsored placement above.")}
        />
      ) : (
        adSpaces.map((ad) => (
          <View key={ad.id} style={styles.card}>
            <AppText style={styles.cardTitle}>{ad.title || ad.placement}</AppText>
            <AppText style={styles.meta}>{ui("Placement: ")}{ad.placement}</AppText>
            <AppText style={styles.meta}>{ui("Sponsor: ")}{ad.sponsor_name || '-'}</AppText>
            <AppText style={styles.meta}>{ui("Target: ")}{ad.target_url || '-'}</AppText>
            <AppText style={styles.meta}>{ui("Active: ")}{ad.is_active ? ui("Yes") : ui("No")}</AppText>
            <AppText style={styles.meta}>{ui("Impressions: ")}{ad.impression_count ?? 0}</AppText>
            <AppText style={styles.meta}>{ui("Clicks: ")}{ad.click_count ?? 0}</AppText>
            <View style={styles.row}>
              <TouchableOpacity onPress={() => handleEditAdSpace(ad)}>
                <AppText style={styles.linkText}>{ui("Edit")}</AppText>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleToggleAdSpace(ad)}>
                <AppText style={styles.linkText}>{ad.is_active ? 'Pause' : 'Activate'}</AppText>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteAdSpace(ad.id)}>
                <AppText style={styles.warnText}>{ui("Delete")}</AppText>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </>
  );

  const renderFraud = () =>
    fraud.length === 0 ? (
      <EmptyState
        icon="alert-circle-outline"
        title={ui("No fraud flags")}
        message={ui("Suspicious activity flagged by the rules engine will appear here.")}
      />
    ) : (
      fraud.map((item) => (
        <View key={item.id} style={styles.card}>
          <AppText style={styles.cardTitle}>{item.rule || 'Fraud rule'}</AppText>
          <AppText style={styles.meta}>{ui("Score: ")}{item.score}</AppText>
          <TouchableOpacity
            onPress={() =>
              openOperationPrompt({
                type: 'resolve_fraud',
                target: item,
                title: ui("Resolve fraud flag"),
                message: ui("{value0} will be marked resolved.", {value0: (item.rule || 'This fraud flag')}),
                label: ui("Resolution note"),
                placeholder: ui("Explain how this flag was investigated and resolved"),
                confirmText: ui("Resolve flag"),
                icon: 'shield-checkmark-outline',
                successMessage: ui("Fraud flag resolved"),
                run: (note) => superAdminService.resolveFraudFlag(item.id, note),
              })
            }
          >
            <AppText style={styles.linkText}>{ui("Resolve")}</AppText>
          </TouchableOpacity>
        </View>
      ))
    );

  const renderLogs = () => {
    const query = logSearch.trim().toLowerCase();
    const filteredLogs = query
      ? logs.filter((item) =>
          [
            item.action,
            item.event_type,
            item.user_name,
            item.actor_name,
            item.user_email,
            item.actor_email,
            item.target_type,
          ]
            .filter(Boolean)
            .some((field) => String(field).toLowerCase().includes(query))
        )
      : logs;

    return (
      <>
        <View style={styles.card}>
          <AppText style={styles.cardTitle}>{ui("Audit Logs")}</AppText>
          <Input
            label={ui("Search")}
            value={logSearch}
            onChangeText={setLogSearch}
            placeholder={ui("Action, user or target")}
          />
          <AppText style={styles.meta}>{ui("Showing")}{filteredLogs.length}{ui(" of ")}{logs.length}{ui("entries")}</AppText>
        </View>

        {filteredLogs.length === 0 ? (
          <EmptyState
            icon="document-text-outline"
            title={ui("No audit logs found")}
            message={
              logs.length === 0
                ? 'Activity will appear here as admins use the platform.'
                : 'No entries match your search.'
            }
          />
        ) : (
          filteredLogs.map((item, index) => (
            <View key={`${item.id || 'log'}-${index}`} style={styles.card}>
              <AppText style={styles.cardTitle}>
                {item.action || item.event_type || 'Audit log'}
              </AppText>
              <AppText style={styles.meta}>
                {item.user_name || item.actor_name || ui("System")}
              </AppText>
              <AppText style={styles.meta}>
                {item.created_at ? new Date(item.created_at).toLocaleString() : ''}
              </AppText>
            </View>
          ))
        )}
      </>
    );
  };

  // ===================== NEW: ANALYTICS TAB =====================
  const renderStructuredAnalytics = () => {
    const analyticEntries = Object.entries(analytics);
    const timeRangeOptions = [
      { label: ui("Today"), value: 'today' },
      { label: ui("This Week"), value: 'week' },
      { label: ui("This Month"), value: 'month' },
      { label: ui("All Time"), value: 'all' },
    ];

    const fetchAnalytics = async (range) => {
      const response = await superAdminService.getAnalytics(range);
      setAnalytics(pickObject(response, ['data']) || {});
    };

    const selectTimeRange = (range) => {
      setAnalyticsTimeRange(range);
      runAction(() => fetchAnalytics(range), 'Analytics updated', null);
    };

    return (
      <View>
        <View style={styles.card}>
          <AppText style={styles.cardTitle}>{ui("Analytics Dashboard")}</AppText>
          <AppText style={styles.filterLabel}>{ui("Time Range")}</AppText>
          <View style={styles.filtersRow}>
            {timeRangeOptions.map((opt) => (
              <FilterChip
                key={opt.value}
                label={opt.label}
                active={analyticsTimeRange === opt.value}
                onPress={() => selectTimeRange(opt.value)}
              />
            ))}
          </View>
          <Button
            title={ui("Refresh Analytics")}
            onPress={() =>
              runAction(
                () => fetchAnalytics(analyticsTimeRange),
                'Analytics refreshed',
                null
              )
            }
            loading={submitting}
          />
        </View>

        {analyticEntries.length === 0 ? (
          <EmptyState
            icon="analytics-outline"
            title={ui("No analytics data")}
            message={ui("Data will appear once users interact with the platform.")}
          />
        ) : (
          <View style={styles.analyticsGrid}>
            {analyticEntries.map(([key, value]) => {
              const label = key
                .replace(/_/g, ' ')
                .replace(/\b\w/g, (c) => c.toUpperCase());
              const rows = analyticsBreakdownRows(value);
              if (rows.length > 0) {
                return (
                  <View key={key} style={[styles.analyticsCard, styles.analyticsCardWide]}>
                    <AppText style={styles.analyticsLabel}>{label}</AppText>
                    {rows.map((row, index) => (
                      <View key={`${key}-${index}`} style={styles.breakdownRow}>
                        <AppText style={styles.breakdownLabel}>{row.label}</AppText>
                        <AppText style={styles.breakdownValue}>
                          {formatDisplayValue(row.count)}
                        </AppText>
                      </View>
                    ))}
                  </View>
                );
              }
              return (
                <View key={key} style={styles.analyticsCard}>
                  <AppText style={styles.analyticsValue}>{formatAnalyticsValue(value)}</AppText>
                  <AppText style={styles.analyticsLabel}>{label}</AppText>
                </View>
              );
            })}
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
      Toast.show({ type: 'error', text1: ui("Full name and email are required") });
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
      ui("Delete Platform Lawyer"),
      `Are you sure you want to remove ${lawyerName} from platform lawyers?`,
      [
        { text: ui("Cancel"), style: 'cancel' },
        {
          text: ui("Delete"),
          style: 'destructive',
          onPress: () =>
            openOperationPrompt({
              type: 'delete_platform_lawyer',
              target: { id: lawyerId, full_name: lawyerName },
              title: ui("Delete platform lawyer"),
              message: ui("{value0} will be removed from the platform lawyer list.", {value0: (lawyerName || 'This lawyer')}),
              label: ui("Deletion reason"),
              placeholder: ui("Explain why this lawyer is being removed"),
              confirmText: ui("Delete lawyer"),
              icon: 'trash-outline',
              variant: 'danger',
              successMessage: ui("Platform lawyer removed"),
              reload: null,
              run: async (note) => {
                await superAdminService.deletePlatformLawyer(lawyerId, note);
                await loadPlatformLawyers();
              },
            }),
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
          <AppText style={styles.cardTitle}>{ui("Platform Lawyers")}</AppText>
          <TouchableOpacity
            style={styles.smallBtn}
            onPress={() => {
              resetLawyerForm();
              setShowAddLawyerModal(true);
            }}
          >
            <AppText style={styles.smallBtnText}>{ui("+ Add Lawyer")}</AppText>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          onPress={() => {
            loadLawyerApplications();
            setShowLawyerApplications(!showLawyerApplications);
          }}
        >
          <AppText style={styles.linkText}>
            {showLawyerApplications ? ui("Hide") : 'View'}{ui("Pending Applications")}</AppText>
        </TouchableOpacity>
      </View>

      {showLawyerApplications && (
        <>
          {lawyerApplications.length === 0 ? (
            <EmptyState title={ui("No pending applications")} message={ui("No lawyer applications awaiting review.")} />
          ) : (
            lawyerApplications.map((app) => (
              <View key={app.id} style={styles.card}>
                <AppText style={styles.cardTitle}>{app.full_name || app.name}</AppText>
                {app.email ? <AppText style={styles.meta}>{ui("Email: ")}{app.email}</AppText> : null}
                {app.phone ? <AppText style={styles.meta}>{ui("Phone: ")}{app.phone}</AppText> : null}
                {app.specialization ? <AppText style={styles.meta}>{ui("Specialization: ")}{app.specialization}</AppText> : null}
                {app.license_number ? <AppText style={styles.meta}>{ui("License: ")}{app.license_number}</AppText> : null}
                {app.state_name ? <AppText style={styles.meta}>{ui("State: ")}{app.state_name}</AppText> : null}
                {app.notes ? <AppText style={styles.meta}>{ui("Notes: ")}{app.notes}</AppText> : null}
                <View style={styles.row}>
                  <TouchableOpacity onPress={() => handleReviewApplication(app.id, 'approve')}>
                    <AppText style={styles.linkText}>{ui("Approve")}</AppText>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleReviewApplication(app.id, 'reject')}>
                    <AppText style={styles.warnText}>{ui("Reject")}</AppText>
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
          title={ui("No platform lawyers")}
          message={ui("Add a lawyer manually or review pending applications.")}
        />
      ) : (
        platformLawyers.map((lawyer) => (
          <View key={lawyer.id} style={styles.card}>
            <View style={styles.rowBetween}>
              <AppText style={styles.cardTitle}>{lawyer.full_name || lawyer.name}</AppText>
              <StatusBadge status={lawyer.status || lawyer.invite_status || 'active'} />
            </View>
            {lawyer.email ? <AppText style={styles.meta}>{ui("Email: ")}{lawyer.email}</AppText> : null}
            {lawyer.phone ? <AppText style={styles.meta}>{ui("Phone: ")}{lawyer.phone}</AppText> : null}
            {lawyer.specialization ? <AppText style={styles.meta}>{ui("Specialization: ")}{lawyer.specialization}</AppText> : null}
            {lawyer.license_number ? <AppText style={styles.meta}>{ui("License: ")}{lawyer.license_number}</AppText> : null}
            {lawyer.state_name ? <AppText style={styles.meta}>{ui("State: ")}{lawyer.state_name}</AppText> : null}

            <View style={styles.row}>
              {lawyer.invite_status !== "accepted" ? (
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
                  <AppText style={styles.linkText}>{ui("Resend Invite")}</AppText>
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
                <AppText style={styles.linkText}>{ui("Edit")}</AppText>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteLawyer(lawyer.id, lawyer.full_name || lawyer.name)}>
                <AppText style={styles.warnText}>{ui("Remove")}</AppText>
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
        confirmText={editingLawyerId ? ui("Update") : 'Add Lawyer'}
        cancelText={ui("Cancel")}
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
              label={ui("Full Name")}
              value={lawyerForm.full_name}
              onChangeText={(v) => setLawyerForm((prev) => ({ ...prev, full_name: v }))}
              placeholder={ui("Enter lawyer name")}
            />
            <Input
              label={ui("Email")}
              value={lawyerForm.email}
              onChangeText={(v) => setLawyerForm((prev) => ({ ...prev, email: v }))}
              placeholder="lawyer@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Input
              label={ui("Phone")}
              value={lawyerForm.phone}
              onChangeText={(v) => setLawyerForm((prev) => ({ ...prev, phone: v }))}
              placeholder={ui("Phone number")}
              keyboardType="phone-pad"
            />
            <Input
              label={ui("Specialization")}
              value={lawyerForm.specialization}
              onChangeText={(v) => setLawyerForm((prev) => ({ ...prev, specialization: v }))}
              placeholder={ui("e.g. Property Law, Litigation")}
            />
            <Input
              label={ui("License Number")}
              value={lawyerForm.license_number}
              onChangeText={(v) => setLawyerForm((prev) => ({ ...prev, license_number: v }))}
              placeholder={ui("License number")}
            />
            <SelectField
              label={ui("State")}
              value={lawyerForm.state_id ? pricingLocations.find((s) => String(s.id) === lawyerForm.state_id)?.state_name : ''}
              placeholder={ui("Select state")}
              onPress={() => setShowPricingStatePicker(true)}
            />
            <View style={styles.row}>
              <Button
                title={editingLawyerId ? ui("Update") : 'Add Lawyer'}
                onPress={handleSaveLawyer}
                loading={submitting}
                style={styles.flex1}
              />
              <Button
                title={ui("Cancel")}
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
        title={reviewAction === "approve" ? ui("Approve Application") : ui("Reject Application")}
        message={reviewAction === "approve" ? 'Add a review note (optional):' : 'Provide a reason for rejection:'}
        confirmText={reviewAction === "approve" ? ui("Approve") : ui("Reject")}
        cancelText={ui("Cancel")}
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
              {reviewAction === "approve" ? ui("Approve Application") : ui("Reject Application")}
            </AppText>
            <TextInput
              style={styles.textArea}
              value={reviewNote}
              onChangeText={setReviewNote}
              placeholder={reviewAction === "approve" ? 'Review note (optional)...' : 'Reason for rejection...'}
              multiline
              numberOfLines={4}
            />
            <View style={styles.row}>
              <Button
                title={reviewAction === "approve" ? ui("Approve") : ui("Reject")}
                variant={reviewAction === 'approve' ? 'primary' : 'danger'}
                onPress={confirmReviewApplication}
                loading={submitting}
                style={styles.flex1}
              />
              <Button
                title={ui("Cancel")}
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
      { label: ui("24 Hours"), value: '24hours' },
      { label: ui("7 Days"), value: '7days' },
      { label: ui("30 Days"), value: '30days' },
      { label: ui("90 Days"), value: '90days' },
    ];

    return (
      <View>
        <View style={styles.card}>
          <AppText style={styles.cardTitle}>{ui("Lawyer Activity Stats")}</AppText>
          <AppText style={styles.filterLabel}>{ui("Time Range")}</AppText>
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
            title={ui("No activity data")}
            message={ui("Lawyer activity statistics will appear here.")}
          />
        ) : (
          lawyerActivities.map((activity, index) => (
            <View key={activity.id || index} style={styles.card}>
              <AppText style={styles.cardTitle}>{activity.lawyer_name || activity.full_name || ui("Lawyer")}</AppText>
              {activity.email ? <AppText style={styles.meta}>{ui("Email: ")}{activity.email}</AppText> : null}
              <View style={styles.activityStatRow}>
                {activity.properties_managed !== undefined && (
                  <View style={styles.activityStat}>
                    <AppText style={styles.analyticsValue}>{activity.properties_managed}</AppText>
                    <AppText style={styles.analyticsLabel}>{ui("Properties")}</AppText>
                  </View>
                )}
                {activity.clients_served !== undefined && (
                  <View style={styles.activityStat}>
                    <AppText style={styles.analyticsValue}>{activity.clients_served}</AppText>
                    <AppText style={styles.analyticsLabel}>{ui("Clients")}</AppText>
                  </View>
                )}
                {activity.documents_filed !== undefined && (
                  <View style={styles.activityStat}>
                    <AppText style={styles.analyticsValue}>{activity.documents_filed}</AppText>
                    <AppText style={styles.analyticsLabel}>{ui("Documents")}</AppText>
                  </View>
                )}
                {activity.disputes_handled !== undefined && (
                  <View style={styles.activityStat}>
                    <AppText style={styles.analyticsValue}>{activity.disputes_handled}</AppText>
                    <AppText style={styles.analyticsLabel}>{ui("Disputes")}</AppText>
                  </View>
                )}
                {activity.agreements_generated !== undefined && (
                  <View style={styles.activityStat}>
                    <AppText style={styles.analyticsValue}>{activity.agreements_generated}</AppText>
                    <AppText style={styles.analyticsLabel}>{ui("Agreements")}</AppText>
                  </View>
                )}
              </View>
              {activity.last_active_at ? (
                <AppText style={styles.meta}>{ui("Last active:")}{new Date(activity.last_active_at).toLocaleString()}
                </AppText>
              ) : null}
              {activity.total_hours_logged ? (
                <AppText style={styles.meta}>{ui("Total hours logged: ")}{activity.total_hours_logged}</AppText>
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
      ui("Impersonate Admin"),
      `You are about to impersonate ${adminName}. This will log you in as this admin. Continue?`,
      [
        { text: ui("Cancel"), style: 'cancel' },
        {
          text: ui("Impersonate"),
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
              Toast.show({ type: 'success', text1: ui("Now impersonating {value0}", {value0: (adminName)}) });
            } catch (error) {
              Toast.show({
                type: 'error',
                text1: ui("Failed"),
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
      Toast.show({ type: 'error', text1: ui("State is required") });
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
        text1: ui("Local government is required for this LGA role"),
      });
      return;
    }

    const jurisdiction = {
      state: jurisdictionForm.state.trim(),
      city: jurisdictionForm.city.trim(),
    };

    openOperationPrompt({
      type: 'update_jurisdiction',
      target: targetAdmin,
      title: ui("Update admin jurisdiction"),
      message: ui("{value0} will be assigned to {value1}{value2}.", {value0: (targetAdmin.full_name || targetAdmin.email || 'This admin'), value1: (jurisdiction.city ? `${jurisdiction.city}, ` : ''), value2: (jurisdiction.state)}),
      label: ui("Change reason"),
      placeholder: ui("Explain why this jurisdiction is changing"),
      confirmText: ui("Update jurisdiction"),
      icon: 'location-outline',
      successMessage: ui("Admin jurisdiction updated"),
      reload: null,
      run: async (note) => {
        await superAdminService.updateAdminJurisdiction(
          targetAdmin.id,
          jurisdiction.state,
          jurisdiction.city || undefined,
          note
        );
        setEditingJurisdiction(null);
        setJurisdictionForm({ state: '', city: '' });
        await loadAdmins();
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
        <AppText style={styles.cardTitle}>{ui("Admin Management")}</AppText>
        <AppText style={styles.meta}>{ui("Manage admin accounts, impersonate admins, and edit jurisdictions.")}</AppText>
      </View>

      {admins.length === 0 ? (
        <EmptyState
          icon="shield-checkmark-outline"
          title={ui("No admins found")}
          message={ui("Admin accounts will appear here once they are created.")}
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
            <AppText style={styles.meta}>{ui("Email: ")}{admin.email}</AppText>
            {admin.assigned_state ? (
              <AppText style={styles.meta}>{ui("Jurisdiction: ")}{admin.assigned_state}{admin.assigned_city ? ui(" - {value0}", {value0: (admin.assigned_city)}) : ''}</AppText>
            ) : (
              <AppText style={styles.meta}>{ui("Jurisdiction: Not assigned")}</AppText>
            )}
            <AppText style={styles.meta}>{ui("Verified:")}{admin.credentials_verified_count ?? 0}{ui("users")}</AppText>
            {admin.last_verification_at ? (
              <AppText style={styles.meta}>{ui("Last activity:")}{new Date(admin.last_verification_at).toLocaleString()}
              </AppText>
            ) : null}

            <View style={styles.row}>
              <TouchableOpacity onPress={() => handleImpersonateAdmin(admin.id, admin.full_name)}>
                <AppText style={styles.linkText}>{ui("Impersonate")}</AppText>
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
                <AppText style={styles.linkText}>{ui("Edit Jurisdiction")}</AppText>
              </TouchableOpacity>
            </View>

            {expandedAdminId === admin.id && (
              <View style={styles.expandedSection}>
                <AppText style={styles.filterLabel}>{ui("State Users")}</AppText>
                {loadingStateUsers ? (
                  <AppText style={styles.meta}>{ui("Loading...")}</AppText>
                ) : adminStateUsers.length === 0 ? (
                  <AppText style={styles.meta}>{ui("No users in this admin's jurisdiction.")}</AppText>
                ) : (
                  adminStateUsers.map((user) => (
                    <View key={user.id} style={styles.listRow}>
                      <AppText style={styles.listTitle}>{user.full_name || user.name}</AppText>
                      <AppText style={styles.meta}>{user.email}</AppText>
                      <AppText style={styles.meta}>{ui("Role: ")}{user.user_type}</AppText>
                    </View>
                  ))
                )}
              </View>
            )}

            {editingJurisdiction === admin.id && (
              <View style={styles.inlineForm}>
                <Input
                  label={ui("State")}
                  value={jurisdictionForm.state}
                  onChangeText={(v) => setJurisdictionForm((prev) => ({ ...prev, state: v }))}
                  placeholder={ui("Enter state name")}
                />
                <Input
                  label={
                    LGA_JURISDICTION_ROLES.has(String(admin.user_type || '').toLowerCase())
                      ? 'Local government'
                      : 'City (optional)'
                  }
                  value={jurisdictionForm.city}
                  onChangeText={(v) => setJurisdictionForm((prev) => ({ ...prev, city: v }))}
                  placeholder={ui("Enter city or LGA name")}
                />
                <View style={styles.row}>
                  <Button
                    title={ui("Save")}
                    onPress={() => handleUpdateJurisdiction(admin.id)}
                    loading={submitting}
                    size="sm"
                  />
                  <Button
                    title={ui("Cancel")}
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
        <AppText style={styles.cardTitle}>{ui("Pending Admin Approvals")}</AppText>
        <AppText style={styles.meta}>{ui("Review and approve/reject admin account requests.")}</AppText>
        <Button
          title={ui("Refresh")}
          onPress={() => runAction(() => loadPendingAdmins(), 'Pending admins refreshed', null)}
          loading={submitting}
          size="sm"
        />
      </View>

      {pendingAdmins.length === 0 ? (
        <EmptyState
          icon="checkmark-circle-outline"
          title={ui("No pending approvals")}
          message={ui("All admin requests have been processed.")}
        />
      ) : (
        pendingAdmins.map((admin) => (
          <View key={admin.id} style={styles.card}>
            <AppText style={styles.cardTitle}>{admin.full_name || admin.name || ui("Unknown")}</AppText>
            <AppText style={styles.meta}>{ui("Email: ")}{admin.email}</AppText>
            {admin.phone ? <AppText style={styles.meta}>{ui("Phone: ")}{admin.phone}</AppText> : null}
            {admin.state_name || admin.state ? (
              <AppText style={styles.meta}>{ui("State: ")}{admin.state_name || admin.state}</AppText>
            ) : null}
            {admin.city ? <AppText style={styles.meta}>{ui("City: ")}{admin.city}</AppText> : null}
            {admin.role_requested ? (
              <AppText style={styles.meta}>{ui("Role requested: ")}{admin.role_requested}</AppText>
            ) : null}
            {admin.created_at ? (
              <AppText style={styles.meta}>{ui("Requested:")}{new Date(admin.created_at).toLocaleDateString()}
              </AppText>
            ) : null}
            {admin.reason ? (
              <AppText style={styles.meta}>{ui("Reason: ")}{admin.reason}</AppText>
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
                <AppText style={styles.linkText}>{ui("Approve")}</AppText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  openOperationPrompt({
                    type: 'reject_admin',
                    target: admin,
                    title: ui("Reject admin request"),
                    message: ui("{value0} will be rejected and the pending account removed.", {value0: (admin.full_name || admin.email || 'This applicant')}),
                    label: ui("Rejection reason"),
                    placeholder: ui("Explain why this admin request is rejected"),
                    confirmText: ui("Reject admin"),
                    icon: 'close-circle-outline',
                    variant: 'danger',
                    successMessage: ui("Admin rejected"),
                    reload: null,
                    run: async (note) => {
                      await superAdminService.rejectPendingAdmin(admin.id, note);
                      await loadPendingAdmins();
                    },
                  })
                }
              >
                <AppText style={styles.warnText}>{ui("Reject")}</AppText>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </>
  );

  const renderCurrentSection = () => {
    switch (section) {
      case 'overview': return renderOverview();
      case 'users': return renderUsers();
      case 'verifications': return renderVerifications();
      case 'moderation': return renderModeration();
      case 'lawyer_invites': return renderLawyerInvites();
      case 'analytics': return renderStructuredAnalytics();
      case 'platform_lawyers': return renderPlatformLawyers();
      case 'platform_agents': return renderPlatformAgents();
      case 'lawyer_activity': return renderLawyerActivity();
      case 'admin_management': return renderAdminManagement();
      case 'pending_approvals': return renderPendingApprovals();
      case 'property_requests': return renderPropertyRequests();
      case 'pricing': return renderPricing();
      case 'registration_access': return renderRegistrationAccess();
      case 'properties': return renderProperties();
      case 'reports': return renderReports();
      case 'broadcasts': return renderBroadcasts();
      case 'ad_spaces': return renderAdSpaces();
      case 'flags': return renderFlags();
      case 'sfa_permissions': return renderSfaPermissions();
      case 'fraud': return renderFraud();
      case 'logs': return renderLogs();
      default: return renderOverview();
    }
  };
  const renderedSection = renderCurrentSection();
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
        eyebrow={ui("PLATFORM OPERATIONS")}
        title={ui("Super Admin")}
        subtitle={ui("Choose one focused workspace at a time. Data is loaded only when that workspace is opened.")}
        icon="shield-checkmark-outline"
        onRefresh={() => loadSection(section, true)}
        tourTarget="super_overview"

      />
      <AdminAccountActions navigation={navigation} />
      <ActionRow
        title={selectedSection?.label || ui("Choose workspace")}
        subtitle={ui("Tap to switch administrative workspace")}
        icon="apps-outline"
        badge="Workspace"
        tourTarget="super_workspace"
        onPress={() => setShowSectionPicker(true)}
      />

      {section !== "overview" ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={ui("Back to overview")}
          activeOpacity={0.85}
          onPress={() => setSection('overview')}
          style={styles.backToOverview}
        >
          <Icon name="arrow-back" size={18} color={colors.blue} />
          <AppText style={styles.backToOverviewText}>{ui("Back to Overview")}</AppText>
        </TouchableOpacity>
      ) : null}


      <TourTarget
        id={({ users: 'super_users', property_requests: 'super_requests', pricing: 'super_pricing', pending_approvals: 'super_approvals', registration_access: 'super_access', verifications: 'super_trust', fraud: 'super_trust', analytics: 'super_analytics' })[section]}
        label={selectedSection?.label}
        disabled={
          loading || !['verifications', 'fraud', 'analytics', 'users', 'property_requests', 'pricing', 'pending_approvals', 'registration_access'].includes(section)
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
        {loading ? <AppText style={styles.meta}>{ui("Loading...")}</AppText> : renderedSection}
      </View>

      <OperationNoteModal
        visible={Boolean(operationPrompt)}
        title={operationPrompt?.title || ui("Confirm action")}
        message={operationPrompt?.message}
        label={operationPrompt?.label || ui("Reason")}
        placeholder={operationPrompt?.placeholder}
        confirmText={operationPrompt?.confirmText || ui("Confirm action")}
        icon={operationPrompt?.icon || 'document-text-outline'}
        variant={operationPrompt?.variant || 'primary'}
        loading={submitting}
        onCancel={() => setOperationPrompt(null)}
        onConfirm={submitOperationNote}
      />

      <OptionPickerModal
        visible={showSectionPicker}
        title={ui("Choose workspace")}
        options={sectionOptions}
        selectedValue={section}
        searchable
        searchPlaceholder={ui("Search workspaces")}
        getOptionLabel={(item) => item?.label || String(item?.value ?? '')}
        onClose={() => setShowSectionPicker(false)}
        onSelect={(item) => {
          if (item?.__header) return;
          openWorkspace(item);
          setShowSectionPicker(false);
        }}
      />

      <OptionPickerModal
        visible={showPricingStatePicker}
        title={ui("Select State")}
        options={pricingLocations}
        selectedValue={pricingForm.state_id}
        searchable
        searchPlaceholder={ui("Search states")}
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
        title={ui("Select Local Government Area")}
        options={availablePricingLgas}
        selectedValue={pricingForm.lga_name}
        searchable
        searchPlaceholder={ui("Search LGAs")}
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
  title: { fontFamily: typography.semibold, fontSize: typeScale.xxl, lineHeight: 36, color: colors.ink, marginBottom: 12 },
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
  cardTitle: { fontSize: typeScale.base, lineHeight: 24, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  sectionTitle: { fontFamily: typography.semibold, fontSize: typeScale.md, lineHeight: 26, color: colors.ink, marginBottom: 8 },
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
    fontSize: typeScale.sm,
    lineHeight: 20,
    marginLeft: 9,
  },
  row: { flexDirection: 'row', gap: 16, marginTop: 10, flexWrap: 'wrap' },
  linkText: { color: '#0284c7', fontWeight: '700', marginTop: 8 },
  warnText: { color: '#dc2626', fontWeight: '700', marginTop: 8 },
  photoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(7, 26, 61, 0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  photoModalCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    maxHeight: '85%',
  },
  photoModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  photoModalTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: typeScale.base,
    lineHeight: 24,
    flex: 1,
    marginRight: 10,
  },
  photoModalImage: {
    width: '100%',
    height: 420,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
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
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    flex: 1,
    minWidth: '47%',
    padding: 14,
  },
  summaryCardTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryBadge: {
    position: 'absolute',
    top: -6,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  summaryBadgeText: {
    color: '#ffffff',
    fontFamily: typography.bold,
    fontSize: 11,
  },
  headerBell: {
    alignItems: 'center',
    backgroundColor: colors.navySoft,
    borderRadius: 19,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  headerBellBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  headerBellBadgeText: {
    color: '#ffffff',
    fontFamily: typography.bold,
    fontSize: 11,
  },
  summaryCardLabel: {
    color: '#64748b',
    flex: 1,
    fontFamily: typography.medium,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginRight: 6,
  },
  summaryCardValue: {
    color: '#0f172a',
    fontFamily: typography.bold,
    fontSize: typeScale.xl,
    lineHeight: 32,
    marginTop: 8,
  },
  summaryCardHint: {
    color: colors.blue,
    fontFamily: typography.semibold,
    fontSize: typeScale.reading,
    lineHeight: 22,
    marginTop: 4,
  },
  headerBack: {
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  backToOverview: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 7,
    marginBottom: 10,
    paddingVertical: 6,
  },
  backToOverviewText: {
    color: colors.blue,
    fontFamily: typography.semibold,
    fontSize: typeScale.sm,
    lineHeight: 20,
  },
  workspaceGroup: {
    marginBottom: 14,
  },  workspaceGroupHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
    marginBottom: 8,
  },
  workspaceGroupTitle: {
    color: '#0f172a',
    fontFamily: typography.bold,
    fontSize: typeScale.sm,
    lineHeight: 20,
  },
  workspaceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  workspaceCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    justifyContent: 'center',
    minHeight: 78,
    paddingHorizontal: 8,
    paddingVertical: 12,
    width: '31.5%',
  },
  workspaceCardLabel: {
    color: '#334155',
    fontFamily: typography.medium,
    fontSize: typeScale.xs,
    lineHeight: 18,
    textAlign: 'center',
  },
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
  analyticsCardWide: {
    alignItems: 'stretch',
    flexBasis: '100%',
    minWidth: '100%',
  },
  breakdownRow: {
    alignItems: 'center',
    borderTopColor: '#eef2f7',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  breakdownLabel: {
    color: '#334155',
    flex: 1,
    fontFamily: typography.medium,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginRight: 10,
    textTransform: 'capitalize',
  },
  breakdownValue: {
    color: '#0f172a',
    fontFamily: typography.bold,
    fontSize: typeScale.sm,
    lineHeight: 20,
  },
  analyticsValue: {
    fontSize: typeScale.xl,
    lineHeight: 32,
    fontFamily: typography.bold,
    color: '#0f172a',
  },
  analyticsLabel: {
    fontSize: typeScale.xs,
    lineHeight: 18,
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
    fontSize: typeScale.xs,
    lineHeight: 18,
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
    fontSize: typeScale.sm,
    lineHeight: 20,
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
    fontSize: typeScale.sm,
    lineHeight: 20,
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
