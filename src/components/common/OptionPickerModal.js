import React, { useEffect, useMemo, useState } from 'react';
import {FlatList,
  Modal,
  SafeAreaView,
  StyleSheet
  TextInput,
  TouchableOpacity,
  View,} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors, radius, typography } from '../../theme';

import AppText from '../../components/common/AppText';
const OptionPickerModal = ({
  visible,
  title,
  options = [],
  onClose,
  onSelect,
  selectedValue,
  getOptionLabel = (item) => item?.label || String(item ?? ''),
  getOptionValue = (item) => item?.value ?? item,
  searchable = false,
  searchPlaceholder = 'Search',
  emptyText = 'No options available',
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!visible) {
      setQuery('');
    }
  }, [visible]);

  const filteredOptions = useMemo(() => {
    if (!searchable || !query.trim()) {
      return options;
    }

    const loweredQuery = query.trim().toLowerCase();
    return options.filter((item) =>
      getOptionLabel(item).toLowerCase().includes(loweredQuery)
    );
  }, [getOptionLabel, options, query, searchable]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <AppText style={styles.title}>{title}</AppText>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close-outline" size={24} color={colors.navy} />
          </TouchableOpacity>
        </View>

        {searchable ? (
          <TextInput
            style={styles.searchInput}
            placeholder={searchPlaceholder}
            value={query}
            onChangeText={setQuery}
            placeholderTextColor="#96A2B8"
          />
        ) : null}

        <FlatList
          data={filteredOptions}
          keyExtractor={(item, index) => `${String(getOptionValue(item))}-${index}`}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const optionLabel = getOptionLabel(item);
            const optionValue = getOptionValue(item);
            const active = String(optionValue) === String(selectedValue);

            return (
              <TouchableOpacity
                style={[styles.optionRow, active && styles.optionRowActive]}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
              >
                <AppText style={[styles.optionText, active && styles.optionTextActive]}>
                  {optionLabel}
                </AppText>
                {active ? (
                  <Icon name="checkmark-circle" size={20} color={colors.blue} />
                ) : null}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={<AppText style={styles.emptyText}>{emptyText}</AppText>}
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  title: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 20,
    letterSpacing: -0.5,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  searchInput: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.ink,
    fontFamily: typography.regular,
    margin: 16,
    marginBottom: 0,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  optionRow: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    minHeight: 54,
    paddingHorizontal: 15,
  },
  optionRowActive: {
    borderColor: colors.blue,
    backgroundColor: colors.surfaceBlue,
  },
  optionText: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.medium,
    fontSize: 16,
    marginRight: 10,
  },
  optionTextActive: {
    color: colors.blue,
    fontFamily: typography.semibold,
  },
  emptyText: {
    color: colors.muted,
    fontFamily: typography.regular,
    marginTop: 24,
    textAlign: 'center',
  },
});

export default OptionPickerModal;
