// 3D-Fassungen der Katalog-Gegenstände (Formklasse Gegenstände, docs/katalog-3d.md): Rotationskörper aus Meridianen
// und Reifen, Kanten und Deckflächen als eigene Linien. Bewegt wird, was das Ding tut (Lichtstrahl, Korken, Wellen).
import { GOLD, WARM, ORANGE, RED, PINK, VIOLET, CYAN, BLUE, GREEN, mix, yaw, roll, pitch, glint, breathe, chase, sparkle, hash } from '../../show-motion.js';
import { ellipsoid, revolve, tube, curves, spot, assemble, colour, ease, turn, posed, poseLine, posePart, isPlus, TAU } from './kit.js';
// Runde 9: die einfachen Gegenstände (Stufe 3D, stufen.js) haben zwei Fassungen. 3D+ ist die bisherige, aufwendige
// Fassung; 3D zeigt die Grundkörper mit weniger Profillinien, ohne Zierteile und ohne Eigenbewegung, im ruhigen Schwenk.


// ---------------------------------------------------------------- Leuchtturm ----------
// Rotationskörper mit rot-weißen Ringen, Galerie mit Geländer, Laterne und Dach; zwei Lichtkegel kreisen um die
// Laterne (die Drohnen fliegen langsam im Kreis, das Licht wird nach außen schwächer). Davor Felsen und das Meer als
// Wellenreihen in der Tiefe; im 2D-Bild sind es zwei Wellenlinien.
const LX = -0.18, LY = 0.42; // Laternenmitte
export function leuchtturm(n) {
  const q = n / 300;
  const tower = revolve('tower', [LX, -0.22], [[0.18, 0], [0.125, 0.56]], { meridians: q > 1.2 ? 10 : 8, rings: [0.0, 0.14, 0.28, 0.42, 0.56] });
  const gallery = curves('gallery', [0.19, 0.19].map((r, k) => ({ pts: Array.from({ length: 48 }, (_, i) => { const a = (i / 48) * TAU; return [LX + Math.cos(a) * r, 0.34 + k * 0.07, Math.sin(a) * r]; }), closed: true })));
  const posts = curves('gallery', Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * TAU + 0.2; return [[LX + Math.cos(a) * 0.19, 0.34, Math.sin(a) * 0.19], [LX + Math.cos(a) * 0.19, 0.41, Math.sin(a) * 0.19]]; }), { w: 0.8 });
  const lantern = revolve('lantern', [LX, 0.35], [[0.1, 0], [0.1, 0.13]], { meridians: 6, rings: [0.065], phase: 0.25 });
  const roof = revolve('roof', [LX, 0.48], [[0.14, 0], [0.02, 0.13]], { meridians: 6, rings: [0], phase: 0.25 });
  const beam = (phase) => curves('beam', [-1, 0, 1].map((s) => ({ pts: Array.from({ length: 12 }, (_, i) => { const r = 0.15 + (0.5 * i) / 11, a = phase + s * (0.02 + 0.16 * (r - 0.15)); return [LX + Math.cos(a) * r, LY, Math.sin(a) * r]; }) })), { w: 0.8 });
  const rocks = [[-0.34, -0.27, 0.06, 0.22, 0.1, 0.2], [-0.0, -0.3, -0.06, 0.22, 0.09, 0.17], [-0.5, -0.34, 0.14, 0.14, 0.07, 0.13], [0.16, -0.33, 0.12, 0.13, 0.06, 0.11]]
    .map(([x, y, z, a, b, c]) => ellipsoid('rock', [x, y, z], [a, b, c], { lat: [0.3] }));
  const sea = curves('sea', [-0.35, 0, 0.35].map((z, r) => ({ pts: Array.from({ length: 60 }, (_, i) => { const x = -0.8 + (1.6 * i) / 59; return [x, -0.3 - 0.17 * z + 0.04 * Math.sin(6 * x + r * 1.7), z]; }) })), { w: 1 });
  const shape = assemble([tower, gallery, posts, lantern, roof, beam(0.4), beam(0.4 + Math.PI), ...rocks, sea], n);
  const stripe = (p) => (Math.floor((p[1] + 0.22) / 0.14) % 2 ? WARM : RED);
  const pts = colour(shape, { tower: stripe, gallery: WARM, lantern: GOLD, roof: RED, beam: mix(GOLD, WARM, 0.4), rock: mix(WARM, BLUE, 0.35), sea: (p) => mix(CYAN, BLUE, 0.3 + 0.4 * (p[2] + 0.5)) }, WARM);
  return { pts, live: (b, j, t, o) => {
    const tag = shape.tags[j];
    if (tag === 'beam') { yaw(o, -t * 0.55, LX, 0); const r = Math.hypot(b[0] - LX, b[2]); o[3] = 1.35 - 1.2 * (r - 0.15); }
    else if (tag === 'lantern') o[3] = breathe(t, 2.2) + 0.2;
    else if (tag === 'sea') { o[1] += 0.03 * Math.sin(2.4 * b[0] - 1.3 * t + b[2] * 3); o[3] = glint(b[0], t, 5, 0.3); }
    turn(o, t, -0.28, 0.32, 14, LX, 0);
  } };
}

