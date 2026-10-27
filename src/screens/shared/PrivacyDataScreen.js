import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { useFocusEffect } from '@react-navigation/native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import {
  PremiumButton,
  PremiumCard,
  PremiumCenter,
  PremiumHero,
} from '../../components/common/PremiumLayout';
import { complianceOpsService } from '../../services/complianceOpsService';
import { getErrorMessage } from '../../utils/http';
import { colors, radius, typography, typeScale } from '../../theme';
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
  useInterfaceLanguage();
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

  const downloadExport = useCallback(async () => {
    if (!data) return;
    try {
      const file = new File(Paths.cache, `rentalhub-personal-data-${Date.now()}.json`);
      try {
        file.delete();
      } catch (e) {
        // File may not exist yet — ignore.
      }
      file.write(JSON.stringify(data, null, 2));
      if (!(await Sharing.isAvailableAsync())) {
        Toast.show({ type: 'info', text1: ui("Sharing is not available on this device") });
        return;
      }
      await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json' });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: ui("Could not export your data"),
        text2: getErrorMessage(error, ui("Please try again.")),
      });
    }
  }, [data]);

  if (loading) {
    return <PremiumCenter loading title={ui("Preparing your data")} />;
  }

  const entries = data ? Object.entries(data).slice(0, 80) : [];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <PremiumHero
        eyebrow={ui("Privacy")}
        title={ui("My personal data")}
        subtitle={ui("A read-only summary of the data Amana RentalHub NG holds for your account (NDPR export).")}
        icon="lock-closed-outline"
      />

      {error ? (
        <PremiumCard>
          <AppText style={styles.error}>{error}</AppText>
          <PremiumButton title={ui("Retry")} onPress={load} icon="refresh-outline" style={styles.action} />
        </PremiumCard>
      ) : (
        <>
          <PremiumCard>
            <AppText style={styles.note}>{ui("Below is a summary of each stored field. Download the full export to review every value.")}</AppText>
            <PremiumButton
              title={ui("Download my data (JSON)")}
              onPress={downloadExport}
              icon="download-outline"
              style={styles.action}
            />
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
                <AppText style={styles.empty}>{ui("No personal data fields were returned.")}</AppText>
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
    fontSize: typeScale.xs,
    lineHeight: 18,
    textTransform: 'uppercase',
  },
  rowValue: {
    color: colors.ink,
    fontFamily: typography.regular,
    fontSize: typeScale.sm,
    lineHeight: 20,
    marginTop: 2,
  },
  note: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    lineHeight: 18,
  },
  error: {
    color: colors.danger,
    fontFamily: typography.medium,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginBottom: 10,
  },
  action: {
    marginTop: 12,
  },
  empty: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    lineHeight: 18,
  },
});

export default PrivacyDataScreen;
