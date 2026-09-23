// Screens frequently render a value straight from an API payload that can turn out
// to be an array or a nested object. React would either print "[object Object]" or
// throw "Objects are not valid as a React child", so every value goes through here.
export const formatDisplayValue = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? value.toLocaleString() : '';
  if (typeof value === 'string' || typeof value === 'boolean') return String(value);
  if (value instanceof Date) return value.toLocaleString();

  if (Array.isArray(value)) {
    if (value.length === 0) return '—';
    if (value.every((item) => item === null || typeof item !== 'object')) {
      return value.join(', ');
    }
    return `${value.length} item${value.length === 1 ? '' : 's'}`;
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) return '—';
    if (keys.length <= 3) {
      return keys.map((key) => `${key}: ${formatDisplayValue(value[key])}`).join(' · ');
    }
    return `${keys.length} fields`;
  }

  return String(value);
};

// True when the value can be handed to a Text component untouched.
export const isPlainTextValue = (value) =>
  value === null ||
  value === undefined ||
  typeof value === 'string' ||
  typeof value === 'number' ||
  typeof value === 'boolean';

export default formatDisplayValue;
