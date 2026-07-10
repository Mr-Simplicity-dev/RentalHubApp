import React, { useEffect, useLayoutEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';
import api from '../../services/api';
import { colors, typography, radius } from '../../theme';
import { getErrorMessage, pickObject, pickList } from '../../utils/http';
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

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const response = await api.get('/super/seo/dashboard');
      setDashboard(pickObject(response, ['data', 'dashboard']) || {});
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

  useEffect(() => {
    loadDashboard();
  }, []);

  const indexedPages = dashboard?.indexed_pages ?? dashboard?.indexedPages ?? 0;
  const totalCrawls = dashboard?.total_crawls ?? dashboard?.totalCrawls ?? 0;
  const sitemapStatus = dashboard?.sitemap_status ?? dashboard?.sitemapStatus ?? 'Unknown';
  const recentIssues = pickList(dashboard, ['issues', 'recent_issues']) || [];

  const summaryCards = [
    { label: 'Indexed Pages', value: String(indexedPages), icon: 'document-text-outline', color: colors.blue },
    { label: 'Total Crawls', value: String(totalCrawls), icon: 'refresh-outline', color: '#7C3AED' },
    { label: 'Sitemap', value: String(sitemapStatus), icon: 'layers-outline', color: colors.success },
  ];

  return (
    <DashboardScreen refreshing={loading} onRefresh={loadDashboard}>
      <DashboardHero
        eyebrow="SEO"
        title="SEO & Search oversight"
        subtitle="Monitor indexed pages, crawl activity and sitemap health across the platform."
        icon="globe-outline"
        onRefresh={loadDashboard}
      />

      <MetricGrid>
        {summaryCards.map((card) => (
          <MetricCard key={card.label} {...card} />
        ))}
      </MetricGrid>

      <DashboardSection title="Recent SEO issues">
        {recentIssues.length === 0 ? (
          <Text style={styles.empty}>No recent SEO issues.</Text>
        ) : (
          <FlatList
            data={recentIssues}
            scrollEnabled={false}
            keyExtractor={(item, index) => String(item.id ?? index)}
            renderItem={({ item }) => (
              <View style={styles.issueCard}>
                <Text style={styles.issueTitle}>{item.title || item.issue || 'Issue'}</Text>
                <Text style={styles.issueMeta}>{item.description || item.detail || ''}</Text>
                {item.status ? (
                  <Text style={[styles.issueStatus, item.status === 'resolved' ? styles.statusResolved : styles.statusOpen]}>
                    {item.status}
                  </Text>
                ) : null}
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
