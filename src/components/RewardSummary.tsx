import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { WinTier } from '../game/types';
import { useGameStore } from '../store/gameStore';
import { BonusChip, PatternResultCard } from './PatternResultCard';

const TIER_TEXT: Record<WinTier, string> = {
  none: 'No pattern this time',
  small: 'Nice win',
  medium: 'Great combo!',
  large: 'Huge win!',
  jackpot: 'Jackpot!',
};

/** Counts up from 0 to `value` once per mount. */
function CountUp({ value, reduced }: { value: number; reduced: boolean }) {
  const [v, setV] = useState(reduced ? value : 0);
  const raf = useRef(0);
  useEffect(() => {
    if (reduced) return setV(value);
    const start = performance.now();
    const dur = Math.min(1200, 450 + value / 30);
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / dur);
      setV(Math.round(value * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value, reduced]);
  return <>{v.toLocaleString()}</>;
}

/** The reward area under the board: title, big total and the per-pattern breakdown. */
export function RewardSummary() {
  const phase = useGameStore((s) => s.spinPhase);
  const outcome = useGameStore((s) => s.outcome);
  const spinId = useGameStore((s) => s.spinId);
  const reduced = useGameStore((s) => s.reducedMotion);
  const credited = useGameStore((s) => s.credited);
  const [open, setOpen] = useState(true);

  if (phase === 'idle' || !outcome) {
    return (
      <section className="reward reward--idle">
        <p>Every pattern on the board pays. Rarer coins are worth more.</p>
      </section>
    );
  }
  if (phase === 'spinning' || !credited) {
    const n = phase === 'spinning' ? 0 : outcome.reward.matches.length;
    return (
      <section className="reward reward--idle" aria-live="polite">
        <p>{phase === 'spinning' ? 'Spinning…' : n ? `Scoring ${n} pattern${n > 1 ? 's' : ''}…` : 'Scoring…'}</p>
      </section>
    );
  }

  const { reward, winTier } = outcome;
  const details = reward.matches.length + reward.specials.length + reward.spinBonuses.length > 0;

  return (
    <section className={`reward reward--${winTier}`} aria-live="polite" key={spinId}>
      <header className="reward__head">
        <div>
          <h2 className="reward__title">{TIER_TEXT[winTier]}</h2>
          {reward.matches.length > 0 && (
            <span className="reward__sub">
              {reward.matches.length} pattern{reward.matches.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="reward__total">{reward.total > 0 ? <>+<CountUp value={reward.total} reduced={reduced} /></> : '0'}</div>
      </header>

      {!details && <p className="muted small">Patterns need 3 or more of the same coin. Spin again!</p>}

      {details && (
        <>
          <button className="reward__toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
            Breakdown <ChevronDown size={16} className={open ? 'rot' : ''} />
          </button>
          {open && (
            <>
              <ul className="reward__list">
                {reward.matches.map((r, i) => (
                  <PatternResultCard key={r.match.key} reward={r} index={i} />
                ))}
              </ul>
              {(reward.spinBonuses.length > 0 || reward.specials.length > 0) && (
                <div className="reward__extras">
                  {reward.spinBonuses.map((b) => (
                    <BonusChip key={b.source} bonus={b} />
                  ))}
                  {reward.specials.map((s) => (
                    <span key={s.source} className={`special-chip ${s.jackpot ? 'is-jackpot' : ''}`}>
                      {s.source} +{s.amount.toLocaleString()}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
