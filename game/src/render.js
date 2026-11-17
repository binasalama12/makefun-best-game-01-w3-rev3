// Canvas rendering for PRISMKEEP: stone floors per realm, a dawn-beam drawn
// in three glowing passes with travelling sparks, glass lanterns that flare
// when lit, animated shadow moths, and the title / clear / end screens. All
// art is drawn in code — no image files anywhere.

import { VIEW_W, VIEW_H, FIELD, REALMS, LANTERN_RADIUS, BOSS_NAME } from './config.js';
import { mirrorSegment } from './beam.js';

// --- Particles ---------------------------------------------------------------
const particles = [];
export function burst(x, y, color, n = 14, speed = 130) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = (0.25 + Math.random() * 0.75) * speed;
    particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 24, life: 0.7 + Math.random() * 0.5, age: 0, color, r: 1.6 + Math.random() * 2.4 });
  }
}
export function clearParticles() {
  particles.length = 0;
}
export function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.age += dt;
    if (p.age >= p.life) { particles.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 60 * dt;
  }
}
function drawParticles(ctx) {
  for (const p of particles) {
    const k = 1 - p.age / p.life;
    ctx.globalAlpha = k * 0.9;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r * k + 0.4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// --- Deterministic detail hash: screenshot renders must stay reproducible --
function hash2(a, b) {
  let h = Math.imul((a | 0) + 101, 374761393) ^ Math.imul((b | 0) + 57, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) * f));
  const g = Math.min(255, Math.round(((n >> 8) & 255) * f));
  const b = Math.min(255, Math.round((n & 255) * f));
  return `rgb(${r},${g},${b})`;
}

// --- Room ---------------------------------------------------------------------
// Silhouettes in the margins around the floor: each realm keeps its own
// skyline, so the frame reads deep instead of empty dark void.
function drawBackdrop(ctx, room, pal) {
  const dark = shade(pal.wall, 0.55);
  const mid = shade(pal.wall, 0.9);
  const seedBase = room.realm * 77;
  ctx.fillStyle = dark;
  // Corner pillars run the full height of the frame.
  for (const px of [8, VIEW_W - 24]) {
    ctx.fillRect(px, 30, 16, VIEW_H - 60);
    ctx.fillStyle = mid;
    ctx.fillRect(px - 3, 22, 22, 12);
    ctx.fillRect(px - 3, VIEW_H - 34, 22, 12);
    ctx.fillStyle = dark;
  }
  if (room.realm === 0) {
    // Dawn Court: a row of small suns along the top margin.
    for (let i = 0; i < 9; i++) {
      const x = 90 + i * 138 + hash2(i, seedBase) * 30;
      const r = 9 + hash2(i, seedBase + 1) * 7;
      ctx.fillStyle = dark;
      ctx.beginPath(); ctx.arc(x, 26, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = mid; ctx.lineWidth = 2;
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + 0.3;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * (r + 3), 26 + Math.sin(a) * (r + 3));
        ctx.lineTo(x + Math.cos(a) * (r + 8), 26 + Math.sin(a) * (r + 8));
        ctx.stroke();
      }
    }
  } else if (room.realm === 1) {
    // Mirror Vault: crystal spires above and below the floor.
    ctx.fillStyle = dark;
    for (let i = 0; i < 12; i++) {
      const x = 60 + i * 104 + hash2(i, seedBase) * 26;
      const h = 26 + hash2(i, seedBase + 2) * 30;
      ctx.beginPath(); ctx.moveTo(x - 13, 60); ctx.lineTo(x, 60 - h); ctx.lineTo(x + 13, 60); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - 10, VIEW_H - 60); ctx.lineTo(x, VIEW_H - 60 + h * 0.7); ctx.lineTo(x + 10, VIEW_H - 60); ctx.closePath(); ctx.fill();
    }
  } else if (room.realm === 2) {
    // Moth Hollow: vines hang into the frame, tipped with glow-spores.
    for (let i = 0; i < 11; i++) {
      const x = 70 + i * 112 + hash2(i, seedBase) * 24;
      const len = 20 + hash2(i, seedBase + 3) * 22;
      ctx.strokeStyle = dark; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x, 0);
      ctx.quadraticCurveTo(x + 8, len * 0.6, x - 3, len); ctx.stroke();
      ctx.fillStyle = mid;
      ctx.beginPath(); ctx.arc(x - 3, len, 3.4, 0, Math.PI * 2); ctx.fill();
    }
  } else {
    // Sunspire: flame silhouettes lick up from the bottom margin.
    ctx.fillStyle = dark;
    for (let i = 0; i < 10; i++) {
      const x = 80 + i * 124 + hash2(i, seedBase) * 26;
      const h = 14 + hash2(i, seedBase + 4) * 16;
      ctx.beginPath(); ctx.moveTo(x - 11, VIEW_H); ctx.quadraticCurveTo(x - 12, VIEW_H - h, x, VIEW_H - h - 10);
      ctx.quadraticCurveTo(x + 12, VIEW_H - h, x + 11, VIEW_H); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - 9, 0); ctx.quadraticCurveTo(x, h * 0.7, x + 9, 0); ctx.closePath(); ctx.fill();
    }
  }
}

