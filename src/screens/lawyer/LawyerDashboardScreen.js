import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import React, { useEffect, useLayoutEffect, useState } from 'react';
import {Alert, FlatList, ScrollView, StyleSheet, TouchableOpacity, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { legalService } from '../../services/legalService';
import { getErrorMessage, pickList } from '../../utils/http';
import { colors, radius, typography, typeScale } from '../../theme';
import TourTarget, { useTourTarget } from '../../components/tour/TourTarget';
import {
  TourScrollProvider,
  useTourScrollController,
} from '../../components/tour/TourScrollContext';
import { useAccessibilityPreferences } from '../../hooks/useAccessibilityPreferences';

import AppText from '../../components/common/AppText';
const LawyerDashboardScreen = ({ navigation }) => {
  const interfaceLanguage = useInterfaceLanguage();
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const { reduceMotion } = useAccessibilityPreferences();
  const tourScroll = useTourScrollController({ animated: !reduceMotion });
  const evidenceTargetProps = useTourTarget('lawyer_evidence', {
    label: ui("Verify evidence"),
    padding: 6,
    radius: radius.pill,
  });

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: navigation.canGoBack() });
  }, [navigation, interfaceLanguage]);

  const loadProperties = async () => {
    setLoading(true);
    try {
      const response = await legalService.getAuthorizedProperties();
      setProperties(pickList(response, ['data', 'properties']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: ui("Failed"),
        text2: getErrorMessage(error, 'Could not load lawyer properties'),
      });
    } finally {
      setLoading(false);
    }
  };

  const loadDisputes = async (property) => {
    setSelectedProperty(property);
    try {
      const response = await legalService.getPropertyDisputes(property.id);
      setDisputes(pickList(response, ['data', 'disputes']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: ui("Failed"),
        text2: getErrorMessage(error, ui("Could not load disputes")),
      });
    }
  };

  const resolveDispute = async (id) => {
    try {
      await legalService.resolveDispute(id);
      if (selectedProperty) {
        await loadDisputes(selectedProperty);
      }
      Toast.show({ type: 'success', text1: ui("Dispute resolved") });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: ui("Failed"),
        text2: getErrorMessage(error, 'Could not resolve dispute'),
      });
    }
  };

  useEffect(() => {
    loadProperties();
  }, []);

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
    <TourScrollProvider controller={tourScroll}>
    <ScrollView
      ref={tourScroll.scrollRef}
      style={styles.screen}
      contentContainerStyle={styles.content}
      onScroll={tourScroll.onScroll}
      scrollEventThrottle={16}
    >
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.heroIcon}><Icon name="scale-outline" size={24} color={colors.gold} /></View>
          <TouchableOpacity
            {...evidenceTargetProps}
            onPress={() => navigation.navigate('VerifyCase')}
            style={styles.verifyButton}
          >
            <Icon name="shield-checkmark-outline" size={17} color={colors.navy} />
            <AppText style={styles.verifyText}>{ui("Verify evidence")}</AppText>
          </TouchableOpacity>
        </View>
        <AppText style={styles.heroEyebrow}>{ui("LEGAL WORKSPACE")}</AppText>
        <AppText style={styles.title}>{ui("Cases and property access")}</AppText>
        <AppText style={styles.heroText}>{ui("Review authorised properties, trace evidence and resolve disputes.")}</AppText>
      </View>

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => navigation.navigate('StateMigration')}
        style={styles.migrationLink}
      >
        <Icon name="swap-horizontal-outline" size={16} color={colors.blue} />
        <AppText style={styles.migrationLinkText}>{ui("Request state migration")}</AppText>
      </TouchableOpacity>

      <TourTarget id="lawyer_cases" label={ui("Authorised cases")} padding={8} radius={radius.md}>
        <View>
          <AppText style={styles.sectionTitle}>{ui("Authorised properties")}</AppText>
        </View>
      </TourTarget>

      {loading ? (
        <AppText style={styles.empty}>{ui("Loading...")}</AppText>
      ) : (
        <FlatList
          data={properties}
          scrollEnabled={false}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item, index }) => {
            const propertyCard = (
              <TouchableOpacity
                style={[styles.card, selectedProperty?.id === item.id && styles.cardActive]}
                onPress={() => loadDisputes(item)}
              >
                <AppText style={styles.cardTitle}>{item.title}</AppText>
                <AppText style={styles.cardMeta}>
                  {[item.city, item.state_name || item.state].filter(Boolean).join(', ')}
                </AppText>
                <View style={styles.cardArrow}><Icon name="chevron-forward" size={18} color={colors.blue} /></View>
                <AppText style={styles.cardMeta}>{ui("Assigned by")}{item.assigned_by_name || item.client_name || ui("Unknown")}
                  {item.client_name ? ui(" for {value0}", {value0: (item.client_name)}) : ''}
                </AppText>
              </TouchableOpacity>
            );

            return index === 0 ? (
              <TourTarget
                id="lawyer_clients"
                label={ui("Client property assignments")}
                padding={6}
                radius={radius.md}
              >
                {propertyCard}
              </TourTarget>
            ) : propertyCard;
          }}
          ListEmptyComponent={(
            <TourTarget
              id="lawyer_clients"
              label={ui("Client property assignments")}
              padding={6}
              radius={radius.md}
            >
              <AppText style={styles.empty}>{ui("No authorized properties.")}</AppText>
            </TourTarget>
          )}
        />
      )}

      {selectedProperty ? (
        <>
          <AppText style={styles.sectionTitle}>{ui("Disputes for ")}{selectedProperty.title}</AppText>
          {disputes.length === 0 ? (
            <AppText style={styles.empty}>{ui("No disputes found.")}</AppText>
          ) : (
            disputes.map((item) => (
              <View key={item.id} style={styles.card}>
                <AppText style={styles.cardTitle}>{ui("Dispute #")}{item.id}</AppText>
                <AppText style={styles.cardMeta}>{ui("Status: ")}{item.status || ui("open")}</AppText>
                <AppText style={styles.cardText}>{item.description || 'No description available'}</AppText>
                <View style={styles.row}>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('VerifyCase', { disputeId: item.id })}
                  >
                    <AppText style={styles.linkText}>{ui("Verify Integrity")}</AppText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('DisputeDetails', { disputeId: item.id })}
                  >
                    <AppText style={styles.linkText}>{ui("Trace Dispute")}</AppText>
                  </TouchableOpacity>
                  {item.status !== "resolved" ? (
                    <TouchableOpacity onPress={() =>
                      Alert.alert(ui("Resolve dispute?"), ui("Mark this dispute as resolved?"), [
                        { text: ui("Cancel"), style: 'cancel' },
                        { text: ui("Resolve"), onPress: () => resolveDispute(item.id) },
                      ])
                    }>
                      <AppText style={styles.linkWarn}>{ui("Resolve")}</AppText>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            ))
          )}
        </>
      ) : null}
    </ScrollView>
    </TourScrollProvider>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 18, paddingBottom: 30 },
  hero: { backgroundColor: colors.navy, borderRadius: radius.lg, padding: 20 },
  heroTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  heroIcon: { alignItems: 'center', backgroundColor: 'rgba(255,201,40,0.14)', borderRadius: 21, height: 42, justifyContent: 'center', width: 42 },
  verifyButton: { alignItems: 'center', backgroundColor: colors.gold, borderRadius: radius.pill, flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingVertical: 9 },
  verifyText: { color: colors.navy, fontFamily: typography.bold, fontSize: typeScale.xs, lineHeight: 18 },
  heroEyebrow: { color: '#9BC3F4', fontFamily: typography.bold, fontSize: typeScale.xs, lineHeight: 18, letterSpacing: 0.8, marginTop: 16 },
  title: { fontSize: typeScale.xl, lineHeight: 32, fontFamily: typography.semibold, color: colors.white, marginTop: 4 },
  heroText: { color: '#AFC2DF', fontFamily: typography.regular, fontSize: typeScale.xs, lineHeight: 18, marginTop: 6 },
  sectionTitle: { fontSize: typeScale.md, lineHeight: 26, fontFamily: typography.semibold, color: colors.ink, marginTop: 22, marginBottom: 9 },
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 10,
    position: 'relative',
  },
  cardActive: { borderColor: colors.blue, backgroundColor: colors.surfaceBlue },
  cardTitle: { fontSize: typeScale.base, lineHeight: 24, fontFamily: typography.bold, color: colors.ink },
  cardMeta: { marginTop: 4, color: colors.muted, fontFamily: typography.regular, fontSize: typeScale.xs, lineHeight: 18, paddingRight: 20 },
  cardText: { marginTop: 8, color: colors.text, fontFamily: typography.regular },
  cardArrow: { position: 'absolute', right: 12, top: 18 },
  row: { flexDirection: 'row', gap: 16, marginTop: 10, flexWrap: 'wrap' },
  linkText: { color: colors.blue, fontFamily: typography.semibold, fontSize: typeScale.xs, lineHeight: 18 },
  linkWarn: { color: colors.danger, fontFamily: typography.semibold, fontSize: typeScale.xs, lineHeight: 18 },
  empty: { color: colors.muted, fontFamily: typography.regular },
  migrationLink: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderColor: colors.blue,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  migrationLinkText: { color: colors.blue, fontFamily: typography.semibold, fontSize: typeScale.xs, lineHeight: 18 },
});

export default LawyerDashboardScreen;
