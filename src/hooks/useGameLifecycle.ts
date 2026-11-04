import { useEffect } from 'react';
import { saveNow, useGameStore } from '../store/gameStore';

const HEARTBEAT_MS = 30_000;

/** Wires browser lifecycle (visibility, unload, motion prefs) into the store. */
export function useGameLifecycle() {
  const motion = useGameStore((s) => s.game.settings.motion);
  const setReducedMotion = useGameStore((s) => s.setReducedMotion);

  // Resolve reduced motion from the setting + OS preference.
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const apply = () => setReducedMotion(motion === 'reduced' || (motion === 'system' && !!mq?.matches));
    apply();
    mq?.addEventListener?.('change', apply);
    return () => mq?.removeEventListener?.('change', apply);
  }, [motion, setReducedMotion]);

  // Offline rewards on start and whenever the tab becomes visible again.
  useEffect(() => {
    const { checkOffline, markSeen } = useGameStore.getState();
    checkOffline();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') useGameStore.getState().checkOffline();
      else {
        // Credit any spin whose show is still playing before the page may be frozen.
        useGameStore.getState().skipReveal();
        markSeen();
        saveNow();
      }
    };
    const onUnload = () => {
      useGameStore.getState().skipReveal();
      useGameStore.getState().markSeen();
      saveNow();
    };
    const beat = window.setInterval(() => {
      if (document.visibilityState === 'visible') useGameStore.getState().markSeen();
    }, HEARTBEAT_MS);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onUnload);
    return () => {
      window.clearInterval(beat);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onUnload);
    };
  }, []);
}
