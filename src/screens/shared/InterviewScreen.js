import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import recruitmentService from '../../services/recruitmentService';
import { getErrorMessage } from '../../utils/http';

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
        Toast.show({ type: 'success', text1: 'Interview complete', text2: `Score: ${completionResponse?.data?.data?.score || 0}%` });
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Interview failed', text2: getErrorMessage(err, 'Could not submit your answer') });
    } finally {
      setSubmitting(false);
    }
  };

  const progress = useMemo(() => {
    if (!questions.length) return 0;
    return ((currentIndex + 1) / questions.length) * 100;
  }, [currentIndex, questions.length]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0284c7" />
        <Text style={styles.centerText}>Launching interview...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Interview</Text>
      <Text style={styles.subtitle}>Answer each question in order. You can also skip with X if needed.</Text>
      <View style={styles.progressCard}>
        <Text style={styles.progressLabel}>Progress</Text>
        <Text style={styles.progressValue}>{Math.round(progress)}%</Text>
      </View>

      {currentQuestion ? (
        <View style={styles.card}>
          <Text style={styles.questionText}>{currentQuestion.question}</Text>
          <View style={styles.optionGrid}>
            {['option_a', 'option_b', 'option_c', 'option_d'].map((key) => (
              <TouchableOpacity
                key={key}
                style={styles.optionButton}
                onPress={() => answerQuestion(key.replace('option_', '').toUpperCase())}
                disabled={submitting}
              >
                <Text style={styles.optionText}>{currentQuestion[key]}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.skipButton} onPress={() => answerQuestion('X')} disabled={submitting}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {result ? <Text style={styles.resultText}>Last answer result: {result.is_correct ? 'Correct' : 'Incorrect'}</Text> : null}

      {completedSummary ? (
        <View style={styles.completeCard}>
          <Text style={styles.completeTitle}>Interview complete</Text>
          <Text style={styles.completeText}>Score: {completedSummary.score}%</Text>
          <Text style={styles.completeText}>Correct answers: {completedSummary.correct_answers}</Text>
          <Text style={styles.completeText}>Passed: {completedSummary.passed ? 'Yes' : 'No'}</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Back to applications</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 24 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  centerText: { marginTop: 8, color: '#64748b' },
  title: { fontSize: 28, fontWeight: '800', color: '#0f172a' },
  subtitle: { color: '#64748b', marginTop: 6, marginBottom: 12 },
  progressCard: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12 },
  progressLabel: { color: '#1d4ed8', fontSize: 12, fontWeight: '600' },
  progressValue: { color: '#0f172a', fontSize: 24, fontWeight: '800', marginTop: 4 },
  card: { backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderWidth: 1, borderRadius: 14, padding: 14 },
  questionText: { color: '#0f172a', fontSize: 16, fontWeight: '700', marginBottom: 12 },
  optionGrid: { gap: 8 },
  optionButton: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12 },
  optionText: { color: '#0f172a' },
  skipButton: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 12, padding: 12, alignItems: 'center' },
  skipText: { color: '#b91c1c', fontWeight: '700' },
  resultText: { color: '#047857', marginTop: 12, fontWeight: '600' },
  completeCard: { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 12 },
  completeTitle: { color: '#065f46', fontSize: 16, fontWeight: '700' },
  completeText: { color: '#047857', marginTop: 4 },
  backButton: { marginTop: 10, backgroundColor: '#0284c7', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  backButtonText: { color: '#ffffff', fontWeight: '700' },
  errorText: { color: '#dc2626', fontWeight: '600' },
});

export default InterviewScreen;