// Per-tile texture: speckle, a realm motif, the odd crack — no flat tile and
// no large flat region survives this pass.
function drawTileDetail(ctx, realm, x, y, w, h, col, row, pal) {
  const cx = x + w / 2, cy = y + h / 2;
  for (let i = 0; i < 4; i++) {
    const sx = x + 8 + hash2(col * 13 + i, row * 17) * (w - 16);
    const sy = y + 8 + hash2(col * 19, row * 23 + i) * (h - 16);
    ctx.globalAlpha = 0.10 + hash2(col + i * 7, row) * 0.12;
    ctx.fillStyle = hash2(col, row + i) > 0.5 ? '#ffffff' : '#000000';
    ctx.beginPath(); ctx.arc(sx, sy, 1 + hash2(col * 3, row * 3 + i) * 1.6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  const roll = hash2(col * 29, row * 31);
  if (realm === 0) {
    if (roll > 0.62) {
      // Chiselled sun-diamond.
      ctx.strokeStyle = pal.accent; ctx.globalAlpha = 0.16; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(cx, cy - 9); ctx.lineTo(cx + 7, cy); ctx.lineTo(cx, cy + 9); ctx.lineTo(cx - 7, cy); ctx.closePath(); ctx.stroke();
    } else if (roll > 0.3) {
      ctx.fillStyle = pal.accent; ctx.globalAlpha = 0.3;
      ctx.beginPath(); ctx.arc(x + 14 + roll * 20, y + 16, 1.8, 0, Math.PI * 2); ctx.arc(x + w - 15, y + h - 14, 1.4, 0, Math.PI * 2); ctx.fill();
    }
  } else if (realm === 1) {
    if (roll > 0.55) {
      // Glass shard glint.
      ctx.strokeStyle = '#bcd8ff'; ctx.globalAlpha = 0.28; ctx.lineWidth = 1.6;
      const gx = x + 12 + roll * 24, gy = y + 12 + roll * 18;
      ctx.beginPath(); ctx.moveTo(gx - 8, gy + 5); ctx.lineTo(gx + 3, gy - 7); ctx.lineTo(gx + 9, gy + 4); ctx.stroke();
      ctx.fillStyle = '#eaf6ff'; ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.arc(gx + 3, gy - 7, 1.5, 0, Math.PI * 2); ctx.fill();
    }
  } else if (realm === 2) {
    // Moss creeps in from a corner, with spore flecks.
    const mx = roll > 0.5 ? x + w - 8 : x + 8;
    const my = roll > 0.25 ? y + h - 8 : y + 8;
    for (let i = 0; i < 3; i++) {
      const bx = mx + (hash2(col + i, row * 7) - 0.5) * 22;
      const by = my + (hash2(col * 7, row + i) - 0.5) * 22;
      const g = ctx.createRadialGradient(bx, by, 1, bx, by, 10 + i * 4);
      g.addColorStop(0, 'rgba(90,180,90,0.20)'); g.addColorStop(1, 'rgba(90,180,90,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(bx, by, 10 + i * 4, 0, Math.PI * 2); ctx.fill();
    }
    if (roll > 0.66) {
      ctx.fillStyle = '#cfe89a'; ctx.globalAlpha = 0.35;
      ctx.beginPath(); ctx.arc(cx + 6, cy - 4, 1.6, 0, Math.PI * 2); ctx.arc(cx - 8, cy + 7, 1.3, 0, Math.PI * 2); ctx.fill();
    }
  } else {
    if (roll > 0.5) {
      // Ember crack with a hot tip.
      ctx.strokeStyle = '#ff8a3d'; ctx.globalAlpha = 0.34; ctx.lineWidth = 1.5;
      let px = x + 10 + roll * 16, py = y + h - 10;
      ctx.beginPath(); ctx.moveTo(px, py);
      for (let k = 0; k < 3; k++) { px += 7 + hash2(col + k, row) * 8; py -= 8 + hash2(col, row + k) * 7; ctx.lineTo(px, py); }
      ctx.stroke();
      ctx.fillStyle = '#ffc44d'; ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.arc(px, py, 1.6, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  if (hash2(col * 41, row * 43) > 0.8) {
    // A plain stone crack, any realm.
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1.2;
    let px = x + 8, py = y + 10 + hash2(col, row) * 30;
    ctx.beginPath(); ctx.moveTo(px, py);
    for (let k = 0; k < 3; k++) { px += 12 + hash2(col + k * 3, row) * 10; py += (hash2(col, row + k * 3) - 0.5) * 16; ctx.lineTo(px, py); }
    ctx.stroke();
  }
}

function drawFloor(ctx, room, t) {
  const pal = REALMS[room.realm];
  const bg = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  bg.addColorStop(0, shade(pal.floor, 0.6));
  bg.addColorStop(0.5, shade(pal.floor, 0.9));
  bg.addColorStop(1, shade(pal.floor, 0.55));
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  drawBackdrop(ctx, room, pal);
  const tile = 62;
  for (let y = FIELD.y, row = 0; y < FIELD.y + FIELD.h; y += tile, row++) {
    for (let x = FIELD.x, col = 0; x < FIELD.x + FIELD.w; x += tile, col++) {
      const w = Math.min(tile, FIELD.x + FIELD.w - x), h = Math.min(tile, FIELD.y + FIELD.h - y);
      const base = (row + col) % 2 === 0 ? pal.floorAlt : pal.floor;
      ctx.fillStyle = shade(base, 0.86 + hash2(col * 3 + room.realm * 31, row * 5) * 0.3);
      ctx.fillRect(x, y, w, h);
      drawTileDetail(ctx, room.realm, x, y, w, h, col, row, pal);
    }
  }
  // Grout lines between the stones.
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = FIELD.x + tile; x < FIELD.x + FIELD.w; x += tile) { ctx.moveTo(x, FIELD.y); ctx.lineTo(x, FIELD.y + FIELD.h); }
  for (let y = FIELD.y + tile; y < FIELD.y + FIELD.h; y += tile) { ctx.moveTo(FIELD.x, y); ctx.lineTo(FIELD.x + FIELD.w, y); }
  ctx.stroke();
  // A breath of realm light at the heart of the room.
  const amb = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, 60, VIEW_W / 2, VIEW_H / 2, 620);
  amb.addColorStop(0, pal.accent + '14'); amb.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = amb;
  ctx.fillRect(FIELD.x, FIELD.y, FIELD.w, FIELD.h);
  // Dust motes drifting in the gloom.
  ctx.fillStyle = pal.accent;
  for (const d of room.decor) {
    const yy = d.y + Math.sin(t * 0.6 + d.ph) * 5;
    ctx.globalAlpha = 0.16 + 0.1 * Math.sin(t * 1.3 + d.ph * 2);
    ctx.beginPath(); ctx.arc(d.x, yy, d.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Fireflies: a second, brighter ambient layer with halos, drifting slowly.
  for (let i = 0; i < 26; i++) {
    const fx = FIELD.x + 16 + hash2(i * 3, room.realm * 91 + 5) * (FIELD.w - 32);
    const fy = FIELD.y + 16 + hash2(i * 5, room.realm * 91 + 9) * (FIELD.h - 32);
    const bob = Math.sin(t * 0.9 + i * 1.93) * 7;
    const tw = 0.35 + 0.3 * Math.sin(t * 2.1 + i * 2.7);
    const g = ctx.createRadialGradient(fx, fy + bob, 0.5, fx, fy + bob, 9);
    g.addColorStop(0, pal.accent); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = Math.max(0.08, tw * 0.5);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(fx, fy + bob, 9, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = Math.max(0.2, tw);
    ctx.fillStyle = '#fffbe8';
    ctx.beginPath(); ctx.arc(fx, fy + bob, 1.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Keep wall and rim, with a thin accent inlay just inside the floor.
  ctx.strokeStyle = pal.wallEdge; ctx.lineWidth = 3;
  ctx.strokeRect(FIELD.x - 3, FIELD.y - 3, FIELD.w + 6, FIELD.h + 6);
  ctx.strokeStyle = pal.wall; ctx.lineWidth = 10;
  ctx.strokeRect(FIELD.x - 10, FIELD.y - 10, FIELD.w + 20, FIELD.h + 20);
  ctx.strokeStyle = pal.accent; ctx.globalAlpha = 0.3; ctx.lineWidth = 1;
  ctx.strokeRect(FIELD.x + 5, FIELD.y + 5, FIELD.w - 10, FIELD.h - 10);
  ctx.globalAlpha = 1;
}

function drawWalls(ctx, room) {
  const pal = REALMS[room.realm];
  room.walls.forEach((w, i) => {
    const seed = Math.round(w.x) * 3 + Math.round(w.y) + i * 131;
    // Drop shadow, then a shaded stone body — the footprint never changes,
    // only the dressing: each realm grows its own props on the block.
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.fillRect(w.x + 5, w.y + 7, w.w, w.h);
    const g = ctx.createLinearGradient(w.x, w.y, w.x, w.y + w.h);
    g.addColorStop(0, shade(pal.wall, 1.3)); g.addColorStop(0.55, pal.wall); g.addColorStop(1, shade(pal.wall, 0.62));
    ctx.fillStyle = g;
    ctx.fillRect(w.x, w.y, w.w, w.h);
    if (room.realm === 0) {
      // Dawn Court: a fluted pillar with cap, base and a gold trim line.
      ctx.fillStyle = shade(pal.wall, 1.45);
      ctx.fillRect(w.x - 3, w.y - 5, w.w + 6, 9);
      ctx.fillRect(w.x - 3, w.y + w.h - 4, w.w + 6, 9);
      ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 2;
      for (let fx = w.x + 12; fx < w.x + w.w - 6; fx += 14) {
        ctx.beginPath(); ctx.moveTo(fx, w.y + 7); ctx.lineTo(fx, w.y + w.h - 7); ctx.stroke();
      }
      ctx.strokeStyle = pal.accent; ctx.globalAlpha = 0.55; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(w.x - 3, w.y - 1); ctx.lineTo(w.x + w.w + 3, w.y - 1); ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (room.realm === 1) {
      // Mirror Vault: a crystal cluster sprouts from the block.
      for (let k = 0; k < 3; k++) {
        const bx = w.x + (k + 0.5) * (w.w / 3);
        const hh = 16 + hash2(seed, k * 7) * Math.min(30, w.h);
        const hw = 7 + hash2(seed + k, 3) * 6;
        const cg = ctx.createLinearGradient(bx, w.y - hh, bx, w.y + 6);
        cg.addColorStop(0, '#eaf6ff'); cg.addColorStop(0.6, '#8fc3ee'); cg.addColorStop(1, '#3d6ea8');
        ctx.fillStyle = cg;
        ctx.beginPath(); ctx.moveTo(bx - hw, w.y + 4); ctx.lineTo(bx, w.y - hh); ctx.lineTo(bx + hw, w.y + 4); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.65)'; ctx.lineWidth = 1.2; ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      ctx.fillRect(w.x, w.y, w.w, 5);
    } else if (room.realm === 2) {
      // Moth Hollow: thorn bramble crawls over the block.
      ctx.strokeStyle = '#0d2012'; ctx.lineWidth = 3.4;
      for (let k = 0; k < 3; k++) {
        const sx = w.x + 6 + hash2(seed, k * 11) * (w.w - 12);
        ctx.beginPath(); ctx.moveTo(sx, w.y + w.h + 2);
        ctx.quadraticCurveTo(sx + (hash2(seed + k, 5) - 0.5) * 26, w.y + w.h * 0.5, sx + (hash2(seed, k + 40) - 0.5) * 20, w.y - 4);
        ctx.stroke();
        ctx.fillStyle = '#cfe89a';
        for (let th = 0; th < 3; th++) {
          const tx = sx + (hash2(seed + th * 3, k) - 0.5) * 16;
          const ty = w.y + w.h - th * (w.h / 3) - 6;
          ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx + 6, ty + 2); ctx.lineTo(tx + 1, ty + 6); ctx.closePath(); ctx.fill();
        }
      }
      ctx.fillStyle = 'rgba(120,220,120,0.20)';
      ctx.beginPath(); ctx.arc(w.x + 10, w.y + 8, 6, 0, Math.PI * 2); ctx.arc(w.x + w.w - 12, w.y + w.h - 9, 7, 0, Math.PI * 2); ctx.fill();
    } else {
      // Sunspire: rubble blocks split by glowing ember seams.
      ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 2;
      const splitX = w.x + w.w * (0.35 + hash2(seed, 1) * 0.3);
      ctx.beginPath(); ctx.moveTo(splitX, w.y + 3); ctx.lineTo(splitX + (hash2(seed, 2) - 0.5) * 10, w.y + w.h - 3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w.x + 3, w.y + w.h * 0.55); ctx.lineTo(w.x + w.w - 3, w.y + w.h * (0.4 + hash2(seed, 3) * 0.2)); ctx.stroke();
      ctx.strokeStyle = '#ff8a3d'; ctx.globalAlpha = 0.5; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(splitX, w.y + 6); ctx.lineTo(splitX + 3, w.y + w.h * 0.5); ctx.lineTo(splitX - 2, w.y + w.h - 6); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      ctx.fillRect(w.x, w.y, w.w, 5);
    }
    ctx.strokeStyle = pal.wallEdge; ctx.lineWidth = 2;
    ctx.strokeRect(w.x + 1, w.y + 1, w.w - 2, w.h - 2);
  });
}

function drawSource(ctx, room, t) {
  const pal = REALMS[room.realm];
  const { x, y } = room.source;
  const pulse = 1 + Math.sin(t * 3) * 0.08;
  const g = ctx.createRadialGradient(x, y, 2, x, y, 64 * pulse);
  g.addColorStop(0, 'rgba(255,246,216,0.95)');
  g.addColorStop(0.35, pal.beamGlow + '55');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, 64 * pulse, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3a3160';
  ctx.beginPath(); ctx.arc(x, y, 19, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = pal.accent; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(x, y, 19, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#fff6d8';
  ctx.beginPath(); ctx.arc(x, y, 9 + Math.sin(t * 5) * 1.5, 0, Math.PI * 2); ctx.fill();
  // Slow rays turning around the socket.
  ctx.strokeStyle = pal.accent; ctx.globalAlpha = 0.5; ctx.lineWidth = 2.4;
  for (let k = 0; k < 8; k++) {
    const a = t * 0.35 + (k / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * 24, y + Math.sin(a) * 24);
    ctx.lineTo(x + Math.cos(a) * 31, y + Math.sin(a) * 31);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = pal.text;
  ctx.font = '11px Georgia'; ctx.textAlign = 'center';
  ctx.fillText('DAWN', x, y + 34);
}

function drawMirrors(ctx, room, hoverId, t) {
  const pal = REALMS[room.realm];
  for (const m of room.mirrors) {
    const seg = mirrorSegment(m);
    if (m.id === hoverId) {
      ctx.strokeStyle = pal.accent; ctx.globalAlpha = 0.5 + 0.25 * Math.sin(t * 6);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(m.x, m.y, 27, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // Stone socket.
    ctx.fillStyle = '#241d47';
    ctx.beginPath(); ctx.arc(m.x, m.y, 15, 0, Math.PI * 2); ctx.fill();
    // The shard itself: a bright diagonal sliver with a glass gradient.
    const grad = ctx.createLinearGradient(seg.ax, seg.ay, seg.bx, seg.by);
    grad.addColorStop(0, '#cfe9ff'); grad.addColorStop(0.5, '#ffffff'); grad.addColorStop(1, '#8fb8e8');
    ctx.strokeStyle = grad; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(seg.ax, seg.ay); ctx.lineTo(seg.bx, seg.by); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(seg.ax, seg.ay); ctx.lineTo(seg.bx, seg.by); ctx.stroke();
    ctx.lineCap = 'butt';
  }
}

function drawPrisms(ctx, room, t) {
  for (const p of room.prisms) {
    const wob = Math.sin(t * 2.4 + p.id) * 2;
    ctx.save();
    ctx.translate(p.x, p.y + wob);
    const grad = ctx.createLinearGradient(0, -18, 0, 18);
    grad.addColorStop(0, '#ffe9ff'); grad.addColorStop(0.5, '#b48cff'); grad.addColorStop(1, '#5a3fd0');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, -19); ctx.lineTo(16, 13); ctx.lineTo(-16, 13); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.arc(0, 1, 3.2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

function drawLanterns(ctx, room, litSet, t) {
  const pal = REALMS[room.realm];
  for (const l of room.lanterns) {
    const lit = litSet.has(l.id) && l.smother <= 0;
    const R0 = LANTERN_RADIUS;
    if (lit) {
      const fl = 1 + Math.sin(t * 7 + l.id * 1.7) * 0.07 + l.flare * 0.6;
      // Warm pool spilled across the floor stones.
      const pool = (l.grand ? 150 : 96) * fl;
      ctx.save();
      ctx.translate(l.x, l.y + R0 + 12); ctx.scale(1, 0.42);
      const pg = ctx.createRadialGradient(0, 0, 2, 0, 0, pool);
      pg.addColorStop(0, 'rgba(255,214,120,0.30)'); pg.addColorStop(1, 'rgba(255,214,120,0)');
      ctx.fillStyle = pg;
      ctx.beginPath(); ctx.arc(0, 0, pool, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      // Halo in the air.
      const R = (l.grand ? 128 : 80) * fl;
      const g = ctx.createRadialGradient(l.x, l.y, 2, l.x, l.y, R);
      g.addColorStop(0, 'rgba(255,240,190,0.85)');
      g.addColorStop(0.4, pal.beamGlow + '44');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(l.x, l.y, R, 0, Math.PI * 2); ctx.fill();
    }
    // Post and base plate.
    ctx.strokeStyle = '#17122e'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(l.x, l.y + R0 + 13); ctx.lineTo(l.x, l.y + 5); ctx.stroke();
    ctx.fillStyle = '#241d47';
    ctx.beginPath(); ctx.ellipse(l.x, l.y + R0 + 14, 11, 3.6, 0, 0, Math.PI * 2); ctx.fill();
    // Hanging ring and peaked cap.
    ctx.strokeStyle = l.grand ? '#ffd24d' : '#3a3160'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.arc(l.x, l.y - R0 - 8, 5, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = l.grand ? '#ffd24d' : '#2c2560';
    ctx.beginPath();
    ctx.moveTo(l.x - R0 - 4, l.y - R0 + 2); ctx.lineTo(l.x, l.y - R0 - 6); ctx.lineTo(l.x + R0 + 4, l.y - R0 + 2);
    ctx.closePath(); ctx.fill();
    // Glass, drawn a touch larger than the gameplay radius, warm when lit.
    const gg = ctx.createRadialGradient(l.x - 5, l.y - 6, 2, l.x, l.y, R0 + 3);
    if (lit) { gg.addColorStop(0, '#fffbe8'); gg.addColorStop(0.55, '#ffe9a8'); gg.addColorStop(1, '#f5b942'); }
    else if (l.smother > 0) { gg.addColorStop(0, '#5a5470'); gg.addColorStop(1, '#33304a'); }
    else { gg.addColorStop(0, '#46538a'); gg.addColorStop(1, '#232c4e'); }
    ctx.beginPath(); ctx.arc(l.x, l.y, R0 + 2, 0, Math.PI * 2);
    ctx.fillStyle = gg; ctx.fill();
    // Cage: rim plus three vertical bars.
    ctx.strokeStyle = l.grand ? '#ffd24d' : '#0e0b20'; ctx.lineWidth = l.grand ? 3.2 : 2.2;
    ctx.beginPath(); ctx.arc(l.x, l.y, R0 + 2, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    for (const bx of [-0.62, 0, 0.62]) {
      const dx = bx * (R0 + 2);
      const dy = Math.sqrt(Math.max(0, (R0 + 2) * (R0 + 2) - dx * dx));
      ctx.moveTo(l.x + dx, l.y - dy); ctx.lineTo(l.x + dx, l.y + dy);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    if (lit) {
      // Flame teardrop with a hot heart, flickering.
      const fh = 11 + Math.sin(t * 9 + l.id * 2.3) * 1.6;
      ctx.fillStyle = '#fff6d8';
      ctx.beginPath(); ctx.moveTo(l.x, l.y - fh);
      ctx.quadraticCurveTo(l.x + 5.4, l.y + 2, l.x, l.y + 7);
      ctx.quadraticCurveTo(l.x - 5.4, l.y + 2, l.x, l.y - fh);
      ctx.fill();
      ctx.fillStyle = '#ffb347';
      ctx.beginPath(); ctx.arc(l.x, l.y + 3.4, 3, 0, Math.PI * 2); ctx.fill();
    } else if (l.smother > 0) {
      // A moth's shadow clings to the smothered glass.
      ctx.fillStyle = 'rgba(16,8,28,0.72)';
      ctx.beginPath(); ctx.ellipse(l.x - 4, l.y - 3, 8.5, 5.4, -0.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(l.x + 5, l.y + 4, 6.8, 4.4, 0.6, 0, Math.PI * 2); ctx.fill();
    } else {
      // Cold sheen on unlit glass.
      ctx.strokeStyle = 'rgba(220,238,255,0.5)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(l.x, l.y, R0 - 4, Math.PI * 1.05, Math.PI * 1.5); ctx.stroke();
    }
    if (l.grand) {
      ctx.fillStyle = '#ffd24d'; ctx.font = 'bold 11px Georgia'; ctx.textAlign = 'center';
      ctx.fillText('SUN LANTERN', l.x, l.y - LANTERN_RADIUS - 12);
    }
  }
}

export function drawBeam(ctx, room, segments, t) {
  const pal = REALMS[room.realm];
  ctx.lineCap = 'round';
  const passes = [
    { w: 26, a: 0.05, c: pal.beamGlow },
    { w: 15, a: 0.10, c: pal.beamGlow },
    { w: 7, a: 0.30, c: pal.beamGlow },
    { w: 2.6, a: 0.95, c: pal.beamCore },
  ];
  for (const pass of passes) {
    ctx.strokeStyle = pass.c; ctx.globalAlpha = pass.a; ctx.lineWidth = pass.w;
    ctx.beginPath();
    for (const s of segments) { ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // Joint flares where the beam bends on a shard, splits on a prism or dies
  // on stone — every vertex of the web gets a hot heart.
  for (const s of segments) {
    const g = ctx.createRadialGradient(s.x2, s.y2, 0.5, s.x2, s.y2, 13);
    g.addColorStop(0, 'rgba(255,250,230,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(s.x2, s.y2, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = pal.beamCore; ctx.globalAlpha = 0.9;
    ctx.beginPath(); ctx.arc(s.x2, s.y2, 2.6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Sparks racing along the web: a dense primary stream plus a fine spray
  // scattered to either side of the core.
  for (const s of segments) {
    const len = Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
    if (len < 24) continue;
    const n = Math.floor(len / 62);
    const px = -(s.y2 - s.y1) / len, py = (s.x2 - s.x1) / len;
    for (let i = 0; i <= n; i++) {
      const k = ((t * 0.55 + i / (n + 1) + s.depth * 0.13) % 1);
      const x = s.x1 + (s.x2 - s.x1) * k, y = s.y1 + (s.y2 - s.y1) * k;
      ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.8;
      ctx.beginPath(); ctx.arc(x, y, 2.3, 0, Math.PI * 2); ctx.fill();
      const off = (hash2(Math.round(x), Math.round(y)) - 0.5) * 9;
      ctx.globalAlpha = 0.45;
      ctx.beginPath(); ctx.arc(x + px * off, y + py * off, 1.2, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.globalAlpha = 1; ctx.lineCap = 'butt';
}

function drawMoth(ctx, m, pal, t, scale = 1) {
  const flap = Math.sin(t * 26 + m.phase) * 0.55;
  const ang = Math.atan2(m.vy || 0.01, m.vx || 0.01);
  ctx.save();
  ctx.translate(m.x, m.y);
  // A halo of its own gloom, so the moth reads against the dark floor.
  const hg = ctx.createRadialGradient(0, 0, 2, 0, 0, 30 * scale);
  hg.addColorStop(0, pal.moth + '3d'); hg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = hg;
  ctx.beginPath(); ctx.arc(0, 0, 30 * scale, 0, Math.PI * 2); ctx.fill();
  ctx.rotate(ang + Math.PI / 2);
  ctx.scale(scale * 1.35, scale * 1.35);
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.rotate(s * (0.5 + flap * 0.5));
    // Outer wing with a pale inner panel and a dark eye-spot.
    ctx.fillStyle = pal.moth; ctx.globalAlpha = 0.9;
    ctx.beginPath(); ctx.ellipse(s * 11, -3, 12.5, 6, s * 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e6dcff'; ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.ellipse(s * 12.5, -3.4, 6.4, 3, s * 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2a1846'; ctx.globalAlpha = 0.85;
    ctx.beginPath(); ctx.arc(s * 14.5, -4, 2.1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd24d'; ctx.globalAlpha = 0.9;
    ctx.beginPath(); ctx.arc(s * 10, -1.4, 1.2, 0, Math.PI * 2); ctx.fill();
    // Lower wing, dimmer.
    ctx.fillStyle = pal.moth; ctx.globalAlpha = 0.65;
    ctx.beginPath(); ctx.ellipse(s * 8, 5.4, 8.4, 3.8, s * 0.9, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  // Furry banded body with a warm glow core.
  ctx.fillStyle = '#241433';
  ctx.beginPath(); ctx.ellipse(0, 0, 5.6, 9.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(230,220,255,0.35)'; ctx.lineWidth = 1.3;
  for (const by of [-3.4, 0.4, 4.2]) {
    ctx.beginPath(); ctx.moveTo(-4.6, by); ctx.lineTo(4.6, by); ctx.stroke();
  }
  const cg = ctx.createRadialGradient(0, -1, 0.5, 0, -1, 6);
  cg.addColorStop(0, 'rgba(255,210,77,0.75)'); cg.addColorStop(1, 'rgba(255,210,77,0)');
  ctx.fillStyle = cg;
  ctx.beginPath(); ctx.arc(0, -1, 6, 0, Math.PI * 2); ctx.fill();
  // Eyes and feathery antennae.
  ctx.fillStyle = '#ffd24d';
  ctx.beginPath(); ctx.arc(-2.4, -6, 1.7, 0, Math.PI * 2); ctx.arc(2.4, -6, 1.7, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#17102a'; ctx.lineWidth = 1.4;
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(s * 2, -8);
    ctx.quadraticCurveTo(s * 6, -13, s * 9.4, -12.4); ctx.stroke();
  }
  ctx.restore();
}

function drawBoss(ctx, room, t) {
  const b = room.boss;
  if (!b || !b.alive) return;
  const pal = REALMS[room.realm];
  // Aura of gloom.
  const g = ctx.createRadialGradient(b.x, b.y, 6, b.x, b.y, b.r * 2.4);
  g.addColorStop(0, 'rgba(40,6,30,0.55)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 2.4, 0, Math.PI * 2); ctx.fill();
  drawMoth(ctx, { x: b.x, y: b.y, vx: b.vx, vy: b.vy, phase: 1.3 }, pal, t, 3.4);
  // Crown horns.
  ctx.strokeStyle = '#ffd24d'; ctx.lineWidth = 3;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(b.x + s * 12, b.y - b.r - 2);
    ctx.lineTo(b.x + s * 22, b.y - b.r - 16);
    ctx.stroke();
  }
  // HP arc.
  const frac = Math.max(0, b.hp / b.maxHp);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 13, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = '#ff5a7a';
  ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 13, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#ffd7de'; ctx.font = 'bold 13px Georgia'; ctx.textAlign = 'center';
  ctx.fillText(BOSS_NAME.toUpperCase(), b.x, b.y - b.r - 24);
}

export function drawRoom(ctx, state, t) {
  const { room, beam, moths, hoverId } = state;
  drawFloor(ctx, room, t);
  drawWalls(ctx, room);
  drawLanterns(ctx, room, beam.litLanterns, t);
  drawBeam(ctx, room, beam.segments, t);
  drawSource(ctx, room, t);
  drawPrisms(ctx, room, t);
  drawMirrors(ctx, room, hoverId, t);
  const pal = REALMS[room.realm];
  for (const m of moths) drawMoth(ctx, m, pal, t);
  drawBoss(ctx, room, t);
  drawParticles(ctx);
  // Gloom closes in as the shadow meter grows.
  if (state.shadow > 4) {
    const k = Math.min(0.5, state.shadow / 200);
    const g = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, 260, VIEW_W / 2, VIEW_H / 2, 760);
    g.addColorStop(0, 'rgba(8,2,16,0)');
    g.addColorStop(1, `rgba(8,2,16,${k})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
}

// --- Screens -------------------------------------------------------------------
function veil(ctx, a = 0.45) {
  ctx.fillStyle = `rgba(4,3,12,${a})`;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}
function bigText(ctx, text, y, size, color) {
  ctx.fillStyle = color; ctx.font = `bold ${size}px Georgia`; ctx.textAlign = 'center';
  ctx.fillText(text, VIEW_W / 2, y);
}
function lineText(ctx, text, y, size, color) {
  ctx.fillStyle = color; ctx.font = `${size}px Georgia`; ctx.textAlign = 'center';
  ctx.fillText(text, VIEW_W / 2, y);
}

export function drawTitleScreen(ctx, state, t) {
  drawRoom(ctx, state, t);
  veil(ctx, 0.42);
  bigText(ctx, 'P R I S M K E E P', 218, 84, '#ffe9b8');
  lineText(ctx, 'Bend one dawn-beam through mirror shards. Light every lantern. Burn the shadow moths.', 268, 21, '#d9ccff');
  lineText(ctx, '12 nights · 4 realms — Dawn Court, Mirror Vault, Moth Hollow, Sunspire', 306, 20, '#ffd24d');
  lineText(ctx, `On night 12, ${BOSS_NAME} comes for the Sun Lantern.`, 336, 20, '#ff9db0');
  lineText(ctx, 'Click a mirror shard to rotate it · Q / E rotate the nearest shard · R restart night · P pause', 402, 17, '#b9a8e8');
  lineText(ctx, 'Light all lanterns at once to clear the night — moths cross only darkness, and the beam burns them.', 428, 17, '#b9a8e8');
  const blink = 0.65 + 0.35 * Math.sin(t * 4);
  ctx.globalAlpha = blink;
  bigText(ctx, 'CLICK OR PRESS ENTER TO BEGIN', 492, 26, '#fff6d8');
  ctx.globalAlpha = 1;
  if (state.best > 0) lineText(ctx, `Best score so far: ${state.best}`, 536, 17, '#8f83c8');
}

export function drawNightClearScreen(ctx, state, t) {
  drawRoom(ctx, state, t);
  veil(ctx, 0.5);
  bigText(ctx, `NIGHT ${state.room.night} CLEARED`, 268, 52, '#ffe9b8');
  lineText(ctx, `${REALMS[state.room.realm].name} glows a little brighter.`, 312, 20, '#d9ccff');
  lineText(ctx, `Score ${state.score} · moths burned ${state.burned} · lanterns ${state.room.lanterns.length}`, 352, 19, '#ffd24d');
  const blink = 0.65 + 0.35 * Math.sin(t * 4);
  ctx.globalAlpha = blink;
  bigText(ctx, state.room.night >= 12 ? 'PRESS ENTER — FACE THE DAWN' : 'PRESS ENTER FOR THE NEXT NIGHT', 420, 24, '#fff6d8');
  ctx.globalAlpha = 1;
}

export function drawEndScreen(ctx, state, t) {
  drawRoom(ctx, state, t);
  veil(ctx, 0.62);
  if (state.victory) {
    bigText(ctx, 'DAWN BREAKS OVER PRISMKEEP', 190, 48, '#ffe9b8');
    lineText(ctx, `All 12 nights lit — and ${BOSS_NAME} is ash on the wind.`, 232, 20, '#ffd24d');
  } else {
    bigText(ctx, 'THE SHADOW TAKES THE KEEP', 190, 48, '#ff9db0');
    lineText(ctx, `Night ${state.room.night} went dark. The lanterns guttered out one by one.`, 232, 20, '#d9ccff');
  }
  const rows = [
    ['Final score', `${state.score}`],
    ['Nights cleared', `${state.nightsCleared} of 12`],
    ['Lanterns lit (last room)', `${state.litCount} of ${state.room.lanterns.length}`],
    ['Shadow moths burned', `${state.burned}`],
    ['Best score', `${Math.max(state.best, state.score)}`],
  ];
  ctx.font = '20px Georgia';
  rows.forEach(([k, v], i) => {
    const y = 292 + i * 34;
    ctx.fillStyle = '#b9a8e8'; ctx.textAlign = 'right'; ctx.fillText(k, VIEW_W / 2 - 16, y);
    ctx.fillStyle = '#ffe9b8'; ctx.textAlign = 'left'; ctx.fillText(v, VIEW_W / 2 + 16, y);
  });
  const blink = 0.65 + 0.35 * Math.sin(t * 4);
  ctx.globalAlpha = blink;
  bigText(ctx, 'CLICK OR PRESS ENTER TO PLAY AGAIN', 520, 25, '#fff6d8');
  ctx.globalAlpha = 1;
}

export function drawPausedVeil(ctx) {
  veil(ctx, 0.45);
  bigText(ctx, 'PAUSED', 330, 44, '#ffe9b8');
  lineText(ctx, 'Press P to resume', 372, 19, '#d9ccff');
}
