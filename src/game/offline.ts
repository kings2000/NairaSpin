import { OFFLINE } from '../config/economy';
import { activeEffects, offlineModifiers } from './effects';
import type { GameState } from './types';

export interface OfflineReward {
  minutes: number;
  coins: number;
  capped: boolean;
  capMinutes: number;
}

export function offlineRatePerMinute(state: GameState): number {
  return OFFLINE.coinsPerMinute(state.level) * (1 + offlineModifiers(activeEffects(state)).ratePct);
}

export function offlineCapMinutes(state: GameState): number {
  return (OFFLINE.baseCapHours + offlineModifiers(activeEffects(state)).capHours) * 60;
}

/** Returns null when the player has not been away long enough (or the clock went backwards). */
export function computeOfflineReward(state: GameState, now: number): OfflineReward | null {
  const elapsedMinutes = Math.floor((now - state.lastSeenAt) / 60_000);
  if (!Number.isFinite(elapsedMinutes) || elapsedMinutes < OFFLINE.minAwayMinutes) return null;
  const capMinutes = offlineCapMinutes(state);
  const minutes = Math.min(elapsedMinutes, capMinutes);
  const coins = Math.floor(minutes * offlineRatePerMinute(state));
  return coins > 0 ? { minutes, coins, capped: elapsedMinutes > capMinutes, capMinutes } : null;
}
