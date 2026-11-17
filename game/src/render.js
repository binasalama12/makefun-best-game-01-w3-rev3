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

// --- Room ---------------------------------------------------------------------
function drawFloor(ctx, room, t) {
  const pal = REALMS[room.realm];
  ctx.fillStyle = pal.floor;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const tile = 62;
  for (let y = FIELD.y, row = 0; y < FIELD.y + FIELD.h; y += tile, row++) {
    for (let x = FIELD.x, col = 0; x < FIELD.x + FIELD.w; x += tile, col++) {
      if ((row + col) % 2 === 0) {
        ctx.fillStyle = pal.floorAlt;
        ctx.fillRect(x, y, Math.min(tile, FIELD.x + FIELD.w - x), Math.min(tile, FIELD.y + FIELD.h - y));
      }
    }
  }
  // Dust motes drifting in the gloom.
  ctx.fillStyle = pal.accent;
  for (const d of room.decor) {
    const yy = d.y + Math.sin(t * 0.6 + d.ph) * 5;
    ctx.globalAlpha = 0.16 + 0.1 * Math.sin(t * 1.3 + d.ph * 2);
    ctx.beginPath(); ctx.arc(d.x, yy, d.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Keep wall and rim.
  ctx.strokeStyle = pal.wallEdge; ctx.lineWidth = 3;
  ctx.strokeRect(FIELD.x - 3, FIELD.y - 3, FIELD.w + 6, FIELD.h + 6);
  ctx.strokeStyle = pal.wall; ctx.lineWidth = 10;
  ctx.strokeRect(FIELD.x - 10, FIELD.y - 10, FIELD.w + 20, FIELD.h + 20);
}

function drawWalls(ctx, room) {
  const pal = REALMS[room.realm];
  for (const w of room.walls) {
    ctx.fillStyle = pal.wall;
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.strokeStyle = pal.wallEdge; ctx.lineWidth = 2;
    ctx.strokeRect(w.x + 2, w.y + 2, w.w - 4, w.h - 4);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(w.x, w.y, w.w, 6);
  }
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
    // Post.
    ctx.strokeStyle = '#17122e'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(l.x, l.y + LANTERN_RADIUS + 9); ctx.lineTo(l.x, l.y + 4); ctx.stroke();
    if (lit) {
      const fl = 1 + Math.sin(t * 7 + l.id * 1.7) * 0.07 + l.flare * 0.6;
      const R = (l.grand ? 120 : 74) * fl;
      const g = ctx.createRadialGradient(l.x, l.y, 2, l.x, l.y, R);
      g.addColorStop(0, 'rgba(255,240,190,0.85)');
      g.addColorStop(0.4, pal.beamGlow + '44');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(l.x, l.y, R, 0, Math.PI * 2); ctx.fill();
    }
    // Glass.
    ctx.beginPath(); ctx.arc(l.x, l.y, LANTERN_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = lit ? '#ffe9a8' : (l.smother > 0 ? '#4a4458' : '#2b3350');
    ctx.fill();
    ctx.strokeStyle = l.grand ? '#ffd24d' : '#0e0b20'; ctx.lineWidth = l.grand ? 3.4 : 2.4; ctx.stroke();
    if (lit) {
      ctx.fillStyle = '#fffbe8';
      ctx.beginPath(); ctx.arc(l.x, l.y, 6.5, 0, Math.PI * 2); ctx.fill();
    }
    if (l.grand) {
      ctx.fillStyle = '#ffd24d'; ctx.font = 'bold 11px Georgia'; ctx.textAlign = 'center';
      ctx.fillText('SUN LANTERN', l.x, l.y - LANTERN_RADIUS - 9);
    }
  }
}

export function drawBeam(ctx, room, segments, t) {
  const pal = REALMS[room.realm];
  ctx.lineCap = 'round';
  const passes = [
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
  // Sparks racing along the web.
  ctx.fillStyle = '#ffffff';
  for (const s of segments) {
    const len = Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
    if (len < 30) continue;
    const n = Math.floor(len / 130);
    for (let i = 0; i <= n; i++) {
      const k = ((t * 0.55 + i / (n + 1) + s.depth * 0.13) % 1);
      const x = s.x1 + (s.x2 - s.x1) * k, y = s.y1 + (s.y2 - s.y1) * k;
      ctx.globalAlpha = 0.75;
      ctx.beginPath(); ctx.arc(x, y, 2.1, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.globalAlpha = 1; ctx.lineCap = 'butt';
}

function drawMoth(ctx, m, pal, t, scale = 1) {
  const flap = Math.sin(t * 26 + m.phase) * 0.55;
  const ang = Math.atan2(m.vy || 0.01, m.vx || 0.01);
  ctx.save();
  ctx.translate(m.x, m.y);
  ctx.rotate(ang + Math.PI / 2);
  ctx.scale(scale, scale);
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.rotate(s * (0.5 + flap * 0.5));
    ctx.fillStyle = pal.moth;
    ctx.globalAlpha = 0.82;
    ctx.beginPath(); ctx.ellipse(s * 10, -3, 11, 5.4, s * 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#241433';
  ctx.beginPath(); ctx.ellipse(0, 0, 5, 8.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffd24d';
  ctx.beginPath(); ctx.arc(-2.2, -5, 1.4, 0, Math.PI * 2); ctx.arc(2.2, -5, 1.4, 0, Math.PI * 2); ctx.fill();
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
