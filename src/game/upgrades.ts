import { UPGRADE_BY_ID, type UpgradeDefinition } from '../config/upgrades';
import type { CoinId, GameState } from './types';

export type UpgradeCheck =
  | { ok: true; cost: number }
  | { ok: false; reason: 'locked' | 'maxed' | 'funds'; cost: number };

export const upgradeLevel = (state: GameState, id: string) => state.upgrades[id] ?? 0;

export function upgradeCost(def: UpgradeDefinition, currentLevel: number): number {
  return Math.round(def.cost.base * Math.pow(def.cost.growth, currentLevel));
}

export function isUpgradeUnlocked(state: GameState, def: UpgradeDefinition): boolean {
  if (state.level < def.unlockLevel) return false;
  return def.coinId ? !!state.coinUnlocks[def.coinId as CoinId] : true;
}

export function canBuyUpgrade(state: GameState, id: string): UpgradeCheck {
  const def = UPGRADE_BY_ID[id];
  const level = upgradeLevel(state, id);
  const cost = def ? upgradeCost(def, level) : 0;
  if (!def || !isUpgradeUnlocked(state, def)) return { ok: false, reason: 'locked', cost };
  if (level >= def.maxLevel) return { ok: false, reason: 'maxed', cost };
  if (state.balance < cost) return { ok: false, reason: 'funds', cost };
  return { ok: true, cost };
}

/** Returns the new state, or the same object when the purchase is not allowed. */
export function buyUpgrade(state: GameState, id: string): GameState {
  const check = canBuyUpgrade(state, id);
  if (!check.ok) return state;
  return {
    ...state,
    balance: state.balance - check.cost,
    upgrades: { ...state.upgrades, [id]: upgradeLevel(state, id) + 1 },
    stats: { ...state.stats, upgradesBought: state.stats.upgradesBought + 1 },
  };
}
