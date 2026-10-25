import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useLanguage } from '../../context/LanguageContext';
import { colors, radius, shadows, typography, typeScale } from '../../theme';
import AppText from './AppText';

// A compact dropdown that lets a signed-out visitor pick their language from
// the welcome screen, before any account exists. It reads and writes the same
// stored preference as Settings, so the choice survives sign-in.
const LanguageDropdown = ({ tone = 'light', fullWidth = false }) => {
  const { language, languages, setLanguage, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [restartNeeded, setRestartNeeded] = useState(false);
  const [switching, setSwitching] = useState(false);

  const current = useMemo(
    () => languages.find((option) => option.code === language) || languages[0],
    [language, languages]
  );

  const choose = async (code) => {
    if (switching) return;
    setOpen(false);
    if (code === language) return;
    setSwitching(true);
    try {
      const result = await setLanguage(code);
      // Switching between left-to-right and right-to-left only takes full effect
      // after the app is reopened, so say so instead of leaving it looking broken.
      setRestartNeeded(Boolean(result?.restartRequired));
    } catch {
      // Keep the previous language if the switch could not be applied.
    } finally {
      setSwitching(false);
    }
  };

  const onDark = tone === 'dark';
  const triggerStyle = onDark ? styles.triggerOnDark : styles.trigger;
  const labelStyle = onDark ? styles.labelOnDark : styles.label;
  const valueStyle = onDark ? styles.valueOnDark : styles.value;
  const chevronColor = onDark ? colors.white : colors.ink;

  return (
    <>
      <TouchableOpacity
        accessibilityLabel={`${t('welcome.languageLabel')}: ${current.nativeLabel}`}
        accessibilityRole="button"
        accessibilityHint={t('welcome.languageHelp')}
        onPress={() => setOpen(true)}
        style={[triggerStyle, styles.triggerBase, fullWidth && styles.triggerFull]}
      >
        <Icon
          name="language-outline"
          size={18}
          color={onDark ? '#DDEBFF' : colors.blue}
        />
        <View style={styles.triggerCopy}>
          <AppText style={labelStyle}>{t('welcome.languageLabel')}</AppText>
          <AppText style={valueStyle}>{current.nativeLabel}</AppText>
        </View>
        <Icon name="chevron-down" size={18} color={chevronColor} />
      </TouchableOpacity>

      {restartNeeded ? (
        <AppText style={[styles.restartNote, onDark && styles.restartNoteOnDark]}>
          {t('settings.languageRestart')}
        </AppText>
      ) : null}

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          accessibilityLabel="Close language list"
          onPress={() => setOpen(false)}
          style={styles.backdrop}
        />
        <View style={styles.sheetWrap} pointerEvents="box-none">
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <AppText style={styles.sheetTitle}>
                {t('welcome.languageChoose')}
              </AppText>
              <TouchableOpacity
                accessibilityLabel="Close language list"
                accessibilityRole="button"
                onPress={() => setOpen(false)}
                style={styles.closeButton}
              >
                <Icon name="close" size={20} color={colors.ink} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={languages}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => {
                const selected = item.code === language;
                return (
                  <TouchableOpacity
                    accessibilityLabel={`${item.label}: ${item.nativeLabel}`}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    onPress={() => choose(item.code)}
                    style={[styles.option, selected && styles.optionSelected]}
                  >
                    <View style={styles.optionCopy}>
                      <AppText
                        style={[styles.optionText, selected && styles.optionTextSelected]}
                      >
                        {item.nativeLabel}
                      </AppText>
                      {item.nativeLabel !== item.label ? (
                        <AppText style={styles.optionMeta}>{item.label}</AppText>
                      ) : null}
                    </View>
                    {selected ? (
                      <Icon name="checkmark-circle" size={20} color={colors.blue} />
                    ) : null}
                  </TouchableOpacity>
                );
              }}
            />

            <AppText style={styles.sheetHint}>{t('welcome.languageHelp')}</AppText>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  triggerBase: {
    alignItems: 'center',
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  trigger: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderColor: 'rgba(11,31,58,0.10)',
    borderWidth: 1,
  },
  triggerOnDark: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
  },
  triggerCopy: { flex: 1 },
  triggerFull: {
    alignSelf: 'stretch',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  label: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: typeScale.xs,
    lineHeight: 18,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  labelOnDark: {
    color: '#A9C9F7',
    fontFamily: typography.medium,
    fontSize: typeScale.xs,
    lineHeight: 18,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  value: { color: colors.ink, fontFamily: typography.semibold, fontSize: typeScale.sm, lineHeight: 20 },
  valueOnDark: { color: colors.white, fontFamily: typography.semibold, fontSize: typeScale.sm, lineHeight: 20 },
  restartNote: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginTop: 6,
  },
  restartNoteOnDark: { color: '#A9C9F7' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4,12,26,0.55)',
  },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: '78%',
    paddingBottom: 22,
    paddingHorizontal: 18,
    paddingTop: 16,
    ...shadows.soft,
  },
  sheetHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  sheetTitle: { color: colors.ink, fontFamily: typography.bold, fontSize: typeScale.base, lineHeight: 24 },
  closeButton: {
    alignItems: 'center',
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  option: {
    alignItems: 'center',
    borderRadius: radius.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  optionSelected: { backgroundColor: colors.surfaceBlue },
  optionCopy: { flex: 1 },
  optionText: { color: colors.ink, fontFamily: typography.medium, fontSize: typeScale.base, lineHeight: 24 },
  optionTextSelected: { color: colors.blue, fontFamily: typography.semibold },
  optionMeta: { color: colors.muted, fontFamily: typography.regular, fontSize: typeScale.xs, lineHeight: 18, marginTop: 2 },
  sheetHint: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: typeScale.reading,
    lineHeight: 22,
    marginTop: 16,
  },
});

export default LanguageDropdown;
