# Repo cleanup, August 2026

A record of the post-MVP cleanup: what was changed, and — more usefully — *why*
the surviving configuration looks the way it does. This is a frozen note, not a
status log. For what's being worked on now, see the pinned
[Roadmap issue](https://github.com/RoboNater/MemoryMate2026/issues/27).

The plan this followed from is archived at
`docs/archive/ccc.33.repo-cleanup-and-post-mvp-restructure.md`. Its section 7 is
superseded by the Roadmap issue.

## What happened, in three PRs

| PR | Change |
|---|---|
| #20 | Repo restructure — 140 tracked files down to 111, docs sorted into `architecture` / `guides` / `notes` / `product`, MVP-era material frozen under `docs/archive/` |
| #21 | ESLint added and enforced in CI |
| #22 | Jest added and enforced in CI; first tests, over three pure functions |

Two tags mark the recovery points: `pre-cleanup-2026-08-14` and `v0.1.0`. See
[`CONTRIBUTING.md`](../../CONTRIBUTING.md) for how to pull anything back.

## Why the lint config looks like this

The first `npm run lint` reported 16 errors and 12 warnings.

**All 16 errors were `react/no-unescaped-entities`**, firing on ordinary
apostrophes in user-facing copy inside `<Text>`. That rule guards against HTML
ambiguity in the DOM; this app renders to React Native `<Text>`, not HTML, so the
ambiguity it protects against cannot occur. The rule is **off**, with the
reasoning recorded inline in `eslint.config.js`. This is the one place we
disabled a rule rather than fixing the code, and it was disabled because the rule
does not apply to this platform — not because the findings were inconvenient.

**The 12 warnings were real and were fixed:** nine unread `catch (error)`
bindings and two dead imports, all removed.

The remaining `exhaustive-deps` warning, on the run-once startup effect in
`_layout.tsx`, got a **documented disable** rather than a dependency array. Adding
the dependencies it wanted would re-open the database on every store change,
which is a behavior change dressed up as a lint fix.

## What the sync smoke test actually proved

Run 14 Aug 2026 across two devices on two networks:

- Updates from both devices stayed in sync in **both** directions.
- An export completed successfully.
- **A delete on one device propagated to the other.**

That last one carries the most weight. Deletes are tombstones rather than row
removals (see [`../architecture/data-model.md`](../architecture/data-model.md)),
so a propagating delete exercises the soft-delete write, the push, the pull, and
the merge — the full path, and the one with the most bug history.

## Why three functions moved in #22

Each of the three was pure logic that had already broken in production, and none
of them could be reached from a test where it sat. The extractions were verbatim
moves; no logic changed.

| Function | Moved to | Why it was unreachable |
|---|---|---|
| `isNewer` | `src/services/syncCompare.ts` | `syncService.ts` imports `expo-sqlite`, the Supabase client, and `authService` at module load |
| `calculateScore` | `src/utils/scoring.ts` | It was a closure over `verse.text` / `userInput` inside the `TestVerseScreen` component body |
| The seven import validators | `src/services/importValidation.ts` | Same problem — `dataExportService.ts` imports the database layer |

### Two behaviors those tests pin rather than fix

Both pre-date the tests. They are covered so that changing them is a deliberate
act rather than an accident:

- **Scoring does not penalize insertions.** `total` is the *correct* verse's word
  count, so extra words are free — a correct verse plus arbitrary trailing text
  scores 100%, as does the verse typed twice. Whether that's the right product
  semantic is tracked in
  [#23](https://github.com/RoboNater/MemoryMate2026/issues/23); the tests that
  pin it are explicitly labelled `[characterization]` and should be *rewritten,
  not deleted*, if the answer changes.
- **`isNewer` silently swallows a corrupt timestamp.** `Date.parse('garbage')` is
  `NaN`, and every comparison against `NaN` is `false` — so a row with a
  malformed `updated_at` is neither newer nor older than anything, including
  itself, and loses every comparison instead of surfacing. Relevant to
  [#11](https://github.com/RoboNater/MemoryMate2026/issues/11), which would
  remove the problem class entirely.

### One contract tightened during review

Review of #22 found the new validator tests were about to freeze implementation
drift instead of asserting the contract in
[`data-format.md`](data-format.md). Two pre-existing gaps were closed:

- The three progress counters are specified as `integer, >= 0` and their error
  strings already said so, but the checks only tested `typeof === 'number'` and
  `< 0` — so `1.5`, `NaN`, and `Infinity` all passed. Now `Number.isInteger`,
  matching what `comfort_level` in the same function already did.
- `exported_at` is specified as ISO 8601 but was only checked for being a
  non-empty string.

**The `exported_at` change has a sharp edge worth knowing about.** The ISO check
requires an exact `Date.toISOString()` round-trip, which is stricter than ISO 8601
in general: `2026-01-26T12:00:00Z` — the same instant, spelled without
milliseconds — is now rejected, and because that check is envelope-level, it
fails the *whole* import. Nothing Memory Mate writes is affected, since exports
go through `new Date().toISOString()`. It only reaches hand-written or
third-party files.

## Testing: where the line currently sits

Covered: the three pure functions above, 133 tests, enforced by `npm test` in CI.

**Not covered: anything that needs a database** — which is most of the sync
engine's merge logic. There's an open design question before that work can start:
run the tests against the sql.js web adapter in Node, or mock the `AppDatabase`
interface? Worth settling before
[#11](https://github.com/RoboNater/MemoryMate2026/issues/11), which rewrites the
comparison logic the current tests protect.

`@testing-library/react-native` is deliberately **not** installed. Nothing tested
so far is a component; it can arrive with the first test that needs it.
