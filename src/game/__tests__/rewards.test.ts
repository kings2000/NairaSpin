import { describe, expect, it } from 'vitest';
import { COIN_BY_ID, TIERS, type SpecialEffect } from '../../config/coins';
import { PATTERNS } from '../../config/patterns';
import { activeEffects } from '../effects';
import { evaluateGrid } from '../patterns';
import { calculateSpinReward, classifyWin } from '../rewards';
import { applySpin, resolveGrid } from '../spin';
import type { GameState, Grid } from '../types';
import { on, stateWith, unlockAll, withCards } from './helpers';

function pay(state: GameState, g: Grid, streak = 1) {
  return calculateSpinReward(g, evaluateGrid(g, PATTERNS), state.level, activeEffects(state), streak);
}

const base = unlockAll(stateWith());
const V = (id: keyof typeof COIN_BY_ID) => COIN_BY_ID[id].baseValue;

describe('reward calculator', () => {
  it('pays coin value × matched coins × pattern multiplier', () => {
    // Silver ₦100 in a Horizontal 3 (×1): value × 3 × 1.
    const r = pay(base, on('...../...../SSS..'));
    expect(r.matches).toHaveLength(1);
    expect(r.matches[0]).toMatchObject({ coinValue: V('s100'), patternMultiplier: 1, base: V('s100') * 3, total: V('s100') * 3 });
    expect(r.total).toBe(V('s100') * 3);
  });

  it('applies higher multipliers to complex patterns', () => {
    // Gold ₦500 in a T Shape: value × 5 coins × 2.5.
    expect(pay(base, on('GGG../aG.../.G...')).total).toBe(V('g500') * 5 * 2.5);
  });

  it('sums every winning pattern independently', () => {
    const r = pay(base, on('aaa.S/....S/....S'));
    expect(r.matches.map((m) => m.total).sort((a, b) => a - b)).toEqual([V('b10') * 3, V('s100') * 3]);
    expect(r.total).toBe(V('b10') * 3 + V('s100') * 3);
  });

  it('applies coin value and pattern upgrades', () => {
    const s = { ...base, upgrades: { 'value:s100': 2, 'pattern:horizontal': 1 } };
    const r = pay(s, on('...../...../SSS..'));
    const value = V('s100') * (1 + 2 * TIERS.silver.valueStep);
    expect(r.matches[0].coinValue).toBeCloseTo(value);
    expect(r.matches[0].patternMultiplier).toBeCloseTo(1.12);
    expect(r.total).toBe(Math.round(value * 3 * 1.12));
  });

  it('applies card bonuses to matching patterns only', () => {
    const s = withCards(base, ['nairaCollector']);
    const r = pay(s, on('aaa.S/....S/....S'));
    const bronze = r.matches.find((m) => m.match.symbol === 'b10')!;
    const silver = r.matches.find((m) => m.match.symbol === 's100')!;
    expect(bronze.bonuses).toEqual([{ source: 'Naira Collector', pct: 0.2 }]);
    expect(bronze.total).toBe(Math.round(V('b10') * 3 * 1.2));
    expect(silver.bonuses).toEqual([]);
    expect(r.activated).toEqual(['Naira Collector']);
  });

  it('scales card bonuses with card level', () => {
    const s = withCards(base, ['nairaCollector'], 3);
    expect(pay(s, on('aaa..')).matches[0].bonuses[0].pct).toBeCloseTo(0.4);
  });

  it('applies family and size conditions', () => {
    const diag = withCards(base, ['diagonalMaster']);
    expect(pay(diag, on('G..../.G.../..G..')).matches[0].bonuses[0].source).toBe('Diagonal Master');
    expect(pay(diag, on('GGG..')).matches[0].bonuses).toEqual([]);
    const big = withCards(base, ['bigSpender']);
    expect(pay(big, on('aaaaa')).matches[0].bonuses[0].pct).toBeCloseTo(0.4);
    expect(pay(big, on('aaaa.')).matches[0].bonuses).toEqual([]);
  });

  it('applies global and multi-pattern spin bonuses', () => {
    const s = withCards({ ...base, upgrades: { 'machine:booster': 2 } }, ['patternExpert']);
    const r = pay(s, on('aaa.S/....S/....S'));
    const pct = r.spinBonuses.reduce((x, b) => x + b.pct, 0);
    expect(pct).toBeCloseTo(0.1 + 0.08);
    expect(r.total).toBe(Math.round((V('b10') * 3 + V('s100') * 3) * 1.18));
  });

  it('gives no spin bonuses on a losing spin', () => {
    const s = { ...base, upgrades: { 'machine:booster': 5 } };
    expect(pay(s, on('.....')).total).toBe(0);
  });

  it('applies streak bonuses only from the configured streak', () => {
    const s = withCards(base, ['hotHands']);
    expect(pay(s, on('aaa..'), 2).spinBonuses).toEqual([]);
    expect(pay(s, on('aaa..'), 3).spinBonuses[0]).toEqual({ source: 'Hot Hands', pct: 0.2 });
  });

  it('pays all-Wild patterns at the Wild value and boosts Wild-assisted patterns', () => {
    expect(pay(base, on('WWWPP')).matches.map((m) => [m.match.symbol, m.total])).toEqual([['wild', COIN_BY_ID.wild.baseValue * 3]]);
    const s = withCards(base, ['wildFortune']);
    const r = pay(s, on('aWa..'));
    expect(r.matches[0].bonuses).toEqual([{ source: 'Wild Fortune', pct: 0.2 }]);
  });

  it('pays special coin effects', () => {
    const emerald = pay(base, on('E...E')); // two Emeralds land, no pattern
    expect(emerald.matches).toEqual([]);
    const land = COIN_BY_ID.emerald.special as Extract<SpecialEffect, { type: 'landBonus' }>;
    const pot = COIN_BY_ID.platinum.special as Extract<SpecialEffect, { type: 'scatterJackpot' }>;
    const landPay = 2 * (land.base + land.perLevel * base.level);
    expect(emerald.specials).toEqual([{ source: 'Emerald Crest ×2', amount: landPay, jackpot: false }]);
    expect(emerald.total).toBe(landPay);
    const jackpot = pot.base + pot.perLevel * base.level;
    expect(pay(base, on('P.P.P')).specials.find((s) => s.jackpot)!.amount).toBe(jackpot);
    const reserve = pay(withCards(base, ['platinumReserve']), on('P.P.P'));
    expect(reserve.specials.find((s) => s.jackpot)!.amount).toBe(Math.round(jackpot * 1.5));
  });

  it('classifies win feedback levels', () => {
    expect(classifyWin(pay(base, on('.....')))).toBe('none');
    expect(classifyWin(pay(base, on('aaa..')))).toBe('small');
    expect(classifyWin(pay(base, on('aaaaa')))).toBe('medium');
    expect(classifyWin(pay(base, on('aaa../.a.../aaa..')))).toBe('large');
    expect(classifyWin(pay(base, on('aaa../aaa../aaa..')))).toBe('jackpot');
  });
});

