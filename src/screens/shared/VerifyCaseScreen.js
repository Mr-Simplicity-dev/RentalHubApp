import React, { useEffect, useState } from 'react';
import {StyleSheet, View} from 'react-native';
import Toast from 'react-native-toast-message';
import Input from '../../components/common/Input';
import {
  InfoRow,
  PremiumButton,
  PremiumCard,
  PremiumHero,
  PremiumScreen,
  StatusPill,
} from '../../components/common/PremiumLayout';
import { evidenceService } from '../../services/evidenceService';
import { getErrorMessage, pickObject } from '../../utils/http';
import { colors, typography } from '../../theme';

import AppText from '../../components/common/AppText';
const VerifyCaseScreen = ({ route }) => {
  const [disputeId, setDisputeId] = useState(String(route?.params?.disputeId || ''));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const verifyCase = async (targetId = disputeId) => {
    if (!String(targetId).trim()) return;

    setLoading(true);
    try {
      const response = await evidenceService.verifyDispute(targetId);
      setResult(pickObject(response, ['verification', 'data']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Verification failed',
        text2: getErrorMessage(error, 'Could not verify evidence'),
      });
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (route?.params?.disputeId) {
      verifyCase(route.params.disputeId);
    }
  }, [route?.params?.disputeId]);

  return (
    <PremiumScreen>
      <PremiumHero
        eyebrow="Evidence integrity"
        title="Digital evidence verification"
        subtitle="Verify dispute files and Merkle root integrity before legal or admin action."
        icon="finger-print-outline"
      />

      <PremiumCard>
        <Input
          label="Dispute ID"
          value={disputeId}
          onChangeText={setDisputeId}
          placeholder="Enter dispute id"
          keyboardType="number-pad"
          icon="folder-open-outline"
        />

        <PremiumButton
          title="Verify evidence"
          onPress={() => verifyCase()}
          loading={loading}
          icon="shield-checkmark-outline"
        />
      </PremiumCard>

      {result ? (
        <PremiumCard>
          <AppText style={styles.sectionTitle}>Verification result</AppText>
          <InfoRow icon="git-branch-outline" label="Merkle root" value={result.merkleRoot || 'N/A'} />
          <InfoRow
            icon="shield-outline"
            label="Root integrity"
            value={result.merkleValid ? 'Valid' : 'Invalid'}
            valueStyle={{ color: result.merkleValid ? colors.success : colors.danger }}
          />
          {(result.files || []).map((file, index) => (
            <View key={`${file.file}-${index}`} style={styles.fileRow}>
              <AppText style={styles.fileName}>{file.file}</AppText>
              <StatusPill
                label={file.valid ? 'Verified' : 'Tampered'}
                color={file.valid ? colors.success : colors.danger}
              />
            </View>
          ))}
        </PremiumCard>
      ) : null}
    </PremiumScreen>
  );
};

const styles = StyleSheet.create({
  sectionTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 18,
    marginBottom: 8,
  },
  fileRow: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  fileName: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.medium,
    fontSize: 13,
    paddingRight: 8,
  },
});

export default VerifyCaseScreen;
