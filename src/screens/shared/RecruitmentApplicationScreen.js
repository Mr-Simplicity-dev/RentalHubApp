import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import {useLanguage} from '../../context/LanguageContext';
const recruitmentCopy = require('../../i18n/recruitmentCopy.cjs');
import React, { useEffect, useMemo, useState } from 'react';
import {Alert, StyleSheet, TouchableOpacity, View} from 'react-native';
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
import { colors, radius, typography, typeScale } from '../../theme';

import AppText from '../../components/common/AppText';
const DOCUMENT_FIELDS = [
  { key: 'cv', get "label"() { return ui("CV / Resume"); } },
  { key: 'cover_letter', get "label"() { return ui("Cover Letter"); } },
  { key: 'guarantor_letter', get "label"() { return ui("Guarantor's Letter"); } },
  { key: 'government_id', get "label"() { return ui("Government ID"); } },
  { key: 'proof_of_address', get "label"() { return ui("Proof of Address"); } },
  { key: 'certificates', get "label"() { return ui("Certificates"); } },
];

const ProgressBar = ({ value }) => { useInterfaceLanguage(); return (<View style={styles.progressTrack}>
    <View style={[styles.progressFill, { width: `${value}%` }]} />
  </View>); };

const RecruitmentApplicationScreen = ({ route }) => {
  const interfaceLanguage = useInterfaceLanguage();
  const {language}=useLanguage();
  const copy=recruitmentCopy[language]||recruitmentCopy.en;
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
  const applicantAccess = {
    applicant_email: application?.email_address || route?.params?.email || '',
    reference_number: application?.reference_number || route?.params?.referenceNumber || '',
  };

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
    return application?.opportunity_type==='volunteer'||(application?.payment_status === 'paid' && application?.access_code_used);
  }, [application, interfaceLanguage]);

  const openPayment = async () => {
    if(application?.opportunity_type==='volunteer')return;
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
          title: ui("Pay application fee"),
          subtitle: ui("Complete your recruitment application payment securely in the app."),
          amountLabel: paymentData.amount ? formatNaira(paymentData.amount) : '',
          onSuccess: (paymentResponse) =>
            completeRecruitmentPayment(paymentResponse?.reference || reference),
          onBrowserFallback: () => {
            Toast.show({
              type: 'info',
              text1: ui("Paystack checkout opened"),
              text2: ui("Complete payment securely, then return to RentalHub."),
            });
          },
        });
      } else if (reference) {
        await completeRecruitmentPayment(reference);
      } else {
        Toast.show({ type: 'error', text1: ui("Payment unavailable"), text2: ui("No payment link was returned.") });
      }
    } catch (err) {
      setError(getErrorMessage(err, ui("Could not start payment")));
    } finally {
      setPaymentLoading(false);
    }
  };

  const verifyPayment = async () => {
    const reference = paymentReferenceInput.trim();
    if (!reference) {
      Alert.alert(ui("Reference needed"), ui("Enter the payment reference to verify your payment."));
      return;
    }

    try {
      setPaymentLoading(true);
      const response = await recruitmentService.verifyPayment(reference, applicantAccess);
      const updatedApp = response?.data?.data?.application || response?.data?.application || null;
      if (updatedApp) {
        setApplication((prev) => ({ ...(prev || {}), ...updatedApp }));
      }
      Toast.show({ type: 'success', text1: ui("Payment verified"), text2: ui("Your access code is ready.") });
    } catch (err) {
      setError(getErrorMessage(err, ui("Payment verification failed")));
    } finally {
      setPaymentLoading(false);
    }
  };

  const verifyAccessCode = async () => {
    if (!accessCodeInput.trim()) {
      Alert.alert(ui("Access code needed"), ui("Enter the access code you received after payment."));
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
        text1: ui("Access code verified"),
        text2: response?.message || ui("You can now upload documents."),
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
        text1: ui("File selected"),
        text2: asset.fileName || ui("Your document is ready to upload."),
      });
    } catch (err) {
      setError(getErrorMessage(err, 'Could not select a file'));
    }
  };

  const uploadDocuments = async () => {
    if (!applicationId) return;

    const pendingFiles = Object.entries(selectedFiles).filter(([, asset]) => !!asset);
    if (!pendingFiles.length) {
      Alert.alert(ui("No files selected"), ui("Choose at least one file to upload."));
      return;
    }

    try {
      setUploading(true);
      setUploadProgress({ current: 0, total: pendingFiles.length, label: ui("Preparing upload"), percent: 0 });
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
          params: {
            email: applicantAccess.applicant_email,
            reference_number: applicantAccess.reference_number,
          },
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
        text1: ui("Documents uploaded"),
        text2: ui("Your supporting files were submitted."),
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
      const response = await recruitmentService.verifyPayment(reference, applicantAccess);
      const updatedApp = response?.data?.application || response?.data?.data?.application || null;
      if (updatedApp) {
        setApplication((prev) => ({ ...(prev || {}), ...updatedApp }));
      }
      setPaymentReferenceInput(reference);
      Toast.show({ type: 'success', text1: ui("Payment verified"), text2: ui("Your access code is ready.") });
    } catch (err) {
      setError(getErrorMessage(err, ui("Payment verification failed")));
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return <PremiumCenter loading title={ui("Loading your application")} message={ui("Preparing your recruitment progress...")} />;
  }

  if(application?.opportunity_type==='volunteer') return <PremiumScreen>
    <PremiumHero eyebrow={copy.opportunity_volunteer} title={copy.volunteer_received} subtitle={copy.volunteer_confirmation} icon="heart-outline" />
    <PremiumCard><InfoRow label={ui("Reference")} value={application.reference_number}/><InfoRow label={ui("Opportunity")} value={application.role_title}/><InfoRow label={ui("Status")} value={application.status}/><AppText variant="bodySm">{copy.volunteer_free}</AppText></PremiumCard>
    {error?<AppText color={colors.danger}>{error}</AppText>:null}
    {['submitted','under_review'].includes(application.status)&&<PremiumCard><AppText variant="h4">{copy.optional_cv}</AppText><PremiumButton title={copy.optional_cv} variant="secondary" onPress={()=>pickFile('cv')}/>{selectedFiles.cv?<><AppText variant="bodySm">{selectedFiles.cv.fileName}</AppText><PremiumButton title={copy.upload_documents} onPress={uploadDocuments} loading={uploading}/></>:null}</PremiumCard>}
  </PremiumScreen>;

  const paymentStatus = application?.payment_status || 'pending';
  const appStatus = application?.status || 'draft';
  const uploadPercent = uploadProgress?.percent || 0;

  return (
    <>
      <PremiumScreen>
        <PremiumHero
          eyebrow={ui("Recruitment")}
          title={ui("Application progress")}
          subtitle={ui("Complete payment, verify your access code, then upload the documents needed for review.")}
          icon="briefcase-outline"
          right={<StatusPill label={appStatus} color={appStatus === 'approved' ? colors.success : colors.gold} />}
        />

        {error ? (
          <PremiumCard style={styles.errorCard}>
            <AppText style={styles.errorText}>{error}</AppText>
          </PremiumCard>
        ) : null}

        <PremiumCard>
          <AppText style={styles.cardTitle}>{ui("Application status")}</AppText>
          <InfoRow icon="pricetag-outline" label={ui("Reference")} value={application?.reference_number || '-'} />
          <InfoRow icon="briefcase-outline" label={ui("Status")} value={appStatus} />
          <InfoRow icon="card-outline" label={ui("Payment")} value={paymentStatus} />
          <InfoRow
            icon="key-outline"
            label={ui("Access code")}
            value={application?.access_code_used ? 'Verified' : 'Pending'}
            valueStyle={{ color: application?.access_code_used ? colors.success : colors.warning }}
          />
        </PremiumCard>

        <PremiumSectionTitle title={ui("1. Pay application fee")} />
        <PremiumCard>
          <AppText style={styles.cardText}>{ui("Start the payment flow to receive your access code.")}</AppText>
          <PremiumButton
            title={ui("Start payment")}
            onPress={openPayment}
            loading={paymentLoading}
            icon="card-outline"
            style={styles.blockGap}
          />
          <Input
            label={ui("Payment reference")}
            placeholder={ui("Paste payment reference")}
            value={paymentReferenceInput}
            onChangeText={setPaymentReferenceInput}
            autoCapitalize="none"
            icon="receipt-outline"
            containerStyle={styles.inputGap}
          />
          <PremiumButton
            title={ui("Verify payment")}
            variant="secondary"
            onPress={verifyPayment}
            loading={paymentLoading}
            icon="shield-checkmark-outline"
          />
        </PremiumCard>

        <PremiumSectionTitle title={ui("2. Unlock your application")} />
        <PremiumCard>
          <AppText style={styles.cardText}>{ui("Enter the access code sent after successful payment.")}</AppText>
          <Input
            label={ui("Access code")}
            placeholder={ui("Access code")}
            value={accessCodeInput}
            onChangeText={setAccessCodeInput}
            autoCapitalize="characters"
            icon="keypad-outline"
            containerStyle={styles.inputGap}
          />
          <PremiumButton
            title={ui("Verify access code")}
            onPress={verifyAccessCode}
            loading={accessLoading}
            icon="lock-open-outline"
          />
        </PremiumCard>

        <PremiumSectionTitle
          title={ui("3. Upload documents")}
          subtitle={ui("Available after your payment and access code are verified.")}
        />
        <PremiumCard>
          {DOCUMENT_FIELDS.map((field) => {
            const asset = selectedFiles[field.key];
            return (
              <View key={field.key} style={styles.docRow}>
                <View style={styles.docCopy}>
                  <AppText style={styles.docLabel}>{field.label}</AppText>
                  {asset ? (
                    <FilePreviewCard
                      title={asset.fileName || field.label}
                      subtitle={ui("Ready to upload")}
                      uri={asset.uri}
                      fileName={asset.fileName}
                      fileSize={asset.fileSize}
                      mimeType={asset.type}
                      actionLabel={ui("Preview")}
                    />
                  ) : (
                    <AppText style={styles.docHint}>{ui("No file selected")}</AppText>
                  )}
                </View>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={ui("{value0} {value1}", {value0: (asset ? ui("Change") : ui("Select")), value1: (field.label)})}
                  activeOpacity={0.84}
                  style={[styles.docButton, uploading && styles.disabledButton]}
                  onPress={() => pickFile(field.key)}
                  disabled={uploading}
                >
                  <AppText style={styles.docButtonText}>{asset ? ui("Change") : ui("Select")}</AppText>
                </TouchableOpacity>
              </View>
            );
          })}

          {uploadProgress ? (
            <View style={styles.uploadProgressCard}>
              <AppText style={styles.uploadProgressTitle}>{ui("Uploading")}{uploadProgress.label} ({uploadProgress.current}/{uploadProgress.total})
              </AppText>
              <ProgressBar value={uploadPercent} />
              <AppText style={styles.uploadProgressText}>{uploadPercent}{ui("% complete")}</AppText>
            </View>
          ) : null}

          <PremiumButton
            title={ui("Upload documents")}
            onPress={uploadDocuments}
            loading={uploading}
            disabled={uploading || !canUpload}
            icon="cloud-upload-outline"
            style={styles.blockGap}
          />
          {!canUpload ? (
            <AppText style={styles.lockedCopy}>{ui("Payment and access-code verification are required before uploads unlock.")}</AppText>
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
    fontFamily: typography.semibold,
    fontSize: typeScale.md,
    lineHeight: 26,
    marginBottom: 8,
  },
  cardText: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    lineHeight: 18,
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
    fontSize: typeScale.sm,
    lineHeight: 20,
  },
  docHint: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: typeScale.reading,
    lineHeight: 22,
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
    fontFamily: typography.semibold,
    fontSize: typeScale.xs,
    lineHeight: 18,
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
    fontSize: typeScale.xs,
    lineHeight: 18,
  },
  uploadProgressText: {
    color: colors.blue,
    fontFamily: typography.medium,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginTop: 6,
  },
  lockedCopy: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
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
    fontSize: typeScale.xs,
    lineHeight: 18,
  },
});

export default RecruitmentApplicationScreen;
