import React, { useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import Toast from 'react-native-toast-message';
import { AuthContext } from '../../context/AuthContext';
import { applicationService } from '../../services/applicationService';
import { getErrorMessage, pickList } from '../../utils/http';

const ApplicationsScreen = () => {
  const { user } = useContext(AuthContext);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadApplications = async () => {
    setLoading(true);
    try {
      const response =
        user?.user_type === 'tenant'
          ? await applicationService.getMyApplications()
          : await applicationService.getReceivedApplications();

      setItems(pickList(response, ['data', 'applications']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load applications'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, [user?.user_type]);

  const withdraw = async (id) => {
    try {
      await applicationService.withdrawApplication(id);
      await loadApplications();
      Toast.show({ type: 'success', text1: 'Application withdrawn' });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not withdraw application'),
      });
    }
  };

  const approve = async (id) => {
    try {
      await applicationService.approveApplication(id);
      await loadApplications();
      Toast.show({ type: 'success', text1: 'Application approved' });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not approve application'),
      });
    }
  };

  const reject = async (id) => {
    try {
      await applicationService.rejectApplication(id, 'Rejected from mobile dashboard');
      await loadApplications();
      Toast.show({ type: 'success', text1: 'Application rejected' });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not reject application'),
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0284c7" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>
        {user?.user_type === 'tenant' ? 'My Applications' : 'Received Applications'}
      </Text>

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.property_title || 'Property'}</Text>
            <Text style={styles.cardMeta}>
              {user?.user_type === 'tenant'
                ? `Landlord: ${item.landlord_name || '-'}`
                : `Tenant: ${item.tenant_name || '-'}`
              }
            </Text>
            <Text style={styles.cardMeta}>Status: {item.status || 'pending'}</Text>
            {item.message ? <Text style={styles.cardText}>{item.message}</Text> : null}

            <View style={styles.actions}>
              {user?.user_type === 'tenant' ? (
                item.status === 'pending' && (
                  <TouchableOpacity onPress={() => withdraw(item.id)}>
                    <Text style={styles.warnText}>Withdraw</Text>
                  </TouchableOpacity>
                )
              ) : (
                <>
                  <TouchableOpacity onPress={() => approve(item.id)}>
                    <Text style={styles.linkText}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => reject(item.id)}>
                    <Text style={styles.warnText}>Reject</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No applications found.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: {
    textAlign: 'center',
    marginVertical: 12,
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  list: { paddingHorizontal: 14, paddingBottom: 20 },
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  cardMeta: { marginTop: 4, color: '#475569' },
  cardText: { marginTop: 8, color: '#334155' },
  actions: { flexDirection: 'row', gap: 16, marginTop: 10 },
  linkText: { color: '#0284c7', fontWeight: '700' },
  warnText: { color: '#dc2626', fontWeight: '700' },
  empty: { marginTop: 40, textAlign: 'center', color: '#64748b' },
});

export default ApplicationsScreen;
