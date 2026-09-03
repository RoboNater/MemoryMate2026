# Contributing to Memory Mate

## Where things are tracked

**GitHub issues are the source of truth for project status.** The pinned
[Roadmap issue](https://github.com/RoboNater/MemoryMate2026/issues/27) holds
ordering and rationale, referencing other issues rather than copying them — so it
can't drift.

`AGENTS.md` and `docs/` describe how the app works *now*, not what's being worked
on. Please don't add a status document to the repo; it will be out of date within
a week of the next merge.

## Before you push

These run in CI on every pull request and every push to `main`:

```bash
npm run audit:check
npm run typecheck
npm run lint
npm test
```

Run them locally first — CI is not a faster way to find out.

The audit check compares advisory identities and material details against a
reviewed baseline. See the [npm audit guide](docs/guides/npm-audit.md) before
changing that baseline; never use `npm audit fix --force` as a shortcut.

## Getting set up

```bash
npm install
npm run web       # or: npm run ios / npm run android
```

A Supabase project is required for auth and sync (see
[`docs/guides/backend-setup.md`](docs/guides/backend-setup.md)). The app still
runs and is fully usable offline without one configured, which is worth
remembering: **offline-first is an invariant, not a feature.**

## Invariants

`AGENTS.md` carries the full list, and changes must not break them. In short:

- **Offline-first.** Every write goes to local SQLite first; sync happens
  afterward in the background.
- **Two local database backends, one interface.** Native uses `expo-sqlite`, web
  uses `sql.js` + IndexedDB, both behind `AppDatabase`. Don't rely on one
  backend's quirks without checking the other.
- **Queries stay user-scoped.** There's no RLS locally — the service layer is
  what keeps one account's data out of another's. This has leaked before.
- **Deletes are soft deletes.** Set `deleted_at`, bump `updated_at`, and filter
  `WHERE deleted_at IS NULL` on read. Hard deletes break cross-device deletion.
- **`Alert.alert()` confirmations don't work on web.** Multi-button alerts render
  but never fire their handlers, so they cannot gate an action. Use the in-app
  `ConfirmDialog`.

## Tests

Tests live in `__tests__/` directories next to the code they cover, and run under
`jest-expo`.

Current coverage is the pure logic that had already broken in production —
`syncCompare.ts`, `utils/scoring.ts`, `importValidation.ts`. Anything needing a
database is not yet covered; see
[`docs/notes/repo-cleanup-2026-08.md`](docs/notes/repo-cleanup-2026-08.md) for
the open design question there.

If you write a test that pins existing behavior you're not endorsing, label it
`[characterization]` and link the issue tracking the real decision — see the
scoring tests for the pattern. A characterization test that isn't labelled will
eventually be mistaken for a specification.

## Branches and commits

Branch off `main` with a prefixed name — `fix/`, `feat/`, `chore/`, `docs/`,
`test/` — and open a pull request. `main` is protected by the CI checks above.

Write commit messages that explain *why*, not just what. The repo's history is
load-bearing documentation: several decisions recorded there are the only record
of why an option was rejected.

## Recovering anything from before the cleanup

The August 2026 cleanup moved and deleted a lot of files. **Nothing was
destroyed** — two tags cover every state worth returning to.

```bash
git show pre-cleanup-2026-08-14 --stat          # everything as it was, pre-cleanup
git checkout pre-cleanup-2026-08-14 -- <path>   # restore one file
git checkout v0.1.0                             # the MVP as shipped
```

The Python prototype, the Expo starter skill, the checkpoint documents, and every
deleted `ccc.*` file are reachable from `pre-cleanup-2026-08-14`.

Frozen MVP-era documents are also still in the tree under `docs/archive/`. Read
them for context; don't edit them and don't add to them. Whether that folder
stays at all is
[#26](https://github.com/RoboNater/MemoryMate2026/issues/26).
