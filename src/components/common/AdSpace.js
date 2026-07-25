import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
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

const AdSpace = ({ placement, limit = 10, onRefresh }) => {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
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

  const handlePress = (ad) => {
    if (!ad.id) return;
    api.post(`/ads/${ad.id}/click`).catch(() => {});
    const url = ad.target_url || ad.video_url;
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
              {ad.video_thumbnail || ad.image_url ? (
                <Image
                  source={{ uri: ad.video_thumbnail || ad.image_url }}
                  style={styles.videoPoster}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.videoPlaceholder}>
                  <Icon name="videocam-outline" size={28} color={colors.white} />
                </View>
              )}
              <View style={styles.playBadge}>
                <Icon name="play" size={16} color={colors.white} />
                <Text style={styles.playText}>Play video</Text>
              </View>
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
  videoPoster: {
    height: 180,
    width: '100%',
  },
  videoPlaceholder: {
    alignItems: 'center',
    backgroundColor: colors.ink,
    height: 180,
    justifyContent: 'center',
  },
  playBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: radius.pill,
    bottom: 8,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    position: 'absolute',
    right: 8,
  },
  playText: {
    color: colors.white,
    fontFamily: typography.semibold,
    fontSize: 13,
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
    fontSize: 13,
    letterSpacing: 1.25,
  },
  sponsorName: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 13,
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
    fontSize: 13,
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
    fontSize: 13,
  },
});

export default AdSpace;
