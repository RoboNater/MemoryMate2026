# Reviewing npm audit findings

Memory Mate's CI runs `npm run audit:check` after `npm ci` on pull requests,
pushes to `main`, and a weekly schedule. The check queries npm's current
advisory data, so the scheduled run can catch a newly published vulnerability
even when `package-lock.json` has not changed.

## What the check compares

[`security/npm-audit-baseline.json`](../../security/npm-audit-baseline.json)
records each accepted root advisory by its GHSA identity. It also records the
affected package, title, severity, vulnerable range, CWEs, CVSS data, installed
nodes, and direct effects. A new identity, a change to any of those material or
reachability fields, or the disappearance of an accepted advisory fails the
check and requires another review.

The check deliberately does not compare npm's aggregate vulnerability counts.
One root advisory can create many derived findings as npm walks dependency
paths, so a harmless tree change can alter the count without changing the risk.
The command still prints the affected-package count for context alongside the
root identities it actually evaluates.

The baseline's `protectedOverrides` section separately verifies each
version-scoped security override. It checks that:

- the expected override is still present in `package.json`;
- an installed ancestor still matches the selector's version range; and
- every matching ancestor resolves the protected dependency within its safe
  range.

This makes a dependency major-version move visible instead of letting an old
selector become silently inert.

## Triaging a failed check

1. Run `npm run audit:check` and read every failure. Use `npm audit --json` when
   you need the full dependency paths and advisory metadata.
2. Prefer updating the owning dependency or applying a semver-compatible,
   narrowly scoped override. Regenerate `package-lock.json` and run the check
   again.
3. If a fix is not currently safe, open or update a GitHub issue that records
   reachability, impact, available patched versions, and the reason remediation
   is deferred.
4. Only after that review, update the corresponding entry in
   `security/npm-audit-baseline.json`. Copy the current material fields exactly,
   add a concise risk rationale, and link the full tracking-issue URL. Keep the
   `cwes` array sorted so it matches the check's normalization.
5. Run `npm ci`, `npm run audit:check`, `npm run typecheck`, `npm run lint`, and
   `npm test` before committing the baseline and lockfile together.

When an accepted advisory disappears, remove its baseline entry only after
confirming the installed dependency is patched or gone. When a protected
override has no matching ancestor, either update its selector and safe range for
the new dependency tree or remove it if the vulnerable dependency is no longer
reachable.

Upstream metadata can change without making the installed package more
dangerous. For example, an advisory that was initially unscored may later gain a
CVSS score, or its title may be clarified. The resulting failure is still a
required triage point: verify that the vulnerable range, severity, and local
reachability have not worsened, then update those baseline fields in the same PR
with a note explaining the upstream change.

Do not run `npm audit fix` or `npm audit fix --force` as part of this process.
npm's proposed fix can be a major downgrade of Expo or another incompatible
tree rewrite; dependency changes must be reviewed and tested deliberately.
