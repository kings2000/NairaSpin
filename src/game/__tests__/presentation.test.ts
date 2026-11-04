import { describe, expect, it } from 'vitest';
import { revealSchedule, revealStageAt, spinSchedule } from '../../components/spinSchedule';
import { CARD_BY_ID } from '../../config/cards';
import { SPIN_TIMING } from '../../config/economy';
import { UPGRADE_BY_ID } from '../../config/upgrades';
import { describeEffect } from '../describe';
import { resolveGrid } from '../spin';
import { grid, on, stateWith, unlockAll } from './helpers';

describe('describeEffect', () => {
  it('describes effects from their data at a given level', () => {
    expect(describeEffect(CARD_BY_ID.nairaCollector.effects[0], 1)).toBe('+20% on Bronze coins');
    expect(describeEffect(CARD_BY_ID.nairaCollector.effects[0], 3)).toBe('+40% on Bronze coins');
    expect(describeEffect(CARD_BY_ID.moneyMagnet.effects[0], 1, 'b20')).toBe('Bronze ₦20 appears 50% more often');
    expect(describeEffect(CARD_BY_ID.bigSpender.effects[0], 1)).toBe('+40% on patterns of 5+ coins');
    expect(describeEffect(UPGRADE_BY_ID['machine:luck'].effects[1], 2)).toBe('Bronze coins appear 8% less often');
  });
});

describe('spinSchedule', () => {
  it('staggers columns and lingers on columns holding rare coins', () => {
    const plain = spinSchedule(grid('abcab/bcabc/cabca'), false);
    expect(plain.columnStops).toEqual([0, 1, 2, 3, 4].map((c) => SPIN_TIMING.firstStopMs + c * SPIN_TIMING.stepMs));
    const rare = spinSchedule(grid('aHcab/bcabc/cabcP'), false); // H = 1,000 coin (legendary)
    expect(rare.rareColumns).toEqual([false, true, false, false, true]);
    expect(rare.columnStops[1] - plain.columnStops[1]).toBe(SPIN_TIMING.rareDelayMs);
    expect(rare.settleMs).toBeGreaterThan(rare.columnStops[4]);
  });

  it('is fast under reduced motion', () => {
    expect(spinSchedule(grid('aHcab/bcabc/cabcP'), true).settleMs).toBeLessThan(400);
  });
});

describe('reveal timeline', () => {
  const base = unlockAll(stateWith());
  const win = resolveGrid(base, on('aaa.S/....S/....S')); // two patterns
  const miss = resolveGrid(base, on('.....'));

  it('spotlights each pattern, then shows TOTAL, then credits', () => {
    const r = revealSchedule(win);
    expect(r.steps).toBe(2);
    const totalAt = 2 * SPIN_TIMING.showcaseMs + SPIN_TIMING.beforeTotalMs;
    expect(r.totalAtMs).toBe(totalAt);
    expect(r.creditAfterMs).toBe(totalAt + SPIN_TIMING.totalMs);
    expect(revealStageAt(r, 0)).toEqual({ stage: 'patterns', focus: 0 });
    expect(revealStageAt(r, SPIN_TIMING.showcaseMs + 1)).toEqual({ stage: 'patterns', focus: 1 });
    // the last pattern stays up during the pause before TOTAL
    expect(revealStageAt(r, 2 * SPIN_TIMING.showcaseMs + 1)).toEqual({ stage: 'patterns', focus: 1 });
    expect(revealStageAt(r, totalAt + 1)).toEqual({ stage: 'total' });
    expect(revealStageAt(r, r.creditAfterMs)).toEqual({ stage: 'done' });
  });

  it('credits straight away when nothing is won', () => {
    expect(revealSchedule(miss).creditAfterMs).toBe(0);
  });
});
