// Pattern catalogue. Each pattern lists one or more shapes as [col, row] cells relative to
// its top-left. The evaluator slides every shape across the 5×3 grid, so "Horizontal 3"
// is checked in all nine positions it fits. Add a pattern here and it is live: no engine
// changes needed.
import type { Cell, PatternDifficulty, PatternFamily } from '../game/types';

export interface PatternDefinition {
  id: string;
  name: string;
  description: string;
  family: PatternFamily;
  difficulty: PatternDifficulty;
  /** Alternative orientations. All must have the same number of cells. */
  shapes: Cell[][];
  multiplier: number;
  unlockLevel: number;
}

const row = (n: number): Cell[] => Array.from({ length: n }, (_, i) => [i, 0] as const);

export const PATTERNS: PatternDefinition[] = [
  // ---- Basic ----
  { id: 'h3', name: 'Horizontal 3', description: 'Three in a row', family: 'horizontal', difficulty: 'basic', shapes: [row(3)], multiplier: 1, unlockLevel: 1 },
  { id: 'v3', name: 'Vertical 3', description: 'A full column', family: 'vertical', difficulty: 'basic', shapes: [[[0, 0], [0, 1], [0, 2]]], multiplier: 1, unlockLevel: 1 },
  { id: 'diagDown', name: 'Diagonal Down', description: 'Three falling diagonally', family: 'diagonal', difficulty: 'basic', shapes: [[[0, 0], [1, 1], [2, 2]]], multiplier: 1.25, unlockLevel: 1 },
  { id: 'diagUp', name: 'Diagonal Up', description: 'Three rising diagonally', family: 'diagonal', difficulty: 'basic', shapes: [[[0, 2], [1, 1], [2, 0]]], multiplier: 1.25, unlockLevel: 1 },
  { id: 'h4', name: 'Horizontal 4', description: 'Four in a row', family: 'horizontal', difficulty: 'basic', shapes: [row(4)], multiplier: 1.5, unlockLevel: 2 },
  { id: 'h5', name: 'Horizontal 5', description: 'A full row', family: 'horizontal', difficulty: 'basic', shapes: [row(5)], multiplier: 2, unlockLevel: 2 },

  // ---- Intermediate ----
  { id: 'square', name: 'Square', description: 'A 2×2 block', family: 'shape', difficulty: 'intermediate', shapes: [[[0, 0], [1, 0], [0, 1], [1, 1]]], multiplier: 2, unlockLevel: 3 },
  { id: 'lShape', name: 'L Shape', description: 'A column with a foot to the right', family: 'shape', difficulty: 'intermediate', shapes: [[[0, 0], [0, 1], [0, 2], [1, 2]]], multiplier: 1.75, unlockLevel: 3 },
  { id: 'reverseL', name: 'Reverse L', description: 'A column with a foot to the left', family: 'shape', difficulty: 'intermediate', shapes: [[[1, 0], [1, 1], [1, 2], [0, 2]]], multiplier: 1.75, unlockLevel: 3 },
  { id: 'zShape', name: 'Z Shape', description: 'A zig-zag step', family: 'shape', difficulty: 'intermediate', shapes: [[[0, 0], [1, 0], [1, 1], [2, 1]]], multiplier: 1.75, unlockLevel: 4 },
  { id: 'tShape', name: 'T Shape', description: 'A bar with a stem', family: 'shape', difficulty: 'intermediate', shapes: [[[0, 0], [1, 0], [2, 0], [1, 1], [1, 2]]], multiplier: 2.5, unlockLevel: 4 },
  { id: 'cross', name: 'Cross', description: 'A plus sign', family: 'shape', difficulty: 'intermediate', shapes: [[[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]]], multiplier: 2.5, unlockLevel: 5 },
  { id: 'vShape', name: 'V Shape', description: 'Dips to the bottom and back up', family: 'diagonal', difficulty: 'intermediate', shapes: [[[0, 0], [1, 1], [2, 2], [3, 1], [4, 0]]], multiplier: 3, unlockLevel: 5 },
  { id: 'reverseV', name: 'Reverse V', description: 'Climbs to the top and back down', family: 'diagonal', difficulty: 'intermediate', shapes: [[[0, 2], [1, 1], [2, 0], [3, 1], [4, 2]]], multiplier: 3, unlockLevel: 5 },

  // ---- Advanced ----
  {
    id: 'extDiagonal',
    name: 'Extended Diagonal',
    description: 'A staircase across all five columns',
    family: 'diagonal',
    difficulty: 'advanced',
    shapes: [
      [[0, 0], [1, 0], [2, 1], [3, 2], [4, 2]],
      [[0, 2], [1, 2], [2, 1], [3, 0], [4, 0]],
    ],
    multiplier: 3,
    unlockLevel: 7,
  },
  { id: 'extL', name: 'Extended L', description: 'A column with a long foot', family: 'shape', difficulty: 'advanced', shapes: [[[0, 0], [0, 1], [0, 2], [1, 2], [2, 2], [3, 2]]], multiplier: 3.5, unlockLevel: 7 },
  { id: 'sixBlock', name: 'Six Block', description: 'A 3×2 block of six', family: 'shape', difficulty: 'advanced', shapes: [[[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]]], multiplier: 4, unlockLevel: 9 },
  { id: 'hourglass', name: 'Hourglass', description: 'Top bar, stem and bottom bar (seven)', family: 'shape', difficulty: 'advanced', shapes: [[[0, 0], [1, 0], [2, 0], [1, 1], [0, 2], [1, 2], [2, 2]]], multiplier: 5, unlockLevel: 10 },
  { id: 'frame', name: 'Frame', description: 'A 3×3 ring of eight', family: 'shape', difficulty: 'advanced', shapes: [[[0, 0], [1, 0], [2, 0], [2, 1], [2, 2], [1, 2], [0, 2], [0, 1]]], multiplier: 6, unlockLevel: 12 },
  {
    id: 'largeSquare',
    name: 'Large Square',
    description: 'A solid 3×3 block of nine',
    family: 'grand',
    difficulty: 'advanced',
    shapes: [[[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2]]],
    multiplier: 8,
    unlockLevel: 12,
  },
  {
    id: 'arch',
    name: 'Grand Arch',
    description: 'A full top row with two pillars (nine)',
    family: 'grand',
    difficulty: 'advanced',
    shapes: [[[0, 2], [0, 1], [0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [4, 1], [4, 2]]],
    multiplier: 8,
    unlockLevel: 13,
  },

  // ---- Grand ----
  {
    id: 'fullGrid',
    name: 'Full Grid',
    description: 'Every one of the 15 positions',
    family: 'grand',
    difficulty: 'grand',
    shapes: [[0, 1, 2].flatMap((r) => [0, 1, 2, 3, 4].map((c) => [c, r] as const))],
    multiplier: 25,
    unlockLevel: 1,
  },
];

export const PATTERN_BY_ID = Object.fromEntries(PATTERNS.map((p) => [p.id, p])) as Record<string, PatternDefinition>;

export const FAMILY_LABEL: Record<PatternFamily, string> = {
  horizontal: 'Horizontal',
  vertical: 'Vertical',
  diagonal: 'Diagonal',
  shape: 'Shapes',
  grand: 'Grand',
};
