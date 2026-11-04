import { CARDS, CHARMS } from '../config/cards';
import { COINS } from '../config/coins';
import { SAVE_VERSION } from '../config/economy';
import { emptyCoinCounts } from './statistics';
import type { CardId, CardProgress, CharmId, CoinId, GameState, GameStats } from './types';

export function createStats(): GameStats {
  return {
    spins: 0,
    wins: 0,
    totalEarned: 0,
    bestSpin: 0,
    patternsCompleted: 0,
    bestPatternsInSpin: 0,
    currentStreak: 0,
    bestStreak: 0,
    upgradesBought: 0,
    cardsActivated: 0,
    charmsUsed: 0,
    jackpots: 0,
    coinsMatched: emptyCoinCounts(),
    patternCounts: {},
    patternEarnings: {},
  };
}

export function createInitialState(now: number = Date.now()): GameState {
  return {
    version: SAVE_VERSION,
    balance: 0,
    xp: 0,
    level: 1,
    coinUnlocks: Object.fromEntries(COINS.map((c) => [c.id, c.unlockLevel <= 1])) as Record<CoinId, boolean>,
    upgrades: {},
    cards: Object.fromEntries(CARDS.map((c) => [c.id, { unlocked: false, level: 1 }])) as Record<CardId, CardProgress>,
    equippedCards: [],
    charms: Object.fromEntries(CHARMS.map((c) => [c.id, 0])) as Record<CharmId, number>,
    stats: createStats(),
    history: [],
    claimedAchievements: [],
    daily: { lastClaimDate: null, daysClaimed: 0 },
    settings: { sound: true, volume: 0.6, motion: 'full' },
    lastSeenAt: now,
  };
}
