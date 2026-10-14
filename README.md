# Pleak

A simple workout tracker for a small group of people, hosted on Vercel with Supabase as the database.

## Stack

- React + TypeScript + Vite
- Tailwind CSS v4 (brand tokens in [`src/index.css`](src/index.css))
- Supabase Postgres with row-level security (data layer), schema in [`supabase/migrations`](supabase/migrations)
- Google Sign-In, verified by Supabase Auth
- Vercel (hosting), config in [`vercel.json`](vercel.json)

Setup and the move off Google Sheets / GitHub Pages: [docs/supabase-vercel-setup.md](docs/supabase-vercel-setup.md).
The old Apps Script backend (`apps-script/`, [docs/apps-script-setup.md](docs/apps-script-setup.md)) is kept only until cutover.

## Development

```bash
npm install
cp .env.example .env.local   # fill in Supabase + Google values
npm run dev
```

## Build

```bash
npm run build
```

Vercel deploys `main` automatically and builds a preview for every branch. The legacy GitHub Pages workflow ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)) still runs until it's retired.

## Brand assets

Source crops used to produce `public/icon-*.png`, `public/favicon*`, and `public/pleak-*.png` live in `brand-source/` (not part of the deployed app) — re-export from there if new sizes are ever needed.
