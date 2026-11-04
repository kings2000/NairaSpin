// Safe loading: every field is validated and anything missing or malformed falls back to
// the default, so a damaged or outdated save can never crash the game.
import { CARDS, CHARM_BY_ID, CHARMS } from '../config/cards';
import { COIN_BY_ID, COINS } from '../config/coins';
import { HISTORY_LENGTH, SAVE_VERSION } from '../config/economy';
import { UPGRADE_BY_ID } from '../config/upgrades';
import { cardSlots, selectableCoins } from '../game/cards';
import { createInitialState, createStats } from '../game/initialState';
import type { CardId, CoinId, GameState, HistoryEntry, MotionPreference } from '../game/types';

type Json = Record<string, unknown>;

const isObj = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const obj = (v: unknown): Json => (isObj(v) ? v : {});

function num(v: unknown, fallback: number, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
}
const int = (v: unknown, fallback: number, min = 0, max = Number.MAX_SAFE_INTEGER) => Math.floor(num(v, fallback, min, max));
const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);

// ---- Migrations ------------------------------------------------------------------------

const V1_NOTE_TO_COIN: Record<string, string> = {
  n10: 'b10',
  n20: 'b20',
  n50: 'b50',
  n100: 's100',
  n200: 's200',
  n500: 'g500',
  n1000: 'g1000',
};
// v1 costs, used to refund content that no longer exists.
const V1_N5_COST = { appearance: [70, 1.6], value: [55, 1.55] } as const;
const V1_CARD_UPGRADE_BASE: Record<string, number> = {
  nairaMagnet: 300,
  doubleTrouble: 400,
  luckySeven: 600,
  luckyStreak: 700,
  wildCard: 1000,
  goldenTouch: 1500,
};
const sumCosts = (base: number, growth: number, from: number, to: number) => {
  let total = 0;
  for (let l = from; l < to; l++) total += Math.round(base * Math.pow(growth, l));
  return total;
};

/** Upgrades older save shapes step by step: MIGRATIONS[n] turns version n into n + 1. */
export const MIGRATIONS: Record<number, (raw: Json) => Json> = {
  1: (v1) => {
    const items = obj(v1.items);
    const upgrades: Record<string, number> = {};
    for (const [note, coin] of Object.entries(V1_NOTE_TO_COIN)) {
      const it = obj(items[note]);
      upgrades[`chance:${coin}`] = int(it.appearanceLevel, 0);
      upgrades[`value:${coin}`] = int(it.valueLevel, 0);
    }
    const machine = obj(v1.machine);
    upgrades['machine:booster'] = int(machine.boosterLevel, 0);
    upgrades['machine:vault'] = int(machine.vaultLevel, 0);

    // Refund the removed ₦5 note's investments and old card upgrades.
    const n5 = obj(items.n5);
    let refund =
      sumCosts(V1_N5_COST.appearance[0], V1_N5_COST.appearance[1], 0, int(n5.appearanceLevel, 0, 0, 10)) +
      sumCosts(V1_N5_COST.value[0], V1_N5_COST.value[1], 0, int(n5.valueLevel, 0, 0, 10));
    for (const [id, base] of Object.entries(V1_CARD_UPGRADE_BASE)) {
      const lvl = int(obj(obj(v1.cards)[id]).level, 1, 1, 5);
      refund += sumCosts(base, 2, 0, lvl - 1);
    }

    const st = obj(v1.stats);
    return {
      version: 2,
      balance: int(v1.coins, 0) + refund,
      xp: v1.xp,
      level: v1.level,
      upgrades,
      stats: {
        spins: st.spins,
        wins: st.wins,
        totalEarned: st.totalEarned,
        bestSpin: st.bestWin,
        bestStreak: st.bestStreak,
        upgradesBought: st.upgradesBought,
        jackpots: st.jackpots,
      },
      claimedAchievements: v1.claimedAchievements,
      daily: v1.daily,
      settings: v1.settings,
      lastSeenAt: v1.lastSeenAt,
    };
  },
};

export function migrate(raw: Json): Json {
  let data = raw;
  let version = int(raw.version, SAVE_VERSION, 1);
  while (version < SAVE_VERSION) {
    data = MIGRATIONS[version]?.(data) ?? data;
    version += 1;
  }
  return { ...data, version: SAVE_VERSION };
}

// ---- Deserialise -----------------------------------------------------------------------

