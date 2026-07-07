import React, { useContext, useMemo } from 'react';
import { AuthContext } from '../../context/AuthContext';
import {
  ActionRow,
  DashboardHero,
  DashboardScreen,
  DashboardSection,
} from '../../components/dashboard/DashboardKit';

const makePublicFeatures = () => [
  { label: 'Home', path: '/' },
  { label: 'Lawyers Directory', path: '/lawyers' },
  { label: 'Properties', path: '/properties' },
  { label: 'Verify Email', path: '/verify-email' },
  { label: 'Verify Phone', path: '/verify-phone' },
  { label: 'Forgot Password', path: '/forgot-password' },
  { label: 'FAQ', path: '/faq' },
  { label: 'How It Works', path: '/how-it-works' },
  { label: 'Pricing', path: '/pricing' },
  { label: 'Landlord Guide', path: '/landlord-guide' },
  { label: 'Privacy', path: '/privacy' },
  { label: 'Terms', path: '/terms' },
  { label: 'Nigeria Page', path: '/nigeria' },
  { label: 'Careers', path: '/careers' },
];

const makeProtectedFeatures = (userType) => {
  const base = [
    { label: 'Profile', path: '/profile' },
    { label: 'Payment History', path: '/payment-history' },
    { label: 'Saved Properties (Web)', path: '/saved-properties' },
    { label: 'Applications (Web)', path: '/applications' },
    { label: 'Messages (Web)', path: '/messages' },
    { label: 'Subscribe', path: '/subscribe' },
    { label: 'Settings', path: '/settings' },
    { label: 'Dashboard', path: '/dashboard' },
  ];

  if (userType === 'admin') {
    return [
      ...base,
      { label: 'Admin Dashboard', path: '/admin' },
      { label: 'Recruitment Admin', path: '/admin/recruitment' },
      { label: 'Admin Lawyer Invites', path: '/admin/lawyer-invites' },
      { label: 'Admin Users', path: '/admin/users' },
      { label: 'Admin Properties', path: '/admin/properties' },
      { label: 'Admin Applications', path: '/admin/applications' },
      { label: 'Admin Verifications', path: '/admin/verifications' },
      { label: 'Admin Compliance', path: '/admin/compliance' },
      { label: 'Admin Agent Management', path: '/admin/agents' },
      { label: 'Admin Financial Dashboard', path: '/admin/financial-dashboard' },
      { label: 'Admin State Dashboard', path: '/admin/state-dashboard' },
      { label: 'LGA Transportation Dashboard', path: '/admin/transportation' },
      { label: 'LGA Fumigation Dashboard', path: '/admin/fumigation-cleaning' },
    ];
  }

  if (userType === 'financial_admin' || userType === 'lga_financial_admin') {
    return [
      ...base,
      { label: 'Financial Dashboard', path: '/admin/financial-dashboard' },
      { label: 'Admin Dashboard', path: '/admin' },
    ];
  }

  if (userType === 'super_financial_admin') {
    return [
      ...base,
      { label: 'Super Financial Dashboard', path: '/admin/super-financial-dashboard' },
      { label: 'Admin Dashboard', path: '/admin' },
    ];
  }

  if (userType === 'state_admin') {
    return [
      ...base,
      { label: 'State Dashboard', path: '/admin/state-dashboard' },
      { label: 'Admin Dashboard', path: '/admin' },
      { label: 'State Transportation Dashboard', path: '/admin/transportation/state' },
      { label: 'State Fumigation Dashboard', path: '/admin/fumigation-cleaning/state' },
    ];
  }

  if (userType === 'state_financial_admin') {
    return [
      ...base,
      { label: 'State Dashboard', path: '/admin/state-dashboard' },
      { label: 'Admin Dashboard', path: '/admin' },
      { label: 'State Transportation Dashboard', path: '/admin/transportation/state' },
      { label: 'State Fumigation Dashboard', path: '/admin/fumigation-cleaning/state' },
    ];
  }

  if (userType === 'super_admin') {
    return [
      ...base,
      { label: 'Super Admin Dashboard', path: '/super-admin' },
      { label: 'Recruitment Admin', path: '/admin/recruitment' },
      { label: 'Admin Dashboard', path: '/admin' },
      { label: 'Admin Users', path: '/admin/users' },
      { label: 'Admin Properties', path: '/admin/properties' },
      { label: 'Admin Applications', path: '/admin/applications' },
      { label: 'Admin Verifications', path: '/admin/verifications' },
      { label: 'Admin Compliance', path: '/admin/compliance' },
      { label: 'Admin Agent Management', path: '/admin/agents' },
      { label: 'Super Transportation Dashboard', path: '/super-admin/transportation' },
      { label: 'Super Fumigation Dashboard', path: '/super-admin/fumigation-cleaning' },
    ];
  }

  if (userType === 'lga_support_admin') {
    return [
      ...base,
      { label: 'LGA Support Dashboard', path: '/admin/lga-support-dashboard' },
      { label: 'Support Tickets', path: '/admin/lga-support-dashboard?tab=tickets' },
    ];
  }

  if (userType === 'state_support_admin') {
    return [
      ...base,
      { label: 'State Support Dashboard', path: '/admin/state-support-dashboard' },
      { label: 'Support Tickets', path: '/admin/state-support-dashboard?tab=tickets' },
    ];
  }

  if (userType === 'super_support_admin') {
    return [
      ...base,
      { label: 'Super Support Dashboard', path: '/admin/super-support-dashboard' },
      { label: 'Support Tickets', path: '/admin/super-support-dashboard?tab=tickets' },
    ];
  }

  if (userType === 'transportation_admin' || userType === 'lga_transportation_admin') {
    return [
      ...base,
      { label: 'LGA Transportation Dashboard', path: '/admin/transportation' },
      { label: 'Transportation Bookings', path: '/admin/transportation?tab=bookings' },
    ];
  }

  if (userType === 'state_transportation_admin') {
    return [
      ...base,
      { label: 'State Transportation Dashboard', path: '/admin/transportation/state' },
      { label: 'State Transportation Bookings', path: '/admin/transportation/state?tab=bookings' },
    ];
  }

  if (userType === 'super_transportation_admin') {
    return [
      ...base,
      { label: 'Super Transportation Dashboard', path: '/admin/transportation/super' },
      { label: 'Super Transportation Bookings', path: '/admin/transportation/super?tab=bookings' },
    ];
  }

  if (userType === 'fumigation_admin' || userType === 'lga_fumigation_admin') {
    return [
      ...base,
      { label: 'LGA Fumigation Dashboard', path: '/admin/fumigation-cleaning' },
      { label: 'Fumigation Bookings', path: '/admin/fumigation-cleaning#fumigation-bookings' },
    ];
  }

  if (userType === 'state_fumigation_admin') {
    return [
      ...base,
      { label: 'State Fumigation Dashboard', path: '/admin/fumigation-cleaning/state' },
      { label: 'State Fumigation Bookings', path: '/admin/fumigation-cleaning/state#fumigation-bookings' },
    ];
  }

  if (userType === 'super_fumigation_admin') {
    return [
      ...base,
      { label: 'Super Fumigation Dashboard', path: '/admin/fumigation-cleaning/super' },
      { label: 'Super Fumigation Bookings', path: '/admin/fumigation-cleaning/super#fumigation-bookings' },
    ];
  }

  if (userType === 'agent') {
    return [
      ...base,
      { label: 'Agent Dashboard (Web)', path: '/agent/dashboard' },
      { label: 'Agent Earnings (Web)', path: '/agent/earnings' },
      { label: 'Agent Withdrawals (Web)', path: '/agent/withdrawals' },
      { label: 'My Properties', path: '/my-properties' },
      { label: 'Add Property', path: '/add-property' },
    ];
  }

  if (userType === 'lawyer') {
    return [
      ...base,
      { label: 'Lawyer Dashboard', path: '/lawyer' },
      { label: 'Case Verification', path: '/verify-case' },
    ];
  }

  if (userType === 'landlord') {
    return [
      ...base,
      { label: 'Landlord Dashboard', path: '/dashboard' },
      { label: 'My Properties', path: '/my-properties' },
      { label: 'Add Property', path: '/add-property' },
    ];
  }

  if (userType === 'tenant') {
    return [...base, { label: 'Tenant Dashboard', path: '/tenant/dashboard' }];
  }

  return base;
};

