import { Lock } from 'lucide-react';
import type { CardDefinition } from '../config/cards';
import { requirementText } from '../game/cards';
import type { CardProgress } from '../game/types';
import { ArtTile } from './collectibles/ArtTile';
import { RarityIndicator } from './collectibles/RarityIndicator';

/** A collectible card: artwork panel on a rarity backdrop, name, rarity, text and level. */
export function GameCard({
  card,
  progress,
  equipped = false,
  large = false,
  onClick,
}: {
  card: CardDefinition;
  progress: CardProgress;
  equipped?: boolean;
  large?: boolean;
  onClick?: () => void;
}) {
  const Tag = onClick ? 'button' : 'div';
  const locked = !progress.unlocked;
  return (
    <Tag
      className={`game-card rarity-${card.rarity} ${locked ? 'is-locked' : ''} ${equipped ? 'is-equipped' : ''} ${large ? 'game-card--large' : ''}`}
      onClick={onClick}
    >
      <div className="game-card__art">
        <ArtTile art={card.art} />
        {locked && (
          <span className="game-card__lock" aria-hidden>
            <Lock size={large ? 22 : 16} />
          </span>
        )}
        {equipped && <span className="game-card__badge">Equipped</span>}
      </div>
      <div className="game-card__body">
        <div className="game-card__name">{card.name}</div>
        <RarityIndicator rarity={card.rarity} />
        <p className="game-card__desc">{locked ? requirementText(card.unlock) : card.description}</p>
        {!locked && (
          <div className="game-card__level" aria-label={`Level ${progress.level} of ${card.maxLevel}`}>
            {Array.from({ length: card.maxLevel }, (_, i) => (
              <i key={i} className={i < progress.level ? 'on' : ''} />
            ))}
          </div>
        )}
      </div>
    </Tag>
  );
}
