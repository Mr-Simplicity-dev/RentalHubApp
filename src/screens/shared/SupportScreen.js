import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import React, { useContext } from 'react';
import {Linking, StyleSheet, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {
  ActionRow,
  DashboardHero,
  DashboardScreen,
  DashboardSection,
} from '../../components/dashboard/DashboardKit';
import BrandMark from '../../components/brand/BrandMark';
import { colors, radius, typography, typeScale } from '../../theme';

import AppText from '../../components/common/AppText';
import { AuthContext } from '../../context/AuthContext';
import TourTarget from '../../components/tour/TourTarget';

const WHATSAPP_NUMBER = '2348030601238';

const SupportScreen = ({ navigation }) => {
  useInterfaceLanguage();
  const { user, isAuthenticated } = useContext(AuthContext);
  const tourId = user?.user_type === 'landlord' ? 'landlord_support' : 'tenant_support';

  const openWhatsApp = () => {
    const message = encodeURIComponent('Hello Amana RentalHub, I need support.');
    Linking.openURL(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`);
  };

  return (
    <DashboardScreen>
      <TourTarget id={tourId} padding={6} radius={18}>
        <View style={styles.brandRow}>
          <BrandMark compact />
        </View>
        <DashboardHero
          eyebrow={ui("SUPPORT")}
          title={ui("Support centre")}
          subtitle={ui("Reach the Amana RentalHub support team for help with your account, properties, payments or anything else.")}
          icon="headset-outline"
        />
      </TourTarget>

      <DashboardSection title={ui("Help and support")}>
        <ActionRow title={ui("Chat assistant")} subtitle={ui("Ask questions about RentalHub or your signed-in account.")} icon="chatbubbles-outline" onPress={() => navigation.navigate('WhatsAppBot')} />
        <ActionRow title={ui("Submit a support ticket")} subtitle={ui("Describe a problem and send it to our support team.")} icon="create-outline" onPress={() => navigation.navigate('ContactWidget', {initialView:'form'})} />
        {isAuthenticated ? <ActionRow title={ui("My support tickets")} subtitle={ui("Check progress, read replies and continue your conversations.")} icon="document-text-outline" onPress={() => navigation.navigate('ContactWidget', {initialView:'tickets'})} /> : null}
        <ActionRow title={ui("Live support and in-app calls")} subtitle={ui("Open the support conversation and calling options.")} icon="headset-outline" onPress={() => navigation.navigate('ContactWidget')} />
        {isAuthenticated && ['tenant','landlord'].includes(user?.user_type) ? <>
          <ActionRow title={ui("Coverage assistance")} tourTarget={user?.user_type==='landlord'?'landlord_assistance':'tenant_assistance'} subtitle={ui("Check paid coverage and request private assistance.")} icon="shield-checkmark-outline" onPress={() => navigation.navigate('Assistance')} />
        </> : null}
      </DashboardSection>

      <DashboardSection title={ui("Get in touch")}>
        <View style={styles.contactCard}>
          <View style={styles.contactHeader}>
            <View style={styles.contactIcon}>
              <Icon name="headset-outline" size={23} color={colors.gold} />
            </View>
            <View style={styles.contactCopy}>
              <AppText style={styles.contactTitle}>{ui("We are here to help")}</AppText>
              <AppText style={styles.contactText}>{ui("Choose the support option that fits your issue. You can follow ticket replies in the app.")}</AppText>
            </View>
          </View>
        </View>

        <ActionRow
          title={ui("WhatsApp us")}
          subtitle={ui("Chat with us on WhatsApp for a quick response.")}
          icon="logo-whatsapp"
          onPress={openWhatsApp}
        />

        <ActionRow
          title={ui("Email support")}
          subtitle={ui("Reach us by email for detailed assistance.")}
          icon="mail-unread-outline"
          onPress={() => Linking.openURL('mailto:support@rentalhub.com.ng')}
        />

        <ActionRow
          title={ui("Frequently asked questions")}
          subtitle={ui("Find quick answers to common questions.")}
          icon="help-circle-outline"
          onPress={() => navigation.navigate('Faq')}
        />
      </DashboardSection>

      <DashboardSection title={ui("Report an issue")}>
        <View style={styles.infoCard}>
          <AppText style={styles.bullet}>•</AppText>
          <AppText style={styles.infoText}>{ui("If you are experiencing a problem with a property, payment or another user, you can file a dispute or property report from the relevant screen.")}</AppText>
        </View>
        <View style={styles.infoCard}>
          <AppText style={styles.bullet}>•</AppText>
          <AppText style={styles.infoText}>{ui("For urgent safety concerns, please contact local authorities and then reach out to support so we can take appropriate action on the platform.")}</AppText>
        </View>
      </DashboardSection>
    </DashboardScreen>
  );
};

const styles = StyleSheet.create({
  brandRow: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  contactCard: {
    backgroundColor: colors.navy,
    borderRadius: radius.md,
    padding: 16,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  contactIcon: {
    alignItems: 'center',
    backgroundColor: colors.navySoft,
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  contactCopy: {
    flex: 1,
    marginLeft: 12,
  },
  contactTitle: {
    color: colors.white,
    fontFamily: typography.bold,
    fontSize: typeScale.base,
    lineHeight: 24,
  },
  contactText: {
    color: '#B9C9E5',
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginTop: 4,
  },
  infoCard: {
    alignItems: 'flex-start',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 14,
  },
  bullet: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: typeScale.md,
    lineHeight: 26,
  },
  infoText: {
    color: colors.text,
    flex: 1,
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    lineHeight: 18,
  },
});

export default SupportScreen;
