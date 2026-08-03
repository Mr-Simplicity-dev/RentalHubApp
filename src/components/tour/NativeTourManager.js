import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import Button from '../common/Button';
import AppText from '../common/AppText';
import { AuthContext } from '../../context/AuthContext';
import { useTour } from '../../context/TourContext';
import { useLanguage } from '../../context/LanguageContext';
import { colors, radius, shadows, typography } from '../../theme';
import { useAccessibilityPreferences } from '../../hooks/useAccessibilityPreferences';

const CARD_MARGIN = 16;
const CARD_TARGET_GAP = 18;
const DEFAULT_CARD_HEIGHT = 330;
const MIN_CARD_SPACE = 170;
const ARROW_SIZE = 12;
const SPOTLIGHT_MARGIN = 4;
const TARGET_WAIT_MS = 4000;
const MAX_SPOTLIGHT_HEIGHT = 280;
const MAX_SPOTLIGHT_HEIGHT_RATIO = 0.34;

const clamp = (value, minimum, maximum) =>
  Math.min(Math.max(value, minimum), Math.max(minimum, maximum));

const getInsets = (value, fallback = 8) => {
  if (Number.isFinite(value)) {
    return {
      bottom: value,
      left: value,
      right: value,
      top: value,
    };
  }

  return {
    bottom: Number.isFinite(value?.bottom) ? value.bottom : fallback,
    left: Number.isFinite(value?.left) ? value.left : fallback,
    right: Number.isFinite(value?.right) ? value.right : fallback,
    top: Number.isFinite(value?.top) ? value.top : fallback,
  };
};

const getSpotlight = (measurement, step, windowSize, safeAreaInsets) => {
  if (!measurement) {
    return null;
  }

  const padding = getInsets(
    step?.spotlightPadding ?? measurement.options?.padding,
    8
  );
  const minimumX = SPOTLIGHT_MARGIN;
  const maximumX = windowSize.width - SPOTLIGHT_MARGIN;
  const minimumY = SPOTLIGHT_MARGIN;
  const maximumY =
    windowSize.height - Math.max(safeAreaInsets.bottom, SPOTLIGHT_MARGIN);
  const left = clamp(measurement.x - padding.left, minimumX, maximumX);
  const top = clamp(measurement.y - padding.top, minimumY, maximumY);
  const right = clamp(
    measurement.x + measurement.width + padding.right,
    minimumX,
    maximumX
  );
  let bottom = clamp(
    measurement.y + measurement.height + padding.bottom,
    minimumY,
    maximumY
  );
  const maximumSpotlightHeight = Math.min(
    MAX_SPOTLIGHT_HEIGHT,
    windowSize.height * MAX_SPOTLIGHT_HEIGHT_RATIO
  );
  if (bottom - top > maximumSpotlightHeight) {
    bottom = Math.min(top + maximumSpotlightHeight, maximumY);
  }

  if (right <= left || bottom <= top) {
    return null;
  }

  return {
    height: bottom - top,
    label:
      step?.targetLabel ||
      step?.title ||
      measurement.options?.label ||
      '',
    radius:
      step?.spotlightRadius ??
      measurement.options?.radius ??
      18,
    width: right - left,
    x: left,
    y: top,
  };
};

const isMeasurementOnScreen = (
  measurement,
  windowSize,
  safeAreaInsets
) => {
  if (!measurement) {
    return false;
  }

  const right = measurement.x + measurement.width;
  const bottom = measurement.y + measurement.height;
  const visibleBottom =
    windowSize.height - Math.max(safeAreaInsets.bottom, 0);

  return (
    right > 0 &&
    measurement.x < windowSize.width &&
    bottom > 0 &&
    measurement.y < visibleBottom
  );
};

