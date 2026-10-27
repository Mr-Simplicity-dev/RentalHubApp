import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import React, { useContext, useMemo } from 'react';
import Toast from 'react-native-toast-message';
import { AuthContext } from '../../context/AuthContext';
import {
  ActionRow,
  DashboardHero,
  DashboardScreen,
  DashboardSection,
} from '../../components/dashboard/DashboardKit';

const makePublicFeatures = () => [
  { label: ui("Home"), path: '/' },
  { label: ui("Properties"), path: '/properties' },
  { label: ui("Transportation Booking"), path: '/transportation/book' },
  { label: ui("Fumigation & Cleaning Booking"), path: '/fumigation-cleaning/booking' },
  { label: ui("Fumigation & Cleaning Catalog"), path: '/fumigation-cleaning/catalog' },
  { label: ui("About RentalHub"), path: '/about' },
  { label: ui("Resolved dispute cases"), path: '/cases' },
  { label: ui("Support Centre"), path: '/support' },
  { label: ui("Verify Email"), path: '/verify-email' },
  { label: ui("Verify Phone"), path: '/verify-phone' },
  { label: ui("Forgot Password"), path: '/forgot-password' },
  { label: ui("FAQ"), path: '/faq' },
  { label: ui("How It Works"), path: '/how-it-works' },
  { label: ui("Pricing"), path: '/pricing' },
  { label: ui("Landlord Guide"), path: '/landlord-guide' },
  { label: ui("Privacy"), path: '/privacy' },
  { label: ui("Terms"), path: '/terms' },
  { label: ui("Nigeria Page"), path: '/nigeria' },
  { label: ui("Careers"), path: '/careers' },
];

