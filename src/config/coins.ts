// Coin definitions. Like the symbols on a classic slot machine, every coin is in play from
// the very first spin: common coins land often and pay little, rare coins land seldom and pay
// a lot. Denomination (the printed ₦ label) and baseValue (points paid per matched coin) are
// separate. All values are fictional game points.
import type { CoinId, Rarity, Tier } from '../game/types';

export type SpecialEffect =
  /** Every one of these coins that lands pays a flat bonus, matched or not. */
  | { type: 'landBonus'; base: number; perLevel: number }
  /** minCount or more anywhere on the grid pays a jackpot. */
  | { type: 'scatterJackpot'; minCount: number; base: number; perLevel: number };

export interface CoinDefinition {
  id: CoinId;
  name: string;
  /** Metal of the coin (shown by its rim). */
  tier: Tier;
  /** How rare the coin is on the reels. */
  rarity: Rarity;
  denomination: number;
  /** Points paid per matched coin, before upgrades. */
  baseValue: number;
  /** Relative appearance weight before normalisation. */
  weight: number;
  unlockLevel: number;
  /** Base cost of this coin's Chance / Value upgrades. */
  costBase: number;
  isWild?: boolean;
  /** Whether a Wild may stand in for this coin. */
  wildSubstitutable: boolean;
  special?: SpecialEffect;
  blurb: string;
}

export interface TierDefinition {
  name: string;
  /** Value gained per Value-upgrade level, as a fraction of base value. */
  valueStep: number;
}

export const TIERS: Record<Tier, TierDefinition> = {
  bronze: { name: 'Bronze', valueStep: 0.1 },
  silver: { name: 'Silver', valueStep: 0.12 },
  gold: { name: 'Gold', valueStep: 0.15 },
  emerald: { name: 'Emerald', valueStep: 0.15 },
  platinum: { name: 'Platinum', valueStep: 0.15 },
  wild: { name: 'Wild', valueStep: 0.1 },
};

export const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
  mythic: 'Mythic',
};

// Value / rarity ladder follows a classic fruit-machine table:
// 10 · 15 · 20 (common), 35 (uncommon), 100 (rare), 250 (epic), 500 (legendary).
export const COINS: CoinDefinition[] = [
  { id: 'b10', name: 'Bronze ₦10', tier: 'bronze', rarity: 'common', denomination: 10, baseValue: 10, weight: 22, unlockLevel: 1, costBase: 120, wildSubstitutable: true, blurb: 'Lands all the time. Small but steady.' },
  { id: 'b20', name: 'Bronze ₦20', tier: 'bronze', rarity: 'common', denomination: 20, baseValue: 15, weight: 20, unlockLevel: 1, costBase: 150, wildSubstitutable: true, blurb: 'A common coin worth a little more.' },
  { id: 'b50', name: 'Bronze ₦50', tier: 'bronze', rarity: 'common', denomination: 50, baseValue: 20, weight: 18, unlockLevel: 1, costBase: 180, wildSubstitutable: true, blurb: 'The best of the bronze.' },
  { id: 's100', name: 'Silver ₦100', tier: 'silver', rarity: 'uncommon', denomination: 100, baseValue: 35, weight: 14, unlockLevel: 1, costBase: 300, wildSubstitutable: true, blurb: 'Shows up often enough to build around.' },
  { id: 's200', name: 'Silver ₦200', tier: 'silver', rarity: 'rare', denomination: 200, baseValue: 100, weight: 9, unlockLevel: 1, costBase: 650, wildSubstitutable: true, blurb: 'A big jump in value.' },
  { id: 'g500', name: 'Gold ₦500', tier: 'gold', rarity: 'epic', denomination: 500, baseValue: 250, weight: 5.5, unlockLevel: 1, costBase: 1400, wildSubstitutable: true, blurb: 'Rare and rewarding.' },
  { id: 'g1000', name: 'Gold ₦1,000', tier: 'gold', rarity: 'legendary', denomination: 1000, baseValue: 500, weight: 3, unlockLevel: 1, costBase: 3000, wildSubstitutable: true, blurb: 'The top prize of the reels.' },
  { id: 'wild', name: 'Wild Coin', tier: 'wild', rarity: 'epic', denomination: 0, baseValue: 50, weight: 3, unlockLevel: 1, costBase: 1200, isWild: true, wildSubstitutable: false, blurb: 'Completes patterns for any coin except Platinum.' },
  {
    id: 'emerald',
    name: 'Emerald Crest',
    tier: 'emerald',
    rarity: 'legendary',
    denomination: 2000,
    baseValue: 750,
    weight: 1.2,
    unlockLevel: 1,
    costBase: 4000,
    wildSubstitutable: true,
    special: { type: 'landBonus', base: 60, perLevel: 15 },
    blurb: 'Pays a bonus every time it lands, even unmatched.',
  },
  {
    id: 'platinum',
    name: 'Platinum Sovereign',
    tier: 'platinum',
    rarity: 'mythic',
    denomination: 5000,
    baseValue: 1000,
    weight: 0.8,
    unlockLevel: 1,
    costBase: 6000,
    wildSubstitutable: false,
    special: { type: 'scatterJackpot', minCount: 3, base: 15000, perLevel: 1500 },
    blurb: 'Three anywhere on the grid triggers the Platinum Jackpot.',
  },
];

export const COIN_IDS = COINS.map((c) => c.id);
export const COIN_BY_ID = Object.fromEntries(COINS.map((c) => [c.id, c])) as Record<CoinId, CoinDefinition>;

/** Coins rare enough to get the anticipation pause and reveal shine. */
export const RARE_RARITIES: Rarity[] = ['legendary', 'mythic'];
export const isRareCoin = (id: CoinId) => RARE_RARITIES.includes(COIN_BY_ID[id].rarity);

export const WILD_RULES = {
  /** Wilds may complete patterns for substitutable coins. */
  substitutes: true,
  /** A pattern made entirely of Wilds pays out as the Wild coin's own value. */
  allWildPays: true,
};
