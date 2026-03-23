import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

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
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close-outline" size={26} color="#0f172a" />
          </TouchableOpacity>
        </View>

        {searchable ? (
          <TextInput
            style={styles.searchInput}
            placeholder={searchPlaceholder}
            value={query}
            onChangeText={setQuery}
            placeholderTextColor="#94a3b8"
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
                <Text style={[styles.optionText, active && styles.optionTextActive]}>
                  {optionLabel}
                </Text>
                {active ? (
                  <Icon name="checkmark-circle" size={20} color="#0284c7" />
                ) : null}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={<Text style={styles.emptyText}>{emptyText}</Text>}
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  closeButton: {
    padding: 4,
  },
  searchInput: {
    margin: 16,
    marginBottom: 0,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#0f172a',
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  optionRow: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionRowActive: {
    borderColor: '#38bdf8',
    backgroundColor: '#eff6ff',
  },
  optionText: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    marginRight: 10,
  },
  optionTextActive: {
    color: '#0369a1',
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748b',
    marginTop: 24,
  },
});

export default OptionPickerModal;
