import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { launchCamera } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import Input from '../common/Input';
import Button from '../common/Button';
import SelectField from '../common/SelectField';
import OptionPickerModal from '../common/OptionPickerModal';
import { propertyService } from '../../services/propertyService';
import { getErrorMessage } from '../../utils/http';

const DAMAGE_TYPES = [
  { value: 'scratch', label: 'Scratch' },
  { value: 'crack', label: 'Crack' },
  { value: 'hole', label: 'Hole' },
  { value: 'dent', label: 'Dent' },
  { value: 'stain', label: 'Stain' },
  { value: 'water_damage', label: 'Water Damage' },
  { value: 'mold', label: 'Mold' },
  { value: 'other', label: 'Other' },
];

const SEVERITY_LEVELS = [
  { value: 'minor', label: 'Minor' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'severe', label: 'Severe' },
];

const DEPTH_LEVELS = [
  { value: 'surface', label: 'Surface' },
  { value: 'shallow', label: 'Shallow' },
  { value: 'deep', label: 'Deep' },
];

const URGENCY_LEVELS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const ROOMS = [
  'Living Room',
  'Kitchen',
  'Bedroom 1',
  'Bedroom 2',
  'Bedroom 3',
  'Bathroom 1',
  'Bathroom 2',
  'Hallway',
  'Entrance',
  'Other',
];

