-- Memory Mate — Supabase (PostgreSQL) schema for cross-device sync
-- Phase 2 of the sync work (see ccc.30 / ccc.31).
--
-- Run this in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Safe to re-run: tables use IF NOT EXISTS and policies are dropped-then-created.
--
-- Design notes:
--  * Mirrors the local SQLite schema so rows round-trip 1:1 with the app.
--  * Timestamps are stored as TEXT holding canonical ISO-8601 UTC strings
--    (exactly what JS `Date.toISOString()` produces, e.g. 2026-01-01T00:00:00.000Z).
--    This guarantees byte-for-byte fidelity with local SQLite and the JSON export,
--    keeps values lexicographically sortable, and avoids timezone-format drift in
--    the last-write-wins comparison on `updated_at`.
--  * `updated_at` is CLIENT-OWNED: the app sets it on every write so last-write-wins
--    reflects the originating device's clock. There is deliberately NO server-side
--    trigger overwriting it.
--  * Security model: project is configured to NOT auto-expose tables; we grant table
--    access only to the `authenticated` role (never `anon`), and RLS scopes every row
--    to its owner via `auth.uid() = user_id`. So the public anon key cannot read or
--    write any data without a signed-in session.
--  * Cross-table FKs are DEFERRABLE so a batched multi-row sync transaction is
--    order-independent; the sync engine still pushes verses before their children.

-- =========================================================================
-- Tables
-- =========================================================================

-- Shelves: named verse groups (issue #5). A verse points at most one shelf via
-- verses.shelf_id. No FK on shelf_id (here or locally): shelf deletion is a
-- soft delete and the client clears member assignments itself, so the column
-- stays a plain text reference and the idempotent migration below can add it
-- to pre-shelf deployments with a simple ADD COLUMN IF NOT EXISTS.
create table if not exists public.shelves (
  id          text primary key,
  name        text not null,
  created_at  text not null,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  updated_at  text,
  deleted_at  text
);

create table if not exists public.verses (
  id          text primary key,
  reference   text not null,
  "text"      text not null,
  translation text not null default 'NIV',
  created_at  text not null,
  archived    boolean not null default false,
  shelf_id    text,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  updated_at  text,
  deleted_at  text
);

-- Migration for deployments that created public.verses before shelves existed.
alter table public.verses add column if not exists shelf_id text;

create table if not exists public.progress (
  verse_id        text primary key
                    references public.verses(id) on delete cascade
                    deferrable initially deferred,
  times_practiced integer not null default 0,
  times_tested    integer not null default 0,
  times_correct   integer not null default 0,
  last_practiced  text,
  last_tested     text,
  comfort_level   integer not null default 1 check (comfort_level between 1 and 5),
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  updated_at      text,
  deleted_at      text
);

create table if not exists public.test_results (
  id          text primary key,
  verse_id    text not null
                references public.verses(id) on delete cascade
                deferrable initially deferred,
  "timestamp" text not null,
  passed      boolean not null,
  score       real,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  updated_at  text,
  deleted_at  text
);

-- =========================================================================
-- Indexes (support sync pull by `updated_at` and verse lookups)
-- =========================================================================

create index if not exists idx_shelves_user_updated      on public.shelves(user_id, updated_at);
create index if not exists idx_verses_user_updated       on public.verses(user_id, updated_at);
create index if not exists idx_progress_user_updated      on public.progress(user_id, updated_at);
create index if not exists idx_test_results_user_updated  on public.test_results(user_id, updated_at);
create index if not exists idx_test_results_verse         on public.test_results(verse_id);

-- =========================================================================
-- Grants — explicit because tables are NOT auto-exposed.
-- Authenticated users only; `anon` gets nothing (must sign in).
-- =========================================================================

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.shelves      to authenticated;
grant select, insert, update, delete on public.verses       to authenticated;
grant select, insert, update, delete on public.progress     to authenticated;
grant select, insert, update, delete on public.test_results to authenticated;

-- =========================================================================
-- Row Level Security — every row scoped to its owner.
-- (The project's auto-RLS trigger likely enabled these already; explicit anyway.)
-- =========================================================================

alter table public.shelves      enable row level security;
alter table public.verses       enable row level security;
alter table public.progress     enable row level security;
alter table public.test_results enable row level security;

drop policy if exists "own_shelves" on public.shelves;
create policy "own_shelves" on public.shelves
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "own_verses" on public.verses;
create policy "own_verses" on public.verses
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "own_progress" on public.progress;
create policy "own_progress" on public.progress
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "own_test_results" on public.test_results;
create policy "own_test_results" on public.test_results
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
