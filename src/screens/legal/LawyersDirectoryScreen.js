import React, { useEffect, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/Ionicons';
import { legalService } from '../../services/legalService';
import { getErrorMessage, pickList } from '../../utils/http';
import { colors, radius, typography } from '../../theme';
import {
  ActionRow,
  DashboardHero,
  DashboardNotice,
  DashboardScreen,
  DashboardSection,
} from '../../components/dashboard/DashboardKit';

const LawyersDirectoryScreen = ({ navigation }) => {
  const [lawyers, setLawyers] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const loadDirectory = async () => {
    setLoading(true);
    try {
      const response = await legalService.getPublicLawyerDirectory();
      setLawyers(pickList(response, ['data']));
      setMeta(response?.meta || null);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Directory unavailable',
        text2: getErrorMessage(error, 'Could not load lawyers'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDirectory();
  }, []);

  return (
    <DashboardScreen refreshing={loading} onRefresh={loadDirectory}>
      <DashboardHero
        eyebrow="LEGAL DIRECTORY"
        title="Platform lawyers"
        subtitle="Browse RentalHub platform lawyers and legal protection options from the app."
        icon="scale-outline"
        onRefresh={loadDirectory}
      />

      <DashboardNotice
        title="Directory access"
        message={
          meta?.unlock_amount
            ? `Public details are visible now. Full contact access may require a ₦${Number(meta.unlock_amount).toLocaleString()} unlock.`
            : 'Public details are visible now. Full contact access may require unlock.'
        }
      />

      <DashboardSection title="Legal help">
        <ActionRow
          title="Legal Support Coverage"
          subtitle="Check coverage and submit a legal assistance request."
          icon="shield-checkmark-outline"
          onPress={() => navigation.navigate('LegalSupport')}
        />
      </DashboardSection>

      <DashboardSection title="Available lawyers">
        {loading && !lawyers.length ? <ActivityIndicator color={colors.blue} /> : null}
        {!loading && !lawyers.length ? (
          <Text style={styles.empty}>No platform lawyers are listed yet.</Text>
        ) : null}
        {lawyers.map((lawyer, index) => (
          <View key={String(lawyer.id || lawyer.email || index)} style={styles.card}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {String(lawyer.full_name || lawyer.name || 'L').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.cardCopy}>
              <Text style={styles.name}>{lawyer.full_name || lawyer.name || 'Platform Lawyer'}</Text>
              <Text style={styles.meta}>
                {[lawyer.state, lawyer.city, lawyer.lga].filter(Boolean).join(' · ') || 'RentalHub legal network'}
              </Text>
              <Text style={styles.bio} numberOfLines={3}>
                {lawyer.bio || lawyer.specialization || lawyer.experience || 'Verified legal support for tenancy and property matters.'}
              </Text>
              <View style={styles.badgeRow}>
                <View style={styles.badge}>
                  <Icon name="checkmark-circle" size={13} color={colors.success} />
                  <Text style={styles.badgeText}>Platform listed</Text>
                </View>
              </View>
            </View>
          </View>
        ))}
      </DashboardSection>
    </DashboardScreen>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.navy,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  avatarText: {
    color: colors.white,
    fontFamily: typography.bold,
    fontSize: 18,
  },
  cardCopy: { flex: 1 },
  name: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 15,
  },
  meta: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 13,
    marginTop: 3,
  },
  bio: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  badgeRow: { flexDirection: 'row', marginTop: 10 },
  badge: {
    alignItems: 'center',
    backgroundColor: '#ECFDF3',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    color: '#166534',
    fontFamily: typography.semibold,
    fontSize: 13,
  },
  empty: {
    color: colors.muted,
    fontFamily: typography.regular,
    lineHeight: 20,
  },
});

export default LawyersDirectoryScreen;
