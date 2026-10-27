import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import Input from '../../components/common/Input';
import {
  PremiumButton,
  PremiumCard,
  PremiumHero,
  PremiumSectionTitle,
} from '../../components/common/PremiumLayout';
import { marketingOpsService } from '../../services/marketingOpsService';
import { getErrorMessage } from '../../utils/http';
import { colors, radius, typography, typeScale } from '../../theme';
import AppText from '../../components/common/AppText';

const MarketingBuilderScreen = () => {
  useInterfaceLanguage();
  const [channel, setChannel] = useState('email');
  const [sub, setSub] = useState({ email: '', phone: '', full_name: '' });
  const [template, setTemplate] = useState({ name: '', subject: '', htmlContent: '', content: '' });
  const [campaign, setCampaign] = useState({ name: '', subject: '', content: '' });
  const [bulkText, setBulkText] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [busy, setBusy] = useState('');

  const isEmail = channel === 'email';

  const run = async (key, fn, label) => {
    setBusy(key);
    try {
      const res = await fn();
      if (res?.success) {
        Toast.show({ type: 'success', text1: label, text2: res?.message || ui("Saved.") });
        if (key === 'sub') setSub({ email: '', phone: '', full_name: '' });
        if (key === 'tpl') setTemplate({ name: '', subject: '', htmlContent: '', content: '' });
        if (key === 'camp') setCampaign({ name: '', subject: '', content: '' });
      } else {
        Toast.show({ type: 'error', text1: label, text2: res?.message || ui("Could not save.") });
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: label, text2: getErrorMessage(err, ui("Request failed")) });
    } finally {
      setBusy(null);
    }
  };

  const addSubscriber = () => {
    if (isEmail) {
      if (!sub.email) return Toast.show({ type: 'info', text1: ui("Email is required") });
      run('sub', () => marketingOpsService.emailAddSubscriber({ email: sub.email.trim(), full_name: sub.full_name.trim() }), 'Subscriber added');
    } else {
      if (!sub.phone) return Toast.show({ type: 'info', text1: ui("Phone is required") });
      run('sub', () => marketingOpsService.smsAddSubscriber({ phone: sub.phone.trim(), full_name: sub.full_name.trim() }), 'Subscriber added');
    }
  };

  const addTemplate = () => {
    if (!template.name.trim()) return Toast.show({ type: 'info', text1: ui("Template name is required") });
    if (isEmail) {
      run('tpl', () => marketingOpsService.emailCreateTemplate({ name: template.name.trim(), subject: template.subject.trim(), htmlContent: template.htmlContent }), 'Template created');
    } else {
      if (!template.content.trim()) return Toast.show({ type: 'info', text1: ui("Message content is required") });
      run('tpl', () => marketingOpsService.smsCreateTemplate({ name: template.name.trim(), content: template.content }), 'Template created');
    }
  };

  const addCampaign = () => {
    if (!campaign.name.trim()) return Toast.show({ type: 'info', text1: ui("Campaign name is required") });
    if (isEmail) {
      if (!campaign.subject.trim()) return Toast.show({ type: 'info', text1: ui("Email subject is required") });
      run('camp', () => marketingOpsService.emailCreateCampaign({ name: campaign.name.trim(), subject: campaign.subject.trim(), content_html: campaign.content }), 'Campaign created');
    } else {
      run('camp', () => marketingOpsService.smsCreateCampaign({ name: campaign.name.trim() }), 'Campaign created');
    }
  };

  const addBulk = async () => {
    const lines = bulkText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return Toast.show({ type: 'info', text1: ui("Paste one email/phone per line") });
    setBulkBusy(true);
    let ok = 0;
    let failed = 0;
    for (const value of lines) {
      try {
        const res = isEmail
          ? await marketingOpsService.emailAddSubscriber({ email: value, full_name: '' })
          : await marketingOpsService.smsAddSubscriber({ phone: value, full_name: '' });
        if (res?.success) ok += 1;
        else failed += 1;
      } catch {
        failed += 1;
      }
    }
    setBulkBusy(false);
    Toast.show({
      type: ok > 0 ? 'success' : 'error',
      text1: ok > 0 ? ui("Import complete") : ui("Import failed"),
      text2: ui("{value0} added, {value1} skipped.", {value0: (ok), value1: (failed)}),
    });
    setBulkText('');
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <PremiumHero
        eyebrow={ui("Marketing")}
        title={ui("Campaign builder")}
        subtitle={ui("Add subscribers, templates and new campaigns for email or SMS.")}
        icon="create-outline"
      />

      <View style={styles.tabRow}>
        {['email', 'sms'].map((key) => (
          <TouchableOpacity
            key={key}
            activeOpacity={0.85}
            onPress={() => setChannel(key)}
            style={[styles.tab, channel === key && styles.tabActive]}
          >
            <AppText style={[styles.tabText, channel === key && styles.tabTextActive]}>
              {key === "email" ? ui("Email") : ui("SMS")}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>

      <PremiumSectionTitle title={ui("Add subscriber")} />
      <PremiumCard>
        <Input
          label={isEmail ? ui("Email") : ui("Phone")}
          value={isEmail ? sub.email : sub.phone}
          onChangeText={(v) => (isEmail ? setSub((p) => ({ ...p, email: v })) : setSub((p) => ({ ...p, phone: v })))}
          keyboardType={isEmail ? 'email-address' : 'phone-pad'}
        />
        <Input
          label={ui("Full name (optional)")}
          value={sub.full_name}
          onChangeText={(v) => setSub((p) => ({ ...p, full_name: v }))}
          containerStyle={styles.fieldGap}
        />
        <PremiumButton title={ui("Add subscriber")} onPress={addSubscriber} loading={busy === 'sub'} style={styles.action} />
      </PremiumCard>

      <PremiumSectionTitle title={isEmail ? 'Create email template' : 'Create SMS template'} />
      <PremiumCard>
        <Input label={ui("Template name")} value={template.name} onChangeText={(v) => setTemplate((p) => ({ ...p, name: v }))} />
        {isEmail ? (
          <Input label={ui("Subject")} value={template.subject} onChangeText={(v) => setTemplate((p) => ({ ...p, subject: v }))} containerStyle={styles.fieldGap} />
        ) : null}
        <Input
          label={isEmail ? ui("HTML content") : 'Message content'}
          value={isEmail ? template.htmlContent : template.content}
          onChangeText={(v) => (isEmail ? setTemplate((p) => ({ ...p, htmlContent: v })) : setTemplate((p) => ({ ...p, content: v })))}
          multiline
          numberOfLines={4}
          containerStyle={styles.fieldGap}
        />
        <PremiumButton title={ui("Create template")} onPress={addTemplate} loading={busy === 'tpl'} style={styles.action} />
      </PremiumCard>

      <PremiumSectionTitle title={ui("Create campaign")} />
      <PremiumCard>
        <Input label={ui("Campaign name")} value={campaign.name} onChangeText={(v) => setCampaign((p) => ({ ...p, name: v }))} />
        {isEmail ? (
          <Input label={ui("Email subject")} value={campaign.subject} onChangeText={(v) => setCampaign((p) => ({ ...p, subject: v }))} containerStyle={styles.fieldGap} />
        ) : null}
        {isEmail ? (
          <Input label={ui("HTML content")} value={campaign.content} onChangeText={(v) => setCampaign((p) => ({ ...p, content: v }))} multiline numberOfLines={4} containerStyle={styles.fieldGap} />
        ) : null}
        {!isEmail ? (
          <AppText style={styles.note}>{ui("SMS campaigns reference a saved template. After creating one, launch it from the Marketing screen (draft campaigns show a Send button).")}</AppText>
        ) : null}
        <PremiumButton title={ui("Create campaign")} onPress={addCampaign} loading={busy === 'camp'} style={styles.action} />
      </PremiumCard>

      <PremiumSectionTitle title={ui("Bulk import subscribers")} />
      <PremiumCard>
        <Input
          label={isEmail ? 'Emails (one per line)' : 'Phone numbers (one per line)'}
          value={bulkText}
          onChangeText={setBulkText}
          placeholder={isEmail ? 'a@x.com\nb@y.com' : '08031234567\n08039876543'}
          multiline
          numberOfLines={5}
        />
        <PremiumButton
          title={bulkBusy ? 'Importing…' : ui("Import list")}
          onPress={addBulk}
          loading={bulkBusy}
          icon="download-outline"
          style={styles.action}
        />
        <AppText style={styles.note}>{ui("Each valid entry is added as a subscriber via the API.")}</AppText>
      </PremiumCard>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 18, paddingBottom: 36 },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tab: { flex: 1, borderColor: colors.border, borderRadius: radius.pill, borderWidth: 1, paddingVertical: 9, alignItems: 'center', backgroundColor: colors.white },
  tabActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  tabText: { color: colors.text, fontFamily: typography.semibold, fontSize: typeScale.xs, lineHeight: 18 },
  tabTextActive: { color: colors.white },
  fieldGap: { marginTop: 12 },
  action: { marginTop: 14 },
  note: { color: colors.muted, fontFamily: typography.regular, fontSize: typeScale.xs, lineHeight: 18, marginTop: 10 },
});

export default MarketingBuilderScreen;
