import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Toast from 'react-native-toast-message';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { evidenceService } from '../../services/evidenceService';
import { getErrorMessage, pickObject } from '../../utils/http';

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
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Digital Evidence Verification</Text>
      <Text style={styles.subtitle}>Verify dispute evidence integrity by dispute ID.</Text>

      <Input
        label="Dispute ID"
        value={disputeId}
        onChangeText={setDisputeId}
        placeholder="Enter dispute id"
        keyboardType="number-pad"
      />

      <Button title="Verify" onPress={() => verifyCase()} loading={loading} />

      {result ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Verification Result</Text>
          <Text style={styles.meta}>Merkle Root: {result.merkleRoot || 'N/A'}</Text>
          <Text style={styles.meta}>
            Root Integrity: {result.merkleValid ? 'VALID' : 'INVALID'}
          </Text>
          {(result.files || []).map((file, index) => (
            <View key={`${file.file}-${index}`} style={styles.fileRow}>
              <Text style={styles.fileName}>{file.file}</Text>
              <Text style={file.valid ? styles.valid : styles.invalid}>
                {file.valid ? 'VERIFIED' : 'TAMPERED'}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#ffffff' },
  content: { padding: 16, paddingBottom: 24 },
  title: { fontSize: 26, fontWeight: '800', color: '#0f172a' },
  subtitle: { marginTop: 6, marginBottom: 16, color: '#64748b' },
  card: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#f8fafc',
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 10 },
  meta: { color: '#334155', marginBottom: 6 },
  fileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  fileName: { color: '#0f172a', flex: 1, paddingRight: 8 },
  valid: { color: '#16a34a', fontWeight: '700' },
  invalid: { color: '#dc2626', fontWeight: '700' },
});

export default VerifyCaseScreen;
