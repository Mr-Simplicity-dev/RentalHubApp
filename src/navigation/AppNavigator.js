import React, { useContext } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import { AuthContext } from '../context/AuthContext';

import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import VerifyEmailScreen from '../screens/auth/VerifyEmailScreen';
import VerifyPhoneScreen from '../screens/auth/VerifyPhoneScreen';
import AcceptLawyerInviteScreen from '../screens/auth/AcceptLawyerInviteScreen';
import AcceptAgentInviteScreen from '../screens/auth/AcceptAgentInviteScreen';

import HomeScreen from '../screens/home/HomeScreen';
import PropertyListScreen from '../screens/home/PropertyListScreen';
import PropertyDetailScreen from '../screens/home/PropertyDetailScreen';
import PropertyAlertRequestScreen from '../screens/home/PropertyAlertRequestScreen';

import DashboardScreen from '../screens/dashboard/DashboardScreen';
import ProfileScreen from '../screens/dashboard/ProfileScreen';
import SavedPropertiesScreen from '../screens/dashboard/SavedPropertiesScreen';
import MyPropertiesScreen from '../screens/dashboard/MyPropertiesScreen';
import AddPropertyScreen from '../screens/dashboard/AddPropertyScreen';
import SubscribeScreen from '../screens/dashboard/SubscribeScreen';
import NotificationsScreen from '../screens/dashboard/NotificationsScreen';
import PaymentHistoryScreen from '../screens/dashboard/PaymentHistoryScreen';

import ApplicationsScreen from '../screens/applications/ApplicationsScreen';
import MessagesScreen from '../screens/messages/MessagesScreen';

import LawyerDashboardScreen from '../screens/lawyer/LawyerDashboardScreen';
import DisputeDetailsScreen from '../screens/lawyer/DisputeDetailsScreen';

import VerifyCaseScreen from '../screens/shared/VerifyCaseScreen';
import WebFeaturesScreen from '../screens/shared/WebFeaturesScreen';
import WebRouteScreen from '../screens/shared/WebRouteScreen';

import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminUsersScreen from '../screens/admin/AdminUsersScreen';
import AdminPropertiesScreen from '../screens/admin/AdminPropertiesScreen';
import AdminApplicationsScreen from '../screens/admin/AdminApplicationsScreen';
import AdminVerificationsScreen from '../screens/admin/AdminVerificationsScreen';
import AdminComplianceScreen from '../screens/admin/AdminComplianceScreen';
import SuperAdminDashboardScreen from '../screens/admin/SuperAdminDashboardScreen';
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

const Stack = (Platform.OS === 'web' ? createStackNavigator : createNativeStackNavigator)();
const Tab = createBottomTabNavigator();

const screenOptions = {
  headerTitleAlign: 'center',
};

const linkingConfig = {
  prefixes: ['rentalhub://', 'https://rentalhub.com.ng', 'https://www.rentalhub.com.ng'],
  config: {
    screens: {
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
      LocationPage: 'nigeria/:stateSlug',
      AreaPage: 'areas/:stateSlug/:citySlug/:areaSlug',
      LawyersDirectory: 'lawyers',
    },
  },
};

const tabIcon = (routeName, focused, color, size) => {
  let iconName = 'ellipse-outline';
  if (routeName === 'HomeTab') iconName = focused ? 'home' : 'home-outline';
  if (routeName === 'DashboardTab') iconName = focused ? 'grid' : 'grid-outline';
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

const GuestStack = () => (
  <Stack.Navigator screenOptions={screenOptions}>
    <Stack.Screen name="Home" component={HomeScreen} />
    <Stack.Screen name="PropertyList" component={PropertyListScreen} options={{ title: 'Browse Properties' }} />
    <Stack.Screen name="PropertyDetail" component={PropertyDetailScreen} options={{ title: 'Property Details' }} />
    <Stack.Screen name="PropertyAlertRequest" component={PropertyAlertRequestScreen} options={{ title: 'Submit Request' }} />
    <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Login' }} />
    <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Register' }} />
    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: 'Forgot Password' }} />
    {commonVerificationScreens()}
    <Stack.Screen name="AcceptLawyerInvite" component={AcceptLawyerInviteScreen} options={{ title: 'Lawyer Invite' }} />
    <Stack.Screen name="AcceptAgentInvite" component={AcceptAgentInviteScreen} options={{ title: 'Agent Invite' }} />
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
  </Stack.Navigator>
);

