// Persistence abstraction. The game only talks to a SaveRepository, so the LocalStorage
// implementation can later be swapped for an authenticated backend. In production the server
// must be the source of truth for balances; client data here is never trusted beyond the prototype.
import type { GameState } from '../game/types';

export interface SaveRepository {
  load(): unknown | null;
  save(state: GameState): void;
  clear(): void;
}

export class LocalStorageRepository implements SaveRepository {
  constructor(
    private readonly key = 'naira-spin/save',
    private readonly storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | undefined = safeLocalStorage(),
  ) {}

  load(): unknown | null {
    try {
      const raw = this.storage?.getItem(this.key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null; // corrupt JSON or storage blocked
    }
  }

  save(state: GameState): void {
    try {
      this.storage?.setItem(this.key, JSON.stringify(state));
    } catch {
      // Quota exceeded / private mode: the game keeps running in memory.
    }
  }

  clear(): void {
    try {
      this.storage?.removeItem(this.key);
    } catch {
      /* ignore */
    }
  }
}

/** In-memory repository, used by tests and as a fallback. */
export class MemoryRepository implements SaveRepository {
  data: string | null = null;
  load() {
    return this.data ? JSON.parse(this.data) : null;
  }
  save(state: GameState) {
    this.data = JSON.stringify(state);
  }
  clear() {
    this.data = null;
  }
}

function safeLocalStorage(): Storage | undefined {
  try {
    return typeof window !== 'undefined' ? window.localStorage : undefined;
  } catch {
    return undefined;
  }
}
