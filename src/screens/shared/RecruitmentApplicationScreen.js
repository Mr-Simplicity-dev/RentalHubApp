import React, { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import Toast from 'react-native-toast-message';
import FilePreviewCard from '../../components/common/FilePreviewCard';
import Input from '../../components/common/Input';
import {
  InfoRow,
  PremiumButton,
  PremiumCard,
  PremiumCenter,
  PremiumHero,
  PremiumScreen,
  PremiumSectionTitle,
  StatusPill,
  formatNaira,
} from '../../components/common/PremiumLayout';
import useNativePaystackCheckout from '../../hooks/useNativePaystackCheckout';
import { hasPaystackCheckout } from '../../services/nativePaymentService';
import { savePendingPayment } from '../../services/paymentRecoveryService';
import recruitmentService from '../../services/recruitmentService';
import { getErrorMessage } from '../../utils/http';
import { colors, radius, typography } from '../../theme';

const DOCUMENT_FIELDS = [
  { key: 'cv', label: 'CV / Resume' },
  { key: 'cover_letter', label: 'Cover Letter' },
  { key: 'guarantor_letter', label: "Guarantor's Letter" },
  { key: 'government_id', label: 'Government ID' },
  { key: 'proof_of_address', label: 'Proof of Address' },
  { key: 'certificates', label: 'Certificates' },
];

const ProgressBar = ({ value }) => (
  <View style={styles.progressTrack}>
    <View style={[styles.progressFill, { width: `${value}%` }]} />
  </View>
);

const RecruitmentApplicationScreen = ({ route }) => {
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
  const { openNativeCheckout, NativePaystackCheckoutModal } = useNativePaystackCheckout();

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
      if (hasPaystackCheckout(paymentData)) {
        openNativeCheckout({
          transaction: paymentData,
          title: 'Pay application fee',
          subtitle: 'Complete your recruitment application payment securely in the app.',
          amountLabel: paymentData.amount ? formatNaira(paymentData.amount) : '',
          onSuccess: (paymentResponse) =>
            completeRecruitmentPayment(paymentResponse?.reference || reference),
          onBrowserFallback: () => {
            Toast.show({
              type: 'info',
              text1: 'Paystack checkout opened',
              text2: 'Complete payment securely, then return to RentalHub.',
            });
          },
        });
      } else if (reference) {
        await completeRecruitmentPayment(reference);
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
      Toast.show({
        type: 'success',
        text1: 'Access code verified',
        text2: response?.message || 'You can now upload documents.',
      });
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
      Toast.show({
        type: 'info',
        text1: 'File selected',
        text2: asset.fileName || 'Your document is ready to upload.',
      });
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
      Toast.show({
        type: 'success',
        text1: 'Documents uploaded',
        text2: 'Your supporting files were submitted.',
      });
      setSelectedFiles({});
      await loadApplication();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not upload documents'));
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const completeRecruitmentPayment = async (reference) => {
    if (!reference) return;

    try {
      setPaymentLoading(true);
      const response = await recruitmentService.verifyPayment(reference);
      const updatedApp = response?.data?.application || response?.data?.data?.application || null;
      if (updatedApp) {
        setApplication((prev) => ({ ...(prev || {}), ...updatedApp }));
      }
      setPaymentReferenceInput(reference);
      Toast.show({ type: 'success', text1: 'Payment verified', text2: 'Your access code is ready.' });
    } catch (err) {
      setError(getErrorMessage(err, 'Payment verification failed'));
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return <PremiumCenter loading title="Loading your application" message="Preparing your recruitment progress..." />;
  }

  const paymentStatus = application?.payment_status || 'pending';
  const appStatus = application?.status || 'draft';
  const uploadPercent = uploadProgress?.percent || 0;

  return (
    <>
      <PremiumScreen>
        <PremiumHero
          eyebrow="Recruitment"
          title="Application progress"
          subtitle="Complete payment, verify your access code, then upload the documents needed for review."
          icon="briefcase-outline"
          right={<StatusPill label={appStatus} color={appStatus === 'approved' ? colors.success : colors.gold} />}
        />

        {error ? (
          <PremiumCard style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </PremiumCard>
        ) : null}

        <PremiumCard>
          <Text style={styles.cardTitle}>Application status</Text>
          <InfoRow icon="pricetag-outline" label="Reference" value={application?.reference_number || '-'} />
          <InfoRow icon="briefcase-outline" label="Status" value={appStatus} />
          <InfoRow icon="card-outline" label="Payment" value={paymentStatus} />
          <InfoRow
            icon="key-outline"
            label="Access code"
            value={application?.access_code_used ? 'Verified' : 'Pending'}
            valueStyle={{ color: application?.access_code_used ? colors.success : colors.warning }}
          />
        </PremiumCard>

        <PremiumSectionTitle title="1. Pay application fee" />
        <PremiumCard>
          <Text style={styles.cardText}>Start the payment flow to receive your access code.</Text>
          <PremiumButton
            title="Start payment"
            onPress={openPayment}
            loading={paymentLoading}
            icon="card-outline"
            style={styles.blockGap}
          />
          <Input
            label="Payment reference"
            placeholder="Paste payment reference"
            value={paymentReferenceInput}
            onChangeText={setPaymentReferenceInput}
            autoCapitalize="none"
            icon="receipt-outline"
            containerStyle={styles.inputGap}
          />
          <PremiumButton
            title="Verify payment"
            variant="secondary"
            onPress={verifyPayment}
            loading={paymentLoading}
            icon="shield-checkmark-outline"
          />
        </PremiumCard>

        <PremiumSectionTitle title="2. Unlock your application" />
        <PremiumCard>
          <Text style={styles.cardText}>Enter the access code sent after successful payment.</Text>
          <Input
            label="Access code"
            placeholder="Access code"
            value={accessCodeInput}
            onChangeText={setAccessCodeInput}
            autoCapitalize="characters"
            icon="keypad-outline"
            containerStyle={styles.inputGap}
          />
          <PremiumButton
            title="Verify access code"
            onPress={verifyAccessCode}
            loading={accessLoading}
            icon="lock-open-outline"
          />
        </PremiumCard>

        <PremiumSectionTitle
          title="3. Upload documents"
          subtitle="Available after your payment and access code are verified."
        />
        <PremiumCard>
          {DOCUMENT_FIELDS.map((field) => {
            const asset = selectedFiles[field.key];
            return (
              <View key={field.key} style={styles.docRow}>
                <View style={styles.docCopy}>
                  <Text style={styles.docLabel}>{field.label}</Text>
                  {asset ? (
                    <FilePreviewCard
                      title={asset.fileName || field.label}
                      subtitle="Ready to upload"
                      uri={asset.uri}
                      fileName={asset.fileName}
                      fileSize={asset.fileSize}
                      mimeType={asset.type}
                      actionLabel="Preview"
                    />
                  ) : (
                    <Text style={styles.docHint}>No file selected</Text>
                  )}
                </View>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={`${asset ? 'Change' : 'Select'} ${field.label}`}
                  activeOpacity={0.84}
                  style={[styles.docButton, uploading && styles.disabledButton]}
                  onPress={() => pickFile(field.key)}
                  disabled={uploading}
                >
                  <Text style={styles.docButtonText}>{asset ? 'Change' : 'Select'}</Text>
                </TouchableOpacity>
              </View>
            );
          })}

          {uploadProgress ? (
            <View style={styles.uploadProgressCard}>
              <Text style={styles.uploadProgressTitle}>
                Uploading {uploadProgress.label} ({uploadProgress.current}/{uploadProgress.total})
              </Text>
              <ProgressBar value={uploadPercent} />
              <Text style={styles.uploadProgressText}>{uploadPercent}% complete</Text>
            </View>
          ) : null}

          <PremiumButton
            title="Upload documents"
            onPress={uploadDocuments}
            loading={uploading}
            disabled={uploading || !canUpload}
            icon="cloud-upload-outline"
            style={styles.blockGap}
          />
          {!canUpload ? (
            <Text style={styles.lockedCopy}>
              Payment and access-code verification are required before uploads unlock.
            </Text>
          ) : null}
        </PremiumCard>
      </PremiumScreen>
      {NativePaystackCheckoutModal}
    </>
  );
};

const styles = StyleSheet.create({
  cardTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 17,
    marginBottom: 8,
  },
  cardText: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 19,
  },
  blockGap: {
    marginTop: 12,
  },
  inputGap: {
    marginTop: 14,
  },
  docRow: {
    alignItems: 'flex-start',
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  docCopy: {
    flex: 1,
  },
  docLabel: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 14,
  },
  docHint: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 12,
    marginTop: 3,
  },
  docButton: {
    backgroundColor: colors.surfaceBlue,
    borderColor: `${colors.blue}35`,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  disabledButton: {
    opacity: 0.5,
  },
  docButtonText: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: 12,
  },
  progressTrack: {
    backgroundColor: colors.border,
    borderRadius: radius.pill,
    height: 9,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: colors.blue,
    borderRadius: radius.pill,
    height: '100%',
  },
  uploadProgressCard: {
    backgroundColor: colors.surfaceBlue,
    borderColor: `${colors.blue}33`,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: 14,
    padding: 12,
  },
  uploadProgressTitle: {
    color: colors.navy,
    fontFamily: typography.bold,
    fontSize: 13,
  },
  uploadProgressText: {
    color: colors.blue,
    fontFamily: typography.medium,
    fontSize: 12,
    marginTop: 6,
  },
  lockedCopy: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
    textAlign: 'center',
  },
  errorCard: {
    backgroundColor: '#FFF7F7',
    borderColor: '#FECACA',
  },
  errorText: {
    color: colors.danger,
    fontFamily: typography.semibold,
    fontSize: 13,
    lineHeight: 19,
  },
});

export default RecruitmentApplicationScreen;
