import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { WebView } from 'react-native-webview';
import Toast from 'react-native-toast-message';
import api from '../../services/api';
import { colors, radius, shadows, typography } from '../../theme';

const PLACEMENTS = {
  home_top: 'home_top',
  home_featured: 'home_featured',
  dashboard_top: 'dashboard_top',
  dashboard_inline: 'dashboard_inline',
  properties_top: 'properties_top',
  properties_inline: 'properties_inline',
};

const videoHtml = (src, poster) => `<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<style>*{margin:0;padding:0}body{background:#000;display:flex;align-items:center;justify-content:center;height:100vh}
video{width:100%;height:100%;object-fit:cover}
</style></head><body>
<video src="${encodeURI(src)}"${poster ? ` poster="${encodeURI(poster)}"` : ''} autoplay loop playsinline webkit-playsinline style="max-height:100vh">
</video></body></html>`;

const AdSpace = ({ placement, limit = 10, onRefresh }) => {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mutedAds, setMutedAds] = useState({});
  const trackedRef = useRef(new Set());

  const loadAds = useCallback(async () => {
    if (!PLACEMENTS[placement]) return;
    try {
      const response = await api.get('/ads', {
        params: { placement, limit: Math.min(Math.max(limit, 1), 10) },
      });
      setAds(Array.isArray(response?.data?.data) ? response.data.data : []);
    } catch {
      setAds([]);
    } finally {
      setLoading(false);
    }
  }, [placement, limit]);

  useEffect(() => {
    loadAds();
  }, [loadAds]);

  useEffect(() => {
    if (onRefresh) {
      onRef.current = onRefresh;
    }
  });
  const onRef = useRef(onRefresh);
  onRef.current = onRefresh;

  useEffect(() => {
    if (loading || !ads.length) return;
    const ids = ads.map((ad) => ad.id).filter(Boolean);
    const newTracked = new Set(trackedRef.current);
    let changed = false;
    ids.forEach((id) => {
      if (!newTracked.has(id)) {
        newTracked.add(id);
        changed = true;
        api.post(`/ads/${id}/impression`).catch(() => {});
      }
    });
    if (changed) trackedRef.current = newTracked;
  }, [loading, ads]);

  if (loading) return null;
  if (!ads.length) return null;

  const toggleSound = (adId) => {
    setMutedAds((prev) => ({ ...prev, [adId]: !prev[adId] }));
  };

  const handlePress = (ad) => {
    if (!ad.id) return;
    api.post(`/ads/${ad.id}/click`).catch(() => {});
    const url = ad.target_url;
    if (/^https?:\/\//i.test(String(url))) {
      Linking.openURL(url).catch(() => {
        Toast.show({ type: 'error', text1: 'Could not open ad link' });
      });
    }
  };

  return (
    <View style={styles.container}>
      {ads.map((ad) => (
        <TouchableOpacity
          key={ad.id}
          activeOpacity={0.9}
          onPress={() => handlePress(ad)}
          style={styles.card}
        >
          {ad.media_type === 'video' && ad.video_url ? (
            <View style={styles.videoWrap}>
              <WebView
                source={{ html: videoHtml(ad.video_url, ad.video_thumbnail) }}
                style={styles.video}
                scrollEnabled={false}
                bounces={false}
                javaScriptEnabled
                allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction
                mixedContentMode="never"
              />
              <TouchableOpacity
                style={styles.soundToggle}
                onPress={() => toggleSound(ad.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icon
                  name={mutedAds[ad.id] ? 'volume-mute-outline' : 'volume-high-outline'}
                  size={16}
                  color={colors.white}
                />
              </TouchableOpacity>
            </View>
          ) : ad.image_url ? (
            <Image
              source={{ uri: ad.image_url }}
              style={styles.image}
              resizeMode="cover"
            />
          ) : null}

          <View style={styles.body}>
            <View style={styles.sponsorRow}>
              <Text style={styles.sponsored}>SPONSORED</Text>
              {ad.sponsor_name ? (
                <Text style={styles.sponsorName}>{ad.sponsor_name}</Text>
              ) : null}
            </View>
            <Text style={styles.title} numberOfLines={2}>{ad.title}</Text>
            {ad.description ? (
              <Text style={styles.description} numberOfLines={2}>{ad.description}</Text>
            ) : null}
            {ad.target_url ? (
              <View style={styles.cta}>
                <Text style={styles.ctaText}>{ad.cta_label || 'Learn more'}</Text>
                <Icon name="arrow-forward" size={14} color={colors.white} />
              </View>
            ) : null}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
    paddingBottom: 4,
    paddingTop: 4,
  },
  card: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadows.soft,
  },
  videoWrap: {
    height: 180,
    position: 'relative',
  },
  video: {
    backgroundColor: colors.ink,
  },
  soundToggle: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 18,
    bottom: 8,
    height: 32,
    justifyContent: 'center',
    position: 'absolute',
    right: 8,
    width: 32,
  },
  image: {
    height: 160,
  },
  body: {
    padding: 14,
  },
  sponsorRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  sponsored: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: 9,
    letterSpacing: 1.1,
  },
  sponsorName: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 10,
  },
  title: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 16,
    lineHeight: 21,
    marginTop: 6,
  },
  description: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },
  cta: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.blue,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  ctaText: {
    color: colors.white,
    fontFamily: typography.semibold,
    fontSize: 11,
  },
});

export default AdSpace;
