import React, { useContext } from 'react';
import {
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Button from '../common/Button';
import { AuthContext } from '../../context/AuthContext';
import { useTour } from '../../context/TourContext';
import { colors, radius, shadows, typography } from '../../theme';
import { useAccessibilityPreferences } from '../../hooks/useAccessibilityPreferences';

const getCoachCardPlacement = (zone = 'middle') => {
  const normalizedZone = String(zone || '').toLowerCase();
  const targetIsLow = normalizedZone.includes('bottom');
  const targetIsLeft = normalizedZone.includes('left');
  const targetIsRight = normalizedZone.includes('right');

  return {
    cardStyle: targetIsLow ? styles.coachCardTop : styles.coachCardBottom,
    arrowDirection: targetIsLow ? 'down' : 'up',
    arrowStyle: targetIsLeft
      ? styles.coachArrowLeft
      : targetIsRight
        ? styles.coachArrowRight
        : styles.coachArrowCenter,
  };
};

const WelcomeModal = ({
  visible,
  firstName,
  stepCount,
  reduceMotion,
  scaleFont,
  onStart,
  onDismiss,
}) => (
  <Modal
    animationType={reduceMotion ? 'none' : 'fade'}
    transparent
    visible={visible}
    statusBarTranslucent
    onRequestClose={onDismiss}
  >
    <View style={styles.backdrop}>
      <View accessibilityViewIsModal style={styles.welcomeCard}>
        <View style={styles.welcomeIcon}>
          <Icon name="compass-outline" size={34} color={colors.blue} />
        </View>
        <Text style={[styles.welcomeEyebrow, { fontSize: scaleFont(10) }]}>WELCOME TO YOUR APP</Text>
        <Text style={[styles.welcomeTitle, { fontSize: scaleFont(27), lineHeight: scaleFont(33) }]}>
          {firstName ? `Hello, ${firstName}` : 'Let us show you around'}
        </Text>
        <Text style={[styles.welcomeText, { fontSize: scaleFont(14), lineHeight: scaleFont(22) }]}>
          Take a short role-based tour of the tools designed for your account.
        </Text>
        <View style={styles.durationRow}>
          <Icon name="time-outline" size={17} color={colors.muted} />
          <Text style={styles.durationText}>{stepCount} quick steps • about 1 minute</Text>
        </View>
        <Button title="Start Tour" onPress={onStart} style={styles.startButton} />
        <TouchableOpacity accessibilityRole="button" onPress={onDismiss} style={styles.laterButton}>
          <Text style={styles.laterText}>Maybe later</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

const CoachMarkOverlay = ({
  visible,
  step,
  stepIndex,
  stepCount,
  reduceMotion,
  scaleFont,
  onBack,
  onNext,
  onSkip,
}) => {
  const isLast = stepIndex === stepCount - 1;
  const zone = step?.targetZone || ['top', 'middle', 'bottom', 'bottomLeft', 'bottomRight'][stepIndex % 5];
  const targetStyle = styles[`target_${zone}`] || styles.target_middle;
  const targetLabel = step?.targetLabel || step?.title || 'Feature';
  const cardPlacement = getCoachCardPlacement(zone);
  if (!visible) return null;

  return (
    <View style={styles.coachOverlay}>
      <StatusBar barStyle="light-content" backgroundColor="rgba(7, 26, 61, 0.72)" />
      <View pointerEvents="none" style={styles.dimLayer} />

      <View pointerEvents="box-none" style={styles.coachCanvas}>
        <View style={[styles.targetRing, targetStyle]}>
          <View style={styles.targetPulse} />
          <View style={styles.targetLabel}>
            <Icon name="scan-outline" size={15} color={colors.white} />
            <Text style={styles.targetLabelText}>{targetLabel}</Text>
          </View>
        </View>
      </View>

      <View style={styles.coachHeader}>
        <Text style={styles.coachStepCount}>STEP {stepIndex + 1} OF {stepCount}</Text>
        <TouchableOpacity accessibilityRole="button" onPress={onSkip} style={styles.coachSkipButton}>
          <Text style={styles.coachSkipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.coachProgressTrack}>
        <View style={[styles.progressFill, { width: `${((stepIndex + 1) / stepCount) * 100}%` }]} />
      </View>

      <View style={[styles.coachCard, cardPlacement.cardStyle]}>
        {cardPlacement.arrowDirection === 'up' ? (
          <View style={[styles.coachArrowUp, cardPlacement.arrowStyle]} />
        ) : null}

        <View style={styles.coachGrip} />
        <ScrollView
          bounces={false}
          contentContainerStyle={styles.coachCardContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.coachIcon}>
            <Icon name={step?.icon || 'sparkles-outline'} size={25} color={colors.blue} />
          </View>

          <Text style={[styles.walkthroughTitle, { fontSize: scaleFont(24), lineHeight: scaleFont(30) }]}>{step?.title}</Text>
          <Text style={[styles.walkthroughText, { fontSize: scaleFont(14), lineHeight: scaleFont(22) }]}>{step?.description}</Text>
          {step?.targetHint ? <Text style={[styles.targetHint, { fontSize: scaleFont(12), lineHeight: scaleFont(18) }]}>{step.targetHint}</Text> : null}

          <View style={styles.dots}>
            {Array.from({ length: stepCount }).map((_, index) => (
              <View
                key={`tour-dot-${index}`}
                style={[styles.dot, index === stepIndex && styles.dotActive]}
              />
            ))}
          </View>

          <View style={styles.walkthroughFooter}>
            {stepIndex > 0 ? (
              <Button
                title="Back"
                variant="outline"
                onPress={onBack}
                style={styles.footerButton}
              />
            ) : (
              <View style={styles.footerButton} />
            )}
            <Button
              title={isLast ? 'Finish Tour' : 'Next'}
              onPress={onNext}
              style={styles.footerButton}
            />
          </View>
        </ScrollView>

        {cardPlacement.arrowDirection === 'down' ? (
          <View style={[styles.coachArrowDown, cardPlacement.arrowStyle]} />
        ) : null}
      </View>
    </View>
  );
};

const NativeTourManager = () => {
  const { user } = useContext(AuthContext);
  const {
    currentStep,
    dismissWelcome,
    nextStep,
    previousStep,
    skipTour,
    startTour,
    steps,
    walkthroughVisible,
    welcomeVisible,
  } = useTour();

  const firstName = String(user?.full_name || '').trim().split(/\s+/)[0];
  const { reduceMotion, scaleFont } = useAccessibilityPreferences();

  return (
    <>
      <WelcomeModal
        visible={welcomeVisible}
        firstName={firstName}
        stepCount={steps.length}
        reduceMotion={reduceMotion}
        scaleFont={scaleFont}
        onStart={() => startTour()}
        onDismiss={dismissWelcome}
      />
      <CoachMarkOverlay
        visible={walkthroughVisible}
        step={steps[currentStep]}
        stepIndex={currentStep}
        stepCount={steps.length}
        reduceMotion={reduceMotion}
        scaleFont={scaleFont}
        onBack={previousStep}
        onNext={nextStep}
        onSkip={skipTour}
      />
    </>
  );
};

const ARROW_SIZE = 16;

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(7, 26, 61, 0.72)',
    flex: 1,
    justifyContent: 'center',
    padding: 22,
  },
  welcomeCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    maxWidth: 430,
    padding: 24,
    width: '100%',
    ...shadows.soft,
  },
  welcomeIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderRadius: 29,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  welcomeEyebrow: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: 10,
    letterSpacing: 1.25,
    marginTop: 20,
  },
  welcomeTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 27,
    lineHeight: 33,
    marginTop: 7,
  },
  welcomeText: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 9,
  },
  durationRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    flexDirection: 'row',
    marginTop: 18,
    padding: 12,
  },
  durationText: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 12,
    marginLeft: 8,
  },
  startButton: {
    marginTop: 20,
  },
  laterButton: {
    alignItems: 'center',
    padding: 14,
  },
  laterText: {
    color: colors.muted,
    fontFamily: typography.semibold,
    fontSize: 14,
  },
  coachOverlay: {
    ...StyleSheet.absoluteFillObject,
    elevation: 99999,
    flex: 1,
    zIndex: 99999,
  },
  dimLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7, 26, 61, 0.74)',
  },
  coachCanvas: {
    ...StyleSheet.absoluteFillObject,
  },
  coachHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 10,
  },
  coachStepCount: {
    color: colors.gold,
    fontFamily: typography.bold,
    fontSize: 11,
    letterSpacing: 1.1,
  },
  coachSkipButton: {
    paddingHorizontal: 8,
    paddingVertical: 9,
  },
  coachSkipText: {
    color: colors.white,
    fontFamily: typography.semibold,
    fontSize: 14,
  },
  coachProgressTrack: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    height: 4,
    marginHorizontal: 22,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: colors.blue,
    height: 4,
  },
  targetRing: {
    alignItems: 'center',
    borderColor: colors.gold,
    borderRadius: 24,
    borderWidth: 2,
    justifyContent: 'center',
    minHeight: 88,
    minWidth: 180,
    position: 'absolute',
  },
  target_top: {
    left: 28,
    right: 28,
    top: 116,
  },
  target_middle: {
    left: 36,
    right: 36,
    top: '36%',
  },
  target_bottom: {
    bottom: 252,
    left: 32,
    right: 32,
  },
  target_bottomLeft: {
    bottom: 246,
    left: 28,
    width: '44%',
  },
  target_bottomRight: {
    bottom: 246,
    right: 28,
    width: '44%',
  },
  targetPulse: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 201, 40, 0.14)',
    borderRadius: 22,
  },
  targetLabel: {
    alignItems: 'center',
    backgroundColor: colors.navy,
    borderColor: colors.gold,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  targetLabelText: {
    color: colors.white,
    fontFamily: typography.bold,
    fontSize: 12,
  },
  coachArrowUp: {
    borderBottomColor: colors.white,
    borderBottomWidth: ARROW_SIZE,
    borderLeftColor: 'transparent',
    borderLeftWidth: ARROW_SIZE / 1.6,
    borderRightColor: 'transparent',
    borderRightWidth: ARROW_SIZE / 1.6,
    height: 0,
    marginBottom: 6,
    marginTop: -ARROW_SIZE,
    width: 0,
  },
  coachArrowDown: {
    borderLeftColor: 'transparent',
    borderLeftWidth: ARROW_SIZE / 1.6,
    borderRightColor: 'transparent',
    borderRightWidth: ARROW_SIZE / 1.6,
    borderTopColor: colors.white,
    borderTopWidth: ARROW_SIZE,
    height: 0,
    marginBottom: -ARROW_SIZE,
    marginTop: 6,
    width: 0,
  },
  coachArrowCenter: {
    alignSelf: 'center',
  },
  coachArrowLeft: {
    alignSelf: 'flex-start',
    marginLeft: 46,
  },
  coachArrowRight: {
    alignSelf: 'flex-end',
    marginRight: 46,
  },
  coachCard: {
    backgroundColor: colors.white,
    borderRadius: 28,
    left: 16,
    maxHeight: '58%',
    padding: 18,
    position: 'absolute',
    right: 16,
    ...shadows.soft,
  },
  coachCardBottom: {
    bottom: 24,
  },
  coachCardTop: {
    top: 90,
  },
  coachGrip: {
    alignSelf: 'center',
    backgroundColor: '#D5DEEA',
    borderRadius: 999,
    height: 4,
    marginBottom: 12,
    width: 44,
  },
  coachCardContent: {
    paddingBottom: 4,
  },
  coachIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    marginBottom: 12,
    width: 44,
  },
  walkthroughTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 23,
    lineHeight: 30,
  },
  walkthroughText: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: 15,
    lineHeight: 24,
    marginTop: 8,
    maxWidth: 420,
  },
  targetHint: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
    padding: 12,
  },
  dots: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
    marginTop: 18,
  },
  dot: {
    backgroundColor: '#C8D1E0',
    borderRadius: 4,
    height: 7,
    width: 7,
  },
  dotActive: {
    backgroundColor: colors.blue,
    width: 23,
  },
  walkthroughFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  footerButton: {
    flex: 1,
  },
});

export default NativeTourManager;