// ---------------------------------------------------------------- Sektflasche ----------
// Schräg wie im Katalog: der Flaschenkörper als Rotationskörper (Meridiane, Reifen), Etikett und Folie am Hals, der
// Korken schwebt über der Öffnung, aus dem Hals sprüht Licht. Die Flasche dreht sich langsam um ihre Längsachse (das
// Etikett wandert herum), der Korken wippt.
const BOTTLE = { c: [-0.22, -0.1], roll: -0.89 };
const PROFILE = [[0.27, -0.78], [0.285, -0.7], [0.285, 0.02], [0.24, 0.2], [0.12, 0.36], [0.088, 0.47], [0.088, 0.68], [0.1, 0.73]];
export function sektflasche(n, stufe) {
  const P = isPlus(stufe, n), q = n / 300;
  const body = revolve('glass', [0, 0], PROFILE, P ? { meridians: q > 1.2 ? 10 : 8, rings: [-0.78, -0.45, 0.2, 0.36], phase: 0.2 } : { meridians: 4, rings: [-0.78, 0.36], phase: 0.2 });
  const foil = revolve('foil', [0, 0], [[0.092, 0.5], [0.092, 0.6], [0.104, 0.72]], { meridians: 6, rings: [0.5, 0.6], phase: 0.5, solid: false });
  const arc = (y, a0, a1) => ({ pts: Array.from({ length: 21 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / 20; return [Math.cos(a) * 0.292, y, Math.sin(a) * 0.292]; }) });
  const label = curves('label', [arc(-0.4, 0.75, 2.4), arc(-0.08, 0.75, 2.4), { pts: [[Math.cos(0.75) * 0.292, -0.4, Math.sin(0.75) * 0.292], [Math.cos(0.75) * 0.292, -0.08, Math.sin(0.75) * 0.292]] }, { pts: [[Math.cos(2.4) * 0.292, -0.4, Math.sin(2.4) * 0.292], [Math.cos(2.4) * 0.292, -0.08, Math.sin(2.4) * 0.292]] }, arc(-0.24, 1.05, 2.1)], { w: 1.3 });
  const cork = revolve('cork', [0, 0.86], [[0.07, 0], [0.085, 0.05], [0.07, 0.1]], { meridians: 5, rings: [0, 0.1], phase: 0.1, solid: false });
  const spray = curves('spray', [-0.7, -0.25, 0.25, 0.7].map((a) => ({ pts: Array.from({ length: 8 }, (_, i) => { const u = 0.08 + i * 0.07; return [Math.sin(a) * u * 0.55, 0.98 + u * 1.4, Math.cos(a) * u * 0.4]; }) })), { w: 0.9 });
  const shape = assemble(P ? [body, foil, label, cork, spray] : [body, cork], n);
  // die Flasche wird im eigenen Rahmen gebaut (Achse = y) und schräg gestellt
  const local = shape.pts.map((p) => [...p]);
  const place = (o) => { roll(o, BOTTLE.roll); o[0] += BOTTLE.c[0]; o[1] += BOTTLE.c[1]; };
  const world = local.map((p) => { const o = [...p]; place(o); return o; });
  const pts = colour({ pts: world, tags: shape.tags }, { glass: (p) => mix(GREEN, CYAN, 0.15), foil: GOLD, label: WARM, cork: mix(GOLD, ORANGE, 0.5), spray: (p) => mix(GOLD, WARM, hash(p[0] * 31 + p[1] * 7)) }, GREEN);
  const spin = new Set(['glass', 'foil', 'label']);
  return { pts, live: (b, j, t, o) => {
    const tag = shape.tags[j], p = local[j];
    if (!P) { turn(o, t, 0.2, 0.26, 14); return; }
    o[0] = p[0]; o[1] = p[1]; o[2] = p[2];
    if (spin.has(tag)) yaw(o, t * 0.5);
    if (tag === 'cork') { o[1] += 0.12 * ease(t, 3); yaw(o, t * 1.1); }
    place(o);
    o[3] = tag === 'spray' ? chase(-p[1], t, 0.7, 0.35, 0.5, 1.4) : tag === 'label' ? glint(p[1], t, 3, 0.3, -0.5, 0) : tag === 'foil' ? 1.15 : 1;
    turn(o, t, 0.2, 0.3, 14);
  } };
}

