import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import { AuthContext } from '../../context/AuthContext';
import WalletFundModal from '../../components/dashboard/WalletFundModal';
import WalletWithdrawModal from '../../components/dashboard/WalletWithdrawModal';
import { dashboardService } from '../../services/dashboardService';
import { paymentService } from '../../services/paymentService';
import { referralService } from '../../services/referralService';
import { rentSavingsService } from '../../services/rentSavingsService';
import { transportationService } from '../../services/transportationService';
import { getErrorMessage, getReviewStatus, pickList, pickObject } from '../../utils/http';
import TenancyGracePanel from '../../components/dashboard/TenancyGracePanel';

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

  const loadDashboard = async () => {
    setLoading(true);
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
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Welcome back, {user?.full_name || 'User'}</Text>
      <Text style={styles.subtitle}>Manage your account and rental workflow</Text>

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

      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('PropertyList')}>
          <Text style={styles.quickTitle}>Browse Properties</Text>
          <Text style={styles.quickText}>Find listings and review details</Text>
        </TouchableOpacity>

        {isTenant ? (
          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('SavedProperties')}>
            <Text style={styles.quickTitle}>Saved Properties</Text>
            <Text style={styles.quickText}>Review your shortlist</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('AddProperty')}>
            <Text style={styles.quickTitle}>Add Property</Text>
            <Text style={styles.quickText}>Create a new listing</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('WebFeatures')}>
          <Text style={styles.quickTitle}>Open All Web Features</Text>
          <Text style={styles.quickText}>Access every web module from your phone</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('Careers')}>
          <Text style={styles.quickTitle}>Careers</Text>
          <Text style={styles.quickText}>View openings and submit applications</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('PaymentHistory')}>
          <Text style={styles.quickTitle}>Payment History</Text>
          <Text style={styles.quickText}>Review your payments and transaction references</Text>
        </TouchableOpacity>

        {isTenant ? (
          <>
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => navigation.navigate('RentSavingsDashboard')}
            >
              <Text style={styles.quickTitle}>Rent Savings</Text>
              <Text style={styles.quickText}>Create goals and track rent savings plans</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => navigation.navigate('TransportationBooking')}
            >
              <Text style={styles.quickTitle}>Book Transportation</Text>
              <Text style={styles.quickText}>Schedule moving and logistics services</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => navigation.navigate('FumigationCleaningBooking')}
            >
              <Text style={styles.quickTitle}>Fumigation & Cleaning</Text>
              <Text style={styles.quickText}>Book cleaning or fumigation for your property</Text>
            </TouchableOpacity>
          </>
        ) : null}

        {(isTenant || isLandlord) ? (
          <>
            <TouchableOpacity style={styles.quickBtn} onPress={openFundModal}>
              <Text style={styles.quickTitle}>Fund Wallet</Text>
              <Text style={styles.quickText}>Top up your wallet via Paystack</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickBtn} onPress={openWithdrawModal}>
              <Text style={styles.quickTitle}>Withdraw Funds</Text>
              <Text style={styles.quickText}>Transfer available balance to your bank account</Text>
            </TouchableOpacity>
          </>
        ) : null}
      </View>

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
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 30 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '800', color: '#0f172a', textAlign: 'center' },
  subtitle: { marginTop: 6, marginBottom: 14, color: '#64748b', textAlign: 'center' },
  banner: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  bannerBody: { flex: 1 },
  bannerTitle: { fontWeight: '800', fontSize: 15 },
  bannerText: { marginTop: 4, lineHeight: 18 },
  bannerAction: { marginTop: 6, fontWeight: '700' },
  locationSection: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 14,
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
  grid: { gap: 10 },
  statCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statTitle: { color: '#64748b', fontSize: 13 },
  statValue: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginTop: 4 },
  quickActions: { marginTop: 14, gap: 10 },
  quickBtn: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dbeafe',
    padding: 12,
  },
  quickTitle: { color: '#1e40af', fontWeight: '700' },
  quickText: { marginTop: 2, color: '#475569', fontSize: 12 },
  sectionTitle: { marginTop: 18, marginBottom: 8, fontSize: 18, fontWeight: '800', color: '#0f172a' },
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
