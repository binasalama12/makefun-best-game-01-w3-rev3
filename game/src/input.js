// Mouse, touch and keyboard input. A tap on a mirror shard rotates it;
// hovering highlights the shard under the pointer; Q / E rotate the shard
// nearest the pointer; Enter advances screens; R restarts the night;
// P pauses. Coordinates are scaled from CSS pixels to the 1280x720 stage.

export function attachInput(canvas, handlers) {
  const toGame = (evt) => {
    const r = canvas.getBoundingClientRect();
    const cx = (evt.touches ? evt.touches[0].clientX : evt.clientX);
    const cy = (evt.touches ? evt.touches[0].clientY : evt.clientY);
    return {
      x: (cx - r.left) * (canvas.width / r.width),
      y: (cy - r.top) * (canvas.height / r.height),
    };
  };

  canvas.addEventListener('mousemove', (e) => {
    const p = toGame(e);
    handlers.onMove(p.x, p.y);
  });
  canvas.addEventListener('mousedown', (e) => {
    const p = toGame(e);
    handlers.onTap(p.x, p.y);
  });
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const p = toGame(e);
    handlers.onTap(p.x, p.y);
  }, { passive: false });

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    handlers.onKey(e.code);
  });
}

export function mirrorAt(room, x, y, radius = 32) {
  let best = null, bd = radius;
  for (const m of room.mirrors) {
    const d = Math.hypot(m.x - x, m.y - y);
    if (d < bd) { bd = d; best = m; }
  }
  return best;
}
