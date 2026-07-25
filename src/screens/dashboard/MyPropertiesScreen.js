import React, { useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import BrandImagePlaceholder from '../../components/common/BrandImagePlaceholder';
import DamageReportCapture from '../../components/properties/DamageReportCapture';
import { AuthContext } from '../../context/AuthContext';
import { propertyService } from '../../services/propertyService';
import { colors, radius, typography } from '../../theme';
import { getErrorMessage, pickList } from '../../utils/http';

const MyPropertiesScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [damagePropertyId, setDamagePropertyId] = useState(null);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const loadProperties = async ({ refresh = false } = {}) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const response = await propertyService.getMyProperties();
      setItems(pickList(response, ['data', 'properties']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Could not load properties',
        text2: getErrorMessage(error, 'Please try again.'),
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProperties();
  }, []);

  const statusOf = (item) =>
    !item.is_verified ? 'pending' : item.is_available ? 'available' : 'unavailable';

  const visibleItems = useMemo(
    () => filter === 'all' ? items : items.filter((item) => statusOf(item) === filter),
    [filter, items]
  );

  const updateAvailability = async (item) => {
    setBusyId(item.id);
    try {
      await propertyService.toggleAvailability(item.id);
      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, is_available: !entry.is_available } : entry
        )
      );
      Toast.show({
        type: 'success',
        text1: item.is_available ? 'Property marked unavailable' : 'Property is now available',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Could not update availability',
        text2: getErrorMessage(error, 'Please try again.'),
      });
    } finally {
      setBusyId(null);
    }
  };

  const confirmUnlist = (item) => {
    Alert.alert(
      'Unlist this property?',
      'The property will no longer appear in public search results.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlist',
          style: 'destructive',
          onPress: async () => {
            setBusyId(item.id);
            try {
              await propertyService.unlistProperty(item.id);
              setItems((current) => current.filter((entry) => entry.id !== item.id));
              Toast.show({ type: 'success', text1: 'Property unlisted' });
            } catch (error) {
              Toast.show({
                type: 'error',
                text1: 'Could not unlist property',
                text2: getErrorMessage(error, 'Please try again.'),
              });
            } finally {
              setBusyId(null);
            }
          },
        },
      ]
    );
  };

  if (!['landlord', 'agent'].includes(user?.user_type)) {
    return (
      <SafeAreaView style={styles.center}>
        <Icon name="lock-closed-outline" size={32} color={colors.blue} />
        <Text style={styles.emptyTitle}>Property management unavailable</Text>
        <Text style={styles.emptyText}>This area is for landlords and assigned agents.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={22} color={colors.navy} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>PORTFOLIO</Text>
          <Text style={styles.title}>My properties</Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('AddProperty')}
          style={styles.addButton}>
          <Icon name="add" size={23} color={colors.white} />
        </TouchableOpacity>
      </View>

      <FlatList
        contentContainerStyle={[styles.list, !visibleItems.length && styles.emptyList]}
        data={visibleItems}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={
          <>
            <View style={styles.summaryCard}>
              <View>
                <Text style={styles.summaryLabel}>TOTAL PORTFOLIO</Text>
                <Text style={styles.summaryValue}>{items.length} properties</Text>
              </View>
              <View style={styles.summaryIcon}>
                <Icon name="business-outline" size={23} color={colors.gold} />
              </View>
            </View>
            <View style={styles.filterRow}>
              {['all', 'available', 'pending', 'unavailable'].map((value) => (
                <TouchableOpacity
                  key={value}
                  onPress={() => setFilter(value)}
                  style={[styles.filterChip, filter === value && styles.filterChipActive]}>
                  <Text style={[styles.filterText, filter === value && styles.filterTextActive]}>
                    {value.charAt(0).toUpperCase() + value.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.blue} size="large" />
            </View>
          ) : (
            <View style={styles.center}>
              <View style={styles.emptyIcon}>
                <Icon name="home-outline" size={31} color={colors.blue} />
              </View>
              <Text style={styles.emptyTitle}>
                {filter === 'all' ? 'Build your property portfolio' : `No ${filter} properties`}
              </Text>
              <Text style={styles.emptyText}>
                {filter === 'all'
                  ? 'Add your first property and submit it for verification.'
                  : 'Try another portfolio filter.'}
              </Text>
              {filter === 'all' ? (
                <TouchableOpacity
                  onPress={() => navigation.navigate('AddProperty')}
                  style={styles.emptyAction}>
                  <Text style={styles.emptyActionText}>Add a property</Text>
                  <Icon name="arrow-forward" size={17} color={colors.white} />
                </TouchableOpacity>
              ) : null}
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
          const status = statusOf(item);
          const cover =
            item.primary_photo ||
            item.photo_url ||
            item.photos?.[0]?.photo_url;
          const statusColor =
            status === 'available' ? colors.success : status === 'pending' ? '#B46B00' : colors.muted;
          const statusBg =
            status === 'available' ? '#EAF9F2' : status === 'pending' ? '#FFF6DD' : '#EEF1F5';
          return (
            <View style={styles.card}>
              <TouchableOpacity
                activeOpacity={0.84}
                onPress={() => navigation.navigate('PropertyDetail', { id: item.id })}>
                {cover ? (
                  <Image source={{ uri: cover }} style={styles.image} />
                ) : (
                  <BrandImagePlaceholder compact style={styles.image} />
                )}
                <View style={[styles.statusPill, { backgroundColor: statusBg }]}>
                  <Text style={[styles.statusText, { color: statusColor }]}>{status}</Text>
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{item.title || 'Rental property'}</Text>
                  <Text style={styles.cardMeta}>
                    {[item.area, item.city, item.state_name].filter(Boolean).join(', ') ||
                      'Location unavailable'}
                  </Text>
                  <Text style={styles.price}>₦{Number(item.rent_amount || 0).toLocaleString()}</Text>
                </View>
              </TouchableOpacity>
              <View style={styles.actions}>
                <TouchableOpacity
                  disabled={busyId === item.id || !item.is_verified}
                  onPress={() => updateAvailability(item)}
                  style={styles.action}>
                  <Icon name={item.is_available ? 'pause-circle-outline' : 'play-circle-outline'} size={18} color={colors.blue} />
                  <Text style={styles.actionText}>{item.is_available ? 'Pause' : 'Activate'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setDamagePropertyId(item.id)} style={styles.action}>
                  <Icon name="construct-outline" size={18} color={colors.blue} />
                  <Text style={styles.actionText}>Damage</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => confirmUnlist(item)} style={styles.action}>
                  <Icon name="trash-outline" size={18} color={colors.danger} />
                  <Text style={styles.dangerText}>Unlist</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        showsVerticalScrollIndicator={false}
      />

      <DamageReportCapture
        onClose={() => setDamagePropertyId(null)}
        onSaved={() => loadProperties({ refresh: true })}
        propertyId={damagePropertyId}
        visible={Boolean(damagePropertyId)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.surface, flex: 1 },
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
  headerCopy: { alignItems: 'center', flex: 1 },
  eyebrow: { color: colors.blue, fontFamily: typography.bold, fontSize: 13, letterSpacing: 1.2 },
  title: { color: colors.ink, fontFamily: typography.bold, fontSize: 20, marginTop: 2 },
  addButton: {
    alignItems: 'center',
    backgroundColor: colors.blue,
    borderRadius: 21,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  list: { padding: 16, paddingBottom: 28 },
  emptyList: { flexGrow: 1 },
  summaryCard: {
    alignItems: 'center',
    backgroundColor: colors.navy,
    borderRadius: radius.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 13,
    padding: 19,
  },
  summaryLabel: { color: '#9BC3F4', fontFamily: typography.bold, fontSize: 13, letterSpacing: 1.1 },
  summaryValue: { color: colors.white, fontFamily: typography.bold, fontSize: 22, marginTop: 4 },
  summaryIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,201,40,0.14)',
    borderRadius: 21,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  filterRow: { flexDirection: 'row', gap: 7, marginBottom: 14 },
  filterChip: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  filterChipActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  filterText: { color: colors.text, fontFamily: typography.medium, fontSize: 13 },
  filterTextActive: { color: colors.white, fontFamily: typography.semibold },
  card: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: 13,
    overflow: 'hidden',
  },
  image: { height: 170, width: '100%' },
  statusPill: {
    borderRadius: radius.pill,
    left: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
    position: 'absolute',
    top: 12,
  },
  statusText: { fontFamily: typography.bold, fontSize: 13, textTransform: 'uppercase' },
  cardBody: { padding: 14 },
  cardTitle: { color: colors.ink, fontFamily: typography.bold, fontSize: 16 },
  cardMeta: { color: colors.muted, fontFamily: typography.regular, fontSize: 13, marginTop: 4 },
  price: { color: colors.blue, fontFamily: typography.bold, fontSize: 18, marginTop: 8 },
  actions: { borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row' },
  action: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
    minHeight: 45,
  },
  actionText: { color: colors.blue, fontFamily: typography.semibold, fontSize: 13 },
  dangerText: { color: colors.danger, fontFamily: typography.semibold, fontSize: 13 },
  center: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    flex: 1,
    justifyContent: 'center',
    minHeight: 380,
    paddingHorizontal: 28,
  },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderRadius: 34,
    height: 68,
    justifyContent: 'center',
    width: 68,
  },
  emptyTitle: { color: colors.ink, fontFamily: typography.bold, fontSize: 20, marginTop: 17, textAlign: 'center' },
  emptyText: { color: colors.muted, fontFamily: typography.regular, fontSize: 13, lineHeight: 20, marginTop: 7, textAlign: 'center' },
  emptyAction: {
    alignItems: 'center',
    backgroundColor: colors.blue,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 8,
    marginTop: 18,
    paddingHorizontal: 17,
    paddingVertical: 12,
  },
  emptyActionText: { color: colors.white, fontFamily: typography.semibold, fontSize: 13 },
});

export default MyPropertiesScreen;
