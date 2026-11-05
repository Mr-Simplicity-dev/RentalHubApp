import {
  ServiceTrackingCentreScreen,
  FumigationLiveTrackingScreen,
  TransportationLiveTrackingScreen,
  FumigationTeamConsoleScreen,
  DriverTripConsoleScreen
} from '../screens/services';

/**
 * Service and Tracking Navigation Route Definitions
 * For use in React Navigation (Native Stack / Tab Navigators)
 */
export const serviceRoutes = [
  {
    name: 'ServiceTrackingCentre',
    component: ServiceTrackingCentreScreen,
    options: {
      title: 'Service Tracking Centre',
      headerShown: true
    }
  },
  {
    name: 'FumigationLiveTracking',
    component: FumigationLiveTrackingScreen,
    options: {
      title: 'Live Fumigation Radar & Safety',
      headerShown: true
    }
  },
  {
    name: 'TransportationLiveTracking',
    component: TransportationLiveTrackingScreen,
    options: {
      title: 'Live Cargo & Vehicle Transit',
      headerShown: true
    }
  },
  {
    name: 'FumigationTeamConsole',
    component: FumigationTeamConsoleScreen,
    options: {
      title: 'Fumigation Squad Console',
      headerShown: true
    }
  },
  {
    name: 'DriverTripConsole',
    component: DriverTripConsoleScreen,
    options: {
      title: 'Driver Operations Console',
      headerShown: true
    }
  }
];

export default serviceRoutes;
