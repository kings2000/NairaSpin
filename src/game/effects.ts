// Effect system. Cards, charms and upgrades all declare `Effect` data; this module turns the
// player's current loadout into a list of active effects, and one small handler per effect
// type decides how that effect modifies weights, values, multipliers or rewards.
import { CARD_BY_ID, CHARM_BY_ID } from '../config/cards';
import { COIN_BY_ID } from '../config/coins';
import type { PatternDefinition } from '../config/patterns';
import { UPGRADE_BY_ID } from '../config/upgrades';
import type { Bonus, CharmId, CoinId, CoinTarget, Effect, EffectType, GameState, PatternMatch, Scale } from './types';

export interface ActiveEffect {
  source: string;
  sourceId: string;
  kind: 'card' | 'charm' | 'upgrade';
  effect: Effect;
  level: number;
  selectedCoin?: CoinId;
}

/** Lowest weight factor any combination of negative effects can push a coin to. */
export const MIN_WEIGHT_FACTOR = 0.1;

export const amountAt = (s: Scale, level: number) => (level <= 0 ? 0 : s.base + s.perLevel * (level - 1));

export function activeEffects(state: GameState): ActiveEffect[] {
  const out: ActiveEffect[] = [];
  for (const [id, level] of Object.entries(state.upgrades)) {
    const def = UPGRADE_BY_ID[id];
    if (!def || level <= 0) continue;
    for (const effect of def.effects) out.push({ source: def.name, sourceId: id, kind: 'upgrade', effect, level });
  }
  for (const id of state.equippedCards) {
    const card = state.cards[id];
    const def = CARD_BY_ID[id];
    if (!def || !card?.unlocked) continue;
    for (const effect of def.effects)
      out.push({ source: def.name, sourceId: id, kind: 'card', effect, level: card.level, selectedCoin: card.targetCoin });
  }
  for (const [id, remaining] of Object.entries(state.charms) as [CharmId, number][]) {
    const def = CHARM_BY_ID[id];
    if (!def || remaining <= 0) continue;
    for (const effect of def.effects) out.push({ source: def.name, sourceId: id, kind: 'charm', effect, level: 1 });
  }
  return out;
}

export function targetIncludes(target: CoinTarget | undefined, coin: CoinId, selected?: CoinId): boolean {
  if (!target) return true;
  if (target.selected) return coin === selected;
  if (!target.coins && !target.tiers) return true;
  return !!target.coins?.includes(coin) || !!target.tiers?.includes(COIN_BY_ID[coin].tier);
}

// ---- Handlers --------------------------------------------------------------------------

export interface SpinContext {
  matches: PatternMatch[];
  /** Win streak including the current spin. */
  streak: number;
}

type Hooks<E> = {
  weight?: (e: E, a: ActiveEffect, coin: CoinId) => number;
  coinValue?: (e: E, a: ActiveEffect, coin: CoinId) => number;
  patternMult?: (e: E, a: ActiveEffect, p: PatternDefinition) => number;
  matchBonus?: (e: E, a: ActiveEffect, m: PatternMatch, p: PatternDefinition) => number;
  spinBonus?: (e: E, a: ActiveEffect, ctx: SpinContext) => number;
  special?: (e: E, a: ActiveEffect, coin: CoinId) => number;
  offlineRate?: (e: E, a: ActiveEffect) => number;
  offlineCap?: (e: E, a: ActiveEffect) => number;
};

const amt = (e: { amount: Scale }, a: ActiveEffect) => amountAt(e.amount, a.level);

