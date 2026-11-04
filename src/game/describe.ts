// Human-readable text for effects, generated from the same data the engine uses, so card
// and upgrade descriptions can never drift from what they actually do.
import { COIN_BY_ID, TIERS } from '../config/coins';
import { FAMILY_LABEL } from '../config/patterns';
import { amountAt } from './effects';
import type { CoinId, CoinTarget, Effect } from './types';

const pct = (x: number) => `${Math.round(x * 100)}%`;

function targetText(t: CoinTarget | undefined, selected?: CoinId): string {
  if (!t) return 'all coins';
  if (t.selected) return selected ? COIN_BY_ID[selected].name : 'your chosen coin';
  const parts = [...(t.tiers ?? []).map((tier) => `${TIERS[tier].name}`), ...(t.coins ?? []).map((c) => COIN_BY_ID[c].name)];
  return parts.length ? `${parts.join(', ')}${t.tiers?.length ? ' coins' : ''}` : 'all coins';
}

export function describeEffect(e: Effect, level: number, selected?: CoinId): string {
  const a = 'amount' in e ? amountAt(e.amount, level) : 0;
  switch (e.type) {
    case 'weight': {
      const who = targetText(e.target, selected);
      const verb = who.endsWith('coins') ? 'appear' : 'appears';
      return a >= 0 ? `${who} ${verb} ${pct(a)} more often` : `${who} ${verb} ${pct(-a)} less often`;
    }
    case 'coinValue':
      return `${targetText(e.target, selected)} value +${pct(a)}`;
    case 'patternMult':
      return `${e.families.map((f) => FAMILY_LABEL[f]).join(' & ')} multipliers +${pct(a)}`;
    case 'matchBonus': {
      const conds = [
        e.target ? targetText(e.target, selected) : null,
        e.families ? `${e.families.map((f) => FAMILY_LABEL[f]).join(' & ')} patterns` : null,
        e.minCells ? `patterns of ${e.minCells}+ coins` : null,
        e.withWild ? 'patterns completed by a Wild' : null,
      ].filter(Boolean);
      return `+${pct(a)} on ${conds.join(', ') || 'every pattern'}`;
    }
    case 'multiPattern':
      return `+${pct(a)} to the whole spin for each extra pattern`;
    case 'streak':
      return `+${pct(a)} to the whole spin on a ${e.minStreak}+ win streak`;
    case 'global':
      return `+${pct(a)} on every winning spin`;
    case 'specialBonus':
      return `${e.coins.map((c) => COIN_BY_ID[c].name).join(', ')} special reward +${pct(a)}`;
    case 'offlineRate':
      return `+${pct(a)} offline earnings`;
    case 'offlineCap':
      return `+${a}h offline storage`;
  }
}
