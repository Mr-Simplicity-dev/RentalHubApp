import React, { useState, useEffect, useContext } from 'react'; import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions, ActivityIndicator, } from 'react-native'; import { propertyService } from '../../services/propertyService'; import { AuthContext } from '../../context/AuthContext'; import Icon from 'react-native-vector-icons/Ionicons'; import Toast from 'react-native-toast-message'; import Button from '../../components/common/Button';

const { width } = Dimensions.get('window');

const PropertyDetailScreen = ({ route, navigation }) => { const { id } = route.params; const { user, isAuthenticated } = useContext(AuthContext); const [property, setProperty] = useState(null); const [loading, setLoading] = useState(true); const [isSaved, setIsSaved] = useState(false); const [hasSubscription, setHasSubscription] = useState(false);

useEffect(() => { loadProperty(); }, [id]);

const loadProperty = async () => { setLoading(true); try { let response; if (isAuthenticated && user?.user_type === 'tenant' && user?.subscription_active) { response = await propertyService.getFullPropertyDetails(id); setHasSubscription(true); } else { response = await propertyService.getPropertyById(id); setHasSubscription(false); }

  if (response.success) {
    setProperty(response.data);
  }
} catch (error) {
  Toast.show({
    type: 'error',
    text1: 'Error',
    text2: 'Failed to load property details',
  });
} finally {
  setLoading(false);
}
};

const handleSave = async () => { if (!isAuthenticated) { navigation.navigate('Login'); return; }

try {
  if (isSaved) {
    await propertyService.unsaveProperty(id);
    setIsSaved(false);
    Toast.show({
      type: 'success',
      text1: 'Success',
      text2: 'Property removed from favorites',
    });
  } else {
    await propertyService.saveProperty(id);
    setIsSaved(true);
    Toast.show({
      type: 'success',
      text1: 'Success',
      text2: 'Property saved to favorites',
    });
  }
} catch (error) {
  Toast.show({
    type: 'error',
    text1: 'Error',
    text2: 'Failed to save property',
  });
}
};

const formatCurrency = (amount) => { return ₦${amount.toLocaleString()}; };

if (loading) { return ( ); }

if (!property) { return ( Property not found ); }

return ( {/* Image Gallery */} {property.photos && property.photos.length > 0 ? ( property.photos.map((photo) => ( <Image key={photo.id} source={{ uri: photo.photo_url }} style={styles.image} /> )) ) : ( <Image source={{ uri: 'https://via.placeholder.com/400x300' }} style={styles.image} /> )}

  {/* Header Actions */}
  <View style={styles.headerActions}>
    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
      <Icon name="arrow-back" size={24} color="#1f2937" />
    </TouchableOpacity>
    <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
      <Icon
        name={isSaved ? 'heart' : 'heart-outline'}
        size={24}
        color={isSaved ? '#ef4444' : '#1f2937'}
      />
    </TouchableOpacity>
  </View>

  {/* Content */}
  <View style={styles.content}>
    {/* Title and Location */}
    <Text style={styles.title}>{property.title}</Text>
    <View style={styles.location}>
      <Icon name="location-outline" size={18} color="#6b7280" />
      <Text style={styles.locationText}>
        {property.area}, {property.city}, {property.state_name}
      </Text>
    </View>

    {/* Price */}
    <View style={styles.priceContainer}>
      <Text style={styles.price}>{formatCurrency(property.rent_amount)}</Text>
      <Text style={styles.priceFrequency}>
        per {property.payment_frequency === 'yearly' ? 'year' : 'month'}
      </Text>
    </View>

    {/* Features */}
    <View style={styles.features}>
      <View style={styles.feature}>
        <Icon name="bed-outline" size={24} color="#6b7280" />
        <Text style={styles.featureValue}>{property.bedrooms}</Text>
        <Text style={styles.featureLabel}>Bedrooms</Text>
      </View>
      <View style={styles.feature}>
        <Icon name="water-outline" size={24} color="#6b7280" />
        <Text style={styles.featureValue}>{property.bathrooms}</Text>
        <Text style={styles.featureLabel}>Bathrooms</Text>
      </View>
      {property.avg_rating && (
        <View style={styles.feature}>
          <Icon name="star" size={24} color="#fbbf24" />
          <Text style={styles.featureValue}>
            {parseFloat(property.avg_rating).toFixed(1)}
          </Text>
          <Text style={styles.featureLabel}>Rating</Text>
        </View>
      )}
    </View>

    {/* Description */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Description</Text>
      <Text style={styles.description}>{property.description}</Text>
    </View>

    {/* Amenities */}
    {property.amenities && property.amenities.length > 0 && (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Amenities</Text>
        <View style={styles.amenities}>
          {property.amenities.map((amenity, index) => (
            <View key={index} style={styles.amenity}>
              <Icon name="checkmark-circle" size={20} color="#10b981" />
              <Text style={styles.amenityText}>{amenity}</Text>
            </View>
          ))}
        </View>
      </View>
    )}

    {/* Contact Section */}
    {hasSubscription && property.landlord_name ? (
      <View style={styles.contactSection}>
        <Text style={styles.sectionTitle}>Contact Landlord</Text>
        <View style={styles.contactInfo}>
          <View style={styles.contactItem}>
            <Text style={styles.contactLabel}>Name</Text>
            <View style={styles.contactValue}>
              <Text style={styles.contactText}>{property.landlord_name}</Text>
              {property.landlord_verified && (
                <Icon name="checkmark-circle" size={18} color="#10b981" />
              )}
            </View>
          </View>
          <View style={styles.contactItem}>
            <Text style={styles.contactLabel}>Phone</Text>
            <Text style={styles.contactText}>{property.landlord_phone}</Text>
          </View>
          <View style={styles.contactItem}>
            <Text style={styles.contactLabel}>Email</Text>
            <Text style={styles.contactText}>{property.landlord_email}</Text>
          </View>
        </View>
      </View>
    ) : (
      <View style={styles.subscriptionPrompt}>
        <Icon name="lock-closed-outline" size={32} color="#0284c7" />
        <Text style={styles.subscriptionTitle}>Subscribe to View Contact</Text>
        <Text style={styles.subscriptionText}>
          Subscribe to access landlord contact information and full property details
        </Text>
        <Button
          title="Subscribe Now"
          onPress={() => navigation.navigate('Subscribe')}
          style={styles.subscribeButton}
        />
      </View>
    )}

    {/* Apply Button */}
    {isAuthenticated && user?.user_type === 'tenant' && (
      <Button
        title="Apply for This Property"
        onPress={() =>
          navigation.navigate('ApplicationForm', { propertyId: id, property })
        }
        style={styles.applyButton}
      />
    )}
  </View>
</ScrollView>
); };

const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: '#ffffff', }, loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', }, errorContainer: { flex: 1, justifyContent:

 justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    color: '#6b7280',
  },
  imageGallery: {
    height: 300,
  },
  image: {
    width: width,
    height: 300,
    resizeMode: 'cover',
  },
  headerActions: {
    position: 'absolute',
    top: 40,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  locationText: {
    fontSize: 16,
    color: '#6b7280',
    marginLeft: 4,
  },
  priceContainer: {
    marginBottom: 24,
  },
  price: {
    fontSize: 32,
    fontWeight: '700',
    color: '#0284c7',
  },
  priceFrequency: {
    fontSize: 14,
    color: '#6b7280',
  },
  features: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 24,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 24,
  },
  feature: {
    alignItems: 'center',
  },
  featureValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 8,
  },
  featureLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#4b5563',
    lineHeight: 24,
  },
  amenities: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  amenity: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
  },
  amenityText: {
    fontSize: 14,
    color: '#4b5563',
    marginLeft: 8,
  },
  contactSection: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  contactInfo: {
    gap: 12,
  },
  contactItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contactLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  contactValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  subscriptionPrompt: {
    backgroundColor: '#fef3c7',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  subscriptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#92400e',
    marginTop: 12,
    marginBottom: 8,
  },
  subscriptionText: {
    fontSize: 14,
    color: '#78350f',
    textAlign: 'center',
    marginBottom: 16,
  },
  subscribeButton: {
    width: '100%',
  },
  applyButton: {
    marginBottom: 24,
  },
});

export default PropertyDetailScreen;