export const EFFECT_HANDLERS: { [T in EffectType]: Hooks<Extract<Effect, { type: T }>> } = {
  weight: { weight: (e, a, coin) => (targetIncludes(e.target, coin, a.selectedCoin) ? amt(e, a) : 0) },
  coinValue: { coinValue: (e, a, coin) => (targetIncludes(e.target, coin, a.selectedCoin) ? amt(e, a) : 0) },
  patternMult: { patternMult: (e, a, p) => (e.families.includes(p.family) ? amt(e, a) : 0) },
  matchBonus: {
    matchBonus: (e, a, m, p) => {
      if (e.target && !targetIncludes(e.target, m.symbol, a.selectedCoin)) return 0;
      if (e.families && !e.families.includes(p.family)) return 0;
      if (e.minCells && m.cells.length < e.minCells) return 0;
      if (e.withWild && m.wildCount === 0) return 0;
      return amt(e, a);
    },
  },
  multiPattern: { spinBonus: (e, a, ctx) => amt(e, a) * Math.max(0, ctx.matches.length - 1) },
  streak: { spinBonus: (e, a, ctx) => (ctx.matches.length > 0 && ctx.streak >= e.minStreak ? amt(e, a) : 0) },
  global: { spinBonus: (e, a, ctx) => (ctx.matches.length > 0 ? amt(e, a) : 0) },
  specialBonus: { special: (e, a, coin) => (e.coins.includes(coin) ? amt(e, a) : 0) },
  offlineRate: { offlineRate: (e, a) => amt(e, a) },
  offlineCap: { offlineCap: (e, a) => amt(e, a) },
};

// Each hook is looked up by effect type, so adding a new effect type is one entry above.
function hook<K extends keyof Hooks<Effect>>(a: ActiveEffect, name: K) {
  return (EFFECT_HANDLERS[a.effect.type] as Hooks<Effect>)[name] as Hooks<Effect>[K];
}

// ---- Aggregators -----------------------------------------------------------------------

export function weightFactor(effects: ActiveEffect[], coin: CoinId): number {
  let f = 1;
  for (const a of effects) {
    const h = hook(a, 'weight');
    if (h) f *= 1 + h(a.effect, a, coin);
  }
  return Math.max(MIN_WEIGHT_FACTOR, f);
}

export function coinValueBonus(effects: ActiveEffect[], coin: CoinId): number {
  return effects.reduce((sum, a) => sum + (hook(a, 'coinValue')?.(a.effect, a, coin) ?? 0), 0);
}

export function patternMultBonus(effects: ActiveEffect[], p: PatternDefinition): number {
  return effects.reduce((sum, a) => sum + (hook(a, 'patternMult')?.(a.effect, a, p) ?? 0), 0);
}

/** Groups non-zero contributions by source so the breakdown shows one line per card/charm. */
function collect(effects: ActiveEffect[], value: (a: ActiveEffect) => number): Bonus[] {
  const bySource = new Map<string, number>();
  for (const a of effects) {
    const v = value(a);
    if (v) bySource.set(a.source, (bySource.get(a.source) ?? 0) + v);
  }
  return [...bySource].map(([source, pct]) => ({ source, pct }));
}

export function matchBonuses(effects: ActiveEffect[], m: PatternMatch, p: PatternDefinition): Bonus[] {
  return collect(effects, (a) => hook(a, 'matchBonus')?.(a.effect, a, m, p) ?? 0);
}

export function spinBonuses(effects: ActiveEffect[], ctx: SpinContext): Bonus[] {
  return collect(effects, (a) => hook(a, 'spinBonus')?.(a.effect, a, ctx) ?? 0);
}

export function specialBonus(effects: ActiveEffect[], coin: CoinId): number {
  return effects.reduce((sum, a) => sum + (hook(a, 'special')?.(a.effect, a, coin) ?? 0), 0);
}

export function offlineModifiers(effects: ActiveEffect[]): { ratePct: number; capHours: number } {
  return effects.reduce(
    (acc, a) => ({
      ratePct: acc.ratePct + (hook(a, 'offlineRate')?.(a.effect, a) ?? 0),
      capHours: acc.capHours + (hook(a, 'offlineCap')?.(a.effect, a) ?? 0),
    }),
    { ratePct: 0, capHours: 0 },
  );
}