export function deserialize(raw: unknown, now: number = Date.now()): GameState {
  const d = createInitialState(now);
  if (!isObj(raw)) return d;
  if (int(raw.version, 0) > SAVE_VERSION) return d; // save from a newer build: don't guess
  const r = migrate(raw);

  const level = int(r.level, d.level, 1, 999);

  const rawUnlocks = obj(r.coinUnlocks);
  const coinUnlocks = { ...d.coinUnlocks };
  for (const c of COINS) coinUnlocks[c.id] = bool(rawUnlocks[c.id], false) || c.unlockLevel <= level;

  const upgrades: Record<string, number> = {};
  for (const [id, lvl] of Object.entries(obj(r.upgrades))) {
    const def = UPGRADE_BY_ID[id];
    const l = int(lvl, 0, 0, def?.maxLevel ?? 0);
    if (def && l > 0) upgrades[id] = l;
  }

  const rawCards = obj(r.cards);
  const cards = { ...d.cards };
  for (const def of CARDS) {
    const rc = obj(rawCards[def.id]);
    const target = rc.targetCoin;
    cards[def.id] = {
      unlocked: bool(rc.unlocked, false),
      level: int(rc.level, 1, 1, def.maxLevel),
      ...(typeof target === 'string' && target in coinUnlocks ? { targetCoin: target as CoinId } : {}),
    };
  }

  const rawCharms = obj(r.charms);
  const charms = { ...d.charms };
  for (const c of CHARMS) charms[c.id] = int(rawCharms[c.id], 0, 0, CHARM_BY_ID[c.id].durationSpins);

  const st = obj(r.stats);
  const base = createStats();
  const numericStats = Object.fromEntries(
    Object.entries(base)
      .filter(([, v]) => typeof v === 'number')
      .map(([k, v]) => [k, int(st[k], v as number)]),
  );
  const counts = (v: unknown, keys?: readonly string[]) =>
    Object.fromEntries(
      Object.entries(obj(v))
        .filter(([k]) => !keys || keys.includes(k))
        .map(([k, n]) => [k, int(n, 0)]),
    );
  const stats = {
    ...base,
    ...numericStats,
    coinsMatched: { ...base.coinsMatched, ...counts(st.coinsMatched, Object.keys(base.coinsMatched)) },
    patternCounts: counts(st.patternCounts),
    patternEarnings: counts(st.patternEarnings),
  } as GameState['stats'];

  const daily = obj(r.daily);
  const settings = obj(r.settings);
  const motions: MotionPreference[] = ['system', 'reduced', 'full'];

  const state: GameState = {
    version: SAVE_VERSION,
    balance: int(r.balance, 0),
    xp: int(r.xp, 0),
    level,
    coinUnlocks,
    upgrades,
    cards,
    equippedCards: [],
    charms,
    stats,
    history: (Array.isArray(r.history) ? r.history : []).filter(isHistoryEntry).slice(0, HISTORY_LENGTH),
    claimedAchievements: (Array.isArray(r.claimedAchievements) ? r.claimedAchievements : []).filter(
      (x): x is string => typeof x === 'string',
    ),
    daily: {
      lastClaimDate: typeof daily.lastClaimDate === 'string' ? daily.lastClaimDate : null,
      daysClaimed: int(daily.daysClaimed, 0),
    },
    settings: {
      sound: bool(settings.sound, d.settings.sound),
      volume: num(settings.volume, d.settings.volume, 0, 1),
      motion: motions.includes(settings.motion as MotionPreference) ? (settings.motion as MotionPreference) : d.settings.motion,
    },
    // A lastSeenAt in the future (clock change) is clamped so offline rewards can't be farmed.
    lastSeenAt: num(r.lastSeenAt, now, 0, now),
  };

  // Equipped cards must exist, be unlocked, be unique, fit the slots and have a valid target.
  state.equippedCards = (Array.isArray(r.equippedCards) ? r.equippedCards : [])
    .filter((id): id is CardId => typeof id === 'string' && id in cards && cards[id as CardId].unlocked)
    .filter((id, i, arr) => arr.indexOf(id) === i)
    .slice(0, cardSlots(level));
  for (const id of state.equippedCards) {
    const options = selectableCoins(state, id);
    const t = state.cards[id].targetCoin;
    if (options.length && !(t && options.includes(t))) state.cards[id] = { ...state.cards[id], targetCoin: options[0] };
  }
  return state;
}

function isHistoryEntry(v: unknown): v is HistoryEntry {
  return (
    isObj(v) &&
    Array.isArray(v.grid) &&
    v.grid.length === 15 &&
    v.grid.every((c) => typeof c === 'string' && c in COIN_BY_ID) &&
    Array.isArray(v.matches) &&
    typeof v.total === 'number'
  );
}
