import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors, radius, typography } from '../../theme';
import { trackMobileEvent } from '../../services/mobileDiagnosticsService';

import AppText from '../../components/common/AppText';
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic'];

const getExtension = (value = '') => {
  const clean = String(value).split('?')[0].split('#')[0];
  const part = clean.includes('.') ? clean.split('.').pop() : '';
  return String(part || '').toLowerCase();
};

const formatFileSize = (size) => {
  const bytes = Number(size || 0);
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const FilePreviewCard = ({
  title = 'Document',
  subtitle = '',
  uri = '',
  fileName = '',
  fileSize,
  mimeType = '',
  onRetry,
  actionLabel = 'Open file',
}) => {
  const [opening, setOpening] = useState(false);
  const extension = useMemo(() => getExtension(fileName || uri || mimeType), [fileName, uri, mimeType]);
  const isImage =
    String(mimeType || '').startsWith('image/') ||
    IMAGE_EXTENSIONS.includes(extension);
  const displayName = fileName || title;
  const meta = [extension ? extension.toUpperCase() : '', formatFileSize(fileSize)].filter(Boolean).join(' · ');

  const openFile = async () => {
    if (!uri) {
      Alert.alert('File unavailable', 'No file link is available for this item.');
      return;
    }

    setOpening(true);
    try {
      const canOpen = await Linking.canOpenURL(uri);
      if (!canOpen) {
        Alert.alert('Cannot open file', 'This device cannot open the selected file link.');
        return;
      }
      trackMobileEvent('file_preview_opened', {
        title: displayName,
        extension,
        mime_type: mimeType,
      });
      await Linking.openURL(uri);
    } catch {
      Alert.alert('Open failed', 'The file could not be opened. Check your connection and try again.');
    } finally {
      setOpening(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.preview}>
        {isImage && uri ? (
          <Image source={{ uri }} style={styles.image} />
        ) : (
          <Icon name={extension === 'pdf' ? 'document-text-outline' : 'document-attach-outline'} size={28} color={colors.blue} />
        )}
      </View>
      <View style={styles.copy}>
        <AppText numberOfLines={1} style={styles.title}>{displayName}</AppText>
        {subtitle ? <AppText numberOfLines={1} style={styles.subtitle}>{subtitle}</AppText> : null}
        {meta ? <AppText style={styles.meta}>{meta}</AppText> : null}
        <View style={styles.actions}>
          {uri ? (
            <TouchableOpacity accessibilityRole="button" onPress={openFile} style={styles.actionButton}>
              {opening ? <ActivityIndicator size="small" color={colors.blue} /> : <Icon name="open-outline" size={14} color={colors.blue} />}
              <AppText style={styles.actionText}>{actionLabel}</AppText>
            </TouchableOpacity>
          ) : null}
          {onRetry ? (
            <TouchableOpacity accessibilityRole="button" onPress={onRetry} style={styles.retryButton}>
              <Icon name="refresh-outline" size={14} color={colors.danger} />
              <AppText style={styles.retryText}>Retry</AppText>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 10,
  },
  preview: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderRadius: 12,
    height: 54,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 54,
  },
  image: {
    height: '100%',
    width: '100%',
  },
  copy: {
    flex: 1,
  },
  title: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: 13,
  },
  subtitle: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    marginTop: 2,
  },
  meta: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 13,
    marginTop: 3,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 7,
  },
  actionButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  actionText: {
    color: colors.blue,
    fontFamily: typography.semibold,
    fontSize: 13,
  },
  retryButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  retryText: {
    color: colors.danger,
    fontFamily: typography.semibold,
    fontSize: 13,
  },
});

export default FilePreviewCard;