// ---------------------------------------------------------------- Konfetti-Kanone ----------
// Das Rohr als Rotationskörper mit violetter Mündung, schräg auf zwei Rädern, die in der Tiefe zu beiden Seiten stehen;
// das Konfetti fliegt als räumlicher Kegel aus der Mündung, glitzert und treibt ein Stück hinaus und zurück.
const CANNON = { c: [-0.42, -0.5], roll: -0.76 };
const MUZZLE = posed([0, 1.02, 0], CANNON.roll, CANNON.c), AIM = (() => { const d = posed([0, 1, 0], CANNON.roll, [0, 0]); return [d[0], d[1], 0]; })();
export function konfetti(n) {
  const barrel = posePart(revolve('barrel', [0, 0], [[0.17, 0], [0.18, 0.08], [0.15, 0.62], [0.15, 0.72], [0.24, 1.02]], { meridians: 6, rings: [0.08, 0.4, 0.72], phase: 0.3 }), CANNON.roll, CANNON.c);
  const muzzle = curves('muzzle', [poseLine({ pts: Array.from({ length: 40 }, (_, i) => { const a = (i / 40) * TAU; return [Math.cos(a) * 0.24, 1.02, Math.sin(a) * 0.24]; }), closed: true }, CANNON.roll, CANNON.c)], { w: 1.2 });
  const wheel = (z) => curves('wheel', [{ pts: Array.from({ length: 40 }, (_, i) => { const a = (i / 40) * TAU; return [-0.5 + Math.cos(a) * 0.24, -0.7 + Math.sin(a) * 0.24, z]; }), closed: true }, ...[0, 1, 2].map((k) => { const a = (k / 3) * Math.PI + 0.3; return [[-0.5 + Math.cos(a) * 0.22, -0.7 + Math.sin(a) * 0.22, z], [-0.5 - Math.cos(a) * 0.22, -0.7 - Math.sin(a) * 0.22, z]]; })]);
  const axle = curves('wheel', [[[-0.5, -0.7, -0.3], [-0.5, -0.7, 0.3]]], { w: 0.7 });
  // Luftschlangen: Spiralen, die aus der Mündung fächerförmig in den Raum fliegen
  const nn = [-AIM[1], AIM[0], 0];
  const streamers = [[-0.95, 0.35, 0.85], [-0.45, -0.55, 0.8], [0.0, 0.15, 1.0], [0.45, 0.6, 0.8], [0.9, -0.35, 0.85], [0.15, -0.6, 0.65]].map(([a, b, L], k) => curves(`confetti${k}`, [{ pts: Array.from({ length: 40 }, (_, i) => {
    const u = i / 39, d = 0.05 + L * u * 0.8, cx = MUZZLE[0] + AIM[0] * d + nn[0] * a * d, cy = MUZZLE[1] + AIM[1] * d + nn[1] * a * d, cz = b * d, w = u * 6.5 + k, r = 0.04 + 0.06 * u;
    return [cx + nn[0] * Math.cos(w) * r, cy + nn[1] * Math.cos(w) * r, cz + Math.sin(w) * r];
  }) }], { w: 0.8 }));
  const shape = assemble([barrel, muzzle, wheel(0.3), wheel(-0.3), axle, ...streamers], n);
  const pal = [GOLD, PINK, CYAN, ORANGE, VIOLET, GREEN];
  const pts = colour(shape, { barrel: WARM, muzzle: VIOLET, wheel: mix(WARM, GOLD, 0.4), }, WARM).map((p, j) => (shape.tags[j].startsWith('confetti') ? [p[0], p[1], p[2], ...pal[+shape.tags[j].slice(8)]] : p));
  const dist = shape.pts.map((p) => Math.hypot(p[0] - MUZZLE[0], p[1] - MUZZLE[1]));
  return { pts, live: (b, j, t, o) => {
    if (shape.tags[j].startsWith('confetti')) { const s = 0.12 * dist[j] * ease(t, 4); o[0] += AIM[0] * s; o[1] += AIM[1] * s - 0.05 * ease(t, 4) * dist[j]; o[3] = sparkle(j, t, 0.6, 1.4) * chase(-dist[j], t, 0.6, 0.5, 0.75, 1.3); }
    else if (shape.tags[j] === 'muzzle') o[3] = 1.2;
    turn(o, t, -0.3, 0.32, 13);
  } };
}

