import React, { useCallback, useState } from 'react';
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { useFocusEffect } from '@react-navigation/native';
import Input from '../../components/common/Input';
import {
  InfoRow,
  PremiumButton,
  PremiumCard,
  PremiumCenter,
  PremiumHero,
  PremiumListScreen,
  PremiumSectionTitle,
  StatusPill,
} from '../../components/common/PremiumLayout';
import { marketingOpsService } from '../../services/marketingOpsService';
import { getErrorMessage, pickList } from '../../utils/http';
import { colors, radius, typography, typeScale } from '../../theme';
import AppText from '../../components/common/AppText';

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

const STATUS_COLORS = {
  draft: colors.muted,
  scheduled: '#B7791F',
  queued: colors.blue,
  sending: colors.blue,
  sent: colors.success,
  paused: '#B7791F',
  failed: colors.danger,
  cancelled: colors.muted,
};

// Each channel exposes the same shape so the screen body stays generic.
const CHANNELS = {
  email: {
    label: 'Email',
    audienceNoun: 'subscriber',
    importHint: 'One email address per line, or the first column of a CSV.',
    stats: marketingOpsService.emailStats,
    campaigns: marketingOpsService.emailCampaigns,
    send: marketingOpsService.sendEmailCampaign,
    retry: null,
    removeCampaign: marketingOpsService.emailDeleteCampaign,
    campaignStats: marketingOpsService.emailCampaignStats,
    subscribers: marketingOpsService.emailSubscribers,
    importSubscribers: marketingOpsService.emailImportSubscribers,
    deleteUnsubscribed: marketingOpsService.emailDeleteUnsubscribed,
    templates: marketingOpsService.emailTemplates,
    createTemplate: marketingOpsService.emailCreateTemplate,
    createCampaign: marketingOpsService.emailCreateCampaign,
    subscriberKeys: ['email'],
  },
  sms: {
    label: 'SMS',
    audienceNoun: 'contact',
    importHint: 'One phone number per line, or the first column of a CSV.',
    stats: marketingOpsService.smsStats,
    campaigns: marketingOpsService.smsCampaigns,
    send: marketingOpsService.sendSmsCampaign,
    retry: marketingOpsService.retrySmsCampaign,
    removeCampaign: marketingOpsService.smsDeleteCampaign,
    campaignStats: marketingOpsService.smsCampaignStats,
    subscribers: marketingOpsService.smsSubscribers,
    importSubscribers: marketingOpsService.smsImportSubscribers,
    deleteUnsubscribed: marketingOpsService.smsDeleteUnsubscribed,
    templates: marketingOpsService.smsTemplates,
    createTemplate: marketingOpsService.smsCreateTemplate,
    createCampaign: marketingOpsService.smsCreateCampaign,
    subscriberKeys: ['phone'],
  },
};

// The backend refuses any launch, retry, removal or template deletion that
// does not carry a written reason, so the app always collects one first.
const NOTE_COPY = {
  send: { title: 'Queue campaign', label: 'Approval note', placeholder: 'Who approved this send and why now?' },
  retry: { title: 'Retry failed messages', label: 'Retry reason', placeholder: 'Why should these be retried?' },
  deleteCampaign: { title: 'Delete campaign', label: 'Deletion reason', placeholder: 'Why is this campaign going?' },
  deleteSubscriber: { title: 'Remove contact', label: 'Removal reason', placeholder: 'Why is this contact going?' },
  deleteUnsubscribed: { title: 'Delete all unsubscribed', label: 'Cleanup reason', placeholder: 'Why is this cleanup needed?' },
};

