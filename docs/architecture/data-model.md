# Data Model

Reference for the four tables that make up Memory Mate's data: `verses`, `shelves`,
`progress`, and `test_results`. The same shape exists in two places:

- **Local SQLite** — `src/services/database.ts` (native: expo-sqlite; web: sql.js +
  IndexedDB, see `src/services/webDatabase.ts`). This is the source of truth for the
  running app; screens always read/write here.
- **Supabase (Postgres)** — `supabase/schema.sql`. A mirror of the local schema used
  by `src/services/syncService.ts` to reconcile devices. The app never queries
  Supabase directly from the UI.

Domain types (the shape services return to the app, with internal sync columns
stripped out) live in `src/types/index.ts`.

## Why the code, not the older design docs

[`ccc.02.design-prototype-data-and-class.md`](../archive/ccc.02.design-prototype-data-and-class.md), an archived historical
document, describes the original Python prototype model. Two things have since
changed and this document reflects the current code, not that doc:

- `TestResult.duration_seconds` was part of the prototype design but was never
  implemented in the SQLite/Supabase schema or `src/types/index.ts`. It does not
  exist in the app.
- Shelves (`shelves` table, `verses.shelf_id`) and the sync columns
  (`user_id` / `updated_at` / `deleted_at`) were added later (issue #5 and the
  cross-device sync work, `docs/architecture/sync.md`) and are not in the
  prototype doc at all.

## Tables

### `verses`

The memorizable text.

| Column | SQLite type | Postgres type | Notes |
|---|---|---|---|
| `id` | `TEXT PRIMARY KEY` | `text primary key` | UUID, client-generated |
| `reference` | `TEXT NOT NULL` | `text not null` | e.g. `"John 3:16"` |
| `text` | `TEXT NOT NULL` | `text not null` | Full verse text |
| `translation` | `TEXT NOT NULL DEFAULT 'NIV'` | `text not null default 'NIV'` | e.g. `NIV`, `ESV` |
| `created_at` | `TEXT NOT NULL` | `text not null` | ISO 8601 UTC |
| `archived` | `INTEGER NOT NULL DEFAULT 0` | `boolean not null default false` | User-facing hide; distinct from `deleted_at` |
| `shelf_id` | `TEXT` | `text` | FK-shaped, but no actual foreign key constraint (see below); `NULL` = unshelved |
| `user_id` | `TEXT` | `uuid not null default auth.uid() references auth.users(id) on delete cascade` | Owning account; `NULL` locally until first sign-in |
| `updated_at` | `TEXT` | `text` | Sync change marker |
| `deleted_at` | `TEXT` | `text` | Soft-delete tombstone |

`shelf_id` intentionally has **no foreign key**, in either database. Pre-shelf local
databases gained the column via `ALTER TABLE`, and SQLite cannot add a foreign key
via `ALTER TABLE`, so referential integrity for shelf membership is service-managed
instead:
- `shelfService.removeShelf()` clears `shelf_id` on member verses in the same
  transaction as the shelf tombstone.
- `syncService.reconcileShelfMembership()` runs after every merge and clears any
  `shelf_id` that points at a shelf that is absent or tombstoned — this repairs
  races where a verse is reassigned on one device while the shelf is deleted on
  another.

### `shelves`

