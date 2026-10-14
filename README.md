# Food Canvas

Bangla-first ordering website for Food Canvas (Chattogram, near CUET). Customers browse the menu,
build a cart, and send the order request through WhatsApp. There is no order backend or payment.

Project rules and business facts live in `CLAUDE.md`.

## Requirements

- Node.js 20.9+ (developed on Node 24), npm

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in real values
npm run dev                  # http://localhost:3000
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run typecheck` | Generate route types, then `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (Vitest) |

## Environment variables

See `.env.example`. Only placeholders are committed; real values go in `.env.local` (git-ignored)
and in the Vercel project settings. The Supabase service-role key is not used by this app.

## Database (Supabase)

Everything lives in `supabase/`:

| Path | What it is |
|---|---|
| `migrations/*_core_schema.sql` | Tables, constraints, indexes; inserts the real settings row (WhatsApp 8801845690533) and hours (every day 15:00–22:00) |
| `migrations/*_rls_and_admin.sql` | `is_admin()`, privileges, RLS policies, `lookup_coupon()`, `delete_category()` |
| `migrations/*_storage.sql` | `menu-images` bucket (public read, 5 MB, JPEG/PNG/WebP) and admin-only write policies |
| `seed.sql` | **Sample data only**, labeled `[নমুনা]` / `sample-` |
| `tests/rls_checks.sql` | Security checks; runs in one transaction and rolls back |

Admin authorization: a user is an admin if their `auth.users.id` is in `public.admin_users`.
Every write policy checks `public.is_admin()` in the database. `admin_users` has no write
policies, so admins can only be added from the SQL editor.

### Apply to your Supabase project

1. Create the project in the Supabase dashboard. Keep the database password.
2. Link and push the migrations (from the repo root):
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push --dry-run   # review: should list the 3 migrations
   npx supabase db push
   ```
3. Optional, sample menu: SQL editor → paste `supabase/seed.sql` → Run.
4. Security checks: SQL editor → paste `supabase/tests/rls_checks.sql` → Run.
   Expected result: one row, `ALL RLS CHECKS PASSED`. Anything starting with `FAIL:` is a problem.
5. Authentication → Sign In / Providers: turn **off** "Allow new users to sign up".
   Authentication → URL Configuration: set Site URL to your site.
6. Create the first admin:
   - Authentication → Users → Add user → Create new user (email + strong password, Auto Confirm User).
   - SQL editor:
     ```sql
     insert into public.admin_users (user_id)
     select id from auth.users where email = 'owner@example.com';  -- your admin email
     select u.email from public.admin_users a join auth.users u on u.id = a.user_id;  -- verify
     ```
   - To remove an admin: `delete from public.admin_users where user_id = (select id from auth.users where email = '...');`
7. Project Settings → API Keys: copy the Project URL and the **publishable** key into `.env.local`
   Never put the service-role/secret key in this app.

`npm test` also runs the migrations, seed and `rls_checks.sql` locally against PGlite (in-memory
Postgres) with a small Supabase stand-in (`tests/supabase-shim.sql`). That is a fast safety net,
not a replacement for step 4 on the real project.

## Conventions

- UI copy: `lib/i18n/bn.ts` (single Bangla catalog). Do not hard-code strings in components.
- Theme: `data-theme` on `<html>`, set before paint by `themeInitScript` (`lib/theme.ts`);
  colors are CSS variables in `app/globals.css` (dark + light).
- Business logic (pricing, WhatsApp message, opening hours) lives in `lib/` as tested pure functions.
