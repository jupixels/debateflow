# Rebuttal Flow

A Public Forum flowing app for the **rebuttal speaker**. Build a bank of saved responses before the tournament, then drop them onto your flow in seconds during the round. See [PLAN.md](PLAN.md) for the full roadmap.

Everything is stored on your device (IndexedDB), so it works offline. Back up or share your bank from **Settings → Your data**. Imports merge, so importing the same file twice doesn't create duplicates.

## Install it as an app

It's an installable app (PWA). Once installed, it opens in its own window and **works with no internet and no terminal running**.

```bash
npm install
npm start        # builds and opens http://localhost:4173/debatesoftware/
```

Then click **Install app** in the top bar (or the install icon at the right of the address bar in Chrome/Edge). On an iPad, open the hosted site in Safari → Share → **Add to Home Screen**. After that you can close the terminal; just launch Rebuttal Flow from your dock, Start menu or home screen. New versions install by themselves when you open the app. If one arrives while you're using it (or a timer is running), an **Update ready** banner appears at the top instead, so a round is never interrupted; click **Reload now** when it suits you. A plain browser refresh does *not* update an offline-capable app, so use the banner (or close and reopen the app). **Settings** shows the version you're running.

> Your data is saved per web address. If you used the app at `localhost:5173` (`npm run dev`) before, open **Settings → Backup all** there, then **Import** the file in the installed app.

## Using it

Pick your role in **Settings → My role** (or on the welcome screen):

- **Rebuttal** (second speaker): the flow opens on their case.
- **Constructive** (first speaker): adds the **Case** tab, and the flow opens on your case.
- **Both**: every tool; the flow opens on their case.

1. **Bank**: pick or add a resolution, then add the opponent arguments you expect. For each argument, write **responses** (tagged NU / Delink / Link turn / Impact turn / Mitigation / Weighing / Other, card or analytic, ★–★★★) and **CX questions**. Paste a whole card and it splits into tag, cite, link and text. New here? **Try it with a sample bank**.
2. **Case** (constructive role): write your case as text blocks and contentions. You get a live time estimate at your speaking speed against 4:00, with where each section starts. **Read** opens a full-screen reading mode with a timer, big adjustable text and an ahead/behind pace indicator. Each contention has **Frontlines** (their likely response → your answer) and **Questions they may ask** (with your answers). **Duplicate** makes a lay version or a shorter cut that shares the same prep.
3. **Rounds**: pick side, speaking order, judge type, prep time and (if you have one) your case, then **Start flowing**. Your contentions are filled in on your case sheet, linked to their frontlines.
4. **Flow**: one sheet per case. Columns follow the real speaking order and your speeches are marked **US**. Link a row to a bank argument (inserting from the bank links it for you); on your case sheet, `/` shows that contention's frontlines first and inserts them as `[FL]`.
   - **Hide columns** by right-clicking a column header or using **Columns**. A hidden column shrinks to a thin strip: click it to bring the column back (a dot means it has notes). Each sheet starts with the columns that are normally empty hidden: the other team's constructive, and the first-speaking team's rebuttal on that team's own case (the first rebuttal only attacks). **Reset to this sheet's default** in the menu restores them.
   - **Drag a column's right edge to resize it**; double-click to reset.
   - **Read case** opens your case in reading mode during the round.
5. **Speech builder** (`S`): plans summary or final focus from the flow. It lists each argument on both sheets with its status (frontlined, needs a frontline, unanswered…), lets you choose **Extend/Answer** or **Drop**, warns when you're going for too much for the judge type, and has a weighing box. It builds an outline with a time estimate that you can **Copy** or **Read** in reading mode.
6. **Crossfire**: open the panel with **Crossfire** or `X` (it opens by itself when the timer reaches a crossfire). Log each question and answer, star the concessions, and click **Insert** to drop a concession into the flow cell you last used. Concessions also show up first when you press `/`. Your prepared CX questions from the bank are listed there too, with the arguments they're actually running on top, plus your prepared answers to questions about your own case.
7. **Settings** (gear icon): role, speaking speed, light/dark/system mode, a **color wheel** for the theme color, **Pro/Con or Aff/Neg** wording (speech names follow: PC → AC, CFF → NFF), flow text size, and backup/import.

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
| `X` / `S` | Show/hide the crossfire panel / speech builder |
| Right-click a column header | Hide it, or show hidden columns |

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
