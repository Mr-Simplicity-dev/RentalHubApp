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
import { storageService } from '../services/storageService';
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
          const error = new Error(response.message || 'Realtime action failed');
          error.code = response.code;
          reject(error);
          return;
        }
        resolve(response);
      });
    }), []);

  useEffect(() => {
    let disposed = false;
    const pendingCallTimers = new Set();

    const disconnect = () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
      setOnlineUserIds(new Set());
    };

    // Rejected/missed/ended events fade the call overlay out after a short
    // delay. Those timers must be tracked so a logout or provider unmount
    // cannot leave a stale full-screen call Modal mounted over the app.
    const scheduleCallClear = (delayMs) => {
      const timer = setTimeout(() => {
        pendingCallTimers.delete(timer);
        if (!disposed) setActiveCall(null);
      }, delayMs);
      pendingCallTimers.add(timer);
    };

    const connect = async () => {
      if (!isAuthenticated || !user?.id) {
        disconnect();
        pendingCallTimers.forEach((timer) => clearTimeout(timer));
        pendingCallTimers.clear();
        setActiveCall(null);
        return;
      }

      const token = await storageService.getToken();
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
        scheduleCallClear(1800);
      });
      socket.on('call:missed', (call = {}) => {
        if (!disposed) setActiveCall((current) => ({ ...(current || {}), ...call, status: 'missed' }));
        scheduleCallClear(1800);
      });
      socket.on('call:ended', (call = {}) => {
        if (!disposed) setActiveCall((current) => ({ ...(current || {}), ...call, status: 'ended' }));
        scheduleCallClear(1200);
      });
      socket.on('call:room:updated', (room = {}) => {
        if (!disposed) {
          setActiveCall((current) => ({
            ...(current || {}),
            ...room,
            callId: room.callId || current?.callId,
            status: room.status || current?.status || 'accepted',
            participants: room.participants || current?.participants || [],
            callType: room.callType || current?.callType,
            propertyId: room.propertyId ?? current?.propertyId,
            propertyTitle: room.propertyTitle ?? current?.propertyTitle,
            hostUserId: room.hostUserId ?? current?.hostUserId ?? current?.caller?.id ?? current?.receiver?.id,
          }));
        }
      });
    };

    void connect();
    return () => {
      disposed = true;
      pendingCallTimers.forEach((timer) => clearTimeout(timer));
      pendingCallTimers.clear();
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

  const inviteSupportCall = useCallback(async () => {
    const response = await emitWithAck('call:support', {});
    if (response?.call) {
      setActiveCall({
        ...response.call,
        callType: 'audio',
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

  const joinCallRoom = useCallback(async ({ callId, role = 'participant' } = {}) => {
    const response = await emitWithAck('call:room:join', { callId, role });
    if (response?.participants) {
      setActiveCall((current) => ({
        ...(current || {}),
        callId,
        participants: response.participants,
      }));
    }
    return response;
  }, [emitWithAck]);

  const addCallParticipant = useCallback(async ({ callId, userId, role = 'participant' } = {}) => {
    const response = await emitWithAck('call:room:add-participant', { callId, userId, role });
    if (response?.participants) {
      setActiveCall((current) => ({
        ...(current || {}),
        callId,
        participants: response.participants,
      }));
    }
    return response;
  }, [emitWithAck]);

  const removeCallParticipant = useCallback(async ({ callId, userId } = {}) => {
    const response = await emitWithAck('call:room:remove-participant', { callId, userId });
    if (response?.participants) {
      setActiveCall((current) => ({
        ...(current || {}),
        callId,
        participants: response.participants,
      }));
    }
    return response;
  }, [emitWithAck]);

  const transferCallHost = useCallback(async ({ callId, userId } = {}) => {
    const response = await emitWithAck('call:room:transfer-host', { callId, userId });
    if (response?.participants) {
      setActiveCall((current) => ({
        ...(current || {}),
        callId,
        participants: response.participants,
        hostUserId: response.hostUserId ?? userId,
      }));
    }
    return response;
  }, [emitWithAck]);

  const leaveCallRoom = useCallback(async ({ callId } = {}) => {
    const response = await emitWithAck('call:room:leave', { callId });
    if (response?.participants) {
      setActiveCall((current) => ({
        ...(current || {}),
        callId,
        participants: response.participants,
      }));
    }
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
      addCallParticipant,
      clearCall,
      connected,
      endCall,
      emitCallSignal,
      emitTyping,
      inviteCall,
      inviteSupportCall,
      isUserOnline: (userId) => onlineUserIds.has(String(userId)),
      joinCallRoom,
      leaveCallRoom,
      rejectCall,
      removeCallParticipant,
      subscribe,
      transferCallHost,
    }),
    [
      acceptCall,
      activeCall,
      addCallParticipant,
      checkPresence,
      clearCall,
      connected,
      endCall,
      emitCallSignal,
      emitTyping,
      inviteCall,
      inviteSupportCall,
      joinCallRoom,
      leaveCallRoom,
      onlineUserIds,
      rejectCall,
      removeCallParticipant,
      subscribe,
      transferCallHost,
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
