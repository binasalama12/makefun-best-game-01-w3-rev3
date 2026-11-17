[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/binasalama12/makefun-best-game-01-w3-rev3/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/binasalama12/makefun-best-game-01-w3-rev3/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

# PRISMKEEP

**Rotate mirror shards to bend one dawn-beam through a dark keep — light every lantern, burn the shadow moths, survive 12 nights across 4 realms, and burn the Nightmare Moth off the Sun Lantern on night 12.**

An action-puzzle game on a 2D canvas — no libraries, no build step, no network. Open
`game/index.html` from any static server and play.

## The game

A single beam of dawn enters the keep from a sun socket on the west wall. It flies in
straight lines until it meets a **mirror shard**: a `/` shard turns it one way, a `\`
shard the other. **Prism crystals** split it in two — one leg straight on, one leg
turned aside — so a single beam becomes a glowing web. Lanterns light when the beam
passes through their glass. **Shadow moths** drift in from the dark edges and hunt the
lanterns: they can only fly through darkness, steering around the light, and any moth
that touches the beam **burns**. A moth that reaches a lantern smothers it and feeds
the shadow meter. Light **every lantern at once** to clear the night before the dawn
budget runs out or the shadow fills the keep.

- **12 nights**, each a new beam-routing room, built solution-first and then scrambled — every room can always be solved.
- **4 realms**, each with its own palette: the **Dawn Court** (nights 1–3), the **Mirror Vault** (4–6), **Moth Hollow** (7–9) and the **Sunspire** (10–12).
- Rooms grow teeth as you climb: more bends, up to **2 prisms**, decoy shards, faster and more frequent moths.
- **Night 12: the Nightmare Moth** — a boss three times a moth's size that crawls for the Sun Lantern, soaks beam-light as damage, and shakes the web apart with wing-beats that scramble a shard. Burn it down, then light every lantern to break the dawn.
- Score: lanterns lit on a clear, moths burned, dawn seconds to spare, and 1,500 for the boss.

## Controls

- **Mouse / touch:** click a mirror shard to rotate it. Hovering shows the shard you will turn.
- **Q / E:** rotate the shard nearest the pointer.
- **Enter / Space / click:** start, advance, restart.
- **R:** restart the current night. **P:** pause.

## Screens

`screenshots/` holds four real renders of the game itself: the title over a lit
Mirror-Vault web, night 5 mid-play with moths in flight and the HUD live, the night-12
feature moment — the densest beam web, prisms split, the Nightmare Moth out — and the
dawn-breaks victory screen with the full run stats.

## Layout

- `game/index.html` — the page and HUD strip.
- `game/src/config.js` — the keep: realms, palettes, all 12 night definitions, scoring.
- `game/src/world.js` — room building (solution-first path walking, prisms, decoys, scramble) and moth spawning.
- `game/src/beam.js` — beam tracing: reflections, prism splits, lantern hits, geometry helpers.
- `game/src/render.js` — all canvas art and screens: glowing three-pass beam, lanterns, moths, the boss, title / clear / end.
- `game/src/main.js` — the game loop and state: nights, moths, the boss fight, win / lose.
- `game/src/hud.js`, `game/src/input.js`, `game/src/audio.js` — HUD strip, controls, WebAudio synth blips.
- `game/src/shots.js` — deterministic `?shot=` scenes used to render the screenshots.
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` out and writes the dossier.
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.

## Hand in

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
node serve.ts        # or any static server over game/, to play it
```

MIT licensed — see `LICENSE`.
