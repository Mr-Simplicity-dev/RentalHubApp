export const getErrorMessage = (error, fallback = 'Request failed') => {
  return (
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
