import React, { useEffect, useRef, useState } from 'react';
import { Image, Modal, ScrollView, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import FaceDetection from '@react-native-ml-kit/face-detection';
import { File } from 'expo-file-system';
import Button from '../common/Button';
import AppText from '../common/AppText';
import api from '../../services/api';

const prompts = ['Face the camera with eyes open', 'Close both eyes', 'Open both eyes and face forward'];
const discard = uri => { if (uri) { try { new File(uri).delete(); } catch {} } };

export default function AssistedCustomerPhoto({ customer, onClose, onSaved }) {
  const camera = useRef(null), token = useRef(''), preview = useRef(''), mounted = useRef(true), locked = useRef(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [step, setStep] = useState(-1), [ready, setReady] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const base = '/assisted-registration/staff/' + encodeURIComponent(customer.reference) + '/photo';
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; discard(preview.current); }; }, []);
  const run = async action => {
    if (locked.current) return;
    locked.current = true; setBusy(true); setMessage('');
    try { await action(); } catch (error) { if (mounted.current) setMessage(error.response?.data?.message || error.message || 'Unable to complete capture.'); }
    finally { locked.current = false; if (mounted.current) setBusy(false); }
  };
  const start = () => run(async () => {
    if (!permission?.granted && !(await requestPermission()).granted) throw Error('Allow camera access in phone settings to continue.');
    const response = await api.post(base + '/session', { consent_confirmed: true });
    if (!response.data?.data?.token) throw Error('Unable to start a capture session.');
    token.current = response.data.data.token; discard(preview.current); preview.current = ''; setReady(false); setStep(0);
  });
  const snap = () => run(async () => {
    const shot = await camera.current.takePictureAsync({ quality: 0.55 });
    try {
      const faces = await FaceDetection.detect(shot.uri, { classificationMode: 'all', performanceMode: 'accurate' });
      const face = faces[0], eyes = [face?.leftEyeOpenProbability, face?.rightEyeOpenProbability];
      if (faces.length !== 1 || Math.abs(face.rotationY) > 20 || !eyes.every(n => typeof n === 'number' && n >= 0 && (step === 1 ? n < 0.35 : n > 0.65))) throw Error('Keep one face in good light and repeat the movement shown.');
      if (step === 2) { if (new File(shot.uri).size > 2 * 1024 * 1024) throw Error('Photo is too large. Please retake it.'); preview.current = shot.uri; }
      setStep(step + 1);
    } finally { if (preview.current !== shot.uri) discard(shot.uri); }
  });
  const save = () => run(async () => {
    const body = new FormData(); body.append('capture_source', 'live_camera'); body.append('passport', { uri: preview.current, name: 'customer.jpg', type: 'image/jpeg' });
    await api.post(base, body, { headers: { 'Content-Type': 'multipart/form-data', 'X-Capture-Token': token.current } });
    onSaved(); onClose();
  });
  return <Modal visible animationType="slide" onRequestClose={() => { if (!busy) onClose(); }}><ScrollView contentContainerStyle={{ padding: 24, paddingVertical: 48, gap: 14 }}>
    <AppText style={{ fontSize: 22, fontWeight: '700' }}>Capture customer photo</AppText><AppText>{customer.full_name} · {customer.reference}</AppText>
    {step < 0 ? <><AppText>Explain that the photo will be stored on this customer’s account for identity review. Continue only with their agreement.</AppText><Button title="Customer agrees — open camera" disabled={busy} onPress={start} /></> : step < 3 ? <><View style={{ height: 320 }}><CameraView ref={camera} facing="back" style={{ flex: 1 }} onCameraReady={() => setReady(true)} onMountError={() => setMessage('Camera unavailable. Close and try again.')} /></View><AppText>{prompts[step]}</AppText><Button title={step === 2 ? 'Capture photo' : 'Check movement'} disabled={busy || !ready} onPress={snap} /></> : <><Image accessibilityLabel="Customer photo preview" source={{ uri: preview.current }} style={{ height: 280 }} resizeMode="contain" /><Button title="Save customer photo" disabled={busy} onPress={save} /><Button title="Retake photo" variant="outline" disabled={busy} onPress={start} /></>}
    {message ? <AppText accessibilityRole="alert">{message}</AppText> : null}<Button title="Close" variant="outline" disabled={busy} onPress={onClose} />
  </ScrollView></Modal>;
}
