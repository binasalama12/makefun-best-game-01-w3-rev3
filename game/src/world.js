// Room building for PRISMKEEP. Each night's room is built solution-first:
// a true beam path is walked from the dawn source, mirror shards are laid on
// its bends with the tilt that makes the bend, lanterns are hung along its
// legs and along prism branches — and only then are the shards scrambled.
// Every room can therefore always be solved; the moths are the clock.

import { FIELD, DIRS, DIR_INDEX, DIR_NAME, REFLECT, NIGHTS, BOSS_HP } from './config.js';
import { makeRng, randRange, randInt, pick } from './rng.js';

let nextId = 1;
const nid = () => nextId++;

function tiltForTurn(inDirName, outDirName) {
  for (let t = 0; t < 2; t++) if (REFLECT[t][inDirName] === outDirName) return t;
  return -1;
}

function insideField(x, y, m) {
  return x >= FIELD.x + m && x <= FIELD.x + FIELD.w - m && y >= FIELD.y + m && y <= FIELD.y + FIELD.h - m;
}

function distPointToSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

export function realmIndexForNight(night) {
  if (night <= 3) return 0;
  if (night <= 6) return 1;
  if (night <= 9) return 2;
  return 3;
}

export function buildRoom(nightNumber, seed) {
  nextId = 1;
  const cfg = NIGHTS[nightNumber - 1];
  const rng = makeRng(seed * 7919 + nightNumber * 131);
  const room = {
    night: nightNumber, cfg,
    realm: realmIndexForNight(nightNumber),
    source: null, mirrors: [], prisms: [], lanterns: [], walls: [], decor: [],
    boss: null, solution: new Map(),
  };

  // --- Walk the true path -------------------------------------------------
  const startY = FIELD.y + randRange(rng, 130, FIELD.h - 130);
  room.source = { x: FIELD.x + 30, y: startY, dir: 'E' };
  let px = room.source.x, py = startY;
  let dir = 'E';
  const legs = []; // {x1,y1,x2,y2,dir}
  const bends = []; // {x,y,inDir,outDir}

  for (let turn = 0; turn < cfg.turns; turn++) {
    const d = DIRS[DIR_INDEX[dir]];
    const room1 = dir === 'E' ? (FIELD.x + FIELD.w - 90) - px
      : dir === 'W' ? px - (FIELD.x + 90)
      : dir === 'S' ? (FIELD.y + FIELD.h - 90) - py
      : py - (FIELD.y + 90);
    const travel = Math.min(room1, randRange(rng, 170, 330));
    const nx = px + d.x * travel, ny = py + d.y * travel;
    legs.push({ x1: px, y1: py, x2: nx, y2: ny, dir });

    // Choose the next heading: a real 90-degree bend that stays in the keep.
    const options = [];
    for (const cand of ['N', 'S', 'E', 'W']) {
      if (cand === dir) continue;
      if (tiltForTurn(dir, cand) < 0) continue;
      const cd = DIRS[DIR_INDEX[cand]];
      const ahead = 150;
      if (insideField(nx + cd.x * ahead, ny + cd.y * ahead, 60)) options.push(cand);
    }
    if (!options.length) { px = nx; py = ny; break; }
    const out = options.length > 1 && rng() < 0.4 ? pick(rng, options) : options[0];
    // Prefer vertical bends for a woven look.
    const vert = options.filter((o) => o === 'N' || o === 'S');
    const chosen = dir === 'E' && vert.length ? pick(rng, vert) : out;
    bends.push({ x: nx, y: ny, inDir: dir, outDir: chosen });
    dir = chosen; px = nx; py = ny;
  }
  // Final leg.
  {
    const d = DIRS[DIR_INDEX[dir]];
    const room1 = dir === 'E' ? (FIELD.x + FIELD.w - 70) - px
      : dir === 'W' ? px - (FIELD.x + 70)
      : dir === 'S' ? (FIELD.y + FIELD.h - 70) - py
      : py - (FIELD.y + 70);
    const travel = Math.max(120, Math.min(room1, randRange(rng, 200, 360)));
    legs.push({ x1: px, y1: py, x2: px + d.x * travel, y2: py + d.y * travel, dir });
  }

  // --- Mirrors on the bends ------------------------------------------------
  for (const b of bends) {
    const tilt = tiltForTurn(b.inDir, b.outDir);
    const m = { id: nid(), x: b.x, y: b.y, tilt, fixed: false, onPath: true };
    room.mirrors.push(m);
    room.solution.set(m.id, tilt);
  }

  // --- Prisms on chosen legs, branches carry extra lanterns ----------------
  const branchLegs = [];
  const prismLegIdx = new Set();
  for (let i = 0; i < cfg.prisms; i++) {
    const idx = randInt(rng, 0, legs.length - 1);
    if (prismLegIdx.has(idx)) continue;
    prismLegIdx.add(idx);
    const leg = legs[idx];
    const t = randRange(rng, 0.35, 0.6);
    const cx = leg.x1 + (leg.x2 - leg.x1) * t;
    const cy = leg.y1 + (leg.y2 - leg.y1) * t;
    const perpOptions = [1, -1].filter((s) => {
      const nd = (DIR_INDEX[leg.dir] + s + 4) % 4;
      const dd = DIRS[nd];
      return insideField(cx + dd.x * 170, cy + dd.y * 170, 50);
    });
    if (!perpOptions.length) continue;
    const turn = pick(rng, perpOptions);
    const prism = { id: nid(), x: cx, y: cy, turn };
    room.prisms.push(prism);
    const nd = (DIR_INDEX[leg.dir] + turn + 4) % 4;
    const dd = DIRS[nd];
    const bl = randRange(rng, 190, 300);
    branchLegs.push({ x1: cx, y1: cy, x2: cx + dd.x * bl, y2: cy + dd.y * bl, dir: DIR_NAME[nd], branch: true });
  }
  const allLegs = legs.concat(branchLegs);

  // --- Lanterns along the legs --------------------------------------------
  let lanternBudget = cfg.lanterns + cfg.prisms; // branches add their own glow
  const legOrder = allLegs.map((l, i) => i).sort(() => rng() - 0.5);
  for (const i of legOrder) {
    if (lanternBudget <= 0) break;
    const leg = allLegs[i];
    const t = randRange(rng, 0.3, 0.75);
    const lx = leg.x1 + (leg.x2 - leg.x1) * t;
    const ly = leg.y1 + (leg.y2 - leg.y1) * t;
    if (room.lanterns.some((l) => Math.hypot(l.x - lx, l.y - ly) < 90)) continue;
    room.lanterns.push({ id: nid(), x: lx, y: ly, lit: false, smother: 0, flare: 0 });
    lanternBudget--;
  }
  // The last leg always ends in a lantern: the room's promise.
  const last = legs[legs.length - 1];
  room.lanterns.push({ id: nid(), x: last.x2, y: last.y2, lit: false, smother: 0, flare: 0, grand: !!cfg.boss });

  // --- Stone wall blocks that never cross the true web ---------------------
  const wallTries = 26;
  for (let i = 0; i < wallTries && room.walls.length < 7; i++) {
    const w = randRange(rng, 54, 120), h = randRange(rng, 40, 90);
    const x = randRange(rng, FIELD.x + 60, FIELD.x + FIELD.w - 60 - w);
    const y = randRange(rng, FIELD.y + 50, FIELD.y + FIELD.h - 50 - h);
    const cx = x + w / 2, cy = y + h / 2;
    const clearOf = (pts) => pts.every(([ax, ay, bx, by]) => distPointToSeg(cx, cy, ax, ay, bx, by) > 95);
    const segs = allLegs.map((l) => [l.x1, l.y1, l.x2, l.y2]);
    if (!clearOf(segs)) continue;
    if (room.lanterns.some((l) => Math.hypot(l.x - cx, l.y - cy) < 100)) continue;
    const overlaps = room.walls.some((o) => x < o.x + o.w + 16 && x + w + 16 > o.x && y < o.y + o.h + 16 && y + h + 16 > o.y);
    if (overlaps) continue;
    room.walls.push({ x, y, w, h });
  }

  // --- Decoy shards ---------------------------------------------------------
  for (let i = 0; i < cfg.decoys; i++) {
    for (let tries = 0; tries < 30; tries++) {
      const x = randRange(rng, FIELD.x + 90, FIELD.x + FIELD.w - 90);
      const y = randRange(rng, FIELD.y + 80, FIELD.y + FIELD.h - 80);
      const far = allLegs.every((l) => distPointToSeg(x, y, l.x1, l.y1, l.x2, l.y2) > 56)
        && room.mirrors.every((m) => Math.hypot(m.x - x, m.y - y) > 80)
        && room.lanterns.every((l) => Math.hypot(l.x - x, l.y - y) > 70);
      if (!far) continue;
      room.mirrors.push({ id: nid(), x, y, tilt: randInt(rng, 0, 1), fixed: false, onPath: false });
      break;
    }
  }

  // --- Scramble the true shards (at least one wrong from night 1) ----------
  let wrong = 0;
  for (const m of room.mirrors) {
    if (!m.onPath) continue;
    if (rng() < 0.62) { m.tilt = 1 - m.tilt; wrong++; }
  }
  if (wrong === 0 && room.mirrors.some((m) => m.onPath)) {
    const first = room.mirrors.find((m) => m.onPath);
    first.tilt = 1 - first.tilt;
  }

  // --- Decor: dust motes and floor runes, fixed for the room ---------------
  for (let i = 0; i < 46; i++) {
    room.decor.push({
      x: randRange(rng, FIELD.x + 10, FIELD.x + FIELD.w - 10),
      y: randRange(rng, FIELD.y + 10, FIELD.y + FIELD.h - 10),
      r: randRange(rng, 1, 2.6), ph: randRange(rng, 0, Math.PI * 2),
    });
  }

  // --- The boss of night 12 --------------------------------------------------
  if (cfg.boss) {
    room.boss = {
      x: FIELD.x + FIELD.w - 130, y: FIELD.y + 120, r: 46,
      hp: BOSS_HP, maxHp: BOSS_HP, alive: true, flap: 0, scrambleTimer: 6,
      vx: 0, vy: 0,
    };
  }
  return room;
}

export function solveRoom(room) {
  for (const m of room.mirrors) {
    if (room.solution.has(m.id)) m.tilt = room.solution.get(m.id);
  }
}

// --- Moths -------------------------------------------------------------------
export function spawnMoth(room, rng, moths) {
  const side = randInt(rng, 0, 2); // 0 top, 1 right, 2 bottom — the dark edges
  let x, y;
  if (side === 0) { x = randRange(rng, FIELD.x + 60, FIELD.x + FIELD.w - 60); y = FIELD.y + 8; }
  else if (side === 1) { x = FIELD.x + FIELD.w - 8; y = randRange(rng, FIELD.y + 60, FIELD.y + FIELD.h - 60); }
  else { x = randRange(rng, FIELD.x + 60, FIELD.x + FIELD.w - 60); y = FIELD.y + FIELD.h - 8; }
  moths.push({
    x, y, vx: 0, vy: 0, phase: randRange(rng, 0, Math.PI * 2),
    targetId: null, stuck: 0,
  });
}

export function nearestLantern(room, x, y) {
  let best = null, bd = Infinity;
  for (const l of room.lanterns) {
    const d = Math.hypot(l.x - x, l.y - y);
    if (d < bd) { bd = d; best = l; }
  }
  return best;
}
