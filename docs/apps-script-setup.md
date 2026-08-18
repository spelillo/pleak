# Deploying the Pleak Apps Script API

This is the one-time, manual setup that has to happen in your own Google
account — I can't click through Google's own consent screens for you, so
these steps are for you to run. Takes about 5 minutes.

## 1. Create the Sheet

1. Go to [sheets.new](https://sheets.new) to create a blank spreadsheet.
2. Rename it to "Pleak Data" (top-left, click the title).

## 2. Add the script

1. In the Sheet, go to **Extensions → Apps Script**. This opens the Apps
   Script editor in a new tab, already linked to this Sheet.
2. Delete the placeholder content in `Code.gs`.
3. Paste in the full contents of [`apps-script/Code.gs`](../apps-script/Code.gs)
   from this repo.
4. Click the save icon (or `Cmd+S`).

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
   - (This is intentionally open for now — Phase 3 has no login yet. Phase 4
     adds real access control so only your allowed Google accounts can
     write data.)
4. Click **Deploy**, authorize again if prompted.
5. Copy the **Web app URL** it gives you (ends in `/exec`).

## 5. Wire it into the app

1. In `pleak-app/`, copy `.env.example` to `.env.local`.
2. Set `VITE_API_BASE_URL` to the URL you copied.
3. Restart `npm run dev` if it was already running (Vite only reads `.env*`
   files on startup).

## Redeploying after script changes

Any time `apps-script/Code.gs` changes in this repo, you need to manually
paste the new version into the Apps Script editor and create a **new
deployment version** (Deploy → Manage deployments → edit (pencil) → New
version → Deploy) — saving the file alone does not update the live `/exec`
URL.
