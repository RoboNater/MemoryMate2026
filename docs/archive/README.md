# Archive — MVP development record (frozen)

**Frozen 2026-08-14. Do not update these files, and do not add new ones.**

This directory holds the working record of how Memory Mate's MVP was built between
December 2025 and July 2026: phase plans, completion summaries, design notes, issue
post-mortems, and lessons learned. It is kept for historical context only.

**These documents describe the app as it was, not as it is.** Most of them predate the
cross-device sync work and the shelves feature, so where they disagree with the code, they
are simply wrong. Do not use them as a reference for current behavior.

For current documentation, see:

| Question | Where to look |
|---|---|
| How does the app work? | [`../../README.md`](../../README.md), [`../../CLAUDE.md`](../../CLAUDE.md) |
| How does sync work? | [`../architecture/sync.md`](../architecture/sync.md) |
| What are the tables and fields? | [`../architecture/data-model.md`](../architecture/data-model.md) |
| What is the export file format? | [`../notes/data-format.md`](../notes/data-format.md) |
| How do I set up the backend? | [`../guides/backend-setup.md`](../guides/backend-setup.md) |
| What is being worked on? | [GitHub issues](https://github.com/RoboNater/MemoryMate2026/issues) |

## Contents

The `ccc.NN.*` files are numbered in rough chronological order.

- **ccc.00** — the last "active context" status file, from 2026-02-07. Superseded by GitHub issues.
- **ccc.01–ccc.06** — the Python prototype: initial review, data model and class design, verse
  management review, verse-progress and test-result design and implementation summaries.
- **ccc.08** — the original MVP implementation plan and its checkpoint structure.
- **ccc.15–ccc.19** — MVP phases 2, 3, and 4: plans and completion status.
- **ccc.21–ccc.24** — data persistence and the JSON export/import addendum.
- **ccc.25** — lessons learned during the MVP build.
- **ccc.26, ccc.27** — post-mortems on two data-integrity bugs (import robustness, partial deletes).
- **ccc.28, ccc.29** — phase 5 task 1, the multi-verse practice session.
- **ccc.33** — the plan for the 2026-08-14 cleanup that created this archive.

## What was removed rather than archived

The cleanup also deleted the Python prototype (`memory_mate.py` and its 154 tests), an
unrelated Expo starter-app skill, checkpoint sign-offs, and several dependency-conflict notes
made obsolete by the Expo 56 upgrade.

None of it is lost. Everything as it stood before the cleanup is at tag
`pre-cleanup-2026-08-14`:

```bash
git show pre-cleanup-2026-08-14 --stat            # see everything that existed
git checkout pre-cleanup-2026-08-14 -- <path>     # restore a specific file
```
