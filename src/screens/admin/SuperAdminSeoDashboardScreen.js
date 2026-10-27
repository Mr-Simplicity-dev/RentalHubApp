import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import React, { useEffect, useLayoutEffect, useState } from 'react';
import {ActivityIndicator, FlatList, StyleSheet, TouchableOpacity, View} from 'react-native';
import Toast from 'react-native-toast-message';
import api from '../../services/api';
import { colors, typography, radius, typeScale } from '../../theme';
import { getErrorMessage } from '../../utils/http';
import AppText from '../../components/common/AppText';
import {
ActionRow,
  DashboardHero,
  DashboardScreen,
  DashboardSection,
  MetricCard,
  MetricGrid,
} from '../../components/dashboard/DashboardKit';

const SuperAdminSeoDashboardScreen = ({ navigation }) => {
  const interfaceLanguage = useInterfaceLanguage();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pinging, setPinging] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: navigation.canGoBack() });
  }, [navigation, interfaceLanguage]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/seo');
      const payload = response?.data || {};
      setDashboard({
        summary: payload.summary || {},
        stateBreakdown: Array.isArray(payload.stateBreakdown) ? payload.stateBreakdown : [],
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: ui("Failed"),
        text2: getErrorMessage(error, 'Could not load SEO dashboard'),
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePingGoogle = async () => {
    setPinging(true);
    try {
      const response = await api.post('/admin/seo/ping-google');
      Toast.show({
        type: response?.data?.success ? 'success' : 'info',
        text1: response?.data?.success ? ui("Submitted to Google") : ui("Notice"),
        text2: response?.data?.success
          ? ui("Homepage sent to Google Indexing API")
          : (response?.data?.data?.reason || ui("Service account not configured")),
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: ui("Failed"),
        text2: getErrorMessage(error, 'Could not ping Google'),
      });
    } finally {
      setPinging(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const summary = dashboard?.summary || {};
  const stateBreakdown = dashboard?.stateBreakdown || [];

  const summaryCards = [
    { label: ui("SEO Pages"), value: String(summary.totalSeoPages ?? 0), icon: 'document-text-outline', color: colors.blue },
    { label: ui("Property Pages"), value: String(summary.propertyPages ?? 0), icon: 'home-outline', color: '#7C3AED' },
    { label: ui("Location Pages"), value: String((summary.statePages ?? 0) + (summary.lgaPages ?? 0) + (summary.areaPages ?? 0)), icon: 'location-outline', color: colors.success },
    { label: ui("Sitemap URLs"), value: String(summary.sitemapUrls ?? 0), icon: 'layers-outline', color: '#A66B00' },
    { label: ui("States Covered"), value: String(summary.statesWithPages ?? 0), icon: 'map-outline', color: colors.success },
    { label: ui("States Empty"), value: String(summary.statesWithNoProperties ?? 0), icon: 'alert-circle-outline', color: colors.warning },
  ];

  return (
    <DashboardScreen refreshing={loading} onRefresh={loadDashboard}>
      <DashboardHero
        eyebrow={ui("SEO")}
        title={ui("SEO & Search oversight")}
        subtitle={ui("Monitor generated search pages, sitemap coverage and verified property pages across the platform.")}
        icon="globe-outline"
        onRefresh={loadDashboard}
      />

      <MetricGrid>
        {summaryCards.map((card) => (
          <MetricCard key={card.label} {...card} />
        ))}
      </MetricGrid>

      <DashboardSection title={ui("Google Indexing")}>
        <ActionRow
          title={ui("Request Google to re-index your homepage")}
          subtitle={pinging ? ui("Submitting...") : 'Sends your homepage URL to the Google Indexing API'}
          icon="logo-google"
          onPress={handlePingGoogle}
          badge={pinging ? '...' : undefined}
        />
      </DashboardSection>

      <DashboardSection title={ui("State page coverage")}>
        {stateBreakdown.length === 0 ? (
          <AppText style={styles.empty}>{ui("No state coverage data is available.")}</AppText>
        ) : (
          <FlatList
            data={stateBreakdown}
            scrollEnabled={false}
            keyExtractor={(item, index) => String(item.id ?? item.state_slug ?? index)}
            renderItem={({ item }) => (
              <View style={styles.issueCard}>
                <AppText style={styles.issueTitle}>{item.state_name || ui("State")}</AppText>
                <AppText style={styles.issueMeta}>{item.property_count ?? 0}{ui(" verified property page(s)")}</AppText>
                <AppText style={[styles.issueStatus, Number(item.property_count) > 0 ? styles.statusResolved : styles.statusOpen]}>
                  {Number(item.property_count) > 0 ? 'Covered' : 'No available properties'}
                </AppText>
              </View>
            )}
          />
        )}
      </DashboardSection>
    </DashboardScreen>
  );
};

const styles = StyleSheet.create({
  empty: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    lineHeight: 18,
  },
  issueCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: 9,
    padding: 14,
  },
  issueTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: typeScale.sm,
    lineHeight: 20,
  },
  issueMeta: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginTop: 4,
  },
  issueStatus: {
    fontFamily: typography.semibold,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginTop: 6,
    textTransform: 'capitalize',
  },
  statusResolved: {
    color: colors.success,
  },
  statusOpen: {
    color: '#A66B00',
  },
});

export default SuperAdminSeoDashboardScreen;
