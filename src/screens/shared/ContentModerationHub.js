import React, { useCallback, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { useFocusEffect } from '@react-navigation/native';
import Input from '../../components/common/Input';
import {
  InfoRow,
  PremiumButton,
  PremiumCard,
  PremiumCenter,
  PremiumHero,
  PremiumListScreen,
  StatusPill,
} from '../../components/common/PremiumLayout';
import { contentModerationService } from '../../services/contentModerationService';
import { getErrorMessage, pickList } from '../../utils/http';
import { colors, radius, typography } from '../../theme';
import AppText from '../../components/common/AppText';

const ContentModerationHub = () => {
  const [tab, setTab] = useState('flagged');
  const [flagged, setFlagged] = useState([]);
  const [damage, setDamage] = useState([]);
  const [propertyId, setPropertyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState(null);

  const loadFlagged = useCallback(async () => {
    try {
      const res = await contentModerationService.getFlaggedMessages();
      setFlagged(pickList(res?.data || res, ['data']));
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(err, 'Could not load flagged messages'),
      });
    }
  }, []);

  const loadDamage = useCallback(async (pid) => {
    if (!pid) return;
    setLoading(true);
    try {
      const res = await contentModerationService.getPropertyDamageReports(pid);
      setDamage(pickList(res?.data || res, ['data', 'reports', 'rows']));
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(err, 'Could not load damage reports for this property'),
      });
      setDamage([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (tab === 'flagged') {
        loadFlagged();
      }
    }, [tab, loadFlagged])
  );

  const clearFlag = async (id) => {
    setBusyKey(`flag-${id}`);
    try {
      const res = await contentModerationService.clearFlaggedMessage(id);
      if (res?.success) {
        Toast.show({ type: 'success', text1: 'Flag cleared' });
        await loadFlagged();
      }
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(err, 'Could not clear the flag'),
      });
    } finally {
      setBusyKey(null);
    }
  };

  const toggleDamage = async (report, action) => {
    setBusyKey(`${report.id}-${action}`);
    try {
      const res =
        action === 'publish'
          ? await contentModerationService.publishDamageReport(report.id)
          : await contentModerationService.unpublishDamageReport(report.id);
      if (res?.success) {
        Toast.show({ type: 'success', text1: `Report ${action}d` });
        await loadDamage(propertyId);
      }
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(err, `Could not ${action} the report`),
      });
    } finally {
      setBusyKey(null);
    }
  };

  const header = (
    <>
      <PremiumHero
        eyebrow="Moderation"
        title="Content moderation"
        subtitle="Clear flagged messages and publish or unpublish damage reports."
        icon="shield-checkmark-outline"
      />
      <View style={styles.tabRow}>
        {['flagged', 'damage'].map((key) => {
          const active = tab === key;
          return (
            <TouchableOpacity
              key={key}
              activeOpacity={0.85}
              onPress={() => setTab(key)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <AppText style={[styles.tabText, active && styles.tabTextActive]}>
                {key === 'flagged' ? 'Flagged messages' : 'Damage reports'}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );

  if (tab === 'flagged') {
    return (
      <PremiumListScreen
        data={flagged}
        keyExtractor={(item) => String(item.id)}
        refreshing={false}
        onRefresh={loadFlagged}
        header={header}
        emptyTitle="No flagged messages"
        emptyMessage="Messages flagged for review will appear here."
        emptyIcon="flag-outline"
        renderItem={({ item }) => (
          <PremiumCard>
            <AppText style={styles.cardTitle}>{item.subject || 'Message'}</AppText>
            <AppText style={styles.cardText}>{item.message_text || ''}</AppText>
            <InfoRow icon="person-outline" label="Sender" value={item.sender_name || `User #${item.sender_id}`} />
            {item.flagged_reason ? (
              <InfoRow icon="warning-outline" label="Reason" value={item.flagged_reason} />
            ) : null}
            <PremiumButton
              title="Clear flag"
              onPress={() => clearFlag(item.id)}
              loading={busyKey === `flag-${item.id}`}
              variant="secondary"
              icon="checkmark-circle-outline"
              style={styles.action}
            />
          </PremiumCard>
        )}
      />
    );
  }

  return (
    <PremiumListScreen
      data={damage}
      keyExtractor={(item) => String(item.id)}
      refreshing={loading}
      onRefresh={() => loadDamage(propertyId)}
      header={
        <>
          {header}
          <PremiumCard>
            <Input
              label="Property ID"
              value={propertyId}
              onChangeText={(v) => setPropertyId(v.replace(/\D/g, ''))}
              placeholder="Enter a property id"
              keyboardType="number-pad"
            />
            <PremiumButton
              title="Load damage reports"
              onPress={() => loadDamage(propertyId)}
              loading={loading}
              icon="search-outline"
              style={styles.action}
            />
          </PremiumCard>
        </>
      }
      emptyTitle="No damage reports"
      emptyMessage="Enter a property id to load its damage reports."
      emptyIcon="warning-outline"
      renderItem={({ item }) => (
        <PremiumCard>
          <View style={styles.rowBetween}>
            <AppText style={styles.cardTitle}>
              {item.report_title || item.damage_type || `Report #${item.id}`}
            </AppText>
            <StatusPill label={item.status || 'draft'} color={item.status === 'published' ? colors.success : colors.blue} />
          </View>
          {item.description ? <AppText style={styles.cardText}>{item.description}</AppText> : null}
          {item.severity ? <InfoRow icon="warning-outline" label="Severity" value={item.severity} /> : null}
          <View style={styles.actions}>
            {item.status !== 'published' ? (
              <PremiumButton
                title="Publish"
                onPress={() => toggleDamage(item, 'publish')}
                loading={busyKey === `${item.id}-publish`}
                icon="eye-outline"
                style={styles.actionButton}
              />
            ) : (
              <PremiumButton
                title="Unpublish"
                variant="secondary"
                onPress={() => toggleDamage(item, 'unpublish')}
                loading={busyKey === `${item.id}-unpublish`}
                icon="eye-off-outline"
                style={styles.actionButton}
              />
            )}
          </View>
        </PremiumCard>
      )}
    />
  );
};

const styles = StyleSheet.create({
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
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
    fontSize: 13,
  },
  tabTextActive: {
    color: colors.white,
  },
  cardTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 16,
  },
  cardText: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  rowBetween: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    minWidth: 120,
  },
  action: {
    marginTop: 12,
  },
});

export default ContentModerationHub;
