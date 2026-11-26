import { NativeModules, Platform, findNodeHandle } from 'react-native';
import { createNativeCallMediaController } from '../utils/nativeCallMediaController.cjs';
import { getAudioConstraints, getVideoConstraints, loadWebRtcIceServers } from '../config/webrtcConfig';
import { getAudioRouteState, restoreAudioRoute, setAudioRoute } from './nativeAudioRouteService';

let mediaDevices;
let RTCIceCandidate;
let RTCPeerConnection;
let RTCSessionDescription;
try {
  const WebRTC = require('react-native-webrtc');
  mediaDevices = WebRTC.mediaDevices;
  RTCIceCandidate = WebRTC.RTCIceCandidate;
  RTCPeerConnection = WebRTC.RTCPeerConnection;
  RTCSessionDescription = WebRTC.RTCSessionDescription;
} catch (_error) {
  // Native WebRTC is optional at module load so the UI can explain call failures.
}

const presentScreenPicker = async (pickerRef) => {
  if (Platform.OS !== 'ios') return;
  const reactTag = findNodeHandle(pickerRef?.current);
  if (!reactTag) throw new Error('SCREEN_PICKER_NOT_READY');
  const manager = NativeModules.ScreenCapturePickerViewManager;
  if (!manager?.show) throw new Error('SCREEN_SHARING_UNSUPPORTED');
  await manager.show(reactTag);
};

export const createNativeCallMedia = ({ emitSignal, onState, pickerRef }) => createNativeCallMediaController({
  mediaDevices,
  RTCIceCandidate,
  RTCPeerConnection,
  RTCSessionDescription,
  loadIceServers: loadWebRtcIceServers,
  emitSignal,
  presentScreenPicker: () => presentScreenPicker(pickerRef),
  getAudioConstraints: () => getAudioConstraints(Platform.OS),
  getVideoConstraints,
  audioRoute: {
    getState: getAudioRouteState,
    setRoute: setAudioRoute,
    restore: restoreAudioRoute,
  },
  onState,
});
