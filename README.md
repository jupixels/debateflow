# Rebuttal Flow

A Public Forum flowing app for the **rebuttal speaker**. Build a bank of saved responses before the tournament, then drop them onto your flow in seconds during the round. See [PLAN.md](PLAN.md) for the full roadmap.

Everything is stored on your device (IndexedDB), so it works offline. Back up or share your bank from **Settings → Your data**. Imports merge, so importing the same file twice doesn't create duplicates.

## Install it as an app

It's an installable app (PWA). Once installed, it opens in its own window and **works with no internet and no terminal running**.

```bash
npm install
npm start        # builds and opens http://localhost:4173/debatesoftware/
```

Then click **Install app** in the top bar (or the install icon at the right of the address bar in Chrome/Edge). On an iPad, open the hosted site in Safari → Share → **Add to Home Screen**. After that you can close the terminal; just launch Rebuttal Flow from your dock, Start menu or home screen. When a new version is available you'll be asked before it reloads, so a round is never interrupted.

> Your data is saved per web address. If you used the app at `localhost:5173` (`npm run dev`) before, open **Settings → Backup all** there, then **Import** the file in the installed app.

## Using it

1. **Bank**: pick or add a resolution, then add the opponent arguments you expect. For each argument, write **responses** (tagged NU / Delink / Link turn / Impact turn / Mitigation / Weighing / Other, card or analytic, ★–★★★) and **CX questions**. Paste a whole card and it splits into tag, cite, link and text. New here? **Try it with a sample bank**.
2. **Rounds**: pick side, speaking order, judge type and prep time, then **Start flowing**.
3. **Flow**: one sheet per case, opening on *their* case. Columns follow the real speaking order and your speeches are marked **US**. Link a row to a bank argument (inserting from the bank links it for you). **Drag a column's right edge to resize it**; double-click to reset.
4. **Crossfire**: open the panel with **Crossfire** or `X` (it opens by itself when the timer reaches a crossfire). Log each question and answer, star the concessions, and click **Insert** to drop a concession into the flow cell you last used. Concessions also show up first when you press `/`. Your prepared CX questions from the bank are listed there too, with the arguments they're actually running on top.
5. **Settings** (gear icon): light/dark/system mode, a **color wheel** for the theme color, **Pro/Con or Aff/Neg** wording (speech names follow: PC → AC, CFF → NFF), flow text size, and backup/import.

### Shortcuts

Press `?` anywhere to see them all.

| Key | Action |
|---|---|
| `/` (at the start of a cell or after a space) | Quick insert from the bank and crossfire concessions |
| `Enter` / `Shift+Enter` | New row below / new line in the cell |
| `Tab` / `Shift+Tab` | Next / previous speech column (wraps to the next row) |
| `Alt+↑` / `Alt+↓` | Same column, row above / below |
| `Ctrl+Enter` (`⌘+Enter` on Mac) | Save the cell to the bank as a new response |
| `Alt+1`…`Alt+6` | Tag the cell NU, DL, LT, IT, MIT, WGH (press again to clear) |
| `Space` · `N` | Start/pause the speech timer · next speech |
| `P` / `Shift+P` | Start/pause our / their prep (only one runs at a time) |
| `X` | Show/hide the crossfire panel |

Speech times are 4/4/3/3/2 with 3-minute crossfires. The speech clock runs into overtime (shown as `+0:12`); prep stops at zero.

## Development

Requires Node 22+.

```bash
npm install      # first time (and in a fresh cloud session)
npm run dev      # http://localhost:5173/debatesoftware/ (no offline/install support in dev)
npm start        # production build + preview, installable
npm test         # unit tests (Vitest)
npm run lint
npm run typecheck
npm run build    # production build in dist/
```

Stack: React 19 + TypeScript + Vite, Tailwind CSS v4, Zustand (UI state), Dexie (IndexedDB), Fuse.js (fuzzy search), vite-plugin-pwa (service worker + manifest), lucide-react icons, Vitest.

Theme: all colors are CSS variables in `src/index.css`. The neutrals are tinted toward the accent hue, which is set at runtime (`--accent-h`, `--accent-c`) from the color wheel.

```
src/
  db.ts              Dexie schema
  types.ts           data model
  store.ts           settings, UI + timer state (Zustand, persisted to localStorage), toasts, confirm
  lib/               pure logic + DB operations (cardParser, search, timer, speeches, repo, data, theme, install)
  components/        Bank, Rounds, Flow, Crossfire panel, Settings
```

**Cloud sessions:** the container starts without `node_modules`, so run `npm install` before running tests or the dev server.

## Deploying

`.github/workflows/ci.yml` runs lint, typecheck, tests and build on every PR and push to `main`. `.github/workflows/deploy.yml` builds and publishes to GitHub Pages on every push to `main`, at `https://jupixels.github.io/debatesoftware/`.

To turn Pages on: **Settings → Pages → Build and deployment → Source: GitHub Actions**. GitHub Pages for a **private** repository needs a paid plan (Pro, Team or Enterprise); on a free account, make the repository public first. Until Pages is enabled the deploy job will fail; that doesn't affect CI.

The site is served from `/debatesoftware/` (set as `base` in `vite.config.ts`). If you rename the repo, change it there too.
