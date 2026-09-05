import React, { useContext, useEffect } from 'react';
import { ActivityIndicator, AppState, BackHandler, Linking, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { navigationRef } from './navigationRef';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import { AuthContext } from '../context/AuthContext';
import BrandSplash from '../components/brand/BrandSplash';
import { colors, typography } from '../theme';
import {
  getPendingPayment,
  isLikelyPaymentReturnUrl,
  recoverPayment,
} from '../services/paymentRecoveryService';

import WelcomeScreen from '../screens/auth/WelcomeScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import VerifyEmailScreen from '../screens/auth/VerifyEmailScreen';
import VerifyPhoneScreen from '../screens/auth/VerifyPhoneScreen';
import AcceptLawyerInviteScreen from '../screens/auth/AcceptLawyerInviteScreen';
import AcceptAgentInviteScreen from '../screens/auth/AcceptAgentInviteScreen';

import HomeScreen from '../screens/home/HomeScreen';
import PropertyListScreen from '../screens/home/PropertyListScreen';
import PropertyDetailScreen from '../screens/home/PropertyDetailScreen';
import PropertyAlertRequestScreen from '../screens/home/PropertyAlertRequestScreen';
import LocationInfoScreen from '../screens/home/LocationInfoScreen';

import DashboardScreen from '../screens/dashboard/DashboardScreen';
import ProfileScreen from '../screens/dashboard/ProfileScreen';
import SavedPropertiesScreen from '../screens/dashboard/SavedPropertiesScreen';
import MyPropertiesScreen from '../screens/dashboard/MyPropertiesScreen';
import AddPropertyScreen from '../screens/dashboard/AddPropertyScreen';
import SubscribeScreen from '../screens/dashboard/SubscribeScreen';
import NotificationsScreen from '../screens/dashboard/NotificationsScreen';
import PaymentHistoryScreen from '../screens/dashboard/PaymentHistoryScreen';

import ApplicationsScreen from '../screens/applications/ApplicationsScreen';
import ApplicationDetailScreen from '../screens/applications/ApplicationDetailScreen';
import MessagesScreen from '../screens/messages/MessagesScreen';

import LawyerDashboardScreen from '../screens/lawyer/LawyerDashboardScreen';
import DisputeDetailsScreen from '../screens/lawyer/DisputeDetailsScreen';
import LawyersDirectoryScreen from '../screens/legal/LawyersDirectoryScreen';
import LegalSupportScreen from '../screens/legal/LegalSupportScreen';

import VerifyCaseScreen from '../screens/shared/VerifyCaseScreen';
import NativeToolsScreen from '../screens/shared/NativeToolsScreen';

import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminUsersScreen from '../screens/admin/AdminUsersScreen';
import AdminPropertiesScreen from '../screens/admin/AdminPropertiesScreen';
import AdminApplicationsScreen from '../screens/admin/AdminApplicationsScreen';
import AdminVerificationsScreen from '../screens/admin/AdminVerificationsScreen';
import AdminComplianceScreen from '../screens/admin/AdminComplianceScreen';
import AdminAppealsScreen from '../screens/admin/AdminAppealsScreen';
import AdminMonitorScreen from '../screens/admin/AdminMonitorScreen';
import AdminAgentAssignmentsScreen from '../screens/admin/AdminAgentAssignmentsScreen';

import AgentDashboardScreen from '../screens/agent/AgentDashboardScreen';
import AgentEarningsScreen from '../screens/agent/AgentEarningsScreen';
import AgentWithdrawalsScreen from '../screens/agent/AgentWithdrawalsScreen';

// ========== Rent Savings (Tenant) ==========
import RentSavingsDashboardScreen from '../screens/rent-savings/RentSavingsDashboardScreen';
import SavingsGoalCreateScreen from '../screens/rent-savings/SavingsGoalCreateScreen';
import SavingsGoalListScreen from '../screens/rent-savings/SavingsGoalListScreen';
import SavingsGoalDetailScreen from '../screens/rent-savings/SavingsGoalDetailScreen';
import RentCalculatorScreen from '../screens/rent-savings/RentCalculatorScreen';

// ========== Financial Admin ==========
import FinancialAdminDashboardScreen from '../screens/financial-admin/FinancialAdminDashboardScreen';
import FinancialRevenueReportScreen from '../screens/financial-admin/FinancialRevenueReportScreen';
import FinancialTransactionsScreen from '../screens/financial-admin/FinancialTransactionsScreen';
import FinancialWithdrawalsScreen from '../screens/financial-admin/FinancialWithdrawalsScreen';
import FinancialCommissionsScreen from '../screens/financial-admin/FinancialCommissionsScreen';
import FinancialControlsScreen from '../screens/financial-admin/FinancialControlsScreen';
import LgaFinancialAdminDashboardScreen from '../screens/financial-admin/LgaFinancialAdminDashboardScreen';

// ========== State Admin ==========
import StateAdminDashboardScreen from '../screens/state-admin/StateAdminDashboardScreen';
import StateAdminMigrationsScreen from '../screens/state-admin/StateAdminMigrationsScreen';

// ========== Service Operations Admin ==========
import ServiceBookingsScreen from '../screens/service-admin/ServiceBookingsScreen';
import ServiceOperationsDashboardScreen from '../screens/service-admin/ServiceOperationsDashboardScreen';
import SupportTicketsScreen from '../screens/service-admin/SupportTicketsScreen';
import SupportTicketDetailScreen from '../screens/service-admin/SupportTicketDetailScreen';
import FumigationComplianceScreen from '../screens/service-admin/FumigationComplianceScreen';

// ========== Admin (additional screens) ==========
import AdminPropertyDetailScreen from '../screens/admin/AdminPropertyDetailScreen';
import AdminUserDetailScreen from '../screens/admin/AdminUserDetailScreen';
import AdminLawyerInvitesScreen from '../screens/admin/AdminLawyerInvitesScreen';

// ========== Transportation ==========
import TransportationBookingScreen from '../screens/transportation/TransportationBookingScreen';
import TransportationBookingDetailScreen from '../screens/transportation/TransportationBookingDetailScreen';
import TransportationPaymentScreen from '../screens/transportation/TransportationPaymentScreen';
import TransportationBookingsScreen from '../screens/transportation/TransportationBookingsScreen';

// ========== Fumigation / Cleaning ==========
import FumigationCleaningBookingScreen from '../screens/fumigation/FumigationCleaningBookingScreen';
import FumigationCleaningBookingDetailScreen from '../screens/fumigation/FumigationCleaningBookingDetailScreen';
import FumigationCleaningPaymentScreen from '../screens/fumigation/FumigationCleaningPaymentScreen';
import FumigationCleaningBookingsScreen from '../screens/fumigation/FumigationCleaningBookingsScreen';

// ========== Verification Status ==========
import VerificationStatusScreen from '../screens/shared/VerificationStatusScreen';
import CareersScreen from '../screens/shared/CareersScreen';
import InterviewScreen from '../screens/shared/InterviewScreen';
import RecruitmentApplicationScreen from '../screens/shared/RecruitmentApplicationScreen';
import RecruitmentAdminScreen from '../screens/shared/RecruitmentAdminScreen';
import PublicInfoScreen from '../screens/shared/PublicInfoScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import TourTarget from '../components/tour/TourTarget';

import PlatformRatingsScreen from '../screens/shared/PlatformRatingsScreen';
import ContactWidgetScreen from '../screens/shared/ContactWidgetScreen';
import WhatsAppBotScreen from '../screens/shared/WhatsAppBotScreen';
import DesktopOnlyScreen from '../screens/shared/DesktopOnlyScreen';
import MyDisputesScreen from '../screens/shared/MyDisputesScreen';
import MyAppealsScreen from '../screens/shared/MyAppealsScreen';
import AppealCreateScreen from '../screens/shared/AppealCreateScreen';
import StateMigrationScreen from '../screens/shared/StateMigrationScreen';
import RefundRequestsScreen from '../screens/shared/RefundRequestsScreen';
import RefundRequestScreen from '../screens/shared/RefundRequestScreen';
import SurveyScreen from '../screens/shared/SurveyScreen';
import ModerationHubScreen from '../screens/shared/ModerationHubScreen';
import StateAdminFinanceScreen from '../screens/shared/StateAdminFinanceScreen';
import FinanceStateAdminScreen from '../screens/shared/FinanceStateAdminScreen';
import RentSavingsAdminScreen from '../screens/shared/RentSavingsAdminScreen';
import AgentCommissionAdminScreen from '../screens/shared/AgentCommissionAdminScreen';
import AdminAccountsScreen from '../screens/shared/AdminAccountsScreen';
import SurveyAnalyticsScreen from '../screens/shared/SurveyAnalyticsScreen';
import MarketingScreen from '../screens/shared/MarketingScreen';
import DiasporaDeskScreen from '../screens/shared/DiasporaDeskScreen';
import SeoToolsScreen from '../screens/shared/SeoToolsScreen';
import PrivacyDataScreen from '../screens/shared/PrivacyDataScreen';
import MarketingAgentScreen from '../screens/shared/MarketingAgentScreen';
import ZonalAdminScreen from '../screens/shared/ZonalAdminScreen';
import ZonalListScreen from '../screens/shared/ZonalListScreen';
import PublicSurveyScreen from '../screens/shared/PublicSurveyScreen';
import ContentModerationHub from '../screens/shared/ContentModerationHub';
import VoiceMonitorScreen from '../screens/shared/VoiceMonitorScreen';
import CourtBundleScreen from '../screens/shared/CourtBundleScreen';
import MarketingBuilderScreen from '../screens/shared/MarketingBuilderScreen';
import EmailTemplateEditorScreen from '../screens/shared/EmailTemplateEditorScreen';
import MyDamageReportsScreen from '../screens/shared/MyDamageReportsScreen';
import SubscribedPropertiesScreen from '../screens/shared/SubscribedPropertiesScreen';
import SupportScreen from '../screens/shared/SupportScreen';
import AboutUsScreen from '../screens/shared/AboutUsScreen';
import FumigationCleaningCatalogScreen from '../screens/fumigation/FumigationCleaningCatalogScreen';
import AdminInspectionsScreen from '../screens/admin/AdminInspectionsScreen';
import AdminEvidenceVerificationsScreen from '../screens/admin/AdminEvidenceVerificationsScreen';
import AdminLedgerScreen from '../screens/admin/AdminLedgerScreen';
import AdminTransportationDashboardScreen from '../screens/admin/AdminTransportationDashboardScreen';
import AdminTransportationStateDashboardScreen from '../screens/admin/AdminTransportationStateDashboardScreen';
import AdminFumigationDashboardScreen from '../screens/admin/AdminFumigationDashboardScreen';
import AdminFumigationStateDashboardScreen from '../screens/admin/AdminFumigationStateDashboardScreen';
import AdminSupportDashboardScreen from '../screens/admin/AdminSupportDashboardScreen';
import AdminPoolScreen from '../screens/service-admin/AdminPoolScreen';
import ActivityFeedScreen from '../screens/service-admin/ActivityFeedScreen';
import SuperAdminDashboardScreen from '../screens/admin/SuperAdminDashboardScreen';
import SuperAdminSeoDashboardScreen from '../screens/admin/SuperAdminSeoDashboardScreen';
import SuperAdminSupportGovernanceScreen from '../screens/admin/SuperAdminSupportGovernanceScreen';
import SuperAdminTransportationDashboardScreen from '../screens/admin/SuperAdminTransportationDashboardScreen';
import SuperAdminFumigationDashboardScreen from '../screens/admin/SuperAdminFumigationDashboardScreen';
import SuperFinancialAdminDashboardScreen from '../screens/admin/SuperFinancialAdminDashboardScreen';
import StateLawyerDashboardScreen from '../screens/lawyer/StateLawyerDashboardScreen';
import SuperLawyerDashboardScreen from '../screens/lawyer/SuperLawyerDashboardScreen';
const Stack = (Platform.OS === 'web' ? createStackNavigator : createNativeStackNavigator)();
const Tab = createBottomTabNavigator();

const screenOptions = {
  headerTitleAlign: 'center',
  headerShadowVisible: false,
  headerStyle: {
    backgroundColor: colors.white,
  },
  headerTintColor: colors.navy,
  headerTitleStyle: {
    fontFamily: typography.semibold,
    fontSize: 18,
  },
  contentStyle: {
    backgroundColor: colors.surface,
  },
};

const linkingConfig = {
  prefixes: ['rentalhub://', 'https://rentalhub.com.ng', 'https://www.rentalhub.com.ng'],
  config: {
    screens: {
      Welcome: 'welcome',
      Home: '',
      Login: 'login',
      Register: {
        path: 'register',
        parse: {
          referral: String,
          referral_code: String,
        },
      },
      ForgotPassword: 'forgot-password',
      Profile: 'profile',
      PropertyList: 'properties',
      PropertyDetail: 'properties/:id',
      PropertyAlertRequest: 'property-request',
      AcceptLawyerInvite: 'lawyer/accept-invite',
      AcceptAgentInvite: 'agent/accept-invite',
      NativeTools: 'tools',
      Applications: 'applications',
      SavedProperties: 'saved-properties',
      Subscribe: 'subscribe',
      PaymentHistory: 'payment-history',
      Messages: 'messages',
      MyProperties: 'my-properties',
      AddProperty: 'add-property',
      AgentDashboard: 'agent/dashboard',
      AgentEarnings: 'agent/earnings',
      AgentWithdrawals: 'agent/withdrawals',
      LawyerDashboard: 'lawyer',
      StateLawyerDashboard: 'lawyer/state',
      SuperLawyerDashboard: 'lawyer/super',
      AdminDashboard: 'admin',
      AdminUsers: 'admin/users',
      AdminProperties: 'admin/properties',
      AdminApplications: 'admin/applications',
      AdminVerifications: 'admin/verifications',
      AdminCompliance: 'admin/compliance',
      AdminAppeals: 'admin/appeals',
      AdminMonitor: 'admin/monitor',
      AdminInspections: 'admin/inspections',
      AdminEvidenceVerifications: 'admin/evidence-verifications',
      AdminLedger: 'admin/ledger',
      AdminAgentAssignments: 'admin/agents',
      AdminTransportationDashboard: 'admin/transportation',
      AdminFumigationDashboard: 'admin/fumigation-cleaning',
      AdminTransportationStateDashboard: 'admin/transportation/state',
      AdminFumigationStateDashboard: 'admin/fumigation-cleaning/state',
      SuperAdminDashboard: 'super-admin',
      SuperAdminSeo: 'admin/seo',
      SuperAdminSeoNested: 'super-admin/seo',
      SuperAdminSupportGovernance: 'super-admin/support-governance',
      SuperAdminTransportationDashboard: 'super-admin/transportation',
      SuperAdminFumigationDashboard: 'super-admin/fumigation-cleaning',
      RentSavingsDashboard: 'rent-savings',
      SavingsGoalCreate: 'rent-savings/goals/create',
      SavingsGoalList: 'rent-savings/goals',
      SavingsGoalDetail: 'rent-savings/goals/:goalId',
      RentCalculator: 'rent-calculator',
      PublicSurvey: 'survey',
      FinancialAdminDashboard: 'admin/financial-dashboard',
      SuperFinancialAdminDashboard: 'admin/super-financial-dashboard',
      FinancialRevenueReport: 'admin/financial/revenue',
      FinancialTransactions: 'admin/financial/transactions',
      FinancialWithdrawals: 'admin/withdrawals',
      FinancialCommissions: 'admin/financial/commissions',
      FinancialControls: 'admin/financial/controls',
      StateAdminDashboard: 'admin/state-dashboard',
      StateAdminMigrations: 'admin/state/migrations',
      AdminPropertyDetail: 'admin/properties/:id',
      AdminUserDetail: 'admin/users/:id',
      AdminApplicationDetail: 'admin/applications/:id',
      AdminLawyerInvites: 'admin/lawyer-invites',
      TransportationBooking: 'transportation/book',
      TransportationBookings: 'transportation/bookings',
      TransportationBookingDetail: 'transportation/bookings/:bookingId',
      TransportationPayment: 'transportation/payment/:bookingId',
      FumigationCleaningBooking: 'fumigation-cleaning/booking',
      FumigationCleaningBookings: 'fumigation-cleaning/bookings',
      FumigationCleaningBookingDetail: 'fumigation-cleaning/bookings/:bookingId',
      FumigationCleaningPayment: 'fumigation-cleaning/payment/:bookingId',
      Support: 'support',
      MyDisputes: 'my-disputes',
      MyDamageReports: 'my-damage-reports',
      SubscribedProperties: 'subscribed-properties',
      VerificationStatus: 'verification-status',
      FumigationCleaningCatalog: 'fumigation-cleaning/catalog',
      Careers: 'careers',
      RecruitmentAdmin: 'admin/recruitment',
      ResetPassword: 'reset-password/:token',
      VerifyEmail: 'verify-email',
      VerifyEmailToken: 'verify-email/:token',
      VerifyEmailAuthToken: 'auth/verify-email/:token',
      VerifyPhone: 'verify-phone',
      VerifyCaseAlias: 'verify',
      DisputeDetails: 'dispute/:disputeId',
      Faq: 'faq',
      HowItWorks: 'how-it-works',
      Pricing: 'pricing',
      LandlordGuide: 'landlord-guide',
      Privacy: 'privacy',
      Terms: 'terms',
      NigeriaPage: 'nigeria',
      AboutUs: 'about',
      LocationInfo: {
        path: 'nigeria/:stateSlug',
        parse: {
          stateSlug: String,
          citySlug: String,
          areaSlug: String,
        },
      },
      LocationInfoLga: {
        path: 'nigeria/:stateSlug/:lgaSlug',
        parse: {
          stateSlug: String,
          lgaSlug: String,
        },
      },
      AreaInfo: {
        path: 'areas/:stateSlug/:citySlug/:areaSlug',
        parse: {
          stateSlug: String,
          citySlug: String,
          areaSlug: String,
        },
      },
      LawyersDirectory: 'lawyers',
      LegalSupport: 'legal-support',
    },
  },
};

const tabIcon = (routeName, focused, color, size) => {
  let iconName = 'ellipse-outline';
  if (routeName === 'HomeTab') iconName = focused ? 'compass' : 'compass-outline';
  if (routeName === 'DashboardTab') iconName = focused ? 'person-circle' : 'person-circle-outline';
  if (routeName === 'Applications') iconName = focused ? 'document-text' : 'document-text-outline';
  if (routeName === 'Messages') iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
  return <Icon name={iconName} size={size} color={color} />;
};

const commonVerificationScreens = () => (
  <>
    <Stack.Screen name="VerificationStatus" component={VerificationStatusScreen} options={{ title: 'Verification Status' }} />
    <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} options={{ title: 'Verify Email' }} />
    <Stack.Screen name="VerifyEmailToken" component={VerifyEmailScreen} options={{ title: 'Verify Email' }} />
    <Stack.Screen name="VerifyEmailAuthToken" component={VerifyEmailScreen} options={{ title: 'Verify Email' }} />
    <Stack.Screen name="VerifyPhone" component={VerifyPhoneScreen} options={{ title: 'Verify Phone' }} />
  </>
);

