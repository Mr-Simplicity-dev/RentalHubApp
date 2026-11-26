import { NativeEventEmitter, NativeModules } from 'react-native';

const Native = NativeModules.RentalHubAudioRoute || null;
const emitter = Native ? new NativeEventEmitter(Native) : null;
export const AUDIO_ROUTE_EVENT = 'RentalHubAudioRouteChanged';

export const isAudioRouteSupported = () => Boolean(Native?.setRoute);

export const subscribeAudioRouteChanges = (handler) => {
  if (!emitter || typeof handler !== 'function') return () => {};
  emitter.addListener(AUDIO_ROUTE_EVENT, handler);
  return () => emitter.removeListener(AUDIO_ROUTE_EVENT, handler);
};

export const getAudioRouteState = async () => {
  if (!Native?.getState) return { route: 'unknown', available: [], supported: false };
  try {
    const state = await Native.getState();
    return {
      route: state?.route || 'unknown',
      available: Array.isArray(state?.available) ? state.available : [],
      supported: state?.supported !== false,
    };
  } catch (_error) {
    return { route: 'unknown', available: [], supported: false };
  }
};

export const setAudioRoute = async (route) => {
  if (!Native?.setRoute) throw new Error('AUDIO_ROUTE_UNSUPPORTED');
  const state = await Native.setRoute(route);
  return {
    route: state?.route || route,
    available: Array.isArray(state?.available) ? state.available : [],
    supported: state?.supported !== false,
  };
};

export const restoreAudioRoute = async () => {
  if (!Native?.restore) return;
  try { await Native.restore(); } catch (_error) {}
};

export default {
  AUDIO_ROUTE_EVENT,
  getAudioRouteState,
  isAudioRouteSupported,
  restoreAudioRoute,
  setAudioRoute,
  subscribeAudioRouteChanges,
};
