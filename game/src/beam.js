// Beam tracing for PRISMKEEP. The dawn-beam travels in straight cardinal
// lines, turns 90 degrees on mirror shards, splits on prisms, stops on stone
// walls, and passes through lantern glass (lighting it) on its way. Tracing
// is pure geometry over the room's segments, so the web the player sees is
// exactly the web the moths fear.

import { DIRS, DIR_INDEX, DIR_NAME, REFLECT, FIELD, MIRROR_HALF } from './config.js';

const EPS = 0.001;

// Distance from point p to segment a-b, and the closest point on it.
export function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx, cy = ay + t * dy;
  return { dist: Math.hypot(px - cx, py - cy), cx, cy, t };
}

function mirrorSegment(m) {
  // tilt 0 is '/', tilt 1 is '\', drawn as a short diagonal shard.
  const d = m.tilt === 0 ? { x: 1, y: -1 } : { x: 1, y: 1 };
  const s = MIRROR_HALF / Math.SQRT2;
  return { ax: m.x - d.x * s, ay: m.y - d.y * s, bx: m.x + d.x * s, by: m.y + d.y * s };
}

// Cast one ray from (x, y) along dirIndex. Returns the nearest event:
// { kind: 'wall'|'mirror'|'prism'|'edge', dist, x, y, ref }.
function castRay(room, x, y, dirIndex, ignoreId) {
  const d = DIRS[dirIndex];
  let best = { kind: 'edge', dist: Infinity, x: 0, y: 0, ref: null };

  const consider = (dist, kind, ref) => {
    if (dist > EPS && dist < best.dist) {
      best = { kind, dist, x: x + d.x * dist, y: y + d.y * dist, ref };
    }
  };

  // Field border.
  if (d.x > 0) consider(FIELD.x + FIELD.w - x, 'edge', null);
  if (d.x < 0) consider(x - FIELD.x, 'edge', null);
  if (d.y > 0) consider(FIELD.y + FIELD.h - y, 'edge', null);
  if (d.y < 0) consider(y - FIELD.y, 'edge', null);

  // Interior wall blocks: axis-aligned rectangles, test the facing side.
  for (const w of room.walls) {
    if (d.x > 0 && x < w.x) {
      const yy = y; if (yy >= w.y && yy <= w.y + w.h) consider(w.x - x, 'wall', w);
    } else if (d.x < 0 && x > w.x + w.w) {
      const yy = y; if (yy >= w.y && yy <= w.y + w.h) consider(x - (w.x + w.w), 'wall', w);
    } else if (d.y > 0 && y < w.y) {
      const xx = x; if (xx >= w.x && xx <= w.x + w.w) consider(w.y - y, 'wall', w);
    } else if (d.y < 0 && y > w.y + w.h) {
      const xx = x; if (xx >= w.x && xx <= w.x + w.w) consider(y - (w.y + w.h), 'wall', w);
    }
  }

  // Mirror shards: a hit when the ray crosses the shard's small disc and the
  // shard's diagonal actually faces the incoming direction.
  for (const m of room.mirrors) {
    if (m.id === ignoreId) continue;
    const along = (m.x - x) * d.x + (m.y - y) * d.y;
    if (along <= EPS) continue;
    const perp = Math.abs((m.x - x) * d.y - (m.y - y) * d.x);
    if (perp <= MIRROR_HALF * 0.72) consider(along, 'mirror', m);
  }

  // Prisms: squat crystals that split the beam.
  for (const p of room.prisms) {
    if (p.id === ignoreId) continue;
    const along = (p.x - x) * d.x + (p.y - y) * d.y;
    if (along <= EPS) continue;
    const perp = Math.abs((p.x - x) * d.y - (p.y - y) * d.x);
    if (perp <= 15) consider(along, 'prism', p);
  }

  return best;
}

// Trace the whole web from the room's source. Returns segments
// [{x1,y1,x2,y2,depth}], the set of lit lantern ids, and hit points on the
// boss (if any) as { bossDist } per segment end for the caller to apply.
export function traceBeam(room) {
  const segments = [];
  const litLanterns = new Set();
  let bossTouches = 0;
  const queue = [{ x: room.source.x, y: room.source.y, dir: DIR_INDEX[room.source.dir], depth: 0, from: -1 }];
  const seen = new Set();
  let guard = 0;

  while (queue.length && guard++ < 220) {
    const ray = queue.shift();
    const key = `${Math.round(ray.x)},${Math.round(ray.y)},${ray.dir},${ray.from}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const hit = castRay(room, ray.x, ray.y, ray.dir, ray.from);
    const ex = hit.x, ey = hit.y;
    segments.push({ x1: ray.x, y1: ray.y, x2: ex, y2: ey, depth: ray.depth });

    // Lanterns along this leg light up (the beam passes through their glass).
    for (const l of room.lanterns) {
      const r = distToSegment(l.x, l.y, ray.x, ray.y, ex, ey);
      if (r.dist <= 20) litLanterns.add(l.id);
    }
    // The boss soaks any leg that passes through its body.
    if (room.boss && room.boss.alive) {
      const r = distToSegment(room.boss.x, room.boss.y, ray.x, ray.y, ex, ey);
      if (r.dist <= room.boss.r) bossTouches++;
    }

    if (hit.kind === 'mirror') {
      const nextName = REFLECT[hit.ref.tilt][DIR_NAME[ray.dir]];
      queue.push({ x: hit.x, y: hit.y, dir: DIR_INDEX[nextName], depth: ray.depth, from: hit.ref.id });
    } else if (hit.kind === 'prism') {
      // One leg flies straight on; the twin turns toward the prism's face.
      queue.push({ x: hit.x, y: hit.y, dir: ray.dir, depth: ray.depth + 1, from: hit.ref.id });
      const turn = (ray.dir + hit.ref.turn) % 4;
      queue.push({ x: hit.x, y: hit.y, dir: ((turn % 4) + 4) % 4, depth: ray.depth + 1, from: hit.ref.id });
    }
  }
  return { segments, litLanterns, bossTouches };
}

export { mirrorSegment };
