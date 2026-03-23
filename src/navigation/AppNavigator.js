import React, { useContext, useMemo } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import { AuthContext } from '../context/AuthContext';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import AcceptLawyerInviteScreen from '../screens/auth/AcceptLawyerInviteScreen';
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
import ApplicationsScreen from '../screens/applications/ApplicationsScreen';
import MessagesScreen from '../screens/messages/MessagesScreen';
import LawyerDashboardScreen from '../screens/lawyer/LawyerDashboardScreen';
import DisputeDetailsScreen from '../screens/lawyer/DisputeDetailsScreen';
import VerifyCaseScreen from '../screens/shared/VerifyCaseScreen';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminUsersScreen from '../screens/admin/AdminUsersScreen';
import AdminPropertiesScreen from '../screens/admin/AdminPropertiesScreen';
import AdminApplicationsScreen from '../screens/admin/AdminApplicationsScreen';
import AdminVerificationsScreen from '../screens/admin/AdminVerificationsScreen';
import AdminComplianceScreen from '../screens/admin/AdminComplianceScreen';
import SuperAdminDashboardScreen from '../screens/admin/SuperAdminDashboardScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const screenOptions = {
  headerTitleAlign: 'center',
};

const linkingConfig = {
  prefixes: [
    'rentalhub://',
    'https://rentalhub.com.ng',
    'https://www.rentalhub.com.ng',
    'https://renatalhub.com.ng',
    'https://www.renatalhub.com.ng',
  ],
  config: {
    screens: {
      Home: '',
      Login: 'login',
      Register: 'register',
      ForgotPassword: 'forgot-password',
      PropertyList: 'properties',
      PropertyDetail: 'properties/:id',
      PropertyAlertRequest: 'property-request',
      AcceptLawyerInvite: 'lawyer/accept-invite',
      Profile: 'profile',
      SavedProperties: 'saved-properties',
      Subscribe: 'subscribe',
      Notifications: 'notifications',
      MyProperties: 'my-properties',
      AddProperty: 'properties/new',
      LawyerDashboard: 'lawyer',
      DisputeDetails: 'dispute/:disputeId',
      VerifyCase: 'verify-case',
      AdminDashboard: 'admin',
      SuperAdminDashboard: 'super-admin',
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

const GuestStack = () => (
  <Stack.Navigator screenOptions={screenOptions}>
    <Stack.Screen name="Home" component={HomeScreen} />
    <Stack.Screen name="PropertyList" component={PropertyListScreen} options={{ title: 'Browse Properties' }} />
    <Stack.Screen name="PropertyDetail" component={PropertyDetailScreen} options={{ title: 'Property Details' }} />
    <Stack.Screen name="PropertyAlertRequest" component={PropertyAlertRequestScreen} options={{ title: 'Submit Request' }} />
    <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Login' }} />
    <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Register' }} />
    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: 'Forgot Password' }} />
    <Stack.Screen name="AcceptLawyerInvite" component={AcceptLawyerInviteScreen} options={{ title: 'Lawyer Invite' }} />
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
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
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
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
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
  </Stack.Navigator>
);

const AdminRoot = () => (
  <Stack.Navigator screenOptions={screenOptions}>
    <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ title: 'Admin Dashboard' }} />
    <Stack.Screen name="PropertyList" component={PropertyListScreen} options={{ title: 'Browse Properties' }} />
    <Stack.Screen name="PropertyDetail" component={PropertyDetailScreen} options={{ title: 'Property Details' }} />
    <Stack.Screen name="PropertyAlertRequest" component={PropertyAlertRequestScreen} options={{ title: 'Submit Request' }} />
    <Stack.Screen name="AdminUsers" component={AdminUsersScreen} options={{ title: 'Users' }} />
    <Stack.Screen name="AdminProperties" component={AdminPropertiesScreen} options={{ title: 'Properties' }} />
    <Stack.Screen name="AdminApplications" component={AdminApplicationsScreen} options={{ title: 'Applications' }} />
    <Stack.Screen name="AdminVerifications" component={AdminVerificationsScreen} options={{ title: 'Verifications' }} />
    <Stack.Screen name="AdminCompliance" component={AdminComplianceScreen} options={{ title: 'Compliance' }} />
    <Stack.Screen name="Messages" component={MessagesScreen} />
    <Stack.Screen name="Profile" component={ProfileScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
  </Stack.Navigator>
);

const SuperAdminRoot = () => (
  <Stack.Navigator screenOptions={screenOptions}>
    <Stack.Screen name="SuperAdminDashboard" component={SuperAdminDashboardScreen} options={{ title: 'Super Admin' }} />
    <Stack.Screen name="PropertyList" component={PropertyListScreen} options={{ title: 'Browse Properties' }} />
    <Stack.Screen name="PropertyDetail" component={PropertyDetailScreen} options={{ title: 'Property Details' }} />
    <Stack.Screen name="PropertyAlertRequest" component={PropertyAlertRequestScreen} options={{ title: 'Submit Request' }} />
    <Stack.Screen name="VerifyCase" component={VerifyCaseScreen} options={{ title: 'Verify Case' }} />
    <Stack.Screen name="Messages" component={MessagesScreen} />
    <Stack.Screen name="Profile" component={ProfileScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
  </Stack.Navigator>
);

const AppNavigator = () => {
  const { isAuthenticated, loading, user } = useContext(AuthContext);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#0284c7" />
      </View>
    );
  }

  const role = user?.user_type;

  let content = <GuestStack />;
  if (isAuthenticated && role === 'tenant') content = <TenantRoot />;
  if (isAuthenticated && role === 'landlord') content = <LandlordRoot />;
  if (isAuthenticated && role === 'lawyer') content = <LawyerRoot />;
  if (isAuthenticated && role === 'admin') content = <AdminRoot />;
  if (isAuthenticated && role === 'super_admin') content = <SuperAdminRoot />;

  const linking = useMemo(() => linkingConfig, []);

  return <NavigationContainer linking={linking}>{content}</NavigationContainer>;
};

export default AppNavigator;