const makeProtectedFeatures = (
  userType,
  hasRecruitmentAccess = false,
  hasLgaJurisdiction = false
) => {
  const base = [
    { label: ui("Request assistance"), path: '/assistance' },
    { label: ui("Profile"), path: '/profile' },
    { label: ui("Payment History"), path: '/payment-history' },
    { label: ui("Saved Properties"), path: '/saved-properties' },
    { label: ui("Applications"), path: '/applications' },
    { label: ui("Messages"), path: '/messages' },
    { label: ui("Subscribe"), path: '/subscribe' },
    { label: ui("Settings"), path: '/settings' },
    { label: ui("Dashboard"), path: '/dashboard' },
    { label: ui("Support Centre"), path: '/support' },
    { label: ui("Transport Bookings"), path: '/transportation/bookings' },
    { label: ui("Fumigation Bookings"), path: '/fumigation-cleaning/bookings' },
    { label: ui("My Disputes"), path: '/my-disputes' },
    { label: ui("Property Reports"), path: '/my-damage-reports' },
    { label: ui("Subscribed Properties"), path: '/subscribed-properties' },
    { label: ui("Platform Ratings"), path: '/platform-ratings' },
    { label: ui("Verification Status"), path: '/verification-status' },
  ];

  if (userType === 'admin') {
    return [
      ...base,
      { label: ui("Admin Dashboard"), path: '/admin' },
      ...(hasRecruitmentAccess
        ? [{ label: ui("Recruitment Admin"), path: '/admin/recruitment' }]
        : []),
      { label: ui("Admin Lawyer Invites"), path: '/admin/lawyer-invites' },
      { label: ui("Admin Users"), path: '/admin/users' },
      { label: ui("Admin Properties"), path: '/admin/properties' },
      { label: ui("Admin Applications"), path: '/admin/applications' },
      { label: ui("Admin Verifications"), path: '/admin/verifications' },
      { label: ui("Admin Compliance"), path: '/admin/compliance' },
      { label: ui("Inspections"), path: '/admin/inspections' },
      { label: ui("Evidence Verifications"), path: '/admin/evidence-verifications' },
      { label: ui("Ledger"), path: '/admin/ledger' },
      { label: ui("Admin Agent Management"), path: '/admin/agents' },
      { label: ui("Admin Financial Dashboard"), path: '/admin/financial-dashboard' },
      { label: ui("Admin State Dashboard"), path: '/admin/state-dashboard' },
      ...(hasLgaJurisdiction
        ? [
            { label: ui("LGA Transportation Dashboard"), path: '/admin/transportation' },
            { label: ui("LGA Fumigation Dashboard"), path: '/admin/fumigation-cleaning' },
          ]
        : []),
    ];
  }

  if (userType === 'recruitment_admin') {
    return [
      { label: ui("Profile"), path: '/profile' },
      { label: ui("Messages"), path: '/messages' },
      { label: ui("Settings"), path: '/settings' },
      { label: ui("Recruitment Dashboard"), path: '/dashboard' },
      { label: ui("Recruitment Workspace"), path: '/admin/recruitment' },
    ];
  }

  if (userType === 'financial_admin') {
    return [
      ...base,
      { label: ui("Financial Dashboard"), path: '/admin/financial-dashboard' },
    ];
  }

  if (userType === 'lga_financial_admin') {
    return [
      ...base,
      { label: ui("LGA Financial Dashboard"), path: '/admin/financial-dashboard' },
    ];
  }

  if (userType === 'super_financial_admin') {
    return [
      ...base,
      { label: ui("Super Financial Dashboard"), path: '/admin/super-financial-dashboard' },
    ];
  }

  if (userType === 'state_admin') {
    return [
      ...base,
      { label: ui("State Dashboard"), path: '/admin/state-dashboard' },
      { label: ui("Admin Dashboard"), path: '/admin' },
      { label: ui("Appeals"), path: '/admin/appeals' },
      { label: ui("State Transportation Dashboard"), path: '/admin/transportation/state' },
      { label: ui("State Fumigation Dashboard"), path: '/admin/fumigation-cleaning/state' },
    ];
  }

  if (userType === 'state_financial_admin') {
    return [
      ...base,
      { label: ui("State Dashboard"), path: '/admin/state-dashboard' },
      { label: ui("Admin Dashboard"), path: '/admin' },
      { label: ui("State Transportation Dashboard"), path: '/admin/transportation/state' },
      { label: ui("State Fumigation Dashboard"), path: '/admin/fumigation-cleaning/state' },
    ];
  }

  if (userType === 'super_admin') {
    return [
      ...base,
      { label: ui("Super Admin Dashboard"), path: '/super-admin' },
      ...(hasRecruitmentAccess
        ? [{ label: ui("Recruitment Admin"), path: '/admin/recruitment' }]
        : []),
      { label: ui("Admin Dashboard"), path: '/admin' },
      { label: ui("Admin Users"), path: '/admin/users' },
      { label: ui("Admin Properties"), path: '/admin/properties' },
      { label: ui("Admin Applications"), path: '/admin/applications' },
      { label: ui("Admin Verifications"), path: '/admin/verifications' },
      { label: ui("Admin Compliance"), path: '/admin/compliance' },
      { label: ui("Admin Agent Management"), path: '/admin/agents' },
      { label: ui("SEO Dashboard"), path: '/admin/seo' },
      { label: ui("Support Governance"), path: '/super-admin/support-governance' },
      { label: ui("Inspections"), path: '/admin/inspections' },
      { label: ui("Evidence Verifications"), path: '/admin/evidence-verifications' },
      { label: ui("Ledger"), path: '/admin/ledger' },
      { label: ui("Withdrawals"), path: '/admin/withdrawals' },
      { label: ui("Admin Monitor"), path: '/admin/monitor' },
      { label: ui("Live Moderation"), path: '/admin/live-moderation' },
      { label: ui("Broadcast (SMS/Email)"), path: '/super-admin?tab=broadcast' },
      { label: ui("Appeals"), path: '/admin/appeals' },
      { label: ui("Super Transportation Dashboard"), path: '/super-admin/transportation' },
      { label: ui("Super Fumigation Dashboard"), path: '/super-admin/fumigation-cleaning' },
    ];
  }

  if (userType === 'lga_support_admin') {
    return [
      ...base,
      { label: ui("LGA Support Dashboard"), path: '/admin/lga-support-dashboard' },
      { label: ui("Support Tickets"), path: '/admin/lga-support-dashboard?tab=tickets' },
    ];
  }

  if (userType === 'state_support_admin') {
    return [
      ...base,
      { label: ui("State Support Dashboard"), path: '/admin/state-support-dashboard' },
      { label: ui("Support Tickets"), path: '/admin/state-support-dashboard?tab=tickets' },
    ];
  }

  if (userType === 'super_support_admin') {
    return [
      ...base,
      { label: ui("Super Support Dashboard"), path: '/admin/super-support-dashboard' },
      { label: ui("Support Tickets"), path: '/admin/super-support-dashboard?tab=tickets' },
    ];
  }

  if (userType === 'transportation_admin' || userType === 'lga_transportation_admin') {
    return [
      ...base,
      { label: ui("LGA Transportation Dashboard"), path: '/admin/transportation' },
      { label: ui("Transportation Bookings"), path: '/admin/transportation?tab=bookings' },
    ];
  }

  if (userType === 'state_transportation_admin') {
    return [
      ...base,
      { label: ui("State Transportation Dashboard"), path: '/admin/transportation/state' },
      { label: ui("State Transportation Bookings"), path: '/admin/transportation/state?tab=bookings' },
    ];
  }

  if (userType === 'super_transportation_admin') {
    return [
      ...base,
      { label: ui("Super Transportation Dashboard"), path: '/admin/transportation/super' },
      { label: ui("Super Transportation Bookings"), path: '/admin/transportation/super?tab=bookings' },
    ];
  }

  if (userType === 'fumigation_admin' || userType === 'lga_fumigation_admin') {
    return [
      ...base,
      { label: ui("LGA Fumigation Dashboard"), path: '/admin/fumigation-cleaning' },
      { label: ui("Fumigation Bookings"), path: '/admin/fumigation-cleaning#fumigation-bookings' },
    ];
  }

  if (userType === 'state_fumigation_admin') {
    return [
      ...base,
      { label: ui("State Fumigation Dashboard"), path: '/admin/fumigation-cleaning/state' },
      { label: ui("State Fumigation Bookings"), path: '/admin/fumigation-cleaning/state#fumigation-bookings' },
    ];
  }

  if (userType === 'super_fumigation_admin') {
    return [
      ...base,
      { label: ui("Super Fumigation Dashboard"), path: '/admin/fumigation-cleaning/super' },
      { label: ui("Super Fumigation Bookings"), path: '/admin/fumigation-cleaning/super#fumigation-bookings' },
    ];
  }

  if (userType === 'agent') {
    return [
      ...base,
      { label: ui("Agent Dashboard"), path: '/agent/dashboard' },
      { label: ui("Agent Earnings"), path: '/agent/earnings' },
      { label: ui("Agent Withdrawals"), path: '/agent/withdrawals' },
      { label: ui("My Properties"), path: '/my-properties' },
      { label: ui("Add Property"), path: '/add-property' },
    ];
  }

  if (userType === 'lawyer') {
    return [
      ...base,
      { label: ui("Lawyer Dashboard"), path: '/lawyer' },
      { label: ui("Case Verification"), path: '/verify-case' },
    ];
  }

  if (userType === 'state_lawyer') {
    return [
      ...base,
      { label: ui("State Lawyer Dashboard"), path: '/lawyer/state' },
      { label: ui("Case Verification"), path: '/verify-case' },
    ];
  }

  if (userType === 'super_lawyer') {
    return [
      ...base,
      { label: ui("Super Lawyer Dashboard"), path: '/lawyer/super' },
      { label: ui("Case Verification"), path: '/verify-case' },
    ];
  }

  if (userType === 'landlord') {
    return [
      ...base,
      { label: ui("Landlord Dashboard"), path: '/dashboard' },
      { label: ui("My Properties"), path: '/my-properties' },
      { label: ui("Add Property"), path: '/add-property' },
    ];
  }

  if (userType === 'tenant') {
    return base;
  }

  return base;
};

