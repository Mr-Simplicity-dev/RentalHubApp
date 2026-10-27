import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import React, { useState } from 'react';
import {Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,} from 'react-native';
import { launchCamera } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import Input from '../common/Input';
import Button from '../common/Button';
import SelectField from '../common/SelectField';
import OptionPickerModal from '../common/OptionPickerModal';
import { propertyService } from '../../services/propertyService';
import { getErrorMessage } from '../../utils/http';
import { typography, typeScale } from '../../theme';

import AppText from '../../components/common/AppText';
const DAMAGE_TYPES = [
  { value: 'scratch', get "label"() { return ui("Scratch"); } },
  { value: 'crack', get "label"() { return ui("Crack"); } },
  { value: 'hole', get "label"() { return ui("Hole"); } },
  { value: 'dent', get "label"() { return ui("Dent"); } },
  { value: 'stain', get "label"() { return ui("Stain"); } },
  { value: 'water_damage', get "label"() { return ui("Water"); } },
  { value: 'mold', get "label"() { return ui("Mold"); } },
  { value: 'other', get "label"() { return ui("Other"); } },
];

const SEVERITY_LEVELS = [
  { value: 'minor', get "label"() { return ui("Minor"); } },
  { value: 'moderate', get "label"() { return ui("Moderate"); } },
  { value: 'severe', get "label"() { return ui("Severe"); } },
];

const DEPTH_LEVELS = [
  { value: 'surface', get "label"() { return ui("Surface"); } },
  { value: 'shallow', get "label"() { return ui("Shallow"); } },
  { value: 'deep', get "label"() { return ui("Deep"); } },
];

