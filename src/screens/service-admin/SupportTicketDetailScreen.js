import React, { useEffect, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import { supportService } from '../../services/supportService';
import { getErrorMessage, pickList, pickObject } from '../../utils/http';
import { colors, radius, typography } from '../../theme';
import {
  DashboardHero,
  DashboardNotice,
  DashboardScreen,
  DashboardSection,
} from '../../components/dashboard/DashboardKit';

const SupportTicketDetailScreen = ({ navigation, route }) => {
  const ticketId = route?.params?.ticketId;
  const [ticket, setTicket] = useState(route?.params?.ticket || null);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState(null);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const loadConversation = async () => {
    if (!ticketId) return;
    setLoading(true);
    try {
      const response = await supportService.getTicketConversation(ticketId, { limit: 100 });
      setTicket(pickObject(response, ['ticket', 'data']) || response?.ticket || ticket);
      setReplies(pickList(response, ['replies', 'data']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Conversation unavailable',
        text2: getErrorMessage(error, 'Could not load ticket conversation'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversation();
  }, [ticketId]);

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
      await loadConversation();
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flex}
    >
      <DashboardScreen refreshing={loading} onRefresh={loadConversation} contentContainerStyle={styles.content}>
        <DashboardHero
          eyebrow="SUPPORT CONVERSATION"
          title={ticket?.subject || `Ticket #${ticketId}`}
          subtitle={ticket?.description || 'Review the customer conversation and send a native reply.'}
          icon="chatbox-ellipses-outline"
          onRefresh={loadConversation}
        />

        <DashboardNotice
          title="Native reply box"
          message="Text replies are now native. Attachments, internal notes and edit/delete actions remain next-stage parity items."
        />

        <DashboardSection title="Conversation">
          {loading && !replies.length ? <ActivityIndicator color={colors.blue} /> : null}
          {!loading && !replies.length ? (
            <Text style={styles.empty}>No replies yet. Start the conversation below.</Text>
          ) : null}
          {replies.map((reply) => {
            const adminReply = Boolean(reply.is_admin);
            return (
              <View
                key={String(reply.id)}
                style={[
                  styles.replyBubble,
                  adminReply ? styles.adminBubble : styles.customerBubble,
                ]}
              >
                <Text style={styles.replyAuthor}>
                  {reply.author_name || (adminReply ? 'Support admin' : 'Customer')}
                </Text>
                <Text style={styles.replyMessage}>{reply.message}</Text>
                {reply.attachment_url ? (
                  <Text style={styles.replyAttachment} numberOfLines={1}>
                    {reply.attachment_name || 'Attachment'}
                  </Text>
                ) : null}
                <Text style={styles.replyTime}>
                  {reply.created_at ? new Date(reply.created_at).toLocaleString() : ''}
                </Text>
              </View>
            );
          })}
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
            <Text style={styles.attachmentLabel} numberOfLines={1}>{attachment.fileName || 'File attached'}</Text>
          ) : null}
          <TextInput
            accessibilityLabel="Support reply message"
            multiline
            onChangeText={setMessage}
            placeholder="Type your reply…"
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
  content: { paddingBottom: 120 },
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
    fontSize: 12,
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
    fontSize: 12,
    marginTop: 6,
  },
  replyTime: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 10,
    marginTop: 8,
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
    fontSize: 11,
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
