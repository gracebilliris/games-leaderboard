# ⛳ Games Leaderboard

Interactive static leaderboard for our team's putt putt games (3 teams × 3 players).

**Live site:** _(will be set once GitHub Pages is enabled)_

## Features
- Team standings (lowest total wins)
- Sortable player leaderboard
- Hole-by-hole scorecard with heatmap colouring
- Cumulative strokes chart (Chart.js)
- Pure static site — no build step, no dependencies to install

## Updating results
Edit `data.json`:

```jsonc
{
  "event": "Putt Putt Championship",
  "date": "2026-07-17",
  "holes": 18,                         // number of holes played
  "teams": ["Team 1", "Team 2", "Team 3"],
  "players": [
    { "name": "Alice", "team": 0, "scores": [3,4,2, ...] },  // team is 0, 1, or 2
    ...
  ]
}
```

Scores are strokes per hole (lower = better). Totals, ranks, best/worst hole, colours, and the chart are all computed client-side.

## Local preview
```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy (GitHub Pages)
1. Push to GitHub.
2. Repo **Settings → Pages → Source: `main` branch, `/ (root)`**.
3. Site publishes at `https://<user>.github.io/games-leaderboard/`.
