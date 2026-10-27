import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import React, { useContext, useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import Input from '../../components/common/Input';
import {
  InfoRow,
  PremiumButton,
  PremiumCard,
  PremiumHero,
  PremiumScreen,
  PremiumSectionTitle,
  StatusPill,
} from '../../components/common/PremiumLayout';
import { AuthContext } from '../../context/AuthContext';
import { appealsService } from '../../services/appealsService';
import { propertyService } from '../../services/propertyService';
import { getErrorMessage, pickList } from '../../utils/http';
import { colors, radius, typography, typeScale } from '../../theme';
import AppText from '../../components/common/AppText';

const TYPES = [
  { key: 'property', get "label"() { return ui("Rejected property"); }, icon: 'business-outline', get "hint"() { return ui("Appeal a rejection on one of your listed properties."); } },
  { key: 'verification', get "label"() { return ui("Rejected verification"); }, icon: 'person-circle-outline', get "hint"() { return ui("Appeal the rejection of your identity verification."); } },
];

const AppealCreateScreen = ({ navigation, route }) => {
  useInterfaceLanguage();
  const { user } = useContext(AuthContext);
  const params = route?.params || {};

  const [type, setType] = useState(params.appealType === 'property' || params.appealType === 'verification' ? params.appealType : null);
  const [rejectedProperties, setRejectedProperties] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState(params.propertyId ? Number(params.propertyId) : null);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [reason, setReason] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const selectedProperty = rejectedProperties.find((item) => Number(item.id) === Number(selectedPropertyId));

  useEffect(() => {
    if (type !== 'property') return;
    let active = true;
    const loadRejected = async () => {
      setLoadingProperties(true);
      try {
        const response = await propertyService.getMyProperties();
        const rows = pickList(response, ['data', 'properties']).filter(
          (item) => String(item.status || '').toLowerCase() === 'rejected'
        );
        if (!active) return;
        setRejectedProperties(rows);
        if (params.propertyId && !rows.some((item) => Number(item.id) === Number(params.propertyId))) {
          setSelectedPropertyId(null);
        }
      } catch (err) {
        Toast.show({
          type: 'error',
          text1: ui("Failed"),
          text2: getErrorMessage(err, 'Could not load rejected properties'),
        });
      } finally {
        if (active) setLoadingProperties(false);
      }
    };
    loadRejected();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const chooseType = (key) => {
    setType(key);
    setSelectedPropertyId(null);
    setReason('');
    setAdditionalInfo('');
    setError('');
  };

  const validate = () => {
    if (!type) {
      setError('Choose what you want to appeal.');
      return false;
    }
    if (type === 'property' && !selectedPropertyId) {
      setError('Select the rejected property you want to appeal.');
      return false;
    }
    if (!reason.trim()) {
      setError('Please provide a reason for your appeal.');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const body = {
        appeal_type: type,
        appeal_reason: reason.trim(),
        additional_info: additionalInfo.trim() || undefined,
      };
      if (type === 'property') {
        body.property_id = Number(selectedPropertyId);
      } else {
        body.target_user_id = Number(user?.id);
      }
      const response = await appealsService.submitAppeal(body);
      if (response?.success) {
        Toast.show({
          type: 'success',
          text1: ui("Appeal submitted"),
          text2: ui("A state admin will review your case."),
        });
        navigation.goBack();
      } else {
        setError(response?.message || 'Could not submit your appeal.');
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Could not submit your appeal.'));
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = type && (type === 'verification' || Boolean(selectedPropertyId)) && reason.trim().length > 0;

  return (
    <PremiumScreen>
      <PremiumHero
        eyebrow={ui("Appeals")}
        title={ui("Submit an appeal")}
        subtitle={ui("Disagree with a rejection? Explain why the decision should be reviewed.")}
        icon="megaphone-outline"
      />

      {!type ? (
        <View style={styles.typeList}>
          {TYPES.map((option) => (
            <TouchableOpacity
              key={option.key}
              activeOpacity={0.86}
              onPress={() => chooseType(option.key)}
            >
              <PremiumCard style={styles.typeCard}>
                <View style={styles.typeHeader}>
                  <AppText style={styles.typeTitle}>{option.label}</AppText>
                </View>
                <AppText style={styles.typeHint}>{option.hint}</AppText>
              </PremiumCard>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <>
          {type === 'verification' ? (
            <PremiumCard>
              <InfoRow
                icon="shield-checkmark-outline"
                label={ui("Appeal target")}
                value="Your identity verification"
              />
              <AppText style={styles.note}>{ui("Only rejected verifications can be appealed. A state administrator will re-review your case.")}</AppText>
            </PremiumCard>
          ) : (
            <>
              <PremiumSectionTitle
                title={ui("Rejected property")}
                subtitle={ui("Pick the property whose rejection you are appealing.")}
              />
              {loadingProperties ? (
                <PremiumCard>
                  <AppText style={styles.note}>{ui("Loading your properties…")}</AppText>
                </PremiumCard>
              ) : rejectedProperties.length === 0 ? (
                <PremiumCard>
                  <AppText style={styles.note}>{ui("You have no rejected properties to appeal right now.")}</AppText>
                </PremiumCard>
              ) : (
                rejectedProperties.map((item) => {
                  const selected = Number(item.id) === Number(selectedPropertyId);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.86}
                      onPress={() => setSelectedPropertyId(item.id)}
                    >
                      <PremiumCard style={[styles.propertyCard, selected && styles.propertyCardSelected]}>
                        <View style={styles.propertyHeader}>
                          <View style={styles.propertyCopy}>
                            <AppText style={styles.propertyTitle}>{item.title || ui("Property #{value0}", {value0: (item.id)})}</AppText>
                            <AppText style={styles.propertyMeta}>
                              {[item.area, item.city, item.state_name || item.state].filter(Boolean).join(', ') || 'Location not available'}
                            </AppText>
                          </View>
                          {selected ? <StatusPill label={ui("Selected")} color={colors.blue} /> : null}
                        </View>
                        {item.rejection_reason ? (
                          <AppText style={styles.rejectionReason}>{ui("Reason: ")}{item.rejection_reason}</AppText>
                        ) : null}
                      </PremiumCard>
                    </TouchableOpacity>
                  );
                })
              )}
            </>
          )}

          <PremiumCard>
            <Input
              label={ui("Reason for appeal")}
              value={reason}
              onChangeText={setReason}
              placeholder={ui("Explain why the decision was incorrect…")}
              multiline
              numberOfLines={4}
              error={error && !reason.trim() ? 'A reason is required' : undefined}
            />
            <Input
              label={ui("Additional information (optional)")}
              value={additionalInfo}
              onChangeText={setAdditionalInfo}
              placeholder={ui("Any supporting details or context…")}
              multiline
              numberOfLines={3}
              containerStyle={styles.fieldGap}
            />

            {error ? <AppText style={styles.error}>{error}</AppText> : null}

            <PremiumButton
              title={ui("Submit appeal")}
              onPress={handleSubmit}
              loading={submitting}
              disabled={!canSubmit}
              icon="send-outline"
              style={styles.submitBtn}
            />
          </PremiumCard>
        </>
      )}
    </PremiumScreen>
  );
};

const styles = StyleSheet.create({
  typeList: {
    gap: 10,
  },
  typeCard: {
    marginBottom: 4,
  },
  typeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: typeScale.base,
    lineHeight: 24,
  },
  typeHint: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: typeScale.reading,
    lineHeight: 22,
    marginTop: 4,
  },
  propertyCard: {
    marginBottom: 10,
  },
  propertyCardSelected: {
    backgroundColor: colors.surfaceBlue,
    borderColor: colors.blue,
  },
  propertyHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  propertyCopy: {
    flex: 1,
  },
  propertyTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: typeScale.base,
    lineHeight: 24,
  },
  propertyMeta: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginTop: 3,
  },
  rejectionReason: {
    color: colors.danger,
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginTop: 8,
  },
  note: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginTop: 8,
  },
  fieldGap: {
    marginTop: 12,
  },
  error: {
    color: colors.danger,
    fontFamily: typography.medium,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginTop: 10,
  },
  submitBtn: {
    marginTop: 14,
  },
});

export default AppealCreateScreen;
