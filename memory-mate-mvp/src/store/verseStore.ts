import { create } from 'zustand';
import { Verse, VerseProgress, OverallStats, VerseStats, TestResult } from '@/types';
import {
  initDatabase,
  getDatabase,
} from '@/services/database';
import * as verseService from '@/services/verseService';
import * as progressService from '@/services/progressService';
import * as testService from '@/services/testService';
import * as statsService from '@/services/statsService';
import * as dataExportService from '@/services/dataExportService';

export interface VerseStore {
  // State
  verses: Verse[];
  progress: Record<string, VerseProgress>;
  stats: OverallStats | null;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;

  // Initialization
  initialize: () => Promise<void>;

  // Verse actions
  addVerse: (reference: string, text: string, translation: string) => Promise<Verse>;
  updateVerse: (id: string, updates: Partial<Verse>) => Promise<void>;
  archiveVerse: (id: string) => Promise<void>;
  unarchiveVerse: (id: string) => Promise<void>;
  removeVerse: (id: string) => Promise<void>;

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
  refreshStats: () => Promise<void>;
  getVerseStats: (verseId: string) => Promise<VerseStats | null>;
  getTestHistory: (verseId: string) => Promise<TestResult[]>;

  // Computed getters (derived state)
  getActiveVerses: () => Verse[];
  getArchivedVerses: () => Verse[];
  getVersesNeedingPractice: () => Verse[];
  getVersesReadyForTest: () => Verse[];

  // Data export/import
  exportData: () => Promise<string>;
  importData: (json: string) => Promise<dataExportService.ImportResult>;
}

