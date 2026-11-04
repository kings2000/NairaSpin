// The store is a thin controller: it holds state and wires user actions to the pure game
// functions in src/game. No gameplay rules live here.
import { create } from 'zustand';
import { configureSound, playSound } from '../audio/sound';
import { revealSchedule, spinSchedule } from '../components/spinSchedule';
import { PATTERN_BY_ID } from '../config/patterns';
import { ACHIEVEMENTS, claimAchievement as claimAch } from '../game/achievements';
import { buyCharm, equipCard, setCardTarget, unequipCard, upgradeCard } from '../game/cards';
import { canClaimDaily, claimDaily as claimDailyFn, dailyReward } from '../game/daily';
import { createInitialState } from '../game/initialState';
import { computeOfflineReward, type OfflineReward } from '../game/offline';
import { progress, type GameEvent } from '../game/progression';
import { applySpin, rollSpin } from '../game/spin';
import type { CardId, CharmId, CoinId, GameState, Settings, SpinOutcome } from '../game/types';
import { buyUpgrade } from '../game/upgrades';
import { LocalStorageRepository, type SaveRepository } from '../persistence/saveRepository';
import { deserialize } from '../persistence/serialization';

export type Tab = 'machine' | 'upgrades' | 'cards' | 'collection' | 'stats';
export type SpinPhase = 'idle' | 'spinning' | 'result';

export interface Toast {
  id: number;
  tone: 'level' | 'unlock' | 'achievement' | 'info';
  title: string;
  body?: string;
}

export type Reveal = { kind: 'card'; id: CardId } | { kind: 'coin'; id: CoinId };

interface Store {
  game: GameState;
  tab: Tab;
  spinPhase: SpinPhase;
  spinId: number;
  spinStartedAt: number;
  /** performance.now() when the reels settled and the pattern show began. */
  revealStartedAt: number;
  /** True once the current spin's payout has been added to the balance. */
  credited: boolean;
  /** Set when the player skipped the show for this spin id. */
  revealSkipped: number;
  outcome: SpinOutcome | null;
  reducedMotion: boolean;
  toasts: Toast[];
  /** Newly unlocked cards/coins to celebrate, one at a time. */
  reveals: Reveal[];
  offlineReward: OfflineReward | null;
  settingsOpen: boolean;

  spin: () => void;
  /** Ends the pattern show early and credits immediately. */
  skipReveal: () => void;
  buyUpgrade: (id: string) => void;
  equip: (id: CardId) => void;
  unequip: (id: CardId) => void;
  upgradeCard: (id: CardId) => void;
  setCardTarget: (id: CardId, coin: CoinId) => void;
  buyCharm: (id: CharmId) => void;
  claimAchievement: (id: string) => void;
  claimDaily: () => void;
  collectOffline: () => void;
  checkOffline: () => void;
  markSeen: () => void;
  updateSettings: (patch: Partial<Settings>) => void;
  setReducedMotion: (v: boolean) => void;
  resetProgress: () => void;
  setTab: (tab: Tab) => void;
  setSettingsOpen: (open: boolean) => void;
  dismissToast: (id: number) => void;
  closeReveal: () => void;
}

export const repository: SaveRepository = new LocalStorageRepository();

let toastSeq = 0;

// Pending spin timers and the not-yet-credited payout, so a new spin (or a skip) can
// finish the previous one instantly instead of losing it.
let spinTimers: number[] = [];
let pendingCredit: (() => void) | null = null;

function eventToToast(e: GameEvent): Toast | null {
  const id = ++toastSeq;
  switch (e.kind) {
    case 'levelUp':
      return { id, tone: 'level', title: `Level ${e.level}!`, body: `+${e.reward.toLocaleString()} reward` };
    case 'patternUnlocked':
      return { id, tone: 'unlock', title: `New pattern: ${PATTERN_BY_ID[e.patternId].name}`, body: `×${PATTERN_BY_ID[e.patternId].multiplier} multiplier` };
    case 'achievementReady': {
      const a = ACHIEVEMENTS.find((x) => x.id === e.id);
      return a ? { id, tone: 'achievement', title: `Achievement: ${a.name}`, body: 'Claim it in Stats' } : null;
    }
    case 'coinUnlocked':
    case 'cardUnlocked':
      return null; // celebrated with a full reveal instead
  }
}

const initialGame = deserialize(repository.load());

