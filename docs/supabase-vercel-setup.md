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

## 2. Turn on Google sign-in in Supabase

The app keeps the same Google button; Supabase now verifies the Google token
instead of Apps Script.

1. Supabase → **Authentication** → **Sign In / Providers** → **Google** →
   enable it.
2. Under **Client IDs** (sometimes labelled "Authorized Client IDs"), add
   your existing Google OAuth client ID (the one in `VITE_GOOGLE_CLIENT_ID`,
   ending in `.apps.googleusercontent.com`). Client secret can be left as is;
   the ID-token flow doesn't use it.
3. Save.

## 3. Allow the Vercel URL in Google Cloud

[Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
→ your OAuth client → **Authorized JavaScript origins**: add your Vercel
URL(s), e.g. `https://pleak.vercel.app` and any custom domain. Keep
`http://localhost:5173` for local dev. Redirect URIs stay empty.

## 4. Set Vercel environment variables

Vercel → the pleak project → **Settings** → **Environment Variables**, for
Production and Preview:

| Name | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → `anon` `public` key |
| `VITE_GOOGLE_CLIENT_ID` | same value as today |

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

Imported users aren't tied to a login yet. The first time each person signs
in with Google on the new site, their account is matched to their imported
row by email, so their history carries over. Everyone has to sign in once
after the switch.

## 6. Cut over

1. Re-run the import (step 5) right before switching, so the last workouts
   logged on the old site come across.
2. Merge this branch. Vercel deploys `main`.
3. Optional: add a custom domain in Vercel → **Settings** → **Domains** and
   follow its DNS instructions, then add that origin in step 3.
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
