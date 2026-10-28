import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import React, { useEffect, useState } from 'react';
import {StyleSheet, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors, typography, typeScale } from '../../theme';
import {
  getNetworkSnapshot,
  subscribeNetworkStatus,
} from '../../services/networkStatusService';
import {
  DEFAULT_APP_SETTINGS,
  subscribeAppSettings,
} from '../../services/appSettingsService';
import AppText from './AppText';
import {
  getOfflineQueueSnapshot,
  subscribeOfflineQueue,
} from '../../services/offlineActionQueueService';

const NetworkStatusBanner = () => {
  useInterfaceLanguage();
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
      <AppText style={styles.text}>
        {queue.flushing
          ? ui('Connection restored. Replaying saved actions now.')
          : queue.pendingCount
            ? ui("{value0} action{value1} saved for retry when connection returns.", {value0: (queue.pendingCount), value1: (queue.pendingCount === 1 ? '' : ui("s"))})
            : status.weak
              ? ui('Network is weak. Some updates may take longer.')
              : ui('You appear offline. We will retry when connection returns.')}
      </AppText>
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
    fontSize: typeScale.xs,
    lineHeight: 18,
  },
});

export default NetworkStatusBanner;