const WebAdminRoot = () => (
  <Stack.Navigator screenOptions={screenOptions}>
    <Stack.Screen name="WebFeatures" component={WebFeaturesScreen} options={{ title: 'Admin Web Features' }} />
    <Stack.Screen name="WebRoute" component={WebRouteScreen} options={{ headerShown: false }} />
  </Stack.Navigator>
);

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => tabIcon(route.name, focused, color, size),
      tabBarActiveTintColor: '#0284c7',
      tabBarInactiveTintColor: '#6b7280',
      headerShown: false,
    })}
  >
    <Tab.Screen name="HomeTab" component={HomeScreen} options={{ title: 'Home' }} />
    <Tab.Screen name="DashboardTab" component={DashboardScreen} options={{ title: 'Dashboard' }} />
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
    <Stack.Screen name="WebFeatures" component={WebFeaturesScreen} options={{ title: 'Web Features' }} />
    <Stack.Screen name="WebRoute" component={WebRouteScreen} options={{ headerShown: false }} />
  </Stack.Navigator>
);

const LandlordRoot = () => (
  <Stack.Navigator screenOptions={screenOptions}>
    <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
    <Stack.Screen name="PropertyList" component={PropertyListScreen} options={{ title: 'Browse Properties' }} />
    <Stack.Screen name="PropertyDetail" component={PropertyDetailScreen} options={{ title: 'Property Details' }} />
    <Stack.Screen name="PropertyAlertRequest" component={PropertyAlertRequestScreen} options={{ title: 'Submit Request' }} />
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
    <Stack.Screen name="WebFeatures" component={WebFeaturesScreen} options={{ title: 'Web Features' }} />
    <Stack.Screen name="WebRoute" component={WebRouteScreen} options={{ headerShown: false }} />
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
    <Stack.Screen name="WebFeatures" component={WebFeaturesScreen} options={{ title: 'Web Features' }} />
    <Stack.Screen name="WebRoute" component={WebRouteScreen} options={{ headerShown: false }} />
  </Stack.Navigator>
);

const LawyerRoot = () => (
  <Stack.Navigator screenOptions={screenOptions}>
    <Stack.Screen name="LawyerDashboard" component={LawyerDashboardScreen} options={{ title: 'Lawyer Dashboard' }} />
    <Stack.Screen name="PropertyList" component={PropertyListScreen} options={{ title: 'Browse Properties' }} />
    <Stack.Screen name="PropertyDetail" component={PropertyDetailScreen} options={{ title: 'Property Details' }} />
    <Stack.Screen name="PropertyAlertRequest" component={PropertyAlertRequestScreen} options={{ title: 'Submit Request' }} />
    <Stack.Screen name="DisputeDetails" component={DisputeDetailsScreen} options={{ title: 'Dispute Trace' }} />
    <Stack.Screen name="VerifyCase" component={VerifyCaseScreen} options={{ title: 'Verify Case' }} />
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
    <Stack.Screen name="WebFeatures" component={WebFeaturesScreen} options={{ title: 'Web Features' }} />
    <Stack.Screen name="WebRoute" component={WebRouteScreen} options={{ headerShown: false }} />
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
    <Stack.Screen name="PropertyDetail" component={PropertyDetailScreen} options={{ title: 'Property Details' }} />
    <Stack.Screen name="Messages" component={MessagesScreen} />
    <Stack.Screen name="PaymentHistory" component={PaymentHistoryScreen} options={{ title: 'Payment History' }} />
    <Stack.Screen name="Profile" component={ProfileScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    {commonVerificationScreens()}
    <Stack.Screen name="WebFeatures" component={WebFeaturesScreen} options={{ title: 'Web Features' }} />
    <Stack.Screen name="WebRoute" component={WebRouteScreen} options={{ headerShown: false }} />
  </Stack.Navigator>
);

const SuperAdminRoot = () => (
  <Stack.Navigator screenOptions={screenOptions}>
    <Stack.Screen name="SuperAdminDashboard" component={SuperAdminDashboardScreen} options={{ title: 'Super Admin' }} />
    <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ title: 'Admin Dashboard' }} />
    <Stack.Screen name="AdminAgentAssignments" component={AdminAgentAssignmentsScreen} options={{ title: 'Agent Assignments' }} />
    <Stack.Screen name="AdminLawyerInvites" component={AdminLawyerInvitesScreen} options={{ title: 'Lawyer Invites' }} />
    <Stack.Screen name="AdminPropertyDetail" component={AdminPropertyDetailScreen} options={{ title: 'Property Details' }} />
    <Stack.Screen name="AdminUserDetail" component={AdminUserDetailScreen} options={{ title: 'User Details' }} />
    <Stack.Screen name="PropertyList" component={PropertyListScreen} options={{ title: 'Browse Properties' }} />
    <Stack.Screen name="PropertyDetail" component={PropertyDetailScreen} options={{ title: 'Property Details' }} />
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
    <Stack.Screen name="WebFeatures" component={WebFeaturesScreen} options={{ title: 'Web Features' }} />
    <Stack.Screen name="WebRoute" component={WebRouteScreen} options={{ headerShown: false }} />
  </Stack.Navigator>
);

