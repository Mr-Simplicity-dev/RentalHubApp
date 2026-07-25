import React, { useEffect, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import api from '../../services/api';
import { colors, typography, radius } from '../../theme';
import { getErrorMessage } from '../../utils/http';
import {
  ActionRow,
  DashboardHero,
  DashboardScreen,
  DashboardSection,
  MetricCard,
  MetricGrid,
} from '../../components/dashboard/DashboardKit';

const SuperAdminSeoDashboardScreen = ({ navigation }) => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pinging, setPinging] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

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
        text1: 'Failed',
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
        text1: response?.data?.success ? 'Submitted to Google' : 'Notice',
        text2: response?.data?.success
          ? 'Homepage sent to Google Indexing API'
          : (response?.data?.data?.reason || 'Service account not configured'),
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
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
    { label: 'SEO Pages', value: String(summary.totalSeoPages ?? 0), icon: 'document-text-outline', color: colors.blue },
    { label: 'Property Pages', value: String(summary.propertyPages ?? 0), icon: 'home-outline', color: '#7C3AED' },
    { label: 'Location Pages', value: String((summary.statePages ?? 0) + (summary.lgaPages ?? 0) + (summary.areaPages ?? 0)), icon: 'location-outline', color: colors.success },
    { label: 'Sitemap URLs', value: String(summary.sitemapUrls ?? 0), icon: 'layers-outline', color: '#A66B00' },
    { label: 'States Covered', value: String(summary.statesWithPages ?? 0), icon: 'map-outline', color: colors.success },
    { label: 'States Empty', value: String(summary.statesWithNoProperties ?? 0), icon: 'alert-circle-outline', color: colors.warning },
  ];

  return (
    <DashboardScreen refreshing={loading} onRefresh={loadDashboard}>
      <DashboardHero
        eyebrow="SEO"
        title="SEO & Search oversight"
        subtitle="Monitor generated search pages, sitemap coverage and verified property pages across the platform."
        icon="globe-outline"
        onRefresh={loadDashboard}
      />

      <MetricGrid>
        {summaryCards.map((card) => (
          <MetricCard key={card.label} {...card} />
        ))}
      </MetricGrid>

      <DashboardSection title="Google Indexing">
        <ActionRow
          title="Request Google to re-index your homepage"
          subtitle={pinging ? 'Submitting...' : 'Sends your homepage URL to the Google Indexing API'}
          icon="logo-google"
          onPress={handlePingGoogle}
          badge={pinging ? '...' : undefined}
        />
      </DashboardSection>

      <DashboardSection title="State page coverage">
        {stateBreakdown.length === 0 ? (
          <Text style={styles.empty}>No state coverage data is available.</Text>
        ) : (
          <FlatList
            data={stateBreakdown}
            scrollEnabled={false}
            keyExtractor={(item, index) => String(item.id ?? item.state_slug ?? index)}
            renderItem={({ item }) => (
              <View style={styles.issueCard}>
                <Text style={styles.issueTitle}>{item.state_name || 'State'}</Text>
                <Text style={styles.issueMeta}>{item.property_count ?? 0} verified property page(s)</Text>
                <Text style={[styles.issueStatus, Number(item.property_count) > 0 ? styles.statusResolved : styles.statusOpen]}>
                  {Number(item.property_count) > 0 ? 'Covered' : 'No available properties'}
                </Text>
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
    fontSize: 13,
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
    fontSize: 14,
  },
  issueMeta: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: 12,
    marginTop: 4,
  },
  issueStatus: {
    fontFamily: typography.semibold,
    fontSize: 11,
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
