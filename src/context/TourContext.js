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
import { AppState } from 'react-native';
import { AuthContext } from './AuthContext';
import { useLanguage } from './LanguageContext';
import {
  getEffectiveTourRole,
  getTourDashboardType,
  getTourDestinationForRole,
  getTourStepsForRole,
  getTourStepsForWorkflow,
  getTourWorkflowCatalog,
  TOUR_PROMPT_INTERVAL_DAYS,
  TOUR_VERSION,
} from '../config/tourConfig';
import { navigationRef } from '../navigation/navigationRef';
import { tourService } from '../services/tourService';

const {
  chooseNewestResumeCandidate,
  sanitizeTourContext,
  sanitizeTourIdentifier,
  timestampOf,
} = require('../services/tourPolicy.cjs');

export const TourContext = createContext(null);

const getDismissalKey = (userId, dashboardType) =>
  `rentalhub:tour:last-dismissal:${TOUR_VERSION}:${userId}:${dashboardType}`;
const getProgressKey = (userId, dashboardType) =>
  `rentalhub:tour:progress:${TOUR_VERSION}:${userId}:${dashboardType}`;

let tourEventSequence = 0;
const createTourEventId = () => {
  tourEventSequence = (tourEventSequence + 1) % 1000000;
  return [
    'mobile',
    Date.now().toString(36),
    tourEventSequence.toString(36),
    Math.random().toString(36).slice(2, 12),
  ].join('-');
};

const createTourSessionId = () => [
  'mobile-session',
  Date.now().toString(36),
  Math.random().toString(36).slice(2, 12),
].join('-');

const wait = (duration) => new Promise((resolve) => setTimeout(resolve, duration));

const clampStep = (value, stepCount) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || stepCount < 1) return 0;
  return Math.min(Math.max(parsed, 0), stepCount - 1);
};

