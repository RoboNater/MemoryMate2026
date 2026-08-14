# Cross-Device Sync — Testing Guide (Phase 5 of the sync work)

**Date**: 2026-06-20
**Status**: 🔍 Ready for manual two-device verification
**Builds on**: ccc.30 (plan), ccc.31 (Supabase setup). Engine landed in commits 4116ac4 (Phase 1), b961e7b (Phase 2), 727e8be (Phase 3), 611649b (Phase 4) on branch `mvp/feature/sync-to-server`.

This is the one step that genuinely requires you: confirming data actually
converges across devices. Everything else is implemented and statically validated
(tsc + offline SQLite/merge harnesses), but real sync can only be proven live.

---

## Prerequisites

1. Supabase schema applied (you did this — 3 tables, RLS enabled). ✅
2. `.env` present with `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`. ✅
3. Run the app: `cd memory-mate-mvp && npm start`.
4. You have an account (Settings → Cloud Sync → Sign In / Create one).

> Tip: keep the Supabase dashboard **Table Editor** open. It's the ground truth —
> you can watch rows appear/change as you sync.

---

## Test 1 — Single device round-trip (push works)

1. Sign in on Device A.
2. Add 2–3 verses; practice one, set a comfort level, take a test.
3. Settings → **Sync Now** (it also auto-syncs a few seconds after each change).
4. In the Supabase **Table Editor**, open `verses`, `progress`, `test_results`.
   - ✅ Your verses appear, each with your `user_id`, an `updated_at`, `deleted_at` null.
   - ✅ A `progress` row with the right counts/comfort; a `test_results` row.
5. Settings shows **"Last synced …"** with no error.

If rows don't appear: check the `syncError` line in Settings, and the console.

---

## Test 2 — Second device pulls (the real goal)

1. On Device B (another phone, or the web build in a different browser/profile),
   run the app and **sign in with the same account**.
2. It should sync on sign-in. Open the Verses tab.
   - ✅ The verses from Device A appear, with the same comfort levels.
   - ✅ Dashboard stats match Device A.

---

## Test 3 — Edits converge both ways

1. On Device B: edit a verse's text, practice a different verse, set a new comfort level.
2. **Sync Now** on B (or wait for auto-sync).
3. On Device A: **Sync Now**, then check.
   - ✅ B's edits show on A.
4. Reverse it (change something on A, sync both) and confirm it lands on B.

---

## Test 4 — Deletes propagate (no resurrection)

1. On Device A: delete a verse. Sync.
2. In Supabase, that verse row now has a non-null `deleted_at` (it's tombstoned,
   not removed).
3. On Device B: Sync Now.
   - ✅ The verse disappears on B too.
   - ✅ It does **not** come back on a later sync.

---

## Test 5 — Offline then reconnect (no data loss)

1. Put Device A offline (airplane mode, or stop the network).
2. Add a verse / practice. The app keeps working normally (local-first).
3. Bring A back online and **Sync Now** (or trigger a write, which schedules a sync).
   - ✅ The offline changes push up and appear on B after B syncs.

---

## Test 6 — Concurrent offline practice (counter reconciliation)

This checks the `max()` rule that prevents losing practice counts.

1. Sign in on both A and B; sync both so they agree on a verse's `times_practiced`
   (note the number, say N).
2. Put **both** offline.
3. Practice that verse twice on A (N+2 locally) and once on B (N+1 locally).
4. Bring both online. Sync A, then B, then A again.
   - ✅ Both converge to **at least N+2** (max wins; the design trades exactness for
     never losing increments — see "Known limitations").

---

## What success looks like

- Changes made on one device appear on the others after a sync.
- Deletions propagate and stay deleted.
- The app is fully usable offline; changes sync on reconnect with no loss.
- No regression to existing CRUD / practice / test / export-import.

## Known limitations (by design, documented in ccc.30)

- **Counter reconciliation is approximate** (`max()`), not an exact sum of all
  offline increments. It never loses data but can under-count in rare concurrent
  cases.
- **No explicit reconnect detection** yet — sync retries on the next trigger
  (app launch, next local change, or Sync Now) rather than the instant the network
  returns.
- **Last-write-wins relies on device clocks.** Wildly wrong clocks could pick the
  "wrong" winner for an edited field. Normal device time is fine.

## If something's off

Tell me what you did, what you expected, what happened, and any `syncError` text or
console output. Likely first suspects: RLS policy/grants (rows rejected on push),
the `user_id` stamp, or a clock issue. All are quick to diagnose from the error.

---

## Where to go next (after this passes)

- Optional polish: reconnect detection (NetInfo / online events), a small sync
  indicator in the header, conflict surfacing.
- Then back to the paused MVP work: Phase 5 Task 1 testing and Task 2 (test-flow
  multi-verse sessions).
