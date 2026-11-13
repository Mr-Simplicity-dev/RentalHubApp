import {useSafeAreaInsets} from 'react-native-safe-area-context';


import React, { useEffect, useState } from 'react';
import {KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Input from '../common/Input';
import { PremiumButton } from '../common/PremiumLayout';
import { colors, radius, shadows, typography, typeScale } from '../../theme';

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
  minLength = 1,
  maxLength = 1000,
  loading = false,
  onCancel,
  onConfirm,
}) => {

  const insets=useSafeAreaInsets();
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
    if (normalizedNote && normalizedNote.length < minLength) { setError(`Write at least ${minLength} characters.`); return; }
    onConfirm?.(normalizedNote);
  };

  const handleCancel = () => {
    if (!loading) onCancel?.();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.overlay,{paddingTop:Math.max(insets.top,16),paddingBottom:Math.max(insets.bottom,16)}]}
      >
        <View accessibilityViewIsModal style={styles.sheet}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetContent} bounces={false}>
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
              accessibilityLabel={"Close"}
              disabled={loading}
              onPress={handleCancel}
              style={styles.closeButton}
            >
              <Icon name="close" size={22} color={colors.muted} />
            </TouchableOpacity>
          </View>

          <Input
            accessibilityLabel={label}
            label={required ? label : `${label ?? "{value0}"} (optional)`}
            value={note}
            onChangeText={handleChange}
            placeholder={placeholder}
            multiline
            numberOfLines={4}
            maxLength={maxLength}
            error={error}
            editable={!loading}
            containerStyle={styles.input}
          />

          <AppText style={styles.auditHint}>{"This note is recorded in the administration audit history."}</AppText>

          <View style={styles.actions}>
            <PremiumButton
              title={"Cancel"}
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
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(7, 26, 61, 0.58)',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  sheet: {
    ...shadows.soft,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    width:'100%',
    maxWidth:560,
    maxHeight:'100%',
    flexShrink:1,
    overflow:'hidden',
  },
  sheetContent:{padding:20},
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
    fontFamily: typography.semibold,
    fontSize: typeScale.lg,
    lineHeight: 28,
  },
  message: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: typeScale.reading,
    lineHeight: 22,
    marginTop: 4,
  },
  closeButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  input: {
    marginBottom: 0,
  },
  auditHint: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: typeScale.reading,
    lineHeight: 22,
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
