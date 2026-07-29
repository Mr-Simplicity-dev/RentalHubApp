import AsyncStorage from '@react-native-async-storage/async-storage';
import { paymentService } from './paymentService';
import { transportationService } from './transportationService';
import { fumigationCleaningService } from './fumigationCleaningService';
import recruitmentService from './recruitmentService';

const PENDING_PAYMENT_KEY = 'rentalhub.pendingPayment';

const safeJsonParse = (value) => {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

const getQueryParam = (url, keys) => {
  if (!url) return '';
  const normalizedKeys = Array.isArray(keys) ? keys : [keys];

  for (const key of normalizedKeys) {
    const match = String(url).match(new RegExp(`[?&]${key}=([^&#]+)`, 'i'));
    if (match?.[1]) return decodeURIComponent(match[1]);
  }

  return '';
};

export const inferPaymentFlow = (reference = '') => {
  const ref = String(reference).toUpperCase();
  if (ref.startsWith('TRANSPORT_')) return 'transportation';
  if (ref.startsWith('FUMIGATION_') || ref.startsWith('CLEANING_')) return 'fumigation';
  if (ref.includes('WALLET')) return 'wallet';
  if (ref.includes('RENT')) return 'rent';
  if (ref.includes('LISTING')) return 'listing';
  if (ref.includes('UNLOCK')) return 'unlock';
  if (ref.includes('LOCATION')) return 'location_access';
  if (ref.includes('RECRUIT')) return 'recruitment';
  return 'subscription';
};

export const extractPaymentReference = (url = '') =>
  getQueryParam(url, ['reference', 'trxref', 'payment_reference', 'ref']);

export const savePendingPayment = async (payment) => {
  const payload = {
    ...payment,
    reference: payment.reference || '',
    createdAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(PENDING_PAYMENT_KEY, JSON.stringify(payload));
  return payload;
};

export const getPendingPayment = async () =>
  safeJsonParse(await AsyncStorage.getItem(PENDING_PAYMENT_KEY));

export const clearPendingPayment = async () => {
  await AsyncStorage.removeItem(PENDING_PAYMENT_KEY);
};

const destinationForPayment = (payment = {}) => {
  switch (payment.flow) {
    case 'transportation':
      return { name: 'TransportationBookingDetail', params: { bookingId: payment.bookingId } };
    case 'fumigation':
      return { name: 'FumigationCleaningBookingDetail', params: { bookingId: payment.bookingId } };
    case 'wallet':
    case 'rent':
    case 'listing':
      return { name: 'PaymentHistory' };
    case 'unlock':
      return payment.propertyId
        ? { name: 'PropertyDetail', params: { id: payment.propertyId } }
        : { name: 'PaymentHistory' };
    case 'location_access':
      return { name: 'PropertyList' };
    case 'recruitment':
      return {
        name: 'RecruitmentApplication',
        params: {
          applicationId: payment.applicationId,
          email: payment.email,
          referenceNumber: payment.referenceNumber,
        },
      };
    case 'subscription':
    default:
      return { name: 'Subscribe' };
  }
};

export const verifyPaymentForFlow = async (payment = {}) => {
  const reference = payment.reference;
  if (!reference) {
    return { success: false, message: 'Payment reference missing' };
  }

  switch (payment.flow) {
    case 'transportation':
      return transportationService.verifyPayment(reference);
    case 'fumigation':
      return fumigationCleaningService.verifyPayment(reference);
    case 'wallet':
      return paymentService.verifyWalletFund(reference);
    case 'rent':
      return paymentService.verifyRentPayment(reference);
    case 'listing':
      return paymentService.verifyListingPayment(reference);
    case 'unlock':
      return paymentService.verifyPropertyUnlock(reference);
    case 'location_access':
      return paymentService.verifyLocationAccess(reference);
    case 'recruitment': {
      const response = await recruitmentService.verifyPayment(reference, {
        applicant_email: payment.email || '',
        reference_number: payment.referenceNumber || '',
      });
      return response?.data || response;
    }
    case 'subscription':
    default:
      return paymentService.verifySubscription(reference);
  }
};

export const recoverPayment = async ({ url, reference, fallbackFlow } = {}) => {
  const pending = await getPendingPayment();
  const returnedReference = reference || extractPaymentReference(url);
  const payment = {
    ...(pending || {}),
    reference: returnedReference || pending?.reference || '',
    flow: pending?.flow || fallbackFlow || inferPaymentFlow(returnedReference || pending?.reference),
  };

  if (!payment.reference) {
    return {
      handled: false,
      success: false,
      message: 'No payment reference found',
      destination: destinationForPayment(payment),
    };
  }

  const verification = await verifyPaymentForFlow(payment);
  const success = Boolean(verification?.success);

  if (success) {
    await clearPendingPayment();
  } else {
    await savePendingPayment(payment);
  }

  return {
    handled: true,
    success,
    message: verification?.message,
    data: verification?.data,
    destination: destinationForPayment(payment),
  };
};

export const isLikelyPaymentReturnUrl = (url = '') => {
  const text = String(url).toLowerCase();
  return Boolean(
    extractPaymentReference(url) ||
      text.includes('payment/callback') ||
      text.includes('verify-payment') ||
      text.includes('verify-subscription') ||
      text.includes('verify-wallet')
  );
};