const commonAppealScreens = () => (
  <>
    <Stack.Screen name="MyAppeals" component={MyAppealsScreen} options={{ title: 'My Appeals' }} />
    <Stack.Screen name="AppealCreate" component={AppealCreateScreen} options={{ title: 'Submit Appeal' }} />
  </>
);

const commonTenancyScreens = () => (
  <>
    <Stack.Screen name="RefundRequests" component={RefundRequestsScreen} options={{ title: 'Refund Requests' }} />
    <Stack.Screen name="RefundRequest" component={RefundRequestScreen} options={{ title: 'Request Refund' }} />
  </>
);

const commonInfoScreens = () => (
  <>
    <Stack.Screen name="PublicInfo" component={PublicInfoScreen} options={{ title: 'Information' }} />
    <Stack.Screen name="LocationInfoLga" component={LocationInfoScreen} options={{ title: 'Location' }} />
    <Stack.Screen name="AreaInfo" component={LocationInfoScreen} options={{ title: 'Location' }} />
    <Stack.Screen name="VerifyCaseAlias" component={VerifyCaseScreen} options={{ title: 'Verify Case' }} />
    <Stack.Screen name="LawyersDirectory" component={LawyersDirectoryScreen} options={{ title: 'Lawyers' }} />
    <Stack.Screen name="LegalSupport" component={LegalSupportScreen} options={{ title: 'Legal Support' }} />
    <Stack.Screen name="PlatformRatings" component={PlatformRatingsScreen} options={{ title: 'Ratings' }} />
    <Stack.Screen name="WhatsAppBot" component={WhatsAppBotScreen} options={{ title: 'WhatsApp Assistant' }} />
    <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
    <Stack.Screen name="ContactWidget" component={ContactWidgetScreen} options={{ title: 'Support' }} />
  </>
);

