# Hosting and Infrastructure

How Memory Mate's infrastructure — identity, deployment, DNS, backend, and basic
compliance — is set up and why. This is operational guidance for whoever owns the
account, not application documentation.

## Identity and registrar security

Use a dedicated email address for all registrar and hosting logins (for example
`admin.projectname@proton.me` on Proton Mail), separate from any personal
account. Its only purpose is infrastructure logins — keep it out of mailing
lists, sign-ups, or anything user-facing. Protect it with a passkey or hardware
2FA key, not SMS.

Register the domain through Cloudflare Registrar, and on the domain:

- Enable WHOIS privacy (redaction) so the registration doesn't expose personal
  contact details.
- Enable DNSSEC in the Cloudflare dashboard. This prevents DNS responses for the
  domain from being spoofed or hijacked in transit.

## Deployment: EAS Hosting

Web and mobile both deploy through Expo Application Services (EAS):

- **Web** — build a static export and deploy it:
  ```bash
  npx expo export --platform web
  eas deploy
  ```
- **Mobile** — the same EAS project and dashboard produce native builds (`.ipa`
  for iOS, `.apk`/`.aab` for Android) when the app is ready for TestFlight or an
  app store submission. No separate hosting setup is needed for this.

### DNS

Point the domain at the EAS-provided endpoint using a Cloudflare CNAME record.
Set the TTL to `Auto` (or `3600` if a fixed value is required) — there's no
benefit to a shorter TTL for a record that isn't expected to change often.

## Backend: Supabase

Supabase provides the database, auth, and file storage:

- **Database** — PostgreSQL. See `docs/architecture/data-model.md` for the actual
  schema (`verses`, `shelves`, `progress`, `test_results`) and
  `supabase/schema.sql` for the DDL.
- **Storage** — Supabase Storage, for any large files (the app doesn't currently
  store any, but this is the intended place for them if that changes).
- **Auth** — Supabase Auth handles sign-in. The app currently uses email/password;
  Supabase also supports Google and Apple sign-in if that's added later.

### Row Level Security is mandatory

**Every table must have Row Level Security enabled.** This is not optional for
any table that holds user data — RLS is the actual security boundary, since the
Supabase anon key is publishable and tables are not auto-exposed. Every table in
this project is enabled and policy-scoped to its owner:

```sql
alter table public.<table> enable row level security;

create policy "own_<table>" on public.<table>
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
```

**Performance tip:** write the check as `(select auth.uid()) = user_id`, not the
more obvious `auth.uid() = user_id`. Wrapping the call in a `select` lets
Postgres's planner evaluate it once per query instead of re-evaluating it for
every row scanned — this makes a measurable difference on any table that grows
past a trivial size. `supabase/schema.sql` follows this pattern on all four
tables; use the same form for any table added later.

Also grant table access explicitly and only to `authenticated`, never `anon`, so
an unauthenticated client can't read or write anything regardless of RLS:

```sql
grant select, insert, update, delete on public.<table> to authenticated;
```

## Privacy, analytics, and compliance

- **Analytics** — use a privacy-first tool such as Plausible or Vercel Web
  Analytics. These avoid the cookie-consent-banner requirement that
  tracking-cookie-based analytics (e.g. Google Analytics) trigger, which matters
  even at small scale.
- **Privacy policy** — write a simple, accurate privacy policy stating what data
  is stored and how a user can request deletion. This applies under GDPR/CCPA
  even for a small, informal user base — the obligation is based on what data is
  collected, not how many people use the app.
- **Business email** — for a domain-based contact address (e.g.
  `webadmin@yourdomain.com`), use Zoho Mail's free tier or iCloud+ Custom Domains
  rather than routing it through the dedicated infrastructure-login address
  above; keep the two separate.
