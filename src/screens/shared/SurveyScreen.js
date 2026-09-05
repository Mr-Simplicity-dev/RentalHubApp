import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import Input from '../../components/common/Input';
import {
  PremiumButton,
  PremiumCard,
  PremiumCenter,
  PremiumHero,
  PremiumScreen,
  StatusPill,
} from '../../components/common/PremiumLayout';
import { surveyService } from '../../services/surveyService';
import { getErrorMessage } from '../../utils/http';
import { colors, radius, typography } from '../../theme';
import AppText from '../../components/common/AppText';

const SurveyScreen = ({ navigation }) => {
  const [phase, setPhase] = useState('loading'); // loading | info | question | partADone | finished | error
  const [status, setStatus] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [queue, setQueue] = useState([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [responseId, setResponseId] = useState(null);
  const [screenedOut, setScreenedOut] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const startTimeRef = useRef(Date.now());
  const saveTimerRef = useRef(null);

  const current = queue[index] || null;
  const progressPct = queue.length > 1 ? Math.round(((index + 1) / queue.length) * 100) : 100;

  const answerValue = current ? answers[current.key] : undefined;
  const answered = Array.isArray(answerValue) ? answerValue.length > 0 : answerValue !== undefined && answerValue !== '';

  const currentOptionList = useMemo(() => {
    if (!current) return [];
    if (current.options && current.options.length) return current.options;
    if (current.type === 'rank' && Array.isArray(current.rankSource)) {
      const seen = new Map();
      questions.forEach((q) => {
        if (!current.rankSource.includes(q.key)) return;
        (q.options || []).forEach((opt) => {
          if (!seen.has(opt.v)) seen.set(opt.v, opt);
        });
      });
      return Array.from(seen.values());
    }
    return [];
  }, [current, questions]);

  useEffect(() => () => clearTimeout(saveTimerRef.current), []);

  useEffect(() => {
    if (!responseId || Object.keys(answers).length === 0) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      surveyService
        .save({ response_id: responseId, answers, consent_flags: {} })
        .catch(() => {});
    }, 1200);
  }, [answers, responseId]);

  const run = async (stage) => {
    setPhase('loading');
    try {
      const statusRes = await surveyService.myStatus();
      const st = statusRes?.data || {};
      setStatus(st);
      if (st.completed || st.exempt) {
        setPhase('info');
        return;
      }
      const defRes = await surveyService.getDefinition({ type: st.survey_type || 'tenant', lang: 'en' });
      const defQuestions = defRes?.data?.questions || [];
      setQuestions(defQuestions);
      const startRes = await surveyService.start();
      const response = startRes?.data?.response;
      if (!response || !response.id) {
        throw new Error('Could not start the survey');
      }
      const savedAnswers = response.answers || {};
      setResponseId(response.id);
      setAnswers(savedAnswers);
      startTimeRef.current = Date.now();

      const partADone = st.part_a_done || Boolean(response.part_a_completed_at);
      const remaining = buildRemaining(defQuestions, savedAnswers, partADone ? 'full' : 'gate');

      if (stage === 'gate' && partADone) {
        setPhase('info');
        return;
      }

      if (remaining.length === 0) {
        if (!partADone) {
          setPhase('info');
        } else {
          finishSurvey(response.id, savedAnswers);
        }
        return;
      }

      setQueue(remaining);
      setIndex(0);
      setPhase('question');
    } catch (err) {
      setErrorMessage(getErrorMessage(err, 'Could not load the survey.'));
      setPhase('error');
    }
  };

  const buildRemaining = (defQuestions, savedAnswers, mode) => {
    const pool =
      mode === 'gate'
        ? defQuestions.filter((q) => q.part === 'A')
        : defQuestions.filter((q) => !(q.key in savedAnswers));
    return pool.filter((q) => {
      const existing = savedAnswers[q.key];
      if (Array.isArray(existing)) return existing.length === 0;
      return existing === undefined || existing === null || existing === '';
    });
  };

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = async () => {
    if (!responseId) return;
    await surveyService
      .save({ response_id: responseId, answers, consent_flags: {} })
      .catch(() => {});
  };

  const setValue = (key, value) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    const q = questions.find((item) => item.key === key);
    if (
      q &&
      q.analysis === 'consent' &&
      q.endsOn &&
      String(value) === String(q.endsOn)
    ) {
      setScreenedOut(true);
    }
  };

  const toggleOption = (optionV) => {
    if (!current) return;
    const list = Array.isArray(answerValue) ? answerValue : [];
    const next = list.includes(optionV)
      ? list.filter((v) => v !== optionV)
      : [...list, optionV];
    if (current.maxPicks && next.length > current.maxPicks) {
      Toast.show({ type: 'info', text1: `Pick up to ${current.maxPicks} options` });
      return;
    }
    setValue(current.key, next);
  };

  const next = async () => {
    if (!current) return;
    if (current.required !== false && !answered) {
      Toast.show({ type: 'info', text1: 'Please answer this question to continue.' });
      return;
    }
    if (index < queue.length - 1) {
      setIndex((i) => i + 1);
      return;
    }
    // last question in current queue
    setBusy(true);
    try {
      await persist();
      if (status && !status.part_a_done) {
        // completing the part A gate
        const completeRes = await surveyService.completePartA(responseId).catch((err) => {
          if (err?.response?.status === 400) throw err;
          return { success: true };
        });
        if (completeRes && completeRes.success === false) throw new Error(completeRes.message);
        if (screenedOut) {
          await surveyService.complete(responseId, elapsedSeconds());
        }
        setStatus((prev) => ({ ...prev, part_a_done: true }));
        setPhase('partADone');
      } else {
        await surveyService.complete(responseId, elapsedSeconds());
        setPhase('finished');
      }
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Could not save',
        text2: getErrorMessage(err, 'Please check your answers and try again.'),
      });
    } finally {
      setBusy(false);
    }
  };

  const elapsedSeconds = () =>
    Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));

  const continueToFull = () => {
    const remaining = buildRemaining(questions, answers, 'full');
    if (remaining.length === 0) {
      surveyService.complete(responseId, elapsedSeconds()).catch(() => {});
      setPhase('finished');
      return;
    }
    setQueue(remaining);
    setIndex(0);
    setPhase('question');
  };

  const finishSurvey = async (rid, savedAnswers) => {
    try {
      await surveyService.save({ response_id: rid, answers: savedAnswers, consent_flags: {} });
      await surveyService.complete(rid, elapsedSeconds());
      setPhase('finished');
    } catch {
      setPhase('finished');
    }
  };

  if (phase === 'loading') {
    return <PremiumCenter loading title="Preparing survey" />;
  }

  if (phase === 'error') {
    return (
      <PremiumCenter
        icon="alert-circle-outline"
        title="Could not load the survey"
        message={errorMessage}
        actionLabel="Try again"
        onAction={() => run()}
      />
    );
  }

  if (phase === 'info') {
    return (
      <PremiumCenter
        icon="checkmark-circle-outline"
        title={status?.completed ? 'Survey completed' : 'Nothing to complete'}
        message={
          status?.completed
            ? 'Thank you for completing the RentalHub NG survey.'
            : status?.exempt
              ? 'Your account is not required to complete the survey.'
              : 'There is no active survey for you right now.'
        }
        actionLabel="Back to dashboard"
        onAction={() => navigation.goBack()}
      />
    );
  }

  if (phase === 'partADone') {
    return (
      <PremiumCenter
        icon="checkmark-done-outline"
        title="Part A complete"
        message={
          screenedOut
            ? 'Based on your answers, you do not need to continue the survey. Thank you!'
            : 'Thanks! You can continue the rest of the survey now or later from your dashboard.'
        }
        actionLabel={screenedOut ? 'Back to dashboard' : 'Continue survey'}
        onAction={() => (screenedOut ? navigation.goBack() : continueToFull())}
      />
    );
  }

  if (phase === 'finished') {
    return (
      <PremiumCenter
        icon="ribbon-outline"
        title="Survey completed"
        message="Thank you for your time — your responses have been saved."
        actionLabel="Back to dashboard"
        onAction={() => navigation.goBack()}
      />
    );
  }

  return (
    <PremiumScreen>
      <PremiumHero
        eyebrow="Market research"
        title={status?.part_a_done ? 'Continue survey' : 'Survey'}
        subtitle="Your answers help RentalHub NG improve how renters and landlords are served."
        icon="chatbubbles-outline"
      />

      <View style={styles.progressRow}>
        <StatusPill label={`${index + 1} of ${queue.length}`} color={colors.blue} />
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <PremiumCard>
          <AppText style={styles.sectionLabel}>
            {current?.section ? `${current.section} · ` : ''}Question {index + 1}
          </AppText>
          <AppText style={styles.prompt}>{current?.prompt || current?.key}</AppText>

          {current?.type === 'text' ? (
            <Input
              value={typeof answerValue === 'string' ? answerValue : ''}
              onChangeText={(text) => setValue(current.key, text)}
              placeholder="Type your answer…"
              multiline
              numberOfLines={4}
              containerStyle={styles.fieldGap}
            />
          ) : (
            <View style={styles.options}>
              {currentOptionList.map((opt) => {
                if (current.type === 'likert') {
                  const selected = String(answerValue) === String(opt.v);
                  return (
                    <TouchableOpacity
                      key={opt.v}
                      activeOpacity={0.85}
                      onPress={() => setValue(current.key, Number(opt.v))}
                      style={[styles.likertButton, selected && styles.likertSelected]}
                    >
                      <AppText style={[styles.likertValue, selected && styles.likertValueSelected]}>
                        {opt.v}
                      </AppText>
                      <AppText style={styles.likertLabel}>
                        {current.labels && current.labels[opt.v]
                          ? current.labels[opt.v]
                          : opt.label || ''}
                      </AppText>
                    </TouchableOpacity>
                  );
                }

                const isArrayType = current.type === 'multi' || current.type === 'rank';
                const selected = isArrayType
                  ? (Array.isArray(answerValue) ? answerValue : []).includes(opt.v)
                  : String(answerValue) === String(opt.v);
                return (
                  <TouchableOpacity
                    key={opt.v}
                    activeOpacity={0.85}
                    onPress={() => (isArrayType ? toggleOption(opt.v) : setValue(current.key, opt.v))}
                    style={[styles.optionButton, selected && styles.optionSelected]}
                  >
                    <View style={[styles.radio, selected && styles.radioSelected]}>
                      {selected ? <View style={styles.radioDot} /> : null}
                    </View>
                    <AppText style={[styles.optionText, selected && styles.optionTextSelected]}>
                      {opt.label || opt.v}
                    </AppText>
                  </TouchableOpacity>
                );
              })}

              {current?.type === 'multi' && current?.maxPicks ? (
                <AppText style={styles.hint}>Pick up to {current.maxPicks}.</AppText>
              ) : null}
            </View>
          )}

          {screenedOut && current?.analysis === 'consent' ? (
            <AppText style={styles.screenedOut}>
              Based on your answer, this survey ends here after this section.
            </AppText>
          ) : null}

          <PremiumButton
            title={index === queue.length - 1 ? (status?.part_a_done ? 'Finish survey' : 'Complete part A') : 'Next'}
            onPress={next}
            loading={busy}
            icon="arrow-forward-outline"
            style={styles.nextBtn}
          />
        </PremiumCard>
      </ScrollView>
    </PremiumScreen>
  );
};

