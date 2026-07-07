import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { io } from 'socket.io-client';
import { API_ORIGIN } from '../services/api';
import { AuthContext } from './AuthContext';

export const RealtimeContext = createContext(null);

export const RealtimeProvider = ({ children }) => {
  const { isAuthenticated, user } = useContext(AuthContext);
  const socketRef = useRef(null);
  const listenersRef = useRef(new Map());
  const [connected, setConnected] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState(() => new Set());
  const [activeCall, setActiveCall] = useState(null);

  const emitWithAck = useCallback((eventName, payload = {}) =>
    new Promise((resolve, reject) => {
      const socket = socketRef.current;
      if (!socket?.connected) {
        reject(new Error('Realtime connection is not available'));
        return;
      }

      socket.emit(eventName, payload, (response = {}) => {
        if (response.success === false) {
          reject(new Error(response.message || 'Realtime action failed'));
          return;
        }
        resolve(response);
      });
    }), []);

  useEffect(() => {
    let disposed = false;

    const disconnect = () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
      setOnlineUserIds(new Set());
    };

    const connect = async () => {
      if (!isAuthenticated || !user?.id) {
        disconnect();
        return;
      }

      const token = await AsyncStorage.getItem('token');
      if (!token || disposed) return;

      const socket = io(API_ORIGIN, {
        auth: { token },
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 800,
        reconnectionDelayMax: 5000,
        timeout: 12000,
        transports: ['websocket', 'polling'],
      });
      socketRef.current = socket;
      listenersRef.current.forEach((handlers, eventName) => {
        handlers.forEach((handler) => socket.on(eventName, handler));
      });

      socket.on('connect', () => {
        if (!disposed) setConnected(true);
      });
      socket.on('disconnect', () => {
        if (!disposed) setConnected(false);
      });
      socket.on('connect_error', () => {
        if (!disposed) setConnected(false);
      });
      socket.on('presence:state', ({ users = [] } = {}) => {
        if (disposed) return;
        setOnlineUserIds(new Set(users.map((item) => String(item.id))));
      });
      socket.on('presence:online', ({ user: onlineUser } = {}) => {
        if (!onlineUser?.id || disposed) return;
        setOnlineUserIds((current) => {
          const next = new Set(current);
          next.add(String(onlineUser.id));
          return next;
        });
      });
      socket.on('presence:offline', ({ userId } = {}) => {
        if (!userId || disposed) return;
        setOnlineUserIds((current) => {
          const next = new Set(current);
          next.delete(String(userId));
          return next;
        });
      });
      socket.on('call:incoming', (call = {}) => {
        if (!disposed) setActiveCall({ ...call, direction: 'incoming' });
      });
      socket.on('call:outgoing', (call = {}) => {
        if (!disposed) setActiveCall({ ...call, direction: 'outgoing' });
      });
      socket.on('call:accepted', (call = {}) => {
        if (!disposed) setActiveCall((current) => ({ ...(current || {}), ...call, status: 'accepted' }));
      });
      socket.on('call:rejected', (call = {}) => {
        if (!disposed) setActiveCall((current) => ({ ...(current || {}), ...call, status: 'rejected' }));
        setTimeout(() => {
          if (!disposed) setActiveCall(null);
        }, 1800);
      });
      socket.on('call:missed', (call = {}) => {
        if (!disposed) setActiveCall((current) => ({ ...(current || {}), ...call, status: 'missed' }));
        setTimeout(() => {
          if (!disposed) setActiveCall(null);
        }, 1800);
      });
      socket.on('call:ended', (call = {}) => {
        if (!disposed) setActiveCall((current) => ({ ...(current || {}), ...call, status: 'ended' }));
        setTimeout(() => {
          if (!disposed) setActiveCall(null);
        }, 1200);
      });
    };

    void connect();
    return () => {
      disposed = true;
      disconnect();
    };
  }, [isAuthenticated, user?.id]);

  const subscribe = useCallback((eventName, handler) => {
    if (!eventName || typeof handler !== 'function') return () => {};
    const handlers = listenersRef.current.get(eventName) || new Set();
    handlers.add(handler);
    listenersRef.current.set(eventName, handlers);
    socketRef.current?.on(eventName, handler);

    return () => {
      socketRef.current?.off(eventName, handler);
      const currentHandlers = listenersRef.current.get(eventName);
      currentHandlers?.delete(handler);
      if (!currentHandlers?.size) listenersRef.current.delete(eventName);
    };
  }, []);

  const emitTyping = useCallback((receiverId, isTyping) => {
    socketRef.current?.emit('message:typing', {
      receiverId: Number(receiverId),
      isTyping: Boolean(isTyping),
    });
  }, []);

  const emitCallSignal = useCallback((eventName, payload = {}) =>
    emitWithAck(eventName, payload), [emitWithAck]);

  const checkPresence = useCallback((userIds = []) => {
    const socket = socketRef.current;
    if (!socket?.connected || !userIds.length) return;
    socket.emit('presence:check', { userIds }, (response = {}) => {
      if (!response.success || !response.statuses) return;
      setOnlineUserIds((current) => {
        const next = new Set(current);
        Object.entries(response.statuses).forEach(([userId, isOnline]) => {
          if (isOnline) next.add(String(userId));
          else next.delete(String(userId));
        });
        return next;
      });
    });
  }, []);

  const inviteCall = useCallback(async ({
    receiverId,
    callType = 'audio',
    propertyId,
    propertyTitle,
  }) => {
    const response = await emitWithAck('call:invite', {
      receiverId,
      callType,
      propertyId,
      propertyTitle,
    });
    if (response?.call) {
      setActiveCall({
        ...response.call,
        callType,
        propertyId,
        propertyTitle,
        direction: 'outgoing',
      });
    }
    return response;
  }, [emitWithAck]);

  const acceptCall = useCallback(async (callId) => {
    const response = await emitWithAck('call:accept', { callId });
    setActiveCall((current) => ({ ...(current || {}), callId, status: 'accepted' }));
    return response;
  }, [emitWithAck]);

  const rejectCall = useCallback(async (callId) => {
    const response = await emitWithAck('call:reject', { callId });
    setActiveCall(null);
    return response;
  }, [emitWithAck]);

  const endCall = useCallback(async (callId) => {
    const response = await emitWithAck('call:end', { callId });
    setActiveCall(null);
    return response;
  }, [emitWithAck]);

  const clearCall = useCallback(() => {
    setActiveCall(null);
  }, []);

  const value = useMemo(
    () => ({
      checkPresence,
      acceptCall,
      activeCall,
      clearCall,
      connected,
      endCall,
      emitCallSignal,
      emitTyping,
      inviteCall,
      isUserOnline: (userId) => onlineUserIds.has(String(userId)),
      rejectCall,
      subscribe,
    }),
    [
      acceptCall,
      activeCall,
      checkPresence,
      clearCall,
      connected,
      endCall,
      emitCallSignal,
      emitTyping,
      inviteCall,
      onlineUserIds,
      rejectCall,
      subscribe,
    ]
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
};

export const useRealtime = () => {
  const value = useContext(RealtimeContext);
  if (!value) {
    throw new Error('useRealtime must be used inside RealtimeProvider');
  }
  return value;
};
