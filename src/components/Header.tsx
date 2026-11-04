import { Settings } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { PROGRESSION } from '../config/economy';
import { useGameStore } from '../store/gameStore';
import { AnimatedNumber } from './AnimatedNumber';

/** Top resource bar: level star with XP, balance slot and settings. */
export function Header() {
  const balance = useGameStore((s) => s.game.balance);
  const level = useGameStore((s) => s.game.level);
  const xp = useGameStore((s) => s.game.xp);
  const openSettings = useGameStore((s) => s.setSettingsOpen);
  const need = PROGRESSION.xpToNext(level);
  const pct = Math.min(100, (xp / need) * 100);

  // Floating "+N" whenever the balance goes up.
  const prev = useRef(balance);
  const [gain, setGain] = useState<{ n: number; k: number } | null>(null);
  useEffect(() => {
    if (balance > prev.current) setGain({ n: balance - prev.current, k: Date.now() });
    prev.current = balance;
  }, [balance]);

  return (
    <header className="header">
      <div className="header__inner">
        <div className="xp-slot" aria-label={`Level ${level}, ${xp} of ${need} XP`}>
          <span className="level-star">
            <svg viewBox="0 0 40 40" aria-hidden>
              <path d="M20 2l5.4 11 12.1 1.8-8.7 8.5 2 12L20 29.6 9.2 35.3l2-12-8.7-8.5 12.1-1.8z" />
            </svg>
            <span className="level-star__num">{level}</span>
          </span>
          <span className="xp-slot__bar">
            <span className="xp-slot__fill" style={{ width: `${pct}%` }} />
            <span className="xp-slot__text">
              {xp} / {need}
            </span>
          </span>
        </div>

        <div className="header__right">
          <div className="balance-pill" aria-label={`${balance} game points`}>
            <AnimatedNumber value={balance} />
            <span className="pts-icon" aria-hidden />
            {gain && (
              <span className="balance-gain" key={gain.k} aria-hidden>
                +{gain.n.toLocaleString()}
              </span>
            )}
          </div>
          <button className="icon-btn gear-btn" onClick={() => openSettings(true)} aria-label="Settings">
            <Settings size={22} strokeWidth={2.6} />
          </button>
        </div>
      </div>
    </header>
  );
}
