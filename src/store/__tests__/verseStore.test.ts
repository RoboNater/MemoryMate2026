/**
 * These tests pin one narrow contract of the store's write actions (see the
 * comments on `refreshAfterWrite` and `recordTestResult` in
 * `../verseStore.ts`): a write action rejects if and only if the *durable*
 * write rejects. If the durable write succeeds but the post-write cache
 * refresh (`progressService.getProgress` / `refreshStats`) fails, the action
 * still resolves and logs to `console.error` instead -- otherwise the calling
 * screen tells the user a saved change was lost.
 *
 * They also pin the two fields `RootLayout` reads (#39): a failed write never
 * sets `initError`, which is what makes the app show its fatal "Failed to
 * load" screen, and never sets `isLoading`, which is what makes it show the
 * full-screen startup spinner. And they pin who may write `error`: the write
 * actions, never a refresh -- writes overlap, so a refresh that wrote it could
 * clear a later write's failure depending on which finished first.
 *
 * Per AGENTS.md, database-backed code is otherwise deliberately left
 * uncovered here -- this is not a general test of the store or of SQLite
 * behavior. The immediate service boundary is mocked shallowly (with
 * explicit factories, so nothing pulls in expo-sqlite/sql.js transitively);
 * nothing else about the store's other actions is exercised.
 */
import { useVerseStore } from '../verseStore';
import { initDatabase } from '@/services/database';
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

