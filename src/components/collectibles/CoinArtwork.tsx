import { memo } from 'react';
import { COIN_ART, EMBLEM_ART } from '../../assets/collectibles';
import type { EmblemName } from '../../config/cards';
import { COIN_BY_ID } from '../../config/coins';
import type { CoinId } from '../../game/types';

/** The illustrated artwork for a coin. Purely an image: states live in CollectibleSymbol. */
export const CoinArtwork = memo(function CoinArtwork({
  id,
  size,
  className = '',
}: {
  id: CoinId;
  size?: number;
  className?: string;
}) {
  return (
    <img
      src={COIN_ART[id]}
      alt={COIN_BY_ID[id].name}
      width={size}
      height={size}
      className={`coin-artwork ${className}`}
      draggable={false}
      decoding="async"
    />
  );
});

/** Illustrated emblem used by cards, charms and upgrades. */
export function EmblemArtwork({ name, size, className = '' }: { name: EmblemName; size?: number; className?: string }) {
  return <img src={EMBLEM_ART[name]} alt="" width={size} height={size} className={`coin-artwork ${className}`} draggable={false} />;
}
