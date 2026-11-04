// Card & charm management: unlock requirements, slots, equipping, upgrading, buying charms.
import { CARD_BY_ID, CARD_SLOT_LEVELS, CHARM_BY_ID } from '../config/cards';
import { COIN_BY_ID, COIN_IDS, TIERS } from '../config/coins';
import { targetIncludes } from './effects';
import type { CardId, CharmId, CoinId, GameState, Requirement } from './types';

export function tierMatches(state: GameState, tier: string): number {
  return COIN_IDS.filter((id) => COIN_BY_ID[id].tier === tier).reduce((s, id) => s + (state.stats.coinsMatched[id] ?? 0), 0);
}

export function requirementMet(req: Requirement, state: GameState): boolean {
  switch (req.type) {
    case 'level':
      return state.level >= req.level;
    case 'stat':
      return state.stats[req.stat] >= req.min;
    case 'tierMatches':
      return tierMatches(state, req.tier) >= req.min;
  }
}

export function requirementText(req: Requirement): string {
  switch (req.type) {
    case 'level':
      return `Reach level ${req.level}`;
    case 'stat':
      return req.label;
    case 'tierMatches':
      return `Match ${req.min} ${TIERS[req.tier].name} coins`;
  }
}

export function cardSlots(level: number): number {
  return CARD_SLOT_LEVELS.filter((l) => level >= l).length;
}

export function nextSlotLevel(level: number): number | null {
  return CARD_SLOT_LEVELS.find((l) => l > level) ?? null;
}

export function cardUpgradeCost(id: CardId, level: number): number {
  const c = CARD_BY_ID[id].upgradeCost;
  return Math.round(c.base * Math.pow(c.growth, level - 1));
}

export function canUpgradeCard(state: GameState, id: CardId): boolean {
  const c = state.cards[id];
  return c.unlocked && c.level < CARD_BY_ID[id].maxLevel && state.balance >= cardUpgradeCost(id, c.level);
}

export function upgradeCard(state: GameState, id: CardId): GameState {
  if (!canUpgradeCard(state, id)) return state;
  const c = state.cards[id];
  return {
    ...state,
    balance: state.balance - cardUpgradeCost(id, c.level),
    cards: { ...state.cards, [id]: { ...c, level: c.level + 1 } },
    stats: { ...state.stats, upgradesBought: state.stats.upgradesBought + 1 },
  };
}

/** Coins the player may pick for a selectable card. */
export function selectableCoins(state: GameState, id: CardId): CoinId[] {
  const sel = CARD_BY_ID[id].selectable;
  return sel ? COIN_IDS.filter((c) => state.coinUnlocks[c] && targetIncludes(sel, c)) : [];
}

export function setCardTarget(state: GameState, id: CardId, coin: CoinId): GameState {
  if (!selectableCoins(state, id).includes(coin)) return state;
  return { ...state, cards: { ...state.cards, [id]: { ...state.cards[id], targetCoin: coin } } };
}

export function equipCard(state: GameState, id: CardId): GameState {
  const card = state.cards[id];
  // Stack rule 'unique': a card can only be in one slot.
  if (!card.unlocked || state.equippedCards.includes(id)) return state;
  if (state.equippedCards.length >= cardSlots(state.level)) return state;
  let next: GameState = { ...state, equippedCards: [...state.equippedCards, id] };
  const options = selectableCoins(next, id);
  if (options.length && !(card.targetCoin && options.includes(card.targetCoin))) next = setCardTarget(next, id, options[0]);
  return next;
}

export function unequipCard(state: GameState, id: CardId): GameState {
  return { ...state, equippedCards: state.equippedCards.filter((c) => c !== id) };
}

// ---- Charms ----------------------------------------------------------------------------

export function charmCost(state: GameState, id: CharmId): number {
  return Math.round(CHARM_BY_ID[id].cost(state.level));
}

export function canBuyCharm(state: GameState, id: CharmId): boolean {
  return state.level >= CHARM_BY_ID[id].unlockLevel && state.balance >= charmCost(state, id);
}

/** Stack rule 'refresh': buying an active charm resets its duration, it never stacks. */
export function buyCharm(state: GameState, id: CharmId): GameState {
  if (!canBuyCharm(state, id)) return state;
  return {
    ...state,
    balance: state.balance - charmCost(state, id),
    charms: { ...state.charms, [id]: CHARM_BY_ID[id].durationSpins },
    stats: { ...state.stats, charmsUsed: state.stats.charmsUsed + 1 },
  };
}

export function tickCharms(charms: GameState['charms']): GameState['charms'] {
  return Object.fromEntries(Object.entries(charms).map(([k, v]) => [k, Math.max(0, v - 1)])) as GameState['charms'];
}
