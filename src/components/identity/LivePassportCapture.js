import {nextPhotoStep, holdClosedEyes} from '../../utils/livePhotoSequence.cjs';
import React, {useEffect, useRef, useState} from 'react';
import {AppState, Modal, View, StyleSheet, ScrollView} from 'react-native';
import {CameraView, useCameraPermissions} from 'expo-camera';
import FaceDetection from '@react-native-ml-kit/face-detection';
import {File} from 'expo-file-system';
import * as Speech from 'expo-speech';
import Button from '../common/Button';
import AppText from '../common/AppText';
import {userService} from '../../services/userService';
import {authService} from '../../services/authService';
import {getErrorMessage} from '../../utils/http';
import {translateUi as ui, getInterfaceLanguage} from '../../i18n/interfaceRuntime.cjs';

const prompts = ['Face forward with both eyes open', 'Close both eyes and keep them closed until the next instruction', 'Open both eyes and face forward'];
const discard = uri => {try {if (uri) new File(uri).delete();} catch {}};
export default function LivePassportCapture({consent, onClose, onSaved}) {
  const camera = useRef(null), alive = useRef(true), busy = useRef(false), stepRef = useRef(0), shot = useRef(''), token = useRef('');
  const speechRun = useRef(0), closedSince = useRef(null);
  const [, requestPermission] = useCameraPermissions();
  const [allowed, setAllowed] = useState(false), [ready, setReady] = useState(false), [step, setStep] = useState(0), [saving, setSaving] = useState(false), [error, setError] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const instruction = ui(step < 3 ? prompts[step] : saving ? 'Saving your photo…' : 'Photo captured');
  const speakInstruction = async () => {
    const run = ++speechRun.current;
    try {
      await Speech.stop();
      if (run === speechRun.current && alive.current && AppState.currentState === 'active') Speech.speak(instruction, {language:getInterfaceLanguage(), rate:0.85, onError:() => {}});
    } catch {}
  };
  useEffect(() => {
    if (ready && voiceEnabled) speakInstruction();
    else {speechRun.current++; Speech.stop().catch(() => {});}
    return () => {speechRun.current++; Speech.stop().catch(() => {});};
  }, [ready, step, saving, voiceEnabled, instruction]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active') {speechRun.current++; Speech.stop().catch(() => {});}
    });
    return () => subscription.remove();
  }, []);
  const save = async () => {
    if (busy.current) return;
    busy.current = true; setSaving(true); setError('');
    try {
      if (!token.current) token.current = (await userService.createLiveCaptureSession())?.data?.token || '';
      if (!token.current) throw Error('Could not start a secure photo session. Please try again.');
      const usedToken = token.current; token.current = '';
      const response = await authService.uploadPassport({uri:shot.current,name:'passport.jpg',type:'image/jpeg'}, usedToken, consent);
      if (!response?.success) throw Error(response?.message || 'The photo was not saved. Please try again.');
      if (alive.current) {await onSaved(response); onClose();}
    } catch (e) {if (alive.current) setError(getErrorMessage(e, 'Could not save your photo. Please try again.'));}
    finally {busy.current = false; if (alive.current) setSaving(false);}
  };
  useEffect(() => {
    alive.current = true;
    (async () => {
      try {
        const result = await requestPermission();
        if (!result.granted) throw Error('Allow camera access in phone settings, then try again.');
        const session = await userService.createLiveCaptureSession();
        if (!session?.data?.token) throw Error('Could not start a secure photo session. Please try again.');
        if (alive.current) {token.current = session.data.token; setAllowed(true);}
      } catch (e) {if (alive.current) setError(getErrorMessage(e));}
    })();
    return () => {alive.current = false; discard(shot.current);};
  }, []);
  useEffect(() => {
    if (!ready || step >= 3 || error) return;
    let checking = false, cancelled = false;
    const timer = setInterval(async () => {
      if (checking || cancelled || busy.current || AppState.currentState !== 'active') return;
      checking = true; let uri = '';
      try {
        const photo = await camera.current?.takePictureAsync({quality:0.55}); uri = photo?.uri;
        if (!uri || cancelled) return;
        const faces = await FaceDetection.detect(uri, {classificationMode:'all',performanceMode:'accurate'});
        if (cancelled || !alive.current) return;
        let next = nextPhotoStep(stepRef.current, faces, photo.width, photo.height);
        if (stepRef.current === 1) {
          const hold = holdClosedEyes(next === 2, closedSince.current, Date.now());
          closedSince.current = hold.since;
          if (!hold.complete) next = 1;
        }
        if (next === stepRef.current) return;
        stepRef.current = next;
        if (stepRef.current === 3) {
          if (new File(uri).size > 2 * 1024 * 1024) throw Error('Photo is too large. Close the camera and try again.');
          shot.current = uri; setStep(3); clearInterval(timer); await save();
        } else setStep(stepRef.current);
      } catch (e) {if (!cancelled && alive.current) setError(getErrorMessage(e, 'Camera check failed. Close the camera and try again.'));}
      finally {if (uri !== shot.current) discard(uri); checking = false;}
    }, 650);
    return () => {cancelled = true; clearInterval(timer);};
  }, [ready, step, error]);
  return <Modal visible animationType="slide" onRequestClose={() => {if (!saving) onClose();}}><ScrollView contentContainerStyle={styles.content}>
    <AppText style={styles.title}>{ui('Capture passport photo')}</AppText>
    <AppText>{ui('Follow the steps. Your photo will be captured and saved automatically. Keep only your face in the frame.')}</AppText>
    {allowed && step < 3 ? <View style={styles.camera}><CameraView ref={camera} facing="front" style={styles.fill} onCameraReady={() => setReady(true)} onMountError={() => setError(ui('Camera unavailable. Close other camera apps and try again.'))}/></View> : null}
    <AppText accessibilityLiveRegion="polite">{instruction}</AppText>
    <Button title={ui(voiceEnabled ? 'Mute instructions' : 'Read instructions aloud')} variant="outline" onPress={() => setVoiceEnabled(value => !value)}/>
    {ready && voiceEnabled ? <Button title={ui('Repeat instruction')} variant="outline" onPress={speakInstruction}/> : null}
    {error ? <AppText accessibilityRole="alert">{error}</AppText> : null}
    {step === 3 && error ? <Button title={ui('Try saving photo again')} loading={saving} onPress={save}/> : null}
    <Button title={ui('Close')} variant="outline" disabled={saving} onPress={onClose}/>
  </ScrollView></Modal>;
}
const styles = StyleSheet.create({content:{padding:24,paddingVertical:48,gap:16},title:{fontSize:22,fontWeight:'700'},camera:{height:330,borderRadius:16,overflow:'hidden'},fill:{flex:1}});
