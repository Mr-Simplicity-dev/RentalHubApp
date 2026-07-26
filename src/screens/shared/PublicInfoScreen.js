import React, { useMemo } from 'react';
import {StyleSheet, View} from 'react-native';
import {
  ActionRow,
  DashboardHero,
  DashboardNotice,
  DashboardScreen,
  DashboardSection,
} from '../../components/dashboard/DashboardKit';
import { colors, radius, typography } from '../../theme';

import AppText from '../../components/common/AppText';
const INFO_PAGES = {
  faq: {
    eyebrow: 'HELP CENTER',
    title: 'Frequently asked questions',
    subtitle: 'Quick answers for tenants, landlords, agents and service users.',
    icon: 'help-circle-outline',
    sections: [
      {
        title: 'Getting started',
        items: [
          'Create an account, verify your email/phone, then complete your profile.',
          'Tenants can browse, save properties, apply, chat and track applications.',
          'Landlords and agents can list properties, manage applications and respond to leads.',
        ],
      },
      {
        title: 'Payments and bookings',
        items: [
          'Subscription, transportation, fumigation and rent-savings payments are tracked in your dashboard.',
          'Receipts and history are available from Payment History after successful verification.',
        ],
      },
    ],
  },
  how: {
    eyebrow: 'HOW RENTALHUB WORKS',
    title: 'From search to move-in',
    subtitle: 'A simpler rental journey designed for Nigerian tenants and property owners.',
    icon: 'map-outline',
    sections: [
      {
        title: 'For tenants',
        items: [
          'Search verified listings and save the properties you like.',
          'Apply, message the property owner or agent, and track your application status.',
          'Use transportation, fumigation/cleaning and rent savings when needed.',
        ],
      },
      {
        title: 'For landlords and agents',
        items: [
          'Add listings with clear details and photos.',
          'Review applicants, communicate in-app and manage property activity from your hub.',
        ],
      },
    ],
  },
  pricing: {
    eyebrow: 'PLANS & PAYMENTS',
    title: 'Pricing overview',
    subtitle: 'A mobile summary of common paid areas. Exact live pricing still comes from payment screens.',
    icon: 'pricetag-outline',
    notice: 'For final amounts, always use the in-app checkout or payment history screen.',
    sections: [
      {
        title: 'Common paid services',
        items: [
          'Property subscription plans for access and visibility.',
          'Transportation and fumigation/cleaning bookings based on service details.',
          'Rent savings and wallet-related payments where enabled.',
        ],
      },
    ],
  },
  landlordGuide: {
    eyebrow: 'LANDLORD GUIDE',
    title: 'List and manage professionally',
    subtitle: 'A quick mobile guide for keeping listings clean, trustworthy and easy to approve.',
    icon: 'home-outline',
    sections: [
      {
        title: 'Best practice',
        items: [
          'Use accurate property details, real photos and clear pricing.',
          'Respond to applications and messages quickly.',
          'Keep availability current so tenants do not apply for unavailable homes.',
        ],
      },
    ],
  },
  privacy: {
    eyebrow: 'LEGAL',
    title: 'Privacy summary',
    subtitle: 'How RentalHub thinks about user data in plain language.',
    icon: 'lock-closed-outline',
    notice: 'This is a mobile summary for quick reading. Use official RentalHub legal documents for final wording.',
    sections: [
      {
        title: 'Data handling',
        items: [
          'We use account, listing, application and payment information to provide the platform.',
          'Verification information helps reduce fraud and improve trust.',
          'Sensitive details should only be shared inside approved RentalHub workflows.',
        ],
      },
    ],
  },
  terms: {
    eyebrow: 'LEGAL',
    title: 'Terms summary',
    subtitle: 'A readable mobile summary of platform expectations.',
    icon: 'document-text-outline',
    notice: 'This is a convenience summary. Official RentalHub terms remain the source of final legal wording.',
    sections: [
      {
        title: 'Platform expectations',
        items: [
          'Use truthful information when creating accounts, listings and applications.',
          'Do not bypass verified workflows for payments, disputes or support.',
          'Admins may review, restrict or remove content that violates platform rules.',
        ],
      },
    ],
  },
  nigeria: {
    eyebrow: 'LOCATIONS',
    title: 'RentalHub across Nigeria',
    subtitle: 'Browse homes and services by supported locations.',
    icon: 'location-outline',
    sections: [
      {
        title: 'Location discovery',
        items: [
          'Use Browse Properties to filter by state, city and area.',
          'The app focuses on searchable listings, saved locations and practical location guidance.',
        ],
      },
    ],
  },
};

const PublicInfoScreen = ({ navigation, route }) => {
  const pageKey = route?.params?.page || 'faq';
  const page = useMemo(() => INFO_PAGES[pageKey] || INFO_PAGES.faq, [pageKey]);

  return (
    <DashboardScreen>
      <DashboardHero
        eyebrow={page.eyebrow}
        title={page.title}
        subtitle={page.subtitle}
        icon={page.icon}
      />

      {page.notice ? <DashboardNotice title="Please note" message={page.notice} /> : null}

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

      <DashboardSection title="Useful shortcut">
        <ActionRow
          title="Explore locations"
          subtitle="Open native RentalHub location guide."
          icon="location-outline"
          onPress={() => navigation.navigate('LocationInfo')}
        />
        <ActionRow
          title="Lawyers directory"
          subtitle="Browse RentalHub platform lawyers."
          icon="scale-outline"
          onPress={() => navigation.navigate('LawyersDirectory')}
        />
        <ActionRow
          title="Browse properties"
          subtitle="Continue to the native property search."
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

export default PublicInfoScreen;
