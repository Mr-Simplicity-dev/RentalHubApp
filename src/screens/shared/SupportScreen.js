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
import { colors, radius, typography } from '../../theme';

import AppText from '../../components/common/AppText';
import { AuthContext } from '../../context/AuthContext';
import TourTarget from '../../components/tour/TourTarget';

const WHATSAPP_NUMBER = '2348030601238';

const SupportScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
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
          eyebrow="SUPPORT"
          title="Contact support"
          subtitle="Reach the Amana RentalHub support team for help with your account, properties, payments or anything else."
          icon="headset-outline"
        />
      </TourTarget>

      <DashboardSection title="Get in touch">
        <View style={styles.contactCard}>
          <View style={styles.contactHeader}>
            <View style={styles.contactIcon}>
              <Icon name="headset-outline" size={23} color={colors.gold} />
            </View>
            <View style={styles.contactCopy}>
              <AppText style={styles.contactTitle}>We are here to help</AppText>
              <AppText style={styles.contactText}>
                Our support team responds within 24 hours during business days.
              </AppText>
            </View>
          </View>
        </View>

        <ActionRow
          title="WhatsApp us"
          subtitle="Chat with us on WhatsApp for a quick response."
          icon="logo-whatsapp"
          onPress={openWhatsApp}
        />
        <ActionRow
          title="Contact us"
          subtitle="Send us a ticket and we will respond as soon as possible."
          icon="mail-outline"
          onPress={() => navigation.navigate('ContactWidget')}
        />
        <ActionRow
          title="Email support"
          subtitle="Reach us by email for detailed assistance."
          icon="mail-unread-outline"
          onPress={() => Linking.openURL('mailto:support@rentalhub.com.ng')}
        />
        <ActionRow
          title="Call us"
          subtitle="Speak with a support representative during business hours."
          icon="call-outline"
          onPress={() => Linking.openURL('tel:+2348001234567')}
        />
        <ActionRow
          title="Frequently asked questions"
          subtitle="Find quick answers to common questions."
          icon="help-circle-outline"
          onPress={() => navigation.navigate('Faq')}
        />
      </DashboardSection>

      <DashboardSection title="Report an issue">
        <View style={styles.infoCard}>
          <AppText style={styles.bullet}>•</AppText>
          <AppText style={styles.infoText}>
            If you are experiencing a problem with a property, payment or another user, you can file a dispute or property report from the relevant screen.
          </AppText>
        </View>
        <View style={styles.infoCard}>
          <AppText style={styles.bullet}>•</AppText>
          <AppText style={styles.infoText}>
            For urgent safety concerns, please contact local authorities and then reach out to support so we can take appropriate action on the platform.
          </AppText>
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
    fontSize: 16,
  },
  contactText: {
    color: '#B9C9E5',
    fontFamily: typography.regular,
    fontSize: 13,
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
    fontSize: 18,
    lineHeight: 22,
  },
  infoText: {
    color: colors.text,
    flex: 1,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 20,
  },
});

export default SupportScreen;
