The Master Setup Plan: Expo to Enterprise (2026)
Here is your comprehensive "Project Bible." You can copy and paste this into a README.md or a Notion page.

Project Infrastructure & Growth Plan
Phase 1: Identity & Security (The Vault)
Email: Proton Mail

Purpose: Use a dedicated address (e.g., admin.projectname@proton.me) for registrar and hosting logins only.

Security: Enable Passkeys or Hardware 2FA.

Domain Registrar: Cloudflare Registrar

Task: Register domain. Enable WHOIS Privacy (Redaction).

Task: Enable DNSSEC in the Cloudflare dashboard (prevents "man-in-the-middle" hijacking).

Phase 2: Deployment & Hosting (The Engine)
Platform: EAS Hosting

Web Deployment: npx expo export --platform web followed by eas deploy.

Mobile Ready: You can use the same dashboard to build .ipa or .apk files when you're ready for the App Store.

Domain Connection:

Point your Cloudflare CNAME records to the EAS provided endpoint.

Set TTL to Auto or 3600.

Phase 3: Data & Storage (The Memory)
Backend: Supabase

Database: PostgreSQL.

Storage: Use "Supabase Storage" for large files (Gigabytes).

Auth: Use "Supabase Auth" to handle user logins (Google, Apple, or Email/Password).

Critical Security Rule: * Always Enable Row Level Security (RLS) on every table.

Optimization: Use ((select auth.uid()) = user_id) in your policies to speed up queries.

Phase 4: Compliance & Growth (3–5 Year Horizon)
Analytics: Use Plausible or Vercel Web Analytics.

Why: These are privacy-first and don't require annoying cookie banners for 20-50 people.

Legal: Create a simple Privacy Policy. Even for 50 friends, if you store their data, you must legally state what you store and how they can ask you to delete it (GDPR/CCPA compliance).

Business Email: Use Zoho Mail (Free Tier) or iCloud+ Custom Domains to receive mail at webadmin@yourdomain.com.