const FinancialAdminRoot = () => (
  <Stack.Navigator screenOptions={screenOptions}>
    <Stack.Screen name="FinancialAdminDashboard" component={FinancialAdminDashboardScreen} options={{ title: 'Financial Admin' }} />
    <Stack.Screen name="FinancialRevenueReport" component={FinancialRevenueReportScreen} options={{ title: 'Revenue Reports' }} />
    <Stack.Screen name="FinancialTransactions" component={FinancialTransactionsScreen} options={{ title: 'Transactions' }} />
    <Stack.Screen name="FinancialWithdrawals" component={FinancialWithdrawalsScreen} options={{ title: 'Withdrawals' }} />
    <Stack.Screen name="FinancialCommissions" component={FinancialCommissionsScreen} options={{ title: 'Commissions' }} />
    <Stack.Screen name="PropertyList" component={PropertyListScreen} options={{ title: 'Browse Properties' }} />
    <Stack.Screen name="PropertyDetail" component={PropertyDetailScreen} options={{ title: 'Property Details' }} />
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
    <Stack.Screen name="WebFeatures" component={WebFeaturesScreen} options={{ title: 'Web Features' }} />
    <Stack.Screen name="WebRoute" component={WebRouteScreen} options={{ headerShown: false }} />
  </Stack.Navigator>
);

const StateAdminRoot = () => (
  <Stack.Navigator screenOptions={screenOptions}>
    <Stack.Screen name="StateAdminDashboard" component={StateAdminDashboardScreen} options={{ title: 'State Admin' }} />
    <Stack.Screen name="StateAdminMigrations" component={StateAdminMigrationsScreen} options={{ title: 'Migrations' }} />
    <Stack.Screen name="PropertyList" component={PropertyListScreen} options={{ title: 'Browse Properties' }} />
    <Stack.Screen name="PropertyDetail" component={PropertyDetailScreen} options={{ title: 'Property Details' }} />
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
    <Stack.Screen name="WebFeatures" component={WebFeaturesScreen} options={{ title: 'Web Features' }} />
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
      return <WebAdminRoot />;
    default:
      return <TenantRoot />;
  }
};

const AppNavigator = () => {
  const { isAuthenticated, loading, user } = useContext(AuthContext);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#0284c7" />
      </View>
    );
  }

  return (
    <NavigationContainer linking={linkingConfig} fallback={<ActivityIndicator />}>
      {isAuthenticated ? <RoleRouter userType={user?.user_type} /> : <GuestStack />}
    </NavigationContainer>
  );
};

export default AppNavigator;
