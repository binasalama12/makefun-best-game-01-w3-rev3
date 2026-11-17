// PRISMKEEP — main loop and game state.
//
// One dawn-beam enters a dark keep. The player rotates mirror shards to bend
// it through lantern after lantern while shadow moths drift in through the
// dark — they can only cross darkness, and the beam burns them. Light every
// lantern at once to clear the night. Twelve nights, four realms, and on the
// last night the Nightmare Moth comes for the Sun Lantern itself.

import { NIGHT_SECONDS, SCORE, BEAM_KILL_DIST, LANTERN_RADIUS, FIELD } from './config.js';
import { buildRoom, spawnMoth, nearestLantern } from './world.js';
import { traceBeam, distToSegment } from './beam.js';
import { drawRoom, drawTitleScreen, drawNightClearScreen, drawEndScreen, drawPausedVeil, burst, updateParticles, clearParticles } from './render.js';
import { updateHud, setMessage } from './hud.js';
import { attachInput, mirrorAt } from './input.js';
import { initAudio, sfx } from './audio.js';
import { makeRng } from './rng.js';
import { setupShotScene } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const BASE_SEED = 20261117;

const state = {
  mode: 'title',        // title | play | clear | end
  room: null, beam: { segments: [], litLanterns: new Set(), bossTouches: 0 },
  moths: [], hoverId: null, mouse: { x: 0, y: 0 },
  score: 0, burned: 0, shadow: 0, litCount: 0,
  timeLeft: NIGHT_SECONDS, spawnTimer: 3, litHold: 0,
  nightsCleared: 0, victory: false, paused: false,
  best: parseInt(localStorage.getItem('prismkeep-best') || '0', 10) || 0,
  nightStartScore: 0, seed: BASE_SEED, shotMode: null,
  message: '', messageTimer: 0,
  shake: 0, streak: 0, streakTimer: 0, bestStreak: 0,
};
window.__prismkeep = state;

const rng = makeRng(BASE_SEED ^ 0x5eed);

function refreshLit() {
  if (!state.room) { state.litCount = 0; return; }
  let n = 0;
  for (const l of state.room.lanterns) {
    const lit = state.beam.litLanterns.has(l.id) && l.smother <= 0;
    if (lit && !l.lit) { l.flare = 1; sfx.chime(); burst(l.x, l.y, '#ffd24d', 10, 90); }
    l.lit = lit;
    if (lit) n++;
  }
  state.litCount = n;
}

function startNight(night, seed = state.seed, opts = {}) {
  state.room = buildRoom(night, seed);
  state.moths = [];
  state.timeLeft = NIGHT_SECONDS;
  state.spawnTimer = 2.2;
  state.litHold = 0;
  state.shadow = 0;
  state.paused = false;
  if (!opts.keepScore) { /* score carries across nights in a run */ }
  state.nightStartScore = state.score;
  state.beam = traceBeam(state.room);
  refreshLit();
  setMessage(night === 12
    ? 'Night 12 — burn the Nightmare Moth with the beam, and keep the Sun Lantern lit!'
    : `Night ${night} — rotate the shards until every lantern burns at once.`);
}

function startRun() {
  state.score = 0; state.burned = 0; state.nightsCleared = 0;
  state.victory = false;
  startNight(1);
  state.mode = 'play';
}

function endRun(victory) {
  state.victory = victory;
  state.mode = 'end';
  if (state.score > state.best) {
    state.best = state.score;
    try { localStorage.setItem('prismkeep-best', String(state.best)); } catch { /* private mode */ }
  }
  if (victory) sfx.clear(); else sfx.over();
}

function clearNight() {
  const room = state.room;
  const timeBonus = Math.round(state.timeLeft) * SCORE.secondLeft;
  state.score += room.lanterns.length * SCORE.lantern + timeBonus;
  state.nightsCleared = room.night;
  sfx.clear();
  for (const l of room.lanterns) burst(l.x, l.y, '#ffe9a8', 16, 150);
  if (room.night >= 12) { endRun(true); return; }
  state.mode = 'clear';
}

function failNight(why) {
  setMessage(why);
  endRun(false);
}

