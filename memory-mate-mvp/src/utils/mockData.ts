// Mock data for UI development and testing
// This data will be replaced with SQLite + Zustand in Phase 4

import { Verse, VerseProgress, TestResult, OverallStats, VerseStats } from '../types';

// Sample verses with varied translations and lengths
export const mockVerses: Verse[] = [
  {
    id: '1',
    reference: 'John 3:16',
    text: 'For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.',
    translation: 'NIV',
    created_at: '2026-01-10T10:30:00Z',
    archived: false,
  },
  {
    id: '2',
    reference: 'Philippians 4:13',
    text: 'I can do all things through Christ who strengthens me.',
    translation: 'NKJV',
    created_at: '2026-01-12T14:20:00Z',
    archived: false,
  },
  {
    id: '3',
    reference: 'Psalm 23:1',
    text: 'The LORD is my shepherd; I shall not want.',
    translation: 'ESV',
    created_at: '2026-01-13T09:15:00Z',
    archived: false,
  },
  {
    id: '4',
    reference: 'Romans 8:28',
    text: 'And we know that in all things God works for the good of those who love him, who have been called according to his purpose.',
    translation: 'NIV',
    created_at: '2026-01-14T16:45:00Z',
    archived: false,
  },
  {
    id: '5',
    reference: 'Proverbs 3:5-6',
    text: 'Trust in the LORD with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.',
    translation: 'NIV',
    created_at: '2026-01-15T11:00:00Z',
    archived: false,
  },
  {
    id: '6',
    reference: 'Jeremiah 29:11',
    text: 'For I know the plans I have for you, declares the LORD, plans to prosper you and not to harm you, plans to give you hope and a future.',
    translation: 'NIV',
    created_at: '2026-01-16T08:30:00Z',
    archived: false,
  },
  {
    id: '7',
    reference: '1 Corinthians 13:4-5',
    text: 'Love is patient, love is kind. It does not envy, it does not boast, it is not proud. It does not dishonor others, it is not self-seeking, it is not easily angered, it keeps no record of wrongs.',
    translation: 'NIV',
    created_at: '2026-01-17T13:10:00Z',
    archived: false,
  },
  {
    id: '8',
    reference: 'Matthew 6:33',
    text: 'But seek first his kingdom and his righteousness, and all these things will be given to you as well.',
    translation: 'NIV',
    created_at: '2026-01-18T10:20:00Z',
    archived: false,
  },
  {
    id: '9',
    reference: 'Isaiah 40:31',
    text: 'But those who hope in the LORD will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint.',
    translation: 'NIV',
    created_at: '2026-01-05T07:45:00Z',
    archived: true, // Archived verse
  },
  {
    id: '10',
    reference: 'Joshua 1:9',
    text: 'Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged, for the LORD your God will be with you wherever you go.',
    translation: 'NIV',
    created_at: '2026-01-19T15:30:00Z',
    archived: false,
  },
];

