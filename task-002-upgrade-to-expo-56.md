# Task 002: Upgrade from Expo SDK 54 to SDK 56

## Context

This is **Memory Mate MVP** — a React Native / Expo app for memorizing Bible verses. It uses:
- Expo Router for file-based navigation
- expo-sqlite for local SQLite storage (native)
- sql.js for web/browser SQLite
- Supabase for cross-device sync
- NativeWind (Tailwind CSS for React Native)
- Zustand for state management

**Why this upgrade:** `npm install` currently reports 26 vulnerabilities (1 critical, 8 high, 16 moderate, 1 low). Nearly all of them are in transitive dependencies that get fixed by upgrading from Expo SDK 54 to SDK 56. The npm audit fix for most moderate vulnerabilities specifically recommends `expo@56.0.12` or later.

**Current versions in `package.json`:**
- `expo`: `~54.0.31`
- `expo-router`: `~6.0.21`
- `react-native`: `0.81.5`
- `react`: `19.1.0`

---

## Pre-work already done (do not redo)

Research for this upgrade was completed in the main branch session before this worktree was created. Key findings are summarized below — trust these rather than re-researching from scratch.

---

## What to expect at each step

### Step 1: SDK 54 → 55

**Run:**
```bash
npx expo install expo@^55.0.0 --fix
```

**Then clean up `app.json`** — two keys are removed in SDK 55:
- `"newArchEnabled": true` — legacy arch is gone in SDK 55; this key is no longer valid
- `"android"."edgeToEdgeEnabled": true` — edge-to-edge is now mandatory; this key is removed (behavior is preserved automatically)

**Then verify:**
```bash
npx expo-doctor@latest
npm run typecheck
```

SDK 55 breaking changes that **do NOT apply** to this project (no action needed):
- `expo-av` removal → app doesn't use it
- `expo-clipboard` event changes → not used
- `expo-video` prop renames → not used
- `expo-status-bar`/`expo-navigation-bar` becoming no-ops → not used directly

---

### Step 2: SDK 55 → 56

**Run:**
```bash
npx expo install expo@^56.0.0 --fix
```

**Then run the expo-router codemod** (safety pass — likely a no-op for this project, but required due to the react-navigation fork):
```bash
npx expo-codemod sdk-56-expo-router-react-navigation-replace src/
```

**Then verify:**
```bash
npx expo-doctor@latest
npm run typecheck
```

SDK 56 breaking changes and how they affect this project:

| Change | Impact on this project |
|---|---|
| `expo-router` no longer depends on `react-navigation` | LOW — no `@react-navigation/*` imports anywhere in `src/`. All navigation uses expo-router's own API (`useRouter`, `useLocalSearchParams`, `Stack`, `Tabs`, `router`). Codemod is a safety pass only. |
| `expo/fetch` replaces `globalThis.fetch` | MEDIUM — Supabase makes HTTP requests; verify auth and sync still work after upgrade. Set `EXPO_PUBLIC_USE_RN_FETCH=1` in `.env` to revert if Supabase breaks. |
| `@expo/vector-icons` removed from expo's deps | NONE — already added as a direct dep (`"@expo/vector-icons": "^15.0.3"`) in a prior commit. |
| `expo-file-system` async File/Directory API | NONE — `settings.tsx` already imports from `expo-file-system/legacy`, so it's insulated from this change. |

---

## Packages requiring manual peer-dep checks

`npx expo install --fix` only touches Expo-owned packages. These direct deps are **not** auto-updated and may need manual version bumps if `expo-doctor` or the build flags peer dep mismatches:

| Package | Current version | What to check |
|---|---|---|
| `nativewind` | `^4.2.1` | Peer dep on react-native version. Check NativeWind changelog if doctor reports a mismatch. |
| `react-native-reanimated` | `~4.1.1` | Tightly coupled to RN version. Check release notes if RN version changes. |
| `react-native-worklets` | `^0.7.2` | Same — RN peer dep. |
| `react-native-web` | `^0.21.2` | Web renderer; may need bump if RN bumps. |

The safe approach: run `npx expo-doctor@latest` after each step and only update these if doctor explicitly calls them out.

---

## Key files to know about

```
app.json                              — Expo config (needs cleanup, see above)
package.json                          — Dependencies
src/app/(tabs)/_layout.tsx            — Tab navigator (uses @expo/vector-icons MaterialIcons)
src/app/(tabs)/settings.tsx           — Uses expo-file-system/legacy, expo-sharing, expo-document-picker
src/services/database.ts              — Uses expo-sqlite (native path)
src/services/webDatabase.ts           — Uses sql.js (web path)
src/services/supabaseClient.ts        — HTTP calls via Supabase (watch for fetch replacement)
src/services/syncService.ts           — Sync logic (also uses Supabase)
```

No files import directly from `@react-navigation/*` — all navigation is through expo-router.

---

## Recommended execution order

1. **Upgrade to SDK 55** (run install, clean app.json, run doctor + typecheck)
2. **Upgrade to SDK 56** (run install, run codemod, run doctor + typecheck)
3. **Run `npm audit`** to confirm vulnerability count is reduced
4. **Smoke-test** the app — start the dev server (`npm start`) and verify:
   - App loads and tabs are visible
   - Login flow works
   - SQLite reads/writes work (add a verse, verify it persists)
   - Supabase sync connects (if credentials available in env)
5. **Commit** with message referencing this task (task-002)

---

## If something breaks

- **Type errors after `--fix`**: Run `npm run typecheck` and fix imports. Usually just renamed exports.
- **Supabase fetch errors**: Try `EXPO_PUBLIC_USE_RN_FETCH=1` in a local `.env` to fall back to the native fetch implementation.
- **NativeWind styles broken**: Check NativeWind v4 release notes for Expo 56 compatibility; may need `nativewind@^4.3.x` or later.
- **expo-doctor still reports issues after --fix**: Run `npx expo install --check` to see exactly what's out of range, then bump those packages individually.
- **Stuck on a peer dep conflict**: The `--legacy-peer-deps` flag is a last resort; prefer resolving actual version mismatches first.
