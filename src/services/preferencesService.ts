import { getDatabase } from './database';
import {
  GuidedDifficulty,
  PracticeMode,
  parseGuidedDifficulty,
  parsePracticeMode,
} from '@/types';

/**
 * Device-local UI preferences (issue #34).
 *
 * These are not user data — they record how *this* device likes to work — so
 * they live in the local `sync_state` key/value table and are deliberately
 * never pushed to Supabase. That's the same shape the active-shelf selection
 * uses (`shelfService.getActiveShelfId`, issue #5), and for the same reason:
 * a preference should survive a restart without asserting that your phone and
 * your laptop must practice the same way.
 */

/** sync_state key holding the practice mode last chosen on this device. */
const PRACTICE_MODE_KEY = 'practice_mode';

/** sync_state key holding guided practice's last chosen difficulty. */
const GUIDED_DIFFICULTY_KEY = 'guided_difficulty';

/**
 * Read the practice mode the Practice tab should open with.
 *
 * Falls back to the default for an absent value (first run) and for an
 * unrecognised one — a mode written by a newer build, or a row left by a
 * mode that has since been removed.
 */
export async function getPracticeMode(): Promise<PracticeMode> {
  const db = getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM sync_state WHERE key = ?',
    [PRACTICE_MODE_KEY]
  );
  return parsePracticeMode(row?.value);
}

/**
 * Persist the practice mode chosen on this device.
 */
export async function setPracticeMode(mode: PracticeMode): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    `INSERT INTO sync_state (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = ?`,
    [PRACTICE_MODE_KEY, mode, mode]
  );
}

/** Read the guided-practice difficulty last chosen on this device. */
export async function getGuidedDifficulty(): Promise<GuidedDifficulty> {
  const db = getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM sync_state WHERE key = ?',
    [GUIDED_DIFFICULTY_KEY]
  );
  return parseGuidedDifficulty(row?.value);
}

/** Persist guided practice's difficulty on this device. */
export async function setGuidedDifficulty(
  difficulty: GuidedDifficulty
): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    `INSERT INTO sync_state (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = ?`,
    [GUIDED_DIFFICULTY_KEY, difficulty, difficulty]
  );
}
