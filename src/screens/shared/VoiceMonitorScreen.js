import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import TextInput from '../../components/common/AppTextInput';
import Toast from 'react-native-toast-message';
import { useFocusEffect } from '@react-navigation/native';
import {
  InfoRow,
  PremiumCard,
  PremiumCenter,
  PremiumHero,
  PremiumListScreen,
  StatusPill,
} from '../../components/common/PremiumLayout';
import { voiceMonitorService } from '../../services/voiceMonitorService';
import { getErrorMessage, pickList } from '../../utils/http';
import { colors, radius, typography, typeScale } from '../../theme';
import AppText from '../../components/common/AppText';

const formatTime = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
};

const STATUS_COLORS = {
  completed: colors.success,
  ringing: colors.blue,
  in_progress: colors.success,
  no_answer: colors.danger,
  busy: colors.danger,
  failed: colors.danger,
  cancelled: colors.muted,
};

const DUTY_STATUS_COLORS = {
  offline: colors.muted,
  on_duty: colors.success,
  on_call: colors.blue,
};

const DUTY_LABELS = {
  offline: 'Offline',
  on_duty: 'On duty',
  on_call: 'On a call',
};

const VoiceMonitorScreen = () => {
  useInterfaceLanguage();
  const [tab, setTab] = useState('summary');
  const [summary, setSummary] = useState(null);
  const [deskScope, setDeskScope] = useState(null);
  const [log, setLog] = useState([]);
  const [callbacks, setCallbacks] = useState([]);
  const [dutyStatus, setDutyStatus] = useState([]);
  const [callSidInput, setCallSidInput] = useState('');
  const [callContext, setCallContext] = useState(null);
  const [department, setDepartment] = useState('finance');
  const [note, setNote] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [liveStatus, setLiveStatus] = useState('idle');
  const [loading, setLoading] = useState(true);

  const autoPopulateCallSid = useCallback((sourceLog) => {
    const activeCall = Array.isArray(sourceLog)
      ? sourceLog.find((item) => ['in-progress', 'queued', 'ringing'].includes(String(item?.status || '').toLowerCase()))
      : null;
    const detectedSid = String(activeCall?.call_sid || '').trim();
    if (detectedSid && !callSidInput) {
      setCallSidInput(detectedSid);
      return detectedSid;
    }
    return detectedSid || callSidInput;
  }, [callSidInput]);

  const resolveCallContext = useCallback(async (requestedCallSid) => {
    const sid = String(requestedCallSid || '').trim();
    if (!sid) {
      Toast.show({
        type: 'info',
        text1: ui("Missing call SID"),
        text2: ui("Paste the active agent call SID before loading the call context."),
      });
      return;
    }

    try {
      const response = await voiceMonitorService.callContext(sid);
      if (!response?.success) {
        throw new Error(response?.message || 'Could not resolve the current call.');
      }
      setCallSidInput(sid);
      setCallContext(response.data || null);
      setLiveStatus('live');
      Toast.show({
        type: 'success',
        text1: ui("Call context loaded"),
        text2: ui("The active caller is now ready for escalation actions."),
      });
    } catch (error) {
      setLiveStatus('stale');
      setCallContext(null);
      Toast.show({
        type: 'error',
        text1: ui("Call context unavailable"),
        text2: getErrorMessage(error, 'The active call could not be resolved.'),
      });
    }
  }, []);

  const runEscalationAction = useCallback(async (action) => {
    const sid = String(callSidInput || '').trim();
    if (!sid) {
      Toast.show({
        type: 'info',
        text1: ui("No call SID available"),
        text2: ui("Enter the active agent call SID to continue."),
      });
      return;
    }

    const normalizedDepartment = String(department || '').trim();
    if (['consult', 'transfer'].includes(action) && !normalizedDepartment) {
      Toast.show({
        type: 'info',
        text1: ui("No department selected"),
        text2: ui("Choose a valid escalation department before acting on the call."),
      });
      return;
    }

    setActionBusy(true);
    try {
      const response = await voiceMonitorService.escalate({
        callSid: sid,
        action,
        department: normalizedDepartment,
        note: String(note || '').trim() || undefined,
      });

      if (!response?.success) {
        throw new Error(response?.message || 'The escalation action failed.');
      }

      Toast.show({
        type: 'success',
        text1: ui("Action sent"),
        text2: ui("The {value0} action was accepted by the voice desk.", {value0: (ui(action))}),
      });
      if (action === 'cancel-consult' || action === 'transfer') {
        setCallContext(null);
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: ui("Escalation failed"),
        text2: getErrorMessage(error, 'The remote voice desk rejected the action.'),
      });
    } finally {
      setActionBusy(false);
    }
  }, [callContext, callSidInput, department, note]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // allSettled, not silent catches: a failed call must surface a message
      // instead of quietly pretending the numbers are zero.
      const [summaryResult, deskScopeResult, logResult, callbacksResult, dutyStatusResult] = await Promise.allSettled([
        voiceMonitorService.summary(),
        voiceMonitorService.deskScope(),
        voiceMonitorService.callLog(),
        voiceMonitorService.callbacks(),
        voiceMonitorService.dutyStatus(),
      ]);

      if (summaryResult.status === 'fulfilled') {
        setSummary(summaryResult.value?.data || null);
      }
      if (deskScopeResult.status === 'fulfilled') {
        setDeskScope(deskScopeResult.value?.data || null);
      }
      if (logResult.status === 'fulfilled') {
        const nextLog = pickList(logResult.value, ['data']);
        setLog(nextLog);
        const detectedSid = autoPopulateCallSid(nextLog);
        if (detectedSid && !callContext) {
          try {
            const contextResponse = await voiceMonitorService.callContext(detectedSid);
            if (contextResponse?.success) {
              setCallContext(contextResponse.data || null);
            }
          } catch {
            // best effort; manual retry still works when the SID is stale
          }
        }
      }
      if (callbacksResult.status === 'fulfilled') {
        setCallbacks(pickList(callbacksResult.value, ['data']));
      }
      if (dutyStatusResult.status === 'fulfilled') {
        setDutyStatus(Array.isArray(dutyStatusResult.value?.data) ? dutyStatusResult.value.data : []);
      }

      const failure = [summaryResult, deskScopeResult, logResult, callbacksResult, dutyStatusResult].find(
        (result) => result.status === 'rejected'
      );
      if (failure) {
        Toast.show({
          type: 'error',
          text1: ui("Could not load all voice data"),
          text2: getErrorMessage(failure.reason, 'Some panels may be incomplete.'),
        });
      }
    } finally {
      setLoading(false);
    }
  }, [autoPopulateCallSid, callContext]);

  useEffect(() => {
    if (!callSidInput) {
      setLiveStatus('idle');
      return undefined;
    }

    let cancelled = false;
    const poll = async () => {
      const sid = String(callSidInput || '').trim();
      if (!sid) return;
      try {
        const contextResponse = await voiceMonitorService.callContext(sid);
        if (!cancelled && contextResponse?.success) {
          setCallContext(contextResponse.data || null);
          setLiveStatus('live');
        }
      } catch {
        if (!cancelled) setLiveStatus('stale');
      }
    };

    poll();
    const timer = setInterval(poll, 15000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [callSidInput]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) {
    return <PremiumCenter loading title={ui("Loading voice console")} />;
  }

  const tabs = [
    { key: 'summary', label: ui("Summary") },
    { key: 'calls', label: ui("Call log") },
    { key: 'callbacks', label: ui("Callbacks") },
  ];

  const header = (
    <>
      <PremiumHero
        eyebrow={ui("Voice console")}
        title={ui("Live voice desk")}
        subtitle={ui("Support queue scope, callback requests and live call counters for the active support line.")}
        icon="call-outline"
      />
      <View style={styles.tabRow}>
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              activeOpacity={0.85}
              onPress={() => setTab(t.key)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <AppText style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</AppText>
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );

  if (tab === 'summary') {
    const metric = (label, value) => (
      <View style={[styles.metric, styles.metricAccent]}>
        <AppText style={styles.metricValue}>{value ?? 0}</AppText>
        <AppText style={styles.metricLabel}>{label}</AppText>
      </View>
    );
    return (
      <View style={styles.screenView}>
        {header}
        <View style={styles.metricRow}>
          {metric('Calls today', summary?.callsToday)}
          {metric('Callback requests', summary?.callbackRequests)}
          {metric('Open escalations', summary?.openEscalations)}
        </View>
        <PremiumCard>
          <AppText style={styles.note}>{ui("Support roles can review the live queue assignment and the current call data from this desk.")}</AppText>
          {deskScope ? (
            <View style={styles.scopeList}>
              <InfoRow icon="people-outline" label={ui("Queue")} value={deskScope.queue || '—'} />
              <InfoRow icon="toggle-outline" label={ui("Geo routing")} value={deskScope.geo_enabled ? 'Enabled' : 'Single queue'} />
              <InfoRow icon="location-outline" label={ui("State")} value={deskScope.scope?.state || '—'} />
              <InfoRow icon="map-outline" label={ui("LGA")} value={deskScope.scope?.lga || '—'} />
              <InfoRow icon="time-outline" label={ui("Waiting room")} value={deskScope.waiting_room || '—'} />
            </View>
          ) : null}
        </PremiumCard>

        <PremiumCard>
          <View style={styles.sectionHeaderRow}>
            <AppText style={styles.sectionTitle}>{ui("Agents on duty")}</AppText>
          </View>
          {dutyStatus.length === 0 ? (
            <AppText style={styles.emptyHint}>{ui("No agent lines are currently reporting their duty status.")}</AppText>
          ) : (
            <View style={styles.chipRow}>
              {dutyStatus.map((agent) => (
                <View key={agent.identity} style={styles.dutyChip}>
                  <AppText style={styles.dutyIdentity}>{agent.identity}</AppText>
                  <StatusPill
                    label={DUTY_LABELS[agent.state] || agent.state}
                    color={DUTY_STATUS_COLORS[agent.state] || colors.muted}
                  />
                </View>
              ))}
            </View>
          )}
        </PremiumCard>

        <PremiumCard>
          <View style={styles.sectionHeaderRow}>
            <AppText style={styles.sectionTitle}>{ui("Live escalation controls")}</AppText>
            <View style={[styles.liveBadge, liveStatus === 'live' ? styles.liveBadgeActive : styles.liveBadgeIdle]}>
              <AppText style={styles.liveBadgeText}>{liveStatus === 'live' ? 'Live' : liveStatus === 'stale' ? 'Stale' : 'Idle'}</AppText>
            </View>
          </View>
          <TextInput
            value={callSidInput}
            onChangeText={setCallSidInput}
            placeholder={ui("Auto-detected active agent call SID")}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />
          <View style={styles.inlineActionRow}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => resolveCallContext(callSidInput || autoPopulateCallSid(log))}
              style={[styles.primaryButton, styles.inlineButton]}
            >
              <AppText style={styles.primaryButtonText}>{ui("Load call")}</AppText>
            </TouchableOpacity>
          </View>

          {callContext ? (
            <>
              <View style={styles.scopeList}>
                <InfoRow icon="person-outline" label={ui("Caller")} value={callContext.callerNumber || '—'} />
                <InfoRow icon="alert-circle-outline" label={ui("Source")} value={callContext.source || '—'} />
                <InfoRow icon="grid-outline" label={ui("Room")} value={callContext.roomName || '—'} />
              </View>

              <AppText style={styles.sectionMeta}>{ui("Current department")}</AppText>
              <TextInput
                value={department}
                onChangeText={setDepartment}
                placeholder={ui("finance")}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
              />

              <AppText style={styles.sectionMeta}>{ui("Escalation note")}</AppText>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder={ui("Optional note for the escalation")}
                autoCapitalize="sentences"
                autoCorrect={false}
                multiline
                style={[styles.input, styles.noteInput]}
              />

              <View style={styles.actionGrid}>
                <TouchableOpacity
                  disabled={actionBusy}
                  activeOpacity={0.85}
                  onPress={() => runEscalationAction('consult')}
                  style={[styles.primaryButton, styles.actionButton]}
                >
                  <AppText style={styles.primaryButtonText}>{ui("Consult")}</AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={actionBusy}
                  activeOpacity={0.85}
                  onPress={() => runEscalationAction('transfer')}
                  style={[styles.secondaryButton, styles.actionButton]}
                >
                  <AppText style={styles.secondaryButtonText}>{ui("Transfer")}</AppText>
                </TouchableOpacity>
              </View>

              <View style={styles.actionGrid}>
                <TouchableOpacity
                  disabled={actionBusy}
                  activeOpacity={0.85}
                  onPress={() => runEscalationAction('cancel-consult')}
                  style={[styles.secondaryButton, styles.actionButton]}
                >
                  <AppText style={styles.secondaryButtonText}>{ui("Cancel consult")}</AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={actionBusy}
                  activeOpacity={0.85}
                  onPress={() => runEscalationAction('consult-up')}
                  style={[styles.primaryButton, styles.actionButton]}
                >
                  <AppText style={styles.primaryButtonText}>{ui("Hand-up consult")}</AppText>
                </TouchableOpacity>
              </View>

              <View style={styles.actionGrid}>
                <TouchableOpacity
                  disabled={actionBusy}
                  activeOpacity={0.85}
                  onPress={() => runEscalationAction('transfer-up')}
                  style={[styles.secondaryButton, styles.actionButton]}
                >
                  <AppText style={styles.secondaryButtonText}>{ui("Transfer up")}</AppText>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <AppText style={styles.emptyHint}>{ui("No active call is currently detected. Open the call log or paste the current agent call SID to attach a live call.")}</AppText>
          )}
        </PremiumCard>
      </View>
    );
  }

  if (tab === 'calls') {
    return (
      <PremiumListScreen
        data={log}
        keyExtractor={(item, index) => `${item.call_sid}-${index}`}
        refreshing={false}
        onRefresh={load}
        header={header}
        emptyTitle={ui("No calls recorded")}
        emptyMessage={ui("Calls on the support line will appear here.")}
        emptyIcon="call-outline"
        renderItem={({ item }) => (
          <PremiumCard>
            <View style={styles.cardTop}>
              <View style={styles.cardCopy}>
                <AppText style={styles.cardTitle}>{item.direction === 'outbound' ? 'Outbound' : 'Inbound'} · {item.source || 'line'}</AppText>
                <AppText style={styles.cardMeta}>
                  {item.from_number || '—'} → {item.to_number || '—'}
                </AppText>
              </View>
              <StatusPill label={item.status} color={STATUS_COLORS[item.status] || colors.blue} />
            </View>
            <InfoRow icon="timer-outline" label={ui("Duration (s)")} value={String(item.duration_sec ?? 0)} />
            <InfoRow icon="time-outline" label={ui("When")} value={formatTime(item.created_at)} />
            {item.jurisdiction_state ? (
              <InfoRow icon="location-outline" label={ui("Jurisdiction")} value={[item.jurisdiction_state, item.jurisdiction_lga].filter(Boolean).join(' · ') || item.jurisdiction_state} />
            ) : null}
          </PremiumCard>
        )}
      />
    );
  }

  return (
    <PremiumListScreen
      data={callbacks}
      keyExtractor={(item) => String(item.id)}
      refreshing={false}
      onRefresh={load}
      header={header}
      emptyTitle={ui("No callback requests")}
      emptyMessage={ui("After-hours callback requests will appear here.")}
      emptyIcon="chatbubble-outline"
      renderItem={({ item }) => (
        <PremiumCard>
          <View style={styles.cardTop}>
            <View style={styles.cardCopy}>
              <AppText style={styles.cardTitle}>{item.phone_number || ui("Callback #{value0}", {value0: (item.id)})}</AppText>
              <AppText style={styles.cardMeta}>{item.source || 'line'}</AppText>
            </View>
          </View>
          {item.call_sid ? <InfoRow icon="call-outline" label={ui("Call SID")} value={item.call_sid} /> : null}
          {item.jurisdiction_state ? (
            <InfoRow icon="location-outline" label={ui("Jurisdiction")} value={[item.jurisdiction_state, item.jurisdiction_lga].filter(Boolean).join(' · ') || item.jurisdiction_state} />
          ) : null}
          <InfoRow icon="time-outline" label={ui("Requested")} value={formatTime(item.created_at)} />
        </PremiumCard>
      )}
    />
  );
};

const styles = StyleSheet.create({
  screenView: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: 18,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  tab: {
    flex: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingVertical: 9,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  tabActive: {
    backgroundColor: colors.blue,
    borderColor: colors.blue,
  },
  tabText: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: typeScale.xs,
    lineHeight: 18,
  },
  tabTextActive: {
    color: colors.white,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dutyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  dutyIdentity: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: typeScale.xs,
    lineHeight: 18,
  },
  sectionTitle: {
    fontFamily: typography.semibold,
    fontSize: typeScale.base,
    lineHeight: 24,
    color: colors.text,
  },
  liveBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  liveBadgeActive: {
    backgroundColor: colors.success,
  },
  liveBadgeIdle: {
    backgroundColor: colors.muted,
  },
  liveBadgeText: {
    color: colors.white,
    fontFamily: typography.semibold,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  sectionMeta: {
    fontFamily: typography.medium,
    fontSize: typeScale.xs,
    lineHeight: 18,
    color: colors.muted,
    marginTop: 12,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: typeScale.sm,
    lineHeight: 20,
    color: colors.text,
    marginBottom: 10,
  },
  noteInput: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  inlineActionRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  inlineButton: {
    width: '100%',
  },
  primaryButton: {
    backgroundColor: colors.blue,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: colors.white,
    fontFamily: typography.semibold,
    fontSize: typeScale.xs,
    lineHeight: 18,
  },
  secondaryButton: {
    backgroundColor: colors.muted,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: colors.white,
    fontFamily: typography.semibold,
    fontSize: typeScale.xs,
    lineHeight: 18,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  metric: {
    flex: 1,
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  metricAccent: {
    backgroundColor: colors.surfaceBlue,
    borderColor: colors.blue,
  },
  metricValue: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: typeScale.lg,
    lineHeight: 28,
  },
  metricLabel: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  cardTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardCopy: {
    flex: 1,
  },
  cardTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: typeScale.base,
    lineHeight: 24,
    textTransform: 'capitalize',
  },
  cardMeta: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginTop: 2,
  },
  note: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginBottom: 12,
  },
  emptyHint: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: typeScale.reading,
    lineHeight: 22,
    marginTop: 8,
  },
  scopeList: {
    marginTop: 6,
  },
});

export default VoiceMonitorScreen;
