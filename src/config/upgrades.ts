// Upgrade catalogue. Coin Chance/Value upgrades are generated from the coin list; pattern and
// machine upgrades are listed by hand. Every upgrade is just effects + a cost curve.
import type { Effect } from '../game/types';
import type { ArtRef } from './cards';
import { COINS, TIERS } from './coins';

export type UpgradeCategory = 'coinChance' | 'coinValue' | 'pattern' | 'machine';

export interface UpgradeDefinition {
  id: string;
  name: string;
  description: string;
  category: UpgradeCategory;
  maxLevel: number;
  cost: { base: number; growth: number };
  unlockLevel: number;
  /** Effects use Scale with base = per-level step, so strength = step × level. */
  effects: Effect[];
  coinId?: string;
  /** Artwork; coin upgrades use their coin. */
  art?: ArtRef;
}

const step = (perLevel: number) => ({ base: perLevel, perLevel });

const coinUpgrades: UpgradeDefinition[] = COINS.flatMap((c) => [
  {
    id: `chance:${c.id}`,
    name: `${c.name} Chance`,
    description: `${c.name} appears more often.`,
    category: 'coinChance' as const,
    maxLevel: 10,
    cost: { base: c.costBase, growth: 1.6 },
    unlockLevel: c.unlockLevel,
    effects: [{ type: 'weight' as const, target: { coins: [c.id] }, amount: step(0.2) }],
    coinId: c.id,
  },
  {
    id: `value:${c.id}`,
    name: `${c.name} Value`,
    description: `${c.name} is worth more per matched coin.`,
    category: 'coinValue' as const,
    maxLevel: 10,
    cost: { base: Math.round(c.costBase * 1.2), growth: 1.55 },
    unlockLevel: c.unlockLevel,
    effects: [{ type: 'coinValue' as const, target: { coins: [c.id] }, amount: step(TIERS[c.tier].valueStep) }],
    coinId: c.id,
  },
]);

export const UPGRADES: UpgradeDefinition[] = [
  ...coinUpgrades,
  {
    id: 'pattern:horizontal',
    art: { pattern: 'h5' },
    name: 'Row Runner',
    description: 'Horizontal pattern multipliers +12% per level.',
    category: 'pattern',
    maxLevel: 8,
    cost: { base: 360, growth: 1.7 },
    unlockLevel: 2,
    effects: [{ type: 'patternMult', families: ['horizontal'], amount: step(0.12) }],
  },
  {
    id: 'pattern:vertical',
    art: { pattern: 'v3' },
    name: 'Column Climber',
    description: 'Vertical pattern multipliers +15% per level.',
    category: 'pattern',
    maxLevel: 8,
    cost: { base: 360, growth: 1.7 },
    unlockLevel: 2,
    effects: [{ type: 'patternMult', families: ['vertical'], amount: step(0.15) }],
  },
  {
    id: 'pattern:diagonal',
    art: { pattern: 'diagDown' },
    name: 'Slant Specialist',
    description: 'Diagonal and V pattern multipliers +15% per level.',
    category: 'pattern',
    maxLevel: 8,
    cost: { base: 480, growth: 1.7 },
    unlockLevel: 3,
    effects: [{ type: 'patternMult', families: ['diagonal'], amount: step(0.15) }],
  },
  {
    id: 'pattern:shape',
    art: { pattern: 'tShape' },
    name: 'Shape Sculptor',
    description: 'Shape and Grand pattern multipliers +15% per level.',
    category: 'pattern',
    maxLevel: 8,
    cost: { base: 660, growth: 1.75 },
    unlockLevel: 4,
    effects: [{ type: 'patternMult', families: ['shape', 'grand'], amount: step(0.15) }],
  },
  {
    id: 'machine:booster',
    art: { emblem: 'bolt' },
    name: 'Reward Booster',
    description: 'Every spin pays 5% more per level.',
    category: 'machine',
    maxLevel: 10,
    cost: { base: 1500, growth: 1.8 },
    unlockLevel: 3,
    effects: [{ type: 'global', amount: step(0.05) }],
  },
  {
    id: 'machine:luck',
    art: { emblem: 'clover' },
    name: 'Lucky Machine',
    description:
      'Trade-off: Silver and better coins +8% chance per level, Bronze −4%. Fewer matches, but they are worth more.',
    category: 'machine',
    maxLevel: 5,
    cost: { base: 2400, growth: 2 },
    unlockLevel: 5,
    effects: [
      { type: 'weight', target: { tiers: ['silver', 'gold', 'emerald', 'platinum'] }, amount: step(0.08) },
      { type: 'weight', target: { tiers: ['bronze'] }, amount: step(-0.04) },
    ],
  },
  {
    id: 'machine:vault',
    art: { emblem: 'vault' },
    name: 'Coin Vault',
    description: 'Earn 50% more while away and store 1 extra hour per level.',
    category: 'machine',
    maxLevel: 5,
    cost: { base: 1200, growth: 2 },
    unlockLevel: 2,
    effects: [
      { type: 'offlineRate', amount: step(0.5) },
      { type: 'offlineCap', amount: step(1) },
    ],
  },
];

export const UPGRADE_BY_ID = Object.fromEntries(UPGRADES.map((u) => [u.id, u])) as Record<string, UpgradeDefinition>;
