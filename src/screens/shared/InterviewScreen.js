import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
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

  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [challengeToken, setChallengeToken] = useState('');
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [completedSummary, setCompletedSummary] = useState(null);
  const [error, setError] = useState('');

  const currentQuestion = questions[currentIndex];

  const loadInterview = async () => {
    try {
      setLoading(true);
      setError('');
      const payload = {
        application_id: Number(applicationId),
        phone_number: phoneNumber,
        applicant_email: email,
        email_address: email,
        reference_number: referenceNumber,
      };
      const response = await recruitmentService.startInterview(payload);
      const data = response?.data?.data;
      setQuestions(data?.questions || []);
      setChallengeToken(data?.challenge_token || '');
    } catch (err) {
      setError(getErrorMessage(err, 'Could not start interview'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (applicationId) {
      loadInterview();
    } else {
      setError('No application selected for interview.');
      setLoading(false);
    }
  }, [applicationId]);

  const answerQuestion = async (answer) => {
    if (!currentQuestion || !challengeToken || !applicationId) return;

    try {
      setSubmitting(true);
      const response = await recruitmentService.submitInterviewAnswer({
        application_id: Number(applicationId),
        question_id: currentQuestion.id,
        answer,
        challenge_token: challengeToken,
      });
      const data = response?.data?.data;
      setResult(data);
      if (currentIndex < questions.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        const completionResponse = await recruitmentService.completeInterview({
          application_id: Number(applicationId),
          challenge_token: challengeToken,
        });
        setCompletedSummary(completionResponse?.data?.data || null);
        Toast.show({
          type: 'success',
          text1: 'Interview complete',
          text2: `Score: ${completionResponse?.data?.data?.score || 0}%`,
        });
      }
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Interview failed',
        text2: getErrorMessage(err, 'Could not submit your answer'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const progress = useMemo(() => {
    if (!questions.length) return 0;
    return ((currentIndex + 1) / questions.length) * 100;
  }, [currentIndex, questions.length]);

  if (loading) {
    return <PremiumCenter loading title="Launching interview" message="Preparing your questions..." />;
  }

  if (error) {
    return (
      <PremiumCenter
        icon="alert-circle-outline"
        title="Interview unavailable"
        message={error}
        tone="danger"
      />
    );
  }

  return (
    <PremiumScreen>
      <PremiumHero
        eyebrow="Recruitment interview"
        title="Answer each question"
        subtitle="Work through the questions in order. You can skip with X when needed."
        icon="chatbubbles-outline"
        right={<StatusPill label={`${Math.round(progress)}%`} color={colors.gold} />}
      />

      <PremiumCard>
        <InfoRow icon="document-text-outline" label="Question" value={`${currentIndex + 1} of ${questions.length}`} />
        <ProgressBar value={progress} />
        <AppText style={styles.progressText}>{Math.round(progress)}% complete</AppText>
      </PremiumCard>

      {currentQuestion ? (
        <PremiumCard>
          <AppText style={styles.questionText}>{currentQuestion.question}</AppText>
          <View style={styles.optionGrid}>
            {['option_a', 'option_b', 'option_c', 'option_d'].map((key) => (
              <TouchableOpacity
                key={key}
                activeOpacity={0.84}
                style={styles.optionButton}
                onPress={() => answerQuestion(key.replace('option_', '').toUpperCase())}
                disabled={submitting}
              >
                <AppText style={styles.optionBadge}>{key.replace('option_', '').toUpperCase()}</AppText>
                <AppText style={styles.optionText}>{currentQuestion[key]}</AppText>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              activeOpacity={0.84}
              style={styles.skipButton}
              onPress={() => answerQuestion('X')}
              disabled={submitting}
            >
              <AppText style={styles.skipText}>Skip question</AppText>
            </TouchableOpacity>
          </View>
        </PremiumCard>
      ) : null}

      {result ? (
        <PremiumCard style={result.is_correct ? styles.successCard : styles.warningCard}>
          <InfoRow
            icon={result.is_correct ? 'checkmark-circle-outline' : 'close-circle-outline'}
            label="Last answer"
            value={result.is_correct ? 'Correct' : 'Incorrect'}
            valueStyle={{ color: result.is_correct ? colors.success : colors.warning }}
          />
        </PremiumCard>
      ) : null}

      {completedSummary ? (
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
      ) : null}
    </PremiumScreen>
  );
};

const styles = StyleSheet.create({
  progressTrack: {
    backgroundColor: colors.border,
    borderRadius: radius.pill,
    height: 10,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: colors.blue,
    borderRadius: radius.pill,
    height: '100%',
  },
  progressText: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  questionText: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 18,
    lineHeight: 25,
    marginBottom: 14,
  },
  optionGrid: {
    gap: 10,
  },
  optionButton: {
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 13,
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
    lineHeight: 20,
  },
  skipButton: {
    alignItems: 'center',
    backgroundColor: '#FFF7F7',
    borderColor: '#FECACA',
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 13,
  },
  skipText: {
    color: colors.danger,
    fontFamily: typography.bold,
    fontSize: 14,
  },
  successCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  warningCard: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
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
});

export default InterviewScreen;
