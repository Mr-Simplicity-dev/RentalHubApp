import React, {
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StyleSheet
  TextInput,
  TouchableOpacity,
  View,} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import OptionPickerModal from '../../components/common/OptionPickerModal';
import { AuthContext } from '../../context/AuthContext';
import { useRealtime } from '../../context/RealtimeContext';
import { messageService } from '../../services/messageService';
import { colors, radius, typography } from '../../theme';
import { getErrorMessage, pickList } from '../../utils/http';

import AppText from '../../components/common/AppText';
const initials = (name = 'User') =>
  String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

const MessagesScreen = ({ navigation, route }) => {
  const { user } = useContext(AuthContext);
  const { checkPresence, connected, emitTyping, isUserOnline, subscribe } = useRealtime();
  const threadRef = useRef(null);
  const selectedRef = useRef(null);
  const typingTimerRef = useRef(null);
  const typingActiveRef = useRef(false);
  const remoteTypingTimerRef = useRef(null);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [threadLoading, setThreadLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showRecipientPicker, setShowRecipientPicker] = useState(false);
  const [typingUserId, setTypingUserId] = useState(null);

  const canCompose = ['admin', 'lga_admin', 'super_admin'].includes(user?.user_type);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  const loadConversations = async () => {
    const response = await messageService.getConversations();
    setConversations(pickList(response, ['data', 'conversations']));
  };

  const loadRecipients = async () => {
    if (!canCompose) {
      setRecipients([]);
      return;
    }
    const response = await messageService.getRecipients();
    setRecipients(pickList(response, ['data', 'recipients']));
  };

  const loadConversation = async (userId, { refresh = false } = {}) => {
    refresh ? setRefreshing(true) : setThreadLoading(true);
    try {
      const response = await messageService.getConversationWithUser(userId, { limit: 100 });
      setMessages(pickList(response, ['data', 'messages']));
      await messageService.markConversationAsRead(userId);
      setConversations((current) =>
        current.map((conversation) =>
          Number(conversation.other_user_id) === Number(userId)
            ? { ...conversation, unread_count: 0 }
            : conversation
        )
      );
    } finally {
      setThreadLoading(false);
      setRefreshing(false);
    }
  };

  const loadAll = async ({ refresh = false } = {}) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      await Promise.all([loadConversations(), loadRecipients()]);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Could not load messages',
        text2: getErrorMessage(error, 'Please try again.'),
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [user?.user_type]);

  useEffect(() => {
    const updateConversation = (message) => {
      const mine = Number(message.sender_id) === Number(user?.id);
      const otherUserId = mine ? message.receiver_id : message.sender_id;
      if (!otherUserId) return;

      const activeThread =
        Number(selectedRef.current?.other_user_id) === Number(otherUserId);
      setConversations((current) => {
        const existing = current.find(
          (item) => Number(item.other_user_id) === Number(otherUserId)
        );
        const next = {
          ...existing,
          id: message.id,
          other_user_id: otherUserId,
          other_user_name: mine
            ? message.receiver_name || existing?.other_user_name
            : message.sender_name || existing?.other_user_name,
          other_user_type: mine
            ? message.receiver_user_type || existing?.other_user_type
            : message.sender_user_type || existing?.other_user_type,
          message_text: message.message_text,
          subject: message.subject,
          message_type: message.message_type,
          property_id: message.property_id || existing?.property_id,
          property_title: message.property_title || existing?.property_title,
          created_at: message.created_at,
          unread_count:
            !mine && !activeThread
              ? Number(existing?.unread_count || 0) + 1
              : activeThread
                ? 0
                : Number(existing?.unread_count || 0),
        };
        return [
          next,
          ...current.filter(
            (item) => Number(item.other_user_id) !== Number(otherUserId)
          ),
        ];
      });
    };

    const appendMessage = (message) => {
      setMessages((current) => {
        const existingIndex = current.findIndex(
          (item) => String(item.id) === String(message.id)
        );
        if (existingIndex >= 0) {
          return current.map((item, index) =>
            index === existingIndex ? { ...item, ...message, pending: false } : item
          );
        }
        return [...current, { ...message, pending: false }];
      });
    };

    const unsubscribeNew = subscribe('message:new', (message = {}) => {
      const mine = Number(message.sender_id) === Number(user?.id);
      const otherUserId = mine ? message.receiver_id : message.sender_id;
      const activeThread =
        Number(selectedRef.current?.other_user_id) === Number(otherUserId);

      updateConversation(message);
      if (activeThread) {
        appendMessage(message);
        if (!mine) {
          void messageService.markConversationAsRead(otherUserId).catch(() => {});
        }
      } else if (!mine) {
        Toast.show({
          type: 'info',
          text1: message.sender_name || 'New RentalHub message',
          text2: message.message_text,
        });
      }
    });

    const unsubscribeRead = subscribe('message:read', ({ message_ids: messageIds = [] } = {}) => {
      const readIds = new Set(messageIds.map(String));
      if (!readIds.size) return;
      setMessages((current) =>
        current.map((message) =>
          readIds.has(String(message.id)) ? { ...message, is_read: true } : message
        )
      );
    });

    const unsubscribeDeleted = subscribe(
      'message:deleted',
      ({ message_id: messageId } = {}) => {
        if (!messageId) return;
        setMessages((current) =>
          current.filter((message) => String(message.id) !== String(messageId))
        );
        void loadConversations().catch(() => {});
      }
    );

    const unsubscribeTyping = subscribe('message:typing', (payload = {}) => {
      if (
        Number(payload.user_id) !==
        Number(selectedRef.current?.other_user_id)
      ) {
        return;
      }
      setTypingUserId(payload.is_typing ? payload.user_id : null);
      if (remoteTypingTimerRef.current) clearTimeout(remoteTypingTimerRef.current);
      if (payload.is_typing) {
        remoteTypingTimerRef.current = setTimeout(() => setTypingUserId(null), 3000);
      }
    });

    return () => {
      unsubscribeNew();
      unsubscribeRead();
      unsubscribeDeleted();
      unsubscribeTyping();
    };
  }, [subscribe, user?.id]);

  useEffect(() => {
    if (connected && selected?.other_user_id) {
      checkPresence([selected.other_user_id]);
    }
  }, [checkPresence, connected, selected?.other_user_id]);

  useEffect(
    () => () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (remoteTypingTimerRef.current) clearTimeout(remoteTypingTimerRef.current);
    },
    []
  );

  const visibleConversations = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return conversations;
    return conversations.filter((conversation) =>
      [
        conversation.other_user_name,
        conversation.other_user_type,
        conversation.message_text,
        conversation.property_title,
      ]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(value))
    );
  }, [conversations, query]);

  const unreadTotal = useMemo(
    () =>
      conversations.reduce(
        (sum, conversation) => sum + Number(conversation.unread_count || 0),
        0
      ),
    [conversations]
  );

  const pickConversation = async (conversation) => {
    setSelected(conversation);
    setMessages([]);
    try {
      await loadConversation(conversation.other_user_id);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Could not open conversation',
        text2: getErrorMessage(error, 'Please try again.'),
      });
    }
  };

  useEffect(() => {
    const senderId = route?.params?.senderId;
    if (!senderId || loading || selected) return;

    const conversation = conversations.find(
      (item) => Number(item.other_user_id) === Number(senderId)
    ) || {
      other_user_id: senderId,
      other_user_name: route?.params?.senderName || 'RentalHub user',
      unread_count: 0,
    };
    navigation.setParams({ senderId: undefined, senderName: undefined });
    void pickConversation(conversation);
  }, [
    conversations,
    loading,
    navigation,
    route?.params?.senderId,
    route?.params?.senderName,
    selected,
  ]);

  const startConversation = (recipient) => {
    const next = {
      other_user_id: recipient.id,
      other_user_name: recipient.full_name || recipient.name || 'RentalHub user',
      other_user_type: recipient.user_type,
      unread_count: 0,
    };
    setShowRecipientPicker(false);
    pickConversation(next);
  };

  const send = async () => {
    if (!canCompose || !selected?.other_user_id || !messageText.trim()) return;

    const receiverIsSuperAdmin = selected.other_user_type === 'super_admin';
    const senderIsLgaAdmin = ['admin', 'lga_admin'].includes(user?.user_type);
    const messageType = senderIsLgaAdmin && receiverIsSuperAdmin ? 'escalation' : 'general';
    const optimisticId = `pending-${Date.now()}`;
    const optimisticMessage = {
      id: optimisticId,
      sender_id: user?.id,
      receiver_id: selected.other_user_id,
      message_text: messageText.trim(),
      message_type: messageType,
      created_at: new Date().toISOString(),
      pending: true,
    };

    setSending(true);
    setMessages((current) => [...current, optimisticMessage]);
    setMessageText('');
    if (typingActiveRef.current) emitTyping(selected.other_user_id, false);
    typingActiveRef.current = false;
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    try {
      const response = await messageService.sendMessage({
        receiver_id: Number(selected.other_user_id),
        message_text: optimisticMessage.message_text,
        message_type: messageType,
      });
      const sentMessage = response?.data;
      if (sentMessage?.id) {
        setMessages((current) => {
          const withoutPending = current.filter(
            (message) =>
              message.id !== optimisticId &&
              String(message.id) !== String(sentMessage.id)
          );
          return [...withoutPending, { ...sentMessage, pending: false }];
        });
      } else {
        await loadConversation(selected.other_user_id);
      }
      await loadConversations();
    } catch (error) {
      setMessages((current) => current.filter((message) => message.id !== optimisticId));
      setMessageText(optimisticMessage.message_text);
      Toast.show({
        type: 'error',
        text1: 'Message not sent',
        text2: getErrorMessage(error, 'Please try again.'),
      });
    } finally {
      setSending(false);
    }
  };

  const closeThread = () => {
    if (selected?.other_user_id && typingActiveRef.current) {
      emitTyping(selected.other_user_id, false);
    }
    typingActiveRef.current = false;
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    if (remoteTypingTimerRef.current) clearTimeout(remoteTypingTimerRef.current);
    setSelected(null);
    setMessages([]);
    setMessageText('');
    setTypingUserId(null);
  };

  const updateMessageText = (value) => {
    setMessageText(value);
    if (!selected?.other_user_id) return;

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    if (value.trim()) {
      if (!typingActiveRef.current) {
        typingActiveRef.current = true;
        emitTyping(selected.other_user_id, true);
      }
      typingTimerRef.current = setTimeout(() => {
        emitTyping(selected.other_user_id, false);
        typingActiveRef.current = false;
      }, 1400);
    } else if (typingActiveRef.current) {
      emitTyping(selected.other_user_id, false);
      typingActiveRef.current = false;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={colors.blue} size="large" />
        <AppText style={styles.loadingText}>Loading conversations…</AppText>
      </SafeAreaView>
    );
  }

  if (selected) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}>
          <View style={styles.threadHeader}>
            <TouchableOpacity
              accessibilityLabel="Back to conversations"
              onPress={closeThread}
              style={styles.backButton}>
              <Icon name="arrow-back" size={22} color={colors.navy} />
            </TouchableOpacity>
            <View style={styles.smallAvatar}>
              <AppText style={styles.smallAvatarText}>{initials(selected.other_user_name)}</AppText>
            </View>
            <View style={styles.threadHeaderCopy}>
              <AppText style={styles.threadName} numberOfLines={1}>
                {selected.other_user_name || 'RentalHub user'}
              </AppText>
              <AppText style={styles.threadRole}>
                {typingUserId
                  ? 'Typing…'
                  : isUserOnline(selected.other_user_id)
                    ? 'Online'
                    : String(selected.other_user_type || 'member').replace(/_/g, ' ')}
              </AppText>
            </View>
            <TouchableOpacity
              accessibilityLabel="Refresh conversation"
              onPress={() => loadConversation(selected.other_user_id, { refresh: true })}
              style={styles.refreshButton}>
              <Icon name="refresh" size={20} color={colors.muted} />
            </TouchableOpacity>
          </View>

          {selected.property_title ? (
            <TouchableOpacity
              disabled={!selected.property_id}
              onPress={() =>
                selected.property_id &&
                navigation.navigate('PropertyDetail', { id: selected.property_id })
              }
              style={styles.propertyContext}>
              <Icon name="home-outline" size={16} color={colors.blue} />
              <AppText style={styles.propertyContextText} numberOfLines={1}>
                {selected.property_title}
              </AppText>
              <Icon name="chevron-forward" size={15} color={colors.muted} />
            </TouchableOpacity>
          ) : null}

          <FlatList
            ref={threadRef}
            contentContainerStyle={styles.threadList}
            data={messages}
            keyExtractor={(item) => String(item.id)}
            ListEmptyComponent={
              threadLoading ? (
                <View style={styles.threadCenter}>
                  <ActivityIndicator color={colors.blue} size="small" />
                </View>
              ) : (
                <View style={styles.threadCenter}>
                  <View style={styles.emptyThreadIcon}>
                    <Icon name="chatbubbles-outline" size={28} color={colors.blue} />
                  </View>
                  <AppText style={styles.emptyThreadTitle}>Start of the conversation</AppText>
                  <AppText style={styles.emptyThreadText}>
                    {canCompose
                      ? 'Send a clear message to begin.'
                      : 'Messages from RentalHub support will appear here.'}
                  </AppText>
                </View>
              )
            }
            onContentSizeChange={() => threadRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => threadRef.current?.scrollToEnd({ animated: false })}
            refreshControl={
              <RefreshControl
                colors={[colors.blue]}
                onRefresh={() => loadConversation(selected.other_user_id, { refresh: true })}
                refreshing={refreshing}
                tintColor={colors.blue}
              />
            }
            renderItem={({ item, index }) => {
              const mine = Number(item.sender_id) === Number(user?.id);
              const previous = messages[index - 1];
              const showDate =
                !previous ||
                new Date(previous.created_at).toDateString() !==
                  new Date(item.created_at).toDateString();
              return (
                <>
                  {showDate ? (
                    <AppText style={styles.dateDivider}>
                      {item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
                    </AppText>
                  ) : null}
                  <View style={[styles.messageBubble, mine ? styles.myBubble : styles.otherBubble]}>
                    {item.subject ? (
                      <AppText style={[styles.messageSubject, mine && styles.myMessageText]}>
                        {item.subject}
                      </AppText>
                    ) : null}
                    <AppText style={[styles.messageText, mine && styles.myMessageText]}>
                      {item.message_text}
                    </AppText>
                    <View style={styles.messageMeta}>
                      <AppText style={[styles.messageTime, mine && styles.myMessageMeta]}>
                        {item.created_at
                          ? new Date(item.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : ''}
                      </AppText>
                      {mine ? (
                        <Icon
                          name={
                            item.pending
                              ? 'time-outline'
                              : item.is_read
                                ? 'checkmark-done'
                                : 'checkmark'
                          }
                          size={13}
                          color={item.is_read ? '#B9F3FF' : '#DCE9FA'}
                        />
                      ) : null}
                    </View>
                  </View>
                </>
              );
            }}
            showsVerticalScrollIndicator={false}
          />

          {canCompose ? (
            <View style={styles.composer}>
              <TextInput
                multiline
                onChangeText={updateMessageText}
                placeholder="Write a message…"
                placeholderTextColor="#96A2B8"
                selectionColor={colors.blue}
                style={styles.composerInput}
                value={messageText}
              />
              <TouchableOpacity
                accessibilityLabel="Send message"
                disabled={!messageText.trim() || sending}
                onPress={send}
                style={[
                  styles.sendButton,
                  (!messageText.trim() || sending) && styles.sendButtonDisabled,
                ]}>
                {sending ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Icon name="send" size={19} color={colors.white} />
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.readOnlyBar}>
              <Icon name="lock-closed-outline" size={16} color={colors.muted} />
              <AppText style={styles.readOnlyText}>
                This is a read-only channel for official RentalHub updates.
              </AppText>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <AppText style={styles.eyebrow}>INBOX</AppText>
          <AppText style={styles.title}>Messages</AppText>
        </View>
        {canCompose ? (
          <TouchableOpacity
            accessibilityLabel="Start a conversation"
            onPress={() => setShowRecipientPicker(true)}
            style={styles.newButton}>
            <Icon name="create-outline" size={21} color={colors.white} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerIcon}>
            <Icon name="chatbubbles-outline" size={22} color={colors.blue} />
          </View>
        )}
      </View>

      <FlatList
        contentContainerStyle={[styles.list, !visibleConversations.length && styles.emptyList]}
        data={visibleConversations}
        keyExtractor={(item) => String(item.id || item.other_user_id)}
        ListHeaderComponent={
          <>
            <View style={styles.searchField}>
              <Icon name="search-outline" size={20} color={colors.muted} />
              <TextInput
                onChangeText={setQuery}
                placeholder="Search conversations"
                placeholderTextColor="#96A2B8"
                style={styles.searchInput}
                value={query}
              />
              {query ? (
                <TouchableOpacity onPress={() => setQuery('')}>
                  <Icon name="close-circle" size={19} color={colors.muted} />
                </TouchableOpacity>
              ) : null}
            </View>
            <AppText style={styles.summary}>
              {unreadTotal
                ? `${unreadTotal} unread message${unreadTotal === 1 ? '' : 's'}`
                : `${conversations.length} conversation${conversations.length === 1 ? '' : 's'}`}
            </AppText>
          </>
        }
        ListEmptyComponent={
          <View style={styles.conversationEmpty}>
            <View style={styles.emptyIcon}>
              <Icon name="chatbubbles-outline" size={31} color={colors.blue} />
            </View>
            <AppText style={styles.emptyTitle}>
              {query ? 'No conversations match' : 'No conversations yet'}
            </AppText>
            <AppText style={styles.emptyText}>
              {canCompose
                ? 'Start a secure internal conversation with an eligible RentalHub user.'
                : 'Official RentalHub messages and support updates will appear here.'}
            </AppText>
            {canCompose && !query ? (
              <TouchableOpacity
                onPress={() => setShowRecipientPicker(true)}
                style={styles.startButton}>
                <AppText style={styles.startButtonText}>New conversation</AppText>
                <Icon name="arrow-forward" size={17} color={colors.white} />
              </TouchableOpacity>
            ) : null}
          </View>
        }
        refreshControl={
          <RefreshControl
            colors={[colors.blue]}
            onRefresh={() => loadAll({ refresh: true })}
            refreshing={refreshing}
            tintColor={colors.blue}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.82}
            onPress={() => pickConversation(item)}
            style={styles.conversation}>
            <View style={styles.avatar}>
              <AppText style={styles.avatarText}>{initials(item.other_user_name)}</AppText>
            </View>
            <View style={styles.conversationBody}>
              <View style={styles.conversationHeading}>
                <AppText style={styles.conversationName} numberOfLines={1}>
                  {item.other_user_name || 'RentalHub user'}
                </AppText>
                <AppText style={styles.conversationTime}>
                  {item.created_at
                    ? new Date(item.created_at).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                      })
                    : ''}
                </AppText>
              </View>
              <View style={styles.conversationPreview}>
                <AppText 
                  numberOfLines={1}
                  style={[
                    styles.conversationMessage,
                    Number(item.unread_count || 0) > 0 && styles.conversationMessageUnread,
                  ]}>
                  {item.message_text || item.subject || 'No messages yet'}
                </AppText>
                {Number(item.unread_count || 0) > 0 ? (
                  <View style={styles.unreadBadge}>
                    <AppText style={styles.unreadText}>{item.unread_count}</AppText>
                  </View>
                ) : null}
              </View>
              <AppText style={styles.conversationRole}>
                {String(item.other_user_type || 'member').replace(/_/g, ' ')}
                {item.property_title ? ` · ${item.property_title}` : ''}
              </AppText>
            </View>
          </TouchableOpacity>
        )}
        showsVerticalScrollIndicator={false}
      />

      <OptionPickerModal
        emptyText="No eligible recipients are available"
        getOptionLabel={(item) =>
          `${item.full_name || item.name || 'User'} · ${String(item.user_type || 'member').replace(/_/g, ' ')}`
        }
        getOptionValue={(item) => item.id}
        onClose={() => setShowRecipientPicker(false)}
        onSelect={startConversation}
        options={recipients}
        searchable
        searchPlaceholder="Search eligible recipients"
        title="New conversation"
        visible={showRecipientPicker}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.surface, flex: 1 },
  keyboardView: { flex: 1 },
  center: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    flex: 1,
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 13,
    marginTop: 12,
  },
  header: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  eyebrow: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: 13,
    letterSpacing: 1.25,
  },
  title: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 24,
    letterSpacing: -0.5,
    marginTop: 3,
  },
  newButton: {
    alignItems: 'center',
    backgroundColor: colors.blue,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  headerIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  list: { padding: 16, paddingBottom: 28 },
  emptyList: { flexGrow: 1 },
  searchField: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 52,
    paddingHorizontal: 14,
  },
  searchInput: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.regular,
    fontSize: 14,
    paddingHorizontal: 10,
  },
  summary: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 13,
    marginBottom: 12,
    marginTop: 13,
  },
  conversation: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 9,
    padding: 12,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.navy,
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  avatarText: { color: colors.white, fontFamily: typography.bold, fontSize: 14 },
  conversationBody: { flex: 1, marginLeft: 11 },
  conversationHeading: { alignItems: 'center', flexDirection: 'row' },
  conversationName: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.semibold,
    fontSize: 14,
  },
  conversationTime: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
  },
  conversationPreview: { alignItems: 'center', flexDirection: 'row', marginTop: 4 },
  conversationMessage: {
    color: colors.muted,
    flex: 1,
    fontFamily: typography.regular,
    fontSize: 13,
  },
  conversationMessageUnread: { color: colors.ink, fontFamily: typography.semibold },
  unreadBadge: {
    alignItems: 'center',
    backgroundColor: colors.blue,
    borderRadius: 9,
    height: 18,
    justifyContent: 'center',
    marginLeft: 7,
    minWidth: 18,
    paddingHorizontal: 4,
  },
  unreadText: { color: colors.white, fontFamily: typography.bold, fontSize: 13 },
  conversationRole: {
    color: colors.blue,
    fontFamily: typography.medium,
    fontSize: 13,
    marginTop: 5,
    textTransform: 'capitalize',
  },
  conversationEmpty: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 350,
    paddingHorizontal: 28,
  },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderRadius: 34,
    height: 68,
    justifyContent: 'center',
    width: 68,
  },
  emptyTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 20,
    marginTop: 17,
  },
  emptyText: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 7,
    textAlign: 'center',
  },
  startButton: {
    alignItems: 'center',
    backgroundColor: colors.blue,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 8,
    marginTop: 19,
    paddingHorizontal: 17,
    paddingVertical: 12,
  },
  startButtonText: { color: colors.white, fontFamily: typography.semibold, fontSize: 13 },
  threadHeader: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  backButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 38,
  },
  smallAvatar: {
    alignItems: 'center',
    backgroundColor: colors.navy,
    borderRadius: 19,
    height: 38,
    justifyContent: 'center',
    marginLeft: 3,
    width: 38,
  },
  smallAvatarText: { color: colors.white, fontFamily: typography.bold, fontSize: 13 },
  threadHeaderCopy: { flex: 1, marginLeft: 10 },
  threadName: { color: colors.ink, fontFamily: typography.semibold, fontSize: 14 },
  threadRole: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  refreshButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  propertyContext: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderBottomColor: '#CFE1FB',
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  propertyContextText: {
    color: colors.blue,
    flex: 1,
    fontFamily: typography.medium,
    fontSize: 13,
    marginHorizontal: 7,
  },
  threadList: { flexGrow: 1, padding: 14, paddingBottom: 18 },
  threadCenter: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 350,
    paddingHorizontal: 28,
  },
  emptyThreadIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderRadius: 30,
    height: 60,
    justifyContent: 'center',
    width: 60,
  },
  emptyThreadTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 16,
    marginTop: 14,
  },
  emptyThreadText: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 17,
    marginTop: 5,
    textAlign: 'center',
  },
  dateDivider: {
    alignSelf: 'center',
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 13,
    marginBottom: 10,
    marginTop: 5,
  },
  messageBubble: {
    borderRadius: 16,
    marginBottom: 8,
    maxWidth: '84%',
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  myBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.blue,
    borderBottomRightRadius: 5,
  },
  otherBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.white,
    borderBottomLeftRadius: 5,
    borderColor: colors.border,
    borderWidth: 1,
  },
  messageSubject: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 13,
    marginBottom: 4,
  },
  messageText: {
    color: colors.ink,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 19,
  },
  myMessageText: { color: colors.white },
  messageMeta: { alignItems: 'center', alignSelf: 'flex-end', flexDirection: 'row', gap: 4, marginTop: 5 },
  messageTime: { color: colors.muted, fontFamily: typography.regular, fontSize: 13 },
  myMessageMeta: { color: '#DCE9FA' },
  composer: {
    alignItems: 'flex-end',
    backgroundColor: colors.white,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 9,
    padding: 10,
  },
  composerInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    color: colors.ink,
    flex: 1,
    fontFamily: typography.regular,
    fontSize: 13,
    maxHeight: 110,
    minHeight: 44,
    paddingHorizontal: 15,
    paddingVertical: 11,
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: colors.blue,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  sendButtonDisabled: { opacity: 0.45 },
  readOnlyBar: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  readOnlyText: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 13,
    marginLeft: 7,
  },
});

export default MessagesScreen;
