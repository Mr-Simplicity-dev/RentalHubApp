import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import api from './api';
import { storageService } from './storageService';

const OFFLINE_QUEUE_KEY = 'rentalhub.offlineActionQueue';
const MAX_QUEUE_SIZE = 50;
const MAX_ACTION_AGE_MS = 24 * 60 * 60 * 1000;
const listeners = new Set();

let queueMutation = Promise.resolve();
let queueSnapshot = {
  pendingCount: 0,
  flushing: false,
  lastFlushedAt: '',
};

const notify = () => {
  listeners.forEach((listener) => {
    try {
      listener(queueSnapshot);
    } catch {
      // One display listener must never interrupt queue persistence.
    }
  });
};

const runQueueMutation = (operation) => {
  const next = queueMutation.then(operation, operation);
  queueMutation = next.catch(() => {});
  return next;
};

const isOfflineError = (error) => {
  const status = error?.response?.status;
  const hasServerResponse = Boolean(error?.response);
  const code = error?.code || '';
  const message = error?.message || '';
  return (
    !status &&
    (!hasServerResponse ||
      code === 'ECONNABORTED' ||
      code === 'ERR_NETWORK' ||
      /network|timeout|offline|connect/i.test(message))
  );
};

const readQueue = async () => {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    const rows = raw ? JSON.parse(raw) : [];
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
};

const getCurrentOwnerKey = async () => {
  const [user, token] = await Promise.all([
    storageService.getUser(),
    storageService.getToken(),
  ]);
  if (!user?.id || !token) return '';

  try {
    const decoded = jwtDecode(token);
    if (String(decoded?.userId || '') !== String(user.id)) {
      return '';
    }

    const role = String(user.user_type || decoded?.userType || 'user').toLowerCase();
    const sessionActor =
      decoded?.impersonation && decoded?.impersonatedBy
        ? `impersonated-by-${decoded.impersonatedBy}`
        : 'direct';
    return `${user.id}:${role}:${sessionActor}`;
  } catch {
    return '';
  }
};

const isCurrentEntry = (entry) => {
  if (!entry?.ownerKey || !entry?.createdAt) return false;
  const createdAt = new Date(entry.createdAt).getTime();
  return Number.isFinite(createdAt) && Date.now() - createdAt <= MAX_ACTION_AGE_MS;
};

const compactQueue = (rows) => rows.filter(isCurrentEntry).slice(-MAX_QUEUE_SIZE);

const persistQueue = async (rows, activeOwnerKey = '') => {
  const nextRows = compactQueue(rows);
  await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(nextRows));
  queueSnapshot = {
    ...queueSnapshot,
    pendingCount: activeOwnerKey
      ? nextRows.filter((entry) => entry.ownerKey === activeOwnerKey).length
      : 0,
  };
  notify();
  return nextRows;
};

export const getOfflineQueueSnapshot = () => queueSnapshot;

export const hydrateOfflineQueue = async () =>
  runQueueMutation(async () => {
    const [rows, ownerKey] = await Promise.all([
      readQueue(),
      getCurrentOwnerKey(),
    ]);
    const nextRows = await persistQueue(rows, ownerKey);
    return ownerKey
      ? nextRows.filter((entry) => entry.ownerKey === ownerKey)
      : [];
  });

export const subscribeOfflineQueue = (listener) => {
  listeners.add(listener);
  listener(queueSnapshot);
  hydrateOfflineQueue().catch(() => {});
  return () => listeners.delete(listener);
};

export const enqueueOfflineAction = async ({ method, path, data, params, label }) =>
  runQueueMutation(async () => {
    const ownerKey = await getCurrentOwnerKey();
    if (!ownerKey) {
      throw new Error('A verified signed-in session is required to save an offline action.');
    }

    const rows = await readQueue();
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      ownerKey,
      method,
      path,
      data: data || null,
      params: params || null,
      label: label || 'Pending action',
      attempts: 0,
      createdAt: new Date().toISOString(),
    };
    await persistQueue([...rows, entry], ownerKey);
    return entry;
  });

export const requestWithOfflineQueue = async ({ method, path, data, params, label }) => {
  try {
    const response = await api.request({ method, url: path, data, params });
    return response.data;
  } catch (error) {
    if (isOfflineError(error)) {
      try {
        const queued = await enqueueOfflineAction({ method, path, data, params, label });
        error.offlineQueued = true;
        error.queuedAction = queued;
      } catch (queueError) {
        error.offlineQueueError = queueError;
      }
    }
    throw error;
  }
};

export const flushOfflineQueue = async () =>
  runQueueMutation(async () => {
    if (queueSnapshot.flushing) {
      return { attempted: 0, completed: 0 };
    }

    const [storedRows, ownerKey] = await Promise.all([
      readQueue(),
      getCurrentOwnerKey(),
    ]);
    const rows = compactQueue(storedRows);

    if (!ownerKey) {
      await persistQueue(rows, '');
      return { attempted: 0, completed: 0 };
    }

    const ownedRows = rows.filter((entry) => entry.ownerKey === ownerKey);
    const otherOwners = rows.filter((entry) => entry.ownerKey !== ownerKey);
    if (!ownedRows.length) {
      await persistQueue(rows, ownerKey);
      return { attempted: 0, completed: 0 };
    }

    queueSnapshot = {
      ...queueSnapshot,
      flushing: true,
      pendingCount: ownedRows.length,
    };
    notify();

    const remaining = [];
    let completed = 0;

    for (let index = 0; index < ownedRows.length; index += 1) {
      const entry = ownedRows[index];
      const currentOwnerKey = await getCurrentOwnerKey();
      if (currentOwnerKey !== ownerKey) {
        remaining.push(...ownedRows.slice(index));
        break;
      }

      try {
        await api.request({
          method: entry.method,
          url: entry.path,
          data: entry.data,
          params: entry.params,
        });
        completed += 1;
      } catch (error) {
        const status = error?.response?.status;
        if (
          isOfflineError(error) ||
          error?.sessionInvalidated ||
          status === 401 ||
          status === 403
        ) {
          remaining.push(...ownedRows.slice(index));
          break;
        }

        const attempts = Number(entry.attempts || 0) + 1;
        if (attempts < 5) {
          remaining.push({ ...entry, attempts });
        }
      }
    }

    await persistQueue([...otherOwners, ...remaining], ownerKey);
    queueSnapshot = {
      ...queueSnapshot,
      pendingCount: remaining.length,
      flushing: false,
      lastFlushedAt: new Date().toISOString(),
    };
    notify();

    if (completed > 0 && await getCurrentOwnerKey() === ownerKey) {
      api.post('/mobile/analytics/events', {
        event_name: 'offline_queue_flushed',
        metadata: {
          completed,
          attempted: ownedRows.length,
          remaining: remaining.length,
        },
      }).catch(() => {});
    }

    return { attempted: ownedRows.length, completed };
  });
