// Central economy and pacing configuration. Coin, pattern, card and upgrade data live in
// sibling files in this folder; everything tunable is in src/config.

export const SAVE_VERSION = 2;

export const GRID_COLS = 5;
export const GRID_ROWS = 3;

export const PROGRESSION = {
  xpPerSpin: 3,
  /** XP per winning pattern = base + one per 3 cells. */
  xpPerPattern: 1,
  xpToNext: (level: number) => Math.round(45 * Math.pow(level, 1.45)),
  levelUpReward: (newLevel: number) => 200 * newLevel,
};

/** How a spin's feedback level is chosen (presentation only; never changes the payout). */
export const WIN_TIERS = {
  mediumMinPatterns: 3,
  mediumMinCells: 5,
  largeMinPatterns: 6,
  largeMinCells: 7,
  jackpotMinCells: 9,
};

export const SPIN_TIMING = {
  /** Column c stops at firstStopMs + c × stepMs (+ rareDelayMs if it holds a rare coin). */
  firstStopMs: 600,
  stepMs: 170,
  rareDelayMs: 280,
  settleExtraMs: 150,
  reducedFirstStopMs: 100,
  reducedStepMs: 40,
  /** Each winning pattern is spotlighted for this long, then the TOTAL takeover plays. */
  showcaseMs: 1000,
  maxShowcased: 8,
  /** Pause after the last pattern before the TOTAL takeover. */
  beforeTotalMs: 500,
  totalMs: 1400,
};

export const OFFLINE = {
  minAwayMinutes: 2,
  coinsPerMinute: (playerLevel: number) => 10 + playerLevel * 5,
  baseCapHours: 2,
};

export const DAILY = {
  reward: (playerLevel: number, daysClaimed: number) => 400 + 100 * playerLevel + Math.min(daysClaimed, 6) * 100,
  xp: 25,
};

export const HISTORY_LENGTH = 15;