const styles = StyleSheet.create({
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.blue,
  },
  scroll: {
    paddingBottom: 24,
  },
  sectionLabel: {
    color: colors.muted,
    fontFamily: typography.semibold,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  prompt: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 17,
    lineHeight: 24,
    marginTop: 8,
    marginBottom: 14,
  },
  fieldGap: {
    marginTop: 4,
  },
  options: {
    gap: 10,
  },
  optionButton: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  optionSelected: {
    backgroundColor: colors.surfaceBlue,
    borderColor: colors.blue,
  },
  radio: {
    alignItems: 'center',
    borderColor: colors.muted,
    borderRadius: 9,
    borderWidth: 1.5,
    height: 18,
    justifyContent: 'center',
    width: 18,
  },
  radioSelected: {
    borderColor: colors.blue,
  },
  radioDot: {
    backgroundColor: colors.blue,
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  optionText: {
    color: colors.text,
    flex: 1,
    fontFamily: typography.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  optionTextSelected: {
    color: colors.ink,
    fontFamily: typography.medium,
  },
  likertButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  likertSelected: {
    backgroundColor: colors.surfaceBlue,
    borderColor: colors.blue,
  },
  likertValue: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 16,
  },
  likertValueSelected: {
    color: colors.blue,
  },
  likertLabel: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  hint: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 12,
    marginTop: 4,
  },
  screenedOut: {
    color: colors.warning || '#B46B00',
    fontFamily: typography.medium,
    fontSize: 13,
    marginTop: 12,
  },
  nextBtn: {
    marginTop: 18,
  },
});

export default SurveyScreen;
