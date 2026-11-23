import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { useFocusEffect } from '@react-navigation/native';
import {
  InfoRow,
  PremiumButton,
  PremiumCard,
  PremiumCenter,
  PremiumHero,
} from '../../components/common/PremiumLayout';
import { surveyAnalyticsService } from '../../services/surveyAnalyticsService';
import { getErrorMessage } from '../../utils/http';
import { formatDisplayValue } from '../../utils/display';
import { colors, radius, typography, typeScale } from '../../theme';
import AppText from '../../components/common/AppText';

const mmss = (seconds) => {
  const s = Number(seconds || 0);
  const mins = Math.floor(s / 60);
  const secs = Math.round(s % 60);
  return `${mins}m ${String(secs).padStart(2, '0')}s`;
};

const SurveyAnalyticsScreen = () => {
  useInterfaceLanguage();
  const [tab, setTab] = useState('tenant');
  const [selectedResponseId,setSelectedResponseId]=useState(null);
  const [data, setData] = useState(null);
  const [responses, setResponses] = useState(null);
  const [responsesPage, setResponsesPage] = useState(1);
  useEffect(()=>setSelectedResponseId(null),[tab,responsesPage]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [enablingAll, setEnablingAll] = useState(false);

  const enableAllNigerianLgas = async () => {
    setEnablingAll(true);
    setError('');
    try {
      const res = await surveyAnalyticsService.enableAllNigerianLgas();
      Toast.show({ type: 'success', text1: ui("Survey enabled"), text2: res?.message || ui("All Nigerian LGAs enabled.") });
    } catch (err) {
      setError(getErrorMessage(err, 'Could not enable all locations'));
    } finally {
      setEnablingAll(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [response, records] = await Promise.all([surveyAnalyticsService.getAnalysis(tab),surveyAnalyticsService.getResponses(tab,responsesPage)]);
      setResponses(records?.data || null);
      if (response?.success && response?.data) {
        setData(response.data);
      } else {
        setData(null);
        setError(response?.message || 'No analytics available.');
      }
    } catch (err) {
      setData(null);
      setError(getErrorMessage(err, 'Could not load survey analytics'));
    } finally {
      setLoading(false);
    }
  }, [tab,responsesPage]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) {
    return <PremiumCenter loading title={ui("Loading analytics")} />;
  }

  const meta = data?.meta || {};
  const total = Number(meta.total || 0);
  const completed = Number(meta.completed || 0);
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const states = Array.isArray(meta.by_state) ? meta.by_state.slice(0, 6) : [];
  const agents = Array.isArray(meta.by_agent) ? meta.by_agent.slice(0, 12) : [];
  const sources = meta.by_source || {};
  const openCount = Array.isArray(data?.open_answers) ? data.open_answers.length : 0;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <PremiumHero
        eyebrow={ui("Super admin")}
        title={ui("Survey analytics")}
        subtitle={ui("Read-only summary of onboarding survey responses.")}
        icon="analytics-outline"
      />

      <View style={styles.tabRow}>
        {['tenant', 'landlord'].map((key) => {
          const active = tab === key;
          return (
            <TouchableOpacity
              key={key}
              activeOpacity={0.85}
              onPress={() => {setResponsesPage(1);setTab(key);}}
              style={[styles.tab, active && styles.tabActive]}
            >
              <AppText style={[styles.tabText, active && styles.tabTextActive]}>
                {key[0].toUpperCase() + key.slice(1)}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </View>

      <PremiumCard>
        <PremiumButton
          title={enablingAll ? 'Enabling…' : 'Enable survey in all Nigerian LGAs'}
          onPress={enableAllNigerianLgas}
          loading={enablingAll}
          variant="secondary"
          icon="globe-outline"
        />
      </PremiumCard>

      {error ? (
        <PremiumCard>
          <AppText style={styles.empty}>{error}</AppText>
        </PremiumCard>
      ) : (
        <>
          <PremiumCard><AppText style={styles.sectionTitle}>Survey responses ({responses?.total ?? 0})</AppText><AppText style={styles.empty}>Partial records are not included in completed-response analysis. Missing details are shown as not provided.</AppText></PremiumCard>
          {(responses?.responses || []).map(record=><PremiumCard key={record.id}>
            <TouchableOpacity accessibilityRole="button" accessibilityState={{expanded:selectedResponseId===record.id}} onPress={()=>setSelectedResponseId(current=>current===record.id?null:record.id)} style={styles.stateRow}>
              <View style={styles.agentCopy}><AppText style={styles.stateName}>{record.respondent_name || record.respondent_code || 'Name not provided'}</AppText><AppText style={styles.empty}>{record.completed_at?'Completed':'Partial'} · {record.respondent_code}</AppText></View>
              <AppText>{selectedResponseId===record.id?'Hide results':'View results'}</AppText>
            </TouchableOpacity>
            {selectedResponseId===record.id && <>
            <InfoRow icon="document-text-outline" label="Code" value={record.respondent_code} />
            <InfoRow icon="person-outline" label="Respondent" value={record.respondent_name || 'Not provided yet'} />
            <InfoRow icon="call-outline" label="Phone" value={record.respondent_phone || 'Not provided yet'} />
            <InfoRow icon="mail-outline" label="Email" value={record.respondent_email || (record.email_status==='no_email'?'No email':'Not provided yet')} />
            <InfoRow icon="location-outline" label="Lives in" value={record.respondent_location || 'Not provided yet'} />
            <InfoRow icon="map-outline" label="State of origin" value={record.respondent_state_of_origin || 'Not provided yet'} />
            <InfoRow icon="person-outline" label="Agent" value={record.agent_name || record.agent_display || 'Not recorded'} />
            <InfoRow icon="location-outline" label="Agent LGA" value={record.agent_lga || (!record.agent_user_id&&record.source==='public_link'?'Not applicable':'Not recorded')} />
            <InfoRow icon="information-circle-outline" label="Source" value={record.source} />
            <InfoRow icon="checkmark-circle-outline" label="Status" value={record.completed_at?'Completed':'Partial · '+(record.answer_count ?? 0)+' answered'} />
            <AppText style={styles.sectionTitle}>Answers</AppText>
            {(record.answer_details || Object.entries(record.answers||{}).map(([key,value])=>({key,question:key,answer:formatDisplayValue(value)}))).map(answer=><View key={answer.key} style={styles.answerRow}><AppText style={styles.stateName}>{answer.question}</AppText><AppText>{answer.answer || 'Not answered'}</AppText></View>)}
            {!Object.keys(record.answers||{}).length && <AppText>No answers saved yet.</AppText>}
            </>}
          </PremiumCard>)}
          <View style={styles.metricRow}><PremiumButton title="Previous" variant="secondary" disabled={responsesPage<=1} onPress={()=>setResponsesPage(page=>page-1)} /><PremiumButton title="Next" variant="secondary" disabled={responsesPage*25 >= (responses?.total ?? 0)} onPress={()=>setResponsesPage(page=>page+1)} /></View>
          <View style={styles.metricRow}>
            <View style={[styles.metric, styles.metricAccent]}>
              <AppText style={styles.metricValue}>{total}</AppText>
              <AppText style={styles.metricLabel}>{ui("Responses")}</AppText>
            </View>
            <View style={styles.metric}>
              <AppText style={styles.metricValue}>{completed}</AppText>
              <AppText style={styles.metricLabel}>{ui("Completed")}</AppText>
            </View>
            <View style={styles.metric}>
              <AppText style={styles.metricValue}>{rate}%</AppText>
              <AppText style={styles.metricLabel}>{ui("Completion")}</AppText>
            </View>
          </View>

          <PremiumCard>
            <InfoRow icon="time-outline" label={ui("Avg. time")} value={mmss(meta.avg_time_seconds)} />
            <InfoRow icon="chatbox-outline" label={ui("Open answers")} value={String(openCount)} />
            <InfoRow
              icon="pulse-outline"
              label={ui("Sources")}
              value={Object.keys(sources)
                .map((key) => `${key}: ${formatDisplayValue(sources[key])}`)
                .join(', ') || '—'}
            />
            <InfoRow icon="refresh-outline" label={ui("Generated")} value={data?.generated_at ? new Date(data.generated_at).toLocaleString() : '—'} />
          </PremiumCard>

          <PremiumCard>
            <AppText style={styles.sectionTitle}>{ui("Top states")}</AppText>
            {states.length === 0 ? (
              <AppText style={styles.empty}>{ui("No state breakdown available.")}</AppText>
            ) : (
              states.map((row) => (
                <View key={row.state} style={styles.stateRow}>
                  <AppText style={styles.stateName}>{row.state}</AppText>
                  <AppText style={styles.stateCount}>{row.count}</AppText>
                </View>
              ))
            )}
          </PremiumCard>

          <PremiumCard>
            <AppText style={styles.sectionTitle}>{ui("Field agent leaderboard")}</AppText>
            {agents.length === 0 ? (
              <AppText style={styles.empty}>{ui("No agent-captured responses in this range.")}</AppText>
            ) : (
              agents.map((row, index) => (
                <View key={String(row.agent_user_id || index)} style={styles.stateRow}>
                  <View style={styles.agentCopy}>
                    <AppText style={styles.stateName} numberOfLines={1}>
                      {index + 1}. {row.agent_name}
                    </AppText>
                    <AppText style={styles.empty} numberOfLines={2}>
                      {Number(row.lgas) || 0}{ui(" LGA")}{Number(row.lgas) === 1 ? '' : ui("s")}
                      {row.agent_phone ? ui(" · {value0}", {value0: (row.agent_phone)}) : ''}
                      {row.last_activity
                        ? ui(" · last {value0}", {value0: (new Date(row.last_activity).toLocaleDateString())})
                        : ''}
                    </AppText>
                  </View>
                  <AppText style={styles.stateCount}>{Number(row.captured) || 0}</AppText>
                </View>
              ))
            )}
          </PremiumCard>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  answerRow: {marginTop:12,gap:4},
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    padding: 18,
    paddingBottom: 36,
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
    paddingVertical: 14,
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
  sectionTitle: {    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: typeScale.reading,
    lineHeight: 22,
    marginBottom: 8,
  },
  stateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  stateName: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: typeScale.sm,
    lineHeight: 20,
  },
  agentCopy: {
    flex: 1,
    marginRight: 10,
  },
  stateCount: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: typeScale.sm,
    lineHeight: 20,
  },
  empty: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    lineHeight: 18,
  },
});

export default SurveyAnalyticsScreen;
