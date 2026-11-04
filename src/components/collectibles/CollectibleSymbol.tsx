import { memo } from 'react';
import { isRareCoin } from '../../config/coins';
import type { CoinId } from '../../game/types';
import { CoinArtwork } from './CoinArtwork';

export type SymbolState = 'idle' | 'landing' | 'blur' | 'mystery';

/**
 * A collectible as it appears in play: the artwork plus presentation states
 * (gentle idle float, landing bounce, motion blur, mystery silhouette, rare sparkle).
 */
export const CollectibleSymbol = memo(function CollectibleSymbol({
  id,
  state = 'idle',
  delay = 0,
}: {
  id: CoinId;
  state?: SymbolState;
  /** Stagger for idle/landing animations, in ms. */
  delay?: number;
}) {
  const rare = isRareCoin(id) && state !== 'blur' && state !== 'mystery';
  return (
    <span className={`collectible collectible--${state} ${rare ? 'collectible--rare' : ''}`} style={{ animationDelay: `${delay}ms` }}>
      <CoinArtwork id={id} />
      {rare && <span className="collectible__sparkle" aria-hidden />}
    </span>
  );
});
