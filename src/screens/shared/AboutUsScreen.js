import React from 'react';
import {Linking, StyleSheet, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {
  ActionRow,
  DashboardHero,
  DashboardScreen,
  DashboardSection,
} from '../../components/dashboard/DashboardKit';
import { colors, radius, typography } from '../../theme';

import AppText from '../../components/common/AppText';
const AboutUsScreen = ({ navigation }) => {
  return (
    <DashboardScreen>
      <DashboardHero
        eyebrow="ABOUT"
        title="About RentalHub NG"
        subtitle="Nigeria's trusted platform for finding, managing, and securing rental properties."
        icon="information-circle-outline"
      />

      <DashboardSection title="Our mission">
        <View style={styles.card}>
          <AppText style={styles.text}>
            RentalHub NG makes renting in Nigeria transparent, secure, and hassle-free. We connect tenants with verified properties and provide landlords with powerful management tools.
          </AppText>
        </View>
      </DashboardSection>

      <DashboardSection title="What we offer">
        <ActionRow
          title="Verified properties"
          subtitle="Every listing is reviewed to ensure quality and authenticity."
          icon="home-outline"
        />
        <ActionRow
          title="Secure payments"
          subtitle="Paystack-powered transactions with dispute resolution."
          icon="shield-checkmark-outline"
        />
        <ActionRow
          title="Transportation services"
          subtitle="Book trusted rides for property inspections and moving."
          icon="car-outline"
        />
        <ActionRow
          title="Fumigation & cleaning"
          subtitle="Professional sanitation services for your rental property."
          icon="sparkles-outline"
        />
        <ActionRow
          title="Legal support"
          subtitle="Access to verified lawyers for tenancy disputes and advice."
          icon="scale-outline"
        />
      </DashboardSection>

      <DashboardSection title="Contact">
        <ActionRow
          title="Email"
          subtitle="support@rentalhub.com.ng"
          icon="mail-outline"
          onPress={() => Linking.openURL('mailto:support@rentalhub.com.ng')}
        />
        <ActionRow
          title="Website"
          subtitle="https://rentalhub.com.ng"
          icon="globe-outline"
          onPress={() => Linking.openURL('https://rentalhub.com.ng')}
        />
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
    padding: 16,
  },
  text: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: 14,
    lineHeight: 22,
  },
});

export default AboutUsScreen;
