import React, {
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import Button from '../../components/common/Button';
import DamageReportCapture from '../../components/properties/DamageReportCapture';
import { AuthContext } from '../../context/AuthContext';
import { useRealtime } from '../../context/RealtimeContext';
import { applicationService } from '../../services/applicationService';
import { messageService } from '../../services/messageService';
import { paymentService } from '../../services/paymentService';
import { recoverPayment, savePendingPayment } from '../../services/paymentRecoveryService';
import { propertyService } from '../../services/propertyService';
import useNativePaystackCheckout from '../../hooks/useNativePaystackCheckout';
import { hasPaystackCheckout } from '../../services/nativePaymentService';
import { colors, radius, shadows, typography } from '../../theme';
import { getErrorMessage } from '../../utils/http';

const fallbackPropertyImage = require('../../../assets/rentalhub-app-icon.png');

const formatCurrency = (value) => `₦${Number(value || 0).toLocaleString()}`;

const prettyLabel = (value = '') =>
  String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const PropertyDetailScreen = ({ route, navigation }) => {
  const propertyId = route?.params?.id;
  const { width } = useWindowDimensions();
  const { user, isAuthenticated } = useContext(AuthContext);
  const { connected, inviteCall } = useRealtime();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [applying, setApplying] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const [latestDamageReport, setLatestDamageReport] = useState(null);
  const [showDamageCapture, setShowDamageCapture] = useState(false);
  const [requestingTour, setRequestingTour] = useState(false);
  const { openNativeCheckout, NativePaystackCheckoutModal } = useNativePaystackCheckout();

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const canManageDamage = Boolean(
    isAuthenticated && propertyId && ['landlord', 'agent'].includes(user?.user_type)
  );
  const canViewFull = Boolean(
    isAuthenticated &&
      user?.user_type === 'tenant' &&
      (user?.subscription_active || property?.details_unlocked)
  );

  const loadProperty = async () => {
    setLoading(true);
    try {
      const response = canViewFull
        ? await propertyService.getFullPropertyDetails(propertyId)
        : await propertyService.getPropertyById(propertyId);
      const nextProperty = response?.data || null;
      setProperty(nextProperty);
      setSaved(Boolean(nextProperty?.is_saved || nextProperty?.saved));

      try {
        const damageResponse =
          await propertyService.getLatestPublishedDamageReport(propertyId);
        setLatestDamageReport(damageResponse?.success ? damageResponse.data || null : null);
      } catch (damageError) {
        setLatestDamageReport(null);
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Could not load this home',
        text2: getErrorMessage(error, 'Please try again.'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (propertyId) loadProperty();
  }, [propertyId, canViewFull]);

  const images = useMemo(() => {
    const candidates = [
      property?.primary_photo,
      property?.photo_url,
      ...(property?.photos || []).map((photo) =>
        typeof photo === 'string' ? photo : photo?.photo_url || photo?.url
      ),
    ].filter(Boolean);
    return [...new Set(candidates)];
  }, [property]);

  const amenities = useMemo(() => {
    if (Array.isArray(property?.amenities)) return property.amenities;
    if (typeof property?.amenities === 'string') {
      try {
        const parsed = JSON.parse(property.amenities);
        if (Array.isArray(parsed)) return parsed;
      } catch (error) {
        return property.amenities.split(',').map((item) => item.trim()).filter(Boolean);
      }
    }
    return [];
  }, [property?.amenities]);

  const handleSave = async () => {
    if (!isAuthenticated) {
      navigation.navigate('Login');
      return;
    }

    setSaving(true);
    try {
      if (saved) {
        await propertyService.unsaveProperty(propertyId);
      } else {
        await propertyService.saveProperty(propertyId);
      }
      setSaved((current) => !current);
      Toast.show({
        type: 'success',
        text1: saved ? 'Removed from saved homes' : 'Home saved',
        text2: saved ? undefined : 'You can revisit it from My Hub.',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Could not update saved homes',
        text2: getErrorMessage(error, 'Please try again.'),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleApply = async () => {
    setApplying(true);
    try {
      await applicationService.submitApplication({
        property_id: propertyId,
        message: 'Application submitted from mobile app',
      });
      Toast.show({
        type: 'success',
        text1: 'Application submitted',
        text2: 'You can track its progress from Applications.',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Application failed',
        text2: getErrorMessage(error, 'Could not submit your application'),
      });
    } finally {
      setApplying(false);
    }
  };

  const handleUnlock = async () => {
    if (!isAuthenticated) {
      navigation.navigate('Login');
      return;
    }

    setUnlocking(true);
    try {
      const response = await paymentService.initializePropertyUnlock(propertyId);
      const reference = response?.data?.reference;
      if (reference) {
        await savePendingPayment({
          flow: 'unlock',
          reference,
          propertyId,
        });
      }

      if (hasPaystackCheckout(response?.data)) {
        openNativeCheckout({
          transaction: response.data,
          title: 'Unlock property',
          subtitle: 'Pay securely to view the complete property details.',
          amountLabel: response?.data?.amount ? `₦${Number(response.data.amount).toLocaleString()}` : '',
          onSuccess: (paymentResponse) =>
            completeUnlockPayment(paymentResponse?.reference || reference),
          onBrowserFallback: () => {
            Toast.show({
              type: 'info',
              text1: 'Paystack checkout opened',
              text2: 'Complete payment securely, then return and refresh the property.',
            });
          },
        });
      } else if (reference) {
        await completeUnlockPayment(reference);
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Unlock failed',
        text2: getErrorMessage(error, 'Could not start unlock payment'),
      });
    } finally {
      setUnlocking(false);
    }
  };

  const completeUnlockPayment = async (reference) => {
    if (!reference) return;

    try {
      const response = await recoverPayment({
        reference,
        fallbackFlow: 'unlock',
      });
      if (response?.success) {
        Toast.show({ type: 'success', text1: 'Property unlocked' });
        await loadProperty();
      } else {
        Toast.show({
          type: 'error',
          text1: 'Verification failed',
          text2: response?.message || 'Could not verify property unlock.',
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Verification failed',
        text2: getErrorMessage(error, 'Could not verify property unlock.'),
      });
    }
  };

  const shareProperty = async () => {
    const link = `https://rentalhub.com.ng/properties/${propertyId}`;
    await Share.share({
      message: `${property?.title || 'View this verified home'} on RentalHub NG\n${link}`,
      title: property?.title || 'RentalHub property',
      url: link,
    });
  };

  const requestVirtualTour = async () => {
    if (!isAuthenticated) {
      navigation.navigate('Login');
      return;
    }

    const receiverId = property?.landlord_id || property?.user_id;
    if (!receiverId) {
      Toast.show({
        type: 'error',
        text1: 'Tour unavailable',
        text2: 'This property does not expose a verified tour contact yet.',
      });
      return;
    }

    setRequestingTour(true);
    try {
      if (connected) {
        await inviteCall({
          receiverId,
          callType: 'virtual_tour',
          propertyId,
          propertyTitle: property?.title || 'RentalHub property',
        });
        Toast.show({
          type: 'success',
          text1: 'Virtual tour request sent',
          text2: 'Waiting for the landlord or agent to accept.',
        });
      } else {
        await messageService.sendMessage({
          receiver_id: receiverId,
          property_id: propertyId,
          subject: 'Virtual property tour request',
          message_text: `I would like to request a virtual tour for ${property?.title || 'this property'}.`,
        });
        Toast.show({
          type: 'info',
          text1: 'Tour request saved as message',
          text2: 'Realtime is offline, so the request was sent to messages.',
        });
      }
    } catch (error) {
      try {
        await messageService.sendMessage({
          receiver_id: receiverId,
          property_id: propertyId,
          subject: 'Virtual property tour request',
          message_text: `I would like to request a virtual tour for ${property?.title || 'this property'}.`,
        });
        Toast.show({
          type: 'info',
          text1: 'Tour request sent as message',
          text2: 'The live request could not connect, but the contact has your message.',
        });
      } catch (messageError) {
        Toast.show({
          type: 'error',
          text1: 'Tour request failed',
          text2: getErrorMessage(messageError, getErrorMessage(error, 'Could not request a virtual tour')),
        });
      }
    } finally {
      setRequestingTour(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={colors.blue} size="large" />
        <Text style={styles.loadingText}>Preparing property details…</Text>
      </SafeAreaView>
    );
  }

  if (!property) {
    return (
      <SafeAreaView style={styles.center}>
        <View style={styles.notFoundIcon}>
          <Icon name="home-outline" size={32} color={colors.blue} />
        </View>
        <Text style={styles.notFoundTitle}>This property is unavailable</Text>
        <Text style={styles.empty}>It may have been rented or removed.</Text>
        <Button title="Return to properties" onPress={() => navigation.goBack()} style={styles.returnButton} />
      </SafeAreaView>
    );
  }

  const location =
    [property.area, property.city, property.state_name].filter(Boolean).join(', ') ||
    'Location available after verification';
  const frequency =
    property.payment_frequency === 'yearly'
      ? 'year'
      : property.payment_frequency === 'quarterly'
        ? 'quarter'
        : 'month';
  const galleryImages = images.length ? images : [null];

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.gallery}>
          <ScrollView
            horizontal
            onMomentumScrollEnd={(event) =>
              setImageIndex(Math.round(event.nativeEvent.contentOffset.x / width))
            }
            pagingEnabled
            showsHorizontalScrollIndicator={false}>
            {galleryImages.map((uri, index) => (
              <Image
                key={`${uri || 'fallback'}-${index}`}
                resizeMode="cover"
                source={uri ? { uri } : fallbackPropertyImage}
                style={[styles.image, { width }]}
              />
            ))}
          </ScrollView>
          <View style={styles.galleryTop}>
            <TouchableOpacity
              accessibilityLabel="Go back"
              onPress={() => navigation.goBack()}
              style={styles.floatingButton}>
              <Icon name="arrow-back" size={21} color={colors.navy} />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityLabel="Share property"
              onPress={shareProperty}
              style={styles.floatingButton}>
              <Icon name="share-outline" size={21} color={colors.navy} />
            </TouchableOpacity>
          </View>
          <View style={styles.photoCount}>
            <Icon name="images-outline" size={14} color={colors.white} />
            <Text style={styles.photoCountText}>{imageIndex + 1} / {galleryImages.length}</Text>
          </View>
          {property.featured ? (
            <View style={styles.featuredBadge}>
              <Icon name="sparkles" size={13} color={colors.navy} />
              <Text style={styles.featuredText}>Featured</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.content}>
          <View style={styles.headingRow}>
            <View style={styles.headingCopy}>
              <Text style={styles.title}>{property.title || 'Verified rental home'}</Text>
              <View style={styles.locationRow}>
                <Icon name="location-outline" size={16} color={colors.muted} />
                <Text style={styles.location}>{location}</Text>
              </View>
            </View>
            <TouchableOpacity
              accessibilityLabel={saved ? 'Remove saved property' : 'Save property'}
              disabled={saving}
              onPress={handleSave}
              style={[styles.saveButton, saved && styles.saveButtonActive]}>
              {saving ? (
                <ActivityIndicator color={colors.blue} size="small" />
              ) : (
                <Icon
                  name={saved ? 'heart' : 'heart-outline'}
                  size={22}
                  color={saved ? '#F04438' : colors.navy}
                />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatCurrency(property.rent_amount)}</Text>
            <Text style={styles.frequency}> / {frequency}</Text>
          </View>

          <View style={styles.factGrid}>
            <View style={styles.fact}>
              <View style={styles.factIcon}>
                <Icon name="bed-outline" size={20} color={colors.blue} />
              </View>
              <Text style={styles.factValue}>{Number(property.bedrooms || 0)}</Text>
              <Text style={styles.factLabel}>Bedrooms</Text>
            </View>
            <View style={styles.factDivider} />
            <View style={styles.fact}>
              <View style={styles.factIcon}>
                <Icon name="water-outline" size={20} color={colors.blue} />
              </View>
              <Text style={styles.factValue}>{Number(property.bathrooms || 0)}</Text>
              <Text style={styles.factLabel}>Bathrooms</Text>
            </View>
            <View style={styles.factDivider} />
            <View style={styles.fact}>
              <View style={styles.factIcon}>
                <Icon name="home-outline" size={20} color={colors.blue} />
              </View>
              <Text style={styles.factValue} numberOfLines={1}>
                {prettyLabel(property.property_type || 'Home')}
              </Text>
              <Text style={styles.factLabel}>Property</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About this home</Text>
            <Text style={styles.description}>
              {property.description || 'The property owner has not added a description yet.'}
            </Text>
          </View>

          {amenities.length ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Amenities</Text>
              <View style={styles.amenities}>
                {amenities.slice(0, 10).map((amenity, index) => (
                  <View key={`${amenity}-${index}`} style={styles.amenity}>
                    <Icon name="checkmark-circle" size={17} color={colors.success} />
                    <Text style={styles.amenityText}>
                      {prettyLabel(typeof amenity === 'string' ? amenity : amenity?.name)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {canViewFull && latestDamageReport ? (
            <View style={styles.conditionCard}>
              <View style={styles.cardHeading}>
                <View style={styles.conditionIcon}>
                  <Icon name="document-text-outline" size={20} color="#A15C00" />
                </View>
                <View>
                  <Text style={styles.cardEyebrow}>VERIFIED RECORD</Text>
                  <Text style={styles.cardTitle}>Property condition report</Text>
                </View>
              </View>
              <Text style={styles.conditionMeta}>
                {prettyLabel(latestDamageReport.damage_type || 'Condition')} ·{' '}
                {prettyLabel(latestDamageReport.severity || 'Severity unavailable')}
              </Text>
              {latestDamageReport.room_location ? (
                <Text style={styles.conditionMeta}>
                  Location: {latestDamageReport.room_location}
                </Text>
              ) : null}
              {latestDamageReport.description ? (
                <Text style={styles.conditionText}>{latestDamageReport.description}</Text>
              ) : null}
              {latestDamageReport.ai_analysis?.repair_recommendation ? (
                <Text style={styles.recommendation}>
                  Recommendation: {latestDamageReport.ai_analysis.repair_recommendation}
                </Text>
              ) : null}
            </View>
          ) : null}

          {canViewFull && property.landlord_name ? (
            <View style={styles.contactCard}>
              <View style={styles.cardHeading}>
                <View style={styles.contactAvatar}>
                  <Icon name="person" size={21} color={colors.white} />
                </View>
                <View style={styles.contactCopy}>
                  <Text style={styles.cardEyebrow}>VERIFIED CONTACT</Text>
                  <Text style={styles.cardTitle}>{property.landlord_name}</Text>
                </View>
                <Icon name="shield-checkmark" size={22} color={colors.success} />
              </View>
              <View style={styles.contactActions}>
                {property.landlord_phone ? (
                  <TouchableOpacity
                    accessibilityLabel="Call verified property contact"
                    accessibilityRole="button"
                    onPress={() => Linking.openURL(`tel:${property.landlord_phone}`)}
                    style={styles.contactAction}>
                    <Icon name="call-outline" size={18} color={colors.blue} />
                    <Text style={styles.contactActionText}>Call</Text>
                  </TouchableOpacity>
                ) : null}
                {property.landlord_email ? (
                  <TouchableOpacity
                    accessibilityLabel="Email verified property contact"
                    accessibilityRole="button"
                    onPress={() => Linking.openURL(`mailto:${property.landlord_email}`)}
                    style={styles.contactAction}>
                    <Icon name="mail-outline" size={18} color={colors.blue} />
                    <Text style={styles.contactActionText}>Email</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  accessibilityLabel="Request virtual property tour"
                  accessibilityRole="button"
                  disabled={requestingTour}
                  onPress={requestVirtualTour}
                  style={[styles.contactAction, styles.virtualTourAction]}>
                  {requestingTour ? (
                    <ActivityIndicator color={colors.blue} size="small" />
                  ) : (
                    <Icon name="videocam-outline" size={18} color={colors.blue} />
                  )}
                  <Text style={styles.contactActionText}>Virtual tour</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.lockedCard}>
              <View style={styles.lockIcon}>
                <Icon name="lock-closed" size={20} color={colors.gold} />
              </View>
              <Text style={styles.lockedTitle}>Unlock complete property details</Text>
              <Text style={styles.lockedText}>
                Access the verified contact, precise location and complete property information.
              </Text>
              <Button
                loading={unlocking}
                onPress={handleUnlock}
                title={isAuthenticated ? 'Unlock full details' : 'Sign in to continue'}
                style={styles.unlockButton}
              />
            </View>
          )}

          {canManageDamage ? (
            <Button
              onPress={() => setShowDamageCapture(true)}
              style={styles.damageButton}
              title="Report property damage"
              variant="outline"
            />
          ) : null}

          <View style={styles.safetyRow}>
            <Icon name="shield-checkmark-outline" size={18} color={colors.success} />
            <Text style={styles.safetyText}>
              Never make payments outside RentalHub’s verified payment process.
            </Text>
          </View>
        </View>
      </ScrollView>

      {(!isAuthenticated || user?.user_type === 'tenant') ? (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            disabled={saving}
            onPress={handleSave}
            style={styles.bottomSave}>
            <Icon
              name={saved ? 'heart' : 'heart-outline'}
              size={22}
              color={saved ? '#F04438' : colors.navy}
            />
          </TouchableOpacity>
          <Button
            loading={applying}
            onPress={isAuthenticated ? handleApply : () => navigation.navigate('Login')}
            style={styles.primaryAction}
            title={isAuthenticated ? 'Apply for this home' : 'Sign in to apply'}
          />
        </View>
      ) : null}

      <DamageReportCapture
        onClose={() => setShowDamageCapture(false)}
        onSaved={loadProperty}
        propertyId={propertyId}
        visible={showDamageCapture}
      />
      {NativePaystackCheckoutModal}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.surface,
    flex: 1,
  },
  center: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    flex: 1,
    justifyContent: 'center',
    padding: 28,
  },
  loadingText: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 12,
    marginTop: 12,
  },
  notFoundIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderRadius: 34,
    height: 68,
    justifyContent: 'center',
    width: 68,
  },
  notFoundTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 20,
    marginTop: 18,
  },
  empty: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 14,
    marginTop: 7,
  },
  returnButton: {
    marginTop: 22,
    minWidth: 210,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  gallery: {
    height: 330,
    position: 'relative',
  },
  image: {
    height: 330,
  },
  galleryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 16,
    position: 'absolute',
    right: 16,
    top: 15,
  },
  floatingButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
    ...shadows.soft,
  },
  photoCount: {
    alignItems: 'center',
    backgroundColor: 'rgba(7,26,61,0.72)',
    borderRadius: radius.pill,
    bottom: 15,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 7,
    position: 'absolute',
    right: 15,
  },
  photoCountText: {
    color: colors.white,
    fontFamily: typography.semibold,
    fontSize: 11,
  },
  featuredBadge: {
    alignItems: 'center',
    backgroundColor: colors.gold,
    borderRadius: radius.pill,
    bottom: 15,
    flexDirection: 'row',
    gap: 5,
    left: 15,
    paddingHorizontal: 11,
    paddingVertical: 7,
    position: 'absolute',
  },
  featuredText: {
    color: colors.navy,
    fontFamily: typography.bold,
    fontSize: 10,
  },
  content: {
    backgroundColor: colors.surface,
    padding: 20,
  },
  headingRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  headingCopy: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 26,
    letterSpacing: -0.8,
    lineHeight: 32,
  },
  locationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 8,
  },
  location: {
    color: colors.muted,
    flex: 1,
    fontFamily: typography.regular,
    fontSize: 13,
    marginLeft: 5,
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  saveButtonActive: {
    backgroundColor: '#FFF1F0',
    borderColor: '#FFD2CE',
  },
  priceRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    marginTop: 18,
  },
  price: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: 28,
    letterSpacing: -0.6,
  },
  frequency: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
  },
  factGrid: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 22,
    paddingVertical: 16,
  },
  fact: {
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 4,
  },
  factIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  factValue: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 13,
    marginTop: 7,
    maxWidth: '95%',
  },
  factLabel: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 9,
    marginTop: 2,
  },
  factDivider: {
    backgroundColor: colors.border,
    height: 48,
    width: 1,
  },
  section: {
    marginTop: 26,
  },
  sectionTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 19,
    letterSpacing: -0.35,
    marginBottom: 10,
  },
  description: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: 14,
    lineHeight: 23,
  },
  amenities: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  amenity: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  amenityText: {
    color: colors.text,
    fontFamily: typography.medium,
    fontSize: 11,
  },
  conditionCard: {
    backgroundColor: '#FFF9E9',
    borderColor: '#F7DF9A',
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: 25,
    padding: 17,
  },
  cardHeading: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  conditionIcon: {
    alignItems: 'center',
    backgroundColor: '#FFEAB3',
    borderRadius: 19,
    height: 38,
    justifyContent: 'center',
    marginRight: 11,
    width: 38,
  },
  cardEyebrow: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: 8,
    letterSpacing: 1.1,
  },
  cardTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 15,
    marginTop: 2,
  },
  conditionMeta: {
    color: '#855400',
    fontFamily: typography.medium,
    fontSize: 12,
    marginTop: 9,
  },
  conditionText: {
    color: '#6B4A14',
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 9,
  },
  recommendation: {
    color: colors.navySoft,
    fontFamily: typography.semibold,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 10,
  },
  contactCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: 25,
    padding: 17,
  },
  contactAvatar: {
    alignItems: 'center',
    backgroundColor: colors.blue,
    borderRadius: 21,
    height: 42,
    justifyContent: 'center',
    marginRight: 11,
    width: 42,
  },
  contactCopy: {
    flex: 1,
  },
  contactActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 15,
  },
  contactAction: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderRadius: radius.sm,
    flex: 1,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: '30%',
    paddingHorizontal: 8,
  },
  virtualTourAction: {
    backgroundColor: '#EAF3FF',
  },
  contactActionText: {
    color: colors.blue,
    fontFamily: typography.semibold,
    fontSize: 12,
  },
  lockedCard: {
    alignItems: 'center',
    backgroundColor: colors.navy,
    borderRadius: radius.lg,
    marginTop: 25,
    overflow: 'hidden',
    padding: 21,
  },
  lockIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,201,40,0.14)',
    borderRadius: 21,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  lockedTitle: {
    color: colors.white,
    fontFamily: typography.bold,
    fontSize: 18,
    marginTop: 14,
    textAlign: 'center',
  },
  lockedText: {
    color: '#B7C8E2',
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 7,
    textAlign: 'center',
  },
  unlockButton: {
    marginTop: 17,
    minWidth: 210,
  },
  damageButton: {
    marginTop: 18,
  },
  safetyRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    paddingHorizontal: 12,
  },
  safetyText: {
    color: colors.muted,
    flex: 1,
    fontFamily: typography.medium,
    fontSize: 10,
    lineHeight: 15,
    marginLeft: 7,
  },
  bottomBar: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 11,
    paddingBottom: 12,
    paddingHorizontal: 16,
    paddingTop: 11,
  },
  bottomSave: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  primaryAction: {
    flex: 1,
  },
});

export default PropertyDetailScreen;
