import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {
  ActionRow,
  DashboardHero,
  DashboardScreen,
  DashboardSection,
} from '../../components/dashboard/DashboardKit';
import { colors, radius, typography } from '../../theme';

const SupportScreen = ({ navigation }) => {
  return (
    <DashboardScreen>
      <DashboardHero
        eyebrow="SUPPORT"
        title="Contact support"
        subtitle="Reach the RentalHub support team for help with your account, properties, payments or anything else."
        icon="headset-outline"
      />

      <DashboardSection title="Get in touch">
        <View style={styles.contactCard}>
          <View style={styles.contactHeader}>
            <View style={styles.contactIcon}>
              <Icon name="headset-outline" size={23} color={colors.gold} />
            </View>
            <View style={styles.contactCopy}>
              <Text style={styles.contactTitle}>We are here to help</Text>
              <Text style={styles.contactText}>
                Our support team responds within 24 hours during business days.
              </Text>
            </View>
          </View>
        </View>

        <ActionRow
          title="Email support"
          subtitle="Send us a message and we will respond as soon as possible."
          icon="mail-outline"
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
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.infoText}>
            If you are experiencing a problem with a property, payment or another user, you can file a dispute or damage report from the relevant screen.
          </Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.infoText}>
            For urgent safety concerns, please contact local authorities and then reach out to support so we can take appropriate action on the platform.
          </Text>
        </View>
      </DashboardSection>
    </DashboardScreen>
  );
};

const styles = StyleSheet.create({
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