const NativeToolsScreen = ({ navigation }) => {
  const interfaceLanguage = useInterfaceLanguage();
  const { user, isAuthenticated } = useContext(AuthContext);

  const publicFeatures = useMemo(() => makePublicFeatures(), [interfaceLanguage]);
  const protectedFeatures = useMemo(
    () =>
      makeProtectedFeatures(
        user?.user_type,
        ['super_admin','recruitment_admin'].includes(user?.user_type) || user?.is_recruitment_admin === true,
        Boolean(user?.assigned_state && user?.assigned_city)
      ),
    [
      user?.assigned_city,
      user?.assigned_state,
      user?.is_recruitment_admin,
      user?.user_type,
    , interfaceLanguage]
  );

  const dashboardTarget = {
    tenant: { name: 'MainTabs', params: { screen: 'DashboardTab' } },
    landlord: { name: 'MainTabs', params: { screen: 'DashboardTab' } },
    agent: { name: 'AgentDashboard' },
    lawyer: { name: 'LawyerDashboard' },
    state_lawyer: { name: 'StateLawyerDashboard' },
    zonal_lawyer: { name: 'ZonalLawyerDashboard' },
    super_lawyer: { name: 'SuperLawyerDashboard' },
    admin: { name: 'AdminDashboard' },
    lga_admin: { name: 'AdminDashboard' },
    super_admin: { name: 'SuperAdminDashboard' },
    financial_admin: { name: 'FinancialAdminDashboard' },
    lga_financial_admin: { name: 'LgaFinancialAdminDashboard' },
    super_financial_admin: { name: 'SuperFinancialAdminDashboard' },
    zonal_financial_admin: { name: 'ZonalFinancialAdminDashboard' },
    recruitment_admin: { name: 'RecruitmentAdmin' },
    state_admin: { name: 'StateAdminDashboard' },
    state_financial_admin: { name: 'StateAdminDashboard' },
    lga_support_admin: { name: 'ServiceOperationsDashboard' },
    state_support_admin: { name: 'ServiceOperationsDashboard' },
    super_support_admin: { name: 'ServiceOperationsDashboard' },
    transportation_admin: { name: 'ServiceOperationsDashboard' },
    lga_transportation_admin: { name: 'ServiceOperationsDashboard' },
    state_transportation_admin: { name: 'ServiceOperationsDashboard' },
    zonal_transportation_admin: { name: 'ServiceOperationsDashboard' },
    super_transportation_admin: { name: 'ServiceOperationsDashboard' },
    fumigation_admin: { name: 'ServiceOperationsDashboard' },
    lga_fumigation_admin: { name: 'ServiceOperationsDashboard' },
    state_fumigation_admin: { name: 'ServiceOperationsDashboard' },
    zonal_fumigation_admin: { name: 'ServiceOperationsDashboard' },
    super_fumigation_admin: { name: 'ServiceOperationsDashboard' },
  }[user?.user_type];
  const usesMainTabs = user?.user_type === 'tenant' || user?.user_type === 'landlord';
  const financialDashboardTarget = user?.user_type === 'lga_financial_admin'
    ? { name: 'LgaFinancialAdminDashboard' }
    : user?.user_type === 'super_financial_admin'
      ? { name: 'SuperFinancialAdminDashboard' }
      : { name: 'FinancialAdminDashboard' };

  const nativeTargets = {
    '/': usesMainTabs
      ? { name: 'MainTabs', params: { screen: 'HomeTab' } }
      : { name: 'Home' },
    '/about': { name: 'AboutUs' },
    '/cases': { name: 'Cases' },
    '/assistance': { name: 'Assistance' },
    '/lawyers': { name: 'LawyersDirectory' },
    '/legal-support': { name: 'LegalSupport' },
    '/properties': { name: 'PropertyList' },
    '/list-property': { name: 'AddProperty' },
    '/transportation/book': { name: 'TransportationBooking' },
    '/transportation/bookings': { name: 'TransportationBookings' },
    '/fumigation-cleaning/catalog': { name: 'FumigationCleaningCatalog' },
    '/fumigation-cleaning/booking': { name: 'FumigationCleaningBooking' },
    '/fumigation-cleaning/bookings': { name: 'FumigationCleaningBookings' },
    '/support': { name: 'Support' },
    '/verify-email': { name: 'VerifyEmail' },
    '/verify-phone': { name: 'VerifyPhone' },
    '/forgot-password': { name: 'ForgotPassword' },
    '/faq': { name: 'PublicInfo', params: { page: 'faq' } },
    '/how-it-works': { name: 'PublicInfo', params: { page: 'how' } },
    '/pricing': { name: 'PublicInfo', params: { page: 'pricing' } },
    '/landlord-guide': { name: 'PublicInfo', params: { page: 'landlordGuide' } },
    '/privacy': { name: 'PublicInfo', params: { page: 'privacy' } },
    '/terms': { name: 'PublicInfo', params: { page: 'terms' } },
    '/nigeria': { name: 'LocationInfo' },
    '/careers': { name: 'Careers' },
    '/profile': { name: 'Profile' },
    '/payment-history': { name: 'PaymentHistory' },
    '/saved-properties': { name: 'SavedProperties' },
    '/applications': [
      { name: 'MainTabs', params: { screen: 'Applications' } },
      { name: 'AdminApplications' },
    ],
    '/messages': usesMainTabs
      ? { name: 'MainTabs', params: { screen: 'Messages' } }
      : { name: 'Messages' },
    '/subscribe': { name: 'Subscribe' },
    '/settings': { name: 'Settings' },
    '/dashboard': dashboardTarget,
    '/tenant/dashboard': dashboardTarget,
    '/admin': { name: 'AdminDashboard' },
    '/admin/recruitment': { name: 'RecruitmentAdmin' },
    '/admin/lawyer-invites': { name: 'AdminLawyerInvites' },
    '/admin/appeals': { name: 'AdminAppeals' },
    '/admin/users': { name: 'AdminUsers' },
    '/admin/properties': { name: 'AdminProperties' },
    '/admin/applications': { name: 'AdminApplications' },
    '/admin/verifications': { name: 'AdminVerifications' },
    '/admin/compliance': { name: 'AdminCompliance' },
    '/admin/inspections': { name: 'AdminInspections' },
    '/admin/evidence-verifications': { name: 'AdminEvidenceVerifications' },
    '/admin/ledger': { name: 'AdminLedger' },
    '/admin/agents': { name: 'AdminAgentAssignments' },
    '/admin/financial-dashboard': financialDashboardTarget,
    '/admin/state-dashboard': { name: 'StateAdminDashboard' },
    '/admin/withdrawals': { name: 'FinancialWithdrawals' },
    '/admin/seo': { name: 'SuperAdminSeo' },
    '/admin/monitor': { name: 'AdminMonitor' },
    '/admin/live-moderation': { name: 'SuperAdminDashboard', params: { initialPanel: 'moderation' } },
    '/super-admin?tab=broadcast': { name: 'SuperAdminDashboard', params: { initialPanel: 'broadcasts' } },
    '/admin/lga-support-dashboard': [
      { name: 'AdminSupportDashboard' },
      { name: 'ServiceOperationsDashboard' },
    ],
    '/admin/lga-support-dashboard?tab=tickets': { name: 'SupportTickets' },
    '/admin/state-support-dashboard': [
      { name: 'AdminSupportDashboard' },
      { name: 'ServiceOperationsDashboard' },
    ],
    '/admin/state-support-dashboard?tab=tickets': { name: 'SupportTickets' },
    '/admin/super-support-dashboard': [
      { name: 'SuperAdminSupportGovernance' },
      { name: 'ServiceOperationsDashboard' },
    ],
    '/admin/super-support-dashboard?tab=tickets': { name: 'SupportTickets' },
    '/admin/transportation': [
      { name: 'AdminTransportationDashboard' },
      { name: 'ServiceOperationsDashboard' },
    ],
    '/admin/transportation?tab=bookings': { name: 'ServiceBookings', params: { type: 'transportation' } },
    '/admin/transportation/state': [
      { name: 'AdminTransportationStateDashboard' },
      { name: 'ServiceOperationsDashboard' },
    ],
    '/admin/transportation/state?tab=bookings': { name: 'ServiceBookings', params: { type: 'transportation_state' } },
    '/admin/transportation/super': [
      { name: 'SuperAdminTransportationDashboard' },
      { name: 'ServiceOperationsDashboard' },
    ],
    '/admin/transportation/super?tab=bookings': { name: 'ServiceBookings', params: { type: 'transportation_super' } },
    '/admin/fumigation-cleaning': [
      { name: 'AdminFumigationDashboard' },
      { name: 'ServiceOperationsDashboard' },
    ],
    '/admin/fumigation-cleaning#fumigation-bookings': { name: 'ServiceBookings', params: { type: 'fumigation' } },
    '/admin/fumigation-cleaning/state': [
      { name: 'AdminFumigationStateDashboard' },
      { name: 'ServiceOperationsDashboard' },
    ],
    '/admin/fumigation-cleaning/state#fumigation-bookings': { name: 'ServiceBookings', params: { type: 'fumigation' } },
    '/admin/fumigation-cleaning/super': [
      { name: 'SuperAdminFumigationDashboard' },
      { name: 'ServiceOperationsDashboard' },
    ],
    '/admin/fumigation-cleaning/super#fumigation-bookings': { name: 'ServiceBookings', params: { type: 'fumigation' } },
    '/super-admin': { name: 'SuperAdminDashboard' },
    '/super-admin/support-governance': { name: 'SuperAdminSupportGovernance' },
    '/super-admin/transportation': { name: 'SuperAdminTransportationDashboard' },
    '/super-admin/fumigation-cleaning': { name: 'SuperAdminFumigationDashboard' },
    '/admin/super-financial-dashboard': [
      { name: 'SuperFinancialAdminDashboard' },
      { name: 'FinancialAdminDashboard' },
    ],
    '/agent/dashboard': { name: 'AgentDashboard' },
    '/agent/earnings': { name: 'AgentEarnings' },
    '/agent/withdrawals': { name: 'AgentWithdrawals' },
    '/my-properties': { name: 'MyProperties' },
    '/add-property': { name: 'AddProperty' },
    '/lawyer': { name: 'LawyerDashboard' },
    '/lawyer/state': { name: 'StateLawyerDashboard' },
    '/lawyer/super': { name: 'SuperLawyerDashboard' },
    '/verify-case': { name: 'VerifyCase' },
    '/my-disputes': { name: 'MyDisputes' },
    '/my-damage-reports': { name: 'MyDamageReports' },
    '/subscribed-properties': { name: 'SubscribedProperties' },
    '/platform-ratings': { name: 'PlatformRatings' },
    '/verification-status': { name: 'VerificationStatus' },
    '/contact-widget': { name: 'ContactWidget' },
    '/whatsapp-bot': { name: 'WhatsAppBot' },
  };

  const availableRoutes = navigation.getState()?.routeNames || [];
  const getNativeTarget = (path) => {
    const target = nativeTargets[path];
    const candidates = Array.isArray(target) ? target : [target];
    return candidates.find((candidate) => candidate?.name && availableRoutes.includes(candidate.name)) || null;
  };

  const openItem = (item) => {
    const target = getNativeTarget(item.path);
    if (target) {
      navigation.navigate(target.name, target.params);
      return;
    }
    Toast.show({
      type: 'info',
      text1: ui("Native screen unavailable here"),
      text2: ui("This tool is not registered for your current app role."),
    });
  };

  const renderFeature = (item, prefix) => {
    const nativeTarget = getNativeTarget(item.path);

    return (
      <ActionRow
        key={`${prefix}-${item.path}`}
        title={item.label}
        subtitle={nativeTarget ? 'Opens inside the mobile app' : 'Native route not available for this role'}
        icon={nativeTarget ? 'phone-portrait-outline' : 'lock-closed-outline'}
        badge={nativeTarget ? 'Native' : 'Role gated'}
        onPress={() => openItem(item)}
      />
    );
  };

  return (
    <DashboardScreen>
      <DashboardHero
        eyebrow={ui("ADDITIONAL TOOLS")}
        title={ui("Everything in one place")}
        subtitle={ui("Native experiences open in the app with role-aware routing, so users stay in the APK.")}
        icon="apps-outline"
      />

      <DashboardSection title={ui("Public information")}>
        {publicFeatures.map((item) => renderFeature(item, 'public'))}
      </DashboardSection>

      {isAuthenticated ? (
        <DashboardSection title={ui("Account and role tools")}>
          {protectedFeatures.map((item) => renderFeature(item, 'protected'))}
        </DashboardSection>
      ) : null}
    </DashboardScreen>
  );
};

export default NativeToolsScreen;
