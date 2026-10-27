import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import React, { useEffect, useState } from 'react';
import {StyleSheet, TouchableOpacity, View} from 'react-native';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/Ionicons';
import { adminService } from '../../services/adminService';
import { getErrorMessage, pickList } from '../../utils/http';
import {
  InfoRow,
  PremiumCard,
  PremiumHero,
  PremiumListScreen,
  StatusPill,
} from '../../components/common/PremiumLayout';
import { colors, typography, typeScale } from '../../theme';

import AppText from '../../components/common/AppText';
const AdminPropertiesScreen = ({ navigation }) => {
  useInterfaceLanguage();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadProperties = async () => {
    setLoading(true);
    try {
      const response = await adminService.getProperties();
      setItems(pickList(response, ['data', 'properties']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: ui("Failed"),
        text2: getErrorMessage(error, ui("Could not load properties")),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProperties();
  }, []);

  return (
    <PremiumListScreen
      data={items}
      refreshing={loading}
      onRefresh={loadProperties}
      keyExtractor={(item) => String(item.id)}
      emptyTitle={ui("No properties found")}
      emptyMessage={ui("Properties submitted to RentalHub will appear here.")}
      emptyIcon="home-outline"
      header={
        <PremiumHero
          eyebrow={ui("Administration")}
          title={ui("Properties")}
          subtitle={ui("Review property records, landlords and locations in a cleaner mobile view.")}
          icon="business-outline"
          right={<StatusPill label={ui("{value0} records", {value0: (items.length)})} color={colors.blue} />}
        />
      }
      renderItem={({ item }) => {
        const location =
          [item.city, item.state].filter(Boolean).join(', ') ||
          [item.city, item.state_name].filter(Boolean).join(', ') ||
          'Location unavailable';

        return (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={ui("Open {value0}", {value0: (item.title || ui("property"))})}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('AdminPropertyDetail', { id: item.id })}
          >
            <PremiumCard>
              <View style={styles.cardHeader}>
                <View style={styles.propertyIcon}>
                  <AppText style={styles.propertyIconText}>{ui("RH")}</AppText>
                </View>
                <View style={styles.cardCopy}>
                  <AppText style={styles.cardTitle}>{item.title || 'Untitled property'}</AppText>
                  <AppText style={styles.cardMeta}>{location}</AppText>
                </View>
                <Icon name="chevron-forward" size={20} color={colors.muted} />
              </View>
              <InfoRow icon="person-outline" label={ui("Landlord")} value={item.landlord_name || 'No landlord name'} />
              <InfoRow icon="pricetag-outline" label={ui("Status")} value={item.status || item.approval_status || '—'} />
            </PremiumCard>
          </TouchableOpacity>
        );
      }}
    />
  );
};

const styles = StyleSheet.create({
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 6,
  },
  propertyIcon: {
    alignItems: 'center',
    backgroundColor: colors.navy,
    borderRadius: 18,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  propertyIconText: {
    color: colors.gold,
    fontFamily: typography.bold,
    fontSize: 13,
  },
  cardCopy: {
    flex: 1,
  },
  cardTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: typeScale.base,
    lineHeight: 24,
  },
  cardMeta: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginTop: 3,
  },
});

export default AdminPropertiesScreen;
