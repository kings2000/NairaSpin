// Core gameplay types. Everything here is UI-agnostic and serialisable.

export type Tier = 'bronze' | 'silver' | 'gold' | 'emerald' | 'platinum' | 'wild';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

export type CoinId = 'b10' | 'b20' | 'b50' | 's100' | 's200' | 'g500' | 'g1000' | 'emerald' | 'platinum' | 'wild';

export type PatternFamily = 'horizontal' | 'vertical' | 'diagonal' | 'shape' | 'grand';
export type PatternDifficulty = 'basic' | 'intermediate' | 'advanced' | 'grand';

/** [column, row] with (0,0) at the top-left of the 5×3 grid. */
export type Cell = readonly [number, number];

/** 15 symbols, row-major: index = row * GRID_COLS + col. */
export type Grid = CoinId[];

export type CardId =
  | 'nairaCollector'
  | 'moneyMagnet'
  | 'silverLining'
  | 'diagonalMaster'
  | 'patternExpert'
  | 'hotHands'
  | 'goldenFortune'
  | 'bigSpender'
  | 'wildFortune'
  | 'emeraldBlessing'
  | 'platinumReserve';

export type CharmId = 'luckyCharm' | 'patternLens' | 'wildTotem' | 'goldRush';

// ---- Effects (shared by cards, charms and upgrades) -----------------------------------

/** Effect strength at level L = base + perLevel × (L − 1). Level 0 means inactive. */
export interface Scale {
  base: number;
  perLevel: number;
}

export interface CoinTarget {
  coins?: CoinId[];
  tiers?: Tier[];
  /** Applies to the coin the player selected for this card (e.g. Money Magnet). */
  selected?: boolean;
}

export type Effect =
  /** Multiplies matching coins' appearance weight by (1 + amount). Negative amounts are allowed but clamped. */
  | { type: 'weight'; target: CoinTarget; amount: Scale }
  /** Raises matching coins' base value by amount (fraction). */
  | { type: 'coinValue'; target: CoinTarget; amount: Scale }
  /** Raises pattern multipliers of the given families by amount (fraction). */
  | { type: 'patternMult'; families: PatternFamily[]; amount: Scale }
  /** Bonus (fraction) on each pattern reward that satisfies every given condition. */
  | {
      type: 'matchBonus';
      target?: CoinTarget;
      families?: PatternFamily[];
      minCells?: number;
      withWild?: boolean;
      amount: Scale;
    }
  /** Bonus (fraction) on the whole spin for every winning pattern beyond the first. */
  | { type: 'multiPattern'; amount: Scale }
  /** Bonus (fraction) on the whole spin while the win streak is at least minStreak. */
  | { type: 'streak'; minStreak: number; amount: Scale }
  /** Bonus (fraction) on the whole spin. */
  | { type: 'global'; amount: Scale }
  /** Bonus (fraction) on special coin rewards (Emerald / Platinum effects). */
  | { type: 'specialBonus'; coins: CoinId[]; amount: Scale }
  | { type: 'offlineRate'; amount: Scale }
  | { type: 'offlineCap'; amount: Scale };

export type EffectType = Effect['type'];

export type Requirement =
  | { type: 'level'; level: number }
  | { type: 'stat'; stat: NumericStat; min: number; label: string }
  | { type: 'tierMatches'; tier: Tier; min: number };

// ---- Persistent state --------------------------------------------------------------------

export interface CardProgress {
  unlocked: boolean;
  level: number;
  targetCoin?: CoinId;
}

export interface GameStats {
  spins: number;
  wins: number;
  totalEarned: number;
  bestSpin: number;
  patternsCompleted: number;
  bestPatternsInSpin: number;
  currentStreak: number;
  bestStreak: number;
  upgradesBought: number;
  cardsActivated: number;
  charmsUsed: number;
  jackpots: number;
  /** Unique grid cells that were part of a winning pattern, by the coin in that cell. */
  coinsMatched: Record<CoinId, number>;
  patternCounts: Record<string, number>;
  patternEarnings: Record<string, number>;
}

export type NumericStat = {
  [K in keyof GameStats]: GameStats[K] extends number ? K : never;
}[keyof GameStats];

export interface HistoryEntry {
  spin: number;
  at: number;
  grid: Grid;
  matches: { patternId: string; symbol: CoinId; cells: number; total: number }[];
  specials: { source: string; amount: number }[];
  total: number;
}

export interface DailyState {
  /** Local calendar date (YYYY-MM-DD) of the last claim. */
  lastClaimDate: string | null;
  /** Total number of days ever claimed. Never resets, so missing a day is not punished. */
  daysClaimed: number;
}

export type MotionPreference = 'system' | 'reduced' | 'full';

export interface Settings {
  sound: boolean;
  volume: number; // 0..1
  motion: MotionPreference;
}

export interface GameState {
  version: number;
  /** Fictional game-point balance. */
  balance: number;
  xp: number;
  level: number;
  coinUnlocks: Record<CoinId, boolean>;
  /** Upgrade id -> purchased level. */
  upgrades: Record<string, number>;
  cards: Record<CardId, CardProgress>;
  equippedCards: CardId[];
  /** Charm id -> spins remaining (0 = inactive). */
  charms: Record<CharmId, number>;
  stats: GameStats;
  history: HistoryEntry[];
  claimedAchievements: string[];
  daily: DailyState;
  settings: Settings;
  lastSeenAt: number;
}

// ---- Spin results ------------------------------------------------------------------------

export interface PatternMatch {
  patternId: string;
  /** Stable id of the placed instance (pattern + cell set). */
  key: string;
  /** Grid indexes, in the pattern's own order. */
  cells: number[];
  /** The coin the pattern pays out as. 'wild' only when every cell is Wild. */
  symbol: CoinId;
  wildCount: number;
}

export interface Bonus {
  source: string;
  pct: number;
}

export interface MatchReward {
  match: PatternMatch;
  coinValue: number;
  patternMultiplier: number;
  /** coinValue × cells × patternMultiplier */
  base: number;
  bonuses: Bonus[];
  total: number;
}

export interface SpinReward {
  matches: MatchReward[];
  subtotal: number;
  spinBonuses: Bonus[];
  specials: { source: string; amount: number; jackpot: boolean }[];
  total: number;
  /** Names of cards/charms that contributed to this spin. */
  activated: string[];
}

export type WinTier = 'none' | 'small' | 'medium' | 'large' | 'jackpot';

export interface SpinOutcome {
  grid: Grid;
  reward: SpinReward;
  winTier: WinTier;
  /** Indexes of Legendary / Mythic coins, for the rare reveal. */
  rareCells: number[];
  xpGained: number;
}

/** Source of randomness in [0, 1). Injected so logic is deterministic under test. */
export type Rng = () => number;
