import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
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
import { colors, radius, typography, typeScale } from '../../theme';
import AppText from '../../components/common/AppText';

const SeoToolsScreen = () => {
  useInterfaceLanguage();
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
        text1: ui("Failed"),
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
            action === "sitemap"
              ? ui("Sitemap regenerated ({value0} URLs).", {value0: (response.data?.urlCount || 0)})
              : action === "rankings"
                ? response.message || ui("Ranking checks completed.")
                : ui("Google notified."),
        });
      } else {
        Toast.show({ type: 'error', text1: label, text2: response?.message || ui("Request failed.") });
      }
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: label,
        text2: getErrorMessage(err, ui("Request failed")),
      });
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return <PremiumCenter loading title={ui("Loading SEO summary")} />;
  }

  const s = summary || {};

  return (
    <View style={styles.screen}>
      <PremiumCard style={styles.hero}>
        <AppText style={styles.heroTitle}>{ui("SEO & indexing tools")}</AppText>
        <AppText style={styles.heroText}>{ui("Live page inventory and on-demand Google / sitemap actions.")}</AppText>
      </PremiumCard>

      <View style={styles.metricRow}>
        <View style={[styles.metric, styles.metricAccent]}>
          <AppText style={styles.metricValue}>{Number(s.totalSeoPages || 0).toLocaleString()}</AppText>
          <AppText style={styles.metricLabel}>{ui("SEO pages")}</AppText>
        </View>
        <View style={styles.metric}>
          <AppText style={styles.metricValue}>{Number(s.sitemapUrls || 0).toLocaleString()}</AppText>
          <AppText style={styles.metricLabel}>{ui("Sitemap URLs")}</AppText>
        </View>
      </View>

      <PremiumCard>
        <InfoRow icon="layers-outline" label={ui("State pages")} value={String(s.statePages || 0)} />
        <InfoRow icon="grid-outline" label={ui("LGA pages")} value={String(s.lgaPages || 0)} />
        <InfoRow icon="map-outline" label={ui("Area pages")} value={String(s.areaPages || 0)} />
        <InfoRow icon="business-outline" label={ui("Property pages")} value={String(s.propertyPages || 0)} />
      </PremiumCard>

      <PremiumCard>
        <PremiumButton
          title={busy === "sitemap" ? 'Regenerating…' : ui("Regenerate sitemap")}
          onPress={() => run('sitemap', 'Sitemap regenerated')}
          loading={busy === 'sitemap'}
          disabled={busy !== null && busy !== 'sitemap'}
          icon="refresh-outline"
          style={styles.action}
        />
        <PremiumButton
          title={busy === "rankings" ? 'Running checks…' : 'Run ranking checks'}
          onPress={() => run('rankings', 'Ranking checks')}
          loading={busy === 'rankings'}
          disabled={busy !== null && busy !== 'rankings'}
          variant="secondary"
          icon="search-outline"
          style={styles.action}
        />
        <PremiumButton
          title={ui("Ping Google")}
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
    fontFamily: typography.semibold,
    fontSize: typeScale.md,
    lineHeight: 26,
  },
  heroText: {
    color: '#B9C9E5',
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    lineHeight: 18,
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
  action: {
    marginTop: 12,
  },
});

export default SeoToolsScreen;
