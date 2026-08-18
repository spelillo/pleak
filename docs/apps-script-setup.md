# Deploying the Pleak Apps Script API

This is the one-time, manual setup that has to happen in your own Google
account — I can't click through Google's own consent screens for you, so
these steps are for you to run. Takes about 5 minutes.

## 1. Create the Sheet

1. Go to [sheets.new](https://sheets.new) to create a blank spreadsheet.
2. Rename it to "Pleak Data" (top-left, click the title).

## 2. Add the script

The API is split across six small files under [`apps-script/`](../apps-script/)
— `Config.gs`, `Setup.gs`, `Router.gs`, `SheetHelpers.gs`, `CrudHelpers.gs`,
`Auth.gs` — each under 100 lines so it pastes cleanly. They all share one
global scope, so it doesn't matter what order you add them in.

1. In the Sheet, go to **Extensions → Apps Script**. This opens the Apps
   Script editor in a new tab, already linked to this Sheet.
2. Delete the placeholder content in the default `Code.gs` file, then either
   rename it to `Config.gs` or delete it entirely — either way you'll end up
   with six files matching the ones in the repo.
3. For each of the six files in `apps-script/`: create a new script file in
   the editor (the `+` next to "Files") named to match (e.g. `Config`), and
   paste in that file's full contents.
4. In `Config.gs`, set `GOOGLE_CLIENT_ID` and `ALLOWED_EMAILS` — see
   [google-signin-setup.md](google-signin-setup.md) for where the client ID
   comes from. Every Google account that should be able to sign in needs its
   email listed in `ALLOWED_EMAILS`.
5. Click the save icon (or `Cmd+S`).

## 3. Run setup once

1. In the toolbar dropdown that lists function names, select **`setup`**.
2. Click **Run** (▶).
3. The first run will prompt for authorization: **Review permissions** →
   pick your Google account → you'll see an "unverified app" warning
   because this script isn't published — click **Advanced** → **Go to
   (project name) (unsafe)** → **Allow**. This is expected for a personal
   script only you use; it's warning about itself, not a third party.
4. Check the Sheet tab — you should now see tabs for `Users`, `Exercises`,
   `WorkoutPlans`, `WorkoutSessions`, `ScheduledWorkouts`, `Goals`,
   `PersonalRecords`, `WeeklyWorkoutPlans`, `WeeklyPlanDays`, and
   `WeeklyPlanCompletions`, each with a header row.

## 4. Deploy as a Web App

1. Back in the Apps Script editor, click **Deploy → New deployment**.
2. Click the gear icon next to "Select type" → choose **Web app**.
3. Set:
   - **Execute as:** Me (your account)
   - **Who has access:** Anyone
   - (This has to stay "Anyone" for an Apps Script Web App to be reachable
     from the browser at all. Signing in with Google verifies who's using
     the *app* — the frontend won't show any data until you've signed in
     with an email in `ALLOWED_EMAILS` — but the `/exec` URL itself has no
     per-request authorization yet: anyone who has the URL could call it
     directly, bypassing the UI. Treat the URL as a shared secret for now,
     the same as before this phase. See
     [google-signin-setup.md](google-signin-setup.md).)
4. Click **Deploy**, authorize again if prompted.
5. Copy the **Web app URL** it gives you (ends in `/exec`).

## 5. Wire it into the app

1. In `pleak-app/`, copy `.env.example` to `.env.local`.
2. Set `VITE_API_BASE_URL` to the URL you copied.
3. Restart `npm run dev` if it was already running (Vite only reads `.env*`
   files on startup).

## Redeploying after script changes

Any time a file under `apps-script/` changes in this repo, you need to
manually paste the new version into the matching file in the Apps Script
editor and create a **new deployment version** (Deploy → Manage deployments
→ edit (pencil) → New version → Deploy) — saving the file alone does not
update the live `/exec` URL.
