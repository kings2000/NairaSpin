import { useState } from 'react';
import { COINS } from '../config/coins';
import { CollectionCard } from '../components/CollectionCard';
import { PatternPanel } from '../components/Panels';
import { activeEffects } from '../game/effects';
import { getCoinProbabilities } from '../game/probability';
import { coinValue } from '../game/rewards';
import { collectedCoins } from '../game/statistics';
import { useGameStore } from '../store/gameStore';

export function CollectionScreen() {
  const [tab, setTab] = useState<'coins' | 'patterns'>('coins');
  return (
    <div className="screen">
      <div className="segmented segmented--wide" role="tablist">
        <button role="tab" aria-selected={tab === 'coins'} className={tab === 'coins' ? 'is-active' : ''} onClick={() => setTab('coins')}>
          Collectibles
        </button>
        <button role="tab" aria-selected={tab === 'patterns'} className={tab === 'patterns' ? 'is-active' : ''} onClick={() => setTab('patterns')}>
          Patterns
        </button>
      </div>
      {tab === 'coins' ? <Gallery /> : <PatternPanel />}
    </div>
  );
}

function Gallery() {
  const game = useGameStore((s) => s.game);
  const probs = getCoinProbabilities(game);
  const effects = activeEffects(game);
  const collected = new Set(collectedCoins(game.stats));
  const pct = (collected.size / COINS.length) * 100;

  return (
    <>
      <div className="collection-progress">
        <div>
          <h2 className="screen__title">Your collection</h2>
          <p className="muted small">Every collectible is on the reels from your first spin. Match one to add it here.</p>
        </div>
        <div className="collection-progress__count">
          <strong>{collected.size}</strong>/{COINS.length}
        </div>
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={COINS.length} aria-valuenow={collected.size}>
          <div style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="collection-grid">
        {COINS.map((c) => (
          <CollectionCard
            key={c.id}
            coin={c}
            collected={collected.has(c.id)}
            value={coinValue(effects, c.id)}
            chance={probs[c.id] ?? 0}
            matched={game.stats.coinsMatched[c.id]}
          />
        ))}
      </div>
      <p className="disclaimer">
        Collectibles are original designs inspired by Nigerian heritage, not legal tender. Points are fictional and have
        no cash value.
      </p>
    </>
  );
}
