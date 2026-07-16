import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';
import api from '../../services/api';
import { getErrorMessage, pickList } from '../../utils/http';
import {
  InfoRow,
  PremiumButton,
  PremiumCard,
  PremiumHero,
  PremiumListScreen,
  StatusPill,
} from '../../components/common/PremiumLayout';
import { colors, typography } from '../../theme';

const AdminEvidenceVerificationsScreen = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadEvidence = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/evidence/pending');
      setItems(pickList(response, ['data', 'evidence']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load pending evidence'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvidence();
  }, []);

  const approve = async (id) => {
    try {
      await api.post(`/admin/evidence/${id}/approve`);
      await loadEvidence();
      Toast.show({ type: 'success', text1: 'Evidence approved' });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not approve evidence'),
      });
    }
  };

  const reject = async (id) => {
    try {
      await api.post(`/admin/evidence/${id}/reject`);
      await loadEvidence();
      Toast.show({ type: 'success', text1: 'Evidence rejected' });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not reject evidence'),
      });
    }
  };

  return (
    <PremiumListScreen
      data={items}
      refreshing={loading}
      onRefresh={loadEvidence}
      keyExtractor={(item) => String(item.id)}
      emptyTitle="No pending evidence"
      emptyMessage="Evidence awaiting review will appear here."
      emptyIcon="folder-open-outline"
      header={
        <PremiumHero
          eyebrow="Compliance"
          title="Evidence review"
          subtitle="Approve or reject submitted evidence with a cleaner verification workflow."
          icon="folder-open-outline"
          right={<StatusPill label={`${items.length} pending`} color={colors.blue} />}
        />
      }
      renderItem={({ item }) => (
        <PremiumCard>
          <View style={styles.cardHeader}>
            <View style={styles.evidenceIcon}>
              <Text style={styles.evidenceIconText}>EV</Text>
            </View>
            <View style={styles.cardCopy}>
              <Text style={styles.cardTitle}>{item.evidence_type || item.type || 'Evidence'}</Text>
              <Text style={styles.cardMeta}>{item.submission_date || item.created_at || 'Submission date unavailable'}</Text>
            </View>
          </View>
          <InfoRow icon="person-outline" label="User" value={item.user_name || item.user?.full_name || item.user?.name || 'N/A'} />
          <View style={styles.actions}>
            <PremiumButton title="Approve" icon="checkmark-circle-outline" onPress={() => approve(item.id)} />
            <PremiumButton title="Reject" variant="ghost" icon="close-circle-outline" onPress={() => reject(item.id)} />
          </View>
        </PremiumCard>
      )}
    />
  );
};

const styles = StyleSheet.create({
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 6,
  },
  evidenceIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderRadius: 18,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  evidenceIconText: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: 12,
  },
  cardCopy: {
    flex: 1,
  },
  cardTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 16,
  },
  cardMeta: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 12,
    marginTop: 3,
  },
  actions: {
    gap: 10,
    marginTop: 12,
  },
});

export default AdminEvidenceVerificationsScreen;
