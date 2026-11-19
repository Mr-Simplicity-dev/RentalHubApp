import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { InfoRow, PremiumButton, PremiumCard, PremiumCenter, PremiumHero, PremiumScreen } from './PremiumLayout';
import AppText from './AppText';
import serviceTrackingService from '../../services/serviceTrackingService';
import { getErrorMessage } from '../../utils/http';
import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';

export default function ServiceTrackingDetail({ route, serviceType }) {
  useInterfaceLanguage();
  const bookingId = route?.params?.bookingId;
  const [data, setData] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    try { const next = await serviceTrackingService.getServiceDetails(serviceType, bookingId); setData(next); setError(''); }
    catch (failure) { setError(getErrorMessage(failure, ui('Could not load service tracking'))); }
    finally { setLoading(false); }
  }, [bookingId, serviceType]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  if (loading && !data) return <PremiumCenter loading title={ui('Service tracking')} />;
  const booking = data?.booking || data || {}, telemetry = data?.telemetry || {}, estimates = data?.estimates || {};
  const status = data?.progress?.current_status || booking.tracking_status || booking.booking_status;
  const eta = serviceType === 'fumigation' ? telemetry.eta_arrival_minutes ?? estimates.eta_minutes : estimates.eta_destination_minutes;
  const distance = telemetry.distance_remaining_km ?? estimates.distance_remaining_km ?? estimates.distance_km;
  const person = serviceType === 'fumigation' ? data?.team : data?.driver;
  const safety = data?.safety_and_compliance;
  const display = value => value === null || value === undefined || value === '' ? ui('Not available') : String(value);
  return <PremiumScreen>
    <PremiumHero title={ui('Service tracking')} subtitle={booking.booking_reference || String(bookingId || '')} icon="navigate-outline" />
    {error ? <PremiumCard><AppText accessibilityRole="alert">{error}</AppText></PremiumCard> : null}
    {data && <PremiumCard>
      <InfoRow icon="information-circle-outline" label={ui('Status')} value={status ? String(status).replace(/_/g, ' ') : ui('Not available')} />
      <InfoRow icon="time-outline" label={ui('ETA')} value={display(eta)} />
      <InfoRow icon="navigate-outline" label={ui('Distance')} value={display(distance)} />
      <InfoRow icon="person-outline" label={ui('Assigned team')} value={display(person?.name)} />
      {safety && <View style={{ marginTop: 12 }}><AppText>{ui('Safety instructions')}</AppText><AppText>{safety.safety_instructions || ui('Follow the instructions provided by the service team.')}</AppText><AppText>{safety.reentry_permitted_at ? new Date(safety.reentry_permitted_at).toLocaleString() : ui('Safe re-entry has not been confirmed.')}</AppText></View>}
    </PremiumCard>}
    <PremiumButton title={ui('Refresh')} icon="refresh-outline" loading={loading} onPress={load} />
  </PremiumScreen>;
}