const getCardPlacement = ({
  cardHeight,
  insets,
  spotlight,
  windowHeight,
  windowWidth,
}) => {
  const safeTop = Math.max(insets.top, 8) + 72;
  const safeBottom =
    windowHeight - Math.max(insets.bottom, 12) - 12;
  const availableHeight = Math.max(120, safeBottom - safeTop);
  const desiredHeight = Math.min(
    cardHeight || DEFAULT_CARD_HEIGHT,
    availableHeight
  );

  if (!spotlight) {
    return {
      arrowDirection: null,
      arrowOffset: 0,
      style: {
        left: CARD_MARGIN,
        maxHeight: availableHeight,
        right: CARD_MARGIN,
        top: safeTop + Math.max(0, (availableHeight - desiredHeight) / 2),
      },
    };
  }

  const cardWidth = windowWidth - CARD_MARGIN * 2;
  const targetCentreX = spotlight.x + spotlight.width / 2;
  const targetCentreY = spotlight.y + spotlight.height / 2;
  const aboveSpace = spotlight.y - CARD_TARGET_GAP - safeTop;
  const belowTop = spotlight.y + spotlight.height + CARD_TARGET_GAP;
  const belowSpace = safeBottom - belowTop;

  if (windowWidth >= 720) {
    const leftSpace = spotlight.x - CARD_TARGET_GAP - CARD_MARGIN;
    const rightStart =
      spotlight.x + spotlight.width + CARD_TARGET_GAP;
    const rightSpace = windowWidth - CARD_MARGIN - rightStart;
    const useRight = rightSpace >= 320 && rightSpace >= leftSpace;
    const useLeft = leftSpace >= 320 && leftSpace > rightSpace;

    if (useRight || useLeft) {
      const sideWidth = Math.min(390, useRight ? rightSpace : leftSpace);
      const sideHeight = Math.min(desiredHeight, availableHeight);
      const top = clamp(
        targetCentreY - sideHeight / 2,
        safeTop,
        safeBottom - sideHeight
      );

      return {
        arrowDirection: useRight ? 'left' : 'right',
        arrowOffset: clamp(
          targetCentreY - top - ARROW_SIZE,
          28,
          Math.max(28, sideHeight - 40)
        ),
        style: {
          left: useRight
            ? rightStart
            : spotlight.x - CARD_TARGET_GAP - sideWidth,
          maxHeight: availableHeight,
          top,
          width: sideWidth,
        },
      };
    }
  }

  const canFitBelow = belowSpace >= Math.min(desiredHeight, MIN_CARD_SPACE);
  const canFitAbove = aboveSpace >= Math.min(desiredHeight, MIN_CARD_SPACE);
  const placeBelow =
    canFitBelow && (!canFitAbove || belowSpace >= aboveSpace);
  const placeAbove = canFitAbove || aboveSpace > belowSpace;
  const arrowOffset = clamp(
    targetCentreX - CARD_MARGIN - ARROW_SIZE,
    30,
    cardWidth - 42
  );

  if (placeBelow && belowSpace > 0) {
    return {
      arrowDirection: 'up',
      arrowOffset,
      style: {
        left: CARD_MARGIN,
        maxHeight: belowSpace,
        right: CARD_MARGIN,
        top: belowTop,
      },
    };
  }

  if (placeAbove && aboveSpace > 0) {
    return {
      arrowDirection: 'down',
      arrowOffset,
      style: {
        bottom: windowHeight - spotlight.y + CARD_TARGET_GAP,
        left: CARD_MARGIN,
        maxHeight: aboveSpace,
        right: CARD_MARGIN,
      },
    };
  }

  // Extremely large targets can leave no clean side for the card. Keep the
  // guide inside the safe area and omit the arrow instead of drawing a false
  // relationship to the control.
  return {
    arrowDirection: null,
    arrowOffset: 0,
    style: {
      left: CARD_MARGIN,
      maxHeight: availableHeight,
      right: CARD_MARGIN,
      top: safeTop + Math.max(0, (availableHeight - desiredHeight) / 2),
    },
  };
};

const CoachArrow = ({ direction, offset }) => {
  if (!direction) {
    return null;
  }

  const positionStyle =
    direction === 'up' || direction === 'down'
      ? { left: offset }
      : { top: offset };

  return (
    <View
      pointerEvents="none"
      style={[
        styles.coachArrow,
        styles[`coachArrow_${direction}`],
        positionStyle,
      ]}
    />
  );
};

const DimmedSpotlight = ({ pulse, reduceMotion, spotlight }) => {
  if (!spotlight) {
    return (
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, styles.dimPane]}
      />
    );
  }

  const rightEdge = spotlight.x + spotlight.width;
  const bottomEdge = spotlight.y + spotlight.height;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      <View
        style={[
          styles.dimPane,
          styles.dimPaneAbsolute,
          { height: spotlight.y, left: 0, right: 0, top: 0 },
        ]}
      />
      <View
        style={[
          styles.dimPane,
          styles.dimPaneAbsolute,
          {
            height: spotlight.height,
            left: 0,
            top: spotlight.y,
            width: spotlight.x,
          },
        ]}
      />
      <View
        style={[
          styles.dimPane,
          styles.dimPaneAbsolute,
          {
            bottom: 0,
            left: 0,
            top: bottomEdge,
            right: 0,
          },
        ]}
      />
      <View
        style={[
          styles.dimPane,
          styles.dimPaneAbsolute,
          {
            bottom: undefined,
            height: spotlight.height,
            left: rightEdge,
            right: 0,
            top: spotlight.y,
          },
        ]}
      />

      <Animated.View
        style={[
          styles.spotlightHalo,
          {
            borderRadius: spotlight.radius + 3,
            height: spotlight.height,
            left: spotlight.x,
            opacity: reduceMotion
              ? 0.42
              : pulse.interpolate({
                inputRange: [0, 1],
                outputRange: [0.24, 0.58],
              }),
            top: spotlight.y,
            transform: reduceMotion
              ? undefined
              : [{
                scale: pulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.035],
                }),
              }],
            width: spotlight.width,
          },
        ]}
      />
      <View
        style={[
          styles.spotlightBorder,
          {
            borderRadius: spotlight.radius,
            height: spotlight.height,
            left: spotlight.x,
            top: spotlight.y,
            width: spotlight.width,
          },
        ]}
      />
    </View>
  );
};

