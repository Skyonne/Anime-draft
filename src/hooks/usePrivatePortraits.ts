import { useEffect, useSyncExternalStore } from 'react';
import { getPrivatePortraits, getPrivateServerState, loadPrivatePortraits, subscribePrivatePortraits } from '../portraits/private';

export function usePrivatePortraits() {
  const state = useSyncExternalStore(subscribePrivatePortraits, getPrivatePortraits, getPrivateServerState);
  useEffect(() => { void loadPrivatePortraits(); }, []);
  return state;
}
