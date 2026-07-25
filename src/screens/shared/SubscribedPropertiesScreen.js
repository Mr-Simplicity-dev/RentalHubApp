import React, { useEffect, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import PropertyCard from '../../components/properties/PropertyCard';
import { paymentService } from '../../services/paymentService';
import { colors, radius, typography } from '../../theme';
import { getErrorMessage, pickList } from '../../utils/http';

const SubscribedPropertiesScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState([]);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const loadProperties = async ({ refresh = false } = {}) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const response = await paymentService.getMyUnlockedProperties();
      setItems(pickList(response, ['data', 'properties']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Could not load subscribed properties',
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

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityLabel="Go back"
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Icon name="arrow-back" size={22} color={colors.navy} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>UNLOCKED ACCESS</Text>
          <Text style={styles.title}>Subscribed properties</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        contentContainerStyle={[styles.list, !items.length && styles.emptyList]}
        data={items}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={
          !loading && items.length ? (
            <Text style={styles.summary}>
              {items.length} {items.length === 1 ? 'property' : 'properties'} unlocked
            </Text>
          ) : null
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.blue} size="large" />
              <Text style={styles.loadingText}>Loading your subscriptions…</Text>
            </View>
          ) : (
            <View style={styles.center}>
              <View style={styles.emptyIcon}>
                <Icon name="key-outline" size={31} color={colors.blue} />
              </View>
              <Text style={styles.emptyTitle}>No subscribed properties</Text>
              <Text style={styles.emptyText}>
                You have not unlocked any properties yet. Browse verified listings and unlock a property to access full details.
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('PropertyList')}
                style={styles.exploreButton}>
                <Text style={styles.exploreText}>Browse properties</Text>
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
        renderItem={({ item }) => (
          <PropertyCard
            onPress={() => navigation.navigate('PropertyDetail', { id: item.id })}
            property={item}
          />
        )}
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
    fontSize: 13,
    letterSpacing: 1.2,
  },
  title: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 20,
    letterSpacing: -0.4,
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
    fontSize: 13,
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
    fontSize: 13,
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
    fontFamily: typography.bold,
    fontSize: 21,
    marginTop: 18,
  },
  emptyText: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 20,
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
    fontSize: 13,
  },
});

export default SubscribedPropertiesScreen;
