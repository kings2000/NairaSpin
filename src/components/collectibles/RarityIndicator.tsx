import { RARITY_LABEL } from '../../config/coins';
import type { Rarity } from '../../game/types';

const PIPS: Record<Rarity, number> = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5, mythic: 6 };

/** Rarity as a coloured label plus pips, so it reads without relying on colour alone. */
export function RarityIndicator({ rarity, compact = false }: { rarity: Rarity; compact?: boolean }) {
  return (
    <span className={`rarity rarity--${rarity}`} aria-label={`${RARITY_LABEL[rarity]} rarity`}>
      <span className="rarity__pips" aria-hidden>
        {Array.from({ length: PIPS[rarity] }, (_, i) => (
          <i key={i} />
        ))}
      </span>
      {!compact && <span className="rarity__label">{RARITY_LABEL[rarity]}</span>}
    </span>
  );
}