const DesktopOnlyRoot = ({ roleLabel }) => (
  <Stack.Navigator screenOptions={screenOptions}>
    <Stack.Screen name="DesktopOnly" options={{ headerShown: false }}>
      {(props) => <DesktopOnlyScreen {...props} roleLabel={roleLabel} />}
    </Stack.Screen>
  </Stack.Navigator>
);

const GuestStack = () => (
  <Stack.Navigator initialRouteName="Welcome" screenOptions={screenOptions}>
    <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
    <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
    <Stack.Screen name="PropertyList" component={PropertyListScreen} options={{ title: 'Browse Properties' }} />
    <Stack.Screen name="PropertyDetail" component={PropertyDetailScreen} options={{ title: 'Property Details' }} />
    <Stack.Screen name="RentCalculator" component={RentCalculatorScreen} options={{ title: 'Rent Calculator' }} />
    <Stack.Screen name="PublicSurvey" component={PublicSurveyScreen} options={{ title: 'Take the Survey' }} />
    <Stack.Screen name="PropertyAlertRequest" component={PropertyAlertRequestScreen} options={{ title: 'Submit Request' }} />
    <Stack.Screen name="LocationInfo" component={LocationInfoScreen} options={{ title: 'Location' }} />
    <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
    <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: 'Forgot Password' }} />
    <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} options={{ title: 'Reset Password' }} />
    {commonVerificationScreens()}
    {commonAppealScreens()}
    {commonTenancyScreens()}
    <Stack.Screen name="AcceptLawyerInvite" component={AcceptLawyerInviteScreen} options={{ title: 'Lawyer Invite' }} />
    <Stack.Screen name="AcceptAgentInvite" component={AcceptAgentInviteScreen} options={{ title: 'Agent Invite' }} />
    {commonInfoScreens()}
    <Stack.Screen name="NativeTools" component={NativeToolsScreen} options={{ title: 'More Tools' }} />
    <Stack.Screen name="TransportationBooking" component={TransportationBookingScreen} options={{ title: 'Transportation' }} />
    <Stack.Screen name="TransportationBookings" component={TransportationBookingsScreen} options={{ title: 'Transport Bookings' }} />
    <Stack.Screen name="TransportationBookingDetail" component={TransportationBookingDetailScreen} options={{ title: 'Booking Details' }} />
    <Stack.Screen name="TransportationPayment" component={TransportationPaymentScreen} options={{ title: 'Transport Payment' }} />
    <Stack.Screen name="FumigationCleaningBooking" component={FumigationCleaningBookingScreen} options={{ title: 'Fumigation & Cleaning' }} />
    <Stack.Screen name="FumigationCleaningBookings" component={FumigationCleaningBookingsScreen} options={{ title: 'My Bookings' }} />
    <Stack.Screen name="FumigationCleaningBookingDetail" component={FumigationCleaningBookingDetailScreen} options={{ title: 'Booking Details' }} />
    <Stack.Screen name="FumigationCleaningPayment" component={FumigationCleaningPaymentScreen} options={{ title: 'Payment' }} />

    <Stack.Screen name="Faq" component={PublicInfoScreen} initialParams={{ page: 'faq' }} options={{ title: 'FAQ' }} />
    <Stack.Screen name="HowItWorks" component={PublicInfoScreen} initialParams={{ page: 'how' }} options={{ title: 'How It Works' }} />
    <Stack.Screen name="Pricing" component={PublicInfoScreen} initialParams={{ page: 'pricing' }} options={{ title: 'Pricing' }} />
    <Stack.Screen name="LandlordGuide" component={PublicInfoScreen} initialParams={{ page: 'landlordGuide' }} options={{ title: 'Landlord Guide' }} />
    <Stack.Screen name="Privacy" component={PublicInfoScreen} initialParams={{ page: 'privacy' }} options={{ title: 'Privacy' }} />
    <Stack.Screen name="Terms" component={PublicInfoScreen} initialParams={{ page: 'terms' }} options={{ title: 'Terms' }} />
    <Stack.Screen name="NigeriaPage" component={PublicInfoScreen} initialParams={{ page: 'nigeria' }} options={{ title: 'Nigeria' }} />
    <Stack.Screen name="AboutUs" component={AboutUsScreen} options={{ title: 'About RentalHub' }} />
    <Stack.Screen name="Support" component={SupportScreen} options={{ title: 'Support' }} />
    <Stack.Screen name="FumigationCleaningCatalog" component={FumigationCleaningCatalogScreen} options={{ title: 'Service Catalog' }} />
  </Stack.Navigator>
);

const WebAdminRoot = () => (
  <Stack.Navigator screenOptions={screenOptions}>
    <Stack.Screen name="NativeTools" component={NativeToolsScreen} options={{ title: 'Admin Tools' }} />
    {commonInfoScreens()}
  </Stack.Navigator>
);

const ServiceAdminRoot = () => (
  <Stack.Navigator screenOptions={screenOptions}>
    <Stack.Screen name="ServiceOperationsDashboard" component={ServiceOperationsDashboardScreen} options={{ title: 'Service Operations' }} />
    <Stack.Screen name="ServiceBookings" component={ServiceBookingsScreen} options={{ title: 'Bookings' }} />
    <Stack.Screen name="FumigationCompliance" component={FumigationComplianceScreen} options={{ title: 'Safety Compliance' }} />
    <Stack.Screen name="SupportTickets" component={SupportTicketsScreen} options={{ title: 'Support Tickets' }} />
    <Stack.Screen name="SupportTicketDetail" component={SupportTicketDetailScreen} options={{ title: 'Ticket Conversation' }} />
    <Stack.Screen name="AdminTransportationStateDashboard" component={AdminTransportationStateDashboardScreen} options={{ title: 'State Transport' }} />
    <Stack.Screen name="AdminFumigationStateDashboard" component={AdminFumigationStateDashboardScreen} options={{ title: 'State Fumigation' }} />
    <Stack.Screen name="AdminSupportDashboard" component={AdminSupportDashboardScreen} options={{ title: 'Support Dashboard' }} />
    <Stack.Screen name="AdminPool" component={AdminPoolScreen} options={{ title: 'Admin Pool' }} />
    <Stack.Screen name="ActivityFeed" component={ActivityFeedScreen} options={{ title: 'Activity Feed' }} />
    <Stack.Screen name="AllActivity" component={ActivityFeedScreen} options={{ title: 'All Activity' }} initialParams={{ all: true }} />
    <Stack.Screen name="Messages" component={MessagesScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    <Stack.Screen name="Profile" component={ProfileScreen} />
    <Stack.Screen name="PrivacyData" component={PrivacyDataScreen} options={{ title: 'My Personal Data' }} />
    <Stack.Screen name="RecruitmentAdmin" component={RecruitmentAdminScreen} options={{ title: 'Recruitment Admin' }} />
    <Stack.Screen name="NativeTools" component={NativeToolsScreen} options={{ title: 'More Tools' }} />
    {commonInfoScreens()}
  </Stack.Navigator>
);

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => tabIcon(route.name, focused, color, size),
      tabBarActiveTintColor: colors.blue,
      tabBarInactiveTintColor: colors.muted,
      tabBarLabelStyle: {
        fontFamily: typography.semibold,
        fontSize: 13,
        marginBottom: Platform.OS === 'android' ? 7 : 1,
      },
      tabBarIconStyle: {
        marginTop: Platform.OS === 'android' ? 7 : 1,
      },
      tabBarStyle: {
        backgroundColor: colors.white,
        borderTopColor: colors.border,
        height: Platform.OS === 'android' ? 68 : 82,
      },
      headerShown: false,
    })}
  >
    <Tab.Screen name="HomeTab" options={{ title: 'Explore' }}>
      {(props) => <TourTarget id="tab_explore"><HomeScreen {...props} /></TourTarget>}
    </Tab.Screen>
    <Tab.Screen name="DashboardTab" options={{ title: 'My Hub' }}>
      {(props) => <TourTarget id="tab_dashboard"><DashboardScreen {...props} /></TourTarget>}
    </Tab.Screen>
    <Tab.Screen name="Applications" options={{ title: 'Applications' }}>
      {(props) => <TourTarget id="tab_applications"><ApplicationsScreen {...props} /></TourTarget>}
    </Tab.Screen>
    <Tab.Screen name="Messages" options={{ title: 'Messages' }}>
      {(props) => <TourTarget id="tab_messages"><MessagesScreen {...props} /></TourTarget>}
    </Tab.Screen>
  </Tab.Navigator>
);

