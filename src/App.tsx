import { BottomNav } from './components/BottomNav';
import { preloadCollectibles } from './assets/collectibles';
import { Header } from './components/Header';
import { OfflineRewardModal, Reveal, SettingsModal, Toasts } from './components/Overlays';
import { useGameLifecycle } from './hooks/useGameLifecycle';
import { CardsScreen } from './screens/CardsScreen';
import { CollectionScreen } from './screens/CollectionScreen';
import { MachineScreen } from './screens/MachineScreen';
import { StatsScreen } from './screens/StatsScreen';
import { UpgradesScreen } from './screens/UpgradesScreen';
import { useGameStore } from './store/gameStore';

preloadCollectibles();

const SCREENS = {
  machine: MachineScreen,
  upgrades: UpgradesScreen,
  cards: CardsScreen,
  collection: CollectionScreen,
  stats: StatsScreen,
};

export default function App() {
  useGameLifecycle();
  const tab = useGameStore((s) => s.tab);
  const reduced = useGameStore((s) => s.reducedMotion);
  const Screen = SCREENS[tab];

  return (
    <div className={`app ${reduced ? 'reduce-motion' : ''}`}>
      <Header />
      <main className={`main main--${tab}`} key={tab}>
        <Screen />
      </main>
      <BottomNav />
      <Toasts />
      <SettingsModal />
      <OfflineRewardModal />
      <Reveal />
    </div>
  );
}
