import type { CoinDefinition } from '../config/coins';
import { TIERS } from '../config/coins';
import { CoinArtwork } from './collectibles/CoinArtwork';
import { RarityIndicator } from './collectibles/RarityIndicator';

/** One collectible in the gallery. Coins not yet matched show as a mystery silhouette. */
export function CollectionCard({
  coin,
  collected,
  value,
  chance,
  matched,
}: {
  coin: CoinDefinition;
  collected: boolean;
  value: number;
  chance: number;
  matched: number;
}) {
  return (
    <article className={`collection-card tier-${coin.tier} rarity-${coin.rarity} ${collected ? 'is-collected' : 'is-mystery'}`}>
      <div className="collection-card__stage">
        <CoinArtwork id={coin.id} className="collection-card__art" />
        {!collected && <span className="collection-card__q" aria-hidden>?</span>}
      </div>
      <div className="collection-card__body">
        <h3 className="collection-card__name">{collected ? coin.name : 'Undiscovered'}</h3>
        <RarityIndicator rarity={coin.rarity} />
        <div className="collection-card__value">
          {+value.toFixed(1)} <small>pts</small>
        </div>
        <dl className="collection-card__stats">
          <dt>Denomination</dt>
          <dd>{coin.denomination ? `₦${coin.denomination.toLocaleString()}` : 'Wild'}</dd>
          <dt>Metal</dt>
          <dd>{TIERS[coin.tier].name}</dd>
          <dt>Chance</dt>
          <dd>{(chance * 100).toFixed(1)}%</dd>
          <dt>Matched</dt>
          <dd>{matched.toLocaleString()}</dd>
        </dl>
        <p className="collection-card__blurb">{collected ? coin.blurb : 'Match this coin once to add it to your collection.'}</p>
      </div>
    </article>
  );
}
