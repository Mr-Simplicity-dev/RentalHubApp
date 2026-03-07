import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Toast from 'react-native-toast-message';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { AuthContext } from '../../context/AuthContext';
import { messageService } from '../../services/messageService';
import { getErrorMessage, pickList } from '../../utils/http';

const MessagesScreen = () => {
  const { user } = useContext(AuthContext);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [selected, setSelected] = useState(null);
  const [compose, setCompose] = useState({
    receiver_id: '',
    subject: '',
    message_text: '',
    message_type: 'general',
  });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const canCompose = ['admin', 'super_admin'].includes(user?.user_type);

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

  const loadConversation = async (userId) => {
    const response = await messageService.getConversationWithUser(userId);
    setMessages(pickList(response, ['data', 'messages']));
    await messageService.markConversationAsRead(userId);
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      await Promise.all([loadConversations(), loadRecipients()]);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load messages'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [user?.user_type]);

  const pickConversation = async (conversation) => {
    setSelected(conversation);
    setCompose((prev) => ({ ...prev, receiver_id: String(conversation.other_user_id) }));
    try {
      await loadConversation(conversation.other_user_id);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load conversation'),
      });
    }
  };

  const send = async () => {
    if (!canCompose) {
      Toast.show({ type: 'error', text1: 'Your role is receive-only here.' });
      return;
    }
    if (!compose.receiver_id || !compose.message_text.trim()) {
      Toast.show({ type: 'error', text1: 'Select a recipient and type a message.' });
      return;
    }

    setSending(true);
    try {
      await messageService.sendMessage({
        receiver_id: Number(compose.receiver_id),
        subject: compose.subject.trim(),
        message_text: compose.message_text.trim(),
        message_type: compose.message_type,
      });
      setCompose((prev) => ({ ...prev, subject: '', message_text: '' }));
      await loadConversations();
      if (selected?.other_user_id) {
        await loadConversation(selected.other_user_id);
      }
      Toast.show({ type: 'success', text1: 'Message sent' });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not send message'),
      });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loading}>Loading messages...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Internal Messages</Text>

      <View style={styles.columns}>
        <View style={styles.leftCol}>
          <Text style={styles.sectionTitle}>Conversations</Text>
          <FlatList
            data={conversations}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.conversation,
                  selected?.other_user_id === item.other_user_id && styles.conversationActive,
                ]}
                onPress={() => pickConversation(item)}
              >
                <Text style={styles.convName}>{item.other_user_name || 'User'}</Text>
                <Text style={styles.convRole}>{item.other_user_type || ''}</Text>
                <Text style={styles.convMsg} numberOfLines={1}>
                  {item.message_text || 'No message'}
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.empty}>No conversations.</Text>}
          />
        </View>

        <ScrollView style={styles.rightCol} contentContainerStyle={styles.rightContent}>
          {canCompose ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Compose</Text>
              <Input
                label="Recipient ID"
                value={compose.receiver_id}
                onChangeText={(value) => setCompose((prev) => ({ ...prev, receiver_id: value }))}
                placeholder={recipients[0] ? `Example: ${recipients[0].id}` : 'Recipient id'}
                keyboardType="number-pad"
              />
              <Input
                label="Subject"
                value={compose.subject}
                onChangeText={(value) => setCompose((prev) => ({ ...prev, subject: value }))}
              />
              <Input
                label="Message"
                value={compose.message_text}
                onChangeText={(value) => setCompose((prev) => ({ ...prev, message_text: value }))}
                multiline
                numberOfLines={4}
              />
              <Button title="Send Message" onPress={send} loading={sending} />
              {recipients.length > 0 && (
                <Text style={styles.helper}>
                  Available recipients: {recipients.slice(0, 5).map((item) => `${item.full_name} (#${item.id})`).join(', ')}
                </Text>
              )}
            </View>
          ) : null}

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              {selected ? `Conversation with ${selected.other_user_name}` : 'Conversation'}
            </Text>
            {messages.length === 0 ? (
              <Text style={styles.empty}>Select a conversation to view messages.</Text>
            ) : (
              messages.map((message) => {
                const mine = Number(message.sender_id) === Number(user?.id);
                return (
                  <View
                    key={message.id}
                    style={[styles.messageBubble, mine ? styles.myBubble : styles.otherBubble]}
                  >
                    {message.subject ? <Text style={styles.messageSubject}>{message.subject}</Text> : null}
                    <Text style={[styles.messageText, mine && styles.myBubbleText]}>
                      {message.message_text}
                    </Text>
                    <Text style={[styles.messageDate, mine && styles.myBubbleText]}>
                      {message.created_at ? new Date(message.created_at).toLocaleString() : ''}
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc', paddingTop: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loading: { color: '#64748b' },
  title: { textAlign: 'center', fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 10 },
  columns: { flex: 1, paddingHorizontal: 12 },
  leftCol: { maxHeight: 220, marginBottom: 10 },
  rightCol: { flex: 1 },
  rightContent: { paddingBottom: 20 },
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  conversation: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  conversationActive: { borderColor: '#60a5fa', backgroundColor: '#eff6ff' },
  convName: { fontWeight: '700', color: '#0f172a' },
  convRole: { color: '#64748b', fontSize: 12, marginTop: 2 },
  convMsg: { color: '#475569', fontSize: 12, marginTop: 4 },
  helper: { color: '#64748b', fontSize: 12, marginTop: 8 },
  messageBubble: {
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  myBubble: { backgroundColor: '#0284c7', alignSelf: 'flex-end', maxWidth: '92%' },
  otherBubble: { backgroundColor: '#f1f5f9', maxWidth: '92%' },
  messageSubject: { fontWeight: '700', marginBottom: 4, color: '#0f172a' },
  messageText: { color: '#0f172a' },
  myBubbleText: { color: '#ffffff' },
  messageDate: { marginTop: 4, fontSize: 11, color: '#64748b' },
  empty: { color: '#64748b' },
});

export default MessagesScreen;
