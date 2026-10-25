import React, { useCallback, useState } from 'react';
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { useFocusEffect } from '@react-navigation/native';
import { launchImageLibrary } from 'react-native-image-picker';
import Input from '../../components/common/Input';
import {
  InfoRow,
  PremiumButton,
  PremiumCard,
  PremiumHero,
  PremiumListScreen,
  PremiumSectionTitle,
  StatusPill,
} from '../../components/common/PremiumLayout';
import { marketingOpsService } from '../../services/marketingOpsService';
import { getErrorMessage, pickList } from '../../utils/http';
import { colors, radius, typography, typeScale } from '../../theme';
import AppText from '../../components/common/AppText';

const STATUS_COLORS = {
  draft: colors.muted,
  queued: colors.blue,
  sending: '#B7791F',
  sent: colors.success,
  paused: '#B7791F',
  failed: colors.danger,
  cancelled: colors.muted,
};

const GOVERNANCE_COPY = {
  send: {
    title: 'Queue campaign',
    label: 'Launch approval note',
    placeholder: 'Who approved this send and why now?',
    required: 'A launch approval note is required',
  },
  retry: {
    title: 'Retry failed messages',
    label: 'Retry reason',
    placeholder: 'Why should these messages be retried?',
    required: 'A retry reason is required',
  },
  delete: {
    title: 'Delete campaign',
    label: 'Deletion reason',
    placeholder: 'Why should this campaign be deleted?',
    required: 'A deletion reason is required',
  },
};

const emptyForm = {
  name: '',
  kind: 'template',
  template_name: '',
  template_language: 'en',
  template_params: '',
  content: '',
  scope: 'all',
  user_type: '',
  source: 'users',
  media: { type: '', url: '' },
  headerMedia: { type: '', url: '' },
};

const formatDate = (value) => {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(value);
  }
};

const ChannelToggle = ({ options, value, onChange }) => (
  <View style={styles.toggleRow}>
    {options.map((option) => {
      const active = option.value === value;
      return (
        <TouchableOpacity
          key={option.value}
          activeOpacity={0.85}
          onPress={() => onChange(option.value)}
          style={[styles.toggle, active && styles.toggleActive]}
        >
          <AppText style={[styles.toggleText, active && styles.toggleTextActive]}>{option.label}</AppText>
        </TouchableOpacity>
      );
    })}
  </View>
);

