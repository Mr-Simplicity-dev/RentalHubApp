import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import React, { useState } from 'react';
import {StyleSheet, View} from 'react-native';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/Ionicons';
import {
  InfoRow,
  PremiumButton,
  PremiumCard,
  PremiumHero,
  PremiumScreen,
  PremiumSectionTitle,
  StatusPill,
} from '../../components/common/PremiumLayout';
import { adminService } from '../../services/adminService';
import { getErrorMessage } from '../../utils/http';
import { colors, radius, typography, typeScale } from '../../theme';

import AppText from '../../components/common/AppText';
const AdminLedgerScreen = () => {
  useInterfaceLanguage();
  const [verification, setVerification] = useState(null);
  const [checking, setChecking] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState(null);

  const verifyIntegrity = async () => {
    setChecking(true);
    try {
      const result = await adminService.verifyLedgerIntegrity();
      setVerification(result);
      setLastCheckedAt(new Date());

      if (result?.success) {
        Toast.show({
          type: 'success',
          text1: ui("Integrity confirmed"),
          text2: result.message || ui("The audit ledger hash chain is intact."),
        });
      } else {
        Toast.show({
          type: 'error',
          text1: ui("Integrity issue detected"),
          text2: result?.compromisedAt
            ? ui("The hash chain differs at audit record #{value0}.", {value0: (result.compromisedAt)})
            : result?.message || ui("The ledger could not be verified as intact."),
        });
      }
    } catch (error) {
      const message = getErrorMessage(error, 'Could not verify ledger integrity');
      setVerification({ requestFailed: true, message });
      setLastCheckedAt(new Date());
      Toast.show({
        type: 'error',
        text1: ui("Verification failed"),
        text2: message,
      });
    } finally {
      setChecking(false);
    }
  };

  const status = checking
    ? { label: ui("Checking"), color: colors.blue }
    : verification?.requestFailed
      ? { label: ui("Check failed"), color: colors.danger }
      : verification?.success
        ? { label: ui("Integrity intact"), color: colors.success }
        : verification
          ? { label: ui("Issue detected"), color: colors.danger }
          : { label: ui("Not checked"), color: colors.muted };

  const lastCheckedLabel = lastCheckedAt
    ? lastCheckedAt.toLocaleString()
    : 'Run a check to create a current result';

  return (
    <PremiumScreen>
      <PremiumHero
        eyebrow={ui("Security operations")}
        title={ui("Audit ledger integrity")}
        subtitle={ui("Verify that RentalHub's append-only audit records still form an unbroken cryptographic hash chain.")}
        icon="shield-checkmark-outline"
        right={<StatusPill label={status.label} color={status.color} />}
      />

      <PremiumSectionTitle
        title={ui("Integrity check")}
        subtitle={ui("This is an explicit server verification. It does not load balances, payments or transaction history.")}
      />
      <PremiumCard>
        <View style={[styles.resultIcon, { backgroundColor: `${status.color}14` }]}>
          <Icon
            name={verification?.success ? 'checkmark-circle-outline' : verification ? 'warning-outline' : 'finger-print-outline'}
            size={30}
            color={status.color}
          />
        </View>
        <AppText style={styles.resultTitle}>{status.label}</AppText>
        <AppText style={styles.resultMessage}>
          {verification?.message
            || 'Run the integrity check when you need a current confirmation of the audit chain.'}
        </AppText>

        <View style={styles.details}>
          <InfoRow icon="time-outline" label={ui("Last checked")} value={lastCheckedLabel} />
          {verification && !verification.success && !verification.requestFailed ? (
            <InfoRow
              icon="alert-circle-outline"
              label={ui("Compromised audit record")}
              value={verification.compromisedAt ? `#${verification.compromisedAt}` : 'Not identified'}
              valueStyle={styles.dangerText}
            />
          ) : null}
        </View>

        <PremiumButton
          title={verification ? 'Run integrity check again' : 'Run integrity check'}
          icon="shield-checkmark-outline"
          loading={checking}
          onPress={verifyIntegrity}
          style={styles.button}
        />
      </PremiumCard>

      <PremiumCard style={styles.noteCard}>
        <View style={styles.noteIcon}>
          <Icon name="information-circle-outline" size={20} color={colors.blue} />
        </View>
        <AppText style={styles.noteText}>{ui("A detected mismatch identifies the first audit-record ID whose stored hash differs from the server's recalculation. Escalate that result before relying on later audit entries.")}</AppText>
      </PremiumCard>
    </PremiumScreen>
  );
};

const styles = StyleSheet.create({
  resultIcon: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  resultTitle: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: typeScale.lg,
    lineHeight: 28,
    marginTop: 14,
  },
  resultMessage: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: typeScale.reading,
    lineHeight: 22,
    marginTop: 5,
  },
  details: {
    marginTop: 12,
  },
  dangerText: {
    color: colors.danger,
  },
  button: {
    marginTop: 18,
  },
  noteCard: {
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceBlue,
    flexDirection: 'row',
    gap: 11,
  },
  noteIcon: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  noteText: {
    color: colors.text,
    flex: 1,
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    lineHeight: 18,
  },
});

export default AdminLedgerScreen;
