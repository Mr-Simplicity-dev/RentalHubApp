import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Button from './Button';

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
            color={variant === 'danger' ? '#dc2626' : '#0284c7'}
          />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} disabled={loading}>
            <Text style={styles.cancelText}>{cancelText}</Text>
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
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  iconContainer: { marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 8, textAlign: 'center' },
  message: { color: '#475569', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  actions: { flexDirection: 'row', gap: 10, width: '100%' },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { color: '#374151', fontWeight: '600', fontSize: 14 },
  confirmBtn: { flex: 1 },
});

export default ConfirmDialog;
