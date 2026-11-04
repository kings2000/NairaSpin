import { COIN_IDS } from '../../config/coins';
import { CARDS } from '../../config/cards';
import { createInitialState } from '../initialState';
import type { CardId, CoinId, GameState, Grid, Rng } from '../types';

/** Deterministic PRNG (mulberry32) for reproducible statistical tests. */
export function seeded(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Returns an Rng that yields the given values in order (cycling). */
export function sequence(...values: number[]): Rng {
  let i = 0;
  return () => values[i++ % values.length];
}

const CODES: Record<string, CoinId> = {
  a: 'b10',
  b: 'b20',
  c: 'b50',
  S: 's100',
  T: 's200',
  G: 'g500',
  H: 'g1000',
  E: 'emerald',
  P: 'platinum',
  W: 'wild',
};

/**
 * Builds a grid from 3 rows of 5 letter codes, e.g. grid('aaaST/GHEPa/bcSTG').
 * a=b10 b=b20 c=b50 S=s100 T=s200 G=g500 H=g1000 E=emerald P=platinum W=wild
 */
export function grid(rows: string): Grid {
  const cells = rows.replace(/[\s/]/g, '').split('');
  if (cells.length !== 15) throw new Error(`grid(): need 15 cells, got ${cells.length}`);
  return cells.map((ch) => {
    const id = CODES[ch];
    if (!id) throw new Error(`grid(): unknown code ${ch}`);
    return id;
  });
}

/** A grid where no coin appears 3+ times (and no Emerald), so nothing pays. */
export const FILLER = 'abcST/GHPPa/bcSTG';

/** Overlays characters onto FILLER; '.' keeps the filler cell. */
export function on(overlay: string): Grid {
  const base = FILLER.replace(/\//g, '').split('');
  const over = overlay.replace(/[\s/]/g, '').split('');
  return grid(base.map((ch, i) => (over[i] && over[i] !== '.' ? over[i] : ch)).join(''));
}

export function stateWith(patch: (s: GameState) => GameState = (s) => s): GameState {
  return patch(createInitialState(1_000_000));
}

export function unlockAll(s: GameState, level = 25): GameState {
  const coinUnlocks = Object.fromEntries(COIN_IDS.map((id) => [id, true])) as GameState['coinUnlocks'];
  const cards = { ...s.cards };
  for (const c of CARDS) cards[c.id] = { ...cards[c.id], unlocked: true };
  return { ...s, level, coinUnlocks, cards };
}

export function withCards(s: GameState, ids: CardId[], level = 1): GameState {
  const all = unlockAll(s);
  const cards = { ...all.cards };
  for (const id of ids) cards[id] = { ...cards[id], level };
  return { ...all, cards, equippedCards: ids };
}
