import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { colors, radius, shadows, typography, typeScale } from '../../theme';

import AppText from '../common/AppText';

/**
 * Property walkthrough video.
 *
 * The web already accepts an optional clip with the listing and stores it as
 * properties.video_url, and the full details endpoint returns it. The app only
 * ever needed something to play it with.
 *
 * The clip is only mounted once the landlord-to-be taps play, so browsing a
 * listing never spends a tenant's data on a video they did not ask for.
 */

const PropertyVideoPlayer = ({ uri, title = 'Property tour' }) => {
  useInterfaceLanguage();
  const [started, setStarted] = useState(false);

  const player = useVideoPlayer(started ? uri : null, (instance) => {
    instance.loop = false;
  });

  if (!uri) return null;

  if (!started) {
    return (
      <View style={styles.card}>
        <View style={styles.copy}>
          <View style={styles.iconWrap}>
            <Icon name="videocam-outline" size={20} color={colors.gold} />
          </View>
          <View style={styles.textWrap}>
            <AppText style={styles.title}>{title}</AppText>
            <AppText style={styles.subtitle}>{ui("Tap to play the walkthrough clip")}</AppText>
          </View>
        </View>
        <TouchableOpacity
          accessibilityLabel={ui("Play property video")}
          onPress={() => setStarted(true)}
          style={styles.playButton}>
          <Icon name="play" size={17} color={colors.white} />
          <AppText style={styles.playText}>{ui("Play")}</AppText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.playerCard}>
      <VideoView
        contentFit="contain"
        nativeControls
        player={player}
        style={styles.video}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
    ...shadows.soft,
  },
  copy: { alignItems: 'center', flexDirection: 'row', flex: 1 },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,201,40,0.16)',
    borderRadius: 19,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  textWrap: { flex: 1, marginLeft: 11 },
  title: { color: colors.ink, fontFamily: typography.semibold, fontSize: typeScale.sm, lineHeight: 20 },
  subtitle: { color: colors.muted, fontFamily: typography.regular, fontSize: typeScale.reading, lineHeight: 22, marginTop: 2 },
  playButton: {
    alignItems: 'center',
    backgroundColor: colors.blue,
    borderRadius: radius.pill,
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 9,
  },
  playText: { color: colors.white, fontFamily: typography.semibold, fontSize: typeScale.xs, lineHeight: 18, marginLeft: 5 },
  playerCard: {
    backgroundColor: '#000',
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadows.soft,
  },
  video: { height: 210, width: '100%' },
});

export default PropertyVideoPlayer;
