import React, {
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import OptionPickerModal from '../../components/common/OptionPickerModal';
import { AuthContext } from '../../context/AuthContext';
import { messageService } from '../../services/messageService';
import { colors, radius, typography } from '../../theme';
import { getErrorMessage, pickList } from '../../utils/http';

const initials = (name = 'User') =>
  String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

const MessagesScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const threadRef = useRef(null);
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

  const canCompose = ['admin', 'lga_admin', 'super_admin'].includes(user?.user_type);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

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
    try {
      await messageService.sendMessage({
        receiver_id: Number(selected.other_user_id),
        message_text: optimisticMessage.message_text,
        message_type: messageType,
      });
      await Promise.all([
        loadConversation(selected.other_user_id),
        loadConversations(),
      ]);
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
    setSelected(null);
    setMessages([]);
    setMessageText('');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={colors.blue} size="large" />
        <Text style={styles.loadingText}>Loading conversations…</Text>
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
              <Text style={styles.smallAvatarText}>{initials(selected.other_user_name)}</Text>
            </View>
            <View style={styles.threadHeaderCopy}>
              <Text style={styles.threadName} numberOfLines={1}>
                {selected.other_user_name || 'RentalHub user'}
              </Text>
              <Text style={styles.threadRole}>
                {String(selected.other_user_type || 'member').replace(/_/g, ' ')}
              </Text>
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
              <Text style={styles.propertyContextText} numberOfLines={1}>
                {selected.property_title}
              </Text>
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
                  <Text style={styles.emptyThreadTitle}>Start of the conversation</Text>
                  <Text style={styles.emptyThreadText}>
                    {canCompose
                      ? 'Send a clear message to begin.'
                      : 'Messages from RentalHub support will appear here.'}
                  </Text>
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
                    <Text style={styles.dateDivider}>
                      {item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
                    </Text>
                  ) : null}
                  <View style={[styles.messageBubble, mine ? styles.myBubble : styles.otherBubble]}>
                    {item.subject ? (
                      <Text style={[styles.messageSubject, mine && styles.myMessageText]}>
                        {item.subject}
                      </Text>
                    ) : null}
                    <Text style={[styles.messageText, mine && styles.myMessageText]}>
                      {item.message_text}
                    </Text>
                    <View style={styles.messageMeta}>
                      <Text style={[styles.messageTime, mine && styles.myMessageMeta]}>
                        {item.created_at
                          ? new Date(item.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : ''}
                      </Text>
                      {mine ? (
                        <Icon
                          name={item.pending ? 'time-outline' : 'checkmark-done'}
                          size={13}
                          color={item.pending ? '#C8D8EF' : '#DCE9FA'}
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
                onChangeText={setMessageText}
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
              <Text style={styles.readOnlyText}>
                This is a read-only channel for official RentalHub updates.
              </Text>
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
          <Text style={styles.eyebrow}>INBOX</Text>
          <Text style={styles.title}>Messages</Text>
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
            <Text style={styles.summary}>
              {unreadTotal
                ? `${unreadTotal} unread message${unreadTotal === 1 ? '' : 's'}`
                : `${conversations.length} conversation${conversations.length === 1 ? '' : 's'}`}
            </Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.conversationEmpty}>
            <View style={styles.emptyIcon}>
              <Icon name="chatbubbles-outline" size={31} color={colors.blue} />
            </View>
            <Text style={styles.emptyTitle}>
              {query ? 'No conversations match' : 'No conversations yet'}
            </Text>
            <Text style={styles.emptyText}>
              {canCompose
                ? 'Start a secure internal conversation with an eligible RentalHub user.'
                : 'Official RentalHub messages and support updates will appear here.'}
            </Text>
            {canCompose && !query ? (
              <TouchableOpacity
                onPress={() => setShowRecipientPicker(true)}
                style={styles.startButton}>
                <Text style={styles.startButtonText}>New conversation</Text>
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
              <Text style={styles.avatarText}>{initials(item.other_user_name)}</Text>
            </View>
            <View style={styles.conversationBody}>
              <View style={styles.conversationHeading}>
                <Text style={styles.conversationName} numberOfLines={1}>
                  {item.other_user_name || 'RentalHub user'}
                </Text>
                <Text style={styles.conversationTime}>
                  {item.created_at
                    ? new Date(item.created_at).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                      })
                    : ''}
                </Text>
              </View>
              <View style={styles.conversationPreview}>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.conversationMessage,
                    Number(item.unread_count || 0) > 0 && styles.conversationMessageUnread,
                  ]}>
                  {item.message_text || item.subject || 'No messages yet'}
                </Text>
                {Number(item.unread_count || 0) > 0 ? (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{item.unread_count}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.conversationRole}>
                {String(item.other_user_type || 'member').replace(/_/g, ' ')}
                {item.property_title ? ` · ${item.property_title}` : ''}
              </Text>
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
    fontSize: 12,
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
    fontSize: 9,
    letterSpacing: 1.2,
  },
  title: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 25,
    letterSpacing: -0.6,
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
    fontSize: 11,
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
    fontSize: 9,
  },
  conversationPreview: { alignItems: 'center', flexDirection: 'row', marginTop: 4 },
  conversationMessage: {
    color: colors.muted,
    flex: 1,
    fontFamily: typography.regular,
    fontSize: 11,
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
  unreadText: { color: colors.white, fontFamily: typography.bold, fontSize: 8 },
  conversationRole: {
    color: colors.blue,
    fontFamily: typography.medium,
    fontSize: 9,
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
  startButtonText: { color: colors.white, fontFamily: typography.semibold, fontSize: 12 },
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
  smallAvatarText: { color: colors.white, fontFamily: typography.bold, fontSize: 11 },
  threadHeaderCopy: { flex: 1, marginLeft: 10 },
  threadName: { color: colors.ink, fontFamily: typography.semibold, fontSize: 14 },
  threadRole: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 9,
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
    fontSize: 10,
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
    fontSize: 11,
    lineHeight: 17,
    marginTop: 5,
    textAlign: 'center',
  },
  dateDivider: {
    alignSelf: 'center',
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 9,
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
    fontSize: 11,
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
  messageTime: { color: colors.muted, fontFamily: typography.regular, fontSize: 8 },
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
    fontSize: 10,
    marginLeft: 7,
  },
});

export default MessagesScreen;
