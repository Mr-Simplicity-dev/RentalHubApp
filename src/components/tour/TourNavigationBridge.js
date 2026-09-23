import React, { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import {
  getEffectiveTourRole,
  getTourDestinationForRole,
} from '../../config/tourConfig';
import { navigationRef } from '../../navigation/navigationRef';
import { useTourStepOrchestrator } from './TourTarget';

const wait = (duration) => new Promise((resolve) => setTimeout(resolve, duration));

const waitForNavigator = async (timeoutMs = 1600) => {
  const startedAt = Date.now();

  while (!navigationRef.isReady() && Date.now() - startedAt < timeoutMs) {
    await wait(50);
  }

  return navigationRef.isReady();
};

/**
 * Nested navigators (tabs inside a stack) keep their route names inside the
 * child route states, so a flat root routeNames check misses every screen
 * inside MainTabs. Walk the whole tree instead.
 */
const stateHasRoute = (state, routeName) => {
  if (!state) return false;
  if ((state.routeNames || []).includes(routeName)) return true;
  return (state.routes || []).some((route) => stateHasRoute(route.state, routeName));
};

/**
 * Keeps every automatic and replayed tour attached to the screen it describes.
 * It deliberately renders nothing; it only prepares navigation before the
 * coach-mark engine attempts to measure a registered control.
 */
const TourNavigationBridge = () => {
  const { user } = useContext(AuthContext);

  useTourStepOrchestrator(async (step) => {
    const ready = await waitForNavigator();
    if (!ready) {
      return { status: 'unavailable', reason: 'navigator_not_ready' };
    }

    const destination = getTourDestinationForRole(getEffectiveTourRole(user), step);
    if (!destination?.name) {
      return { status: 'unavailable', reason: 'destination_missing' };
    }

    if (!stateHasRoute(navigationRef.getRootState(), destination.name)) {
      return {
        status: 'unavailable',
        reason: 'route_unavailable',
        route: destination.name,
      };
    }

    navigationRef.navigate(destination.name, destination.params);

    // React Navigation commits a route before its native controls complete
    // layout. The registry performs the longer target wait after this settle.
    await wait(220);
    return { status: 'ready', route: destination.name };
  });

  return null;
};

export default TourNavigationBridge;