describe('spin resolution', () => {
  it('credits the exact payout once and records statistics and history', () => {
    const s = unlockAll(stateWith(), 1);
    const outcome = resolveGrid(s, on('aaa.S/....S/....S'));
    const { state } = applySpin(s, outcome, 123);
    expect(state.balance - s.balance).toBeGreaterThanOrEqual(outcome.reward.total);
    expect(state.stats).toMatchObject({ spins: 1, wins: 1, patternsCompleted: 2, bestPatternsInSpin: 2, currentStreak: 1 });
    expect(state.stats.coinsMatched.b10).toBe(3);
    expect(state.stats.coinsMatched.s100).toBe(3);
    expect(state.stats.patternCounts).toEqual({ h3: 1, v3: 1 });
    expect(state.history[0]).toMatchObject({ spin: 1, at: 123, total: outcome.reward.total });
  });

  it('counts overlapping cells once in coin statistics', () => {
    const s = unlockAll(stateWith(), 1);
    const { state } = applySpin(s, resolveGrid(s, on('aaa../..a../..a..')));
    expect(state.stats.coinsMatched.b10).toBe(5);
  });

  it('ticks charm durations and resets the streak on a loss', () => {
    const s = { ...unlockAll(stateWith()), charms: { ...stateWith().charms, luckyCharm: 2 }, stats: { ...stateWith().stats, currentStreak: 4 } };
    const { state } = applySpin(s, resolveGrid(s, on('.....')));
    expect(state.charms.luckyCharm).toBe(1);
    expect(state.stats.currentStreak).toBe(0);
  });
});
