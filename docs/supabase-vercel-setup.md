# Moving to Supabase + Vercel

Pleak's data now lives in Supabase (Postgres) and the site is hosted on
Vercel. This replaces the Google Sheets + Apps Script backend and the GitHub
Pages deploy. The old setup is left in place (`apps-script/`,
`.github/workflows/deploy.yml`, the Sheet itself) until you've cut over and
are happy; nothing here deletes it.

Do the steps in order. Steps 1 to 5 can all happen before this branch is
merged; step 6 is the cutover.

## 1. Create the database schema

Either paste the migration into the Supabase SQL editor:

1. Supabase dashboard → your project → **SQL Editor** → **New query**.
2. Paste the whole of
   [`supabase/migrations/20261014000000_initial_schema.sql`](../supabase/migrations/20261014000000_initial_schema.sql)
   and click **Run**.

or, with the [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

This creates one table per old sheet tab, with row-level security so each
signed-in person can only read and change their own rows, and an
`allowed_emails` table seeded with `spelillo11@gmail.com`.

### Adding or removing people

Replaces `ALLOWED_EMAILS` in `Config.gs`. In the SQL editor:

```sql
insert into allowed_emails (email) values ('friend@example.com');
delete from allowed_emails where email = 'friend@example.com';
```

Emails must be lowercase.

## 2. Set up email and PIN sign-in in Supabase

Pleak signs people in with an email and a 6-digit PIN through Supabase Auth
(the PIN is the Supabase password). Confirming an email and resetting a PIN
work with either the emailed link or the 6-digit code in the same email.

1. Supabase → **Authentication** → **Sign In / Providers** → **Email**: make
   sure it's enabled, "Confirm email" is on, **Minimum password length** is 6,
   and **Email OTP Length** is 6.
2. Supabase → **Authentication** → **Emails** → **Templates**: in both
   **Confirm signup** and **Reset password**, show the code with
   `{{ .Token }}` (for example `<h2>{{ .Token }}</h2>`). Supabase only lets
   you edit templates once custom SMTP is set up; until then the emails carry
   just a link, which the app also handles.
3. Supabase → **Authentication** → **URL Configuration**: set **Site URL** to
   the live site (e.g. `https://pleak-synth10.vercel.app`) and add
   `https://pleak-synth10.vercel.app/**` and `http://localhost:5173/**` under
   **Redirect URLs**, so any link left in an email opens the app.
4. Optional: Supabase's built-in email sender allows 2 emails an hour. For
   more, add your own SMTP under **Authentication → Emails**.

Only addresses in `allowed_emails` (step 1) can get into the app; anyone else
can create a login but is stopped at "not allowed to sign in".

## 4. Vercel environment variables (optional)

The app has Pleak's Supabase URL and publishable key built in
(`src/lib/supabase.ts`), so Vercel needs
no variables. Set these only to point a deploy at a different project:

| Name | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → `anon` `public` key |

Never add the `service_role` key to Vercel. Vercel picks up `vercel.json`
(Vite build, `dist` output, SPA rewrites) automatically. Redeploy after
setting the variables, since Vite bakes them in at build time.

For local dev, put the same three values in `.env.local` (see
`.env.example`).

## 5. Copy the data out of Google Sheets

`scripts/import-from-sheets.mjs` reads every tab through the still-running
Apps Script API and upserts it into Supabase, keeping the same ids. It's safe
to re-run.

```bash
npm install
cp scripts/import.env.example .env.import   # gitignored; fill in all four values
node --env-file=.env.import scripts/import-from-sheets.mjs --dry-run
node --env-file=.env.import scripts/import-from-sheets.mjs
```

It prints a count per table. Skipped rows are ones with a missing id or
pointing at a user or weekly plan that doesn't exist.

Imported users aren't tied to a login yet. When each person creates an
account on the new site with the same email, it's matched to their imported
row, so their history carries over.

## 6. Cut over

1. Re-run the import (step 5) right before switching, so the last workouts
   logged on the old site come across.
2. Merge this branch. Vercel deploys `main`.
3. Optional: add a custom domain in Vercel → **Settings** → **Domains** and
   follow its DNS instructions, then use it as the Site URL in step 2.
4. Tell your group the new URL. Bookmarks and home-screen installs of the
   `github.io/pleak` address need replacing.

After the merge, the GitHub Pages workflow still runs on every push to
`main`. It now builds the Supabase version of the app under `/pleak/`, so it
only works if you add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as
GitHub repo secrets too. Once you're happy on Vercel, retire it:

- Delete `.github/workflows/deploy.yml` and turn off Pages in the repo's
  **Settings → Pages**.
- Archive the Apps Script deployment (Deploy → Manage deployments) and the
  Sheet.
- Delete `apps-script/`, `public/404.html`, the 404 redirect decoder in
  `index.html`, `docs/apps-script-setup.md`, and the `VITE_API_*` GitHub
  secrets.
