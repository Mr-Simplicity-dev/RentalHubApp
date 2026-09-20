import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors, radius, typography } from '../../theme';
import { reportMobileCrash } from '../../services/mobileDiagnosticsService';
import storageService from '../../services/storageService';

import AppText from '../../components/common/AppText';

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null,
      errorInfo: null,
      showDetails: false,
      isResetting: false,
    };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[AppErrorBoundary] Uncaught application error:', error, errorInfo);
    this.setState({ errorInfo });
    reportMobileCrash(error, errorInfo, {
      fatal: true,
      source: 'app_error_boundary',
    });
  }

  reset = () => {
    this.setState({ error: null, errorInfo: null, showDetails: false });
  };

  resetSession = async () => {
    try {
      this.setState({ isResetting: true });
      await storageService.clearAll();
    } catch (clearErr) {
      console.warn('[AppErrorBoundary] Error clearing session:', clearErr);
    } finally {
      this.setState({ error: null, errorInfo: null, showDetails: false, isResetting: false });
    }
  };

  toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    const { error, errorInfo, showDetails, isResetting } = this.state;
    const errorMessage = error?.message || String(error || 'Unknown error');

    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.iconBubble}>
            <Icon name="warning-outline" color={colors.danger} size={30} />
          </View>
          <AppText style={styles.title}>Something needs a quick refresh</AppText>
          <AppText style={styles.subtitle}>
            The app hit an unexpected issue. We have saved a diagnostic report so the team can trace it.
          </AppText>

          <View style={styles.actions}>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={this.reset}
              style={styles.button}
            >
              <AppText style={styles.buttonText}>Try again</AppText>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              disabled={isResetting}
              onPress={this.resetSession}
              style={[styles.button, styles.secondaryButton]}
            >
              <AppText style={styles.secondaryButtonText}>
                {isResetting ? 'Resetting...' : 'Sign out & reset'}
              </AppText>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            onPress={this.toggleDetails}
            style={styles.detailsToggle}
          >
            <AppText style={styles.detailsToggleText}>
              {showDetails ? 'Hide error details' : 'Show error details'}
            </AppText>
            <Icon
              name={showDetails ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={colors.muted}
            />
          </TouchableOpacity>

          {showDetails ? (
            <ScrollView style={styles.detailsContainer} nestedScrollEnabled>
              <AppText style={styles.errorTitle}>Error:</AppText>
              <AppText style={styles.errorText}>{errorMessage}</AppText>
              {errorInfo?.componentStack ? (
                <>
                  <AppText style={[styles.errorTitle, { marginTop: 8 }]}>Component Stack:</AppText>
                  <AppText style={styles.stackText}>
                    {errorInfo.componentStack.trim()}
                  </AppText>
                </>
              ) : null}
            </ScrollView>
          ) : null}
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    maxHeight: '90%',
    padding: 22,
    width: '100%',
  },
  iconBubble: {
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 24,
    height: 56,
    justifyContent: 'center',
    marginBottom: 14,
    width: 56,
  },
  title: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 20,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
    width: '100%',
    justifyContent: 'center',
  },
  button: {
    backgroundColor: colors.blue,
    borderRadius: radius.pill,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.white,
    fontFamily: typography.semibold,
    fontSize: 14,
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  secondaryButtonText: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: 14,
  },
  detailsToggle: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    marginTop: 16,
    paddingVertical: 4,
  },
  detailsToggleText: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 13,
  },
  detailsContainer: {
    backgroundColor: '#F8FAFC',
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: 10,
    maxHeight: 180,
    padding: 12,
    width: '100%',
  },
  errorTitle: {
    color: colors.danger,
    fontFamily: typography.bold,
    fontSize: 12,
  },
  errorText: {
    color: colors.ink,
    fontFamily: typography.regular,
    fontSize: 12,
    marginTop: 2,
  },
  stackText: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 2,
  },
});

export default AppErrorBoundary;
