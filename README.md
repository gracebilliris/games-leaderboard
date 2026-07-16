# ⛳ Games Leaderboard

Interactive static leaderboard for our team's putt putt games (3 teams × 3 players).

**Live site:** https://gracebilliris.github.io/games-leaderboard/

## Features
- Team standings (lowest total wins)
- Sortable player leaderboard
- Hole-by-hole scorecard with heatmap colouring
- Cumulative strokes chart (Chart.js)
- Optional photo gallery with lightbox
- Pure static site — no build step, no dependencies to install

## Updating results
Edit `data.json`:

```jsonc
{
  "event": "Putt Putt Championship",
  "date": "2026-07-16",
  "holes": 9,
  "teams": ["Group 1", "Group 2", "Group 3", "Group 4"],
  "players": [
    { "name": "Alice", "team": 0, "scores": [3,4,2, ...] },  // team is 0-based
    { "name": "Bob",   "team": 3, "scores": [], "dns": true } // did not start
  ]
}
```

Scores are strokes per hole (lower = better). Negatives are allowed (e.g. `-1` bonus). Totals, ranks, best/worst hole, colours, and the chart are all computed client-side. Players/teams marked `"dns": true` are shown but excluded from ranking.

## Adding photos
1. Drop image files (jpg/png/webp) into the `photos/` folder.
2. List them in `photos/manifest.json`:
   ```json
   [
     "team-photo.jpg",
     { "src": "winners.jpg", "caption": "Group 1 taking the trophy" }
   ]
   ```
3. Commit + push. The gallery section appears automatically.

## Local preview
```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy (GitHub Pages)
Already deployed. To update: `git commit -am "…" && git push` — Pages redeploys within ~30–60s.
