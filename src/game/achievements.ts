import { COIN_IDS } from '../config/coins';
import { tierMatches } from './cards';
import { collectedCoins } from './statistics';
import type { GameState } from './types';

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  reward: number;
  /** Returns [current, target] progress. Complete when current >= target. */
  progress: (s: GameState) => [number, number];
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  { id: 'firstPattern', name: 'First Pattern', description: 'Complete any pattern', reward: 180, progress: (s) => [s.stats.patternsCompleted, 1] },
  { id: 'spins50', name: 'Warming Up', description: 'Spin 50 times', reward: 600, progress: (s) => [s.stats.spins, 50] },
  { id: 'spins250', name: 'Machine Regular', description: 'Spin 250 times', reward: 2_400, progress: (s) => [s.stats.spins, 250] },
  { id: 'spins1000', name: 'Spin Master', description: 'Spin 1,000 times', reward: 12_000, progress: (s) => [s.stats.spins, 1000] },
  { id: 'patterns100', name: 'Pattern Hunter', description: 'Complete 100 patterns', reward: 1_500, progress: (s) => [s.stats.patternsCompleted, 100] },
  { id: 'multi4', name: 'Combo Builder', description: 'Win 4 patterns in one spin', reward: 1_200, progress: (s) => [s.stats.bestPatternsInSpin, 4] },
  { id: 'multi7', name: 'Combo King', description: 'Win 7 patterns in one spin', reward: 7_500, progress: (s) => [s.stats.bestPatternsInSpin, 7] },
  { id: 'silver25', name: 'Sterling', description: 'Match 25 Silver coins', reward: 1_800, progress: (s) => [tierMatches(s, 'silver'), 25] },
  { id: 'gold25', name: 'Gold Standard', description: 'Match 25 Gold coins', reward: 7_500, progress: (s) => [tierMatches(s, 'gold'), 25] },
  { id: 'emerald1', name: 'Green Gleam', description: 'Match an Emerald coin', reward: 9_000, progress: (s) => [tierMatches(s, 'emerald'), 1] },
  { id: 'jackpot', name: 'Jackpot!', description: 'Hit a jackpot-level win', reward: 15_000, progress: (s) => [s.stats.jackpots, 1] },
  { id: 'invest10', name: 'Investor', description: 'Buy 10 upgrades', reward: 1_200, progress: (s) => [s.stats.upgradesBought, 10] },
  { id: 'invest50', name: 'Tycoon', description: 'Buy 50 upgrades', reward: 9_000, progress: (s) => [s.stats.upgradesBought, 50] },
  { id: 'earned100k', name: 'Treasure Chest', description: 'Earn 100,000 in total', reward: 4_500, progress: (s) => [s.stats.totalEarned, 100_000] },
  { id: 'level10', name: 'Big Boss', description: 'Reach level 10', reward: 7_500, progress: (s) => [s.level, 10] },
  {
    id: 'allCoins',
    name: 'Full Collection',
    description: 'Match every coin at least once',
    reward: 30_000,
    progress: (s) => [collectedCoins(s.stats).length, COIN_IDS.length],
  },
];

export function isComplete(a: AchievementDefinition, s: GameState): boolean {
  const [cur, target] = a.progress(s);
  return cur >= target;
}

export function claimableAchievements(s: GameState): AchievementDefinition[] {
  return ACHIEVEMENTS.filter((a) => isComplete(a, s) && !s.claimedAchievements.includes(a.id));
}

export function claimAchievement(s: GameState, id: string): GameState {
  const a = ACHIEVEMENTS.find((x) => x.id === id);
  if (!a || !isComplete(a, s) || s.claimedAchievements.includes(id)) return s;
  return {
    ...s,
    balance: s.balance + a.reward,
    claimedAchievements: [...s.claimedAchievements, id],
    stats: { ...s.stats, totalEarned: s.stats.totalEarned + a.reward },
  };
}