// Progress data for each verse with varied comfort levels
export const mockProgress: Record<string, VerseProgress> = {
  '1': {
    verse_id: '1',
    times_practiced: 12,
    times_tested: 5,
    times_correct: 4,
    last_practiced: '2026-01-21T14:30:00Z',
    last_tested: '2026-01-20T09:15:00Z',
    comfort_level: 5, // Memorized
  },
  '2': {
    verse_id: '2',
    times_practiced: 8,
    times_tested: 3,
    times_correct: 2,
    last_practiced: '2026-01-22T08:00:00Z',
    last_tested: '2026-01-21T16:45:00Z',
    comfort_level: 4, // Almost there
  },
  '3': {
    verse_id: '3',
    times_practiced: 5,
    times_tested: 2,
    times_correct: 1,
    last_practiced: '2026-01-20T11:20:00Z',
    last_tested: '2026-01-19T14:00:00Z',
    comfort_level: 3, // Getting familiar
  },
  '4': {
    verse_id: '4',
    times_practiced: 3,
    times_tested: 1,
    times_correct: 0,
    last_practiced: '2026-01-19T10:15:00Z',
    last_tested: '2026-01-18T13:30:00Z',
    comfort_level: 2, // Learning
  },
  '5': {
    verse_id: '5',
    times_practiced: 1,
    times_tested: 0,
    times_correct: 0,
    last_practiced: '2026-01-17T09:00:00Z',
    last_tested: null,
    comfort_level: 1, // New / Not started
  },
  '6': {
    verse_id: '6',
    times_practiced: 6,
    times_tested: 2,
    times_correct: 2,
    last_practiced: '2026-01-21T17:00:00Z',
    last_tested: '2026-01-20T11:30:00Z',
    comfort_level: 4, // Almost there
  },
  '7': {
    verse_id: '7',
    times_practiced: 10,
    times_tested: 4,
    times_correct: 3,
    last_practiced: '2026-01-22T10:00:00Z',
    last_tested: '2026-01-21T08:20:00Z',
    comfort_level: 4, // Almost there
  },
  '8': {
    verse_id: '8',
    times_practiced: 2,
    times_tested: 1,
    times_correct: 0,
    last_practiced: '2026-01-20T15:00:00Z',
    last_tested: '2026-01-19T12:00:00Z',
    comfort_level: 2, // Learning
  },
  '9': {
    verse_id: '9',
    times_practiced: 15,
    times_tested: 7,
    times_correct: 7,
    last_practiced: '2026-01-10T14:00:00Z',
    last_tested: '2026-01-09T10:30:00Z',
    comfort_level: 5, // Memorized (archived)
  },
  '10': {
    verse_id: '10',
    times_practiced: 0,
    times_tested: 0,
    times_correct: 0,
    last_practiced: null,
    last_tested: null,
    comfort_level: 1, // New / Not started
  },
};

// Test history with varied results
export const mockTestResults: TestResult[] = [
  // John 3:16 tests (5 total, 4 passed)
  { id: 't1', verse_id: '1', timestamp: '2026-01-15T10:00:00Z', passed: true, score: 1.0 },
  { id: 't2', verse_id: '1', timestamp: '2026-01-16T14:30:00Z', passed: true, score: 0.98 },
  { id: 't3', verse_id: '1', timestamp: '2026-01-17T09:15:00Z', passed: false, score: 0.75 },
  { id: 't4', verse_id: '1', timestamp: '2026-01-19T11:00:00Z', passed: true, score: 0.95 },
  { id: 't5', verse_id: '1', timestamp: '2026-01-20T09:15:00Z', passed: true, score: 1.0 },

  // Philippians 4:13 tests (3 total, 2 passed)
  { id: 't6', verse_id: '2', timestamp: '2026-01-18T08:00:00Z', passed: true, score: 0.92 },
  { id: 't7', verse_id: '2', timestamp: '2026-01-20T13:00:00Z', passed: false, score: 0.7 },
  { id: 't8', verse_id: '2', timestamp: '2026-01-21T16:45:00Z', passed: true, score: 0.88 },

  // Psalm 23:1 tests (2 total, 1 passed)
  { id: 't9', verse_id: '3', timestamp: '2026-01-17T10:00:00Z', passed: false, score: 0.65 },
  { id: 't10', verse_id: '3', timestamp: '2026-01-19T14:00:00Z', passed: true, score: 0.85 },

  // Romans 8:28 tests (1 total, 0 passed)
  { id: 't11', verse_id: '4', timestamp: '2026-01-18T13:30:00Z', passed: false, score: 0.6 },

  // Jeremiah 29:11 tests (2 total, 2 passed)
  { id: 't12', verse_id: '6', timestamp: '2026-01-19T09:00:00Z', passed: true, score: 0.9 },
  { id: 't13', verse_id: '6', timestamp: '2026-01-20T11:30:00Z', passed: true, score: 0.95 },

  // 1 Corinthians 13:4-5 tests (4 total, 3 passed)
  { id: 't14', verse_id: '7', timestamp: '2026-01-18T15:00:00Z', passed: true, score: 0.88 },
  { id: 't15', verse_id: '7', timestamp: '2026-01-19T10:30:00Z', passed: false, score: 0.72 },
  { id: 't16', verse_id: '7', timestamp: '2026-01-20T14:00:00Z', passed: true, score: 0.9 },
  { id: 't17', verse_id: '7', timestamp: '2026-01-21T08:20:00Z', passed: true, score: 0.93 },

  // Matthew 6:33 tests (1 total, 0 passed)
  { id: 't18', verse_id: '8', timestamp: '2026-01-19T12:00:00Z', passed: false, score: 0.55 },

  // Isaiah 40:31 tests (7 total, 7 passed - archived verse)
  { id: 't19', verse_id: '9', timestamp: '2026-01-06T09:00:00Z', passed: true, score: 0.8 },
  { id: 't20', verse_id: '9', timestamp: '2026-01-06T15:00:00Z', passed: true, score: 0.85 },
  { id: 't21', verse_id: '9', timestamp: '2026-01-07T10:00:00Z', passed: true, score: 0.9 },
  { id: 't22', verse_id: '9', timestamp: '2026-01-07T16:00:00Z', passed: true, score: 0.92 },
  { id: 't23', verse_id: '9', timestamp: '2026-01-08T09:00:00Z', passed: true, score: 0.95 },
  { id: 't24', verse_id: '9', timestamp: '2026-01-08T14:00:00Z', passed: true, score: 0.98 },
  { id: 't25', verse_id: '9', timestamp: '2026-01-09T10:30:00Z', passed: true, score: 1.0 },
];

