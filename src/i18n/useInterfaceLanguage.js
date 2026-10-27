import { useSyncExternalStore } from 'react';
import { subscribeInterfaceLanguage, getInterfaceLanguage } from './interfaceRuntime.cjs';
export default function useInterfaceLanguage() {
  return useSyncExternalStore(subscribeInterfaceLanguage, getInterfaceLanguage, getInterfaceLanguage);
}
