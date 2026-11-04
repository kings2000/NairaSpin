import type { Rng } from './types';

export const defaultRng: Rng = () => Math.random();

/**
 * Picks a key from a weight map. Each key is chosen with probability weight / totalWeight.
 * Zero/negative/non-finite weights are ignored. Throws if no positive weight exists.
 */
export function weightedPick<K extends string>(weights: Partial<Record<K, number>>, rng: Rng = defaultRng): K {
  const entries = (Object.entries(weights) as [K, number][]).filter(([, w]) => Number.isFinite(w) && w > 0);
  if (entries.length === 0) throw new Error('weightedPick: no positive weights');
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = rng() * total;
  for (const [key, w] of entries) {
    if (roll < w) return key;
    roll -= w;
  }
  // Floating point guard: rng() close to 1 can fall through by an epsilon.
  return entries[entries.length - 1][0];
}
