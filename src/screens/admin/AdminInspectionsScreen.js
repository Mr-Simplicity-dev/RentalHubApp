import React, { useCallback, useContext, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../services/api';
import Input from '../../components/common/Input';
import { getErrorMessage, pickList } from '../../utils/http';
import {
  InfoRow,
  PremiumButton,
  PremiumCard,
  PremiumCenter,
  PremiumHero,
  PremiumListScreen,
  StatusPill,
} from '../../components/common/PremiumLayout';
import { AuthContext } from '../../context/AuthContext';
import { colors, typography } from '../../theme';

import AppText from '../../components/common/AppText';
const STATUS_COLORS = {
  pending: colors.blue,
  paid: '#B7791F',
  assigned: colors.blue,
  inspecting: '#B7791F',
  completed: colors.success,
  cancelled: colors.danger,
};

const AdminInspectionsScreen = () => {
  const { user } = useContext(AuthContext);
  const adminId = user?.id;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState(null);
  const [modal, setModal] = useState(null); // { item, action }
  const [summaryText, setSummaryText] = useState('');
  const [noteText, setNoteText] = useState('');
  const [modalBusy, setModalBusy] = useState(false);
  const [modalError, setModalError] = useState('');

  const loadInspections = useCallback(async ({ refresh = false } = {}) => {
    refresh ? setLoading(true) : setLoading(true);
    try {
      const response = await api.get('/admin/inspections');
      setItems(pickList(response?.data || response, ['data']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load inspections'),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadInspections();
    }, [loadInspections])
  );

  const mine = (item) =>
    !item.assigned_admin_id || String(item.assigned_admin_id) === String(adminId);

  const assignItem = async (item) => {
    setBusyKey(`${item.id}:assign`);
    try {
      const res = await api.post(`/admin/inspections/${item.id}/assign`);
      if (res.data?.success) {
        Toast.show({ type: 'success', text1: 'Assigned to you' });
        await loadInspections();
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Assign failed',
        text2: getErrorMessage(error, 'Could not assign inspection'),
      });
    } finally {
      setBusyKey(null);
    }
  };

  const openAction = (item, action) => {
    setModal({ item, action });
    setSummaryText('');
    setNoteText('');
    setModalError('');
  };

  const submitAction = async () => {
    if (!modal) return;
    const { item, action } = modal;
    const body = {};
    if (action === 'start') {
      if (noteText.trim()) body.admin_note = noteText.trim();
    } else if (action === 'cancel') {
      if (!noteText.trim()) {
        setModalError('A cancellation reason is required.');
        return;
      }
      body.cancellation_reason = noteText.trim();
    } else if (action === 'complete') {
      if (!summaryText.trim()) {
        setModalError('An inspection summary is required.');
        return;
      }
      body.inspection_summary = summaryText.trim();
      if (noteText.trim()) body.admin_note = noteText.trim();
    }

    setModalBusy(true);
    setModalError('');
    try {
      const res = await api.post(`/admin/inspections/${item.id}/${action}`, body);
      if (res.data?.success) {
        Toast.show({ type: 'success', text1: `Inspection ${action}d` });
        setModal(null);
        await loadInspections();
      }
    } catch (error) {
      setModalError(getErrorMessage(error, `Could not ${action} the inspection`));
    } finally {
      setModalBusy(false);
    }
  };

  const canAssign = (item) =>
    ['pending', 'paid'].includes(item.status) ||
    (item.status === 'assigned' && mine(item));
  const canStart = (item) => item.status === 'assigned' && mine(item);
  const canComplete = (item) =>
    ['assigned', 'inspecting'].includes(item.status) && mine(item);
  const canCancel = (item) =>
    !['completed', 'cancelled'].includes(item.status) && mine(item);

  if (loading && items.length === 0) {
    return <PremiumCenter loading title="Loading inspections" />;
  }

  return (
    <>
      <PremiumListScreen
        data={items}
        refreshing={loading}
        onRefresh={() => loadInspections({ refresh: true })}
        keyExtractor={(item) => String(item.id)}
        emptyTitle="No inspections found"
        emptyMessage="Scheduled or completed inspections will appear here."
        emptyIcon="search-outline"
        header={
          <PremiumHero
            eyebrow="Operations"
            title="Inspections"
            subtitle="Assign, start, complete or cancel inspection requests."
            icon="search-outline"
            right={<StatusPill label={`${items.length} records`} color={colors.blue} />}
          />
        }
        renderItem={({ item }) => {
          const status = item.status || 'pending';
          const badgeColor = STATUS_COLORS[status] || colors.blue;
          const showAssign = canAssign(item);
          const showStart = canStart(item);
          const showComplete = canComplete(item);
          const showCancel = canCancel(item);
          const anyAction = showAssign || showStart || showComplete || showCancel;

          return (
            <PremiumCard>
              <View style={styles.cardHeader}>
                <View style={styles.inspectionIcon}>
                  <AppText style={styles.inspectionIconText}>IN</AppText>
                </View>
                <View style={styles.cardCopy}>
                  <AppText style={styles.cardTitle}>
                    {item.property_name || item.property_title || 'Property'}
                  </AppText>
                  <StatusPill label={status} color={badgeColor} />
                </View>
              </View>
              <InfoRow icon="person-outline" label="Tenant" value={item.tenant_name || 'N/A'} />
              <InfoRow
                icon="shield-outline"
                label="Assigned admin"
                value={item.assigned_admin_name || 'Unassigned'}
              />
              <InfoRow
                icon="calendar-outline"
                label="Requested"
                value={item.requested_at ? new Date(item.requested_at).toLocaleString() : 'N/A'}
              />
              <InfoRow
                icon="location-outline"
                label="Location"
                value={[item.lga_name, item.state_name].filter(Boolean).join(', ') || 'N/A'}
              />
              {item.cancellation_reason ? (
                <InfoRow icon="close-circle-outline" label="Cancelled" value={item.cancellation_reason} />
              ) : null}

              {anyAction ? (
                <View style={styles.actions}>
                  {showAssign ? (
                    <PremiumButton
                      title="Assign to me"
                      onPress={() => assignItem(item)}
                      loading={busyKey === `${item.id}:assign`}
                      icon="person-add-outline"
                      style={styles.actionButton}
                    />
                  ) : null}
                  {showStart ? (
                    <PremiumButton
                      title="Start"
                      onPress={() => openAction(item, 'start')}
                      icon="play-outline"
                      style={styles.actionButton}
                    />
                  ) : null}
                  {showComplete ? (
                    <PremiumButton
                      title="Complete"
                      onPress={() => openAction(item, 'complete')}
                      icon="checkmark-circle-outline"
                      style={styles.actionButton}
                    />
                  ) : null}
                  {showCancel ? (
                    <PremiumButton
                      title="Cancel"
                      variant="ghost"
                      onPress={() => openAction(item, 'cancel')}
                      icon="close-circle-outline"
                      style={styles.actionButton}
                    />
                  ) : null}
                </View>
              ) : null}
            </PremiumCard>
          );
        }}
      />

      {modal ? (
        <Modal transparent visible animationType="fade" onRequestClose={() => setModal(null)}>
          <View style={styles.overlay}>
            <View style={styles.modalCard}>
              <AppText style={styles.modalTitle}>
                {modal.action === 'start'
                  ? 'Start inspection'
                  : modal.action === 'cancel'
                    ? 'Cancel inspection'
                    : 'Complete inspection'}
              </AppText>
              <AppText style={styles.modalSubtitle}>
                {modal.item.property_name || modal.item.property_title || 'Property'}
              </AppText>

              {modal.action === 'complete' ? (
                <Input
                  label="Inspection summary"
                  value={summaryText}
                  onChangeText={setSummaryText}
                  placeholder="Summarise what was found"
                  multiline
                  numberOfLines={4}
                  containerStyle={styles.fieldGap}
                />
              ) : null}

              <Input
                label={
                  modal.action === 'start'
                    ? 'Note (optional)'
                    : modal.action === 'cancel'
                      ? 'Cancellation reason'
                      : 'Admin note (optional)'
                }
                value={noteText}
                onChangeText={setNoteText}
                placeholder={
                  modal.action === 'cancel'
                    ? 'Explain why this inspection is being cancelled'
                    : 'Optional note for the record'
                }
                multiline
                numberOfLines={3}
                containerStyle={styles.fieldGap}
              />

              {modalError ? <AppText style={styles.error}>{modalError}</AppText> : null}

              <View style={styles.modalActions}>
                <PremiumButton
                  title="Cancel"
                  variant="ghost"
                  onPress={() => setModal(null)}
                  disabled={modalBusy}
                  style={styles.actionButton}
                />
                <PremiumButton
                  title={modalBusy ? 'Working…' : 'Confirm'}
                  onPress={submitAction}
                  loading={modalBusy}
                  style={styles.actionButton}
                />
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </>
  );
};

const styles = StyleSheet.create({
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 6,
  },
  inspectionIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderRadius: 18,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  inspectionIconText: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: 13,
  },
  cardCopy: {
    flex: 1,
    gap: 7,
  },
  cardTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 16,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    minWidth: 120,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(7, 26, 61, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 20,
  },
  modalTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 18,
  },
  modalSubtitle: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    marginTop: 4,
  },
  fieldGap: {
    marginTop: 12,
  },
  error: {
    color: colors.danger,
    fontFamily: typography.medium,
    fontSize: 13,
    marginTop: 10,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
});

export default AdminInspectionsScreen;
