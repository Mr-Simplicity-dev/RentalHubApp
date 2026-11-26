import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import { AuthContext } from '../../context/AuthContext';
import { useRealtime } from '../../context/RealtimeContext';
import { useAccessibilityPreferences } from '../../hooks/useAccessibilityPreferences';
import AppText from '../common/AppText';
import TextInput from '../common/AppTextInput';
import {
  callDirectoryService,
  inferFallbackCallPolicy,
} from '../../services/callDirectoryService';
import { getErrorMessage } from '../../utils/http';
import { colors, radius, typography, typeScale } from '../../theme';
import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';

const SUPER_ADMIN_TABS = [
  { id: 'all', label: 'All' },
  { id: 'admin', label: 'Admins' },
  { id: 'landlord', label: 'Landlords' },
  { id: 'tenant', label: 'Tenants' },
  { id: 'agent', label: 'Agents' },
  { id: 'marketing_agent', label: 'Marketing' },
  { id: 'lawyer', label: 'Lawyers' },
];

const HISTORY_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'missed', label: 'Missed' },
  { id: 'incoming', label: 'Incoming' },
  { id: 'outgoing', label: 'Outgoing' },
];

const getInitials = (name) => {
  const parts = String(name || 'U')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const formatTerritory = (contact) =>
  [contact?.assigned_lga, contact?.assigned_state, contact?.assigned_zone]
    .map((v) => String(v || '').trim())
    .filter(Boolean)
    .join(' • ');

const formatDuration = (seconds) => {
  const total = Math.max(0, Number(seconds) || 0);
  if (total <= 0) return '0s';
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
};

const formatDateTime = (value) => {
  if (!value) return '—';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleString('en-NG', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getStatusBadgeStyle = (record) => {
  const status = String(record?.status || '').toLowerCase();
  if (status === 'missed') {
    if (record?.direction === 'incoming') {
      return { label: 'Missed Call', bg: '#fee2e2', text: '#b91c1c', border: '#fecaca' };
    }
    return { label: 'No Answer (Missed)', bg: '#fef3c7', text: '#92400e', border: '#fde68a' };
  }
  if (status === 'rejected') {
    return { label: 'Declined', bg: '#ffe4e6', text: '#be123c', border: '#fecdd3' };
  }
  if (status === 'ended' || status === 'accepted') {
    return { label: 'Completed', bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' };
  }
  if (status === 'ringing') {
    return { label: 'Ringing', bg: '#dbeafe', text: '#1d4ed8', border: '#bfdbfe' };
  }
  return { label: 'Failed', bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' };
};

const ensureAndroidAudioPermission = async () => {
  if (Platform.OS !== 'android') return true;
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: 'Microphone Permission',
        message: 'RentalHub needs microphone access so you can place voice calls.',
        buttonPositive: 'Allow',
        buttonNegative: 'Cancel',
      }
    );
    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
      Toast.show({
        type: 'error',
        text1: ui('Microphone required'),
        text2: ui('Allow microphone permission in Settings to place voice calls.'),
      });
      return false;
    }
    return true;
  } catch {
    return true;
  }
};

const waitForIosModalDismiss = () =>
  Platform.OS === 'ios' ? new Promise((resolve) => setTimeout(resolve, 320)) : Promise.resolve();

const HeadphoneSupportButton = ({ variant = 'dark', compact = false, style }) => {
  useInterfaceLanguage();
  const navigation = useNavigation();
  const { user, isAuthenticated } = useContext(AuthContext);
  const { connected, inviteCall, inviteSupportCall } = useRealtime();
  const { hitSlop } = useAccessibilityPreferences();
  const insets = useSafeAreaInsets();

  const [open, setOpen] = useState(false);
  const [activeView, setActiveView] = useState('contacts'); // 'contacts' | 'records'
  const [policy, setPolicy] = useState(() => inferFallbackCallPolicy(user));
  const [contacts, setContacts] = useState([]);
  const [supportOnlineCount, setSupportOnlineCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [callingId, setCallingId] = useState(null);
  const [supportNoAgentMessage, setSupportNoAgentMessage] = useState('');

  // Call records & missed calls state
  const [historyFilter, setHistoryFilter] = useState('all');
  const [callRecords, setCallRecords] = useState([]);
  const [historySummary, setHistorySummary] = useState({
    total_count: 0,
    missed_count: 0,
    incoming_missed_count: 0,
    answered_count: 0,
  });
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [expandedRecordId, setExpandedRecordId] = useState(null);

  useEffect(() => {
    setPolicy(inferFallbackCallPolicy(user));
  }, [user]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const isDirectoryMode =
    policy?.mode === 'platform_all' || policy?.mode === 'admin_subordinates';

  const loadDirectory = useCallback(async () => {
    if (!isAuthenticated || !user?.id) return;
    setLoading(true);
    setError('');
    try {
      const payload = await callDirectoryService.getDirectory({
        q: debouncedSearch,
        role: roleFilter,
        onlineOnly,
      });
      if (payload?.policy) {
        setPolicy(payload.policy);
      }
      setContacts(Array.isArray(payload?.contacts) ? payload.contacts : []);
      setSupportOnlineCount(Number(payload?.supportOnlineCount || 0));
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load call options right now.'));
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user?.id, debouncedSearch, roleFilter, onlineOnly]);

  const loadCallHistory = useCallback(
    async (filterOverride) => {
      if (!isAuthenticated || !user?.id) return;
      const targetFilter = filterOverride || historyFilter || 'all';
      setHistoryLoading(true);
      setHistoryError('');
      try {
        const payload = await callDirectoryService.getHistory({
          filter: targetFilter,
          limit: 40,
        });
        setCallRecords(Array.isArray(payload?.records) ? payload.records : []);
        if (payload?.summary) {
          setHistorySummary(payload.summary);
        }
      } catch (err) {
        setHistoryError(getErrorMessage(err, 'Unable to load call records right now.'));
      } finally {
        setHistoryLoading(false);
      }
    },
    [isAuthenticated, user?.id, historyFilter]
  );

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;
    callDirectoryService
      .getHistory({ filter: 'all', limit: 15 })
      .then((payload) => {
        if (payload?.summary) setHistorySummary(payload.summary);
        if (Array.isArray(payload?.records)) setCallRecords(payload.records);
      })
      .catch(() => {});
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    if (!open) return;
    if (activeView === 'contacts') {
      loadDirectory();
    } else {
      loadCallHistory();
    }
  }, [open, activeView, loadDirectory, loadCallHistory]);

  const meta = useMemo(() => {
    if (policy?.role === 'marketing_agent') {
      return {
        a11y: 'Marketing team, supervisor, support, and call records',
        title: 'Marketing Calls & Support',
        subtitle: 'Call marketing teammates, supervisors, Support, or view call records',
      };
    }
    switch (policy?.mode) {
      case 'platform_all':
        return {
          a11y: ui('Call platform users'),
          title: ui('Platform Call Directory'),
          subtitle: ui('Call any Tenant, Landlord, Agent, Lawyer, or Admin'),
        };
      case 'admin_subordinates':
        return {
          a11y: ui('Call admins and team'),
          title: ui('Admin & Team Call Directory'),
          subtitle: ui('Call admins and team members below you'),
        };
      case 'support_and_boss':
      case 'boss_and_support':
        return {
          a11y: ui('Support and supervisor calls'),
          title: ui('Support & Supervisor'),
          subtitle: ui('Chat or call Support, or call your supervisor'),
        };
      default:
        return {
          a11y: ui('Contact support'),
          title: ui('Contact Support'),
          subtitle: ui('Chat with Support or place an instant voice call'),
        };
    }
  }, [policy?.mode, policy?.role]);

  const adminTabs = useMemo(() => {
    if (policy?.mode === 'platform_all') return SUPER_ADMIN_TABS;
    const tabs = [
      { id: 'all', label: 'All' },
      { id: 'subordinate', label: 'Team Below Me' },
    ];
    if (policy?.canCallBoss) {
      tabs.push({ id: 'boss', label: 'My Supervisor' });
    }
    return tabs;
  }, [policy?.mode, policy?.canCallBoss]);

  if (!isAuthenticated || !user) return null;

  const openSupportChat = () => {
    setOpen(false);
    setSupportNoAgentMessage('');
    const routeNames = navigation.getState?.()?.routeNames || [];
    if (routeNames.includes('Support')) {
      navigation.navigate('Support');
    } else if (routeNames.includes('ContactWidget')) {
      navigation.navigate('ContactWidget');
    } else if (routeNames.includes('WhatsAppSupport')) {
      navigation.navigate('WhatsAppSupport');
    } else {
      navigation.navigate('Support');
    }
  };

  const handleCallSupport = async () => {
    setSupportNoAgentMessage('');
    if (!connected) {
      Toast.show({
        type: 'info',
        text1: ui('Connecting voice line'),
        text2: ui('Please wait a moment and try calling Support again.'),
      });
      return;
    }
    const allowed = await ensureAndroidAudioPermission();
    if (!allowed) return;
    setCallingId('support');
    try {
      if (Platform.OS === 'ios') {
        setOpen(false);
        await waitForIosModalDismiss();
      }
      await inviteSupportCall();
      setOpen(false);
    } catch (err) {
      if (err?.code === 'NO_AGENT') {
        setSupportNoAgentMessage(
          err?.message ||
            ui('All support agents are currently busy or offline. Try live chat instead.')
        );
        if (Platform.OS === 'ios') {
          setOpen(true);
        }
      } else {
        Toast.show({
          type: 'error',
          text1: ui('Call failed'),
          text2: getErrorMessage(err, 'Could not connect to Support right now.'),
        });
      }
    } finally {
      setCallingId(null);
    }
  };

  const handleDirectCall = async (contact) => {
    if (!contact?.id) return;
    if (!connected) {
      Toast.show({
        type: 'info',
        text1: ui('Connecting voice line'),
        text2: ui('Realtime voice connection is not ready yet.'),
      });
      return;
    }
    const allowed = await ensureAndroidAudioPermission();
    if (!allowed) return;
    setCallingId(contact.id);
    try {
      if (Platform.OS === 'ios') {
        setOpen(false);
        await waitForIosModalDismiss();
      }
      await inviteCall({
        receiverId: contact.id,
        callType: 'audio',
        propertyTitle: `${contact.full_name || 'Direct Call'} (${contact.role_label || contact.user_type || ''})`,
      });
      setOpen(false);
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: ui('Call failed'),
        text2: getErrorMessage(err, 'Could not start this call.'),
      });
    } finally {
      setCallingId(null);
    }
  };

  const bossContacts = contacts.filter((c) => c.relation === 'boss');
  const teammateContacts = contacts.filter((c) => c.relation === 'teammate');
  const incomingMissedCount = Number(historySummary?.incoming_missed_count || 0);
  const totalMissedCount = Number(historySummary?.missed_count || 0);
  const missedBadgeLabel = incomingMissedCount > 9 ? '9+' : String(incomingMissedCount);
  const primaryTabLabel = isDirectoryMode
    ? 'Directory'
    : policy?.canCallTeammates
    ? 'Call & Team'
    : 'Call & Support';
  const isLight = variant === 'light';

  const renderCallRecordsSection = () => {
    const emptyRecordsTitle =
      historyFilter === 'missed' ? 'No missed calls recorded' : 'No call records yet';

    return (
      <View style={styles.recordsContainer}>
        {/* Summary Strip */}
        <View style={styles.summaryStrip}>
          <View style={styles.summaryTile}>
            <AppText style={styles.summaryLabel}>Total</AppText>
            <AppText style={styles.summaryValue}>{historySummary.total_count || 0}</AppText>
          </View>
          <View style={[styles.summaryTile, totalMissedCount > 0 && styles.summaryTileMissed]}>
            <AppText style={[styles.summaryLabel, styles.summaryLabelMissed]}>Missed</AppText>
            <AppText style={[styles.summaryValue, styles.summaryValueMissed]}>
              {totalMissedCount}
            </AppText>
          </View>
          <View style={[styles.summaryTile, styles.summaryTileAnswered]}>
            <AppText style={[styles.summaryLabel, styles.summaryLabelAnswered]}>Answered</AppText>
            <AppText style={[styles.summaryValue, styles.summaryValueAnswered]}>
              {historySummary.answered_count || 0}
            </AppText>
          </View>
        </View>

        {/* Filter Chips */}
        <View style={styles.filterControlsRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsRow}
          >
            {HISTORY_FILTERS.map((f) => {
              const active = historyFilter === f.id;
              const chipText =
                f.id === 'missed' && totalMissedCount > 0
                  ? `${f.label} (${totalMissedCount})`
                  : f.label;
              return (
                <TouchableOpacity
                  key={f.id}
                  onPress={() => {
                    setHistoryFilter(f.id);
                    loadCallHistory(f.id);
                  }}
                  style={[
                    styles.tabChip,
                    active && (f.id === 'missed' ? styles.tabChipMissed : styles.tabChipActive),
                  ]}
                >
                  <AppText style={[styles.tabChipText, active && styles.tabChipTextActive]}>
                    {chipText}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TouchableOpacity
            onPress={() => loadCallHistory()}
            style={styles.refreshIconBtn}
            accessibilityLabel="Refresh call records"
          >
            <Icon name="refresh-outline" size={18} color={colors.ink} />
          </TouchableOpacity>
        </View>

        {historyError ? (
          <View style={styles.errorBanner}>
            <AppText style={styles.errorText}>{historyError}</AppText>
          </View>
        ) : null}

        {historyLoading && callRecords.length === 0 ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="small" color={colors.blue} />
            <AppText style={styles.centerText}>Loading call records…</AppText>
          </View>
        ) : callRecords.length === 0 ? (
          <View style={styles.centerBox}>
            <Icon name="time-outline" size={28} color={colors.muted} />
            <AppText style={styles.emptyTitle}>{emptyRecordsTitle}</AppText>
            <AppText style={styles.centerText}>
              Completed, declined, and missed calls will appear here with full call details.
            </AppText>
          </View>
        ) : (
          <View style={styles.recordsList}>
            {callRecords.map((record) => {
              const badge = getStatusBadgeStyle(record);
              const isExpanded = expandedRecordId === record.id;
              const counterpart = record.counterpart || {};
              const isCalling = callingId === counterpart.id;
              const callTypeText = record.is_support_call
                ? 'Support Voice'
                : record.call_type === 'video'
                ? 'Video Call'
                : 'Voice Call';
              const directionLabel = record.direction === 'incoming' ? 'Incoming' : 'Outgoing';
              const durationText = record.is_missed
                ? 'No answer'
                : record.duration_seconds > 0
                ? formatDuration(record.duration_seconds)
                : record.status === 'rejected'
                ? 'Declined'
                : '0s';
              const subtitleLine = `${counterpart.role_label || 'User'} • ${directionLabel} ${callTypeText}`;
              const timeDurationLine = `${formatDateTime(record.requested_at)} • ${durationText}`;
              const callBackLabel = isCalling ? 'Calling…' : 'Call Back';
              const detailsToggleLabel = isExpanded ? 'Hide Details' : 'Details';
              const answeredText = record.started_at
                ? formatDateTime(record.started_at)
                : 'Not answered';
              const dirIconName = record.is_missed
                ? 'call-outline'
                : record.direction === 'incoming'
                ? 'arrow-down-outline'
                : 'arrow-up-outline';
              const dirIconColor = record.is_missed
                ? '#dc2626'
                : record.direction === 'incoming'
                ? '#059669'
                : colors.blue;

              return (
                <View
                  key={record.id}
                  style={[styles.recordCard, record.is_missed_for_me && styles.recordCardMissed]}
                >
                  <View style={styles.recordTopRow}>
                    <View style={styles.contactInfo}>
                      <View style={styles.contactNameRow}>
                        <Icon name={dirIconName} size={14} color={dirIconColor} />
                        <AppText style={styles.contactName} numberOfLines={1}>
                          {counterpart.full_name || 'Unknown User'}
                        </AppText>
                      </View>
                      <AppText style={styles.contactMeta} numberOfLines={1}>
                        {subtitleLine}
                      </AppText>
                      <View style={styles.recordBadgeRow}>
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: badge.bg, borderColor: badge.border },
                          ]}
                        >
                          <AppText style={[styles.statusBadgeText, { color: badge.text }]}>
                            {badge.label}
                          </AppText>
                        </View>
                        <AppText style={styles.recordTimeText}>{timeDurationLine}</AppText>
                      </View>
                    </View>

                    <View style={styles.recordActionsCol}>
                      {record.can_call_back && counterpart.id ? (
                        <TouchableOpacity
                          activeOpacity={0.85}
                          disabled={isCalling}
                          onPress={() => handleDirectCall(counterpart)}
                          style={[styles.callBackBtn, isCalling && styles.disabledBtn]}
                        >
                          <Icon name="call" size={12} color={colors.white} />
                          <AppText style={styles.callBackBtnText}>{callBackLabel}</AppText>
                        </TouchableOpacity>
                      ) : null}
                      <TouchableOpacity
                        onPress={() => setExpandedRecordId(isExpanded ? null : record.id)}
                        style={styles.detailsToggleBtn}
                      >
                        <AppText style={styles.detailsToggleText}>{detailsToggleLabel}</AppText>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {isExpanded ? (
                    <View style={styles.recordDetailsBox}>
                      <AppText style={styles.detailLine}>
                        Caller: {record.caller?.full_name || 'Unknown'}
                      </AppText>
                      <AppText style={styles.detailLine}>
                        Receiver: {record.receiver?.full_name || 'Unknown'}
                      </AppText>
                      <AppText style={styles.detailLine}>
                        Requested: {formatDateTime(record.requested_at)}
                      </AppText>
                      <AppText style={styles.detailLine}>Answered: {answeredText}</AppText>
                      <AppText style={styles.detailLine}>
                        Ended: {formatDateTime(record.ended_at)}
                      </AppText>
                      <AppText style={styles.detailLine}>Talk Duration: {durationText}</AppText>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  const renderDirectoryContact = ({ item }) => {
    const territory = formatTerritory(item);
    const isCalling = callingId === item.id;
    const contactSubtitle = territory
      ? `${item.role_label || item.user_type} • ${territory}`
      : item.role_label || item.user_type;
    const presenceText = item.online ? ui('Online now') : ui('Offline');
    const callBtnText = isCalling ? ui('Calling…') : ui('Call');

    return (
      <View style={styles.contactRow}>
        <View style={styles.avatarWrap}>
          <View style={styles.avatarCircle}>
            <AppText style={styles.avatarText}>{getInitials(item.full_name)}</AppText>
          </View>
          <View
            style={[
              styles.presenceDot,
              { backgroundColor: item.online ? '#10b981' : '#cbd5e1' },
            ]}
          />
        </View>
        <View style={styles.contactInfo}>
          <View style={styles.contactNameRow}>
            <AppText style={styles.contactName} numberOfLines={1}>
              {item.full_name}
            </AppText>
            {item.relation === 'boss' ? (
              <View style={styles.supervisorTag}>
                <AppText style={styles.supervisorTagText}>{ui('Supervisor')}</AppText>
              </View>
            ) : null}
          </View>
          <AppText style={styles.contactMeta} numberOfLines={1}>
            {contactSubtitle}
          </AppText>
          <AppText
            style={[
              styles.presenceLabel,
              { color: item.online ? '#059669' : colors.muted },
            ]}
          >
            {presenceText}
          </AppText>
        </View>
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={isCalling}
          onPress={() => handleDirectCall(item)}
          style={[styles.callPill, isCalling && styles.disabledBtn]}
        >
          <Icon name="call" size={14} color={colors.white} />
          <AppText style={styles.callPillText}>{callBtnText}</AppText>
        </TouchableOpacity>
      </View>
    );
  };

  const supportCallTitle =
    callingId === 'support' ? ui('Connecting to Support…') : ui('Call Support');
  const supportOnlineSubtitle =
    supportOnlineCount > 0
      ? `${supportOnlineCount} online now`
      : 'Start an instant in-app voice call';

  return (
    <>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={meta.a11y}
        activeOpacity={0.85}
        hitSlop={hitSlop}
        onPress={() => {
          setSupportNoAgentMessage('');
          setOpen(true);
        }}
        style={[
          isLight ? styles.lightTrigger : styles.darkTrigger,
          compact && styles.compactTrigger,
          style,
        ]}
      >
        <Icon
          name="headset-outline"
          size={isLight ? 21 : 20}
          color={isLight ? colors.navy : colors.white}
        />
        {incomingMissedCount > 0 ? (
          <View style={styles.missedBadge}>
            <AppText style={styles.missedBadgeText}>{missedBadgeLabel}</AppText>
          </View>
        ) : connected ? (
          <View
            style={[
              styles.liveDot,
              isLight ? styles.liveDotLight : styles.liveDotDark,
            ]}
          />
        ) : null}
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent={!isDirectoryMode}
        presentationStyle={
          isDirectoryMode
            ? Platform.OS === 'ios'
              ? 'pageSheet'
              : 'fullScreen'
            : 'overFullScreen'
        }
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        {isDirectoryMode ? (
          <SafeAreaView style={styles.directorySafe}>
            <KeyboardAvoidingView
              style={styles.flexOne}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
              {/* Modal Header */}
              <View style={styles.directoryHeader}>
                <View style={styles.headerTitleRow}>
                  <View style={styles.headerIconBadge}>
                    <Icon name="headset" size={18} color={colors.blue} />
                  </View>
                  <View style={styles.flexOne}>
                    <AppText style={styles.modalTitle}>{meta.title}</AppText>
                    <AppText style={styles.modalSubtitle}>{meta.subtitle}</AppText>
                  </View>
                </View>
                <TouchableOpacity
                  accessibilityLabel={ui('Close')}
                  onPress={() => setOpen(false)}
                  style={styles.closeBtn}
                >
                  <Icon name="close" size={20} color={colors.ink} />
                </TouchableOpacity>
              </View>

              {/* Directory vs Call Records Switcher */}
              <View style={styles.viewSwitcherWrap}>
                <View style={styles.viewSwitcher}>
                  <TouchableOpacity
                    onPress={() => setActiveView('contacts')}
                    style={[
                      styles.viewSwitchTab,
                      activeView === 'contacts' && styles.viewSwitchTabActive,
                    ]}
                  >
                    <AppText
                      style={[
                        styles.viewSwitchText,
                        activeView === 'contacts' && styles.viewSwitchTextActive,
                      ]}
                    >
                      {primaryTabLabel}
                    </AppText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setActiveView('records')}
                    style={[
                      styles.viewSwitchTab,
                      activeView === 'records' && styles.viewSwitchTabActive,
                    ]}
                  >
                    <AppText
                      style={[
                        styles.viewSwitchText,
                        activeView === 'records' && styles.viewSwitchTextActive,
                      ]}
                    >
                      Call Records
                    </AppText>
                    {totalMissedCount > 0 ? (
                      <View style={styles.inlineMissedPill}>
                        <AppText style={styles.inlineMissedPillText}>{totalMissedCount}</AppText>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                </View>
              </View>

              {activeView === 'records' ? (
                <ScrollView
                  contentContainerStyle={styles.recordsScrollContent}
                  keyboardShouldPersistTaps="handled"
                >
                  {renderCallRecordsSection()}
                </ScrollView>
              ) : (
                <>
                  {/* Search & Online Toggle */}
                  <View style={styles.filterBlock}>
                    <View style={styles.searchRow}>
                      <View style={styles.searchBox}>
                        <Icon name="search-outline" size={16} color={colors.muted} />
                        <TextInput
                          value={search}
                          onChangeText={setSearch}
                          placeholder={ui('Search name, role, state, or LGA…')}
                          placeholderTextColor={colors.muted}
                          style={styles.searchInput}
                          returnKeyType="search"
                        />
                        {search ? (
                          <TouchableOpacity onPress={() => setSearch('')}>
                            <Icon name="close-circle" size={16} color={colors.muted} />
                          </TouchableOpacity>
                        ) : null}
                      </View>
                      <TouchableOpacity
                        onPress={loadDirectory}
                        style={styles.refreshIconBtn}
                        accessibilityLabel={ui('Refresh directory')}
                      >
                        <Icon name="refresh-outline" size={18} color={colors.ink} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.filterControlsRow}>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.tabsRow}
                      >
                        {adminTabs.map((tab) => {
                          const active = roleFilter === tab.id;
                          return (
                            <TouchableOpacity
                              key={tab.id}
                              onPress={() => setRoleFilter(tab.id)}
                              style={[styles.tabChip, active && styles.tabChipActive]}
                            >
                              <AppText
                                style={[styles.tabChipText, active && styles.tabChipTextActive]}
                              >
                                {ui(tab.label)}
                              </AppText>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                      <TouchableOpacity
                        onPress={() => setOnlineOnly((prev) => !prev)}
                        style={[styles.onlineToggle, onlineOnly && styles.onlineToggleActive]}
                      >
                        <View
                          style={[
                            styles.onlineToggleDot,
                            { backgroundColor: onlineOnly ? colors.white : '#10b981' },
                          ]}
                        />
                        <AppText
                          style={[
                            styles.onlineToggleText,
                            onlineOnly && styles.onlineToggleTextActive,
                          ]}
                        >
                          {ui('Online')}
                        </AppText>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {error ? (
                    <View style={styles.errorBanner}>
                      <AppText style={styles.errorText}>{error}</AppText>
                    </View>
                  ) : null}

                  {loading && contacts.length === 0 ? (
                    <View style={styles.centerBox}>
                      <ActivityIndicator size="small" color={colors.blue} />
                      <AppText style={styles.centerText}>{ui('Loading directory…')}</AppText>
                    </View>
                  ) : (
                    <FlatList
                      data={contacts}
                      keyExtractor={(item) => String(item.id)}
                      renderItem={renderDirectoryContact}
                      contentContainerStyle={styles.listContent}
                      keyboardShouldPersistTaps="handled"
                      ListEmptyComponent={
                        <View style={styles.centerBox}>
                          <Icon name="people-outline" size={28} color={colors.muted} />
                          <AppText style={styles.emptyTitle}>
                            {ui('No matching users found')}
                          </AppText>
                          <AppText style={styles.centerText}>
                            {ui('Try clearing your search or turning off the Online filter.')}
                          </AppText>
                        </View>
                      }
                    />
                  )}
                </>
              )}
            </KeyboardAvoidingView>
          </SafeAreaView>
        ) : (
          /* Bottom Sheet for Tenants, Landlords, Agents, Marketing Agents & LGA Admins */
          <View style={styles.sheetBackdrop}>
            <View
              style={[
                styles.sheetCard,
                { paddingBottom: Math.max(24, insets.bottom + 12) },
              ]}
            >
              <View style={styles.sheetHeader}>
                <View style={styles.headerTitleRow}>
                  <View style={styles.headerIconBadge}>
                    <Icon name="headset" size={18} color={colors.blue} />
                  </View>
                  <View style={styles.flexOne}>
                    <AppText style={styles.modalTitle}>{meta.title}</AppText>
                    <AppText style={styles.modalSubtitle}>{meta.subtitle}</AppText>
                  </View>
                </View>
                <TouchableOpacity
                  accessibilityLabel={ui('Close')}
                  onPress={() => setOpen(false)}
                  style={styles.closeBtn}
                >
                  <Icon name="close" size={20} color={colors.ink} />
                </TouchableOpacity>
              </View>

              {/* Contacts vs Call Records Switcher */}
              <View style={styles.viewSwitcherWrap}>
                <View style={styles.viewSwitcher}>
                  <TouchableOpacity
                    onPress={() => setActiveView('contacts')}
                    style={[
                      styles.viewSwitchTab,
                      activeView === 'contacts' && styles.viewSwitchTabActive,
                    ]}
                  >
                    <AppText
                      style={[
                        styles.viewSwitchText,
                        activeView === 'contacts' && styles.viewSwitchTextActive,
                      ]}
                    >
                      {primaryTabLabel}
                    </AppText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setActiveView('records')}
                    style={[
                      styles.viewSwitchTab,
                      activeView === 'records' && styles.viewSwitchTabActive,
                    ]}
                  >
                    <AppText
                      style={[
                        styles.viewSwitchText,
                        activeView === 'records' && styles.viewSwitchTextActive,
                      ]}
                    >
                      Call Records
                    </AppText>
                    {totalMissedCount > 0 ? (
                      <View style={styles.inlineMissedPill}>
                        <AppText style={styles.inlineMissedPillText}>{totalMissedCount}</AppText>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView
                contentContainerStyle={styles.sheetBody}
                keyboardShouldPersistTaps="handled"
              >
                {activeView === 'records' ? (
                  renderCallRecordsSection()
                ) : (
                  <>
                    {policy?.canChatSupport ? (
                      <>
                        <TouchableOpacity
                          activeOpacity={0.85}
                          onPress={openSupportChat}
                          style={styles.actionCard}
                        >
                          <View style={[styles.actionIconBox, { backgroundColor: colors.blue }]}>
                            <Icon name="chatbubbles-outline" size={18} color={colors.white} />
                          </View>
                          <View style={styles.flexOne}>
                            <AppText style={styles.actionTitle}>{ui('Chat with Support')}</AppText>
                            <AppText style={styles.actionSubtitle}>
                              {ui('Open live support messaging and tickets')}
                            </AppText>
                          </View>
                          <Icon name="chevron-forward" size={18} color={colors.muted} />
                        </TouchableOpacity>

                        {policy?.canCallSupport ? (
                          <TouchableOpacity
                            activeOpacity={0.85}
                            disabled={callingId === 'support'}
                            onPress={handleCallSupport}
                            style={[
                              styles.actionCard,
                              styles.callSupportCard,
                              callingId === 'support' && styles.disabledBtn,
                            ]}
                          >
                            <View style={[styles.actionIconBox, { backgroundColor: '#059669' }]}>
                              <Icon name="call" size={18} color={colors.white} />
                            </View>
                            <View style={styles.flexOne}>
                              <AppText style={styles.actionTitle}>{supportCallTitle}</AppText>
                              <AppText style={styles.actionSubtitle}>{supportOnlineSubtitle}</AppText>
                            </View>
                            <Icon name="chevron-forward" size={18} color="#059669" />
                          </TouchableOpacity>
                        ) : null}

                        {supportNoAgentMessage ? (
                          <View style={styles.warnBox}>
                            <AppText style={styles.warnText}>{supportNoAgentMessage}</AppText>
                            <TouchableOpacity onPress={openSupportChat} style={styles.warnAction}>
                              <AppText style={styles.warnActionText}>
                                {ui('Switch to Support Chat')}
                              </AppText>
                            </TouchableOpacity>
                          </View>
                        ) : null}
                      </>
                    ) : null}

                    {/* Marketing Team (Teammates) Section */}
                    {policy?.canCallTeammates ? (
                      <View style={styles.bossSection}>
                        <View style={styles.bossHeaderRow}>
                          <AppText style={styles.bossSectionTitle}>
                            MARKETING TEAM ({teammateContacts.length})
                          </AppText>
                          <TouchableOpacity onPress={loadDirectory}>
                            <AppText style={styles.refreshLinkText}>Refresh</AppText>
                          </TouchableOpacity>
                        </View>

                        <View style={[styles.searchBox, { marginBottom: 8 }]}>
                          <Icon name="search-outline" size={15} color={colors.muted} />
                          <TextInput
                            value={search}
                            onChangeText={setSearch}
                            placeholder="Search marketing teammate or state…"
                            placeholderTextColor={colors.muted}
                            style={styles.searchInput}
                          />
                        </View>

                        {loading && teammateContacts.length === 0 ? (
                          <ActivityIndicator
                            size="small"
                            color={colors.blue}
                            style={styles.bossLoading}
                          />
                        ) : teammateContacts.length === 0 ? (
                          <View style={styles.bossEmptyBox}>
                            <AppText style={styles.bossEmptyText}>
                              No other marketing agents found right now.
                            </AppText>
                          </View>
                        ) : (
                          teammateContacts.map((member) => {
                            const territory = formatTerritory(member);
                            const isCalling = callingId === member.id;
                            const memberMeta = territory
                              ? `${member.role_label || 'Marketing Agent'} • ${territory}`
                              : member.role_label || 'Marketing Agent';
                            const callBtnLabel = isCalling ? 'Calling…' : 'Call';
                            return (
                              <View key={member.id} style={styles.bossRow}>
                                <View
                                  style={[
                                    styles.smallDot,
                                    { backgroundColor: member.online ? '#10b981' : '#cbd5e1' },
                                  ]}
                                />
                                <View style={styles.flexOne}>
                                  <AppText style={styles.contactName} numberOfLines={1}>
                                    {member.full_name}
                                  </AppText>
                                  <AppText style={styles.contactMeta} numberOfLines={1}>
                                    {memberMeta}
                                  </AppText>
                                </View>
                                <TouchableOpacity
                                  activeOpacity={0.85}
                                  disabled={isCalling}
                                  onPress={() => handleDirectCall(member)}
                                  style={[styles.teammateCallBtn, isCalling && styles.disabledBtn]}
                                >
                                  <Icon name="call" size={13} color={colors.white} />
                                  <AppText style={styles.callPillText}>{callBtnLabel}</AppText>
                                </TouchableOpacity>
                              </View>
                            );
                          })
                        )}
                      </View>
                    ) : null}

                    {/* Supervising Boss Section */}
                    {policy?.canCallBoss ? (
                      <View style={styles.bossSection}>
                        <View style={styles.bossHeaderRow}>
                          <AppText style={styles.bossSectionTitle}>
                            CALL YOUR BOSS / SUPERVISOR
                          </AppText>
                          <TouchableOpacity onPress={loadDirectory}>
                            <AppText style={styles.refreshLinkText}>Refresh</AppText>
                          </TouchableOpacity>
                        </View>
                        {loading ? (
                          <ActivityIndicator
                            size="small"
                            color={colors.blue}
                            style={styles.bossLoading}
                          />
                        ) : bossContacts.length === 0 ? (
                          <View style={styles.bossEmptyBox}>
                            <AppText style={styles.bossEmptyText}>
                              No supervising admin or landlord is linked yet.
                            </AppText>
                          </View>
                        ) : (
                          bossContacts.map((boss) => {
                            const territory = formatTerritory(boss);
                            const isCalling = callingId === boss.id;
                            const bossMeta = territory
                              ? `${boss.role_label} • ${territory}`
                              : boss.role_label;
                            const callBtnLabel = isCalling ? 'Calling…' : 'Call';
                            return (
                              <View key={boss.id} style={styles.bossRow}>
                                <View
                                  style={[
                                    styles.smallDot,
                                    { backgroundColor: boss.online ? '#10b981' : '#cbd5e1' },
                                  ]}
                                />
                                <View style={styles.flexOne}>
                                  <AppText style={styles.contactName} numberOfLines={1}>
                                    {boss.full_name}
                                  </AppText>
                                  <AppText style={styles.contactMeta} numberOfLines={1}>
                                    {bossMeta}
                                  </AppText>
                                </View>
                                <TouchableOpacity
                                  activeOpacity={0.85}
                                  disabled={isCalling}
                                  onPress={() => handleDirectCall(boss)}
                                  style={[styles.bossCallBtn, isCalling && styles.disabledBtn]}
                                >
                                  <Icon name="call" size={13} color={colors.white} />
                                  <AppText style={styles.callPillText}>{callBtnLabel}</AppText>
                                </TouchableOpacity>
                              </View>
                            );
                          })
                        )}
                      </View>
                    ) : null}
                  </>
                )}
              </ScrollView>
            </View>
          </View>
        )}
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  flexOne: {
    flex: 1,
  },
  darkTrigger: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderColor: 'rgba(255, 255, 255, 0.24)',
    borderRadius: 12,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    position: 'relative',
    width: 38,
  },
  lightTrigger: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    position: 'relative',
    width: 40,
  },
  compactTrigger: {
    height: 36,
    width: 36,
  },
  liveDot: {
    borderRadius: 5,
    borderWidth: 1.5,
    height: 9,
    position: 'absolute',
    right: -2,
    top: -2,
    width: 9,
    backgroundColor: '#10b981',
  },
  liveDotDark: {
    borderColor: colors.navy,
  },
  liveDotLight: {
    borderColor: colors.white,
  },
  missedBadge: {
    alignItems: 'center',
    backgroundColor: '#dc2626',
    borderColor: colors.white,
    borderRadius: 9,
    borderWidth: 1.5,
    height: 18,
    justifyContent: 'center',
    minWidth: 18,
    paddingHorizontal: 4,
    position: 'absolute',
    right: -5,
    top: -5,
  },
  missedBadgeText: {
    color: colors.white,
    fontFamily: typography.bold,
    fontSize: 10,
    lineHeight: 13,
  },
  sheetBackdrop: {
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '86%',
    paddingBottom: 24,
  },
  sheetHeader: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  viewSwitcherWrap: {
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  viewSwitcher: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 6,
    padding: 4,
  },
  viewSwitchTab: {
    alignItems: 'center',
    borderRadius: 9,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  viewSwitchTabActive: {
    backgroundColor: colors.white,
  },
  viewSwitchText: {
    color: colors.muted,
    fontFamily: typography.semibold,
    fontSize: typeScale.xs,
  },
  viewSwitchTextActive: {
    color: colors.ink,
    fontFamily: typography.bold,
  },
  inlineMissedPill: {
    backgroundColor: '#dc2626',
    borderRadius: 9,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  inlineMissedPillText: {
    color: colors.white,
    fontFamily: typography.bold,
    fontSize: 10,
  },
  sheetBody: {
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 16,
  },
  recordsScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  recordsContainer: {
    gap: 10,
  },
  summaryStrip: {
    flexDirection: 'row',
    gap: 8,
  },
  summaryTile: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 8,
  },
  summaryTileMissed: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  summaryTileAnswered: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  summaryLabel: {
    color: colors.muted,
    fontFamily: typography.semibold,
    fontSize: 11,
  },
  summaryLabelMissed: {
    color: '#b91c1c',
  },
  summaryLabelAnswered: {
    color: '#15803d',
  },
  summaryValue: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 16,
    marginTop: 2,
  },
  summaryValueMissed: {
    color: '#b91c1c',
  },
  summaryValueAnswered: {
    color: '#15803d',
  },
  recordsList: {
    gap: 8,
  },
  recordCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  recordCardMissed: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  recordTopRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  recordBadgeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  statusBadge: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  statusBadgeText: {
    fontFamily: typography.bold,
    fontSize: 10,
  },
  recordTimeText: {
    color: colors.muted,
    fontSize: 11,
  },
  recordActionsCol: {
    alignItems: 'flex-end',
    gap: 6,
  },
  callBackBtn: {
    alignItems: 'center',
    backgroundColor: '#059669',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  callBackBtnText: {
    color: colors.white,
    fontFamily: typography.semibold,
    fontSize: 11,
  },
  detailsToggleBtn: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  detailsToggleText: {
    color: colors.blue,
    fontFamily: typography.semibold,
    fontSize: 11,
  },
  recordDetailsBox: {
    backgroundColor: '#f8fafc',
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    gap: 3,
    padding: 10,
  },
  detailLine: {
    color: colors.text,
    fontSize: 12,
  },
  headerTitleRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    paddingRight: 10,
  },
  headerIconBadge: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue || '#eff6ff',
    borderRadius: 12,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  modalTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: typeScale.base,
  },
  modalSubtitle: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    marginTop: 1,
  },
  closeBtn: {
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  actionCard: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 13,
  },
  callSupportCard: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  actionIconBox: {
    alignItems: 'center',
    borderRadius: 10,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  actionTitle: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: typeScale.sm,
  },
  actionSubtitle: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    marginTop: 2,
  },
  warnBox: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 12,
  },
  warnText: {
    color: '#92400e',
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
  },
  warnAction: {
    marginTop: 8,
  },
  warnActionText: {
    color: '#78350f',
    fontFamily: typography.bold,
    fontSize: typeScale.xs,
    textDecorationLine: 'underline',
  },
  bossSection: {
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 6,
    paddingTop: 12,
  },
  bossHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  bossSectionTitle: {
    color: colors.muted,
    fontFamily: typography.bold,
    fontSize: 11,
    letterSpacing: 0.6,
  },
  refreshLinkText: {
    color: colors.blue,
    fontFamily: typography.semibold,
    fontSize: 12,
  },
  bossLoading: {
    paddingVertical: 16,
  },
  bossEmptyBox: {
    backgroundColor: '#f8fafc',
    borderRadius: radius.md,
    padding: 12,
  },
  bossEmptyText: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    textAlign: 'center',
  },
  bossRow: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  teammateCallBtn: {
    alignItems: 'center',
    backgroundColor: '#059669',
    borderRadius: 10,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bossCallBtn: {
    alignItems: 'center',
    backgroundColor: '#4f46e5',
    borderRadius: 10,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  smallDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  directorySafe: {
    backgroundColor: colors.white,
    flex: 1,
  },
  directoryHeader: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterBlock: {
    backgroundColor: '#f8fafc',
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  searchBox: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 10,
    height: 42,
  },
  searchInput: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.regular,
    fontSize: typeScale.sm,
    paddingVertical: 0,
  },
  refreshIconBtn: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  filterControlsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  tabsRow: {
    gap: 6,
    paddingRight: 4,
  },
  tabChip: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  tabChipActive: {
    backgroundColor: colors.blue,
    borderColor: colors.blue,
  },
  tabChipMissed: {
    backgroundColor: '#dc2626',
    borderColor: '#dc2626',
  },
  tabChipText: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: typeScale.xs,
  },
  tabChipTextActive: {
    color: colors.white,
  },
  onlineToggle: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  onlineToggleActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  onlineToggleDot: {
    borderRadius: 3.5,
    height: 7,
    width: 7,
  },
  onlineToggleText: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: typeScale.xs,
  },
  onlineToggleTextActive: {
    color: colors.white,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  contactRow: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatarCircle: {
    alignItems: 'center',
    backgroundColor: '#e2e8f0',
    borderRadius: 21,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  avatarText: {
    color: '#334155',
    fontFamily: typography.bold,
    fontSize: typeScale.sm,
  },
  presenceDot: {
    borderColor: colors.white,
    borderRadius: 6,
    borderWidth: 2,
    bottom: -1,
    height: 12,
    position: 'absolute',
    right: -1,
    width: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactNameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  contactName: {
    color: colors.ink,
    flexShrink: 1,
    fontFamily: typography.semibold,
    fontSize: typeScale.sm,
  },
  supervisorTag: {
    backgroundColor: '#eef2ff',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  supervisorTagText: {
    color: '#4338ca',
    fontFamily: typography.semibold,
    fontSize: 10,
  },
  contactMeta: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    marginTop: 2,
  },
  presenceLabel: {
    fontFamily: typography.semibold,
    fontSize: 11,
    marginTop: 2,
  },
  callPill: {
    alignItems: 'center',
    backgroundColor: '#059669',
    borderRadius: 10,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  callPillText: {
    color: colors.white,
    fontFamily: typography.semibold,
    fontSize: typeScale.xs,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    marginHorizontal: 16,
    marginTop: 10,
    padding: 10,
    borderRadius: radius.md,
  },
  errorText: {
    color: '#b91c1c',
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
  },
  centerBox: {
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 36,
  },
  emptyTitle: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: typeScale.sm,
    marginTop: 6,
  },
  centerText: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    textAlign: 'center',
  },
});

export default HeadphoneSupportButton;
