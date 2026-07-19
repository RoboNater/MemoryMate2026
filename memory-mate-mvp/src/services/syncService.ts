/**
 * Sync engine — reconciles the local SQLite cache with Supabase (ccc.30, Phase 4).
 *
 * Strategy (offline-first, last-write-wins):
 *   - PUSH local rows changed since the last push watermark, in dependency order
 *     (shelves -> verses -> progress -> test_results), upserting to Supabase.
 *   - PULL remote rows changed since the last pull watermark and merge them in:
 *       * test_results : append-only; insert if absent, else take the newer row
 *                        (carries deleted_at tombstones).
 *       * shelves      : last-write-wins by updated_at (incl. deleted_at).
 *       * verses       : last-write-wins by updated_at (incl. archived/shelf_id/deleted_at).
 *       * progress     : counters reconciled via max(); comfort, last-practiced,
 *                        last-tested and deleted_at follow the newer updated_at.
 *
 * `updated_at` is the client-written ISO-8601 marker; comparisons parse to Date to
 * be tolerant of formatting. Watermarks live in the local `sync_state` table.
 *
 * The engine is sync-agnostic to the service layer: services just maintain
 * updated_at, and this module reads/writes the DB directly. It is a no-op when
 * Supabase is unconfigured or no user is signed in (the app stays offline-capable).
 *
 * Account boundary (issue #2): only unowned local rows (user_id IS NULL) are
 * adopted by a signing-in account; rows owned by a different account are never
 * re-stamped — they are purged when the synced account changes, and sign-out
 * clears the local cache entirely (clearLocalDataOnSignOut) so each account
 * starts clean on a shared device.
 */
import { getDatabase } from './database';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { getCurrentSession } from './authService';
import { useVerseStore } from '@/store/verseStore';
import { useSyncStore } from '@/store/syncStore';

const EPOCH = '1970-01-01T00:00:00.000Z';
const UPSERT_CHUNK = 500;

export interface SyncResult {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  pushed?: number;
  pulled?: number;
  error?: string;
}

// ---------------------------------------------------------------------------
// sync_state helpers
// ---------------------------------------------------------------------------

async function getMeta(key: string): Promise<string | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM sync_state WHERE key = ?',
    [key]
  );
  return row?.value ?? null;
}

async function setMeta(key: string, value: string): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    `INSERT INTO sync_state (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = ?`,
    [key, value, value]
  );
}

