import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const formatCurrency = (value) => {
  const amount = Number(value || 0);
  return `NGN ${amount.toLocaleString()}`;
};

const PropertyCard = ({ property, onPress, onSave, isSaved = false }) => {
  const cover =
    property?.primary_photo ||
    property?.photo_url ||
    property?.photos?.[0]?.photo_url ||
    'https://via.placeholder.com/640x400?text=Property';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.card}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: cover }} style={styles.image} />
        {Boolean(property?.featured) && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Featured</Text>
          </View>
        )}
        {onSave && (
          <TouchableOpacity style={styles.saveButton} onPress={() => onSave(property.id)}>
            <Icon
              name={isSaved ? 'heart' : 'heart-outline'}
              size={20}
              color={isSaved ? '#ef4444' : '#ffffff'}
            />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {property?.title || 'Untitled Property'}
        </Text>

        <View style={styles.row}>
          <Icon name="location-outline" size={15} color="#6b7280" />
          <Text style={styles.meta} numberOfLines={1}>
            {[property?.area, property?.city, property?.state_name].filter(Boolean).join(', ') || 'Location unavailable'}
          </Text>
        </View>

        <View style={styles.row}>
          <Icon name="bed-outline" size={15} color="#6b7280" />
          <Text style={styles.meta}>{Number(property?.bedrooms || 0)} bed</Text>
          <Icon name="water-outline" size={15} color="#6b7280" style={styles.gap} />
          <Text style={styles.meta}>{Number(property?.bathrooms || 0)} bath</Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.price}>{formatCurrency(property?.rent_amount)}</Text>
          <Text style={styles.frequency}>
            / {property?.payment_frequency === 'yearly' ? 'year' : 'month'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  imageContainer: {
    position: 'relative',
    height: 180,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    left: 12,
    top: 12,
    backgroundColor: '#0284c7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  saveButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 14,
    gap: 6,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  meta: {
    marginLeft: 6,
    color: '#475569',
    fontSize: 13,
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
    fontSize: 21,
    fontWeight: '800',
    color: '#0284c7',
  },
  frequency: {
    marginLeft: 6,
    color: '#64748b',
    fontSize: 13,
  },
});

export default PropertyCard;
