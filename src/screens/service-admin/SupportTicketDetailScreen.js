import React, { useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,} from 'react-native';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import { AuthContext } from '../../context/AuthContext';
import { supportService } from '../../services/supportService';
import { buildUploadUrl, getErrorMessage, pickList, pickObject } from '../../utils/http';
import { colors, radius, typography } from '../../theme';
import AppText from '../../components/common/AppText';
import {
DashboardHero,
  DashboardNotice,
  DashboardScreen,
  DashboardSection,
} from '../../components/dashboard/DashboardKit';

const DEPARTMENTS = [
  { key: 'transportation', label: 'Transport', icon: 'car-outline' },
  { key: 'fumigation', label: 'Fumigation', icon: 'sparkles-outline' },
  { key: 'finance', label: 'Finance', icon: 'card-outline' },
  { key: 'legal', label: 'Legal', icon: 'scale-outline' },
  { key: 'technical', label: 'Technical', icon: 'construct-outline' },
];

const ESCALATION_STATUSES = [
  { key: 'acknowledged', label: 'Ack' },
  { key: 'action_required', label: 'Action' },
  { key: 'resolved', label: 'Resolved' },
];

const sameId = (left, right) =>
  left !== undefined && left !== null && right !== undefined && right !== null && String(left) === String(right);

const asTicket = (response) => pickObject(response, ['data', 'ticket']) || response?.ticket || null;

const ControlButton = ({ disabled, icon, label, onPress, variant = 'light' }) => (
  <TouchableOpacity
    accessibilityRole="button"
    disabled={disabled}
    onPress={onPress}
    style={[
      styles.controlButton,
      variant === 'primary' && styles.controlButtonPrimary,
      variant === 'danger' && styles.controlButtonDanger,
      disabled && styles.controlButtonDisabled,
    ]}
  >
    {icon ? (
      <Icon
        name={icon}
        size={15}
        color={variant === 'light' ? colors.blue : colors.white}
      />
    ) : null}
    <AppText style={[styles.controlText, variant !== 'light' && styles.controlTextStrong]}>
      {label}
    </AppText>
  </TouchableOpacity>
);