const WhatsappMarketingScreen = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [showBuilder, setShowBuilder] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [audience, setAudience] = useState(null);
  const [audienceLoading, setAudienceLoading] = useState(false);
  const [busyKey, setBusyKey] = useState(null);
  const [uploading, setUploading] = useState('');
  const [noteModal, setNoteModal] = useState({ open: false, type: 'send', target: null, note: '', error: '' });
  const [statsModal, setStatsModal] = useState({ open: false, data: null });
  const [contacts, setContacts] = useState([]);
  const [contactStats, setContactStats] = useState(null);
  const [showContacts, setShowContacts] = useState(false);
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [contactPaste, setContactPaste] = useState('');
  const [contactBusy, setContactBusy] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, campaignsRes, contactsRes] = await Promise.all([
        marketingOpsService.whatsappStats(),
        marketingOpsService.whatsappCampaigns(),
        marketingOpsService.whatsappContacts().catch(() => null),
      ]);
      setStats(statsRes?.data || null);
      setCampaigns(pickList(campaignsRes, ['data']));
      if (contactsRes?.data) {
        setContacts(contactsRes.data.contacts || []);
        setContactStats(contactsRes.data.stats || null);
      }
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(err, 'Could not load WhatsApp campaigns'),
      });
      setStats(null);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const updateForm = (patch) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setAudience(null);
  };

  const previewAudience = async () => {
    setAudienceLoading(true);
    try {
      const res = await marketingOpsService.whatsappAudience({
        scope: form.source === 'users' ? form.scope : 'all',
        user_type: form.source === 'users' ? form.user_type.trim() : '',
        source: form.source,
      });
      setAudience(res?.data?.count ?? 0);
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Failed', text2: getErrorMessage(err, 'Could not estimate audience') });
    } finally {
      setAudienceLoading(false);
    }
  };

  const uploadAsset = async (mediaType, asset, setterKey) => {
    if (!asset?.uri) return;
    const limit = mediaType === 'video' ? 16 * 1024 * 1024 : 5 * 1024 * 1024;
    if (asset.fileSize && asset.fileSize > limit) {
      Toast.show({
        type: 'error',
        text1: 'File too large',
        text2: mediaType === 'video' ? 'Clips must be under 16MB' : 'Images must be under 5MB',
      });
      return;
    }
    setUploading(setterKey);
    try {
      const data = new FormData();
      data.append('file', {
        uri: asset.uri,
        type: asset.type || (mediaType === 'video' ? 'video/mp4' : 'image/jpeg'),
        name: asset.fileName || `whatsapp_${Date.now()}${mediaType === 'video' ? '.mp4' : '.jpg'}`,
      });
      const res = await marketingOpsService.whatsappUploadMedia(data);
      const uploaded = res?.data || {};
      updateForm({ [setterKey]: { type: uploaded.media_type || mediaType, url: uploaded.url || '' } });
      Toast.show({ type: 'success', text1: 'Media uploaded' });
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Upload failed', text2: getErrorMessage(err, 'Could not upload media') });
    } finally {
      setUploading('');
    }
  };

  const pickMedia = async (mediaType, setterKey) => {
    try {
      const result = await launchImageLibrary({
        mediaType: mediaType === 'video' ? 'video' : 'photo',
        selectionLimit: 1,
        quality: 0.9,
      });
      const asset = result?.assets?.[0];
      if (!asset) return;
      if (result?.didCancel) return;
      await uploadAsset(mediaType, asset, setterKey);
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Picker failed', text2: getErrorMessage(err, 'Could not open gallery') });
    }
  };

  const openNote = (type, target) => {
    setNoteModal({ open: true, type, target, note: '', error: '' });
  };

  const closeNote = () => {
    setNoteModal({ open: false, type: 'send', target: null, note: '', error: '' });
  };

  const submitNote = async () => {
    const { type, target, note } = noteModal;
    if (!note.trim()) {
      setNoteModal((prev) => ({ ...prev, error: GOVERNANCE_COPY[type].required }));
      return;
    }
    setBusyKey(`note:${type}`);
    try {
      if (type === 'send') {
        await marketingOpsService.whatsappSendCampaign(target.id, note.trim());
        Toast.show({ type: 'success', text1: 'Campaign queued', text2: 'Messages go out within a minute.' });
      } else if (type === 'retry') {
        await marketingOpsService.whatsappRetryCampaign(target.id, note.trim());
        Toast.show({ type: 'success', text1: 'Failed messages re-queued' });
      } else if (type === 'delete') {
        await marketingOpsService.whatsappDeleteCampaign(target.id, note.trim());
        Toast.show({ type: 'success', text1: 'Campaign deleted' });
      }
      closeNote();
      await load();
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Failed', text2: getErrorMessage(err, 'Action failed') });
    } finally {
      setBusyKey(null);
    }
  };

  const createCampaign = async () => {
    if (!form.name.trim()) return Toast.show({ type: 'info', text1: 'Campaign name is required' });
    if (form.kind === 'template' && !form.template_name.trim()) {
      return Toast.show({ type: 'info', text1: 'Meta template name is required' });
    }
    if (form.kind === 'text' && !form.content.trim() && !form.media.url.trim()) {
      return Toast.show({ type: 'info', text1: 'Write a message or attach media' });
    }
    if (form.source === 'users' && form.scope === 'user_type' && !form.user_type.trim()) {
      return Toast.show({ type: 'info', text1: 'Enter the user type to target' });
    }

    setBusyKey('create');
    try {
      const payload = {
        name: form.name.trim(),
        kind: form.kind,
        recipient_filter: {
          scope: form.source === 'users' ? form.scope : 'all',
          user_type: form.source === 'users' && form.scope === 'user_type' ? form.user_type.trim() : null,
          source: form.source,
        },
        media_type: form.kind === 'text' ? form.media.type || null : null,
        media_url: form.kind === 'text' ? form.media.url.trim() || null : null,
        header_media_type: form.kind === 'template' ? form.headerMedia.type || null : null,
        header_media_url: form.kind === 'template' ? form.headerMedia.url.trim() || null : null,
        ...(form.kind === 'template'
          ? {
              template_name: form.template_name.trim(),
              template_language: form.template_language.trim() || 'en',
              template_params: form.template_params.split(',').map((s) => s.trim()).filter(Boolean),
            }
          : { content: form.content.trim() || null }),
      };
      const res = await marketingOpsService.whatsappCreateCampaign(payload);
      const created = res?.data || {};
      setForm(emptyForm);
      setAudience(null);
      setShowBuilder(false);
      await load();
      Toast.show({
        type: 'success',
        text1: `Queued for ${created.recipients ?? 0} recipient(s)`,
        text2: created.skipped ? `Skipped ${created.skipped} invalid/duplicate` : 'Ready to send',
      });
      openNote('send', created);
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Failed', text2: getErrorMessage(err, 'Could not create campaign') });
    } finally {
      setBusyKey(null);
    }
  };

  const importPastedContacts = async () => {
    const phones = String(contactPaste || '')
      .split(/[\r\n,;]+/)
      .map((p) => p.replace(/[\s"']/g, ''))
      .filter((p) => p.length >= 10);

    if (phones.length === 0) {
      Toast.show({ type: 'info', text1: 'Paste at least one phone number' });
      return;
    }

    setContactBusy('import');
    try {
      const res = await marketingOpsService.whatsappImportContacts(phones);
      const data = res?.data || {};
      Toast.show({
        type: 'success',
        text1: `Imported ${data.added ?? 0} new`,
        text2: `Already in system ${data.alreadyKnown ?? 0} · Duplicates ${data.duplicates ?? 0} · Invalid ${data.invalid ?? 0}`,
      });
      setContactPaste('');
      setShowPasteBox(false);
      await load();
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Import failed', text2: getErrorMessage(err, 'Could not import numbers') });
    } finally {
      setContactBusy('');
    }
  };

  const checkContacts = async () => {
    setContactBusy('check');
    try {
      const res = await marketingOpsService.whatsappCheckContacts({ all: true });
      const data = res?.data || {};
      if ((data.checked ?? 0) === 0) {
        Toast.show({ type: 'info', text1: 'Nothing new to check' });
      } else {
        Toast.show({
          type: 'success',
          text1: `Checked ${data.checked}`,
          text2: `On WhatsApp ${data.valid ?? 0} · Not on WhatsApp ${data.invalid ?? 0}`,
        });
      }
      await load();
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Check failed', text2: getErrorMessage(err, 'WhatsApp check failed') });
    } finally {
      setContactBusy('');
    }
  };

  const removeContact = async (contact) => {
    setContactBusy(`del:${contact.id}`);
    try {
      await marketingOpsService.whatsappDeleteContact(contact.id);
      Toast.show({ type: 'success', text1: 'Contact removed' });
      await load();
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Failed', text2: getErrorMessage(err, 'Could not remove contact') });
    } finally {
      setContactBusy('');
    }
  };

  const removeInvalidContacts = async () => {
    if ((contactStats?.invalid ?? 0) === 0) {
      Toast.show({ type: 'info', text1: 'No invalid contacts to delete' });
      return;
    }
    setContactBusy('delInvalid');
    try {
      const res = await marketingOpsService.whatsappDeleteInvalidContacts();
      Toast.show({ type: 'success', text1: `Removed ${res?.data?.deleted ?? 0} invalid contact(s)` });
      await load();
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Failed', text2: getErrorMessage(err, 'Could not delete invalid contacts') });
    } finally {
      setContactBusy('');
    }
  };

  const openCampaignStats = async (campaign) => {
    setBusyKey(`stats:${campaign.id}`);
    try {
      const res = await marketingOpsService.whatsappCampaignStats(campaign.id);
      setStatsModal({ open: true, data: res?.data || null });
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Failed', text2: getErrorMessage(err, 'Could not load stats') });
    } finally {
      setBusyKey(null);
    }
  };

  const note = GOVERNANCE_COPY[noteModal.type] || GOVERNANCE_COPY.send;
  const campaignStats = stats?.campaigns || {};
  const messageStats = stats?.messages || {};

  return (
    <>
      <PremiumListScreen
        data={campaigns}
        keyExtractor={(item) => String(item.id)}
        refreshing={false}
        onRefresh={load}
        header={
          <>
            <PremiumHero
              eyebrow="Super admin"
              title="WhatsApp marketing"
              subtitle="Send approved template or free-text WhatsApp campaigns, with optional images and clips."
              icon="logo-whatsapp"
              right={
                <TouchableOpacity activeOpacity={0.85} onPress={() => setShowBuilder((v) => !v)} style={styles.heroAction}>
                  <AppText style={styles.heroActionText}>{showBuilder ? 'Close' : '+ New'}</AppText>
                </TouchableOpacity>
              }
            />

            <View style={styles.metricRow}>
              <View style={[styles.metric, styles.metricAccent]}>
                <AppText style={styles.metricValue}>{Number(campaignStats.total ?? 0)}</AppText>
                <AppText style={styles.metricLabel}>Campaigns</AppText>
              </View>
              <View style={styles.metric}>
                <AppText style={styles.metricValue}>{Number(messageStats.sent ?? 0)}</AppText>
                <AppText style={styles.metricLabel}>Sent</AppText>
              </View>
              <View style={styles.metric}>
                <AppText style={styles.metricValue}>{Number(messageStats.failed ?? 0)}</AppText>
                <AppText style={styles.metricLabel}>Failed</AppText>
              </View>
              <View style={styles.metric}>
                <AppText style={styles.metricValue}>
                  {`${Number(stats?.daily_quota?.sent_today ?? 0)}/${Number(stats?.daily_quota?.limit ?? 250)}`}
                </AppText>
                <AppText style={styles.metricLabel}>Today</AppText>
              </View>
            </View>

            <View style={styles.rules}>
              <AppText style={styles.rulesText}>
                Template messages must be approved in Meta first. Free-text and media messages only reach
                users who messaged the business number in the last 24 hours. Marketing templates must
                include opt-out wording.
              </AppText>
            </View>

            {showBuilder ? (
              <>
                <PremiumSectionTitle title="Create campaign" subtitle="Build the audience, then queue the send with an approval note." />
                <PremiumCard>
                  <Input label="Campaign name" value={form.name} onChangeText={(v) => updateForm({ name: v })} placeholder="October rent reminder" />

                  <AppText style={styles.fieldLabel}>Message type</AppText>
                  <ChannelToggle
                    options={[{ value: 'template', label: 'Template' }, { value: 'text', label: 'Free text' }]}
                    value={form.kind}
                    onChange={(kind) => updateForm({ kind })}
                  />

                  {form.kind === 'template' ? (
                    <>
                      <Input
                        label="Meta template name"
                        value={form.template_name}
                        onChangeText={(v) => updateForm({ template_name: v })}
                        placeholder="rent_due_reminder"
                        containerStyle={styles.fieldGap}
                      />
                      <Input
                        label="Language"
                        value={form.template_language}
                        onChangeText={(v) => updateForm({ template_language: v })}
                        placeholder="en or en_US"
                        containerStyle={styles.fieldGap}
                      />
                      <Input
                        label="Body parameters"
                        value={form.template_params}
                        onChangeText={(v) => updateForm({ template_params: v })}
                        placeholder="Ada, N50,000"
                        containerStyle={styles.fieldGap}
                      />
                      <AppText style={styles.mediaHeading}>Template header media (optional)</AppText>
                      <ChannelToggle
                        options={[
                          { value: '', label: 'None' },
                          { value: 'image', label: 'Image' },
                          { value: 'video', label: 'Video' },
                          { value: 'document', label: 'Doc link' },
                        ]}
                        value={form.headerMedia.type}
                        onChange={(type) => setForm((prev) => ({ ...prev, headerMedia: { type, url: '' } }))}
                      />
                      {form.headerMedia.type && form.headerMedia.type !== 'document' ? (
                        <PremiumButton
                          title={uploading === 'headerMedia' ? 'Uploading…' : 'Choose from gallery'}
                          variant="secondary"
                          onPress={() => pickMedia(form.headerMedia.type, 'headerMedia')}
                          loading={uploading === 'headerMedia'}
                          style={styles.fieldGap}
                        />
                      ) : null}
                      {form.headerMedia.type ? (
                        <Input
                          label="Or paste a public https link"
                          value={form.headerMedia.url}
                          onChangeText={(v) => setForm((prev) => ({ ...prev, headerMedia: { ...prev.headerMedia, url: v } }))}
                          autoCapitalize="none"
                          containerStyle={styles.fieldGap}
                        />
                      ) : null}
                    </>
                  ) : (
                    <>
                      <Input
                        label="Message"
                        value={form.content}
                        onChangeText={(v) => updateForm({ content: v })}
                        placeholder="Type the message users will receive"
                        multiline
                        numberOfLines={4}
                        containerStyle={styles.fieldGap}
                      />
                      <AppText style={styles.mediaHeading}>Attach an image or clip (optional)</AppText>
                      <ChannelToggle
                        options={[
                          { value: '', label: 'None' },
                          { value: 'image', label: 'Image' },
                          { value: 'video', label: 'Video' },
                          { value: 'document', label: 'Doc link' },
                        ]}
                        value={form.media.type}
                        onChange={(type) => setForm((prev) => ({ ...prev, media: { type, url: '' } }))}
                      />
                      {form.media.type && form.media.type !== 'document' ? (
                        <PremiumButton
                          title={uploading === 'media' ? 'Uploading…' : 'Choose from gallery'}
                          variant="secondary"
                          onPress={() => pickMedia(form.media.type, 'media')}
                          loading={uploading === 'media'}
                          style={styles.fieldGap}
                        />
                      ) : null}
                      {form.media.type ? (
                        <Input
                          label="Or paste a public https link"
                          value={form.media.url}
                          onChangeText={(v) => setForm((prev) => ({ ...prev, media: { ...prev.media, url: v } }))}
                          autoCapitalize="none"
                          containerStyle={styles.fieldGap}
                        />
                      ) : null}
                    </>
                  )}

                  <AppText style={styles.mediaHeading}>Audience</AppText>
                  <ChannelToggle
                    options={[
                      { value: 'users', label: 'Users' },
                      { value: 'contacts', label: 'Imported' },
                      { value: 'both', label: 'Both' },
                    ]}
                    value={form.source}
                    onChange={(source) => updateForm({ source })}
                  />
                  {form.source === 'users' ? (
                    <ChannelToggle
                      options={[{ value: 'all', label: 'All users' }, { value: 'user_type', label: 'By user type' }]}
                      value={form.scope}
                      onChange={(scope) => updateForm({ scope })}
                    />
                  ) : null}
                  {form.source === 'users' && form.scope === 'user_type' ? (
                    <Input
                      label="User type"
                      value={form.user_type}
                      onChangeText={(v) => updateForm({ user_type: v })}
                      placeholder="tenant, landlord, agent"
                      containerStyle={styles.fieldGap}
                    />
                  ) : null}

                  {audience !== null ? (
                    <AppText style={styles.audienceText}>≈ {audience} recipient(s) will receive this campaign.</AppText>
                  ) : null}

                  <PremiumButton
                    title="Preview audience"
                    variant="secondary"
                    icon="people-outline"
                    onPress={previewAudience}
                    loading={audienceLoading}
                    style={styles.fieldGap}
                  />
                  <PremiumButton
                    title="Create campaign"
                    icon="paper-plane-outline"
                    onPress={createCampaign}
                    loading={busyKey === 'create'}
                    style={styles.fieldGap}
                  />
                </PremiumCard>
              </>
            ) : null}

            <PremiumSectionTitle
              title="WhatsApp contacts"
              subtitle="Numbers that are not platform users. Import them, then check who is on WhatsApp."
            />
            <PremiumCard>
              <View style={styles.contactStatsRow}>
                <View style={styles.contactStatBox}>
                  <AppText style={styles.contactStatValue}>{contactStats?.total ?? 0}</AppText>
                  <AppText style={styles.contactStatLabel}>Total</AppText>
                </View>
                <View style={[styles.contactStatBox, styles.contactStatValid]}>
                  <AppText style={[styles.contactStatValue, styles.contactStatValidText]}>
                    {contactStats?.valid ?? 0}
                  </AppText>
                  <AppText style={styles.contactStatLabel}>On WhatsApp</AppText>
                </View>
                <View style={[styles.contactStatBox, styles.contactStatInvalid]}>
                  <AppText style={[styles.contactStatValue, styles.contactStatInvalidText]}>
                    {contactStats?.invalid ?? 0}
                  </AppText>
                  <AppText style={styles.contactStatLabel}>Not on WA</AppText>
                </View>
                <View style={styles.contactStatBox}>
                  <AppText style={[styles.contactStatValue, styles.contactStatMuted]}>
                    {contactStats?.unknown ?? 0}
                  </AppText>
                  <AppText style={styles.contactStatLabel}>Not checked</AppText>
                </View>
              </View>

              {showPasteBox ? (
                <>
                  <Input
                    label="Paste phone numbers"
                    value={contactPaste}
                    onChangeText={setContactPaste}
                    placeholder="0803..., 0809... (one per line or comma separated)"
                    multiline
                    numberOfLines={4}
                    containerStyle={styles.fieldGap}
                  />
                  <PremiumButton
                    title="Import numbers"
                    icon="cloud-upload-outline"
                    onPress={importPastedContacts}
                    loading={contactBusy === 'import'}
                    style={styles.fieldGap}
                  />
                </>
              ) : null}

              <PremiumButton
                title={showPasteBox ? 'Close import box' : 'Import numbers (paste)'}
                variant="secondary"
                icon="add-circle-outline"
                onPress={() => setShowPasteBox((v) => !v)}
                style={styles.fieldGap}
              />
              <PremiumButton
                title="Check on WhatsApp"
                icon="checkmark-circle-outline"
                onPress={checkContacts}
                loading={contactBusy === 'check'}
                style={styles.fieldGap}
              />
              <PremiumButton
                title={`Delete all invalid (${contactStats?.invalid ?? 0})`}
                variant="secondary"
                icon="trash-outline"
                onPress={removeInvalidContacts}
                loading={contactBusy === 'delInvalid'}
                style={styles.fieldGap}
              />
              <PremiumButton
                title={showContacts ? 'Hide contacts' : `Show contacts (${contacts.length})`}
                variant="secondary"
                icon="people-outline"
                onPress={() => setShowContacts((v) => !v)}
                style={styles.fieldGap}
              />
            </PremiumCard>

            {showContacts
              ? contacts.map((c) => (
                  <PremiumCard key={c.id}>
                    <View style={styles.cardTop}>
                      <View style={styles.cardCopy}>
                        <AppText style={styles.cardTitle}>{c.phone}</AppText>
                        <AppText style={styles.cardMeta}>{c.full_name || 'No name'} · {c.source}</AppText>
                        {c.wa_checked_at ? (
                          <AppText style={styles.cardMeta}>Checked {formatDate(c.wa_checked_at)}</AppText>
                        ) : null}
                      </View>
                      <StatusPill
                        label={
                          c.wa_status === 'valid'
                            ? 'On WhatsApp'
                            : c.wa_status === 'invalid'
                            ? 'Not on WhatsApp'
                            : 'Not checked'
                        }
                        color={
                          c.wa_status === 'valid' ? '#16a34a' : c.wa_status === 'invalid' ? '#dc2626' : colors.muted
                        }
                      />
                    </View>
                    <View style={styles.actions}>
                      <PremiumButton
                        title="Remove"
                        variant="secondary"
                        icon="trash-outline"
                        onPress={() => removeContact(c)}
                        loading={contactBusy === `del:${c.id}`}
                        style={styles.actionButton}
                      />
                    </View>
                  </PremiumCard>
                ))
              : null}
          </>
        }
        emptyTitle="No WhatsApp campaigns yet"
        emptyMessage="Tap '+ New' to build your first WhatsApp campaign."
        emptyIcon="logo-whatsapp"
        renderItem={({ item }) => {
          const color = STATUS_COLORS[item.status] || colors.muted;
          const isDraft = ['draft', 'paused'].includes(item.status);
          const canRetry = ['sent', 'paused'].includes(item.status);
          return (
            <PremiumCard>
              <View style={styles.cardTop}>
                <View style={styles.cardCopy}>
                  <AppText style={styles.cardTitle}>{item.name || `Campaign #${item.id}`}</AppText>
                  {item.kind === 'template' ? (
                    <AppText style={styles.cardMeta}>template: {item.template_name}</AppText>
                  ) : (
                    <AppText style={styles.cardMeta}>free text</AppText>
                  )}
                  {item.created_at ? <AppText style={styles.cardMeta}>Created {formatDate(item.created_at)}</AppText> : null}
                </View>
                <StatusPill label={item.status} color={color} />
              </View>

              <InfoRow icon="paper-plane-outline" label="Sent" value={String(item.sent_count ?? 0)} />
              <InfoRow icon="alert-circle-outline" label="Failed" value={String(item.failed_count ?? 0)} />
              <InfoRow icon="time-outline" label="Pending" value={String(item.pending_count ?? 0)} />

              <View style={styles.actions}>
                <PremiumButton
                  title="Stats"
                  variant="secondary"
                  icon="stats-chart-outline"
                  onPress={() => openCampaignStats(item)}
                  loading={busyKey === `stats:${item.id}`}
                  style={styles.actionButton}
                />
                {isDraft ? (
                  <PremiumButton
                    title="Send"
                    icon="send-outline"
                    onPress={() => openNote('send', item)}
                    style={styles.actionButton}
                  />
                ) : null}
                {canRetry ? (
                  <PremiumButton
                    title="Retry"
                    variant="secondary"
                    icon="refresh-outline"
                    onPress={() => openNote('retry', item)}
                    style={styles.actionButton}
                  />
                ) : null}
                {item.status !== 'sending' ? (
                  <PremiumButton
                    title="Delete"
                    variant="secondary"
                    icon="trash-outline"
                    onPress={() => openNote('delete', item)}
                    style={styles.actionButton}
                  />
                ) : null}
              </View>
            </PremiumCard>
          );
        }}
      />

      <Modal visible={noteModal.open} transparent animationType="fade" onRequestClose={closeNote}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <AppText style={styles.modalTitle}>{note.title}</AppText>
            {noteModal.target?.name ? (
              <AppText style={styles.modalMeta}>Campaign: {noteModal.target.name}</AppText>
            ) : null}
            <Input
              label={note.label}
              value={noteModal.note}
              onChangeText={(v) => setNoteModal((prev) => ({ ...prev, note: v, error: '' }))}
              placeholder={note.placeholder}
              multiline
              numberOfLines={3}
              containerStyle={styles.fieldGap}
            />
            {noteModal.error ? <AppText style={styles.modalError}>{noteModal.error}</AppText> : null}
            <AppText style={styles.modalHint}>
              This action is written to the marketing audit log with your name and the note above.
            </AppText>
            <View style={styles.modalActions}>
              <PremiumButton
                title="Confirm"
                onPress={submitNote}
                loading={busyKey === `note:${noteModal.type}`}
                style={styles.actionButton}
              />
              <PremiumButton title="Cancel" variant="secondary" onPress={closeNote} style={styles.actionButton} />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={statsModal.open} transparent animationType="fade" onRequestClose={() => setStatsModal({ open: false, data: null })}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <AppText style={styles.modalTitle}>{statsModal.data?.campaign?.name || 'Delivery'}</AppText>
            <AppText style={styles.modalMeta}>Live counts from the recipient queue</AppText>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <AppText style={styles.statValue}>{statsModal.data?.counts?.total ?? 0}</AppText>
                <AppText style={styles.statLabel}>Total</AppText>
              </View>
              <View style={styles.statBox}>
                <AppText style={styles.statValue}>{statsModal.data?.counts?.sent ?? 0}</AppText>
                <AppText style={styles.statLabel}>Sent</AppText>
              </View>
              <View style={styles.statBox}>
                <AppText style={styles.statValue}>{statsModal.data?.counts?.failed ?? 0}</AppText>
                <AppText style={styles.statLabel}>Failed</AppText>
              </View>
              <View style={styles.statBox}>
                <AppText style={styles.statValue}>{statsModal.data?.counts?.pending ?? 0}</AppText>
                <AppText style={styles.statLabel}>Pending</AppText>
              </View>
            </View>
            {statsModal.data?.recent_failures?.length ? (
              <View style={styles.failureList}>
                <AppText style={styles.fieldLabel}>Recent failures</AppText>
                {statsModal.data.recent_failures.map((failure, index) => (
                  <AppText key={index} style={styles.failureText}>
                    {failure.phone} — {failure.error_message}
                  </AppText>
                ))}
              </View>
            ) : null}
            <PremiumButton
              title="Close"
              variant="secondary"
              onPress={() => setStatsModal({ open: false, data: null })}
              style={styles.fieldGap}
            />
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  heroAction: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  heroActionText: { color: colors.white, fontFamily: typography.semibold, fontSize: typeScale.xs, lineHeight: 18 },
  metricRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  metric: {
    flex: 1,
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  metricAccent: { backgroundColor: colors.surfaceBlue, borderColor: colors.blue },
  metricValue: { color: colors.ink, fontFamily: typography.bold, fontSize: typeScale.lg, lineHeight: 28 },
  metricLabel: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  rules: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: 14,
    padding: 12,
  },
  rulesText: { color: '#92400E', fontFamily: typography.regular, fontSize: typeScale.xs, lineHeight: 18 },
  fieldLabel: { color: colors.muted, fontFamily: typography.semibold, fontSize: typeScale.xs, lineHeight: 18, marginBottom: 6, textTransform: 'uppercase' },
  fieldGap: { marginTop: 12 },
  mediaHeading: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginBottom: 8,
    marginTop: 16,
  },
  toggleRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  toggle: {
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.white,
  },
  toggleActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  toggleText: { color: colors.text, fontFamily: typography.semibold, fontSize: typeScale.xs, lineHeight: 18 },
  toggleTextActive: { color: colors.white },
  audienceText: { color: colors.ink, fontFamily: typography.regular, fontSize: typeScale.xs, lineHeight: 18, marginTop: 12 },
  cardTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardCopy: { flex: 1 },
  cardTitle: { color: colors.ink, fontFamily: typography.bold, fontSize: typeScale.base, lineHeight: 24 },
  cardMeta: { color: colors.muted, fontFamily: typography.regular, fontSize: typeScale.xs, lineHeight: 18, marginTop: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  actionButton: { flexGrow: 1, minWidth: 120 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  modalCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 18,
    width: '100%',
    maxWidth: 480,
  },
  modalTitle: { color: colors.ink, fontFamily: typography.bold, fontSize: typeScale.base, lineHeight: 24 },
  modalMeta: { color: colors.muted, fontFamily: typography.regular, fontSize: typeScale.xs, lineHeight: 18, marginTop: 3 },
  modalError: { color: colors.danger, fontFamily: typography.regular, fontSize: typeScale.xs, lineHeight: 18, marginTop: 6 },
  modalHint: { color: colors.muted, fontFamily: typography.regular, fontSize: typeScale.reading, lineHeight: 22, marginTop: 10 },
  modalActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  contactStatsRow: { flexDirection: 'row', gap: 8 },
  contactStatBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  contactStatValid: { backgroundColor: '#F0FDF4', borderColor: '#86EFAC' },
  contactStatInvalid: { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' },
  contactStatValue: { color: colors.ink, fontFamily: typography.bold, fontSize: typeScale.md, lineHeight: 26 },
  contactStatValidText: { color: '#15803D' },
  contactStatInvalidText: { color: '#B91C1C' },
  contactStatMuted: { color: colors.muted },
  contactStatLabel: { color: colors.muted, fontFamily: typography.regular, fontSize: typeScale.xs, lineHeight: 18, marginTop: 2, textAlign: 'center' },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  statValue: { color: colors.ink, fontFamily: typography.bold, fontSize: typeScale.md, lineHeight: 26 },
  statLabel: { color: colors.muted, fontFamily: typography.regular, fontSize: typeScale.xs, lineHeight: 18, marginTop: 2 },
  failureList: { marginTop: 14 },
  failureText: { color: colors.danger, fontFamily: typography.regular, fontSize: typeScale.xs, lineHeight: 18, marginBottom: 4 },
});

export default WhatsappMarketingScreen;
