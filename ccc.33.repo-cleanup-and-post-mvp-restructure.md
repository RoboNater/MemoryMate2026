# ccc.33 — Repo Cleanup and Post-MVP Restructure

**Date**: 2026-08-14
**Branch**: `repo/chore/c002-cleanup-repo`
**Status**: Plan — not yet executed
**Purpose**: Retire the MVP-era development scaffolding and leave behind a repo that looks
like a normal, maintained application repo, ready for the next round of features.

This is intentionally the *last* `ccc.*` file. After this plan is executed, no new `ccc.*`,
`dev.*`, `gem.*`, `help.*`, or `CP-*` files should be created at the repo root. Planning and
status tracking move to GitHub issues; durable knowledge moves to `docs/`.

---

## 1. Current State

Measured on 2026-08-14 at commit `6e56a55`.

| Metric | Value |
|---|---|
| Tracked files | 140 |
| Tracked files that are the actual app | 72 (all under `memory-mate-mvp/`) |
| Tracked files that are dev-process markdown | 51 at the repo root |
| Tracked files that are the retired Python prototype | 3 (+1 ignored data file) |
| Tracked files that are a reusable Claude skill | 13 |
| Commits (all branches) | 79 |
| Largest blob in history | `package-lock.json`, ~430 KB |
| Secrets ever committed | none (`.env` never tracked; only `.env.example`) |

**The problem in one line**: 51 of 140 tracked files are a written record of how the MVP got
built, sitting in the same directory a newcomer looks at first, while the actual app is
buried one level down in a directory whose name (`memory-mate-mvp`) is now false advertising.

**Secondary problems found during the survey:**

1. `claude.md` is lowercase. Claude Code looks for `CLAUDE.md`; on a case-sensitive
   filesystem this file has most likely **not been loading at all**. Its content is also
   stale (it describes the Python prototype as "current" and the MVP as "next").
2. The root `README.md` is the December-2025 prototype README. It describes local-only
   storage and "Backend (MVP): None", which sync made false in June. The *good* README is
   `memory-mate-mvp/README.md`.
3. Two npm crash artifacts are committed: `memory-mate-mvp/2026-01-18T14_27_34_186Z-debug-0.log`
   and `memory-mate-mvp/2026-01-18T14_27_34_186Z-eresolve-report.txt`.
4. `ccc.10.mvp-implementation-checkpoint-1.md` is a symlink to `CP-1-CHECKPOINT-REVIEW.md`.
5. No `LICENSE`, no CI, no lint config, and **no automated tests for the app at all** — the
   Python prototype has 71 KB of tests; the TypeScript app that replaced it has zero.
6. Nine source files carry `ccc.30` in their comments. That path has to keep resolving to
   something, or those comments rot.
7. Six stale local branches and three merged remote branches are still around.

---

## 2. Key Decision: Keep This Repo. Do Not Re-Instantiate.

A fresh repo was floated as an option. **Recommendation: don't.** The conditions that
normally justify a fresh start are all absent here:

