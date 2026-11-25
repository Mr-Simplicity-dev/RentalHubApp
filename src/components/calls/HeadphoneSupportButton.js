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
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import AppText from '../common/AppText';
import { AuthContext } from '../../context/AuthContext';
import { useRealtime } from '../../context/RealtimeContext';
import { useAccessibilityPreferences } from '../../hooks/useAccessibilityPreferences';
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

const HeadphoneSupportButton = ({ variant = 'dark', style }) => {
  useInterfaceLanguage();
  const navigation = useNavigation();
  const { user, isAuthenticated } = useContext(AuthContext);
  const { connected, inviteCall, inviteSupportCall } = useRealtime();
  const { hitSlop } = useAccessibilityPreferences();

  const [open, setOpen] = useState(false);
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

  useEffect(() => {
    if (!open) return;
    loadDirectory();
  }, [open, loadDirectory]);

  const meta = useMemo(() => {
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
  }, [policy?.mode]);

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
      await inviteSupportCall();
      setOpen(false);
    } catch (err) {
      if (err?.code === 'NO_AGENT') {
        setSupportNoAgentMessage(
          err?.message ||
            ui('All support agents are currently busy or offline. Try live chat instead.')
        );
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
  const isLight = variant === 'light';

  const renderDirectoryContact = ({ item }) => {
    const territory = formatTerritory(item);
    const isCalling = callingId === item.id;
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
            {item.role_label || item.user_type}
            {territory ? ` • ${territory}` : ''}
          </AppText>
          <AppText
            style={[
              styles.presenceLabel,
              { color: item.online ? '#059669' : colors.muted },
            ]}
          >
            {item.online ? ui('Online now') : ui('Offline')}
          </AppText>
        </View>
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={isCalling}
          onPress={() => handleDirectCall(item)}
          style={[styles.callPill, isCalling && styles.disabledBtn]}
        >
          <Icon name="call" size={14} color={colors.white} />
          <AppText style={styles.callPillText}>
            {isCalling ? ui('Calling…') : ui('Call')}
          </AppText>
        </TouchableOpacity>
      </View>
    );
  };

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
          style,
        ]}
      >
        <Icon
          name="headset-outline"
          size={isLight ? 21 : 20}
          color={isLight ? colors.navy : colors.white}
        />
        {connected ? (
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
                  ListEmptyComponent={
                    <View style={styles.centerBox}>
                      <Icon name="people-outline" size={32} color={colors.muted} />
                      <AppText style={styles.emptyTitle}>{ui('No matching users found')}</AppText>
                      <AppText style={styles.centerText}>
                        {ui('Try clearing your search or turning off the Online filter.')}
                      </AppText>
                    </View>
                  }
                />
              )}
            </KeyboardAvoidingView>
          </SafeAreaView>
        ) : (
          /* Bottom Sheet Modal for Tenant, Landlord, Property Agent, Marketing Agent & LGA Admins */
          <View style={styles.sheetBackdrop}>
            <TouchableOpacity
              style={styles.flexOne}
              activeOpacity={1}
              onPress={() => setOpen(false)}
            />
            <View style={styles.sheetCard}>
              <View style={styles.sheetHeader}>
                <View style={styles.headerTitleRow}>
                  <View style={styles.headerIconBadge}>
                    <Icon name="headset" size={18} color={colors.blue} />
                  </View>
                  <View style={styles.flexOne}>
                    <AppText style={styles.modalTitle}>{meta.title}</AppText>
                    <AppText style={styles.modalSubtitle}>
                      {supportOnlineCount > 0
                        ? ui('{value0} support online now', { value0: supportOnlineCount })
                        : meta.subtitle}
                    </AppText>
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

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.sheetBody}
              >
                {/* Support Actions */}
                {policy?.canChatSupport ? (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={openSupportChat}
                    style={styles.actionCard}
                  >
                    <View style={[styles.actionIconBox, { backgroundColor: '#dbeafe' }]}>
                      <Icon name="chatbubbles-outline" size={20} color="#1d4ed8" />
                    </View>
                    <View style={styles.flexOne}>
                      <AppText style={styles.actionTitle}>{ui('Chat with Support')}</AppText>
                      <AppText style={styles.actionSubtitle}>
                        {ui('Open live support chat & tickets')}
                      </AppText>
                    </View>
                    <Icon name="chevron-forward" size={18} color={colors.muted} />
                  </TouchableOpacity>
                ) : null}

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
                      <AppText style={styles.actionTitle}>
                        {callingId === 'support' ? ui('Connecting Call…') : ui('Call Support')}
                      </AppText>
                      <AppText style={[styles.actionSubtitle, { color: '#047857' }]}>
                        {connected
                          ? ui('Start an instant voice call')
                          : ui('Connecting voice line…')}
                      </AppText>
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

                {/* Supervisor / Boss Section for Property Agents, Marketing Agents & LGA Admins */}
                {policy?.canCallBoss ? (
                  <View style={styles.bossSection}>
                    <View style={styles.bossHeaderRow}>
                      <AppText style={styles.bossSectionTitle}>
                        {ui('CALL YOUR BOSS / SUPERVISOR')}
                      </AppText>
                      <TouchableOpacity onPress={loadDirectory}>
                        <Icon name="refresh-outline" size={16} color={colors.muted} />
                      </TouchableOpacity>
                    </View>

                    {error ? <AppText style={styles.errorText}>{error}</AppText> : null}

                    {loading && bossContacts.length === 0 ? (
                      <View style={styles.bossLoading}>
                        <ActivityIndicator size="small" color={colors.blue} />
                      </View>
                    ) : bossContacts.length === 0 ? (
                      <View style={styles.bossEmptyBox}>
                        <AppText style={styles.bossEmptyText}>
                          {ui('No supervisor is linked to your account yet. You can reach Support above anytime.')}
                        </AppText>
                      </View>
                    ) : (
                      bossContacts.map((boss) => (
                        <View key={String(boss.id)} style={styles.bossRow}>
                          <View style={styles.flexOne}>
                            <View style={styles.contactNameRow}>
                              <View
                                style={[
                                  styles.smallDot,
                                  { backgroundColor: boss.online ? '#10b981' : '#cbd5e1' },
                                ]}
                              />
                              <AppText style={styles.contactName} numberOfLines={1}>
                                {boss.full_name}
                              </AppText>
                            </View>
                            <AppText style={styles.contactMeta} numberOfLines={1}>
                              {boss.role_label || boss.user_type}
                              {formatTerritory(boss) ? ` • ${formatTerritory(boss)}` : ''}
                            </AppText>
                          </View>
                          <TouchableOpacity
                            activeOpacity={0.85}
                            disabled={callingId === boss.id}
                            onPress={() => handleDirectCall(boss)}
                            style={[
                              styles.bossCallBtn,
                              callingId === boss.id && styles.disabledBtn,
                            ]}
                          >
                            <Icon name="call" size={13} color={colors.white} />
                            <AppText style={styles.callPillText}>
                              {callingId === boss.id ? ui('Calling…') : ui('Call')}
                            </AppText>
                          </TouchableOpacity>
                        </View>
                      ))
                    )}
                  </View>
                ) : null}
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
    backgroundColor: colors.navySoft,
    borderRadius: 19,
    height: 38,
    justifyContent: 'center',
    position: 'relative',
    width: 38,
  },
  lightTrigger: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 21,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    position: 'relative',
    width: 42,
  },
  liveDot: {
    borderRadius: 4,
    borderWidth: 1.5,
    bottom: 5,
    height: 8,
    position: 'absolute',
    right: 5,
    width: 8,
    backgroundColor: '#10b981',
  },
  liveDotDark: {
    borderColor: colors.navySoft,
  },
  liveDotLight: {
    borderColor: colors.white,
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
    maxHeight: '82%',
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
  sheetBody: {
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 14,
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
    paddingVertical: 48,
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
