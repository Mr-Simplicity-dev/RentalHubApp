import { Linking, NativeModules, Platform } from 'react-native';

const { RentalHubPaystack } = NativeModules;

const firstString = (...values) =>
  values.find((value) => typeof value === 'string' && value.trim())?.trim() || '';

const nestedData = (transaction = {}) => transaction?.data || transaction?.payment || transaction;

export const getPaymentReference = (transaction = {}) => {
  const data = nestedData(transaction);
  return firstString(
    data?.reference,
    data?.trxref,
    data?.payment_reference,
    transaction?.reference,
    transaction?.trxref,
    transaction?.payment_reference
  );
};

export const getPaystackAccessCode = (transaction = {}) => {
  const data = nestedData(transaction);
  return firstString(
    data?.access_code,
    data?.accessCode,
    data?.accesscode,
    transaction?.access_code,
    transaction?.accessCode,
    transaction?.accesscode
  );
};

export const getPaystackAuthorizationUrl = (transaction = {}) => {
  const data = nestedData(transaction);
  return firstString(
    data?.authorization_url,
    data?.authorizationUrl,
    data?.authorizationURL,
    data?.url,
    transaction?.authorization_url,
    transaction?.authorizationUrl,
    transaction?.authorizationURL,
    transaction?.url
  );
};

export const getPaystackAmount = (transaction = {}) => {
  const data = nestedData(transaction);
  return data?.amount || data?.amount_paid || data?.total || transaction?.amount || transaction?.total || '';
};

export const hasPaystackCheckout = (transaction = {}) =>
  Boolean(getPaystackAccessCode(transaction) || getPaystackAuthorizationUrl(transaction));

export const canUseNativePaystackCard = (transaction = {}) =>
  Boolean(
    Platform.OS === 'android' &&
      RentalHubPaystack &&
      typeof RentalHubPaystack.launch === 'function' &&
      getPaystackAccessCode(transaction)
  );

export const launchNativePaystackCheckout = async (transaction = {}) => {
  const accessCode = getPaystackAccessCode(transaction);
  const fallbackReference = getPaymentReference(transaction);

  if (!accessCode) {
    throw new Error('Paystack access code was not returned by the server.');
  }

  if (!canUseNativePaystackCard(transaction)) {
    throw new Error('Native Paystack checkout is not available on this build.');
  }

  const result = await RentalHubPaystack.launch(accessCode, fallbackReference || '');
  const reference = result?.reference || fallbackReference;

  if (result?.status === 'completed') {
    return {
      ...result,
      reference,
    };
  }

  if (result?.status === 'cancelled') {
    throw new Error('Payment was cancelled.');
  }

  throw new Error(result?.message || 'Paystack payment was not completed.');
};

export const openPaystackBrowserCheckout = async (transaction = {}) => {
  const authorizationUrl = getPaystackAuthorizationUrl(transaction);
  if (!authorizationUrl) {
    throw new Error('No Paystack checkout link was returned.');
  }

  await Linking.openURL(authorizationUrl);
  return authorizationUrl;
};

export const describeNativePaystackStatus = (transaction = {}) => {
  if (canUseNativePaystackCard(transaction)) {
    return { available: true, reason: '' };
  }

  if (!getPaystackAccessCode(transaction)) {
    return {
      available: false,
      reason: 'The server did not return a Paystack access code for native checkout.',
    };
  }

  if (Platform.OS !== 'android') {
    return {
      available: false,
      reason: 'Native Paystack sheet is implemented for Android APK builds first.',
    };
  }

  return {
    available: false,
    reason: 'Native Paystack module is not available on this device build.',
  };
};
