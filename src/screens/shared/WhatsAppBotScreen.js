import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import React, { useContext, useState, useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, SafeAreaView, Linking, ActivityIndicator } from 'react-native';
import TextInput from '../../components/common/AppTextInput';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors, radius, typography, typeScale } from '../../theme';

import {AuthContext} from '../../context/AuthContext';
import {askAccountAssistant,askPublicAssistant,submitAssistantTicket,needsAccount} from '../../services/accountAssistantService';
import AppText from '../../components/common/AppText';
const WHATSAPP_NUMBER = '2348030601238';
const BOT_DELAY = 1000;

const CONFIRM_WORDS = ['yes', 'yeah', 'yep', 'okay', 'ok', 'sure', 'alright', 'please', 'yea', 'go ahead'];
const MENU_WORDS = ['menu', 'options', 'back', 'show options', 'show menu', 'what can you do', 'help'];
const NO_WORDS = ['no', 'nope', 'nah', 'not really', 'nothing', "that's all", 'that is all', 'no thanks', 'all good', "im good", "i'm good", 'not now'];
const THANKS_WORDS = ['thanks', 'thank you', 'thank', 'thx', 'cool', 'ok thanks', 'okay thanks', 'alright thanks', 'got it', 'understood', 'i see'];

const whatsappFaqData = [
  {
    id: 'find-property',
    keywords: ['find', 'property', 'search', 'apartment', 'house', 'home', 'rent', 'looking', 'available', 'listing'],
    answer: "You can search for properties by State and LGA right on our homepage. Each listing shows photos, price, features, and the landlord's verification status. You can also request a physical or virtual tour directly from the property page.",
  },
  {
    id: 'list-property',
    keywords: ['list', 'listing', 'landlord', 'post', 'advertise', 'add property', 'rent out', 'lease'],
    answer: 'To list your property, create an account and select "List a Property" from your dashboard. All listings go through a quick verification process to ensure quality and trust. Once verified, your property will be visible to thousands of potential tenants.',
  },
  {
    id: 'payment',
    keywords: ['payment', 'pay', 'fee', 'escrow', 'money', 'cost', 'price', 'charge', 'transaction', 'secure', 'safe'],
    answer: 'The available payment options and fees are shown before confirmation. Sign in and check Payment History for the exact status and reference. Avoid repeating a payment while its status is uncertain.',
  },
  {
    id: 'legal',
    keywords: ['legal', 'lawyer', 'attorney', 'protection', 'coverage', 'law', 'document', 'agreement', 'dispute', 'nba', 'access fee', '2000'],
    answer: 'Paid coverage is required for private assistance requests. Check your coverage status from your dashboard; registration shows any applicable coverage fee before payment.',
  },
  {
    id: 'fumigation',
    keywords: ['fumigation', 'fumigate', 'pest', 'spray', 'insect', 'treatment', 'booking', 'clean'],
    answer: 'You can book fumigation services directly from your dashboard. Select "Book Fumigation", pick your preferred date and time, and a verified service provider will be dispatched to your property.',
  },
  {
    id: 'transport',
    keywords: ['transport', 'moving', 'move', 'truck', 'delivery', 'logistics', 'shipping', 'van', 'haul'],
    answer: 'Need to move items? You can book transport services through your dashboard. Select "Book Transport" to arrange moving for your belongings to or from your property at competitive rates.',
  },
  {
    id: 'account',
    keywords: ['account', 'password', 'login', 'sign in', 'reset', 'forgot', 'access', 'profile', 'update', 'change'],
    answer: 'If you\'re having trouble with your account, use the "Forgot Password" link on the login page to reset your password. You can update your profile information from your account settings after logging in.',
  },
  {
    id: 'support',
    keywords: ['support', 'help', 'contact', 'agent', 'human', 'person', 'talk', 'speak', 'customer service', 'representative', 'issue', 'problem', 'complaint'],
    answer: 'Tell me which screen you are using and what went wrong. I can help narrow the problem and check records after you sign in. If it remains unresolved, we can prepare a support ticket or request a person.',
  },
  {
    id: 'registration',
    keywords: ['register', 'sign up', 'create account', 'join', 'tenant', 'landlord', 'signup', 'how to join'],
    answer: 'Choose a tenant or landlord account and complete the registration form. The current registration and optional coverage fees are shown before payment.',
  },
  {
    id: 'verification',
    keywords: ['verify', 'verification', 'verified', 'badge', 'trust', 'authentic', 'genuine', 'identity', 'document'],
    answer: 'Property listings and user accounts go through a verification process to ensure authenticity. Verified properties and users are marked with a blue check badge, so you know you\'re dealing with a trusted party.',
  },
];

