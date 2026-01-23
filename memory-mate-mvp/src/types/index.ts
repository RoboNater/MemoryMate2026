// Type definitions for Memory Mate MVP
// These mirror the Python prototype data model

/**
 * Verse - The memorizable text
 */
export interface Verse {
  id: string;
  reference: string; // e.g., "John 3:16"
  text: string; // Full verse content
  translation: string; // e.g., "NIV", "ESV", "NKJV"
  created_at: string; // ISO 8601 datetime string
  archived: boolean;
}

/**
 * VerseProgress - Memorization tracking for a specific verse
 */
export interface VerseProgress {
  verse_id: string;
  times_practiced: number;
  times_tested: number;
  times_correct: number;
  last_practiced: string | null; // ISO 8601 datetime string
  last_tested: string | null; // ISO 8601 datetime string
  comfort_level: 1 | 2 | 3 | 4 | 5; // 1=New, 2=Learning, 3=Familiar, 4=Almost, 5=Memorized
}

/**
 * TestResult - Individual test attempt record
 */
export interface TestResult {
  id: string;
  verse_id: string;
  timestamp: string; // ISO 8601 datetime string
  passed: boolean;
  score?: number; // Optional: 0.0-1.0 representing accuracy
}

/**
 * OverallStats - Aggregate statistics across all verses
 */
export interface OverallStats {
  total_verses: number;
  active_verses: number;
  archived_verses: number;
  total_practiced: number;
  total_tested: number;
  total_correct: number;
  overall_accuracy: number; // 0.0-1.0
  verses_by_comfort: {
    1: number; // Count of verses at comfort level 1
    2: number;
    3: number;
    4: number;
    5: number;
  };
  average_comfort: number;
}

/**
 * VerseStats - Statistics for a specific verse
 */
export interface VerseStats {
  verse_id: string;
  times_practiced: number;
  times_tested: number;
  times_correct: number;
  accuracy: number; // 0.0-1.0
  comfort_level: 1 | 2 | 3 | 4 | 5;
  last_practiced: string | null;
  last_tested: string | null;
  consecutive_correct: number; // Current streak of correct tests
}

/**
 * Comfort level labels for UI display
 */
export const COMFORT_LABELS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'New / Not Started',
  2: 'Learning',
  3: 'Getting Familiar',
  4: 'Almost There',
  5: 'Memorized',
};

/**
 * Translation options
 */
export const TRANSLATIONS = [
  'NIV',
  'ESV',
  'NKJV',
  'KJV',
  'NLT',
  'NASB',
  'CSB',
  'MSG',
  'AMP',
] as const;

export type Translation = typeof TRANSLATIONS[number];