// ---------------------------------------------------------------- Diskokugel ----------
// Eine Kugel aus Breitenkreisen und Meridianen an ihrer Schnur; die Meridiane drehen sich im ruhenden Umriss, ein
// Lichtfleck wandert über die Spiegel, um die Kugel blitzen Lichtsterne in verschiedener Tiefe.
export function diskokugel(n, stufe) {
  const P = isPlus(stufe, n), C = [0, -0.17], R = 0.56;
  const outline = ellipsoid('outline', C, [R, R, R], { lat: [] });
  const lat = ellipsoid('facet', C, [R, R, R], { silhouette: false, lat: P ? [-0.7, -0.38, 0, 0.38, 0.7] : [-0.45, 0, 0.45] });
  const mer = ellipsoid('mer', C, [R, R, R], { silhouette: false, mer: P ? [0.5, 1.05, 1.6, 2.15, 2.7] : [0.8, 2.35] });
  const cord = curves('cord', [[[C[0], C[1] + R, 0], [C[0], 0.95, 0]], { pts: Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * TAU; return [C[0] + Math.cos(a) * 0.07, C[1] + R + 0.03, Math.sin(a) * 0.07]; }), closed: true }], { w: 0.8 });
  const glints = [[-0.78, -0.72, 0.2], [0.78, 0.22, -0.2], [0.95, -0.02, 0.25], [-0.85, 0.42, -0.25], [0.62, 0.78, 0.1], [-0.55, 0.8, 0.15]].map((p) => spot('glint', p, 4, 0.06));
  const shape = assemble(P ? [outline, lat, mer, cord, ...glints] : [outline, lat, mer, cord], n);
  const pts = colour(shape, { cord: mix(WARM, GOLD, 0.5), glint: mix(WARM, CYAN, 0.3), mer: mix(WARM, VIOLET, 0.2) }, (p) => mix(WARM, CYAN, 0.12 + 0.2 * hash(p[0] * 13 + p[1] * 7)));
  return { pts, live: (b, j, t, o) => {
    const tag = shape.tags[j];
    if (!P) { turn(o, t, 0.25, 0.3, 14); return; }
    if (tag === 'mer' || tag === 'facet') { yaw(o, t * 0.45, C[0], 0); o[3] = glint(Math.atan2(o[2], o[0] - C[0]), t, 2.6, 0.7, -Math.PI, Math.PI); } // ein Lichtfleck wandert über die Spiegel (kein Dauerfunkeln, Wächter show-clouds)
    else if (tag === 'glint') o[3] = 0.4 + 1.1 * Math.max(0, Math.sin(t * 1.3 + j * 0.9)) ** 3;
    turn(o, t, 0, 0.2, 14);
  } };
}

// ---------------------------------------------------------------- Ballons ----------
// Fünf Ballons wie im Katalog, als Körper in unterschiedlicher Tiefe; jeder hat Knoten und Schnur, die Schnüre
// schwingen durch den Raum. Jeder Ballon schwebt in eigenem Takt.
const BALLOONS = [[-0.86, 0.02, 0.22, [GREEN, VIOLET]], [-0.45, 0.52, -0.22, [RED, ORANGE]], [-0.05, 0.22, 0.1, [ORANGE, PINK]], [0.42, 0.52, -0.12, [CYAN, GREEN]], [0.8, 0.22, 0.26, [GOLD, GREEN]]];
export function ballons(n, stufe) {
  const P = isPlus(stufe, n);
  const parts = BALLOONS.flatMap(([x, y, z], k) => {
    const knot = [x, y - 0.2, z], end = [x + (k % 2 ? 0.08 : -0.06), y - 0.82, z - 0.12];
    return [
      ellipsoid(`b${k}`, [x, y, z], [0.15, 0.18, 0.15], P ? { lat: [-0.2], mer: [1.0] } : { lat: [] }),
      curves(`b${k}`, [[[x - 0.03, y - 0.21, z], [x + 0.03, y - 0.21, z], knot]]),
      curves(`s${k}`, [{ pts: Array.from({ length: 16 }, (_, i) => { const u = i / 15; return [knot[0] + (end[0] - knot[0]) * u + 0.04 * Math.sin(u * 7 + k), knot[1] + (end[1] - knot[1]) * u, knot[2] + (end[2] - knot[2]) * u + 0.05 * Math.sin(u * 5 + k * 2)]; }) }], { w: 0.75 }),
    ];
  });
  const shape = assemble(parts, n);
  const of = shape.tags.map((g) => +g.slice(1)), isString = shape.tags.map((g) => g[0] === 's');
  const pts = colour(shape, {}, WARM).map((p, j) => { const [, by, , [c0, c1]] = BALLOONS[of[j]]; return [p[0], p[1], p[2], ...(isString[j] ? mix(WARM, c0, 0.25) : mix(c0, c1, (by + 0.18 - p[1]) / 0.36))]; });
  return { pts, live: (b, j, t, o) => {
    if (!P) { turn(o, t, -0.25, 0.3, 14); return; }
    const k = of[j], [x, y] = BALLOONS[k], ph = k * 0.9, lift = 0.06 * (ease(t + ph, 3 + 0.4 * k) - ease(ph, 3 + 0.4 * k));
    const u = isString[j] ? Math.max(0, Math.min(1, (y - 0.2 - b[1]) / 0.62)) : 0;
    o[1] += lift * (1 - 0.7 * u); // die Schnur folgt dem Ballon, unten weniger
    roll(o, 0.05 * (ease(t + ph, 4.2) - ease(ph, 4.2)) * (isString[j] ? 1 : 0.5), x, y - 0.2);
    turn(o, t, -0.25, 0.4, 13);
  } };
}

