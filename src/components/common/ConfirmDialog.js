import React from 'react';
import { View, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AppText from './AppText';
import Button from './Button';
import { colors, radius } from '../../theme';

const ConfirmDialog = ({
  visible,
  title = 'Confirm',
  message = 'Are you sure?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'primary',
  loading = false,
}) => (
  <Modal visible={visible} transparent animationType="fade">
    <View style={styles.overlay}>
      <View style={styles.dialog}>
        <View style={styles.iconContainer}>
          <Icon
            name={variant === 'danger' ? 'warning-outline' : 'help-circle-outline'}
            size={40}
            color={variant === 'danger' ? colors.danger : colors.blue}
          />
        </View>
        <AppText variant="h3" style={styles.title}>{title}</AppText>
        <AppText variant="body" align="center" color={colors.muted} style={styles.message}>{message}</AppText>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} disabled={loading}>
            <AppText variant="label" color={colors.ink}>{cancelText}</AppText>
          </TouchableOpacity>
          <Button
            title={confirmText}
            variant={variant}
            onPress={onConfirm}
            loading={loading}
            size="sm"
            style={styles.confirmBtn}
          />
        </View>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  dialog: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  iconContainer: { marginBottom: 12 },
  title: { marginBottom: 8, textAlign: 'center' },
  message: { marginBottom: 20, paddingHorizontal: 4 },
  actions: { flexDirection: 'row', gap: 10, width: '100%' },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtn: { flex: 1 },
});

export default ConfirmDialog;