const mockedInitDatabase = initDatabase as jest.MockedFunction<typeof initDatabase>;
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

  it('rejects when the durable write fails, and reports it on `error`', async () => {
    mockedTestService.recordTestResult.mockRejectedValue(new Error('db write failed'));

    await expect(useVerseStore.getState().recordTestResult(VERSE_ID, true)).rejects.toThrow(
      'db write failed'
    );

    expect(useVerseStore.getState().error).toBe('db write failed');
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
    // The test itself was recorded, so nothing the caller asked for failed --
    // and a refresh doesn't write `error` in the first place.
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

/**
 * The Practice actions (#39). `recordTestResult` above got this treatment when
 * the Test session needed a trustworthy "was it recorded?" signal; these three
 * report the same thing to `practice/session.tsx`, which shows "Failed to save
 * progress. Please try again." on a rejection.
 */
const progressWrites: {
  action: 'recordPractice' | 'setComfortLevel' | 'resetProgress';
  call: () => Promise<void>;
  // recordPractice refreshes only the verse's own progress, as it always has
  // -- it leaves `stats.total_practiced` stale until the next load, which is
  // pre-existing behavior this change doesn't touch.
  refreshesStats: boolean;
}[] = [
  {
    action: 'recordPractice',
    call: () => useVerseStore.getState().recordPractice(VERSE_ID),
    refreshesStats: false,
  },
  {
    action: 'setComfortLevel',
    call: () => useVerseStore.getState().setComfortLevel(VERSE_ID, 4),
    refreshesStats: true,
  },
  {
    action: 'resetProgress',
    call: () => useVerseStore.getState().resetProgress(VERSE_ID),
    refreshesStats: true,
  },
];

describe.each(progressWrites)('useVerseStore().$action', ({ action, call, refreshesStats }) => {
  const initialState = useVerseStore.getState();
  // The three have different signatures, so reach for the shared jest.Mock
  // surface rather than the union of their mocked types.
  const durable = () => mockedProgressService[action] as unknown as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    useVerseStore.setState(initialState, true);
    jest.spyOn(console, 'error').mockImplementation(() => {});
    durable().mockResolvedValue(undefined);
    mockedProgressService.getProgress.mockResolvedValue(makeProgress());
    mockedStatsService.getOverallStats.mockResolvedValue(makeStats());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('rejects when the durable write fails', async () => {
    durable().mockRejectedValue(new Error('db write failed'));

    await expect(call()).rejects.toThrow('db write failed');

    expect(useVerseStore.getState().error).toBe('db write failed');
  });

  it('resolves when the durable write succeeds but refreshing progress fails', async () => {
    mockedProgressService.getProgress.mockRejectedValue(new Error('progress refresh failed'));

    await expect(call()).resolves.toBeUndefined();

    expect(console.error).toHaveBeenCalled();
    expect(useVerseStore.getState().error).toBeNull();
  });

  (refreshesStats ? it : it.skip)('resolves when the durable write succeeds but refreshing stats fails', async () => {
    mockedStatsService.getOverallStats.mockRejectedValue(new Error('stats refresh failed'));

    await expect(call()).resolves.toBeUndefined();

    expect(console.error).toHaveBeenCalled();
    expect(useVerseStore.getState().error).toBeNull();
  });

  it('caches the refreshed progress on the happy path', async () => {
    const progress = makeProgress({ comfort_level: 4 });
    mockedProgressService.getProgress.mockResolvedValue(progress);

    await call();

    expect(useVerseStore.getState().progress[VERSE_ID]).toEqual(progress);
    expect(console.error).not.toHaveBeenCalled();
  });

  it('never touches the fields RootLayout gates the whole app on', async () => {
    // The startup spinner must not flash over the screen the user is on, and
    // a failed save must not replace the app with "Failed to load" (#39).
    const loadingDuringWrite: boolean[] = [];
    durable().mockImplementation(async () => {
      loadingDuringWrite.push(useVerseStore.getState().isLoading);
    });

    await call();
    expect(loadingDuringWrite).toEqual([false]);
    expect(useVerseStore.getState().isLoading).toBe(false);
    expect(useVerseStore.getState().initError).toBeNull();

    durable().mockRejectedValue(new Error('db write failed'));
    await expect(call()).rejects.toThrow('db write failed');
    expect(useVerseStore.getState().isLoading).toBe(false);
    expect(useVerseStore.getState().initError).toBeNull();
  });
});

/**
 * `error` is shared mutable state and writes overlap, so the two ends of one
 * write must not reach for it independently: a post-write refresh belonging to
 * an *earlier* write can finish after a *later* write has already failed.
 */
describe('overlapping writes', () => {
  const initialState = useVerseStore.getState();

  beforeEach(() => {
    jest.clearAllMocks();
    useVerseStore.setState(initialState, true);
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("a slow refresh from write A does not clear write B's error", async () => {
    // A commits durably, then hangs refreshing its cached copy.
    let failARefresh!: (reason: Error) => void;
    mockedProgressService.setComfortLevel.mockResolvedValue(true);
    mockedProgressService.getProgress.mockReturnValue(
      new Promise((_resolve, reject) => {
        failARefresh = reject;
      })
    );
    mockedStatsService.getOverallStats.mockResolvedValue(makeStats());
    const a = useVerseStore.getState().setComfortLevel(VERSE_ID, 4);

    // B fails durably while A's refresh is still in flight.
    mockedProgressService.recordPractice.mockRejectedValue(new Error('B failed'));
    await expect(useVerseStore.getState().recordPractice(VERSE_ID)).rejects.toThrow('B failed');
    expect(useVerseStore.getState().error).toBe('B failed');

    // A's refresh now fails too. That is A's cache going stale, not a write
    // failing, and it must not touch the error B just reported.
    failARefresh(new Error('progress refresh failed'));
    await expect(a).resolves.toBeUndefined();
    expect(useVerseStore.getState().error).toBe('B failed');
  });
});

describe('useVerseStore().initialize', () => {
  const initialState = useVerseStore.getState();

  beforeEach(() => {
    jest.clearAllMocks();
    useVerseStore.setState(initialState, true);
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reports a failure to open the database as `initError`, the fatal one', async () => {
    mockedInitDatabase.mockRejectedValue(new Error('could not open the database'));

    await useVerseStore.getState().initialize();

    const state = useVerseStore.getState();
    expect(state.initError).toBe('could not open the database');
    expect(state.isInitialized).toBe(false);
    expect(state.isLoading).toBe(false);
    // `error` is the non-fatal, per-write field; initialization doesn't use it.
    expect(state.error).toBeNull();
  });
});