// ---------------------------------------------------------------- Basketball ----------
// Kugel mit ruhigem Umriss; die Nähte (Äquator, ein Meridian, zwei gebogene Seitennähte) drehen sich darin.
export function basketball(n, stufe) {
  const P = isPlus(stufe, n), R = 0.95;
  const outline = ellipsoid('outline', [0, 0], [R, R, R], { lat: [] });
  const seam = (f) => ({ pts: Array.from({ length: 64 }, (_, i) => f((i / 64) * TAU)), closed: true });
  const seams = curves('seam', [seam((a) => [Math.cos(a) * R, 0, Math.sin(a) * R]), seam((a) => [0, Math.cos(a) * R, Math.sin(a) * R]),
    ...(P ? [1, -1].map((s) => seam((a) => [s * 0.62 * R, Math.cos(a) * 0.78 * R, Math.sin(a) * 0.78 * R])) : [])], { w: 1 });
  const shape = assemble([outline, seams], n);
  const pts = colour(shape, { seam: mix(ORANGE, WARM, 0.35) }, mix(ORANGE, GOLD, 0.25));
  return { pts, live: (b, j, t, o) => {
    if (!P) { roll(o, 0.18); turn(o, t, 0.3, 0.3, 14); return; }
    if (shape.tags[j] === 'seam') yaw(o, t * 0.6);
    else o[3] = glint(b[0] + b[1], t, 4, 0.3);
    roll(o, 0.18);
  } };
}

// ---------------------------------------------------------------- Zuckerstange ----------
// Eine Röhre entlang des Stocks mit Haken; zwei rote Spiralstreifen laufen um sie herum, Licht wandert die Streifen
// entlang wie bei einer Barbierstange.
function canePath() {
  const pts = [];
  for (let i = 0; i <= 20; i++) { const u = i / 20; pts.push([-0.68 + 0.33 * u, -0.92 + 1.37 * u]); }
  const c = [0.17, 0.42], r = 0.52, a0 = Math.atan2(0.45 - c[1], -0.35 - c[0]);
  for (let i = 1; i <= 30; i++) { const a = a0 - ((a0 - 0.05) * i) / 30; pts.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]); }
  return pts;
}
export function zuckerstange(n, stufe) {
  const P = isPlus(stufe, n);
  const path = canePath(), R = 0.1, L = [0];
  for (let i = 1; i < path.length; i++) L.push(L[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
  const at = (s) => { const d = s * L.at(-1); let i = 1; while (i < L.length - 1 && L[i] < d) i++; const u = (d - L[i - 1]) / (L[i] - L[i - 1] || 1), a = path[i - 1], b = path[i], tl = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return { p: [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u], nn: [-(b[1] - a[1]) / tl, (b[0] - a[0]) / tl] }; };
  const surf = (s, th) => { const { p, nn } = at(s); return [p[0] + nn[0] * Math.cos(th) * R, p[1] + nn[1] * Math.cos(th) * R, Math.sin(th) * R]; };
  const K = 220, turns = 9;
  const sides = curves('cane', [0, Math.PI].map((th) => ({ pts: Array.from({ length: K + 1 }, (_, i) => surf(i / K, th)) })), { w: 0.8 });
  const ends = curves('cane', [0, 1].map((s) => ({ pts: Array.from({ length: 20 }, (_, i) => surf(s, (i / 20) * TAU)), closed: true })), { w: 0.8 });
  const stripes = curves('stripe', (P ? [0, Math.PI] : [0]).map((ph) => ({ pts: Array.from({ length: K + 1 }, (_, i) => surf(i / K, ph + (i / K) * turns * TAU)) })), { w: 1.15 });
  const shape = assemble([sides, ends, stripes], n);
  const pts = colour(shape, { stripe: RED }, WARM);
  const along = shape.pts.map((p) => { let best = 0, d = Infinity; for (let i = 0; i <= 60; i++) { const q = at(i / 60).p, e = Math.hypot(p[0] - q[0], p[1] - q[1]); if (e < d) { d = e; best = i / 60; } } return best; });
  return { pts, live: (b, j, t, o) => {
    if (!P) { turn(o, t, -0.35, 0.3, 14, -0.1, 0); return; }
    o[3] = shape.tags[j] === 'stripe' ? chase(along[j], t, 0.12, 0.25, 0.85, 1.35) : 1;
    turn(o, t, -0.35, 0.4, 13, -0.1, 0);
  } };
}

// ---------------------------------------------------------------- Glocke ----------
// Zwei Glocken unter einer Schleife wie im Katalog, jede ein Rotationskörper mit Klöppel, nach außen geneigt; die
// Schlaufen der Schleife stehen schräg in die Tiefe. Die Glocken schwingen gegeneinander um den Knoten, die Klöppel
// weiter als sie; beim Ausschlag blitzt der Rand.
const KNOT = [0, 0.3];
const BELLS = [[-1, -0.3, -0.16, 0.14], [1, 0.3, -0.2, -0.14]]; // Seite, Mitte x, Mitte y, z
export function glocke(n, stufe) {
  const P = isPlus(stufe, n);
  const profile = [[0.42, -0.36], [0.38, -0.29], [0.29, -0.14], [0.24, 0.05], [0.23, 0.18], [0.17, 0.28], [0.08, 0.34], [0.02, 0.35]].map(([r, y]) => [r * 1.2, y * 1.2]);
  const parts = BELLS.flatMap(([s, x, y, z], k) => {
    const tiltPart = (part) => posePart(part, -s * 0.22, [x, y, z]);
    return [
      tiltPart(revolve(`bell${k}`, [0, 0], profile, { meridians: P ? 4 : 2, rings: P ? [-0.41, 0.12] : [-0.41], phase: 0.4 + 0.5 * k })),
      ...(P ? [tiltPart(ellipsoid(`clap${k}`, [0, -0.52, 0], [0.065, 0.065, 0.065], { lat: [] })), curves(`clap${k}`, [poseLine({ pts: [[0, 0.3, 0], [0, -0.45, 0]] }, -s * 0.22, [x, y, z])], { w: 0.7 })] : []),
    ];
  });
  const loop = (s) => ({ pts: Array.from({ length: 30 }, (_, i) => { const a = (i / 30) * TAU, x = 0.26 + 0.24 * Math.cos(a), y = 0.15 * Math.sin(a); return [KNOT[0] + s * x, KNOT[1] + 0.14 + y + 0.18 * x, -0.14 * x * s]; }), closed: true });
  const bow = curves('bow', [loop(1), loop(-1), { pts: Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * TAU; return [KNOT[0] + Math.cos(a) * 0.06, KNOT[1] + 0.12 + Math.sin(a) * 0.05, 0.03]; }), closed: true }], { w: 1.05 });
  const shape = assemble([...parts, bow], n);
  const pts = colour(shape, { bow: RED, clap0: mix(GOLD, WARM, 0.5), clap1: mix(GOLD, WARM, 0.5) }, (p) => mix(GOLD, WARM, Math.max(0, p[1] + 0.2) * 0.6));
  return { pts, live: (b, j, t, o) => {
    const tag = shape.tags[j];
    if (!P) { turn(o, t, -0.25, 0.3, 14); return; }
    if (tag !== 'bow') {
      const k = +tag.at(-1), side = BELLS[k][0], swing = side * 0.12 * Math.sin((t * TAU) / 2.8);
      roll(o, tag.startsWith('clap') ? swing * 1.6 : swing, KNOT[0], KNOT[1]);
      if (tag.startsWith('bell')) o[3] = 1 + 0.45 * Math.abs(Math.sin((t * TAU) / 2.8)) ** 6;
    }
    turn(o, t, -0.25, 0.32, 13);
  } };
}

