import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import { typeScale } from '../../theme';
import React, { useMemo } from 'react';
import {StyleSheet, Switch, View} from 'react-native';

import AppText from '../../components/common/AppText';

// Labels mirror the web admin flags tab (client/src/components/admin/FlagsTab.jsx)
// so both surfaces list and describe the same switches.
const FLAG_LABELS = {
  allow_registration: {
    get "label"() { return ui("Allow Registration"); },
    get "description"() { return ui("Master switch. When off, tenant and landlord registration are disabled."); },
  },
  allow_tenant_registration: {
    get "label"() { return ui("Tenant Registration"); },
    get "description"() { return ui("Applies when Allow Registration is on."); },
  },
  allow_landlord_registration: {
    get "label"() { return ui("Landlord Registration"); },
    get "description"() { return ui("Applies when Allow Registration is on."); },
  },
  tenant_registration_payment: {
    get "label"() { return ui("Tenant Registration Payment"); },
    get "description"() { return ui("Require payment before tenant account creation."); },
  },
  landlord_registration_payment: {
    get "label"() { return ui("Landlord Registration Payment"); },
    get "description"() { return ui("Require payment before landlord account creation."); },
  },
  diaspora_registration: {
    get "label"() { return ui("Diaspora Registration"); },
    get "description"() { return ui("Allow foreign registrations with international passport verification and USD pricing."); },
  },
  diaspora_registration_payment: {
    get "label"() { return ui("Diaspora Registration Payment"); },
    get "description"() { return ui("Require a USD-quoted registration payment before a diaspora account is created."); },
  },
  diaspora_require_foreign_card: {
    get "label"() { return ui("Diaspora Foreign Card Required"); },
    get "description"() { return ui("Reject diaspora payments funded by Nigerian-issued cards."); },
  },
  nin_number: { get "label"() { return ui("NIN Requirement"); }, get "description"() { return ui("Require NIN for local registrations."); } },
  passport_number: {
    get "label"() { return ui("Passport Requirement"); },
    get "description"() { return ui("Require passport for foreign registrations."); },
  },
  property_alert_payment: {
    get "label"() { return ui("Property Alert Payment"); },
    get "description"() { return ui("Require payment before processing \"Notify me when available\" requests."); },
  },
  ads_enabled: { get "label"() { return ui("Ad Spaces"); }, get "description"() { return ui("Show managed ads on key pages."); } },
  tenant_landlord_referrals: {
    get "label"() { return ui("Tenant & Landlord Referrals"); },
    get "description"() { return ui("Allow referral invite links and credits."); },
  },
  allow_applications: {
    get "label"() { return ui("Agent Applications"); },
    get "description"() { return ui("Allow users to submit rental agent applications."); },
  },
  allow_property_posting: {
    get "label"() { return ui("Property Posting"); },
    get "description"() { return ui("Allow landlords and agents to post new properties."); },
  },
  require_property_ownership_verification: {
    get "label"() { return ui("Ownership Verification"); },
    get "description"() { return ui("Show only ownership-verified listings publicly. Existing listings stay visible."); },
  },
  maintenance_mode: {
    get "label"() { return ui("Maintenance Mode"); },
    get "description"() { return ui("Block non-admin activity while maintenance is in progress."); },
  },
  survey_public_enabled: {
    get "label"() { return ui("Public Survey Link"); },
    get "description"() { return ui("Show the market-research survey link in the site footer."); },
  },
  survey_location_gate: {
    get "label"() { return ui("Survey Location Gate"); },
    get "description"() { return ui("Require respondents to be inside the allowed survey area and block VPN connections."); },
  },
  local_rate_ip_check: {
    get "label"() { return ui("Local Rate IP Check"); },
    get "description"() { return ui("Block the local (₦) registration rate for foreign IPs and VPN connections."); },
  },
  voice_geo_routing: {
    get "label"() { return ui("Voice Geo Routing"); },
    get "description"() { return ui("Route inbound voice calls by the caller’s state/LGA."); },
  },
};

const REGISTRATION_PARENT_KEY = 'allow_registration';
const REGISTRATION_CHILD_KEYS = ['allow_tenant_registration', 'allow_landlord_registration'];
const REGISTRATION_OTHER_KEYS = [
  'tenant_registration_payment',
  'landlord_registration_payment',
  'diaspora_registration',
  'diaspora_registration_payment',
  'diaspora_require_foreign_card',
  'nin_number',
  'passport_number',
];

const PLATFORM_PRIORITY_FLAG_ORDER = [
  'property_alert_payment',
  'ads_enabled',
  'tenant_landlord_referrals',
];

const HIDDEN_KEYS = new Set([
  'survey_location_gate',
]);

