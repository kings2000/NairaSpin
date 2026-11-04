import { describe, expect, it } from 'vitest';
import { CHARM_BY_ID } from '../../config/cards';
import { PROGRESSION } from '../../config/economy';
import { UPGRADE_BY_ID } from '../../config/upgrades';
import { claimAchievement } from '../achievements';
import { buyCharm, canUpgradeCard, cardSlots, equipCard, requirementMet, setCardTarget, unequipCard, upgradeCard } from '../cards';
import { canClaimDaily, claimDaily } from '../daily';
import { computeOfflineReward, offlineCapMinutes } from '../offline';
import { applyUnlocks, applyXp, upcomingUnlocks } from '../progression';
import { mostMatchedCoin } from '../statistics';
import { buyUpgrade, canBuyUpgrade, upgradeCost } from '../upgrades';
import type { GameState } from '../types';
import { stateWith, unlockAll } from './helpers';

const rich = (s: GameState, balance = 1_000_000) => ({ ...s, balance });

describe('upgrades', () => {
  it('costs grow with each level', () => {
    const def = UPGRADE_BY_ID['chance:b10'];
    for (let l = 0; l < def.maxLevel; l++) expect(upgradeCost(def, l + 1)).toBeGreaterThan(upgradeCost(def, l));
  });

  it('deducts the cost and levels up', () => {
    const s = rich(stateWith());
    const next = buyUpgrade(s, 'value:b20');
    expect(next.upgrades['value:b20']).toBe(1);
    expect(next.balance).toBe(s.balance - upgradeCost(UPGRADE_BY_ID['value:b20'], 0));
    expect(next.stats.upgradesBought).toBe(1);
  });

  it('refuses when broke, locked or maxed', () => {
    const poor = stateWith();
    expect(canBuyUpgrade(poor, 'chance:b10')).toMatchObject({ ok: false, reason: 'funds' });
    expect(buyUpgrade(poor, 'chance:b10')).toBe(poor);
    const noGold = { ...rich(poor), coinUnlocks: { ...poor.coinUnlocks, g500: false } };
    expect(canBuyUpgrade(noGold, 'chance:g500')).toMatchObject({ ok: false, reason: 'locked' });
    expect(canBuyUpgrade(rich(poor), 'machine:luck')).toMatchObject({ ok: false, reason: 'locked' });
    expect(canBuyUpgrade(rich({ ...poor, upgrades: { 'chance:b10': 10 } }), 'chance:b10')).toMatchObject({ ok: false, reason: 'maxed' });
    expect(canBuyUpgrade(rich(poor), 'nope')).toMatchObject({ ok: false, reason: 'locked' });
  });
});

describe('cards', () => {
  it('respects slot limits that grow with level', () => {
    expect(cardSlots(1)).toBe(2);
    expect(cardSlots(6)).toBe(3);
    const s = { ...unlockAll(stateWith()), level: 1 };
    const full = equipCard(equipCard(equipCard(s, 'bigSpender'), 'hotHands'), 'nairaCollector');
    expect(full.equippedCards).toEqual(['bigSpender', 'hotHands']);
    expect(unequipCard(full, 'bigSpender').equippedCards).toEqual(['hotHands']);
  });

  it('cannot equip a locked card or the same card twice', () => {
    const s = stateWith();
    expect(equipCard(s, 'bigSpender')).toBe(s);
    const once = equipCard(unlockAll(s), 'bigSpender');
    expect(equipCard(once, 'bigSpender')).toBe(once);
  });

  it('picks and validates Money Magnet targets', () => {
    const s = equipCard(unlockAll(stateWith()), 'moneyMagnet');
    expect(s.cards.moneyMagnet.targetCoin).toBe('b10');
    expect(setCardTarget(s, 'moneyMagnet', 'b50').cards.moneyMagnet.targetCoin).toBe('b50');
    expect(setCardTarget(s, 'moneyMagnet', 'g500')).toBe(s); // not a Bronze coin
  });

  it('upgrades up to max level', () => {
    const s = rich(unlockAll(stateWith()));
    expect(upgradeCard(s, 'hotHands').cards.hotHands.level).toBe(2);
    expect(canUpgradeCard({ ...s, cards: { ...s.cards, hotHands: { unlocked: true, level: 5 } } }, 'hotHands')).toBe(false);
  });

  it('evaluates unlock requirements', () => {
    const s = stateWith();
    expect(requirementMet({ type: 'level', level: 2 }, s)).toBe(false);
    const matched = { ...s, stats: { ...s.stats, coinsMatched: { ...s.stats.coinsMatched, s100: 10, s200: 5 } } };
    expect(requirementMet({ type: 'tierMatches', tier: 'silver', min: 15 }, matched)).toBe(true);
  });
});

