/**
 * Lives in its own module (rather than inline in syncService.ts) so the
 * last-write-wins comparison at the heart of the sync engine can be unit-tested
 * without pulling in the database/Supabase clients that syncService.ts imports.
 */

/** True if ISO string `a` is strictly newer than `b` (null/empty treated as oldest). */
export function isNewer(a: string | null | undefined, b: string | null | undefined): boolean {
  const ta = a ? Date.parse(a) : 0;
  const tb = b ? Date.parse(b) : 0;
  return ta > tb;
}
