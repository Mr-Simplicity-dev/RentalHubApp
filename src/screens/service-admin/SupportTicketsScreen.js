import React, { useEffect, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/Ionicons';
import { serviceAdminService } from '../../services/serviceAdminService';
import { getErrorMessage, pickList } from '../../utils/http';
import { colors, radius, typography } from '../../theme';
import {
  DashboardHero,
  DashboardNotice,
  DashboardScreen,
  DashboardSection,
} from '../../components/dashboard/DashboardKit';

const STATUS_COLORS = {
  open: colors.blue,
  pending: '#A66B00',
  in_progress: '#7C3AED',
  resolved: colors.success,
  closed: colors.muted,
};

const SupportTicketsScreen = ({ navigation }) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const response = await serviceAdminService.getSupportTickets({ status: 'all' });
      setTickets(pickList(response, ['data', 'tickets']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Support unavailable',
        text2: getErrorMessage(error, 'Could not load support tickets'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  return (
    <DashboardScreen refreshing={loading} onRefresh={loadTickets}>
      <DashboardHero
        eyebrow="SUPPORT DESK"
        title="Ticket queue"
        subtitle="Review open conversations, unread customer replies and escalation status from a mobile-first queue."
        icon="headset-outline"
        onRefresh={loadTickets}
      />

      <DashboardNotice
        title="Conversation tools"
        message="Open any ticket for native replies, attachments, assignment, escalation, resolution and internal notes."
      />

      <DashboardSection title="Latest tickets">
        {loading && !tickets.length ? (
          <ActivityIndicator color={colors.blue} />
        ) : null}
        {!loading && !tickets.length ? (
          <Text style={styles.empty}>No support tickets in your current queue.</Text>
        ) : null}
        {tickets.map((ticket) => (
          <TouchableOpacity
            key={String(ticket.id)}
            accessibilityRole="button"
            style={styles.card}
            onPress={() =>
              navigation.navigate('SupportTicketDetail', {
                ticketId: ticket.id,
                ticket,
              })
            }
          >
            <View style={styles.cardTop}>
              <Text numberOfLines={1} style={styles.title}>
                {ticket.subject || `Support ticket #${ticket.id}`}
              </Text>
              <View style={[styles.badge, { backgroundColor: STATUS_COLORS[ticket.status] || colors.muted }]}>
                <Text style={styles.badgeText}>{ticket.status || 'open'}</Text>
              </View>
            </View>
            <Text numberOfLines={2} style={styles.description}>
              {ticket.description || ticket.category || 'No description supplied.'}
            </Text>
            <View style={styles.metaRow}>
              <Icon name="person-outline" size={14} color={colors.muted} />
              <Text numberOfLines={1} style={styles.meta}>
                {ticket.user_name || ticket.user_email || 'Customer'}
              </Text>
              {ticket.unread_user_replies ? (
                <Text style={styles.unread}>{ticket.unread_user_replies} unread</Text>
              ) : null}
            </View>
            {ticket.escalation_department ? (
              <Text style={styles.escalation}>
                Escalated to {String(ticket.escalation_department).replace(/_/g, ' ')}
              </Text>
            ) : null}
            <Text style={styles.openNative}>Open native conversation</Text>
          </TouchableOpacity>
        ))}
      </DashboardSection>
    </DashboardScreen>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 14,
  },
  cardTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  title: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.bold,
    fontSize: 16,
  },
  badge: {
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  badgeText: {
    color: colors.white,
    fontFamily: typography.semibold,
    fontSize: 13,
    textTransform: 'capitalize',
  },
  description: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    marginTop: 10,
  },
  meta: {
    color: colors.muted,
    flex: 1,
    fontFamily: typography.medium,
    fontSize: 13,
  },
  unread: {
    color: colors.danger,
    fontFamily: typography.semibold,
    fontSize: 13,
  },
  escalation: {
    color: '#A66B00',
    fontFamily: typography.semibold,
    fontSize: 13,
    marginTop: 8,
    textTransform: 'capitalize',
  },
  openNative: {
    color: colors.blue,
    fontFamily: typography.semibold,
    fontSize: 13,
    marginTop: 8,
  },
  empty: {
    color: colors.muted,
    fontFamily: typography.regular,
    lineHeight: 20,
  },
});

export default SupportTicketsScreen;