Named verse groups (issue #5). A verse belongs to at most one shelf.

| Column | SQLite type | Postgres type | Notes |
|---|---|---|---|
| `id` | `TEXT PRIMARY KEY` | `text primary key` | UUID |
| `name` | `TEXT NOT NULL` | `text not null` | |
| `created_at` | `TEXT NOT NULL` | `text not null` | ISO 8601 UTC |
| `user_id` | `TEXT` | `uuid not null default auth.uid() references auth.users(id) on delete cascade` | |
| `updated_at` | `TEXT` | `text` | |
| `deleted_at` | `TEXT` | `text` | |

The *active* shelf (which shelf, or "all verses", Practice/Test currently draws
from) is **not** a column on this table and is **not synced**. It's per-device UI
state, stored as a single row in the local `sync_state` key/value table under the
key `active_shelf_id` (`shelfService.getActiveShelfId` / `setActiveShelfId`).

### `progress`

One row per verse, tracking memorization progress. Rows are created lazily on
first practice/test, not when the verse is added.

| Column | SQLite type | Postgres type | Notes |
|---|---|---|---|
| `verse_id` | `TEXT PRIMARY KEY, FK -> verses(id) ON DELETE CASCADE` | `text primary key references public.verses(id) on delete cascade deferrable initially deferred` | 1:1 with `verses` |
| `times_practiced` | `INTEGER NOT NULL DEFAULT 0` | `integer not null default 0` | |
| `times_tested` | `INTEGER NOT NULL DEFAULT 0` | `integer not null default 0` | |
| `times_correct` | `INTEGER NOT NULL DEFAULT 0` | `integer not null default 0` | |
| `last_practiced` | `TEXT` | `text` | ISO 8601 UTC or NULL |
| `last_tested` | `TEXT` | `text` | ISO 8601 UTC or NULL |
| `comfort_level` | `INTEGER NOT NULL DEFAULT 1` | `integer not null default 1 check (comfort_level between 1 and 5)` | 1 (New) .. 5 (Memorized) |
| `user_id` | `TEXT` | `uuid not null default auth.uid() ...` | |
| `updated_at` | `TEXT` | `text` | |
| `deleted_at` | `TEXT` | `text` | |

Note the Postgres FK is `deferrable initially deferred` (all three child tables
are) — this lets `syncService.pushAll()` batch-upsert rows within one transaction
without caring about statement order, though it still pushes in dependency order
(shelves -> verses -> progress -> test_results) by convention.

### `test_results`

Append-only log of individual test attempts.

| Column | SQLite type | Postgres type | Notes |
|---|---|---|---|
| `id` | `TEXT PRIMARY KEY` | `text primary key` | UUID |
| `verse_id` | `TEXT NOT NULL, FK -> verses(id) ON DELETE CASCADE` | `text not null references public.verses(id) on delete cascade deferrable initially deferred` | |
| `timestamp` | `TEXT NOT NULL` | `text not null` | ISO 8601 UTC |
| `passed` | `INTEGER NOT NULL` | `boolean not null` | |
| `score` | `REAL` | `real` | Optional, 0.0-1.0, or NULL |
| `user_id` | `TEXT` | `uuid not null default auth.uid() ...` | |
| `updated_at` | `TEXT` | `text` | |
| `deleted_at` | `TEXT` | `text` | |

Local indexes: `idx_test_results_verse_id`, `idx_test_results_timestamp`.
Supabase indexes: `idx_test_results_verse`, plus `(user_id, updated_at)` on all
four tables to support the sync pull query.

## Device-local preferences (`sync_state`)

`sync_state` is a local-only key/value table (created by `runMigrations` in
`src/services/database.ts`, no Postgres counterpart). Alongside the sync engine's
own checkpoints it holds the UI preferences that are deliberately **not** synced,
because they describe how *this device* is being used rather than what the user
has memorized:

| Key | Written by | Meaning |
|---|---|---|
| `active_shelf_id` | `shelfService.setActiveShelfId` | Which shelf Practice/Test draw from; absent = all verses (#5) |
| `practice_mode` | `preferencesService.setPracticeMode` | Which practice mode the Practice tab opens with; absent/unrecognised = `reveal` (#34) |

Both are read once during `verseStore.initialize()` and mirrored into the store.
The bar for putting a preference here rather than in a synced table is whether
two devices are allowed to disagree about it — for these, they are.

`clearLocalDataOnSignOut` drops `active_shelf_id` along with the synced tables,
because the shelf it names is about to stop existing locally and the next
sign-in may be a different account. `practice_mode` names no user data and is
left alone, so the device keeps practicing the way its owner set it up.

## Cascade relationships

Both databases declare `ON DELETE CASCADE` from `progress.verse_id` and
`test_results.verse_id` to `verses.id`. In practice this cascade is rarely what
actually fires: normal verse deletion goes through the soft-delete path below,
which never issues a SQL `DELETE`. The cascade exists as a safety net (and
matters to the *import* code path — see `dataExportService.importAllDataFromJSON`,
which upserts rather than deletes specifically so a restore can't trigger this
cascade and wipe child tombstones out from under it).

`verses.shelf_id` has no cascade or FK at all (see above) — shelf cleanup on
delete is handled in application code.

## Sync columns and the soft-delete rule

Every synced table (`verses`, `shelves`, `progress`, `test_results`) carries the
same three columns:

- **`user_id`** — the owning Supabase auth user. `NULL` locally until the row is
  claimed: either by `syncService.adoptUnownedRows()` on first sync for an
  account, or set directly by Supabase's `default auth.uid()` for rows created
  server-side. Rows already owned by a *different* account are never re-stamped.
- **`updated_at`** — an ISO 8601 UTC string, bumped by the service layer on every
  write. This is the last-write-wins clock: pushes select `updated_at > since`,
  pulls compare `updated_at` on both sides and keep the newer row. It is
  client-owned (no DB trigger overwrites it), matching the schema's design intent.
- **`deleted_at`** — the soft-delete tombstone.

**Deletes are never hard deletes.** `verseService.removeVerse()`,
`shelfService.removeShelf()`, and the tombstoning step in
`dataExportService.importAllDataFromJSON()` all set `deleted_at` (and bump
`updated_at`) instead of issuing `DELETE`. Every read in the service layer filters
`WHERE deleted_at IS NULL`, so tombstoned rows are invisible to the app but still
present in the database.

This matters because of how sync works: a hard delete on Device A produces
*nothing* for Device B to see on its next pull — there's no row left to compare
timestamps against, so the row simply never gets removed on B (or worse, B's own
unsynced copy looks "new" and gets pushed back, resurrecting it). A soft delete is
a row with a later `updated_at`, so it propagates through the exact same
push/pull/last-write-wins machinery as any other edit. `archived` is a distinct,
user-facing concept (hide from active practice) and is not a delete of any kind.

Local tombstoned rows are pruned only implicitly by staying invisible; there is no
garbage-collection pass in the current code that ever removes a tombstoned row for
good (Open question below).

## Row Level Security

Every user-scoped table in Supabase — `shelves`, `verses`, `progress`,
`test_results` — has `alter table ... enable row level security` plus a single
`for all` policy scoped to the row's owner:

```sql
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id)
```

The `(select auth.uid())` wrapping (rather than a bare `auth.uid() = user_id`) is
a deliberate Postgres planner optimization — it lets the planner evaluate
`auth.uid()` once instead of per-row. Tables are also **not** auto-exposed to the
`anon` role; grants are explicit and scoped to `authenticated` only
(`grant select, insert, update, delete on public.<table> to authenticated;`), so
an unauthenticated request cannot read or write any row regardless of RLS.

Locally, there is no equivalent enforcement mechanism — SQLite has no RLS. The
device-local database is implicitly single-account (see
`syncService.clearLocalDataOnSignOut` / `purgeRowsOwnedByOthers`, which wipe or
filter local rows on sign-out / account switch so one account's data is never
shown against another account's session on a shared device).

## Open questions

- Whether tombstoned rows (`deleted_at IS NOT NULL`) are ever permanently purged,
  locally or in Supabase, is not addressed anywhere in the current code — they
  appear to accumulate indefinitely.
