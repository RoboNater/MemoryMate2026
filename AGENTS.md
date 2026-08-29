# Memory Mate

Memory Mate is a mobile and web app for memorizing Bible verses (or other
memorizable text): a verse library organized into optional named "shelves",
guided practice sessions, recall testing with a result history, and per-verse
progress/comfort tracking. It's offline-first and syncs a single user's data
across their own devices via Supabase; there is no multi-user sharing.

## Tech stack

- Expo `~56.0` + React Native `0.85`, TypeScript `~6.0`
- Expo Router `~56.2` (file-based navigation)
- NativeWind `4.2` (Tailwind for React Native)
- Zustand `5.0` (state)
- Local storage: `expo-sqlite ~56.0` (native), `sql.js 1.13` + IndexedDB (web)
- Backend: Supabase (`@supabase/supabase-js` `2.x`) — Postgres, Auth, RLS

## Repo layout

- Repo root — the Expo app itself (`app.json`, `package.json`, `App.tsx`, `src/`)
- `src/app/` — Expo Router screens (file-based routes)
- `src/services/` — the data layer: SQLite access, sync engine, export/import,
  Supabase client, auth. Screens and the store should go through here, not
  straight to the database.
- `src/store/` — Zustand stores
- `src/components/` — shared presentational components
- `src/utils/` — pure helpers with no I/O (e.g. `scoring.ts`). Logic that can
  live here usually should: it's the code that's cheap to test.
- `src/types/` — shared types and ambient declarations
- `**/__tests__/` — tests, co-located next to the code they cover
- `supabase/schema.sql` — the Postgres schema (RLS policies, indexes)
- `docs/` — durable documentation (architecture, guides, notes, product)
- `docs/archive/` — frozen MVP-era history (old planning/status docs). Read for
  context if needed; do not edit it going forward and do not add new files to it.
- `CONTRIBUTING.md` — contributor-facing summary of the below, plus how to
  recover files from before the August 2026 cleanup

## Running it

```bash
npm install
npm run web       # or: npm run ios / npm run android
```

All three of these run in CI on every PR and push to `main`. Run them before
declaring work finished:

```bash
npm run typecheck
npm run lint
npm test
```

A Supabase project is required for auth + sync (see `docs/guides/backend-setup.md`
and `docs/guides/hosting.md`); the app still runs and is usable fully offline
without one configured.

## Project status lives in GitHub issues