- **No secrets to purge.** `.env` was never tracked.
- **No history bloat.** 79 commits, biggest object ~430 KB. Nothing to rewrite.
- **Live GitHub state exists and is worth keeping.** Four open issues (#4, #6, #8, #11) and
  five merged PRs (#1, #3, #7, #9, #10) whose descriptions are the real changelog for sync,
  the account-switch data leak, and shelves. A new repo orphans all of it.
- **Blame is still useful.** The sync engine and export/import code are recent, subtle, and
  the reasoning lives in commit messages.

Everything the user wants — a clean root, a normal layout, no clutter — is reachable with
`git mv` and `git rm`. Deleted files remain fully recoverable from history, and a tag makes
that recovery a one-liner.

**Cost of being wrong is asymmetric**: if the repo later needs to be re-instantiated, that
is still possible at any time. Re-instantiating now permanently discards the issue/PR record.

---

## 3. Target Structure

```
.
├── .github/
│   ├── ISSUE_TEMPLATE/        # bug.yml, feature.yml
│   └── workflows/ci.yml       # typecheck + lint + test on PR
├── assets/                    # app icons/splash (moved up)
├── docs/
│   ├── architecture/
│   │   ├── sync.md            # from ccc.30 — referenced by source comments
│   │   └── data-model.md      # distilled from ccc.02 / ccc.21
│   ├── guides/
│   │   ├── backend-setup.md   # from ccc.31 (Supabase project setup)
│   │   ├── ios-deployment.md  # from expo-ios-deployment-guide.md
│   │   ├── hosting.md         # from gem.01
│   │   └── windows-network.md # from help.windows-network-config.md
│   ├── notes/
│   │   ├── expo-sqlite-web.md # from ccc.20 — still load-bearing, see metro.config.js
│   │   └── data-format.md     # export/import JSON format, from ccc.23/24
│   ├── product/
│   │   └── use-cases.md       # from ccc.07
│   └── archive/               # frozen MVP development record — see §4.C
├── src/                       # app source (moved up from memory-mate-mvp/src)
├── supabase/schema.sql
├── .env.example
├── .gitignore
├── app.json
├── CHANGELOG.md
├── CLAUDE.md                  # new, short, correctly cased
├── LICENSE
├── README.md                  # the good one, promoted
├── package.json
└── tsconfig.json  (+ babel/metro/tailwind/prettier configs)
```

**App location**: promote `memory-mate-mvp/` to the repo root. This repo holds exactly one
app; a single-app repo puts the app at the root. All the app's configs use relative paths
(`./src/**`, `./global.css`, `__dirname`), so the move is path-safe.

*Alternative if you'd rather not:* rename `memory-mate-mvp/` → `app/`. Smaller diff, but you
keep paying a directory hop forever and the root stays oddly empty. Recommendation stands at
root-level.

---

## 4. Disposition of Every Root File

Three outcomes: **Promote** (becomes a real doc), **Archive** (kept verbatim under
`docs/archive/`), **Delete** (removed from the tree; still in git history + the pre-cleanup tag).

### A. Promote to `docs/`

| File | New path | Why it survives |
|---|---|---|
| `ccc.30.mvp-phase-5-addendum-cross-device-sync-plan.md` | `docs/architecture/sync.md` | Nine source files cite it. It's the design of record for the sync engine. |
| `ccc.31.supabase-overview-and-setup-guide.md` | `docs/guides/backend-setup.md` | Needed to stand up a new Supabase project. Still accurate. |
| `ccc.32.cross-device-sync-testing-guide.md` | `docs/guides/sync-testing.md` | Manual test procedure for the riskiest subsystem. Keep until automated. |
| `ccc.20.expo-sqlite-web-workaround.md` | `docs/notes/expo-sqlite-web.md` | `metro.config.js` encodes this workaround; the note explains why. |
| `ccc.07.mvp-use-cases.md` | `docs/product/use-cases.md` | The only product spec. Strip "MVP" framing, keep the use cases. |
| `expo-ios-deployment-guide.md` | `docs/guides/ios-deployment.md` | Operational. |
| `help.windows-network-config.md` | `docs/guides/windows-network.md` | Operational (LAN testing from iOS against a WSL2 host). |
| `gem.01.plan-for-hosting.md` | `docs/guides/hosting.md` | Domain/hosting/compliance plan; rewrite from bullets into prose. |
| `memory-mate-mvp/README.md` | `README.md` (root) | Current and accurate. Replaces the prototype README. |

**Distilled, not moved** (write new, shorter files; originals go to archive):

- `docs/architecture/data-model.md` — from `ccc.02` + `ccc.21`, updated for the sync columns
  and tombstones that landed later.
- `docs/notes/data-format.md` — the export/import JSON contract, from `ccc.23`/`ccc.24`.
  This is user-facing (people have exported files); it deserves a stable home.

### B. Delete

| File(s) | Reason |
|---|---|
| `ccc.10.mvp-implementation-checkpoint-1.md` | Symlink to `CP-1-CHECKPOINT-REVIEW.md`. |
| `CP-1-CHECKPOINT-REVIEW.md`, `CP-2-NAVIGATION-STRUCTURE-VERIFICATION.md`, `CP-2-REFINEMENTS.md` | Point-in-time checkpoint sign-offs. Fully superseded. |
| `IMPLEMENTATION-SUMMARY.md`, `PHASE-5-TASK-1-TESTING-GUIDE.md` | Duplicates of `ccc.28`/`ccc.29` content. |
| `dev.01.nativewind-expo-installation.txt` | Superseded by the starter-app skill and by Expo 56. |
| `dev.02.ask-for-claude-skill-for-dev-env-and-starter-app.md` | A prompt, already acted on. |
| `ccc.13`, `ccc.14` | Skill-authoring prompt + skills overview. Belongs with the skill (§5), not the app. |
| `ccc.09`, `ccc.11`, `ccc.12` | Dev-env setup and React 19 / Expo web dependency conflicts, all from the pre-Expo-56 era. Actively misleading now. |
| `example.01.tmdb-movie-app-architecture.md` | Reference architecture consulted once in Dec 2025. Remove the README link with it. |
| `task-002-upgrade-to-expo-56.md` | Task complete, merged in PR #3. |
| `claude.md` | Replaced by a new `CLAUDE.md` (§6). |
| `README.md` (root, prototype-era) | Replaced by the promoted app README. |
| `memory-mate-mvp/2026-01-18T*-debug-0.log`, `*-eresolve-report.txt` | npm crash artifacts. Add `*-debug-*.log` and `*-eresolve-report.txt` to `.gitignore`. |
| `w509-MemoryMate2026.code-workspace` | Two-line file naming a single folder `"."`; carries the internal `w509` prefix. Delete, or rename to `memory-mate.code-workspace` if you use the workspace file daily. |

### C. Archive under `docs/archive/`

Everything else: `ccc.00`–`ccc.06`, `ccc.08`, `ccc.15`–`ccc.19`, `ccc.21`–`ccc.29`.

These are the MVP build narrative — phase plans, completion summaries, issue post-mortems,
`ccc.25.lessons-learned.md`. Low ongoing value, non-zero historical value, and cheap to keep.

Keep the original filenames inside `docs/archive/` (they're referenced by each other), and
add `docs/archive/README.md` stating: frozen on 2026-08-14, describes the MVP as built,
superseded by `docs/` and GitHub issues, do not update.

*If you'd rather the archive not be in the repo at all:* delete it instead and rely on the
`pre-cleanup-2026-08-14` tag. Recovery is `git checkout pre-cleanup-2026-08-14 -- ccc.25...`.
The archive folder is the conservative default; a full delete is defensible.

### D. The Python prototype

`memory_mate.py`, `demo_memory_mate.py`, `test_memory_mate.py` (~110 KB total), plus the
ignored `demo_memory_mate_data.json`, `.coverage`, `__pycache__/`, `.pytest_cache/`.

It served as the functional spec for the TypeScript service layer and is now fully
superseded by `src/services/`. It shares no code with the app — the only apparent link,
`memory_mate` in `database.ts`, is just the SQLite filename `memory_mate.db`.

**Recommendation: delete.** A Python file tree in an Expo repo invites the question "do I
need to run this?" for every future contributor, forever. Its 154 tests documented behavior
that now lives in TypeScript. History and the tag preserve it.

*Alternative:* move to `docs/archive/prototype/` if you want the test suite readable as a
behavior spec while rebuilding tests on the TS side (§7).

### E. The Claude skill

`skill-expo-react-typescript-starter-app/` (13 files) is a general-purpose Expo + TypeScript
+ NativeWind starter generator. It isn't about Memory Mate.

**Recommendation: extract to its own repo** (`RoboNater/skill-expo-rn-starter`), carrying
`ccc.13` and `ccc.14` along as its design notes. Then remove it here.

*Alternative:* move it to `.claude/skills/expo-starter/` in this repo if you want it loaded
in Memory Mate sessions. That keeps it usable but wrongly implies it's project-specific.

---

## 5. Backlog Migration: `dev.*` → GitHub Issues

You already use issues (#4, #6, #8, #11 open). The remaining `dev.*` files are a
backlog living in the wrong place. Convert, then delete the files.

**From `dev.05` (daily-usage findings):**

| Item | Action |
|---|---|
| Verse missing from local web view (7 vs 8) | Already issue **#4**. No action. |
| Sign-out button does nothing on web/iOS | **New issue**, `bug`. Not tracked anywhere. |
| Test scoring miscounts after a missing word (cascade failure) | **New issue**, `bug`. Real algorithm defect in the diff logic — likely needs alignment-based diffing rather than positional comparison. |
| Need a way to down-select an active verse set | **Done** — shipped as shelves in PR #10. Close out. |
| "+ N more" is not clickable on Practice/Test | **New issue**, `enhancement`. Include the mobile page-size note. |

**From `dev.04` (feature requests):**

| Item | Action |
|---|---|
| Import verses from plain text (reference + text) | **New issue**, `enhancement`. Nearest-term item on the list. |
| Non-verse memorization content | **New issue**, `epic`/`future`. |
| Multiple learning methods (pictorial, audio, flash cards, memory palace) | **New issue**, `epic`/`future`. |
| Multiple practice/test modes (fill-in-blank, first letter, scramble) | **New issue**, `epic`/`future`. |
| AI-assisted review, practice, and resources | **New issue**, `epic`/`future`. |

**From `dev.03`:** items 1, 2, 5, 7 are unresolved (test-screen focus lands on Fail with a
check-mark; multi-verse test doesn't continue after submit; `props.pointerEvents` deprecation
warning; home screen shows one fewer active verse than the Verses screen). Check each against
current `main` first — several may have been fixed incidentally by PR #7 or #10 — then file
what survives. Item 7 in particular may be the same root cause as #4.

Suggested labels to create: `epic`, `future`, `docs`, `tech-debt`.

---

## 6. New Files to Add

| File | Contents |
|---|---|
| `LICENSE` | Pick one. MIT if you want it reusable; a proprietary "all rights reserved" notice if not. The repo is currently **public with no license**, which means nobody has any rights to it — worth resolving deliberately. |
| `CLAUDE.md` | Short (target under 100 lines): what the app is, the stack, where things live, how to run it, the invariants worth stating (offline-first, all writes local-then-sync; every table is user-scoped with RLS; tombstones, never hard deletes). Replaces the 23 KB `claude.md`, which was a status log — that role now belongs to issues. Correct casing means it will actually load. |
| `CHANGELOG.md` | Seed from merged PRs #1, #3, #7, #9, #10 as `0.1.0 — MVP`. |
| `.github/workflows/ci.yml` | On PR: `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`. |
| `.github/ISSUE_TEMPLATE/bug.yml`, `feature.yml` | Bug template should ask for platform (web / iOS / Android) and whether the account is synced — the majority of past bugs were platform- or sync-specific. |
| `CONTRIBUTING.md` | Optional. Branch naming, commit conventions, how to run the app. |

---

## 7. Standard-Repo Gaps Worth Closing

Cleanup makes the repo *look* standard. These make it *behave* standard. Each is separate
work — listed here so they get scheduled, not smuggled into the cleanup PR.

1. **Tests (highest value).** The app has none. Add Jest + `@testing-library/react-native`,
   then cover the logic that has actually broken: sync reconciliation (LWW, tombstones,
   cursor inclusivity), export/import round-trips with malformed input, and test-result
   scoring. Wire into CI.
2. **Lint.** No ESLint config. Add `eslint-config-expo` and an `npm run lint` script.
3. **Rename the package.** `memory-mate-mvp` → `memory-mate` in `package.json`.
   ⚠️ Changing `name`/`slug` in `app.json` affects EAS project identity and store listings —
   change the display `name` freely, but treat `slug` as a separate, deliberate step and
   re-verify `eas.json` / project linking afterward. The `memorymate` URL scheme is unaffected.
4. **Branch cleanup.** Delete merged locals (`claude/verse-grouping-shelf-8kkfj1`,
   `i001-cc-haiku-implement-mvp-phase4`, `mvp/chore/c001-dependency-updates`,
   `mvp/feature/sync-to-server`, `mvp/task/t002-upgrade-to-expo-56`,
   `mvp/task/t003-usability-fixes`) and their merged remotes. Enable auto-delete-on-merge in
   repo settings.
5. **Tag the MVP.** `v0.1.0` on `main` at the current tip, so "the MVP" is a thing you can
   check out rather than a phase described in prose.
6. **Update the GitHub repo description** — it still says "2026 prototype".

---

## 8. Execution Plan

Nine steps on `repo/chore/c002-cleanup-repo`, each a separate commit. Steps 1–2 are the
safety net; step 4 is the only one that can break the build.

### Step 0 — Safety net

```bash
git checkout main && git pull
git tag pre-cleanup-2026-08-14 && git push origin pre-cleanup-2026-08-14
git tag v0.1.0 && git push origin v0.1.0
git checkout repo/chore/c002-cleanup-repo
```

⚠️ **Before anything else**: `memory-mate-mvp/.env` is untracked and holds real Supabase
credentials. Back it up outside the repo. It must survive step 4.

### Step 1 — File the backlog as issues

Do §5 first, while `dev.03`/`dev.04`/`dev.05` are still in the tree to read from. Verify each
`dev.03` item against current `main` before filing.

### Step 2 — Delete the obvious junk

`ccc.10` symlink, the two npm artifacts, `.coverage`. Extend `.gitignore` with
`*-debug-*.log`, `*-eresolve-report.txt`, `.pytest_cache/`, `.claude/`, `.expo/`.

### Step 3 — Establish `docs/`

Create the tree, `git mv` the nine promotions from §4.A, and write the two distilled files.
Then **update the nine source-comment references from `ccc.30` to
`docs/architecture/sync.md`** — do this in the same commit so nothing dangles.

Files with `ccc.30` references: `src/app/login.tsx`, `src/services/supabaseClient.ts`,
`src/services/authService.ts`, `src/services/database.ts` (×2), `src/services/syncService.ts`,
`src/services/verseService.ts`, `src/store/syncStore.ts`, `src/store/authStore.ts`.

### Step 4 — Promote the app to the root ⚠️ the risky one

```bash
git rm README.md .gitignore          # root prototype versions, replaced by the app's
git ls-files memory-mate-mvp | while read -r f; do
  dest="${f#memory-mate-mvp/}"
  mkdir -p "$(dirname "$dest")"
  git mv "$f" "$dest"
done
mv memory-mate-mvp/.env .            # untracked, must be moved by hand
rm -rf memory-mate-mvp/node_modules memory-mate-mvp/.expo
rmdir memory-mate-mvp
npm install && npm run typecheck
```

Then verify by actually running it: `npx expo start --web`, sign in, confirm verses load and
sync. Do not proceed on a green typecheck alone — the typecheck won't catch a broken asset
path in `app.json` or a NativeWind content glob that no longer matches.

### Step 5 — Archive

`git mv` the §4.C files into `docs/archive/`, write `docs/archive/README.md`.

### Step 6 — Prototype and skill

Delete the Python prototype (or move it to `docs/archive/prototype/`). Push the skill to its
own repo, then remove it here along with `ccc.13`/`ccc.14`.

### Step 7 — Add the standard files

`LICENSE`, `CLAUDE.md`, `CHANGELOG.md`, `.github/`. Delete stale `claude.md` and the
`.code-workspace` file.

### Step 8 — Verify, then merge

- [ ] `npm ci && npm run typecheck` clean from a fresh clone
- [ ] `npx expo start --web` — sign in, verses load, sync completes
- [ ] iOS via Expo Go — same
- [ ] No remaining `ccc.`/`dev.`/`CP-` references in `src/` (`grep -rn "ccc\.\|dev\.0\|CP-[12]" src/`)
- [ ] Every relative link in `docs/` and `README.md` resolves
- [ ] `git ls-files | wc -l` is roughly 90–100, and the root listing fits on one screen
- [ ] `.env` present locally, still untracked
- [ ] CI green on the PR

Merge as a single PR titled `chore(repo): retire MVP scaffolding, restructure as a standard app repo`,
linking this file. Then do §7 items 4–6 (branches, tags, repo description).

---

## 9. Risks

| Risk | Mitigation |
|---|---|
| Step 4 breaks the build via a path assumption | Configs verified relative-only beforehand; run the app on web *and* iOS before merging; `pre-cleanup` tag allows a full revert. |
| `.env` lost during the move | Backed up outside the repo in step 0; explicitly moved by hand in step 4. |
| A deleted doc turns out to be needed | Nothing is unrecoverable — `git checkout pre-cleanup-2026-08-14 -- <path>`. |
| Source comments point at moved docs | Updated in the same commit as the move (step 3). |
| Changing the Expo `slug` disturbs EAS/store linkage | Deferred out of the cleanup PR entirely (§7.3). |
| Long-running feature branches conflict | None are open — all five PRs are merged. Do this now, while the tree is quiet. |

---

## 10. Out of Scope

- History rewriting (`filter-repo`, squashing). Unnecessary — history is small and clean.
- Migrating to a monorepo. One app, no shared packages; nothing to gain.
- Redesigning the sync architecture. That's issue **#11** (server-assigned monotonic sequence)
  and it wants its own design pass.
- Writing the tests from §7.1. Scheduled separately, not part of the cleanup PR.
