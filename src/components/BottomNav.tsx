import { UPGRADES } from '../config/upgrades';
import { claimableAchievements } from '../game/achievements';
import { canClaimDaily } from '../game/daily';
import type { GameState } from '../game/types';
import { canBuyUpgrade } from '../game/upgrades';
import { useGameStore, type Tab } from '../store/gameStore';
import { NavigationItem } from './NavigationItem';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'machine', label: 'Machine', icon: 'machine' },
  { id: 'upgrades', label: 'Upgrades', icon: 'upgrades' },
  { id: 'cards', label: 'Cards', icon: 'cards' },
  { id: 'collection', label: 'Collection', icon: 'collection' },
  { id: 'stats', label: 'Stats', icon: 'stats' },
];

/** Numbers shown on the nav: things the player can act on right now. */
function badges(g: GameState): Partial<Record<Tab, number>> {
  return {
    upgrades: UPGRADES.filter((u) => canBuyUpgrade(g, u.id).ok).length,
    stats: claimableAchievements(g).length + (canClaimDaily(g, Date.now()) ? 1 : 0),
  };
}

export function BottomNav() {
  const tab = useGameStore((s) => s.tab);
  const setTab = useGameStore((s) => s.setTab);
  const game = useGameStore((s) => s.game);
  const counts = badges(game);

  return (
    <nav className="bottom-nav" aria-label="Main">
      <div className="bottom-nav__inner">
        {TABS.map((t) => (
          <NavigationItem key={t.id} id={t.icon} label={t.label} active={tab === t.id} badge={counts[t.id]} onSelect={() => setTab(t.id)} />
        ))}
      </div>
    </nav>
  );
}
