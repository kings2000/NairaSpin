import { CARD_SLOT_LEVELS, CARDS, CHARMS } from '../config/cards';
import { COINS } from '../config/coins';
import { PROGRESSION } from '../config/economy';
import { PATTERNS } from '../config/patterns';
import { UPGRADES } from '../config/upgrades';
import { ACHIEVEMENTS, isComplete } from './achievements';
import { requirementMet } from './cards';
import type { CardId, CoinId, GameState } from './types';

export type GameEvent =
  | { kind: 'levelUp'; level: number; reward: number }
  | { kind: 'coinUnlocked'; coinId: CoinId }
  | { kind: 'patternUnlocked'; patternId: string }
  | { kind: 'cardUnlocked'; cardId: CardId }
  | { kind: 'achievementReady'; id: string };

/** Adds XP, handling any number of level-ups and their rewards. */
export function applyXp(state: GameState, amount: number): { state: GameState; events: GameEvent[] } {
  let { xp, level, balance } = state;
  let earned = 0;
  const events: GameEvent[] = [];
  xp += amount;
  while (xp >= PROGRESSION.xpToNext(level)) {
    xp -= PROGRESSION.xpToNext(level);
    level += 1;
    const reward = PROGRESSION.levelUpReward(level);
    balance += reward;
    earned += reward;
    events.push({ kind: 'levelUp', level, reward });
    for (const p of PATTERNS) if (p.unlockLevel === level) events.push({ kind: 'patternUnlocked', patternId: p.id });
  }
  return {
    state: { ...state, xp, level, balance, stats: { ...state.stats, totalEarned: state.stats.totalEarned + earned } },
    events,
  };
}

/** Unlocks coins and cards whose requirements are now met. */
export function applyUnlocks(state: GameState): { state: GameState; events: GameEvent[] } {
  const events: GameEvent[] = [];
  let coinUnlocks = state.coinUnlocks;
  for (const c of COINS) {
    if (!coinUnlocks[c.id] && state.level >= c.unlockLevel) {
      coinUnlocks = { ...coinUnlocks, [c.id]: true };
      events.push({ kind: 'coinUnlocked', coinId: c.id });
    }
  }
  let cards = state.cards;
  for (const def of CARDS) {
    if (!cards[def.id].unlocked && requirementMet(def.unlock, state)) {
      cards = { ...cards, [def.id]: { ...cards[def.id], unlocked: true } };
      events.push({ kind: 'cardUnlocked', cardId: def.id });
    }
  }
  return { state: events.length ? { ...state, coinUnlocks, cards } : state, events };
}

export function newlyCompletedAchievements(before: GameState, after: GameState): GameEvent[] {
  return ACHIEVEMENTS.filter((a) => !isComplete(a, before) && isComplete(a, after)).map((a) => ({
    kind: 'achievementReady' as const,
    id: a.id,
  }));
}

/** Runs XP, unlocks and achievement checks after any state change. */
export function progress(before: GameState, after: GameState, xpGained: number): { state: GameState; events: GameEvent[] } {
  const xp = applyXp(after, xpGained);
  const unlocks = applyUnlocks(xp.state);
  return {
    state: unlocks.state,
    events: [...xp.events, ...unlocks.events, ...newlyCompletedAchievements(before, unlocks.state)],
  };
}

export interface UpcomingUnlock {
  level: number;
  label: string;
}

/** Level-gated content the player has not reached yet, soonest first. */
export function upcomingUnlocks(state: GameState, limit = 5): UpcomingUnlock[] {
  const lvl = state.level;
  const items: UpcomingUnlock[] = [
    ...COINS.filter((c) => c.unlockLevel > lvl).map((c) => ({ level: c.unlockLevel, label: `${c.name} coin` })),
    ...PATTERNS.filter((p) => p.unlockLevel > lvl).map((p) => ({ level: p.unlockLevel, label: `${p.name} pattern` })),
    ...CARDS.flatMap((c) => (c.unlock.type === 'level' && c.unlock.level > lvl ? [{ level: c.unlock.level, label: `${c.name} card` }] : [])),
    ...CHARMS.filter((c) => c.unlockLevel > lvl).map((c) => ({ level: c.unlockLevel, label: `${c.name} charm` })),
    ...UPGRADES.filter((u) => !u.coinId && u.unlockLevel > lvl).map((u) => ({ level: u.unlockLevel, label: `${u.name} upgrade` })),
    ...CARD_SLOT_LEVELS.filter((l) => l > lvl).map((l) => ({ level: l, label: 'Extra card slot' })),
  ];
  return items.sort((a, b) => a.level - b.level).slice(0, limit);
}
