import React, { useContext, useCallback, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { useFocusEffect } from '@react-navigation/native';
import Input from '../../components/common/Input';
import {
  InfoRow,
  PremiumButton,
  PremiumCard,
  PremiumCenter,
  PremiumHero,
  PremiumListScreen,
  PremiumSectionTitle,
  StatusPill,
} from '../../components/common/PremiumLayout';
import { AuthContext } from '../../context/AuthContext';
import { stateMigrationService } from '../../services/stateMigrationService';
import { propertyService } from '../../services/propertyService';
import { getErrorMessage, pickList } from '../../utils/http';
import { colors, radius, typography } from '../../theme';
import AppText from '../../components/common/AppText';

const STATUS_COLORS = {
  pending: colors.blue,
  approved: colors.success,
  rejected: colors.danger,
};

const statusLabel = (status) =>
  String(status || 'pending').replace(/_/g, ' ');

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

const StateMigrationScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const currentState = user?.assigned_state || '';

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [states, setStates] = useState([]);
  const [targetState, setTargetState] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadRequests = useCallback(async ({ refresh = false } = {}) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const response = await stateMigrationService.myRequests();
      setRequests(pickList(response, ['data']));
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(err, 'Could not load migration requests'),
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRequests();
      propertyService
        .getStates()
        .then((res) => {
          const rows = Array.isArray(res)
            ? res
            : Array.isArray(res?.data)
              ? res.data
              : [];
          setStates(
            rows
              .map((s) => s?.name || s?.state_name || s?.state)
              .filter(Boolean)
          );
        })
        .catch(() => {});
    }, [loadRequests])
  );

  const hasPending = requests.some(
    (item) => String(item.status || '') === 'pending'
  );

  const availableStates = states.filter(
    (name) => name.toLowerCase() !== String(currentState || '').toLowerCase()
  );

  const handleSubmit = async () => {
    if (!targetState) {
      setError('Select the state you want to move to.');
      return;
    }
    if (!reason.trim()) {
      setError('Tell us why you need to migrate states.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const response = await stateMigrationService.requestMigration({
        to_state: targetState,
        reason: reason.trim(),
      });
      if (response?.success) {
        Toast.show({
          type: 'success',
          text1: 'Request submitted',
          text2: 'A support administrator will review your migration.',
        });
        setTargetState('');
        setReason('');
        await loadRequests();
      } else {
        setError(response?.message || 'Could not submit the request.');
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Could not submit the request.'));
    } finally {
      setSubmitting(false);
    }
  };

  const header = (
    <>
      <PremiumHero
        eyebrow="Account"
        title="State migration"
        subtitle="Request to move your assigned state when you relocate."
        icon="swap-horizontal-outline"
      />

      {!hasPending ? (
        <PremiumCard>
          <PremiumSectionTitle
            title="Request a move"
            subtitle={`From: ${currentState || 'Unassigned'} — pick your new state and explain why.`}
          />
          <View style={styles.chipWrap}>
            {availableStates.length === 0 ? (
              <AppText style={styles.note}>Loading available states…</AppText>
            ) : (
              availableStates.map((name) => {
                const selected = targetState === name;
                return (
                  <TouchableOpacity
                    key={name}
                    activeOpacity={0.85}
                    onPress={() => setTargetState(selected ? '' : name)}
                    style={[styles.chip, selected && styles.chipSelected]}
                  >
                    <AppText style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {name}
                    </AppText>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          <Input
            label="Reason"
            value={reason}
            onChangeText={setReason}
            placeholder="Why are you moving to this state?"
            multiline
            numberOfLines={3}
            containerStyle={styles.fieldGap}
          />

          {error ? <AppText style={styles.error}>{error}</AppText> : null}

          <PremiumButton
            title="Submit migration request"
            onPress={handleSubmit}
            loading={submitting}
            disabled={!targetState || !reason.trim()}
            icon="paper-plane-outline"
            style={styles.submitBtn}
          />
        </PremiumCard>
      ) : (
        <PremiumCard>
          <AppText style={styles.note}>
            You already have a pending migration request. New requests are blocked until it is resolved.
          </AppText>
        </PremiumCard>
      )}
    </>
  );

  return loading && requests.length === 0 ? (
    <PremiumCenter loading title="Loading requests" />
  ) : (
    <PremiumListScreen
      data={requests}
      keyExtractor={(item) => String(item.id)}
      refreshing={refreshing}
      onRefresh={() => loadRequests({ refresh: true })}
      header={header}
      emptyTitle="No migration requests"
      emptyMessage="Your submitted requests will appear here."
      emptyIcon="swap-horizontal-outline"
      renderItem={({ item }) => {
        const color = STATUS_COLORS[item.status] || colors.blue;
        return (
          <PremiumCard>
            <View style={styles.row}>
              <InfoRow
                icon="arrow-forward-outline"
                label="Move"
                value={`${item.from_state || '?'}  →  ${item.to_state || '?'}`}
              />
              <StatusPill label={statusLabel(item.status)} color={color} />
            </View>
            {item.reason ? <AppText style={styles.reason}>{item.reason}</AppText> : null}
            <AppText style={styles.date}>{formatDate(item.requested_at || item.created_at)}</AppText>
          </PremiumCard>
        );
      }}
    />
  );
};

const styles = StyleSheet.create({
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipSelected: {
    backgroundColor: colors.blue,
    borderColor: colors.blue,
  },
  chipText: {
    color: colors.text,
    fontFamily: typography.medium,
    fontSize: 13,
  },
  chipTextSelected: {
    color: colors.white,
  },
  fieldGap: {
    marginTop: 12,
  },
  submitBtn: {
    marginTop: 14,
  },
  error: {
    color: colors.danger,
    fontFamily: typography.medium,
    fontSize: 13,
    marginTop: 10,
  },
  note: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 19,
  },
  row: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  reason: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  date: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 12,
    marginTop: 8,
  },
});

export default StateMigrationScreen;
