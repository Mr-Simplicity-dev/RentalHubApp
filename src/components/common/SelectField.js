import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const SelectField = ({
  label,
  value,
  placeholder = 'Select an option',
  onPress,
  disabled = false,
  helperText,
}) => (
  <View style={styles.container}>
    {label ? <Text style={styles.label}>{label}</Text> : null}
    <TouchableOpacity
      style={[styles.field, disabled && styles.fieldDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Text style={[styles.value, !value && styles.placeholder]}>
        {value || placeholder}
      </Text>
      <Icon
        name="chevron-down-outline"
        size={20}
        color={disabled ? '#94a3b8' : '#64748b'}
      />
    </TouchableOpacity>
    {helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  field: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldDisabled: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  value: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    marginRight: 10,
  },
  placeholder: {
    color: '#94a3b8',
  },
  helperText: {
    marginTop: 4,
    fontSize: 12,
    color: '#64748b',
  },
});

export default SelectField;
