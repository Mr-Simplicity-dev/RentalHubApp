import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { adminService } from '../../services/adminService';
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

const AdminVerificationsScreen = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadVerifications = async () => {
    setLoading(true);
    try {
      const response = await adminService.getPendingVerifications();
      setItems(pickList(response, ['data', 'users', 'verifications']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load verifications'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVerifications();
  }, []);

  const approve = async (id) => {
    try {
      await adminService.approveVerification(id);
      await loadVerifications();
      Toast.show({ type: 'success', text1: 'Verification approved' });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not approve verification'),
      });
    }
  };

  const reject = async (id) => {
    try {
      await adminService.rejectVerification(id);
      await loadVerifications();
      Toast.show({ type: 'success', text1: 'Verification rejected' });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not reject verification'),
      });
    }
  };

  return (
    <PremiumListScreen
      data={items}
      refreshing={loading}
      onRefresh={loadVerifications}
      keyExtractor={(item) => String(item.id)}
      emptyTitle="No pending verifications"
      emptyMessage="Identity documents awaiting review will appear here."
      emptyIcon="shield-checkmark-outline"
      header={
        <PremiumHero
          eyebrow="Compliance"
          title="Verifications"
          subtitle="Review identity records with clearer context and decisive actions."
          icon="shield-checkmark-outline"
          right={<StatusPill label={`${items.length} pending`} color={colors.blue} />}
        />
      }
      renderItem={({ item }) => {
        const documentLabel =
          item.identity_document_type === 'passport'
            ? `Passport: ${item.international_passport_number || 'N/A'}`
            : `NIN: ${item.nin || 'N/A'}`;

        return (
          <PremiumCard>
            <View style={styles.cardHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{String(item.full_name || item.email || 'V').slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={styles.cardCopy}>
                <Text style={styles.cardTitle}>{item.full_name || 'Verification request'}</Text>
                <Text style={styles.cardMeta}>{item.email || 'No email provided'}</Text>
              </View>
            </View>
            <InfoRow icon="id-card-outline" label="Document" value={documentLabel} />
            <View style={styles.actions}>
              <PremiumButton title="Approve" icon="checkmark-circle-outline" onPress={() => approve(item.id)} />
              <PremiumButton title="Reject" variant="ghost" icon="close-circle-outline" onPress={() => reject(item.id)} />
            </View>
          </PremiumCard>
        );
      }}
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
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  avatarText: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: 18,
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

export default AdminVerificationsScreen;
