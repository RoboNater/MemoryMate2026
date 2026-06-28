# Phase 5 Addendum: Cross-Device Sync — Design & Plan

**Date**: 2026-06-20
**Status**: 📝 DRAFT — for review before any code is written
**Decision (confirmed)**: Supabase cloud backend + offline-first local cache
**Companion doc**: [ccc.31.supabase-overview-and-setup-guide.md](ccc.31.supabase-overview-and-setup-guide.md) — how to create/configure the Supabase account

---

## 1. Problem Statement

The app currently stores all data in **local SQLite only** (expo-sqlite on native, sql.js + IndexedDB on web). Each device therefore has its **own independent copy** of verses, progress, and test results. Using the app across a phone, a laptop, and the web build produces three divergent datasets with no reconciliation. This makes daily multi-device use impractical.

**Goal**: One logical dataset that all of the user's devices share, while keeping the app fast and usable offline.

**Non-goals (for this addendum)**:
- Multi-user sharing / collaboration (this is single-user, the user's own data across their own devices).
- Real-time live updates between devices (eventual consistency on next sync is sufficient).
- Changing the existing UI/screens or the multi-verse practice session work (Phase 5 Task 1), which remains independently testable.

---

## 2. Chosen Architecture: Offline-First with Supabase

```
   Device A (phone / native)        Device B (laptop / web)
   ┌───────────────────────┐        ┌───────────────────────┐
   │ UI (screens, Zustand)  │        │ UI (screens, Zustand)  │
   │ service layer          │        │ service layer          │
   │ local SQLite (cache)   │◄─────► │ local SQLite (cache)   │  ← app always reads/writes LOCAL first
   └──────────┬─────────────┘        └──────────┬─────────────┘
              │  syncService (push + pull)       │
              └─────────────────┬────────────────┘
                          ┌─────▼──────┐
                          │  Supabase  │   PostgreSQL + Auth + Row Level Security
                          │  (cloud)   │   one account = the user; RLS scopes every row to user_id
                          └────────────┘
```

**Principles:**

1. **Local SQLite remains the source of truth for the running app.** Screens keep reading/writing through the existing service layer with no change in behavior. This preserves offline use and instant response.
2. **Supabase is the shared "hub of record."** A new `syncService` reconciles local ↔ cloud in the background.
3. **The sync layer sits behind the existing services** (`verseService`, `progressService`, `testService`) — the same clean abstraction we already use for the dual-platform DB and for export/import. Screens and the Zustand store are largely untouched.

**Why this combination** (recap of the decision): works on any network including cellular/away-from-home, free at single-user scale, no server to maintain, and matches the existing `gem.01` hosting plan and the eventual EAS + app-store path.

---

## 3. Why the Data Model Syncs Cleanly

Current types (`src/types/index.ts`): `Verse`, `VerseProgress`, `TestResult`. Each maps to a SQLite table of the same shape.

| Table | Cardinality | Mutation pattern | Merge rule |
|-------|-------------|------------------|------------|
| `test_results` | append-only log, PK = `id` | rows are immutable once written | **Union by `id`.** Never conflicts — pull any row you don't have, push any row the cloud doesn't have. |
| `progress` | one row per verse, PK = `verse_id` | edited on every practice/test | **Last-write-wins by `updated_at`**, with counter reconciliation (see §5). |
| `verses` | one row per verse, PK = `id` | added often, edited rarely, deleted occasionally | **Last-write-wins by `updated_at`**; deletions via soft-delete `deleted_at`. |

The append-only test log and the one-row-per-verse progress make this a tractable last-write-wins problem rather than a hard CRDT problem. The only real care needed is **counter reconciliation** for `progress` so concurrent offline practice on two devices doesn't silently lose counts.

---

## 4. Schema Changes (local SQLite + Supabase mirror)

To make rows syncable we add three concerns to each table: **ownership**, **change tracking**, and **soft delete**.

Add to `verses`, `progress`, and `test_results`:

- `user_id TEXT` — the Supabase auth user id; required by Row Level Security.
- `updated_at TEXT` (ISO 8601) — bumped on every write; drives last-write-wins.
- `deleted_at TEXT NULL` — soft-delete tombstone so deletes propagate instead of resurrecting on next pull.

Notes:
- **Deletes become soft-deletes.** `removeVerse()` currently hard-deletes verse + progress + test_results in a transaction (`verseService.ts:116`). It will instead set `deleted_at` on those rows. Queries (`getAllVerses`, etc.) add `WHERE deleted_at IS NULL`. (The existing `archived` flag is a *separate, user-facing* concept and stays as-is.)
- **Migration must be additive and idempotent** — the same `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE ... ADD COLUMN` pattern already used in `database.ts`, guarded so it runs once. Must work on both expo-sqlite and the sql.js web adapter (one statement per `execAsync`, per existing convention).
- A new tiny `sync_state` table (or a single key/value row) stores `last_pulled_at` per device so each pull only fetches changed rows.

Supabase Postgres mirrors these three tables with the same columns plus a `user_id uuid` foreign key to `auth.users`, and **Row Level Security** policies `(select auth.uid()) = user_id` on every table (per the `gem.01` security rule). Details of the SQL live in ccc.31 / will be provided as a runnable migration script.

---

## 5. Sync Algorithm

A `syncService.sync()` runs: **(1) push local changes, then (2) pull remote changes**, then merges. It is triggered:
- on app launch (after auth),
- on regaining connectivity,
- after a local write (debounced),
- and manually via a **"Sync now"** button in Settings.

### Push
Select local rows where `updated_at > last_synced` (dirty rows) and upsert them to Supabase.

### Pull
Select remote rows where `updated_at > last_pulled_at` and merge each into local:

- **`test_results`** — insert if `id` not present locally; ignore otherwise (immutable).
- **`verses`** — if remote `updated_at` > local `updated_at`, overwrite local (including `deleted_at`).
- **`progress`** — last-write-wins on `comfort_level`, `last_practiced`, `last_tested` by `updated_at`; **counters reconciled, not overwritten**:
  - `times_practiced`, `times_tested`, `times_correct` → take `max(local, remote)`.
  - Rationale: counters are monotonic per device; max avoids losing increments from concurrent offline practice. (A more exact scheme could derive counts from the `test_results` log; max is simpler and good enough for MVP. Documented as a known limitation.)

### Conflict handling summary
- Append-only log → no conflicts.
- Per-verse rows → deterministic last-write-wins by timestamp; ties broken by `user_id`/`id` ordering so all devices converge to the same result.

---

## 6. Auth

- One Supabase account = the user, shared across all their devices.
- Add a minimal **login screen** and session persistence (Supabase JS stores the session; on native we back it with secure storage).
- Until signed in, the app still works fully offline against local SQLite; sync simply no-ops. Signing in associates local rows with `user_id` and kicks off the first sync.
- Auth method: email/password to start (simplest); Google/Apple can be added later (relevant for the eventual iOS build).

---

## 7. New / Changed Files (anticipated)

**New**
- `src/services/supabaseClient.ts` — configured Supabase client (URL + anon key from env/`expo-constants`).
- `src/services/syncService.ts` — push/pull/merge engine described in §5.
- `src/services/authService.ts` — sign in / sign out / current session.
- `src/store/authStore.ts` (or extend `verseStore.ts`) — auth + sync status for the UI.
- `src/app/login.tsx` — login screen.
- `supabase/schema.sql` — Postgres tables + RLS policies (also documented in ccc.31).

**Changed**
- `src/services/database.ts` — additive migration (new columns, `sync_state` table).
- `src/services/verseService.ts`, `progressService.ts`, `testService.ts` — set `updated_at`/`user_id` on writes; soft-delete instead of hard-delete; filter `deleted_at IS NULL`.
- `src/app/(tabs)/settings.tsx` — "Sync now" + "last synced" indicator + sign in/out, next to the existing export/import section.
- `src/app/_layout.tsx` — initialize Supabase/auth alongside the existing DB init; trigger sync on launch.
- `package.json` — add `@supabase/supabase-js` (and a small secure-storage dep for native session persistence).

The existing JSON export/import (`dataExportService.ts`) stays as-is and becomes a nice **manual backup / escape hatch** independent of cloud sync.

---

## 8. Implementation Phases (proposed order)

Each phase is independently testable and leaves the app working.

1. **Local schema migration** — add `updated_at`/`deleted_at`/`user_id`, convert deletes to soft-deletes, add `sync_state`. *No cloud yet; app behaves identically.* Verify existing flows still pass.
2. **Supabase project + schema + RLS** — create project, run `schema.sql`, enable RLS. *No app changes.* Verify via Supabase dashboard. (Setup steps in ccc.31.)
3. **Auth in the app** — Supabase client, login screen, session persistence, sign in/out in Settings.
4. **Sync engine** — `syncService` push/pull/merge; wire triggers (launch, reconnect, post-write debounce, manual button); "last synced" UI.
5. **Cross-device verification** — the real proof: practice on phone, then laptop/web; confirm both converge; test offline-then-reconnect, deletes propagating, and concurrent-edit reconciliation.

Recommended starting point after you approve this doc: **Phase 1**, since it is safe, cloud-independent, and required regardless.

---

## 9. Risks & Open Questions

- **Counter reconciliation precision** — `max()` is approximate under heavy concurrent offline use. Acceptable for MVP; exact derivation from the `test_results` log is a possible later refinement.
- **Web session/secure storage** — native uses secure storage for the Supabase session; web uses browser storage. Need to confirm session persistence behaves on the sql.js/IndexedDB web build.
- **Initial association of existing local data** — on first sign-in, stamp all existing local rows with `user_id` and `updated_at` before the first push so nothing is dropped.
- **Clock skew** — last-write-wins relies on device clocks. Devices are normally well-synced; if needed, Supabase server timestamps can be authoritative on write.
- **Secrets** — the Supabase anon key is publishable (safe with RLS), but should still come from config/env, not be hard-coded casually. RLS is the real security boundary.
- **Cost** — single-user usage sits comfortably in Supabase's free tier; revisit only if the app is shared.

---

## 10. Success Criteria

- Practicing/testing/editing on one device appears on every other device after a sync.
- A verse deleted on one device disappears everywhere (no resurrection).
- The app remains fully usable offline; changes sync on reconnect with no data loss.
- Concurrent offline practice on two devices does not lose practice/test counts.
- No regression to existing CRUD, progress, testing, export/import, or the multi-verse practice session flow.

---

*Next: review this plan. On approval, I'll begin Phase 1 (local schema migration). Supabase account setup is documented separately in ccc.31.*
