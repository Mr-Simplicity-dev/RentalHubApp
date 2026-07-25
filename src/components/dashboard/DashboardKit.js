import React from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors, radius, shadows, typography } from '../../theme';
import { useAccessibilityPreferences } from '../../hooks/useAccessibilityPreferences';

import AppText from '../../components/common/AppText';
export const DashboardScreen = ({
  children,
  refreshing = false,
  onRefresh,
  contentContainerStyle,
}) => (
  <SafeAreaView edges={['top']} style={styles.safeArea}>
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, contentContainerStyle]}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.blue}
            colors={[colors.blue]}
          />
        ) : undefined
      }
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  </SafeAreaView>
);

export const DashboardHero = ({
  eyebrow,
  title,
  subtitle,
  icon = 'grid-outline',
  onRefresh,
}) => {
  const { scaleFont, hitSlop } = useAccessibilityPreferences();

  return (
    <View style={styles.hero}>
      <View style={styles.heroTop}>
        <View style={styles.heroIcon}>
          <Icon name={icon} size={23} color={colors.gold} />
        </View>
        {onRefresh ? (
          <TouchableOpacity
            accessibilityLabel="Refresh dashboard"
            accessibilityRole="button"
            hitSlop={hitSlop}
            style={styles.refreshButton}
            onPress={onRefresh}
          >
            <Icon name="refresh" size={19} color={colors.white} />
          </TouchableOpacity>
        ) : null}
      </View>
      <AppText style={[styles.eyebrow, { fontSize: scaleFont(10) }]}>{eyebrow}</AppText>
      <AppText style={[styles.heroTitle, { fontSize: scaleFont(27), lineHeight: scaleFont(33) }]}>{title}</AppText>
      <AppText style={[styles.heroSubtitle, { fontSize: scaleFont(13), lineHeight: scaleFont(20) }]}>{subtitle}</AppText>
    </View>
  );
};

export const MetricGrid = ({ children }) => (
  <View style={styles.metricGrid}>{children}</View>
);

export const MetricCard = ({
  label,
  value,
  icon = 'analytics-outline',
  color = colors.blue,
  onPress,
}) => {
  const Container = onPress ? TouchableOpacity : View;
  const { scaleFont, hitSlop } = useAccessibilityPreferences();

  return (
    <Container
      accessibilityRole={onPress ? 'button' : undefined}
      hitSlop={onPress ? hitSlop : undefined}
      style={styles.metricCard}
      onPress={onPress}
    >
      <View style={[styles.metricIcon, { backgroundColor: `${color}16` }]}>
        <Icon name={icon} size={18} color={color} />
      </View>
      <AppText numberOfLines={1} style={[styles.metricLabel, { fontSize: scaleFont(11) }]}>{label}</AppText>
      <AppText numberOfLines={1} adjustsFontSizeToFit style={[styles.metricValue, { fontSize: scaleFont(22) }]}>{value}</AppText>
    </Container>
  );
};

