import { describe, expect, it } from 'vitest';
import { PATTERNS, PATTERN_BY_ID, type PatternDefinition } from '../../config/patterns';
import { evaluateGrid, GRID_SIZE, matchInstance, placePattern } from '../patterns';
import { unlockedPatterns } from '../probability';
import { FILLER, grid, on } from './helpers';

const ids = (g: ReturnType<typeof grid>, patterns = PATTERNS) => evaluateGrid(g, patterns).map((m) => m.patternId).sort();

describe('pattern catalogue', () => {
  it('has the required 22 patterns, all valid on a 5×3 grid', () => {
    expect(PATTERNS).toHaveLength(22);
    expect(new Set(PATTERNS.map((p) => p.id)).size).toBe(22);
    for (const p of PATTERNS) {
      const n = p.shapes[0].length;
      expect(p.shapes.every((s) => s.length === n)).toBe(true);
      const placements = placePattern(p);
      expect(placements.length).toBeGreaterThan(0);
      for (const inst of placements) {
        expect(new Set(inst.cells).size).toBe(n);
        expect(inst.cells.every((c) => c >= 0 && c < GRID_SIZE)).toBe(true);
      }
    }
  });

  it('slides each shape into every position it fits', () => {
    const count = (id: string) => placePattern(PATTERN_BY_ID[id]).length;
    expect(count('h3')).toBe(9);
    expect(count('h4')).toBe(6);
    expect(count('h5')).toBe(3);
    expect(count('v3')).toBe(5);
    expect(count('diagDown')).toBe(3);
    expect(count('square')).toBe(8);
    expect(count('largeSquare')).toBe(3);
    expect(count('extDiagonal')).toBe(2);
    expect(count('fullGrid')).toBe(1);
  });

  it('does not duplicate placements of symmetric multi-shape patterns', () => {
    const twin: PatternDefinition = { ...PATTERN_BY_ID.h3, id: 'twin', shapes: [PATTERN_BY_ID.h3.shapes[0], PATTERN_BY_ID.h3.shapes[0]] };
    expect(placePattern(twin)).toHaveLength(9);
  });
});

describe('evaluateGrid', () => {
  it('finds nothing on a grid with no repeats', () => {
    expect(evaluateGrid(grid(FILLER), PATTERNS)).toEqual([]);
  });

  it('matches horizontal 3', () => {
    const m = evaluateGrid(on('aaa..'), PATTERNS);
    expect(m).toHaveLength(1);
    expect(m[0]).toMatchObject({ patternId: 'h3', symbol: 'b10', cells: [0, 1, 2], wildCount: 0 });
  });

  it('pays a full row as Horizontal 5 only (smaller rows inside it are not paid again)', () => {
    expect(ids(on('aaaaa'))).toEqual(['h5']);
    expect(ids(on('.bbbb'))).toEqual(['h4']);
  });

  it('matches vertical and both diagonals', () => {
    expect(ids(on('....H/....H/....H'))).toEqual(['v3']);
    expect(ids(on('G..../.G.../..G..'))).toEqual(['diagDown']);
    expect(ids(on('..b../.b.../b....'))).toEqual(['diagUp']);
  });

  it('matches L shapes (and does not also pay the column inside them)', () => {
    expect(ids(on('c..../c..../cc...'))).toEqual(['lShape']);
    expect(ids(on('....T/....T/...TT'))).toEqual(['reverseL']);
  });

  it('matches squares and complex shapes', () => {
    expect(ids(on('.EE../.EE..'))).toEqual(['square']);
    expect(ids(on('HHH../.H.../.H...'))).toEqual(['tShape']);
    expect(ids(on('.H.../HHH../.H...'))).toEqual(['cross']);
    expect(ids(on('a...a/.a.a./..a..'))).toEqual(['vShape']);
    expect(ids(on('aaa../.a.../aaa..'))).toEqual(['hourglass']);
    expect(ids(on('aaa../a.a../aaa..'))).toEqual(['frame']);
    expect(ids(on('aaa../aaa../aaa..'))).toEqual(['largeSquare']);
    expect(ids(on('aaaaa/a...a/a...a'))).toEqual(['arch']);
  });

  it('matches the full grid as a single pattern', () => {
    expect(ids(grid('aaaaa/aaaaa/aaaaa'))).toEqual(['fullGrid']);
  });

  it('finds multiple separate patterns in one spin', () => {
    // b10 row on top-left and a Silver column on the right.
    const g = on('aaa.S/....S/....S');
    const found = evaluateGrid(g, PATTERNS).map((m) => [m.patternId, m.symbol]);
    expect(found).toContainEqual(['h3', 'b10']);
    expect(found).toContainEqual(['v3', 's100']);
    expect(found).toHaveLength(2);
  });

  it('pays partially overlapping patterns separately', () => {
    // Row (0,1,2) and column (2,7,12) share cell 2.
    const m = evaluateGrid(on('aaa../..a../..a..'), PATTERNS);
    expect(m.map((x) => x.patternId).sort()).toEqual(['h3', 'v3']);
    expect(m.find((x) => x.patternId === 'h3')!.cells).toContain(2);
    expect(m.find((x) => x.patternId === 'v3')!.cells).toContain(2);
  });

  it('lets Wilds complete patterns and records which coin they stood in for', () => {
    const m = evaluateGrid(on('aWa..'), PATTERNS);
    expect(m).toEqual([expect.objectContaining({ patternId: 'h3', symbol: 'b10', wildCount: 1 })]);
  });

  it('lets one Wild complete patterns for two different coins', () => {
    const m = evaluateGrid(on('aaWbb'), PATTERNS);
    expect(m.map((x) => x.symbol).sort()).toEqual(['b10', 'b20']);
  });

  it('pays all-Wild patterns as Wild, but not when a bigger coin win covers them', () => {
    // Platinum neighbours can't be substituted, so this row is a lone all-Wild Horizontal 3.
    expect(evaluateGrid(on('WWWPP'), PATTERNS)).toEqual([expect.objectContaining({ patternId: 'h3', symbol: 'wild', wildCount: 3 })]);
    expect(evaluateGrid(on('WWWaa'), PATTERNS)).toEqual([expect.objectContaining({ patternId: 'h5', symbol: 'b10', wildCount: 3 })]);
  });

  it('never lets Wild stand in for Platinum', () => {
    expect(matchInstance(on('PWP..'), [0, 1, 2])).toBeNull();
    expect(evaluateGrid(on('PWP..'), PATTERNS)).toEqual([]);
  });

  it('respects configurable wild rules', () => {
    expect(matchInstance(on('aWa..'), [0, 1, 2], { substitutes: false, allWildPays: true })).toBeNull();
    expect(matchInstance(on('WWW..'), [0, 1, 2], { substitutes: true, allWildPays: false })).toBeNull();
  });

  it('only pays one of two patterns with identical cells (the higher multiplier)', () => {
    const low: PatternDefinition = { ...PATTERN_BY_ID.h3, id: 'low', multiplier: 1 };
    const high: PatternDefinition = { ...PATTERN_BY_ID.h3, id: 'high', multiplier: 2 };
    expect(evaluateGrid(on('aaa..'), [low, high]).map((m) => m.patternId)).toEqual(['high']);
  });

  it('ignores locked patterns', () => {
    expect(ids(on('.EE../.EE..'), unlockedPatterns(1))).toEqual([]);
    expect(ids(on('.EE../.EE..'), unlockedPatterns(3))).toEqual(['square']);
  });

  it('rejects malformed grids', () => {
    expect(() => evaluateGrid(['b10', 'b10'], PATTERNS)).toThrow();
  });
});