// Overall statistics
export const mockOverallStats: OverallStats = {
  total_verses: 10,
  active_verses: 9,
  archived_verses: 1,
  total_practiced: 47,
  total_tested: 18,
  total_correct: 15,
  overall_accuracy: 0.833, // 15/18 = 83.3%
  verses_by_comfort: {
    1: 2, // New / Not started
    2: 2, // Learning
    3: 1, // Getting familiar
    4: 3, // Almost there
    5: 2, // Memorized
  },
  average_comfort: 3.2,
};

// Helper function to get test results for a specific verse
export const getTestResultsForVerse = (verseId: string): TestResult[] => {
  return mockTestResults.filter(result => result.verse_id === verseId);
};

// Helper function to get verse statistics
export const getVerseStats = (verseId: string): VerseStats | null => {
  const progress = mockProgress[verseId];
  if (!progress) return null;

  const accuracy = progress.times_tested > 0
    ? progress.times_correct / progress.times_tested
    : 0;

  // Calculate consecutive correct count
  const verseTests = getTestResultsForVerse(verseId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  let consecutiveCorrect = 0;
  for (const test of verseTests) {
    if (test.passed) {
      consecutiveCorrect++;
    } else {
      break;
    }
  }

  return {
    verse_id: verseId,
    times_practiced: progress.times_practiced,
    times_tested: progress.times_tested,
    times_correct: progress.times_correct,
    accuracy,
    comfort_level: progress.comfort_level,
    last_practiced: progress.last_practiced,
    last_tested: progress.last_tested,
    consecutive_correct: consecutiveCorrect,
  };
};

// Helper function to get active verses only
export const getActiveVerses = (): Verse[] => {
  return mockVerses.filter(v => !v.archived);
};

// Helper function to get archived verses only
export const getArchivedVerses = (): Verse[] => {
  return mockVerses.filter(v => v.archived);
};

// Helper function to get verse by ID
export const getVerseById = (id: string): Verse | undefined => {
  return mockVerses.find(v => v.id === id);
};

// Helper function to get verses that need practice (comfort level 1-3)
export const getVersesNeedingPractice = (): Verse[] => {
  return mockVerses.filter(v => {
    if (v.archived) return false;
    const progress = mockProgress[v.id];
    return progress && progress.comfort_level <= 3;
  });
};

// Helper function to get verses ready for testing (comfort level 3+)
export const getVersesReadyForTest = (): Verse[] => {
  return mockVerses.filter(v => {
    if (v.archived) return false;
    const progress = mockProgress[v.id];
    return progress && progress.comfort_level >= 3;
  });
};
