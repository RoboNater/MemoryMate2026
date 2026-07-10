# Memory Mate

A mobile and web app to help you memorize Bible verses, with progress tracking and
cross-device sync. Runs on iOS, Android, and the web from a single Expo codebase.

## Features

- **Verse library** — add, edit, archive, and organize verses (reference, text, translation).
- **Practice** — guided practice sessions to work through verses you're learning.
- **Testing** — test recall and record results over time.
- **Progress & stats** — per-verse comfort levels, last-practiced / last-tested tracking,
  and summary statistics.
- **Accounts** — email/password auth via Supabase.
- **Offline-first with cross-device sync** — all data is stored locally (SQLite on native,
  sql.js on web) and syncs to Supabase in the background. Works fully offline; changes
  reconcile when you're back online.
- **Data export** — export your data from Settings.

## Tech Stack

- **Framework**: Expo `~56.0` + React Native `0.85`
- **Language**: TypeScript `~6.0`
- **Navigation**: Expo Router `~56.2`
- **Styling**: NativeWind `4.2` (Tailwind CSS for React Native)
- **State**: Zustand `5.0`
- **Local storage**: expo-sqlite `~56.0` (native) / sql.js `1.13` (web)
- **Backend & sync**: Supabase (`@supabase/supabase-js` `2.x`) — Postgres + Auth with
  Row Level Security

## Development

### Prerequisites

- Node.js v24+ (tested with v24.11.1)
- npm 11+ (tested with 11.6.4)
- A Supabase project (for auth + sync) — see [Backend setup](#backend-setup)

### Getting Started

```bash
# Install dependencies
npm install

# Configure environment (see Backend setup below)
cp .env.example .env   # then fill in your Supabase URL + anon key

# Start the dev server
npm start           # or: npx expo start

# Run on a specific platform
npm run web         # Web browser
npm run ios         # iOS simulator (macOS only)
npm run android     # Android emulator
```

### Backend setup

Auth and sync require a Supabase project:

1. Create a project at [supabase.com](https://supabase.com).
2. Apply the database schema in [`supabase/schema.sql`](supabase/schema.sql) — it creates
   the `verses`, `progress`, and `test_results` tables and their Row Level Security
   policies (each user can only read/write their own rows).
3. Copy your Project URL and anon/publishable key from **Project Settings → API** into
   `.env`:

   ```
   EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-ref.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxxxxxxxxxxxxxxxxxx
   ```

   Both values are safe to ship in the client (the anon key is protected by RLS).
   Never put the `service_role` key or database password in `.env`.

### How sync works

The app is offline-first. Reads and writes go to the local database first; a background
sync service reconciles with Supabase using **last-write-wins by `updated_at`**, with
soft-delete tombstones (`deleted_at`) and a pull watermark so only changed rows move.
See [`src/services/syncService.ts`](src/services/syncService.ts) for details.

### Type checking

```bash
npm run typecheck   # tsc --noEmit
```

## Project Structure

```
memory-mate-mvp/
├── src/
│   ├── app/                # Expo Router screens
│   │   ├── (tabs)/         #   Home, Verses, Practice, Test, Settings
│   │   ├── verse/          #   Add / view / edit a verse
│   │   ├── practice/       #   Practice sessions & summary
│   │   ├── test/           #   Testing flow
│   │   └── login.tsx       #   Auth screen
│   ├── components/         # Reusable UI components
│   ├── store/              # Zustand stores (auth, verses, sync)
│   ├── services/           # Data access, database, Supabase, sync, export
│   ├── types/              # TypeScript definitions
│   ├── utils/              # Helpers
│   └── constants/          # App constants
├── supabase/
│   └── schema.sql          # Tables + Row Level Security policies
├── assets/                 # Icons, splash, fonts
├── app.json                # Expo config
├── metro.config.js         # Metro bundler config
└── tailwind.config.js      # Tailwind / NativeWind config
```

## Status

The MVP is functional across web, iOS, and Android, with accounts and cross-device sync
verified live. Ongoing work focuses on polishing usability rough edges before wider
distribution.
