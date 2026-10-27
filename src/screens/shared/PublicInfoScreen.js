import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import React, { useMemo } from 'react';
import {StyleSheet, View} from 'react-native';
import {
  ActionRow,
  DashboardHero,
  DashboardNotice,
  DashboardScreen,
  DashboardSection,
} from '../../components/dashboard/DashboardKit';
import { colors, radius, typography, typeScale } from '../../theme';
import PrivacyPolicyScreen from './PrivacyPolicyScreen';

import AppText from '../../components/common/AppText';
const INFO_PAGES = {
  faq: {
    get "eyebrow"() { return ui("HELP CENTER"); },
    get "title"() { return ui("Frequently asked questions"); },
    get "subtitle"() { return ui("Quick answers for tenants, landlords, agents and service users."); },
    icon: 'help-circle-outline',
    sections: [
      {
        get "title"() { return ui("Getting started"); },
        items: [
          'Create an account, verify your email/phone, then complete your profile.',
          'Tenants can browse, save properties, apply, chat and track applications.',
          'Landlords and agents can list properties, manage applications and respond to leads.',
        ],
      },
      {
        get "title"() { return ui("Payments and bookings"); },
        items: [
          'Subscription, transportation, fumigation and rent-savings payments are tracked in your dashboard.',
          'Receipts and history are available from Payment History after successful verification.',
        ],
      },
    ],
  },
  how: {
    get "eyebrow"() { return ui("HOW RENTALHUB WORKS"); },
    get "title"() { return ui("From search to move-in"); },
    get "subtitle"() { return ui("A simpler rental journey designed for Nigerian tenants and property owners."); },
    icon: 'map-outline',
    sections: [
      {
        get "title"() { return ui("For tenants"); },
        items: [
          'Search verified listings and save the properties you like.',
          'Apply, message the property owner or agent, and track your application status.',
          'Use transportation, fumigation/cleaning and rent savings when needed.',
        ],
      },
      {
        get "title"() { return ui("For landlords and agents"); },
        items: [
          'Add listings with clear details and photos.',
          'Review applicants, communicate in-app and manage property activity from your hub.',
        ],
      },
    ],
  },
  pricing: {
    get "eyebrow"() { return ui("PLANS & PAYMENTS"); },
    get "title"() { return ui("Pricing overview"); },
    get "subtitle"() { return ui("A mobile summary of common paid areas. Exact live pricing still comes from payment screens."); },
    icon: 'pricetag-outline',
    notice: 'For final amounts, always use the in-app checkout or payment history screen.',
    sections: [
      {
        get "title"() { return ui("Common paid services"); },
        items: [
          'Property subscription plans for access and visibility.',
          'Transportation and fumigation/cleaning bookings based on service details.',
          'Rent savings and wallet-related payments where enabled.',
        ],
      },
    ],
  },
  landlordGuide: {
    get "eyebrow"() { return ui("LANDLORD GUIDE"); },
    get "title"() { return ui("List and manage professionally"); },
    get "subtitle"() { return ui("A quick mobile guide for keeping listings clean, trustworthy and easy to approve."); },
    icon: 'home-outline',
    sections: [
      {
        get "title"() { return ui("Best practice"); },
        items: [
          'Use accurate property details, real photos and clear pricing.',
          'Respond to applications and messages quickly.',
          'Keep availability current so tenants do not apply for unavailable homes.',
        ],
      },
    ],
  },
  terms: {
    get "eyebrow"() { return ui("LEGAL"); },
    get "title"() { return ui("Terms summary"); },
    get "subtitle"() { return ui("A readable mobile summary of platform expectations."); },
    icon: 'document-text-outline',
    notice: 'This is a convenience summary. Official RentalHub terms remain the source of final legal wording.',
    sections: [
      {
        get "title"() { return ui("Platform expectations"); },
        items: [
          'Use truthful information when creating accounts, listings and applications.',
          'Do not bypass verified workflows for payments, disputes or support.',
          'Admins may review, restrict or remove content that violates platform rules.',
        ],
      },
    ],
  },
  nigeria: {
    get "eyebrow"() { return ui("LOCATIONS"); },
    get "title"() { return ui("RentalHub across Nigeria"); },
    get "subtitle"() { return ui("Browse homes and services by supported locations."); },
    icon: 'location-outline',
    sections: [
      {
        get "title"() { return ui("Location discovery"); },
        items: [
          'Use Browse Properties to filter by state, city and area.',
          'The app focuses on searchable listings, saved locations and practical location guidance.',
        ],
      },
    ],
  },
};

const PublicInfoScreen = ({ navigation, route }) => {
  const interfaceLanguage = useInterfaceLanguage();
  const pageKey = route?.params?.page || 'faq';
  const page = useMemo(() => INFO_PAGES[pageKey] || INFO_PAGES.faq, [pageKey, interfaceLanguage]);

  if (pageKey === 'privacy') {
    return <PrivacyPolicyScreen />;
  }

  return (
    <DashboardScreen>
      <DashboardHero
        eyebrow={page.eyebrow}
        title={page.title}
        subtitle={page.subtitle}
        icon={page.icon}
      />

      {page.notice ? <DashboardNotice title={ui("Please note")} message={page.notice} /> : null}

      {page.sections.map((section) => (
        <DashboardSection key={section.title} title={section.title}>
          {section.items.map((item) => (
            <View key={item} style={styles.infoCard}>
              <AppText style={styles.bullet}>•</AppText>
              <AppText style={styles.infoText}>{item}</AppText>
            </View>
          ))}
        </DashboardSection>
      ))}

      <DashboardSection title={ui("Useful shortcut")}>
        <ActionRow
          title={ui("Explore locations")}
          subtitle={ui("Open native RentalHub location guide.")}
          icon="location-outline"
          onPress={() => navigation.navigate('LocationInfo')}
        />
        <ActionRow
          title={ui("Lawyers directory")}
          subtitle={ui("Browse RentalHub platform lawyers.")}
          icon="scale-outline"
          onPress={() => navigation.navigate('LawyersDirectory')}
        />
        <ActionRow
          title={ui("Browse properties")}
          subtitle={ui("Continue to the native property search.")}
          icon="business-outline"
          onPress={() => navigation.navigate('PropertyList')}
        />
      </DashboardSection>
    </DashboardScreen>
  );
};

const styles = StyleSheet.create({
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

export default PublicInfoScreen;
