# Pleak

A simple workout tracker for a small group of people, hosted on GitHub Pages with Google Sheets as the database.

## Stack

- React + TypeScript + Vite
- Tailwind CSS v4 (brand tokens in [`src/index.css`](src/index.css))
- Google Apps Script Web App + Google Sheets (data layer, added in a later phase)
- Google Sign-In (auth, added in a later phase)

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Deploys automatically to GitHub Pages on push to `main` via [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

## Brand assets

Source crops used to produce `public/icon-*.png`, `public/favicon*`, and `public/pleak-*.png` live in `brand-source/` (not part of the deployed app) — re-export from there if new sizes are ever needed.
