// Cards (persistent, equipped into limited slots) and charms (temporary, bought with game
// points and active for a number of spins). Both are pure data: behaviour comes from the
// generic effect handlers in src/game/effects.ts.
import type { CardId, CharmId, CoinId, CoinTarget, Effect, Rarity, Requirement } from '../game/types';

export type EmblemName = 'bolt' | 'clover' | 'flame' | 'lens' | 'magnet' | 'vault';

/** What a card, charm or upgrade shows as its artwork. */
export type ArtRef = { coin: CoinId } | { emblem: EmblemName } | { pattern: string };

export interface CardDefinition {
  id: CardId;
  name: string;
  description: string;
  rarity: Rarity;
  art: ArtRef;
  effects: Effect[];
  unlock: Requirement;
  maxLevel: number;
  upgradeCost: { base: number; growth: number };
  /** Cards stay active while equipped. */
  duration: 'persistent';
  /** Only one copy of a card can be equipped. */
  stack: 'unique';
  /** If set, the player chooses one coin from this target for `selected` effects. */
  selectable?: CoinTarget;
}

export interface CharmDefinition {
  id: CharmId;
  name: string;
  description: string;
  art: ArtRef;
  effects: Effect[];
  durationSpins: number;
  /** Price scales gently with player level so charms stay relevant. */
  cost: (playerLevel: number) => number;
  unlockLevel: number;
  /** Buying an active charm refreshes its duration instead of stacking. */
  stack: 'refresh';
}

const s = (base: number, perLevel = 0) => ({ base, perLevel });

export const CARDS: CardDefinition[] = [
  {
    id: 'nairaCollector',
    name: 'Naira Collector',
    description: 'Bronze coin patterns pay more.',
    rarity: 'common',
    art: { coin: 'b10' },
    effects: [{ type: 'matchBonus', target: { tiers: ['bronze'] }, amount: s(0.2, 0.1) }],
    unlock: { type: 'level', level: 2 },
    maxLevel: 5,
    upgradeCost: { base: 750, growth: 2 },
    duration: 'persistent',
    stack: 'unique',
  },
  {
    id: 'moneyMagnet',
    name: 'Money Magnet',
    description: 'Your chosen Bronze coin appears more often.',
    rarity: 'common',
    art: { emblem: 'magnet' },
    effects: [{ type: 'weight', target: { selected: true }, amount: s(0.5, 0.25) }],
    unlock: { type: 'level', level: 3 },
    maxLevel: 5,
    upgradeCost: { base: 900, growth: 2 },
    duration: 'persistent',
    stack: 'unique',
    selectable: { tiers: ['bronze'] },
  },
  {
    id: 'diagonalMaster',
    name: 'Diagonal Master',
    description: 'Diagonal, V and staircase patterns pay more.',
    rarity: 'rare',
    art: { pattern: 'vShape' },
    effects: [{ type: 'matchBonus', families: ['diagonal'], amount: s(0.5, 0.2) }],
    unlock: { type: 'level', level: 4 },
    maxLevel: 5,
    upgradeCost: { base: 1500, growth: 2 },
    duration: 'persistent',
    stack: 'unique',
  },
  {
    id: 'silverLining',
    name: 'Silver Lining',
    description: 'Silver coin patterns pay more.',
    rarity: 'rare',
    art: { coin: 's100' },
    effects: [{ type: 'matchBonus', target: { tiers: ['silver'] }, amount: s(0.25, 0.1) }],
    unlock: { type: 'tierMatches', tier: 'silver', min: 15 },
    maxLevel: 5,
    upgradeCost: { base: 1800, growth: 2 },
    duration: 'persistent',
    stack: 'unique',
  },
  {
    id: 'patternExpert',
    name: 'Pattern Expert',
    description: 'Every extra pattern in the same spin boosts the whole spin.',
    rarity: 'rare',
    art: { pattern: 'cross' },
    effects: [{ type: 'multiPattern', amount: s(0.08, 0.03) }],
    unlock: { type: 'stat', stat: 'bestPatternsInSpin', min: 4, label: 'Win 4 patterns in one spin' },
    maxLevel: 5,
    upgradeCost: { base: 2100, growth: 2 },
    duration: 'persistent',
    stack: 'unique',
  },
  {
    id: 'hotHands',
    name: 'Hot Hands',
    description: 'Win 3 spins in a row to heat up every reward.',
    rarity: 'rare',
    art: { emblem: 'flame' },
    effects: [{ type: 'streak', minStreak: 3, amount: s(0.2, 0.1) }],
    unlock: { type: 'stat', stat: 'bestStreak', min: 8, label: 'Win 8 spins in a row' },
    maxLevel: 5,
    upgradeCost: { base: 2100, growth: 2 },
    duration: 'persistent',
    stack: 'unique',
  },
  {
    id: 'wildFortune',
    name: 'Wild Fortune',
    description: 'More Wild coins, and patterns completed by Wilds pay more.',
    rarity: 'epic',
    art: { coin: 'wild' },
    effects: [
      { type: 'weight', target: { coins: ['wild'] }, amount: s(0.4, 0.2) },
      { type: 'matchBonus', withWild: true, amount: s(0.2, 0.1) },
    ],
    unlock: { type: 'level', level: 7 },
    maxLevel: 5,
    upgradeCost: { base: 3000, growth: 2 },
    duration: 'persistent',
    stack: 'unique',
  },
  {
    id: 'goldenFortune',
    name: 'Golden Fortune',
    description: 'Gold coin patterns pay more.',
    rarity: 'epic',
    art: { coin: 'g500' },
    effects: [{ type: 'matchBonus', target: { tiers: ['gold'] }, amount: s(0.2, 0.1) }],
    unlock: { type: 'tierMatches', tier: 'gold', min: 6 },
    maxLevel: 5,
    upgradeCost: { base: 3600, growth: 2 },
    duration: 'persistent',
    stack: 'unique',
  },
  {
    id: 'bigSpender',
    name: 'Big Spender',
    description: 'Patterns of five or more coins pay much more.',
    rarity: 'epic',
    art: { coin: 'g1000' },
    effects: [{ type: 'matchBonus', minCells: 5, amount: s(0.4, 0.15) }],
    unlock: { type: 'level', level: 9 },
    maxLevel: 5,
    upgradeCost: { base: 4200, growth: 2 },
    duration: 'persistent',
    stack: 'unique',
  },
  {
    id: 'emeraldBlessing',
    name: 'Emerald Blessing',
    description: 'More Emeralds, and their landing bonus is doubled.',
    rarity: 'legendary',
    art: { coin: 'emerald' },
    effects: [
      { type: 'weight', target: { coins: ['emerald'] }, amount: s(0.5, 0.25) },
      { type: 'specialBonus', coins: ['emerald'], amount: s(1, 0.25) },
    ],
    unlock: { type: 'level', level: 15 },
    maxLevel: 5,
    upgradeCost: { base: 9000, growth: 2 },
    duration: 'persistent',
    stack: 'unique',
  },
  {
    id: 'platinumReserve',
    name: 'Platinum Reserve',
    description: 'Platinum patterns and the Platinum Jackpot pay more.',
    rarity: 'mythic',
    art: { coin: 'platinum' },
    effects: [
      { type: 'matchBonus', target: { tiers: ['platinum'] }, amount: s(0.5, 0.2) },
      { type: 'specialBonus', coins: ['platinum'], amount: s(0.5, 0.2) },
    ],
    unlock: { type: 'level', level: 19 },
    maxLevel: 5,
    upgradeCost: { base: 15000, growth: 2 },
    duration: 'persistent',
    stack: 'unique',
  },
];

