import { Lock } from 'lucide-react';
import type { ReactNode } from 'react';
import { COINS } from '../config/coins';
import { UPGRADE_BY_ID, UPGRADES, type UpgradeDefinition } from '../config/upgrades';
import { ArtTile } from '../components/collectibles/ArtTile';
import { CoinArtwork } from '../components/collectibles/CoinArtwork';
import { RarityIndicator } from '../components/collectibles/RarityIndicator';
import { Points } from '../components/Points';
import { describeEffect } from '../game/describe';
import { activeEffects } from '../game/effects';
import { getCoinProbabilities, probabilitiesAfterUpgrade } from '../game/probability';
import { coinValue } from '../game/rewards';
import type { CoinId, GameState } from '../game/types';
import { canBuyUpgrade, upgradeLevel, type UpgradeCheck } from '../game/upgrades';
import { useGameStore } from '../store/gameStore';

const pct = (p = 0) => `${(p * 100).toFixed(1)}%`;
const fmt = (n: number) => (Number.isInteger(n) ? n.toLocaleString() : (+n.toFixed(1)).toString());

export function UpgradesScreen() {
  const game = useGameStore((s) => s.game);
  const buy = useGameStore((s) => s.buyUpgrade);
  const probs = getCoinProbabilities(game);
  const maxProb = Math.max(...Object.values(probs).map((p) => p ?? 0));

  return (
    <div className="screen">
      <section>
        <h2 className="screen__title">Coin chances & values</h2>
        <p className="muted small">
          Pick your favourite collectibles and make them land more often (Chance) or pay more (Value). Chances always
          total 100%, so boosting one coin slightly lowers the rest.
        </p>
      </section>
      <div className="invest-grid">
        {COINS.map((c) => (
          <CoinInvestCard key={c.id} coin={c.id} game={game} prob={probs[c.id] ?? 0} maxProb={maxProb} onBuy={buy} />
        ))}
      </div>

      <h2 className="screen__title">Pattern multipliers</h2>
      <div className="upgrade-grid">
        {UPGRADES.filter((u) => u.category === 'pattern').map((u) => (
          <GenericUpgrade key={u.id} def={u} game={game} onBuy={buy} />
        ))}
      </div>

      <h2 className="screen__title">Machine</h2>
      <div className="upgrade-grid">
        {UPGRADES.filter((u) => u.category === 'machine').map((u) => (
          <GenericUpgrade key={u.id} def={u} game={game} onBuy={buy} />
        ))}
      </div>
    </div>
  );
}

function GenericUpgrade({ def, game, onBuy }: { def: UpgradeDefinition; game: GameState; onBuy: (id: string) => void }) {
  const lvl = upgradeLevel(game, def.id);
  return (
    <UpgradeCard
      art={def.art ? <ArtTile art={def.art} /> : null}
      title={def.name}
      subtitle={def.description}
      level={lvl}
      maxLevel={def.maxLevel}
      current={lvl > 0 ? def.effects.map((e) => describeEffect(e, lvl)).join(' · ') : 'Not active yet'}
      next={def.effects.map((e) => describeEffect(e, lvl + 1)).join(' · ')}
      check={canBuyUpgrade(game, def.id)}
      unlockLevel={def.unlockLevel}
      onBuy={() => onBuy(def.id)}
    />
  );
}

