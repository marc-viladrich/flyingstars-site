// Shared by prepared examples and live show conversions. Never truncate a logo.
export async function budgetFormation(compute, n, maxDensity) {
  let density, smallest = null;
  for (let attempt = 0; attempt < 9; attempt++) {
    const pts = await compute(density);
    if (pts.length && (pts.meta?.density ?? maxDensity) <= maxDensity && (!smallest || pts.length < smallest.length)) smallest = pts;
    if (pts.length && pts.length <= n && (pts.meta?.density ?? maxDensity) <= maxDensity) return pts;
    if (density === 0.03) break;
    density = attempt === 7 ? 0.03 : Math.max(0.03, (density ?? maxDensity) * Math.min(0.8, n / Math.max(1, pts.length) * 0.9));
  }
  if (!smallest) throw new Error('Empty logo formation');
  return smallest;
}