const TenantRoot = () => (
  <Stack.Navigator screenOptions={screenOptions}>
    <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
    <Stack.Screen name="Survey" component={SurveyScreen} options={{ title: 'Survey' }} />
    <Stack.Screen name="PropertyList" component={PropertyListScreen} options={{ title: 'Browse Properties' }} />
    <Stack.Screen name="PropertyDetail" component={PropertyDetailScreen} options={{ title: 'Property Details' }} />
    <Stack.Screen name="PropertyAlertRequest" component={PropertyAlertRequestScreen} options={{ title: 'Submit Request' }} />
    <Stack.Screen name="LocationInfo" component={LocationInfoScreen} options={{ title: 'Location' }} />
    <Stack.Screen name="ApplicationDetail" component={ApplicationDetailScreen} options={{ headerShown: false }} />
    <Stack.Screen name="Profile" component={ProfileScreen} />
    <Stack.Screen name="PrivacyData" component={PrivacyDataScreen} options={{ title: 'My Personal Data' }} />
    <Stack.Screen name="SavedProperties" component={SavedPropertiesScreen} options={{ title: 'Saved Properties' }} />
    <Stack.Screen name="Subscribe" component={SubscribeScreen} />
    <Stack.Screen name="PaymentHistory" component={PaymentHistoryScreen} options={{ title: 'Payment History' }} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    {commonVerificationScreens()}
    {commonAppealScreens()}
    {commonTenancyScreens()}
    <Stack.Screen name="RentSavingsDashboard" component={RentSavingsDashboardScreen} options={{ title: 'Rent Savings' }} />
    <Stack.Screen name="SavingsGoalCreate" component={SavingsGoalCreateScreen} options={{ title: 'Create Plan' }} />
    <Stack.Screen name="SavingsGoalList" component={SavingsGoalListScreen} options={{ title: 'My Plans' }} />
    <Stack.Screen name="SavingsGoalDetail" component={SavingsGoalDetailScreen} options={{ title: 'Plan Details' }} />
    <Stack.Screen name="RentCalculator" component={RentCalculatorScreen} options={{ title: 'Rent Calculator' }} />
    <Stack.Screen name="TransportationBooking" component={TransportationBookingScreen} options={{ title: 'Transportation' }} />
    <Stack.Screen name="TransportationBookings" component={TransportationBookingsScreen} options={{ title: 'My Transport Bookings' }} />
    <Stack.Screen name="TransportationBookingDetail" component={TransportationBookingDetailScreen} options={{ title: 'Booking Details' }} />
    <Stack.Screen name="TransportationPayment" component={TransportationPaymentScreen} options={{ title: 'Transport Payment' }} />
    <Stack.Screen name="FumigationCleaningBooking" component={FumigationCleaningBookingScreen} options={{ title: 'Fumigation & Cleaning' }} />
    <Stack.Screen name="FumigationCleaningBookings" component={FumigationCleaningBookingsScreen} options={{ title: 'My Bookings' }} />
    <Stack.Screen name="FumigationCleaningBookingDetail" component={FumigationCleaningBookingDetailScreen} options={{ title: 'Booking Details' }} />
    <Stack.Screen name="FumigationCleaningPayment" component={FumigationCleaningPaymentScreen} options={{ title: 'Payment' }} />

    <Stack.Screen name="Faq" component={PublicInfoScreen} initialParams={{ page: 'faq' }} options={{ title: 'FAQ' }} />
    <Stack.Screen name="HowItWorks" component={PublicInfoScreen} initialParams={{ page: 'how' }} options={{ title: 'How It Works' }} />
    <Stack.Screen name="Pricing" component={PublicInfoScreen} initialParams={{ page: 'pricing' }} options={{ title: 'Pricing' }} />
    <Stack.Screen name="LandlordGuide" component={PublicInfoScreen} initialParams={{ page: 'landlordGuide' }} options={{ title: 'Landlord Guide' }} />
    <Stack.Screen name="Privacy" component={PublicInfoScreen} initialParams={{ page: 'privacy' }} options={{ title: 'Privacy' }} />
    <Stack.Screen name="Terms" component={PublicInfoScreen} initialParams={{ page: 'terms' }} options={{ title: 'Terms' }} />
    <Stack.Screen name="NigeriaPage" component={PublicInfoScreen} initialParams={{ page: 'nigeria' }} options={{ title: 'Nigeria' }} />
    <Stack.Screen name="AboutUs" component={AboutUsScreen} options={{ title: 'About RentalHub' }} />
    <Stack.Screen name="Support" component={SupportScreen} options={{ title: 'Support' }} />
    <Stack.Screen name="FumigationCleaningCatalog" component={FumigationCleaningCatalogScreen} options={{ title: 'Service Catalog' }} />
    <Stack.Screen name="NativeTools" component={NativeToolsScreen} options={{ title: 'More Tools' }} />
    {commonInfoScreens()}
    <Stack.Screen name="MyDisputes" component={MyDisputesScreen} options={{ title: 'My Disputes' }} />
    <Stack.Screen name="MyDamageReports" component={MyDamageReportsScreen} options={{ title: 'Damage Reports' }} />
    <Stack.Screen name="SubscribedProperties" component={SubscribedPropertiesScreen} options={{ title: 'My Subscriptions' }} />
    <Stack.Screen name="Careers" component={CareersScreen} options={{ title: 'Careers' }} />
    <Stack.Screen name="RecruitmentAdmin" component={RecruitmentAdminScreen} options={{ title: 'Recruitment Admin' }} />
    <Stack.Screen name="Interview" component={InterviewScreen} options={{ title: 'Interview' }} />
    <Stack.Screen name="RecruitmentApplication" component={RecruitmentApplicationScreen} options={{ title: 'Application' }} />
  </Stack.Navigator>
);

const LandlordRoot = () => (
  <Stack.Navigator screenOptions={screenOptions}>
    <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
    <Stack.Screen name="Survey" component={SurveyScreen} options={{ title: 'Survey' }} />
    <Stack.Screen name="PropertyList" component={PropertyListScreen} options={{ title: 'Browse Properties' }} />
    <Stack.Screen name="PropertyDetail" component={PropertyDetailScreen} options={{ title: 'Property Details' }} />
    <Stack.Screen name="PropertyAlertRequest" component={PropertyAlertRequestScreen} options={{ title: 'Submit Request' }} />
    <Stack.Screen name="LocationInfo" component={LocationInfoScreen} options={{ title: 'Location' }} />
    <Stack.Screen name="ApplicationDetail" component={ApplicationDetailScreen} options={{ headerShown: false }} />
    <Stack.Screen name="Profile" component={ProfileScreen} />
    <Stack.Screen name="PrivacyData" component={PrivacyDataScreen} options={{ title: 'My Personal Data' }} />
    <Stack.Screen name="MyProperties" component={MyPropertiesScreen} options={{ title: 'My Properties' }} />
    <Stack.Screen name="AddProperty" component={AddPropertyScreen} options={{ title: 'Add Property' }} />
    <Stack.Screen name="PaymentHistory" component={PaymentHistoryScreen} options={{ title: 'Payment History' }} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    {commonVerificationScreens()}
    {commonAppealScreens()}
    {commonTenancyScreens()}
    <Stack.Screen name="TransportationBooking" component={TransportationBookingScreen} options={{ title: 'Transportation' }} />
    <Stack.Screen name="TransportationBookings" component={TransportationBookingsScreen} options={{ title: 'My Transport Bookings' }} />
    <Stack.Screen name="TransportationBookingDetail" component={TransportationBookingDetailScreen} options={{ title: 'Booking Details' }} />
    <Stack.Screen name="TransportationPayment" component={TransportationPaymentScreen} options={{ title: 'Transport Payment' }} />
    <Stack.Screen name="FumigationCleaningBooking" component={FumigationCleaningBookingScreen} options={{ title: 'Fumigation & Cleaning' }} />
    <Stack.Screen name="FumigationCleaningBookings" component={FumigationCleaningBookingsScreen} options={{ title: 'My Bookings' }} />
    <Stack.Screen name="FumigationCleaningBookingDetail" component={FumigationCleaningBookingDetailScreen} options={{ title: 'Booking Details' }} />
    <Stack.Screen name="FumigationCleaningPayment" component={FumigationCleaningPaymentScreen} options={{ title: 'Payment' }} />

    <Stack.Screen name="Faq" component={PublicInfoScreen} initialParams={{ page: 'faq' }} options={{ title: 'FAQ' }} />
    <Stack.Screen name="HowItWorks" component={PublicInfoScreen} initialParams={{ page: 'how' }} options={{ title: 'How It Works' }} />
    <Stack.Screen name="Pricing" component={PublicInfoScreen} initialParams={{ page: 'pricing' }} options={{ title: 'Pricing' }} />
    <Stack.Screen name="LandlordGuide" component={PublicInfoScreen} initialParams={{ page: 'landlordGuide' }} options={{ title: 'Landlord Guide' }} />
    <Stack.Screen name="Privacy" component={PublicInfoScreen} initialParams={{ page: 'privacy' }} options={{ title: 'Privacy' }} />
    <Stack.Screen name="Terms" component={PublicInfoScreen} initialParams={{ page: 'terms' }} options={{ title: 'Terms' }} />
    <Stack.Screen name="NigeriaPage" component={PublicInfoScreen} initialParams={{ page: 'nigeria' }} options={{ title: 'Nigeria' }} />
    <Stack.Screen name="AboutUs" component={AboutUsScreen} options={{ title: 'About RentalHub' }} />
    <Stack.Screen name="Support" component={SupportScreen} options={{ title: 'Support' }} />
    <Stack.Screen name="FumigationCleaningCatalog" component={FumigationCleaningCatalogScreen} options={{ title: 'Service Catalog' }} />
    <Stack.Screen name="NativeTools" component={NativeToolsScreen} options={{ title: 'More Tools' }} />
    {commonInfoScreens()}
    <Stack.Screen name="MyDisputes" component={MyDisputesScreen} options={{ title: 'My Disputes' }} />
    <Stack.Screen name="MyDamageReports" component={MyDamageReportsScreen} options={{ title: 'Damage Reports' }} />
    <Stack.Screen name="SubscribedProperties" component={SubscribedPropertiesScreen} options={{ title: 'My Subscriptions' }} />
    <Stack.Screen name="Careers" component={CareersScreen} options={{ title: 'Careers' }} />
    <Stack.Screen name="RecruitmentAdmin" component={RecruitmentAdminScreen} options={{ title: 'Recruitment Admin' }} />
    <Stack.Screen name="Interview" component={InterviewScreen} options={{ title: 'Interview' }} />
    <Stack.Screen name="RecruitmentApplication" component={RecruitmentApplicationScreen} options={{ title: 'Application' }} />
  </Stack.Navigator>
);

