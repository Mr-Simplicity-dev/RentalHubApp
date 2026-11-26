import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { createCallSoundSession, ringingExpiry } from '../utils/callSoundSession.cjs';
import { loadCallSounds, playCallSound } from '../services/callSoundService';
export default function useCallSounds(call) {
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const session = useRef(null);
  if (!session.current) session.current = createCallSoundSession({ loadSettings: loadCallSounds, play: playCallSound });
  useEffect(() => {
    const listener = AppState.addEventListener('change', state => setForeground(state === 'active'));
    return () => { listener.remove(); session.current.stop(); };
  }, []);
  useEffect(() => {
    if (foreground && call?.status === 'ringing') {
      const expires = ringingExpiry(call);
      void session.current.start(call.callId + ':' + call.direction, call.direction, expires);
    } else session.current.stop();
    return () => session.current.stop();
  }, [foreground, call?.callId, call?.status, call?.direction]);
}