// ---------------------------------------------------------------- Geburtstagstorte ----------
// Drei Stockwerke als Zylinder (Ränder, senkrechte Kanten, ein Zuckerguss-Rand mit Wellen), oben eine Kerze mit
// flackernder Flamme. Die Torte dreht sich langsam auf ihrem Teller.
export function geburtstag(n, stufe) {
  const P = isPlus(stufe, n);
  const tier = (tag, y0, y1, r, k) => revolve(tag, [0, 0], [[r, y0], [r, y1]], { meridians: k, rings: [y0, y1], phase: 0.3 });
  const icing = (y, r, waves) => ({ pts: Array.from({ length: 72 }, (_, i) => { const a = (i / 72) * TAU; return [Math.cos(a) * r * 1.01, y - 0.045 * (0.5 + 0.5 * Math.cos(a * waves)), Math.sin(a) * r * 1.01]; }), closed: true });
  const plate = curves('plate', [{ pts: Array.from({ length: 64 }, (_, i) => { const a = (i / 64) * TAU; return [Math.cos(a) * 0.8, -0.98, Math.sin(a) * 0.8]; }), closed: true }], { w: 0.7 });
  const t1 = tier('tier1', -0.95, -0.55, 0.62, 8), t2 = tier('tier2', -0.55, -0.18, 0.46, 8), t3 = tier('tier3', -0.18, 0.12, 0.3, 6);
  const drips = curves('icing', [icing(-0.55, 0.62, 12), icing(-0.18, 0.46, 10), icing(0.12, 0.3, 8)], { w: 1.1 });
  const candle = revolve('candle', [0, 0.12], [[0.045, 0], [0.045, 0.44]], { meridians: 2, rings: [0.42], phase: 0 });
  const flame = curves('flame', [0, Math.PI / 2].map((ph) => ({ pts: Array.from({ length: 24 }, (_, i) => { const a = (i / 24) * TAU, w = 0.1 * Math.sin(a) * Math.sin(a / 2); return [Math.cos(ph) * w, 0.74 + 0.16 * Math.cos(a), Math.sin(ph) * w]; }), closed: true })), { w: 1.3 });
  const shape = assemble(P ? [plate, t1, t2, t3, drips, candle, flame] : [t1, t2, t3, candle], n);
  const pts = colour(shape, { plate: mix(WARM, CYAN, 0.3), tier1: mix(PINK, WARM, 0.4), tier2: WARM, tier3: mix(PINK, WARM, 0.4), icing: GOLD, candle: mix(CYAN, WARM, 0.4), flame: (p) => mix(GOLD, ORANGE, (p[1] - 0.58) / 0.32) }, WARM);
  return { pts, live: (b, j, t, o) => {
    const tag = shape.tags[j];
    if (!P) { turn(o, t, 0, 0.3, 14); pitch(o, 0.22); return; }
    if (tag === 'flame') o[3] = sparkle(j, t * 1.6, 0.8, 1.5);
    else { yaw(o, t * 0.35); if (tag === 'icing') o[3] = glint(Math.atan2(b[2], b[0]), t, 4, 0.4, -Math.PI, Math.PI); }
    pitch(o, 0.22);
  } };
}

