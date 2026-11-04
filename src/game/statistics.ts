import { COIN_IDS } from '../config/coins';
import { HISTORY_LENGTH } from '../config/economy';
import type { CoinId, GameStats, HistoryEntry, SpinOutcome } from './types';

export function emptyCoinCounts(): Record<CoinId, number> {
  return Object.fromEntries(COIN_IDS.map((id) => [id, 0])) as Record<CoinId, number>;
}

/** Folds one resolved spin into the lifetime statistics. */
export function recordSpin(stats: GameStats, outcome: SpinOutcome): GameStats {
  const { reward, grid } = outcome;
  const won = reward.total > 0;
  const streak = reward.matches.length > 0 ? stats.currentStreak + 1 : 0;

  // Each grid cell counts once even if it sits in several overlapping patterns.
  const coinsMatched = { ...stats.coinsMatched };
  const matchedCells = new Set(reward.matches.flatMap((m) => m.match.cells));
  for (const i of matchedCells) coinsMatched[grid[i]] = (coinsMatched[grid[i]] ?? 0) + 1;

  const patternCounts = { ...stats.patternCounts };
  const patternEarnings = { ...stats.patternEarnings };
  for (const m of reward.matches) {
    const id = m.match.patternId;
    patternCounts[id] = (patternCounts[id] ?? 0) + 1;
    patternEarnings[id] = (patternEarnings[id] ?? 0) + m.total;
  }

  return {
    ...stats,
    spins: stats.spins + 1,
    wins: stats.wins + (won ? 1 : 0),
    totalEarned: stats.totalEarned + reward.total,
    bestSpin: Math.max(stats.bestSpin, reward.total),
    patternsCompleted: stats.patternsCompleted + reward.matches.length,
    bestPatternsInSpin: Math.max(stats.bestPatternsInSpin, reward.matches.length),
    currentStreak: streak,
    bestStreak: Math.max(stats.bestStreak, streak),
    cardsActivated: stats.cardsActivated + reward.activated.length,
    jackpots: stats.jackpots + (outcome.winTier === 'jackpot' ? 1 : 0),
    coinsMatched,
    patternCounts,
    patternEarnings,
  };
}

export function historyEntry(outcome: SpinOutcome, spin: number, at: number): HistoryEntry {
  return {
    spin,
    at,
    grid: outcome.grid,
    matches: outcome.reward.matches.map((m) => ({
      patternId: m.match.patternId,
      symbol: m.match.symbol,
      cells: m.match.cells.length,
      total: m.total,
    })),
    specials: outcome.reward.specials.map(({ source, amount }) => ({ source, amount })),
    total: outcome.reward.total,
  };
}

export function pushHistory(history: HistoryEntry[], entry: HistoryEntry): HistoryEntry[] {
  return [entry, ...history].slice(0, HISTORY_LENGTH);
}

function topKey(record: Record<string, number>): [string, number] | null {
  const best = Object.entries(record).sort((a, b) => b[1] - a[1])[0];
  return best && best[1] > 0 ? best : null;
}

/** The coin collection: coins matched at least once. */
export function collectedCoins(s: GameStats): CoinId[] {
  return COIN_IDS.filter((id) => (s.coinsMatched[id] ?? 0) > 0);
}

export const mostMatchedCoin = (s: GameStats) => topKey(s.coinsMatched) as [CoinId, number] | null;
export const mostProfitablePattern = (s: GameStats) => topKey(s.patternEarnings);
