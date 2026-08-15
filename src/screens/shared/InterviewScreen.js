import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { CameraView, useCameraPermissions } from 'expo-camera';
import FaceDetection from '@react-native-ml-kit/face-detection';
import {
  InfoRow,
  PremiumButton,
  PremiumCard,
  PremiumCenter,
  PremiumHero,
  PremiumScreen,
  StatusPill,
} from '../../components/common/PremiumLayout';
import recruitmentService from '../../services/recruitmentService';
import { getErrorMessage } from '../../utils/http';
import { colors, radius, typography } from '../../theme';

import AppText from '../../components/common/AppText';

// ============================================================
// Proctoring constants (mirror the web proctor behaviour)
// ============================================================
const QUESTION_TIME_LIMIT_SECONDS = 30;
const DETECTION_INTERVAL_MS = 1200;
const CONSECUTIVE_NO_FACE_VIOLATIONS = 3;
const CONSECUTIVE_MULTI_FACE_VIOLATIONS = 2;
const BLINK_CLOSED_THRESHOLD = 0.25;
const BLINK_CLOSED_FRAMES_REQUIRED = 2;
const NO_BLINK_WINDOW_MS = 30000;
const CHALLENGE_INTERVAL_MS = 45000;
const CHALLENGE_TIMEOUT_MS = 6000;
const CHALLENGE_YAW_DEGREES = 25;
const PING_INTERVAL_MS = 60000;
const INACTIVITY_WARNING_MS = 120000;
const RECORDING_MAX_DURATION_SECONDS = 3900;
const MOBILE_FINGERPRINT_PREFIX = 'mobile:';

const ProgressBar = ({ value }) => (
  <View style={styles.progressTrack}>
    <View style={[styles.progressFill, { width: `${value}%` }]} />
  </View>
);

