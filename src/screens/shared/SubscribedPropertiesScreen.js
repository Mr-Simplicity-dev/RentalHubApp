import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import React, { useEffect, useLayoutEffect, useState } from 'react';
import {ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import PropertyCard from '../../components/properties/PropertyCard';
import { paymentService } from '../../services/paymentService';
import { propertyService } from '../../services/propertyService';
import { colors, radius, typography, typeScale } from '../../theme';
import { getErrorMessage, pickList } from '../../utils/http';

import AppText from '../../components/common/AppText';
const SubscribedPropertiesScreen = ({ navigation }) => {
  const interfaceLanguage = useInterfaceLanguage();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState([]);
  const [savedIds, setSavedIds] = useState(() => new Set());
  const [savingId, setSavingId] = useState(null);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation, interfaceLanguage]);

  const loadProperties = async ({ refresh = false } = {}) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const [response, savedRes] = await Promise.all([
        paymentService.getMyUnlockedProperties(),
        propertyService.getSavedProperties({ limit: 100 }).catch(() => null),
      ]);
      setItems(pickList(response, ['data', 'properties']));
      const savedList = pickList(savedRes, ['data', 'properties']);
      setSavedIds(new Set(savedList.map((entry) => entry.id)));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: ui("Could not load subscribed properties"),
        text2: getErrorMessage(error, 'Please check your connection and try again.'),
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProperties();
  }, []);

  const toggleSave = async (propertyId) => {
    const isSaved = savedIds.has(propertyId);
    setSavingId(propertyId);
    try {
      if (isSaved) {
        await propertyService.unsaveProperty(propertyId);
      } else {
        await propertyService.saveProperty(propertyId);
      }
      setSavedIds((previous) => {
        const next = new Set(previous);
        if (isSaved) {
          next.delete(propertyId);
        } else {
          next.add(propertyId);
        }
        return next;
      });
      Toast.show({
        type: 'success',
        text1: isSaved ? ui("Removed from saved homes") : ui("Home saved"),
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: ui("Could not update saved homes"),
        text2: getErrorMessage(error, 'Please try again.'),
      });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityLabel={ui("Go back")}
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Icon name="arrow-back" size={22} color={colors.navy} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <AppText style={styles.eyebrow}>{ui("UNLOCKED ACCESS")}</AppText>
          <AppText style={styles.title}>{ui("Subscribed properties")}</AppText>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        contentContainerStyle={[styles.list, !items.length && styles.emptyList]}
        data={items}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={
          !loading && items.length ? (
            <AppText style={styles.summary}>
              {items.length} {items.length === 1 ? ui("property") : ui("properties")}{ui("unlocked")}</AppText>
          ) : null
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.blue} size="large" />
              <AppText style={styles.loadingText}>{ui("Loading your subscriptions…")}</AppText>
            </View>
          ) : (
            <View style={styles.center}>
              <View style={styles.emptyIcon}>
                <Icon name="key-outline" size={31} color={colors.blue} />
              </View>
              <AppText style={styles.emptyTitle}>{ui("No subscribed properties")}</AppText>
              <AppText style={styles.emptyText}>{ui("You have not unlocked any properties yet. Browse verified listings and unlock a property to access full details.")}</AppText>
              <TouchableOpacity
                onPress={() => navigation.navigate('PropertyList')}
                style={styles.exploreButton}>
                <AppText style={styles.exploreText}>{ui("Browse properties")}</AppText>
                <Icon name="arrow-forward" size={17} color={colors.white} />
              </TouchableOpacity>
            </View>
          )
        }
        refreshControl={
          <RefreshControl
            colors={[colors.blue]}
            onRefresh={() => loadProperties({ refresh: true })}
            refreshing={refreshing}
            tintColor={colors.blue}
          />
        }
        renderItem={({ item }) => {
          const targetId = item.property_id || item.id;
          return (
            <PropertyCard
              isSaved={savedIds.has(targetId)}
              onSave={savingId === targetId ? undefined : () => toggleSave(targetId)}
              onPress={() => navigation.navigate('PropertyDetail', { id: targetId })}
              property={{ ...item, id: targetId }}
            />
          );
        }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.surface,
    flex: 1,
  },
  header: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 21,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  headerCopy: {
    alignItems: 'center',
    flex: 1,
  },
  headerSpacer: {
    width: 42,
  },
  eyebrow: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: typeScale.xs,
    lineHeight: 18,
    letterSpacing: 0.8,
  },
  title: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: typeScale.lg,
    lineHeight: 28,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  list: {
    padding: 16,
    paddingBottom: 30,
  },
  emptyList: {
    flexGrow: 1,
  },
  summary: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginBottom: 13,
  },
  center: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 420,
    paddingHorizontal: 24,
  },
  loadingText: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginTop: 12,
  },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderRadius: 34,
    height: 68,
    justifyContent: 'center',
    width: 68,
  },
  emptyTitle: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: typeScale.lg,
    lineHeight: 28,
    marginTop: 18,
  },
  emptyText: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginTop: 8,
    textAlign: 'center',
  },
  exploreButton: {
    alignItems: 'center',
    backgroundColor: colors.blue,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 8,
    marginTop: 20,
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  exploreText: {
    color: colors.white,
    fontFamily: typography.semibold,
    fontSize: typeScale.xs,
    lineHeight: 18,
  },
});

export default SubscribedPropertiesScreen;
