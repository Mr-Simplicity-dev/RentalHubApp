import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { useFocusEffect } from '@react-navigation/native';
import {
  PremiumButton,
  PremiumCard,
  PremiumCenter,
  PremiumHero,
} from '../../components/common/PremiumLayout';
import { complianceOpsService } from '../../services/complianceOpsService';
import { getErrorMessage } from '../../utils/http';
import { colors, radius, typography } from '../../theme';
import AppText from '../../components/common/AppText';

const describeValue = (value) => {
  if (Array.isArray(value)) {
    const sample = value.slice(0, 3).map((item) =>
      typeof item === 'object' && item !== null ? '[item]' : String(item)
    );
    return `${value.length} item(s)${sample.length ? ` · ${sample.join(', ')}` : ''}`;
  }
  if (value && typeof value === 'object') {
    const keys = Object.keys(value);
    return `${keys.length} field(s)`;
  }
  if (value === null || value === undefined) return '—';
  return String(value);
};

const PrivacyDataScreen = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await complianceOpsService.exportPersonalData();
      const payload = response?.data;
      setData(payload && typeof payload === 'object' ? payload : null);
      if (!payload || typeof payload !== 'object') {
        setError(response?.message || 'No personal data export was returned.');
      }
    } catch (err) {
      setData(null);
      setError(getErrorMessage(err, 'Could not export your personal data.'));
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
    return <PremiumCenter loading title="Preparing your data" />;
  }

  const entries = data ? Object.entries(data).slice(0, 80) : [];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <PremiumHero
        eyebrow="Privacy"
        title="My personal data"
        subtitle="A read-only summary of the data RentalHub NG holds for your account (NDPR export)."
        icon="lock-closed-outline"
      />

      {error ? (
        <PremiumCard>
          <AppText style={styles.error}>{error}</AppText>
          <PremiumButton title="Retry" onPress={load} icon="refresh-outline" style={styles.action} />
        </PremiumCard>
      ) : (
        <>
          <PremiumCard>
            <AppText style={styles.note}>
              Below is a summary of each stored field. Full values (including file lists) are best
              reviewed from a desktop browser on the web export page.
            </AppText>
          </PremiumCard>
          <View style={styles.cardList}>
            {entries.map(([key, value]) => (
              <View key={key} style={styles.row}>
                <View style={styles.rowCopy}>
                  <AppText style={styles.rowKey}>{key}</AppText>
                  <AppText style={styles.rowValue}>{describeValue(value)}</AppText>
                </View>
              </View>
            ))}
            {entries.length === 0 ? (
              <PremiumCard>
                <AppText style={styles.empty}>No personal data fields were returned.</AppText>
              </PremiumCard>
            ) : null}
          </View>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    padding: 18,
    paddingBottom: 36,
  },
  cardList: {
    gap: 8,
  },
  row: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  rowCopy: {
    flex: 1,
  },
  rowKey: {
    color: colors.muted,
    fontFamily: typography.semibold,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  rowValue: {
    color: colors.ink,
    fontFamily: typography.regular,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
  },
  note: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 19,
  },
  error: {
    color: colors.danger,
    fontFamily: typography.medium,
    fontSize: 13,
    marginBottom: 10,
  },
  action: {
    marginTop: 12,
  },
  empty: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
  },
});

export default PrivacyDataScreen;
