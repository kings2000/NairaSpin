// Coin probability system
// -----------------------
// Each unlocked coin has a weight = base weight × product of (1 + amount) over every active
// weight effect (Chance upgrades, Lucky Machine, Money Magnet, charms...). The product is
// clamped to at least MIN_WEIGHT_FACTOR, so no weight can reach zero or go negative.
//   p(coin) = weight(coin) / Σ weights      → probabilities always sum to exactly 100%.
// Each of the 15 cells is drawn independently from this distribution.
import { COIN_BY_ID, COIN_IDS } from '../config/coins';
import { PATTERNS, type PatternDefinition } from '../config/patterns';
import { activeEffects, weightFactor, type ActiveEffect } from './effects';
import { GRID_SIZE } from './patterns';
import { weightedPick } from './rng';
import type { CoinId, GameState, Grid, Rng } from './types';

export type Weights = Partial<Record<CoinId, number>>;

export function getCoinWeights(state: GameState, effects: ActiveEffect[] = activeEffects(state)): Weights {
  const weights: Weights = {};
  for (const id of COIN_IDS) {
    if (state.coinUnlocks[id]) weights[id] = COIN_BY_ID[id].weight * weightFactor(effects, id);
  }
  return weights;
}

/** Converts weights into probabilities that sum to 1, ignoring invalid weights. */
export function normalize<K extends string>(weights: Partial<Record<K, number>>): Partial<Record<K, number>> {
  const entries = (Object.entries(weights) as [K, number][]).filter(([, w]) => Number.isFinite(w) && w > 0);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  const out: Partial<Record<K, number>> = {};
  if (total <= 0) return out;
  for (const [k, w] of entries) out[k] = w / total;
  return out;
}

export function getCoinProbabilities(state: GameState): Weights {
  return normalize(getCoinWeights(state));
}

/** Probabilities if `upgradeId` were one level higher, for upgrade previews. */
export function probabilitiesAfterUpgrade(state: GameState, upgradeId: string): Weights {
  const next = { ...state, upgrades: { ...state.upgrades, [upgradeId]: (state.upgrades[upgradeId] ?? 0) + 1 } };
  return getCoinProbabilities(next);
}

export function rollGrid(weights: Weights, rng: Rng): Grid {
  return Array.from({ length: GRID_SIZE }, () => weightedPick(weights, rng));
}

export function unlockedPatterns(level: number): PatternDefinition[] {
  return PATTERNS.filter((p) => p.unlockLevel <= level);
}
