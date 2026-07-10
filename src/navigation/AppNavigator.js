import React, { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, BackHandler, Linking, Platform, View } from 'react-native';
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
import WebFeaturesScreen from '../screens/shared/WebFeaturesScreen';
import WebRouteScreen from '../screens/shared/WebRouteScreen';

import AdminUsersScreen from '../screens/admin/AdminUsersScreen';
import AdminPropertiesScreen from '../screens/admin/AdminPropertiesScreen';
import AdminApplicationsScreen from '../screens/admin/AdminApplicationsScreen';
import AdminVerificationsScreen from '../screens/admin/AdminVerificationsScreen';
import AdminComplianceScreen from '../screens/admin/AdminComplianceScreen';
import AdminAgentAssignmentsScreen from '../screens/admin/AdminAgentAssignmentsScreen';

import AgentDashboardScreen from '../screens/agent/AgentDashboardScreen';
import AgentEarningsScreen from '../screens/agent/AgentEarningsScreen';
import AgentWithdrawalsScreen from '../screens/agent/AgentWithdrawalsScreen';

// ========== Rent Savings (Tenant) ==========
import RentSavingsDashboardScreen from '../screens/rent-savings/RentSavingsDashboardScreen';
import SavingsGoalCreateScreen from '../screens/rent-savings/SavingsGoalCreateScreen';
import SavingsGoalListScreen from '../screens/rent-savings/SavingsGoalListScreen';
import SavingsGoalDetailScreen from '../screens/rent-savings/SavingsGoalDetailScreen';

// ========== Financial Admin ==========
import FinancialAdminDashboardScreen from '../screens/financial-admin/FinancialAdminDashboardScreen';
import FinancialRevenueReportScreen from '../screens/financial-admin/FinancialRevenueReportScreen';
import FinancialTransactionsScreen from '../screens/financial-admin/FinancialTransactionsScreen';
import FinancialWithdrawalsScreen from '../screens/financial-admin/FinancialWithdrawalsScreen';
import FinancialCommissionsScreen from '../screens/financial-admin/FinancialCommissionsScreen';

// ========== State Admin ==========
import StateAdminDashboardScreen from '../screens/state-admin/StateAdminDashboardScreen';
import StateAdminMigrationsScreen from '../screens/state-admin/StateAdminMigrationsScreen';

// ========== Service Operations Admin ==========
import ServiceBookingsScreen from '../screens/service-admin/ServiceBookingsScreen';
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
import PublicInfoScreen from '../screens/shared/PublicInfoScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';

import MyDisputesScreen from '../screens/shared/MyDisputesScreen';
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
import SuperAdminSeoDashboardScreen from '../screens/admin/SuperAdminSeoDashboardScreen';
import SuperAdminSupportGovernanceScreen from '../screens/admin/SuperAdminSupportGovernanceScreen';
import SuperAdminTransportationDashboardScreen from '../screens/admin/SuperAdminTransportationDashboardScreen';
import SuperAdminFumigationDashboardScreen from '../screens/admin/SuperAdminFumigationDashboardScreen';
import SuperFinancialAdminDashboardScreen from '../screens/admin/SuperFinancialAdminDashboardScreen';
import StateLawyerDashboardScreen from '../screens/lawyer/StateLawyerDashboardScreen';
import SuperLawyerDashboardScreen from '../screens/lawyer/SuperLawyerDashboardScreen';
const Stack = (Platform.OS === 'web' ? createStackNavigator : createNativeStackNavigator)();
const Tab = createBottomTabNavigator();

const createLazyScreen = (loadScreen) => {
  let LoadedScreen;

  return function LazyLoadedScreen(props) {
    const [Component, setComponent] = useState(() => LoadedScreen);

    useEffect(() => {
      if (LoadedScreen) return;
      const nextModule = loadScreen();
      LoadedScreen = nextModule.default || nextModule;
      setComponent(() => LoadedScreen);
    }, []);

    if (!Component) {
      return (
        <View style={{ alignItems: 'center', backgroundColor: colors.surface, flex: 1, justifyContent: 'center' }}>
          <ActivityIndicator color={colors.blue} size="large" />
        </View>
      );
    }

    return <Component {...props} />;
  };
};

