import React, { useEffect, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/Ionicons';
import { serviceAdminService } from '../../services/serviceAdminService';
import { getErrorMessage, pickList } from '../../utils/http';
import { colors, radius, typography } from '../../theme';
import {
  DashboardHero,
  DashboardNotice,
  DashboardScreen,
  DashboardSection,
} from '../../components/dashboard/DashboardKit';

const TYPE_CONFIG = {
  transportation: {
    title: 'Transportation bookings',
    eyebrow: 'TRANSPORT OPS',
    icon: 'car-outline',
  },
  transportation_state: {
    title: 'State transport bookings',
    eyebrow: 'STATE TRANSPORT OPS',
    icon: 'car-sport-outline',
  },
  transportation_super: {
    title: 'System transport bookings',
    eyebrow: 'SUPER TRANSPORT OPS',
    icon: 'bus-outline',
  },
  fumigation: {
    title: 'Fumigation & cleaning bookings',
    eyebrow: 'SERVICE OPS',
    icon: 'sparkles-outline',
  },
};

const TRANSPORT_STATUS_ACTIONS = [
  { label: 'Confirm', value: 'confirmed', icon: 'checkmark-circle-outline' },
  { label: 'Start', value: 'in_progress', icon: 'play-circle-outline' },
  { label: 'Complete', value: 'completed', icon: 'flag-outline' },
  { label: 'Cancel', value: 'cancelled', icon: 'close-circle-outline', danger: true },
];

const FUMIGATION_STATUS_ACTIONS = [
  { label: 'Confirm', value: 'confirmed', icon: 'checkmark-circle-outline' },
  { label: 'Schedule', value: 'scheduled', icon: 'calendar-outline' },
  { label: 'Start', value: 'in_progress', icon: 'play-circle-outline' },
  { label: 'Complete', value: 'completed', icon: 'flag-outline' },
  { label: 'Cancel', value: 'cancelled', icon: 'close-circle-outline', danger: true },
];

const PAYMENT_STATUS_ACTIONS = [
  { label: 'Mark paid', value: 'completed', icon: 'card-outline' },
  { label: 'Failed', value: 'failed', icon: 'alert-circle-outline', danger: true },
  { label: 'Refunded', value: 'refunded', icon: 'return-down-back-outline' },
];

const FUMIGATION_LIFECYCLE_ACTIONS = [
  { label: 'Accepted', value: 'accepted', icon: 'person-add-outline' },
  { label: 'On site', value: 'in_progress', icon: 'walk-outline' },
  { label: 'Done', value: 'completed', icon: 'shield-checkmark-outline' },
];

const TRANSPORT_DISPATCH_ACTIONS = [
  { label: 'Pickup done', value: 'pickup_confirmed', icon: 'navigate-outline' },
  { label: 'Dropoff done', value: 'dropoff_confirmed', icon: 'checkmark-done-outline' },
  { label: 'Cancel trip', value: 'cancelled', icon: 'close-circle-outline', danger: true },
];

const statusColor = (status) => {
  if (status === 'completed') return colors.success;
  if (status === 'cancelled' || status === 'failed') return colors.danger;
  if (status === 'pending') return '#A66B00';
  return colors.blue;
};

const getBookingDate = (booking) =>
  booking.booking_date || booking.scheduled_date || booking.preferred_date || booking.created_at || '';

const getUpdatedBooking = (response) => response?.data || response?.booking || response;

const pickOperations = (response) => {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.operations)) return response.data.operations;
  if (Array.isArray(response?.operations)) return response.operations;
  return [];
};

const pickAssignment = (response) => response?.data?.assignment || response?.assignment || null;