// --- Simulation ---------------------------------------------------------------
function updateMoths(dt) {
  const room = state.room;
  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0 && state.mode === 'play') {
    spawnMoth(room, rng, state.moths);
    state.spawnTimer = room.cfg.mothEvery * (0.75 + rng() * 0.5);
  }
  const speed = room.cfg.mothSpeed;
  for (let i = state.moths.length - 1; i >= 0; i--) {
    const m = state.moths[i];
    const target = nearestLantern(room, m.x, m.y);
    if (!target) continue;
    let dx = target.x - m.x, dy = target.y - m.y;
    const dist = Math.hypot(dx, dy) || 1;
    dx /= dist; dy /= dist;
    // Darkness-only flight: probe the step ahead; if the beam is there, veer.
    const probeX = m.x + dx * 30, probeY = m.y + dy * 30;
    let beamNear = Infinity;
    for (const s of state.beam.segments) {
      beamNear = Math.min(beamNear, distToSegment(probeX, probeY, s.x1, s.y1, s.x2, s.y2).dist);
    }
    if (beamNear < 24) {
      const side = ((m.phase * 7) % 2 < 1) ? 1 : -1;
      const vx = -dy * side, vy = dx * side;
      dx = vx; dy = vy;
    }
    m.vx = dx * speed; m.vy = dy * speed;
    m.x += m.vx * dt; m.y += m.vy * dt;
    m.x = Math.max(FIELD.x + 6, Math.min(FIELD.x + FIELD.w - 6, m.x));
    m.y = Math.max(FIELD.y + 6, Math.min(FIELD.y + FIELD.h - 6, m.y));

    // Burn check against the live web.
    let minD = Infinity;
    for (const s of state.beam.segments) {
      minD = Math.min(minD, distToSegment(m.x, m.y, s.x1, s.y1, s.x2, s.y2).dist);
    }
    if (minD < BEAM_KILL_DIST) {
      state.moths.splice(i, 1);
      state.burned++;
      // Burn streaks: moths that die in quick succession feed a combo that
      // pays bonus points and, at five, briefly stills the shadow's growth.
      state.streak++;
      state.streakTimer = 2.5;
      state.bestStreak = Math.max(state.bestStreak, state.streak);
      let gain = SCORE.mothBurn;
      if (state.streak >= 3) gain += (state.streak - 2) * 5;
      if (state.streak === 5) {
        state.shadow = Math.max(0, state.shadow - 8);
        setMessage('Burn streak ×5 — the shadow recoils!');
        state.messageTimer = 2;
      }
      state.score += gain;
      burst(m.x, m.y, '#c9a8ff', 14, 140);
      sfx.zap();
      continue;
    }
    // Reached a lantern: smother it and feed the shadow.
    if (dist < LANTERN_RADIUS + 5) {
      state.moths.splice(i, 1);
      target.smother = 5;
      state.shadow = Math.min(room.cfg.shadowMax, state.shadow + 11);
      burst(target.x, target.y, '#5a4a8a', 16, 110);
      sfx.thud();
    }
  }
}

function updateBoss(dt) {
  const room = state.room;
  const b = room.boss;
  if (!b || !b.alive) return;
  // The beam sears it.
  if (state.beam.bossTouches > 0) {
    const dps = state.beam.bossTouches * 34;
    b.hp -= dps * dt;
    state.score += Math.round(SCORE.bossHit * dps * dt);
    if (Math.random() < 0.5) {
      burst(b.x + (Math.random() - 0.5) * 60, b.y + (Math.random() - 0.5) * 60, '#ff8a5a', 3, 120);
    }
    if (b.hp <= 0) {
      b.alive = false;
      state.score += SCORE.bossDown;
      burst(b.x, b.y, '#ffb347', 60, 260);
      burst(b.x, b.y, '#ff5a7a', 40, 200);
      sfx.bossDown();
      setMessage('The Nightmare Moth is ash! Light every lantern to greet the dawn.');
      return;
    }
  }
  // It crawls for the Sun Lantern (the grand one), else the nearest lantern.
  // Wing-beat: every few seconds the boss slams the air and the shockwave
  // knocks one true shard out of alignment. The player hears it coming in
  // the scramble cry and sees the keep shake — re-rotate the shard to heal
  // the web. Only shards on the true path are worth the boss's spite.
  b.scrambleTimer -= dt;
  if (b.scrambleTimer <= 0) {
    b.scrambleTimer = 6.5;
    const trueShards = room.mirrors.filter((m) => m.onPath);
    if (trueShards.length) {
      const victim = trueShards[Math.floor(Math.random() * trueShards.length)];
      victim.tilt = 1 - victim.tilt;
      state.shake = 0.4;
      burst(victim.x, victim.y, '#ff5a7a', 22, 170);
      sfx.scramble();
      setMessage('The Nightmare Moth beats its wings — a shard is knocked askew!');
      state.messageTimer = 2.4;
      state.beam = traceBeam(room);
      refreshLit();
    }
  }
  const grand = room.lanterns.find((l) => l.grand) || nearestLantern(room, b.x, b.y);
  if (!grand) return;
  const dx = grand.x - b.x, dy = grand.y - b.y;
  const dist = Math.hypot(dx, dy) || 1;
  const speed = 13.5;
  b.vx = (dx / dist) * speed; b.vy = (dy / dist) * speed;
  b.x += b.vx * dt; b.y += b.vy * dt;
  b.flap += dt;
  if (dist < b.r + LANTERN_RADIUS + 6) {
    grand.smother = Math.max(grand.smother, 1.2);
    state.shadow = Math.min(room.cfg.shadowMax, state.shadow + 9 * dt);
  }
}

