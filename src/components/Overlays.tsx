import { Clock, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { unlockAudio } from '../audio/sound';
import { CARD_BY_ID } from '../config/cards';
import { COIN_BY_ID } from '../config/coins';
import type { MotionPreference } from '../game/types';
import { useGameStore } from '../store/gameStore';
import { CoinArtwork } from './collectibles/CoinArtwork';
import { RarityIndicator } from './collectibles/RarityIndicator';
import { GameCard } from './GameCard';
import { Modal } from './Modal';

export function SettingsModal() {
  const open = useGameStore((s) => s.settingsOpen);
  const settings = useGameStore((s) => s.game.settings);
  const update = useGameStore((s) => s.updateSettings);
  const close = useGameStore((s) => s.setSettingsOpen);
  const reset = useGameStore((s) => s.resetProgress);
  const [confirmReset, setConfirmReset] = useState(false);

  if (!open) return null;
  const motions: { id: MotionPreference; label: string }[] = [
    { id: 'system', label: 'System' },
    { id: 'reduced', label: 'Reduced' },
    { id: 'full', label: 'Full' },
  ];

  return (
    <Modal title="Settings" onClose={() => (setConfirmReset(false), close(false))}>
      <div className="setting-row">
        <span>Sound</span>
        <button
          className={`toggle ${settings.sound ? 'is-on' : ''}`}
          onClick={() => {
            update({ sound: !settings.sound });
            unlockAudio();
          }}
          aria-pressed={settings.sound}
        >
          {settings.sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
          {settings.sound ? 'On' : 'Off'}
        </button>
      </div>
      <label className="setting-row">
        <span>Volume</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={settings.volume}
          disabled={!settings.sound}
          onChange={(e) => update({ volume: Number(e.target.value) })}
        />
      </label>
      <div className="setting-row">
        <span>Motion</span>
        <div className="segmented" role="radiogroup" aria-label="Motion">
          {motions.map((m) => (
            <button
              key={m.id}
              role="radio"
              aria-checked={settings.motion === m.id}
              className={settings.motion === m.id ? 'is-active' : ''}
              onClick={() => update({ motion: m.id })}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <p className="disclaimer">
        Naira Spin is free to play. Rewards are fictional game points with no cash value. They cannot be bought, withdrawn
        or redeemed, and the coin designs are not legal tender.
      </p>

      {confirmReset ? (
        <div className="danger-confirm">
          <p>Erase all progress? This can’t be undone.</p>
          <div className="row-gap">
            <button className="btn btn--ghost" onClick={() => setConfirmReset(false)}>
              Cancel
            </button>
            <button className="btn btn--danger" onClick={reset}>
              Erase
            </button>
          </div>
        </div>
      ) : (
        <button className="btn btn--ghost btn--block" onClick={() => setConfirmReset(true)}>
          Reset progress
        </button>
      )}
    </Modal>
  );
}

export function OfflineRewardModal() {
  const reward = useGameStore((s) => s.offlineReward);
  const collect = useGameStore((s) => s.collectOffline);
  if (!reward) return null;
  const hours = Math.floor(reward.minutes / 60);
  const mins = reward.minutes % 60;
  return (
    <Modal title="Welcome back!" onClose={collect} className="modal--center">
      <div className="offline">
        <Clock size={40} className="offline__icon" />
        <p>
          Your machine kept ticking for {hours > 0 ? `${hours}h ` : ''}
          {mins}m.
        </p>
        <div className="offline__amount">+{reward.coins.toLocaleString()}</div>
        {reward.capped && <p className="muted small">Offline earnings are capped at {reward.capMinutes / 60}h. Upgrade the Coin Vault to store more.</p>}
        <button
          className="btn btn--gold btn--block"
          onClick={() => {
            unlockAudio();
            collect();
          }}
        >
          Collect
        </button>
      </div>
    </Modal>
  );
}

/** True while reels spin or the win show plays: popups wait so they never cover it. */
function useSpinBusy(): boolean {
  return useGameStore((s) => s.spinPhase === 'spinning' || !s.credited);
}

/** Celebrates a newly unlocked card or coin. */
export function Reveal() {
  const reveal = useGameStore((s) => s.reveals[0]);
  const close = useGameStore((s) => s.closeReveal);
  const setTab = useGameStore((s) => s.setTab);
  const busy = useSpinBusy();
  if (!reveal || busy) return null;

  const isCard = reveal.kind === 'card';
  const title = isCard ? CARD_BY_ID[reveal.id].name : COIN_BY_ID[reveal.id].name;
  return (
    <div className="modal-backdrop modal-backdrop--center" onClick={close}>
      <div className="reveal" role="dialog" aria-modal="true" aria-label={`Unlocked: ${title}`} onClick={(e) => e.stopPropagation()}>
        <p className="reveal__kicker">{isCard ? 'New card unlocked!' : 'New coin unlocked!'}</p>
        {reveal.kind === 'card' ? (
          <GameCard card={CARD_BY_ID[reveal.id]} progress={{ unlocked: true, level: 1 }} large />
        ) : (
          <div className={`reveal__coin tier-${COIN_BY_ID[reveal.id].tier}`} key={reveal.id}>
            <CoinArtwork id={reveal.id} />
            <strong>{COIN_BY_ID[reveal.id].name}</strong>
            <RarityIndicator rarity={COIN_BY_ID[reveal.id].rarity} />
            <span className="muted small">{COIN_BY_ID[reveal.id].baseValue} pts per matched coin</span>
            <p className="muted small">{COIN_BY_ID[reveal.id].blurb}</p>
          </div>
        )}
        <div className="row-gap">
          <button className="btn btn--ghost" onClick={close}>
            {isCard ? 'Later' : 'Great!'}
          </button>
          {isCard && (
            <button
              className="btn btn--gold"
              onClick={() => {
                close();
                setTab('cards');
              }}
            >
              Equip it
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function Toasts() {
  const toasts = useGameStore((s) => s.toasts);
  const dismiss = useGameStore((s) => s.dismissToast);
  const busy = useSpinBusy();
  if (busy) return null; // queued toasts appear (and start their timers) once the show ends

  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <ToastItem key={t.id} id={t.id} tone={t.tone} title={t.title} body={t.body} onDone={dismiss} />
      ))}
    </div>
  );
}

function ToastItem({ id, tone, title, body, onDone }: { id: number; tone: string; title: string; body?: string; onDone: (id: number) => void }) {
  useEffect(() => {
    const t = window.setTimeout(() => onDone(id), 3200);
    return () => window.clearTimeout(t);
  }, [id, onDone]);
  return (
    <button className={`toast toast--${tone}`} onClick={() => onDone(id)}>
      <strong>{title}</strong>
      {body && <span>{body}</span>}
    </button>
  );
}
