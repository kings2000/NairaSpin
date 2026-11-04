// Reward calculator. Every winning pattern is priced independently:
//   pattern base  = coin value × matched cells × pattern multiplier
//   pattern total = round(base × (1 + Σ card/charm match bonuses))
// then the spin:
//   spin total    = round(Σ pattern totals × (1 + Σ spin bonuses)) + special coin rewards
import { COIN_BY_ID, COINS, type CoinDefinition, type SpecialEffect } from '../config/coins';
import { WIN_TIERS } from '../config/economy';
import { PATTERN_BY_ID, type PatternDefinition } from '../config/patterns';
import {
  coinValueBonus,
  matchBonuses,
  patternMultBonus,
  specialBonus,
  spinBonuses,
  type ActiveEffect,
} from './effects';
import type { CoinId, Grid, MatchReward, PatternMatch, SpinReward, WinTier } from './types';

const sumPct = (bonuses: { pct: number }[]) => bonuses.reduce((s, b) => s + b.pct, 0);

export function coinValue(effects: ActiveEffect[], coin: CoinId): number {
  return COIN_BY_ID[coin].baseValue * (1 + coinValueBonus(effects, coin));
}

export function patternMultiplier(effects: ActiveEffect[], p: PatternDefinition): number {
  return p.multiplier * (1 + patternMultBonus(effects, p));
}

export function priceMatch(match: PatternMatch, effects: ActiveEffect[]): MatchReward {
  const pattern = PATTERN_BY_ID[match.patternId];
  const value = coinValue(effects, match.symbol);
  const mult = patternMultiplier(effects, pattern);
  const base = value * match.cells.length * mult;
  const bonuses = matchBonuses(effects, match, pattern);
  return { match, coinValue: value, patternMultiplier: mult, base, bonuses, total: Math.round(base * (1 + sumPct(bonuses))) };
}

// Special coin effects are data on the coin; one handler per effect type.
type SpecialHandler<E extends SpecialEffect> = (e: E, coin: CoinDefinition, count: number, level: number) => number;
const SPECIAL_HANDLERS: { [T in SpecialEffect['type']]: SpecialHandler<Extract<SpecialEffect, { type: T }>> } = {
  landBonus: (e, _c, count, level) => count * (e.base + e.perLevel * level),
  scatterJackpot: (e, _c, count, level) => (count >= e.minCount ? e.base + e.perLevel * level : 0),
};

export function specialRewards(grid: Grid, level: number, effects: ActiveEffect[]): SpinReward['specials'] {
  const out: SpinReward['specials'] = [];
  for (const coin of COINS) {
    if (!coin.special) continue;
    const count = grid.filter((s) => s === coin.id).length;
    if (count === 0) continue;
    const handler = SPECIAL_HANDLERS[coin.special.type] as SpecialHandler<SpecialEffect>;
    const raw = handler(coin.special, coin, count, level);
    if (raw <= 0) continue;
    const jackpot = coin.special.type === 'scatterJackpot';
    out.push({
      source: jackpot ? `${coin.name} Jackpot` : `${coin.name} ×${count}`,
      amount: Math.round(raw * (1 + specialBonus(effects, coin.id))),
      jackpot,
    });
  }
  return out;
}

export function calculateSpinReward(
  grid: Grid,
  matches: PatternMatch[],
  level: number,
  effects: ActiveEffect[],
  streak: number,
): SpinReward {
  const priced = matches.map((m) => priceMatch(m, effects));
  const subtotal = priced.reduce((s, r) => s + r.total, 0);
  const spin = spinBonuses(effects, { matches, streak });
  const specials = specialRewards(grid, level, effects);
  const total = Math.round(subtotal * (1 + sumPct(spin))) + specials.reduce((s, x) => s + x.amount, 0);

  // Cards and charms that actually changed this spin's payout (upgrades are always-on).
  const loadout = new Set(effects.filter((e) => e.kind !== 'upgrade').map((e) => e.source));
  const contributed = [...priced.flatMap((r) => r.bonuses), ...spin].map((b) => b.source);
  const activated = [...new Set(contributed.filter((s) => loadout.has(s)))];

  return { matches: priced, subtotal, spinBonuses: spin, specials, total, activated };
}

/** Chooses how loud the celebration is. Presentation only: never affects the payout. */
export function classifyWin(reward: SpinReward): WinTier {
  const n = reward.matches.length;
  const maxCells = Math.max(0, ...reward.matches.map((m) => m.match.cells.length));
  if (reward.specials.some((s) => s.jackpot) || maxCells >= WIN_TIERS.jackpotMinCells) return 'jackpot';
  if (n >= WIN_TIERS.largeMinPatterns || maxCells >= WIN_TIERS.largeMinCells) return 'large';
  if (n >= WIN_TIERS.mediumMinPatterns || maxCells >= WIN_TIERS.mediumMinCells) return 'medium';
  return reward.total > 0 ? 'small' : 'none';
}
