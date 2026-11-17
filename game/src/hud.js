// DOM HUD for PRISMKEEP: the strip across the top of the stage shows the
// night, the realm, lanterns lit, moths burned, score and the shadow meter.

import { REALMS } from './config.js';

const el = (id) => document.getElementById(id);

export function updateHud(state) {
  const room = state.room;
  el('h-night').textContent = room ? `${room.night} / 12` : '–';
  el('h-realm').textContent = room ? REALMS[room.realm].name : '–';
  el('h-lanterns').textContent = room ? `${state.litCount}/${room.lanterns.length}` : '0/0';
  el('h-burned').textContent = `${state.burned}`;
  el('h-score').textContent = `${state.score}`;
  el('shadowbar').style.width = `${Math.min(100, state.shadow)}%`;
}

export function setMessage(text) {
  el('msg').textContent = text || '';
}
