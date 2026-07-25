import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors, radius, shadows, typography } from '../../theme';

export const formatNaira = (value, fallback = '—') => {
  if (value === null || value === undefined || value === '') return fallback;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return `₦${numeric.toLocaleString()}`;
};

export const PremiumScreen = ({ children, contentStyle, scroll = true, statusBarStyle = 'dark-content' }) => {
  const Content = scroll ? ScrollView : View;

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <StatusBar barStyle={statusBarStyle} backgroundColor={colors.surface} />
      <Content
        style={styles.screen}
        contentContainerStyle={scroll ? [styles.content, contentStyle] : undefined}
        showsVerticalScrollIndicator={false}
      >
        {scroll ? children : <View style={[styles.content, contentStyle]}>{children}</View>}
      </Content>
    </SafeAreaView>
  );
};

export const PremiumCenter = ({ icon, title, message, loading = false, tone = 'info', actionLabel, onAction }) => {
  const iconColor = tone === 'success' ? colors.success : tone === 'danger' ? colors.danger : colors.blue;

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      <View style={styles.center}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.blue} />
        ) : icon ? (
          <View style={[styles.centerIcon, { backgroundColor: `${iconColor}14` }]}>
            <Icon name={icon} size={42} color={iconColor} />
          </View>
        ) : null}
        {title ? <Text style={styles.centerTitle}>{title}</Text> : null}
        {message ? <Text style={styles.centerMessage}>{message}</Text> : null}
        {actionLabel && onAction ? (
          <TouchableOpacity activeOpacity={0.86} style={styles.primaryButton} onPress={onAction}>
            <Text style={styles.primaryButtonText}>{actionLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </SafeAreaView>
  );
};

export const PremiumHero = ({ eyebrow, title, subtitle, icon = 'sparkles-outline', right }) => (
  <View style={styles.hero}>
    <View style={styles.heroTop}>
      <View style={styles.heroIcon}>
        <Icon name={icon} size={24} color={colors.gold} />
      </View>
      {right}
    </View>
    {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
    <Text style={styles.heroTitle}>{title}</Text>
    {subtitle ? <Text style={styles.heroSubtitle}>{subtitle}</Text> : null}
  </View>
);

export const PremiumCard = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

export const PremiumSectionTitle = ({ title, subtitle }) => (
  <View style={styles.sectionHeading}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
  </View>
);

export const InfoRow = ({ icon, label, value, valueStyle }) => (
  <View style={styles.infoRow}>
    {icon ? (
      <View style={styles.infoIcon}>
        <Icon name={icon} size={16} color={colors.blue} />
      </View>
    ) : null}
    <View style={styles.infoCopy}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueStyle]}>{value || '—'}</Text>
    </View>
  </View>
);

export const PremiumButton = ({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  icon,
  style,
}) => {
  const isDanger = variant === 'danger';
  const isGhost = variant === 'ghost';
  const isSecondary = variant === 'secondary';
  const contentColor = isGhost ? colors.danger : isSecondary ? colors.blue : colors.white;

  return (
    <TouchableOpacity
      activeOpacity={0.86}
      disabled={disabled || loading}
      onPress={onPress}
      style={[
        styles.button,
        isDanger && styles.buttonDanger,
        isGhost && styles.buttonGhost,
        isSecondary && styles.buttonSecondary,
        (disabled || loading) && styles.buttonDisabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={contentColor} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={18} color={contentColor} /> : null}
          <Text style={[
            styles.buttonText,
            isGhost && styles.buttonTextDanger,
            isSecondary && styles.buttonTextSecondary,
          ]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

export const StatusPill = ({ label, color = colors.muted }) => (
  <View style={[styles.statusPill, { backgroundColor: `${color}18`, borderColor: `${color}45` }]}>
    <Text style={[styles.statusText, { color }]}>{String(label || 'Pending').replace(/_/g, ' ')}</Text>
  </View>
);

export const EmptyPanel = ({ title = 'Nothing here yet', message, icon = 'file-tray-outline' }) => (
  <PremiumCard style={styles.emptyPanel}>
    <View style={styles.emptyIcon}>
      <Icon name={icon} size={24} color={colors.blue} />
    </View>
    <Text style={styles.emptyTitle}>{title}</Text>
    {message ? <Text style={styles.emptyMessage}>{message}</Text> : null}
  </PremiumCard>
);

export const PremiumListScreen = ({
  data,
  renderItem,
  keyExtractor,
  header,
  emptyTitle,
  emptyMessage,
  emptyIcon,
  refreshing = false,
  onRefresh,
  onEndReached,
  onEndReachedThreshold,
  ListFooterComponent,
}) => (
  <SafeAreaView edges={['top']} style={styles.safeArea}>
    <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
    <FlatList
      data={data}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      style={styles.screen}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      refreshing={refreshing}
      onRefresh={onRefresh}
      onEndReached={onEndReached}
      onEndReachedThreshold={onEndReachedThreshold}
      ListHeaderComponent={header}
      ListFooterComponent={ListFooterComponent}
      ListEmptyComponent={
        <EmptyPanel title={emptyTitle} message={emptyMessage} icon={emptyIcon} />
      }
    />
  </SafeAreaView>
);

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
    paddingBottom: 34,
  },
  listContent: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 34,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  centerIcon: {
    alignItems: 'center',
    borderRadius: 34,
    height: 68,
    justifyContent: 'center',
    marginBottom: 18,
    width: 68,
  },
  centerTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 24,
    textAlign: 'center',
  },
  centerMessage: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    textAlign: 'center',
  },
  hero: {
    backgroundColor: colors.navy,
    borderRadius: radius.lg,
    marginBottom: 16,
    overflow: 'hidden',
    padding: 22,
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
    borderRadius: 15,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  eyebrow: {
    color: colors.gold,
    fontFamily: typography.semibold,
    fontSize: 13,
    letterSpacing: 1.25,
    textTransform: 'uppercase',
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
  card: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
    ...shadows.soft,
  },
  sectionHeading: {
    marginBottom: 10,
    marginTop: 4,
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
    marginTop: 3,
  },
  infoRow: {
    alignItems: 'flex-start',
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 11,
    paddingVertical: 11,
  },
  infoIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderRadius: 10,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  infoCopy: {
    flex: 1,
  },
  infoLabel: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 13,
    textTransform: 'uppercase',
  },
  infoValue: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 3,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.blue,
    borderRadius: radius.md,
    marginTop: 20,
    paddingHorizontal: 22,
    paddingVertical: 13,
  },
  primaryButtonText: {
    color: colors.white,
    fontFamily: typography.bold,
    fontSize: 14,
  },
  button: {
    alignItems: 'center',
    backgroundColor: colors.blue,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  buttonDanger: {
    backgroundColor: colors.danger,
  },
  buttonGhost: {
    backgroundColor: colors.white,
    borderColor: colors.danger,
    borderWidth: 1,
  },
  buttonSecondary: {
    backgroundColor: colors.surfaceBlue,
    borderColor: `${colors.blue}22`,
    borderWidth: 1,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.white,
    fontFamily: typography.bold,
    fontSize: 16,
  },
  buttonTextDanger: {
    color: colors.danger,
  },
  buttonTextSecondary: {
    color: colors.blue,
  },
  statusPill: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  statusText: {
    fontFamily: typography.bold,
    fontSize: 13,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  emptyPanel: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    marginBottom: 10,
    width: 44,
  },
  emptyTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 16,
    textAlign: 'center',
  },
  emptyMessage: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    textAlign: 'center',
  },
});
