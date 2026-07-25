import React, { useEffect, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import Button from '../../components/common/Button';
import FilePreviewCard from '../../components/common/FilePreviewCard';
import { legalService } from '../../services/legalService';
import { colors, radius, shadows, typography } from '../../theme';
import { buildUploadUrl, getErrorMessage, pickObject } from '../../utils/http';

const DisputeDetailsScreen = ({ navigation, route }) => {
  const disputeId = route?.params?.disputeId;
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState(null);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

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
      <View style={[styles.center, styles.screen]}>
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
    <SafeAreaView edges={['top']} style={styles.safeArea}>
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={21} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Case file</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={loadDispute}>
          <Icon name="refresh" size={20} color={colors.blue} />
        </TouchableOpacity>
      </View>
      <View style={styles.headerCard}>
        <View style={styles.caseTop}>
          <View style={styles.caseIcon}><Icon name="shield-checkmark-outline" size={23} color={colors.gold} /></View>
          <View style={styles.statusPill}><Text style={styles.statusText}>{dispute.status || 'open'}</Text></View>
        </View>
        <Text style={styles.eyebrow}>DISPUTE #{dispute.id}</Text>
        <Text style={styles.title}>{dispute.property_title || 'Property dispute'}</Text>
        <View style={styles.partyBlock}>
          <View style={styles.partyRow}><Text style={styles.partyLabel}>Opened by</Text><Text style={styles.partyValue}>{dispute.opened_by_name || 'Unknown'}</Text></View>
          <View style={styles.partyRow}><Text style={styles.partyLabel}>Against</Text><Text style={styles.partyValue}>{dispute.against_name || dispute.against_email || 'Unknown'}</Text></View>
        </View>
        {dispute.description ? <Text style={styles.description}>{dispute.description}</Text> : null}
        <Button
          title="Verify Evidence Integrity"
          variant="outline"
          onPress={() => navigation.navigate('VerifyCase', { disputeId: dispute.id })}
          style={styles.marginTop}
        />
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeading}><Icon name="people-outline" size={20} color={colors.blue} /><Text style={styles.cardTitle}>Assigned lawyers</Text><Text style={styles.count}>{authorized_lawyers.length}</Text></View>
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
        <View style={styles.cardHeading}><Icon name="git-branch-outline" size={20} color={colors.blue} /><Text style={styles.cardTitle}>Dispute timeline</Text><Text style={styles.count}>{timeline.length}</Text></View>
        {timeline.length === 0 ? (
          <Text style={styles.emptyText}>No timeline entries available.</Text>
        ) : (
          timeline.map((item, index) => (
            <View key={`${item.type}-${index}`} style={styles.timelineRow}>
              <View style={styles.timelineDot} />
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
        <View style={styles.cardHeading}><Icon name="folder-open-outline" size={20} color={colors.blue} /><Text style={styles.cardTitle}>Evidence</Text><Text style={styles.count}>{evidence.length}</Text></View>
        {evidence.length === 0 ? (
          <Text style={styles.emptyText}>No evidence uploaded.</Text>
        ) : (
          evidence.map((item) => {
            const evidenceUrl = buildUploadUrl(item.file_path || item.file_url || item.file_name);
            return (
              <View key={item.id} style={styles.listRow}>
                <FilePreviewCard
                  title={item.file_name || `Evidence #${item.id}`}
                  subtitle={`Uploaded by ${item.uploaded_by_name || 'Unknown'}`}
                  uri={evidenceUrl}
                  fileName={item.file_name || item.file_path || item.file_url}
                  fileSize={item.file_size}
                  mimeType={item.mime_type || item.file_type}
                  actionLabel="Open evidence"
                />
              </View>
            );
          })
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeading}><Icon name="chatbubbles-outline" size={20} color={colors.blue} /><Text style={styles.cardTitle}>Case messages</Text><Text style={styles.count}>{messages.length}</Text></View>
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
        <View style={styles.cardHeading}><Icon name="finger-print-outline" size={20} color={colors.blue} /><Text style={styles.cardTitle}>Legal audit trail</Text><Text style={styles.count}>{audit_logs.length}</Text></View>
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 18, paddingBottom: 36 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  backButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  refreshButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.surfaceBlue, alignItems: 'center', justifyContent: 'center' },
  topTitle: { fontFamily: typography.semibold, fontSize: 17, color: colors.ink },
  headerCard: {
    backgroundColor: colors.navy,
    borderRadius: radius.lg,
    padding: 20,
    marginBottom: 12,
    ...shadows.soft,
  },
  caseTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  caseIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.navySoft, alignItems: 'center', justifyContent: 'center' },
  statusPill: { paddingVertical: 6, paddingHorizontal: 11, borderRadius: radius.pill, backgroundColor: '#244572' },
  statusText: { fontFamily: typography.semibold, fontSize: 13, color: colors.white, textTransform: 'capitalize' },
  eyebrow: { fontFamily: typography.semibold, fontSize: 13, letterSpacing: 1.1, color: colors.gold },
  title: { marginTop: 7, fontFamily: typography.bold, fontSize: 24, color: colors.white },
  partyBlock: { marginTop: 16, padding: 12, borderRadius: radius.md, backgroundColor: colors.navySoft },
  partyRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 4 },
  partyLabel: { fontFamily: typography.regular, fontSize: 13, color: '#AFC3E6' },
  partyValue: { maxWidth: '67%', textAlign: 'right', fontFamily: typography.medium, fontSize: 13, color: colors.white },
  description: { marginTop: 14, fontFamily: typography.regular, color: '#D5E0F2', lineHeight: 20 },
  marginTop: { marginTop: 12 },
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 12,
  },
  cardHeading: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  cardTitle: { flex: 1, marginLeft: 8, fontFamily: typography.bold, fontSize: 16, color: colors.ink },
  count: { minWidth: 25, textAlign: 'center', paddingVertical: 3, paddingHorizontal: 7, borderRadius: radius.pill, overflow: 'hidden', backgroundColor: colors.surfaceBlue, fontFamily: typography.semibold, fontSize: 13, color: colors.blue },
  emptyText: { fontFamily: typography.regular, color: colors.muted },
  listRow: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  listTitle: { fontFamily: typography.semibold, color: colors.ink },
  listMeta: { marginTop: 4, fontFamily: typography.regular, color: colors.muted },
  timelineRow: {
    position: 'relative',
    paddingLeft: 17,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  timelineDot: { position: 'absolute', top: 15, left: 0, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.blue },
  timelineTitle: { fontFamily: typography.semibold, color: colors.ink },
  timelineMeta: { marginTop: 4, fontFamily: typography.regular, fontSize: 13, color: colors.muted },
  timelineDetails: { marginTop: 6, fontFamily: typography.regular, color: colors.text, lineHeight: 18 },
});

export default DisputeDetailsScreen;
