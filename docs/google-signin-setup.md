# Setting up Google Sign-In

Like the Apps Script deploy, this is one-time manual setup in your own
Google account — Google's OAuth consent flow has to be clicked through by a
human. Takes about 5 minutes.

## 1. Create an OAuth client ID

1. Go to the [Google Cloud Console credentials page](https://console.cloud.google.com/apis/credentials).
2. Create a project if you don't already have one (top-left project picker →
   New Project).
3. Click **Create Credentials → OAuth client ID**.
4. If prompted, configure the **OAuth consent screen** first:
   - User type: **External**.
   - Fill in the required app name, support email, and developer email.
   - You can leave scopes and test users as defaults — Sign In With Google
     only needs the default `email`/`profile` scopes.
   - Publishing status can stay "Testing" if it's just your group; add each
     person's Google account under **Test users**, or click **Publish App**
     to allow any Google account (the app's own `ALLOWED_EMAILS` allowlist
     in `Config.gs` still restricts who can actually sign in).
5. Back on **Create OAuth client ID**:
   - Application type: **Web application**.
   - Name: anything, e.g. "Pleak".
   - **Authorized JavaScript origins**: add both
     - `http://localhost:5173` (Vite's dev server)
     - your GitHub Pages URL, e.g. `https://<your-username>.github.io`
   - Leave **Authorized redirect URIs** empty — Sign In With Google's token
     flow doesn't use redirects.
6. Click **Create**. Copy the **Client ID** shown (ends in
   `.apps.googleusercontent.com`).

## 2. Wire it into the frontend

1. In `pleak-app/.env.local`, set:
   ```
   VITE_GOOGLE_CLIENT_ID=<the client ID you copied>
   ```
2. Restart `npm run dev` if it was already running.

## 3. Wire it into the backend

1. In the Apps Script editor's `Config.gs` file, set:
   ```js
   var GOOGLE_CLIENT_ID = '<the same client ID>';
   var ALLOWED_EMAILS = ['you@example.com', 'friend@example.com'];
   ```
2. Save, then create a new deployment version (Deploy → Manage deployments
   → edit (pencil) → New version → Deploy) so the change goes live.

## Adding or removing people

Edit `ALLOWED_EMAILS` in `Config.gs` and redeploy. There's no UI for this —
it's a plain list in the script, by design, since this is a small private
group.
