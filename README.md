# Ember Court — a card duel

An original card battler for make.fun's best card game bounty. You are the
Ember Warden, duelling the Ashen Warden across a felt table. Both duelists
hold 30 life; each turn grants ember (mana) that grows from 1 to 10. Play
cards from your hand — strikes, guards, mends and draws across four suits
(Ember, Tide, Leaf, Stone) — and win by bringing the Warden to 0 life.
Playing a second card of the same suit in one turn triggers Resonance (+2
power).

## Play

Serve `game/` with any static server and open `game/index.html` in a desktop
browser (no network request, no build step):

```sh
python3 -m http.server --directory game 8080
```

Mouse or keyboard: click a card (or keys 1–7) to play it, E or the END TURN
button to end your turn, P or Esc to pause, Space to start or play again.

## Screenshots

The four screenshots under `screenshots/` are real renders of the game's own
code, staged deterministically with `?shot=title|table|win|loss&seed=7`:

- `1-title.jpg` — title screen
- `2-table.jpg` — mid-duel table, both hands, life totals, ember
- `3-win.jpg` — victory screen
- `4-loss.jpg` — defeat screen

## Layout

- `game/index.html` — the page, one canvas
- `game/src/config.js` — tuning, suits, palette
- `game/src/random.js` — seeded random (mulberry32)
- `game/src/cards.js` — the 16 original cards and the 24-card deck
- `game/src/world.js` — rules: turns, ember, block, life, the Warden's AI
- `game/src/render.js` — canvas drawing: table, cards, suit glyphs, screens
- `game/src/input.js` — keyboard and pointer input
- `game/src/shots.js` — deterministic screenshot scenes via real play
- `game/src/main.js` — boot and the one loop
- `main.ts` — the hand-in program (copies `game/` + `screenshots/`, writes the dossier)
- `vendor/makefun-game.ts` — the kit's library, unchanged

## License

MIT — see `LICENSE`.