const FlagsSection = ({ flags = [], onToggle }) => {
  const interfaceLanguage = useInterfaceLanguage();
  // Merge what the API returned with every known label: a flag that is missing
  // from the response still renders (off) instead of silently disappearing.
  const mergedFlags = useMemo(() => {
    const map = new Map((flags || []).map((flag) => [flag.key, { ...flag }]));

    Object.entries(FLAG_LABELS).forEach(([key, meta]) => {
      if (!map.has(key)) {
        map.set(key, { key, enabled: false, description: meta.description });
      }
    });

    return Array.from(map.values());
  }, [flags, interfaceLanguage]);

  const flagMap = useMemo(
    () => new Map(mergedFlags.map((flag) => [flag.key, flag])),
    [mergedFlags, interfaceLanguage]
  );

  const masterEnabled = flagMap.get(REGISTRATION_PARENT_KEY)?.enabled === true;

  const platformFlags = useMemo(() => {
    const registrationKeys = new Set([
      REGISTRATION_PARENT_KEY,
      ...REGISTRATION_CHILD_KEYS,
      ...REGISTRATION_OTHER_KEYS,
    ]);

    const weight = new Map(PLATFORM_PRIORITY_FLAG_ORDER.map((key, index) => [key, index]));

    // Everything the server has that is not already listed above, so new flags
    // added later show up here automatically.
    return mergedFlags
      .filter((flag) => !registrationKeys.has(flag.key) && !HIDDEN_KEYS.has(flag.key))
      .sort((a, b) => {
        const aWeight = weight.has(a.key) ? weight.get(a.key) : Number.MAX_SAFE_INTEGER;
        const bWeight = weight.has(b.key) ? weight.get(b.key) : Number.MAX_SAFE_INTEGER;

        return aWeight !== bWeight ? aWeight - bWeight : a.key.localeCompare(b.key);
      });
  }, [mergedFlags, interfaceLanguage]);

  const renderRow = (key, { nested = false, forceInactive = false } = {}) => {
    const flag = flagMap.get(key);
    if (!flag) return null;

    const meta = FLAG_LABELS[key] || {};
    const description = meta.description || flag.description || '';
    const effective = !forceInactive && flag.enabled === true;

    return (
      <View
        key={key}
        style={[styles.card, nested && styles.nestedCard, forceInactive && styles.inactiveCard]}
      >
        <View style={styles.cardBody}>
          <AppText style={styles.cardTitle}>{meta.label || key}</AppText>
          {description ? <AppText style={styles.meta}>{description}</AppText> : null}
          {forceInactive && flag.enabled ? (
            <AppText style={styles.hint}>{ui("Saved on, inactive while master registration is off.")}</AppText>
          ) : null}
          <AppText style={styles.keyText}>{key}</AppText>
        </View>
        <View style={styles.switchWrap}>
          <AppText style={[styles.status, effective ? styles.on : styles.off]}>
            {effective ? ui("On") : ui("Off")}
          </AppText>
          <Switch value={flag.enabled === true} onValueChange={(value) => onToggle(key, value)} />
        </View>
      </View>
    );
  };

  return (
    <View style={styles.wrap}>
      <AppText style={styles.heading}>{ui("Registration Controls")}</AppText>
      <AppText style={styles.subheading}>{ui("Master switch plus per-role registration. Location rules are under Registration Access.")}</AppText>
      {renderRow(REGISTRATION_PARENT_KEY)}
      {REGISTRATION_CHILD_KEYS.map((key) =>
        renderRow(key, { nested: true, forceInactive: !masterEnabled })
      )}
      {REGISTRATION_OTHER_KEYS.map((key) => renderRow(key))}
      <AppText style={[styles.heading, styles.sectionGap]}>{ui("Platform & Survey Flags")}</AppText>
      <AppText style={styles.subheading}>{ui("Every other platform switch on this account. New server flags appear here automatically.")}</AppText>
      {platformFlags.map((flag) => renderRow(flag.key))}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  heading: { fontSize: typeScale.base, lineHeight: 24, fontWeight: '700', color: '#0f172a' },
  subheading: { fontSize: typeScale.xs, lineHeight: 18, color: '#64748b', marginBottom: 8 },
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
  cardTitle: { fontSize: typeScale.base, lineHeight: 24, fontWeight: '600', color: '#0f172a' },
  meta: { fontSize: typeScale.xs, lineHeight: 18, color: '#64748b', marginTop: 4 },
  hint: { fontSize: typeScale.reading, lineHeight: 22, color: '#b45309', marginTop: 4 },
  keyText: { fontSize: typeScale.xs, lineHeight: 18, color: '#94a3b8', marginTop: 4 },
  switchWrap: { alignItems: 'flex-end' },
  status: { fontSize: typeScale.xs, lineHeight: 18, fontWeight: '600', marginBottom: 4 },
  on: { color: '#15803d' },
  off: { color: '#64748b' },
});

export default FlagsSection;
