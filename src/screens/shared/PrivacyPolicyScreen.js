import React from 'react';
import { Linking, StyleSheet, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AppText from '../../components/common/AppText';
import {
  DashboardHero,
  DashboardNotice,
  DashboardScreen,
  DashboardSection,
} from '../../components/dashboard/DashboardKit';
import { colors, radius, shadows, typography } from '../../theme';

const EFFECTIVE_DATE = '29 July 2026';

const PRIVACY_PRINCIPLES = [
  {
    icon: 'eye-outline',
    title: 'Transparent',
    text: 'We explain what we collect and why, including sensitive identity and payment-related information.',
  },
  {
    icon: 'options-outline',
    title: 'Purpose limited',
    text: 'We use personal data for RentalHub services, safety, legal compliance and the other purposes described here.',
  },
  {
    icon: 'shield-checkmark-outline',
    title: 'Protected',
    text: 'We use technical and organisational controls appropriate to the data and the risks involved.',
  },
  {
    icon: 'person-circle-outline',
    title: 'Your rights',
    text: 'You can ask to access, correct, export, restrict or delete data, subject to lawful exceptions.',
  },
];

const DATA_CATEGORIES = [
  {
    icon: 'person-outline',
    title: 'Account, contact and profile data',
    data:
      'Name, email address, phone number, account type, password hash, preferred state or LGA, referral details, profile photo, professional role and related agent or lawyer contact details.',
    purpose:
      'Create and secure your account, authenticate you, personalise your hub, communicate with you, route services and maintain your platform relationships.',
    basis:
      'Performance of our contract with you; steps you request before entering a contract; legitimate interests in operating and securing RentalHub; and legal obligations where applicable.',
    retention:
      'For as long as your account is active, then deleted, anonymised or retained only where a transaction, dispute, safety, fraud-prevention, audit or legal obligation requires it.',
  },
  {
    icon: 'finger-print-outline',
    title: 'Identity and verification data',
    data:
      'NIN, passport number, nationality, identity-document type, date of birth used for verification, passport or identity images, live face or liveness images, verification result and revalidation status.',
    purpose:
      'Verify identity, prevent duplicate or fraudulent accounts, protect users, support trusted transactions and meet applicable compliance requirements.',
    basis:
      'Contract, legal obligation, legitimate interests in account security and fraud prevention, and consent where the law or a particular verification method requires it.',
    retention:
      'Only while needed for identity, security, compliance, dispute or fraud-prevention purposes, then deleted or anonymised unless lawfully required for longer.',
  },
  {
    icon: 'home-outline',
    title: 'Property, rental and application data',
    data:
      'Property address and location, listing details, prices and deposits, amenities, photos and media, saved properties, views, applications, inspections, tenancies, reviews, ratings and landlord-agent relationships.',
    purpose:
      'Publish and find properties, match users, process applications, manage rentals, enable inspections, provide recommendations and resolve property-related issues.',
    basis:
      'Contract and pre-contract steps; legitimate interests in operating, improving and protecting the marketplace; consent where required; and legal claims or obligations.',
    retention:
      'While the listing, application, tenancy or account remains active, and afterwards for the period reasonably needed for disputes, transaction history, safety, audit or legal claims.',
  },
  {
    icon: 'card-outline',
    title: 'Payment, wallet and payout data',
    data:
      'Payment reference, amount, currency, purpose, status and timestamps; subscription, booking, wallet and rent-savings records; and payout or refund bank name, bank code, account number and account name.',
    purpose:
      'Initiate and verify payments, maintain receipts and histories, resolve bank accounts, process transfers, payouts and refunds, reconcile transactions, prevent fraud and meet financial-record obligations.',
    basis:
      'Contract, legal obligations, and legitimate interests in payment security, reconciliation and fraud prevention.',
    retention:
      'For the transaction, accounting, tax, reconciliation, anti-fraud, dispute and legal limitation periods that apply. Data may be restricted rather than immediately deleted.',
  },
  {
    icon: 'chatbubbles-outline',
    title: 'Messages, calls, support and legal records',
    data:
      'In-app messages, typing/read/online signals, call and WebRTC signalling/session metadata, support tickets and replies, notification history, dispute records, evidence, damage reports, photos, inspection notes, legal authorisations and lawyer activity. Live WebRTC audio/video is processed between participants for delivery rather than stored as an ordinary call record.',
    purpose:
      'Deliver communications and support, facilitate calls, investigate complaints, preserve evidence, enforce platform rules, protect users and manage disputes or legal workflows.',
    basis:
      'Contract, legitimate interests in support and platform safety, legal claims and obligations, and consent where required.',
    retention:
      'While needed for the service, account, ticket, dispute or case, and afterwards only for safety, audit, fraud prevention or legal claims. Content may be redacted or anonymised during account deletion.',
  },
  {
    icon: 'car-outline',
    title: 'Bookings, services and location data',
    data:
      'Transportation pickup and destination, service address, booking date and time, property size or room details, cleaning or fumigation requirements, health and safety notes, provider assignment, location searches and related photos or evidence.',
    purpose:
      'Quote, schedule, fulfil and support transportation, cleaning, fumigation and other location-dependent services.',
    basis:
      'Contract and requested pre-contract steps; legitimate interests in service delivery and safety; explicit consent where sensitive health information requires it; and legal obligations.',
    retention:
      'For the booking and service relationship, then for applicable payment, safety, complaint, audit and legal-claim periods.',
  },
  {
    icon: 'briefcase-outline',
    title: 'Recruitment and professional data',
    data:
      'Candidate profile, CV or résumé, documents, application answers, interview details, browser fingerprint, interview recordings, recording duration, violation log, scores, reports, professional credentials and recruitment payment or workflow records.',
    purpose:
      'Manage applications, assess candidates, schedule interviews, produce hiring reports and administer recruitment services.',
    basis:
      'Pre-contract steps, consent where required, legitimate interests in recruitment administration, and legal obligations or claims.',
    retention:
      'For the recruitment process and a reasonable period afterwards for recordkeeping or legal claims, then deleted or anonymised unless you agree to longer consideration.',
  },
  {
    icon: 'phone-portrait-outline',
    title: 'Device, usage, diagnostics and notification data',
    data:
      'IP address, user agent, device platform, app version, route or screen, session identifier, push token, optional device ID, notification status, analytics events, crash message, stack trace, component stack and fatal-error details.',
    purpose:
      'Keep sessions secure, send requested notifications, diagnose crashes, monitor reliability, prevent abuse, measure feature use and improve RentalHub.',
    basis:
      'Legitimate interests in security, reliability and product improvement; consent where required for optional analytics or notifications; and legal obligations.',
    retention:
      'Only while reasonably needed for security, troubleshooting, notification delivery and product measurement. Push tokens are disabled on logout, unregistering or invalidation and removed through applicable account-deletion processes.',
  },
];

const PROVIDERS = [
  {
    icon: 'card-outline',
    name: 'Paystack',
    text:
      'Processes checkout, verifies transactions, resolves bank accounts and supports transfers, payouts and refunds. Card numbers and CVVs are entered into Paystack-controlled payment flows; RentalHub does not store the full card number or CVV. We do retain the transaction records and payout bank details described above.',
  },
  {
    icon: 'id-card-outline',
    name: 'Prembly',
    text:
      'Currently processes NIN, name and date of birth for NIN checks, or passport number, name, nationality and date of birth for passport checks. Face/liveness data would be sent only if that separate workflow is enabled and presented.',
  },
  {
    icon: 'cloud-upload-outline',
    name: 'Cloudinary',
    text:
      'Stores, transforms and delivers submitted property, profile, identity or evidence media where that upload workflow uses Cloudinary.',
  },
  {
    icon: 'notifications-outline',
    name: 'Expo notification services',
    text:
      'Processes device push tokens and notification delivery information so RentalHub can send enabled mobile alerts.',
  },
  {
    icon: 'mail-outline',
    name: 'Email, SMS and WhatsApp providers',
    text:
      'Resend or configured email infrastructure, Termii or Twilio, and Meta WhatsApp Cloud services may process contact and message-delivery data for verification, service and support communications.',
  },
  {
    icon: 'map-outline',
    name: 'Google services',
    text:
      'Google Maps may process location searches, map requests and geocoding data. Google Analytics processes website usage and device information when its identifier is configured.',
  },
  {
    icon: 'chatbox-ellipses-outline',
    name: 'HubSpot Conversations',
    text:
      'The RentalHub Home page may load HubSpot live chat, which can process browser, cookie and chat information needed to provide that conversation feature.',
  },
  {
    icon: 'sparkles-outline',
    name: 'Anthropic Claude',
    text:
      'When damage-image analysis is used, RentalHub sends the submitted damage photograph to Anthropic Claude for a non-binding assessment and stores the resulting analysis with the damage workflow.',
  },
  {
    icon: 'server-outline',
    name: 'Infrastructure and professional support',
    text:
      'Authorised hosting, database, security, audit, legal and other professional providers process only the data needed to support RentalHub and are expected to protect it under applicable obligations.',
  },
];

const RETENTION_RULES = [
  'Account and profile data: while the account is active, followed by deletion, redaction or anonymisation unless a lawful reason requires retention.',
  'Payment and transaction records: for applicable reconciliation, accounting, tax, fraud-prevention, dispute and legal-limitation periods.',
  'Messages, support, evidence and legal records: while the service, dispute or case requires them, and afterwards only for legitimate safety, audit or legal needs.',
  'Identity and verification data: while needed for verification, compliance, fraud prevention, account security or related claims.',
  'Recruitment data: for the application process and a reasonable claims or recordkeeping period, unless the candidate agrees to longer consideration.',
  'Diagnostics and analytics: only for as long as reasonably necessary for reliability, security and product measurement.',
];

const RIGHTS = [
  'Be informed about our processing and obtain access to your personal data.',
  'Correct inaccurate data and complete information that is incomplete.',
  'Request deletion or restriction, subject to active services and lawful retention duties.',
  'Object to processing based on legitimate interests or to direct marketing.',
  'Receive portable data in a usable format where the right applies.',
  'Withdraw consent at any time, without affecting processing already lawfully completed.',
  'Ask for human review and contest a significant decision made only by automated processing, where applicable.',
  'Complain to RentalHub and, if unresolved, to the Nigeria Data Protection Commission.',
];

const BulletRow = ({ children, icon = 'checkmark-circle' }) => (
  <View style={styles.bulletRow}>
    <Icon
      accessibilityElementsHidden
      importantForAccessibility="no"
      name={icon}
      size={18}
      color={colors.blue}
    />
    <AppText style={styles.bulletText}>{children}</AppText>
  </View>
);

const PolicyCard = ({ children, style }) => (
  <View style={[styles.policyCard, style]}>{children}</View>
);

const LabelledCopy = ({ label, children }) => (
  <View style={styles.labelledCopy}>
    <AppText style={styles.fieldLabel}>{label}</AppText>
    <AppText style={styles.fieldText}>{children}</AppText>
  </View>
);

const DataCategoryCard = ({ item }) => (
  <PolicyCard>
    <View style={styles.cardHeading}>
      <View style={styles.cardIcon}>
        <Icon name={item.icon} size={20} color={colors.blue} />
      </View>
      <AppText accessibilityRole="header" style={styles.cardTitle}>
        {item.title}
      </AppText>
    </View>
    <LabelledCopy label="What we collect">{item.data}</LabelledCopy>
    <LabelledCopy label="Why we use it">{item.purpose}</LabelledCopy>
    <LabelledCopy label="Lawful basis">{item.basis}</LabelledCopy>
    <LabelledCopy label="Retention approach">{item.retention}</LabelledCopy>
  </PolicyCard>
);

const ProviderCard = ({ item }) => (
  <View style={styles.providerCard}>
    <View style={styles.providerIcon}>
      <Icon name={item.icon} size={19} color={colors.navy} />
    </View>
    <View style={styles.providerCopy}>
      <AppText style={styles.providerName}>{item.name}</AppText>
      <AppText style={styles.providerText}>{item.text}</AppText>
    </View>
  </View>
);

const ContactLink = ({ icon, label, value, url }) => (
  <TouchableOpacity
    accessibilityHint={`Opens ${label.toLowerCase()}`}
    accessibilityLabel={`${label}: ${value}`}
    accessibilityRole="link"
    activeOpacity={0.78}
    style={styles.contactLink}
    onPress={() => Linking.openURL(url).catch(() => undefined)}
  >
    <View style={styles.contactIcon}>
      <Icon name={icon} size={19} color={colors.blue} />
    </View>
    <View style={styles.contactCopy}>
      <AppText style={styles.contactLabel}>{label}</AppText>
      <AppText style={styles.contactValue}>{value}</AppText>
    </View>
    <Icon name="open-outline" size={17} color={colors.muted} />
  </TouchableOpacity>
);

const PrivacyPolicyScreen = () => (
  <DashboardScreen contentContainerStyle={styles.screenContent}>
    <DashboardHero
      eyebrow="PRIVACY & DATA PROTECTION"
      title="Privacy Policy"
      subtitle="A clear account of how RentalHub collects, uses, shares, stores and protects personal data across our website, mobile applications and services."
      icon="shield-checkmark-outline"
    />

    <View style={styles.policyMeta}>
      <View style={styles.metaBadge}>
        <Icon name="calendar-outline" size={16} color={colors.navy} />
        <AppText style={styles.metaText}>Effective {EFFECTIVE_DATE}</AppText>
      </View>
      <View style={styles.metaBadge}>
        <Icon name="location-outline" size={16} color={colors.navy} />
        <AppText style={styles.metaText}>Nigeria</AppText>
      </View>
    </View>

    <DashboardNotice
      title="The short version"
      message="RentalHub uses personal data to provide property, payment, communication, verification, support and related services. We share it as described below, including with service providers and people involved in a transaction or case."
    />

    <DashboardSection
      title="Our privacy commitments"
      subtitle="The principles behind every section of this notice."
    >
      <View style={styles.principleGrid}>
        {PRIVACY_PRINCIPLES.map((principle) => (
          <View key={principle.title} style={styles.principleCard}>
            <View style={styles.principleIcon}>
              <Icon name={principle.icon} size={20} color={colors.gold} />
            </View>
            <AppText style={styles.principleTitle}>{principle.title}</AppText>
            <AppText style={styles.principleText}>{principle.text}</AppText>
          </View>
        ))}
      </View>
    </DashboardSection>

    <DashboardSection title="1. Who controls your data">
      <PolicyCard>
        <AppText style={styles.paragraph}>
          RentalHub NG ("RentalHub", "we", "us" or "our"), operating in Nigeria, is
          responsible for the personal data processed through rentalhub.com.ng, the
          RentalHub mobile applications and connected RentalHub services, unless a
          separate notice says otherwise.
        </AppText>
        <AppText style={styles.paragraph}>
          This policy applies to visitors, account holders, tenants, landlords, agents,
          lawyers, administrators, service providers, candidates and other people who use
          or interact with RentalHub.
        </AppText>
      </PolicyCard>
    </DashboardSection>

    <DashboardSection
      title="2. How we obtain personal data"
      subtitle="We receive data from several sources, not only from forms."
    >
      <PolicyCard>
        <BulletRow>Directly from you when you register, verify, list, apply, book, pay, message, upload, contact support or change settings.</BulletRow>
        <BulletRow>From other RentalHub users and authorised roles involved in a listing, application, service, dispute, payment or legal workflow.</BulletRow>
        <BulletRow>Automatically from your browser, device and app use, including security logs, diagnostics, cookies, analytics and notification tokens.</BulletRow>
        <BulletRow>From providers that verify identity, process payments, deliver communications, host media or provide mapping and infrastructure.</BulletRow>
      </PolicyCard>
    </DashboardSection>

    <DashboardSection
      title="3. Data we collect and why"
      subtitle="Each card explains the category, purpose, main lawful basis and retention approach."
    >
      {DATA_CATEGORIES.map((item) => (
        <DataCategoryCard key={item.title} item={item} />
      ))}
    </DashboardSection>

    <DashboardSection title="4. Sensitive data, identity and biometrics">
      <PolicyCard>
        <AppText style={styles.paragraph}>
          Identity numbers, identity documents, live face images and some health or
          safety notes require greater care. We process them only for the relevant
          verification, safety, service, fraud-prevention or legal purpose and restrict
          access according to role and workflow.
        </AppText>
        <BulletRow icon="lock-closed">
          RentalHub encrypts NIN values and keeps a separate protected hash to detect
          duplicate use without relying on the readable number.
        </BulletRow>
        <BulletRow icon="phone-portrait">
          Fingerprint or Face ID templates used to unlock a saved mobile session remain
          under the device operating system's control and are not sent to RentalHub.
        </BulletRow>
        <BulletRow icon="scan">
          Device biometric login is different from identity verification. If you submit
          an identity photo, RentalHub may store it. Current Prembly checks send NIN,
          name and date of birth, or passport number, name, nationality and date of
          birth. If a face/liveness workflow is enabled and shown to you, its collection
          notice will explain any face image sent to the verification provider.
        </BulletRow>
        <AppText style={styles.securityCaveat}>
          Property-application access: the relevant landlord can review the applicant's
          name, permitted contact and application details, nationality where relevant,
          identity-document type and verification status. RentalHub does not include the
          stored NIN or passport number in the landlord's application response.
        </AppText>
      </PolicyCard>
    </DashboardSection>

    <DashboardSection title="5. Live calls and interview recordings">
      <PolicyCard>
        <AppText style={styles.paragraph}>
          For an audio, video or virtual-tour call, RentalHub processes signalling and
          call-status information to connect the participants. The live media travels
          between participants using WebRTC. Connection setup may expose network or
          address metadata to the configured STUN service, which currently includes
          Google's public STUN infrastructure.
        </AppText>
        <AppText style={styles.paragraph}>
          A recruitment interview can be recorded as a separate workflow. Where that
          feature is used, RentalHub stores the submitted recording, its duration and any
          violation log with the recruitment application. Camera and microphone
          permissions can be controlled through your device settings, but disabling them
          prevents the relevant calling or interview feature from working.
        </AppText>
      </PolicyCard>
    </DashboardSection>

    <DashboardSection title="6. Payments and financial data">
      <PolicyCard>
        <AppText style={styles.paragraph}>
          Checkout is provided through Paystack. Full card numbers and CVVs are entered
          into Paystack-controlled payment flows and are not stored by RentalHub. We
          receive and retain transaction references, amounts, status, purpose and timing
          needed to provide receipts, access and reconciliation.
        </AppText>
        <AppText style={styles.paragraph}>
          Where a refund, withdrawal, settlement or payout is requested, RentalHub
          collects and stores the bank name, bank code, account number and account name
          needed to resolve the account and complete the transfer. Financial records may
          remain after account closure where accounting, fraud, dispute or legal duties
          require them.
        </AppText>
      </PolicyCard>
    </DashboardSection>

    <DashboardSection
      title="7. Who receives personal data"
      subtitle="We disclose only what is reasonably necessary for the stated purpose."
    >
      <PolicyCard>
        <BulletRow>
          Tenants, landlords, agents, lawyers, service providers, candidates and
          authorised administrators when their role and the relevant workflow require
          access.
        </BulletRow>
        <BulletRow>
          Payment, verification, media, communications, mapping, hosting, database,
          analytics, security and professional service providers acting for RentalHub.
        </BulletRow>
        <BulletRow>
          Regulators, courts, law enforcement or other authorities when disclosure is
          legally required or necessary to protect rights, safety and platform integrity.
        </BulletRow>
        <BulletRow>
          A buyer, investor or successor during a genuine corporate transaction, subject
          to confidentiality and applicable data-protection safeguards.
        </BulletRow>
      </PolicyCard>
      {PROVIDERS.map((item) => (
        <ProviderCard key={item.name} item={item} />
      ))}
      <DashboardNotice
        title="Public and sponsor content"
        message="Sponsor content may record aggregate impression or click counts. Approved ratings can show a selected name format, comment, role/location and, only where both the platform setting and user choice permit it, a profile/passport photograph as a testimonial image."
      />
    </DashboardSection>

    <DashboardSection title="8. Cookies, analytics and mobile technologies">
      <PolicyCard>
        <AppText style={styles.paragraph}>
          The website uses necessary authentication and security technologies, including
          an HTTP-only session cookie and a CSRF protection cookie. Their default
          lifetime is seven days unless the session ends earlier or configuration
          changes.
        </AppText>
        <AppText style={styles.paragraph}>
          Google Analytics may run when it is configured and permitted, collecting
          website usage and device information to measure performance. Browser controls
          can block or delete cookies, although blocking necessary cookies can prevent
          login or security features from working.
        </AppText>
        <AppText style={styles.paragraph}>
          The mobile app uses equivalent technologies such as protected session storage,
          push tokens, local preferences, diagnostics and analytics events. Notification
          and device permissions can be changed in the app or operating-system settings.
        </AppText>
      </PolicyCard>
    </DashboardSection>

    <DashboardSection title="9. International processing and transfers">
      <PolicyCard>
        <AppText style={styles.paragraph}>
          Some providers or their infrastructure may process data outside Nigeria. A
          restricted international transfer must use a mechanism and safeguards permitted
          by applicable law, such as an adequacy decision, contractual protection,
          consent in a permitted situation or another recognised basis.
        </AppText>
        <AppText style={styles.paragraph}>
          You may contact us to ask about the safeguards relevant to a particular
          transfer.
        </AppText>
      </PolicyCard>
    </DashboardSection>

    <DashboardSection title="10. How we protect and store data">
      <PolicyCard>
        <BulletRow icon="key">
          Passwords are hashed rather than stored as readable passwords.
        </BulletRow>
        <BulletRow icon="shield-checkmark">
          NIN values are encrypted and duplicate-detection hashes are protected
          separately.
        </BulletRow>
        <BulletRow icon="lock-closed">
          Production authentication uses secure, HTTP-only and SameSite cookie controls,
          CSRF protection, rate limiting and security headers where applicable.
        </BulletRow>
        <BulletRow icon="people">
          Role and jurisdiction checks limit access to administrative, legal, financial
          and dispute workflows.
        </BulletRow>
        <BulletRow icon="phone-portrait">
          The mobile app uses the device Keychain or secure credential store as the
          authoritative location for supported session and guest-support secrets.
          Local application storage holds preferences and is used for a marked,
          temporary credential fallback only when secure storage is unavailable; the
          fallback is migrated and removed when secure storage recovers. Device access
          and screen-lock security therefore remain important.
        </BulletRow>
        <BulletRow icon="document-lock">
          Audit records, evidence controls, security logging and provider safeguards
          support accountability and incident investigation.
        </BulletRow>
        <AppText style={styles.securityCaveat}>
          No website, app, transmission or storage system is perfectly secure. Keep your
          device and login details protected, use a strong password and report suspected
          misuse promptly.
        </AppText>
      </PolicyCard>
    </DashboardSection>

    <DashboardSection
      title="11. How long we keep data"
      subtitle="RentalHub applies purpose-based criteria because one fixed period would not be accurate for every record."
    >
      <PolicyCard>
        {RETENTION_RULES.map((rule) => (
          <BulletRow key={rule} icon="time-outline">{rule}</BulletRow>
        ))}
        <AppText style={styles.paragraph}>
          At the end of the relevant period, data should be deleted, securely disposed
          of, redacted, aggregated or anonymised unless another lawful need applies.
        </AppText>
      </PolicyCard>
    </DashboardSection>

    <DashboardSection title="12. Account deletion">
      <PolicyCard>
        <AppText style={styles.paragraph}>
          You can request account deletion through available account controls or by
          contacting us. For security, we may ask you to verify your identity or password.
        </AppText>
        <AppText style={styles.paragraph}>
          Deletion can be delayed or restricted while you have an active property,
          tenancy, dispute, pending payment, booking, investigation or other unresolved
          obligation. Some transaction, safety, audit and legal records must be retained
          or anonymised rather than erased. Messages, evidence and linked records may be
          redacted so other users' legitimate records remain usable.
        </AppText>
      </PolicyCard>
    </DashboardSection>

    <DashboardSection title="13. Automated tools and recommendations">
      <PolicyCard>
        <AppText style={styles.paragraph}>
          RentalHub may use automated tools to assist with identity checks, fraud and risk
          signals, property or service recommendations, matching, diagnostics and damage
          analysis. These tools support platform workflows; authorised people may review
          important outcomes.
        </AppText>
        <AppText style={styles.paragraph}>
          Where applicable law gives you the right, you may request human review, express
          your view and contest a decision that has a legal or similarly significant
          effect and was based only on automated processing.
        </AppText>
      </PolicyCard>
    </DashboardSection>

    <DashboardSection title="14. Children's privacy">
      <PolicyCard>
        <AppText style={styles.paragraph}>
          RentalHub is designed for adults who can enter property, payment and service
          arrangements. The current registration code does not provide a comprehensive
          age-verification gate. A parent or guardian who believes a child under 18 has
          provided personal data should contact us so we can investigate and take
          appropriate action.
        </AppText>
      </PolicyCard>
    </DashboardSection>

    <DashboardSection
      title="15. Your data-protection rights"
      subtitle="The precise right and any exception depend on the law and the circumstances."
    >
      <PolicyCard>
        {RIGHTS.map((right) => (
          <BulletRow key={right}>{right}</BulletRow>
        ))}
        <AppText style={styles.paragraph}>
          To protect users, we may verify your identity before acting on a request. We
          will explain if a request cannot be completed in full. You will not be treated
          unfairly for exercising a privacy right.
        </AppText>
      </PolicyCard>
    </DashboardSection>

    <DashboardSection title="16. Marketing and communication choices">
      <PolicyCard>
        <AppText style={styles.paragraph}>
          Some account and lead flows synchronise email and phone details to email/SMS
          campaign lists. Email campaigns provide an unsubscribe route. Mobile
          notification preferences control native push categories only; to stop SMS or
          WhatsApp marketing, contact us. Promotional messages must only be sent where
          consent or another applicable legal basis permits them. Essential service,
          security, payment and legal notices may still be necessary.
        </AppText>
      </PolicyCard>
    </DashboardSection>

    <DashboardSection title="17. Questions, requests and complaints">
      <PolicyCard>
        <AppText style={styles.paragraph}>
          Contact RentalHub first so we can investigate a privacy question, rights
          request or complaint. Include enough detail to identify the relevant account or
          processing activity, but do not send passwords, CVVs or unnecessary identity
          documents by ordinary email.
        </AppText>
        <ContactLink
          icon="mail-outline"
          label="Privacy email"
          value="support@rentalhub.com.ng"
          url="mailto:support@rentalhub.com.ng?subject=Privacy%20request"
        />
        <ContactLink
          icon="call-outline"
          label="Telephone"
          value="+234 803 060 1238"
          url="tel:+2348030601238"
        />
        <ContactLink
          icon="globe-outline"
          label="Website"
          value="rentalhub.com.ng"
          url="https://rentalhub.com.ng"
        />
      </PolicyCard>
      <DashboardNotice
        title="Regulatory complaint"
        message="If you are not satisfied with our response, you may complain to the Nigeria Data Protection Commission (NDPC)."
      />
      <ContactLink
        icon="business-outline"
        label="Nigeria Data Protection Commission"
        value="ndpc.gov.ng"
        url="https://ndpc.gov.ng/"
      />
    </DashboardSection>

    <DashboardSection title="18. Changes to this policy">
      <PolicyCard>
        <AppText style={styles.paragraph}>
          We may update this policy when RentalHub features, providers, legal requirements
          or processing practices change. The effective date at the top identifies the
          current version. We will provide an appropriate in-app, website, email or other
          notice when a change is material.
        </AppText>
      </PolicyCard>
    </DashboardSection>

    <View style={styles.endMark} accessible accessibilityLabel="End of Privacy Policy">
      <View style={styles.endIcon}>
        <Icon name="shield-checkmark" size={22} color={colors.gold} />
      </View>
      <AppText style={styles.endTitle}>Privacy, explained clearly.</AppText>
      <AppText style={styles.endText}>RentalHub Privacy Policy · Effective {EFFECTIVE_DATE}</AppText>
    </View>
  </DashboardScreen>
);

const styles = StyleSheet.create({
  screenContent: {
    paddingBottom: 56,
  },
  policyMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  metaBadge: {
    alignItems: 'center',
    backgroundColor: '#FFF8DB',
    borderColor: '#F4D86A',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  metaText: {
    color: colors.navy,
    fontFamily: typography.semibold,
    fontSize: 12,
  },
  principleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  principleCard: {
    backgroundColor: colors.navy,
    borderRadius: radius.md,
    minHeight: 168,
    padding: 15,
    width: '48.2%',
  },
  principleIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 201, 40, 0.12)',
    borderColor: 'rgba(255, 201, 40, 0.34)',
    borderRadius: 11,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    marginBottom: 12,
    width: 38,
  },
  principleTitle: {
    color: colors.white,
    fontFamily: typography.bold,
    fontSize: 14,
    lineHeight: 19,
  },
  principleText: {
    color: '#C6D3E8',
    fontFamily: typography.regular,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },
  policyCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 12,
    padding: 16,
    ...shadows.soft,
  },
  paragraph: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 21,
  },
  bulletRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
  },
  bulletText: {
    color: colors.text,
    flex: 1,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 20,
  },
  cardHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 11,
    marginBottom: 2,
  },
  cardIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderRadius: 12,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  cardTitle: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.bold,
    fontSize: 15,
    lineHeight: 21,
  },
  labelledCopy: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingTop: 11,
  },
  fieldLabel: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  fieldText: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 5,
  },
  providerCard: {
    alignItems: 'flex-start',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  providerIcon: {
    alignItems: 'center',
    backgroundColor: '#FFF8DB',
    borderRadius: 11,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  providerCopy: {
    flex: 1,
  },
  providerName: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 14,
    lineHeight: 19,
  },
  providerText: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 4,
  },
  securityCaveat: {
    backgroundColor: '#FFF8E8',
    borderColor: '#F6D18B',
    borderRadius: radius.sm,
    borderWidth: 1,
    color: '#7A4A00',
    fontFamily: typography.medium,
    fontSize: 12,
    lineHeight: 19,
    padding: 12,
  },
  contactLink: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 68,
    padding: 12,
  },
  contactIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderRadius: 11,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  contactCopy: {
    flex: 1,
    marginHorizontal: 11,
  },
  contactLabel: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 11,
    lineHeight: 15,
  },
  contactValue: {
    color: colors.blue,
    fontFamily: typography.semibold,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 2,
  },
  endMark: {
    alignItems: 'center',
    backgroundColor: colors.navy,
    borderRadius: radius.lg,
    marginTop: 28,
    padding: 24,
  },
  endIcon: {
    alignItems: 'center',
    backgroundColor: colors.navySoft,
    borderColor: 'rgba(255, 201, 40, 0.35)',
    borderRadius: 16,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  endTitle: {
    color: colors.white,
    fontFamily: typography.bold,
    fontSize: 17,
    lineHeight: 23,
    marginTop: 12,
  },
  endText: {
    color: '#B9C9E5',
    fontFamily: typography.regular,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    textAlign: 'center',
  },
});

export default PrivacyPolicyScreen;