export const CHARMS: CharmDefinition[] = [
  {
    id: 'luckyCharm',
    name: 'Lucky Clover',
    description: '+15% on every spin.',
    art: { emblem: 'clover' },
    effects: [{ type: 'global', amount: s(0.15) }],
    durationSpins: 25,
    cost: (lvl) => 450 + 120 * lvl,
    unlockLevel: 2,
    stack: 'refresh',
  },
  {
    id: 'patternLens',
    name: 'Pattern Lens',
    description: '+30% on Shape and Grand patterns.',
    art: { emblem: 'lens' },
    effects: [{ type: 'matchBonus', families: ['shape', 'grand'], amount: s(0.3) }],
    durationSpins: 20,
    cost: (lvl) => 750 + 180 * lvl,
    unlockLevel: 5,
    stack: 'refresh',
  },
  {
    id: 'wildTotem',
    name: 'Wild Totem',
    description: 'Wild coins appear twice as often.',
    art: { coin: 'wild' },
    effects: [{ type: 'weight', target: { coins: ['wild'] }, amount: s(1) }],
    durationSpins: 15,
    cost: (lvl) => 1200 + 240 * lvl,
    unlockLevel: 7,
    stack: 'refresh',
  },
  {
    id: 'goldRush',
    name: 'Gold Rush',
    description: 'Gold coins appear 80% more often.',
    art: { coin: 'g500' },
    effects: [{ type: 'weight', target: { tiers: ['gold'] }, amount: s(0.8) }],
    durationSpins: 20,
    cost: (lvl) => 1800 + 360 * lvl,
    unlockLevel: 9,
    stack: 'refresh',
  },
];

export const CARD_BY_ID = Object.fromEntries(CARDS.map((c) => [c.id, c])) as Record<CardId, CardDefinition>;
export const CHARM_BY_ID = Object.fromEntries(CHARMS.map((c) => [c.id, c])) as Record<CharmId, CharmDefinition>;

/** Card slots unlock at these player levels (slot N at index N-1). */
export const CARD_SLOT_LEVELS = [1, 1, 6, 12, 20];
