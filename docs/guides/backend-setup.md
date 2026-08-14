# Supabase: Overview & Account Setup Guide

**Date**: 2026-06-20
**Purpose**: Brief, practical guide to creating and configuring the Supabase account that will back cross-device sync.
**Companion doc**: [ccc.30.mvp-phase-5-addendum-cross-device-sync-plan.md](ccc.30.mvp-phase-5-addendum-cross-device-sync-plan.md) — the sync design this supports.

---

## 1. What Supabase Is (in one paragraph)

Supabase is a hosted "backend-as-a-service" built around a real **PostgreSQL** database. Instead of writing and running your own server, you get a managed Postgres instance plus auto-generated APIs and a few batteries-included services:

- **Database** — standard PostgreSQL. You define tables; it's just SQL.
- **Auth** — user sign-up/login (email/password, Google, Apple, etc.), with secure session tokens (JWTs).
- **Row Level Security (RLS)** — Postgres rules that decide, per row, who can read/write. This is how a single shared database safely scopes every row to its owner.
- **Auto APIs** — REST and realtime endpoints generated from your tables, used by the `@supabase/supabase-js` client we'll add to the app.
- **Storage** — file/blob storage (not needed for this app yet; verses are small text).
- **Dashboard** — a web admin UI to view tables, run SQL, manage auth users, and find your keys.

For Memory Mate it plays exactly one role: the **shared hub of record** that all your devices sync to. The app keeps its local SQLite cache and talks to Supabase only through the sync layer.

**Cost**: the Free tier (one project, generous limits) is far more than a single-user app needs. No card required to start.

---

## 2. Key Concepts You'll See

| Term | What it means for us |
|------|----------------------|
| **Project** | One Supabase instance = one Postgres DB + auth + APIs. We need exactly one. |
| **Project URL** | `https://<ref>.supabase.co` — the app points at this. |
| **anon (publishable) key** | A public API key shipped in the app. Safe to expose **because RLS** restricts what it can touch. It is *not* an admin key. |
| **service_role key** | A secret admin key that **bypasses RLS**. Never ship this in the app; use only for server-side/admin scripts. Keep it private. |
| **Row Level Security (RLS)** | Per-row access rules. With it off, the anon key could read everything; with it on + our policy, each request only sees rows where `user_id = auth.uid()`. **This is the real security boundary.** |
| **auth.users** | Built-in table of accounts. Our tables reference it via `user_id`. |
| **auth.uid()** | SQL function returning the id of the currently-authenticated user; used in RLS policies. |

---

## 3. Step-by-Step Setup

### Step 1 — Create the account & project
1. Go to **supabase.com** → **Start your project** → sign in (GitHub login is easiest; or email).
   - *Optional, per your `gem.01` plan:* use a dedicated admin email (e.g. a Proton address) for infrastructure logins.
2. **New project**:
   - **Name**: `memory-mate` (anything).
   - **Database password**: generate a strong one and **save it in your password manager** (needed for direct DB access; not used by the app day-to-day).
   - **Region**: pick the one closest to you for lower latency.
   - **Plan**: Free.
3. Wait ~1–2 minutes for provisioning.

### Step 2 — Grab the connection details
In the dashboard: **Project Settings → API**. Copy:
- **Project URL**
- **anon / public key**

These two go into the app's config (see §4). Do **not** copy the service_role key into the app.

### Step 3 — Create the tables + security
Open **SQL Editor** in the dashboard and run the migration script (I'll provide `supabase/schema.sql` during Phase 2 of the sync work). It will:
- create `verses`, `progress`, `test_results` mirroring the local schema **plus** `user_id`, `updated_at`, `deleted_at`;
- add a `user_id uuid references auth.users` on each;
- **enable RLS** on all three tables;
- add policies so each user only sees their own rows, e.g.:

```sql
alter table verses enable row level security;

create policy "Users manage their own verses"
  on verses for all
  using  ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );
```

(The `(select auth.uid()) = user_id` form is the optimization called out in your `gem.01` plan — it lets Postgres cache the value per query.)

> ⚠️ **The single most important rule:** RLS must be **enabled on every table**. With RLS off, the public anon key can read/write all rows. The setup script enables it; if you ever add a table by hand, enable RLS on it too.

### Step 4 — Configure Auth
In **Authentication → Providers**:
- **Email** is on by default — fine for getting started.
- For your own single-user convenience you may want to **disable "Confirm email"** (Authentication → settings) so you can sign in immediately without the email round-trip. (Re-enable later if the app is ever shared.)
- Google/Apple sign-in can be added later (Apple is relevant when you ship to the iOS App Store).
- Create your own user: either sign up from the app once it has a login screen, or add a user manually under **Authentication → Users**.

### Step 5 — Hand the details to the app
Provide me (or place in the app config) the **Project URL** and **anon key**. In the codebase these will live in config/env rather than being hard-coded — likely via `app.json`/`expo-constants` `extra` or an `.env` consumed at build time. The anon key being public is expected and safe under RLS.

---

## 4. Where the Keys Live in the App

```
Project URL  ─┐
anon key     ─┴─►  src/services/supabaseClient.ts  ──►  createClient(url, anonKey)
                         ▲
                         └── values injected via expo-constants / env, not committed as secrets-in-code
```

- The **anon key is publishable** — it's meant to ship in client apps; RLS is what protects the data.
- The **service_role key and the database password are secrets** — never put them in the app or commit them. They stay in your password manager / Supabase dashboard.

---

## 5. Quick Glossary Recap / Gotchas

- ✅ **Do** enable RLS on every table (the setup script does this).
- ✅ **Do** store the DB password and service_role key in a password manager only.
- ✅ **Do** use the anon key in the app — that's its purpose.
- ❌ **Don't** ship the service_role key in the app.
- ❌ **Don't** disable RLS to "make it work" — that exposes all data to anyone with the public key.
- ℹ️ Disabling email confirmation is a convenience for a single-user setup; reconsider if you ever share the app.

---

## 6. What You Need To Do vs. What I'll Do

**You (one-time, ~10 minutes):**
1. Create the Supabase account + project (Steps 1–2).
2. Send me / save the **Project URL** and **anon key**.
3. Optionally pre-create your user and disable email confirmation for convenience.

**Me (during the sync implementation):**
- Provide the `supabase/schema.sql` migration (tables + RLS) for you to run in the SQL Editor (Step 3).
- Wire `supabaseClient.ts`, auth, and the sync engine per ccc.30.

---

*This guide supports the plan in ccc.30. Account setup (Steps 1–2) can be done any time; the schema script (Step 3) comes with Phase 2 of the sync implementation.*
