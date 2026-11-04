import { describe, expect, it } from 'vitest';
import { COIN_BY_ID, COIN_IDS } from '../../config/coins';
import { MIN_WEIGHT_FACTOR } from '../effects';
import { getCoinProbabilities, getCoinWeights, normalize, probabilitiesAfterUpgrade } from '../probability';
import { weightedPick } from '../rng';
import { rollSpin } from '../spin';
import type { GameState } from '../types';
import { seeded, sequence, stateWith, unlockAll, withCards } from './helpers';

const sum = (o: Partial<Record<string, number>>) => Object.values(o).reduce((a, b) => a! + b!, 0)!;

describe('weightedPick', () => {
  it('maps the roll onto cumulative weight ranges', () => {
    const w = { a: 1, b: 3 };
    expect(weightedPick(w, sequence(0))).toBe('a');
    expect(weightedPick(w, sequence(0.249))).toBe('a');
    expect(weightedPick(w, sequence(0.25))).toBe('b');
    expect(weightedPick(w, sequence(0.9999999))).toBe('b');
  });

  it('ignores zero, negative and non-finite weights', () => {
    expect(weightedPick({ a: 0, b: -2, c: NaN, d: 5 }, sequence(0.5))).toBe('d');
    expect(() => weightedPick({ a: 0, b: -1 })).toThrow();
  });

  it('matches the expected distribution', () => {
    const rng = seeded(42);
    const counts = { a: 0, b: 0, c: 0 };
    for (let i = 0; i < 100_000; i++) counts[weightedPick({ a: 10, b: 30, c: 60 }, rng)]++;
    expect(counts.a / 1e5).toBeCloseTo(0.1, 1);
    expect(counts.b / 1e5).toBeCloseTo(0.3, 1);
    expect(counts.c / 1e5).toBeCloseTo(0.6, 1);
  });
});

describe('coin probabilities', () => {
  it('puts every coin on the reels from the first spin, summing to 100%', () => {
    const p = getCoinProbabilities(stateWith());
    expect(Object.keys(p).sort()).toEqual([...COIN_IDS].sort());
    expect(sum(p)).toBeCloseTo(1, 12);
  });

  it('lands common coins more often than rare ones', () => {
    const p = getCoinProbabilities(stateWith());
    expect(p.b10!).toBeGreaterThan(p.s100!);
    expect(p.s100!).toBeGreaterThan(p.g500!);
    expect(p.g500!).toBeGreaterThan(p.platinum!);
  });

  it('excludes coins that are switched off', () => {
    const s = stateWith();
    const p = getCoinProbabilities({ ...s, coinUnlocks: { ...s.coinUnlocks, platinum: false } });
    expect(p.platinum).toBeUndefined();
    expect(sum(p)).toBeCloseTo(1, 12);
  });

  it('normalises and drops invalid weights', () => {
    expect(normalize({ a: 2, b: 6, c: 0, d: -3 })).toEqual({ a: 0.25, b: 0.75 });
    expect(normalize({})).toEqual({});
  });

  it('raises an upgraded coin and lowers the others proportionally', () => {
    const s = stateWith();
    const before = getCoinProbabilities(s);
    const after = probabilitiesAfterUpgrade(s, 'chance:b20');
    expect(after.b20!).toBeGreaterThan(before.b20!);
    expect(after.b10! / after.b50!).toBeCloseTo(before.b10! / before.b50!, 12);
    expect(sum(after)).toBeCloseTo(1, 12);
  });

  it('applies card targets (Money Magnet) and tier effects (Lucky Machine)', () => {
    const s = withCards(stateWith(), ['moneyMagnet']);
    const magnet: GameState = { ...s, cards: { ...s.cards, moneyMagnet: { unlocked: true, level: 1, targetCoin: 'b50' } } };
    expect(getCoinWeights(magnet).b50).toBeCloseTo(COIN_BY_ID.b50.weight * 1.5);
    expect(getCoinWeights(magnet).b10).toBeCloseTo(COIN_BY_ID.b10.weight);
    const lucky = { ...unlockAll(stateWith()), upgrades: { 'machine:luck': 2 } };
    expect(getCoinWeights(lucky).g500).toBeCloseTo(COIN_BY_ID.g500.weight * 1.16);
    expect(getCoinWeights(lucky).b10).toBeCloseTo(COIN_BY_ID.b10.weight * 0.92);
  });

  it('never lets negative effects push a weight to zero or below', () => {
    const s = { ...stateWith(), upgrades: { 'machine:luck': 5 } };
    // Simulate an extreme stack by reusing the luck effect via a hand-made upgrade level.
    const extreme = { ...s, upgrades: { 'machine:luck': 500 } };
    const w = getCoinWeights(extreme);
    expect(w.b10!).toBeCloseTo(COIN_BY_ID.b10.weight * MIN_WEIGHT_FACTOR);
    expect(sum(getCoinProbabilities(extreme))).toBeCloseTo(1, 12);
  });

  it('is reproducible with a seeded RNG', () => {
    const s = unlockAll(stateWith());
    expect(rollSpin(s, seeded(99)).grid).toEqual(rollSpin(s, seeded(99)).grid);
    expect(rollSpin(s, seeded(99)).grid).not.toEqual(rollSpin(s, seeded(100)).grid);
  });

  it('lands each coin at its configured rate', () => {
    const s = stateWith();
    const expected = getCoinProbabilities(s);
    const rng = seeded(7);
    const counts: Record<string, number> = {};
    const N = 8000;
    for (let i = 0; i < N; i++) for (const c of rollSpin(s, rng).grid) counts[c] = (counts[c] ?? 0) + 1;
    for (const [id, p] of Object.entries(expected)) expect(counts[id] / (N * 15)).toBeCloseTo(p!, 2);
  });
});
