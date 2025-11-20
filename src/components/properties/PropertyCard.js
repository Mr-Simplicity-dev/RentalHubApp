 import React from 'react'; import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native'; import Icon from 'react-native-vector-icons/Ionicons';

const PropertyCard = ({ property, onPress, onSave, isSaved }) => { const formatCurrency = (amount) => { return ₦${amount.toLocaleString()}; };

return ( {/* Image */} <Image source={{ uri: property.primary_photo || 'https://via.placeholder.com/400x300' }} style={styles.image} /> {property.featured && ( Featured )} <TouchableOpacity style={styles.saveButton} onPress={() => onSave && onSave(property.id)}> <Icon name={isSaved ? 'heart' : 'heart-outline'} size={24} color={isSaved ? '#ef4444' : '#ffffff'} />

  {/* Content */}
  <View style={styles.content}>
    <Text style={styles.title} numberOfLines={2}>
      {property.title}
    </Text>

    <View style={styles.location}>
      <Icon name="location-outline" size={16} color="#6b7280" />
      <Text style={styles.locationText} numberOfLines={1}></Text>

       {property.area}, {property.city}, {property.state_name}
          </Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          <View style={styles.feature}>
            <Icon name="bed-outline" size={18} color="#6b7280" />
            <Text style={styles.featureText}>{property.bedrooms} Bed</Text>
          </View>
          <View style={styles.feature}>
            <Icon name="water-outline" size={18} color="#6b7280" />
            <Text style={styles.featureText}>{property.bathrooms} Bath</Text>
          </View>
          {property.avg_rating && (
            <View style={styles.feature}>
              <Icon name="star" size={18} color="#fbbf24" />
              <Text style={styles.featureText}>{parseFloat(property.avg_rating).toFixed(1)}</Text>
            </View>
          )}
        </View>

        {/* Price */}
        <View style={styles.priceContainer}>
          <View>
            <Text style={styles.price}>{formatCurrency(property.rent_amount)}</Text>
            <Text style={styles.priceFrequency}>
              per {property.payment_frequency === 'yearly' ? 'year' : 'month'}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    position: 'relative',
    height: 200,
  },
  image: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  featuredBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#fbbf24',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  featuredText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  saveButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 4,
    flex: 1,
  },
  features: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  featureText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  price: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0284c7',
  },
  priceFrequency: {
    fontSize: 12,
    color: '#6b7280',
  },
});

export default PropertyCard;