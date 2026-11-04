import { memo } from 'react';
import { GRID_COLS, GRID_ROWS } from '../config/economy';
import { PATTERN_BY_ID } from '../config/patterns';
import { placePattern } from '../game/patterns';

/** Mini 5×3 map of a pattern's first placement. */
function PatternPreviewImpl({ patternId, cells, size = 'sm' }: { patternId?: string; cells?: number[]; size?: 'sm' | 'md' | 'art' }) {
  const set = new Set(cells ?? placePattern(PATTERN_BY_ID[patternId!])[0].cells);
  return (
    <span className={`pattern-preview pattern-preview--${size}`} aria-hidden>
      {Array.from({ length: GRID_COLS * GRID_ROWS }, (_, i) => (
        <span key={i} className={set.has(i) ? 'on' : ''} />
      ))}
    </span>
  );
}

export const PatternPreview = memo(PatternPreviewImpl);