function update(dt) {
  const room = state.room;
  if (!room) return;
  if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 1.4);
  if (state.streakTimer > 0) {
    state.streakTimer -= dt;
    if (state.streakTimer <= 0) state.streak = 0;
  }
  if (state.mode === 'play' && !state.paused) {
    state.timeLeft -= dt;
    for (const l of room.lanterns) {
      if (l.smother > 0) l.smother -= dt;
      if (l.flare > 0) l.flare = Math.max(0, l.flare - dt * 1.6);
    }
    state.beam = traceBeam(room);
    refreshLit();
    updateMoths(dt);
    updateBoss(dt);

    const bossAlive = room.boss && room.boss.alive;
    const allLit = state.litCount === room.lanterns.length && room.lanterns.length > 0;
    if (allLit && !bossAlive) {
      state.litHold += dt;
      if (state.litHold > 0.8) { clearNight(); return; }
    } else {
      state.litHold = 0;
    }
    if (state.shadow >= room.cfg.shadowMax) {
      failNight('The shadow filled the keep.');
      return;
    }
    if (state.timeLeft <= 0) {
      failNight('Dawn came and went with lanterns still dark.');
      return;
    }
  }
  updateParticles(dt);
  if (state.messageTimer > 0) state.messageTimer -= dt;
}

// --- Drawing --------------------------------------------------------------------
let simT = 0;
function draw() {
  if (!state.room) return;
  const view = { ...state, beam: state.beam, moths: state.moths, hoverId: state.hoverId };
  ctx.save();
  if (state.shake > 0) {
    const s = state.shake * 11;
    ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
  }
  if (state.mode === 'title') drawTitleScreen(ctx, view, simT);
  else if (state.mode === 'clear') drawNightClearScreen(ctx, view, simT);
  else if (state.mode === 'end') drawEndScreen(ctx, view, simT);
  else {
    drawRoom(ctx, view, simT);
    if (state.paused) drawPausedVeil(ctx);
    if (state.room.boss && state.room.boss.alive && state.mode === 'play' && state.messageTimer <= 0) {
      setMessage('The Nightmare Moth crawls for the Sun Lantern — route the beam through its wings!');
    }
    if (state.streak >= 3 && state.mode === 'play') {
      ctx.fillStyle = '#ffd24d';
      ctx.font = 'bold 19px Georgia';
      ctx.textAlign = 'right';
      ctx.fillText(`burn streak ×${state.streak}`, 1246, 96);
    }
  }
  ctx.restore();
  updateHud(state);
}

// --- Input ----------------------------------------------------------------------
function rotateMirror(m) {
  if (!m) return;
  m.tilt = 1 - m.tilt;
  sfx.tick();
  burst(m.x, m.y, '#cfe9ff', 5, 70);
  state.beam = traceBeam(state.room);
  refreshLit();
}

attachInput(canvas, {
  onMove(x, y) {
    state.mouse = { x, y };
    const m = state.room ? mirrorAt(state.room, x, y) : null;
    state.hoverId = m ? m.id : null;
  },
  onTap(x, y) {
    initAudio();
    if (state.shotMode) return;
    if (state.mode === 'title') { startRun(); return; }
    if (state.mode === 'clear') { startNight(state.room.night + 1); state.mode = 'play'; return; }
    if (state.mode === 'end') { startRun(); return; }
    if (state.mode === 'play' && !state.paused) rotateMirror(mirrorAt(state.room, x, y));
  },
  onKey(code) {
    initAudio();
    if (state.shotMode) return;
    if (code === 'Enter' || code === 'Space') {
      if (state.mode === 'title') startRun();
      else if (state.mode === 'clear') { startNight(state.room.night + 1); state.mode = 'play'; }
      else if (state.mode === 'end') startRun();
      return;
    }
    if (state.mode !== 'play') return;
    if (code === 'KeyP') { state.paused = !state.paused; return; }
    if (code === 'KeyR') {
      state.score = state.nightStartScore;
      startNight(state.room.night);
      return;
    }
    if (code === 'KeyQ' || code === 'KeyE') {
      rotateMirror(mirrorAt(state.room, state.mouse.x, state.mouse.y, 9999));
    }
  },
});

// --- Boot -----------------------------------------------------------------------
const api = { startNight, refreshLit };
if (!setupShotScene(state, api)) {
  startNight(8);           // the title screen plays over a Mirror-Vault room
  state.mode = 'title';
  state.score = 0;
}

let last = performance.now();
let shotFrame = 0;
const SHOT_FREEZE_FRAME = 150; // 2.5 simulated seconds, then the scene holds
function frame(now) {
  if (state.shotMode) {
    // Screenshot scenes run on a fixed step and then freeze, so a render is
    // reproducible byte for byte; stray particles are swept at the freeze.
    if (shotFrame < SHOT_FREEZE_FRAME) {
      shotFrame++;
      simT += 1 / 60;
      update(1 / 60);
      if (shotFrame === SHOT_FREEZE_FRAME) {
        clearParticles();
        window.__shotReady = true;
      }
    }
    draw();
    requestAnimationFrame(frame);
    return;
  }
  const dt = Math.min(0.033, (now - last) / 1000 || 0.016);
  last = now;
  simT += dt;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
