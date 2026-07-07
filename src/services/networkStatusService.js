const listeners = new Set();

let snapshot = {
  online: true,
  weak: false,
  lastChangedAt: new Date().toISOString(),
  lastError: '',
};

const notify = () => {
  listeners.forEach((listener) => {
    try {
      listener(snapshot);
    } catch {
      // Ignore listener errors so network status updates never break API calls.
    }
  });
};

export const getNetworkSnapshot = () => snapshot;

export const subscribeNetworkStatus = (listener) => {
  listeners.add(listener);
  listener(snapshot);
  return () => listeners.delete(listener);
};

export const markNetworkHealthy = () => {
  if (snapshot.online && !snapshot.weak) return;
  snapshot = {
    online: true,
    weak: false,
    lastChangedAt: new Date().toISOString(),
    lastError: '',
  };
  notify();
};

export const markNetworkProblem = (error) => {
  const status = error?.response?.status;
  const hasServerResponse = Boolean(error?.response);
  const code = error?.code || '';
  const message = error?.message || '';

  const offline =
    !hasServerResponse ||
    code === 'ECONNABORTED' ||
    code === 'ERR_NETWORK' ||
    /network|timeout|offline|connect/i.test(message);

  if (!offline || status) return;

  snapshot = {
    online: false,
    weak: code === 'ECONNABORTED' || /timeout/i.test(message),
    lastChangedAt: new Date().toISOString(),
    lastError: message || 'Network unavailable',
  };
  notify();
};
