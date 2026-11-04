import { Lock } from 'lucide-react';
import { useState } from 'react';
import { CARD_BY_ID, CARDS, CHARMS } from '../config/cards';
import { COIN_BY_ID } from '../config/coins';
import { ArtTile } from '../components/collectibles/ArtTile';
import { GameCard } from '../components/GameCard';
import { Modal } from '../components/Modal';
import { Points } from '../components/Points';
import { canBuyCharm, canUpgradeCard, cardSlots, cardUpgradeCost, charmCost, nextSlotLevel, requirementText, selectableCoins } from '../game/cards';
import { describeEffect } from '../game/describe';
import type { CardId } from '../game/types';
import { useGameStore } from '../store/gameStore';

export function CardsScreen() {
  const game = useGameStore((s) => s.game);
  const buyCharm = useGameStore((s) => s.buyCharm);
  const [selected, setSelected] = useState<CardId | null>(null);
  const slots = cardSlots(game.level);
  const nextSlot = nextSlotLevel(game.level);

  return (
    <div className="screen">
      <section className="loadout">
        <div className="loadout__head">
          <h2 className="screen__title">Your loadout</h2>
          <span className="muted small">
            {game.equippedCards.length}/{slots} slots{nextSlot ? ` · next slot at level ${nextSlot}` : ''}
          </span>
        </div>
        <div className="loadout__slots">
          {Array.from({ length: slots }, (_, i) => {
            const id = game.equippedCards[i];
            const card = id ? CARD_BY_ID[id] : null;
            return card ? (
              <button key={i} className={`slot rarity-${card.rarity}`} onClick={() => setSelected(card.id)}>
                <ArtTile art={card.art} />
                <span>{card.name}</span>
              </button>
            ) : (
              <div key={i} className="slot slot--empty">
                <span>+</span>Empty
              </div>
            );
          })}
        </div>
        <p className="muted small">
          Synergies: Golden Fortune + Big Spender for big gold shapes, or Wild Fortune + Pattern Expert for multi-pattern
          spins.
        </p>
      </section>

      <h2 className="screen__title">Cards</h2>
      <div className="card-grid">
        {CARDS.map((card) => (
          <GameCard
            key={card.id}
            card={card}
            progress={game.cards[card.id]}
            equipped={game.equippedCards.includes(card.id)}
            onClick={() => setSelected(card.id)}
          />
        ))}
      </div>

      <h2 className="screen__title">Charms</h2>
      <p className="muted small">Short boosts bought with points. Buying an active charm refreshes it; charms don’t stack.</p>
      <div className="charm-grid">
        {CHARMS.map((c) => {
          const locked = game.level < c.unlockLevel;
          const left = game.charms[c.id];
          return (
            <div key={c.id} className={`charm ${locked ? 'is-locked' : ''} ${left > 0 ? 'is-active' : ''}`}>
              <ArtTile art={c.art} className="charm__art" />
              <div className="charm__info">
                <strong>{c.name}</strong>
                <span className="muted small">
                  {c.description} {c.durationSpins} spins.
                </span>
                {left > 0 && (
                  <span className="charm__left">
                    <span className="charm__bar" style={{ width: `${(left / c.durationSpins) * 100}%` }} />
                    {left} spins left
                  </span>
                )}
              </div>
              <button className="btn btn--buy" disabled={locked || !canBuyCharm(game, c.id)} onClick={() => buyCharm(c.id)}>
                {locked ? (
                  <>
                    <Lock size={12} /> Lv {c.unlockLevel}
                  </>
                ) : (
                  <>
                    {left > 0 ? 'Refresh ' : ''}
                    <Points value={charmCost(game, c.id)} />
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {selected && <CardDetail cardId={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function CardDetail({ cardId, onClose }: { cardId: CardId; onClose: () => void }) {
  const game = useGameStore((s) => s.game);
  const { equip, unequip, upgradeCard, setCardTarget } = useGameStore.getState();
  const card = CARD_BY_ID[cardId];
  const p = game.cards[cardId];
  const equipped = game.equippedCards.includes(cardId);
  const slotsFull = game.equippedCards.length >= cardSlots(game.level);
  const maxed = p.level >= card.maxLevel;
  const options = selectableCoins(game, cardId);

  return (
    <Modal title={card.name} onClose={onClose}>
      <GameCard card={card} progress={p} equipped={equipped} large />

      {!p.unlocked ? (
        <p className="locked-note">
          <Lock size={14} /> {requirementText(card.unlock)}
        </p>
      ) : (
        <>
          <div className="effect-box">
            <div>
              <span className="muted small">Now · level {p.level}</span>
              {card.effects.map((e, i) => (
                <strong key={i}>{describeEffect(e, p.level, p.targetCoin)}</strong>
              ))}
            </div>
            {!maxed && (
              <div>
                <span className="muted small">Next level</span>
                {card.effects.map((e, i) => (
                  <strong key={i} className="text-green">
                    {describeEffect(e, p.level + 1, p.targetCoin)}
                  </strong>
                ))}
              </div>
            )}
            <span className="muted small">Active while equipped · one copy per loadout</span>
          </div>

          {options.length > 0 && (
            <label className="setting-row">
              <span>Target coin</span>
              <select value={p.targetCoin ?? ''} onChange={(e) => setCardTarget(cardId, e.target.value as (typeof options)[number])}>
                <option value="" disabled>
                  Choose…
                </option>
                {options.map((c) => (
                  <option key={c} value={c}>
                    {COIN_BY_ID[c].name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="row-gap">
            {equipped ? (
              <button className="btn btn--ghost" onClick={() => unequip(cardId)}>
                Unequip
              </button>
            ) : (
              <button className="btn btn--green" onClick={() => equip(cardId)} disabled={slotsFull}>
                {slotsFull ? 'Slots full' : 'Equip'}
              </button>
            )}
            <button className="btn btn--gold" onClick={() => upgradeCard(cardId)} disabled={maxed || !canUpgradeCard(game, cardId)}>
              {maxed ? 'Max level' : <>Upgrade <Points value={cardUpgradeCost(cardId, p.level)} /></>}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
