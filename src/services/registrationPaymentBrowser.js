import * as WebBrowser from 'expo-web-browser';

export const openRegistrationPayment = async (authorizationUrl) => {
  let url;
  try {
    url = new URL(authorizationUrl);
  } catch {
    throw new Error('The payment provider returned an invalid checkout link.');
  }
  if (url.protocol !== 'https:' || url.hostname !== 'checkout.paystack.com' || url.username || url.password) {
    throw new Error('The payment provider returned an unsupported checkout link.');
  }
  return WebBrowser.openBrowserAsync(url.href);
};