export const DashboardSection = ({ title, subtitle, children }) => {
  const { scaleFont } = useAccessibilityPreferences();

  return (
    <View style={styles.section}>
      <AppText style={[styles.sectionTitle, { fontSize: scaleFont(18) }]}>{title}</AppText>
      {subtitle ? <AppText style={[styles.sectionSubtitle, { fontSize: scaleFont(12), lineHeight: scaleFont(18) }]}>{subtitle}</AppText> : null}
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
};

export const ActionRow = ({
  title,
  subtitle,
  icon = 'arrow-forward-circle-outline',
  onPress,
  badge,
}) => (
  <ActionRowInner title={title} subtitle={subtitle} icon={icon} onPress={onPress} badge={badge} />
);

const ActionRowInner = ({ title, subtitle, icon, onPress, badge }) => {
  const { scaleFont, hitSlop } = useAccessibilityPreferences();

  return (
    <TouchableOpacity
      accessibilityLabel={`${title}${subtitle ? `. ${subtitle}` : ''}`}
      accessibilityRole="button"
      hitSlop={hitSlop}
      style={styles.actionRow}
      onPress={onPress}
    >
      <View style={styles.actionIcon}>
        <Icon name={icon} size={21} color={colors.blue} />
      </View>
      <View style={styles.actionCopy}>
        <View style={styles.actionTitleRow}>
          <AppText style={[styles.actionTitle, { fontSize: scaleFont(14) }]}>{title}</AppText>
          {badge ? <AppText style={[styles.actionBadge, { fontSize: scaleFont(10) }]}>{badge}</AppText> : null}
        </View>
        {subtitle ? <AppText style={[styles.actionSubtitle, { fontSize: scaleFont(12), lineHeight: scaleFont(18) }]}>{subtitle}</AppText> : null}
      </View>
      <Icon name="chevron-forward" size={18} color={colors.muted} />
    </TouchableOpacity>
  );
};

export const DashboardNotice = ({ title, message, variant = 'info' }) => {
  const warning = variant === 'warning';
  const { scaleFont } = useAccessibilityPreferences();

  return (
    <View style={[styles.notice, warning && styles.noticeWarning]}>
      <Icon
        name={warning ? 'alert-circle-outline' : 'information-circle-outline'}
        size={21}
        color={warning ? '#92400E' : colors.blue}
      />
      <View style={styles.noticeCopy}>
        <AppText style={[styles.noticeTitle, warning && styles.noticeTitleWarning, { fontSize: scaleFont(13) }]}>{title}</AppText>
        <AppText style={[styles.noticeMessage, warning && styles.noticeMessageWarning, { fontSize: scaleFont(12), lineHeight: scaleFont(18) }]}>{message}</AppText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 40,
  },
  hero: {
    backgroundColor: colors.navy,
    borderRadius: radius.lg,
    padding: 22,
    marginBottom: 16,
    ...shadows.soft,
  },
  heroTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  heroIcon: {
    alignItems: 'center',
    backgroundColor: colors.navySoft,
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  refreshButton: {
    alignItems: 'center',
    backgroundColor: colors.navySoft,
    borderRadius: 19,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  eyebrow: {
    color: colors.gold,
    fontFamily: typography.semibold,
    fontSize: 13,
    letterSpacing: 1.25,
  },
  heroTitle: {
    color: colors.white,
    fontFamily: typography.bold,
    fontSize: 24,
    lineHeight: 33,
    marginTop: 7,
  },
  heroSubtitle: {
    color: '#B9C9E5',
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 7,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 6,
  },
  metricCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    minHeight: 124,
    padding: 14,
    width: '48.4%',
  },
  metricIcon: {
    alignItems: 'center',
    borderRadius: 10,
    height: 34,
    justifyContent: 'center',
    marginBottom: 11,
    width: 34,
  },
  metricLabel: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 13,
  },
  metricValue: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 24,
    marginTop: 5,
  },
  section: {
    marginTop: 18,
  },
  sectionTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 18,
  },
  sectionSubtitle: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  sectionBody: {
    gap: 9,
    marginTop: 11,
  },
  actionRow: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 70,
    padding: 13,
  },
  actionIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderRadius: 12,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  actionCopy: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  actionTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  actionTitle: {
    color: colors.ink,
    flexShrink: 1,
    fontFamily: typography.semibold,
    fontSize: 14,
  },
  actionSubtitle: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 16,
    marginTop: 3,
  },
  actionBadge: {
    backgroundColor: colors.surfaceBlue,
    borderRadius: radius.pill,
    color: colors.blue,
    fontFamily: typography.semibold,
    fontSize: 13,
    marginLeft: 8,
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  notice: {
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 13,
  },
  noticeWarning: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  noticeCopy: {
    flex: 1,
    marginLeft: 10,
  },
  noticeTitle: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: 13,
  },
  noticeTitleWarning: {
    color: '#92400E',
  },
  noticeMessage: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  noticeMessageWarning: {
    color: '#B45309',
  },
});
