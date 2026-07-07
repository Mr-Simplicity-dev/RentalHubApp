import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors, radius, typography } from '../../theme';
import { reportMobileCrash } from '../../services/mobileDiagnosticsService';

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    reportMobileCrash(error, errorInfo, {
      fatal: true,
      source: 'app_error_boundary',
    });
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.iconBubble}>
            <Icon name="warning-outline" color={colors.danger} size={30} />
          </View>
          <Text style={styles.title}>Something needs a quick refresh</Text>
          <Text style={styles.subtitle}>
            The app hit an unexpected issue. We have saved a diagnostic report so the team can trace it.
          </Text>
          <TouchableOpacity accessibilityRole="button" onPress={this.reset} style={styles.button}>
            <Text style={styles.buttonText}>Try again</Text>
          </TouchableOpacity>
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
  button: {
    backgroundColor: colors.blue,
    borderRadius: radius.pill,
    marginTop: 18,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  buttonText: {
    color: colors.white,
    fontFamily: typography.semibold,
    fontSize: 14,
  },
});

export default AppErrorBoundary;