const AgentRoot = () => (
  <Stack.Navigator screenOptions={screenOptions}>
    <Stack.Screen name="AgentDashboard" component={AgentDashboardScreen} options={{ title: 'Agent Dashboard' }} />
    <Stack.Screen name="AgentEarnings" component={AgentEarningsScreen} options={{ title: 'Commission Dashboard' }} />
    <Stack.Screen name="AgentWithdrawals" component={AgentWithdrawalsScreen} options={{ title: 'Withdrawal Requests' }} />
    <Stack.Screen name="StateMigration" component={StateMigrationScreen} options={{ title: 'State Migration' }} />
    <Stack.Screen name="MyProperties" component={MyPropertiesScreen} options={{ title: 'Managed Properties' }} />
    <Stack.Screen name="AddProperty" component={AddPropertyScreen} options={{ title: 'Add Property' }} />
    <Stack.Screen name="PropertyList" component={PropertyListScreen} options={{ title: 'Browse Properties' }} />
    <Stack.Screen name="PropertyDetail" component={PropertyDetailScreen} options={{ title: 'Property Details' }} />
    <Stack.Screen name="LocationInfo" component={LocationInfoScreen} options={{ title: 'Location' }} />
    <Stack.Screen name="Messages" component={MessagesScreen} />
    <Stack.Screen name="PaymentHistory" component={PaymentHistoryScreen} options={{ title: 'Payment History' }} />
    <Stack.Screen name="Profile" component={ProfileScreen} />
    <Stack.Screen name="PrivacyData" component={PrivacyDataScreen} options={{ title: 'My Personal Data' }} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    {commonVerificationScreens()}
    {commonAppealScreens()}
    {commonTenancyScreens()}
    <Stack.Screen name="TransportationBooking" component={TransportationBookingScreen} options={{ title: 'Transportation' }} />
    <Stack.Screen name="TransportationBookings" component={TransportationBookingsScreen} options={{ title: 'My Transport Bookings' }} />
    <Stack.Screen name="TransportationBookingDetail" component={TransportationBookingDetailScreen} options={{ title: 'Booking Details' }} />
    <Stack.Screen name="TransportationPayment" component={TransportationPaymentScreen} options={{ title: 'Transport Payment' }} />
    <Stack.Screen name="FumigationCleaningBooking" component={FumigationCleaningBookingScreen} options={{ title: 'Fumigation & Cleaning' }} />
    <Stack.Screen name="FumigationCleaningBookings" component={FumigationCleaningBookingsScreen} options={{ title: 'My Bookings' }} />
    <Stack.Screen name="FumigationCleaningBookingDetail" component={FumigationCleaningBookingDetailScreen} options={{ title: 'Booking Details' }} />
    <Stack.Screen name="FumigationCleaningPayment" component={FumigationCleaningPaymentScreen} options={{ title: 'Payment' }} />

    <Stack.Screen name="Faq" component={PublicInfoScreen} initialParams={{ page: 'faq' }} options={{ title: 'FAQ' }} />
    <Stack.Screen name="HowItWorks" component={PublicInfoScreen} initialParams={{ page: 'how' }} options={{ title: 'How It Works' }} />
    <Stack.Screen name="Pricing" component={PublicInfoScreen} initialParams={{ page: 'pricing' }} options={{ title: 'Pricing' }} />
    <Stack.Screen name="LandlordGuide" component={PublicInfoScreen} initialParams={{ page: 'landlordGuide' }} options={{ title: 'Landlord Guide' }} />
    <Stack.Screen name="Privacy" component={PublicInfoScreen} initialParams={{ page: 'privacy' }} options={{ title: 'Privacy' }} />
    <Stack.Screen name="Terms" component={PublicInfoScreen} initialParams={{ page: 'terms' }} options={{ title: 'Terms' }} />
    <Stack.Screen name="NigeriaPage" component={PublicInfoScreen} initialParams={{ page: 'nigeria' }} options={{ title: 'Nigeria' }} />
    <Stack.Screen name="AboutUs" component={AboutUsScreen} options={{ title: 'About RentalHub' }} />
    <Stack.Screen name="Support" component={SupportScreen} options={{ title: 'Support' }} />
    <Stack.Screen name="FumigationCleaningCatalog" component={FumigationCleaningCatalogScreen} options={{ title: 'Service Catalog' }} />
    <Stack.Screen name="NativeTools" component={NativeToolsScreen} options={{ title: 'More Tools' }} />
    {commonInfoScreens()}
    <Stack.Screen name="MyDisputes" component={MyDisputesScreen} options={{ title: 'My Disputes' }} />
    <Stack.Screen name="MyDamageReports" component={MyDamageReportsScreen} options={{ title: 'Damage Reports' }} />
    <Stack.Screen name="SubscribedProperties" component={SubscribedPropertiesScreen} options={{ title: 'My Subscriptions' }} />
    <Stack.Screen name="Careers" component={CareersScreen} options={{ title: 'Careers' }} />
    <Stack.Screen name="RecruitmentAdmin" component={RecruitmentAdminScreen} options={{ title: 'Recruitment Admin' }} />
    <Stack.Screen name="Interview" component={InterviewScreen} options={{ title: 'Interview' }} />
    <Stack.Screen name="RecruitmentApplication" component={RecruitmentApplicationScreen} options={{ title: 'Application' }} />
  </Stack.Navigator>
);

const LawyerRoot = ({ initialRouteName = 'LawyerDashboard' }) => (
  <Stack.Navigator initialRouteName={initialRouteName} screenOptions={screenOptions}>
    <Stack.Screen name="LawyerDashboard" component={LawyerDashboardScreen} options={{ title: 'Lawyer Dashboard' }} />
    <Stack.Screen name="PropertyList" component={PropertyListScreen} options={{ title: 'Browse Properties' }} />
    <Stack.Screen name="PropertyDetail" component={PropertyDetailScreen} options={{ title: 'Property Details' }} />
    <Stack.Screen name="PropertyAlertRequest" component={PropertyAlertRequestScreen} options={{ title: 'Submit Request' }} />
    <Stack.Screen name="LocationInfo" component={LocationInfoScreen} options={{ title: 'Location' }} />
    <Stack.Screen name="DisputeDetails" component={DisputeDetailsScreen} options={{ title: 'Dispute Trace' }} />
    <Stack.Screen name="StateMigration" component={StateMigrationScreen} options={{ title: 'State Migration' }} />
    <Stack.Screen name="CourtBundle" component={CourtBundleScreen} options={{ title: 'Court Bundle' }} />
    <Stack.Screen name="VerifyCase" component={VerifyCaseScreen} options={{ title: 'Verify Case' }} />
    <Stack.Screen name="StateLawyerDashboard" component={StateLawyerDashboardScreen} options={{ title: 'State Lawyer' }} />
    <Stack.Screen name="SuperLawyerDashboard" component={SuperLawyerDashboardScreen} options={{ title: 'Super Lawyer' }} />
    <Stack.Screen name="Messages" component={MessagesScreen} />
    <Stack.Screen name="Profile" component={ProfileScreen} />
    <Stack.Screen name="PrivacyData" component={PrivacyDataScreen} options={{ title: 'My Personal Data' }} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    {commonVerificationScreens()}
    {commonAppealScreens()}
    {commonTenancyScreens()}
    <Stack.Screen name="TransportationBooking" component={TransportationBookingScreen} options={{ title: 'Transportation' }} />
    <Stack.Screen name="TransportationBookings" component={TransportationBookingsScreen} options={{ title: 'My Transport Bookings' }} />
    <Stack.Screen name="TransportationBookingDetail" component={TransportationBookingDetailScreen} options={{ title: 'Booking Details' }} />
    <Stack.Screen name="TransportationPayment" component={TransportationPaymentScreen} options={{ title: 'Transport Payment' }} />
    <Stack.Screen name="FumigationCleaningBooking" component={FumigationCleaningBookingScreen} options={{ title: 'Fumigation & Cleaning' }} />
    <Stack.Screen name="FumigationCleaningBookings" component={FumigationCleaningBookingsScreen} options={{ title: 'My Bookings' }} />
    <Stack.Screen name="FumigationCleaningBookingDetail" component={FumigationCleaningBookingDetailScreen} options={{ title: 'Booking Details' }} />
    <Stack.Screen name="FumigationCleaningPayment" component={FumigationCleaningPaymentScreen} options={{ title: 'Payment' }} />

    <Stack.Screen name="Faq" component={PublicInfoScreen} initialParams={{ page: 'faq' }} options={{ title: 'FAQ' }} />
    <Stack.Screen name="HowItWorks" component={PublicInfoScreen} initialParams={{ page: 'how' }} options={{ title: 'How It Works' }} />
    <Stack.Screen name="Pricing" component={PublicInfoScreen} initialParams={{ page: 'pricing' }} options={{ title: 'Pricing' }} />
    <Stack.Screen name="LandlordGuide" component={PublicInfoScreen} initialParams={{ page: 'landlordGuide' }} options={{ title: 'Landlord Guide' }} />
    <Stack.Screen name="Privacy" component={PublicInfoScreen} initialParams={{ page: 'privacy' }} options={{ title: 'Privacy' }} />
    <Stack.Screen name="Terms" component={PublicInfoScreen} initialParams={{ page: 'terms' }} options={{ title: 'Terms' }} />
    <Stack.Screen name="NigeriaPage" component={PublicInfoScreen} initialParams={{ page: 'nigeria' }} options={{ title: 'Nigeria' }} />
    <Stack.Screen name="AboutUs" component={AboutUsScreen} options={{ title: 'About RentalHub' }} />
    <Stack.Screen name="Support" component={SupportScreen} options={{ title: 'Support' }} />
    <Stack.Screen name="FumigationCleaningCatalog" component={FumigationCleaningCatalogScreen} options={{ title: 'Service Catalog' }} />
    <Stack.Screen name="NativeTools" component={NativeToolsScreen} options={{ title: 'More Tools' }} />
    {commonInfoScreens()}
    <Stack.Screen name="MyDisputes" component={MyDisputesScreen} options={{ title: 'My Disputes' }} />
    <Stack.Screen name="MyDamageReports" component={MyDamageReportsScreen} options={{ title: 'Damage Reports' }} />
    <Stack.Screen name="SubscribedProperties" component={SubscribedPropertiesScreen} options={{ title: 'My Subscriptions' }} />
    <Stack.Screen name="Careers" component={CareersScreen} options={{ title: 'Careers' }} />
    <Stack.Screen name="RecruitmentAdmin" component={RecruitmentAdminScreen} options={{ title: 'Recruitment Admin' }} />
    <Stack.Screen name="Interview" component={InterviewScreen} options={{ title: 'Interview' }} />
    <Stack.Screen name="RecruitmentApplication" component={RecruitmentApplicationScreen} options={{ title: 'Application' }} />
  </Stack.Navigator>
);