Not in this file, and not in a document in this repo. This file and `docs/`
describe how the app works *now*; a status doc committed here goes stale within a
week of the next merge. The entry point is the pinned **Roadmap issue (#27)**,
which holds ordering and rationale.

Keeping that mechanism current is part of the work, not a separate chore:

- **The Roadmap references issues rather than restating them.** Write `- [ ] #29`
  and let GitHub render the title and state. A short line of *rationale* after a
  reference is the point of the Roadmap and should stay — "settle the scoring
  question first", "needs a live repro". What must not be written down is
  anything GitHub already derives: restated titles, open/closed status, and
  counts like "3 of 5 done". Those are the parts that go quietly wrong.
- **Defer a decision, file an issue.** If you consciously don't do something, it
  belongs in the tracker, not in a comment or a summary message that scrolls away.
- **Build one slice of an epic, break that slice out** into its own issue and
  check it off in the epic (see #29 out of #18). Don't schedule a whole epic.
- **When work changes the order of what's next, update #27's ordering** — that
  narrative is the one thing it holds that isn't derivable from the issue list.
- **Durable "why" goes to `docs/`, not the Roadmap.** Rationale that outlives the
  work (e.g. `docs/notes/repo-cleanup-2026-08.md`) shouldn't live in an issue
  body that nobody re-reads.

## Tests

Pure logic is expected to be tested; `jest-expo` is configured and `npm test` is
CI-enforced. Currently covered: `syncCompare.ts`, `utils/scoring.ts`,
`utils/guidedFirstLetter.ts`, `utils/testSession.ts`, `utils/textImport.ts`,
`importValidation.ts`, and two narrow service/store contracts pinned with a
shallow mock of their immediate boundary (`store/verseStore.ts`'s write actions,
`verseService.addVerses`'s timestamps).

The sync engine's merge logic — the code that only runs with a database handle —
is now covered too (issue #64). The tests open a real schema-migrated SQLite
database in Node via `sql.js` (`src/services/__tests__/testDatabase.ts`) and
exercise `pullAll`, the progress counter reconciliation, `reconcileShelfMembership`,
the account-scoping paths (`adoptUnownedRows` / `purgeRowsOwnedByOthers` /
`clearLocalDataOnSignOut`), and `runMigrations`, with only the Supabase client
faked at the `fetchRemote` boundary. The design question this settles — sql.js in
Node vs. mocking the `AppDatabase` interface — went to sql.js, so the SQL itself
is under test, not just the merge control flow; the rationale is in
`docs/notes/repo-cleanup-2026-08.md`. This covers the shared merge logic and the
web adapter's SQL, **not** `expo-sqlite`'s native transaction semantics — see the
"two backends, one interface" invariant below.

Two conventions worth following:

- **Extract to test.** The pure modules above exist because the logic was
  unreachable where it sat (inside a component body, or in a module that imports
  the database at load time). Prefer a verbatim extraction over mocking the world.
- **Label characterization tests.** A test that pins existing behavior you are
  *not* endorsing must say `[characterization]` and link the issue tracking the
  real decision (see `src/utils/__tests__/scoring.test.ts` and #23). An unlabelled
  one will eventually be mistaken for a specification.

## Invariants

Changes must not break these:

- **Offline-first.** Every write goes to local SQLite first; sync to Supabase
  happens in the background afterward (`src/services/syncService.ts`). The app
  must remain fully usable with no network connection.
- **Two local database backends, one interface.** Native uses `expo-sqlite`; web
  uses `sql.js` compiled to WASM with the database blob persisted to IndexedDB
  (`src/services/webDatabase.ts`, `src/services/webPersistence.ts`). Both are
  accessed through the same `AppDatabase` interface
  (`src/services/database.ts`), selected by the `Platform.OS === 'web'` branch in
  `initDatabase()`. Don't write code that assumes one backend's quirks (e.g.
  transaction semantics) without checking both.
- **Every user-scoped table is RLS-protected, and queries must stay user-scoped.**
  All four synced tables (`verses`, `shelves`, `progress`, `test_results`) have
  Supabase RLS policies keyed on `user_id`. Locally there is no RLS, so the
  service layer is what keeps one account's data from leaking into another's —
  a past bug leaked data across accounts on a shared device (see
  `syncService.clearLocalDataOnSignOut` / `purgeRowsOwnedByOthers`). Any new
  local query or sync path must stay account-scoped.
- **Deletes are soft deletes.** Nothing user-facing issues a hard `DELETE`.
  Removing a verse, shelf, or record sets `deleted_at` (a tombstone) and bumps
  `updated_at`; all reads filter `WHERE deleted_at IS NULL`. This is required
  for deletions to propagate correctly across devices — see
  `docs/architecture/data-model.md`.
- **`Alert.alert()` confirmation dialogs do not work on web.** On React Native
  Web, a multi-button `Alert.alert()` renders but never invokes the button
  `onPress` handlers, so it cannot gate an action (a real bug this caused: sign
  out silently did nothing in the browser). Use the in-app `ConfirmDialog`
  component for anything that needs a confirm/cancel choice.
- **Use `aria-*` props, not `accessibilityState`, for stateful controls.** React
  Native Web 0.21 never reads the `accessibilityState` object, so checked,
  disabled, expanded, and selected values inside it silently disappear from the
  DOM. Use the matching `aria-checked`, `aria-disabled`, `aria-expanded`, or
  `aria-selected` prop; React Native core maps them back into native
  accessibility state. Related radio controls must also sit in a labelled
  `radiogroup`, so independent sets do not appear as one contradictory group.
