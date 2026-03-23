import { API_ORIGIN } from '../services/api';

export const getErrorMessage = (error, fallback = 'Request failed') => {
  const validationError = error?.response?.data?.errors?.[0]?.msg;
  return (
    validationError ||
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
};

export const pickList = (response, keys = []) => {
  if (!response || typeof response !== 'object') return [];
  for (const key of keys) {
    const value = response[key];
    if (Array.isArray(value)) return value;
  }
  if (Array.isArray(response.data)) return response.data;
  return [];
};

export const pickObject = (response, keys = []) => {
  if (!response || typeof response !== 'object') return null;
  for (const key of keys) {
    const value = response[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value;
    }
  }
  if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
    return response.data;
  }
  return null;
};

export const getReviewStatus = (user, verificationStatus) => {
  if (verificationStatus?.review_status) {
    return verificationStatus.review_status;
  }

  if (user?.identity_verification_status) {
    return user.identity_verification_status;
  }

  if (user?.identity_verified) {
    return 'verified';
  }

  if (user?.passport_photo_url) {
    return 'pending';
  }

  return 'not_submitted';
};

export const buildUploadUrl = (rawUrl) => {
  if (!rawUrl) return '';

  const normalized = String(rawUrl).replace(/\\/g, '/').trim();

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  const uploadsIndex = normalized.toLowerCase().indexOf('uploads/');
  const uploadPath =
    uploadsIndex >= 0
      ? normalized.slice(uploadsIndex)
      : normalized.replace(/^\/+/, '');

  return `${API_ORIGIN}/${uploadPath}`;
};
