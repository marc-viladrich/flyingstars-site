// Widen the actual removed source pixels, never a bounding box of a concave shape.
export function filterRemoved(points, mask, width, height, rim = 2) {
  if (!mask.some(Boolean)) return points;
  return points.filter(p => {
    const x = Math.floor(p.x), y = Math.floor(p.y);
    for (let v = Math.max(0, y-rim); v <= Math.min(height-1, y+rim); v++)
      for (let u = Math.max(0, x-rim); u <= Math.min(width-1, x+rim); u++)
        if (mask[v*width+u]) return false;
    return true;
  });
}
