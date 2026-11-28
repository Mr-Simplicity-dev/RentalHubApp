import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Toast from 'react-native-toast-message';
import AppText from '../common/AppText';
import Button from '../common/Button';
import OptionPickerModal from '../common/OptionPickerModal';
import SelectField from '../common/SelectField';
import { listingAssistanceService } from '../../services/listingAssistanceService';
import { propertyService } from '../../services/propertyService';
import { colors, radius, typography, typeScale } from '../../theme';

const ListingAssistancePanel = ({
  initialStateId = '',
  initialLgaName = '',
  properties = [],
  showPropertyPicker = false,
}) => {
  const [locationOptions, setLocationOptions] = useState([]);
  const [status, setStatus] = useState({ assignments: [], requests: [] });
  const [stateId, setStateId] = useState(String(initialStateId || ''));
  const [lgaName, setLgaName] = useState(initialLgaName || '');
  const [propertyId, setPropertyId] = useState('');
  const [statePickerOpen, setStatePickerOpen] = useState(false);
  const [lgaPickerOpen, setLgaPickerOpen] = useState(false);
  const [propertyPickerOpen, setPropertyPickerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialStateId) setStateId(String(initialStateId));
    if (initialLgaName) setLgaName(initialLgaName);
  }, [initialStateId, initialLgaName]);

  useEffect(() => {
    let active = true;
    Promise.all([
      propertyService.getLocationOptions(),
      listingAssistanceService.getStatus(),
    ]).then(([locationsResponse, statusResponse]) => {
      if (!active) return;
      if (!locationsResponse?.success || !Array.isArray(locationsResponse.data)) {
        throw new Error('Could not load canonical property locations.');
      }
      setLocationOptions(locationsResponse.data);
      setStatus(statusResponse?.data || { assignments: [], requests: [] });
    }).catch((loadError) => {
      if (active) setError(loadError?.response?.data?.message || loadError.message || 'Could not load assistance status.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const selectedState = useMemo(
    () => locationOptions.find((option) => String(option.id) === String(stateId)),
    [locationOptions, stateId]
  );
  const stateOptions = useMemo(
    () => locationOptions.map((option) => ({
      label: option.state_name,
      value: String(option.id),
    })),
    [locationOptions]
  );
  const lgaOptions = useMemo(
    () => (selectedState?.lgas || []).map((lga) => ({ label: lga, value: lga })),
    [selectedState]
  );
  const propertyOptions = useMemo(
    () => properties.map((property) => ({
      label: property.title || `Property ${property.id}`,
      value: String(property.id),
    })),
    [properties]
  );
  const pendingRequest = status.requests.find((request) =>
    request.status === 'awaiting_assignment' &&
    String(request.state_id) === String(stateId) &&
    String(request.lga_name || '').toLowerCase() === String(lgaName).toLowerCase() &&
    String(request.property_id || '') === propertyId
  );

  const submitRequest = async () => {
    if (!stateId || !lgaName) {
      setError('Select a State and LGA before requesting assistance.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const response = await listingAssistanceService.createRequest({
        stateId: Number(stateId),
        lgaName,
        propertyId: propertyId ? Number(propertyId) : null,
      });
      const savedRequest = response?.data?.request;
      if (savedRequest) {
        setStatus((current) => ({
          ...current,
          requests: [
            savedRequest,
            ...current.requests.filter((item) => item.id !== savedRequest.id),
          ],
        }));
      }
      Toast.show({ type: 'success', text1: response?.message || 'Your free request is waiting for assignment.' });
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Could not submit the request.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectProperty = (option) => {
    setPropertyId(option.value);
    const property = properties.find((item) => String(item.id) === String(option.value));
    if (property) {
      setStateId(String(property.state_id || ''));
      setLgaName(property.lga_name || '');
    }
  };

  return (
    <View style={styles.card}>
      <AppText style={styles.title}>Request RentalHub listing assistance</AppText>
      <AppText style={styles.body}>
        This service is free. We match your State and LGA to an available property agent; no payment is requested.
      </AppText>

      {loading ? <ActivityIndicator color={colors.blue} style={styles.loading} /> : null}
      {error ? <AppText accessibilityRole="alert" style={styles.error}>{error}</AppText> : null}

      {status.assignments.map((assignment) => (
        <View key={assignment.id} style={styles.statusBox}>
          <AppText style={styles.statusTitle}>An active property agent is already assigned.</AppText>
          {assignment.agent_name ? <AppText style={styles.body}>{assignment.agent_name}</AppText> : null}
        </View>
      ))}
      {status.requests.map((request) => (
        <View key={request.id} style={styles.statusBox}>
          <AppText style={styles.statusTitle}>
            {request.property_title || 'Listing assistance'} · {request.lga_name}, {request.state_name}
          </AppText>
          <AppText style={styles.body}>
            {request.status === 'awaiting_assignment' ? 'Saved and awaiting assignment.' : 'Agent assigned.'}
          </AppText>
        </View>
      ))}

      {showPropertyPicker && properties.length > 0 ? (
        <SelectField
          label="Property (optional)"
          value={properties.find((item) => String(item.id) === propertyId)?.title || ''}
          placeholder="Choose a property or request for a new listing"
          onPress={() => setPropertyPickerOpen(true)}
          disabled={Boolean(status.assignments.length)}
        />
      ) : null}
      <SelectField
        label="State"
        value={selectedState?.state_name || ''}
        placeholder="Select State"
        onPress={() => setStatePickerOpen(true)}
        disabled={loading || Boolean(status.assignments.length)}
      />
      <SelectField
        label="LGA"
        value={lgaName}
        placeholder="Select LGA"
        onPress={() => setLgaPickerOpen(true)}
        disabled={!stateId || Boolean(status.assignments.length)}
      />
      {pendingRequest ? <AppText style={styles.pending}>A matching request is already awaiting assignment.</AppText> : null}
      <Button
        title={submitting ? 'Submitting…' : 'Request free listing assistance'}
        onPress={submitRequest}
        loading={submitting}
        disabled={loading || Boolean(status.assignments.length) || Boolean(pendingRequest)}
      />

      <OptionPickerModal
        visible={statePickerOpen}
        title="Select State"
        options={stateOptions}
        selectedValue={stateId}
        searchable
        onClose={() => setStatePickerOpen(false)}
        onSelect={(option) => {
          setStateId(option.value);
          setLgaName('');
          setPropertyId('');
        }}
      />
      <OptionPickerModal
        visible={lgaPickerOpen}
        title="Select LGA"
        options={lgaOptions}
        selectedValue={lgaName}
        searchable
        onClose={() => setLgaPickerOpen(false)}
        onSelect={(option) => setLgaName(option.value)}
      />
      <OptionPickerModal
        visible={propertyPickerOpen}
        title="Choose property"
        options={propertyOptions}
        selectedValue={propertyId}
        searchable
        onClose={() => setPropertyPickerOpen(false)}
        onSelect={selectProperty}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, marginBottom: 18, padding: 16 },
  title: { color: colors.navy, fontFamily: typography.semibold, fontSize: typeScale.md, lineHeight: 26 },
  body: { color: colors.muted, fontFamily: typography.regular, fontSize: typeScale.xs, lineHeight: 19, marginTop: 5 },
  loading: { marginVertical: 12 },
  error: { color: colors.danger, fontFamily: typography.medium, fontSize: typeScale.xs, lineHeight: 18, marginTop: 10 },
  statusBox: { backgroundColor: colors.surface, borderRadius: radius.md, marginTop: 12, padding: 10 },
  statusTitle: { color: colors.text, fontFamily: typography.semibold, fontSize: typeScale.xs, lineHeight: 18 },
  pending: { color: '#A15C00', fontFamily: typography.medium, fontSize: typeScale.xs, lineHeight: 18, marginBottom: 8 },
});

export default ListingAssistancePanel;