const DamageReportCapture = ({ visible, propertyId, onClose, onSaved }) => {
  const [stage, setStage] = useState('workflow');
  const [photo, setPhoto] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [aiResult, setAiResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pickerType, setPickerType] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [retryAction, setRetryAction] = useState(null);
  const [form, setForm] = useState({
    room_location: '',
    damage_type: '',
    severity: '',
    depth_level: '',
    width_cm: '',
    height_cm: '',
    urgency: '',
    description: '',
  });

  const resetState = () => {
    setStage('workflow');
    setPhoto(null);
    setAnalyzing(false);
    setAnalysisError('');
    setAiResult(null);
    setSaving(false);
    setPickerType(null);
    setUploadProgress(null);
    setRetryAction(null);
    setForm({
      room_location: '',
      damage_type: '',
      severity: '',
      depth_level: '',
      width_cm: '',
      height_cm: '',
      urgency: '',
      description: '',
    });
  };

  const handleClose = () => {
    resetState();
    onClose?.();
  };

  const applyAnalysis = (analysis) => {
    if (!analysis) return;
    setForm((prev) => ({
      ...prev,
      damage_type: analysis.damage_type || prev.damage_type,
      severity: analysis.severity || prev.severity,
      depth_level: analysis.depth_level || prev.depth_level,
      width_cm: analysis.estimated_width_cm ? String(analysis.estimated_width_cm) : prev.width_cm,
      height_cm: analysis.estimated_height_cm ? String(analysis.estimated_height_cm) : prev.height_cm,
      urgency: analysis.urgency || prev.urgency,
      description: analysis.description || prev.description,
    }));
  };

  const capturePhoto = async () => {
    try {
      const result = await launchCamera({
        mediaType: 'photo',
        quality: 0.85,
        cameraType: 'back',
        saveToPhotos: false,
      });

      if (result.didCancel || !result.assets?.[0]) return;

      const asset = result.assets[0];
      const captured = {
        uri: asset.uri,
        type: asset.type || 'image/jpeg',
        fileName: asset.fileName || `damage-${Date.now()}.jpg`,
      };

      setPhoto(captured);
      setStage('review');
      setAnalyzing(true);
      setAnalysisError('');
      setAiResult(null);
      setRetryAction(null);
      setUploadProgress({ label: 'Uploading photo for AI analysis', percent: 0 });

      try {
        const response = await propertyService.analyzeDamagePhoto(captured, {
          onUploadProgress: (event) => {
            const total = event.total || asset.fileSize || 0;
            const percent = total ? Math.round((event.loaded / total) * 100) : 0;
            setUploadProgress({
              label: 'Uploading photo for AI analysis',
              percent: Math.min(percent, 100),
            });
          },
        });
        const analysis = response?.data?.ai_analysis;
        if (analysis && !analysis.error) {
          setAiResult(analysis);
          applyAnalysis(analysis);
        } else {
          setAnalysisError('AI analysis unavailable. Complete the report manually.');
        }
      } catch (error) {
        setAnalysisError('AI analysis failed. You can still complete the report manually.');
        setRetryAction(() => () => analyzeExistingPhoto(captured));
      } finally {
        setAnalyzing(false);
        setUploadProgress(null);
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Camera error',
        text2: getErrorMessage(error, 'Could not open camera'),
      });
    }
  };

  const analyzeExistingPhoto = async (targetPhoto = photo) => {
    if (!targetPhoto) return;
    setAnalyzing(true);
    setAnalysisError('');
    setRetryAction(null);
    setUploadProgress({ label: 'Retrying AI analysis', percent: 0 });
    try {
      const response = await propertyService.analyzeDamagePhoto(targetPhoto, {
        onUploadProgress: (event) => {
          const total = event.total || 0;
          const percent = total ? Math.round((event.loaded / total) * 100) : 0;
          setUploadProgress({
            label: 'Retrying AI analysis',
            percent: Math.min(percent, 100),
          });
        },
      });
      const analysis = response?.data?.ai_analysis;
      if (analysis && !analysis.error) {
        setAiResult(analysis);
        applyAnalysis(analysis);
      } else {
        setAnalysisError('AI analysis unavailable. Complete the report manually.');
      }
    } catch (error) {
      setAnalysisError('AI analysis failed again. You can still save the report manually.');
      setRetryAction(() => () => analyzeExistingPhoto(targetPhoto));
    } finally {
      setAnalyzing(false);
      setUploadProgress(null);
    }
  };

  const saveReport = async () => {
    if (!photo || !form.room_location.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Missing information',
        text2: 'Capture a photo and select a room location.',
      });
      return;
    }

    setSaving(true);
    setUploadProgress({ label: 'Saving evidence report', percent: 0 });
    setRetryAction(null);
    try {
      const payload = {
        room_location: form.room_location.trim(),
        damage_type: form.damage_type,
        severity: form.severity,
        depth_level: form.depth_level,
        width_cm: form.width_cm || '',
        height_cm: form.height_cm || '',
        urgency: form.urgency || '',
        description: form.description,
        photos: [photo],
      };

      if (aiResult) {
        payload.ai_analysis = JSON.stringify(aiResult);
      }

      const response = await propertyService.saveDamageReport(propertyId, payload, {
        onUploadProgress: (event) => {
          const total = event.total || photo.fileSize || 0;
          const percent = total ? Math.round((event.loaded / total) * 100) : 0;
          setUploadProgress({
            label: 'Saving evidence report',
            percent: Math.min(percent, 100),
          });
        },
      });

      if (response?.success) {
        Toast.show({
          type: 'success',
          text1: 'Assessment saved',
          text2: 'Property maintenance assessment saved successfully.',
        });
        onSaved?.();
        handleClose();
      } else {
        Toast.show({
          type: 'error',
          text1: 'Save failed',
          text2: response?.message || 'Could not save assessment',
        });
      }
    } catch (error) {
      setRetryAction(() => saveReport);
      Toast.show({
        type: 'error',
        text1: 'Save failed',
        text2: getErrorMessage(error, 'Could not save assessment'),
      });
    } finally {
      setSaving(false);
      setUploadProgress(null);
    }
  };

  const pickerOptions = {
    room: ROOMS.map((room) => ({ label: room, value: room })),
    damage_type: DAMAGE_TYPES,
    severity: SEVERITY_LEVELS,
    depth_level: DEPTH_LEVELS,
    urgency: URGENCY_LEVELS,
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Property Maintenance Assessment</Text>
            <TouchableOpacity accessibilityLabel="Close damage assessment" accessibilityRole="button" onPress={handleClose}>
              <Icon name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            {stage === 'workflow' ? (
              <>
                <Text style={styles.lead}>
                  Capture a clear photo of the damage. AI will suggest details you can review before saving.
                </Text>
                <Button title="Open Camera" onPress={capturePhoto} />
              </>
            ) : null}

            {stage === 'review' ? (
              <>
                {photo?.uri ? (
                  <Image source={{ uri: photo.uri }} style={styles.preview} resizeMode="cover" />
                ) : null}

                {analyzing ? (
                  <View style={styles.analyzingRow}>
                    <ActivityIndicator color="#0284c7" />
                    <Text style={styles.analyzingText}>Analyzing damage photo...</Text>
                  </View>
                ) : null}

                {uploadProgress ? (
                  <View style={styles.progressCard}>
                    <Text style={styles.progressTitle}>{uploadProgress.label}</Text>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${uploadProgress.percent}%` }]} />
                    </View>
                    <Text style={styles.progressText}>{uploadProgress.percent}% complete</Text>
                  </View>
                ) : null}

                {analysisError ? <Text style={styles.warningText}>{analysisError}</Text> : null}
                {retryAction ? (
                  <TouchableOpacity
                    accessibilityLabel="Retry last damage evidence upload step"
                    accessibilityRole="button"
                    style={styles.retryButton}
                    onPress={retryAction}
                  >
                    <Icon name="refresh-outline" size={17} color="#1d4ed8" />
                    <Text style={styles.retryText}>Retry last upload step</Text>
                  </TouchableOpacity>
                ) : null}

                <SelectField
                  label="Room Location"
                  value={form.room_location}
                  placeholder="Select room"
                  onPress={() => setPickerType('room')}
                />
                <SelectField
                  label="Damage Type"
                  value={
                    DAMAGE_TYPES.find((item) => item.value === form.damage_type)?.label ||
                    form.damage_type
                  }
                  placeholder="Select damage type"
                  onPress={() => setPickerType('damage_type')}
                />
                <SelectField
                  label="Severity"
                  value={
                    SEVERITY_LEVELS.find((item) => item.value === form.severity)?.label ||
                    form.severity
                  }
                  placeholder="Select severity"
                  onPress={() => setPickerType('severity')}
                />
                <SelectField
                  label="Depth"
                  value={
                    DEPTH_LEVELS.find((item) => item.value === form.depth_level)?.label ||
                    form.depth_level
                  }
                  placeholder="Select depth"
                  onPress={() => setPickerType('depth_level')}
                />
                <SelectField
                  label="Urgency"
                  value={
                    URGENCY_LEVELS.find((item) => item.value === form.urgency)?.label ||
                    form.urgency
                  }
                  placeholder="Select urgency"
                  onPress={() => setPickerType('urgency')}
                />
                <Input
                  label="Width (cm)"
                  value={form.width_cm}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, width_cm: value }))}
                  keyboardType="decimal-pad"
                />
                <Input
                  label="Height (cm)"
                  value={form.height_cm}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, height_cm: value }))}
                  keyboardType="decimal-pad"
                />
                <Input
                  label="Description"
                  value={form.description}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, description: value }))}
                  multiline
                  numberOfLines={4}
                />

                <Button title="Retake Photo" variant="secondary" onPress={capturePhoto} />
                <Button title="Save Assessment" onPress={saveReport} loading={saving} />
              </>
            ) : null}
          </ScrollView>
        </View>
      </View>

      <OptionPickerModal
        visible={Boolean(pickerType)}
        title="Select option"
        options={pickerOptions[pickerType] || []}
        onSelect={(option) => {
          if (pickerType === 'room') {
            setForm((prev) => ({ ...prev, room_location: option.value }));
          } else {
            setForm((prev) => ({ ...prev, [pickerType]: option.value }));
          }
          setPickerType(null);
        }}
        onClose={() => setPickerType(null)}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '92%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: { fontSize: 17, fontWeight: '800', color: '#0f172a', flex: 1, paddingRight: 8 },
  body: { padding: 16, paddingBottom: 28, gap: 12 },
  lead: { color: '#475569', lineHeight: 20 },
  preview: { width: '100%', height: 220, borderRadius: 12, backgroundColor: '#e2e8f0' },
  analyzingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  analyzingText: { color: '#0284c7', fontWeight: '600' },
  warningText: { color: '#b45309', fontSize: 13 },
  progressCard: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  progressTitle: { color: '#1e3a8a', fontSize: 13, fontWeight: '800' },
  progressTrack: { backgroundColor: '#dbeafe', borderRadius: 999, height: 8, marginTop: 9, overflow: 'hidden' },
  progressFill: { backgroundColor: '#0284c7', height: '100%' },
  progressText: { color: '#1d4ed8', fontSize: 12, marginTop: 6 },
  retryButton: {
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    paddingVertical: 10,
  },
  retryText: { color: '#1d4ed8', fontSize: 13, fontWeight: '800' },
});

export default DamageReportCapture;