const parseStoredProgress = (raw) => {
  if (!raw) return null;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

const unwrapTourState = (value) => value?.state || value || null;

const getLatestTourActivity = (...values) => values.reduce((latest, value) => {
  const timestamp = value ? new Date(value).getTime() : Number.NaN;
  if (!Number.isFinite(timestamp)) return latest;
  return !latest || timestamp > latest.timestamp
    ? { timestamp, value }
    : latest;
}, null)?.value || null;

const isPromptDue = (tourState, localDismissal) => {
  const state = unwrapTourState(tourState);
  if (state?.tour_version && String(state.tour_version) !== TOUR_VERSION) {
    return true;
  }

  const latestDate = getLatestTourActivity(
    state?.last_dismissed_at,
    state?.last_completed_at,
    state?.last_skipped_at,
    localDismissal
  );
  if (!latestDate) return true;

  const elapsed = Date.now() - new Date(latestDate).getTime();
  const interval = TOUR_PROMPT_INTERVAL_DAYS * 24 * 60 * 60 * 1000;
  return Number.isFinite(elapsed) && elapsed >= interval;
};

export const TourProvider = ({ children }) => {
  const { user, isAuthenticated } = useContext(AuthContext);
  const { language } = useLanguage();
  const [welcomeVisible, setWelcomeVisible] = useState(false);
  const [walkthroughVisible, setWalkthroughVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [activeWorkflowId, setActiveWorkflowId] = useState(null);
  const [tourState, setTourState] = useState(null);
  const [ready, setReady] = useState(false);
  const [resumeState, setResumeState] = useState(null);
  const [targetRegistryVersion, setTargetRegistryVersion] = useState(0);

  const promptedTourScope = useRef(null);
  const targetRegistry = useRef(new Map());
  const stepOrchestrators = useRef(new Set());
  const sessionId = useRef(null);
  const sequenceNumber = useRef(0);
  const reportedStepEvents = useRef(new Set());
  const walkthroughVisibleRef = useRef(false);
  const currentStepRef = useRef(0);
  const activeWorkflowIdRef = useRef(null);
  const stepsRef = useRef([]);
  const languageRef = useRef(language);
  const stepStartedAt = useRef(Date.now());

  const role = getEffectiveTourRole(user);
  const allSteps = useMemo(
    () => getTourStepsForRole(role, language),
    [language, role]
  );
  const workflows = useMemo(
    () => getTourWorkflowCatalog(role, language),
    [language, role]
  );
  const steps = useMemo(
    () => activeWorkflowId
      ? getTourStepsForWorkflow(role, activeWorkflowId, language)
      : allSteps,
    [activeWorkflowId, allSteps, language, role]
  );
  const dashboardType = useMemo(() => getTourDashboardType(role), [role]);

  stepsRef.current = steps;
  currentStepRef.current = currentStep;
  activeWorkflowIdRef.current = activeWorkflowId;
  walkthroughVisibleRef.current = walkthroughVisible;
  languageRef.current = language;

  const getStepList = useCallback((workflowId) => (
    workflowId
      ? getTourStepsForWorkflow(role, workflowId, languageRef.current)
      : getTourStepsForRole(role, languageRef.current)
  ), [role]);

  const registerTarget = useCallback((targetId, registration) => {
    const normalizedId = String(targetId || '').trim();
    if (!normalizedId || !registration) return () => {};

    const token = Symbol(normalizedId);
    targetRegistry.current.set(normalizedId, { ...registration, token });
    setTargetRegistryVersion((version) => version + 1);

    return () => {
      const currentRegistration = targetRegistry.current.get(normalizedId);
      if (currentRegistration?.token === token) {
        targetRegistry.current.delete(normalizedId);
        setTargetRegistryVersion((version) => version + 1);
      }
    };
  }, []);

  const notifyTargetLayout = useCallback((targetId) => {
    const normalizedId = String(targetId || '').trim();
    if (normalizedId && targetRegistry.current.has(normalizedId)) {
      setTargetRegistryVersion((version) => version + 1);
    }
  }, []);

  const getTargetOptions = useCallback((targetId) => {
    const registration = targetRegistry.current.get(String(targetId || '').trim());
    return registration?.getOptions?.() || registration?.options || {};
  }, []);

  const getTargetAvailability = useCallback(async (targetId, stepDefinition) => {
    const options = getTargetOptions(targetId);
    let available = options.available;
    if (typeof available === 'function') {
      try {
        available = await available({ step: stepDefinition, targetId });
      } catch {
        available = false;
      }
    }
    return {
      available: available !== false,
      reason: options.unavailableReason || stepDefinition?.unavailableReason || 'feature_unavailable',
    };
  }, [getTargetOptions]);

  const measureTarget = useCallback(async (targetId) => {
    const normalizedId = String(targetId || '').trim();
    const registration = targetRegistry.current.get(normalizedId);
    if (!registration) return null;

    const options = registration.getOptions?.() || registration.options || {};
    if (options.available === false) return null;

    if (typeof registration.measure === 'function') {
      try {
        const customMeasurement = await registration.measure();
        if (
          customMeasurement &&
          Number.isFinite(customMeasurement.x) &&
          Number.isFinite(customMeasurement.y) &&
          Number.isFinite(customMeasurement.width) &&
          Number.isFinite(customMeasurement.height) &&
          customMeasurement.width > 0 &&
          customMeasurement.height > 0
        ) {
          return { ...customMeasurement, targetId: normalizedId, options };
        }
      } catch {
        return null;
      }
      return null;
    }

    const node = registration.getNode?.() || registration.ref?.current;
    if (!node || typeof node.measureInWindow !== 'function') return null;

    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        const latestRegistration = targetRegistry.current.get(normalizedId);
        if (!latestRegistration || latestRegistration.token !== registration.token) {
          resolve(null);
          return;
        }

        let settled = false;
        const finish = (result) => {
          if (settled) return;
          settled = true;
          clearTimeout(measurementTimeout);
          resolve(result);
        };
        const measurementTimeout = setTimeout(() => finish(null), 350);

        try {
          node.measureInWindow((x, y, width, height) => {
            if (
              Number.isFinite(x) &&
              Number.isFinite(y) &&
              Number.isFinite(width) &&
              Number.isFinite(height) &&
              width > 0 &&
              height > 0
            ) {
              finish({
                x,
                y,
                width,
                height,
                targetId: normalizedId,
                options: latestRegistration.getOptions?.() || options,
              });
              return;
            }
            finish(null);
          });
        } catch {
          finish(null);
        }
      });
    });
  }, []);

  const waitForTarget = useCallback(async (
    targetId,
    { timeoutMs = 2200, intervalMs = 100, step: stepDefinition } = {}
  ) => {
    const startedAt = Date.now();

    while (Date.now() - startedAt <= timeoutMs) {
      if (targetRegistry.current.has(String(targetId || '').trim())) {
        const availability = await getTargetAvailability(targetId, stepDefinition);
        if (!availability.available) {
          return {
            status: 'unavailable',
            measurement: null,
            reason: availability.reason,
          };
        }
      }

      const measurement = await measureTarget(targetId);
      if (measurement) return { status: 'found', measurement };
      await wait(intervalMs);
    }

    return { status: 'missing', measurement: null };
  }, [getTargetAvailability, measureTarget]);

  const registerStepOrchestrator = useCallback((orchestrator) => {
    if (typeof orchestrator !== 'function') return () => {};
    stepOrchestrators.current.add(orchestrator);
    return () => stepOrchestrators.current.delete(orchestrator);
  }, []);

  const prepareTourStep = useCallback(async (
    stepDefinition,
    { timeoutMs = 2200, intervalMs = 100 } = {}
  ) => {
    const targetId = stepDefinition?.targetId || stepDefinition?.id;
    const normalizedTargetId = String(targetId || '').trim();
    const preparationStartedAt = Date.now();

    for (const orchestrator of stepOrchestrators.current) {
      try {
        const orchestration = await orchestrator(stepDefinition);
        if (['action', 'unavailable'].includes(orchestration?.status)) {
          return { measurement: null, ...orchestration };
        }
      } catch (error) {
        console.warn('Unable to prepare tour step:', error?.message || error);
      }
    }

    let registration = targetRegistry.current.get(normalizedTargetId);
    while (!registration && Date.now() - preparationStartedAt <= timeoutMs) {
      await wait(intervalMs);
      registration = targetRegistry.current.get(normalizedTargetId);
    }
    if (!registration) return { status: 'missing', measurement: null };

    const availability = await getTargetAvailability(targetId, stepDefinition);
    if (!availability.available) {
      return {
        status: 'unavailable',
        measurement: null,
        reason: availability.reason,
      };
    }

    const targetOptions = registration.getOptions?.() || registration.options || {};
    if (typeof targetOptions.onReveal === 'function') {
      try {
        await targetOptions.onReveal({
          node: registration.getNode?.() || registration.ref?.current || null,
          step: stepDefinition,
          targetId,
        });
        await wait(80);
      } catch (error) {
        console.warn('Unable to reveal tour target:', error?.message || error);
      }
    }

    return waitForTarget(targetId, {
      intervalMs,
      step: stepDefinition,
      timeoutMs: Math.max(intervalMs, timeoutMs - (Date.now() - preparationStartedAt)),
    });
  }, [getTargetAvailability, waitForTarget]);

  const recordEvent = useCallback(async (eventType, details = {}) => {
    if (!isAuthenticated || !user) return null;

    const nextSequence = sessionId.current
      ? sequenceNumber.current + 1
      : null;
    if (nextSequence !== null) sequenceNumber.current = nextSequence;
    const currentRoute = sanitizeTourIdentifier(
      details.route || details.context?.route || navigationRef.getCurrentRoute?.()?.name,
      80
    );
    const safeStepId = sanitizeTourIdentifier(details.stepId);
    const safeTargetId = sanitizeTourIdentifier(details.targetId || details.stepId);
    const safeReason = sanitizeTourIdentifier(
      details.reasonCode || details.context?.reason,
      80
    );
    const safeWorkflowId = sanitizeTourIdentifier(
      details.workflowId ?? activeWorkflowIdRef.current,
      100
    );
    const durationMs = Math.min(
      Math.max(Math.round(Number(details.durationMs) || 0), 0),
      86400000
    );
    const safeContext = sanitizeTourContext({
      ...details.context,
      route: currentRoute,
      reason: safeReason,
      workflow_id: safeWorkflowId,
    });

    try {
      const response = await tourService.recordEvent({
        event_id: createTourEventId(),
        platform: 'mobile',
        tour_key: dashboardType,
        event_type: eventType,
        dashboard_type: dashboardType,
        tour_version: TOUR_VERSION,
        step_id: safeStepId,
        current_step: details.currentStep,
        total_steps: details.totalSteps ?? stepsRef.current.length,
        locale: languageRef.current,
        route: currentRoute,
        target_id: safeTargetId,
        reason_code: safeReason,
        duration_ms: durationMs,
        client_created_at: new Date().toISOString(),
        ...(sessionId.current
          ? {
            session_id: sessionId.current,
            sequence_number: nextSequence,
          }
          : {}),
        context: {
          platform: 'mobile',
          role: sanitizeTourIdentifier(role, 80),
          ...safeContext,
        },
        metadata: {
          platform: 'mobile',
          source: details.source || 'native_tour',
          workflow_id: safeWorkflowId,
        },
      });
      const nextState = unwrapTourState(response?.data);
      if (response?.success) setTourState(nextState);
      return nextState;
    } catch (error) {
      console.warn('Unable to sync tour event:', error?.message || error);
      return null;
    }
  }, [dashboardType, isAuthenticated, role, user]);

  const persistProgress = useCallback(async ({
    index = currentStepRef.current,
    status = 'in_progress',
    workflowId = activeWorkflowIdRef.current,
    stepList,
  } = {}) => {
    if (!user?.id) return;
    const relevantSteps = stepList || getStepList(workflowId);
    const safeIndex = clampStep(index, relevantSteps.length);
    const stepDefinition = relevantSteps[safeIndex];
    await AsyncStorage.setItem(
      getProgressKey(user.id, dashboardType),
      JSON.stringify({
        can_resume: true,
        current_step: safeIndex,
        current_step_id: stepDefinition?.id || null,
        locale: languageRef.current,
        status,
        total_steps: relevantSteps.length,
        tour_version: TOUR_VERSION,
        updated_at: new Date().toISOString(),
        workflow_id: workflowId || null,
      })
    );
  }, [dashboardType, getStepList, user?.id]);

  const clearProgress = useCallback(async () => {
    if (!user?.id) return;
    await AsyncStorage.removeItem(getProgressKey(user.id, dashboardType));
  }, [dashboardType, user?.id]);

  const buildResumeCandidate = useCallback((raw) => {
    const state = parseStoredProgress(unwrapTourState(raw));
    if (!state || String(state.tour_version || TOUR_VERSION) !== TOUR_VERSION) return null;
    if (!(state.can_resume === true || ['in_progress', 'paused'].includes(state.status))) return null;

    const workflowId = state.workflow_id || state.context?.workflow_id || null;
    const candidateSteps = getStepList(workflowId);
    if (!candidateSteps.length) return null;
    const stepId = state.current_step_id || state.last_step_id || null;
    const matchedIndex = stepId
      ? candidateSteps.findIndex(({ id }) => id === stepId)
      : -1;
    const index = matchedIndex >= 0
      ? matchedIndex
      : clampStep(state.current_step, candidateSteps.length);

    return {
      index,
      stepId: candidateSteps[index]?.id || null,
      timestamp: timestampOf(
        state.progress_updated_at,
        state.updated_at,
        state.last_started_at
      ),
      workflowId,
    };
  }, [getStepList]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setWelcomeVisible(false);
      setWalkthroughVisible(false);
      setCurrentStep(0);
      setActiveWorkflowId(null);
      setTourState(null);
      setResumeState(null);
      setReady(false);
      promptedTourScope.current = null;
      return undefined;
    }

    let cancelled = false;
    const loadState = async () => {
      setReady(false);
      const [localDismissal, localProgressRaw, remoteResult] = await Promise.all([
        AsyncStorage.getItem(getDismissalKey(user.id, dashboardType)).catch(() => null),
        AsyncStorage.getItem(getProgressKey(user.id, dashboardType)).catch(() => null),
        tourService.getState({ dashboardType, tourKey: dashboardType }).catch(() => null),
      ]);
      const remoteState = remoteResult?.data || null;
      if (cancelled) return;

      const localCandidate = buildResumeCandidate(localProgressRaw);
      const remoteCandidate = buildResumeCandidate(remoteState);
      const resumable = chooseNewestResumeCandidate({
        localCandidate,
        remoteCandidate,
        remoteState: unwrapTourState(remoteState),
      });

      setTourState(remoteState);
      setResumeState(resumable);
      setReady(true);

      const tourScope = `${user.id}:${dashboardType}`;
      if (
        promptedTourScope.current !== tourScope &&
        (resumable || isPromptDue(remoteState, localDismissal))
      ) {
        promptedTourScope.current = tourScope;
        setWelcomeVisible(true);
        recordEvent('welcome_shown', {
          currentStep: resumable?.index,
          source: resumable ? 'resume_prompt' : 'auto_prompt',
          stepId: resumable?.stepId,
          workflowId: resumable?.workflowId,
        });
      }
    };

    loadState();
    return () => {
      cancelled = true;
    };
  }, [buildResumeCandidate, dashboardType, isAuthenticated, recordEvent, user?.id]);

  const saveDismissal = useCallback(async () => {
    if (!user?.id) return;
    await AsyncStorage.setItem(
      getDismissalKey(user.id, dashboardType),
      new Date().toISOString()
    );
  }, [dashboardType, user?.id]);

  const startTour = useCallback((options = {}) => {
    const shouldResume = options.resume === true || (
      options.resume !== false &&
      !options.replay &&
      !options.workflowId &&
      Boolean(resumeState)
    );
    const workflowId = shouldResume
      ? resumeState?.workflowId || null
      : options.workflowId || null;
    const nextSteps = getStepList(workflowId);
    const requestedIndex = shouldResume ? resumeState?.index : 0;
    const startIndex = clampStep(requestedIndex, nextSteps.length);
    const startStep = nextSteps[startIndex];

    sessionId.current = createTourSessionId();
    sequenceNumber.current = 0;
    reportedStepEvents.current.clear();
    activeWorkflowIdRef.current = workflowId;
    currentStepRef.current = startIndex;
    stepsRef.current = nextSteps;
    walkthroughVisibleRef.current = true;
    stepStartedAt.current = Date.now();

    setActiveWorkflowId(workflowId);
    setCurrentStep(startIndex);
    setResumeState(null);
    setWelcomeVisible(false);
    setWalkthroughVisible(true);
    persistProgress({ index: startIndex, stepList: nextSteps, workflowId }).catch(() => {});
    recordEvent(
      shouldResume ? 'resumed' : options.replay ? 'replayed' : 'started',
      {
        currentStep: startIndex,
        source: shouldResume
          ? 'resume_prompt'
          : options.replay
            ? 'settings'
            : 'welcome',
        stepId: startStep?.id,
        totalSteps: nextSteps.length,
        workflowId,
      }
    );
  }, [getStepList, persistProgress, recordEvent, resumeState]);

  const finishTour = useCallback(async (eventType) => {
    const relevantSteps = stepsRef.current;
    const index = clampStep(currentStepRef.current, relevantSteps.length);
    const stepDefinition = relevantSteps[index];
    await saveDismissal();
    await clearProgress();
    recordEvent(eventType, {
      currentStep: index,
      stepId: stepDefinition?.id,
      totalSteps: relevantSteps.length,
    });
    walkthroughVisibleRef.current = false;
    setWalkthroughVisible(false);
    setWelcomeVisible(false);
    setResumeState(null);
    setCurrentStep(0);
    setActiveWorkflowId(null);
  }, [clearProgress, recordEvent, saveDismissal]);

  const nextStep = useCallback(() => {
    const relevantSteps = stepsRef.current;
    const index = clampStep(currentStepRef.current, relevantSteps.length);
    const stepDefinition = relevantSteps[index];
    recordEvent('step_completed', {
      currentStep: index,
      durationMs: Date.now() - stepStartedAt.current,
      stepId: stepDefinition?.id,
      totalSteps: relevantSteps.length,
    });

    if (index >= relevantSteps.length - 1) {
      finishTour('completed');
      return;
    }

    const nextIndex = index + 1;
    stepStartedAt.current = Date.now();
    currentStepRef.current = nextIndex;
    setCurrentStep(nextIndex);
    persistProgress({ index: nextIndex, stepList: relevantSteps }).catch(() => {});
  }, [finishTour, persistProgress, recordEvent]);

  const previousStep = useCallback(() => {
    const previousIndex = Math.max(0, currentStepRef.current - 1);
    currentStepRef.current = previousIndex;
    stepStartedAt.current = Date.now();
    setCurrentStep(previousIndex);
    persistProgress({ index: previousIndex, stepList: stepsRef.current }).catch(() => {});
  }, [persistProgress]);

  const skipCurrentStep = useCallback((reason = 'target_not_available') => {
    const relevantSteps = stepsRef.current;
    const index = clampStep(currentStepRef.current, relevantSteps.length);
    const stepDefinition = relevantSteps[index];
    recordEvent('step_skipped', {
      currentStep: index,
      durationMs: Date.now() - stepStartedAt.current,
      reasonCode: reason,
      stepId: stepDefinition?.id,
      targetId: stepDefinition?.targetId,
      totalSteps: relevantSteps.length,
    });
    if (index >= relevantSteps.length - 1) {
      finishTour('completed');
      return;
    }
    const nextIndex = index + 1;
    stepStartedAt.current = Date.now();
    currentStepRef.current = nextIndex;
    setCurrentStep(nextIndex);
    persistProgress({ index: nextIndex, stepList: relevantSteps }).catch(() => {});
  }, [finishTour, persistProgress, recordEvent]);

  const executeStepAction = useCallback(async (stepDefinition = stepsRef.current[currentStepRef.current]) => {
    if (!stepDefinition) return { status: 'unavailable', reason: 'step_missing' };
    const targetId = stepDefinition.targetId || stepDefinition.id;
    const options = getTargetOptions(targetId);

    try {
      if (typeof options.onAction === 'function') {
        const availability = await getTargetAvailability(targetId, stepDefinition);
        if (!availability.available) {
          recordEvent('step_unavailable', {
            currentStep: currentStepRef.current,
            stepId: stepDefinition.id,
            context: { reason: availability.reason },
          });
          return { status: 'unavailable', reason: availability.reason };
        }
        await options.onAction({ step: stepDefinition, targetId });
      } else {
        const destination = getTourDestinationForRole(role, stepDefinition);
        const availableRoutes = navigationRef.isReady()
          ? navigationRef.getRootState()?.routeNames || []
          : [];
        if (!destination?.name || !availableRoutes.includes(destination.name)) {
          recordEvent('step_unavailable', {
            currentStep: currentStepRef.current,
            stepId: stepDefinition.id,
            context: {
              reason: 'route_unavailable',
              route: destination?.name || null,
            },
          });
          return { status: 'unavailable', reason: 'route_unavailable' };
        }
        navigationRef.navigate(destination.name, destination.params);
      }

      await wait(320);
      const targetResult = await waitForTarget(targetId, {
        intervalMs: 100,
        step: stepDefinition,
        timeoutMs: 1800,
      });
      recordEvent('action_completed', {
        currentStep: currentStepRef.current,
        durationMs: Date.now() - stepStartedAt.current,
        stepId: stepDefinition.id,
        context: {
          action_id: `open_${getTourDestinationForRole(role, stepDefinition)?.name || 'target'}`,
          route: getTourDestinationForRole(role, stepDefinition)?.name || null,
          target_status: targetResult.status,
        },
      });
      nextStep();
      return { status: 'completed', targetStatus: targetResult.status };
    } catch (error) {
      return { status: 'failed', reason: error?.message || 'action_failed' };
    }
  }, [
    getTargetAvailability,
    getTargetOptions,
    nextStep,
    recordEvent,
    role,
    waitForTarget,
  ]);

  const reportStepStatus = useCallback((eventType, stepDefinition, context = {}) => {
    if (!stepDefinition || !sessionId.current) return;
    const eventKey = `${sessionId.current}:${eventType}:${stepDefinition.id}`;
    if (reportedStepEvents.current.has(eventKey)) return;
    reportedStepEvents.current.add(eventKey);
    recordEvent(eventType, {
      currentStep: currentStepRef.current,
      context,
      durationMs: Date.now() - stepStartedAt.current,
      stepId: stepDefinition.id,
      targetId: stepDefinition.targetId,
    });
  }, [recordEvent]);

  const reportStepViewed = useCallback(
    (stepDefinition) => reportStepStatus('step_viewed', stepDefinition),
    [reportStepStatus]
  );
  const reportTargetMissing = useCallback(
    (stepDefinition) => reportStepStatus('target_missing', stepDefinition, {
      reason: 'target_not_visible',
    }),
    [reportStepStatus]
  );
  const reportStepUnavailable = useCallback(
    (stepDefinition, reason = 'route_unavailable') => reportStepStatus(
      'step_unavailable',
      stepDefinition,
      { reason }
    ),
    [reportStepStatus]
  );

  const skipTour = useCallback(() => finishTour('skipped'), [finishTour]);

  const dismissWelcome = useCallback(async () => {
    await saveDismissal();
    recordEvent('dismissed', {
      currentStep: resumeState?.index,
      source: resumeState ? 'resume_prompt' : 'welcome',
      stepId: resumeState?.stepId,
      workflowId: resumeState?.workflowId,
    });
    setWelcomeVisible(false);
  }, [recordEvent, resumeState, saveDismissal]);

  const replayTour = useCallback(() => startTour({ replay: true }), [startTour]);
  const replayWorkflow = useCallback(
    (workflowId) => startTour({ replay: true, workflowId }),
    [startTour]
  );

  useEffect(() => {
    if (!walkthroughVisible || !steps[currentStep]) return;
    const stepDefinition = steps[currentStep];
    const eventKey = `${sessionId.current}:step_viewed:${stepDefinition.id}`;
    persistProgress({ index: currentStep, stepList: steps }).catch(() => {});
    if (!reportedStepEvents.current.has(eventKey)) {
      reportedStepEvents.current.add(eventKey);
      recordEvent('step_viewed', {
        currentStep,
        stepId: stepDefinition.id,
        totalSteps: steps.length,
        context: {
          action_required: Boolean(stepDefinition.action),
          route: getTourDestinationForRole(role, stepDefinition)?.name || null,
        },
      });
    }
  }, [currentStep, persistProgress, recordEvent, role, steps, walkthroughVisible]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (!walkthroughVisibleRef.current || !['background', 'inactive'].includes(state)) return;
      const stepDefinition = stepsRef.current[currentStepRef.current];
      persistProgress({ status: 'paused', stepList: stepsRef.current }).catch(() => {});
      recordEvent('paused', {
        currentStep: currentStepRef.current,
        durationMs: Date.now() - stepStartedAt.current,
        source: 'app_state',
        stepId: stepDefinition?.id,
        totalSteps: stepsRef.current.length,
      });
    });
    return () => subscription.remove();
  }, [persistProgress, recordEvent]);

  const value = useMemo(() => ({
    activeWorkflowId,
    currentStep,
    dashboardType,
    dismissWelcome,
    executeStepAction,
    performStepAction: executeStepAction,
    measureTarget,
    nextStep,
    notifyTargetLayout,
    prepareTourStep,
    previousStep,
    ready,
    registerStepOrchestrator,
    registerTarget,
    replayTour,
    replayWorkflow,
    reportStepUnavailable,
    reportStepViewed,
    reportStepStatus,
    reportTargetMissing,
    resumeAvailable: Boolean(resumeState),
    resumeStep: resumeState?.index || 0,
    skipCurrentStep,
    skipTour,
    startTour,
    steps,
    targetRegistryVersion,
    tourState,
    waitForTarget,
    walkthroughVisible,
    welcomeVisible,
    workflows,
  }), [
    activeWorkflowId,
    currentStep,
    dashboardType,
    dismissWelcome,
    executeStepAction,
    measureTarget,
    nextStep,
    notifyTargetLayout,
    prepareTourStep,
    previousStep,
    ready,
    registerStepOrchestrator,
    registerTarget,
    replayTour,
    replayWorkflow,
    reportStepUnavailable,
    reportStepViewed,
    reportStepStatus,
    reportTargetMissing,
    resumeState,
    skipCurrentStep,
    skipTour,
    startTour,
    steps,
    targetRegistryVersion,
    tourState,
    waitForTarget,
    walkthroughVisible,
    welcomeVisible,
    workflows,
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