const DashboardScreen = createLazyScreen(() => require('../screens/dashboard/DashboardScreen'));
const AdminDashboardScreen = createLazyScreen(() => require('../screens/admin/AdminDashboardScreen'));
const SuperAdminDashboardScreen = createLazyScreen(() => require('../screens/admin/SuperAdminDashboardScreen'));
const FinancialControlsScreen = createLazyScreen(() => require('../screens/financial-admin/FinancialControlsScreen'));
const ServiceOperationsDashboardScreen = createLazyScreen(() => require('../screens/service-admin/ServiceOperationsDashboardScreen'));
const RecruitmentAdminScreen = createLazyScreen(() => require('../screens/shared/RecruitmentAdminScreen'));

const screenOptions = {
  headerTitleAlign: 'center',
  headerShadowVisible: false,
  headerStyle: {
    backgroundColor: colors.white,
  },
  headerTintColor: colors.navy,
  headerTitleStyle: {
    fontFamily: typography.semibold,
    fontSize: 17,
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
      PropertyList: 'properties',
      PropertyDetail: 'properties/:id',
      PropertyAlertRequest: 'property-request',
      AcceptLawyerInvite: 'lawyer/accept-invite',
      AcceptAgentInvite: 'agent/accept-invite',
      WebFeatures: 'web-features',
      PaymentHistory: 'payment-history',
      Messages: 'messages',
      AgentDashboard: 'agent/dashboard',
      AgentEarnings: 'agent/earnings',
      AgentWithdrawals: 'agent/withdrawals',
      AdminAgentAssignments: 'admin/agents',
      RentSavingsDashboard: 'rent-savings',
      SavingsGoalCreate: 'rent-savings/goals/create',
      SavingsGoalList: 'rent-savings/goals',
      SavingsGoalDetail: 'rent-savings/goals/:goalId',
      FinancialAdminDashboard: 'admin/financial',
      FinancialRevenueReport: 'admin/financial/revenue',
      FinancialTransactions: 'admin/financial/transactions',
      FinancialWithdrawals: 'admin/financial/withdrawals',
      FinancialCommissions: 'admin/financial/commissions',
      FinancialControls: 'admin/financial/controls',
      StateAdminDashboard: 'admin/state',
      StateAdminMigrations: 'admin/state/migrations',
      AdminPropertyDetail: 'admin/properties/:id',
      AdminUserDetail: 'admin/users/:id',
      AdminLawyerInvites: 'admin/lawyer-invites',
      TransportationBooking: 'transportation/book',
      TransportationBookings: 'transportation/bookings',
      TransportationBookingDetail: 'transportation/bookings/:bookingId',
      TransportationPayment: 'transportation/bookings/:bookingId/pay',
      FumigationCleaningBooking: 'fumigation/book',
      FumigationCleaningBookings: 'fumigation/bookings',
      FumigationCleaningBookingDetail: 'fumigation/bookings/:bookingId',
      FumigationCleaningPayment: 'fumigation/bookings/:bookingId/pay',
      VerificationStatus: 'verification-status',
      FumigationCleaningCatalog: 'fumigation-cleaning/catalog',
      ResetPassword: 'reset-password/:token',
      VerifyEmail: 'verify-email',
      VerifyEmailToken: 'verify-email/:token',
      VerifyPhone: 'verify-phone',
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
    <Stack.Screen name="VerifyPhone" component={VerifyPhoneScreen} options={{ title: 'Verify Phone' }} />
  </>
);

const commonInfoScreens = () => (
  <>
    <Stack.Screen name="PublicInfo" component={PublicInfoScreen} options={{ title: 'Information' }} />
    <Stack.Screen name="LawyersDirectory" component={LawyersDirectoryScreen} options={{ title: 'Lawyers' }} />
    <Stack.Screen name="LegalSupport" component={LegalSupportScreen} options={{ title: 'Legal Support' }} />
    <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
  </>
);

const GuestStack = () => (
  <Stack.Navigator initialRouteName="Welcome" screenOptions={screenOptions}>
    <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
    <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
    <Stack.Screen name="PropertyList" component={PropertyListScreen} options={{ title: 'Browse Properties' }} />
    <Stack.Screen name="PropertyDetail" component={PropertyDetailScreen} options={{ title: 'Property Details' }} />
    <Stack.Screen name="PropertyAlertRequest" component={PropertyAlertRequestScreen} options={{ title: 'Submit Request' }} />
    <Stack.Screen name="LocationInfo" component={LocationInfoScreen} options={{ title: 'Location' }} />
    <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
    <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: 'Forgot Password' }} />
    <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} options={{ title: 'Reset Password' }} />
    {commonVerificationScreens()}
    <Stack.Screen name="AcceptLawyerInvite" component={AcceptLawyerInviteScreen} options={{ title: 'Lawyer Invite' }} />
    <Stack.Screen name="AcceptAgentInvite" component={AcceptAgentInviteScreen} options={{ title: 'Agent Invite' }} />
    {commonInfoScreens()}
    <Stack.Screen name="WebFeatures" component={WebFeaturesScreen} options={{ title: 'Web Features' }} />
    <Stack.Screen name="WebRoute" component={WebRouteScreen} options={{ headerShown: false }} />
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
    <Stack.Screen name="WebFeatures" component={WebFeaturesScreen} options={{ title: 'Admin Web Features' }} />
    {commonInfoScreens()}
    <Stack.Screen name="WebRoute" component={WebRouteScreen} options={{ headerShown: false }} />
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
    <Stack.Screen name="WebFeatures" component={WebFeaturesScreen} options={{ title: 'Web Features' }} />
    {commonInfoScreens()}
    <Stack.Screen name="WebRoute" component={WebRouteScreen} options={{ headerShown: false }} />
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
        fontSize: 10,
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
    <Tab.Screen name="HomeTab" component={HomeScreen} options={{ title: 'Explore' }} />
    <Tab.Screen name="DashboardTab" component={DashboardScreen} options={{ title: 'My Hub' }} />
    <Tab.Screen name="Applications" component={ApplicationsScreen} options={{ title: 'Applications' }} />
    <Tab.Screen name="Messages" component={MessagesScreen} options={{ title: 'Messages' }} />
  </Tab.Navigator>
);