// ---------------------------------------------------------------- Mikrofon ----------
// Schräg wie im Katalog: der Griff als sich verjüngende Röhre, der Kopf als Gitterkugel (Breitenkreise und Meridiane,
// die sich im ruhenden Umriss drehen), ringsum Noten in verschiedener Tiefe, die im Takt wippen.
const MIC = { head: [0.05, 0.3], base: [-0.5, -0.72], r: 0.2 };
export function mikrofon(n, stufe) {
  const P = isPlus(stufe, n);
  const grille = ellipsoid('outline', MIC.head, [MIC.r, MIC.r, MIC.r], { lat: [] });
  const mesh = ellipsoid('mesh', MIC.head, [MIC.r, MIC.r, MIC.r], { silhouette: false, lat: [-0.5, 0, 0.5], mer: [0.6, 1.6, 2.6] });
  const handle = tube('handle', [[MIC.base[0], MIC.base[1], 0], [MIC.head[0] - 0.1, MIC.head[1] - 0.16, 0]], (s) => 0.05 + 0.04 * s, { hoops: 2, crest: false, caps: [true, false] });
  const collar = curves('collar', [{ pts: Array.from({ length: 30 }, (_, i) => { const a = (i / 30) * TAU, d = [0.55, 0.83], q = [-d[1], d[0]]; return [MIC.head[0] - 0.13 + q[0] * Math.cos(a) * 0.1, MIC.head[1] - 0.2 + q[1] * Math.cos(a) * 0.1, Math.sin(a) * 0.1]; }), closed: true }]);
  const note = (x, y, z, k, beam) => { const head = (cx, cy) => ({ pts: Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * TAU; return [cx + Math.cos(a) * 0.055, cy + Math.sin(a) * 0.04, z]; }), closed: true });
    return curves(`note${k}`, beam ? [head(x, y), head(x + 0.18, y - 0.04), [[x + 0.05, y, z], [x + 0.05, y + 0.26, z], [x + 0.23, y + 0.22, z], [x + 0.23, y - 0.04, z]]] : [head(x, y), [[x + 0.05, y, z], [x + 0.05, y + 0.26, z], [x + 0.13, y + 0.18, z]]], { w: 0.9 }); };
  const notes = [note(-0.85, 0.25, 0.2, 0, false), note(0.55, 0.45, -0.2, 1, true), note(-0.35, 0.68, -0.1, 2, true), note(0.62, -0.35, 0.18, 3, false), note(0.05, -0.85, -0.15, 4, false)];
  const shape = assemble(P ? [grille, mesh, handle, collar, ...notes] : [grille, handle], n);
  const pts = colour(shape, { outline: mix(WARM, CYAN, 0.25), mesh: mix(WARM, CYAN, 0.35), collar: GOLD, handle: mix(WARM, VIOLET, 0.25) }, (p) => (p[1] > 0 ? GOLD : PINK));
  return { pts, live: (b, j, t, o) => {
    const tag = shape.tags[j];
    if (!P) { turn(o, t, -0.3, 0.28, 14); return; }
    if (tag === 'mesh') yaw(o, t * 0.5, MIC.head[0], 0);
    else if (tag.startsWith('note')) { const k = +tag.slice(4); o[1] += 0.05 * (ease(t + k * 0.4, 1.6) - ease(k * 0.4, 1.6)); o[3] = breathe(t, 1.6, k * 0.4); }
    turn(o, t, -0.3, 0.32, 13);
  } };
}

