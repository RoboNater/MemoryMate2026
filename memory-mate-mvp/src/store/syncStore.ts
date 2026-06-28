import { create } from 'zustand';

/**
 * Sync status for the UI (ccc.30, Phase 4).
 *
 * Holds presentation state only. The engine (services/syncService) writes status
 * here one-way; `syncNow` calls the engine via dynamic import so there is no static
 * import cycle between the store and the service.
 */
export interface SyncStore {
  isSyncing: boolean;
  lastSyncedAt: string | null; // ISO timestamp of last successful sync
  syncError: string | null;

  setSyncing: (v: boolean) => void;
  setSynced: (at: string) => void;
  setSyncError: (msg: string) => void;
  /** Trigger a manual sync now. */
  syncNow: () => Promise<void>;
}

export const useSyncStore = create<SyncStore>()((set) => ({
  isSyncing: false,
  lastSyncedAt: null,
  syncError: null,

  setSyncing: (v) => set({ isSyncing: v, ...(v ? { syncError: null } : {}) }),
  setSynced: (at) => set({ lastSyncedAt: at, syncError: null }),
  setSyncError: (msg) => set({ syncError: msg }),

  syncNow: async () => {
    const { sync } = await import('@/services/syncService');
    await sync();
  },
}));