const TenantRoot = () => (
  <Stack.Navigator screenOptions={screenOptions}>
    <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
    <Stack.Screen name="PropertyList" component={PropertyListScreen} options={{ title: 'Browse Properties' }} />
    <Stack.Screen name="PropertyDetail" component={PropertyDetailScreen} options={{ title: 'Property Details' }} />
    <Stack.Screen name="PropertyAlertRequest" component={PropertyAlertRequestScreen} options={{ title: 'Submit Request' }} />
    <Stack.Screen name="LocationInfo" component={LocationInfoScreen} options={{ title: 'Location' }} />
    <Stack.Screen name="ApplicationDetail" component={ApplicationDetailScreen} options={{ headerShown: false }} />
    <Stack.Screen name="Profile" component={ProfileScreen} />
    <Stack.Screen name="SavedProperties" component={SavedPropertiesScreen} options={{ title: 'Saved Properties' }} />
    <Stack.Screen name="Subscribe" component={SubscribeScreen} />
    <Stack.Screen name="PaymentHistory" component={PaymentHistoryScreen} options={{ title: 'Payment History' }} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    {commonVerificationScreens()}
    <Stack.Screen name="RentSavingsDashboard" component={RentSavingsDashboardScreen} options={{ title: 'Rent Savings' }} />
    <Stack.Screen name="SavingsGoalCreate" component={SavingsGoalCreateScreen} options={{ title: 'Create Plan' }} />
    <Stack.Screen name="SavingsGoalList" component={SavingsGoalListScreen} options={{ title: 'My Plans' }} />
    <Stack.Screen name="SavingsGoalDetail" component={SavingsGoalDetailScreen} options={{ title: 'Plan Details' }} />
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
    <Stack.Screen name="WebFeatures" component={WebFeaturesScreen} options={{ title: 'Web Features' }} />
    {commonInfoScreens()}
    <Stack.Screen name="MyDisputes" component={MyDisputesScreen} options={{ title: 'My Disputes' }} />
    <Stack.Screen name="MyDamageReports" component={MyDamageReportsScreen} options={{ title: 'Damage Reports' }} />
    <Stack.Screen name="SubscribedProperties" component={SubscribedPropertiesScreen} options={{ title: 'My Subscriptions' }} />
    <Stack.Screen name="WebRoute" component={WebRouteScreen} options={{ headerShown: false }} />
    <Stack.Screen name="Careers" component={CareersScreen} options={{ title: 'Careers' }} />
    <Stack.Screen name="RecruitmentAdmin" component={RecruitmentAdminScreen} options={{ title: 'Recruitment Admin' }} />
    <Stack.Screen name="Interview" component={InterviewScreen} options={{ title: 'Interview' }} />
    <Stack.Screen name="RecruitmentApplication" component={RecruitmentApplicationScreen} options={{ title: 'Application' }} />
  </Stack.Navigator>
);