// ---------------------------------------------------------------- Cocktailglas ----------
// Kelch, Stiel und Fuß als Rotationskörper, darin die Oberfläche des Drinks als Ring, ein Strohhalm schräg im Glas und
// ein Fähnchen; das Glas dreht sich langsam, Licht läuft über den Drink.
export function cocktail(n, stufe) {
  const P = isPlus(stufe, n);
  const glass = revolve('glass', [0.15, 0], [[0.36, -1], [0.3, -0.98], [0.04, -0.93], [0.03, -0.6], [0.06, -0.52], [0.24, -0.4], [0.3, -0.2], [0.28, 0.0], [0.22, 0.22]], { meridians: 6, rings: [-1, 0.22], phase: 0.3 });
  const drink = curves('drink', [{ pts: Array.from({ length: 40 }, (_, i) => { const a = (i / 40) * TAU; return [0.15 + Math.cos(a) * 0.27, 0.06, Math.sin(a) * 0.27]; }), closed: true }], { w: 1.2 });
  const straw = curves('straw', [[[0.24, -0.32, 0.06], [0.34, 0.5, 0.1], [0.46, 0.62, 0.12]]], { w: 1.1 });
  // Schirmchen: ein flacher Kegel aus Speichen und Rand, schräg auf einem Stäbchen
  const umb = (p) => posed(p, 0.45, [-0.36, 0.62, -0.05]);
  const flag = curves('flag', [poseLine({ pts: [[0, -0.42, 0], [0, 0.12, 0]] }, 0.45, [-0.36, 0.62, -0.05]), { pts: Array.from({ length: 36 }, (_, i) => { const a = (i / 36) * TAU; return umb([Math.cos(a) * 0.3, 0.02 + 0.03 * Math.cos(a * 8), Math.sin(a) * 0.3]); }), closed: true },
    ...Array.from({ length: 8 }, (_, k) => { const a = (k / 8) * TAU; return [umb([0, 0.14, 0]), umb([Math.cos(a) * 0.3, 0.02, Math.sin(a) * 0.3])]; })], { w: 1.1 });
  const shape = assemble(P ? [glass, drink, straw, flag] : [glass, straw], n);
  const pts = colour(shape, { drink: GOLD, straw: RED, flag: (p) => (p[1] > 0.55 ? mix(RED, PINK, 0.3) : mix(GOLD, WARM, 0.4)) }, (p) => mix(WARM, CYAN, 0.3));
  return { pts, live: (b, j, t, o) => {
    const tag = shape.tags[j];
    if (!P) { turn(o, t, -0.3, 0.3, 14, 0.15, 0); return; }
    if (tag === 'drink') o[3] = glint(Math.atan2(b[2], b[0] - 0.15), t, 3.4, 0.5, -Math.PI, Math.PI);
    if (tag === 'flag') yaw(o, 0.5 * Math.sin((t * TAU) / 5), -0.36, -0.05);
    turn(o, t, -0.3, 0.38, 13, 0.15, 0);
  } };
}

// ---------------------------------------------------------------- Bierkrug ----------
// Ein bauchiger Krug als Rotationskörper mit Henkel (Röhre im Bogen), darüber eine Schaumkrone, die über den Rand quillt;
// Bläschen steigen als Licht auf.
export function bierkrug(n, stufe) {
  const P = isPlus(stufe, n);
  const mug = revolve('mug', [-0.3, 0], [[0.5, -0.95], [0.58, -0.86], [0.6, -0.2], [0.58, 0.55], [0.6, 0.62]], { meridians: P ? 8 : 4, rings: P ? [-0.95, -0.7, 0.62] : [-0.95, 0.62], phase: 0.2 });
  const handle = tube('handle', Array.from({ length: 13 }, (_, i) => { const a = -Math.PI / 2 + (i / 12) * Math.PI; return [0.28 + Math.cos(a) * 0.42, -0.15 + Math.sin(a) * 0.42, 0]; }), 0.07, { hoops: 2, crest: true, caps: [false, false] });
  const foam = curves('foam', [{ pts: Array.from({ length: 72 }, (_, i) => { const a = (i / 72) * TAU; return [-0.3 + Math.cos(a) * 0.63, 0.66 + 0.04 * Math.cos(a * 9), Math.sin(a) * 0.63]; }), closed: true },
    ...[[0.22, 0.8], [0.4, 0.88]].map(([r, y]) => ({ pts: Array.from({ length: 48 }, (_, i) => { const a = (i / 48) * TAU; return [-0.3 + Math.cos(a) * r * (1 + 0.06 * Math.sin(a * 5)), y + 0.03 * Math.sin(a * 7), Math.sin(a) * r]; }), closed: true })),
    { pts: Array.from({ length: 20 }, (_, i) => { const a = Math.PI * (i / 19); return [-0.3 + Math.cos(a) * 0.55, 0.66 + Math.sin(a) * 0.32, 0]; }) }], { w: 1 });
  const shape = assemble(P ? [mug, handle, foam] : [mug, handle], n);
  const pts = colour(shape, { foam: WARM, handle: mix(GOLD, WARM, 0.3) }, (p) => mix(GOLD, ORANGE, 0.3 - 0.3 * p[1]));
  return { pts, live: (b, j, t, o) => {
    if (!P) { turn(o, t, -0.35, 0.3, 14, -0.3, 0); return; }
    if (shape.tags[j] === 'mug') o[3] = chase(b[1], t, 0.35, 0.4, 0.85, 1.3);
    else if (shape.tags[j] === 'foam') o[3] = sparkle(j, t, 0.85, 1.25);
    turn(o, t, -0.35, 0.36, 13, -0.3, 0);
  } };
}
