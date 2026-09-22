import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Share,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { rentHelpService } from '../../services/rentHelpService';
import { colors, radius, typography } from '../../theme';
import { getErrorMessage, pickList } from '../../utils/http';

import AppText from '../../components/common/AppText';

const money = (amount) =>
  `₦${Number(amount || 0).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;

const RequestRentHelpScreen = () => {
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [properties, setProperties] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [createdLink, setCreatedLink] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await rentHelpService.getEligibleProperties();
      setProperties(pickList(response, ['data', 'properties']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Could not load your properties',
        text2: getErrorMessage(error, 'Please try again.'),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createLink = async () => {
    if (!selectedId) return;
    setCreating(true);
    setCreatedLink('');
    try {
      const response = await rentHelpService.createRequest(selectedId);
      setCreatedLink(response?.data?.link || '');
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Could not create the link',
        text2: getErrorMessage(error, 'Please try again.'),
      });
    } finally {
      setCreating(false);
    }
  };

  const shareLink = async () => {
    if (!createdLink) return;
    try {
      await Share.share({
        message: `Pay my rent securely on RentalHub NG: ${createdLink}`,
        url: createdLink,
      });
    } catch (error) {
      // Sharing can be dismissed by the user — the link remains visible.
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerCard}>
          <View style={styles.headerIcon}>
            <Icon name="hand-left-outline" size={22} color="#0F766E" />
          </View>
          <View style={styles.headerBody}>
            <AppText style={styles.title}>Ask someone to pay your rent</AppText>
            <AppText style={styles.subtitle}>
              We create a secure link you can share with a friend or family member. The amount is confirmed by the server.
            </AppText>
          </View>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.blue} size="large" />
            <AppText style={styles.loadingText}>Checking your properties…</AppText>
          </View>
        ) : properties.length === 0 ? (
          <View style={styles.notice}>
            <Icon name="information-circle-outline" size={18} color="#92400E" />
            <AppText style={styles.noticeText}>
              You don't have a property to request rent help for yet. You can do this once you've paid rent on a property, or once a landlord has approved your application.
            </AppText>
          </View>
        ) : (
          <>
            <AppText style={styles.sectionLabel}>Choose a property</AppText>
            {properties.map((property) => {
              const selected = String(property.property_id) === String(selectedId);
              return (
                <TouchableOpacity
                  key={property.property_id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  onPress={() => setSelectedId(String(property.property_id))}
                  style={[styles.propertyRow, selected && styles.propertyRowSelected]}
                >
                  <Icon
                    name={selected ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={selected ? '#0F766E' : colors.muted}
                  />
                  <View style={styles.propertyBody}>
                    <AppText style={styles.propertyTitle} numberOfLines={2}>
                      {property.title || 'Property'}
                    </AppText>
                    <AppText style={styles.propertyMeta}>
                      {money(property.rent_amount)}
                      {property.source === 'approved' ? ' · approved' : ''}
                    </AppText>
                  </View>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              disabled={!selectedId || creating}
              onPress={createLink}
              style={[styles.primaryButton, (!selectedId || creating) && styles.buttonDisabled]}
            >
              {creating ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <AppText style={styles.primaryButtonText}>Create share link</AppText>
              )}
            </TouchableOpacity>
          </>
        )}

        {createdLink ? (
          <View style={styles.linkCard}>
            <AppText style={styles.linkLabel}>SHARE THIS LINK (EXPIRES IN 72 HOURS)</AppText>
            <AppText style={styles.linkValue} selectable>{createdLink}</AppText>
            <TouchableOpacity onPress={shareLink} style={styles.shareButton}>
              <Icon name="share-social-outline" size={17} color={colors.white} />
              <AppText style={styles.shareButtonText}>Share link</AppText>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setCreatedLink('');
                setSelectedId('');
              }}
              style={styles.linkReset}
            >
              <AppText style={styles.linkResetText}>Create another link</AppText>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.surface, flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  headerCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 15,
  },
  headerIcon: {
    alignItems: 'center',
    backgroundColor: '#CCFBF1',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headerBody: { flex: 1, marginLeft: 11 },
  title: { color: colors.ink, fontFamily: typography.bold, fontSize: 17 },
  subtitle: { color: colors.muted, fontFamily: typography.regular, fontSize: 12, lineHeight: 18, marginTop: 5 },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  loadingText: { color: colors.muted, fontFamily: typography.medium, fontSize: 13, marginTop: 12 },
  notice: {
    alignItems: 'flex-start',
    backgroundColor: '#FFF6DD',
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    padding: 13,
  },
  noticeText: { color: '#7A4A00', flex: 1, fontFamily: typography.regular, fontSize: 13, lineHeight: 19 },
  sectionLabel: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: 13,
    marginBottom: 8,
    marginTop: 16,
  },
  propertyRow: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 9,
    padding: 13,
  },
  propertyRowSelected: { borderColor: '#0F766E', backgroundColor: '#F0FDFA' },
  propertyBody: { flex: 1, marginLeft: 10 },
  propertyTitle: { color: colors.ink, fontFamily: typography.semibold, fontSize: 14 },
  propertyMeta: { color: colors.muted, fontFamily: typography.regular, fontSize: 12, marginTop: 3 },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#0F766E',
    borderRadius: radius.sm,
    justifyContent: 'center',
    marginTop: 16,
    minHeight: 48,
  },
  buttonDisabled: { opacity: 0.5 },
  primaryButtonText: { color: colors.white, fontFamily: typography.semibold, fontSize: 14 },
  linkCard: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: 16,
    padding: 14,
  },
  linkLabel: { color: '#047857', fontFamily: typography.bold, fontSize: 11, letterSpacing: 0.6 },
  linkValue: { color: colors.ink, fontFamily: typography.regular, fontSize: 12, marginTop: 8 },
  shareButton: {
    alignItems: 'center',
    backgroundColor: '#059669',
    borderRadius: radius.sm,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    marginTop: 12,
    minHeight: 44,
  },
  shareButtonText: { color: colors.white, fontFamily: typography.semibold, fontSize: 14 },
  linkReset: { alignItems: 'center', marginTop: 12 },
  linkResetText: { color: '#047857', fontFamily: typography.semibold, fontSize: 13, textDecorationLine: 'underline' },
});

export default RequestRentHelpScreen;