const WebFeaturesScreen = ({ navigation }) => {
  const { user, isAuthenticated } = useContext(AuthContext);

  const publicFeatures = useMemo(() => makePublicFeatures(), []);
  const protectedFeatures = useMemo(
    () => makeProtectedFeatures(user?.user_type),
    [user?.user_type]
  );

  const dashboardTarget = {
    tenant: { name: 'MainTabs', params: { screen: 'DashboardTab' } },
    landlord: { name: 'MainTabs', params: { screen: 'DashboardTab' } },
    agent: { name: 'AgentDashboard' },
    lawyer: { name: 'LawyerDashboard' },
    admin: { name: 'AdminDashboard' },
    lga_admin: { name: 'AdminDashboard' },
    super_admin: { name: 'SuperAdminDashboard' },
    financial_admin: { name: 'FinancialAdminDashboard' },
    lga_financial_admin: { name: 'FinancialAdminDashboard' },
    super_financial_admin: { name: 'FinancialAdminDashboard' },
    state_admin: { name: 'StateAdminDashboard' },
    state_financial_admin: { name: 'StateAdminDashboard' },
    lga_support_admin: { name: 'ServiceOperationsDashboard' },
    state_support_admin: { name: 'ServiceOperationsDashboard' },
    super_support_admin: { name: 'ServiceOperationsDashboard' },
    transportation_admin: { name: 'ServiceOperationsDashboard' },
    lga_transportation_admin: { name: 'ServiceOperationsDashboard' },
    state_transportation_admin: { name: 'ServiceOperationsDashboard' },
    super_transportation_admin: { name: 'ServiceOperationsDashboard' },
    fumigation_admin: { name: 'ServiceOperationsDashboard' },
    lga_fumigation_admin: { name: 'ServiceOperationsDashboard' },
    state_fumigation_admin: { name: 'ServiceOperationsDashboard' },
    super_fumigation_admin: { name: 'ServiceOperationsDashboard' },
  }[user?.user_type];
  const usesMainTabs = user?.user_type === 'tenant' || user?.user_type === 'landlord';

  const nativeTargets = {
    '/': usesMainTabs
      ? { name: 'MainTabs', params: { screen: 'HomeTab' } }
      : { name: 'Home' },
    '/lawyers': { name: 'LawyersDirectory' },
    '/legal-support': { name: 'LegalSupport' },
    '/properties': { name: 'PropertyList' },
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
    '/applications': { name: 'MainTabs', params: { screen: 'Applications' } },
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
    '/admin/users': { name: 'AdminUsers' },
    '/admin/properties': { name: 'AdminProperties' },
    '/admin/applications': { name: 'AdminApplications' },
    '/admin/verifications': { name: 'AdminVerifications' },
    '/admin/compliance': { name: 'AdminCompliance' },
    '/admin/agents': { name: 'AdminAgentAssignments' },
    '/admin/financial-dashboard': { name: 'FinancialAdminDashboard' },
    '/admin/state-dashboard': { name: 'StateAdminDashboard' },
    '/admin/lga-support-dashboard': { name: 'ServiceOperationsDashboard' },
    '/admin/lga-support-dashboard?tab=tickets': { name: 'SupportTickets' },
    '/admin/state-support-dashboard': { name: 'ServiceOperationsDashboard' },
    '/admin/state-support-dashboard?tab=tickets': { name: 'SupportTickets' },
    '/admin/super-support-dashboard': { name: 'ServiceOperationsDashboard' },
    '/admin/super-support-dashboard?tab=tickets': { name: 'SupportTickets' },
    '/admin/transportation': { name: 'ServiceOperationsDashboard' },
    '/admin/transportation?tab=bookings': { name: 'ServiceBookings', params: { type: 'transportation' } },
    '/admin/transportation/state': { name: 'ServiceOperationsDashboard' },
    '/admin/transportation/state?tab=bookings': { name: 'ServiceBookings', params: { type: 'transportation_state' } },
    '/admin/transportation/super': { name: 'ServiceOperationsDashboard' },
    '/admin/transportation/super?tab=bookings': { name: 'ServiceBookings', params: { type: 'transportation_super' } },
    '/admin/fumigation-cleaning': { name: 'ServiceOperationsDashboard' },
    '/admin/fumigation-cleaning#fumigation-bookings': { name: 'ServiceBookings', params: { type: 'fumigation' } },
    '/admin/fumigation-cleaning/state': { name: 'ServiceOperationsDashboard' },
    '/admin/fumigation-cleaning/state#fumigation-bookings': { name: 'ServiceBookings', params: { type: 'fumigation' } },
    '/admin/fumigation-cleaning/super': { name: 'ServiceOperationsDashboard' },
    '/admin/fumigation-cleaning/super#fumigation-bookings': { name: 'ServiceBookings', params: { type: 'fumigation' } },
    '/super-admin': { name: 'SuperAdminDashboard' },
    '/agent/dashboard': { name: 'AgentDashboard' },
    '/agent/earnings': { name: 'AgentEarnings' },
    '/agent/withdrawals': { name: 'AgentWithdrawals' },
    '/my-properties': { name: 'MyProperties' },
    '/add-property': { name: 'AddProperty' },
    '/lawyer': { name: 'LawyerDashboard' },
    '/verify-case': { name: 'VerifyCase' },
  };

  const availableRoutes = navigation.getState()?.routeNames || [];
  const getNativeTarget = (path) => {
    const target = nativeTargets[path];
    return target?.name && availableRoutes.includes(target.name) ? target : null;
  };

  const openItem = (item) => {
    const target = getNativeTarget(item.path);
    if (target) {
      navigation.navigate(target.name, target.params);
      return;
    }
    navigation.navigate('WebRoute', { path: item.path, title: item.label });
  };

  const renderFeature = (item, prefix) => {
    const nativeTarget = getNativeTarget(item.path);

    return (
      <ActionRow
        key={`${prefix}-${item.path}`}
        title={item.label.replace(' (Web)', '')}
        subtitle={nativeTarget ? 'Opens inside the mobile app' : 'Opens the secure web module'}
        icon={nativeTarget ? 'phone-portrait-outline' : 'globe-outline'}
        badge={nativeTarget ? 'Native' : 'Web'}
        onPress={() => openItem(item)}
      />
    );
  };

  return (
    <DashboardScreen>
      <DashboardHero
        eyebrow="ADDITIONAL TOOLS"
        title="Everything in one place"
        subtitle="Native experiences open in the app. Only tools still awaiting conversion use the secure web module."
        icon="apps-outline"
      />

      <DashboardSection title="Public information">
        {publicFeatures.map((item) => renderFeature(item, 'public'))}
      </DashboardSection>

      {isAuthenticated ? (
        <DashboardSection title="Account and role tools">
          {protectedFeatures.map((item) => renderFeature(item, 'protected'))}
        </DashboardSection>
      ) : null}
    </DashboardScreen>
  );
};

export default WebFeaturesScreen;