const WelcomeModal = ({
  visible,
  firstName,
  stepCount,
  resumeAvailable,
  resumeStep,
  reduceMotion,
  scaleFont,
  t,
  isRTL,
  onStart,
  onDismiss,
}) => {
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      entrance.setValue(0);
      return undefined;
    }

    AccessibilityInfo.announceForAccessibility(
      resumeAvailable
        ? t('tour.welcomeAnnouncement', { count: stepCount, step: resumeStep + 1 })
        : t('tour.welcomeAnnouncement', { count: stepCount })
    );

    if (reduceMotion) {
      entrance.setValue(1);
      return undefined;
    }

    const animation = Animated.timing(entrance, {
      duration: 320,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [entrance, reduceMotion, resumeAvailable, resumeStep, stepCount, t, visible]);

  return (
    <Modal
      animationType="none"
      navigationBarTranslucent
      onRequestClose={onDismiss}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <StatusBar
        backgroundColor="rgba(3, 14, 35, 0.86)"
        barStyle="light-content"
        translucent
      />
      <Animated.View
        accessibilityViewIsModal
        importantForAccessibility="yes"
        style={[
          styles.backdrop,
          {
            opacity: reduceMotion ? 1 : entrance,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.welcomeCard,
            {
              transform: reduceMotion
                ? undefined
                : [{
                  scale: entrance.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.96, 1],
                  }),
                }],
            },
          ]}
        >
          <View style={styles.welcomeAccent} />
          <View style={styles.welcomeIcon}>
            <Icon name="compass-outline" size={34} color={colors.gold} />
          </View>
          <AppText
            style={[
              styles.welcomeEyebrow,
              isRTL && styles.rtlText,
              { fontSize: scaleFont(11) },
            ]}
          >
            {t('tour.guideEyebrow')}
          </AppText>
          <AppText
            accessibilityRole="header"
            style={[
              styles.welcomeTitle,
              isRTL && styles.rtlText,
              {
                fontSize: scaleFont(27),
                lineHeight: scaleFont(34),
              },
            ]}
          >
            {firstName
              ? t('tour.welcomeNamed', { name: firstName })
              : t('tour.welcomeDefault')}
          </AppText>
          <AppText
            style={[
              styles.welcomeText,
              isRTL && styles.rtlText,
              {
                fontSize: scaleFont(14),
                lineHeight: scaleFont(22),
              },
            ]}
          >
            {resumeAvailable
              ? t('tour.resumeText')
              : t('tour.welcomeText')}
          </AppText>
          <View style={[styles.durationRow, isRTL && styles.rtlRow]}>
            <View style={styles.durationIcon}>
              <Icon name="time-outline" size={17} color={colors.gold} />
            </View>
            <AppText style={styles.durationText}>
              {t('tour.duration', { count: stepCount, step: resumeStep + 1 })}
            </AppText>
          </View>
          <Button
            accessibilityHint={t(resumeAvailable ? 'tour.resumeHint' : 'tour.startHint')}
            accessibilityLabel={t(
              resumeAvailable ? 'tour.resumeLabel' : 'tour.startLabel',
              { count: stepCount, step: resumeStep + 1 }
            )}
            onPress={onStart}
            style={styles.startButton}
            textStyle={styles.startButtonText}
            title={t(resumeAvailable ? 'tour.resume' : 'tour.start')}
          />
          <TouchableOpacity
            accessibilityHint={t('tour.maybeLaterHint')}
            accessibilityLabel={t('tour.maybeLater')}
            accessibilityRole="button"
            onPress={onDismiss}
            style={styles.laterButton}
          >
            <AppText style={[styles.laterText, isRTL && styles.rtlText]}>
              {t('tour.maybeLater')}
            </AppText>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const TargetStatus = ({
  status,
  targetLabel,
  onRetry,
  t,
}) => {
  if (status === 'action') {
    return (
      <View accessibilityLiveRegion="polite" style={styles.focusRow}>
        <Icon name="open-outline" size={16} color={colors.gold} />
        <AppText numberOfLines={2} style={styles.focusText}>
          {t('tour.openControl')}
        </AppText>
      </View>
    );
  }

  if (status === 'found') {
    return (
      <View
        accessibilityLabel={t('tour.focusedLabel', { target: targetLabel })}
        style={styles.focusRow}
      >
        <Icon name="locate-outline" size={16} color={colors.gold} />
        <AppText numberOfLines={2} style={styles.focusText}>
          {t('tour.focusedOn', { target: targetLabel })}
        </AppText>
      </View>
    );
  }

  if (status === 'measuring' || status === 'idle') {
    return (
      <View accessibilityLiveRegion="polite" style={styles.locatingRow}>
        <ActivityIndicator color={colors.gold} size="small" />
        <AppText style={styles.locatingText}>{t('tour.locating')}</AppText>
      </View>
    );
  }

  return (
    <View
      accessibilityLiveRegion="polite"
      style={styles.missingTargetNotice}
    >
      <View style={styles.missingTargetCopy}>
        <Icon name="eye-off-outline" size={18} color={colors.warning} />
        <AppText style={styles.missingTargetText}>
          {t(status === 'unavailable' ? 'tour.unavailable' : 'tour.missing')}
        </AppText>
      </View>
      {status === 'missing' ? (
        <TouchableOpacity
          accessibilityHint={t('tour.retryHint')}
          accessibilityLabel={t('tour.retryLabel')}
          accessibilityRole="button"
          onPress={onRetry}
          style={styles.retryButton}
        >
          <Icon name="refresh-outline" size={16} color={colors.navy} />
          <AppText style={styles.retryButtonText}>{t('tour.retry')}</AppText>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const CoachMarkOverlay = ({
  visible,
  step,
  stepIndex,
  stepCount,
  reduceMotion,
  scaleFont,
  isRTL,
  t,
  measureTarget,
  prepareStep,
  targetRegistryVersion,
  onBack,
  onAction,
  onNext,
  onReportStepUnavailable,
  onReportStepViewed,
  onReportTargetMissing,
  onSkipStep,
  onSkip,
}) => {
  const insets = useSafeAreaInsets();
  const windowSize = useWindowDimensions();
  const [cardHeight, setCardHeight] = useState(DEFAULT_CARD_HEIGHT);
  const [progressWidth, setProgressWidth] = useState(0);
  const [targetState, setTargetState] = useState({
    measurement: null,
    status: 'idle',
    reason: null,
  });
  const [performingAction, setPerformingAction] = useState(false);
  const requestSequence = useRef(0);
  const cardEntrance = useRef(new Animated.Value(1)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const isLast = stepIndex === stepCount - 1;
  const targetId = step?.targetId || step?.id;

  const locateTarget = useCallback(async ({ quiet = false } = {}) => {
    if (!visible || !step || !targetId) {
      return;
    }

    const requestId = requestSequence.current + 1;
    requestSequence.current = requestId;
    if (!quiet) {
      setTargetState((state) => ({
        measurement: state.measurement,
        status: 'measuring',
      }));
    }

    try {
      const result = await prepareStep(step, {
        intervalMs: 100,
        timeoutMs: TARGET_WAIT_MS,
      });
      if (requestSequence.current !== requestId) {
        return;
      }

      if (
        result?.status === 'found' &&
        isMeasurementOnScreen(result.measurement, windowSize, insets)
      ) {
        setTargetState({
          measurement: result.measurement,
          status: 'found',
          reason: null,
        });
        return;
      }
      if (result?.status === 'unavailable') {
        setTargetState({
          measurement: null,
          status: 'unavailable',
          reason: result.reason || 'route_unavailable',
        });
        return;
      }
      if (result?.status === 'action') {
        setTargetState({
          measurement: null,
          status: 'action',
          reason: null,
        });
        return;
      }
    } catch (error) {
      console.warn('Unable to locate tour target:', error?.message || error);
    }

    if (requestSequence.current === requestId) {
      setTargetState({
        measurement: null,
        status: 'missing',
        reason: 'target_not_visible',
      });
      if (!quiet) {
        AccessibilityInfo.announceForAccessibility(
          t('tour.missingAnnouncement')
        );
      }
    }
  }, [insets, prepareStep, step, t, targetId, visible, windowSize]);

  useEffect(() => {
    if (!visible || !step) {
      requestSequence.current += 1;
      setTargetState({
        measurement: null,
        status: 'idle',
        reason: null,
      });
      return undefined;
    }

    locateTarget();
    return () => {
      requestSequence.current += 1;
    };
  }, [locateTarget, step?.id, visible]);

  useEffect(() => {
    if (
      !visible ||
      !targetId ||
      targetState.status === 'idle' ||
      targetState.status === 'measuring' ||
      targetState.status === 'action' ||
      targetState.status === 'unavailable'
    ) {
      return undefined;
    }

    let cancelled = false;
    const timeout = setTimeout(async () => {
      if (targetState.status === 'missing') {
        await locateTarget({ quiet: true });
        return;
      }

      const measurement = await measureTarget(targetId);
      if (cancelled) {
        return;
      }

      if (isMeasurementOnScreen(measurement, windowSize, insets)) {
        setTargetState({
          measurement,
          status: 'found',
        });
      } else if (targetState.status === 'found') {
        setTargetState({
          measurement: null,
          status: 'missing',
        });
      }
    }, 90);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [
    measureTarget,
    insets,
    locateTarget,
    targetId,
    targetRegistryVersion,
    targetState.status,
    visible,
    windowSize.height,
    windowSize.width,
  ]);

  useEffect(() => {
    if (!visible || !step) return;
    if (targetState.status === 'found') {
      onReportStepViewed(step);
    } else if (targetState.status === 'missing') {
      onReportTargetMissing(step);
    } else if (targetState.status === 'unavailable') {
      onReportStepUnavailable(step, targetState.reason);
    }
  }, [
    onReportStepUnavailable,
    onReportStepViewed,
    onReportTargetMissing,
    step,
    targetState.reason,
    targetState.status,
    visible,
  ]);

  useEffect(() => {
    if (!visible || !step) {
      return undefined;
    }

    const announcement = t('tour.stepAnnouncement', {
      count: stepCount,
      description: step.description,
      step: stepIndex + 1,
      title: step.title,
    });
    const timeout = setTimeout(
      () => AccessibilityInfo.announceForAccessibility(announcement),
      reduceMotion ? 50 : 280
    );

    if (reduceMotion) {
      cardEntrance.setValue(1);
      return () => clearTimeout(timeout);
    }

    cardEntrance.setValue(0);
    const animation = Animated.timing(cardEntrance, {
      duration: 260,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: true,
    });
    animation.start();

    return () => {
      clearTimeout(timeout);
      animation.stop();
    };
  }, [
    cardEntrance,
    reduceMotion,
    step,
    stepCount,
    stepIndex,
    t,
    visible,
  ]);

  useEffect(() => {
    if (!visible) {
      progress.setValue(0);
      return undefined;
    }

    const nextProgress = stepCount > 0
      ? (stepIndex + 1) / stepCount
      : 0;

    if (reduceMotion) {
      progress.setValue(nextProgress);
      return undefined;
    }

    const animation = Animated.timing(progress, {
      duration: 360,
      easing: Easing.out(Easing.cubic),
      toValue: nextProgress,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, reduceMotion, stepCount, stepIndex, visible]);

  useEffect(() => {
    if (
      reduceMotion ||
      !visible ||
      targetState.status !== 'found'
    ) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return undefined;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          toValue: 0,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulse, reduceMotion, targetState.status, visible]);

  const spotlight = useMemo(
    () => getSpotlight(
      targetState.status === 'found'
        ? targetState.measurement
        : null,
      step,
      windowSize,
      insets
    ),
    [insets, step, targetState, windowSize]
  );

  const placement = useMemo(
    () => getCardPlacement({
      cardHeight,
      insets,
      spotlight,
      windowHeight: windowSize.height,
      windowWidth: windowSize.width,
    }),
    [cardHeight, insets, spotlight, windowSize.height, windowSize.width]
  );

  const continueTour = useCallback(() => {
    if (targetState.status === 'found') {
      onNext();
      return;
    }
    onSkipStep(targetState.reason || 'target_not_available');
  }, [onNext, onSkipStep, targetState.reason, targetState.status]);

  const performAction = useCallback(async () => {
    if (performingAction) return;
    setPerformingAction(true);
    try {
      await onAction(step);
    } finally {
      setPerformingAction(false);
    }
  }, [onAction, performingAction, step]);

  const onAccessibilityAction = useCallback((event) => {
    const actionName = event.nativeEvent.actionName;
    if (actionName === 'increment') {
      continueTour();
    } else if (actionName === 'decrement' && stepIndex > 0) {
      onBack();
    } else if (actionName === 'escape') {
      onSkip();
    }
  }, [continueTour, onBack, onSkip, stepIndex]);

  if (!visible || !step || stepCount === 0) {
    return null;
  }

  return (
    <Modal
      animationType="none"
      navigationBarTranslucent
      onRequestClose={onSkip}
      statusBarTranslucent
      transparent
      visible
    >
      <StatusBar
        backgroundColor="rgba(3, 14, 35, 0.78)"
        barStyle="light-content"
        translucent
      />
      <View
        accessibilityActions={[
          { label: t('tour.nextAction'), name: 'increment' },
          { label: t('tour.previousAction'), name: 'decrement' },
          { label: t('tour.closeAction'), name: 'escape' },
        ]}
        accessibilityViewIsModal
        importantForAccessibility="yes"
        onAccessibilityAction={onAccessibilityAction}
        onAccessibilityEscape={onSkip}
        style={styles.coachOverlay}
      >
        <DimmedSpotlight
          pulse={pulse}
          reduceMotion={reduceMotion}
          spotlight={spotlight}
        />

        <View
          style={[
            styles.coachHeader,
            isRTL && styles.rtlRow,
            { top: Math.max(insets.top, 8) + 4 },
          ]}
        >
          <View>
            <AppText style={styles.coachStepCount}>
              {t('tour.stepCount', { count: stepCount, step: stepIndex + 1 })}
            </AppText>
            <AppText numberOfLines={1} style={styles.coachHeaderTitle}>
              {step.title}
            </AppText>
          </View>
          <TouchableOpacity
            accessibilityHint={t('tour.skipHint')}
            accessibilityLabel={t('tour.skipLabel')}
            accessibilityRole="button"
            hitSlop={{
              bottom: 10,
              left: 10,
              right: 10,
              top: 10,
            }}
            onPress={onSkip}
            style={styles.coachSkipButton}
          >
            <AppText style={styles.coachSkipText}>{t('tour.skip')}</AppText>
            <Icon name="close" size={17} color={colors.white} />
          </TouchableOpacity>
        </View>

        <View
          onLayout={(event) => setProgressWidth(
            event.nativeEvent.layout.width
          )}
          style={[
            styles.coachProgressTrack,
            { top: Math.max(insets.top, 8) + 59 },
          ]}
        >
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, progressWidth],
                }),
              },
            ]}
          />
        </View>

        <Animated.View
          onLayout={(event) => {
            const nextHeight = event.nativeEvent.layout.height;
            if (Math.abs(nextHeight - cardHeight) > 2) {
              setCardHeight(nextHeight);
            }
          }}
          style={[
            styles.coachCard,
            placement.style,
            {
              opacity: reduceMotion ? 1 : cardEntrance,
              transform: reduceMotion
                ? undefined
                : [
                  {
                    translateY: cardEntrance.interpolate({
                      inputRange: [0, 1],
                      outputRange: [12, 0],
                    }),
                  },
                  {
                    scale: cardEntrance.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.985, 1],
                    }),
                  },
                ],
            },
          ]}
        >
          <CoachArrow
            direction={placement.arrowDirection}
            offset={placement.arrowOffset}
          />
          <View style={styles.coachGrip} />
          <ScrollView
            bounces={false}
            contentContainerStyle={styles.coachCardContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.coachTitleRow, isRTL && styles.rtlRow]}>
              <View style={styles.coachIcon}>
                <Icon
                  name={step.icon || 'sparkles-outline'}
                  size={24}
                  color={colors.gold}
                />
              </View>
              <View style={styles.coachTitleCopy}>
                <AppText style={styles.coachEyebrow}>{t('tour.guidedWalkthrough')}</AppText>
                <AppText
                  accessibilityRole="header"
                  style={[
                    styles.walkthroughTitle,
                    isRTL && styles.rtlText,
                    {
                      fontSize: scaleFont(23),
                      lineHeight: scaleFont(29),
                    },
                  ]}
                >
                  {step.title}
                </AppText>
              </View>
            </View>

            <AppText
              style={[
                styles.walkthroughText,
                isRTL && styles.rtlText,
                {
                  fontSize: scaleFont(14),
                  lineHeight: scaleFont(22),
                },
              ]}
            >
              {step.description}
            </AppText>

            <TargetStatus
              onRetry={() => locateTarget()}
              status={targetState.status}
              t={t}
              targetLabel={
                spotlight?.label ||
                step.targetLabel ||
                step.title
              }
            />

            {step.targetHint ? (
              <AppText
                style={[
                  styles.targetHint,
                  isRTL && styles.rtlText,
                  {
                    fontSize: scaleFont(12),
                    lineHeight: scaleFont(18),
                  },
                ]}
              >
                {step.targetHint}
              </AppText>
            ) : null}

            {step.action && ['action', 'found'].includes(targetState.status) ? (
              <Button
                accessibilityHint={t('tour.openControlHint')}
                loading={performingAction}
                onPress={performAction}
                style={styles.workflowActionButton}
                title={t(performingAction ? 'tour.openingControl' : 'tour.openControl')}
              />
            ) : null}

            <View
              accessibilityLabel={t('tour.progressLabel', {
                count: stepCount,
                step: stepIndex + 1,
              })}
              style={styles.dots}
            >
              {Array.from({ length: stepCount }).map((_, index) => (
                <View
                  key={`tour-dot-${index}`}
                  style={[
                    styles.dot,
                    index < stepIndex && styles.dotComplete,
                    index === stepIndex && styles.dotActive,
                  ]}
                />
              ))}
            </View>

            <View style={[styles.walkthroughFooter, isRTL && styles.rtlRow]}>
              {stepIndex > 0 ? (
                <Button
                  accessibilityHint={t('tour.backHint', { step: stepIndex })}
                  onPress={onBack}
                  style={[styles.footerButton, styles.backButton]}
                  textStyle={styles.backButtonText}
                  title={t('tour.back')}
                  variant="outline"
                />
              ) : (
                <View style={styles.footerButton} />
              )}
              <Button
                accessibilityHint={
                  isLast
                    ? t('tour.finishHint')
                    : t('tour.nextHint', { step: stepIndex + 2 })
                }
                onPress={continueTour}
                style={[styles.footerButton, styles.nextButton]}
                textStyle={styles.nextButtonText}
                title={t(isLast ? 'tour.finish' : 'tour.next')}
              />
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const NativeTourManager = ({ prepareStep }) => {
  const { user } = useContext(AuthContext);
  const {
    currentStep,
    dismissWelcome,
    measureTarget,
    nextStep,
    performStepAction,
    prepareTourStep,
    previousStep,
    reportStepUnavailable,
    reportStepViewed,
    reportTargetMissing,
    resumeAvailable,
    resumeStep,
    skipCurrentStep,
    skipTour,
    startTour,
    steps,
    targetRegistryVersion,
    walkthroughVisible,
    welcomeVisible,
  } = useTour();
  const { isRTL, t } = useLanguage();
  const firstName = String(user?.full_name || '')
    .trim()
    .split(/\s+/)[0];
  const { reduceMotion, scaleFont } = useAccessibilityPreferences();

  const handlePrepareStep = useCallback(async (step, options) => {
    if (typeof prepareStep === 'function') {
      await prepareStep(step, options);
    }
    return prepareTourStep(step, options);
  }, [prepareStep, prepareTourStep]);

  return (
    <>
      <WelcomeModal
        firstName={firstName}
        onDismiss={dismissWelcome}
        onStart={() => startTour({ resume: resumeAvailable })}
        reduceMotion={reduceMotion}
        resumeAvailable={resumeAvailable}
        resumeStep={resumeStep}
        scaleFont={scaleFont}
        stepCount={steps.length}
        t={t}
        isRTL={isRTL}
        visible={welcomeVisible}
      />
      <CoachMarkOverlay
        measureTarget={measureTarget}
        isRTL={isRTL}
        onAction={performStepAction}
        onBack={previousStep}
        onNext={nextStep}
        onReportStepUnavailable={reportStepUnavailable}
        onReportStepViewed={reportStepViewed}
        onReportTargetMissing={reportTargetMissing}
        onSkipStep={skipCurrentStep}
        onSkip={skipTour}
        prepareStep={handlePrepareStep}
        reduceMotion={reduceMotion}
        scaleFont={scaleFont}
        step={steps[currentStep]}
        stepCount={steps.length}
        stepIndex={currentStep}
        t={t}
        targetRegistryVersion={targetRegistryVersion}
        visible={walkthroughVisible}
      />
    </>
  );
};

