// Information panels shown beside the board on wide screens and in collapsible sections
// on phones: coins & chances, pattern catalogue and active cards/charms.
import { Lock } from 'lucide-react';
import { CARD_BY_ID, CHARM_BY_ID } from '../config/cards';
import { COINS } from '../config/coins';
import { FAMILY_LABEL, PATTERNS } from '../config/patterns';
import { cardSlots } from '../game/cards';
import { describeEffect } from '../game/describe';
import { activeEffects } from '../game/effects';
import { getCoinProbabilities } from '../game/probability';
import { coinValue, patternMultiplier } from '../game/rewards';
import type { CharmId } from '../game/types';
import { useGameStore } from '../store/gameStore';
import { ArtTile } from './collectibles/ArtTile';
import { CoinArtwork } from './collectibles/CoinArtwork';
import { RarityIndicator } from './collectibles/RarityIndicator';
import { PatternPreview } from './PatternPreview';

const fmt = (n: number) => (Number.isInteger(n) ? n.toLocaleString() : (+n.toFixed(1)).toString());

export function CoinPanel() {
  const game = useGameStore((s) => s.game);
  const probs = getCoinProbabilities(game);
  const effects = activeEffects(game);
  return (
    <ul className="coin-list">
      {COINS.map((c) => (
        <li key={c.id} className="coin-row">
          <CoinArtwork id={c.id} size={44} />
          <div className="coin-row__info">
            <strong>{c.name}</strong>
            <RarityIndicator rarity={c.rarity} />
          </div>
          <div className="coin-row__stats">
            <span className="coin-row__value">{fmt(coinValue(effects, c.id))} pts</span>
            <span className="muted">{((probs[c.id] ?? 0) * 100).toFixed(1)}%</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function PatternPanel({ compact = false }: { compact?: boolean }) {
  const game = useGameStore((s) => s.game);
  const outcome = useGameStore((s) => s.outcome);
  const phase = useGameStore((s) => s.spinPhase);
  const counts = game.stats.patternCounts;
  const effects = activeEffects(game);
  const hit = new Set(phase === 'result' ? outcome?.reward.matches.map((m) => m.match.patternId) : []);

  return (
    <ul className="pattern-list">
      {PATTERNS.map((p) => {
        const unlocked = p.unlockLevel <= game.level;
        return (
          <li key={p.id} className={`pattern-row ${unlocked ? '' : 'is-locked'} ${hit.has(p.id) ? 'is-hit' : ''}`}>
            <PatternPreview patternId={p.id} />
            <div className="pattern-row__info">
              <strong>{p.name}</strong>
              <span className="muted small">
                {unlocked ? (
                  <>
                    {p.shapes[0].length} coins · {FAMILY_LABEL[p.family]}
                    {!compact && ` · ${p.description}`}
                    {counts[p.id] ? ` · hit ${counts[p.id]}×` : ''}
                  </>
                ) : (
                  <>
                    <Lock size={11} /> Unlocks at level {p.unlockLevel}
                  </>
                )}
              </span>
            </div>
            <span className="pattern-row__mult">×{+patternMultiplier(effects, p).toFixed(2)}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function ActivePanel() {
  const game = useGameStore((s) => s.game);
  const outcome = useGameStore((s) => s.outcome);
  const phase = useGameStore((s) => s.spinPhase);
  const credited = useGameStore((s) => s.credited);
  const spinId = useGameStore((s) => s.spinId);
  const setTab = useGameStore((s) => s.setTab);
  // Cards flash once the payout lands, so the activation lines up with the reward.
  const activated = new Set(phase === 'result' && credited ? outcome?.reward.activated : []);
  const slots = cardSlots(game.level);
  const charms = (Object.entries(game.charms) as [CharmId, number][]).filter(([, n]) => n > 0);

  return (
    <div className="active-panel">
      {game.equippedCards.map((id) => {
        const def = CARD_BY_ID[id];
        const card = game.cards[id];
        const on = activated.has(def.name);
        return (
          <div key={`${id}-${on ? spinId : 0}`} className={`active-card rarity-${def.rarity} ${on ? 'is-activated' : ''}`}>
            <ArtTile art={def.art} className="active-card__art" />
            <div className="active-card__info">
              <strong>
                {def.name} <span className="muted">Lv {card.level}</span>
              </strong>
              <span className="small">{describeEffect(def.effects[0], card.level, card.targetCoin)}</span>
            </div>
            <span className="active-card__dur">Equipped</span>
          </div>
        );
      })}
      {slots > game.equippedCards.length && (
        <button className="active-card active-card--empty" onClick={() => setTab('cards')}>
          {slots - game.equippedCards.length} empty card slot{slots - game.equippedCards.length > 1 ? 's' : ''} · Tap to equip
        </button>
      )}
      {charms.map(([id, n]) => {
        const def = CHARM_BY_ID[id];
        const on = activated.has(def.name);
        return (
          <div key={`${id}-${on ? spinId : 0}`} className={`active-card active-card--charm ${on ? 'is-activated' : ''}`}>
            <ArtTile art={def.art} className="active-card__art" />
            <div className="active-card__info">
              <strong>{def.name}</strong>
              <span className="small">{def.description}</span>
            </div>
            <span className="active-card__dur">{n} spins</span>
          </div>
        );
      })}
    </div>
  );
}
