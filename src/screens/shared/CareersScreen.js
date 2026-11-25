import VolunteerServiceLocationPicker from '../../components/common/VolunteerServiceLocationPicker';
import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import {useTourTarget} from '../../components/tour/TourTarget';
import {useLanguage} from '../../context/LanguageContext';
const recruitmentCopy = require('../../i18n/recruitmentCopy.cjs');
import LanguageSkillsField from '../../components/common/LanguageSkillsField';
const {requiresLanguages,validateSkills}=require('../../data/languagePolicy.cjs');
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Share, ScrollView, StatusBar, StyleSheet, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import TextInput from '../../components/common/AppTextInput';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import recruitmentService from '../../services/recruitmentService';
import { getErrorMessage } from '../../utils/http';
import { PremiumHero } from '../../components/common/PremiumLayout';
import { colors, radius, shadows, typography, typeScale } from '../../theme';

import AppText from '../../components/common/AppText';
import TurnstileWidget from '../../components/common/TurnstileWidget';
const emptyForm = {
  preferred_service_state: '',
  preferred_service_lga: '',
  full_name: '',
  phone_number: '',
  email_address: '',
  state_name: '',
  lga_name: '',
  area_locality: '',
  residential_address: '',
  highest_education: '',
  years_of_experience: '',
  current_employment_status: '',
  skills_qualifications: '',
  suitability_reason: '',
  volunteer_motivation: '',
  availability: '',
  language_skills: [],
  application_track: 'standard',
};