export const useVerseStore = create<VerseStore>()((set, get) => ({
  // Initial state
  verses: [],
  progress: {},
  stats: null,
  isLoading: false,
  error: null,
  isInitialized: false,

  // Initialize database and load data
  initialize: async () => {
    if (get().isInitialized) return;

    set({ isLoading: true, error: null });
    try {
      await initDatabase();

      // Load all verses and progress
      const verses = await verseService.getAllVerses(true);
      const progressList = await progressService.getAllProgress();
      const progress = Object.fromEntries(progressList.map((p) => [p.verse_id, p]));
      const stats = await statsService.getOverallStats();

      set({ verses, progress, stats, isInitialized: true });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error during initialization';
      console.error('Store initialization error:', errorMsg);
      set({ error: errorMsg });
    } finally {
      set({ isLoading: false });
    }
  },

  // Add a new verse
  addVerse: async (reference, text, translation) => {
    set({ isLoading: true, error: null });
    try {
      const verse = await verseService.addVerse(reference, text, translation);

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

      // Refresh stats
      await get().refreshStats();
      return verse;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to add verse';
      set({ error: errorMsg });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  // Update verse
  updateVerse: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      const updatedVerse = await verseService.updateVerse(id, updates);

      if (updatedVerse) {
        set((state) => ({
          verses: state.verses.map((v) => (v.id === id ? updatedVerse : v)),
        }));
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to update verse';
      set({ error: errorMsg });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  // Archive verse
  archiveVerse: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await verseService.archiveVerse(id);
      set((state) => ({
        verses: state.verses.map((v) =>
          v.id === id ? { ...v, archived: true } : v
        ),
      }));
      await get().refreshStats();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to archive verse';
      set({ error: errorMsg });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  // Unarchive verse
  unarchiveVerse: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await verseService.unarchiveVerse(id);
      set((state) => ({
        verses: state.verses.map((v) =>
          v.id === id ? { ...v, archived: false } : v
        ),
      }));
      await get().refreshStats();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to unarchive verse';
      set({ error: errorMsg });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  // Remove verse
  removeVerse: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await verseService.removeVerse(id);
      set((state) => ({
        verses: state.verses.filter((v) => v.id !== id),
        progress: Object.fromEntries(
          Object.entries(state.progress).filter(([key]) => key !== id)
        ),
      }));
      await get().refreshStats();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to remove verse';
      set({ error: errorMsg });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  // Record practice
  recordPractice: async (verseId) => {
    set({ isLoading: true, error: null });
    try {
      await progressService.recordPractice(verseId);
      const updatedProgress = await progressService.getProgress(verseId);
      set((state) => ({
        progress: {
          ...state.progress,
          [verseId]: updatedProgress,
        },
      }));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to record practice';
      set({ error: errorMsg });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  // Set comfort level
  setComfortLevel: async (verseId, level) => {
    set({ isLoading: true, error: null });
    try {
      await progressService.setComfortLevel(verseId, level);
      const updatedProgress = await progressService.getProgress(verseId);
      set((state) => ({
        progress: {
          ...state.progress,
          [verseId]: updatedProgress,
        },
      }));
      await get().refreshStats();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to set comfort level';
      set({ error: errorMsg });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  // Reset progress
  resetProgress: async (verseId) => {
    set({ isLoading: true, error: null });
    try {
      await progressService.resetProgress(verseId);
      const updatedProgress = await progressService.getProgress(verseId);
      set((state) => ({
        progress: {
          ...state.progress,
          [verseId]: updatedProgress,
        },
      }));
      await get().refreshStats();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to reset progress';
      set({ error: errorMsg });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  // Record test result
  recordTestResult: async (verseId, passed, score) => {
    set({ isLoading: true, error: null });
    try {
      const result = await testService.recordTestResult(verseId, passed, score);
      const updatedProgress = await progressService.getProgress(verseId);
      set((state) => ({
        progress: {
          ...state.progress,
          [verseId]: updatedProgress,
        },
      }));
      await get().refreshStats();
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to record test result';
      set({ error: errorMsg });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  // Refresh verses from database
  refreshVerses: async () => {
    try {
      const verses = await verseService.getAllVerses(true);
      const progressList = await progressService.getAllProgress();
      const progress = Object.fromEntries(progressList.map((p) => [p.verse_id, p]));
      set({ verses, progress });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to refresh verses';
      set({ error: errorMsg });
      throw error;
    }
  },

  // Refresh stats from database
  refreshStats: async () => {
    try {
      const stats = await statsService.getOverallStats();
      set({ stats });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to refresh stats';
      set({ error: errorMsg });
      throw error;
    }
  },

  // Get stats for a specific verse
  getVerseStats: async (verseId) => {
    try {
      return await statsService.getVerseStats(verseId);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to get verse stats';
      set({ error: errorMsg });
      throw error;
    }
  },

  // Get test history for a verse
  getTestHistory: async (verseId) => {
    try {
      return await testService.getTestHistory(verseId);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to get test history';
      set({ error: errorMsg });
      throw error;
    }
  },

  // Computed getters
  getActiveVerses: () => {
    return get().verses.filter((v) => !v.archived);
  },

  getArchivedVerses: () => {
    return get().verses.filter((v) => v.archived);
  },

  getVersesNeedingPractice: () => {
    const { verses, progress } = get();
    return verses.filter((v) => {
      if (v.archived) return false;
      const p = progress[v.id];
      return !p || p.comfort_level <= 3;
    });
  },

  getVersesReadyForTest: () => {
    const { verses, progress } = get();
    return verses.filter((v) => {
      if (v.archived) return false;
      const p = progress[v.id];
      return p && p.comfort_level >= 3;
    });
  },

  // Export all data as JSON
  exportData: async () => {
    try {
      const jsonString = await dataExportService.exportAllDataAsJSON();
      return jsonString;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to export data';
      set({ error: errorMsg });
      throw error;
    }
  },

  // Import data from JSON
  importData: async (json) => {
    set({ isLoading: true, error: null });
    try {
      const result = await dataExportService.importAllDataFromJSON(json);

      if (!result.success) {
        throw new Error(result.error || 'Import failed');
      }

      // Refresh all state from database
      await get().initialize();

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
