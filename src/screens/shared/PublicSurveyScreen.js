import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import Input from '../../components/common/Input';
import OptionPickerModal from '../../components/common/OptionPickerModal';
import TurnstileWidget from '../../components/common/TurnstileWidget';
import {
  PremiumButton,
  PremiumCard,
  PremiumCenter,
  PremiumHero,
  StatusPill,
} from '../../components/common/PremiumLayout';
import { propertyService } from '../../services/propertyService';
import { surveyService } from '../../services/surveyService';
import { getErrorMessage, pickList } from '../../utils/http';
import { colors, radius, typography } from '../../theme';
import AppText from '../../components/common/AppText';

const newClientId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const PublicSurveyScreen = ({ navigation }) => {
  const [step, setStep] = useState('flags'); // flags|closed|gate|details|questions|verify|done
  const [error, setError] = useState('');
  const [gateToken, setGateToken] = useState('');
  const [submitToken, setSubmitToken] = useState('');
  const [type, setType] = useState('tenant');
  const [contact, setContact] = useState({ name: '', phone: '', email: '' });
  const [states, setStates] = useState([]);
  const [stateName, setStateName] = useState('');
  const [lgaName, setLgaName] = useState('');
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [showLgaPicker, setShowLgaPicker] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [queue, setQueue] = useState([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [screenedOut, setScreenedOut] = useState(false);
  const [respondentCode, setRespondentCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const startTimeRef = useRef(Date.now());

  const loadFlags = useCallback(async () => {
    try {
      const res = await surveyService.publicFlags();
      if (res?.data?.survey_public_enabled) {
        setStep('gate');
      } else {
        setStep('closed');
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Could not check survey availability.'));
      setStep('closed');
    }
  }, []);

  useEffect(() => {
    loadFlags();
  }, [loadFlags]);

  const selectedState = states.find((s) => String(s.state_name || s.name) === String(stateName));
  const availableLgas = selectedState?.lgas || [];

  useEffect(() => {
    if (states.length > 0) return;
    propertyService
      .getLocationOptions()
      .then((res) => setStates(pickList(res, ['data'])))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (step === 'flags') {
    return <PremiumCenter loading title="Checking survey" />;
  }

  const onGateToken = async (token) => {
    setError('');
    try {
      await surveyService.publicGate(token);
      setGateToken(token);
      setStep('details');
    } catch (err) {
      setError(getErrorMessage(err, 'Security check failed. Try again.'));
    }
  };

  const loadDefinition = async () => {
    setError('');
    setStep('questions');
    try {
      const res = await surveyService.getDefinition({ type, lang: 'en' });
      const defQuestions = res?.data?.questions || [];
      setQuestions(defQuestions);
      setQueue(defQuestions.filter((q) => q.part === 'A' || true));
      setIndex(0);
      startTimeRef.current = Date.now();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load the survey questions.'));
      setStep('details');
    }
  };

  const start = () => {
    if (!contact.name.trim() || !contact.phone.trim()) {
      setError('Your name and phone number are required.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(contact.email.trim())) {
      setError('A valid email address is required to take this survey.');
      return;
    }
    loadDefinition();
  };

  const current = queue[index] || null;
  const answerValue = current ? answers[current.key] : undefined;
  const answered = Array.isArray(answerValue) ? answerValue.length > 0 : answerValue !== undefined && answerValue !== '';

  const optionList = useMemo(() => {
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

  const setValue = (key, value) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    const q = questions.find((item) => item.key === key);
    if (q && q.analysis === 'consent' && q.endsOn && String(value) === String(q.endsOn)) {
      setScreenedOut(true);
    }
  };

  const toggleOption = (optionV) => {
    if (!current) return;
    const list = Array.isArray(answerValue) ? answerValue : [];
    const next = list.includes(optionV) ? list.filter((v) => v !== optionV) : [...list, optionV];
    if (current.maxPicks && next.length > current.maxPicks) {
      Toast.show({ type: 'info', text1: `Pick up to ${current.maxPicks} options` });
      return;
    }
    setValue(current.key, next);
  };

  const next = () => {
    if (!current) return;
    if (current.required !== false && !answered) {
      Toast.show({ type: 'info', text1: 'Please answer this question to continue.' });
      return;
    }
    if (index < queue.length - 1) {
      setIndex((i) => i + 1);
      return;
    }
    setError('');
    setStep('verify');
  };

  const onSubmitToken = async (token) => {
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await surveyService.publicSubmit({
        survey_type: type,
        answers,
        consent_flags: {},
        contact: {
          name: contact.name.trim(),
          phone: contact.phone.trim(),
          email: contact.email.trim().toLowerCase(),
        },
        state_name: stateName || undefined,
        lga_name: lgaName || undefined,
        client_request_id: newClientId(),
        time_spent_seconds: Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000)),
        turnstile_token: token,
      });
      if (res?.success) {
        setRespondentCode(res?.data?.respondent_code || '');
        setSubmitToken(token);
        setStep('done');
      } else {
        setError(res?.message || 'Could not submit the survey.');
      }
    } catch (err) {
      const data = err?.response?.data;
      const code = data?.code || '';
      setError(
        code === 'LOCATION_BLOCKED'
          ? data?.message || 'The survey is not available at your location.'
          : code === 'DUPLICATE_RESPONDENT'
            ? 'A survey from this number was already recorded recently.'
            : getErrorMessage(err, 'Could not submit the survey.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 'closed') {
    return (
      <PremiumCenter
        icon="alert-circle-outline"
        title="Survey unavailable"
        message={error || 'The public survey is not open right now.'}
      />
    );
  }

  if (step === 'gate') {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <PremiumHero
          eyebrow="Market research"
          title="Take the survey"
          subtitle="Complete the security check to begin."
          icon="shield-checkmark-outline"
        />
        <PremiumCard>
          <TurnstileWidget action="rentalhub_survey_entry" onToken={onGateToken} onExpire={() => setError('Check expired — please try again.')} onError={() => setError('Check failed — please try again.')} />
          {error ? <AppText style={styles.error}>{error}</AppText> : null}
        </PremiumCard>
      </ScrollView>
    );
  }

  if (step === 'details') {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <PremiumHero eyebrow="Market research" title="About you" subtitle="Tell us who you are and how to reach you." icon="person-outline" />
        <PremiumCard>
          <AppText style={styles.fieldLabel}>I am a</AppText>
          <View style={styles.typeRow}>
            {['tenant', 'landlord'].map((t) => (
              <TouchableOpacity
                key={t}
                activeOpacity={0.85}
                onPress={() => setType(t)}
                style={[styles.typeButton, type === t && styles.typeButtonActive]}
              >
                <AppText style={[styles.typeText, type === t && styles.typeTextActive]}>
                  {t[0].toUpperCase() + t.slice(1)}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
          <Input label="Full name" value={contact.name} onChangeText={(v) => setContact((p) => ({ ...p, name: v }))} />
          <Input label="Phone" value={contact.phone} onChangeText={(v) => setContact((p) => ({ ...p, phone: v }))} keyboardType="phone-pad" containerStyle={styles.fieldGap} />
          <Input label="Email" value={contact.email} onChangeText={(v) => setContact((p) => ({ ...p, email: v }))} keyboardType="email-address" autoCapitalize="none" containerStyle={styles.fieldGap} />
          <AppText style={[styles.fieldLabel, styles.fieldGap]}>Your location (optional but recommended)</AppText>
          <TouchableOpacity activeOpacity={0.85} style={styles.pickerRow} onPress={() => setShowStatePicker(true)}>
            <AppText style={styles.pickerRowText}>{stateName || 'Select state'}</AppText>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.85} style={styles.pickerRow} disabled={!stateName} onPress={() => setShowLgaPicker(true)}>
            <AppText style={styles.pickerRowText}>
              {lgaName || (stateName ? 'Select local government area' : 'Select a state first')}
            </AppText>
          </TouchableOpacity>
          {error ? <AppText style={styles.error}>{error}</AppText> : null}
          <PremiumButton title="Start survey" onPress={start} icon="arrow-forward-outline" style={styles.submit} />
        </PremiumCard>

        <OptionPickerModal
          visible={showStatePicker}
          title="Select state"
          options={states}
          selectedValue={states.find((s) => String(s.state_name) === stateName)?.id ?? null}
          searchable
          searchPlaceholder="Search states"
          getOptionLabel={(item) => item.state_name || item.name}
          getOptionValue={(item) => item.id}
          onClose={() => setShowStatePicker(false)}
          onSelect={(item) => {
            setStateName(item.state_name || item.name || '');
            setLgaName('');
            setShowStatePicker(false);
          }}
        />
        <OptionPickerModal
          visible={showLgaPicker}
          title="Select local government area"
          options={availableLgas}
          selectedValue={availableLgas.includes(lgaName) ? lgaName : null}
          searchable
          searchPlaceholder="Search LGAs"
          getOptionLabel={(item) => String(item)}
          getOptionValue={(item) => String(item)}
          onClose={() => setShowLgaPicker(false)}
          onSelect={(item) => {
            setLgaName(String(item));
            setShowLgaPicker(false);
          }}
        />
      </ScrollView>
    );
  }

  if (step === 'verify') {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <PremiumHero eyebrow="Market research" title="Almost done" subtitle="Complete one final security check to submit." icon="shield-checkmark-outline" />
        <PremiumCard>
          <TurnstileWidget action="rentalhub_survey" onToken={onSubmitToken} onExpire={() => setError('Check expired — please try again.')} onError={() => setError('Check failed — please try again.')} />
          {error ? <AppText style={styles.error}>{error}</AppText> : null}
          {submitting ? <PremiumCenter loading title="Submitting" /> : null}
        </PremiumCard>
      </ScrollView>
    );
  }

  if (step === 'done') {
    return (
      <PremiumCenter
        icon="ribbon-outline"
        title={screenedOut ? 'Survey complete' : 'Thank you'}
        message={
          screenedOut
            ? 'Based on your answers you do not need to continue.'
            : respondentCode
              ? `Your response was recorded. Reference: ${respondentCode}`
              : 'Your response was recorded. Thank you!'
        }
        actionLabel="Close"
        onAction={() => navigation.goBack()}
      />
    );
  }

  // questions
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <PremiumHero eyebrow="Market research" title="Survey" subtitle={`Question ${index + 1} of ${queue.length}`} icon="chatbubbles-outline" />
      <View style={styles.progressRow}>
        <StatusPill label={`${index + 1}/${queue.length}`} color={colors.blue} />
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${queue.length ? ((index + 1) / queue.length) * 100 : 0}%` }]} />
        </View>
      </View>

      <PremiumCard>
        <AppText style={styles.prompt}>{current?.prompt || current?.key}</AppText>

        {current?.type === 'text' ? (
          <Input value={typeof answerValue === 'string' ? answerValue : ''} onChangeText={(text) => setValue(current.key, text)} placeholder="Type your answer…" multiline numberOfLines={4} />
        ) : (
          <View style={styles.options}>
            {optionList.map((opt) => {
              if (current?.type === 'likert') {
                const selected = String(answerValue) === String(opt.v);
                return (
                  <TouchableOpacity key={opt.v} activeOpacity={0.85} onPress={() => setValue(current.key, Number(opt.v))} style={[styles.optionButton, selected && styles.optionSelected]}>
                    <AppText style={[styles.optionText, selected && styles.optionTextSelected]}>
                      {opt.v}{current?.labels && current.labels[opt.v] ? ` · ${current.labels[opt.v]}` : ''}
                    </AppText>
                  </TouchableOpacity>
                );
              }
              const isArrayType = current?.type === 'multi' || current?.type === 'rank';
              const selected = isArrayType ? (Array.isArray(answerValue) ? answerValue : []).includes(opt.v) : String(answerValue) === String(opt.v);
              return (
                <TouchableOpacity key={opt.v} activeOpacity={0.85} onPress={() => (isArrayType ? toggleOption(opt.v) : setValue(current.key, opt.v))} style={[styles.optionButton, selected && styles.optionSelected]}>
                  <AppText style={[styles.optionText, selected && styles.optionTextSelected]}>{opt.label || opt.v}</AppText>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {screenedOut && current?.analysis === 'consent' ? (
          <AppText style={styles.note}>Based on your answer, the survey ends here after this section.</AppText>
        ) : null}

        <PremiumButton title={index === queue.length - 1 ? 'Finish' : 'Next'} onPress={next} icon="arrow-forward-outline" style={styles.submit} />
      </PremiumCard>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 18, paddingBottom: 36 },
  fieldLabel: { color: colors.ink, fontFamily: typography.semibold, fontSize: 14, marginBottom: 8 },
  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  typeButton: { flex: 1, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: colors.white },
  typeButtonActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  typeText: { color: colors.text, fontFamily: typography.semibold, fontSize: 14 },
  typeTextActive: { color: colors.white },
  pickerRow: {
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: colors.white,
  },
  pickerRowText: {
    color: colors.ink,
    fontFamily: typography.medium,
    fontSize: 15,
  },
  fieldGap: { marginTop: 12 },
  error: { color: colors.danger, fontFamily: typography.medium, fontSize: 13, marginTop: 10 },
  submit: { marginTop: 16 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  progressTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: colors.blue },
  prompt: { color: colors.ink, fontFamily: typography.bold, fontSize: 17, lineHeight: 24, marginBottom: 14 },
  options: { gap: 10 },
  optionButton: { borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: colors.white },
  optionSelected: { backgroundColor: colors.surfaceBlue, borderColor: colors.blue },
  optionText: { color: colors.text, fontFamily: typography.regular, fontSize: 14, lineHeight: 20 },
  optionTextSelected: { color: colors.ink, fontFamily: typography.medium },
  note: { color: '#B46B00', fontFamily: typography.medium, fontSize: 13, marginTop: 12 },
});

export default PublicSurveyScreen;
