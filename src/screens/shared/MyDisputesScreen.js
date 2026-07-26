import React, { useEffect, useLayoutEffect, useState } from 'react';
import {ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import api from '../../services/api';
import { colors, radius, typography } from '../../theme';
import { getErrorMessage, pickList } from '../../utils/http';

import AppText from '../../components/common/AppText';
const STATUS_CONFIG = {
  pending: { color: colors.blue, bg: '#EFF6FF', label: 'Pending' },
  resolved: { color: colors.success, bg: '#F0FBF6', label: 'Resolved' },
  rejected: { color: colors.danger, bg: '#FFF0EF', label: 'Rejected' },
  open: { color: colors.blue, bg: '#EFF6FF', label: 'Open' },
  in_review: { color: '#B46B00', bg: '#FFFBEB', label: 'In Review' },
};

const getStatusStyle = (status) => {
  const key = String(status || 'pending').toLowerCase().replace(/\s+/g, '_');
  return STATUS_CONFIG[key] || STATUS_CONFIG.pending;
};

const formatDate = (value) => {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(value);
  }
};

const MyDisputesScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState([]);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const loadDisputes = async ({ refresh = false } = {}) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const response = await api.get('/disputes/my');
      setItems(pickList(response, ['data', 'disputes']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Could not load disputes',
        text2: getErrorMessage(error, 'Please check your connection and try again.'),
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDisputes();
  }, []);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ property_id: '', title: '', description: '', against_user: '' });
  const [creating, setCreating] = useState(false);

  const handleCreateDispute = async () => {
    const { property_id, title, description, against_user } = createForm;
    if (!property_id || !title || !description || !against_user) {
      Toast.show({ type: 'info', text1: 'All fields are required' });
      return;
    }
    setCreating(true);
    try {
      const res = await api.post('/disputes', {
        property_id: Number(property_id),
        against_user: Number(against_user),
        title: title.trim(),
        description: description.trim(),
      });
      if (res.data?.success) {
        Toast.show({ type: 'success', text1: 'Dispute created' });
        setCreateOpen(false);
        setCreateForm({ property_id: '', title: '', description: '', against_user: '' });
        loadDisputes();
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Create failed',
        text2: getErrorMessage(error, 'Could not create dispute'),
      });
    } finally {
      setCreating(false);
    }
  };

  const renderDisputeCard = ({ item }) => {
    const status = getStatusStyle(item.status);

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => navigation.navigate('DisputeDetails', { disputeId: item.id })}
        style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.iconContainer}>
            <Icon name="shield-outline" size={20} color={colors.blue} />
          </View>
          <View style={styles.cardHeader}>
            <AppText style={styles.cardTitle} numberOfLines={1}>
              {item.title || 'Untitled Dispute'}
            </AppText>
            <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
              <AppText style={[styles.statusText, { color: status.color }]}>{status.label}</AppText>
            </View>
          </View>
        </View>

        {item.property_name ? (
          <View style={styles.metaRow}>
            <Icon name="business-outline" size={14} color={colors.muted} />
            <AppText style={styles.metaText} numberOfLines={1}>
              {item.property_name}
            </AppText>
          </View>
        ) : null}

        <View style={styles.metaRow}>
          <Icon name="calendar-outline" size={14} color={colors.muted} />
          <AppText style={styles.metaText}>{formatDate(item.created_at || item.date)}</AppText>
        </View>

        <View style={styles.cardArrow}>
          <Icon name="chevron-forward" size={17} color={colors.muted} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityLabel="Go back"
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Icon name="arrow-back" size={22} color={colors.navy} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <AppText style={styles.eyebrow}>CONFLICT RESOLUTION</AppText>
          <AppText style={styles.title}>My disputes</AppText>
        </View>
        <TouchableOpacity
          accessibilityLabel="Create dispute"
          onPress={() => setCreateOpen(true)}
          style={styles.createButton}>
          <Icon name="add" size={24} color={colors.blue} />
        </TouchableOpacity>
      </View>

      <FlatList
        contentContainerStyle={[styles.list, !items.length && styles.emptyList]}
        data={items}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={
          !loading && items.length ? (
            <AppText style={styles.summary}>
              {items.length} {items.length === 1 ? 'dispute' : 'disputes'} on file
            </AppText>
          ) : null
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.blue} size="large" />
              <AppText style={styles.loadingText}>Loading your disputes…</AppText>
            </View>
          ) : (
            <View style={styles.center}>
              <View style={styles.emptyIcon}>
                <Icon name="shield-outline" size={31} color={colors.blue} />
              </View>
              <AppText style={styles.emptyTitle}>No disputes yet</AppText>
              <AppText style={styles.emptyText}>
                You have not filed any disputes. If you run into an issue with a property, you can raise a dispute from the property or application screen.
              </AppText>
            </View>
          )
        }
        refreshControl={
          <RefreshControl
            colors={[colors.blue]}
            onRefresh={() => loadDisputes({ refresh: true })}
            refreshing={refreshing}
            tintColor={colors.blue}
          />
        }
        renderItem={renderDisputeCard}
        showsVerticalScrollIndicator={false}
      />

      <Modal visible={createOpen} transparent animationType="slide" onRequestClose={() => setCreateOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setCreateOpen(false)}>
          <Pressable style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <AppText style={styles.modalTitle}>Create dispute</AppText>
              <TouchableOpacity onPress={() => setCreateOpen(false)}>
                <Icon name="close" size={22} color={colors.muted} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <AppText style={styles.fieldLabel}>Property ID *</AppText>
              <TextInput style={styles.input} value={createForm.property_id} onChangeText={(v) => setCreateForm((p) => ({ ...p, property_id: v }))} placeholder="e.g. 42" keyboardType="number-pad" placeholderTextColor={colors.muted} />
              <AppText style={styles.fieldLabel}>User ID to dispute against *</AppText>
              <TextInput style={styles.input} value={createForm.against_user} onChangeText={(v) => setCreateForm((p) => ({ ...p, against_user: v }))} placeholder="e.g. 7" keyboardType="number-pad" placeholderTextColor={colors.muted} />
              <AppText style={styles.fieldLabel}>Title *</AppText>
              <TextInput style={styles.input} value={createForm.title} onChangeText={(v) => setCreateForm((p) => ({ ...p, title: v }))} placeholder="Dispute title" placeholderTextColor={colors.muted} />
              <AppText style={styles.fieldLabel}>Description *</AppText>
              <TextInput style={[styles.input, styles.descInput]} value={createForm.description} onChangeText={(v) => setCreateForm((p) => ({ ...p, description: v }))} placeholder="Describe the issue" multiline placeholderTextColor={colors.muted} />
              <AppText style={styles.hint}>Find Property ID and user IDs on the property detail page.</AppText>
            </ScrollView>
            <TouchableOpacity style={[styles.submitBtn, creating && { opacity: 0.6 }]} disabled={creating} onPress={handleCreateDispute}>
              {creating ? <ActivityIndicator color={colors.white} /> : <AppText style={styles.submitBtnText}>Create dispute</AppText>}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.surface,
    flex: 1,
  },
  header: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 21,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  headerCopy: {
    alignItems: 'center',
    flex: 1,
  },
  headerSpacer: {
    width: 42,
  },
  eyebrow: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: 13,
    letterSpacing: 1.25,
  },
  title: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 20,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  list: {
    padding: 16,
    paddingBottom: 30,
  },
  emptyList: {
    flexGrow: 1,
  },
  summary: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 13,
    marginBottom: 13,
  },
  center: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 420,
    paddingHorizontal: 24,
  },
  loadingText: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 13,
    marginTop: 12,
  },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderRadius: 34,
    height: 68,
    justifyContent: 'center',
    width: 68,
  },
  emptyTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 20,
    marginTop: 18,
  },
  emptyText: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: 12,
    padding: 14,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderRadius: 12,
    height: 38,
    justifyContent: 'center',
    marginRight: 12,
    width: 38,
  },
  cardHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.semibold,
    fontSize: 14,
  },
  statusBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  statusText: {
    fontFamily: typography.bold,
    fontSize: 13,
    textTransform: 'uppercase',
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 10,
  },
  metaText: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    marginLeft: 7,
  },
  cardArrow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  createButton: {
    alignItems: 'center',
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  modalBackdrop: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    maxHeight: '80%',
    padding: 20,
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 18,
  },
  fieldLabel: {
    color: colors.ink,
    fontFamily: typography.medium,
    fontSize: 13,
    marginBottom: 4,
    marginTop: 12,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.ink,
    fontFamily: typography.regular,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  descInput: {
    height: 90,
    textAlignVertical: 'top',
  },
  hint: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  submitBtn: {
    alignItems: 'center',
    backgroundColor: colors.blue,
    borderRadius: radius.sm,
    marginTop: 16,
    paddingVertical: 13,
  },
  submitBtnText: {
    color: colors.white,
    fontFamily: typography.bold,
    fontSize: 14,
  },
});

export default MyDisputesScreen;