const InterviewScreen = ({ route, navigation }) => {
  const applicationId = route?.params?.applicationId;
  const phoneNumber = route?.params?.phoneNumber;
  const email = route?.params?.email;
  const referenceNumber = route?.params?.referenceNumber;

  // ── Q&A state ──
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [challengeToken, setChallengeToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [completedSummary, setCompletedSummary] = useState(null);
  const [error, setError] = useState('');
  const [consented, setConsented] = useState(false);
  const [questionTimeLeft, setQuestionTimeLeft] = useState(QUESTION_TIME_LIMIT_SECONDS);

  // ── Proctoring state ──
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [interviewActive, setInterviewActive] = useState(false);
  const [faceStatus, setFaceStatus] = useState({ faces: 0, status: 'idle' });
  const [livenessStatus, setLivenessStatus] = useState('unavailable');
  const [livenessChallenge, setLivenessChallenge] = useState(null);
  const [proctoringAvailable, setProctoringAvailable] = useState(true);
  const [locked, setLocked] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [sessionExpiresAt, setSessionExpiresAt] = useState(null);
  const [sessionTimeLeft, setSessionTimeLeft] = useState(0);
  const [inactivityWarning, setInactivityWarning] = useState(false);
  const [recordingReady, setRecordingReady] = useState(false);

  // ── Refs ──
  const cameraRef = useRef(null);
  const detectionTimerRef = useRef(null);
  const questionTimerRef = useRef(null);
  const pingTimerRef = useRef(null);
  const sessionTimerRef = useRef(null);
  const recordingPromiseRef = useRef(null);
  const lastPingAckRef = useRef(0);
  const challengeAtRef = useRef(0);
  const lastChallengeRef = useRef(0);
  const lastBlinkAtRef = useRef(0);
  const eyeClosedFramesRef = useRef(0);
  const challengePassFramesRef = useRef(0);
  const noFaceFramesRef = useRef(0);
  const multiFaceFramesRef = useRef(0);
  const violationReportedRef = useRef(false);
  const photoFailureRef = useRef(0);
  const lockedRef = useRef(false);
  const clientEventsRef = useRef([]);

  const fingerprint = useMemo(
    () => `${MOBILE_FINGERPRINT_PREFIX}${referenceNumber || ''}`,
    [referenceNumber]
  );
  const currentQuestion = questions[currentIndex];
  const progress = useMemo(() => {
    if (!questions.length) return 0;
    return ((currentIndex + 1) / questions.length) * 100;
  }, [currentIndex, questions.length]);

  // ── Helpers ──
  const bufferEvent = useCallback((event) => {
    clientEventsRef.current.push(event);
  }, []);

  const uploadRecording = useCallback(async () => {
    if (!recordingPromiseRef.current) return true;
    const { uri } = await recordingPromiseRef.current.catch(() => ({ uri: null }));
    recordingPromiseRef.current = null;
    if (!uri) return true;

    const upload = async () => {
      const formData = new FormData();
      formData.append('recording', {
        uri,
        name: `recruitment-interview-${Date.now()}.mp4`,
        type: 'video/mp4',
      });
      formData.append('application_id', String(applicationId || ''));
      formData.append('challenge_token', challengeToken);
      formData.append('fingerprint', fingerprint);
      formData.append('violation_log', lockedRef.current ? 'Interview locked by proctoring' : '');
      const params = new URLSearchParams({
        application_id: String(applicationId || ''),
        challenge_token: challengeToken,
      });
      return recruitmentService.uploadInterviewRecording(params.toString(), formData);
    };

    try {
      await upload();
      return true;
    } catch {
      try {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await upload();
        return true;
      } catch {
        Toast.show({
          type: 'error',
          text1: 'Recording not saved',
          text2: 'Your interview recording failed to upload. Please contact recruitment support.',
        });
        return false;
      }
    }
  }, [applicationId, challengeToken, fingerprint]);

  const stopAndUploadRecording = useCallback(async () => {
    if (cameraRef.current?.stopRecording) {
      try {
        cameraRef.current.stopRecording();
      } catch {}
    }
    return uploadRecording();
  }, [uploadRecording]);

  const cleanupTimers = useCallback(() => {
    if (detectionTimerRef.current) clearInterval(detectionTimerRef.current);
    if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    if (pingTimerRef.current) clearInterval(pingTimerRef.current);
    if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    detectionTimerRef.current = null;
    questionTimerRef.current = null;
    pingTimerRef.current = null;
    sessionTimerRef.current = null;
  }, []);

  const handleSessionEnd = useCallback(async (message) => {
    if (lockedRef.current) return;
    lockedRef.current = true;
    cleanupTimers();
    setLocked(true);
    setInterviewActive(false);
    setSessionEnded(true);
    setError(message || 'This interview session is no longer active. Please contact recruitment support.');
    await stopAndUploadRecording();
  }, [cleanupTimers, stopAndUploadRecording]);

  const reportViolation = useCallback(async (type, details) => {
    if (lockedRef.current || violationReportedRef.current) return;
    lockedRef.current = true;
    violationReportedRef.current = true;
    cleanupTimers();
    setLocked(true);
    setFaceStatus((prev) => ({ ...prev, status: 'locked' }));
    try {
      await recruitmentService.reportViolation({
        application_id: Number(applicationId),
        violation_type: type,
        details,
        challenge_token: challengeToken,
        fingerprint,
      });
    } catch (err) {
      if (err?.response?.status === 410) {
        setSessionEnded(true);
      }
    } finally {
      await stopAndUploadRecording();
    }
  }, [applicationId, challengeToken, cleanupTimers, fingerprint, stopAndUploadRecording]);

  // ── Start interview ──
  const startInterview = async () => {
    if (!consented) {
      Toast.show({
        type: 'error',
        text1: 'Consent required',
        text2: 'Please confirm that you consent to being recorded before starting the interview.',
      });
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await recruitmentService.startInterview({
        application_id: Number(applicationId),
        phone_number: phoneNumber,
        applicant_email: email,
        email_address: email,
        reference_number: referenceNumber,
        consent: true,
        fingerprint,
      });
      const data = response?.data?.data;
      setQuestions(data?.questions || []);
      setChallengeToken(data?.challenge_token || '');
      setSessionExpiresAt(data?.session_expires_at ? new Date(data.session_expires_at) : null);
    } catch (err) {
      if (err?.response?.status === 410) {
        setSessionEnded(true);
        setError('This interview session is no longer active. Please contact recruitment support.');
        return;
      }
      setError(getErrorMessage(err, 'Could not start interview'));
    } finally {
      setLoading(false);
    }
  };

  // ── Begin proctored session (after questions load) ──
  useEffect(() => {
    if (!questions.length || !challengeToken || interviewActive || lockedRef.current) return undefined;

    const begin = async () => {
      if (!cameraPermission?.granted) {
        const granted = await requestCameraPermission();
        if (!granted?.granted) {
          setError('Camera access is required for the proctored interview. Please allow camera access and try again.');
          return;
        }
      }
      setInterviewActive(true);
      setRecordingReady(true);
      lastPingAckRef.current = Date.now();
      violationReportedRef.current = false;

      // Continuous video recording (evidence). The promise resolves when
      // stopRecording() is called or maxDuration is reached.
      try {
        if (cameraRef.current?.recordAsync) {
          recordingPromiseRef.current = cameraRef.current.recordAsync({
            maxDuration: RECORDING_MAX_DURATION_SECONDS,
            mute: false,
          });
        }
      } catch {}

      // Keep-alive ping (server also refreshes on answer submissions).
      const ping = async () => {
        try {
          const buffered = clientEventsRef.current;
          clientEventsRef.current = [];
          await recruitmentService.pingInterview({
            application_id: Number(applicationId),
            challenge_token: challengeToken,
            fingerprint,
            ...(buffered.length ? { client_events: buffered } : {}),
          });
          lastPingAckRef.current = Date.now();
          setInactivityWarning(false);
        } catch (err) {
          if (err?.response?.status === 410) {
            handleSessionEnd();
          }
        }
      };
      ping();
      pingTimerRef.current = setInterval(ping, PING_INTERVAL_MS);

      // Detection loop: photo → ML Kit face analysis.
      detectionTimerRef.current = setInterval(async () => {
        if (lockedRef.current || !cameraRef.current?.takePictureAsync) return;
        let photo;
        try {
          photo = await cameraRef.current.takePictureAsync({ fastMode: true, quality: 0.5 });
        } catch {
          photoFailureRef.current += 1;
          if (photoFailureRef.current >= 3 && proctoringAvailable) {
            // iOS does not allow photos while recording video: degrade
            // honestly to recording-only, exactly like the web fallback.
            setProctoringAvailable(false);
            setFaceStatus({ faces: 0, status: 'idle' });
          }
          return;
        }
        if (!photo?.uri || lockedRef.current) return;

        try {
          const faces = await FaceDetection.detect(photo.uri, {
            performanceMode: 'fast',
            landmarkMode: 'all',
            classificationMode: 'all',
            minFaceSize: 0.1,
          });
          await analyzeFaces(faces);
        } catch {}
      }, DETECTION_INTERVAL_MS);

      // Session countdown + challenge scheduler.
      sessionTimerRef.current = setInterval(() => {
        if (lockedRef.current) return;
        if (sessionExpiresAt) {
          const left = Math.max(0, Math.floor((new Date(sessionExpiresAt).getTime() - Date.now()) / 1000));
          setSessionTimeLeft(left);
          if (left <= 0) {
            handleSessionEnd('Your interview time has ended. Your answers have been submitted for review.');
            return;
          }
        }
        if (lastPingAckRef.current && Date.now() - lastPingAckRef.current > INACTIVITY_WARNING_MS) {
          setInactivityWarning(true);
        }
        if (!livenessChallenge) {
          if (Date.now() - lastChallengeRef.current >= CHALLENGE_INTERVAL_MS) {
            const types = ['blink', 'left', 'right'];
            const type = types[Math.floor(Math.random() * types.length)];
            challengeAtRef.current = Date.now();
            challengePassFramesRef.current = 0;
            setLivenessChallenge(type);
          }
        } else if (Date.now() - challengeAtRef.current >= CHALLENGE_TIMEOUT_MS) {
          bufferEvent(`liveness_challenge_failed:${livenessChallenge}`);
          setLivenessChallenge(null);
          lastChallengeRef.current = Date.now();
        }
      }, 1000);

      // App backgrounding is the native equivalent of a tab switch.
      const appStateListener = AppState.addEventListener('change', (nextState) => {
        if (nextState === 'background' && !lockedRef.current) {
          bufferEvent('app_background');
        }
      });

      return () => {
        cleanupTimers();
        appStateListener.remove();
      };
    };

    begin();
  }, [questions, challengeToken, interviewActive, cameraPermission, requestCameraPermission, sessionExpiresAt, fingerprint, applicationId, proctoringAvailable, livenessChallenge, bufferEvent, cleanupTimers, handleSessionEnd]);

  // ── Face analysis (blink, liveness, violations) ──
  const analyzeFaces = useCallback(async (faces) => {
    if (lockedRef.current) return;
    const count = faces.length;

    if (count > 1) {
      multiFaceFramesRef.current += 1;
      noFaceFramesRef.current = 0;
      setFaceStatus({ faces: count, status: 'warning' });
      if (multiFaceFramesRef.current >= CONSECUTIVE_MULTI_FACE_VIOLATIONS) {
        setFaceStatus({ faces: count, status: 'violation' });
        await reportViolation('multiple_faces', `Detected ${count} faces in frame`);
      }
      return;
    }
    multiFaceFramesRef.current = 0;

    if (count === 0) {
      noFaceFramesRef.current += 1;
      setFaceStatus({ faces: 0, status: 'warning' });
      if (noFaceFramesRef.current >= CONSECUTIVE_NO_FACE_VIOLATIONS) {
        setFaceStatus({ faces: 0, status: 'violation' });
        await reportViolation('candidate_left_frame', 'No face detected for multiple frames');
      }
      return;
    }
    noFaceFramesRef.current = 0;

    const face = faces[0];
    const leftOpen = face.leftEyeOpenProbability;
    const rightOpen = face.rightEyeOpenProbability;

    if (typeof leftOpen === 'number' && typeof rightOpen === 'number') {
      const eyesClosed = leftOpen < BLINK_CLOSED_THRESHOLD && rightOpen < BLINK_CLOSED_THRESHOLD;
      if (eyesClosed) {
        eyeClosedFramesRef.current += 1;
      } else {
        if (eyeClosedFramesRef.current >= BLINK_CLOSED_FRAMES_REQUIRED) {
          lastBlinkAtRef.current = Date.now();
          setLivenessStatus('ok');
        }
        eyeClosedFramesRef.current = 0;
      }
    }

    if (!lastBlinkAtRef.current) lastBlinkAtRef.current = Date.now();

    // No-blink window flag (static photo detection).
    const now = Date.now();
    if (now - lastBlinkAtRef.current > NO_BLINK_WINDOW_MS) {
      setLivenessStatus('no_blink');
      bufferEvent('possible_liveness_failure');
      lastBlinkAtRef.current = now;
    }

    // Randomized challenge response.
    if (livenessChallenge) {
      let passed = false;
      if (livenessChallenge === 'blink') {
        passed = lastBlinkAtRef.current >= challengeAtRef.current;
      } else {
        const yaw = Math.abs(Number(face.rotationY) || 0);
        if (yaw >= CHALLENGE_YAW_DEGREES) {
          challengePassFramesRef.current += 1;
          passed = challengePassFramesRef.current >= 2;
        } else {
          challengePassFramesRef.current = 0;
        }
      }
      if (passed) {
        setLivenessChallenge(null);
        setLivenessStatus('ok');
        lastChallengeRef.current = now;
      }
    }

    setFaceStatus({ faces: 1, status: 'monitoring' });
  }, [bufferEvent, livenessChallenge, reportViolation]);

  // ── Per-question timer (auto-submit X on timeout) ──
  useEffect(() => {
    if (!interviewActive || lockedRef.current || !currentQuestion) return undefined;
    setQuestionTimeLeft(QUESTION_TIME_LIMIT_SECONDS);
    questionTimerRef.current = setInterval(() => {
      setQuestionTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(questionTimerRef.current);
          submitAnswer('X');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    };
  }, [interviewActive, currentIndex, currentQuestion]);

  // ── Answer submission ──
  const submitAnswer = useCallback(async (answer) => {
    if (!currentQuestion || !challengeToken || !applicationId || lockedRef.current) return;
    if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    try {
      setSubmitting(true);
      const response = await recruitmentService.submitInterviewAnswer({
        application_id: Number(applicationId),
        question_id: currentQuestion.id,
        answer,
        challenge_token: challengeToken,
        fingerprint,
      });
      if (currentIndex < questions.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        await finishInterview();
      }
    } catch (err) {
      if (err?.response?.status === 410) {
        handleSessionEnd();
        return;
      }
      Toast.show({
        type: 'error',
        text1: 'Interview failed',
        text2: getErrorMessage(err, 'Could not submit your answer'),
      });
    } finally {
      setSubmitting(false);
    }
  }, [applicationId, challengeToken, currentIndex, currentQuestion, fingerprint, handleSessionEnd, questions.length]);

  const finishInterview = useCallback(async () => {
    cleanupTimers();
    setInterviewActive(false);
    try {
      const completionResponse = await recruitmentService.completeInterview({
        application_id: Number(applicationId),
        challenge_token: challengeToken,
        fingerprint,
      });
      setCompletedSummary(completionResponse?.data?.data || null);
      await new Promise((resolve) => setTimeout(resolve, 800));
      await stopAndUploadRecording();
      Toast.show({
        type: 'success',
        text1: 'Interview complete',
        text2: `Score: ${completionResponse?.data?.data?.score || 0}%`,
      });
    } catch (err) {
      if (err?.response?.status === 410) {
        handleSessionEnd();
        return;
      }
      Toast.show({
        type: 'error',
        text1: 'Interview failed',
        text2: getErrorMessage(err, 'Could not complete your interview'),
      });
    }
  }, [applicationId, challengeToken, cleanupTimers, fingerprint, handleSessionEnd, stopAndUploadRecording]);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      cleanupTimers();
      if (cameraRef.current?.stopRecording) {
        try { cameraRef.current.stopRecording(); } catch {}
      }
    };
  }, [cleanupTimers]);

  const formatSessionTime = (totalSeconds) => {
    const safe = Math.max(Number(totalSeconds) || 0, 0);
    const minutes = Math.floor(safe / 60);
    const seconds = safe % 60;
    const pad = (value) => String(value).padStart(2, '0');
    return `${pad(minutes)}:${pad(seconds)}`;
  };

  // ── Renders ──
  if (loading) {
    return <PremiumCenter loading title="Launching interview" message="Preparing your proctored session..." />;
  }

  if (sessionEnded) {
    return (
      <PremiumCenter
        icon="lock-closed-outline"
        title="Session ended"
        message={error}
        tone="danger"
      />
    );
  }

  if (error && !questions.length) {
    return (
      <PremiumCenter
        icon="alert-circle-outline"
        title="Interview unavailable"
        message={error}
        tone="danger"
      />
    );
  }

  if (!questions.length) {
    return (
      <PremiumScreen>
        <PremiumHero
          eyebrow="Recruitment interview"
          title="Proctored interview"
          subtitle="You will answer multiple-choice questions while your camera records and monitors your session."
          icon="videocam-outline"
        />

        <PremiumCard>
          <InfoRow icon="notifications-outline" label="Recording" value="Video and audio are recorded" />
          <InfoRow icon="shield-checkmark-outline" label="Monitoring" value="Face monitoring and liveness checks" />
          <InfoRow icon="timer-outline" label="Session" value="A total time limit applies" />
          <TouchableOpacity
            activeOpacity={0.84}
            style={styles.consentRow}
            onPress={() => setConsented((prev) => !prev)}
          >
            <View style={[styles.checkbox, consented && styles.checkboxChecked]}>
              {consented ? <AppText style={styles.checkboxMark}>✓</AppText> : null}
            </View>
            <AppText style={styles.consentText}>
              I consent to being video and audio recorded during this proctored interview for assessment and integrity purposes.
            </AppText>
          </TouchableOpacity>
          <PremiumButton
            title="Start interview"
            onPress={startInterview}
            icon="play-outline"
            disabled={!consented || loading}
          />
        </PremiumCard>
      </PremiumScreen>
    );
  }

  // ── Proctored room ──
  return (
    <View style={styles.room}>
      {interviewActive && (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="front"
          mode="video"
          active={interviewActive}
        />
      )}

      {!interviewActive && (
        <View style={[StyleSheet.absoluteFill, styles.cameraPlaceholder]}>
          <AppText style={styles.cameraPlaceholderText}>Preparing camera...</AppText>
        </View>
      )}

      {/* ── Status header ── */}
      <View style={styles.header}>
        <View style={styles.statusRow}>
          {interviewActive && (
            <>
              <StatusPill
                label={
                  faceStatus.status === 'monitoring'
                    ? 'Face: OK'
                    : faceStatus.status === 'violation'
                    ? 'Violation'
                    : faceStatus.faces > 0
                    ? `Faces: ${faceStatus.faces}`
                    : 'No face'
                }
                color={faceStatus.status === 'violation' ? colors.danger : colors.gold}
              />
              <StatusPill
                label={livenessChallenge ? 'Challenge!' : 'Liveness'}
                color={livenessChallenge ? colors.gold : livenessStatus === 'no_blink' ? colors.danger : colors.success}
              />
              <StatusPill
                label={`Session ${formatSessionTime(sessionTimeLeft)}`}
                color={sessionTimeLeft <= 300 ? colors.gold : colors.blue}
              />
              {!proctoringAvailable && (
                <StatusPill label="Recording only" color={colors.warning} />
              )}
            </>
          )}
        </View>
      </View>

      {/* ── Inactivity warning ── */}
      {inactivityWarning && !locked && (
        <View style={styles.warningBanner}>
          <AppText style={styles.warningBannerText}>
            No activity detected! Answer a question to keep your session active.
          </AppText>
        </View>
      )}

      {/* ── Liveness challenge banner ── */}
      {livenessChallenge && !locked && (
        <View style={styles.challengeBanner}>
          <AppText style={styles.challengeText}>
            {livenessChallenge === 'blink'
              ? 'Liveness check: Please BLINK now'
              : `Liveness check: Please turn your head ${livenessChallenge.toUpperCase()} and back`}
          </AppText>
        </View>
      )}

      {/* ── Question card ── */}
      {interviewActive && !locked && currentQuestion && (
        <View style={styles.questionCard}>
          <View style={styles.progressHeader}>
            <AppText style={styles.progressHeaderText}>
              Question {currentIndex + 1} of {questions.length}
            </AppText>
            <AppText style={styles.timerText}>{questionTimeLeft}s</AppText>
          </View>
          <ProgressBar value={progress} />
          <AppText style={styles.questionText}>{currentQuestion.question}</AppText>
          <View style={styles.optionGrid}>
            {['option_a', 'option_b', 'option_c', 'option_d'].map((key) => (
              <TouchableOpacity
                key={key}
                activeOpacity={0.84}
                style={styles.optionButton}
                onPress={() => submitAnswer(key.replace('option_', '').toUpperCase())}
                disabled={submitting}
              >
                <AppText style={styles.optionBadge}>{key.replace('option_', '').toUpperCase()}</AppText>
                <AppText style={styles.optionText}>{currentQuestion[key]}</AppText>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              activeOpacity={0.84}
              style={styles.skipButton}
              onPress={() => submitAnswer('X')}
              disabled={submitting}
            >
              <AppText style={styles.skipText}>Skip question</AppText>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Locked / session ended overlay ── */}
      {locked && (
        <View style={styles.lockedOverlay}>
          <AppText style={styles.lockedTitle}>
            {sessionEnded ? 'Session ended' : 'Interview locked'}
          </AppText>
          <AppText style={styles.lockedText}>
            {sessionEnded
              ? 'This interview session is no longer active. Please contact recruitment support.'
              : 'A proctoring violation was detected. Your answers so far have been submitted for review.'}
          </AppText>
          <PremiumButton
            title="Back"
            onPress={() => navigation.goBack()}
            icon="arrow-back-outline"
          />
        </View>
      )}

      {/* ── Completed summary ── */}
      {completedSummary && (
        <View style={styles.completedOverlay}>
          <PremiumCard style={styles.completeCard}>
            <AppText style={styles.completeTitle}>Interview complete</AppText>
            <InfoRow icon="stats-chart-outline" label="Score" value={`${completedSummary.score}%`} />
            <InfoRow icon="checkmark-done-outline" label="Correct answers" value={completedSummary.correct_answers} />
            <InfoRow
              icon="shield-checkmark-outline"
              label="Passed"
              value={completedSummary.passed ? 'Yes' : 'No'}
              valueStyle={{ color: completedSummary.passed ? colors.success : colors.danger }}
            />
            <PremiumButton
              title="Back to applications"
              onPress={() => navigation.goBack()}
              icon="arrow-back-outline"
            />
          </PremiumCard>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  room: {
    flex: 1,
    backgroundColor: colors.ink,
  },
  cameraPlaceholder: {
    alignItems: 'center',
    backgroundColor: '#0F172A',
    justifyContent: 'center',
  },
  cameraPlaceholderText: {
    color: colors.muted,
    fontFamily: typography.medium,
  },
  header: {
    left: 0,
    paddingHorizontal: 14,
    paddingTop: 14,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 20,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  warningBanner: {
    backgroundColor: 'rgba(217,119,6,0.92)',
    borderRadius: radius.md,
    left: 14,
    padding: 12,
    position: 'absolute',
    right: 14,
    top: 64,
    zIndex: 25,
  },
  warningBannerText: {
    color: colors.white,
    fontFamily: typography.semibold,
    fontSize: 13,
    textAlign: 'center',
  },
  challengeBanner: {
    backgroundColor: 'rgba(16,185,129,0.92)',
    borderRadius: radius.md,
    left: 14,
    padding: 12,
    position: 'absolute',
    right: 14,
    top: 64,
    zIndex: 25,
  },
  challengeText: {
    color: colors.white,
    fontFamily: typography.bold,
    fontSize: 14,
    textAlign: 'center',
  },
  questionCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    bottom: 0,
    left: 0,
    padding: 16,
    paddingBottom: 28,
    position: 'absolute',
    right: 0,
    zIndex: 15,
  },
  progressHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressHeaderText: {
    color: colors.muted,
    fontFamily: typography.semibold,
    fontSize: 12,
  },
  timerText: {
    color: colors.gold,
    fontFamily: typography.bold,
    fontSize: 15,
  },
  progressTrack: {
    backgroundColor: colors.border,
    borderRadius: radius.pill,
    height: 8,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: colors.blue,
    borderRadius: radius.pill,
    height: '100%',
  },
  questionText: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 17,
    lineHeight: 24,
    marginBottom: 12,
    marginTop: 10,
  },
  optionGrid: {
    gap: 8,
  },
  optionButton: {
    alignItems: 'flex-start',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  optionBadge: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: 13,
    minWidth: 22,
  },
  optionText: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.medium,
    fontSize: 14,
    lineHeight: 19,
  },
  skipButton: {
    alignItems: 'center',
    backgroundColor: '#FFF7F7',
    borderColor: '#FECACA',
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 12,
  },
  skipText: {
    color: colors.danger,
    fontFamily: typography.bold,
    fontSize: 14,
  },
  lockedOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(127,29,29,0.94)',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    padding: 24,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 40,
  },
  lockedTitle: {
    color: colors.white,
    fontFamily: typography.bold,
    fontSize: 22,
  },
  lockedText: {
    color: '#FECACA',
    fontFamily: typography.regular,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 18,
    marginTop: 8,
    textAlign: 'center',
  },
  completedOverlay: {
    backgroundColor: 'rgba(15,23,42,0.92)',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    padding: 20,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 40,
  },
  completeCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  completeTitle: {
    color: colors.success,
    fontFamily: typography.bold,
    fontSize: 18,
    marginBottom: 8,
  },
  consentRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
    marginTop: 6,
  },
  checkbox: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 4,
    borderWidth: 1.5,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  checkboxChecked: {
    backgroundColor: colors.blue,
    borderColor: colors.blue,
  },
  checkboxMark: {
    color: colors.white,
    fontFamily: typography.bold,
    fontSize: 13,
  },
  consentText: {
    color: colors.text,
    flex: 1,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 20,
  },
});

export default InterviewScreen;
