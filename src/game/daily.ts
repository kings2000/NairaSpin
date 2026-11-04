import { DAILY } from '../config/economy';
import type { GameState } from './types';

export function localDateKey(time: number): string {
  const d = new Date(time);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function canClaimDaily(state: GameState, now: number): boolean {
  return state.daily.lastClaimDate !== localDateKey(now);
}

export function dailyReward(state: GameState): { coins: number; xp: number } {
  return { coins: DAILY.reward(state.level, state.daily.daysClaimed), xp: DAILY.xp };
}

/** Marks today as claimed and credits the reward. XP is applied by the caller via progression. */
export function claimDaily(state: GameState, now: number): GameState {
  if (!canClaimDaily(state, now)) return state;
  const { coins } = dailyReward(state);
  return {
    ...state,
    balance: state.balance + coins,
    daily: { lastClaimDate: localDateKey(now), daysClaimed: state.daily.daysClaimed + 1 },
    stats: { ...state.stats, totalEarned: state.stats.totalEarned + coins },
  };
}
