import { describe, expect, it } from 'vitest';
import { SAVE_VERSION } from '../config/economy';
import { createInitialState } from '../game/initialState';
import { applySpin, resolveGrid } from '../game/spin';
import { on, unlockAll } from '../game/__tests__/helpers';
import { LocalStorageRepository, MemoryRepository } from './saveRepository';
import { deserialize } from './serialization';

const NOW = 5_000_000;

describe('save / load', () => {
  it('round-trips a played save exactly', () => {
    let s = { ...unlockAll(createInitialState(NOW), 8), balance: 999 };
    s = { ...s, upgrades: { 'chance:b10': 2, 'machine:booster': 1 }, equippedCards: ['moneyMagnet'] };
    s.cards = { ...s.cards, moneyMagnet: { unlocked: true, level: 2, targetCoin: 'b20' } };
    s.charms = { ...s.charms, luckyCharm: 7 };
    s = applySpin(s, resolveGrid(s, on('aaa.S/....S/....S')), NOW).state;
    const repo = new MemoryRepository();
    repo.save(s);
    expect(deserialize(repo.load(), NOW)).toEqual(s);
  });

  it('persists unlocked content', () => {
    const init = createInitialState(NOW);
    const s = { ...init, cards: { ...init.cards, moneyMagnet: { unlocked: true, level: 3 } } };
    const loaded = deserialize(JSON.parse(JSON.stringify(s)), NOW);
    expect(loaded.cards.moneyMagnet).toEqual({ unlocked: true, level: 3 });
    expect(loaded.cards.bigSpender.unlocked).toBe(false);
    expect(Object.values(loaded.coinUnlocks).every(Boolean)).toBe(true);
  });

  it('fills missing fields with defaults', () => {
    const s = deserialize({ version: 2, balance: 50, level: 4 }, NOW);
    expect(s.balance).toBe(50);
    expect(s.coinUnlocks.s100).toBe(true); // implied by level
    expect(s.stats.coinsMatched.b10).toBe(0);
    expect(s.charms.luckyCharm).toBe(0);
    expect(s.history).toEqual([]);
  });

  it('falls back to defaults for garbage and newer versions', () => {
    for (const bad of [null, 42, 'x', [], { version: 'nope' }]) expect(deserialize(bad, NOW).balance).toBe(0);
    expect(deserialize({ version: SAVE_VERSION + 1, balance: 999 }, NOW).balance).toBe(0);
  });

  it('clamps and filters invalid values', () => {
    const s = deserialize(
      {
        version: 2,
        balance: -50,
        upgrades: { 'chance:b10': 999, fake: 3 },
        equippedCards: ['bigSpender', 'hacker'],
        cards: { bigSpender: { unlocked: false } },
        charms: { luckyCharm: 9999 },
        history: [{ grid: ['bad'], matches: [], total: 1 }],
        lastSeenAt: NOW * 10,
      },
      NOW,
    );
    expect(s.balance).toBe(0);
    expect(s.upgrades).toEqual({ 'chance:b10': 10 });
    expect(s.equippedCards).toEqual([]);
    expect(s.charms.luckyCharm).toBe(25);
    expect(s.history).toEqual([]);
    expect(s.lastSeenAt).toBe(NOW);
  });

  it('migrates a v1 (three-reel) save', () => {
    const v1 = {
      version: 1,
      coins: 1000,
      xp: 12,
      level: 6,
      items: { n5: { unlocked: true, appearanceLevel: 1, valueLevel: 0 }, n10: { unlocked: true, appearanceLevel: 2, valueLevel: 1 }, n100: { unlocked: true, appearanceLevel: 0, valueLevel: 3 } },
      cards: { luckySeven: { unlocked: true, level: 2 } },
      equippedCards: ['luckySeven'],
      machine: { boosterLevel: 2, vaultLevel: 1 },
      stats: { spins: 40, wins: 30, triples: 5, totalEarned: 5000, bestWin: 300, bestStreak: 6, upgradesBought: 7 },
      claimedAchievements: ['spins50'],
      daily: { lastClaimDate: '2026-11-03', daysClaimed: 3 },
      settings: { sound: false, volume: 0.3, motion: 'reduced' },
      lastSeenAt: NOW - 1000,
    };
    const s = deserialize(v1, NOW);
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.level).toBe(6);
    expect(s.upgrades).toEqual({ 'chance:b10': 2, 'value:b10': 1, 'value:s100': 3, 'machine:booster': 2, 'machine:vault': 1 });
    // ₦5 chance level 1 (70) + old Lucky Seven level 2 upgrade (600) are refunded.
    expect(s.balance).toBe(1000 + 70 + 600);
    expect(s.stats).toMatchObject({ spins: 40, wins: 30, totalEarned: 5000, bestSpin: 300, bestStreak: 6, upgradesBought: 7 });
    expect(s.equippedCards).toEqual([]);
    expect(s.coinUnlocks.wild).toBe(true);
    expect(s.settings).toEqual({ sound: false, volume: 0.3, motion: 'reduced' });
    expect(s.daily.daysClaimed).toBe(3);
  });
});

describe('LocalStorageRepository', () => {
  it('survives corrupt JSON and throwing storage', () => {
    const corrupt = new LocalStorageRepository('k', { getItem: () => '{oops', setItem: () => {}, removeItem: () => {} });
    expect(corrupt.load()).toBeNull();
    const throwing = new LocalStorageRepository('k', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => {},
    });
    expect(throwing.load()).toBeNull();
    expect(() => throwing.save(createInitialState(NOW))).not.toThrow();
  });
});
