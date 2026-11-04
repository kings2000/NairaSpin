import type { ArtRef } from '../../config/cards';
import { PatternPreview } from '../PatternPreview';
import { CoinArtwork, EmblemArtwork } from './CoinArtwork';

/** Renders the artwork for a card, charm or upgrade: a collectible, an emblem or a pattern. */
export function ArtTile({ art, className = '' }: { art: ArtRef; className?: string }) {
  return (
    <span className={`art-tile ${className}`} aria-hidden>
      {'coin' in art ? (
        <CoinArtwork id={art.coin} />
      ) : 'emblem' in art ? (
        <EmblemArtwork name={art.emblem} />
      ) : (
        <PatternPreview patternId={art.pattern} size="art" />
      )}
    </span>
  );
}