const URGENCY_LEVELS = [
  { value: 'low', get "label"() { return ui("Low"); } },
  { value: 'medium', get "label"() { return ui("Medium"); } },
  { value: 'high', get "label"() { return ui("High"); } },
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
  useInterfaceLanguage();
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
      setUploadProgress({ label: ui("Uploading photo for AI analysis"), percent: 0 });

      try {
        const response = await propertyService.analyzeDamagePhoto(captured, {
          onUploadProgress: (event) => {
            const total = event.total || asset.fileSize || 0;
            const percent = total ? Math.round((event.loaded / total) * 100) : 0;
            setUploadProgress({
              label: ui("Uploading photo for AI analysis"),
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
        text1: ui("Camera error"),
        text2: getErrorMessage(error, 'Could not open camera'),
      });
    }
  };

  const analyzeExistingPhoto = async (targetPhoto = photo) => {
    if (!targetPhoto) return;
    setAnalyzing(true);
    setAnalysisError('');
    setRetryAction(null);
    setUploadProgress({ label: ui("Retrying AI analysis"), percent: 0 });
    try {
      const response = await propertyService.analyzeDamagePhoto(targetPhoto, {
        onUploadProgress: (event) => {
          const total = event.total || 0;
          const percent = total ? Math.round((event.loaded / total) * 100) : 0;
          setUploadProgress({
            label: ui("Retrying AI analysis"),
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
        text1: ui("Missing information"),
        text2: ui("Capture a photo and select a room location."),
      });
      return;
    }

    setSaving(true);
    setUploadProgress({ label: ui("Saving evidence report"), percent: 0 });
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
            label: ui("Saving evidence report"),
            percent: Math.min(percent, 100),
          });
        },
      });

      if (response?.success) {
        Toast.show({
          type: 'success',
          text1: ui("Assessment saved"),
          text2: ui("Property maintenance assessment saved successfully."),
        });
        onSaved?.();
        handleClose();
      } else {
        Toast.show({
          type: 'error',
          text1: ui("Save failed"),
          text2: response?.message || ui("Could not save assessment"),
        });
      }
    } catch (error) {
      setRetryAction(() => saveReport);
      Toast.show({
        type: 'error',
        text1: ui("Save failed"),
        text2: getErrorMessage(error, ui("Could not save assessment")),
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
            <AppText style={styles.title}>{ui("Property Maintenance Assessment")}</AppText>
            <TouchableOpacity accessibilityLabel={ui("Close condition assessment")} accessibilityRole="button" onPress={handleClose}>
              <Icon name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            {stage === 'workflow' ? (
              <>
                <AppText style={styles.lead}>{ui("Capture a clear photo of the issue. AI will suggest details you can review before saving.")}</AppText>
                <Button title={ui("Open Camera")} onPress={capturePhoto} />
              </>
            ) : null}

            {stage === "review" ? (
              <>
                {photo?.uri ? (
                  <Image source={{ uri: photo.uri }} style={styles.preview} resizeMode="cover" />
                ) : null}

                {analyzing ? (
                  <View style={styles.analyzingRow}>
                    <ActivityIndicator color="#0284c7" />
                    <AppText style={styles.analyzingText}>{ui("Analyzing photo...")}</AppText>
                  </View>
                ) : null}

                {uploadProgress ? (
                  <View style={styles.progressCard}>
                    <AppText style={styles.progressTitle}>{uploadProgress.label}</AppText>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${uploadProgress.percent}%` }]} />
                    </View>
                    <AppText style={styles.progressText}>{uploadProgress.percent}{ui("% complete")}</AppText>
                  </View>
                ) : null}

                {analysisError ? <AppText style={styles.warningText}>{analysisError}</AppText> : null}
                {retryAction ? (
                  <TouchableOpacity
                    accessibilityLabel={ui("Retry last report evidence upload step")}
                    accessibilityRole="button"
                    style={styles.retryButton}
                    onPress={retryAction}
                  >
                    <Icon name="refresh-outline" size={17} color="#1d4ed8" />
                    <AppText style={styles.retryText}>{ui("Retry last upload step")}</AppText>
                  </TouchableOpacity>
                ) : null}

                <SelectField
                  label={ui("Room Location")}
                  value={form.room_location}
                  placeholder={ui("Select room")}
                  onPress={() => setPickerType('room')}
                />
                <SelectField
                  label={ui("Condition Type")}
                  value={
                    DAMAGE_TYPES.find((item) => item.value === form.damage_type)?.label ||
                    form.damage_type
                  }
                  placeholder={ui("Select condition type")}
                  onPress={() => setPickerType('damage_type')}
                />
                <SelectField
                  label={ui("Severity")}
                  value={
                    SEVERITY_LEVELS.find((item) => item.value === form.severity)?.label ||
                    form.severity
                  }
                  placeholder={ui("Select severity")}
                  onPress={() => setPickerType('severity')}
                />
                <SelectField
                  label={ui("Depth")}
                  value={
                    DEPTH_LEVELS.find((item) => item.value === form.depth_level)?.label ||
                    form.depth_level
                  }
                  placeholder={ui("Select depth")}
                  onPress={() => setPickerType('depth_level')}
                />
                <SelectField
                  label={ui("Urgency")}
                  value={
                    URGENCY_LEVELS.find((item) => item.value === form.urgency)?.label ||
                    form.urgency
                  }
                  placeholder={ui("Select urgency")}
                  onPress={() => setPickerType('urgency')}
                />
                <Input
                  label={ui("Width (cm)")}
                  value={form.width_cm}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, width_cm: value }))}
                  keyboardType="decimal-pad"
                />
                <Input
                  label={ui("Height (cm)")}
                  value={form.height_cm}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, height_cm: value }))}
                  keyboardType="decimal-pad"
                />
                <Input
                  label={ui("Description")}
                  value={form.description}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, description: value }))}
                  multiline
                  numberOfLines={4}
                />

                <Button title={ui("Retake Photo")} variant="secondary" onPress={capturePhoto} />
                <Button title={ui("Save Assessment")} onPress={saveReport} loading={saving} />
              </>
            ) : null}
          </ScrollView>
        </View>
      </View>

      <OptionPickerModal
        visible={Boolean(pickerType)}
        title={ui("Select option")}
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
  title: { fontSize: typeScale.md, lineHeight: 26, fontFamily: typography.semibold, color: '#0f172a', flex: 1, paddingRight: 8 },
  body: { padding: 16, paddingBottom: 28, gap: 12 },
  lead: { color: '#475569', lineHeight: 20 },
  preview: { width: '100%', height: 220, borderRadius: 12, backgroundColor: '#e2e8f0' },
  analyzingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  analyzingText: { color: '#0284c7', fontWeight: '600' },
  warningText: { color: '#b45309', fontSize: typeScale.xs, lineHeight: 18 },
  progressCard: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  progressTitle: { color: '#1e3a8a', fontSize: typeScale.xs, lineHeight: 18, fontFamily: typography.bold },
  progressTrack: { backgroundColor: '#dbeafe', borderRadius: 999, height: 8, marginTop: 9, overflow: 'hidden' },
  progressFill: { backgroundColor: '#0284c7', height: '100%' },
  progressText: { color: '#1d4ed8', fontSize: typeScale.xs, lineHeight: 18, marginTop: 6 },
  retryButton: {
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    paddingVertical: 10,
  },
  retryText: { color: '#1d4ed8', fontSize: typeScale.xs, lineHeight: 18, fontFamily: typography.bold },
});

export default DamageReportCapture;
