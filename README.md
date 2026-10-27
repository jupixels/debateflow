# Rebuttal Flow

A Public Forum flowing app for the **rebuttal speaker**. Build a bank of saved responses before the tournament, then drop them onto your flow in seconds during the round. See [PLAN.md](PLAN.md) for the full roadmap.

Everything is stored on your device (IndexedDB), so it works offline once loaded. Use **Export** / **Import** in the header to back up your data or share a bank with your partner (imports merge; nothing gets duplicated).

## Using it

1. **Bank**: add the resolution, then the opponent arguments you expect (Pro or Con), then your responses to each. Responses are tagged NU / Delink / Link turn / Impact turn / Mitigation / Weighing / Other, marked card or analytic, and rated ★–★★★. Paste a card (tag line, cite line, text) into the paste box and it fills in the tag, cite, URL and text for you.
2. **Rounds**: fill in side, speaking order, opponents, judge and prep time, then **Start flowing**.
3. **Flow**: one sheet per case, opening on *their* case. Columns follow the actual speaking order; your team's speeches are shaded green. Link a row to a bank argument with the dropdown on the left (inserting from the bank links it automatically).

### Flow shortcuts

| Key | Action |
|---|---|
| `/` (at the start of a cell or after a space) | Quick-insert from the bank. Shows responses to the row's linked argument first; type to fuzzy-search everything |
| `Enter` / `Shift+Enter` | New row below / new line in the cell |
| `Tab` / `Shift+Tab` | Next / previous speech column (wraps to the next row) |
| `Alt+↑` / `Alt+↓` | Same column, row above / below |
| `Ctrl+Enter` (`⌘+Enter` on Mac) | Save the cell to the bank as a new response |
| `Alt+1`…`Alt+6` | Tag the cell NU, DL, LT, IT, MIT, WGH (press again to clear) |
| `Space` (outside a cell) | Start / pause the speech timer |
| `P` / `Shift+P` (outside a cell) | Start / pause our / their prep (only one runs at a time) |

Speech times are 4/4/3/3/2 with 3-minute crossfires. The speech clock runs into overtime (shown in red as `+0:12`); prep stops at zero.

## Development

Requires Node 22+.

```bash
npm install      # first time (and in a fresh cloud session)
npm run dev      # http://localhost:5173/debatesoftware/
npm test         # unit tests (Vitest)
npm run lint
npm run typecheck
npm run build    # production build in dist/
```

Stack: React 19 + TypeScript + Vite, Tailwind CSS v4, Zustand (UI state), Dexie (IndexedDB), Fuse.js (fuzzy search), Vitest.

```
src/
  db.ts              Dexie schema
  types.ts           data model
  store.ts           UI + timer state (Zustand, persisted to localStorage)
  lib/               pure logic + DB operations (cardParser, search, timer, speeches, repo, data)
  components/        Bank, Rounds, Flow screens
```

**Cloud sessions:** the container starts without `node_modules`, so run `npm install` before running tests or the dev server.

## Deploying

`.github/workflows/ci.yml` runs lint, typecheck, tests and build on every PR and push to `main`. `.github/workflows/deploy.yml` builds and publishes to GitHub Pages on every push to `main`, at `https://jupixels.github.io/debatesoftware/`.

To turn Pages on: **Settings → Pages → Build and deployment → Source: GitHub Actions**. GitHub Pages for a **private** repository needs a paid plan (Pro, Team or Enterprise); on a free account, make the repository public first. Until Pages is enabled the deploy job will fail; that doesn't affect CI.

The site is served from `/debatesoftware/` (set as `base` in `vite.config.ts`). If you rename the repo, change it there too.