const SupportTicketDetailScreen = ({ navigation, route }) => {
  const ticketId = route?.params?.ticketId;
  const { user } = useContext(AuthContext);
  const currentUserId = user?.id || user?.user_id;

  const [ticket, setTicket] = useState(route?.params?.ticket || null);
  const [replies, setReplies] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [actionBusy, setActionBusy] = useState('');
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [actionNote, setActionNote] = useState('');
  const [noteMessage, setNoteMessage] = useState('');
  const [editingReplyId, setEditingReplyId] = useState(null);
  const [editingReplyText, setEditingReplyText] = useState('');
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingNoteText, setEditingNoteText] = useState('');
  const lastTypingAtRef = useRef(0);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const loadConversation = async ({ soft = false } = {}) => {
    if (!ticketId) return;
    if (!soft) setLoading(true);

    try {
      const [conversationResult, contextResult, notesResult] = await Promise.allSettled([
        supportService.getTicketConversation(ticketId, { limit: 100 }),
        supportService.getTicketContext(ticketId),
        supportService.getInternalNotes(ticketId, { limit: 100 }),
      ]);

      if (conversationResult.status === 'fulfilled') {
        setReplies(pickList(conversationResult.value, ['replies', 'data']));
      } else {
        throw conversationResult.reason;
      }

      if (contextResult.status === 'fulfilled') {
        const context = pickObject(contextResult.value, ['data']) || {};
        const nextTicket = context.ticket || asTicket(contextResult.value);
        if (nextTicket) {
          setTicket(nextTicket);
        }
      }

      if (notesResult.status === 'fulfilled') {
        setNotes(pickList(notesResult.value, ['notes', 'data']));
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Conversation unavailable',
        text2: getErrorMessage(error, 'Could not load ticket conversation'),
      });
    } finally {
      if (!soft) setLoading(false);
    }
  };

  useEffect(() => {
    loadConversation();
  }, [ticketId]);

  const refreshSoftly = () => loadConversation({ soft: true });

  const runTicketAction = async (label, action, successText = 'Ticket updated') => {
    setActionBusy(label);
    try {
      const response = await action();
      const nextTicket = asTicket(response);
      if (nextTicket) {
        setTicket(nextTicket);
      }
      setActionNote('');
      Toast.show({ type: 'success', text1: successText });
      await refreshSoftly();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: `${label} failed`,
        text2: getErrorMessage(error, 'Could not update ticket'),
      });
    } finally {
      setActionBusy('');
    }
  };

  const pickAttachment = async () => {
    try {
      const result = await launchImageLibrary({ mediaType: 'mixed', selectionLimit: 1 });
      const asset = result?.assets?.[0];
      if (asset) {
        setAttachment(asset);
        Toast.show({ type: 'info', text1: 'Attachment selected', text2: asset.fileName || 'File ready' });
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Could not pick file' });
    }
  };

  const handleMessageChange = (text) => {
    setMessage(text);
    const now = Date.now();
    if (ticketId && now - lastTypingAtRef.current > 3500) {
      lastTypingAtRef.current = now;
      supportService.sendTyping(ticketId).catch(() => {});
    }
  };

  const sendReply = async () => {
    const trimmed = message.trim();
    if (!trimmed && !attachment) {
      Toast.show({ type: 'info', text1: 'Type a reply or attach a file' });
      return;
    }

    setSending(true);
    try {
      await supportService.replyToTicket(ticketId, trimmed, attachment);
      setMessage('');
      setAttachment(null);
      Toast.show({ type: 'success', text1: 'Reply sent' });
      await refreshSoftly();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Reply failed',
        text2: getErrorMessage(error, 'Could not send reply'),
      });
    } finally {
      setSending(false);
    }
  };

  const startReplyEdit = (reply) => {
    setEditingReplyId(reply.id);
    setEditingReplyText(reply.message || '');
  };

  const saveReplyEdit = async () => {
    const trimmed = editingReplyText.trim();
    if (!trimmed) {
      Toast.show({ type: 'info', text1: 'Reply cannot be empty' });
      return;
    }

    await runTicketAction(
      'Edit reply',
      () => supportService.editReply(ticketId, editingReplyId, trimmed),
      'Reply updated'
    );
    setEditingReplyId(null);
    setEditingReplyText('');
  };

  const confirmDeleteReply = (reply) => {
    Alert.alert('Delete reply?', 'This removes your reply from the support conversation.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () =>
          runTicketAction('Delete reply', () => supportService.deleteReply(ticketId, reply.id), 'Reply deleted'),
      },
    ]);
  };

  const addInternalNote = async () => {
    const trimmed = noteMessage.trim();
    if (!trimmed) {
      Toast.show({ type: 'info', text1: 'Type an internal note first' });
      return;
    }

    await runTicketAction(
      'Add note',
      () => supportService.addInternalNote(ticketId, trimmed),
      'Internal note added'
    );
    setNoteMessage('');
  };

  const startNoteEdit = (note) => {
    setEditingNoteId(note.id);
    setEditingNoteText(note.message || '');
  };

  const saveNoteEdit = async () => {
    const trimmed = editingNoteText.trim();
    if (!trimmed) {
      Toast.show({ type: 'info', text1: 'Note cannot be empty' });
      return;
    }

    await runTicketAction(
      'Edit note',
      () => supportService.editInternalNote(ticketId, editingNoteId, trimmed),
      'Internal note updated'
    );
    setEditingNoteId(null);
    setEditingNoteText('');
  };

  const confirmDeleteNote = (note) => {
    Alert.alert('Delete internal note?', 'This removes your private admin note.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () =>
          runTicketAction('Delete note', () => supportService.deleteInternalNote(ticketId, note.id), 'Internal note deleted'),
      },
    ]);
  };

  const openAttachment = (url) => {
    const resolvedUrl = buildUploadUrl(url);
    if (!resolvedUrl) return;
    Linking.openURL(resolvedUrl).catch(() => {
      Toast.show({ type: 'error', text1: 'Could not open attachment' });
    });
  };

  const resolveTicket = () => {
    const summary = actionNote.trim();
    Alert.alert('Resolve ticket?', 'This marks the ticket as resolved for support tracking.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Resolve',
        onPress: () =>
          runTicketAction(
            'Resolve',
            () => supportService.resolveTicket(ticketId, summary),
            'Ticket resolved'
          ),
      },
    ]);
  };

  const ticketStatus = ticket?.status || 'open';
  const escalationStatus = ticket?.escalation_status || 'none';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flex}
    >
      <DashboardScreen refreshing={loading} onRefresh={loadConversation} contentContainerStyle={styles.content}>
        <DashboardHero
          eyebrow="SUPPORT CONVERSATION"
          title={ticket?.subject || `Ticket #${ticketId}`}
          subtitle={ticket?.description || 'Review the customer conversation and manage the ticket natively.'}
          icon="chatbox-ellipses-outline"
          onRefresh={loadConversation}
        />

        <DashboardNotice
          title="Native support workspace"
          message="Replies, attachments, internal notes, assignment, escalation and resolution controls now stay inside the app."
        />

        <DashboardSection
          title="Ticket controls"
          subtitle="Use the optional note as a resolution summary or escalation instruction."
        >
          <View style={styles.statusGrid}>
            <View style={styles.statusCard}>
              <AppText style={styles.statusLabel}>Ticket status</AppText>
              <AppText style={styles.statusValue}>{ticketStatus.replace(/_/g, ' ')}</AppText>
            </View>
            <View style={styles.statusCard}>
              <AppText style={styles.statusLabel}>Priority</AppText>
              <AppText style={styles.statusValue}>{ticket?.priority || 'normal'}</AppText>
            </View>
            <View style={styles.statusCard}>
              <AppText style={styles.statusLabel}>Escalation</AppText>
              <AppText style={styles.statusValue}>{escalationStatus.replace(/_/g, ' ')}</AppText>
            </View>
          </View>

          <TextInput
            accessibilityLabel="Support action note"
            multiline
            onChangeText={setActionNote}
            placeholder="Optional note for resolution or escalation"
            placeholderTextColor={colors.muted}
            style={styles.noteInput}
            value={actionNote}
          />

          <View style={styles.controlRow}>
            <ControlButton
              disabled={Boolean(actionBusy)}
              icon="person-add-outline"
              label="Assign to me"
              onPress={() =>
                runTicketAction('Assign', () => supportService.assignTicket(ticketId), 'Ticket assigned')
              }
            />
            <ControlButton
              disabled={Boolean(actionBusy)}
              icon="hand-left-outline"
              label="Take over"
              onPress={() =>
                runTicketAction('Take over', () => supportService.takeoverTicket(ticketId), 'Ticket taken over')
              }
            />
            <ControlButton
              disabled={Boolean(actionBusy)}
              icon="checkmark-circle-outline"
              label="Resolve"
              onPress={resolveTicket}
              variant="primary"
            />
          </View>

          <AppText style={styles.controlLabel}>Escalate to department</AppText>
          <View style={styles.controlRow}>
            {DEPARTMENTS.map((department) => (
              <ControlButton
                key={department.key}
                disabled={Boolean(actionBusy)}
                icon={department.icon}
                label={department.label}
                onPress={() =>
                  runTicketAction(
                    'Escalate',
                    () => supportService.escalateToDepartment(ticketId, department.key, actionNote.trim()),
                    `Escalated to ${department.label}`
                  )
                }
              />
            ))}
          </View>

          <AppText style={styles.controlLabel}>Escalation status</AppText>
          <View style={styles.controlRow}>
            {ESCALATION_STATUSES.map((status) => (
              <ControlButton
                key={status.key}
                disabled={Boolean(actionBusy)}
                label={status.label}
                onPress={() =>
                  runTicketAction(
                    'Escalation status',
                    () => supportService.updateEscalationStatus(ticketId, status.key, actionNote.trim()),
                    'Escalation updated'
                  )
                }
              />
            ))}
          </View>

          {actionBusy ? (
            <View style={styles.busyRow}>
              <ActivityIndicator color={colors.blue} size="small" />
              <AppText style={styles.busyText}>{actionBusy} in progress...</AppText>
            </View>
          ) : null}
        </DashboardSection>

        <DashboardSection title="Conversation">
          {loading && !replies.length ? <ActivityIndicator color={colors.blue} /> : null}
          {!loading && !replies.length ? (
            <AppText style={styles.empty}>No replies yet. Start the conversation below.</AppText>
          ) : null}
          {replies.map((reply) => {
            const adminReply = Boolean(reply.is_admin);
            const ownReply = sameId(reply.user_id, currentUserId);
            const editing = sameId(editingReplyId, reply.id);
            return (
              <View
                key={String(reply.id)}
                style={[
                  styles.replyBubble,
                  adminReply ? styles.adminBubble : styles.customerBubble,
                ]}
              >
                <AppText style={styles.replyAuthor}>
                  {reply.author_name || (adminReply ? 'Support admin' : 'Customer')}
                </AppText>
                {editing ? (
                  <>
                    <TextInput
                      accessibilityLabel="Edit reply"
                      multiline
                      onChangeText={setEditingReplyText}
                      style={styles.editInput}
                      value={editingReplyText}
                    />
                    <View style={styles.inlineActions}>
                      <TouchableOpacity onPress={saveReplyEdit}>
                        <AppText style={styles.inlineActionPrimary}>Save</AppText>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setEditingReplyId(null)}>
                        <AppText style={styles.inlineAction}>Cancel</AppText>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <>
                    <AppText style={styles.replyMessage}>{reply.message}</AppText>
                    {reply.edited_at ? <AppText style={styles.editedText}>Edited</AppText> : null}
                  </>
                )}
                {reply.attachment_url ? (
                  <TouchableOpacity onPress={() => openAttachment(reply.attachment_url)}>
                    <AppText style={styles.replyAttachment} numberOfLines={1}>
                      {reply.attachment_name || 'Open attachment'}
                    </AppText>
                  </TouchableOpacity>
                ) : null}
                <AppText style={styles.replyTime}>
                  {reply.created_at ? new Date(reply.created_at).toLocaleString() : ''}
                </AppText>
                {ownReply && !editing ? (
                  <View style={styles.inlineActions}>
                    <TouchableOpacity onPress={() => startReplyEdit(reply)}>
                      <AppText style={styles.inlineActionPrimary}>Edit</AppText>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => confirmDeleteReply(reply)}>
                      <AppText style={styles.inlineActionDanger}>Delete</AppText>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            );
          })}
        </DashboardSection>

        <DashboardSection
          title="Internal notes"
          subtitle="Private admin-to-admin notes for handover, escalation and audit context."
        >
          {notes.length ? (
            notes.map((note) => {
              const ownNote = sameId(note.user_id, currentUserId);
              const editing = sameId(editingNoteId, note.id);
              return (
                <View key={String(note.id)} style={styles.noteCard}>
                  <View style={styles.noteHeader}>
                    <AppText style={styles.noteAuthor}>{note.author_name || 'Support admin'}</AppText>
                    <AppText style={styles.noteRole}>{String(note.author_role || '').replace(/_/g, ' ')}</AppText>
                  </View>
                  {editing ? (
                    <>
                      <TextInput
                        accessibilityLabel="Edit internal note"
                        multiline
                        onChangeText={setEditingNoteText}
                        style={styles.editInput}
                        value={editingNoteText}
                      />
                      <View style={styles.inlineActions}>
                        <TouchableOpacity onPress={saveNoteEdit}>
                          <AppText style={styles.inlineActionPrimary}>Save</AppText>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setEditingNoteId(null)}>
                          <AppText style={styles.inlineAction}>Cancel</AppText>
                        </TouchableOpacity>
                      </View>
                    </>
                  ) : (
                    <AppText style={styles.noteText}>{note.message}</AppText>
                  )}
                  <AppText style={styles.replyTime}>
                    {note.created_at ? new Date(note.created_at).toLocaleString() : ''}
                  </AppText>
                  {ownNote && !editing ? (
                    <View style={styles.inlineActions}>
                      <TouchableOpacity onPress={() => startNoteEdit(note)}>
                        <AppText style={styles.inlineActionPrimary}>Edit</AppText>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => confirmDeleteNote(note)}>
                        <AppText style={styles.inlineActionDanger}>Delete</AppText>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              );
            })
          ) : (
            <AppText style={styles.empty}>No internal notes yet.</AppText>
          )}

          <TextInput
            accessibilityLabel="New internal note"
            multiline
            onChangeText={setNoteMessage}
            placeholder="Add a private internal note"
            placeholderTextColor={colors.muted}
            style={styles.noteInput}
            value={noteMessage}
          />
          <ControlButton
            disabled={Boolean(actionBusy)}
            icon="lock-closed-outline"
            label="Add internal note"
            onPress={addInternalNote}
            variant="primary"
          />
        </DashboardSection>
      </DashboardScreen>

      <View style={styles.composer}>
        <TouchableOpacity
          accessibilityLabel="Attach file"
          onPress={pickAttachment}
          style={styles.attachButton}
          disabled={sending}
        >
          <Icon name="attach" size={22} color={attachment ? colors.blue : colors.muted} />
        </TouchableOpacity>
        <View style={styles.inputWrap}>
          {attachment ? (
            <AppText style={styles.attachmentLabel} numberOfLines={1}>{attachment.fileName || 'File attached'}</AppText>
          ) : null}
          <TextInput
            accessibilityLabel="Support reply message"
            multiline
            onChangeText={handleMessageChange}
            placeholder="Type your reply..."
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={message}
          />
        </View>
        <TouchableOpacity
          accessibilityLabel="Send reply"
          accessibilityRole="button"
          disabled={sending}
          onPress={sendReply}
          style={[styles.sendButton, sending && styles.sendButtonDisabled]}
        >
          {sending ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Icon name="send" size={20} color={colors.white} />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.surface },
  content: { paddingBottom: 130 },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  statusCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexGrow: 1,
    minWidth: '30%',
    padding: 11,
  },
  statusLabel: {
    color: colors.muted,
    fontFamily: typography.semibold,
    fontSize: 13,
    textTransform: 'uppercase',
  },
  statusValue: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 14,
    marginTop: 4,
    textTransform: 'capitalize',
  },
  controlLabel: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 13,
    marginTop: 12,
  },
  controlRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  controlButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  controlButtonPrimary: {
    backgroundColor: colors.blue,
  },
  controlButtonDanger: {
    backgroundColor: colors.danger,
  },
  controlButtonDisabled: {
    opacity: 0.55,
  },
  controlText: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: 13,
  },
  controlTextStrong: {
    color: colors.white,
  },
  busyRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  busyText: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 13,
  },
  noteInput: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.ink,
    fontFamily: typography.regular,
    minHeight: 74,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: 'top',
  },
  replyBubble: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 13,
  },
  adminBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.surfaceBlue,
    borderColor: '#BFDBFE',
    marginLeft: 30,
  },
  customerBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.white,
    borderColor: colors.border,
    marginRight: 30,
  },
  replyAuthor: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: 13,
  },
  replyMessage: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
  replyAttachment: {
    color: colors.blue,
    fontFamily: typography.medium,
    fontSize: 13,
    marginTop: 6,
  },
  replyTime: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    marginTop: 8,
  },
  editedText: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 13,
    marginTop: 3,
  },
  inlineActions: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 9,
  },
  inlineAction: {
    color: colors.muted,
    fontFamily: typography.semibold,
    fontSize: 13,
  },
  inlineActionPrimary: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: 13,
  },
  inlineActionDanger: {
    color: colors.danger,
    fontFamily: typography.bold,
    fontSize: 13,
  },
  editInput: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.ink,
    fontFamily: typography.regular,
    marginTop: 8,
    minHeight: 70,
    paddingHorizontal: 11,
    paddingVertical: 9,
    textAlignVertical: 'top',
  },
  noteCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 13,
  },
  noteHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  noteAuthor: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.bold,
    fontSize: 13,
  },
  noteRole: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 13,
    textTransform: 'capitalize',
  },
  noteText: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 7,
  },
  empty: {
    color: colors.muted,
    fontFamily: typography.regular,
    lineHeight: 20,
  },
  composer: {
    alignItems: 'flex-end',
    backgroundColor: colors.white,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: 'row',
    gap: 10,
    left: 0,
    padding: 12,
    position: 'absolute',
    right: 0,
  },
  attachButton: {
    alignItems: 'center',
    height: 46,
    justifyContent: 'center',
    width: 36,
  },
  inputWrap: {
    flex: 1,
  },
  attachmentLabel: {
    color: colors.blue,
    fontFamily: typography.medium,
    fontSize: 13,
    marginBottom: 2,
    marginLeft: 14,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    color: colors.ink,
    fontFamily: typography.regular,
    maxHeight: 110,
    minHeight: 46,
    paddingHorizontal: 14,
    paddingVertical: 11,
    textAlignVertical: 'top',
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: colors.blue,
    borderRadius: 23,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
});

export default SupportTicketDetailScreen;
