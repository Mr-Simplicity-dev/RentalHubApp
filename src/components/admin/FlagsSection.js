import React, { useMemo } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import AppText from '../../components/common/AppText';
const FLAG_LABELS = {
  allow_registration: {
    label: 'Allow Registration',
    description: 'Master switch. When off, tenant and landlord registration are disabled.',
  },
  allow_tenant_registration: {
    label: 'Tenant Registration',
    description: 'Applies when Allow Registration is on.',
  },
  allow_landlord_registration: {
    label: 'Landlord Registration',
    description: 'Applies when Allow Registration is on.',
  },
  tenant_registration_payment: {
    label: 'Tenant Registration Payment',
    description: 'Require payment before tenant account creation.',
  },
  landlord_registration_payment: {
    label: 'Landlord Registration Payment',
    description: 'Require payment before landlord account creation.',
  },
  nin_number: { label: 'NIN Requirement', description: 'Require NIN for local registrations.' },
  passport_number: {
    label: 'Passport Requirement',
    description: 'Require passport for foreign registrations.',
  },
  property_alert_payment: { label: 'Property Alert Payment', description: '' },
  ads_enabled: { label: 'Ad Spaces', description: 'Show managed ads on key pages.' },
  tenant_landlord_referrals: {
    label: 'Tenant & Landlord Referrals',
    description: 'Allow referral invite links and credits.',
  },
};

const PARENT_KEY = 'allow_registration';
const CHILD_KEYS = ['allow_tenant_registration', 'allow_landlord_registration'];
const OTHER_KEYS = [
  'tenant_registration_payment',
  'landlord_registration_payment',
  'nin_number',
  'passport_number',
  'property_alert_payment',
  'ads_enabled',
  'tenant_landlord_referrals',
];

const FlagsSection = ({ flags = [], onToggle }) => {
  const flagMap = useMemo(
    () => new Map((flags || []).map((flag) => [flag.key, flag])),
    [flags]
  );

  const masterEnabled = flagMap.get(PARENT_KEY)?.enabled === true;

  const renderRow = (key, { nested = false, forceInactive = false } = {}) => {
    const flag = flagMap.get(key);
    if (!flag) return null;

    const meta = FLAG_LABELS[key] || { label: key, description: flag.description || '' };
    const effective = !forceInactive && flag.enabled === true;

    return (
      <View
        key={key}
        style={[styles.card, nested && styles.nestedCard, forceInactive && styles.inactiveCard]}
      >
        <View style={styles.cardBody}>
          <AppText style={styles.cardTitle}>{meta.label}</AppText>
          {meta.description ? <AppText style={styles.meta}>{meta.description}</AppText> : null}
          {forceInactive && flag.enabled ? (
            <AppText style={styles.hint}>Saved on, inactive while master registration is off.</AppText>
          ) : null}
          <AppText style={styles.keyText}>{key}</AppText>
        </View>
        <View style={styles.switchWrap}>
          <AppText style={[styles.status, effective ? styles.on : styles.off]}>
            {effective ? 'On' : 'Off'}
          </AppText>
          <Switch value={flag.enabled === true} onValueChange={(value) => onToggle(key, value)} />
        </View>
      </View>
    );
  };

  return (
    <View style={styles.wrap}>
      <AppText style={styles.heading}>Registration Controls</AppText>
      <AppText style={styles.subheading}>
        Master switch plus per-role registration. Location rules are under Registration Access.
      </AppText>
      {renderRow(PARENT_KEY)}
      {CHILD_KEYS.map((key) => renderRow(key, { nested: true, forceInactive: !masterEnabled }))}
      <AppText style={[styles.heading, styles.sectionGap]}>Other Registration & Platform Flags</AppText>
      {OTHER_KEYS.map((key) => renderRow(key))}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  heading: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  subheading: { fontSize: 13, color: '#64748b', marginBottom: 8 },
  sectionGap: { marginTop: 12 },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  nestedCard: { marginLeft: 12, borderLeftWidth: 3, borderLeftColor: '#6366f1' },
  inactiveCard: { opacity: 0.75, backgroundColor: '#f8fafc' },
  cardBody: { flex: 1, paddingRight: 8 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  meta: { fontSize: 13, color: '#64748b', marginTop: 4 },
  hint: { fontSize: 13, color: '#b45309', marginTop: 4 },
  keyText: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
  switchWrap: { alignItems: 'flex-end' },
  status: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  on: { color: '#15803d' },
  off: { color: '#64748b' },
});

export default FlagsSection;
