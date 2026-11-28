import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import api from './api';
import { NativeModules, Platform } from 'react-native';
const sources = {
  normal: require('../../assets/call-sounds/call_normal.wav'),
  greeting: require('../../assets/call-sounds/call_greeting.wav'),
  ringback: require('../../assets/call-sounds/call_ringback.wav'),
};
export const loadCallSounds = async () => (await api.get('/voice/call-sounds')).data.data;
export const saveCallSound = async sound => (await api.patch('/voice/call-sounds/preference', { sound })).data.data;
export const saveCallPolicy = async policy => (await api.patch('/voice/call-sounds/admin', { policy })).data.data;
export const playCallSound = async (sound, loop = true) => {
  if (Platform.OS === 'android' && !(await NativeModules.RentalHubCallSound?.canPlay(sound))) {
    return { stop: () => {}, muted: true };
  }
  await setAudioModeAsync({ playsInSilentMode: false, shouldPlayInBackground: false, interruptionMode: 'mixWithOthers' });
  const player = createAudioPlayer(sources[sound] || sources.normal);
  player.loop = loop;
  player.volume = 1;
  player.play();
  let removed = false;
  return { stop: () => { if (!removed) { removed = true; player.pause(); player.remove(); } } };
};
