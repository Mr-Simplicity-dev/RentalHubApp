import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import { View } from 'react-native';
import { useTour } from '../../context/TourContext';
import { useTourScrollReveal } from './TourScrollContext';

/**
 * Registers a native view with the guided-tour engine without changing the
 * view's interaction or accessibility behaviour.
 *
 * Usage:
 *   const tourTarget = useTourTarget('tenant_wallet', {
 *     label: 'Wallet',
 *     onReveal: () => scrollRef.current?.scrollTo({ y: walletY }),
 *   });
 *   <Pressable {...tourTarget}>...</Pressable>
 */
export const useTourTarget = (targetId, options = {}) => {
  const {
    notifyTargetLayout,
    registerTarget,
  } = useTour();
  const contextualReveal = useTourScrollReveal();
  const nativeRef = useRef(null);
  const optionsRef = useRef(options);
  optionsRef.current = {
    ...options,
    onReveal: options.onReveal || contextualReveal,
  };

  const normalizedId = String(targetId || '').trim();
  const enabled = options.disabled !== true && Boolean(normalizedId);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    return registerTarget(normalizedId, {
      getNode: () => nativeRef.current,
      getOptions: () => optionsRef.current,
    });
  }, [enabled, normalizedId, registerTarget]);

  const handleLayout = useCallback((event) => {
    optionsRef.current.onLayout?.(event);
    notifyTargetLayout(normalizedId);
  }, [normalizedId, notifyTargetLayout]);

  return {
    collapsable: false,
    onLayout: handleLayout,
    ref: nativeRef,
  };
};

/**
 * Convenience wrapper for controls that cannot accept a ref directly.
 * Prefer `useTourTarget` on an existing native Pressable/View when preserving
 * an exact flex layout is important.
 */
export const TourTarget = forwardRef(({
  available = true,
  children,
  disabled = false,
  id,
  label,
  onAction,
  onLayout,
  onReveal,
  padding = 8,
  radius = 18,
  unavailableReason,
  ...viewProps
}, forwardedRef) => {
  const targetProps = useTourTarget(id, {
    available,
    disabled,
    label,
    onAction,
    onLayout,
    onReveal,
    padding,
    radius,
    unavailableReason,
  });

  useImperativeHandle(forwardedRef, () => targetProps.ref.current);

  return (
    <View
      {...viewProps}
      collapsable={false}
      onLayout={targetProps.onLayout}
      ref={targetProps.ref}
    >
      {children}
    </View>
  );
});

TourTarget.displayName = 'TourTarget';

/**
 * Registers a single async preparation callback. A navigator-level bridge can
 * use this to move to the correct route/tab before the manager measures a
 * target. Returning a promise makes the tour wait for navigation/reveal work.
 */
export const useTourStepOrchestrator = (orchestrator) => {
  const { registerStepOrchestrator } = useTour();
  const orchestratorRef = useRef(orchestrator);
  orchestratorRef.current = orchestrator;

  useEffect(() => registerStepOrchestrator(
    (step) => orchestratorRef.current?.(step)
  ), [registerStepOrchestrator]);
};

export default TourTarget;
