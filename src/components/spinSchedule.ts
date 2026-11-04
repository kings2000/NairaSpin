// Visual timing for a spin. Purely presentational: the outcome is already decided.
import { isRareCoin } from '../config/coins';
import { GRID_COLS, GRID_ROWS, SPIN_TIMING } from '../config/economy';
import type { Grid, SpinOutcome } from '../game/types';

export interface SpinSchedule {
  /** When each column lands, in ms after the spin starts. */
  columnStops: number[];
  /** Columns that hold a Legendary/Mythic coin (they linger for anticipation). */
  rareColumns: boolean[];
  settleMs: number;
}

export function spinSchedule(grid: Grid, reduced: boolean): SpinSchedule {
  const rareColumns = Array.from({ length: GRID_COLS }, (_, c) =>
    Array.from({ length: GRID_ROWS }, (_, r) => grid[r * GRID_COLS + c]).some(isRareCoin),
  );
  let delay = 0;
  const columnStops = rareColumns.map((rare, c) => {
    if (reduced) return SPIN_TIMING.reducedFirstStopMs + c * SPIN_TIMING.reducedStepMs;
    if (rare) delay += SPIN_TIMING.rareDelayMs;
    return SPIN_TIMING.firstStopMs + c * SPIN_TIMING.stepMs + delay;
  });
  return { columnStops, rareColumns, settleMs: columnStops[GRID_COLS - 1] + (reduced ? 60 : SPIN_TIMING.settleExtraMs) };
}

export interface RevealSchedule {
  /** Patterns spotlighted one by one. */
  steps: number;
  patternMs: number;
  /** ms after the reels settle when the TOTAL takeover starts (after a short pause). */
  totalAtMs: number;
  /** Length of the TOTAL takeover (0 when nothing was won). */
  totalMs: number;
  /** ms after the reels settle when the payout is credited. */
  creditAfterMs: number;
}

/**
 * The post-spin show: each pattern in turn, then TOTAL, then credit. It plays under reduced
 * motion too; only the movement (flashing, shaking, speed lines) is toned down by CSS.
 */
export function revealSchedule(outcome: SpinOutcome): RevealSchedule {
  const steps = Math.min(outcome.reward.matches.length, SPIN_TIMING.maxShowcased);
  const won = outcome.reward.total > 0;
  const totalMs = won ? SPIN_TIMING.totalMs : 0;
  // The last pattern (and its value) stays on screen for a beat before TOTAL appears.
  const totalAtMs = steps * SPIN_TIMING.showcaseMs + (won && steps > 0 ? SPIN_TIMING.beforeTotalMs : 0);
  return { steps, patternMs: SPIN_TIMING.showcaseMs, totalAtMs, totalMs, creditAfterMs: totalAtMs + totalMs };
}

export type RevealStage = { stage: 'patterns'; focus: number } | { stage: 'total' } | { stage: 'done' };

/** Which part of the show is playing `elapsed` ms after the reels settled. */
export function revealStageAt(r: RevealSchedule, elapsed: number): RevealStage {
  if (elapsed < r.steps * r.patternMs) return { stage: 'patterns', focus: Math.floor(elapsed / r.patternMs) };
  if (elapsed < r.totalAtMs) return { stage: 'patterns', focus: r.steps - 1 }; // pause on the last one
  if (elapsed < r.creditAfterMs) return { stage: 'total' };
  return { stage: 'done' };
}