const splitList = (text, channel) => {
  const parts = String(text || '')
    .split(/[\r\n,;]+/)
    .map((p) => p.replace(/[\s"']/g, '').trim())
    .filter(Boolean);

  return channel === 'email' ? parts : parts.filter((p) => p.length >= 10);
};

const MarketingScreen = () => {
  const [channel, setChannel] = useState('email');
  const [stats, setStats] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState('');

  const [showBuilder, setShowBuilder] = useState(false);
  const [showSubscribers, setShowSubscribers] = useState(false);
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [pasteList, setPasteList] = useState('');
  const [form, setForm] = useState({ name: '', subject: '', content: '', template_id: '' });
  const [noteModal, setNoteModal] = useState({ open: false, type: '', target: null, note: '', error: '' });
  const [statsModal, setStatsModal] = useState({ open: false, data: null });

  const ops = CHANNELS[channel];

  const load = useCallback(async () => {
    const current = CHANNELS[channel];
    if (!current) return;
    setLoading(true);
    try {
      const [statsRes, campaignsRes, subscribersRes, templatesRes] = await Promise.all([
        current.stats(),
        current.campaigns(),
        current.subscribers({ limit: 200 }).catch(() => null),
        current.templates().catch(() => null),
      ]);
      setStats(statsRes?.data || null);
      setCampaigns(pickList(campaignsRes, ['data']));
      setSubscribers(pickList(subscribersRes, ['data', 'subscribers']) || []);
      setTemplates(pickList(templatesRes, ['data', 'templates']) || []);
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(err, `Could not load ${channel} marketing`),
      });
      setStats(null);
      setCampaigns([]);
      setSubscribers([]);
    } finally {
      setLoading(false);
    }
  }, [channel]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const switchChannel = (next) => {
    if (next === channel) return;
    setChannel(next);
    setForm({ name: '', subject: '', content: '', template_id: '' });
    setStats(null);
    setCampaigns([]);
    setSubscribers([]);
    setTemplates([]);
    setShowBuilder(false);
    setShowSubscribers(false);
    setShowPasteBox(false);
    setPasteList('');
  };

  const updateForm = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const createCampaign = async () => {
    if (!form.name.trim()) return Toast.show({ type: 'info', text1: 'Campaign name is required' });
    if (channel === 'email' && !form.subject.trim()) {
      return Toast.show({ type: 'info', text1: 'A subject line is required for email' });
    }
    if (!form.content.trim()) {
      return Toast.show({
        type: 'info',
        text1: channel === 'email' ? 'Write the email body' : 'Write the SMS message',
      });
    }

    setBusyKey('create');
    try {
      const created = channel === 'email'
        ? await ops.createCampaign({
            name: form.name.trim(),
            subject: form.subject.trim(),
            content_html: form.content.trim(),
            template_id: form.template_id ? Number(form.template_id) : null,
          })
        : await ops.createCampaign({
            name: form.name.trim(),
            content: form.content.trim(),
            template_id: form.template_id ? Number(form.template_id) : null,
          });

      const campaignId = created?.data?.id;
      setForm({ name: '', subject: '', content: '', template_id: '' });
      setShowBuilder(false);
      await load();
      Toast.show({ type: 'success', text1: 'Campaign created', text2: 'Queue it when you are ready to send' });
      if (campaignId) openNote('send', { id: campaignId, name: form.name.trim() });
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Failed', text2: getErrorMessage(err, 'Could not create campaign') });
    } finally {
      setBusyKey('');
    }
  };

  const openNote = (type, target) => {
    setNoteModal({ open: true, type, target, note: '', error: '' });
  };

  const closeNote = () => setNoteModal({ open: false, type: '', target: null, note: '', error: '' });

  const submitNote = async () => {
    const { type, target, note } = noteModal;
    if (!note.trim()) {
      setNoteModal((prev) => ({ ...prev, error: 'A written reason is required' }));
      return;
    }
    const trimmed = note.trim();
    setBusyKey(`note:${type}`);
    try {
      if (type === 'send') {
        await ops.send(target.id, trimmed);
        Toast.show({ type: 'success', text1: `${channel.toUpperCase()} campaign queued` });
      } else if (type === 'retry') {
        await ops.retry(target.id, trimmed);
        Toast.show({ type: 'success', text1: 'Failed messages re-queued' });
      } else if (type === 'deleteCampaign') {
        await ops.removeCampaign(target.id, trimmed);
        Toast.show({ type: 'success', text1: 'Campaign deleted' });
      } else if (type === 'deleteSubscriber') {
        const del = channel === 'email'
          ? marketingOpsService.emailDeleteSubscriber
          : marketingOpsService.smsDeleteSubscriber;
        await del(target.id, trimmed);
        Toast.show({ type: 'success', text1: 'Contact removed' });
      } else if (type === 'deleteUnsubscribed') {
        const res = await ops.deleteUnsubscribed(trimmed);
        Toast.show({ type: 'success', text1: `Removed ${res?.data?.deleted ?? 0} unsubscribed contact(s)` });
      }
      closeNote();
      await load();
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Failed', text2: getErrorMessage(err, 'Action failed') });
    } finally {
      setBusyKey('');
    }
  };

  const importSubscribers = async () => {
    const list = splitList(pasteList, channel);
    if (list.length === 0) {
      return Toast.show({
        type: 'info',
        text1: channel === 'email' ? 'Paste at least one email address' : 'Paste at least one phone number',
      });
    }

    setBusyKey('import');
    try {
      const res = await ops.importSubscribers(list);
      const data = res?.data || {};
      Toast.show({
        type: 'success',
        text1: `Imported ${data.added ?? 0} new`,
        text2: `Already in system ${data.alreadyKnown ?? 0} · Duplicates ${data.duplicates ?? 0} · Invalid ${data.invalid ?? 0}`,
      });
      setPasteList('');
      setShowPasteBox(false);
      await load();
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Import failed', text2: getErrorMessage(err, 'Could not import') });
    } finally {
      setBusyKey('');
    }
  };

  const openCampaignStats = async (campaign) => {
    setBusyKey(`stats:${campaign.id}`);
    try {
      const res = await ops.campaignStats(campaign.id);
      setStatsModal({ open: true, data: res?.data || null });
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Failed', text2: getErrorMessage(err, 'Could not load stats') });
    } finally {
      setBusyKey('');
    }
  };

  if (loading && campaigns.length === 0 && subscribers.length === 0) {
    return <PremiumCenter loading title="Loading campaigns" />;
  }

  const subscriberStats = stats?.subscribers || {};
  const campaignStats = stats?.campaigns || {};
  const note = NOTE_COPY[noteModal.type] || NOTE_COPY.send;
  const statsData = statsModal.data || {};
  const unsubscribeCount =
    subscriberStats.unsubscribed ?? subscribers.filter((s) => s.subscribed === false).length;

  return (
    <>
      <PremiumListScreen
        data={campaigns}
        keyExtractor={(item) => String(item.id)}
        refreshing={loading}
        onRefresh={load}
        header={
          <>
            <PremiumHero
              eyebrow="Super admin"
              title="Email & SMS marketing"
              subtitle="Create campaigns, manage contacts and launch sends from the app."
              icon="megaphone-outline"
            />

            <View style={styles.tabRow}>
              {Object.keys(CHANNELS).map((key) => (
                <PremiumButton
                  key={key}
                  title={CHANNELS[key].label}
                  variant={channel === key ? 'primary' : 'secondary'}
                  onPress={() => switchChannel(key)}
                  style={styles.tabButton}
                />
              ))}
            </View>

            <View style={styles.metricRow}>
              <View style={[styles.metric, styles.metricAccent]}>
                <AppText style={styles.metricValue}>{Number(subscriberStats.total ?? subscribers.length ?? 0)}</AppText>
                <AppText style={styles.metricLabel}>{ops.audienceNoun}s</AppText>
              </View>
              <View style={styles.metric}>
                <AppText style={styles.metricValue}>{Number(campaignStats.total ?? campaigns.length ?? 0)}</AppText>
                <AppText style={styles.metricLabel}>Campaigns</AppText>
              </View>
              <View style={styles.metric}>
                <AppText style={styles.metricValue}>{Number(unsubscribeCount ?? 0)}</AppText>
                <AppText style={styles.metricLabel}>Unsubscribed</AppText>
              </View>
            </View>

            {showBuilder ? (
              <PremiumCard>
                <PremiumSectionTitle title="Create campaign" subtitle={`Draft a ${ops.label} campaign, then queue it.`} />
                <Input
                  label="Campaign name"
                  value={form.name}
                  onChangeText={(v) => updateForm({ name: v })}
                  placeholder="e.g. October rent reminder"
                />
                {channel === 'email' ? (
                  <Input
                    label="Subject line"
                    value={form.subject}
                    onChangeText={(v) => updateForm({ subject: v })}
                    placeholder="Your October rent is due"
                    containerStyle={styles.fieldGap}
                  />
                ) : null}
                <Input
                  label={channel === 'email' ? 'Email body (HTML allowed)' : 'Message'}
                  value={form.content}
                  onChangeText={(v) => updateForm({ content: v })}
                  placeholder={channel === 'email' ? '<p>Hello…</p>' : 'Type the SMS text'}
                  multiline
                  numberOfLines={6}
                  containerStyle={styles.fieldGap}
                />
                {templates.length > 0 ? (
                  <Input
                    label="Link a template (optional)"
                    value={form.template_id}
                    onChangeText={(v) => updateForm({ template_id: v.replace(/\D/g, '') })}
                    placeholder={`Template id — e.g. ${templates[0]?.id ?? 1}`}
                    keyboardType="number-pad"
                    containerStyle={styles.fieldGap}
                  />
                ) : null}
                <PremiumButton
                  title="Create campaign"
                  icon="add-circle-outline"
                  onPress={createCampaign}
                  loading={busyKey === 'create'}
                  style={styles.fieldGap}
                />
                <PremiumButton
                  title="Cancel"
                  variant="secondary"
                  onPress={() => setShowBuilder(false)}
                  style={styles.fieldGap}
                />
              </PremiumCard>
            ) : (
              <PremiumButton
                title={`New ${ops.label} campaign`}
                icon="add-outline"
                onPress={() => setShowBuilder(true)}
              />
            )}

            <PremiumSectionTitle
              title={`${ops.label} contacts`}
              subtitle="Import a list, then remove anyone who opted out."
            />
            <PremiumCard>
              {showPasteBox ? (
                <>
                  <Input
                    label={channel === 'email' ? 'Paste email addresses' : 'Paste phone numbers'}
                    value={pasteList}
                    onChangeText={setPasteList}
                    placeholder={ops.importHint}
                    multiline
                    numberOfLines={5}
                  />
                  <PremiumButton
                    title="Import list"
                    icon="cloud-upload-outline"
                    onPress={importSubscribers}
                    loading={busyKey === 'import'}
                    style={styles.fieldGap}
                  />
                </>
              ) : null}

              <PremiumButton
                title={showPasteBox ? 'Close import box' : 'Import contacts (paste)'}
                variant="secondary"
                icon="add-circle-outline"
                onPress={() => setShowPasteBox((v) => !v)}
                style={styles.fieldGap}
              />
              <PremiumButton
                title={`Delete all unsubscribed (${unsubscribeCount ?? 0})`}
                variant="secondary"
                icon="trash-outline"
                onPress={() => openNote('deleteUnsubscribed', { id: null })}
                style={styles.fieldGap}
              />
              <PremiumButton
                title={showSubscribers ? 'Hide contacts' : `Show contacts (${subscribers.length})`}
                variant="secondary"
                icon="people-outline"
                onPress={() => setShowSubscribers((v) => !v)}
                style={styles.fieldGap}
              />
            </PremiumCard>

            {showSubscribers
              ? subscribers.map((s) => {
                  const primary = ops.subscriberKeys
                    .map((k) => s[k])
                    .filter(Boolean)
                    .join(' ');
                  return (
                    <PremiumCard key={s.id}>
                      <View style={styles.cardTop}>
                        <View style={styles.cardCopy}>
                          <AppText style={styles.cardTitle}>{primary || `#${s.id}`}</AppText>
                          <AppText style={styles.cardMeta}>
                            {s.full_name || 'No name'} · {s.source || 'unknown'}
                          </AppText>
                        </View>
                        <StatusPill
                          label={s.subscribed === false ? 'Unsubscribed' : 'Subscribed'}
                          color={s.subscribed === false ? colors.danger : colors.success}
                        />
                      </View>
                      <View style={styles.actions}>
                        <PremiumButton
                          title="Remove"
                          variant="secondary"
                          icon="trash-outline"
                          onPress={() => openNote('deleteSubscriber', s)}
                          style={styles.actionButton}
                        />
                      </View>
                    </PremiumCard>
                  );
                })
              : null}

            <PremiumSectionTitle
              title={`${ops.label} campaigns`}
              subtitle="Queue a draft, retry failures, or remove a campaign."
            />
          </>
        }
        emptyTitle="No campaigns yet"
        emptyMessage={`No ${channel} marketing campaigns found. Tap "New campaign" to create one.`}
        emptyIcon="mail-outline"
        renderItem={({ item }) => {
          const row = item.stats || {};
          const color = STATUS_COLORS[item.status] || colors.muted;
          const isDraft = item.status === 'draft';
          const canRetry = ['failed', 'sent', 'paused'].includes(item.status) && Boolean(ops.retry);
          return (
            <PremiumCard>
              <View style={styles.cardTop}>
                <View style={styles.cardCopy}>
                  <AppText style={styles.cardTitle}>{item.name || `Campaign #${item.id}`}</AppText>
                  {item.subject ? <AppText style={styles.cardMeta}>{item.subject}</AppText> : null}
                  {item.created_at ? (
                    <AppText style={styles.cardMeta}>Created {formatDate(item.created_at)}</AppText>
                  ) : null}
                </View>
                <StatusPill label={item.status} color={color} />
              </View>

              <InfoRow icon="paper-plane-outline" label="Sent" value={String(row.sent ?? item.sent_count ?? 0)} />
              <InfoRow icon="alert-circle-outline" label="Failed" value={String(row.failed ?? item.failed_count ?? 0)} />
              {channel === 'email' ? (
                <InfoRow icon="eye-outline" label="Opened" value={String(row.opened ?? item.opened_count ?? 0)} />
              ) : null}

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
                    onPress={() => openNote('deleteCampaign', item)}
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
              <AppText style={styles.modalMeta}>{noteModal.target.name}</AppText>
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
              This reason is stored in the governance log with your name.
            </AppText>
            <View style={styles.modalActions}>
              <PremiumButton
                title="Confirm"
                onPress={submitNote}
                loading={busyKey.startsWith('note:')}
                style={styles.actionButton}
              />
              <PremiumButton
                title="Cancel"
                variant="secondary"
                onPress={closeNote}
                style={styles.actionButton}
              />
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={statsModal.open}
        transparent
        animationType="fade"
        onRequestClose={() => setStatsModal({ open: false, data: null })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <AppText style={styles.modalTitle}>{statsModal.data?.campaign?.name || 'Campaign stats'}</AppText>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <AppText style={styles.statValue}>{Number(statsData.sent ?? 0)}</AppText>
                <AppText style={styles.statLabel}>Sent</AppText>
              </View>
              <View style={styles.statBox}>
                <AppText style={styles.statValue}>{Number(statsData.failed ?? 0)}</AppText>
                <AppText style={styles.statLabel}>Failed</AppText>
              </View>
              <View style={styles.statBox}>
                <AppText style={styles.statValue}>{Number(statsData.pending ?? 0)}</AppText>
                <AppText style={styles.statLabel}>Pending</AppText>
              </View>
              <View style={styles.statBox}>
                <AppText style={styles.statValue}>{Number(statsData.opened ?? 0)}</AppText>
                <AppText style={styles.statLabel}>Opened</AppText>
              </View>
            </View>
            <View style={styles.modalActions}>
              <PremiumButton
                title="Close"
                variant="secondary"
                onPress={() => setStatsModal({ open: false, data: null })}
                style={styles.actionButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  tabButton: { flex: 1, minWidth: 110 },
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
  fieldGap: { marginTop: 12 },
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
    backgroundColor: 'rgba(15,23,42,0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 18,
  },
  modalTitle: { color: colors.ink, fontFamily: typography.bold, fontSize: typeScale.base, lineHeight: 24 },
  modalMeta: { color: colors.muted, fontFamily: typography.regular, fontSize: typeScale.xs, lineHeight: 18, marginTop: 3 },
  modalError: { color: colors.danger, fontFamily: typography.regular, fontSize: typeScale.xs, lineHeight: 18, marginTop: 6 },
  modalHint: { color: colors.muted, fontFamily: typography.regular, fontSize: typeScale.reading, lineHeight: 22, marginTop: 10 },
  modalActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  statValue: { color: colors.ink, fontFamily: typography.bold, fontSize: typeScale.md, lineHeight: 26 },
  statLabel: { color: colors.muted, fontFamily: typography.regular, fontSize: typeScale.xs, lineHeight: 18, marginTop: 2 },
});

export default MarketingScreen;
