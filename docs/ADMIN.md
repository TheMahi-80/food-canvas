# Admin access

The admin panel lives at `/admin`. There is no public sign-up: admins are created by hand in
Supabase and granted rights with one SQL statement.

## How access is enforced (four layers)

| Layer | Where | What it does |
|---|---|---|
| 1. Proxy | `proxy.ts` | Every `/admin/*` request without a valid Supabase session is redirected to `/admin/login`. Also sets `Cache-Control: private, no-store` and `X-Robots-Tag: noindex`. |
| 2. Every page | `requireAdminPage()` in `lib/auth/admin.ts` | Verifies the user with the Supabase Auth server (`getUser()`) and checks `is_admin()` in the database on every request. Non-admins are sent to `/admin/login?denied=1`. |
| 3. Every mutation | `requireAdminAction()` in `lib/auth/admin.ts` | Must be the first call in every admin Server Action. Server Actions are public HTTP endpoints, so hidden buttons are not protection. |
| 4. Database | RLS policies (`supabase/migrations/*_rls_and_admin.sql`) | All writes require `public.is_admin()`. Even a stolen session for a non-admin account cannot change anything. |

Admin status is a row in `public.admin_users`, checked on every request, so revoking an admin
takes effect on their very next click (no waiting for a token to expire). The app never uses the
Supabase service-role key.

## Create the first admin (one time)

1. Supabase dashboard → **Authentication → Sign In / Providers**: turn **off** "Allow new users to sign up".
2. **Authentication → Users → Add user → Create new user**: enter the email and a strong password, tick **Auto Confirm User**.
3. **SQL Editor** → run (replace the email):
   ```sql
   insert into public.admin_users (user_id)
   select id from auth.users where email = 'owner@example.com';
   ```
4. Check it worked:
   ```sql
   select u.email, a.created_at from public.admin_users a join auth.users u on u.id = a.user_id;
   ```
5. Open `/admin/login` and sign in.

Current admin (set up 2026-10-14): the owner's account was created in the dashboard and granted
admin with the SQL above.

## Add or remove admins later

- Add: repeat steps 2–3 for the new person.
- Remove admin rights (account stays):
  ```sql
  delete from public.admin_users where user_id = (select id from auth.users where email = 'person@example.com');
  ```
- Delete the account completely: Authentication → Users → ⋯ → Delete user (admin rights go with it).

Admins cannot add other admins from the website; `admin_users` has no write policy on purpose.

## Forgotten password

Authentication → Users → select the user → **Send password recovery**. This needs the Site URL
(Authentication → URL Configuration) to point at the live site. Supabase's built-in email sender is
heavily rate-limited; configure custom SMTP for reliable delivery.

## Verify the protection yourself (manual steps)

Run these against the deployed site (or `npm run build && npm start` locally).

1. **Not signed in:** open a private window, go to `/admin`. Expected: you land on `/admin/login`.
   Try `/admin/anything` too: same result.
2. **Wrong password:** sign in with a wrong password. Expected: "ইমেইল বা পাসওয়ার্ড সঠিক নয়।" and you stay on the login page.
3. **Signed-in non-admin:** create a second user in the dashboard (step 2 above) but do **not** run
   the SQL. Sign in with it. Expected: "এই অ্যাকাউন্টের অ্যাডমিন অনুমতি নেই।", and `/admin` still sends you to login.
   Delete that user afterwards.
4. **Admin:** sign in with your admin account. Expected: the overview with real counts.
5. **Revoke while signed in:** with an admin signed in, remove their row from `admin_users`, then
   reload `/admin`. Expected: "অনুমতি নেই" (access denied) immediately.
6. **Logout:** click "লগআউট". Expected: back on the login page; `/admin` is blocked again.
7. **Database layer:** in the SQL editor run `supabase/tests/rls_checks.sql`.
   Expected: `ALL RLS CHECKS PASSED`.

## Automated checks

- `npm test` covers the decision logic (`lib/auth/check.test.ts`, `lib/auth/routes.test.ts`):
  no session, invalid session, non-admin, failed lookups (fail closed) and open-redirect attempts.
- `supabase/tests/rls_checks.sql` proves anonymous and non-admin users cannot write anything in the database.
