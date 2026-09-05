import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { useFocusEffect } from '@react-navigation/native';
import {
  InfoRow,
  PremiumButton,
  PremiumCard,
  PremiumCenter,
  PremiumHero,
} from '../../components/common/PremiumLayout';
import { complianceOpsService } from '../../services/complianceOpsService';
import { getErrorMessage } from '../../utils/http';
import { colors, radius, typography } from '../../theme';
import AppText from '../../components/common/AppText';

const SeoToolsScreen = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await complianceOpsService.getSeoSummary();
      if (response?.success) {
        setSummary(response.summary || null);
      }
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(err, 'Could not load the SEO summary'),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const run = async (action, label) => {
    setBusy(action);
    try {
      let response;
      if (action === 'rankings') response = await complianceOpsService.runSeoRankingChecks();
      else if (action === 'sitemap') response = await complianceOpsService.regenerateSitemap();
      else response = await complianceOpsService.pingGoogle();
      if (response?.success) {
        Toast.show({
          type: 'success',
          text1: label,
          text2:
            action === 'sitemap'
              ? `Sitemap regenerated (${response.data?.urlCount || 0} URLs).`
              : action === 'rankings'
                ? response.message || 'Ranking checks completed.'
                : 'Google notified.',
        });
      } else {
        Toast.show({ type: 'error', text1: label, text2: response?.message || 'Request failed.' });
      }
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: label,
        text2: getErrorMessage(err, 'Request failed'),
      });
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return <PremiumCenter loading title="Loading SEO summary" />;
  }

  const s = summary || {};

  return (
    <View style={styles.screen}>
      <PremiumCard style={styles.hero}>
        <AppText style={styles.heroTitle}>SEO & indexing tools</AppText>
        <AppText style={styles.heroText}>
          Live page inventory and on-demand Google / sitemap actions.
        </AppText>
      </PremiumCard>

      <View style={styles.metricRow}>
        <View style={[styles.metric, styles.metricAccent]}>
          <AppText style={styles.metricValue}>{Number(s.totalSeoPages || 0).toLocaleString()}</AppText>
          <AppText style={styles.metricLabel}>SEO pages</AppText>
        </View>
        <View style={styles.metric}>
          <AppText style={styles.metricValue}>{Number(s.sitemapUrls || 0).toLocaleString()}</AppText>
          <AppText style={styles.metricLabel}>Sitemap URLs</AppText>
        </View>
      </View>

      <PremiumCard>
        <InfoRow icon="layers-outline" label="State pages" value={String(s.statePages || 0)} />
        <InfoRow icon="grid-outline" label="LGA pages" value={String(s.lgaPages || 0)} />
        <InfoRow icon="map-outline" label="Area pages" value={String(s.areaPages || 0)} />
        <InfoRow icon="business-outline" label="Property pages" value={String(s.propertyPages || 0)} />
      </PremiumCard>

      <PremiumCard>
        <PremiumButton
          title={busy === 'sitemap' ? 'Regenerating…' : 'Regenerate sitemap'}
          onPress={() => run('sitemap', 'Sitemap regenerated')}
          loading={busy === 'sitemap'}
          disabled={busy !== null && busy !== 'sitemap'}
          icon="refresh-outline"
          style={styles.action}
        />
        <PremiumButton
          title={busy === 'rankings' ? 'Running checks…' : 'Run ranking checks'}
          onPress={() => run('rankings', 'Ranking checks')}
          loading={busy === 'rankings'}
          disabled={busy !== null && busy !== 'rankings'}
          variant="secondary"
          icon="search-outline"
          style={styles.action}
        />
        <PremiumButton
          title="Ping Google"
          onPress={() => run('ping', 'Google notified')}
          loading={busy === 'ping'}
          disabled={busy !== null && busy !== 'ping'}
          variant="secondary"
          icon="globe-outline"
          style={styles.action}
        />
      </PremiumCard>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: 18,
  },
  hero: {
    backgroundColor: colors.navy,
    borderRadius: radius.lg,
    marginBottom: 14,
    padding: 18,
  },
  heroTitle: {
    color: colors.white,
    fontFamily: typography.bold,
    fontSize: 18,
  },
  heroText: {
    color: '#B9C9E5',
    fontFamily: typography.regular,
    fontSize: 13,
    marginTop: 4,
  },
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
  metricAccent: {
    backgroundColor: colors.surfaceBlue,
    borderColor: colors.blue,
  },
  metricValue: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 20,
  },
  metricLabel: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 11,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  action: {
    marginTop: 12,
  },
});

export default SeoToolsScreen;