const findBestMatch = (userInput) => {
  const words = userInput.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;

  let bestMatch = null;
  let bestScore = 0;

  for (const faq of whatsappFaqData) {
    let score = 0;
    const inputStr = userInput.toLowerCase();
    for (const keyword of faq.keywords) {
      if (keyword.includes(' ')) {
        if (inputStr.includes(keyword)) score += 3;
      } else {
        if (words.includes(keyword)) score += 2;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = faq;
    }
  }

  return bestScore >= 2 ? bestMatch : null;
};

const isConfirmation = (text) => {
  const clean = text.toLowerCase().replace(/[^a-z ]/g, '').trim();
  return CONFIRM_WORDS.some((w) => clean === w || clean.startsWith(w + ' ') || clean.endsWith(' ' + w));
};

const isMenuRequest = (text) => {
  const clean = text.toLowerCase().replace(/[^a-z ]/g, '').trim();
  return MENU_WORDS.some((w) => clean === w);
};

const isNegative = (text) => {
  const clean = text.toLowerCase().replace(/[^a-z ]/g, '').trim();
  return NO_WORDS.some((w) => clean === w || clean.startsWith(w + ' ') || clean.endsWith(' ' + w));
};

const isAcknowledgment = (text) => {
  const clean = text.toLowerCase().replace(/[^a-z ]/g, '').trim();
  return THANKS_WORDS.some((w) => clean === w || clean.startsWith(w + ' ') || clean.endsWith(' ' + w));
};

const QUICK_REPLIES = [
  'How do I find a property?',
  'How do I list my property?',
  'Tell me about Legal Protection',
  'How does payment work?',
];

const WhatsAppBotScreen = ({ navigation, embedded=false, onHumanRequest }) => {
  useInterfaceLanguage();
  const {user,isAuthenticated}=useContext(AuthContext);
  const authKey=isAuthenticated?String(user?.id || '')+':'+user?.user_type:'guest';
  const authKeyRef=useRef(authKey);authKeyRef.current=authKey;
  const requestBusy=useRef(false);const topicRef=useRef(null);
  const [requestPending,setRequestPending]=useState(false);
  useEffect(()=>{setMessages([]);setInput('');setAwaitingResponse(null);setConnectedToAgent(false);topicRef.current=null;},[authKey]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [connectedToAgent, setConnectedToAgent] = useState(false);
  const [awaitingResponse, setAwaitingResponse] = useState(null);

  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const mountedRef = useRef(true);
  const awaitingRef = useRef(awaitingResponse);

  const formatTime = (d) => {
    const date = new Date(d);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  useEffect(() => {
    awaitingRef.current = awaitingResponse;
  }, [awaitingResponse]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    setIsBotTyping(true);
    const timer = setTimeout(() => {
      if (mountedRef.current) {
        setMessages([{
          id: 'bot-greeting',
          type: 'bot',
          text: "Hi! I'm Amana RentalHub's virtual assistant. How can I help you today?",
          showQuickReplies: true,
          created_at: new Date().toISOString(),
        }]);
        setIsBotTyping(false);
      }
    }, BOT_DELAY);
    return () => {
      mountedRef.current = false;
      clearTimeout(timer);
    };
  }, [authKey]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isBotTyping, scrollToBottom]);

  const addBotMessage = useCallback((text, faq, showQR) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `bot-${Date.now()}`,
        type: 'bot',
        owner: authKeyRef.current,
        text,
        created_at: new Date().toISOString(),
        engine:faq?.engine || 'guided',
        ticketDraft: faq?.ticketDraft || null,
        link: faq?.link || null,
        linkText: faq?.linkText || null,
        showQuickReplies: showQR || false,
      },
    ]);
  }, []);

  const addUserMessage = useCallback((text) => {
    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, type: 'user', owner: authKeyRef.current, text, created_at: new Date().toISOString() },
    ]);
  }, []);

  const botReplyWithTyping = useCallback((callback) => {
    setTimeout(() => {
      if (!mountedRef.current) return;
      setIsBotTyping(true);
    }, 200);
    setTimeout(() => {
      if (!mountedRef.current) return;
      setIsBotTyping(false);
      callback();
    }, BOT_DELAY + 500);
  }, []);

  const showMenu = useCallback(() => {
    setAwaitingResponse(null);
    inputRef.current?.blur();
    botReplyWithTyping(() => {
      addBotMessage('Sure! What would you like to know about?', null, true);
    });
  }, [addBotMessage, botReplyWithTyping]);

  const askAnythingElse = useCallback(() => {
    setAwaitingResponse('anything_else');
    setTimeout(() => {
      if (!mountedRef.current) return;
      setIsBotTyping(true);
      setTimeout(() => {
        if (!mountedRef.current) return;
        setIsBotTyping(false);
        addBotMessage('Is there anything else I can help you with?');
      }, 600);
    }, 600);
  }, [addBotMessage]);

  const handleTalkToAgent = useCallback(() => {
    if(onHumanRequest){onHumanRequest({summary:messages.filter(m=>m.type==='user' && (!m.owner || m.owner===authKeyRef.current)).slice(-3).map(m=>m.text).join('\n')});return;}
    setConnectedToAgent(true);
    setAwaitingResponse(null);
    const waMsg = 'Hello Amana RentalHub NG, I need help finding a home.';
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waMsg)}`;
    Linking.openURL(url).catch(() => {});
  }, [onHumanRequest,messages]);

  const tryAccountReply = useCallback(async msg => {
    if(!isAuthenticated || !['tenant','landlord'].includes(user?.user_type)) {
      if(needsAccount(msg)){addBotMessage('Sign in to ask about your account or submit a support ticket.',{link:'/login',linkText:'Sign in to your account'});return true;}return false;
    }
    const key=authKeyRef.current;requestBusy.current=true;setRequestPending(true);setIsBotTyping(true);
    try {
      const answer=await askAccountAssistant(msg,{history:messages.filter(m=>m.type==='user').slice(-4).map(m=>({role:'user',content:m.text.slice(0,1000)})),...(awaitingRef.current==='ticket_details'?{mode:'ticket'}:{}),...(topicRef.current?{previousTopic:topicRef.current}:{})});
      if(!mountedRef.current || key!==authKeyRef.current)return true;
      if(!answer || typeof answer.handled!=='boolean')throw new Error('Invalid assistant response');
      if(!answer.handled)return false;
      if(answer.topic)topicRef.current=answer.topic;
      setAwaitingResponse(answer.needsDetails?'ticket_details':null);addBotMessage(answer.text,answer);return true;
    } catch {if(!needsAccount(msg) && findBestMatch(msg) && awaitingRef.current!=='ticket_details' && !/^(why|when|what about)\b/i.test(msg))return false;if(mountedRef.current && key===authKeyRef.current)addBotMessage('I could not verify your account records. Please try again or open support. No ticket has been submitted by this question.',{link:'/support',linkText:'Open support'});return true;}
    finally {requestBusy.current=false;if(mountedRef.current){setRequestPending(false);setIsBotTyping(false);}}
  },[isAuthenticated,user?.user_type,addBotMessage,messages]);
  const submitTicket = useCallback(async message => {
    if(requestBusy.current || !message.ticketDraft || (message.owner && message.owner!==authKeyRef.current) || !isAuthenticated)return;
    const key=authKeyRef.current;requestBusy.current=true;setRequestPending(true);
    setMessages(items=>items.map(item=>item.id===message.id?{...item,ticketDraft:null}:item));
    try {const ticket=await submitAssistantTicket(message.ticketDraft);if(mountedRef.current && key===authKeyRef.current)addBotMessage('Your support ticket #'+ticket.id+' has been submitted. Status: '+(ticket.status || 'open')+'.',{link:'/support',linkText:'View my support tickets'});}
    catch {if(mountedRef.current && key===authKeyRef.current)addBotMessage('I could not confirm whether the ticket was saved. Check your support tickets before submitting again to avoid duplicates.',{link:'/support',linkText:'Check my support tickets'});}
    finally {requestBusy.current=false;if(mountedRef.current)setRequestPending(false);}
  },[isAuthenticated,addBotMessage]);
  const openCard = link => {
    if(link==='/careers?type=volunteer')return navigation.navigate('Careers',{type:'volunteer'});
    if(link==='/dashboard')return navigation.navigate('MainTabs',{screen:'DashboardTab'});
    if(link==='/applications')return navigation.navigate('MainTabs',{screen:'Applications'});
    const screens={'/careers':'Careers','/cases':'Cases','/forgot-password':'ForgotPassword','/refund-requests':'RefundRequests','/login':'Login','/register':'Register','/properties':'PropertyList','/my-properties':'MyProperties','/profile':'Profile','/subscribe':'Subscribe','/payment-history':'PaymentHistory','/support':'Support','/assistance':'Assistance','/rent-savings':'RentSavingsDashboard','/my-disputes':'MyDisputes','/transportation/bookings':'TransportationBookings','/fumigation-cleaning/bookings':'FumigationCleaningBookings'};
    if(screens[link])navigation.navigate(screens[link]);
  };
  const handleSend = useCallback(
    async (text) => {
      if(requestBusy.current)return;
      const msg = (text || input).trim();
      if (!msg) return;
      setInput('');
      addUserMessage(msg);
      if(/\b(human|person|agent|representative)\b/i.test(msg) && /\b(talk|speak|connect|want|need)\b/i.test(msg)){handleTalkToAgent();return;}

      const currentAwaiting = awaitingRef.current;

      if (currentAwaiting === 'anything_else' && isConfirmation(msg)) {
        setAwaitingResponse(null);
        botReplyWithTyping(() => {
          addBotMessage('Sure! What would you like to know about?', null, true);
        });
        return;
      }

      if (isMenuRequest(msg)) {
        setAwaitingResponse(null);
        botReplyWithTyping(() => {
          addBotMessage('Sure! What would you like to know about?', null, true);
        });
        return;
      }

      if (isNegative(msg)) {
        setAwaitingResponse(null);
        botReplyWithTyping(() => {
          addBotMessage('Alright! Feel free to come back anytime.');
        });
        return;
      }

      if (currentAwaiting === 'handoff' && isConfirmation(msg)) {
        botReplyWithTyping(() => {
          handleTalkToAgent();
        });
        return;
      }

      if (isAcknowledgment(msg)) {
        setAwaitingResponse(null);
        botReplyWithTyping(() => {
          addBotMessage("You're welcome! Happy to help.");
        });
        return;
      }

      if(await tryAccountReply(msg))return;
      setAwaitingResponse(null);

      const match = /\b(error|failed|cannot|can.t|not work|not working|problem|issue|charged|stuck|502)\b/i.test(msg)?null:findBestMatch(msg);
      if (match) {
        botReplyWithTyping(() => {
          const reply=isAuthenticated && ['registration','list-property'].includes(match.id)?{answer:'You are already signed in. Manage your account and available actions from your dashboard.',link:'/dashboard',linkText:'Open my dashboard'}:{...match,...({ 'find-property':{link:'/properties',linkText:'Search properties'},'registration':{link:'/register',linkText:'Create an account'},'list-property':{link:'/register',linkText:'Create an account'},'support':{link:'/support',linkText:'Open support'} }[match.id] || {})};
          addBotMessage(reply.answer, reply);
          askAnythingElse();
        });
      } else {
        const key=authKeyRef.current;requestBusy.current=true;setRequestPending(true);setIsBotTyping(true);
        try {const answer=await askPublicAssistant(msg,{history:messages.filter(m=>m.type==='user').slice(-4).map(m=>({role:'user',content:m.text.slice(0,1000)}))});if(mountedRef.current && key===authKeyRef.current)addBotMessage(answer.text,answer);}
        catch {if(mountedRef.current && key===authKeyRef.current)addBotMessage('Tell me the screen and error shown. Check Payment History before retrying a payment. If the problem continues, I can help prepare a ticket.',{link:'/support',linkText:'Support options'});}
        finally {requestBusy.current=false;if(mountedRef.current){setRequestPending(false);setIsBotTyping(false);}}
      }
    },
    [input, addUserMessage, addBotMessage, botReplyWithTyping, askAnythingElse, handleTalkToAgent, tryAccountReply, isAuthenticated,messages]
  );

  const handleQuickReply = question => handleSend(question);
  const quickReplies=isAuthenticated?['My wallet balance','My payments','My verification status','My support tickets','Create a ticket']:QUICK_REPLIES;

  const renderBubble = (msg) => {
    const isUser = msg.type === 'user';
    return (
      <View key={msg.id} style={[styles.bubbleRow, isUser && styles.bubbleRowUser]}>
        {!isUser && (
          <View style={styles.botAvatar}>
            <Icon name="chatbubble-ellipses" size={14} color={colors.white} />
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
          {!isUser && (
            <AppText style={styles.botLabel}>RentalHub{msg.engine==='ai'?ui(' · AI guidance'):msg.engine==="verified"?ui(' · Account record'):''}</AppText>
          )}
          <AppText style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>
            {msg.text}
          </AppText>
          {msg.created_at && (
            <AppText style={[styles.bubbleTime, isUser && styles.bubbleTimeUser]}>
              {formatTime(msg.created_at)}
            </AppText>
          )}
          {msg.ticketDraft && <TouchableOpacity disabled={requestPending} style={styles.qrChip} onPress={()=>submitTicket(msg)}><AppText style={styles.qrChipText}>{ui("Submit ticket")}</AppText></TouchableOpacity>}
          {msg.link && <TouchableOpacity style={styles.qrChip} onPress={()=>openCard(msg.link)}><AppText style={styles.qrChipText}>{msg.linkText || ui('Open page')}</AppText></TouchableOpacity>}
          {msg.showQuickReplies && (
            <View style={styles.quickRepliesWrap}>
              {quickReplies.map((qr, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.qrChip}
                  onPress={() => handleQuickReply(qr)}
                  activeOpacity={0.7}
                >
                  <AppText style={styles.qrChipText}>{qr}</AppText>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        {isUser && (
          <View style={[styles.userAvatar]}>
            <Icon name="person" size={14} color={colors.white} />
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.root}>
      {!embedded && <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack}>
          <Icon name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <View style={styles.headerIconWrap}>
          <Icon name="logo-whatsapp" size={18} color={colors.white} />
        </View>
        <View style={styles.headerText}>
          <AppText style={styles.headerTitle}>{ui("Amana RentalHub Assistant")}</AppText>
          <AppText style={styles.headerSubtitle}>{ui("Need help? Chat with us!")}</AppText>
        </View>
      </View>}

      <View style={styles.chatArea}>
        <ScrollView
          ref={scrollRef}
          style={styles.messagesScroll}
          contentContainerStyle={styles.messagesContent}
          keyboardShouldPersistTaps="handled"
        >
          {messages.filter(message=>!message.owner || message.owner===authKey).map(renderBubble)}

          {isBotTyping && (
            <View style={[styles.bubbleRow]}>
              <View style={styles.botAvatar}>
                <Icon name="chatbubble-ellipses" size={14} color={colors.white} />
              </View>
              <View style={[styles.bubble, styles.bubbleBot, styles.typingBubble]}>
                <View style={styles.typingDots}>
                  <View style={[styles.dot, styles.dotAnim1]} />
                  <View style={[styles.dot, styles.dotAnim2]} />
                  <View style={[styles.dot, styles.dotAnim3]} />
                </View>
              </View>
            </View>
          )}

          {connectedToAgent && (
            <View style={styles.agentCard}>
              <Icon name="headset-outline" size={24} color={colors.success} />
              <AppText style={styles.agentTitle}>{ui("WhatsApp opened")}</AppText>
              <AppText style={styles.agentSub}>{ui("Continue with support there. Your account session is not transferred.")}</AppText>
            </View>
          )}
          <TouchableOpacity style={styles.qrChip} onPress={handleTalkToAgent}><AppText style={styles.qrChipText}>{ui("Talk to a person")}</AppText></TouchableOpacity>
        </ScrollView>

        {!connectedToAgent && (
          <View style={styles.menuBtnWrap}>
            <TouchableOpacity style={styles.menuBtn} onPress={showMenu} activeOpacity={0.7}>
              <Icon name="list" size={14} color={colors.success} />
              <AppText style={styles.menuBtnText}>{ui("Menu")}</AppText>
            </TouchableOpacity>
          </View>
        )}

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <View style={styles.inputBar}>
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              value={input}
              onChangeText={setInput}
              placeholder={ui("Type your question...")}
              placeholderTextColor={colors.muted}
              editable={!requestPending}
              onSubmitEditing={() => handleSend()}
              returnKeyType="send"
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!input.trim() || connectedToAgent) && styles.sendBtnDisabled]}
              onPress={() => handleSend()}
              disabled={!input.trim() || requestPending}
              activeOpacity={0.7}
            >
              <Icon name="paper-plane" size={18} color={colors.white} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#25D366',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  headerBack: {
    marginRight: 2,
  },
  headerIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    color: colors.white,
    fontFamily: typography.semibold,
    fontSize: typeScale.base,
    lineHeight: 24,
  },
  headerSubtitle: {
    color: '#E8FFF0',
    fontFamily: typography.regular,
    fontSize: typeScale.reading,
    lineHeight: 22,
    marginTop: 1,
  },
  chatArea: {
    flex: 1,
    backgroundColor: '#ECE5DD',
  },
  messagesScroll: {
    flex: 1,
  },
  messagesContent: {
    padding: 14,
    paddingBottom: 8,
  },
  bubbleRow: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'flex-end',
  },
  bubbleRowUser: {
    justifyContent: 'flex-end',
  },
  botAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  userAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  bubble: {
    maxWidth: '75%',
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleBot: {
    backgroundColor: colors.white,
    borderBottomLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: '#DCF8C6',
    borderBottomRightRadius: 4,
  },
  botLabel: {
    fontFamily: typography.semibold,
    fontSize: typeScale.xs,
    lineHeight: 18,
    color: '#25D366',
    marginBottom: 3,
  },
  bubbleText: {
    fontFamily: typography.regular,
    fontSize: typeScale.reading,
    color: colors.ink,
    lineHeight: 24,
  },
  bubbleTextUser: {
    color: colors.ink,
  },
  bubbleTime: {
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    lineHeight: 18,
    color: colors.muted,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  bubbleTimeUser: {
    color: '#6B8E50',
  },
  quickRepliesWrap: {
    marginTop: 10,
    gap: 6,
  },
  qrChip: {
    borderWidth: 1,
    borderColor: '#25D366',
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.white,
  },
  qrChipText: {
    fontFamily: typography.medium,
    fontSize: typeScale.xs,
    lineHeight: 18,
    color: '#128C7E',
  },
  typingBubble: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  typingDots: {
    flexDirection: 'row',
    gap: 5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#999',
  },
  dotAnim1: { opacity: 0.4 },
  dotAnim2: { opacity: 0.6 },
  dotAnim3: { opacity: 0.8 },
  agentCard: {
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#A5D6A7',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginHorizontal: 36,
    marginVertical: 12,
  },
  agentTitle: {
    fontFamily: typography.semibold,
    fontSize: typeScale.sm,
    lineHeight: 20,
    color: '#1B5E20',
    marginTop: 8,
    textAlign: 'center',
  },
  agentSub: {
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    lineHeight: 18,
    color: '#4CAF50',
    marginTop: 4,
    textAlign: 'center',
  },
  menuBtnWrap: {
    alignItems: 'center',
    paddingVertical: 6,
    backgroundColor: '#ECE5DD',
  },
  menuBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  menuBtnText: {
    fontFamily: typography.medium,
    fontSize: typeScale.xs,
    lineHeight: 18,
    color: '#25D366',
    textDecorationLine: 'underline',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#F0F0F0',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: typography.regular,
    fontSize: typeScale.sm,
    lineHeight: 20,
    color: colors.ink,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: radius.sm,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
});

export default WhatsAppBotScreen;