const LandlordRoot = () => (
  <Stack.Navigator screenOptions={screenOptions}>
    <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
    <Stack.Screen name="PropertyList" component={PropertyListScreen} options={{ title: 'Browse Properties' }} />
    <Stack.Screen name="PropertyDetail" component={PropertyDetailScreen} options={{ title: 'Property Details' }} />
    <Stack.Screen name="PropertyAlertRequest" component={PropertyAlertRequestScreen} options={{ title: 'Submit Request' }} />
    <Stack.Screen name="LocationInfo" component={LocationInfoScreen} options={{ title: 'Location' }} />
    <Stack.Screen name="ApplicationDetail" component={ApplicationDetailScreen} options={{ headerShown: false }} />
    <Stack.Screen name="Profile" component={ProfileScreen} />
    <Stack.Screen name="MyProperties" component={MyPropertiesScreen} options={{ title: 'My Properties' }} />
    <Stack.Screen name="AddProperty" component={AddPropertyScreen} options={{ title: 'Add Property' }} />
    <Stack.Screen name="PaymentHistory" component={PaymentHistoryScreen} options={{ title: 'Payment History' }} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    {commonVerificationScreens()}
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
    <Stack.Screen name="WebFeatures" component={WebFeaturesScreen} options={{ title: 'Web Features' }} />
    {commonInfoScreens()}
    <Stack.Screen name="MyDisputes" component={MyDisputesScreen} options={{ title: 'My Disputes' }} />
    <Stack.Screen name="MyDamageReports" component={MyDamageReportsScreen} options={{ title: 'Damage Reports' }} />
    <Stack.Screen name="SubscribedProperties" component={SubscribedPropertiesScreen} options={{ title: 'My Subscriptions' }} />
    <Stack.Screen name="WebRoute" component={WebRouteScreen} options={{ headerShown: false }} />
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
    <Stack.Screen name="MyProperties" component={MyPropertiesScreen} options={{ title: 'Managed Properties' }} />
    <Stack.Screen name="AddProperty" component={AddPropertyScreen} options={{ title: 'Add Property' }} />
    <Stack.Screen name="PropertyList" component={PropertyListScreen} options={{ title: 'Browse Properties' }} />
    <Stack.Screen name="PropertyDetail" component={PropertyDetailScreen} options={{ title: 'Property Details' }} />
    <Stack.Screen name="LocationInfo" component={LocationInfoScreen} options={{ title: 'Location' }} />
    <Stack.Screen name="Messages" component={MessagesScreen} />
    <Stack.Screen name="PaymentHistory" component={PaymentHistoryScreen} options={{ title: 'Payment History' }} />
    <Stack.Screen name="Profile" component={ProfileScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    {commonVerificationScreens()}
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
    <Stack.Screen name="WebFeatures" component={WebFeaturesScreen} options={{ title: 'Web Features' }} />
    {commonInfoScreens()}
    <Stack.Screen name="MyDisputes" component={MyDisputesScreen} options={{ title: 'My Disputes' }} />
    <Stack.Screen name="MyDamageReports" component={MyDamageReportsScreen} options={{ title: 'Damage Reports' }} />
    <Stack.Screen name="SubscribedProperties" component={SubscribedPropertiesScreen} options={{ title: 'My Subscriptions' }} />
    <Stack.Screen name="WebRoute" component={WebRouteScreen} options={{ headerShown: false }} />
    <Stack.Screen name="Careers" component={CareersScreen} options={{ title: 'Careers' }} />
    <Stack.Screen name="RecruitmentAdmin" component={RecruitmentAdminScreen} options={{ title: 'Recruitment Admin' }} />
    <Stack.Screen name="Interview" component={InterviewScreen} options={{ title: 'Interview' }} />
    <Stack.Screen name="RecruitmentApplication" component={RecruitmentApplicationScreen} options={{ title: 'Application' }} />
  </Stack.Navigator>
);

const LawyerRoot = () => (
  <Stack.Navigator screenOptions={screenOptions}>
    <Stack.Screen name="LawyerDashboard" component={LawyerDashboardScreen} options={{ title: 'Lawyer Dashboard' }} />
    <Stack.Screen name="PropertyList" component={PropertyListScreen} options={{ title: 'Browse Properties' }} />
    <Stack.Screen name="PropertyDetail" component={PropertyDetailScreen} options={{ title: 'Property Details' }} />
    <Stack.Screen name="PropertyAlertRequest" component={PropertyAlertRequestScreen} options={{ title: 'Submit Request' }} />
    <Stack.Screen name="LocationInfo" component={LocationInfoScreen} options={{ title: 'Location' }} />
    <Stack.Screen name="DisputeDetails" component={DisputeDetailsScreen} options={{ title: 'Dispute Trace' }} />
    <Stack.Screen name="VerifyCase" component={VerifyCaseScreen} options={{ title: 'Verify Case' }} />
    <Stack.Screen name="StateLawyerDashboard" component={StateLawyerDashboardScreen} options={{ title: 'State Lawyer' }} />
    <Stack.Screen name="SuperLawyerDashboard" component={SuperLawyerDashboardScreen} options={{ title: 'Super Lawyer' }} />
    <Stack.Screen name="Messages" component={MessagesScreen} />
    <Stack.Screen name="Profile" component={ProfileScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    {commonVerificationScreens()}
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
    <Stack.Screen name="WebFeatures" component={WebFeaturesScreen} options={{ title: 'Web Features' }} />
    {commonInfoScreens()}
    <Stack.Screen name="MyDisputes" component={MyDisputesScreen} options={{ title: 'My Disputes' }} />
    <Stack.Screen name="MyDamageReports" component={MyDamageReportsScreen} options={{ title: 'Damage Reports' }} />
    <Stack.Screen name="SubscribedProperties" component={SubscribedPropertiesScreen} options={{ title: 'My Subscriptions' }} />
    <Stack.Screen name="WebRoute" component={WebRouteScreen} options={{ headerShown: false }} />
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
    <Stack.Screen name="PropertyDetail" component={PropertyDetailScreen} options={{ title: 'Property Details' }} />
    <Stack.Screen name="LocationInfo" component={LocationInfoScreen} options={{ title: 'Location' }} />
    <Stack.Screen name="Messages" component={MessagesScreen} />
    <Stack.Screen name="PaymentHistory" component={PaymentHistoryScreen} options={{ title: 'Payment History' }} />
    <Stack.Screen name="Profile" component={ProfileScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    {commonVerificationScreens()}
    <Stack.Screen name="WebFeatures" component={WebFeaturesScreen} options={{ title: 'Web Features' }} />
    {commonInfoScreens()}
    <Stack.Screen name="MyDisputes" component={MyDisputesScreen} options={{ title: 'My Disputes' }} />
    <Stack.Screen name="MyDamageReports" component={MyDamageReportsScreen} options={{ title: 'Damage Reports' }} />
    <Stack.Screen name="SubscribedProperties" component={SubscribedPropertiesScreen} options={{ title: 'My Subscriptions' }} />
    <Stack.Screen name="WebRoute" component={WebRouteScreen} options={{ headerShown: false }} />
    <Stack.Screen name="Careers" component={CareersScreen} options={{ title: 'Careers' }} />
    <Stack.Screen name="RecruitmentAdmin" component={RecruitmentAdminScreen} options={{ title: 'Recruitment Admin' }} />
    <Stack.Screen name="Interview" component={InterviewScreen} options={{ title: 'Interview' }} />
    <Stack.Screen name="RecruitmentApplication" component={RecruitmentApplicationScreen} options={{ title: 'Application' }} />
  </Stack.Navigator>
);

const SuperAdminRoot = () => (
  <Stack.Navigator screenOptions={screenOptions}>
    <Stack.Screen name="SuperAdminDashboard" component={SuperAdminDashboardScreen} options={{ title: 'Super Admin' }} />
    <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ title: 'Admin Dashboard' }} />
    <Stack.Screen name="SuperAdminSeo" component={SuperAdminSeoDashboardScreen} options={{ title: 'SEO Dashboard' }} />
    <Stack.Screen name="SuperAdminSupportGovernance" component={SuperAdminSupportGovernanceScreen} options={{ title: 'Support Governance' }} />
    <Stack.Screen name="SuperAdminTransportationDashboard" component={SuperAdminTransportationDashboardScreen} options={{ title: 'Transport Oversight' }} />
    <Stack.Screen name="SuperAdminFumigationDashboard" component={SuperAdminFumigationDashboardScreen} options={{ title: 'Fumigation Oversight' }} />
    <Stack.Screen name="SuperFinancialAdminDashboard" component={SuperFinancialAdminDashboardScreen} options={{ title: 'Super Financial' }} />
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
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    {commonVerificationScreens()}
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
    <Stack.Screen name="WebFeatures" component={WebFeaturesScreen} options={{ title: 'Web Features' }} />
    {commonInfoScreens()}
    <Stack.Screen name="MyDisputes" component={MyDisputesScreen} options={{ title: 'My Disputes' }} />
    <Stack.Screen name="MyDamageReports" component={MyDamageReportsScreen} options={{ title: 'Damage Reports' }} />
    <Stack.Screen name="SubscribedProperties" component={SubscribedPropertiesScreen} options={{ title: 'My Subscriptions' }} />
    <Stack.Screen name="WebRoute" component={WebRouteScreen} options={{ headerShown: false }} />
    <Stack.Screen name="Careers" component={CareersScreen} options={{ title: 'Careers' }} />
    <Stack.Screen name="RecruitmentAdmin" component={RecruitmentAdminScreen} options={{ title: 'Recruitment Admin' }} />
    <Stack.Screen name="Interview" component={InterviewScreen} options={{ title: 'Interview' }} />
    <Stack.Screen name="RecruitmentApplication" component={RecruitmentApplicationScreen} options={{ title: 'Application' }} />
  </Stack.Navigator>
);

const FinancialAdminRoot = () => (
  <Stack.Navigator screenOptions={screenOptions}>
    <Stack.Screen name="FinancialAdminDashboard" component={FinancialAdminDashboardScreen} options={{ title: 'Financial Admin' }} />
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
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    {commonVerificationScreens()}
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
    <Stack.Screen name="WebFeatures" component={WebFeaturesScreen} options={{ title: 'Web Features' }} />
    {commonInfoScreens()}
    <Stack.Screen name="MyDisputes" component={MyDisputesScreen} options={{ title: 'My Disputes' }} />
    <Stack.Screen name="MyDamageReports" component={MyDamageReportsScreen} options={{ title: 'Damage Reports' }} />
    <Stack.Screen name="SubscribedProperties" component={SubscribedPropertiesScreen} options={{ title: 'My Subscriptions' }} />
    <Stack.Screen name="WebRoute" component={WebRouteScreen} options={{ headerShown: false }} />
    <Stack.Screen name="Careers" component={CareersScreen} options={{ title: 'Careers' }} />
    <Stack.Screen name="RecruitmentAdmin" component={RecruitmentAdminScreen} options={{ title: 'Recruitment Admin' }} />
    <Stack.Screen name="Interview" component={InterviewScreen} options={{ title: 'Interview' }} />
    <Stack.Screen name="RecruitmentApplication" component={RecruitmentApplicationScreen} options={{ title: 'Application' }} />
  </Stack.Navigator>
);

const StateAdminRoot = () => (
  <Stack.Navigator screenOptions={screenOptions}>
    <Stack.Screen name="StateAdminDashboard" component={StateAdminDashboardScreen} options={{ title: 'State Admin' }} />
    <Stack.Screen name="StateAdminMigrations" component={StateAdminMigrationsScreen} options={{ title: 'Migrations' }} />
    <Stack.Screen name="PropertyList" component={PropertyListScreen} options={{ title: 'Browse Properties' }} />
    <Stack.Screen name="PropertyDetail" component={PropertyDetailScreen} options={{ title: 'Property Details' }} />
    <Stack.Screen name="LocationInfo" component={LocationInfoScreen} options={{ title: 'Location' }} />
    <Stack.Screen name="VerifyCase" component={VerifyCaseScreen} options={{ title: 'Verify Case' }} />
    <Stack.Screen name="Messages" component={MessagesScreen} />
    <Stack.Screen name="PaymentHistory" component={PaymentHistoryScreen} options={{ title: 'Payment History' }} />
    <Stack.Screen name="Profile" component={ProfileScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    {commonVerificationScreens()}
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
    <Stack.Screen name="WebFeatures" component={WebFeaturesScreen} options={{ title: 'Web Features' }} />
    {commonInfoScreens()}
    <Stack.Screen name="WebRoute" component={WebRouteScreen} options={{ headerShown: false }} />
  </Stack.Navigator>
);

const RoleRouter = ({ userType }) => {
  switch (userType) {
    case 'tenant':
      return <TenantRoot />;
    case 'landlord':
      return <LandlordRoot />;
    case 'agent':
      return <AgentRoot />;
    case 'lawyer':
      return <LawyerRoot />;
    case 'state_lawyer':
    case 'super_lawyer':
      return <LawyerRoot />;
    case 'admin':
    case 'lga_admin':
      return <AdminRoot />;
    case 'super_admin':
      return <SuperAdminRoot />;
    case 'financial_admin':
    case 'lga_financial_admin':
      return <FinancialAdminRoot />;
    case 'super_financial_admin':
      return <FinancialAdminRoot />;
    case 'state_admin':
    case 'state_financial_admin':
      return <StateAdminRoot />;
    case 'lga_support_admin':
    case 'state_support_admin':
    case 'super_support_admin':
    case 'transportation_admin':
    case 'lga_transportation_admin':
    case 'state_transportation_admin':
    case 'super_transportation_admin':
    case 'fumigation_admin':
    case 'lga_fumigation_admin':
    case 'state_fumigation_admin':
    case 'super_fumigation_admin':
      return <ServiceAdminRoot />;
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