

import React, { useContext, useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import AppText from '../../components/common/AppText';
import SelectField from '../../components/common/SelectField';
import OptionPickerModal from '../../components/common/OptionPickerModal';
import { colors, radius, typeScale, typography } from '../../theme';
const roles = ['super_admin', 'super_support_admin', 'zonal_admin', 'state_support_admin', 'lga_support_admin'];
const empty = {
  user_type: 'tenant',
  full_name: '',
  phone: '',
  email: '',
  nin: '',
  date_of_birth: '',
  state_id: '',
  lga_name: '',
  lawyer_email: '',
  use_rentalhub_lawyers: false,
  use_rentalhub_agents: false,
  consent_confirmed: false
};
const money = n => '₦' + Number(n || 0).toLocaleString('en-NG', {
  minimumFractionDigits: 2
});
export default function AssistedRegistrationScreen() {

  const {
    user
  } = useContext(AuthContext);
  const [form, setForm] = useState(empty);
  const [locations, setLocations] = useState([]);
  const [ninEnabled, setNinEnabled] = useState(true);
  const [records, setRecords] = useState([]);
  const [pricing, setPricing] = useState(null);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [picker, setPicker] = useState(null);
  const request = useRef(null);
  const refresh = async () => {
    const r = await api.get('/assisted-registration/staff', {
      params: {
        search
      }
    });
    setRecords(r.data.data);
  };
  const requestId = async () => {
    request.current = (await api.get('/assisted-registration/staff/request-id')).data.data.request_id;
  };
  useEffect(() => {
    if (!roles.includes(user?.user_type)) return;
    Promise.all([api.get('/assisted-registration/staff/config').then(r => {
      setNinEnabled(r.data.data.nin_enabled);
      if (!r.data.data.nin_enabled) setForm(f => ({
        ...f,
        nin: '',
        date_of_birth: ''
      }));
    }), api.get('/property-utils/location-options').then(r => setLocations(r.data.data || [])), refresh(), requestId()]).catch(() => setMessage('Unable to load registration workspace. Please retry.'));
  }, [user?.user_type]);
  const update = (key, value) => {
    setForm(f => ({
      ...f,
      [key]: value,
      ...(key === 'state_id' ? {
        lga_name: ''
      } : {}),
      ...(key === 'user_type' && value === 'tenant' ? {
        use_rentalhub_agents: false
      } : {})
    }));
    setPricing(null);
  };
  const run = async fn => {
    setBusy(true);
    setMessage('');
    try {
      await fn();
    } catch (e) {
      if (e.response?.data?.code === 'REGISTRATION_QUOTE_CHANGED') setPricing(null);
      setMessage(e.response?.data?.message || e.message || 'Unable to continue. Retry without creating a second account.');
    } finally {
      setBusy(false);
    }
  };
  const submit = () => run(async () => {
    if (!pricing) {
      setPricing((await api.post('/assisted-registration/staff/quote', form)).data.data);
      return;
    }
    if (!request.current) await requestId();
    const r = await api.post('/assisted-registration/staff', {
      ...form,
      expected_amount: pricing.amount,
      request_id: request.current
    });
    setMessage('Account saved: ' + r.data.data.reference + '. Customer signs in with a phone code.');
    setForm(empty);
    setPricing(null);
    request.current = null;
    await refresh();
    await requestId();
  });
  const cash = row => Alert.alert("Confirm cash received", row.full_name + ' — ' + money(row.amount_due) + "\nConfirm only if you received the full amount in cash. You must remit this money. An unconfirmed transfer is not cash.", [{
    text: "Cancel",
    style: 'cancel'
  }, {
    text: "I received the cash",
    onPress: () => run(async () => {
      await api.post('/assisted-registration/staff/' + encodeURIComponent(row.reference) + '/cash', {
        amount: row.amount_due,
        cash_received: true
      });
      await refresh();
    })
  }]);
  const receipt = row => run(async () => {
    const r = await api.get('/assisted-registration/staff/' + encodeURIComponent(row.reference) + '/receipt', {
      responseType: 'arraybuffer'
    });
    const file = new File(Paths.cache, 'assisted-receipt-' + Date.now() + '.pdf');
    try {
      file.create();
      file.write(new Uint8Array(r.data));
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri, {
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
        dialogTitle: "Registration receipt"
      });else throw new Error('Receipt sharing is unavailable on this device. Use the web workspace.');
    } finally {
      try {
        file.delete();
      } catch {}
    }
  });
  if (!roles.includes(user?.user_type)) return <View style={styles.card}><AppText>{"Support registration access required."}</AppText></View>;
  const state = locations.find(s => String(s.id) === String(form.state_id));
  const field = (key, label, extra = {}) => <Input key={key} label={label} value={form[key]} onChangeText={v => update(key, v)} editable={!busy} {...extra} />;
  const toggle = (key, label) => <View style={styles.toggle}><AppText style={styles.toggleText}>{label}</AppText><Switch value={form[key]} disabled={busy} onValueChange={v => update(key, v)} accessibilityLabel={label} /></View>;
  const choose = (key, title, options) => setPicker({
    key,
    title,
    options
  });
  return <><ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled"><AppText style={styles.title}>{"Assisted account registration"}</AppText><AppText>{"Explain the account, identity checks and fee to the customer. Customer passwords and verification codes remain private."}</AppText>{message ? <AppText accessibilityLiveRegion="polite">{message}</AppText> : null}<View style={styles.card}><AppText style={styles.heading}>{"Customer details"}</AppText><SelectField label={"Account type"} value={form.user_type === 'tenant' ? 'Tenant' : 'Landlord'} disabled={busy} onPress={() => choose('user_type', 'Account type', [{
          label: "Tenant",
          value: 'tenant'
        }, {
          label: "Landlord",
          value: 'landlord'
        }])} />{field('full_name', 'Full name')}{field('phone', 'Customer phone number', {
          keyboardType: 'phone-pad'
        })}{field('email', 'Customer email (optional)', {
          keyboardType: 'email-address',
          autoCapitalize: 'none'
        })}{ninEnabled && <>{field('nin', 'NIN', {
            keyboardType: 'number-pad',
            maxLength: 11
          })}{field('date_of_birth', 'Date of birth (YYYY-MM-DD)', {
            placeholder: '1990-01-31'
          })}</>}<SelectField label={"State"} value={state?.state_name} disabled={busy} onPress={() => choose('state_id', 'State', locations.map(s => ({
          label: s.state_name,
          value: s.id
        })))} /><SelectField label={"Local government area"} value={form.lga_name} disabled={busy || !state} onPress={() => choose('lga_name', 'Local government area', (state?.lgas || []).map(s => ({
          label: s,
          value: s
        })))} />{toggle('use_rentalhub_lawyers', 'Use platform coverage assistance (fee included in quote)')}{!form.use_rentalhub_lawyers && field('lawyer_email', 'Customer’s own lawyer email', {
          keyboardType: 'email-address',
          autoCapitalize: 'none'
        })}{form.user_type === "landlord" && toggle('use_rentalhub_agents', 'Use a platform property agent (fee included in quote)')}{toggle('consent_confirmed', 'I explained registration and obtained the customer’s agreement.')}{pricing && <View style={styles.quote}><AppText>{"Registration: "}{money(pricing.base_amount)}</AppText><AppText>{"Coverage assistance: "}{money(pricing.lawyer_amount)}</AppText><AppText>{"Property agent: "}{money(pricing.agent_amount)}</AppText><AppText style={styles.heading}>{"Total: "}{money(pricing.amount)}</AppText><AppText>{"Account is created unpaid. Record cash only after receiving it, or let the customer pay after sign-in."}</AppText></View>}<Button title={pricing ? 'Create customer account' : 'Review registration fee'} onPress={submit} loading={busy} /></View><View style={styles.card}><AppText style={styles.heading}>{"Registrations and receipts"}</AppText><Input label={"Search name, phone or reference"} value={search} onChangeText={setSearch} /><Button title={"Search / refresh"} variant="outline" onPress={() => run(refresh)} disabled={busy} />{records.map(row => <View key={row.reference} style={styles.record}><AppText style={styles.heading}>{row.full_name}</AppText><AppText>{row.user_type} · {row.phone}</AppText><AppText>{row.state_name}, {row.lga_name}</AppText><AppText>{row.reference}</AppText><AppText>{money(row.amount_due)} — {row.collection_method === 'waived' ? 'Fee waived' : row.status === "paid" ? "Paid" : "Unpaid"}</AppText>{row.collection_method === 'cash' && <AppText>{"Cash remittance: "}{row.remittance_status}</AppText>}{row.status === "paid" ? <Button title={row.collection_method === 'waived' ? 'Download acknowledgement' : 'Generate receipt'} variant="outline" disabled={busy} onPress={() => receipt(row)} /> : <Button title={"Record cash received"} disabled={busy} onPress={() => cash(row)} />} {['super_admin', 'super_support_admin'].includes(user.user_type) && row.remittance_status === 'outstanding' && <Button title={"Acknowledge cash remittance"} variant="outline" disabled={busy} onPress={() => Alert.alert("Acknowledge cash remittance", "Confirm that you received this collected money. You cannot acknowledge your own collection.", [{
            text: "Cancel",
            style: 'cancel'
          }, {
            text: "Confirm received",
            onPress: () => run(async () => {
              await api.post('/assisted-registration/staff/' + encodeURIComponent(row.reference) + '/remittance');
              await refresh();
            })
          }])} />}</View>)}</View><View style={styles.card}><AppText style={styles.heading}>{"Office fingerprint verification"}</AppText><AppText>{"Use Assisted account registration on the office Windows website for fingerprint enrollment and verification with the U.are.U 4500 reader. The SourceAFIS integration requires server setup. This USB reader is not connected through the Android or iOS app."}</AppText></View></ScrollView><OptionPickerModal visible={Boolean(picker)} title={picker?.title} options={picker?.options || []} searchable onClose={() => setPicker(null)} onSelect={item => {
      update(picker.key, item.value);
      setPicker(null);
    }} /></>;
}
const styles = StyleSheet.create({
  page: {
    padding: 18,
    gap: 18,
    backgroundColor: colors.surface
  },
  title: {
    fontSize: 26,
    fontFamily: typography.bold,
    color: colors.ink
  },
  heading: {
    fontSize: typeScale.lg,
    fontFamily: typography.semibold,
    color: colors.ink
  },
  card: {
    padding: 18,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    gap: 14
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12
  },
  toggleText: {
    flex: 1
  },
  quote: {
    padding: 14,
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: radius.md
  },
  record: {
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingTop: 16,
    gap: 10
  }
});
