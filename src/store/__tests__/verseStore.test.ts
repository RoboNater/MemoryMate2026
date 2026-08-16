/**
 * These tests pin one narrow contract of `useVerseStore().recordTestResult()`
 * (see the comment above it in `../verseStore.ts`): it rejects if and only if
 * the durable write (`testService.recordTestResult`) rejects, and does not
 * set the store's `error` field in that case. If the durable write succeeds
 * but the post-write cache refresh (`progressService.getProgress` /
 * `refreshStats`) fails, it still resolves with the `TestResult` and logs to
 * `console.error` instead.
 *
 * Per AGENTS.md, database-backed code is otherwise deliberately left
 * uncovered here -- this is not a general test of the store or of SQLite
 * behavior. The immediate service boundary is mocked shallowly (with
 * explicit factories, so nothing pulls in expo-sqlite/sql.js transitively);
 * nothing else about the store's other actions is exercised.
 */
import { useVerseStore } from '../verseStore';
import * as testService from '@/services/testService';
import * as progressService from '@/services/progressService';
import * as statsService from '@/services/statsService';
import { OverallStats, TestResult, VerseProgress } from '@/types';

jest.mock('@/services/database', () => ({
  initDatabase: jest.fn(),
}));
jest.mock('@/services/verseService', () => ({}));
jest.mock('@/services/shelfService', () => ({}));
jest.mock('@/services/dataExportService', () => ({}));
// Dynamically imported by verseStore's syncAfterWrite() after a successful
// write; stub it so recordTestResult's success path doesn't try to load the
// real sync engine (which pulls in Supabase and this same store).
jest.mock('@/services/syncService', () => ({
  scheduleSync: jest.fn(),
}));
jest.mock('@/services/testService', () => ({
  recordTestResult: jest.fn(),
  getTestHistory: jest.fn(),
  getAllTestResults: jest.fn(),
}));
jest.mock('@/services/progressService', () => ({
  getProgress: jest.fn(),
  getAllProgress: jest.fn(),
  recordPractice: jest.fn(),
  setComfortLevel: jest.fn(),
  resetProgress: jest.fn(),
}));
jest.mock('@/services/statsService', () => ({
  getOverallStats: jest.fn(),
  getVerseStats: jest.fn(),
}));

const mockedTestService = testService as jest.Mocked<typeof testService>;
const mockedProgressService = progressService as jest.Mocked<typeof progressService>;
const mockedStatsService = statsService as jest.Mocked<typeof statsService>;

const VERSE_ID = 'verse-1';

function makeTestResult(overrides: Partial<TestResult> = {}): TestResult {
  return {
    id: 'result-1',
    verse_id: VERSE_ID,
    timestamp: '2026-08-15T00:00:00.000Z',
    passed: true,
    ...overrides,
  };
}

function makeProgress(overrides: Partial<VerseProgress> = {}): VerseProgress {
  return {
    verse_id: VERSE_ID,
    times_practiced: 1,
    times_tested: 1,
    times_correct: 1,
    last_practiced: '2026-08-15T00:00:00.000Z',
    last_tested: '2026-08-15T00:00:00.000Z',
    comfort_level: 3,
    ...overrides,
  };
}

function makeStats(overrides: Partial<OverallStats> = {}): OverallStats {
  return {
    total_verses: 1,
    active_verses: 1,
    archived_verses: 0,
    total_practiced: 1,
    total_tested: 1,
    total_correct: 1,
    overall_accuracy: 1,
    verses_by_comfort: { 1: 0, 2: 0, 3: 1, 4: 0, 5: 0 },
    average_comfort: 3,
    ...overrides,
  };
}

describe('useVerseStore().recordTestResult', () => {
  const initialState = useVerseStore.getState();

  beforeEach(() => {
    jest.clearAllMocks();
    useVerseStore.setState(initialState, true);
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('rejects when the durable write fails, and leaves `error` null', async () => {
    mockedTestService.recordTestResult.mockRejectedValue(new Error('db write failed'));

    await expect(useVerseStore.getState().recordTestResult(VERSE_ID, true)).rejects.toThrow(
      'db write failed'
    );

    expect(useVerseStore.getState().error).toBeNull();
  });

  it('resolves with the TestResult when the durable write succeeds but refreshing progress fails', async () => {
    const result = makeTestResult();
    mockedTestService.recordTestResult.mockResolvedValue(result);
    mockedProgressService.getProgress.mockRejectedValue(new Error('progress refresh failed'));
    mockedStatsService.getOverallStats.mockResolvedValue(makeStats());

    await expect(useVerseStore.getState().recordTestResult(VERSE_ID, true)).resolves.toEqual(
      result
    );
    expect(console.error).toHaveBeenCalled();
    expect(useVerseStore.getState().error).toBeNull();
  });

  it('resolves with the TestResult when the durable write succeeds but refreshing stats fails', async () => {
    const result = makeTestResult();
    const progress = makeProgress();
    mockedTestService.recordTestResult.mockResolvedValue(result);
    mockedProgressService.getProgress.mockResolvedValue(progress);
    mockedStatsService.getOverallStats.mockRejectedValue(new Error('stats refresh failed'));

    await expect(useVerseStore.getState().recordTestResult(VERSE_ID, true)).resolves.toEqual(
      result
    );
    expect(console.error).toHaveBeenCalled();
    // refreshStats() sets the store's `error` on the way out, which RootLayout
    // treats as fatal (#39); a recorded test must not take the app down.
    expect(useVerseStore.getState().error).toBeNull();
  });

  it('happy path: resolves with the TestResult and caches the refreshed progress', async () => {
    const result = makeTestResult();
    const progress = makeProgress();
    mockedTestService.recordTestResult.mockResolvedValue(result);
    mockedProgressService.getProgress.mockResolvedValue(progress);
    mockedStatsService.getOverallStats.mockResolvedValue(makeStats());

    await expect(useVerseStore.getState().recordTestResult(VERSE_ID, true)).resolves.toEqual(
      result
    );

    expect(useVerseStore.getState().progress[VERSE_ID]).toEqual(progress);
    expect(console.error).not.toHaveBeenCalled();
  });
});
