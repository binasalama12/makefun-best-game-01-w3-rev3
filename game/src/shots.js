// Deterministic screenshot scenes for PRISMKEEP, driven by the URL:
//   ?shot=title&seed=7    the title over a solved Mirror-Vault web
//   ?shot=play&seed=7     night 5 mid-play, moths in flight, HUD live
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
    state.moths = fixedMoths(state.room, [[980, 210], [1080, 420], [860, 540]]);
  } else if (shot === 'play') {
    api.startNight(5, seed, { keepScore: false });
    // Nearly solved: every shard true but the last bend, so the web is one
    // click from complete and only the final leg still lies dark.
    solveRoom(state.room);
    const path = state.room.mirrors.filter((m) => m.onPath);
    const lastBend = path[path.length - 1];
    if (lastBend) lastBend.tilt = 1 - lastBend.tilt;
    state.mode = 'play';
    state.score = 1240; state.burned = 9; state.shadow = 26;
    state.moths = fixedMoths(state.room, [[900, 180], [1030, 330], [760, 470], [1120, 560]]);
  } else if (shot === 'feature') {
    api.startNight(12, seed, { keepScore: false });
    solveRoom(state.room);
    state.mode = 'play';
    state.score = 6840; state.burned = 41; state.shadow = 34;
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
