import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import Toast from 'react-native-toast-message';
import FilePreviewCard from '../../components/common/FilePreviewCard';
import recruitmentService from '../../services/recruitmentService';
import { getErrorMessage } from '../../utils/http';
import { savePendingPayment } from '../../services/paymentRecoveryService';

const DOCUMENT_FIELDS = [
  { key: 'cv', label: 'CV / Resume' },
  { key: 'cover_letter', label: 'Cover Letter' },
  { key: 'guarantor_letter', label: "Guarantor's Letter" },
  { key: 'government_id', label: 'Government ID' },
  { key: 'proof_of_address', label: 'Proof of Address' },
  { key: 'certificates', label: 'Certificates' },
];

const RecruitmentApplicationScreen = ({ route, navigation }) => {
  const initialApplication = route?.params?.application || null;
  const [application, setApplication] = useState(initialApplication);
  const [loading, setLoading] = useState(!initialApplication);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [accessLoading, setAccessLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [accessCodeInput, setAccessCodeInput] = useState('');
  const [paymentReferenceInput, setPaymentReferenceInput] = useState('');
  const [selectedFiles, setSelectedFiles] = useState({});
  const [error, setError] = useState('');

  const applicationId = application?.id || route?.params?.applicationId;

  const loadApplication = async () => {
    if (!applicationId) {
      setError('No application was provided.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await recruitmentService.getMyApplication({
        email: initialApplication?.email_address || route?.params?.email,
        referenceNumber: initialApplication?.reference_number || route?.params?.referenceNumber,
      });
      const app = response?.data?.data || null;
      setApplication(app || initialApplication);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not refresh your application'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (applicationId) {
      loadApplication();
    }
  }, [applicationId]);

  const canUpload = useMemo(() => {
    return application?.payment_status === 'paid' && application?.access_code_used;
  }, [application]);

  const openPayment = async () => {
    if (!applicationId) return;

    try {
      setPaymentLoading(true);
      setError('');
      const response = await recruitmentService.initiatePayment({
        application_id: Number(applicationId),
        applicant_email: application?.email_address || route?.params?.email || '',
        reference_number: application?.reference_number || route?.params?.referenceNumber || '',
      });
      const paymentData = response?.data?.data || response?.data || {};
      const authorizationUrl = paymentData.authorization_url;
      const reference = paymentData.reference;
      if (reference) {
        await savePendingPayment({
          flow: 'recruitment',
          reference,
          applicationId,
          email: application?.email_address || route?.params?.email || '',
          referenceNumber: application?.reference_number || route?.params?.referenceNumber || '',
        });
      }
      if (authorizationUrl) {
        await Linking.openURL(authorizationUrl);
        Toast.show({
          type: 'info',
          text1: 'Paystack opened',
          text2: 'Complete payment securely, then return to RentalHub.',
        });
      } else {
        Toast.show({ type: 'error', text1: 'Payment unavailable', text2: 'No payment link was returned.' });
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Could not start payment'));
    } finally {
      setPaymentLoading(false);
    }
  };

  const verifyPayment = async () => {
    const reference = paymentReferenceInput.trim();
    if (!reference) {
      Alert.alert('Reference needed', 'Enter the payment reference to verify your payment.');
      return;
    }

    try {
      setPaymentLoading(true);
      const response = await recruitmentService.verifyPayment(reference);
      const updatedApp = response?.data?.application || null;
      if (updatedApp) {
        setApplication((prev) => ({ ...(prev || {}), ...updatedApp }));
      }
      Toast.show({ type: 'success', text1: 'Payment verified', text2: 'Your access code is ready.' });
    } catch (err) {
      setError(getErrorMessage(err, 'Payment verification failed'));
    } finally {
      setPaymentLoading(false);
    }
  };

  const verifyAccessCode = async () => {
    if (!accessCodeInput.trim()) {
      Alert.alert('Access code needed', 'Enter the access code you received after payment.');
      return;
    }

    try {
      setAccessLoading(true);
      setError('');
      const response = await recruitmentService.verifyAccessCode({
        application_id: Number(applicationId),
        access_code: accessCodeInput.trim(),
        applicant_email: application?.email_address || route?.params?.email || '',
        reference_number: application?.reference_number || route?.params?.referenceNumber || '',
      });
      setApplication((prev) => ({ ...(prev || {}), access_code_used: true }));
      Toast.show({ type: 'success', text1: 'Access code verified', text2: response?.message || 'You can now upload documents.' });
    } catch (err) {
      setError(getErrorMessage(err, 'Could not verify access code'));
    } finally {
      setAccessLoading(false);
    }
  };

  const pickFile = async (docKey) => {
    try {
      const result = await launchImageLibrary({ mediaType: 'mixed', selectionLimit: 1 });
      const asset = result?.assets?.[0];
      if (!asset) return;
      setSelectedFiles((prev) => ({ ...prev, [docKey]: asset }));
      Toast.show({ type: 'info', text1: 'File selected', text2: asset.fileName || 'Your document is ready to upload.' });
    } catch (err) {
      setError(getErrorMessage(err, 'Could not select a file'));
    }
  };

  const uploadDocuments = async () => {
    if (!applicationId) return;

    const pendingFiles = Object.entries(selectedFiles).filter(([, asset]) => !!asset);
    if (!pendingFiles.length) {
      Alert.alert('No files selected', 'Choose at least one file to upload.');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress({ current: 0, total: pendingFiles.length, label: 'Preparing upload', percent: 0 });
      setError('');
      for (const [index, [docKey, asset]] of pendingFiles.entries()) {
        const field = DOCUMENT_FIELDS.find((item) => item.key === docKey);
        const label = field?.label || docKey;
        const formData = new FormData();
        const filePayload = asset.file
          ? asset.file
          : {
              uri: asset.uri,
              type: asset.type || 'application/octet-stream',
              name: asset.fileName || `${docKey}.bin`,
            };
        formData.append(docKey, filePayload);
        formData.append('applicant_email', application?.email_address || route?.params?.email || '');
        formData.append('reference_number', application?.reference_number || route?.params?.referenceNumber || '');
        setUploadProgress({
          current: index + 1,
          total: pendingFiles.length,
          label,
          percent: 0,
        });
        await recruitmentService.uploadDocuments(Number(applicationId), formData, {
          onUploadProgress: (event) => {
            const total = event.total || asset.fileSize || 0;
            const percent = total ? Math.min(100, Math.round((event.loaded / total) * 100)) : 0;
            setUploadProgress({
              current: index + 1,
              total: pendingFiles.length,
              label,
              percent,
            });
          },
        });
      }
      Toast.show({ type: 'success', text1: 'Documents uploaded', text2: 'Your supporting files were submitted.' });
      setSelectedFiles({});
      await loadApplication();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not upload documents'));
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0284c7" />
        <Text style={styles.centerText}>Loading your application...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Application progress</Text>
      <Text style={styles.subtitle}>Complete payment, unlock your application, and upload your documents.</Text>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Application status</Text>
        <Text style={styles.cardText}>Reference: {application?.reference_number || '—'}</Text>
        <Text style={styles.cardText}>Status: {application?.status || 'draft'}</Text>
        <Text style={styles.cardText}>Payment: {application?.payment_status || 'pending'}</Text>
        <Text style={styles.cardText}>Access code: {application?.access_code_used ? 'Verified' : 'Pending'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>1. Pay application fee</Text>
        <Text style={styles.cardText}>Start the payment flow to receive your access code.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={openPayment} disabled={paymentLoading}>
          {paymentLoading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.primaryButtonText}>Start payment</Text>}
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="Payment reference"
          value={paymentReferenceInput}
          onChangeText={setPaymentReferenceInput}
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.secondaryButton} onPress={verifyPayment} disabled={paymentLoading}>
          {paymentLoading ? <ActivityIndicator color="#0284c7" /> : <Text style={styles.secondaryButtonText}>Verify payment</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>2. Unlock your application</Text>
        <Text style={styles.cardText}>Enter the access code sent after successful payment.</Text>
        <TextInput
          style={styles.input}
          placeholder="Access code"
          value={accessCodeInput}
          onChangeText={setAccessCodeInput}
          autoCapitalize="characters"
        />
        <TouchableOpacity style={styles.primaryButton} onPress={verifyAccessCode} disabled={accessLoading}>
          {accessLoading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.primaryButtonText}>Verify access code</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>3. Upload documents</Text>
        <Text style={styles.cardText}>Only available after your payment and access code are verified.</Text>
        {DOCUMENT_FIELDS.map((field) => (
          <View key={field.key} style={styles.docRow}>
            <View style={styles.docCopy}>
              <Text style={styles.docLabel}>{field.label}</Text>
              {selectedFiles[field.key] ? (
                <FilePreviewCard
                  title={selectedFiles[field.key].fileName || field.label}
                  subtitle="Ready to upload"
                  uri={selectedFiles[field.key].uri}
                  fileName={selectedFiles[field.key].fileName}
                  fileSize={selectedFiles[field.key].fileSize}
                  mimeType={selectedFiles[field.key].type}
                  actionLabel="Preview"
                />
              ) : null}
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`${selectedFiles[field.key] ? 'Change' : 'Select'} ${field.label}`}
              style={styles.docButton}
              onPress={() => pickFile(field.key)}
              disabled={uploading}
            >
              <Text style={styles.docButtonText}>{selectedFiles[field.key] ? 'Change file' : 'Select file'}</Text>
            </TouchableOpacity>
          </View>
        ))}
        {uploadProgress ? (
          <View style={styles.uploadProgressCard}>
            <Text style={styles.uploadProgressTitle}>
              Uploading {uploadProgress.label} ({uploadProgress.current}/{uploadProgress.total})
            </Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${uploadProgress.percent}%` }]} />
            </View>
            <Text style={styles.uploadProgressText}>{uploadProgress.percent}% complete</Text>
          </View>
        ) : null}
        <TouchableOpacity style={styles.primaryButton} onPress={uploadDocuments} disabled={uploading || !canUpload}>
          {uploading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.primaryButtonText}>Upload documents</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  centerText: { marginTop: 8, color: '#64748b' },
  title: { fontSize: 28, fontWeight: '800', color: '#0f172a' },
  subtitle: { color: '#64748b', marginTop: 6, marginBottom: 12 },
  card: { backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 12 },
  cardTitle: { color: '#0f172a', fontSize: 16, fontWeight: '700' },
  cardText: { color: '#64748b', marginTop: 4 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginTop: 10, color: '#0f172a' },
  primaryButton: { marginTop: 10, backgroundColor: '#0284c7', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  primaryButtonText: { color: '#ffffff', fontWeight: '700' },
  secondaryButton: { marginTop: 8, borderWidth: 1, borderColor: '#0284c7', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  secondaryButtonText: { color: '#0284c7', fontWeight: '700' },
  docRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 8 },
  docCopy: { flex: 1 },
  docLabel: { color: '#0f172a', fontWeight: '600' },
  docButton: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  docButtonText: { color: '#475569' },
  uploadProgressCard: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe', borderWidth: 1, borderRadius: 10, marginTop: 12, padding: 12 },
  uploadProgressTitle: { color: '#1e3a8a', fontWeight: '700' },
  progressTrack: { backgroundColor: '#dbeafe', borderRadius: 999, height: 8, marginTop: 9, overflow: 'hidden' },
  progressFill: { backgroundColor: '#0284c7', height: '100%' },
  uploadProgressText: { color: '#1d4ed8', fontSize: 12, marginTop: 6 },
  errorText: { color: '#dc2626', marginBottom: 10, fontWeight: '600' },
});

export default RecruitmentApplicationScreen;
