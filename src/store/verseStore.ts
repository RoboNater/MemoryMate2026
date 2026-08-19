import { create } from 'zustand';
import { Verse, VerseProgress, OverallStats, VerseStats, TestResult, Shelf } from '@/types';
import { initDatabase } from '@/services/database';
import * as verseService from '@/services/verseService';
import * as shelfService from '@/services/shelfService';
import * as progressService from '@/services/progressService';
import * as testService from '@/services/testService';
import * as statsService from '@/services/statsService';
import * as dataExportService from '@/services/dataExportService';

/**
 * Debounced background sync after a local write. Dynamic import keeps the store
 * free of a static dependency on the sync engine (which imports this store).
 * Best-effort: no-ops when signed out / unconfigured, and swallows failures.
 */
function syncAfterWrite(): void {
  import('@/services/syncService')
    .then((m) => m.scheduleSync())
    .catch(() => {});
}

/**
 * Refresh cached state (`progress`, `stats`, ...) after a durable write that
 * has already committed.
 *
 * A failure here is not a failed write and must never be reported to the
 * caller as one (#39): the caller would tell the user the change was lost and
 * invite them to redo it -- which, for the append-only `test_results` log,
 * writes a second row for one test. It is logged and swallowed instead,
 * leaving the cached copy stale until the next load.
 *
 * Note what this does *not* do: touch `error`. Writes overlap, so a refresh
 * that reported (or cleared) the shared write-error field would let a slow
 * refresh belonging to write A overwrite the failure of a later write B. The
 * `refresh*` actions it calls keep their hands off `error` for the same
 * reason -- see the comment above them.
 */
async function refreshAfterWrite(action: string, refresh: () => Promise<void>): Promise<void> {
  try {
    await refresh();
  } catch (refreshError) {
    console.error(
      `${action} was written, but refreshing the cached copy afterwards failed:`,
      refreshError
    );
  }
}

export interface VerseStore {
  // State
  verses: Verse[];
  shelves: Shelf[];
  activeShelfId: string | null; // null = all verses (no shelf filter)
  progress: Record<string, VerseProgress>;
  stats: OverallStats | null;
  /**
   * The store is loading its data: `initialize()`, or an import that replaces
   * everything. Screens gate their full-screen spinner on this, so ordinary
   * writes deliberately leave it alone -- flipping it for a save flashed that
   * spinner over whatever screen the user was on (#39).
   */
  isLoading: boolean;
  /**
   * Last write failure, or null. Written by the write actions and by nothing
   * else -- reads and refreshes reject on failure but leave this alone, so
   * that a background refresh can't overwrite or clear a real write's error.
   *
   * Non-fatal and advisory: the action that failed also rejects, and the
   * calling screen is what reports it to the user. Cleared at the start of the
   * next write. For a failure that leaves the app unusable, see `initError`.
   */
  error: string | null;
  /**
   * Initialization failed and there is no local database to work with --
   * fatal, and the only error `RootLayout` replaces the app with. Set by
   * `initialize()` and by nothing else (#39).
   */
  initError: string | null;
  isInitialized: boolean;

  // Initialization
  initialize: () => Promise<void>;

  // Verse actions
  addVerse: (
    reference: string,
    text: string,
    translation: string,
    shelfId?: string | null
  ) => Promise<Verse>;
  /**
   * Bulk-add verses from a plain-text import (#15). Rejects, like every other
   * write action, only if the durable write itself failed -- in which case
   * nothing was written at all, since the service does it in one transaction.
   */
  addVerses: (
    entries: { reference: string; text: string }[],
    translation: string,
    shelfId?: string | null
  ) => Promise<Verse[]>;
  updateVerse: (id: string, updates: Partial<Verse>) => Promise<void>;
  archiveVerse: (id: string) => Promise<void>;
  unarchiveVerse: (id: string) => Promise<void>;
  removeVerse: (id: string) => Promise<void>;

  // Shelf actions (issue #5)
  createShelf: (name: string) => Promise<Shelf>;
  renameShelf: (id: string, name: string) => Promise<void>;
  deleteShelf: (id: string) => Promise<void>;
  setActiveShelf: (id: string | null) => Promise<void>;
  setVerseShelf: (verseId: string, shelfId: string | null) => Promise<void>;
  refreshShelves: () => Promise<void>;

  // Practice/Test actions
  recordPractice: (verseId: string) => Promise<void>;
  setComfortLevel: (verseId: string, level: 1 | 2 | 3 | 4 | 5) => Promise<void>;
  resetProgress: (verseId: string) => Promise<void>;
  recordTestResult: (
    verseId: string,
    passed: boolean,
    score?: number
  ) => Promise<TestResult>;

