import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import AdSpace from '../../components/common/AdSpace';
import { AuthContext } from '../../context/AuthContext';
import WalletFundModal from '../../components/dashboard/WalletFundModal';
import WalletWithdrawModal from '../../components/dashboard/WalletWithdrawModal';
import {
  ActionRow,
  DashboardSection,
} from '../../components/dashboard/DashboardKit';
import { dashboardService } from '../../services/dashboardService';
import { paymentService } from '../../services/paymentService';
import { referralService } from '../../services/referralService';
import { rentSavingsService } from '../../services/rentSavingsService';
import { transportationService } from '../../services/transportationService';
import { getErrorMessage, getReviewStatus, pickList, pickObject } from '../../utils/http';
import TenancyGracePanel from '../../components/dashboard/TenancyGracePanel';
import { colors, radius, shadows, typography } from '../../theme';

const StatCard = ({ title, value, icon, onPress }) => (
  <TouchableOpacity style={styles.statCard} onPress={onPress}>
    <View>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={styles.statValue}>{value ?? 0}</Text>
    </View>
    <Icon name={icon} size={26} color="#0284c7" />
  </TouchableOpacity>
);

const StatusBanner = ({ icon, title, description, colors, onPress, actionLabel }) => (
  <TouchableOpacity
    style={[styles.banner, { backgroundColor: colors.background, borderColor: colors.border }]}
    onPress={onPress}
    activeOpacity={0.85}
  >
    <Icon name={icon} size={22} color={colors.icon} />
    <View style={styles.bannerBody}>
      <Text style={[styles.bannerTitle, { color: colors.title }]}>{title}</Text>
      <Text style={[styles.bannerText, { color: colors.text }]}>{description}</Text>
      {actionLabel ? (
        <Text style={[styles.bannerAction, { color: colors.title }]}>{actionLabel}</Text>
      ) : null}
    </View>
  </TouchableOpacity>
);

const getPropertyMapAddress = (property = {}) =>
  property.full_address ||
  [property.area, property.city, property.state_name].filter(Boolean).join(', ');

const buildGoogleMapsUrl = (property = {}) => {
  const latitude = Number(property.latitude);
  const longitude = Number(property.longitude);

  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  }

  const address = getPropertyMapAddress(property);
  if (!address) return '';

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
};

const canOpenPropertyMap = (property = {}) =>
  property.rent_paid === true || property.payment_type === 'rent_payment';

const getLawyerInviteSummary = (stats = {}) => {
  const rawStatus = stats.lawyer_invite_status || 'not_sent';
  const lawyerEmail = stats.lawyer_email;
  const acceptedAt = stats.lawyer_invite_accepted_at
    ? new Date(stats.lawyer_invite_accepted_at)
    : null;
  const expiresAt = stats.lawyer_invite_expires_at
    ? new Date(stats.lawyer_invite_expires_at)
    : null;
  const hasInviteRecord =
    !!lawyerEmail || !!stats.lawyer_invite_accepted_at || !!stats.lawyer_invite_expires_at;

  const status =
    rawStatus === 'not_sent' && hasInviteRecord
      ? acceptedAt
        ? 'accepted'
        : 'pending'
      : rawStatus;

  if (status === 'accepted') {
    return {
      icon: 'checkmark-circle-outline',
      title: 'Lawyer invitation accepted',
      description: lawyerEmail
        ? `${lawyerEmail} accepted the invitation${
            acceptedAt && !Number.isNaN(acceptedAt.getTime())
              ? ` on ${acceptedAt.toLocaleDateString()}`
              : ''
          }.`
        : 'Your lawyer has accepted the invitation.',
      colors: {
        background: '#f0fdf4',
        border: '#bbf7d0',
        icon: '#16a34a',
        title: '#166534',
        text: '#15803d',
      },
    };
  }

  if (status === 'pending') {
    return {
      icon: 'time-outline',
      title: 'Lawyer invitation pending',
      description: lawyerEmail
        ? `${lawyerEmail} has not accepted the invitation yet${
            expiresAt && !Number.isNaN(expiresAt.getTime())
              ? `. It expires on ${expiresAt.toLocaleDateString()}`
              : '.'
          }`
        : 'The invited lawyer has not accepted the invitation yet.',
      colors: {
        background: '#fffbeb',
        border: '#fde68a',
        icon: '#d97706',
        title: '#92400e',
        text: '#b45309',
      },
    };
  }

  if (status === 'not_accepted') {
    return {
      icon: 'close-circle-outline',
      title: 'Lawyer invitation not accepted',
      description: lawyerEmail
        ? `${lawyerEmail} did not accept the invitation before it expired.`
        : 'The lawyer invitation expired without being accepted.',
      colors: {
        background: '#fef2f2',
        border: '#fecaca',
        icon: '#dc2626',
        title: '#991b1b',
        text: '#b91c1c',
      },
    };
  }

  return {
    icon: 'document-text-outline',
    title: 'Lawyer invitation unavailable',
    description: 'No lawyer invitation record is available for this account yet.',
    colors: {
      background: '#f8fafc',
      border: '#e2e8f0',
      icon: '#475569',
      title: '#1e293b',
      text: '#475569',
    },
  };
};

