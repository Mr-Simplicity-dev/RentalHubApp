import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from './AuthContext';
import {
  getTourDashboardType,
  getTourStepsForRole,
  TOUR_PROMPT_INTERVAL_DAYS,
  TOUR_VERSION,
} from '../config/tourConfig';
import { tourService } from '../services/tourService';

export const TourContext = createContext(null);

const getDismissalKey = (userId) => `rentalhub:tour:last-dismissal:${userId}`;

const isPromptDue = (tourState, localDismissal) => {
  if (tourState?.tour_version && String(tourState.tour_version) !== TOUR_VERSION) {
    return true;
  }

  const latestDate =
    tourState?.last_dismissed_at ||
    tourState?.last_completed_at ||
    localDismissal;

  if (!latestDate) {
    return true;
  }

  const elapsed = Date.now() - new Date(latestDate).getTime();
  const interval = TOUR_PROMPT_INTERVAL_DAYS * 24 * 60 * 60 * 1000;
  return Number.isFinite(elapsed) && elapsed >= interval;
};

export const TourProvider = ({ children }) => {
  const { user, isAuthenticated } = useContext(AuthContext);
  const [welcomeVisible, setWelcomeVisible] = useState(false);
  const [walkthroughVisible, setWalkthroughVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [tourState, setTourState] = useState(null);
  const [ready, setReady] = useState(false);
  const promptedUserId = useRef(null);

  const role = user?.user_type || 'tenant';
  const steps = useMemo(() => getTourStepsForRole(role), [role]);
  const dashboardType = useMemo(() => getTourDashboardType(role), [role]);

  const recordEvent = useCallback(async (eventType, details = {}) => {
    if (!isAuthenticated || !user) {
      return null;
    }

    try {
      const response = await tourService.recordEvent({
        event_type: eventType,
        dashboard_type: dashboardType,
        tour_version: TOUR_VERSION,
        step_id: details.stepId,
        current_step: details.currentStep,
        total_steps: steps.length,
        metadata: {
          platform: 'mobile',
          source: details.source || 'native_tour',
        },
      });
      if (response?.success) {
        setTourState(response.data || null);
      }
      return response?.data || null;
    } catch (error) {
      console.warn('Unable to sync tour event:', error?.message || error);
      return null;
    }
  }, [dashboardType, isAuthenticated, steps.length, user]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setWelcomeVisible(false);
      setWalkthroughVisible(false);
      setCurrentStep(0);
      setTourState(null);
      setReady(false);
      promptedUserId.current = null;
      return undefined;
    }

    let cancelled = false;

    const loadState = async () => {
      setReady(false);
      const [localDismissal, remoteResult] = await Promise.all([
        AsyncStorage.getItem(getDismissalKey(user.id)).catch(() => null),
        tourService.getState().catch(() => null),
      ]);
      const remoteState = remoteResult?.data || null;

      if (cancelled) {
        return;
      }

      setTourState(remoteState);
      setReady(true);

      if (
        promptedUserId.current !== String(user.id) &&
        isPromptDue(remoteState, localDismissal)
      ) {
        promptedUserId.current = String(user.id);
        setWelcomeVisible(true);
        recordEvent('welcome_shown', { source: 'auto_prompt' });
      }
    };

    loadState();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, recordEvent, user?.id]);

  const saveDismissal = useCallback(async () => {
    if (!user?.id) {
      return;
    }
    await AsyncStorage.setItem(getDismissalKey(user.id), new Date().toISOString());
  }, [user?.id]);

  const startTour = useCallback((options = {}) => {
    setCurrentStep(0);
    setWelcomeVisible(false);
    setWalkthroughVisible(true);
    recordEvent(options.replay ? 'replayed' : 'started', {
      currentStep: 0,
      source: options.replay ? 'profile' : 'welcome',
    });
  }, [recordEvent]);

  const finishTour = useCallback(async (eventType) => {
    const step = steps[currentStep];
    await saveDismissal();
    recordEvent(eventType, {
      currentStep,
      stepId: step?.id,
    });
    setWalkthroughVisible(false);
    setWelcomeVisible(false);
    setCurrentStep(0);
  }, [currentStep, recordEvent, saveDismissal, steps]);

  const nextStep = useCallback(() => {
    if (currentStep >= steps.length - 1) {
      finishTour('completed');
      return;
    }
    setCurrentStep((value) => value + 1);
  }, [currentStep, finishTour, steps.length]);

  const previousStep = useCallback(() => {
    setCurrentStep((value) => Math.max(0, value - 1));
  }, []);

  const skipTour = useCallback(() => {
    finishTour('skipped');
  }, [finishTour]);

  const dismissWelcome = useCallback(async () => {
    await saveDismissal();
    recordEvent('dismissed', { source: 'welcome' });
    setWelcomeVisible(false);
  }, [recordEvent, saveDismissal]);

  const replayTour = useCallback(() => {
    startTour({ replay: true });
  }, [startTour]);

  const value = useMemo(() => ({
    currentStep,
    dashboardType,
    dismissWelcome,
    nextStep,
    previousStep,
    ready,
    replayTour,
    skipTour,
    startTour,
    steps,
    tourState,
    walkthroughVisible,
    welcomeVisible,
  }), [
    currentStep,
    dashboardType,
    dismissWelcome,
    nextStep,
    previousStep,
    ready,
    replayTour,
    skipTour,
    startTour,
    steps,
    tourState,
    walkthroughVisible,
    welcomeVisible,
  ]);

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
};

export const useTour = () => {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within TourProvider');
  }
  return context;
};
