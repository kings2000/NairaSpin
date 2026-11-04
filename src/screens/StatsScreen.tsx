import { Check, Gift, Trophy } from 'lucide-react';
import { useState } from 'react';
import { unlockAudio } from '../audio/sound';
import { COIN_BY_ID, COINS } from '../config/coins';
import { PROGRESSION } from '../config/economy';
import { PATTERN_BY_ID } from '../config/patterns';
import { CoinArtwork } from '../components/collectibles/CoinArtwork';
import { ACHIEVEMENTS, isComplete } from '../game/achievements';
import { tierMatches } from '../game/cards';
import { canClaimDaily, dailyReward } from '../game/daily';
import { upcomingUnlocks } from '../game/progression';
import { collectedCoins, mostMatchedCoin, mostProfitablePattern } from '../game/statistics';
import type { HistoryEntry } from '../game/types';
import { useGameStore } from '../store/gameStore';

export function StatsScreen() {
  const game = useGameStore((s) => s.game);
  const claim = useGameStore((s) => s.claimAchievement);
  const claimDaily = useGameStore((s) => s.claimDaily);
  const need = PROGRESSION.xpToNext(game.level);
  const dailyReady = canClaimDaily(game, Date.now());
  const st = game.stats;
  const collected = collectedCoins(st).length;
  const topCoin = mostMatchedCoin(st);
  const topPattern = mostProfitablePattern(st);

  const stats: [string, string][] = [
    ['Total spins', st.spins.toLocaleString()],
    ['Total rewards', st.totalEarned.toLocaleString()],
    ['Largest spin', st.bestSpin.toLocaleString()],
    ['Patterns completed', st.patternsCompleted.toLocaleString()],
    ['Bronze matched', tierMatches(game, 'bronze').toLocaleString()],
    ['Silver matched', tierMatches(game, 'silver').toLocaleString()],
    ['Gold matched', tierMatches(game, 'gold').toLocaleString()],
    ['Emerald matched', tierMatches(game, 'emerald').toLocaleString()],
    ['Platinum matched', tierMatches(game, 'platinum').toLocaleString()],
    ['Wild matched', tierMatches(game, 'wild').toLocaleString()],
    ['Most matched coin', topCoin ? COIN_BY_ID[topCoin[0]].name : '—'],
    ['Most profitable pattern', topPattern ? `${PATTERN_BY_ID[topPattern[0]]?.name ?? topPattern[0]}` : '—'],
    ['Cards activated', st.cardsActivated.toLocaleString()],
    ['Best streak', st.bestStreak.toLocaleString()],
  ];

  return (
    <div className="screen">
      <div className="profile-hero">
        <div className="profile-hero__row">
          <div className="profile-hero__level">Level {game.level}</div>
          <div className="profile-hero__collection">
            Collection {collected}/{COINS.length}
          </div>
        </div>
        <div className="xp-bar" role="progressbar" aria-valuemin={0} aria-valuemax={need} aria-valuenow={game.xp}>
          <div className="xp-bar__fill" style={{ width: `${(game.xp / need) * 100}%` }} />
        </div>
        <div className="small">
          {game.xp} / {need} XP to level {game.level + 1}
        </div>
        <ul className="next-unlocks">
          {upcomingUnlocks(game, 4).map((u) => (
            <li key={u.label}>
              <span className="chip">Lv {u.level}</span> {u.label}
            </li>
          ))}
        </ul>
      </div>

      <div className={`daily ${dailyReady ? 'is-ready' : ''}`}>
        <Gift size={28} />
        <div className="daily__info">
          <strong>Daily gift</strong>
          <span className="muted small">
            {dailyReady
              ? `+${dailyReward(game).coins} and +${dailyReward(game).xp} XP`
              : 'Claimed today. Missing a day never resets your gift.'}
          </span>
        </div>
        <button
          className="btn btn--gold"
          disabled={!dailyReady}
          onClick={() => {
            unlockAudio();
            claimDaily();
          }}
        >
          {dailyReady ? 'Claim' : <Check size={18} />}
        </button>
      </div>

      <h2 className="screen__title">Statistics</h2>
      <dl className="stats-grid">
        {stats.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>

      <h2 className="screen__title">Recent spins</h2>
      {game.history.length === 0 ? (
        <p className="muted small">Your last {15} spins will appear here.</p>
      ) : (
        <ul className="history">
          {game.history.map((h) => (
            <HistoryRow key={`${h.spin}-${h.at}`} entry={h} />
          ))}
        </ul>
      )}

      <h2 className="screen__title">Achievements</h2>
      <div className="stack">
        {ACHIEVEMENTS.map((a) => {
          const [cur, target] = a.progress(game);
          const done = isComplete(a, game);
          const claimed = game.claimedAchievements.includes(a.id);
          return (
            <div key={a.id} className={`achievement ${claimed ? 'is-claimed' : done ? 'is-ready' : ''}`}>
              <Trophy size={22} className="achievement__icon" />
              <div className="achievement__info">
                <strong>{a.name}</strong>
                <span className="muted small">{a.description}</span>
                <div className="mini-bar">
                  <div style={{ width: `${Math.min(100, (cur / target) * 100)}%` }} />
                </div>
              </div>
              {claimed ? (
                <Check size={20} className="text-green" aria-label="Claimed" />
              ) : (
                <button className="btn btn--buy" disabled={!done} onClick={() => claim(a.id)}>
                  {done ? `+${a.reward.toLocaleString()}` : `${Math.min(cur, target).toLocaleString()}/${target.toLocaleString()}`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p className="disclaimer">All rewards are fictional game points. No real money is involved.</p>
    </div>
  );
}

function HistoryRow({ entry }: { entry: HistoryEntry }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="history-row">
      <button className="history-row__head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="history-grid" aria-hidden>
          {entry.grid.map((c, i) => (
            <span key={i} className={`dot tier-${COIN_BY_ID[c]?.tier ?? 'bronze'}`} />
          ))}
        </span>
        <span className="history-row__info">
          <strong>Spin #{entry.spin}</strong>
          <span className="muted small">
            {entry.matches.length ? `${entry.matches.length} pattern${entry.matches.length > 1 ? 's' : ''}` : 'No pattern'}
            {entry.specials.length ? ` · ${entry.specials.map((s) => s.source).join(', ')}` : ''}
          </span>
        </span>
        <span className={`history-row__total ${entry.total ? '' : 'muted'}`}>+{entry.total.toLocaleString()}</span>
      </button>
      {open && (
        <div className="history-row__detail">
          <div className="history-row__coins">
            {entry.grid.map((c, i) => (
              <CoinArtwork key={i} id={c} size={28} />
            ))}
          </div>
          <ul>
            {entry.matches.map((m, i) => (
              <li key={i}>
                {PATTERN_BY_ID[m.patternId]?.name ?? m.patternId} · {COIN_BY_ID[m.symbol]?.name} ×{m.cells}
                <span> +{m.total.toLocaleString()}</span>
              </li>
            ))}
            {entry.specials.map((s) => (
              <li key={s.source}>
                {s.source}
                <span> +{s.amount.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}
