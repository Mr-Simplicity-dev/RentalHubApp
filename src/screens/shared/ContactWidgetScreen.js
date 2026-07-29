import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import {View,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Linking,
  RefreshControl,} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import { launchImageLibrary } from 'react-native-image-picker';
import { AuthContext } from '../../context/AuthContext';
import { supportService } from '../../services/supportService';
import { guestSupportCredentialService } from '../../services/guestSupportCredentialService';
import { colors, radius, typography } from '../../theme';

import AppText from '../../components/common/AppText';
const MAX_FILE_SIZE = 15 * 1024 * 1024;

const getResponseData = (response) =>
  response?.data?.data ?? response?.data ?? null;

const isRejectedGuestCredential = (error) =>
  error?.response?.status === 401 || error?.response?.status === 404;

const STATES_AND_LGAS = {
  'Abia': ['Aba North', 'Aba South', 'Arochukwu', 'Bende', 'Ikwuano', 'Isiala Ngwa North', 'Isiala Ngwa South', 'Isuikwuato', 'Obi Ngwa', 'Ohafia', 'Osisioma Ngwa', 'Ugwunagbo', 'Ukwa East', 'Ukwa West', 'Umuahia North', 'Umuahia South', 'Umu Nneochi'],
  'Adamawa': ['Demsa', 'Fufure', 'Ganye', 'Gayuk', 'Girei', 'Gombi', 'Hong', 'Jada', 'Lamurde', 'Madagali', 'Maiha', 'Mayo Belwa', 'Michika', 'Mubi North', 'Mubi South', 'Numan', 'Shelleng', 'Song', 'Toungo', 'Yola North', 'Yola South'],
  'Akwa Ibom': ['Abak', 'Eastern Obolo', 'Eket', 'Esit Eket', 'Essien Udim', 'Etim Ekpo', 'Etinan', 'Ibeno', 'Ibesikpo Asutan', 'Ibiono Ibom', 'Ika', 'Ikono', 'Ikot Abasi', 'Ikot Ekpene', 'Ini', 'Itu', 'Mbo', 'Mkpat Enin', 'Nsit Atai', 'Nsit Ibom', 'Nsit Ubium', 'Obot Akara', 'Okobo', 'Onna', 'Oron', 'Oruk Anam', 'Udung Uko', 'Ukanafun', 'Uruan', 'Urue Offong/Oruko', 'Uyo'],
  'Anambra': ['Aguata', 'Anambra East', 'Anambra West', 'Anaocha', 'Awka North', 'Awka South', 'Ayamelum', 'Dunukofia', 'Ekwusigo', 'Idemili North', 'Idemili South', 'Ihiala', 'Njikoka', 'Nnewi North', 'Nnewi South', 'Ogbaru', 'Onitsha North', 'Onitsha South', 'Orumba North', 'Orumba South', 'Oyi'],
  'Bauchi': ['Alkaleri', 'Bauchi', 'Bogoro', 'Dass', 'Darazo', 'Gamawa', 'Ganjuwa', 'Giade', 'Itas/Gadau', 'Jama\'are', 'Katagum', 'Kirfi', 'Misau', 'Ningi', 'Shira', 'Tafawa Balewa', ' Toro', 'Warji', 'Zaki'],
  'Bayelsa': ['Brass', 'Ekeremor', 'Kolokuma/Opokuma', 'Nembe', 'Ogbia', 'Sagbama', 'Southern Ijaw', 'Yenagoa'],
  'Benue': ['Agatu', 'Apa', 'Akwanga', 'Awe', 'Benue', 'Buruku', 'Gboko', 'Guma', 'Gwer East', 'Gwer West', 'Katsina-Ala', 'Konshisha', 'Kwande', 'Logo', 'Makurdi', 'Obi', 'Ogbadibo', 'Ohimini', 'Oju', 'Okpokwu', 'Otukpo', 'Tarka', 'Ukum', 'Ushongo', 'Vandeikya'],
  'Borno': ['Abadam', 'Askira/Uba', 'Bama', 'Bayo', 'Biu', 'Chibok', 'Damboa', 'Dikwa', 'Gubio', 'Guzamala', 'Gwoza', 'Hawul', 'Jere', 'Kaga', 'Kala/Balge', 'Konduga', 'Kukawa', 'Kwaya Kusar', 'Mafa', 'Magumeri', 'Maiduguri', 'Marte', 'Mobbar', 'Monguno', 'Ngala', 'Nganzai', 'Shani'],
  'Cross River': ['Abi', 'Akamkpa', 'Akpabuyo', 'Bakassi', 'Bekwarra', 'Biase', 'Boki', 'Calabar Municipal', 'Calabar South', 'Etung', 'Ikom', 'Obanliku', 'Obudu', 'Odukpani', 'Ogoja', 'Yakuur', 'Yala'],
  'Delta': ['Aniocha North', 'Aniocha South', 'Bomadi', 'Burutu', 'Ethiope East', 'Ethiope West', 'Ika North East', 'Ika South', 'Isoko North', 'Isoko South', 'Ndokwa East', 'Ndokwa West', 'Okpe', 'Oshimili North', 'Oshimili South', 'Patani', 'Sapele', 'Udu', 'Ughelli North', 'Ughelli South', 'Ukwuani', 'Uvwie', 'Warri North', 'Warri South', 'Warri South West'],
  'Ebonyi': ['Abakaliki', 'Afikpo North', 'Afikpo South', 'Ebonyi', 'Ezza North', 'Ezza South', 'Ikwo', 'Ishielu', 'Ivo', 'Izzi', 'Ohaozara', 'Ohaukwu', 'Onicha'],
  'Edo': ['Akoko-Edo', 'Egor', 'Esan Central', 'Esan North-East', 'Esan South-East', 'Esan West', 'Etsako Central', 'Etsako East', 'Etsako West', 'Igueben', 'Ikpoba-Okha', 'Orhionmwon', 'Oredo', 'Owan East', 'Owan West', 'Uhunmwonde'],
  'Ekiti': ['Ado Ekiti', 'Efon', 'Ekiti East', 'Ekiti South-West', 'Ekiti West', 'Emure', 'Gbonyin', 'Ido Osi', 'Ijero', 'Ikere', 'Ikole', 'Ilejemeje', 'Irepodun/Ifelodun', 'Ise/Orun', 'Iwaroko', 'Moba', 'Oye'],
  'Enugu': ['Aninri', 'Awgu', 'Enugu East', 'Enugu North', 'Enugu South', 'Ezeagu', 'Igbo Etiti', 'Igbo Eze North', 'Igbo Eze South', 'Isi Uzo', 'Nkanu East', 'Nkanu West', 'Nsukka', 'Oji River', 'Udenu', 'Udi', 'Uzo-Uwani'],
  'FCT': ['Abaji', 'Bwari', 'Gwagwalada', 'Kuje', 'Kwali', 'Municipal Area Council'],
  'Gombe': ['Akko', 'Balanga', 'Billiri', 'Dukku', 'Funakaye', 'Gombe', 'Kaltungo', 'Kwami', 'Nafada', 'Shongom', 'Tafida Bade', 'Yamaltu/Deba'],
  'Imo': ['Aboh Mbaise', 'Ahiazu Mbaise', 'Ehime Mbano', 'Ezinihitte', 'Ideato North', 'Ideato South', 'Ihitte/Uboma', 'Ikeduru', 'Isiala Mbano', 'Isu', 'Mbaitoli', 'Ngor Okpala', 'Njaba', 'Nkwerre', 'Nwangele', 'Obowo', 'Oguta', 'Ohaji/Egbema', 'Okigwe', 'Onuimo', 'Orlu', 'Orsu', 'Oru East', 'Oru West', 'Owerri Municipal', 'Owerri North', 'Owerri West', 'Unuimo'],
  'Jigawa': ['Auyo', 'Babura', 'Biriniwa', 'Birnin Kudu', 'Buji', 'Dutse', 'Garki', 'Gumel', 'Guri', 'Gwaram', 'Gwiwa', 'Hadejia', 'Jahun', 'Kafin Hausa', 'Kazaure', 'Kiri Kasama', 'Kiyawa', 'Kaugama', 'Maigatari', 'Malam Madori', 'Miga', 'Roni', 'Sule Tankarkar', 'Taura', 'Yankwashi'],
  'Kaduna': ['Birnin Gwari', 'Chikun', 'Giwa', 'Igabi', 'Ikara', 'Jaba', 'Jema\'a', 'Kachia', 'Kaduna North', 'Kaduna South', 'Kagarko', 'Kajuru', 'Kaura', 'Kauru', 'Kubau', 'Kudan', 'Lere', 'Makarfi', 'Sanga', 'Soba', 'Zangon Kataf', 'Zaria'],
  'Kano': ['Ajingi', 'Albasu', 'Bagwai', 'Bebeji', 'Bichi', 'Bunkure', 'Dala', 'Dambatta', 'Dawakin Kudu', 'Dawakin Tofa', 'Doguwa', 'Fagge', 'Gabasawa', 'Garko', 'Garum Mallam', 'Gaya', 'Gezawa', 'Gwale', 'Gwarzo', 'Kabo', 'Kano Municipal', 'Karaye', 'Kibiya', 'Kiru', 'Kumbotso', 'Kunchi', 'Kura', 'Madobi', 'Makoda', 'Minjibiri', 'Rano', 'Rimin Gado', 'Rogo', 'Shanono', 'Sumaila', 'Takai', 'Tarauni', 'Tofa', 'Tsanyawa', 'Tudun Wada', 'Ungogo', 'Warawa', 'Wudil'],
  'Katsina': ['Batagarawa', 'Batsari', 'Baure', 'Bindawa', 'Charanchi', 'Dandume', 'Danja', 'Dan Musa', 'Daura', 'Dutsin-Ma', 'Faskari', 'Funtua', 'Ingawa', 'Jibia', 'Kafur', 'Kaita', 'Kankara', 'Kankia', 'Katsina', 'Kurfi', 'Kusada', 'Mai\'Adua', 'Malumfashi', 'Mani', 'Mashi', 'Matazu', 'Musawa', 'Rimi', 'Sabuwa', 'Safana', 'Sandamu', 'Zango'],
  'Kebbi': ['Aleiro', 'Arewa Dandi', 'Argungu', 'Augie', 'Bagudo', 'Birnin Kebbi', 'Bunza', 'Dandi', 'Fakai', 'Gwandu', 'Jega', 'Kalgo', 'Koko/Besse', 'Maiyama', 'Ngaski', 'Shanga', 'Suru', 'Wasagu/Danko', 'Yauri', 'Zuru'],
  'Kogi': ['Adavi', 'Ajaokuta', 'Ankpa', 'Bassa', 'Dekina', 'Ibaji', 'Idah', 'Igalamela Odolu', 'Ijumu', 'Kabba/Bunu', 'Kogi', 'Lokoja', 'Mopa-Muro', 'Ofu', 'Ogori/Magongo', 'Okehi', 'Okene', 'Olamaboro', 'Omala', 'Yagba East', 'Yagba West'],
  'Kwara': ['Asa', 'Baruten', 'Edu', 'Ekiti', 'Ifelodun', 'Ilorin East', 'Ilorin South', 'Ilorin West', 'Irepodun', 'Isin', 'Kaiama', 'Moro', 'Offa', 'Oke-Ero', 'Oyun', 'Pategi'],
  'Lagos': ['Agege', 'Ajeromi-Ifelodun', 'Alimosho', 'Amuwo-Odofin', 'Apapa', 'Badagry', 'Epe', 'Eti-Osa', 'Ibeju-Lekki', 'Ikeja', 'Ikorodu', 'Kosofe', 'Lagos Island', 'Lagos Mainland', 'Mushin', 'Ojo', 'Oshodi-Isolo', 'Shomolu', 'Surulere'],
  'Nasarawa': ['Akwanga', 'Awe', 'Doma', 'Karu', 'Keana', 'Keffi', 'Kokona', 'Lafia', 'Nasarawa', 'Nasarawa Egon', 'Obi', 'Toto', 'Wamba'],
  'Niger': ['Agaie', 'Agwara', 'Bida', 'Borgu', 'Bosso', 'Chanchaga', 'Edati', 'Gbako', 'Gurara', 'Katcha', 'Kontagora', 'Lapai', 'Lavun', 'Magama', 'Mariga', 'Mashegu', 'Mokwa', 'Munya', 'Paikoro', 'Rafi', 'Rijau', 'Shiroro', 'Suleja', 'Tafa', 'Wushishi'],
  'Ogun': ['Abeokuta North', 'Abeokuta South', 'Ado-Odo/Ota', 'Egbado North', 'Egbado South', 'Ewekoro', 'Ifo', 'Ijebu East', 'Ijebu North', 'Ijebu North East', 'Ijebu Ode', 'Ikenne', 'Imeko Afon', 'Ipokia', 'Obafemi Owode', 'Odeda', 'Odogbolu', 'Ogun Waterside', 'Remo North', 'Shagamu'],
  'Ondo': ['Akoko North-East', 'Akoko North-West', 'Akoko South-East', 'Akoko South-West', 'Akure North', 'Akure South', 'Ese Odo', 'Idanre', 'Ifedore', 'Ilaje', 'Ile Oluji/Okeigbo', 'Irele', 'Odigbo', 'Okitipupa', 'Ondo East', 'Ondo West', 'Ose', 'Owo'],
  'Osun': ['Atakumosa East', 'Atakumosa West', 'Boluwaduro', 'Boripe', 'Ede North', 'Ede South', 'Egbedore', 'Ejigbo', 'Ife Central', 'Ife East', 'Ife North', 'Ife South', 'Ifedayo', 'Ifelodun', 'Ila', 'Ilesa East', 'Ilesa West', 'Irepodun', 'Irewole', 'Isokan', 'Iwo', 'Obokun', 'Odo Otin', 'Ola Oluwa', 'Olorunda', 'Oriade', 'Orolu', 'Osogbo'],
  'Oyo': ['Afijio', 'Akinyele', 'Atiba', 'Atisbo', 'Egbeda', 'Ibadan North', 'Ibadan North-East', 'Ibadan North-West', 'Ibadan South-East', 'Ibadan South-West', 'Ibarapa Central', 'Ibarapa East', 'Ibarapa North', 'Ido', 'Irepo', 'Iseyin', 'Itesiwaju', 'Iwajowa', 'Kajola', 'Lagelu', 'Ogbomosho North', 'Ogbomosho South', 'Ogo Oluwa', 'Olorunsogo', 'Oluyole', 'Ona Ara', 'Orelope', 'Ori Ire', 'Oyo East', 'Oyo West', 'Saki East', 'Saki West', 'Surulere'],
  'Plateau': ['Barkin Ladi', 'Bassa', 'Bokkos', 'Jos East', 'Jos North', 'Jos South', 'Kanam', 'Kanke', 'Langtang North', 'Langtang South', 'Mangu', 'Mikang', 'Pankshin', 'Qua\'an Pan', 'Riyom', 'Shendam', 'Wase'],
  'Rivers': ['Abua/Odual', 'Ahoada East', 'Ahoada West', 'Akuku-Toru', 'Andoni', 'Asari-Toru', 'Bonny', 'Degema', 'Emohua', 'Eleme', 'Etche', 'Gokana', 'Ikwerre', 'Khana', 'Obio/Akpor', 'Ogba/Egbema/Ndoni', 'Ogu/Bolo', 'Okrika', 'Omuma', 'Opobo/Nkoro', 'Oyigbo', 'Port Harcourt', 'Tai'],
  'Sokoto': ['Binji', 'Bodinga', 'Dange Shuni', 'Gada', 'Goronyo', 'Gudu', 'Gwadabawa', 'Illela', 'Isah', 'Kebbe', 'Kware', 'Rabah', 'Sabon Birni', 'Shagari', 'Silame', 'Sokoto North', 'Sokoto South', 'Tambuwal', 'Tangaza', 'Tureta', 'Wamako', 'Wurno', 'Yabo'],
  'Taraba': ['Ardo Kola', 'Bali', 'Donga', 'Gashaka', 'Gumti', 'Ibi', 'Jalingo', 'Karim Lamido', 'Kurmi', 'Lau', 'Sardauna', 'Takum', 'Ussa', 'Wukari', 'Yorro', 'Zing'],
  'Yobe': ['Bade', 'Bursari', 'Damaturu', 'Fika', 'Fune', 'Geidam', 'Gujba', 'Gulani', 'Jakusko', 'Karasuwa', 'Machina', 'Nangere', 'Nguru', 'Potiskum', 'Tarmuwa', 'Yunusari', 'Yusufari'],
  'Zamfara': ['Anka', 'Bakura', 'Birnin Magaji/Kiyaw', 'Bukkum', 'Dunguri', 'Gummi', 'Gusau', 'Kaura Namoda', 'Kiyawa', 'Maradun', 'Maru', 'Shinkafi', 'Talata Mafara', 'Tsafe', 'Zurmi'],
};