  // Data fetching
  refreshVerses: () => Promise<void>;
  refreshProgress: (verseId: string) => Promise<void>;
  refreshStats: () => Promise<void>;
  getVerseStats: (verseId: string) => Promise<VerseStats | null>;
  getTestHistory: (verseId: string) => Promise<TestResult[]>;

  // Computed getters (derived state)
  getActiveVerses: () => Verse[];
  getArchivedVerses: () => Verse[];
  getActiveShelf: () => Shelf | null;
  getActiveSetVerses: () => Verse[];
  getVersesNeedingPractice: () => Verse[];
  getVersesReadyForTest: () => Verse[];

  // Data export/import
  exportData: () => Promise<string>;
  importData: (json: string) => Promise<dataExportService.ImportResult>;
}

export const useVerseStore = create<VerseStore>()((set, get) => ({
  // Initial state
  verses: [],
  shelves: [],
  activeShelfId: null,
  progress: {},
  stats: null,
  isLoading: false,
  error: null,
  initError: null,
  isInitialized: false,

  // Initialize database and load data
  initialize: async () => {
    if (get().isInitialized) return;

    set({ isLoading: true, initError: null });
    try {
      await initDatabase();

      // Load all verses, shelves, and progress
      const verses = await verseService.getAllVerses(true);
      const shelves = await shelfService.getAllShelves();
      const progressList = await progressService.getAllProgress();
      const progress = Object.fromEntries(progressList.map((p) => [p.verse_id, p]));
      const stats = await statsService.getOverallStats();

      // Restore the device-local active shelf; ignore it if the shelf is gone
      // (deleted here or on another device).
      const savedActiveShelfId = await shelfService.getActiveShelfId();
      const activeShelfId =
        savedActiveShelfId && shelves.some((s) => s.id === savedActiveShelfId)
          ? savedActiveShelfId
          : null;

      set({ verses, shelves, activeShelfId, progress, stats, isInitialized: true });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error during initialization';
      console.error('Store initialization error:', errorMsg);
      set({ initError: errorMsg });
    } finally {
      set({ isLoading: false });
    }
  },

  // --- Write actions ---
  //
  // They all follow the same shape (#39): a write action rejects if and only
  // if the durable service call rejects, and hands the post-write cache
  // refresh to `refreshAfterWrite`. None of them touch `isLoading` -- that
  // flag means "the store is loading its data", not "a save is in flight".

  // Add a new verse
  addVerse: async (reference, text, translation, shelfId = null) => {
    set({ error: null });
    let verse: Verse;
    try {
      verse = await verseService.addVerse(reference, text, translation, shelfId);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to add verse';
      set({ error: errorMsg });
      throw error;
    }

    // Create initial progress entry
    const initialProgress: VerseProgress = {
      verse_id: verse.id,
      times_practiced: 0,
      times_tested: 0,
      times_correct: 0,
      last_practiced: null,
      last_tested: null,
      comfort_level: 1,
    };

    set((state) => ({
      verses: [verse, ...state.verses],
      progress: {
        ...state.progress,
        [verse.id]: initialProgress,
      },
    }));

    await refreshAfterWrite('addVerse', () => get().refreshStats());
    syncAfterWrite();
    return verse;
  },

  // Bulk-add verses (plain-text import, #15)
  addVerses: async (entries, translation, shelfId = null) => {
    set({ error: null });
    let verses: Verse[];
    try {
      verses = await verseService.addVerses(entries, translation, shelfId);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to import verses';
      set({ error: errorMsg });
      throw error;
    }

    const initialProgress = (verseId: string): VerseProgress => ({
      verse_id: verseId,
      times_practiced: 0,
      times_tested: 0,
      times_correct: 0,
      last_practiced: null,
      last_tested: null,
      comfort_level: 1,
    });

    // Already newest-first (verseService staggers created_at backwards), which
    // is the order `refreshVerses` would load them back in.
    set((state) => ({
      verses: [...verses, ...state.verses],
      progress: {
        ...state.progress,
        ...Object.fromEntries(verses.map((v) => [v.id, initialProgress(v.id)])),
      },
    }));

    await refreshAfterWrite('addVerses', () => get().refreshStats());
    syncAfterWrite();
    return verses;
  },

  // Update verse
  updateVerse: async (id, updates) => {
    set({ error: null });
    try {
      const updatedVerse = await verseService.updateVerse(id, updates);

      if (updatedVerse) {
        set((state) => ({
          verses: state.verses.map((v) => (v.id === id ? updatedVerse : v)),
        }));
      }
      syncAfterWrite();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to update verse';
      set({ error: errorMsg });
      throw error;
    }
  },

  // Archive verse
  archiveVerse: async (id) => {
    set({ error: null });
    try {
      await verseService.archiveVerse(id);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to archive verse';
      set({ error: errorMsg });
      throw error;
    }

    set((state) => ({
      verses: state.verses.map((v) =>
        v.id === id ? { ...v, archived: true } : v
      ),
    }));
    await refreshAfterWrite('archiveVerse', () => get().refreshStats());
    syncAfterWrite();
  },

  // Unarchive verse
  unarchiveVerse: async (id) => {
    set({ error: null });
    try {
      await verseService.unarchiveVerse(id);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to unarchive verse';
      set({ error: errorMsg });
      throw error;
    }

    set((state) => ({
      verses: state.verses.map((v) =>
        v.id === id ? { ...v, archived: false } : v
      ),
    }));
    await refreshAfterWrite('unarchiveVerse', () => get().refreshStats());
    syncAfterWrite();
  },

  // Remove verse
  removeVerse: async (id) => {
    set({ error: null });
    try {
      await verseService.removeVerse(id);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to remove verse';
      set({ error: errorMsg });
      throw error;
    }

    set((state) => ({
      verses: state.verses.filter((v) => v.id !== id),
      progress: Object.fromEntries(
        Object.entries(state.progress).filter(([key]) => key !== id)
      ),
    }));
    await refreshAfterWrite('removeVerse', () => get().refreshStats());
    syncAfterWrite();
  },

  // --- Shelf actions (issue #5) ---

  createShelf: async (name) => {
    set({ error: null });
    try {
      const shelf = await shelfService.addShelf(name);
      set((state) => ({ shelves: [...state.shelves, shelf] }));
      syncAfterWrite();
      return shelf;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to create shelf';
      set({ error: errorMsg });
      throw error;
    }
  },

  renameShelf: async (id, name) => {
    set({ error: null });
    try {
      await shelfService.renameShelf(id, name);
      set((state) => ({
        shelves: state.shelves.map((s) => (s.id === id ? { ...s, name } : s)),
      }));
      syncAfterWrite();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to rename shelf';
      set({ error: errorMsg });
      throw error;
    }
  },

  deleteShelf: async (id) => {
    set({ error: null });
    try {
      // Service un-shelves member verses and clears the active-shelf preference
      // if it pointed at this shelf.
      await shelfService.removeShelf(id);
      set((state) => ({
        shelves: state.shelves.filter((s) => s.id !== id),
        activeShelfId: state.activeShelfId === id ? null : state.activeShelfId,
        verses: state.verses.map((v) =>
          v.shelf_id === id ? { ...v, shelf_id: null } : v
        ),
      }));
      syncAfterWrite();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to delete shelf';
      set({ error: errorMsg });
      throw error;
    }
  },

  setActiveShelf: async (id) => {
    set({ error: null });
    try {
      await shelfService.setActiveShelfId(id);
      set({ activeShelfId: id });
      // Device-local preference only — nothing to sync.
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to set active shelf';
      set({ error: errorMsg });
      throw error;
    }
  },

  setVerseShelf: async (verseId, shelfId) => {
    await get().updateVerse(verseId, { shelf_id: shelfId });
  },

  refreshShelves: async () => {
    const shelves = await shelfService.getAllShelves();
    set((state) => ({
      shelves,
      // A pull may have deleted the shelf this device had active.
      activeShelfId:
        state.activeShelfId && !shelves.some((s) => s.id === state.activeShelfId)
          ? null
          : state.activeShelfId,
    }));
  },

  // Record practice
  //
  // The Practice screens report a rejection as "Failed to save progress.
  // Please try again." over the verse they just saved, so this must reject
  // only for the durable write -- see `refreshAfterWrite` (#39).
  recordPractice: async (verseId) => {
    set({ error: null });
    try {
      await progressService.recordPractice(verseId);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to record practice';
      set({ error: errorMsg });
      throw error;
    }

    await refreshAfterWrite('recordPractice', () => get().refreshProgress(verseId));
    syncAfterWrite();
  },

  // Set comfort level
  setComfortLevel: async (verseId, level) => {
    set({ error: null });
    try {
      await progressService.setComfortLevel(verseId, level);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to set comfort level';
      set({ error: errorMsg });
      throw error;
    }

    await refreshAfterWrite('setComfortLevel', async () => {
      await get().refreshProgress(verseId);
      await get().refreshStats();
    });
    syncAfterWrite();
  },

  // Reset progress
  resetProgress: async (verseId) => {
    set({ error: null });
    try {
      await progressService.resetProgress(verseId);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to reset progress';
      set({ error: errorMsg });
      throw error;
    }

    await refreshAfterWrite('resetProgress', async () => {
      await get().refreshProgress(verseId);
      await get().refreshStats();
    });
    syncAfterWrite();
  },

  // Record test result
  //
  // This action rejects only when the durable write itself failed, because
  // that is the question its callers are asking: the Test session treats a
  // rejection as "this verse was not recorded", tells the user so, and leaves
  // it out of the session summary (`src/app/test/session.tsx`).
  //
  // Refreshing the cached progress and stats afterwards is a separate
  // concern -- see `refreshAfterWrite`. The row is already committed by then,
  // so failing there leaves the counts stale until the next load, while
  // reporting it as unrecorded would be actively worse: `test_results` is an
  // append-only log, so a user who re-tests the verse on that advice writes a
  // second row for one test.
  recordTestResult: async (verseId, passed, score) => {
    set({ error: null });
    let result: TestResult;
    try {
      result = await testService.recordTestResult(verseId, passed, score);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to record test result';
      set({ error: errorMsg });
      throw error;
    }

    await refreshAfterWrite('recordTestResult', async () => {
      await get().refreshProgress(verseId);
      await get().refreshStats();
    });
    syncAfterWrite();
    return result;
  },

  // --- Reads and refreshes ---
  //
  // These reject on failure and leave `error` to the write actions (#40
  // review). They run as cache maintenance behind a write, behind a sync pull,
  // and behind a screen mount, so writing the shared write-error field from
  // here would make it depend on which of those finished last: a refresh
  // trailing an *earlier* write could clear or overwrite a *later* write's
  // real failure. Every caller handles the rejection itself.

  // Refresh verses from database
  refreshVerses: async () => {
    const verses = await verseService.getAllVerses(true);
    const progressList = await progressService.getAllProgress();
    const progress = Object.fromEntries(progressList.map((p) => [p.verse_id, p]));
    set({ verses, progress });
  },

  // Refresh one verse's cached progress from the database
  refreshProgress: async (verseId) => {
    const updatedProgress = await progressService.getProgress(verseId);
    set((state) => ({
      progress: {
        ...state.progress,
        [verseId]: updatedProgress,
      },
    }));
  },

  // Refresh stats from database
  refreshStats: async () => {
    const stats = await statsService.getOverallStats();
    set({ stats });
  },

  // Get stats for a specific verse
  getVerseStats: async (verseId) => {
    return await statsService.getVerseStats(verseId);
  },

  // Get test history for a verse
  getTestHistory: async (verseId) => {
    return await testService.getTestHistory(verseId);
  },

  // Computed getters
  getActiveVerses: () => {
    return get().verses.filter((v) => !v.archived);
  },

  getArchivedVerses: () => {
    return get().verses.filter((v) => v.archived);
  },

  getActiveShelf: () => {
    const { shelves, activeShelfId } = get();
    return shelves.find((s) => s.id === activeShelfId) ?? null;
  },

  // The active set: non-archived verses, narrowed to the active shelf when one
  // is selected. This is what Practice and Test operate on (issue #5).
  getActiveSetVerses: () => {
    const { activeShelfId } = get();
    const active = get().getActiveVerses();
    return activeShelfId ? active.filter((v) => v.shelf_id === activeShelfId) : active;
  },

  getVersesNeedingPractice: () => {
    const { progress } = get();
    return get().getActiveSetVerses().filter((v) => {
      const p = progress[v.id];
      return !p || p.comfort_level <= 3;
    });
  },

  getVersesReadyForTest: () => {
    const { progress } = get();
    return get().getActiveSetVerses().filter((v) => {
      const p = progress[v.id];
      return p && p.comfort_level >= 3;
    });
  },

  // Export all data as JSON. A read, so it reports by rejecting only --
  // `settings.tsx` catches it and shows the alert.
  exportData: async () => {
    return await dataExportService.exportAllDataAsJSON();
  },

  // Import data from JSON
  importData: async (json) => {
    set({ isLoading: true, error: null });
    try {
      const result = await dataExportService.importAllDataFromJSON(json);

      if (!result.success) {
        throw new Error(result.error || 'Import failed');
      }

      // Refresh all state from database. The data is already committed by
      // now, so a failure here must not fail the import; the UI updates on
      // the next load.
      await refreshAfterWrite('importData', async () => {
        await get().refreshVerses();  // Loads verses AND progress
        await get().refreshShelves();  // Loads shelves (and re-validates active shelf)
        await get().refreshStats();    // Loads overall statistics
      });

      syncAfterWrite();
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to import data';
      set({ error: errorMsg });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
}));
