// Picking on the drawn dots (pure functions, tested in pick.test.mjs).
// candidates: [{x, y, key}] in screen pixels. The nearest dot within radius decides; ties go to the first.
export function nearestHit(candidates, x, y, radius) {
  let best = null, bd = radius * radius;
  for (const c of candidates) { const d = (c.x - x) ** 2 + (c.y - y) ** 2; if (d <= bd) { bd = d; best = c; } }
  return best;
}
// bounding box of points with an 8 % margin, not clamped to the raster (ghosts may lie outside the current crop)
export function looseBox(points, margin = 0.08) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of points) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
  const dx = Math.max(1, x1 - x0) * margin, dy = Math.max(1, y1 - y0) * margin;
  return [x0 - dx, y0 - dy, x1 + dx, y1 + dy];
}

// Same screen-pixel targets as click picking. Boundary dots count; empty units do not.
export function rectUnits(candidates, rect) {
  const x0=Math.min(rect.x0,rect.x1),x1=Math.max(rect.x0,rect.x1),y0=Math.min(rect.y0,rect.y1),y1=Math.max(rect.y0,rect.y1),counts=new Map();
  for(const p of candidates){const c=counts.get(p.key)||[0,0];c[0]++;if(p.x>=x0&&p.x<=x1&&p.y>=y0&&p.y<=y1)c[1]++;counts.set(p.key,c);}
  return [...counts].filter(([,c])=>c[1]*2>=c[0]).map(([key])=>key);
}
