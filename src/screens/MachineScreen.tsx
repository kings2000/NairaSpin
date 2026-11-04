import { Gift } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { unlockAudio } from '../audio/sound';
import { EmblemArtwork } from '../components/collectibles/CoinArtwork';
import { GameBoard } from '../components/GameBoard';
import { ActivePanel, CoinPanel, PatternPanel } from '../components/Panels';
import { RewardSummary } from '../components/RewardSummary';
import { canClaimDaily, dailyReward } from '../game/daily';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useGameStore } from '../store/gameStore';

export function MachineScreen() {
  const wide = useMediaQuery('(min-width: 1000px)');
  return (
    <div className="machine-layout">
      {wide && (
        <aside className="side">
          <Section title="Coins & chances">
            <CoinPanel />
          </Section>
        </aside>
      )}
      <section className="machine-col">
        <h1 className="brand-banner">
          NAIRA <span>SPIN</span>
        </h1>
        <Widgets />
        <GameBoard />
        <SpinButton />
        <RewardSummary />
        {!wide && (
          <div className="mobile-panels">
            <Collapsible title="Active cards & charms" defaultOpen>
              <ActivePanel />
            </Collapsible>
            <Collapsible title="Pattern catalogue">
              <PatternPanel compact />
            </Collapsible>
            <Collapsible title="Coins & chances">
              <CoinPanel />
            </Collapsible>
          </div>
        )}
      </section>
      {wide && (
        <aside className="side">
          <Section title="Active cards & charms">
            <ActivePanel />
          </Section>
          <Section title="Pattern catalogue">
            <PatternPanel />
          </Section>
        </aside>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="panel">
      <h2 className="panel__title">{title}</h2>
      {children}
    </section>
  );
}

function Collapsible({ title, children, defaultOpen }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details className="panel collapsible" open={defaultOpen}>
      <summary className="panel__title">{title}</summary>
      {children}
    </details>
  );
}

/** Daily gift and win streak as two compact widgets above the board. */
function Widgets() {
  const game = useGameStore((s) => s.game);
  const claimDaily = useGameStore((s) => s.claimDaily);
  const dailyReady = canClaimDaily(game, Date.now());
  const streak = game.stats.currentStreak;

  return (
    <div className="widgets">
      <button
        className={`widget widget--gift ${dailyReady ? 'is-ready' : ''}`}
        disabled={!dailyReady}
        onClick={() => {
          unlockAudio();
          claimDaily();
        }}
      >
        <span className="widget__icon">
          <Gift size={20} strokeWidth={2.2} />
        </span>
        <span className="widget__text">
          <span className="widget__label">Daily gift</span>
          <strong>{dailyReady ? `Claim +${dailyReward(game).coins.toLocaleString()}` : 'Come back tomorrow'}</strong>
        </span>
      </button>
      <div className={`widget widget--streak ${streak >= 2 ? 'is-hot' : ''}`}>
        <span className="widget__icon">
          <EmblemArtwork name="flame" />
        </span>
        <span className="widget__text">
          <span className="widget__label">Win streak</span>
          <strong>{streak > 0 ? `${streak} in a row` : 'Start one!'}</strong>
        </span>
      </div>
    </div>
  );
}

function SpinButton() {
  const phase = useGameStore((s) => s.spinPhase);
  const spin = useGameStore((s) => s.spin);
  const blocked = useGameStore((s) => s.settingsOpen || s.reveals.length > 0 || !!s.offlineReward);
  const spinning = phase === 'spinning';

  const go = () => {
    unlockAudio();
    spin();
  };

  // Space bar spins on keyboards (ignored while typing or when a dialog is open).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || blocked) return;
      const el = e.target as HTMLElement;
      if (el.closest('button, input, select, textarea, summary')) return;
      e.preventDefault();
      go();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <button className={`spin-btn ${spinning ? 'is-spinning' : ''}`} onClick={go} disabled={spinning} aria-label="Spin">
      <span className="spin-btn__label">{spinning ? 'Spinning' : 'Spin'}</span>
      <span className="spin-btn__free">{spinning ? <span className="spin-btn__dots" aria-hidden /> : 'FREE'}</span>
    </button>
  );
}
