// Deterministic screenshot scenes for PRISMKEEP, driven by the URL:
//   ?shot=title&seed=7    the title over a solved Mirror-Vault web
//   ?shot=play&seed=485   night 6 mid-play, moths in flight, HUD live
//   ?shot=feature&seed=7  night 12: the densest web, prisms split, boss out
//   ?shot=end&seed=7      the dawn-breaks victory screen with full stats
// Each scene is built from the game's own code with a fixed seed and a fixed
// number of simulated steps, then window.__shotReady is raised for the
// screenshot driver. Without a ?shot param this module does nothing.

import { buildRoom, solveRoom } from './world.js';
import { traceBeam } from './beam.js';

function fixedMoths(room, spots) {
  return spots.map(([fx, fy], i) => ({
    x: room ? fx : fx, y: fy, vx: -12, vy: 6,
    phase: i * 1.37, targetId: null, stuck: 0,
  }));
}

export function setupShotScene(state, api) {
  const params = new URLSearchParams(location.search);
  const shot = params.get('shot');
  if (!shot) return false;
  const seed = parseInt(params.get('seed') || '7', 10) || 7;
  state.shotMode = shot;

  if (shot === 'title') {
    api.startNight(8, seed, { keepScore: false });
    solveRoom(state.room);
    state.mode = 'title';
    // The staged title web is a solved night-8 showcase, so the HUD must
    // tell a coherent story: seven nights already cleared behind this one,
    // with the score and burn count those nights would have earned.
    state.score = 5760; state.burned = 52; state.nightsCleared = 7;
    state.best = 5760; state.shadow = 18;
    state.moths = fixedMoths(state.room, [[980, 210], [1080, 420], [860, 540]]);
  } else if (shot === 'play') {
    api.startNight(6, seed, { keepScore: false });
    // Fully solved: the whole web burns at once, every leg lit — and this
    // night's web is woven wall to wall. It dives down the left, crosses to
    // a prism that splits it north and clean east to the rim, and the north
    // branch bends east and drops a lit spine down the right side to the
    // grand lantern, so no quarter of the floor stays dark for long. The
    // night still is not cleared because one lantern is smothered — a moth
    // sits on its glass (smother far outlasts the frozen capture), so the
    // frame is mid-fight: complete web, live combo, moths in the air on
    // both sides of the keep.
    solveRoom(state.room);
    state.mode = 'play';
    state.score = 2380; state.burned = 14; state.shadow = 34;
    state.streak = 4; state.streakTimer = 30; state.bestStreak = 6;
    const mid = state.room.lanterns[Math.floor(state.room.lanterns.length / 2)];
    if (mid) mid.smother = 30;
    const spots = [[1085, 175], [1155, 320], [1105, 565], [865, 585], [545, 175], [215, 585]];
    if (mid) spots.push([mid.x + 26, mid.y - 18]);
    state.moths = fixedMoths(state.room, spots);
  } else if (shot === 'feature') {
    api.startNight(12, seed, { keepScore: false });
    solveRoom(state.room);
    state.mode = 'play';
    state.score = 6840; state.burned = 41; state.shadow = 34;
    state.streak = 3; state.streakTimer = 30; state.bestStreak = 8;
    const b = state.room.boss;
    if (b) { b.x = 880; b.y = 300; b.hp = b.maxHp * 0.55; }
    state.moths = fixedMoths(state.room, [[700, 150], [1010, 480], [620, 560], [1150, 220]]);
  } else if (shot === 'end') {
    api.startNight(12, seed, { keepScore: false });
    solveRoom(state.room);
    if (state.room.boss) state.room.boss.alive = false;
    state.mode = 'end';
    state.victory = true;
    state.score = 12480; state.burned = 87; state.nightsCleared = 12; state.best = 12480;
  } else {
    return false;
  }

  // Title and end screens carry no live hint line under the stage.
  if (shot === 'title' || shot === 'end') {
    const msg = document.getElementById('msg');
    if (msg) msg.textContent = '';
  }
  // Settle the web. The main loop now fixed-steps the scene and raises
  // window.__shotReady itself once the frame freezes, so two renders of the
  // same scene come out byte-identical.
  state.beam = traceBeam(state.room);
  api.refreshLit();
  return true;
}