export const useGameStore = create<Store>((set, get) => {
  /** Applies a pure state transition and its side-effects (toasts, reveals, sounds). */
  const commit = (game: GameState, events: GameEvent[] = []) => {
    const toasts = events.map(eventToToast).filter((t): t is Toast => t !== null);
    const reveals: Reveal[] = events.flatMap((e): Reveal[] =>
      e.kind === 'cardUnlocked' ? [{ kind: 'card', id: e.cardId }] : e.kind === 'coinUnlocked' ? [{ kind: 'coin', id: e.coinId }] : [],
    );
    set((s) => ({ game, toasts: [...s.toasts, ...toasts].slice(-4), reveals: [...s.reveals, ...reveals] }));
    if (reveals.length || events.some((e) => e.kind === 'levelUp')) playSound('unlock');
  };

  /** Runs a purchase; plays feedback depending on whether state actually changed. */
  const purchase = (fn: (g: GameState) => GameState) => {
    const before = get().game;
    const after = fn(before);
    if (after === before) return playSound('error');
    playSound('upgrade');
    const result = progress(before, after, 0);
    commit(result.state, result.events);
  };

  return {
    game: initialGame,
    tab: 'machine',
    spinPhase: 'idle',
    spinId: 0,
    spinStartedAt: 0,
    revealStartedAt: 0,
    credited: true,
    revealSkipped: 0,
    outcome: null,
    reducedMotion: false,
    toasts: [],
    reveals: [],
    offlineReward: null,
    settingsOpen: false,

    spin: () => {
      if (get().spinPhase === 'spinning') return;
      get().skipReveal(); // finish any show still playing from the previous spin
      const { game, reducedMotion } = get();
      // The result is fully decided here, before any animation begins.
      const outcome = rollSpin(game);
      const spinId = get().spinId + 1;
      const { settleMs } = spinSchedule(outcome.grid, reducedMotion);
      const reveal = revealSchedule(outcome);
      set({ spinPhase: 'spinning', outcome, spinId, spinStartedAt: performance.now(), credited: false });
      playSound('spin');

      pendingCredit = () => {
        pendingCredit = null;
        const { state, events } = applySpin(get().game, outcome);
        set({ credited: true });
        commit(state, events);
      };
      const at = (ms: number, fn: () => void) => spinTimers.push(window.setTimeout(fn, ms));
      at(settleMs, () => set({ spinPhase: 'result', revealStartedAt: performance.now() }));
      if (reveal.totalMs > 0) {
        at(settleMs + reveal.totalAtMs, () => {
          const sound = { none: null, small: 'total', medium: 'total', large: 'bigWin', jackpot: 'jackpot' } as const;
          const s = sound[outcome.winTier];
          if (s) playSound(s);
        });
      }
      at(settleMs + reveal.creditAfterMs, () => pendingCredit?.());
    },

    skipReveal: () => {
      spinTimers.forEach((t) => window.clearTimeout(t));
      spinTimers = [];
      if (!pendingCredit) return;
      set({ spinPhase: 'result', revealSkipped: get().spinId });
      pendingCredit();
    },

    buyUpgrade: (id) => purchase((g) => buyUpgrade(g, id)),
    upgradeCard: (id) => purchase((g) => upgradeCard(g, id)),
    buyCharm: (id) => purchase((g) => buyCharm(g, id)),

    equip: (id) => {
      const g = get().game;
      const next = equipCard(g, id);
      if (next === g) return playSound('error');
      set({ game: next });
      playSound('click');
    },
    unequip: (id) => {
      set({ game: unequipCard(get().game, id) });
      playSound('click');
    },
    setCardTarget: (id, coin) => set({ game: setCardTarget(get().game, id, coin) }),

    claimAchievement: (id) => {
      const before = get().game;
      const after = claimAch(before, id);
      if (after === before) return;
      playSound('bigWin');
      const result = progress(before, after, 0);
      commit(result.state, result.events);
    },

    claimDaily: () => {
      const before = get().game;
      if (!canClaimDaily(before, Date.now())) return;
      const { xp, coins } = dailyReward(before);
      const result = progress(before, claimDailyFn(before, Date.now()), xp);
      playSound('bigWin');
      commit(result.state, result.events);
      set((s) => ({ toasts: [...s.toasts, { id: ++toastSeq, tone: 'info' as const, title: 'Daily gift', body: `+${coins} and +${xp} XP` }] }));
    },

    collectOffline: () => {
      const reward = get().offlineReward;
      if (!reward) return;
      const g = get().game;
      set({
        offlineReward: null,
        game: { ...g, balance: g.balance + reward.coins, stats: { ...g.stats, totalEarned: g.stats.totalEarned + reward.coins } },
      });
      playSound('win');
    },

    checkOffline: () => {
      const now = Date.now();
      const g = get().game;
      const reward = computeOfflineReward(g, now);
      // Always advance lastSeenAt so the same absence can't be claimed twice.
      set((s) => ({
        game: { ...g, lastSeenAt: now },
        offlineReward: reward
          ? { ...reward, coins: reward.coins + (s.offlineReward?.coins ?? 0), minutes: reward.minutes + (s.offlineReward?.minutes ?? 0) }
          : s.offlineReward,
      }));
    },

    markSeen: () => set((s) => ({ game: { ...s.game, lastSeenAt: Date.now() } })),

    updateSettings: (patch) => {
      const g = get().game;
      const settings = { ...g.settings, ...patch };
      configureSound({ enabled: settings.sound, volume: settings.volume });
      set({ game: { ...g, settings } });
    },
    setReducedMotion: (v) => set({ reducedMotion: v }),

    resetProgress: () => {
      repository.clear();
      const fresh = createInitialState();
      spinTimers.forEach((t) => window.clearTimeout(t));
      spinTimers = [];
      pendingCredit = null;
      set({
        game: { ...fresh, settings: get().game.settings },
        spinPhase: 'idle',
        credited: true,
        outcome: null,
        toasts: [],
        offlineReward: null,
        reveals: [],
        settingsOpen: false,
        tab: 'machine',
      });
    },

    setTab: (tab) => {
      set({ tab });
      playSound('click');
    },
    setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
    dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
    closeReveal: () => set((s) => ({ reveals: s.reveals.slice(1) })),
  };
});

configureSound({ enabled: initialGame.settings.sound, volume: initialGame.settings.volume });

// ---- Auto-save -------------------------------------------------------------------------

let saveTimer: number | undefined;
export function saveNow(): void {
  window.clearTimeout(saveTimer);
  repository.save(useGameStore.getState().game);
}

useGameStore.subscribe((s, prev) => {
  if (s.game === prev.game) return;
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(saveNow, 400);
});
