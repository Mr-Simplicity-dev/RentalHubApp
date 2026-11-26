import { Platform } from 'react-native';
import api from '../services/api';

export const getWebRtcIceServers = () => [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export const loadWebRtcIceServers = async () => {
  const response = await api.get('/voice/ice-servers', { timeout: 12000 });
  const servers = response.data?.data;
  if (response.data?.success !== true || !Array.isArray(servers) || !servers.some(
    (server) => [].concat(server.urls || []).some((url) => /^turns?:/.test(url))
  )) {
    throw new Error('The call connection service is unavailable. Please try again shortly.');
  }
  return servers;
};

export const isVideoEnabledCall = (callType) => ['video', 'virtual_tour'].includes(callType);

export const getAudioConstraints = (platform = Platform.OS) => {
  if (platform !== 'android') return true;
  return {
    googEchoCancellation: true,
    googNoiseSuppression: true,
    googAutoGainControl: true,
    googHighpassFilter: true,
  };
};

export const getVideoConstraints = (facingMode = 'user', highQuality = true) => ({
  facingMode,
  width: { ideal: highQuality ? 1280 : 640 },
  height: { ideal: highQuality ? 720 : 480 },
  frameRate: { ideal: highQuality ? 30 : 24, max: highQuality ? 30 : 24 },
});