function CoinInvestCard({
  coin,
  game,
  prob,
  maxProb,
  onBuy,
}: {
  coin: CoinId;
  game: GameState;
  prob: number;
  maxProb: number;
  onBuy: (id: string) => void;
}) {
  const def = COINS.find((c) => c.id === coin)!;
  const effects = activeEffects(game);
  const chanceId = `chance:${coin}`;
  const valueId = `value:${coin}`;
  const nextProb = probabilitiesAfterUpgrade(game, chanceId)[coin] ?? prob;
  const nextValue = coinValue(activeEffects({ ...game, upgrades: { ...game.upgrades, [valueId]: upgradeLevel(game, valueId) + 1 } }), coin);

  return (
    <article className={`invest-card tier-${def.tier} rarity-${def.rarity}`}>
      <header className="invest-card__head">
        <CoinArtwork id={coin} className="invest-card__art" />
        <div className="invest-card__name">
          <strong>{def.name}</strong>
          <RarityIndicator rarity={def.rarity} />
        </div>
        <div className="invest-card__value">
          {fmt(coinValue(effects, coin))}
          <small>pts</small>
        </div>
      </header>
      {/* Chance meter: current share, plus a ghost of the next level. */}
      <div className="chance-meter" aria-label={`Chance ${pct(prob)}`}>
        <span className="chance-meter__next" style={{ width: `${(nextProb / maxProb) * 100}%` }} />
        <span className="chance-meter__now" style={{ width: `${(prob / maxProb) * 100}%` }} />
        <em>{pct(prob)} per cell</em>
      </div>
      <UpgradeLine
        title="Chance"
        level={upgradeLevel(game, chanceId)}
        maxLevel={UPGRADE_BY_ID[chanceId].maxLevel}
        next={`→ ${pct(nextProb)}`}
        check={canBuyUpgrade(game, chanceId)}
        onBuy={() => onBuy(chanceId)}
      />
      <UpgradeLine
        title="Value"
        level={upgradeLevel(game, valueId)}
        maxLevel={UPGRADE_BY_ID[valueId].maxLevel}
        next={`→ ${fmt(nextValue)} pts`}
        check={canBuyUpgrade(game, valueId)}
        onBuy={() => onBuy(valueId)}
      />
    </article>
  );
}

function LevelPips({ level, max }: { level: number; max: number }) {
  return (
    <span className="pips" aria-label={`Level ${level} of ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <i key={i} className={i < level ? 'on' : ''} />
      ))}
    </span>
  );
}

function BuyButton({ check, unlockLevel, label }: { check: UpgradeCheck; unlockLevel?: number; label: string }) {
  if (!check.ok && check.reason === 'maxed') return <>MAX</>;
  if (!check.ok && check.reason === 'locked') return <><Lock size={12} /> Lv {unlockLevel}</>;
  return <span aria-label={label}><Points value={check.cost} /></span>;
}

function UpgradeLine({ title, level, maxLevel, next, check, onBuy }: { title: string; level: number; maxLevel: number; next: string; check: UpgradeCheck; onBuy: () => void }) {
  const maxed = !check.ok && check.reason === 'maxed';
  return (
    <div className="upgrade-line">
      <div className="upgrade-line__info">
        <span className="upgrade-line__title">{title}</span>
        <LevelPips level={level} max={maxLevel} />
        {!maxed && <span className="upgrade-line__next">{next}</span>}
      </div>
      <button className="btn btn--buy" onClick={onBuy} disabled={!check.ok}>
        <BuyButton check={check} label={`Upgrade ${title}`} />
      </button>
    </div>
  );
}

interface UpgradeCardProps {
  art: ReactNode;
  title: string;
  subtitle: string;
  level: number;
  maxLevel: number;
  current: string;
  next: string;
  check: UpgradeCheck;
  unlockLevel: number;
  onBuy: () => void;
}

function UpgradeCard({ art, title, subtitle, level, maxLevel, current, next, check, unlockLevel, onBuy }: UpgradeCardProps) {
  const maxed = !check.ok && check.reason === 'maxed';
  const locked = !check.ok && check.reason === 'locked';
  return (
    <article className={`upgrade-card ${locked ? 'is-locked' : ''}`}>
      <div className="upgrade-card__art">{art}</div>
      <div className="upgrade-card__info">
        <strong>{title}</strong>
        <span className="muted small">{subtitle}</span>
        <LevelPips level={level} max={maxLevel} />
        {!locked && (
          <span className="upgrade-card__effect">
            {current}
            {!maxed && <em> → {next}</em>}
          </span>
        )}
      </div>
      <button className="btn btn--buy" onClick={onBuy} disabled={!check.ok}>
        <BuyButton check={check} unlockLevel={unlockLevel} label={`Upgrade ${title}`} />
      </button>
    </article>
  );
}
