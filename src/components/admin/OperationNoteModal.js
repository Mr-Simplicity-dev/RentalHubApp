import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Input from '../common/Input';
import { PremiumButton } from '../common/PremiumLayout';
import { colors, radius, shadows, typography } from '../../theme';

import AppText from '../../components/common/AppText';
const OperationNoteModal = ({
  visible,
  title,
  message,
  label = 'Reason',
  placeholder = 'Enter a clear reason for this action',
  confirmText = 'Confirm action',
  icon = 'document-text-outline',
  variant = 'primary',
  required = true,
  loading = false,
  onCancel,
  onConfirm,
}) => {
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) {
      setNote('');
      setError('');
    }
  }, [visible]);

  const handleChange = (value) => {
    setNote(value);
    if (value.trim()) setError('');
  };

  const handleConfirm = () => {
    const normalizedNote = note.trim();
    if (required && !normalizedNote) {
      setError(`${label} is required`);
      return;
    }
    onConfirm?.(normalizedNote);
  };

  const handleCancel = () => {
    if (!loading) onCancel?.();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View accessibilityViewIsModal style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.iconWrap}>
              <Icon
                name={icon}
                size={22}
                color={variant === 'danger' ? colors.danger : colors.blue}
              />
            </View>
            <View style={styles.headingCopy}>
              <AppText style={styles.title}>{title}</AppText>
              {message ? <AppText style={styles.message}>{message}</AppText> : null}
            </View>
            <TouchableOpacity
              accessibilityLabel="Close"
              disabled={loading}
              onPress={handleCancel}
              style={styles.closeButton}
            >
              <Icon name="close" size={22} color={colors.muted} />
            </TouchableOpacity>
          </View>

          <Input
            accessibilityLabel={label}
            label={required ? label : `${label} (optional)`}
            value={note}
            onChangeText={handleChange}
            placeholder={placeholder}
            multiline
            numberOfLines={4}
            maxLength={1000}
            error={error}
            editable={!loading}
            containerStyle={styles.input}
          />

          <AppText style={styles.auditHint}>
            This note is recorded in the administration audit history.
          </AppText>

          <View style={styles.actions}>
            <PremiumButton
              title="Cancel"
              variant="secondary"
              disabled={loading}
              onPress={handleCancel}
              style={styles.actionButton}
            />
            <PremiumButton
              title={confirmText}
              variant={variant}
              loading={loading}
              onPress={handleConfirm}
              style={styles.actionButton}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(7, 26, 61, 0.58)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    ...shadows.soft,
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderRadius: 18,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  headingCopy: {
    flex: 1,
  },
  title: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 20,
    lineHeight: 25,
  },
  message: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  closeButton: {
    alignItems: 'center',
    height: 38,
    justifyContent: 'center',
    marginRight: -8,
    marginTop: -6,
    width: 38,
  },
  input: {
    marginBottom: 0,
  },
  auditHint: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 13,
    lineHeight: 17,
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  actionButton: {
    flex: 1,
  },
});

export default OperationNoteModal;