describe('charms', () => {
  it('cost game points, last a set number of spins and refresh instead of stacking', () => {
    const s = rich({ ...stateWith(), level: 5 });
    const once = buyCharm(s, 'luckyCharm');
    expect(once.charms.luckyCharm).toBe(CHARM_BY_ID.luckyCharm.durationSpins);
    const partly = { ...once, charms: { ...once.charms, luckyCharm: 3 } };
    expect(buyCharm(partly, 'luckyCharm').charms.luckyCharm).toBe(CHARM_BY_ID.luckyCharm.durationSpins);
    expect(buyCharm(rich(stateWith()), 'goldRush').charms.goldRush).toBe(0); // locked at level 1
  });
});

describe('progression', () => {
  it('levels up (possibly several times) and pays level-up rewards', () => {
    const need = PROGRESSION.xpToNext(1) + PROGRESSION.xpToNext(2);
    const { state, events } = applyXp(stateWith(), need + 3);
    expect(state.level).toBe(3);
    expect(state.xp).toBe(3);
    expect(state.balance).toBe(PROGRESSION.levelUpReward(2) + PROGRESSION.levelUpReward(3));
    expect(events.filter((e) => e.kind === 'patternUnlocked').length).toBeGreaterThan(0);
  });

  it('starts with every coin available and unlocks cards when requirements are met', () => {
    expect(Object.values(stateWith().coinUnlocks).every(Boolean)).toBe(true);
    const { state, events } = applyUnlocks({ ...stateWith(), level: 3 });
    expect(state.cards.moneyMagnet.unlocked).toBe(true);
    expect(state.cards.bigSpender.unlocked).toBe(false);
    expect(events.map((e) => e.kind)).toEqual(['cardUnlocked', 'cardUnlocked']);
  });

  it('lists upcoming unlocks soonest first', () => {
    const next = upcomingUnlocks(stateWith());
    expect(next[0].level).toBe(2);
    expect(next.map((n) => n.level)).toEqual([...next.map((n) => n.level)].sort((a, b) => a - b));
  });

  it('achievements can be claimed once', () => {
    const s = { ...stateWith(), stats: { ...stateWith().stats, patternsCompleted: 1 } };
    const claimed = claimAchievement(s, 'firstPattern');
    expect(claimed.balance).toBeGreaterThan(0);
    expect(claimAchievement(claimed, 'firstPattern')).toBe(claimed);
  });

  it('reports the most matched coin', () => {
    const s = stateWith();
    expect(mostMatchedCoin(s.stats)).toBeNull();
    expect(mostMatchedCoin({ ...s.stats, coinsMatched: { ...s.stats.coinsMatched, b20: 4, b10: 2 } })).toEqual(['b20', 4]);
  });
});

describe('daily & offline rewards', () => {
  const day1 = new Date(2026, 10, 3, 10).getTime();
  it('daily gift is once per day and never resets after missed days', () => {
    const s = claimDaily(stateWith(), day1);
    expect(canClaimDaily(s, day1 + 3600_000)).toBe(false);
    expect(claimDaily(s, new Date(2026, 10, 12).getTime()).daily.daysClaimed).toBe(2);
  });

  it('offline earnings accrue and are capped, extended by the Coin Vault', () => {
    const s = { ...stateWith(), lastSeenAt: 0 };
    expect(computeOfflineReward(s, 60_000)).toBeNull();
    expect(computeOfflineReward(s, 30 * 60_000)).toMatchObject({ minutes: 30, capped: false });
    expect(computeOfflineReward(s, 48 * 3600_000)!.capped).toBe(true);
    expect(offlineCapMinutes({ ...s, upgrades: { 'machine:vault': 2 } })).toBe(offlineCapMinutes(s) + 120);
    expect(computeOfflineReward({ ...stateWith(), lastSeenAt: 10_000_000 }, 0)).toBeNull();
  });
});
