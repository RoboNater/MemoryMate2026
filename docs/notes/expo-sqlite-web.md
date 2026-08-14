# expo-sqlite Does Not Work on Web via Metro — sql.js Workaround

**Date**: 2026-01-25
**Issue**: expo-sqlite hangs indefinitely when initializing on the web platform
**Resolution**: Use sql.js as an in-memory SQLite backend on web

---

## Problem

After completing Phase 4 (Data Layer Integration), the MemoryMate MVP failed to load in desktop and mobile web browsers. The app displayed a loading spinner that never resolved.

### Root Cause

`expo-sqlite` (v16.0.10, Expo SDK 54) uses a Web Worker + OPFS (Origin Private File System) backend on web, which relies on:

- WebAssembly module loading via a dedicated Web Worker
- `SharedArrayBuffer`, which requires specific HTTP headers:
  - `Cross-Origin-Opener-Policy: same-origin`
  - `Cross-Origin-Embedder-Policy: require-corp` (or `credentialless`)

The Metro web bundler does not serve these headers by default, and even after adding them via `metro.config.js` `enhanceMiddleware`, the Web Worker/WASM infrastructure failed to initialize. The call to `SQLite.openDatabaseAsync()` hung indefinitely — the returned Promise never resolved or rejected — leaving the app stuck in its loading state.

### What Was Tried (Did Not Work)

1. **Adding COOP/COEP headers to `metro.config.js`** via `server.enhanceMiddleware` — headers were added but expo-sqlite still hung.
2. **Falling back to `:memory:` database** — `SQLite.openDatabaseAsync(':memory:')` also hung, confirming the issue was with the WASM/Worker initialization itself, not OPFS specifically.
3. **Adding a timeout guard** — prevented the infinite hang and surfaced an error message, but did not fix the underlying problem.

### Symptoms

- **Desktop web (Chrome, Edge)**: Loading spinner forever, no console errors from expo-sqlite (the promise simply never settles)
- **Mobile web (iOS Safari, Android Chrome via Edge)**: Same behavior
- **Native (iOS/Android)**: Works correctly (expo-sqlite uses native SQLite)

---

## Solution

Replaced expo-sqlite with **sql.js** on the web platform only. sql.js is a battle-tested Emscripten/WASM port of SQLite that runs entirely in the main thread — no Web Workers, no OPFS, no SharedArrayBuffer, no special headers required.

### Architecture

```
Native (iOS/Android)          Web (Browser)
┌──────────────────┐          ┌──────────────────┐
│   expo-sqlite    │          │     sql.js       │
│  (persistent,    │          │  (in-memory,     │
│   OPFS/native)   │          │   WASM in main   │
└────────┬─────────┘          │   thread)        │
         │                    └────────┬─────────┘
         │                             │
         └──────────┬──────────────────┘
                    │
            ┌───────▼────────┐
            │  AppDatabase   │  ← shared interface
            │  interface     │
            └───────┬────────┘
                    │
            ┌───────▼────────┐
            │  Service Layer │  ← unchanged
            │  (verseService,│
            │   progressSvc, │
            │   testService, │
            │   statsService)│
            └────────────────┘
```

### Key Design Decisions

- **Dynamic import**: `sql.js` is loaded via `await import('./webDatabase')` inside a `Platform.OS === 'web'` check, so it is never bundled for native platforms.
- **WASM from CDN**: The sql.js WASM binary is fetched from `https://sql.js.org/dist/` at runtime. No local WASM file serving needed.
- **Shared interface**: An `AppDatabase` interface defines the methods used by the service layer (`execAsync`, `runAsync`, `getFirstAsync`, `getAllAsync`, `withTransactionAsync`, `closeAsync`). Both expo-sqlite and the sql.js adapter satisfy this interface.
- **No service changes**: All 5 service modules (`verseService`, `progressService`, `testService`, `statsService`, `database`) work unchanged on both platforms.

### Web Limitation

Data on web is **in-memory only** — it does not persist between page reloads. This is acceptable because:

- The MVP targets iOS/Android for production use
- Web is used for rapid development and testing
- All CRUD, practice, test, and statistics functionality works correctly in a single session

---

## Files Changed

### New Files

| File | Purpose |
|------|---------|
| `src/services/webDatabase.ts` | sql.js adapter implementing `WebSQLiteDatabase` interface |
| `src/types/sql-js.d.ts` | TypeScript declarations for the `sql.js` module |

### Modified Files

| File | Change |
|------|--------|
| `tailwind.config.js` | Added `darkMode: 'class'` (fixed separate NativeWind error on web) |
| `metro.config.js` | Added COOP/COEP headers via `enhanceMiddleware` (kept for potential future expo-sqlite web use) |
| `src/services/database.ts` | Platform-aware init: expo-sqlite on native, sql.js on web. Defined `AppDatabase` interface. Split multi-statement `execAsync` calls into individual statements for sql.js compatibility. |

### New Dependency

| Package | Version | Purpose |
|---------|---------|---------|
| `sql.js` | ^1.x | In-browser SQLite via WASM (web platform only) |

---

## Secondary Fix: NativeWind Dark Mode

A separate error also prevented web loading:

```
Uncaught Error: Cannot manually set color scheme, as dark mode is type 'media'.
Please use StyleSheet.setFlag('darkMode', 'class')
```

**Cause**: NativeWind defaults `darkMode` to `'media'` (CSS media query), but its runtime attempts to manually set the color scheme on web, which conflicts.

**Fix**: Set `darkMode: 'class'` in `tailwind.config.js`.

---

## Verification

Tested successfully on desktop web browser:

- App loads past the loading spinner
- Console shows: `[MemoryMate] Using sql.js in-memory database (web)`
- Added 3 verses, ran practice and test sequences
- All CRUD operations, progress tracking, test recording, and statistics work correctly
- Native iOS/Android path unchanged (uses expo-sqlite as before)

---

## Future Considerations

- If expo-sqlite web support improves in a future Expo SDK, the sql.js fallback could be removed and the `AppDatabase` interface kept for clean abstraction.
- For web data persistence, IndexedDB-backed storage could be added (sql.js supports exporting/importing the database as a binary blob).
- The COOP/COEP headers in `metro.config.js` can be removed if they cause issues with loading external resources.

---

**Document Version**: 1.0
**Created**: 2026-01-25
**Author**: Claude Code