const ServiceBookingsScreen = ({ navigation, route }) => {
  const type = route?.params?.type || 'transportation';
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.transportation;
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState('');
  const [operationsByBooking, setOperationsByBooking] = useState({});
  const [assignmentByBooking, setAssignmentByBooking] = useState({});

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const loadBookings = async () => {
    setLoading(true);
    try {
      let response;
      if (type === 'fumigation') {
        response = await serviceAdminService.getFumigationBookings({ limit: 50 });
      } else if (type === 'transportation_state') {
        response = await serviceAdminService.getTransportationStateBookings({ limit: 50 });
      } else {
        response = await serviceAdminService.getTransportationBookings({ limit: 50 });
      }
      const nextBookings = pickList(response, ['data', 'bookings']);
      setBookings(nextBookings);
      setOperationsByBooking({});
      setAssignmentByBooking(
        nextBookings.reduce((assignments, booking) => {
          const bookingId = booking.id || booking.booking_id;
          if (bookingId && booking.assigned_provider) {
            assignments[bookingId] = booking.assigned_provider;
          }
          return assignments;
        }, {})
      );
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Bookings unavailable',
        text2: getErrorMessage(error, 'Could not load bookings'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, [type]);

  const mergeBooking = (bookingId, response) => {
    const updatedBooking = getUpdatedBooking(response);
    if (!updatedBooking || typeof updatedBooking !== 'object') {
      loadBookings();
      return;
    }

    setBookings((current) =>
      current.map((item) => {
        const itemId = item.id || item.booking_id;
        return String(itemId) === String(bookingId) ? { ...item, ...updatedBooking } : item;
      })
    );
  };

  const updateBookingStatus = async (booking, nextStatus) => {
    const bookingId = booking.id || booking.booking_id;
    const actionKey = `${bookingId}:status:${nextStatus}`;
    setActioning(actionKey);
    try {
      const payload =
        type === 'fumigation'
          ? {
              status: nextStatus,
              update_data: {
                admin_note: `Updated from mobile admin workspace to ${nextStatus}`,
              },
            }
          : {
              booking_status: nextStatus,
              admin_notes: `Updated from mobile admin workspace to ${nextStatus}`,
            };

      const response =
        type === 'fumigation'
          ? await serviceAdminService.updateFumigationBookingStatus(bookingId, payload)
          : await serviceAdminService.updateTransportationBookingStatus(bookingId, payload);

      mergeBooking(bookingId, response);
      Toast.show({
        type: 'success',
        text1: 'Booking updated',
        text2: `Booking #${bookingId} is now ${nextStatus.replace(/_/g, ' ')}.`,
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Update failed',
        text2: getErrorMessage(error, 'Could not update this booking'),
      });
    } finally {
      setActioning('');
    }
  };

  const updatePaymentStatus = async (booking, nextStatus) => {
    const bookingId = booking.id || booking.booking_id;
    const actionKey = `${bookingId}:payment:${nextStatus}`;
    setActioning(actionKey);
    try {
      const response = await serviceAdminService.updateTransportationPaymentStatus(bookingId, {
        payment_status: nextStatus,
        admin_notes: `Payment updated from mobile admin workspace to ${nextStatus}`,
      });
      mergeBooking(bookingId, response);
      Toast.show({
        type: 'success',
        text1: 'Payment updated',
        text2: `Payment for booking #${bookingId} is now ${nextStatus}.`,
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Payment update failed',
        text2: getErrorMessage(error, 'Could not update payment status'),
      });
    } finally {
      setActioning('');
    }
  };

  const loadOperations = async (booking) => {
    const bookingId = booking.id || booking.booking_id;
    const actionKey = `${bookingId}:operations`;
    setActioning(actionKey);
    try {
      const response =
        type === 'fumigation'
          ? await serviceAdminService.getFumigationBookingOperations(bookingId)
          : await serviceAdminService.getTransportationBookingOperations(bookingId);
      setOperationsByBooking((current) => ({
        ...current,
        [bookingId]: pickOperations(response),
      }));
      const assignment = pickAssignment(response);
      if (assignment) {
        setAssignmentByBooking((current) => ({ ...current, [bookingId]: assignment }));
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Timeline unavailable',
        text2: getErrorMessage(error, 'Could not load booking operations'),
      });
    } finally {
      setActioning('');
    }
  };

  const assignProvider = async (booking, provider) => {
    const bookingId = booking.id || booking.booking_id;
    const actionKey = `${bookingId}:assign:${provider.id}`;
    setActioning(actionKey);
    try {
      const response = await serviceAdminService.assignFumigationProvider(bookingId, provider.id);
      setAssignmentByBooking((current) => ({
        ...current,
        [bookingId]: getUpdatedBooking(response) || provider,
      }));
      await loadOperations(booking);
      Toast.show({
        type: 'success',
        text1: 'Provider assigned',
        text2: provider.company_name || provider.contact_person || 'Provider assigned to booking.',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Assignment failed',
        text2: getErrorMessage(error, 'Could not assign provider'),
      });
    } finally {
      setActioning('');
    }
  };

  const chooseProvider = async (booking) => {
    const bookingId = booking.id || booking.booking_id;
    const actionKey = `${bookingId}:providers`;
    setActioning(actionKey);
    try {
      const response = await serviceAdminService.getAvailableFumigationProviders(bookingId);
      const providers = pickList(response, ['data', 'providers']);
      if (!providers.length) {
        Toast.show({
          type: 'info',
          text1: 'No provider available',
          text2: 'No active provider was returned for this service area.',
        });
        return;
      }

      Alert.alert(
        'Assign provider',
        'Choose a provider for this booking.',
        [
          { text: 'Cancel', style: 'cancel' },
          ...providers.slice(0, 5).map((provider) => ({
            text: provider.company_name || provider.contact_person || `Provider #${provider.id}`,
            onPress: () => assignProvider(booking, provider),
          })),
        ]
      );
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Providers unavailable',
        text2: getErrorMessage(error, 'Could not load available providers'),
      });
    } finally {
      setActioning('');
    }
  };

  const updateProviderLifecycle = async (booking, action) => {
    const bookingId = booking.id || booking.booking_id;
    const actionKey = `${bookingId}:provider:${action.value}`;
    setActioning(actionKey);
    try {
      const response = await serviceAdminService.updateFumigationProviderLifecycle(bookingId, {
        action: action.value,
        note: `Updated from mobile admin workspace: ${action.value}`,
      });
      mergeBooking(bookingId, response?.data?.booking || response);
      await loadOperations(booking);
      Toast.show({ type: 'success', text1: 'Provider operation updated' });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Provider update failed',
        text2: getErrorMessage(error, 'Could not update provider operation'),
      });
    } finally {
      setActioning('');
    }
  };

  const updateDispatchLifecycle = async (booking, action) => {
    const bookingId = booking.id || booking.booking_id;
    const actionKey = `${bookingId}:dispatch:${action.value}`;
    setActioning(actionKey);
    try {
      const response = await serviceAdminService.updateTransportationDispatch(bookingId, {
        action: action.value,
        note: `Updated from mobile admin workspace: ${action.value}`,
      });
      mergeBooking(bookingId, response);
      await loadOperations(booking);
      Toast.show({ type: 'success', text1: 'Dispatch operation updated' });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Dispatch update failed',
        text2: getErrorMessage(error, 'Could not update dispatch operation'),
      });
    } finally {
      setActioning('');
    }
  };

  const confirmStatusUpdate = (booking, nextStatus) => {
    const bookingId = booking.id || booking.booking_id;
    Alert.alert(
      'Update booking?',
      `Change booking #${bookingId} to ${nextStatus.replace(/_/g, ' ')}?`,
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Update', onPress: () => updateBookingStatus(booking, nextStatus) },
      ]
    );
  };

  const confirmPaymentUpdate = (booking, nextStatus) => {
    const bookingId = booking.id || booking.booking_id;
    Alert.alert('Update payment?', `Mark payment for booking #${bookingId} as ${nextStatus}?`, [
      { text: 'Not now', style: 'cancel' },
      { text: 'Update', onPress: () => updatePaymentStatus(booking, nextStatus) },
    ]);
  };

  const renderActionButton = (booking, action, group) => {
    const bookingId = booking.id || booking.booking_id;
    const key = `${bookingId}:${group}:${action.value}`;
    const currentStatus =
      group === 'payment' ? booking.payment_status || 'pending' : booking.booking_status || booking.status || 'pending';
    const disabled = actioning === key || currentStatus === action.value;

    return (
      <TouchableOpacity
        key={action.value}
        accessibilityLabel={`${action.label} booking ${bookingId}`}
        accessibilityRole="button"
        disabled={disabled || Boolean(actioning)}
        onPress={() =>
          group === 'payment'
            ? confirmPaymentUpdate(booking, action.value)
            : confirmStatusUpdate(booking, action.value)
        }
        style={[styles.actionChip, action.danger ? styles.actionChipDanger : null, disabled ? styles.actionChipDisabled : null]}
      >
        {actioning === key ? (
          <ActivityIndicator color={action.danger ? colors.danger : colors.blue} size="small" />
        ) : (
          <Icon name={action.icon} size={14} color={action.danger ? colors.danger : colors.blue} />
        )}
        <Text style={[styles.actionChipText, action.danger ? styles.actionChipTextDanger : null]}>{action.label}</Text>
      </TouchableOpacity>
    );
  };

  const renderLifecycleButton = (booking, action, group) => {
    const bookingId = booking.id || booking.booking_id;
    const key = `${bookingId}:${group}:${action.value}`;
    return (
      <TouchableOpacity
        key={action.value}
        accessibilityLabel={`${action.label} operation for booking ${bookingId}`}
        accessibilityRole="button"
        disabled={Boolean(actioning)}
        onPress={() =>
          group === 'dispatch'
            ? updateDispatchLifecycle(booking, action)
            : updateProviderLifecycle(booking, action)
        }
        style={[styles.lifecycleChip, action.danger ? styles.actionChipDanger : null, actioning ? styles.actionChipDisabled : null]}
      >
        {actioning === key ? (
          <ActivityIndicator color={action.danger ? colors.danger : colors.blue} size="small" />
        ) : (
          <Icon name={action.icon} size={14} color={action.danger ? colors.danger : colors.blue} />
        )}
        <Text style={[styles.actionChipText, action.danger ? styles.actionChipTextDanger : null]}>{action.label}</Text>
      </TouchableOpacity>
    );
  };

  const renderOperations = (booking) => {
    const bookingId = booking.id || booking.booking_id;
    const operations = operationsByBooking[bookingId] || [];
    const assignment = assignmentByBooking[bookingId];
    const loadingOperations = actioning === `${bookingId}:operations`;

    return (
      <View style={styles.operationsBox}>
        <View style={styles.operationsHeader}>
          <View>
            <Text style={styles.operationsTitle}>Operations</Text>
            <Text style={styles.operationsSubtitle}>
              {assignment
                ? `Assigned: ${assignment.company_name || assignment.provider_name || assignment.contact_person || 'Provider'}`
                : 'Load timeline and assignment details.'}
            </Text>
          </View>
          <TouchableOpacity
            accessibilityLabel={`Load operations for booking ${bookingId}`}
            accessibilityRole="button"
            disabled={Boolean(actioning)}
            onPress={() => loadOperations(booking)}
            style={styles.timelineButton}
          >
            {loadingOperations ? <ActivityIndicator color={colors.blue} size="small" /> : <Icon name="time-outline" size={14} color={colors.blue} />}
            <Text style={styles.timelineButtonText}>Timeline</Text>
          </TouchableOpacity>
        </View>

        {type === 'fumigation' ? (
          <View style={styles.actionGroup}>
            <TouchableOpacity
              accessibilityLabel={`Assign provider for booking ${bookingId}`}
              accessibilityRole="button"
              disabled={Boolean(actioning)}
              onPress={() => chooseProvider(booking)}
              style={styles.lifecycleChip}
            >
              <Icon name="people-outline" size={14} color={colors.blue} />
              <Text style={styles.actionChipText}>Assign provider</Text>
            </TouchableOpacity>
            {FUMIGATION_LIFECYCLE_ACTIONS.map((action) => renderLifecycleButton(booking, action, 'provider'))}
          </View>
        ) : (
          <View style={styles.actionGroup}>
            {TRANSPORT_DISPATCH_ACTIONS.map((action) => renderLifecycleButton(booking, action, 'dispatch'))}
          </View>
        )}

        {operations.slice(0, 3).map((operation) => (
          <View key={String(operation.id || `${operation.event_type}-${operation.created_at}`)} style={styles.operationRow}>
            <View style={styles.operationDot} />
            <View style={styles.operationCopy}>
              <Text style={styles.operationTitle}>
                {String(operation.event_type || operation.action || 'operation').replace(/_/g, ' ')}
              </Text>
              <Text style={styles.operationMeta}>
                {operation.actor_name || operation.provider_name || 'System'} · {operation.created_at || operation.updated_at || ''}
              </Text>
              {operation.note ? <Text style={styles.operationNote}>{operation.note}</Text> : null}
            </View>
          </View>
        ))}
        {!operations.length && !loadingOperations ? (
          <Text style={styles.operationsEmpty}>No operation timeline loaded yet.</Text>
        ) : null}
      </View>
    );
  };

  return (
    <DashboardScreen refreshing={loading} onRefresh={loadBookings}>
      <DashboardHero
        eyebrow={config.eyebrow}
        title={config.title}
        subtitle="A native mobile queue for reviewing bookings, updating core statuses and managing service operations inside the app."
        icon={config.icon}
        onRefresh={loadBookings}
      />

      <DashboardNotice
        title="Native actions enabled"
        message="Core booking, payment, provider/dispatch lifecycle, compliance and recent operation timelines now run inside the app."
      />

      <DashboardSection title="Recent bookings">
        {loading && !bookings.length ? <ActivityIndicator color={colors.blue} /> : null}
        {!loading && !bookings.length ? (
          <Text style={styles.empty}>No bookings found for this workspace.</Text>
        ) : null}
        {bookings.map((booking) => {
          const bookingId = booking.id || booking.booking_id;
          const status = booking.booking_status || booking.status || 'pending';
          const paymentStatus = booking.payment_status;
          const statusActions = type === 'fumigation' ? FUMIGATION_STATUS_ACTIONS : TRANSPORT_STATUS_ACTIONS;

          return (
            <View key={String(bookingId)} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.iconBubble}>
                  <Icon name={config.icon} size={18} color={colors.blue} />
                </View>
                <View style={styles.copy}>
                  <Text numberOfLines={1} style={styles.title}>
                    {booking.service_name || booking.service_type || booking.property_title || `Booking #${bookingId}`}
                  </Text>
                  <Text numberOfLines={1} style={styles.meta}>
                    {booking.tenant_name || booking.customer_name || booking.user_name || 'Customer'} · {getBookingDate(booking)}
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: statusColor(status) }]}>
                  <Text style={styles.badgeText}>{status}</Text>
                </View>
              </View>
              <Text numberOfLines={3} style={styles.detail}>
                {booking.pickup_address && booking.destination_address
                  ? `${booking.pickup_address} → ${booking.destination_address}`
                  : booking.property_address || booking.address || booking.admin_notes || 'Review the full service record.'}
              </Text>

              <View style={styles.recordGrid}>
                <Text style={styles.recordText}>
                  Reference: {booking.reference || booking.booking_reference || booking.payment_reference || `#${bookingId}`}
                </Text>
                <Text style={styles.recordText}>
                  Amount: ₦{Number(booking.total_amount || booking.amount || booking.estimated_cost || 0).toLocaleString()}
                </Text>
                <Text style={styles.recordText}>
                  Contact: {booking.phone || booking.customer_phone || booking.user_phone || booking.email || 'Not supplied'}
                </Text>
              </View>

              {paymentStatus ? (
                <View style={styles.paymentRow}>
                  <Icon name="wallet-outline" size={14} color={statusColor(paymentStatus)} />
                  <Text style={styles.paymentText}>Payment: {String(paymentStatus).replace(/_/g, ' ')}</Text>
                </View>
              ) : null}

              <View style={styles.actionGroup}>
                {statusActions.map((action) => renderActionButton(booking, action, 'status'))}
              </View>

              {type !== 'fumigation' && paymentStatus ? (
                <View style={styles.actionGroup}>
                  {PAYMENT_STATUS_ACTIONS.map((action) => renderActionButton(booking, action, 'payment'))}
                </View>
              ) : null}

              {renderOperations(booking)}

              {type === 'fumigation' ? (
                <TouchableOpacity
                  accessibilityLabel={`Open safety compliance for booking ${bookingId}`}
                  accessibilityRole="button"
                  onPress={() =>
                    navigation.navigate('FumigationCompliance', {
                      bookingId,
                      booking,
                      provider:
                        assignmentByBooking[bookingId] ||
                        booking.assigned_provider ||
                        booking.provider,
                      providerId:
                        assignmentByBooking[bookingId]?.provider_id ||
                        assignmentByBooking[bookingId]?.id ||
                        booking.assigned_provider?.provider_id ||
                        booking.assigned_provider?.id ||
                        booking.provider_id ||
                        booking.provider?.id,
                    })
                  }
                  style={styles.complianceButton}
                >
                  <Icon name="shield-checkmark-outline" size={15} color={colors.success} />
                  <Text style={styles.complianceText}>Safety compliance</Text>
                </TouchableOpacity>
              ) : null}

            </View>
          );
        })}
      </DashboardSection>
    </DashboardScreen>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 14,
  },
  cardTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  iconBubble: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderRadius: 12,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  copy: {
    flex: 1,
  },
  title: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 14,
  },
  meta: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 11,
    marginTop: 3,
  },
  badge: {
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    color: colors.white,
    fontFamily: typography.semibold,
    fontSize: 10,
    textTransform: 'capitalize',
  },
  detail: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
  paymentRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  paymentText: {
    color: colors.text,
    fontFamily: typography.medium,
    fontSize: 12,
    textTransform: 'capitalize',
  },
  recordGrid: {
    backgroundColor: '#F8FAFC',
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 4,
    marginTop: 10,
    padding: 10,
  },
  recordText: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: 11,
    lineHeight: 16,
  },
  actionGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  actionChip: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderColor: '#BFDBFE',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  actionChipDanger: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  actionChipDisabled: {
    opacity: 0.45,
  },
  actionChipText: {
    color: colors.blue,
    fontFamily: typography.semibold,
    fontSize: 11,
  },
  actionChipTextDanger: {
    color: colors.danger,
  },
  lifecycleChip: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: '#BFDBFE',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  operationsBox: {
    backgroundColor: '#F8FAFC',
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: 12,
    padding: 12,
  },
  operationsHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  operationsTitle: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: 13,
  },
  operationsSubtitle: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 11,
    marginTop: 2,
  },
  timelineButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  timelineButtonText: {
    color: colors.blue,
    fontFamily: typography.semibold,
    fontSize: 11,
  },
  operationRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  operationDot: {
    backgroundColor: colors.blue,
    borderRadius: 4,
    height: 8,
    marginTop: 5,
    width: 8,
  },
  operationCopy: {
    flex: 1,
  },
  operationTitle: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: 12,
    textTransform: 'capitalize',
  },
  operationMeta: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 10,
    marginTop: 2,
  },
  operationNote: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  operationsEmpty: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 11,
    marginTop: 10,
  },
  complianceButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#ECFDF3',
    borderColor: '#BBF7D0',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  complianceText: {
    color: colors.success,
    fontFamily: typography.semibold,
    fontSize: 12,
  },
  empty: {
    color: colors.muted,
    fontFamily: typography.regular,
    lineHeight: 20,
  },
});

export default ServiceBookingsScreen;
