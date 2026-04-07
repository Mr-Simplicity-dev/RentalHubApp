import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import { AuthContext } from '../../context/AuthContext';
import { dashboardService } from '../../services/dashboardService';
import { getErrorMessage, getReviewStatus, pickList, pickObject } from '../../utils/http';

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

  const isTenant = user?.user_type === 'tenant';
  const reviewStatus = getReviewStatus(user);
  const lawyerInviteSummary = useMemo(() => getLawyerInviteSummary(stats), [stats]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [statsRes, activitiesRes] = await Promise.all([
        isTenant ? dashboardService.getTenantStats() : dashboardService.getLandlordStats(),
        isTenant
          ? dashboardService.getTenantRecentActivities()
          : dashboardService.getLandlordRecentActivities(),
      ]);

      setStats(pickObject(statsRes, ['data']) || {});
      setActivities(pickList(activitiesRes, ['data']));
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
          onPress={() => navigation.navigate('Profile')}
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
          </>
        )}
      </View>

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

        <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('PaymentHistory')}>
          <Text style={styles.quickTitle}>Payment History</Text>
          <Text style={styles.quickText}>Review your payments and transaction references</Text>
        </TouchableOpacity>
      </View>

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
});

export default DashboardScreen;