const AdminRoot = () => (
  <Stack.Navigator screenOptions={screenOptions}>
    <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ title: 'Admin Dashboard' }} />
    <Stack.Screen name="AdminUsers" component={AdminUsersScreen} options={{ title: 'Users' }} />
    <Stack.Screen name="AgentCommissionAdmin" component={AgentCommissionAdminScreen} options={{ title: 'Agent Commissions' }} />
    <Stack.Screen name="AdminProperties" component={AdminPropertiesScreen} options={{ title: 'Properties' }} />
    <Stack.Screen name="AdminApplications" component={AdminApplicationsScreen} options={{ title: 'Applications' }} />
    <Stack.Screen name="AdminVerifications" component={AdminVerificationsScreen} options={{ title: 'Verifications' }} />
    <Stack.Screen name="AdminCompliance" component={AdminComplianceScreen} options={{ title: 'Compliance' }} />
    <Stack.Screen name="AdminAgentAssignments" component={AdminAgentAssignmentsScreen} options={{ title: 'Agent Assignments' }} />
    <Stack.Screen name="AdminLawyerInvites" component={AdminLawyerInvitesScreen} options={{ title: 'Lawyer Invites' }} />
    <Stack.Screen name="AdminPropertyDetail" component={AdminPropertyDetailScreen} options={{ title: 'Property Details' }} />
    <Stack.Screen name="AdminUserDetail" component={AdminUserDetailScreen} options={{ title: 'User Details' }} />
    <Stack.Screen name="PropertyList" component={PropertyListScreen} options={{ title: 'Browse Properties' }} />
    <Stack.Screen name="AdminApplicationDetail" component={ApplicationDetailScreen} options={{ title: 'Application Details' }} />
    <Stack.Screen name="AdminInspections" component={AdminInspectionsScreen} options={{ title: 'Inspections' }} />
    <Stack.Screen name="AdminEvidenceVerifications" component={AdminEvidenceVerificationsScreen} options={{ title: 'Evidence Verifications' }} />
    <Stack.Screen name="AdminLedger" component={AdminLedgerScreen} options={{ title: 'Ledger' }} />
    <Stack.Screen name="AdminTransportationDashboard" component={AdminTransportationDashboardScreen} options={{ title: 'Transport Ops' }} />
    <Stack.Screen name="AdminFumigationDashboard" component={AdminFumigationDashboardScreen} options={{ title: 'Fumigation Ops' }} />
    <Stack.Screen name="ServiceBookings" component={ServiceBookingsScreen} options={{ title: 'Service Bookings' }} />
    <Stack.Screen name="FumigationCompliance" component={FumigationComplianceScreen} options={{ title: 'Safety Compliance' }} />
    <Stack.Screen name="PropertyDetail" component={PropertyDetailScreen} options={{ title: 'Property Details' }} />
    <Stack.Screen name="LocationInfo" component={LocationInfoScreen} options={{ title: 'Location' }} />
    <Stack.Screen name="Messages" component={MessagesScreen} />
    <Stack.Screen name="PaymentHistory" component={PaymentHistoryScreen} options={{ title: 'Payment History' }} />
    <Stack.Screen name="Profile" component={ProfileScreen} />
    <Stack.Screen name="PrivacyData" component={PrivacyDataScreen} options={{ title: 'My Personal Data' }} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    {commonVerificationScreens()}
    {commonAppealScreens()}
    {commonTenancyScreens()}
    <Stack.Screen name="NativeTools" component={NativeToolsScreen} options={{ title: 'More Tools' }} />
    {commonInfoScreens()}
    <Stack.Screen name="MyDisputes" component={MyDisputesScreen} options={{ title: 'My Disputes' }} />
    <Stack.Screen name="MyDamageReports" component={MyDamageReportsScreen} options={{ title: 'Damage Reports' }} />
    <Stack.Screen name="SubscribedProperties" component={SubscribedPropertiesScreen} options={{ title: 'My Subscriptions' }} />
    <Stack.Screen name="Careers" component={CareersScreen} options={{ title: 'Careers' }} />
    <Stack.Screen name="RecruitmentAdmin" component={RecruitmentAdminScreen} options={{ title: 'Recruitment Admin' }} />
    <Stack.Screen name="Interview" component={InterviewScreen} options={{ title: 'Interview' }} />
    <Stack.Screen name="RecruitmentApplication" component={RecruitmentApplicationScreen} options={{ title: 'Application' }} />
  </Stack.Navigator>
);

const SuperAdminRoot = () => (
  <Stack.Navigator screenOptions={screenOptions}>
    <Stack.Screen name="SuperAdminDashboard" component={SuperAdminDashboardScreen} options={{ title: 'Super Admin' }} />
    <Stack.Screen name="ModerationHub" component={ModerationHubScreen} options={{ title: 'Moderation' }} />
    <Stack.Screen name="FinanceStateAdmins" component={FinanceStateAdminScreen} options={{ title: 'State Admin Management' }} />
    <Stack.Screen name="RentSavingsAdmin" component={RentSavingsAdminScreen} options={{ title: 'Rent Savings Withdrawals' }} />
    <Stack.Screen name="AgentCommissionAdmin" component={AgentCommissionAdminScreen} options={{ title: 'Agent Commissions' }} />
    <Stack.Screen name="AdminAccounts" component={AdminAccountsScreen} options={{ title: 'Admin Accounts' }} />
    <Stack.Screen name="SeoTools" component={SeoToolsScreen} options={{ title: 'SEO Tools' }} />
    <Stack.Screen name="ContentModeration" component={ContentModerationHub} options={{ title: 'Content Moderation' }} />
    <Stack.Screen name="VoiceMonitor" component={VoiceMonitorScreen} options={{ title: 'Voice Monitor' }} />
    <Stack.Screen name="CourtBundle" component={CourtBundleScreen} options={{ title: 'Court Bundle' }} />
    <Stack.Screen name="SurveyAnalytics" component={SurveyAnalyticsScreen} options={{ title: 'Survey Analytics' }} />
    <Stack.Screen name="MarketingOps" component={MarketingScreen} options={{ title: 'Email & SMS Marketing' }} />
    <Stack.Screen name="MarketingBuilder" component={MarketingBuilderScreen} options={{ title: 'Campaign Builder' }} />
    <Stack.Screen name="EmailTemplateEditor" component={EmailTemplateEditorScreen} options={{ title: 'Email HTML Editor' }} />
    <Stack.Screen name="DiasporaDesk" component={DiasporaDeskScreen} options={{ title: 'Diaspora Desk' }} />
    <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ title: 'Admin Dashboard' }} />
    <Stack.Screen name="AdminUsers" component={AdminUsersScreen} options={{ title: 'Users' }} />
    <Stack.Screen name="AdminProperties" component={AdminPropertiesScreen} options={{ title: 'Properties' }} />
    <Stack.Screen name="AdminApplications" component={AdminApplicationsScreen} options={{ title: 'Applications' }} />
    <Stack.Screen name="AdminVerifications" component={AdminVerificationsScreen} options={{ title: 'Verifications' }} />
    <Stack.Screen name="AdminCompliance" component={AdminComplianceScreen} options={{ title: 'Compliance' }} />
    <Stack.Screen name="AdminAppeals" component={AdminAppealsScreen} options={{ title: 'Appeals' }} />
    <Stack.Screen name="AdminMonitor" component={AdminMonitorScreen} options={{ title: 'Activity Monitor' }} />
    <Stack.Screen name="AdminInspections" component={AdminInspectionsScreen} options={{ title: 'Inspections' }} />
    <Stack.Screen name="AdminEvidenceVerifications" component={AdminEvidenceVerificationsScreen} options={{ title: 'Evidence Verifications' }} />
    <Stack.Screen name="AdminLedger" component={AdminLedgerScreen} options={{ title: 'Ledger' }} />
    <Stack.Screen name="AdminApplicationDetail" component={ApplicationDetailScreen} options={{ title: 'Application Details' }} />
    <Stack.Screen name="SuperAdminSeo" component={SuperAdminSeoDashboardScreen} options={{ title: 'SEO Dashboard' }} />
    <Stack.Screen name="SuperAdminSeoNested" component={SuperAdminSeoDashboardScreen} options={{ title: 'SEO Dashboard' }} />
    <Stack.Screen name="SuperAdminSupportGovernance" component={SuperAdminSupportGovernanceScreen} options={{ title: 'Support Governance' }} />
    <Stack.Screen name="SuperAdminTransportationDashboard" component={SuperAdminTransportationDashboardScreen} options={{ title: 'Transport Oversight' }} />
    <Stack.Screen name="SuperAdminFumigationDashboard" component={SuperAdminFumigationDashboardScreen} options={{ title: 'Fumigation Oversight' }} />
    <Stack.Screen name="ServiceBookings" component={ServiceBookingsScreen} options={{ title: 'Service Bookings' }} />
    <Stack.Screen name="FumigationCompliance" component={FumigationComplianceScreen} options={{ title: 'Safety Compliance' }} />
    <Stack.Screen name="SuperFinancialAdminDashboard" component={SuperFinancialAdminDashboardScreen} options={{ title: 'Super Financial' }} />
    <Stack.Screen name="FinancialRevenueReport" component={FinancialRevenueReportScreen} options={{ title: 'Revenue Reports' }} />
    <Stack.Screen name="FinancialTransactions" component={FinancialTransactionsScreen} options={{ title: 'Transactions' }} />
    <Stack.Screen name="FinancialWithdrawals" component={FinancialWithdrawalsScreen} options={{ title: 'Withdrawals' }} />
    <Stack.Screen name="FinancialCommissions" component={FinancialCommissionsScreen} options={{ title: 'Commissions' }} />
    <Stack.Screen name="FinancialControls" component={FinancialControlsScreen} options={{ title: 'Financial Controls' }} />
    <Stack.Screen name="AdminAgentAssignments" component={AdminAgentAssignmentsScreen} options={{ title: 'Agent Assignments' }} />
    <Stack.Screen name="AdminLawyerInvites" component={AdminLawyerInvitesScreen} options={{ title: 'Lawyer Invites' }} />
    <Stack.Screen name="AdminPropertyDetail" component={AdminPropertyDetailScreen} options={{ title: 'Property Details' }} />
    <Stack.Screen name="AdminUserDetail" component={AdminUserDetailScreen} options={{ title: 'User Details' }} />
    <Stack.Screen name="PropertyList" component={PropertyListScreen} options={{ title: 'Browse Properties' }} />
    <Stack.Screen name="PropertyDetail" component={PropertyDetailScreen} options={{ title: 'Property Details' }} />
    <Stack.Screen name="LocationInfo" component={LocationInfoScreen} options={{ title: 'Location' }} />
    <Stack.Screen name="VerifyCase" component={VerifyCaseScreen} options={{ title: 'Verify Case' }} />
    <Stack.Screen name="Messages" component={MessagesScreen} />
    <Stack.Screen name="PaymentHistory" component={PaymentHistoryScreen} options={{ title: 'Payment History' }} />
    <Stack.Screen name="Profile" component={ProfileScreen} />
    <Stack.Screen name="PrivacyData" component={PrivacyDataScreen} options={{ title: 'My Personal Data' }} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    {commonVerificationScreens()}
    {commonAppealScreens()}
    {commonTenancyScreens()}
    <Stack.Screen name="TransportationBooking" component={TransportationBookingScreen} options={{ title: 'Transportation' }} />
    <Stack.Screen name="TransportationBookings" component={TransportationBookingsScreen} options={{ title: 'Bookings' }} />
    <Stack.Screen name="TransportationBookingDetail" component={TransportationBookingDetailScreen} options={{ title: 'Booking Details' }} />
    <Stack.Screen name="TransportationPayment" component={TransportationPaymentScreen} options={{ title: 'Transport Payment' }} />
    <Stack.Screen name="FumigationCleaningBooking" component={FumigationCleaningBookingScreen} options={{ title: 'Fumigation & Cleaning' }} />
    <Stack.Screen name="FumigationCleaningBookings" component={FumigationCleaningBookingsScreen} options={{ title: 'Bookings' }} />
    <Stack.Screen name="FumigationCleaningBookingDetail" component={FumigationCleaningBookingDetailScreen} options={{ title: 'Booking Details' }} />
    <Stack.Screen name="FumigationCleaningPayment" component={FumigationCleaningPaymentScreen} options={{ title: 'Payment' }} />

    <Stack.Screen name="Faq" component={PublicInfoScreen} initialParams={{ page: 'faq' }} options={{ title: 'FAQ' }} />
    <Stack.Screen name="HowItWorks" component={PublicInfoScreen} initialParams={{ page: 'how' }} options={{ title: 'How It Works' }} />
    <Stack.Screen name="Pricing" component={PublicInfoScreen} initialParams={{ page: 'pricing' }} options={{ title: 'Pricing' }} />
    <Stack.Screen name="LandlordGuide" component={PublicInfoScreen} initialParams={{ page: 'landlordGuide' }} options={{ title: 'Landlord Guide' }} />
    <Stack.Screen name="Privacy" component={PublicInfoScreen} initialParams={{ page: 'privacy' }} options={{ title: 'Privacy' }} />
    <Stack.Screen name="Terms" component={PublicInfoScreen} initialParams={{ page: 'terms' }} options={{ title: 'Terms' }} />
    <Stack.Screen name="NigeriaPage" component={PublicInfoScreen} initialParams={{ page: 'nigeria' }} options={{ title: 'Nigeria' }} />
    <Stack.Screen name="AboutUs" component={AboutUsScreen} options={{ title: 'About RentalHub' }} />
    <Stack.Screen name="Support" component={SupportScreen} options={{ title: 'Support' }} />
    <Stack.Screen name="FumigationCleaningCatalog" component={FumigationCleaningCatalogScreen} options={{ title: 'Service Catalog' }} />
    <Stack.Screen name="NativeTools" component={NativeToolsScreen} options={{ title: 'More Tools' }} />
    {commonInfoScreens()}
    <Stack.Screen name="MyDisputes" component={MyDisputesScreen} options={{ title: 'My Disputes' }} />
    <Stack.Screen name="MyDamageReports" component={MyDamageReportsScreen} options={{ title: 'Damage Reports' }} />
    <Stack.Screen name="SubscribedProperties" component={SubscribedPropertiesScreen} options={{ title: 'My Subscriptions' }} />
    <Stack.Screen name="Careers" component={CareersScreen} options={{ title: 'Careers' }} />
    <Stack.Screen name="RecruitmentAdmin" component={RecruitmentAdminScreen} options={{ title: 'Recruitment Admin' }} />
    <Stack.Screen name="Interview" component={InterviewScreen} options={{ title: 'Interview' }} />
    <Stack.Screen name="RecruitmentApplication" component={RecruitmentApplicationScreen} options={{ title: 'Application' }} />
  </Stack.Navigator>
);

