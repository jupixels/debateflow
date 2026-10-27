# Rebuttal Flow — Plan

A Public Forum flowing app built for the **rebuttal speaker** (in most PF partnerships, the second speaker: rebuttal + final focus). The core idea: you build a **bank of saved rebuttals** before tournaments, then pull them onto your flow in seconds during the round.

## Your ideas, plus what I'd change

| Your idea | Change / addition | Why |
|---|---|---|
| Save rebuttals | Organize them as **blocks** under a **resolution → opponent argument** tree, each response tagged by type (non-unique, delink, link turn, impact turn, mitigation, weighing) and marked **card** (evidence) or **analytic** | PF topics change every 1–2 months; tags let you filter "only my turns" or "only carded responses" mid-round |
| Input rebuttals easily during flow | **Keyboard-first quick insert**: press `/` in a flow cell, fuzzy-search your bank, `Enter` drops the response in, linked to the opponent's argument | Mid-round you have seconds; typing out a full response is too slow |
| Flow during rounds | Full PF flow with a column per speech, but the **opponent's case column is the main view** for you | Rebuttal is mostly about answering their case |
| — | **Frontline mode**: if you speak second, your rebuttal also has to frontline. The app shows their rebuttal responses on your case next to your saved frontlines | Speaking second is common and this is where rebuttals often lose time |
| — | **Speech view**: one button turns your flow responses into an ordered, large-font script to read from, with a running word count / estimated speaking time | Stops you going over 4:00 or forgetting a response you flowed |
| — | **Timers**: speech times (4/4/3/3/2 + crossfires) and a separate prep clock for each team | Built in so you don't need another app open |
| — | **Opponent library**: save each team's case after a round so you're ready if you hit them again in elims | Teams at a tournament run the same case all weekend |
| — | **Round history**: side, opponents, judge, result, RFD notes, and which responses actually worked | Over time you learn which blocks win ballots |
| — | **Judge mode toggle** (lay / flow / tech): lay mode warns you when you have too many responses on one argument | Lay judges want 2–3 clean responses, not 7 |
| — | **Works offline** (installable PWA, everything stored on the device) + JSON export/import | Tournament Wi‑Fi is unreliable; export lets you share blocks with your partner |

## Tech stack

- **React + TypeScript + Vite**: fast, runs on laptop and tablet browsers
- **Dexie (IndexedDB)**: local storage that can hold thousands of blocks; works offline
- **Zustand**: app state
- **Tailwind CSS**: styling, with dark mode (dim rooms, saves battery)
- **Fuse.js**: fuzzy search for quick insert
- **vite-plugin-pwa**: install it like an app, use it offline
- **Vitest + Playwright**: tests
- **GitHub Pages + GitHub Actions**: free hosting, auto-deploys on every push to `main`

No backend in v1, so there are no accounts or servers to manage. Syncing with a partner can come later (Phase 3).

## Data model (simplified)

```
Resolution   { id, title, monthRange }
Argument     { id, resolutionId, side: PRO|CON, title, summary }   // opponent arguments you prep against
Response     { id, argumentId, kind: NU|DELINK|LINK_TURN|IMPACT_TURN|MITIGATION|WEIGHING|OTHER,
               isCard, tag, text, cite?, url?, strength 1-3, timesUsed }
Frontline    { id, ourArgumentId, againstResponseText, text, isCard, cite? }
Round        { id, resolutionId, tournament, roundName, ourSide, speakingOrder, opponents, judge,
               judgeType, result, rfdNotes, createdAt }
FlowCell     { id, roundId, speech: PC|CC|PR|CR|PS|CS|PFF|CFF, row, text, linkedResponseId?, parentCellId? }
```

## Screens

1. **Bank**: resolution picker → argument tree → response list. Fast editor, paste a card and it auto-splits tag / cite / text.
2. **Round setup**: tournament, round, side, speaking order, opponents, judge type (about 10 seconds to fill in).
3. **Flow**: speech columns, keyboard navigation, `/` quick insert, timers in the header.
4. **Speech view**: the ordered rebuttal or final focus script with estimated time.
5. **History**: past rounds, filterable; "best performing responses" stats.

## Keyboard shortcuts (flow)

- `Enter`: new argument row · `Tab` / `Shift+Tab`: move to next/previous speech column
- `/`: quick-insert from bank · `Ctrl+Enter`: save the current cell as a new bank response
- `Alt+1…6`: tag the cell (NU, DL, LT, IT, MIT, WGH) · `Ctrl+Shift+S`: open speech view
- `Space` (outside a cell): start/stop the speech timer · `P`: prep timer

## Build phases

**Phase 1 (MVP):** project scaffold, CI, Pages deploy · bank CRUD with tags · round setup · flow grid with keyboard navigation · `/` quick insert · timers · offline storage · JSON export/import.

**Phase 2:** frontline mode · speech view with time estimate · opponent library · round history and response stats · judge-mode warnings · PWA install.

**Phase 3 (optional):** partner sync (e.g. Supabase) · print/PDF flows · import from Google Docs / Word block files · tablet/stylus tweaks.

## Open questions for you

1. Do you speak second (rebuttal + FF) or do you also give summary sometimes?
2. Which device do you flow on in rounds: laptop, iPad, or both?
3. Do you want your partner to have access to the same bank (pushes partner sync earlier)?
4. Is your circuit lay-heavy or tech-heavy? This decides how much the judge-mode features matter.
