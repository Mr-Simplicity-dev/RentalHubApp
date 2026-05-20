import React, { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import Button from '../common/Button';
import SelectField from '../common/SelectField';
import OptionPickerModal from '../common/OptionPickerModal';
import { superAdminService } from '../../services/superAdminService';
import { getErrorMessage, pickList, pickObject } from '../../utils/http';

const defaultForm = {
  applies_to: 'tenant',
  state_id: '',
  lga_name: '',
  is_active: true,
};

const RegistrationAccessSection = () => {
  const [loading, setLoading] = useState(false);
  const [rules, setRules] = useState([]);
  const [targets, setTargets] = useState([]);
  const [locations, setLocations] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [showLgaPicker, setShowLgaPicker] = useState(false);
  const [showRolePicker, setShowRolePicker] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await superAdminService.getRegistrationAccessRules();
      const payload = pickObject(response, ['data']) || {};
      setRules(pickList(payload, ['rules']) || payload.rules || []);
      setTargets(pickList(payload, ['targets']) || payload.targets || []);
      setLocations(pickList(payload, ['locations']) || payload.locations || []);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Load failed',
        text2: getErrorMessage(error, 'Could not load registration access rules'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedState = useMemo(
    () => locations.find((item) => String(item.id) === String(form.state_id)),
    [locations, form.state_id]
  );
  const availableLgas = selectedState?.lgas || [];
  const selectedTarget = targets.find((item) => item.key === form.applies_to);

  const saveRule = async () => {
    if (!form.state_id) {
      Toast.show({ type: 'error', text1: 'Select a state' });
      return;
    }

    const payload = {
      applies_to: form.applies_to,
      state_id: Number(form.state_id),
      lga_name: form.lga_name || undefined,
      is_active: form.is_active,
    };

    try {
      setLoading(true);
      if (editingRuleId) {
        await superAdminService.updateRegistrationAccessRule(editingRuleId, payload);
        Toast.show({ type: 'success', text1: 'Rule updated' });
      } else {
        await superAdminService.createRegistrationAccessRule(payload);
        Toast.show({ type: 'success', text1: 'Rule created' });
      }
      setEditingRuleId(null);
      setForm(defaultForm);
      await loadData();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Save failed',
        text2: getErrorMessage(error, 'Could not save rule'),
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteRule = (ruleId) => {
    Alert.alert('Delete rule', 'Remove this registration access rule?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoading(true);
            await superAdminService.deleteRegistrationAccessRule(ruleId);
            Toast.show({ type: 'success', text1: 'Rule deleted' });
            await loadData();
          } catch (error) {
            Toast.show({
              type: 'error',
              text1: 'Delete failed',
              text2: getErrorMessage(error, 'Could not delete rule'),
            });
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Registration Access Rules</Text>
      <Text style={styles.subheading}>
        When active rules exist for a role, registration is only allowed in those state/LGA
        locations. Global role switches on Flags must also be enabled.
      </Text>

      <SelectField
        label="Applies To"
        value={selectedTarget?.label || form.applies_to}
        placeholder="Select role"
        onPress={() => setShowRolePicker(true)}
      />
      <SelectField
        label="State"
        value={selectedState?.state_name}
        placeholder="Select state"
        onPress={() => setShowStatePicker(true)}
      />
      <SelectField
        label="LGA (optional)"
        value={form.lga_name || 'Whole state'}
        placeholder="Select LGA"
        onPress={() => setShowLgaPicker(true)}
        disabled={!form.state_id}
      />
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Rule active</Text>
        <Switch
          value={form.is_active}
          onValueChange={(value) => setForm((prev) => ({ ...prev, is_active: value }))}
        />
      </View>
      <Button
        title={editingRuleId ? 'Update Rule' : 'Create Rule'}
        onPress={saveRule}
        loading={loading}
      />

      <Text style={[styles.heading, styles.sectionGap]}>Existing Rules</Text>
      {rules.length === 0 ? (
        <Text style={styles.meta}>No rules configured.</Text>
      ) : (
        rules.map((rule) => (
          <View key={rule.id} style={styles.card}>
            <Text style={styles.cardTitle}>
              {rule.applies_to} · {rule.state_name}
              {rule.lga_name ? ` · ${rule.lga_name}` : ' · Whole state'}
            </Text>
            <Text style={styles.meta}>{rule.is_active ? 'Active' : 'Inactive'}</Text>
            <View style={styles.row}>
              <TouchableOpacity
                onPress={() => {
                  setEditingRuleId(rule.id);
                  setForm({
                    applies_to: rule.applies_to,
                    state_id: String(rule.state_id),
                    lga_name: rule.lga_name || '',
                    is_active: rule.is_active === true,
                  });
                }}
              >
                <Text style={styles.link}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteRule(rule.id)}>
                <Text style={styles.danger}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      <OptionPickerModal
        visible={showRolePicker}
        title="Applies To"
        options={targets}
        selectedValue={form.applies_to}
        getOptionLabel={(item) => item.label}
        getOptionValue={(item) => item.key}
        onClose={() => setShowRolePicker(false)}
        onSelect={(item) => setForm((prev) => ({ ...prev, applies_to: item.key }))}
      />
      <OptionPickerModal
        visible={showStatePicker}
        title="Select State"
        options={locations}
        selectedValue={form.state_id}
        searchable
        getOptionLabel={(item) => item.state_name}
        getOptionValue={(item) => item.id}
        onClose={() => setShowStatePicker(false)}
        onSelect={(item) =>
          setForm((prev) => ({ ...prev, state_id: String(item.id), lga_name: '' }))
        }
      />
      <OptionPickerModal
        visible={showLgaPicker}
        title="Select LGA"
        options={[{ id: '', name: 'Whole state' }, ...availableLgas.map((lga) => ({ id: lga, name: lga }))]}
        selectedValue={form.lga_name}
        getOptionLabel={(item) => item.name}
        getOptionValue={(item) => item.id}
        onClose={() => setShowLgaPicker(false)}
        onSelect={(item) => setForm((prev) => ({ ...prev, lga_name: item.id }))}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  heading: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  subheading: { fontSize: 13, color: '#64748b', marginBottom: 8 },
  sectionGap: { marginTop: 16 },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  switchLabel: { fontSize: 14, color: '#334155' },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  meta: { fontSize: 12, color: '#64748b', marginTop: 4 },
  row: { flexDirection: 'row', gap: 16, marginTop: 8 },
  link: { color: '#2563eb', fontWeight: '600' },
  danger: { color: '#dc2626', fontWeight: '600' },
});

export default RegistrationAccessSection;
