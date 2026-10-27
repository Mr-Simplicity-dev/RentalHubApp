import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Input from '../../components/common/Input';
import {
  InfoRow,
  PremiumButton,
  PremiumCard,
  PremiumCenter,
  PremiumHero,
} from '../../components/common/PremiumLayout';
import { courtBundleService } from '../../services/courtBundleService';
import { getErrorMessage } from '../../utils/http';
import { colors, radius, typography, typeScale } from '../../theme';
import AppText from '../../components/common/AppText';

const CourtBundleScreen = () => {
  useInterfaceLanguage();
  const [disputeId, setDisputeId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [shared, setShared] = useState(false);

  const generate = async () => {
    const id = Number(disputeId);
    if (!Number.isInteger(id) || id < 1) {
      setError('Enter a valid dispute id.');
      return;
    }
    setBusy(true);
    setError('');
    setShared(false);
    try {
      const buffer = await courtBundleService.download(id);
      if (!buffer || buffer.byteLength === 0) {
        setError('The court bundle came back empty. Check the dispute id and try again.');
        return;
      }

      const fileName = `court-bundle-${id}.pdf`;
      const file = new File(Paths.cache, fileName);
      try {
        file.delete();
      } catch {
        // file may not exist yet
      }
      file.create();
      file.write(new Uint8Array(buffer));

      if (!(await Sharing.isAvailableAsync())) {
        Toast.show({
          type: 'info',
          text1: ui("Saved"),
          text2: ui("The PDF was saved to {value0}", {value0: (file.uri)}),
        });
        setShared(true);
        return;
      }

      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
        dialogTitle: ui("Court bundle"),
      });
      setShared(true);
      Toast.show({ type: 'success', text1: ui("Court bundle ready") });
    } catch (err) {
      setError(getErrorMessage(err, 'Could not generate the court bundle.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.screen}>
      <PremiumCard style={styles.hero}>
        <PremiumHero
          eyebrow={ui("Court bundle")}
          title={ui("Generate & share")}
          subtitle={ui("Download a dispute's court bundle as a PDF and share it.")}
          icon="document-attach-outline"
        />
      </PremiumCard>

      <PremiumCard>
        <Input
          label={ui("Dispute ID")}
          value={disputeId}
          onChangeText={(v) => {
            setDisputeId(v.replace(/\D/g, ''));
            setError('');
          }}
          placeholder={ui("Enter the dispute id")}
          keyboardType="number-pad"
        />
        {error ? <AppText style={styles.error}>{error}</AppText> : null}
        <PremiumButton
          title={busy ? 'Preparing…' : 'Generate & share PDF'}
          onPress={generate}
          loading={busy}
          icon="download-outline"
          style={styles.action}
        />
        {shared ? (
          <InfoRow icon="checkmark-circle-outline" label={ui("Status")} value="Generated — shared or saved" />
        ) : null}
        <AppText style={styles.note}>{ui("Admin, lawyer and super-admin roles can download court bundles for disputes they can access.")}</AppText>
      </PremiumCard>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface, padding: 18 },
  hero: { backgroundColor: colors.white, borderWidth: 0, padding: 0, marginBottom: 14 },
  error: { color: colors.danger, fontFamily: typography.medium, fontSize: typeScale.xs, lineHeight: 18, marginTop: 10 },
  action: { marginTop: 16 },
  note: { color: colors.muted, fontFamily: typography.regular, fontSize: typeScale.xs, marginTop: 12, lineHeight: 18 },
});

export default CourtBundleScreen;
