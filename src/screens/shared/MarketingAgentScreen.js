import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { useFocusEffect } from '@react-navigation/native';
import {
  InfoRow,
  PremiumCard,
  PremiumCenter,
  PremiumHero,
  PremiumListScreen,
} from '../../components/common/PremiumLayout';
import { surveyService } from '../../services/surveyService';
import { getErrorMessage, pickList } from '../../utils/http';
import { colors, radius, typography } from '../../theme';
import AppText from '../../components/common/AppText';

const formatDate = (value) => {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(value);
  }
};

const MarketingAgentScreen = () => {
  const [responses, setResponses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await surveyService.marketingAgentOverview();
      const payload = response?.data;
      const rows = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.responses)
          ? payload.responses
          : Array.isArray(payload?.rows)
            ? payload.rows
            : [];
      setResponses(rows);
      setSummary(payload && !Array.isArray(payload) ? payload : null);
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(err, 'Could not load your captured respondents'),
      });
      setResponses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) {
    return <PremiumCenter loading title="Loading respondents" />;
  }

  const metric = (label, value) => (
    <View style={styles.metric}>
      <AppText style={styles.metricValue}>{value}</AppText>
      <AppText style={styles.metricLabel}>{label}</AppText>
    </View>
  );

  return (
    <PremiumListScreen
      data={responses}
      keyExtractor={(item, index) => String(item.id || item.respondent_code || `r-${index}`)}
      refreshing={false}
      onRefresh={load}
      header={
        <>
          <PremiumHero
            eyebrow="Marketing"
            title="Survey respondents"
            subtitle="People you have captured for the market-research survey."
            icon="people-outline"
          />
          <View style={styles.metricRow}>
            {metric('Captured', responses.length)}
            {summary && summary.total ? metric('Total', summary.total) : null}
          </View>
        </>
      }
      emptyTitle="No respondents yet"
      emptyMessage="Respondents you capture for the survey will appear here."
      emptyIcon="people-outline"
      renderItem={({ item }) => (
        <PremiumCard>
          <View style={styles.cardTop}>
            <View style={styles.cardCopy}>
              <AppText style={styles.cardTitle}>
                {item.respondent_name || item.name || `Respondent #${item.id || ''}`}
              </AppText>
              {item.respondent_code ? (
                <AppText style={styles.code}>{item.respondent_code}</AppText>
              ) : null}
            </View>
            {item.status ? <StatusPillShort status={item.status} /> : null}
          </View>
          {item.respondent_phone ? (
            <InfoRow icon="call-outline" label="Phone" value={item.respondent_phone} />
          ) : null}
          {item.state_name || item.lga_name ? (
            <InfoRow
              icon="location-outline"
              label="Location"
              value={[item.state_name, item.lga_name].filter(Boolean).join(', ')}
            />
          ) : null}
          {item.created_at ? (
            <InfoRow icon="time-outline" label="Captured" value={formatDate(item.created_at)} />
          ) : null}
        </PremiumCard>
      )}
    />
  );
};

const StatusPillShort = ({ status }) => {
  const label = String(status || 'pending').replace(/_/g, ' ');
  return (
    <View style={styles.pill}>
      <AppText style={styles.pillText}>{label}</AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  metricRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
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
  metricValue: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 22,
  },
  metricLabel: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 11,
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
    fontSize: 16,
  },
  code: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 12,
    marginTop: 2,
  },
  pill: {
    backgroundColor: `${colors.surfaceBlue}`,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillText: {
    color: colors.blue,
    fontFamily: typography.semibold,
    fontSize: 11,
    textTransform: 'capitalize',
  },
});

export default MarketingAgentScreen;
