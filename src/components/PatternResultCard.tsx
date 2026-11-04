import type { CSSProperties } from 'react';
import { CARD_BY_ID, CHARM_BY_ID } from '../config/cards';
import { COIN_BY_ID } from '../config/coins';
import { PATTERN_BY_ID } from '../config/patterns';
import type { Bonus, MatchReward } from '../game/types';
import { CoinArtwork } from './collectibles/CoinArtwork';
import { matchColor } from './GameBoard';
import { PatternPreview } from './PatternPreview';

const fmt = (n: number) => (Number.isInteger(n) ? n.toLocaleString() : (+n.toFixed(2)).toString());
const CARD_NAMES = new Set(Object.values(CARD_BY_ID).map((c) => c.name));
const CHARM_NAMES = new Set(Object.values(CHARM_BY_ID).map((c) => c.name));

/** A bonus chip, styled by where the bonus came from (card, charm or upgrade). */
export function BonusChip({ bonus }: { bonus: Bonus }) {
  const kind = CARD_NAMES.has(bonus.source) ? 'card' : CHARM_NAMES.has(bonus.source) ? 'charm' : 'upgrade';
  return (
    <span className={`bonus-chip bonus-chip--${kind}`}>
      <i aria-hidden />+{Math.round(bonus.pct * 100)}% {bonus.source}
    </span>
  );
}

/** One winning pattern in the reward breakdown. */
export function PatternResultCard({ reward, index }: { reward: MatchReward; index: number }) {
  const p = PATTERN_BY_ID[reward.match.patternId];
  const coin = COIN_BY_ID[reward.match.symbol];
  const n = reward.match.cells.length;
  return (
    <li className="result-card" style={{ '--hit': matchColor(index) } as CSSProperties}>
      <PatternPreview cells={reward.match.cells} size="md" />
      <div className="result-card__body">
        <div className="result-card__title">
          <strong>{p.name}</strong>
          <span className="result-card__mult">×{fmt(reward.patternMultiplier)}</span>
        </div>
        <div className="result-card__coins">
          <CoinArtwork id={reward.match.symbol} size={22} />
          {coin.name} × {n}
          {reward.match.wildCount > 0 && reward.match.symbol !== 'wild' && <span className="muted"> · {reward.match.wildCount} Wild</span>}
        </div>
        <div className="result-card__math">
          {fmt(reward.coinValue)} pts × {n} × {fmt(reward.patternMultiplier)} = {fmt(Math.round(reward.base))}
        </div>
        {reward.bonuses.length > 0 && (
          <div className="result-card__bonuses">
            {reward.bonuses.map((b) => (
              <BonusChip key={b.source} bonus={b} />
            ))}
          </div>
        )}
      </div>
      <div className="result-card__total">+{reward.total.toLocaleString()}</div>
    </li>
  );
}
