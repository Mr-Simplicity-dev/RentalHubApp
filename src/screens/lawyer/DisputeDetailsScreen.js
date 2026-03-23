import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import Button from '../../components/common/Button';
import { legalService } from '../../services/legalService';
import { buildUploadUrl, getErrorMessage, pickObject } from '../../utils/http';

const DisputeDetailsScreen = ({ navigation, route }) => {
  const disputeId = route?.params?.disputeId;
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState(null);

  const loadDispute = async () => {
    if (!disputeId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await legalService.getDisputeDetails(disputeId);
      setPayload(pickObject(response, ['data']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load dispute details'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDispute();
  }, [disputeId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0284c7" />
      </View>
    );
  }

  if (!payload?.dispute) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Dispute details are unavailable.</Text>
      </View>
    );
  }

  const { dispute, messages = [], evidence = [], audit_logs = [], authorized_lawyers = [], timeline = [] } =
    payload;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <Text style={styles.title}>Dispute #{dispute.id}</Text>
        <Text style={styles.metaText}>Property: {dispute.property_title || '-'}</Text>
        <Text style={styles.metaText}>Status: {dispute.status || 'open'}</Text>
        <Text style={styles.metaText}>Opened by: {dispute.opened_by_name || 'Unknown'}</Text>
        <Text style={styles.metaText}>
          Against: {dispute.against_name || dispute.against_email || 'Unknown'}
        </Text>
        {dispute.description ? <Text style={styles.description}>{dispute.description}</Text> : null}
        <Button
          title="Verify Evidence Integrity"
          variant="outline"
          onPress={() => navigation.navigate('VerifyCase', { disputeId: dispute.id })}
          style={styles.marginTop}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Assigned Lawyers</Text>
        {authorized_lawyers.length === 0 ? (
          <Text style={styles.emptyText}>No authorized lawyers linked to this dispute.</Text>
        ) : (
          authorized_lawyers.map((lawyer) => (
            <View key={lawyer.id} style={styles.listRow}>
              <Text style={styles.listTitle}>{lawyer.full_name}</Text>
              <Text style={styles.listMeta}>{lawyer.email}</Text>
              <Text style={styles.listMeta}>
                Assigned by {lawyer.assigned_by_name || lawyer.client_name || 'Unknown'}
                {lawyer.client_name ? ` for ${lawyer.client_name}` : ''}
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Dispute Timeline</Text>
        {timeline.length === 0 ? (
          <Text style={styles.emptyText}>No timeline entries available.</Text>
        ) : (
          timeline.map((item, index) => (
            <View key={`${item.type}-${index}`} style={styles.timelineRow}>
              <Text style={styles.timelineTitle}>{item.summary || item.type}</Text>
              <Text style={styles.timelineMeta}>
                {item.actor_name || 'System'} {item.actor_role ? `(${item.actor_role})` : ''}
              </Text>
              <Text style={styles.timelineMeta}>
                {item.happened_at ? new Date(item.happened_at).toLocaleString() : ''}
              </Text>
              {item.details ? (
                <Text style={styles.timelineDetails}>
                  {typeof item.details === 'string' ? item.details : JSON.stringify(item.details)}
                </Text>
              ) : null}
            </View>
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Evidence</Text>
        {evidence.length === 0 ? (
          <Text style={styles.emptyText}>No evidence uploaded.</Text>
        ) : (
          evidence.map((item) => {
            const evidenceUrl = buildUploadUrl(item.file_path || item.file_url || item.file_name);
            return (
              <View key={item.id} style={styles.listRow}>
                <Text style={styles.listTitle}>{item.file_name || `Evidence #${item.id}`}</Text>
                <Text style={styles.listMeta}>
                  Uploaded by {item.uploaded_by_name || 'Unknown'}
                </Text>
                {evidenceUrl ? (
                  <TouchableOpacity onPress={() => Linking.openURL(evidenceUrl)}>
                    <Text style={styles.linkText}>Open file</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          })
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Messages</Text>
        {messages.length === 0 ? (
          <Text style={styles.emptyText}>No messages yet.</Text>
        ) : (
          messages.map((item) => (
            <View key={item.id} style={styles.listRow}>
              <Text style={styles.listTitle}>{item.sender_name || 'Unknown sender'}</Text>
              <Text style={styles.listMeta}>
                {item.created_at ? new Date(item.created_at).toLocaleString() : ''}
              </Text>
              <Text style={styles.timelineDetails}>{item.message}</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Legal Audit Logs</Text>
        {audit_logs.length === 0 ? (
          <Text style={styles.emptyText}>No legal audit logs found.</Text>
        ) : (
          audit_logs.map((item) => (
            <View key={item.id} style={styles.listRow}>
              <Text style={styles.listTitle}>{item.action || 'Audit log'}</Text>
              <Text style={styles.listMeta}>{item.actor_name || 'System'}</Text>
              <Text style={styles.listMeta}>
                {item.created_at ? new Date(item.created_at).toLocaleString() : ''}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  title: { fontSize: 24, fontWeight: '800', color: '#0f172a' },
  metaText: { marginTop: 6, color: '#475569' },
  description: { marginTop: 12, color: '#1e293b', lineHeight: 20 },
  marginTop: { marginTop: 12 },
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a', marginBottom: 10 },
  emptyText: { color: '#64748b' },
  listRow: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  listTitle: { fontWeight: '700', color: '#0f172a' },
  listMeta: { marginTop: 4, color: '#475569' },
  timelineRow: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  timelineTitle: { fontWeight: '800', color: '#0f172a' },
  timelineMeta: { marginTop: 4, color: '#64748b' },
  timelineDetails: { marginTop: 6, color: '#334155', lineHeight: 18 },
  linkText: { marginTop: 6, color: '#0284c7', fontWeight: '700' },
});

export default DisputeDetailsScreen;
