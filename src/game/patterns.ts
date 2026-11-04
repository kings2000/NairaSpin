// Pattern evaluator: finds every winning pattern on a 5×3 grid.
//
// Rules
//  1. Every unlocked pattern is tried in every position its shape fits (all orientations).
//  2. An instance wins when all its cells hold the same coin, or Wilds standing in for it.
//     A Wild never "becomes" another Wild: an all-Wild instance pays as the Wild coin itself.
//  3. Identical cell sets are only paid once (the highest multiplier wins).
//  4. A win is dropped when a bigger win of the same coin covers all of its cells
//     (e.g. the Horizontal 3s inside a Horizontal 5). Partially overlapping wins all pay.
import { COIN_BY_ID, WILD_RULES } from '../config/coins';
import { GRID_COLS, GRID_ROWS } from '../config/economy';
import type { PatternDefinition } from '../config/patterns';
import type { Cell, CoinId, Grid, PatternMatch } from './types';

export const GRID_SIZE = GRID_COLS * GRID_ROWS;

export const cellIndex = (col: number, row: number) => row * GRID_COLS + col;
export const cellCoords = (index: number): Cell => [index % GRID_COLS, Math.floor(index / GRID_COLS)];

export interface PatternInstance {
  patternId: string;
  key: string;
  cells: number[];
}

/** All placements of a pattern on the grid, de-duplicated across orientations. */
export function placePattern(p: PatternDefinition): PatternInstance[] {
  const seen = new Set<string>();
  const out: PatternInstance[] = [];
  for (const shape of p.shapes) {
    const maxC = Math.max(...shape.map(([c]) => c));
    const maxR = Math.max(...shape.map(([, r]) => r));
    if (shape.some(([c, r]) => c < 0 || r < 0)) continue;
    for (let dy = 0; dy + maxR < GRID_ROWS; dy++) {
      for (let dx = 0; dx + maxC < GRID_COLS; dx++) {
        const cells = shape.map(([c, r]) => cellIndex(c + dx, r + dy));
        const key = `${p.id}:${[...cells].sort((a, b) => a - b).join(',')}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ patternId: p.id, key, cells });
      }
    }
  }
  return out;
}

const instanceCache = new Map<PatternDefinition, PatternInstance[]>();
function instancesOf(p: PatternDefinition): PatternInstance[] {
  let list = instanceCache.get(p);
  if (!list) instanceCache.set(p, (list = placePattern(p)));
  return list;
}

export interface WildRules {
  substitutes: boolean;
  allWildPays: boolean;
}

/** Checks one placed instance. Returns the paying coin and how many Wilds helped, or null. */
export function matchInstance(
  grid: Grid,
  cells: number[],
  rules: WildRules = WILD_RULES,
): { symbol: CoinId; wildCount: number } | null {
  let symbol: CoinId | null = null;
  let wildCount = 0;
  for (const i of cells) {
    const s = grid[i];
    if (rules.substitutes && COIN_BY_ID[s].isWild) {
      wildCount++;
      continue;
    }
    if (symbol === null) symbol = s;
    else if (s !== symbol) return null;
  }
  if (symbol === null) return rules.allWildPays ? { symbol: 'wild', wildCount } : null;
  if (wildCount > 0 && !COIN_BY_ID[symbol].wildSubstitutable) return null;
  return { symbol, wildCount };
}

const isStrictSuperset = (big: Set<number>, small: number[]) =>
  big.size > small.length && small.every((c) => big.has(c));

export function evaluateGrid(grid: Grid, patterns: PatternDefinition[], rules: WildRules = WILD_RULES): PatternMatch[] {
  if (grid.length !== GRID_SIZE) throw new Error(`evaluateGrid: expected ${GRID_SIZE} cells, got ${grid.length}`);
  const mult = new Map(patterns.map((p) => [p.id, p.multiplier]));

  // 1–2: raw wins, keyed by cell set so identical placements only pay once (rule 3).
  const byCells = new Map<string, PatternMatch>();
  for (const p of patterns) {
    for (const inst of instancesOf(p)) {
      const hit = matchInstance(grid, inst.cells, rules);
      if (!hit) continue;
      const cellKey = `${hit.symbol}|${[...inst.cells].sort((a, b) => a - b).join(',')}`;
      const existing = byCells.get(cellKey);
      if (existing && mult.get(existing.patternId)! >= p.multiplier) continue;
      byCells.set(cellKey, { patternId: p.id, key: inst.key, cells: inst.cells, symbol: hit.symbol, wildCount: hit.wildCount });
    }
  }

  // 4: drop wins fully covered by a bigger win of the same coin (all-Wild wins by any).
  const wins = [...byCells.values()];
  const sets = wins.map((w) => new Set(w.cells));
  const kept = wins.filter(
    (m) => !wins.some((n, j) => n !== m && (n.symbol === m.symbol || m.symbol === 'wild') && isStrictSuperset(sets[j], m.cells)),
  );

  return kept.sort(
    (a, b) => mult.get(b.patternId)! * b.cells.length - mult.get(a.patternId)! * a.cells.length || a.key.localeCompare(b.key),
  );
}
