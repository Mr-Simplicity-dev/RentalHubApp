import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Toast from 'react-native-toast-message';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { superAdminService } from '../../services/superAdminService';
import { getErrorMessage, pickList, pickObject } from '../../utils/http';

const sections = ['overview', 'users', 'verifications', 'properties', 'reports', 'broadcasts', 'flags', 'fraud', 'logs'];

const SectionButton = ({ label, active, onPress }) => (
  <TouchableOpacity style={[styles.tabBtn, active && styles.tabBtnActive]} onPress={onPress}>
    <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
  </TouchableOpacity>
);

const SuperAdminDashboardScreen = () => {
  const [section, setSection] = useState('overview');
  const [analytics, setAnalytics] = useState({});
  const [users, setUsers] = useState([]);
  const [verifications, setVerifications] = useState([]);
  const [properties, setProperties] = useState([]);
  const [reports, setReports] = useState([]);
  const [broadcasts, setBroadcasts] = useState([]);
  const [flags, setFlags] = useState([]);
  const [fraud, setFraud] = useState([]);
  const [logs, setLogs] = useState([]);
  const [broadcastForm, setBroadcastForm] = useState({
    title: '',
    message: '',
    target_role: '',
  });

  const loadAll = async () => {
    try {
      const [
        usersResponse,
        propertiesResponse,
        analyticsResponse,
        reportsResponse,
        broadcastsResponse,
        flagsResponse,
        fraudResponse,
        verificationsResponse,
        logsResponse,
      ] = await Promise.all([
        superAdminService.getUsers(),
        superAdminService.getProperties(),
        superAdminService.getAnalytics(),
        superAdminService.getReports(),
        superAdminService.getBroadcasts(),
        superAdminService.getFlags(),
        superAdminService.getFraudFlags(),
        superAdminService.getVerifications(),
        superAdminService.getLogs(),
      ]);

      setUsers(pickList(usersResponse, ['users', 'data']));
      setProperties(pickList(propertiesResponse, ['properties', 'data']));
      setAnalytics(pickObject(analyticsResponse, ['data']) || {});
      setReports(pickList(reportsResponse, ['reports', 'data']));
      setBroadcasts(pickList(broadcastsResponse, ['broadcasts', 'data']));
      setFlags(pickList(flagsResponse, ['flags', 'data']));
      setFraud(pickList(fraudResponse, ['flags', 'data']));
      setVerifications(pickList(verificationsResponse, ['data', 'verifications']));
      setLogs(pickList(logsResponse, ['logs', 'data']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load super admin data'),
      });
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const runAction = async (action, successMessage) => {
    try {
      await action();
      await loadAll();
      Toast.show({ type: 'success', text1: successMessage });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Action failed'),
      });
    }
  };

  const renderOverview = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Analytics Overview</Text>
      {Object.keys(analytics).length === 0 ? (
        <Text style={styles.meta}>No analytics data.</Text>
      ) : (
        Object.entries(analytics).map(([key, value]) => (
          <Text key={key} style={styles.meta}>
            {key}: {String(value)}
          </Text>
        ))
      )}
    </View>
  );

  const renderUsers = () => users.map((item) => (
    <View key={item.id} style={styles.card}>
      <Text style={styles.cardTitle}>{item.full_name}</Text>
      <Text style={styles.meta}>{item.email}</Text>
      <Text style={styles.meta}>Role: {item.user_type}</Text>
      <View style={styles.row}>
        <TouchableOpacity onPress={() => runAction(() => superAdminService.banUser(item.id), 'User banned')}>
          <Text style={styles.warnText}>Ban</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => runAction(() => superAdminService.unbanUser(item.id), 'User unbanned')}>
          <Text style={styles.linkText}>Unban</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => runAction(() => superAdminService.promoteUser(item.id), 'User promoted')}>
          <Text style={styles.linkText}>Promote</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => runAction(() => superAdminService.deleteUser(item.id), 'User deleted')}>
          <Text style={styles.warnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  ));

  const renderVerifications = () => verifications.map((item) => (
    <View key={item.id} style={styles.card}>
      <Text style={styles.cardTitle}>{item.full_name}</Text>
      <Text style={styles.meta}>{item.email}</Text>
      <View style={styles.row}>
        <TouchableOpacity onPress={() => runAction(() => superAdminService.approveVerification(item.id), 'Verification approved')}>
          <Text style={styles.linkText}>Approve</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => runAction(() => superAdminService.rejectVerification(item.id), 'Verification rejected')}>
          <Text style={styles.warnText}>Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  ));

  const renderProperties = () => properties.map((item) => (
    <View key={item.id} style={styles.card}>
      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.meta}>{item.landlord_name || 'No landlord'}</Text>
      <TouchableOpacity onPress={() => runAction(() => superAdminService.unlistProperty(item.id), 'Property unlisted')}>
        <Text style={styles.warnText}>Unlist Property</Text>
      </TouchableOpacity>
    </View>
  ));

  const renderReports = () => reports.map((item) => (
    <View key={item.id} style={styles.card}>
      <Text style={styles.cardTitle}>{item.reason || item.report_reason || `Report #${item.id}`}</Text>
      <Text style={styles.meta}>Status: {item.status || 'open'}</Text>
      <TouchableOpacity onPress={() => runAction(() => superAdminService.resolveReport(item.id), 'Report resolved')}>
        <Text style={styles.linkText}>Resolve</Text>
      </TouchableOpacity>
    </View>
  ));

  const renderBroadcasts = () => (
    <>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Send Broadcast</Text>
        <Input
          label="Title"
          value={broadcastForm.title}
          onChangeText={(value) => setBroadcastForm((prev) => ({ ...prev, title: value }))}
        />
        <Input
          label="Message"
          value={broadcastForm.message}
          onChangeText={(value) => setBroadcastForm((prev) => ({ ...prev, message: value }))}
          multiline
          numberOfLines={4}
        />
        <Input
          label="Target Role"
          value={broadcastForm.target_role}
          onChangeText={(value) => setBroadcastForm((prev) => ({ ...prev, target_role: value }))}
          placeholder="tenant, landlord, admin, lawyer"
        />
        <Button
          title="Send Broadcast"
          onPress={() =>
            runAction(() => superAdminService.createBroadcast(broadcastForm), 'Broadcast sent')
          }
        />
      </View>
      {broadcasts.map((item) => (
        <View key={item.id} style={styles.card}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.meta}>{item.message}</Text>
          <Text style={styles.meta}>Target: {item.target_role || 'all'}</Text>
        </View>
      ))}
    </>
  );

  const renderFlags = () => flags.map((item) => (
    <View key={item.key || item.id} style={styles.card}>
      <Text style={styles.cardTitle}>{item.key || item.name}</Text>
      <Text style={styles.meta}>Enabled: {String(item.enabled)}</Text>
      <TouchableOpacity
        onPress={() => runAction(
          () => superAdminService.updateFlag(item.key, !item.enabled),
          'Flag updated'
        )}
      >
        <Text style={styles.linkText}>Toggle Flag</Text>
      </TouchableOpacity>
    </View>
  ));

  const renderFraud = () => fraud.map((item) => (
    <View key={item.id} style={styles.card}>
      <Text style={styles.cardTitle}>{item.rule || 'Fraud rule'}</Text>
      <Text style={styles.meta}>Score: {item.score}</Text>
      <TouchableOpacity onPress={() => runAction(() => superAdminService.resolveFraudFlag(item.id), 'Fraud flag resolved')}>
        <Text style={styles.linkText}>Resolve</Text>
      </TouchableOpacity>
    </View>
  ));

  const renderLogs = () => logs.map((item, index) => (
    <View key={`${item.id || 'log'}-${index}`} style={styles.card}>
      <Text style={styles.cardTitle}>{item.action || item.event_type || 'Audit log'}</Text>
      <Text style={styles.meta}>{item.user_name || item.actor_name || 'System'}</Text>
      <Text style={styles.meta}>{item.created_at ? new Date(item.created_at).toLocaleString() : ''}</Text>
    </View>
  ));

  const renderedSection = {
    overview: renderOverview(),
    users: renderUsers(),
    verifications: renderVerifications(),
    properties: renderProperties(),
    reports: renderReports(),
    broadcasts: renderBroadcasts(),
    flags: renderFlags(),
    fraud: renderFraud(),
    logs: renderLogs(),
  }[section];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Super Admin Control Center</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabRow}>
        {sections.map((item) => (
          <SectionButton
            key={item}
            label={item}
            active={section === item}
            onPress={() => setSection(item)}
          />
        ))}
      </ScrollView>
      {renderedSection}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 24 },
  title: { fontSize: 28, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
  tabRow: { marginBottom: 12 },
  tabBtn: {
    marginRight: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  tabBtnActive: { backgroundColor: '#0284c7', borderColor: '#0284c7' },
  tabText: { color: '#1d4ed8', fontWeight: '700', textTransform: 'capitalize' },
  tabTextActive: { color: '#ffffff' },
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  meta: { marginTop: 4, color: '#475569' },
  row: { flexDirection: 'row', gap: 16, marginTop: 10, flexWrap: 'wrap' },
  linkText: { color: '#0284c7', fontWeight: '700' },
  warnText: { color: '#dc2626', fontWeight: '700' },
});

export default SuperAdminDashboardScreen;
