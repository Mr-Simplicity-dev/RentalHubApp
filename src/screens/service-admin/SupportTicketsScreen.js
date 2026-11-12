import languageCatalog from '../../data/nigerianLanguages.json';
import api from '../../services/api';
import TextInput from '../../components/common/AppTextInput';
import Button from '../../components/common/Button';
import {AuthContext} from '../../context/AuthContext';


import React, { useEffect, useLayoutEffect, useState, useContext, useRef } from 'react';
import {ActivityIndicator, StyleSheet, TouchableOpacity, View} from 'react-native';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/Ionicons';
import { serviceAdminService } from '../../services/serviceAdminService';
import { getErrorMessage, pickList } from '../../utils/http';
import { colors, radius, typography, typeScale } from '../../theme';
import AppText from '../../components/common/AppText';
import TourTarget from '../../components/tour/TourTarget';
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
  const interfaceLanguage = 'en';
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: navigation.canGoBack() });
  }, [navigation, interfaceLanguage]);

  const {user}=useContext(AuthContext);
  const [search,setSearch]=useState('');
  const sequence=useRef(0);
  const loadTickets = async () => {
    const current=++sequence.current;
    setLoading(true);
    try {
      const response = search.trim()?(await api.post('/support/tickets/search',{search:search.trim()})).data:await serviceAdminService.getSupportTickets({ status: 'all' });
      if(current!==sequence.current)return;
      setTickets(pickList(response, ['data', 'tickets']));
    } catch (error) {
      if(current!==sequence.current)return;
      Toast.show({
        type: 'error',
        text1: "Support unavailable",
        text2: getErrorMessage(error, 'Could not load support tickets'),
      });
    } finally {
      if(current===sequence.current)setLoading(false);
    }
  };

  useEffect(() => {
    setTickets([]);setSearch('');loadTickets();
    return()=>{sequence.current++;};
  }, [user?.id]);

  return (
    <DashboardScreen refreshing={loading} onRefresh={loadTickets}>
      <TourTarget id="support_tickets" padding={6} radius={18}>
        <DashboardHero
          eyebrow={"SUPPORT DESK"}
          title={"Ticket queue"}
          subtitle={"Review open conversations, unread customer replies and escalation status from a mobile-first queue."}
          icon="headset-outline"
          onRefresh={loadTickets}
        />
      </TourTarget>

      <DashboardNotice
        title={"Conversation tools"}
        message={"Open any ticket for native replies, attachments, assignment, escalation, resolution and internal notes."}
      />

      <View style={{gap:8}}><AppText>Find customer queries</AppText><TextInput value={search} onChangeText={setSearch} placeholder="Name, phone, email or ticket" autoCapitalize="none" accessibilityLabel="Search customers and tickets" style={{borderWidth:1,borderColor:colors.border,borderRadius:12,padding:12,color:colors.ink}}/><Button title="Search tickets" onPress={loadTickets} disabled={loading}/></View>
      <DashboardSection title={"Latest tickets"}>
        {loading && !tickets.length ? (
          <ActivityIndicator color={colors.blue} />
        ) : null}
        {!loading && !tickets.length ? (
          <AppText style={styles.empty}>{"No support tickets in your current queue."}</AppText>
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
              <AppText numberOfLines={1} style={styles.title}>
                {ticket.subject || `Support ticket #${ticket.id ?? "{value0}"}`}
              </AppText>
              <View style={[styles.badge, { backgroundColor: STATUS_COLORS[ticket.status] || colors.muted }]}>
                <AppText style={styles.badgeText}>{ticket.status || "open"}</AppText>
              </View>
            </View>
            <AppText numberOfLines={2} style={styles.description}>
              {ticket.description || ticket.category || 'No description supplied.'}
            </AppText>
            <AppText>Language: {languageCatalog.languages.find(x=>x.id===ticket.preferred_language)?.name||'Not selected'}</AppText>
            <View style={styles.metaRow}>
              <Icon name="person-outline" size={14} color={colors.muted} />
              <AppText numberOfLines={1} style={styles.meta}>
                {ticket.user_name || ticket.user_email || "Customer"}
              </AppText>
              {ticket.unread_user_replies ? (
                <AppText style={styles.unread}>{ticket.unread_user_replies}{" unread"}</AppText>
              ) : null}
            </View>
            {ticket.escalation_department ? (
              <AppText style={styles.escalation}>{"Escalated to"}{String(ticket.escalation_department).replace(/_/g, ' ')}
              </AppText>
            ) : null}
            <AppText style={styles.openNative}>{"Open native conversation"}</AppText>
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
    fontSize: typeScale.base,
    lineHeight: 24,
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
    fontSize: typeScale.reading,
    lineHeight: 22,
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
    fontSize: typeScale.xs,
    lineHeight: 18,
  },
  unread: {
    color: colors.danger,
    fontFamily: typography.semibold,
    fontSize: typeScale.xs,
    lineHeight: 18,
  },
  escalation: {
    color: '#A66B00',
    fontFamily: typography.semibold,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginTop: 8,
    textTransform: 'capitalize',
  },
  openNative: {
    color: colors.blue,
    fontFamily: typography.semibold,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginTop: 8,
  },
  empty: {
    color: colors.muted,
    fontFamily: typography.regular,
    lineHeight: 20,
  },
});

export default SupportTicketsScreen;