const getTenantSubscriptionValue = (stats = {}) => {
  if (!stats?.subscription_expires_at) {
    return 'Inactive';
  }

  const expiresAt = new Date(stats.subscription_expires_at);

  if (Number.isNaN(expiresAt.getTime())) {
    return 'Inactive';
  }

  const now = new Date();

  if (expiresAt <= now) {
    return 'Expired';
  }

  const daysLeft = Math.max(
    1,
    Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  );

  return `${daysLeft}d left`;
};

const DashboardScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({});
  const [activities, setActivities] = useState([]);
  const [paidPropertyLocations, setPaidPropertyLocations] = useState([]);
  const [transportStats, setTransportStats] = useState(null);
  const [rentSavingsStats, setRentSavingsStats] = useState(null);
  const [referralInfo, setReferralInfo] = useState(null);
  const [referralLoading, setReferralLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState(null);
  const [landlordWallet, setLandlordWallet] = useState(null);
  const [landlordPropertyFee, setLandlordPropertyFee] = useState(null);
  const [withdrawHistory, setWithdrawHistory] = useState([]);
  const [showFundModal, setShowFundModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [fundLoading, setFundLoading] = useState(false);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({
    amount: '',
    bank_name: '',
    account_number: '',
    account_name: '',
  });

  const isTenant = user?.user_type === 'tenant';
  const isLandlord = user?.user_type === 'landlord';
  const reviewStatus = getReviewStatus(user);
  const lawyerInviteSummary = useMemo(() => getLawyerInviteSummary(stats), [stats]);
  const propertyLocationCards = paidPropertyLocations.length
    ? paidPropertyLocations
    : [{
        property_id: 'pending-rent-location-card',
        title: 'Property location',
        payment_type: 'rent_required',
        rent_paid: false,
      }];
  const hasActivePropertyLocation = propertyLocationCards.some(canOpenPropertyMap);

  const loadWalletData = async () => {
    if (!isTenant && !isLandlord) return;

    try {
      if (isTenant) {
        const balanceRes = await paymentService.getWalletBalance();
        if (balanceRes?.success) {
          setWalletBalance(balanceRes.data?.balance ?? null);
        }
      } else {
        const balanceRes = await paymentService.getLandlordWalletBalance();
        if (balanceRes?.success) {
          setLandlordWallet(balanceRes.data || null);
          if (balanceRes.data?.property_fee) {
            setLandlordPropertyFee(balanceRes.data.property_fee);
          }
        }
        const feeRes = await paymentService.getLandlordPropertyFeeStatus();
        if (feeRes?.success) {
          setLandlordPropertyFee(feeRes.data || null);
        }
      }

      const historyRes = await paymentService.getWalletWithdrawals();
      if (historyRes?.success) {
        setWithdrawHistory(pickList(historyRes, ['data']));
      }
    } catch (error) {
      // Non-blocking wallet refresh
    }
  };

  const loadDashboard = async ({ refresh = false } = {}) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const dashboardRequests = [
        isTenant ? dashboardService.getTenantStats() : dashboardService.getLandlordStats(),
        isTenant
          ? dashboardService.getTenantRecentActivities()
          : dashboardService.getLandlordRecentActivities(),
      ];

      if (isTenant) {
        dashboardRequests.push(dashboardService.getTenantPaidPropertyLocations());
      }

      const [statsRes, activitiesRes, paidLocationsRes] = await Promise.all(dashboardRequests);

      setStats(pickObject(statsRes, ['data']) || {});
      setActivities(pickList(activitiesRes, ['data']));
      setPaidPropertyLocations(isTenant ? pickList(paidLocationsRes, ['data']) : []);

      if (isTenant || isLandlord) {
        setReferralLoading(true);
        try {
          const referralRes = await referralService.getMyReferral();
          if (referralRes?.success) {
            setReferralInfo(referralRes.data || null);
          } else {
            setReferralInfo(null);
          }
        } catch (error) {
          setReferralInfo(null);
        } finally {
          setReferralLoading(false);
        }
      }

      if (isTenant) {
        const [transportRes, rentSavingsRes] = await Promise.all([
          transportationService.getTenantStats(),
          rentSavingsService.getSummary(),
        ]);
        if (transportRes?.success) {
          setTransportStats(transportRes.data || null);
        }
        if (rentSavingsRes?.success) {
          setRentSavingsStats(rentSavingsRes.data || null);
        }
      }

      await loadWalletData();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load dashboard'),
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [user?.user_type]);

  const getRentSavingsValue = () => {
    if (!rentSavingsStats) return '0 plans';

    const activePlans = Number(rentSavingsStats.active_plans || 0);
    const totalSaved = Number(rentSavingsStats.total_saved_across_plans || 0);

    if (totalSaved > 0) {
      return `₦${totalSaved.toLocaleString()}`;
    }

    return `${activePlans} ${activePlans === 1 ? 'plan' : 'plans'}`;
  };

  const openFundModal = async () => {
    setShowFundModal(true);
    await loadWalletData();
  };

  const openWithdrawModal = async () => {
    setWithdrawForm({
      amount: '',
      bank_name: '',
      account_number: '',
      account_name: '',
    });
    setShowWithdrawModal(true);
    await loadWalletData();
  };

  const handleFundWallet = async (amountInput) => {
    if (!amountInput || Number(amountInput) < 100) {
      Toast.show({
        type: 'error',
        text1: 'Invalid amount',
        text2: 'Minimum funding amount is ₦100',
      });
      return;
    }

    setFundLoading(true);
    try {
      const response = await paymentService.fundWallet(Number(amountInput));
      const paymentUrl = response?.data?.authorization_url;

      if (response?.success && paymentUrl) {
        await Linking.openURL(paymentUrl);
        Toast.show({
          type: 'info',
          text1: 'Complete payment',
          text2: 'Finish Paystack in your browser, then return to refresh your wallet.',
        });
        setShowFundModal(false);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Payment failed',
          text2: response?.message || 'Could not initialize wallet funding',
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Payment failed',
        text2: getErrorMessage(error, 'Could not initialize wallet funding'),
      });
    } finally {
      setFundLoading(false);
    }
  };

  const handleWithdrawSubmit = async (consentChecked) => {
    if (!consentChecked) {
      Toast.show({
        type: 'error',
        text1: 'Confirmation required',
        text2: 'Confirm your bank details before submitting.',
      });
      return;
    }

    if (
      !withdrawForm.amount ||
      !withdrawForm.bank_name ||
      !withdrawForm.account_number ||
      !withdrawForm.account_name
    ) {
      Toast.show({
        type: 'error',
        text1: 'Incomplete form',
        text2: 'All withdrawal fields are required.',
      });
      return;
    }

    setWithdrawLoading(true);
    try {
      const response = await paymentService.withdrawFromWallet(withdrawForm);
      if (response?.success) {
        Toast.show({
          type: 'success',
          text1: 'Withdrawal submitted',
          text2: 'Your withdrawal request was submitted successfully.',
        });
        setShowWithdrawModal(false);
        await loadDashboard();
      } else {
        Toast.show({
          type: 'error',
          text1: 'Withdrawal failed',
          text2: response?.message || 'Could not submit withdrawal',
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Withdrawal failed',
        text2: getErrorMessage(error, 'Could not submit withdrawal'),
      });
    } finally {
      setWithdrawLoading(false);
    }
  };

  const shareReferralInvite = async () => {
    if (!referralInfo?.invite_url) return;

    const shareText = `Join RentalHub NG with my invite link and I earn ₦${Number(
      referralInfo.reward_amount || 1000
    ).toLocaleString()} subscription credit when your registration is complete.`;

    try {
      await Share.share({
        title: 'RentalHub NG invite',
        message: `${shareText}\n${referralInfo.invite_url}`,
        url: referralInfo.invite_url,
      });
    } catch (error) {
      if (error?.message !== 'User did not share') {
        Toast.show({
          type: 'error',
          text1: 'Share failed',
          text2: 'Could not open share sheet',
        });
      }
    }
  };

  const openWhatsappReferralShare = () => {
    if (!referralInfo?.invite_url) return;

    const shareText = `Join RentalHub NG with my invite link: ${referralInfo.invite_url}`;
    Linking.openURL(`https://wa.me/?text=${encodeURIComponent(shareText)}`);
  };

  const openPropertyInGoogleMaps = async (property) => {
    if (!canOpenPropertyMap(property)) {
      Toast.show({
        type: 'info',
        text1: 'Location locked',
        text2: 'This card becomes active after rent payment is confirmed.',
      });
      return;
    }

    const mapsUrl = buildGoogleMapsUrl(property);

    if (!mapsUrl) {
      Toast.show({
        type: 'info',
        text1: 'Location unavailable',
        text2: 'No map location is available for this property yet.',
      });
      return;
    }

    try {
      await Linking.openURL(mapsUrl);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Could not open Google Maps',
        text2: 'Please try again from your phone.',
      });
    }
  };

  const verificationBanner =
    reviewStatus === 'pending'
      ? {
          icon: 'time-outline',
          title: 'Verification submitted',
          description: 'Your passport was submitted and is waiting for review.',
          actionLabel: 'View verification status',
          colors: {
            background: '#eff6ff',
            border: '#bfdbfe',
            icon: '#2563eb',
            title: '#1d4ed8',
            text: '#1d4ed8',
          },
        }
      : reviewStatus === 'rejected'
        ? {
            icon: 'close-circle-outline',
            title: 'Verification rejected',
            description: 'Your verification was rejected. Review your details and upload a new live passport photo.',
            actionLabel: 'Fix verification',
            colors: {
              background: '#fef2f2',
              border: '#fecaca',
              icon: '#dc2626',
              title: '#991b1b',
              text: '#b91c1c',
            },
          }
        : !user?.identity_verified
          ? {
              icon: 'alert-circle-outline',
              title: 'Complete identity verification',
              description: 'Upload your live passport photo to unlock the full platform workflow.',
              actionLabel: 'Open profile',
              colors: {
                background: '#fefce8',
                border: '#fde68a',
                icon: '#ca8a04',
                title: '#854d0e',
                text: '#a16207',
              },
            }
          : null;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0284c7" />
      </View>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadDashboard({ refresh: true })}
          colors={[colors.blue]}
          tintColor={colors.blue}
        />
      }>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.topEyebrow}>MY HUB</Text>
          <Text style={styles.topTitle}>Hello, {String(user?.full_name || 'there').split(' ')[0]}</Text>
        </View>
        <View style={styles.topActions}>
          <TouchableOpacity
            accessibilityLabel="Open notifications"
            onPress={() => navigation.navigate('Notifications')}
            style={styles.topButton}>
            <Icon name="notifications-outline" size={21} color={colors.navy} />
            {Number(stats.unread_notifications || stats.unread_messages || 0) > 0 ? (
              <View style={styles.unreadDot} />
            ) : null}
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityLabel="Open profile"
            onPress={() => navigation.navigate('Profile')}
            style={styles.avatar}>
            <Text style={styles.avatarText}>
              {String(user?.full_name || 'U').trim().charAt(0).toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.subtitle}>Everything about your rental journey, in one place.</Text>

      {verificationBanner ? (
        <StatusBanner
          {...verificationBanner}
          onPress={() => navigation.navigate('VerificationStatus')}
        />
      ) : null}

      <StatusBanner
        {...lawyerInviteSummary}
        onPress={() => navigation.navigate('Profile')}
      />

      {isTenant ? (
        <StatusBanner
          icon="checkmark-circle-outline"
          title="Pay per property details"
          description="Save properties first, then pay to unlock each property's full details and landlord contact."
          actionLabel="Browse properties"
          colors={{
            background: '#eff6ff',
            border: '#bfdbfe',
            icon: '#2563eb',
            title: '#1d4ed8',
            text: '#1d4ed8',
          }}
          onPress={() => navigation.navigate('PropertyList')}
        />
      ) : null}

      {isTenant ? (
        <View
          style={[
            styles.locationSection,
            !hasActivePropertyLocation && styles.locationSectionLocked,
          ]}
        >
          <View style={styles.locationHeader}>
            <Icon
              name={hasActivePropertyLocation ? 'map-outline' : 'lock-closed-outline'}
              size={22}
              color={hasActivePropertyLocation ? '#047857' : '#64748b'}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.locationTitle}>Property Location</Text>
              <Text style={styles.locationHint}>
                {hasActivePropertyLocation
                  ? 'Tap any active property card to open its location in Google Maps.'
                  : 'This card becomes clickable after your rent payment is confirmed.'}
              </Text>
            </View>
          </View>

          {propertyLocationCards.map((property) => {
            const isActive = canOpenPropertyMap(property);

            return (
              <TouchableOpacity
                key={String(property.property_id)}
                style={[styles.locationCard, !isActive && styles.locationCardLocked]}
                activeOpacity={0.85}
                disabled={!isActive}
                onPress={() => openPropertyInGoogleMaps(property)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.locationCardTitle, !isActive && styles.locationCardTitleLocked]}>
                    {property.title || 'Property location'}
                  </Text>
                  <Text style={styles.locationAddress}>
                    {getPropertyMapAddress(property) ||
                      (isActive ? 'Location available' : 'Pay rent to activate Google Maps location')}
                  </Text>
                  <View style={styles.locationBadges}>
                    <Text style={[styles.locationBadge, !isActive && styles.locationBadgeLocked]}>
                      {isActive ? 'Rent paid' : 'Rent not paid'}
                    </Text>
                    {isActive ? (
                      <Text style={styles.locationBadgeAlt}>
                        {property.latitude && property.longitude ? 'Map pin ready' : 'Address search'}
                      </Text>
                    ) : (
                      <Text style={styles.locationBadgeWarning}>Locked until confirmed</Text>
                    )}
                  </View>
                </View>
                <Icon
                  name={isActive ? 'open-outline' : 'lock-closed-outline'}
                  size={22}
                  color={isActive ? '#047857' : '#94a3b8'}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}

      <View style={styles.grid}>
        {isTenant ? (
          <>
            <StatCard
              title="Saved Properties"
              value={stats.saved_properties_count}
              icon="heart-outline"
              onPress={() => navigation.navigate('SavedProperties')}
            />
            <StatCard
              title="Unlocked Details"
              value={stats.unlocked_properties_count}
              icon="lock-open-outline"
              onPress={() => navigation.navigate('PropertyList')}
            />
            <StatCard
              title="Unread Messages"
              value={stats.unread_messages}
              icon="mail-unread-outline"
              onPress={() => navigation.navigate('Messages')}
            />
            <StatCard
              title="Subscription"
              value={getTenantSubscriptionValue(stats)}
              icon="card-outline"
              onPress={() => navigation.navigate('Subscribe')}
            />
            <StatCard
              title="Transport Bookings"
              value={transportStats?.total_bookings || 0}
              icon="bus-outline"
              onPress={() => navigation.navigate('TransportationBookings')}
            />
            <StatCard
              title="Rent Savings"
              value={getRentSavingsValue()}
              icon="cash-outline"
              onPress={() => navigation.navigate('RentSavingsDashboard')}
            />
            <StatCard
              title="Wallet Balance"
              value={
                walletBalance !== null && walletBalance !== undefined
                  ? `₦${Number(walletBalance).toLocaleString()}`
                  : '—'
              }
              icon="wallet-outline"
              onPress={openWithdrawModal}
            />
          </>
        ) : (
          <>
            <StatCard
              title="Total Properties"
              value={stats.total_properties}
              icon="home-outline"
              onPress={() => navigation.navigate('MyProperties')}
            />
            <StatCard
              title="Available"
              value={stats.available_properties}
              icon="checkmark-circle-outline"
              onPress={() => navigation.navigate('MyProperties')}
            />
            <StatCard
              title="Pending Applications"
              value={stats.pending_applications}
              icon="documents-outline"
              onPress={() => navigation.navigate('Applications')}
            />
            <StatCard
              title="Unread Messages"
              value={stats.unread_messages}
              icon="mail-unread-outline"
              onPress={() => navigation.navigate('Messages')}
            />
            <StatCard
              title="Available to Withdraw"
              value={
                landlordWallet
                  ? `₦${Number(landlordWallet.available_to_withdraw || 0).toLocaleString()}`
                  : '—'
              }
              icon="wallet-outline"
              onPress={openWithdrawModal}
            />
            <StatCard
              title="Subscription"
              value={getTenantSubscriptionValue(stats)}
              icon="card-outline"
              onPress={() => navigation.navigate('Subscribe')}
            />
          </>
        )}
      </View>

      {isLandlord && landlordPropertyFee?.reserve_required &&
      Number(landlordPropertyFee?.amount_due || 0) > 0 ? (
        <StatusBanner
          icon="warning-outline"
          title="Property charges reserve active"
          description={`${landlordPropertyFee.fee_label || 'Landlord Property Charges'} reserve of ₦${Number(
            landlordPropertyFee.amount_due || 0
          ).toLocaleString()} is due on ${new Date(landlordPropertyFee.due_at).toLocaleDateString()}.`}
          colors={{
            background: '#fffbeb',
            border: '#fde68a',
            icon: '#d97706',
            title: '#92400e',
            text: '#b45309',
          }}
        />
      ) : null}

      {referralInfo?.enabled && referralInfo.invite_url ? (
        <View style={styles.referralCard}>
          <View style={styles.referralHeader}>
            <Icon name="gift-outline" size={24} color="#059669" />
            <View style={{ flex: 1 }}>
              <Text style={styles.referralEyebrow}>Invite & Earn</Text>
              <Text style={styles.referralTitle}>
                Earn ₦{Number(referralInfo.reward_amount || 1000).toLocaleString()} per successful invite
              </Text>
              {referralInfo.referral_code ? (
                <Text style={styles.referralCode}>{referralInfo.referral_code}</Text>
              ) : null}
            </View>
          </View>

          <View style={styles.referralStatsRow}>
            <View style={styles.referralStat}>
              <Text style={styles.referralStatLabel}>Referrals</Text>
              <Text style={styles.referralStatValue}>
                {Number(referralInfo.total_referrals || 0).toLocaleString()}
              </Text>
            </View>
            <View style={styles.referralStat}>
              <Text style={styles.referralStatLabel}>Earned</Text>
              <Text style={styles.referralStatValue}>
                ₦{Number(referralInfo.total_earned || 0).toLocaleString()}
              </Text>
            </View>
            <View style={styles.referralStat}>
              <Text style={styles.referralStatLabel}>Credit</Text>
              <Text style={styles.referralStatValue}>
                ₦{Number(referralInfo.subscription_credit_balance || 0).toLocaleString()}
              </Text>
            </View>
          </View>

          <Text style={styles.referralLinkLabel}>Invite link</Text>
          <TextInput
            style={styles.referralLinkInput}
            value={referralInfo.invite_url}
            editable={false}
            selectTextOnFocus
          />

          <View style={styles.referralActions}>
            <TouchableOpacity style={styles.referralBtnPrimary} onPress={shareReferralInvite}>
              <Text style={styles.referralBtnPrimaryText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.referralBtnSecondary} onPress={openWhatsappReferralShare}>
              <Text style={styles.referralBtnSecondaryText}>WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : referralLoading ? (
        <Text style={styles.referralLoading}>Loading invite link...</Text>
      ) : null}

      <DashboardSection title="Property tools">
        <ActionRow
          title="Browse Properties"
          subtitle="Find listings and review property details."
          icon="search-outline"
          onPress={() => navigation.navigate('PropertyList')}
        />
        {isTenant ? (
          <ActionRow
            title="Saved Properties"
            subtitle="Return to your shortlist."
            icon="heart-outline"
            onPress={() => navigation.navigate('SavedProperties')}
          />
        ) : (
          <ActionRow
            title="Add Property"
            subtitle="Create and publish a new listing."
            icon="add-circle-outline"
            onPress={() => navigation.navigate('AddProperty')}
          />
        )}
      </DashboardSection>

      {isTenant ? (
        <DashboardSection title="Home services">
          <ActionRow
            title="Rent Savings"
            subtitle="Create goals and track your rent plan."
            icon="cash-outline"
            onPress={() => navigation.navigate('RentSavingsDashboard')}
          />
          <ActionRow
            title="Book Transportation"
            subtitle="Schedule moving and logistics services."
            icon="bus-outline"
            onPress={() => navigation.navigate('TransportationBooking')}
          />
          <ActionRow
            title="Fumigation & Cleaning"
            subtitle="Book trusted property care services."
            icon="sparkles-outline"
            onPress={() => navigation.navigate('FumigationCleaningBooking')}
          />
        </DashboardSection>
      ) : null}

      <DashboardSection title="Money">
        <ActionRow
          title="Payment History"
          subtitle="Review payments and transaction references."
          icon="receipt-outline"
          onPress={() => navigation.navigate('PaymentHistory')}
        />
        {(isTenant || isLandlord) ? (
          <>
            <ActionRow
              title="Fund Wallet"
              subtitle="Top up securely through Paystack."
              icon="add-circle-outline"
              onPress={openFundModal}
            />
            <ActionRow
              title="Withdraw Funds"
              subtitle="Transfer your available balance."
              icon="wallet-outline"
              onPress={openWithdrawModal}
            />
          </>
        ) : null}
      </DashboardSection>

      <DashboardSection title="More">
        <ActionRow
          title="Careers"
          subtitle="View openings and submit applications."
          icon="briefcase-outline"
          onPress={() => navigation.navigate('Careers')}
        />
        <ActionRow
          title="Additional web tools"
          subtitle="Temporary access to features still being converted to native screens."
          icon="globe-outline"
          badge="Legacy"
          onPress={() => navigation.navigate('WebFeatures')}
        />
      </DashboardSection>

      {(isTenant || isLandlord) ? (
        <TenancyGracePanel userType={user?.user_type} />
      ) : null}

      <Text style={styles.sectionTitle}>Recent Activities</Text>
      {activities.length === 0 ? (
        <Text style={styles.emptyText}>No recent activities.</Text>
      ) : (
        activities.map((item) => (
          <View key={`${item.type}-${item.id}`} style={styles.activityItem}>
            <Text style={styles.activityType}>{String(item.type || 'activity').toUpperCase()}</Text>
            <Text style={styles.activityText}>
              {item.property_title || item.message_text || 'Activity update'}
            </Text>
            <Text style={styles.activityDate}>
              {item.activity_date ? new Date(item.activity_date).toLocaleString() : ''}
            </Text>
          </View>
        ))
      )}

      <AdSpace placement="dashboard_inline" />

      <WalletFundModal
        visible={showFundModal}
        onClose={() => setShowFundModal(false)}
        onSubmit={handleFundWallet}
        loading={fundLoading}
        userType={user?.user_type}
        walletBalance={walletBalance}
        landlordWallet={landlordWallet}
        onSwitchToWithdraw={() => {
          setShowFundModal(false);
          openWithdrawModal();
        }}
      />

      <WalletWithdrawModal
        visible={showWithdrawModal}
        onClose={() => setShowWithdrawModal(false)}
        onSubmit={handleWithdrawSubmit}
        loading={withdrawLoading}
        userType={user?.user_type}
        walletBalance={walletBalance}
        landlordWallet={landlordWallet}
        propertyFeeReserve={landlordPropertyFee}
        withdrawForm={withdrawForm}
        setWithdrawForm={setWithdrawForm}
        withdrawHistory={withdrawHistory}
        onSwitchToFund={() => {
          setShowWithdrawModal(false);
          openFundModal();
        }}
      />
    </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 18, paddingBottom: 34 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  topEyebrow: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: 9,
    letterSpacing: 1.3,
  },
  topTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 28,
    letterSpacing: -0.8,
    marginTop: 3,
  },
  topActions: {
    flexDirection: 'row',
    gap: 9,
  },
  topButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 21,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    position: 'relative',
    width: 42,
  },
  unreadDot: {
    backgroundColor: colors.gold,
    borderColor: colors.white,
    borderRadius: 5,
    borderWidth: 2,
    height: 10,
    position: 'absolute',
    right: 6,
    top: 6,
    width: 10,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.navy,
    borderRadius: 21,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  avatarText: {
    color: colors.white,
    fontFamily: typography.bold,
    fontSize: 16,
  },
  title: { fontSize: 26, fontFamily: typography.bold, color: colors.ink },
  subtitle: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    marginBottom: 18,
    marginTop: 7,
  },
  banner: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 14,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  bannerBody: { flex: 1 },
  bannerTitle: { fontFamily: typography.bold, fontSize: 14 },
  bannerText: { fontFamily: typography.regular, fontSize: 12, marginTop: 4, lineHeight: 18 },
  bannerAction: { marginTop: 7, fontFamily: typography.semibold, fontSize: 12 },
  locationSection: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 12,
  },
  locationSectionLocked: { borderColor: '#e2e8f0' },
  locationHeader: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 10 },
  locationTitle: { color: '#0f172a', fontSize: 16, fontWeight: '800' },
  locationHint: { color: '#475569', marginTop: 3, lineHeight: 18 },
  locationCard: {
    borderWidth: 1,
    borderColor: '#d1fae5',
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  locationCardLocked: {
    borderColor: '#e2e8f0',
    backgroundColor: '#f1f5f9',
    opacity: 0.82,
  },
  locationCardTitle: { color: '#0f172a', fontWeight: '800' },
  locationCardTitleLocked: { color: '#64748b' },
  locationAddress: { color: '#475569', marginTop: 4, lineHeight: 18 },
  locationBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  locationBadge: {
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: '#dcfce7',
    color: '#15803d',
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 11,
    fontWeight: '800',
  },
  locationBadgeLocked: { backgroundColor: '#e2e8f0', color: '#475569' },
  locationBadgeAlt: {
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 11,
    fontWeight: '800',
  },
  locationBadgeWarning: {
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: '#fef3c7',
    color: '#b45309',
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 11,
    fontWeight: '800',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    minHeight: 112,
    width: '48%',
    justifyContent: 'space-between',
    ...shadows.soft,
  },
  statTitle: { color: colors.muted, fontFamily: typography.medium, fontSize: 11 },
  statValue: { fontSize: 21, fontFamily: typography.bold, color: colors.ink, marginTop: 5 },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
    gap: 10,
  },
  quickBtn: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 88,
    padding: 13,
    width: '48%',
  },
  quickTitle: { color: colors.navy, fontFamily: typography.bold, fontSize: 13 },
  quickText: { marginTop: 5, color: colors.muted, fontFamily: typography.regular, fontSize: 11, lineHeight: 16 },
  sectionTitle: {
    marginTop: 24,
    marginBottom: 10,
    fontSize: 19,
    fontFamily: typography.bold,
    color: colors.ink,
  },
  emptyText: { color: '#64748b' },
  activityItem: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 8,
  },
  activityType: { color: '#0284c7', fontSize: 11, fontWeight: '700' },
  activityText: { marginTop: 4, color: '#0f172a', fontWeight: '600' },
  activityDate: { marginTop: 4, color: '#64748b', fontSize: 12 },
  referralCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  referralHeader: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  referralEyebrow: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  referralTitle: { color: '#0f172a', fontSize: 17, fontWeight: '800', marginTop: 2 },
  referralCode: {
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#ecfdf5',
    color: '#047857',
    fontWeight: '700',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  referralStatsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  referralStat: {
    flex: 1,
    borderLeftWidth: 2,
    borderLeftColor: '#6ee7b7',
    paddingLeft: 8,
  },
  referralStatLabel: { color: '#64748b', fontSize: 11, fontWeight: '600' },
  referralStatValue: { color: '#0f172a', fontSize: 16, fontWeight: '800', marginTop: 2 },
  referralLinkLabel: { marginTop: 12, color: '#334155', fontWeight: '700', fontSize: 13 },
  referralLinkInput: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#d1fae5',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: '#0f172a',
    fontSize: 12,
  },
  referralActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  referralBtnPrimary: {
    flex: 1,
    backgroundColor: '#0284c7',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  referralBtnPrimaryText: { color: '#fff', fontWeight: '800' },
  referralBtnSecondary: {
    flex: 1,
    backgroundColor: '#ecfdf5',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  referralBtnSecondaryText: { color: '#047857', fontWeight: '800' },
  referralLoading: { color: '#64748b', marginBottom: 12 },
});

export default DashboardScreen;
