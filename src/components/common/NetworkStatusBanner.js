import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors, typography } from '../../theme';
import {
  getNetworkSnapshot,
  subscribeNetworkStatus,
} from '../../services/networkStatusService';
import {
  DEFAULT_APP_SETTINGS,
  subscribeAppSettings,
} from '../../services/appSettingsService';
import {
  getOfflineQueueSnapshot,
  subscribeOfflineQueue,
} from '../../services/offlineActionQueueService';

const NetworkStatusBanner = () => {
  const [status, setStatus] = useState(getNetworkSnapshot());
  const [settings, setSettings] = useState(DEFAULT_APP_SETTINGS);
  const [queue, setQueue] = useState(getOfflineQueueSnapshot());

  useEffect(() => subscribeNetworkStatus(setStatus), []);
  useEffect(() => subscribeAppSettings(setSettings), []);
  useEffect(() => subscribeOfflineQueue(setQueue), []);

  if ((status.online && !queue.pendingCount && !queue.flushing) || !settings.weakNetworkWarnings) return null;

  return (
    <View
      accessibilityRole="alert"
      style={styles.banner}
    >
      <Icon
        name={status.weak ? 'cloudy-outline' : 'cloud-offline-outline'}
        size={17}
        color="#92400E"
      />
      <Text style={styles.text}>
        {queue.flushing
          ? 'Connection restored. Replaying saved actions now.'
          : queue.pendingCount
            ? `${queue.pendingCount} action${queue.pendingCount === 1 ? '' : 's'} saved for retry when connection returns.`
            : status.weak
              ? 'Network is weak. Some updates may take longer.'
              : 'You appear offline. We will retry when connection returns.'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderBottomColor: '#FCD34D',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  text: {
    color: '#78350F',
    flex: 1,
    fontFamily: typography.semibold,
    fontSize: 12,
    lineHeight: 17,
  },
});

export default NetworkStatusBanner;
