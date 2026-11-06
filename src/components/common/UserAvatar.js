import React, { useEffect, useState } from 'react';
import { Image, View, StyleSheet } from 'react-native';
import AppText from './AppText';
import { storageService } from '../../services/storageService';
import { API_BASE_URL } from '../../services/api';
import { colors, typography } from '../../theme';

export default function UserAvatar({ user, size = 44 }) {
  const [source, setSource] = useState(null);
  const [failed, setFailed] = useState(false);
  const photo = user?.passport_photo_url;
  useEffect(() => {
    let active = true;
    setSource(null);
    setFailed(false);
    const filename = String(photo || '').match(/^\/uploads\/passports\/(passport_\d+_[A-Za-z0-9_.-]+)$/)?.[1];
    if (filename) storageService.getToken().then(token => {
      if (active && token) setSource({ uri: `${API_BASE_URL}/users/passport-photo/${encodeURIComponent(filename)}`, headers: { Authorization: `Bearer ${token}` } });
    }).catch(() => {});
    return () => { active = false; };
  }, [photo, user?.id]);
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      {source && !failed ? <Image source={source} style={StyleSheet.absoluteFillObject} resizeMode="cover" onError={() => setFailed(true)} accessible={false} /> : <AppText style={[styles.initial, { fontSize: size * 0.4 }]}>{String(user?.full_name || 'U').trim().charAt(0).toUpperCase()}</AppText>}
    </View>
  );
}
const styles = StyleSheet.create({ avatar: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.navySoft }, initial: { color: colors.white, fontFamily: typography.bold } });
