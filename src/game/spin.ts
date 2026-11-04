// Spin controller logic. rollSpin decides the entire outcome up front (grid, patterns,
// payout); the UI only animates towards it. applySpin then credits it exactly once.
import { isRareCoin } from '../config/coins';
import { PROGRESSION } from '../config/economy';
import { tickCharms } from './cards';
import { activeEffects } from './effects';
import { evaluateGrid } from './patterns';
import { getCoinWeights, rollGrid, unlockedPatterns } from './probability';
import { progress, type GameEvent } from './progression';
import { calculateSpinReward, classifyWin } from './rewards';
import { defaultRng } from './rng';
import { historyEntry, pushHistory, recordSpin } from './statistics';
import type { GameState, Rng, SpinOutcome } from './types';

export function rollSpin(state: GameState, rng: Rng = defaultRng): SpinOutcome {
  const effects = activeEffects(state);
  const grid = rollGrid(getCoinWeights(state, effects), rng);
  return resolveGrid(state, grid);
}

/** Evaluates a known grid (used by rollSpin and by tests). */
export function resolveGrid(state: GameState, grid: SpinOutcome['grid']): SpinOutcome {
  const effects = activeEffects(state);
  const matches = evaluateGrid(grid, unlockedPatterns(state.level));
  const streak = matches.length > 0 ? state.stats.currentStreak + 1 : 0;
  const reward = calculateSpinReward(grid, matches, state.level, effects, streak);
  const xpGained =
    PROGRESSION.xpPerSpin + matches.reduce((s, m) => s + PROGRESSION.xpPerPattern + Math.floor(m.cells.length / 3), 0);
  const rareCells = grid.flatMap((c, i) => (isRareCoin(c) ? [i] : []));
  return { grid, reward, winTier: classifyWin(reward), rareCells, xpGained };
}

/** Credits a resolved spin: balance, statistics, history, charm durations, XP and unlocks. */
export function applySpin(state: GameState, outcome: SpinOutcome, now = Date.now()): { state: GameState; events: GameEvent[] } {
  const stats = recordSpin(state.stats, outcome);
  const after: GameState = {
    ...state,
    balance: state.balance + outcome.reward.total,
    stats,
    charms: tickCharms(state.charms),
    history: pushHistory(state.history, historyEntry(outcome, stats.spins, now)),
  };
  return progress(state, after, outcome.xpGained);
}
