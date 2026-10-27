import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import React from 'react';
import {Linking, StyleSheet, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {
  ActionRow,
  DashboardHero,
  DashboardScreen,
  DashboardSection,
} from '../../components/dashboard/DashboardKit';
import { colors, radius, typography, typeScale } from '../../theme';

import AppText from '../../components/common/AppText';
const AboutUsScreen = ({ navigation }) => {
  useInterfaceLanguage();
  return (
    <DashboardScreen>
      <DashboardHero
        eyebrow={ui("ABOUT")}
        title={ui("About Amana RentalHub NG")}
        subtitle={ui("Nigeria's trusted platform for finding, managing, and securing rental properties.")}
        icon="information-circle-outline"
      />

      <DashboardSection title={ui("Our mission")}>
        <View style={styles.card}>
          <AppText style={styles.text}>{ui("Amana RentalHub NG makes renting in Nigeria transparent, secure, and hassle-free. We connect tenants with verified properties and provide landlords with powerful management tools.")}</AppText>
        </View>
      </DashboardSection>

      <DashboardSection title={ui("What we offer")}>
        <ActionRow
          title={ui("Verified properties")}
          subtitle={ui("Every listing is reviewed to ensure quality and authenticity.")}
          icon="home-outline"
        />
        <ActionRow
          title={ui("Secure payments")}
          subtitle={ui("Paystack-powered transactions with dispute resolution.")}
          icon="shield-checkmark-outline"
        />
        <ActionRow
          title={ui("Transportation services")}
          subtitle={ui("Book trusted rides for property inspections and moving.")}
          icon="car-outline"
        />
        <ActionRow
          title={ui("Fumigation & cleaning")}
          subtitle={ui("Professional sanitation services for your rental property.")}
          icon="sparkles-outline"
        />
        <ActionRow
          title={ui("Legal support")}
          subtitle={ui("Access to verified lawyers for tenancy disputes and advice.")}
          icon="scale-outline"
        />
      </DashboardSection>

      <DashboardSection title={ui("Contact")}>
        <ActionRow
          title={ui("Email")}
          subtitle="support@rentalhub.com.ng"
          icon="mail-outline"
          onPress={() => Linking.openURL('mailto:support@rentalhub.com.ng')}
        />
        <ActionRow
          title={ui("Website")}
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
    fontSize: typeScale.sm,
    lineHeight: 20,
  },
});

export default AboutUsScreen;