const FinancialAdminRoot = ({ initialRouteName = 'FinancialAdminDashboard' }) => (
  <Stack.Navigator initialRouteName={initialRouteName} screenOptions={screenOptions}>
    <Stack.Screen name="FinancialAdminDashboard" component={FinancialAdminDashboardScreen} options={{ title: 'Financial Admin' }} />
    <Stack.Screen name="FinanceStateAdmins" component={FinanceStateAdminScreen} options={{ title: 'State Admin Management' }} />
    <Stack.Screen name="LgaFinancialAdminDashboard" component={LgaFinancialAdminDashboardScreen} options={{ title: 'LGA Financial Admin' }} />
    <Stack.Screen name="FinancialRevenueReport" component={FinancialRevenueReportScreen} options={{ title: 'Revenue Reports' }} />
    <Stack.Screen name="FinancialTransactions" component={FinancialTransactionsScreen} options={{ title: 'Transactions' }} />
    <Stack.Screen name="FinancialWithdrawals" component={FinancialWithdrawalsScreen} options={{ title: 'Withdrawals' }} />
    <Stack.Screen name="FinancialCommissions" component={FinancialCommissionsScreen} options={{ title: 'Commissions' }} />
    <Stack.Screen name="FinancialControls" component={FinancialControlsScreen} options={{ title: 'Financial Controls' }} />
    <Stack.Screen name="PropertyList" component={PropertyListScreen} options={{ title: 'Browse Properties' }} />
    <Stack.Screen name="SuperFinancialAdminDashboard" component={SuperFinancialAdminDashboardScreen} options={{ title: 'Super Financial' }} />
    <Stack.Screen name="PropertyDetail" component={PropertyDetailScreen} options={{ title: 'Property Details' }} />
    <Stack.Screen name="LocationInfo" component={LocationInfoScreen} options={{ title: 'Location' }} />
    <Stack.Screen name="Messages" component={MessagesScreen} />
    <Stack.Screen name="PaymentHistory" component={PaymentHistoryScreen} options={{ title: 'Payment History' }} />
    <Stack.Screen name="Profile" component={ProfileScreen} />
    <Stack.Screen name="PrivacyData" component={PrivacyDataScreen} options={{ title: 'My Personal Data' }} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    {commonVerificationScreens()}
    {commonAppealScreens()}
    {commonTenancyScreens()}
    <Stack.Screen name="TransportationBooking" component={TransportationBookingScreen} options={{ title: 'Transportation' }} />
    <Stack.Screen name="TransportationBookings" component={TransportationBookingsScreen} options={{ title: 'Bookings' }} />
    <Stack.Screen name="TransportationBookingDetail" component={TransportationBookingDetailScreen} options={{ title: 'Booking Details' }} />
    <Stack.Screen name="TransportationPayment" component={TransportationPaymentScreen} options={{ title: 'Transport Payment' }} />
    <Stack.Screen name="FumigationCleaningBooking" component={FumigationCleaningBookingScreen} options={{ title: 'Fumigation & Cleaning' }} />
    <Stack.Screen name="FumigationCleaningBookings" component={FumigationCleaningBookingsScreen} options={{ title: 'Bookings' }} />
    <Stack.Screen name="FumigationCleaningBookingDetail" component={FumigationCleaningBookingDetailScreen} options={{ title: 'Booking Details' }} />
    <Stack.Screen name="FumigationCleaningPayment" component={FumigationCleaningPaymentScreen} options={{ title: 'Payment' }} />

    <Stack.Screen name="Faq" component={PublicInfoScreen} initialParams={{ page: 'faq' }} options={{ title: 'FAQ' }} />
    <Stack.Screen name="HowItWorks" component={PublicInfoScreen} initialParams={{ page: 'how' }} options={{ title: 'How It Works' }} />
    <Stack.Screen name="Pricing" component={PublicInfoScreen} initialParams={{ page: 'pricing' }} options={{ title: 'Pricing' }} />
    <Stack.Screen name="LandlordGuide" component={PublicInfoScreen} initialParams={{ page: 'landlordGuide' }} options={{ title: 'Landlord Guide' }} />
    <Stack.Screen name="Privacy" component={PublicInfoScreen} initialParams={{ page: 'privacy' }} options={{ title: 'Privacy' }} />
    <Stack.Screen name="Terms" component={PublicInfoScreen} initialParams={{ page: 'terms' }} options={{ title: 'Terms' }} />
    <Stack.Screen name="NigeriaPage" component={PublicInfoScreen} initialParams={{ page: 'nigeria' }} options={{ title: 'Nigeria' }} />
    <Stack.Screen name="AboutUs" component={AboutUsScreen} options={{ title: 'About RentalHub' }} />
    <Stack.Screen name="Support" component={SupportScreen} options={{ title: 'Support' }} />
    <Stack.Screen name="FumigationCleaningCatalog" component={FumigationCleaningCatalogScreen} options={{ title: 'Service Catalog' }} />
    <Stack.Screen name="NativeTools" component={NativeToolsScreen} options={{ title: 'More Tools' }} />
    {commonInfoScreens()}
    <Stack.Screen name="MyDisputes" component={MyDisputesScreen} options={{ title: 'My Disputes' }} />
    <Stack.Screen name="MyDamageReports" component={MyDamageReportsScreen} options={{ title: 'Damage Reports' }} />
    <Stack.Screen name="SubscribedProperties" component={SubscribedPropertiesScreen} options={{ title: 'My Subscriptions' }} />
    <Stack.Screen name="Careers" component={CareersScreen} options={{ title: 'Careers' }} />
    <Stack.Screen name="RecruitmentAdmin" component={RecruitmentAdminScreen} options={{ title: 'Recruitment Admin' }} />
    <Stack.Screen name="Interview" component={InterviewScreen} options={{ title: 'Interview' }} />
    <Stack.Screen name="RecruitmentApplication" component={RecruitmentApplicationScreen} options={{ title: 'Application' }} />
  </Stack.Navigator>
);