const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'urgent'];

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return '';
  return `${formatDate(dateStr)} ${formatTime(dateStr)}`;
};

const STATUS_COLORS = {
  open: { bg: '#FEF3C7', text: '#D97706' },
  in_progress: { bg: '#DBEAFE', text: '#2563EB' },
  resolved: { bg: '#D1FAE5', text: '#059669' },
  closed: { bg: '#E5E7EB', text: '#6B7280' },
};

const ContactWidgetScreen = ({ navigation }) => {
  const { user, isAuthenticated } = useContext(AuthContext);

  const [view, setView] = useState('menu');
  const [form, setForm] = useState({ name: '', email: '', state: '', lga: '', subject: '', message: '', priority: 'medium' });
  const [sending, setSending] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [activeTicket, setActiveTicket] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [loadingConv, setLoadingConv] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [typingUser, setTypingUser] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [lookupEmail, setLookupEmail] = useState('');
  const [lookupTickets, setLookupTickets] = useState([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [viewingContactTicket, setViewingContactTicket] = useState(null);
  const [contactConv, setContactConv] = useState([]);
  const [contactReplyText, setContactReplyText] = useState('');
  const [contactReplyFile, setContactReplyFile] = useState(null);
  const [sendingContactReply, setSendingContactReply] = useState(false);
  const [adminTypingName, setAdminTypingName] = useState(null);
  const [adminViewingName, setAdminViewingName] = useState(null);

  const scrollRef = useRef(null);
  const typingTimerRef = useRef(null);
  const typingPollRef = useRef(null);

  useEffect(() => {
    return () => {
      clearTimeout(typingTimerRef.current);
      clearInterval(typingPollRef.current);
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated && user) {
      setForm((p) => ({ ...p, name: user.full_name || '', email: user.email || '' }));
    }
  }, [isAuthenticated, user]);

  const states = Object.keys(STATES_AND_LGAS);
  const lgas = STATES_AND_LGAS[form.state] || [];

  const fetchMyTickets = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoadingTickets(true);
    try {
      const res = await supportService.getMyTickets();
      setTickets(getResponseData(res) || []);
    } catch {} finally { setLoadingTickets(false); }
  }, [isAuthenticated]);

  useEffect(() => {
    if (view === 'tickets' && isAuthenticated) fetchMyTickets();
  }, [view, isAuthenticated, fetchMyTickets]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMyTickets();
    setRefreshing(false);
  }, [fetchMyTickets]);

  const loadConversation = useCallback(async (ticketId) => {
    setLoadingConv(true);
    try {
      const res = await supportService.getTicketConversation(ticketId, { limit: 200 });
      setConversation(getResponseData(res) || []);
    } catch { setConversation([]); } finally { setLoadingConv(false); }
  }, []);

  useEffect(() => {
    if (view === 'conversation' && activeTicket) {
      loadConversation(activeTicket.id);
    }
  }, [view, activeTicket, loadConversation]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [conversation, contactConv, scrollToBottom]);

  useEffect(() => {
    if (!viewingContactTicket || !lookupEmail.trim()) {
      setAdminTypingName(null);
      setAdminViewingName(null);
      clearInterval(typingPollRef.current);
      return;
    }
    const poll = async () => {
      try {
        const credential = await guestSupportCredentialService.get(viewingContactTicket.id);
        const proof = credential
          ? { guestAccessToken: credential.guestAccessToken }
          : { email: lookupEmail.trim() };
        const res = await supportService.getTypingStatus(viewingContactTicket.id, proof);
        setAdminTypingName(res?.typing?.userName || null);
        setAdminViewingName(res?.viewing?.userName || null);
      } catch (presenceError) {
        if (isRejectedGuestCredential(presenceError)) {
          await guestSupportCredentialService.remove(viewingContactTicket.id);
          clearInterval(typingPollRef.current);
        }
      }
    };
    poll();
    typingPollRef.current = setInterval(poll, 3000);
    return () => clearInterval(typingPollRef.current);
  }, [viewingContactTicket, lookupEmail]);

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.state || !form.message.trim()) {
      Toast.show({ type: 'error', text1: 'Please fill in name, email, state, and message.' });
      return;
    }
    setSending(true);
    try {
      const response = await supportService.contactSupport(form);
      const ticket = getResponseData(response);
      await guestSupportCredentialService.save({
        ticketId: ticket?.ticketId,
        guestAccessToken: ticket?.guestAccessToken,
        email: form.email,
      });
      Toast.show({ type: 'success', text1: 'Message sent!', text2: "We'll get back to you shortly." });
      setView('success');
    } catch (err) {
      Toast.show({ type: 'error', text1: err.response?.data?.message || 'Could not send message.' });
    } finally { setSending(false); }
  };

  const handleAuthenticatedCreate = async () => {
    if (!form.state) { Toast.show({ type: 'error', text1: 'Please select your state.' }); return; }
    if (!form.message.trim()) { Toast.show({ type: 'error', text1: 'Please write a message.' }); return; }
    setSending(true);
    try {
      const payload = {
        subject: form.subject?.trim() || 'Support request',
        description: form.message.trim(),
        state: form.state,
        lga: form.lga || undefined,
        priority: form.priority,
      };
      const res = await supportService.createTicket(payload);
      const newTicket = getResponseData(res);
      if (newTicket) {
        setActiveTicket(newTicket);
        setView('conversation');
        Toast.show({ type: 'success', text1: 'Ticket created' });
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: err.response?.data?.message || 'Failed to create ticket' });
    } finally { setSending(false); }
  };

  const handleSendReply = async () => {
    const msg = replyText.trim();
    if (!msg && !attachmentFile) return;
    const tempId = `temp_${Date.now()}`;
    const optimist = {
      id: tempId, message: msg, is_admin: false,
      author_name: user?.full_name, created_at: new Date().toISOString(),
      _temp: true,
    };
    if (attachmentFile) optimist.attachment_name = attachmentFile.fileName;
    setConversation((prev) => [...prev, optimist]);
    setReplyText('');
    setAttachmentFile(null);
    setSendingReply(true);
    try {
      const res = await supportService.replyToTicket(activeTicket.id, msg, attachmentFile);
      setConversation((prev) => prev.map((r) => r.id === tempId ? { ...getResponseData(res), _temp: false } : r));
    } catch {
      setConversation((prev) => prev.map((r) => r.id === tempId ? { ...r, _failed: true } : r));
      Toast.show({ type: 'error', text1: 'Failed to send reply' });
    } finally { setSendingReply(false); }
  };

  const handleLookup = async () => {
    if (!lookupEmail.trim()) return;
    setLookupLoading(true);
    setViewingContactTicket(null);
    setContactConv([]);
    try {
      const email = lookupEmail.trim();
      const credentials = (await guestSupportCredentialService.listForEmail(email)).slice(0, 10);
      let unexpectedError = null;

      const tokenResults = await Promise.all(credentials.map(async (credential) => {
        try {
          const response = await supportService.contactLookup({
            guestAccessToken: credential.guestAccessToken,
          });
          return getResponseData(response) || [];
        } catch (lookupError) {
          if (isRejectedGuestCredential(lookupError)) {
            await guestSupportCredentialService.remove(credential.ticketId);
            return [];
          }
          unexpectedError = lookupError;
          return [];
        }
      }));

      let legacyTickets = [];
      let legacyAccessDenied = false;
      try {
        const legacyResponse = await supportService.contactLookup({ email });
        legacyTickets = getResponseData(legacyResponse) || [];
      } catch (legacyError) {
        legacyAccessDenied = isRejectedGuestCredential(legacyError);
        if (!legacyAccessDenied) unexpectedError = unexpectedError || legacyError;
      }

      const ticketMap = new Map();
      [...tokenResults.flat(), ...legacyTickets].forEach((ticket) => {
        if (ticket?.id) ticketMap.set(ticket.id, ticket);
      });
      const nextTickets = Array.from(ticketMap.values())
        .sort((left, right) => new Date(right.created_at) - new Date(left.created_at));
      setLookupTickets(nextTickets);

      if (!nextTickets.length && unexpectedError) throw unexpectedError;
      if (!nextTickets.length && legacyAccessDenied && credentials.length === 0) {
        Toast.show({
          type: 'info',
          text1: 'Secure ticket access',
          text2: 'Guest tickets can only be reopened on the device where they were created.',
        });
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Could not load saved tickets. Try again.' });
    } finally { setLookupLoading(false); }
  };

  const viewContactConversation = async (ticket) => {
    try {
      const credential = await guestSupportCredentialService.get(ticket.id);
      const proof = credential
        ? { guestAccessToken: credential.guestAccessToken }
        : { email: lookupEmail.trim() };
      const res = await supportService.getContactConversation(ticket.id, proof);
      setViewingContactTicket(ticket);
      setContactConv(getResponseData(res) || []);
    } catch (conversationError) {
      if (isRejectedGuestCredential(conversationError)) {
        await guestSupportCredentialService.remove(ticket.id);
      }
      Toast.show({
        type: 'error',
        text1: 'Could not securely open this conversation.',
        text2: 'Start a new request if access has expired.',
      });
    }
  };

  const handleContactReply = async () => {
    const msg = contactReplyText.trim();
    if (!msg && !contactReplyFile) return;
    const tempId = `ct_${Date.now()}`;
    const optimist = {
      id: tempId, message: msg, is_admin: false,
      author_name: lookupEmail.trim(), created_at: new Date().toISOString(),
      _temp: true,
    };
    setContactConv((prev) => [...prev, optimist]);
    setContactReplyText('');
    setContactReplyFile(null);
    setSendingContactReply(true);
    try {
      const credential = await guestSupportCredentialService.get(viewingContactTicket.id);
      const proof = credential
        ? { guestAccessToken: credential.guestAccessToken }
        : { email: lookupEmail.trim() };
      const res = await supportService.contactReply(
        viewingContactTicket.id,
        proof,
        msg,
        contactReplyFile
      );
      setContactConv((prev) => prev.map((r) => r.id === tempId ? { ...getResponseData(res), _temp: false } : r));
    } catch (replyError) {
      if (isRejectedGuestCredential(replyError)) {
        await guestSupportCredentialService.remove(viewingContactTicket.id);
      }
      setContactConv((prev) => prev.map((r) => r.id === tempId ? { ...r, _failed: true } : r));
      Toast.show({ type: 'error', text1: 'Failed to send reply' });
    } finally { setSendingContactReply(false); }
  };

  const pickFile = async (setFile) => {
    try {
      const result = await launchImageLibrary({ mediaType: 'mixed', quality: 0.8 });
      if (result.didCancel) return;
      const asset = result.assets?.[0];
      if (!asset) return;
      if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE) {
        Toast.show({ type: 'error', text1: 'File must be under 15MB' });
        return;
      }
      setFile({
        uri: asset.uri,
        type: asset.type || 'application/octet-stream',
        fileName: asset.fileName || asset.uri.split('/').pop() || 'attachment',
      });
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to pick file' });
    }
  };

  const goBack = () => {
    if (view === 'conversation') {
      setActiveTicket(null);
      setConversation([]);
      setView(isAuthenticated ? 'tickets' : 'menu');
    } else if (view === 'check-status') {
      setView('menu');
    } else if (view === 'contact-conv') {
      setViewingContactTicket(null);
      setContactConv([]);
      setView('check-status');
    } else {
      setView('menu');
    }
  };

  const resetForm = () => {
    setForm({
      name: user?.full_name || '', email: user?.email || '',
      state: '', lga: '', subject: '', message: '', priority: 'medium',
    });
    setView('menu');
  };

  const renderHeader = () => (
    <View style={styles.header}>
      {view !== 'menu' && view !== 'success' && (
        <TouchableOpacity onPress={goBack} style={styles.headerBack}>
          <Icon name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
      )}
      <Icon name="headset-outline" size={20} color={colors.gold} />
      <View style={styles.headerText}>
        <AppText style={styles.headerTitle}>RentalHub Support</AppText>
        <AppText style={styles.headerSubtitle}>We typically reply within minutes</AppText>
      </View>
    </View>
  );

  const renderMenu = () => (
    <View style={styles.menuContainer}>
      <View style={styles.heroCard}>
        <View style={styles.heroIconWrap}>
          <Icon name="headset-outline" size={28} color={colors.gold} />
        </View>
        <AppText style={styles.heroTitle}>How can we help?</AppText>
        <AppText style={styles.heroText}>
          Submit a support request and our team will get back to you via email.
        </AppText>
      </View>

      <TouchableOpacity style={styles.menuRow} onPress={() => setView(isAuthenticated ? 'auth-form' : 'form')}>
        <View style={[styles.menuIcon, { backgroundColor: colors.surfaceBlue }]}>
          <Icon name="chatbubble-ellipses-outline" size={20} color={colors.blue} />
        </View>
        <View style={styles.menuRowText}>
          <AppText style={styles.menuRowTitle}>Start a conversation</AppText>
          <AppText style={styles.menuRowSub}>Send us a message about any issue</AppText>
        </View>
        <Icon name="chevron-forward" size={18} color={colors.muted} />
      </TouchableOpacity>

      {isAuthenticated && (
        <TouchableOpacity style={styles.menuRow} onPress={() => setView('tickets')}>
          <View style={[styles.menuIcon, { backgroundColor: '#FEF3C7' }]}>
            <Icon name="document-text-outline" size={20} color="#D97706" />
          </View>
          <View style={styles.menuRowText}>
            <AppText style={styles.menuRowTitle}>My tickets</AppText>
            <AppText style={styles.menuRowSub}>View and reply to your support tickets</AppText>
          </View>
          <Icon name="chevron-forward" size={18} color={colors.muted} />
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.menuRow} onPress={() => {
        setLookupEmail(isAuthenticated ? (user?.email || '') : '');
        setView('check-status');
      }}>
        <View style={[styles.menuIcon, { backgroundColor: '#D1FAE5' }]}>
          <Icon name="search-outline" size={20} color="#059669" />
        </View>
        <View style={styles.menuRowText}>
          <AppText style={styles.menuRowTitle}>Check ticket status</AppText>
          <AppText style={styles.menuRowSub}>Look up existing tickets by email</AppText>
        </View>
        <Icon name="chevron-forward" size={18} color={colors.muted} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuRow} onPress={() => Linking.openURL('mailto:support@rentalhub.com.ng')}>
        <View style={[styles.menuIcon, { backgroundColor: '#EDE9FE' }]}>
          <Icon name="mail-outline" size={20} color="#7C3AED" />
        </View>
        <View style={styles.menuRowText}>
          <AppText style={styles.menuRowTitle}>Email support</AppText>
          <AppText style={styles.menuRowSub}>support@rentalhub.com.ng</AppText>
        </View>
        <Icon name="chevron-forward" size={18} color={colors.muted} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuRow} onPress={() => Linking.openURL('tel:+2348001234567')}>
        <View style={[styles.menuIcon, { backgroundColor: '#FEE2E2' }]}>
          <Icon name="call-outline" size={20} color={colors.danger} />
        </View>
        <View style={styles.menuRowText}>
          <AppText style={styles.menuRowTitle}>Call us</AppText>
          <AppText style={styles.menuRowSub}>Business hours: Mon-Fri 9am-5pm</AppText>
        </View>
        <Icon name="chevron-forward" size={18} color={colors.muted} />
      </TouchableOpacity>
    </View>
  );

  const renderContactForm = () => (
    <View style={styles.formContainer}>
      <AppText style={styles.formHint}>Fill this form and we'll get back to you via email.</AppText>

      <AppText style={styles.label}>Name *</AppText>
      <TextInput
        style={styles.input}
        value={form.name}
        onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
        placeholder="Your name"
        placeholderTextColor={colors.muted}
      />

      <AppText style={styles.label}>Email *</AppText>
      <TextInput
        style={styles.input}
        value={form.email}
        onChangeText={(v) => setForm((p) => ({ ...p, email: v }))}
        placeholder="you@example.com"
        placeholderTextColor={colors.muted}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <AppText style={styles.label}>State *</AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        <View style={styles.chipRow}>
          {states.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.chip, form.state === s && styles.chipActive]}
              onPress={() => setForm((p) => ({ ...p, state: s, lga: '' }))}
            >
              <AppText style={[styles.chipText, form.state === s && styles.chipTextActive]}>{s}</AppText>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {lgas.length > 0 && (
        <>
          <AppText style={styles.label}>LGA</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            <View style={styles.chipRow}>
              {lgas.map((l) => (
                <TouchableOpacity
                  key={l}
                  style={[styles.chip, form.lga === l && styles.chipActive]}
                  onPress={() => setForm((p) => ({ ...p, lga: l }))}
                >
                  <AppText style={[styles.chipText, form.lga === l && styles.chipTextActive]}>{l}</AppText>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </>
      )}

      <AppText style={styles.label}>Subject</AppText>
      <TextInput
        style={styles.input}
        value={form.subject}
        onChangeText={(v) => setForm((p) => ({ ...p, subject: v }))}
        placeholder="How can we help?"
        placeholderTextColor={colors.muted}
      />

      <AppText style={styles.label}>Priority</AppText>
      <View style={styles.chipRow}>
        {PRIORITY_OPTIONS.map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.chip, form.priority === p && styles.chipActive]}
            onPress={() => setForm((pr) => ({ ...pr, priority: p }))}
          >
            <AppText style={[styles.chipText, form.priority === p && styles.chipTextActive]}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>

      <AppText style={styles.label}>Message *</AppText>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={form.message}
        onChangeText={(v) => setForm((p) => ({ ...p, message: v }))}
        placeholder="Tell us more..."
        placeholderTextColor={colors.muted}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      <TouchableOpacity
        style={[styles.primaryBtn, sending && styles.btnDisabled]}
        onPress={handleSubmit}
        disabled={sending}
      >
        {sending ? (
          <ActivityIndicator color={colors.white} size="small" />
        ) : (
          <>
            <Icon name="paper-plane" size={16} color={colors.white} />
            <AppText style={styles.primaryBtnText}>Send message</AppText>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => {
        setLookupEmail(form.email || '');
        setView('check-status');
      }}>
        <AppText style={styles.linkText}>Already contacted us? Check your ticket status</AppText>
      </TouchableOpacity>
    </View>
  );

  const renderAuthForm = () => (
    <View style={styles.formContainer}>
      <AppText style={styles.formHint}>Start a new conversation</AppText>

      <View style={styles.infoRow}>
        <View style={styles.infoBox}>
          <AppText style={styles.infoLabel}>Name</AppText>
          <AppText style={styles.infoValue} numberOfLines={1}>{user?.full_name || form.name}</AppText>
        </View>
        <View style={styles.infoBox}>
          <AppText style={styles.infoLabel}>Email</AppText>
          <AppText style={styles.infoValue} numberOfLines={1}>{user?.email || form.email}</AppText>
        </View>
      </View>

      <AppText style={styles.label}>State *</AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        <View style={styles.chipRow}>
          {states.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.chip, form.state === s && styles.chipActive]}
              onPress={() => setForm((p) => ({ ...p, state: s, lga: '' }))}
            >
              <AppText style={[styles.chipText, form.state === s && styles.chipTextActive]}>{s}</AppText>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {lgas.length > 0 && (
        <>
          <AppText style={styles.label}>LGA</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            <View style={styles.chipRow}>
              {lgas.map((l) => (
                <TouchableOpacity
                  key={l}
                  style={[styles.chip, form.lga === l && styles.chipActive]}
                  onPress={() => setForm((p) => ({ ...p, lga: l }))}
                >
                  <AppText style={[styles.chipText, form.lga === l && styles.chipTextActive]}>{l}</AppText>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </>
      )}

      <AppText style={styles.label}>Subject (optional)</AppText>
      <TextInput
        style={styles.input}
        value={form.subject}
        onChangeText={(v) => setForm((p) => ({ ...p, subject: v }))}
        placeholder="Subject"
        placeholderTextColor={colors.muted}
      />

      <AppText style={styles.label}>Priority</AppText>
      <View style={styles.chipRow}>
        {PRIORITY_OPTIONS.map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.chip, form.priority === p && styles.chipActive]}
            onPress={() => setForm((pr) => ({ ...pr, priority: p }))}
          >
            <AppText style={[styles.chipText, form.priority === p && styles.chipTextActive]}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>

      <AppText style={styles.label}>Message *</AppText>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={form.message}
        onChangeText={(v) => setForm((p) => ({ ...p, message: v }))}
        placeholder="How can we help you?"
        placeholderTextColor={colors.muted}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      <TouchableOpacity
        style={[styles.primaryBtn, sending && styles.btnDisabled]}
        onPress={handleAuthenticatedCreate}
        disabled={sending}
      >
        {sending ? (
          <ActivityIndicator color={colors.white} size="small" />
        ) : (
          <>
            <Icon name="paper-plane" size={16} color={colors.white} />
            <AppText style={styles.primaryBtnText}>Start conversation</AppText>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderSuccess = () => (
    <View style={styles.successContainer}>
      <View style={styles.successIcon}>
        <Icon name="checkmark-circle" size={56} color={colors.success} />
      </View>
      <AppText style={styles.successTitle}>Message sent!</AppText>
      <AppText style={styles.successSub}>We'll get back to you shortly.</AppText>
      <TouchableOpacity style={styles.secondaryBtn} onPress={resetForm}>
        <AppText style={styles.secondaryBtnText}>Back to menu</AppText>
      </TouchableOpacity>
    </View>
  );

  const renderTicketList = () => (
    <View style={styles.listContainer}>
      <AppText style={styles.sectionTitle}>YOUR TICKETS</AppText>
      {loadingTickets ? (
        <ActivityIndicator color={colors.blue} style={{ marginTop: 24 }} />
      ) : tickets.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="document-text-outline" size={40} color={colors.border} />
          <AppText style={styles.emptyText}>No tickets yet.</AppText>
          <TouchableOpacity onPress={() => setView('auth-form')}>
            <AppText style={styles.linkText}>Start a new conversation</AppText>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.blue} />}
        >
          {tickets.map((ticket) => {
            const sc = STATUS_COLORS[ticket.status] || STATUS_COLORS.open;
            return (
              <TouchableOpacity
                key={ticket.id}
                style={styles.ticketCard}
                onPress={() => { setActiveTicket(ticket); setView('conversation'); }}
              >
                <View style={styles.ticketHeader}>
                  <AppText style={styles.ticketSubject} numberOfLines={1}>{ticket.subject}</AppText>
                  <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                    <AppText style={[styles.statusText, { color: sc.text }]}>{ticket.status?.replace(/_/g, ' ')}</AppText>
                  </View>
                </View>
                <AppText style={styles.ticketMeta}>#{ticket.id} · {formatDate(ticket.created_at)}</AppText>
                {ticket.unread_admin_replies > 0 && (
                  <View style={styles.unreadBadge}>
                    <AppText style={styles.unreadText}>{ticket.unread_admin_replies} new</AppText>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );

  const renderChatBubble = (msg, isOwn) => {
    const isAudio = msg.attachment_type && msg.attachment_type.startsWith('audio/');
    return (
      <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
        {!isOwn && msg.author_name && (
          <AppText style={styles.bubbleAuthor}>{msg.author_name}</AppText>
        )}
        {msg.message ? <AppText style={[styles.bubbleText, isOwn && styles.bubbleTextOwn]}>{msg.message}</AppText> : null}
        {isAudio && msg.attachment_url ? (
          <TouchableOpacity
            style={styles.attachmentChip}
            onPress={() => Linking.openURL(msg.attachment_url)}
          >
            <Icon name="mic" size={12} color={isOwn ? colors.white : colors.blue} />
            <AppText style={[styles.attachmentText, isOwn && { color: colors.white }]}>Voice message</AppText>
          </TouchableOpacity>
        ) : msg.attachment_url ? (
          <TouchableOpacity
            style={styles.attachmentChip}
            onPress={() => Linking.openURL(msg.attachment_url)}
          >
            <Icon name="document-outline" size={12} color={isOwn ? colors.white : colors.blue} />
            <AppText style={[styles.attachmentText, isOwn && { color: colors.white }]} numberOfLines={1}>
              {msg.attachment_name || 'Attachment'}
            </AppText>
          </TouchableOpacity>
        ) : null}
        <AppText style={[styles.bubbleTime, isOwn && styles.bubbleTimeOwn]}>
          {formatTime(msg.created_at)}{msg._temp ? ' · Sending...' : ''}
        </AppText>
        {msg._failed && (
          <AppText style={styles.failedText}>Failed to send</AppText>
        )}
      </View>
    );
  };

  const renderConversation = () => (
    <View style={styles.conversationContainer}>
      <View style={styles.convSubject}>
        <AppText style={styles.convSubjectText} numberOfLines={1}>{activeTicket?.subject}</AppText>
        {activeTicket?.status && (() => {
          const sc = STATUS_COLORS[activeTicket.status] || STATUS_COLORS.open;
          return (
            <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
              <AppText style={[styles.statusText, { color: sc.text }]}>{activeTicket.status?.replace(/_/g, ' ')}</AppText>
            </View>
          );
        })()}
      </View>

      <ScrollView style={styles.convScroll} ref={scrollRef}>
        {loadingConv ? (
          <ActivityIndicator color={colors.blue} style={{ marginTop: 24 }} />
        ) : conversation.length === 0 ? (
          <AppText style={styles.emptyConvText}>No messages yet.</AppText>
        ) : (
          conversation.map((reply) => (
            <View key={reply.id} style={styles.bubbleWrap}>
              {renderChatBubble(reply, !reply.is_admin)}
            </View>
          ))
        )}
        {typingUser && (
          <View style={styles.typingRow}>
            <AppText style={styles.typingText}>{typingUser.userName || 'Admin'} is typing...</AppText>
          </View>
        )}
      </ScrollView>

      {activeTicket?.status !== 'resolved' && (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {attachmentFile && (
            <View style={styles.filePreview}>
              <Icon name="document-outline" size={14} color={colors.text} />
              <AppText style={styles.filePreviewText} numberOfLines={1}>{attachmentFile.fileName}</AppText>
              <TouchableOpacity onPress={() => setAttachmentFile(null)}>
                <Icon name="close-circle" size={16} color={colors.danger} />
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.replyBar}>
            <TouchableOpacity style={styles.attachBtn} onPress={() => pickFile(setAttachmentFile)}>
              <Icon name="attach-outline" size={20} color={colors.muted} />
            </TouchableOpacity>
            <TextInput
              style={styles.replyInput}
              value={replyText}
              onChangeText={setReplyText}
              placeholder="Type a message..."
              placeholderTextColor={colors.muted}
              multiline
              maxLength={2000}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!replyText.trim() && !attachmentFile) && styles.sendBtnDisabled]}
              onPress={handleSendReply}
              disabled={sendingReply || (!replyText.trim() && !attachmentFile)}
            >
              {sendingReply ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Icon name="paper-plane" size={18} color={colors.white} />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );

  const renderCheckStatus = () => (
    <View style={styles.formContainer}>
      <AppText style={styles.formHint}>Enter the email you used to contact us.</AppText>
      <TextInput
        style={styles.input}
        value={lookupEmail}
        onChangeText={setLookupEmail}
        placeholder="your@email.com"
        placeholderTextColor={colors.muted}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TouchableOpacity
        style={[styles.primaryBtn, lookupLoading && styles.btnDisabled]}
        onPress={handleLookup}
        disabled={lookupLoading}
      >
        {lookupLoading ? (
          <ActivityIndicator color={colors.white} size="small" />
        ) : (
          <AppText style={styles.primaryBtnText}>Check Tickets Status</AppText>
        )}
      </TouchableOpacity>

      {lookupTickets.length > 0 && (
        <View style={{ marginTop: 12 }}>
          <AppText style={styles.sectionTitle}>YOUR TICKETS</AppText>
          {lookupTickets.map((ticket) => {
            const isViewing = viewingContactTicket?.id === ticket.id;
            const sc = STATUS_COLORS[ticket.status] || STATUS_COLORS.open;
            return (
              <View key={ticket.id}>
                <TouchableOpacity
                  style={[styles.ticketCard, isViewing && styles.ticketCardActive]}
                  onPress={() => viewContactConversation(ticket)}
                >
                  <View style={styles.ticketHeader}>
                    <AppText style={styles.ticketSubject} numberOfLines={1}>{ticket.subject}</AppText>
                    <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                      <AppText style={[styles.statusText, { color: sc.text }]}>{ticket.status}</AppText>
                    </View>
                  </View>
                  <AppText style={styles.ticketMeta}>{formatDate(ticket.created_at)}</AppText>
                </TouchableOpacity>

                {isViewing && (
                  <View style={styles.contactConvWrap}>
                    {contactConv.length === 0 ? (
                      <AppText style={styles.emptyConvText}>No replies yet.</AppText>
                    ) : (
                      contactConv.map((r) => (
                        <View key={r.id} style={[styles.contactBubble, r.is_admin ? styles.contactBubbleAdmin : styles.contactBubbleUser, r._failed && styles.contactBubbleFailed]}>
                          {r.is_admin && <AppText style={styles.contactBubbleAuthor}>{r.author_name || 'Support'}</AppText>}
                          {r.message ? <AppText style={styles.contactBubbleMsg}>{r.message}</AppText> : null}
                          {r.attachment_url ? (
                            <TouchableOpacity onPress={() => Linking.openURL(r.attachment_url)}>
                              <AppText style={styles.contactBubbleLink}>{r.attachment_name || 'Attachment'}</AppText>
                            </TouchableOpacity>
                          ) : null}
                          <AppText style={styles.contactBubbleTime}>
                            {formatDateTime(r.created_at)}{r._temp ? ' · Sending...' : ''}
                          </AppText>
                          {r._failed && <AppText style={styles.failedText}>Failed</AppText>}
                        </View>
                      ))
                    )}

                    {adminViewingName && (
                      <View style={styles.statusIndicator}>
                        <View style={styles.dotGreen} />
                        <AppText style={styles.statusIndicatorText}>{adminViewingName} is viewing this conversation</AppText>
                      </View>
                    )}
                    {adminTypingName && (
                      <View style={styles.statusIndicator}>
                        <View style={styles.dotBlue} />
                        <AppText style={[styles.statusIndicatorText, { color: colors.blue }]}>{adminTypingName} is typing...</AppText>
                      </View>
                    )}

                    {contactReplyFile && (
                      <View style={styles.filePreview}>
                        <Icon name="document-outline" size={14} color={colors.text} />
                        <AppText style={styles.filePreviewText} numberOfLines={1}>{contactReplyFile.fileName}</AppText>
                        <TouchableOpacity onPress={() => setContactReplyFile(null)}>
                          <Icon name="close-circle" size={16} color={colors.danger} />
                        </TouchableOpacity>
                      </View>
                    )}
                    <View style={styles.replyBar}>
                      <TouchableOpacity style={styles.attachBtn} onPress={() => pickFile(setContactReplyFile)}>
                        <Icon name="attach-outline" size={20} color={colors.muted} />
                      </TouchableOpacity>
                      <TextInput
                        style={styles.replyInput}
                        value={contactReplyText}
                        onChangeText={setContactReplyText}
                        placeholder="Type a reply..."
                        placeholderTextColor={colors.muted}
                        multiline
                        maxLength={2000}
                      />
                      <TouchableOpacity
                        style={[styles.sendBtn, (!contactReplyText.trim() && !contactReplyFile) && styles.sendBtnDisabled]}
                        onPress={handleContactReply}
                        disabled={sendingContactReply || (!contactReplyText.trim() && !contactReplyFile)}
                      >
                        {sendingContactReply ? (
                          <ActivityIndicator color={colors.white} size="small" />
                        ) : (
                          <Icon name="paper-plane" size={18} color={colors.white} />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      {lookupTickets.length === 0 && !lookupLoading && lookupEmail.trim() && (
        <AppText style={styles.emptyConvText}>No tickets found for this email.</AppText>
      )}

      <TouchableOpacity onPress={() => setView('menu')}>
        <AppText style={styles.linkText}>Start a new conversation</AppText>
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {renderHeader()}

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        {view === 'menu' && renderMenu()}
        {view === 'form' && renderContactForm()}
        {view === 'auth-form' && renderAuthForm()}
        {view === 'success' && renderSuccess()}
        {view === 'tickets' && renderTicketList()}
        {view === 'conversation' && renderConversation()}
        {view === 'check-status' && renderCheckStatus()}
      </ScrollView>
    </KeyboardAvoidingView>
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
    backgroundColor: colors.navy,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  headerBack: {
    marginRight: 2,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    color: colors.white,
    fontFamily: typography.semibold,
    fontSize: 16,
  },
  headerSubtitle: {
    color: '#B9C9E5',
    fontFamily: typography.regular,
    fontSize: 13,
    marginTop: 1,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingBottom: 40,
  },

  menuContainer: {
    padding: 16,
    gap: 12,
  },
  heroCard: {
    backgroundColor: colors.navy,
    borderRadius: radius.md,
    padding: 20,
    alignItems: 'center',
    marginBottom: 4,
  },
  heroIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.navySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    color: colors.white,
    fontFamily: typography.bold,
    fontSize: 18,
    marginBottom: 6,
  },
  heroText: {
    color: '#B9C9E5',
    fontFamily: typography.regular,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuRowText: {
    flex: 1,
  },
  menuRowTitle: {
    fontFamily: typography.semibold,
    fontSize: 14,
    color: colors.ink,
  },
  menuRowSub: {
    fontFamily: typography.regular,
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },

  formContainer: {
    padding: 16,
    gap: 4,
  },
  formHint: {
    fontFamily: typography.regular,
    fontSize: 13,
    color: colors.muted,
    marginBottom: 8,
  },
  label: {
    fontFamily: typography.medium,
    fontSize: 13,
    color: colors.text,
    marginTop: 10,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: typography.regular,
    fontSize: 14,
    color: colors.ink,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  chipScroll: {
    marginBottom: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  chipActive: {
    backgroundColor: colors.blue,
    borderColor: colors.blue,
  },
  chipText: {
    fontFamily: typography.medium,
    fontSize: 13,
    color: colors.text,
  },
  chipTextActive: {
    color: colors.white,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.blue,
    borderRadius: radius.sm,
    paddingVertical: 14,
    gap: 8,
    marginTop: 16,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    fontFamily: typography.semibold,
    fontSize: 16,
    color: colors.white,
  },
  secondaryBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  secondaryBtnText: {
    fontFamily: typography.medium,
    fontSize: 14,
    color: colors.blue,
  },
  linkText: {
    fontFamily: typography.medium,
    fontSize: 13,
    color: colors.blue,
    textAlign: 'center',
    marginTop: 16,
  },

  successContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  successIcon: {
    marginBottom: 16,
  },
  successTitle: {
    fontFamily: typography.bold,
    fontSize: 18,
    color: colors.ink,
  },
  successSub: {
    fontFamily: typography.regular,
    fontSize: 14,
    color: colors.muted,
    marginTop: 6,
  },

  infoRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  infoBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 10,
  },
  infoLabel: {
    fontFamily: typography.regular,
    fontSize: 13,
    color: colors.muted,
    marginBottom: 2,
  },
  infoValue: {
    fontFamily: typography.semibold,
    fontSize: 13,
    color: colors.ink,
  },

  listContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontFamily: typography.semibold,
    fontSize: 13,
    color: colors.muted,
    letterSpacing: 1.25,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  emptyText: {
    fontFamily: typography.regular,
    fontSize: 14,
    color: colors.muted,
  },
  ticketCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 10,
  },
  ticketCardActive: {
    borderColor: colors.blue,
    backgroundColor: colors.surfaceBlue,
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ticketSubject: {
    fontFamily: typography.semibold,
    fontSize: 14,
    color: colors.ink,
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  statusText: {
    fontFamily: typography.semibold,
    fontSize: 13,
    textTransform: 'capitalize',
  },
  ticketMeta: {
    fontFamily: typography.regular,
    fontSize: 13,
    color: colors.muted,
    marginTop: 6,
  },
  unreadBadge: {
    backgroundColor: '#FEE2E2',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.pill,
    marginTop: 6,
  },
  unreadText: {
    fontFamily: typography.semibold,
    fontSize: 13,
    color: colors.danger,
  },

  conversationContainer: {
    flex: 1,
  },
  convSubject: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  convSubjectText: {
    fontFamily: typography.semibold,
    fontSize: 13,
    color: colors.text,
    flex: 1,
  },
  convScroll: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  emptyConvText: {
    fontFamily: typography.regular,
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    paddingVertical: 24,
  },
  bubbleWrap: {
    marginBottom: 10,
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleOwn: {
    backgroundColor: colors.blue,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: colors.white,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleAuthor: {
    fontFamily: typography.semibold,
    fontSize: 13,
    color: colors.blue,
    marginBottom: 2,
  },
  bubbleText: {
    fontFamily: typography.regular,
    fontSize: 14,
    color: colors.ink,
    lineHeight: 20,
  },
  bubbleTextOwn: {
    color: colors.white,
  },
  bubbleTime: {
    fontFamily: typography.regular,
    fontSize: 13,
    color: colors.muted,
    marginTop: 4,
  },
  bubbleTimeOwn: {
    color: '#B9C9E5',
    textAlign: 'right',
  },
  attachmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 6,
    gap: 6,
  },
  attachmentText: {
    fontFamily: typography.medium,
    fontSize: 13,
    color: colors.white,
    flex: 1,
  },
  failedText: {
    fontFamily: typography.regular,
    fontSize: 13,
    color: '#FCA5A5',
    marginTop: 2,
  },
  typingRow: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  typingText: {
    fontFamily: typography.regular,
    fontSize: 13,
    color: colors.muted,
    fontStyle: 'italic',
  },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  replyInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: typography.regular,
    fontSize: 14,
    color: colors.ink,
    maxHeight: 100,
  },
  attachBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  filePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 12,
    marginBottom: 6,
    gap: 8,
  },
  filePreviewText: {
    flex: 1,
    fontFamily: typography.regular,
    fontSize: 13,
    color: colors.text,
  },

  contactConvWrap: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    marginLeft: 12,
    marginRight: 4,
    marginTop: 6,
    marginBottom: 10,
  },
  contactBubble: {
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  contactBubbleAdmin: {
    backgroundColor: colors.surfaceBlue,
    borderWidth: 1,
    borderColor: '#D0E0FF',
  },
  contactBubbleUser: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  contactBubbleFailed: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  contactBubbleAuthor: {
    fontFamily: typography.semibold,
    fontSize: 13,
    color: colors.blue,
    marginBottom: 2,
  },
  contactBubbleMsg: {
    fontFamily: typography.regular,
    fontSize: 13,
    color: colors.ink,
    lineHeight: 19,
  },
  contactBubbleLink: {
    fontFamily: typography.medium,
    fontSize: 13,
    color: colors.blue,
    marginTop: 4,
    textDecorationLine: 'underline',
  },
  contactBubbleTime: {
    fontFamily: typography.regular,
    fontSize: 13,
    color: colors.muted,
    marginTop: 4,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  dotGreen: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  dotBlue: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.blue,
  },
  statusIndicatorText: {
    fontFamily: typography.regular,
    fontSize: 13,
    color: colors.success,
    fontStyle: 'italic',
  },
});

export default ContactWidgetScreen;