const styles = StyleSheet.create({
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  rtlRow: {
    flexDirection: 'row-reverse',
  },
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(3, 14, 35, 0.86)',
    flex: 1,
    justifyContent: 'center',
    padding: 22,
  },
  welcomeCard: {
    backgroundColor: colors.white,
    borderColor: 'rgba(255, 201, 40, 0.62)',
    borderRadius: radius.lg,
    borderWidth: 1,
    maxWidth: 430,
    overflow: 'hidden',
    padding: 24,
    width: '100%',
    ...shadows.soft,
  },
  welcomeAccent: {
    backgroundColor: colors.gold,
    height: 5,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  welcomeIcon: {
    alignItems: 'center',
    backgroundColor: colors.navy,
    borderColor: 'rgba(255, 201, 40, 0.5)',
    borderRadius: 30,
    borderWidth: 1,
    height: 60,
    justifyContent: 'center',
    width: 60,
  },
  welcomeEyebrow: {
    color: '#8A6500',
    fontFamily: typography.bold,
    letterSpacing: 1.35,
    marginTop: 20,
  },
  welcomeTitle: {
    color: colors.navy,
    fontFamily: typography.bold,
    letterSpacing: -0.55,
    marginTop: 7,
  },
  welcomeText: {
    color: colors.text,
    fontFamily: typography.regular,
    marginTop: 9,
  },
  durationRow: {
    alignItems: 'center',
    backgroundColor: '#F5F7FB',
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 18,
    padding: 12,
  },
  durationIcon: {
    alignItems: 'center',
    backgroundColor: colors.navy,
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  durationText: {
    color: colors.text,
    flex: 1,
    fontFamily: typography.medium,
    fontSize: 13,
    marginLeft: 9,
  },
  startButton: {
    backgroundColor: colors.gold,
    marginTop: 20,
  },
  startButtonText: {
    color: colors.navy,
    fontFamily: typography.bold,
  },
  laterButton: {
    alignItems: 'center',
    minHeight: 46,
    padding: 14,
  },
  laterText: {
    color: colors.muted,
    fontFamily: typography.semibold,
    fontSize: 14,
  },
  coachOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  dimPane: {
    backgroundColor: 'rgba(3, 14, 35, 0.80)',
  },
  dimPaneAbsolute: {
    position: 'absolute',
  },
  spotlightHalo: {
    backgroundColor: 'rgba(255, 201, 40, 0.08)',
    borderColor: colors.gold,
    borderWidth: 4,
    position: 'absolute',
  },
  spotlightBorder: {
    borderColor: colors.gold,
    borderWidth: 2,
    position: 'absolute',
    shadowColor: colors.gold,
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 9,
  },
  coachHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 20,
    position: 'absolute',
    right: 20,
  },
  coachStepCount: {
    color: colors.gold,
    fontFamily: typography.bold,
    fontSize: 11,
    letterSpacing: 1.35,
  },
  coachHeaderTitle: {
    color: colors.white,
    fontFamily: typography.semibold,
    fontSize: 13,
    marginTop: 2,
    maxWidth: 240,
  },
  coachSkipButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    minHeight: 38,
    paddingHorizontal: 12,
  },
  coachSkipText: {
    color: colors.white,
    fontFamily: typography.semibold,
    fontSize: 13,
  },
  coachProgressTrack: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderRadius: radius.pill,
    height: 4,
    left: 20,
    overflow: 'hidden',
    position: 'absolute',
    right: 20,
  },
  progressFill: {
    backgroundColor: colors.gold,
    borderRadius: radius.pill,
    height: 4,
  },
  coachCard: {
    backgroundColor: colors.white,
    borderColor: 'rgba(255, 201, 40, 0.58)',
    borderRadius: 26,
    borderWidth: 1,
    padding: 17,
    position: 'absolute',
    ...shadows.soft,
  },
  coachArrow: {
    height: 0,
    position: 'absolute',
    width: 0,
  },
  coachArrow_up: {
    borderBottomColor: colors.white,
    borderBottomWidth: ARROW_SIZE,
    borderLeftColor: 'transparent',
    borderLeftWidth: ARROW_SIZE,
    borderRightColor: 'transparent',
    borderRightWidth: ARROW_SIZE,
    top: -ARROW_SIZE,
  },
  coachArrow_down: {
    borderLeftColor: 'transparent',
    borderLeftWidth: ARROW_SIZE,
    borderRightColor: 'transparent',
    borderRightWidth: ARROW_SIZE,
    borderTopColor: colors.white,
    borderTopWidth: ARROW_SIZE,
    bottom: -ARROW_SIZE,
  },
  coachArrow_left: {
    borderBottomColor: 'transparent',
    borderBottomWidth: ARROW_SIZE,
    borderRightColor: colors.white,
    borderRightWidth: ARROW_SIZE,
    borderTopColor: 'transparent',
    borderTopWidth: ARROW_SIZE,
    left: -ARROW_SIZE,
  },
  coachArrow_right: {
    borderBottomColor: 'transparent',
    borderBottomWidth: ARROW_SIZE,
    borderLeftColor: colors.white,
    borderLeftWidth: ARROW_SIZE,
    borderTopColor: 'transparent',
    borderTopWidth: ARROW_SIZE,
    right: -ARROW_SIZE,
  },
  coachGrip: {
    alignSelf: 'center',
    backgroundColor: colors.gold,
    borderRadius: radius.pill,
    height: 4,
    marginBottom: 13,
    opacity: 0.9,
    width: 42,
  },
  coachCardContent: {
    paddingBottom: 3,
  },
  coachTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  coachIcon: {
    alignItems: 'center',
    backgroundColor: colors.navy,
    borderColor: 'rgba(255, 201, 40, 0.5)',
    borderRadius: 22,
    borderWidth: 1,
    height: 46,
    justifyContent: 'center',
    marginRight: 12,
    width: 46,
  },
  coachTitleCopy: {
    flex: 1,
  },
  coachEyebrow: {
    color: '#8A6500',
    fontFamily: typography.bold,
    fontSize: 10,
    letterSpacing: 1.15,
    marginBottom: 2,
  },
  walkthroughTitle: {
    color: colors.navy,
    fontFamily: typography.bold,
    letterSpacing: -0.45,
  },
  walkthroughText: {
    color: colors.text,
    fontFamily: typography.regular,
    marginTop: 12,
    maxWidth: 520,
  },
  focusRow: {
    alignItems: 'center',
    backgroundColor: colors.navy,
    borderColor: 'rgba(255, 201, 40, 0.5)',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 13,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  focusText: {
    color: colors.white,
    flex: 1,
    fontFamily: typography.semibold,
    fontSize: 12,
    lineHeight: 17,
    marginLeft: 8,
  },
  locatingRow: {
    alignItems: 'center',
    backgroundColor: colors.navy,
    borderRadius: radius.md,
    flexDirection: 'row',
    marginTop: 13,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  locatingText: {
    color: colors.white,
    fontFamily: typography.medium,
    fontSize: 12,
    marginLeft: 9,
  },
  missingTargetNotice: {
    backgroundColor: '#FFF9E8',
    borderColor: '#F3D67D',
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: 13,
    padding: 11,
  },
  missingTargetCopy: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  missingTargetText: {
    color: colors.text,
    flex: 1,
    fontFamily: typography.medium,
    fontSize: 12,
    lineHeight: 17,
    marginLeft: 8,
  },
  retryButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.gold,
    borderRadius: radius.pill,
    flexDirection: 'row',
    marginTop: 9,
    minHeight: 36,
    paddingHorizontal: 12,
  },
  retryButtonText: {
    color: colors.navy,
    fontFamily: typography.bold,
    fontSize: 12,
    marginLeft: 5,
  },
  targetHint: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.muted,
    fontFamily: typography.medium,
    marginTop: 11,
    padding: 11,
  },
  workflowActionButton: {
    marginTop: 12,
    minHeight: 46,
  },
  dots: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 15,
  },
  dot: {
    backgroundColor: '#CCD5E3',
    borderRadius: 4,
    height: 7,
    width: 7,
  },
  dotComplete: {
    backgroundColor: '#8AA7CF',
  },
  dotActive: {
    backgroundColor: colors.gold,
    width: 24,
  },
  walkthroughFooter: {
    flexDirection: 'row',
    gap: 11,
    marginTop: 16,
  },
  footerButton: {
    flex: 1,
    minHeight: 48,
  },
  backButton: {
    borderColor: colors.navy,
  },
  backButtonText: {
    color: colors.navy,
  },
  nextButton: {
    backgroundColor: colors.gold,
  },
  nextButtonText: {
    color: colors.navy,
    fontFamily: typography.bold,
  },
});

export default NativeTourManager;