const StateAdminRoot = () => (
  <Stack.Navigator screenOptions={screenOptions}>
    <Stack.Screen name="StateAdminDashboard" component={StateAdminDashboardScreen} options={{ title: 'State Admin' }} />
    <Stack.Screen name="StateAdminFinance" component={StateAdminFinanceScreen} options={{ title: 'Commissions & Withdrawals' }} />
    <Stack.Screen name="StateAdminMigrations" component={StateAdminMigrationsScreen} options={{ title: 'Property Approvals' }} />
    <Stack.Screen name="AdminAppeals" component={AdminAppealsScreen} options={{ title: 'Appeals' }} />
    <Stack.Screen name="RecruitmentAdmin" component={RecruitmentAdminScreen} options={{ title: 'Recruitment Admin' }} />
    <Stack.Screen name="AdminTransportationStateDashboard" component={AdminTransportationStateDashboardScreen} options={{ title: 'State Transport' }} />
    <Stack.Screen name="AdminFumigationStateDashboard" component={AdminFumigationStateDashboardScreen} options={{ title: 'State Fumigation' }} />
    <Stack.Screen name="ServiceBookings" component={ServiceBookingsScreen} options={{ title: 'Service Bookings' }} />
    <Stack.Screen name="FumigationCompliance" component={FumigationComplianceScreen} options={{ title: 'Safety Compliance' }} />
    <Stack.Screen name="PropertyList" component={PropertyListScreen} options={{ title: 'Browse Properties' }} />
    <Stack.Screen name="PropertyDetail" component={PropertyDetailScreen} options={{ title: 'Property Details' }} />
    <Stack.Screen name="LocationInfo" component={LocationInfoScreen} options={{ title: 'Location' }} />
    <Stack.Screen name="VerifyCase" component={VerifyCaseScreen} options={{ title: 'Verify Case' }} />
    <Stack.Screen name="Messages" component={MessagesScreen} />
    <Stack.Screen name="PaymentHistory" component={PaymentHistoryScreen} options={{ title: 'Payment History' }} />
    <Stack.Screen name="Profile" component={ProfileScreen} />
    <Stack.Screen name="PrivacyData" component={PrivacyDataScreen} options={{ title: 'My Personal Data' }} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    {commonVerificationScreens()}
    {commonAppealScreens()}
    {commonTenancyScreens()}
    <Stack.Screen name="TransportationBooking" component={TransportationBookingScreen} options={{ title: 'Transportation' }} />
    <Stack.Screen name="TransportationBookings" component={TransportationBookingsScreen} options={{ title: 'Bookings' }} />
    <Stack.Screen name="TransportationBookingDetail" component={TransportationBookingDetailScreen} options={{ title: 'Booking Details' }} />
    <Stack.Screen name="TransportationPayment" component={TransportationPaymentScreen} options={{ title: 'Transport Payment' }} />
    <Stack.Screen name="FumigationCleaningBooking" component={FumigationCleaningBookingScreen} options={{ title: 'Fumigation & Cleaning' }} />
    <Stack.Screen name="FumigationCleaningBookings" component={FumigationCleaningBookingsScreen} options={{ title: 'Bookings' }} />
    <Stack.Screen name="FumigationCleaningBookingDetail" component={FumigationCleaningBookingDetailScreen} options={{ title: 'Booking Details' }} />
    <Stack.Screen name="FumigationCleaningPayment" component={FumigationCleaningPaymentScreen} options={{ title: 'Payment' }} />

    <Stack.Screen name="Faq" component={PublicInfoScreen} initialParams={{ page: 'faq' }} options={{ title: 'FAQ' }} />
    <Stack.Screen name="HowItWorks" component={PublicInfoScreen} initialParams={{ page: 'how' }} options={{ title: 'How It Works' }} />
    <Stack.Screen name="Pricing" component={PublicInfoScreen} initialParams={{ page: 'pricing' }} options={{ title: 'Pricing' }} />
    <Stack.Screen name="LandlordGuide" component={PublicInfoScreen} initialParams={{ page: 'landlordGuide' }} options={{ title: 'Landlord Guide' }} />
    <Stack.Screen name="Privacy" component={PublicInfoScreen} initialParams={{ page: 'privacy' }} options={{ title: 'Privacy' }} />
    <Stack.Screen name="Terms" component={PublicInfoScreen} initialParams={{ page: 'terms' }} options={{ title: 'Terms' }} />
    <Stack.Screen name="NigeriaPage" component={PublicInfoScreen} initialParams={{ page: 'nigeria' }} options={{ title: 'Nigeria' }} />
    <Stack.Screen name="AboutUs" component={AboutUsScreen} options={{ title: 'About RentalHub' }} />
    <Stack.Screen name="Support" component={SupportScreen} options={{ title: 'Support' }} />
    <Stack.Screen name="FumigationCleaningCatalog" component={FumigationCleaningCatalogScreen} options={{ title: 'Service Catalog' }} />
    <Stack.Screen name="NativeTools" component={NativeToolsScreen} options={{ title: 'More Tools' }} />
    {commonInfoScreens()}
  </Stack.Navigator>
);

const RecruitmentAdminRoot = () => (
  <Stack.Navigator screenOptions={screenOptions}>
    <Stack.Screen name="RecruitmentAdmin" component={RecruitmentAdminScreen} options={{ title: 'Recruitment Admin' }} />
    <Stack.Screen name="Profile" component={ProfileScreen} />
    <Stack.Screen name="PrivacyData" component={PrivacyDataScreen} options={{ title: 'My Personal Data' }} />
    <Stack.Screen name="Messages" component={MessagesScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    <Stack.Screen name="Careers" component={CareersScreen} options={{ title: 'Careers' }} />
    <Stack.Screen name="Interview" component={InterviewScreen} options={{ title: 'Interview' }} />
    <Stack.Screen name="RecruitmentApplication" component={RecruitmentApplicationScreen} options={{ title: 'Application' }} />
    {commonVerificationScreens()}
    {commonAppealScreens()}
    {commonTenancyScreens()}
    {commonInfoScreens()}
  </Stack.Navigator>
);

const MarketingAgentRoot = () => (
  <Stack.Navigator screenOptions={screenOptions}>
    <Stack.Screen name="MarketingAgentDashboard" component={MarketingAgentScreen} options={{ title: 'Survey Respondents' }} />
    <Stack.Screen name="Profile" component={ProfileScreen} />
    {commonVerificationScreens()}
    {commonAppealScreens()}
    {commonInfoScreens()}
  </Stack.Navigator>
);

const ZonalAdminRoot = () => (
  <Stack.Navigator screenOptions={screenOptions}>
    <Stack.Screen name="ZonalDashboard" component={ZonalAdminScreen} options={{ title: 'Zone Overview' }} />
    <Stack.Screen name="ZonalList" component={ZonalListScreen} options={{ title: 'Zone Records' }} />
    <Stack.Screen name="Profile" component={ProfileScreen} />
    {commonVerificationScreens()}
    {commonAppealScreens()}
    {commonInfoScreens()}
  </Stack.Navigator>
);

const RoleRouter = ({ userType }) => {
  const normalizedUserType = String(userType || '').trim().toLowerCase();

  switch (normalizedUserType) {
    case 'tenant':
      return <TenantRoot />;
    case 'landlord':
      return <LandlordRoot />;
    case 'agent':
      return <AgentRoot />;
    case 'lawyer':
      return <LawyerRoot />;
    case 'state_lawyer':
      return <LawyerRoot initialRouteName="StateLawyerDashboard" />;
    case 'super_lawyer':
      return <LawyerRoot initialRouteName="SuperLawyerDashboard" />;
    case 'admin':
    case 'lga_admin':
      return <AdminRoot />;
    case 'super_admin':
      return <SuperAdminRoot />;
    case 'super_transportation_admin':
      return <SuperAdminRoot initialRouteName="SuperAdminTransportationDashboard" />;
    case 'super_fumigation_admin':
      return <SuperAdminRoot initialRouteName="SuperAdminFumigationDashboard" />;
    case 'financial_admin':
      return <FinancialAdminRoot />;
    case 'lga_financial_admin':
      return <FinancialAdminRoot initialRouteName="LgaFinancialAdminDashboard" />;
    case 'super_financial_admin':
      return <FinancialAdminRoot initialRouteName="SuperFinancialAdminDashboard" />;
    case 'state_admin':
    case 'state_financial_admin':
      return <StateAdminRoot />;
    case 'lga_support_admin':
    case 'state_support_admin':
    case 'super_support_admin':
    case 'transportation_admin':
    case 'lga_transportation_admin':
    case 'state_transportation_admin':
    case 'fumigation_admin':
    case 'lga_fumigation_admin':
    case 'state_fumigation_admin':
      return <ServiceAdminRoot />;
    case 'recruitment_admin':
      return <RecruitmentAdminRoot />;
    case 'marketing_agent':
      return <MarketingAgentRoot />;
    case 'zonal_admin':
      return <ZonalAdminRoot />;
    default:
      return <TenantRoot />;
  }
};

const AppNavigator = () => {
  const { isAuthenticated, loading, user } = useContext(AuthContext);

  useEffect(() => {
    let recovering = false;

    const openDestination = (destination) => {
      if (!destination?.name || !navigationRef.isReady()) return;
      navigationRef.navigate(destination.name, destination.params);
    };

    const recoverFromUrl = async (url) => {
      if (!url || !isLikelyPaymentReturnUrl(url) || recovering) return;
      recovering = true;
      try {
        const result = await recoverPayment({ url });
        if (result.handled && result.success) {
          Toast.show({ type: 'success', text1: 'Payment verified' });
          openDestination(result.destination);
        }
      } catch {
        // Recovery is best-effort; payment screens still expose refresh/retry paths.
      } finally {
        recovering = false;
      }
    };

    const recoverPendingOnResume = async () => {
      if (recovering) return;
      const pending = await getPendingPayment();
      if (!pending?.reference) return;

      recovering = true;
      try {
        const result = await recoverPayment({ reference: pending.reference, fallbackFlow: pending.flow });
        if (result.handled && result.success) {
          Toast.show({ type: 'success', text1: 'Payment verified' });
          openDestination(result.destination);
        }
      } catch {
        // Keep the pending payment for a later retry.
      } finally {
        recovering = false;
      }
    };

    Linking.getInitialURL().then(recoverFromUrl).catch(() => {});
    const linkingSubscription = Linking.addEventListener('url', ({ url }) => recoverFromUrl(url));
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        recoverPendingOnResume();
      }
    });

    return () => {
      linkingSubscription?.remove?.();
      appStateSubscription?.remove?.();
    };
  }, []);

  useEffect(() => {
    const onBackPress = () => {
      if (navigationRef.isReady() && navigationRef.canGoBack()) {
        navigationRef.goBack();
        return true;
      }
      return false;
    };
    BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
  }, []);

  if (loading) {
    return <BrandSplash />;
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      linking={linkingConfig}
      fallback={<ActivityIndicator />}>
      {isAuthenticated ? <RoleRouter userType={user?.user_type} /> : <GuestStack />}
    </NavigationContainer>
  );
};

export default AppNavigator;