const CareersScreen = ({ navigation, route }) => {
  const interfaceLanguage = useInterfaceLanguage();
  const {language}=useLanguage();
  const careerTourProps=useTourTarget('public_careers',{label:ui("Careers and volunteering")});
  const copy=recruitmentCopy[language]||recruitmentCopy.en;
  const [opportunityFilter,setOpportunityFilter]=useState(['employment','volunteer'].includes(route?.params?.type)?route.params.type:'all');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null);
  const [cycles, setCycles] = useState([]);
  const [roles, setRoles] = useState([]);
  const [states, setStates] = useState([]);
  const [lgas, setLgas] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [selectedRoleId, setSelectedRoleId] = useState(
    route?.params?.role ? String(route.params.role) : null
  );

  const shareVolunteerOnWhatsApp = async (role) => {
    if (!role) return;
    const shareUrl = `https://rentalhub.com.ng/careers?type=volunteer&role=${encodeURIComponent(role.id)}`;
    const rawDescription = String(role.description || '').replace(/\s+/g, ' ').trim();
    const snippet =
      rawDescription.length > 140
        ? `${rawDescription.slice(0, 137).trim()}...`
        : rawDescription;
    const message = [
      `Volunteer Opportunity at Amana RentalHub NG: ${role.title}`,
      role.service_state ? `Location: ${role.service_state}` : '',
      'Free to apply — no application fee or degree required.',
      snippet,
      `Apply here: ${shareUrl}`,
    ]
      .filter(Boolean)
      .join('\n');

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    try {
      await Linking.openURL(whatsappUrl);
    } catch {
      try {
        await Share.share({ message, url: shareUrl });
      } catch {
        Toast.show({
          type: 'error',
          text1: ui('Unable to share right now'),
        });
      }
    }
  };
  const [submittedApplication, setSubmittedApplication] = useState(null);
  const [lookupEmail, setLookupEmail] = useState('');
  const [lookupReference, setLookupReference] = useState('');
  const [applications, setApplications] = useState([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [error, setError] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileRef = useRef(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [statusRes, cyclesRes, rolesRes, statesRes] = await Promise.all([
        recruitmentService.getStatus(),
        recruitmentService.getActiveCycles(),
        recruitmentService.getActiveRoles(),
        recruitmentService.getStates(),
      ]);

      setStatus(statusRes?.data?.data || statusRes?.data || null);
      setCycles(cyclesRes?.data?.data || []);
      setRoles(rolesRes?.data?.data || []);
      setStates(statesRes?.data?.data || []);
    } catch (err) {
      setStatus(null);
      setRoles([]);
      setError(getErrorMessage(err, 'Could not load recruitment information'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const loadLgas = async () => {
      if (!form.state_name) {
        setLgas([]);
        return;
      }

      try {
        const response = await recruitmentService.getLGAs(form.state_name);
        setLgas(response?.data?.data || []);
      } catch (err) {
        setLgas([]);
      }
    };

    loadLgas();
  }, [form.state_name]);

  const selectedRole = useMemo(
    () => roles.find((role) => String(role.id) === String(selectedRoleId)) || null,
    [roles, selectedRoleId, interfaceLanguage]
  );

  const volunteer=selectedRole?.opportunity_type==='volunteer';
  useEffect(()=>{setForm(previous=>({...previous,preferred_service_state:selectedRole?.service_state?(states.find(state=>state.name===selectedRole.service_state)?.displayName||selectedRole.service_state):'',preferred_service_lga:''}));},[selectedRole?.id,selectedRole?.service_state]);
  const intakeOpen=status?.is_active===true||status?.volunteer_applications_enabled===true;
  const visibleRoles=roles.filter(role=>opportunityFilter==='all'||(role.opportunity_type||'employment')===opportunityFilter);
  const volunteerBrowsing=volunteer||(!selectedRole&&(opportunityFilter==='volunteer'||(visibleRoles.length>0&&visibleRoles.every(role=>role.opportunity_type==='volunteer'))));

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!intakeOpen) return;
    if(volunteer&&(!form.preferred_service_state||!form.preferred_service_lga)){Toast.show({type:'error',text1:copy.service_choice_required});return;}
    if(requiresLanguages(selectedRole)){try{validateSkills(form.language_skills);}catch(error){Toast.show({type:'error',text1:error.message});return;}}
    if(volunteer&&(!form.volunteer_motivation.trim()||!form.availability.trim())){Toast.show({type:'error',text1:copy.volunteer_fields_required});return;}
    if (!selectedRoleId) {
      Toast.show({ type: 'error', text1: ui("Choose a role"), text2: ui("Pick a role before submitting your application.") });
      return;
    }

    if (!turnstileToken) {
      Toast.show({ type: 'error', text1: ui("Security check required"), text2: ui("Please complete the security check before submitting.") });
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const payload = {
        role_id: Number(selectedRoleId),
        preferred_service_state: form.preferred_service_state,
        preferred_service_lga: form.preferred_service_lga,
        full_name: form.full_name,
        phone_number: form.phone_number,
        email_address: form.email_address,
        state_name: form.state_name,
        lga_name: form.lga_name,
        area_locality: form.area_locality,
        residential_address: form.residential_address,
        highest_education: form.highest_education,
        years_of_experience: Number(form.years_of_experience || 0),
        current_employment_status: form.current_employment_status,
        skills_qualifications: form.skills_qualifications,
        suitability_reason: form.suitability_reason,
        application_track: volunteer?'standard':form.application_track,
        volunteer_motivation: form.volunteer_motivation,
        availability: form.availability,
        language_skills: form.language_skills,
        turnstile_token: turnstileToken,
      };

      const response = await recruitmentService.createApplication(payload);
      const data = response?.data?.data;
      setSubmittedApplication(data);
      setLookupEmail(data?.email_address || form.email_address);
      setLookupReference(data?.reference_number || '');
      Toast.show({ type:'success', text1:data?.opportunity_type==="volunteer"?copy.volunteer_received:ui("Application started"), text2:data?.opportunity_type==="volunteer"?copy.volunteer_confirmation:ui("Your application is ready for payment and document upload.") });
    } catch (err) {
      Toast.show({ type: 'error', text1: ui("Submission failed"), text2: getErrorMessage(err, 'Could not submit your application') });
    } finally {
      turnstileRef.current?.reset();
      setTurnstileToken('');
      setSubmitting(false);
    }
  };

  const lookupApplications = async () => {
    if (!lookupEmail.trim() || !lookupReference.trim()) {
      Toast.show({
        type: 'error',
        text1: ui("Email and reference needed"),
        text2: ui("Enter the email and application reference shown when you applied."),
      });
      return;
    }

    try {
      setLookupLoading(true);
      const response = await recruitmentService.getMyApplications({
        email: lookupEmail.trim(),
        referenceNumber: lookupReference.trim().toUpperCase(),
      });
      setApplications(response?.data?.data || []);
    } catch (err) {
      Toast.show({ type: 'error', text1: ui("Lookup failed"), text2: getErrorMessage(err, ui("Could not load applications")) });
    } finally {
      setLookupLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView {...careerTourProps} edges={['top']} style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
        <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.blue} />
        <AppText style={styles.centerText}>{ui("Loading careers portal...")}</AppText>
      </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView {...careerTourProps} edges={['top']} style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <PremiumHero
        eyebrow={ui("Careers")}
        title={ui("Join RentalHub")}
        subtitle={copy.portal_intro}
        icon="briefcase-outline"
      />

      <View style={styles.noticeCard}>
        <AppText style={styles.noticeTitle}>{intakeOpen ? copy.opportunities_title : ui('Recruitment is currently closed')}</AppText>
        <AppText style={styles.noticeText}>
          {status?.message || (intakeOpen ? ui('Applications are currently being accepted.') : ui('Please check back later for the next opportunities.'))}
        </AppText>
      </View>

      {error ? <AppText style={styles.errorText}>{error}</AppText> : null}

<AppText style={styles.sectionTitle}>{copy.opportunities_title}</AppText>
      <View style={styles.chipRow}>{['all','employment','volunteer'].map(type=><TouchableOpacity key={type} accessibilityRole="button" accessibilityState={{selected:opportunityFilter===type}} style={[styles.chip,opportunityFilter===type&&styles.chipActive]} onPress={()=>{setOpportunityFilter(type);setSelectedRoleId('');}}><AppText style={styles.chipText}>{copy['opportunity_'+type]}</AppText></TouchableOpacity>)}</View>
      {volunteerBrowsing ? <View style={styles.noticeCard}><AppText style={styles.noticeTitle}>{copy.volunteer_free}</AppText><AppText style={styles.noticeText}>{copy.volunteer_notice}</AppText></View> : null}
      {visibleRoles.length > 0 ? (
        <View style={styles.roleGrid}>
          {visibleRoles.map((role) => {
            const active = String(role.id) === String(selectedRoleId);
            const isVolunteerRole = role.opportunity_type === "volunteer";
            return (
              <View
                key={role.id}
                style={[styles.roleCard, active && styles.roleCardActive]}
              >
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {setSelectedRoleId(role.id);updateField('application_track','standard');}}
                >
                  <AppText style={[styles.roleTitle, active && styles.roleTitleActive]}>{role.title}</AppText>
                  <AppText style={styles.roleMeta}>{isVolunteerRole?copy.volunteer_position:copy.employment_position}</AppText>
                  <AppText style={styles.roleMeta}>{isVolunteerRole?copy.volunteer_free:('₦'+Number(role.application_fee||0).toLocaleString()+ui(" standard"))}</AppText>
                </TouchableOpacity>
                {isVolunteerRole ? (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`Share ${role.title} on WhatsApp`}
                    activeOpacity={0.85}
                    style={styles.whatsappShareBtn}
                    onPress={() => shareVolunteerOnWhatsApp(role)}
                  >
                    <Icon name="logo-whatsapp" size={15} color="#047857" />
                    <AppText style={styles.whatsappShareBtnText}>{ui("Share on WhatsApp")}</AppText>
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : (
        <AppText style={styles.emptyText}>{copy.no_opportunities}</AppText>
      )}

      {selectedRole ? (
        <View style={styles.selectionCard}>
          <AppText style={styles.selectionTitle}>{ui("Selected role")}</AppText>
          <AppText style={styles.selectionText}>{selectedRole.title}</AppText>
          <AppText style={styles.roleMeta}>{selectedRole.description || ui('A professional role in the RentalHub team.')}</AppText>
          {selectedRole.opportunity_type === 'volunteer' ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Share ${selectedRole.title} on WhatsApp`}
              activeOpacity={0.85}
              style={[styles.whatsappShareBtn, styles.whatsappShareBtnFull]}
              onPress={() => shareVolunteerOnWhatsApp(selectedRole)}
            >
              <Icon name="logo-whatsapp" size={16} color="#047857" />
              <AppText style={styles.whatsappShareBtnText}>{ui("Share on WhatsApp")}</AppText>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {intakeOpen && selectedRole && !submittedApplication ? <>
      <AppText style={styles.sectionTitle}>{ui("Your details")}</AppText>
      <View style={styles.formCard}>
        <TextInput style={styles.input} placeholder={ui("Full name")} value={form.full_name} onChangeText={(v) => updateField('full_name', v)} />
        <TextInput style={styles.input} placeholder={ui("Phone number")} value={form.phone_number} onChangeText={(v) => updateField('phone_number', v)} keyboardType="phone-pad" />
        <TextInput style={styles.input} placeholder={ui("Email address")} value={form.email_address} onChangeText={(v) => updateField('email_address', v)} keyboardType="email-address" autoCapitalize="none" />
        <TextInput style={styles.input} placeholder={ui("Highest education")} value={form.highest_education} onChangeText={(v) => updateField('highest_education', v)} />
        <TextInput style={styles.input} placeholder={ui("Current employment status")} value={form.current_employment_status} onChangeText={(v) => updateField('current_employment_status', v)} />
        <TextInput style={styles.input} placeholder={ui("Years of experience")} value={form.years_of_experience} onChangeText={(v) => updateField('years_of_experience', v)} keyboardType="numeric" />
        <TextInput style={styles.input} placeholder={ui("Area / locality")} value={form.area_locality} onChangeText={(v) => updateField('area_locality', v)} />
        <TextInput style={styles.input} placeholder={ui("Residential address")} value={form.residential_address} onChangeText={(v) => updateField('residential_address', v)} multiline />
        <TextInput style={[styles.input, styles.textarea]} placeholder={ui("Skills and qualifications")} value={form.skills_qualifications} onChangeText={(v) => updateField('skills_qualifications', v)} multiline />
        <TextInput style={[styles.input, styles.textarea]} placeholder={ui("Why you are suitable for this role")} value={form.suitability_reason} onChangeText={(v) => updateField('suitability_reason', v)} multiline />

{requiresLanguages(selectedRole)&&<LanguageSkillsField value={form.language_skills||[]} onChange={v=>updateField('language_skills',v)}/>}
<View>{volunteer&&<><AppText style={styles.noticeText}>{copy.volunteer_notice}</AppText><AppText style={styles.helperLabel}>{copy.volunteer_motivation}</AppText><TextInput accessibilityLabel={copy.volunteer_motivation} style={[styles.input,styles.textarea]} value={form.volunteer_motivation} onChangeText={v=>updateField('volunteer_motivation',v)} multiline maxLength={5000}/><AppText style={styles.helperLabel}>{copy.volunteer_availability}</AppText><TextInput accessibilityLabel={copy.volunteer_availability} style={[styles.input,styles.textarea]} value={form.availability} onChangeText={v=>updateField('availability',v)} multiline maxLength={5000}/></>}</View>
        {!volunteer && <><AppText style={styles.helperLabel}>{ui("Application track")}</AppText>
        <View style={styles.trackRow}>
          {['standard', 'premium'].map((track) => {
            const active = form.application_track === track;
            return (
              <TouchableOpacity
                key={track}
                style={[styles.trackButton, active && styles.trackButtonActive]}
                onPress={() => updateField('application_track', track)}
              >
                <AppText style={[styles.trackText, active && styles.trackTextActive]}>{track === "standard" ? ui("Standard") : ui("Premium")}</AppText>
              </TouchableOpacity>
            );
          })}
        </View>

        </>}
        {volunteer && <VolunteerServiceLocationPicker role={selectedRole} states={states} stateValue={form.preferred_service_state} lgaValue={form.preferred_service_lga} copy={copy} onStateChange={value=>setForm(previous=>({...previous,preferred_service_state:value,preferred_service_lga:''}))} onLgaChange={value=>updateField('preferred_service_lga',value)}/>}
        <AppText style={styles.helperLabel}>{ui("State")}</AppText>
        <View style={styles.chipRow}>
          {states.map((state) => {
            const active = form.state_name === (state.displayName || state.name);
            return (
              <TouchableOpacity
                key={state.name || state.displayName}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => updateField('state_name', state.displayName || state.name)}
              >
                <AppText style={[styles.chipText, active && styles.chipTextActive]}>{state.displayName || state.name}</AppText>
              </TouchableOpacity>
            );
          })}
        </View>

        {form.state_name ? (
          <>
            <AppText style={styles.helperLabel}>{ui("LGA")}</AppText>
            <View style={styles.chipRow}>
              {lgas.length > 0 ? lgas.map((lga) => {
                const active = form.lga_name === lga;
                return (
                  <TouchableOpacity
                    key={lga}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => updateField('lga_name', lga)}
                  >
                    <AppText style={[styles.chipText, active && styles.chipTextActive]}>{lga}</AppText>
                  </TouchableOpacity>
                );
              }) : <AppText style={styles.emptyText}>{ui("No LGAs available for this state.")}</AppText>}
            </View>
          </>
        ) : null}

        <TurnstileWidget
        action="rentalhub_careers"
          ref={turnstileRef}
          onToken={setTurnstileToken}
          onExpire={() => setTurnstileToken('')}
          onError={() => setTurnstileToken('')}
        />

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={submitting||(volunteer&&(!form.preferred_service_state||!form.preferred_service_lga))||(requiresLanguages(selectedRole)&&(()=>{try{validateSkills(form.language_skills);return false;}catch{return true;}})())}>
          {submitting ? <ActivityIndicator color="#ffffff" /> : <AppText style={styles.submitButtonText}>{volunteer?copy.apply_volunteer:ui("Submit application")}</AppText>}
        </TouchableOpacity>
      </View>

      </> : null}
      {submittedApplication ? (
        <View style={styles.successCard}>
          <AppText style={styles.successTitle}>{submittedApplication.opportunity_type==="volunteer"?copy.volunteer_received:ui("Application started")}</AppText>
          <AppText style={styles.successText}>{ui("Reference: ")}{submittedApplication.reference_number}</AppText>
          <AppText style={styles.successText}>{ui("Status: ")}{submittedApplication.status}</AppText>
          <AppText style={styles.successText}>{submittedApplication.opportunity_type==="volunteer"?copy.volunteer_confirmation:ui('Next: complete payment and upload your supporting documents.')}</AppText>
          <TouchableOpacity style={styles.secondaryButton} onPress={()=>navigation.navigate('RecruitmentApplication',{application:submittedApplication})}><AppText style={styles.secondaryButtonText}>{submittedApplication.opportunity_type==="volunteer"?copy.optional_cv:ui("Application progress")}</AppText></TouchableOpacity>
        </View>
      ) : null}

      <AppText style={styles.sectionTitle}>{ui("Check your applications")}</AppText>
      <View style={styles.lookupCard}>
        <TextInput style={styles.input} placeholder={ui("Enter your email")} value={lookupEmail} onChangeText={setLookupEmail} keyboardType="email-address" autoCapitalize="none" />
        <TextInput
          style={styles.input}
          placeholder={ui("Application reference (RH-APP-...)")}
          value={lookupReference}
          onChangeText={setLookupReference}
          autoCapitalize="characters"
          autoCorrect={false}
        />
        <TouchableOpacity style={styles.secondaryButton} onPress={lookupApplications} disabled={lookupLoading}>
          {lookupLoading ? <ActivityIndicator color="#0284c7" /> : <AppText style={styles.secondaryButtonText}>{ui("Lookup applications")}</AppText>}
        </TouchableOpacity>
        {applications.map((application) => {
          const canStartInterview = application.status === 'shortlisted' && application.interview_activated === true;
          return (
            <View key={application.id} style={styles.applicationRow}>
              <AppText style={styles.applicationTitle}>{application.role_title || ui("Application")}</AppText>
              <AppText style={styles.roleMeta}>{ui("Status: ")}{application.status}</AppText>
              <AppText style={styles.roleMeta}>{ui("Reference: ")}{application.reference_number}</AppText>
              <TouchableOpacity
                style={styles.interviewButton}
                onPress={() => navigation.navigate('RecruitmentApplication', {
                  application,
                  applicationId: application.id,
                  email: application.email_address,
                  referenceNumber: application.reference_number,
                })}
              >
                <AppText style={styles.interviewButtonText}>{ui("Open application")}</AppText>
              </TouchableOpacity>
              {canStartInterview ? (
                <TouchableOpacity
                  style={[styles.interviewButton, styles.interviewSecondaryButton]}
                  onPress={() => navigation.navigate('Interview', {
                    applicationId: application.id,
                    phoneNumber: application.phone_number,
                    email: application.email_address,
                    referenceNumber: application.reference_number,
                  })}
                >
                  <AppText style={styles.interviewSecondaryButtonText}>{ui("Start interview")}</AppText>
                </TouchableOpacity>
              ) : null}
            </View>
          );
        })}
      </View>
    </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 18, paddingBottom: 34 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface },
  centerText: { marginTop: 8, color: colors.muted, fontFamily: typography.medium },
  title: { fontSize: typeScale.xxl, lineHeight: 36, fontFamily: typography.semibold, color: colors.ink },
  subtitle: { color: colors.muted, fontFamily: typography.regular, marginTop: 6, marginBottom: 12 },
  noticeCard: {
    backgroundColor: colors.surfaceBlue,
    borderColor: '#CFE2FF',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 16,
    ...shadows.soft,
  },
  noticeTitle: { color: colors.blue, fontSize: typeScale.base, lineHeight: 24, fontFamily: typography.bold },
  noticeText: { color: colors.navySoft, fontFamily: typography.regular, marginTop: 4, lineHeight: 20 },
  sectionTitle: { fontSize: typeScale.md, lineHeight: 26, fontFamily: typography.semibold, color: colors.ink, marginBottom: 10, marginTop: 6 },
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  roleCard: {
    width: '48%',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 13,
    ...shadows.soft,
  },
  roleCardActive: { borderColor: colors.blue, backgroundColor: colors.surfaceBlue },
  roleTitle: { color: colors.ink, fontFamily: typography.bold },
  roleTitleActive: { color: colors.blue },
  roleMeta: { color: colors.muted, fontFamily: typography.regular, fontSize: typeScale.xs, lineHeight: 18, marginTop: 4 },
  whatsappShareBtn: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
    paddingVertical: 7,
    paddingHorizontal: 8,
  },
  whatsappShareBtnFull: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  whatsappShareBtnText: {
    color: '#065F46',
    fontFamily: typography.semibold,
    fontSize: typeScale.xs,
    lineHeight: 16,
  },
  selectionCard: { backgroundColor: colors.white, borderRadius: radius.md, padding: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 12, ...shadows.soft },
  selectionTitle: { fontFamily: typography.bold, color: colors.ink },
  selectionText: { color: colors.blue, marginTop: 4, fontFamily: typography.semibold },
  formCard: { backgroundColor: colors.white, borderRadius: radius.md, padding: 14, borderWidth: 1, borderColor: colors.border, ...shadows.soft },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 10,
    color: colors.ink,
    fontFamily: typography.regular,
    backgroundColor: colors.white,
  },
  textarea: { minHeight: 86, textAlignVertical: 'top' },
  helperLabel: { color: colors.text, fontSize: typeScale.xs, lineHeight: 18, fontFamily: typography.semibold, marginBottom: 6, marginTop: 4 },
  trackRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  trackButton: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8 },
  trackButtonActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  trackText: { color: colors.text, fontSize: typeScale.xs, lineHeight: 18, fontFamily: typography.semibold },
  trackTextActive: { color: colors.white },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 8 },
  chipActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  chipText: { color: colors.text, fontSize: typeScale.xs, lineHeight: 18, fontFamily: typography.semibold },
  chipTextActive: { color: colors.white },
  submitButton: { backgroundColor: colors.blue, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  submitButtonText: { color: colors.white, fontFamily: typography.bold },
  secondaryButton: { borderWidth: 1, borderColor: colors.blue, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center' },
  secondaryButtonText: { color: colors.blue, fontFamily: typography.bold },
  successCard: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0', borderWidth: 1, borderRadius: radius.md, padding: 14, marginTop: 12 },
  successTitle: { color: colors.success, fontFamily: typography.bold },
  successText: { color: '#065F46', fontFamily: typography.regular, marginTop: 4 },
  lookupCard: { backgroundColor: colors.white, borderRadius: radius.md, padding: 14, borderWidth: 1, borderColor: colors.border, marginTop: 12, ...shadows.soft },
  applicationRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, marginTop: 10 },
  applicationTitle: { color: colors.ink, fontFamily: typography.bold },
  interviewButton: { backgroundColor: colors.blue, borderRadius: radius.sm, alignItems: 'center', marginTop: 10, paddingVertical: 11 },
  interviewButtonText: { color: colors.white, fontFamily: typography.semibold, fontSize: typeScale.xs, lineHeight: 18 },
  interviewSecondaryButton: { backgroundColor: colors.white, borderColor: colors.blue, borderWidth: 1 },
  interviewSecondaryButtonText: { color: colors.blue, fontFamily: typography.semibold, fontSize: typeScale.xs, lineHeight: 18 },
  emptyText: { color: colors.muted, fontFamily: typography.regular, marginBottom: 10 },
  errorText: { color: colors.danger, marginBottom: 10, fontFamily: typography.semibold },
});

export default CareersScreen;
