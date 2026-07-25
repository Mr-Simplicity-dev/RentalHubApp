import React from 'react';
import {View Image, TouchableOpacity, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import BrandImagePlaceholder from '../common/BrandImagePlaceholder';
import { colors, radius, shadows, typography } from '../../theme';

import AppText from '../../components/common/AppText';
const formatCurrency = (value) => {
  const amount = Number(value || 0);
  return `₦${amount.toLocaleString()}`;
};

const PropertyCard = ({ property, onPress, onSave, isSaved = false }) => {
  const cover =
    property?.primary_photo ||
    property?.photo_url ||
    property?.photos?.[0]?.photo_url;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.card}>
      <View style={styles.imageContainer}>
        {cover ? (
          <Image source={{ uri: cover }} style={styles.image} resizeMode="cover" />
        ) : (
          <BrandImagePlaceholder compact style={styles.image} />
        )}
        {Boolean(property?.featured) && (
          <View style={styles.badge}>
            <AppText style={styles.badgeText}>Featured</AppText>
          </View>
        )}
        {onSave && (
          <TouchableOpacity
            accessibilityLabel={isSaved ? 'Remove saved property' : 'Save property'}
            style={styles.saveButton}
            onPress={(event) => {
              event.stopPropagation();
              onSave(property.id);
            }}>
            <Icon
              name={isSaved ? 'heart' : 'heart-outline'}
              size={20}
              color={isSaved ? '#F04438' : colors.white}
            />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.content}>
        <AppText style={styles.title} numberOfLines={2}>
          {property?.title || 'Untitled Property'}
        </AppText>

        <View style={styles.row}>
          <Icon name="location-outline" size={15} color={colors.muted} />
          <AppText style={styles.meta} numberOfLines={1}>
            {[property?.area, property?.city, property?.state_name].filter(Boolean).join(', ') || 'Location unavailable'}
          </AppText>
        </View>

        <View style={styles.row}>
          <Icon name="bed-outline" size={15} color={colors.muted} />
          <AppText style={styles.meta}>{Number(property?.bedrooms || 0)} bed</AppText>
          <Icon name="water-outline" size={15} color={colors.muted} style={styles.gap} />
          <AppText style={styles.meta}>{Number(property?.bathrooms || 0)} bath</AppText>
        </View>

        <View style={styles.footer}>
          <AppText style={styles.price}>{formatCurrency(property?.rent_amount)}</AppText>
          <AppText style={styles.frequency}>
            / {property?.payment_frequency === 'yearly' ? 'year' : 'month'}
          </AppText>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderColor: '#E6EBF3',
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: 14,
    overflow: 'hidden',
    ...shadows.soft,
  },
  imageContainer: {
    height: 180,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    left: 12,
    top: 12,
    backgroundColor: colors.blue,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    color: colors.white,
    fontFamily: typography.bold,
    fontSize: 13,
  },
  saveButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(7,26,61,0.62)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    gap: 7,
    padding: 15,
  },
  title: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 18,
    letterSpacing: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  meta: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    marginLeft: 6,
  },
  gap: {
    marginLeft: 14,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 2,
  },
  price: {
    color: colors.navy,
    fontFamily: typography.bold,
    fontSize: 20,
  },
  frequency: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    marginLeft: 5,
  },
});

export default PropertyCard;
