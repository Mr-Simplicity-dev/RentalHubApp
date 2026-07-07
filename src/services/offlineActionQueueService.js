import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

const OFFLINE_QUEUE_KEY = 'rentalhub.offlineActionQueue';
const MAX_QUEUE_SIZE = 50;
const listeners = new Set();

let queueSnapshot = {
  pendingCount: 0,
  flushing: false,
  lastFlushedAt: '',
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

const writeQueue = async (rows) => {
  const nextRows = rows.slice(-MAX_QUEUE_SIZE);
  await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(nextRows));
  queueSnapshot = {
    ...queueSnapshot,
    pendingCount: nextRows.length,
  };
  listeners.forEach((listener) => listener(queueSnapshot));
  return nextRows;
};

export const getOfflineQueueSnapshot = () => queueSnapshot;

export const hydrateOfflineQueue = async () => {
  const rows = await readQueue();
  queueSnapshot = {
    ...queueSnapshot,
    pendingCount: rows.length,
  };
  listeners.forEach((listener) => listener(queueSnapshot));
  return rows;
};

export const subscribeOfflineQueue = (listener) => {
  listeners.add(listener);
  listener(queueSnapshot);
  hydrateOfflineQueue().catch(() => {});
  return () => listeners.delete(listener);
};

export const enqueueOfflineAction = async ({ method, path, data, params, label }) => {
  const rows = await readQueue();
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    method,
    path,
    data: data || null,
    params: params || null,
    label: label || 'Pending action',
    attempts: 0,
    createdAt: new Date().toISOString(),
  };
  await writeQueue([...rows, entry]);
  return entry;
};

export const requestWithOfflineQueue = async ({ method, path, data, params, label }) => {
  try {
    const response = await api.request({ method, url: path, data, params });
    return response.data;
  } catch (error) {
    if (isOfflineError(error)) {
      const queued = await enqueueOfflineAction({ method, path, data, params, label });
      error.offlineQueued = true;
      error.queuedAction = queued;
    }
    throw error;
  }
};

export const flushOfflineQueue = async () => {
  const rows = await readQueue();
  if (!rows.length || queueSnapshot.flushing) return { attempted: 0, completed: 0 };

  queueSnapshot = { ...queueSnapshot, flushing: true };
  listeners.forEach((listener) => listener(queueSnapshot));

  const remaining = [];
  let completed = 0;

  for (const entry of rows) {
    try {
      await api.request({
        method: entry.method,
        url: entry.path,
        data: entry.data,
        params: entry.params,
      });
      completed += 1;
    } catch (error) {
      if (isOfflineError(error)) {
        remaining.push(entry, ...rows.slice(rows.indexOf(entry) + 1));
        break;
      }
      const attempts = Number(entry.attempts || 0) + 1;
      if (attempts < 5) {
        remaining.push({ ...entry, attempts });
      }
    }
  }

  await writeQueue(remaining);
  queueSnapshot = {
    pendingCount: remaining.length,
    flushing: false,
    lastFlushedAt: new Date().toISOString(),
  };
  listeners.forEach((listener) => listener(queueSnapshot));
  return { attempted: rows.length, completed };
};