/** True if ISO string `a` is strictly newer than `b` (null/empty treated as oldest). */
function isNewer(a: string | null | undefined, b: string | null | undefined): boolean {
  const ta = a ? Date.parse(a) : 0;
  const tb = b ? Date.parse(b) : 0;
  return ta > tb;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ---------------------------------------------------------------------------
// Push
// ---------------------------------------------------------------------------

async function pushTable(
  table: 'shelves' | 'verses' | 'progress' | 'test_results',
  since: string,
  userId: string,
  toPayload: (row: any) => Record<string, unknown>,
  onConflict: string
): Promise<number> {
  const db = getDatabase();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM ${table} WHERE updated_at > ?`,
    [since]
  );
  if (rows.length === 0) return 0;

  const payloads = rows.map((r) => ({ ...toPayload(r), user_id: userId }));
  for (const part of chunk(payloads, UPSERT_CHUNK)) {
    const { error } = await supabase.from(table).upsert(part, { onConflict });
    if (error) throw new Error(`push ${table}: ${error.message}`);
  }
  return rows.length;
}

async function pushAll(since: string, userId: string): Promise<number> {
  let n = 0;
  // Dependency order so server-side FKs are always satisfied.
  n += await pushTable(
    'shelves',
    since,
    userId,
    (r) => ({
      id: r.id,
      name: r.name,
      created_at: r.created_at,
      updated_at: r.updated_at,
      deleted_at: r.deleted_at ?? null,
    }),
    'id'
  );
  n += await pushTable(
    'verses',
    since,
    userId,
    (r) => ({
      id: r.id,
      reference: r.reference,
      text: r.text,
      translation: r.translation,
      created_at: r.created_at,
      archived: r.archived === 1,
      shelf_id: r.shelf_id ?? null,
      updated_at: r.updated_at,
      deleted_at: r.deleted_at ?? null,
    }),
    'id'
  );
  n += await pushTable(
    'progress',
    since,
    userId,
    (r) => ({
      verse_id: r.verse_id,
      times_practiced: r.times_practiced,
      times_tested: r.times_tested,
      times_correct: r.times_correct,
      last_practiced: r.last_practiced ?? null,
      last_tested: r.last_tested ?? null,
      comfort_level: r.comfort_level,
      updated_at: r.updated_at,
      deleted_at: r.deleted_at ?? null,
    }),
    'verse_id'
  );
  n += await pushTable(
    'test_results',
    since,
    userId,
    (r) => ({
      id: r.id,
      verse_id: r.verse_id,
      timestamp: r.timestamp,
      passed: r.passed === 1,
      score: r.score ?? null,
      updated_at: r.updated_at,
      deleted_at: r.deleted_at ?? null,
    }),
    'id'
  );
  return n;
}

// ---------------------------------------------------------------------------
// Pull + merge
// ---------------------------------------------------------------------------

async function fetchRemote(
  table: 'shelves' | 'verses' | 'progress' | 'test_results',
  since: string
): Promise<any[]> {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .gt('updated_at', since)
    .order('updated_at', { ascending: true });
  if (error) throw new Error(`pull ${table}: ${error.message}`);
  return data ?? [];
}

/** Merge pulled rows; returns the max remote updated_at seen (for the watermark). */
async function pullAll(since: string): Promise<{ pulled: number; maxUpdated: string }> {
  const db = getDatabase();
  let pulled = 0;
  let maxUpdated = since;
  const note = (ua: string | null) => {
    if (ua && isNewer(ua, maxUpdated)) maxUpdated = ua;
  };

  // --- shelves (first: verses.shelf_id refers to them; last-write-wins) ---
  for (const r of await fetchRemote('shelves', since)) {
    note(r.updated_at);
    try {
      const local = await db.getFirstAsync<any>('SELECT * FROM shelves WHERE id = ?', [r.id]);
      if (!local) {
        await db.runAsync(
          `INSERT INTO shelves (id, name, created_at, user_id, updated_at, deleted_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [r.id, r.name, r.created_at, r.user_id ?? null, r.updated_at ?? null, r.deleted_at ?? null]
        );
        pulled++;
      } else if (isNewer(r.updated_at, local.updated_at)) {
        await db.runAsync(
          `UPDATE shelves SET name = ?, created_at = ?, updated_at = ?, deleted_at = ? WHERE id = ?`,
          [r.name, r.created_at, r.updated_at ?? null, r.deleted_at ?? null, r.id]
        );
        pulled++;
      }
    } catch (e) {
      console.warn('[MemoryMate] sync: skipped shelf', r.id, e);
    }
  }

  // --- verses (must come first so progress/test_results FKs resolve locally) ---
  for (const r of await fetchRemote('verses', since)) {
    note(r.updated_at);
    try {
      const local = await db.getFirstAsync<any>('SELECT * FROM verses WHERE id = ?', [r.id]);
      const archived = r.archived ? 1 : 0;
      if (!local) {
        await db.runAsync(
          `INSERT INTO verses (id, reference, text, translation, created_at, archived, shelf_id, user_id, updated_at, deleted_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [r.id, r.reference, r.text, r.translation, r.created_at, archived, r.shelf_id ?? null, r.user_id ?? null, r.updated_at ?? null, r.deleted_at ?? null]
        );
        pulled++;
      } else if (isNewer(r.updated_at, local.updated_at)) {
        await db.runAsync(
          `UPDATE verses SET reference = ?, text = ?, translation = ?, archived = ?, shelf_id = ?,
             created_at = ?, updated_at = ?, deleted_at = ? WHERE id = ?`,
          [r.reference, r.text, r.translation, archived, r.shelf_id ?? null, r.created_at, r.updated_at ?? null, r.deleted_at ?? null, r.id]
        );
        pulled++;
      }
    } catch (e) {
      console.warn('[MemoryMate] sync: skipped verse', r.id, e);
    }
  }

  // --- progress (counter reconciliation + last-write-wins) ---
  for (const r of await fetchRemote('progress', since)) {
    note(r.updated_at);
    try {
      const local = await db.getFirstAsync<any>('SELECT * FROM progress WHERE verse_id = ?', [r.verse_id]);
      if (!local) {
        await db.runAsync(
          `INSERT INTO progress (verse_id, times_practiced, times_tested, times_correct,
             last_practiced, last_tested, comfort_level, user_id, updated_at, deleted_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [r.verse_id, r.times_practiced, r.times_tested, r.times_correct,
           r.last_practiced ?? null, r.last_tested ?? null, r.comfort_level, r.user_id ?? null,
           r.updated_at ?? null, r.deleted_at ?? null]
        );
        pulled++;
      } else {
        // Counters are monotonic per device -> take the max so concurrent offline
        // practice on two devices never loses increments.
        const tp = Math.max(local.times_practiced, r.times_practiced);
        const tt = Math.max(local.times_tested, r.times_tested);
        const tc = Math.max(local.times_correct, r.times_correct);
        const remoteNewer = isNewer(r.updated_at, local.updated_at);
        // Point-in-time fields follow whichever row is newer.
        const comfort = remoteNewer ? r.comfort_level : local.comfort_level;
        const lp = remoteNewer ? (r.last_practiced ?? null) : local.last_practiced;
        const lt = remoteNewer ? (r.last_tested ?? null) : local.last_tested;
        const del = remoteNewer ? (r.deleted_at ?? null) : local.deleted_at;
        const ua = remoteNewer ? (r.updated_at ?? null) : local.updated_at;
        await db.runAsync(
          `UPDATE progress SET times_practiced = ?, times_tested = ?, times_correct = ?,
             comfort_level = ?, last_practiced = ?, last_tested = ?, deleted_at = ?, updated_at = ?
           WHERE verse_id = ?`,
          [tp, tt, tc, comfort, lp, lt, del, ua, r.verse_id]
        );
        pulled++;
      }
    } catch (e) {
      console.warn('[MemoryMate] sync: skipped progress', r.verse_id, e);
    }
  }

  // --- test_results (append-only; updates only propagate tombstones) ---
  for (const r of await fetchRemote('test_results', since)) {
    note(r.updated_at);
    try {
      const local = await db.getFirstAsync<any>('SELECT * FROM test_results WHERE id = ?', [r.id]);
      const passed = r.passed ? 1 : 0;
      if (!local) {
        await db.runAsync(
          `INSERT INTO test_results (id, verse_id, timestamp, passed, score, user_id, updated_at, deleted_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [r.id, r.verse_id, r.timestamp, passed, r.score ?? null, r.user_id ?? null, r.updated_at ?? null, r.deleted_at ?? null]
        );
        pulled++;
      } else if (isNewer(r.updated_at, local.updated_at)) {
        await db.runAsync(
          `UPDATE test_results SET passed = ?, score = ?, deleted_at = ?, updated_at = ? WHERE id = ?`,
          [passed, r.score ?? null, r.deleted_at ?? null, r.updated_at ?? null, r.id]
        );
        pulled++;
      }
    } catch (e) {
      console.warn('[MemoryMate] sync: skipped test_result', r.id, e);
    }
  }

  return { pulled, maxUpdated };
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

let inFlight: Promise<SyncResult> | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Adopt genuinely-unowned local rows (user_id IS NULL) for the signed-in user.
 * Pre-account data migrates to the first account that syncs, and rows created
 * while signed in get owned. Rows already stamped with a different account's
 * user_id are never re-claimed — re-stamping would push one account's data into
 * another account's cloud on a shared device (issue #2).
 */
async function adoptUnownedRows(userId: string): Promise<void> {
  const db = getDatabase();
  for (const table of ['shelves', 'verses', 'progress', 'test_results']) {
    await db.runAsync(`UPDATE ${table} SET user_id = ? WHERE user_id IS NULL`, [userId]);
  }
}

/**
 * Delete local rows owned by a different account (issue #2). Normally a no-op —
 * sign-out already clears local data — but covers account switches that bypass
 * sign-out, so another account's rows are never shown to or synced for this
 * user. Children are deleted first so the result doesn't depend on FK cascades.
 */
async function purgeRowsOwnedByOthers(userId: string): Promise<boolean> {
  const db = getDatabase();
  let purged = false;
  for (const table of ['test_results', 'progress', 'verses', 'shelves']) {
    const result = await db.runAsync(
      `DELETE FROM ${table} WHERE user_id IS NOT NULL AND user_id != ?`,
      [userId]
    );
    if ((result?.changes ?? 0) > 0) purged = true;
  }
  return purged;
}

/**
 * Wipe the local synced tables and sync checkpoints. Called on sign-out so the
 * local DB behaves as a per-account cache: the next sign-in (possibly a
 * different account on a shared device) starts clean and re-pulls its own data
 * from the cloud (issue #2).
 *
 * No-ops when no account has ever completed a sync on this device
 * (`synced_user_id` unset): that data was never claimed or pushed, so wiping it
 * would destroy the only copy.
 */
export async function clearLocalDataOnSignOut(): Promise<boolean> {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  if ((await getMeta('synced_user_id')) === null) return false;
  const db = getDatabase();
  for (const table of ['test_results', 'progress', 'verses', 'shelves']) {
    await db.runAsync(`DELETE FROM ${table}`);
  }
  // active_shelf_id goes too: the shelf it points at no longer exists locally,
  // and the next sign-in may be a different account.
  await db.runAsync(
    `DELETE FROM sync_state WHERE key IN ('synced_user_id', 'last_pushed_at', 'last_pulled_at', 'active_shelf_id')`
  );
  return true;
}

/**
 * Run a full sync (push then pull). Concurrency-safe: overlapping calls share the
 * same in-flight run. No-ops when unconfigured or signed out.
 */
export async function sync(): Promise<SyncResult> {
  if (inFlight) return inFlight;
  inFlight = (async (): Promise<SyncResult> => {
    if (!isSupabaseConfigured) return { ok: false, skipped: true, reason: 'not-configured' };

    const session = await getCurrentSession();
    if (!session) return { ok: false, skipped: true, reason: 'signed-out' };
    const userId = session.user.id;

    const sync = useSyncStore.getState();
    sync.setSyncing(true);
    try {
      // First sync for this user: drop any other account's leftovers, then
      // force a full push/pull.
      let purged = false;
      if ((await getMeta('synced_user_id')) !== userId) {
        purged = await purgeRowsOwnedByOthers(userId);
        await setMeta('last_pushed_at', EPOCH);
        await setMeta('last_pulled_at', EPOCH);
        await setMeta('synced_user_id', userId);
      }

      // Claim unowned rows (pre-account data on first sync; rows created while
      // signed in on later ones). Never touches rows owned by another account.
      await adoptUnownedRows(userId);

      const pushSince = (await getMeta('last_pushed_at')) ?? EPOCH;
      const pullSince = (await getMeta('last_pulled_at')) ?? EPOCH;

      // Capture local time BEFORE pushing; rows changed mid-sync get caught next run.
      const pushWatermark = new Date().toISOString();
      const pushed = await pushAll(pushSince, userId);
      await setMeta('last_pushed_at', pushWatermark);

      const { pulled, maxUpdated } = await pullAll(pullSince);
      if (isNewer(maxUpdated, pullSince)) await setMeta('last_pulled_at', maxUpdated);

      // Reflect pulled changes (or a purge of another account's rows) in the UI.
      if (pulled > 0 || purged) {
        const store = useVerseStore.getState();
        await store.refreshVerses();
        await store.refreshShelves();
        await store.refreshStats();
      }

      sync.setSynced(new Date().toISOString());
      return { ok: true, pushed, pulled };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Sync failed';
      console.error('[MemoryMate] sync error:', msg);
      sync.setSyncError(msg);
      return { ok: false, error: msg };
    } finally {
      sync.setSyncing(false);
    }
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

/** Debounced sync, for triggering after local writes without hammering the network. */
export function scheduleSync(delayMs = 2500): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void sync();
  }, delayMs);
}
