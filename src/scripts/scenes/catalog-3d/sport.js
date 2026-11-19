// Runde 9 (Marc, 19.11.2026: „so nice wie du den Schneemann und das Lebkuchenmännchen gemacht hast, es ist crazy, wie
// schlecht im Vergleich dann dieser Fußballer ist“): der Fußballer als Körper nach der Methode der Katalogfiguren
// (docs/katalog-3d.md). Bisher war er eine flache Strichfigur aus einzelnen Linien (Kopfring, ein Stock als Rumpf,
// Arme als Einzelstriche), der Ball eine flache Scheibe, die beim Schuss durch das Bein flog und ohne Schwung losging.
//
// Jetzt: Kopf, Brust, Hose und Schuhe als Ellipsoide, Hals, Arme und Beine als Röhren mit Kammlinie (Volumen als Skelett,
// wie bei Lebkuchenmann und Schneemann), Hosensaum und Stutzen als Querschnitt-Reifen, Schultern und Hüften in der Tiefe
// auseinander. Die Figur blickt nach +x (Schussrichtung) und steht in Dreiviertelansicht zum Publikum. Bewegt wird sie
// über Gelenke (Vorwärtskinematik um die Gelenkpunkte der Bauhaltung), so dass ein Bein ein Bein bleibt.
//
// Ablauf nach der Referenz (Eisenhüttenstadt, anker-runde-2: Figur steht in Schusspose, das Bein waagerecht, der Ball
// steigt schräg nach oben und bremst ab, sein Muster dreht sich) und der vierzehnten Fassung (keine Finten): Die Figur
// steht in der Anlaufstellung, das Schussbein hinten, Spitze am Boden. Nach einer ruhigen Pause schwingt das Bein in
// einem Zug nach vorn bis fast in die Waagerechte, der Oberkörper lehnt sich zurück, der Gegenarm geht zur Balance
// hinaus. Der Fuß trifft den Ball von unten hinten; der Ball übernimmt den Schwung, steigt im Bogen, dreht sich und
// bremst bis zum Scheitel ab. Danach steht das Bild. Jedes Gelenk bewegt sich genau einmal in eine Richtung.
import { WARM, GOLD, ORANGE, CYAN, BLUE, mix, roll, pitch, yaw, breathe, wander } from '../../show-motion.js';
import { ellipsoid, tube, curves, assemble, colour, turn, rankBy, TAU } from './kit.js';

const GROUND = -0.92;
// Gelenkpunkte der Bauhaltung (Figurrahmen: x = Blickrichtung, y oben, z = zur Seite des Schussbeins, die zum Publikum
// zeigt). K = Schussbein- und Schussarmseite, S = Standbein- und Gegenarmseite.
const J = {
  waist: [0, 0.15, 0], neck: [0.005, 0.6, 0],
  hipK: [0, -0.02, 0.1], kneeK: [0.014, -0.45, 0.105], ankleK: [0, -0.845, 0.105],
  hipS: [0, -0.02, -0.1], kneeS: [0.014, -0.45, -0.105], ankleS: [0, -0.845, -0.105],
  // Runde 9b (Marc: „wirkt noch dürr, fast wie ein Skelett“): Schultern von Gelenk zu Gelenk gut zweimal so breit wie
  // der Kopf, Brust und Hose voller, Oberschenkel kräftig, Wade
  shK: [0, 0.5, 0.195], elK: [0, 0.235, 0.255], wrK: [0.02, -0.005, 0.285],
  shS: [0, 0.5, -0.195], elS: [0, 0.235, -0.255], wrS: [0.02, -0.005, -0.285],
};
const Z = 'z', X = 'x';
// Segmente: Elterngelenk und eigene Gelenke [Winkelname, Drehpunkt, Achse, Vorzeichen]. Drehung um z (roll): positiv =
// nach vorn bzw. für den Rumpf nach hinten gelehnt; um x (pitch) spreizt einen Arm vom Körper ab (Vorzeichen je Seite).
const SEG = {
  hose: { parent: null, joints: [] },
  rumpf: { parent: 'hose', joints: [['lean', J.waist, Z, 1]] },
  kopf: { parent: 'rumpf', joints: [['nod', J.neck, Z, 1]] },
  oarmK: { parent: 'rumpf', joints: [['abdK', J.shK, X, -1], ['armK', J.shK, Z, 1]] },
  uarmK: { parent: 'oarmK', joints: [['elbK', J.elK, Z, 1]] },
  oarmS: { parent: 'rumpf', joints: [['abdS', J.shS, X, 1], ['armS', J.shS, Z, 1]] },
  uarmS: { parent: 'oarmS', joints: [['elbS', J.elS, Z, 1]] },
  oschK: { parent: 'hose', joints: [['hipK', J.hipK, Z, 1]] },
  uschK: { parent: 'oschK', joints: [['kneeK', J.kneeK, Z, 1]] },
  schuhK: { parent: 'uschK', joints: [['footK', J.ankleK, Z, 1]] },
  oschS: { parent: 'hose', joints: [['hipS', J.hipS, Z, 1]] },
  uschS: { parent: 'oschS', joints: [['kneeS', J.kneeS, Z, 1]] },
  schuhS: { parent: 'uschS', joints: [['footS', J.ankleS, Z, 1]] },
};
/** Kette je Segment, innerstes Gelenk zuerst (wie rig() in show-motion.js, nur in 3D). */
const CHAIN = Object.fromEntries(Object.keys(SEG).map((s) => { const c = []; for (let q = s; q; q = SEG[q].parent) c.push(...SEG[q].joints); return [s, c]; }));
const ANGLES = [...new Set(Object.values(SEG).flatMap((s) => s.joints.map((j) => j[0])))];
/** Lage einer Drohne von Segment seg in der Haltung A (Winkel relativ zur Bauhaltung); o hält die Bauhaltung. */
function place(seg, A, o) {
  for (const [name, p, axis, sign] of CHAIN[seg]) {
    const a = (A[name] ?? 0) * sign;
    if (!a) continue;
    if (axis === Z) roll(o, a, p[0], p[1]); else pitch(o, a, p[1], p[2]);
  }
}

// Haltungen (Winkel relativ zur Bauhaltung, rad). Anlauf: Schussbein hinten mit leicht gebeugtem Knie, die Spitze am
// Boden; Oberkörper leicht über dem Ball; Gegenarm schon zur Balance abgespreizt. Durchschwung: Bein fast waagerecht,
// gestreckt, Spitze gestreckt; Oberkörper zurück; Gegenarm weit hinaus und nach vorn, Schussarm nach hinten.
export const POSES = {
  anlauf: { lean: -0.1, nod: 0.12, hipK: -0.36, kneeK: -0.34, footK: 0.22, hipS: -0.2, kneeS: -0.16, footS: 0.26, abdK: 0.3, armK: 0.3, elbK: 0.5, abdS: 0.75, armS: -0.25, elbS: 0.35 },
  schuss: { lean: 0.3, nod: -0.05, hipK: 1.38, kneeK: -0.02, footK: 0.55, hipS: -0.2, kneeS: -0.06, footS: 0.18, abdK: 0.55, armK: -0.75, elbK: 0.35, abdS: 1.2, armS: 0.4, elbS: 0.55 },
  stand: { lean: 0, nod: 0, hipK: 0.05, kneeK: -0.04, footK: 0, hipS: -0.03, kneeS: -0.03, footS: 0, abdK: 0.08, armK: -0.08, elbK: 0.25, abdS: 0.08, armS: 0.1, elbS: 0.25 },
  jubel: { lean: -0.04, nod: -0.12, hipK: 0.04, kneeK: -0.05, footK: 0, hipS: -0.04, kneeS: -0.05, footS: 0, abdK: 2.55, armK: 0.2, elbK: 0.35, abdS: 2.55, armS: 0.2, elbS: 0.35 },
};

const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : 0.5 - 0.5 * Math.cos(Math.PI * u));
/**
 * Der Schwung des Schussbeins als Geschwindigkeitsverlauf (wie ein echter Schuss): Das Bein beschleunigt weich aus dem
 * Stand (reach), wird beim Treffen langsamer, weil es seinen Schwung an den Ball abgibt (hit, auf den Anteil keep), und
 * schwingt danach ruhig aus (follow). Die Geschwindigkeit wird nie negativ: kein Ausholen, kein Zurückfedern.
 * Liefert den Anteil 0 → 1 des Wegs von der Anlauf- in die Schusshaltung und die Zeit, zu der der Fuß den Ball trifft.
 */
export const SWING = { start: 1.0, reach: 0.66, hit: 0.85, keep: 0.45, follow: 1.8 };
function swingOf({ start, reach, hit, keep, follow } = SWING) {
  const v = (t) => {
    const x = t - start;
    if (x <= 0) return 0;
    if (x < reach) return Math.sin((Math.PI / 2) * (x / reach)) ** 2;
    if (x < reach + hit) return keep + (1 - keep) * (0.5 + 0.5 * Math.cos(Math.PI * ((x - reach) / hit)));
    if (x < reach + hit + follow) return keep * (0.5 + 0.5 * Math.cos(Math.PI * ((x - reach - hit) / follow)));
    return 0;
  };
  const dt = 0.004, end = start + reach + hit + follow, table = [0];
  for (let t = start; t < end; t += dt) table.push(table[table.length - 1] + (v(t) + v(t + dt)) * dt / 2);
  const total = table[table.length - 1];
  const at = (t) => { if (t <= start) return 0; if (t >= end) return 1; const f = (t - start) / dt, i = Math.floor(f); return (table[i] + (table[i + 1] - table[i]) * (f - i)) / total; };
  return { at, contact: start + reach + hit * 0.5, end };
}
const SW = swingOf();
/** Zeitfenster der übrigen Gelenke (s ab Bildbeginn): Knie und Fuß strecken sich bis zum Treffen, Oberkörper und Arme
 * gleichen aus. Jedes Gelenk ein einziger weicher Weg von der Anlauf- in die Schusshaltung. */
export const KICK = { start: SWING.start, end: SW.end };
const WINDOW = { kneeK: [1.1, 1.95], footK: [1.15, 2.2], lean: [1.1, 3.1], nod: [1.1, 3.1], hipS: [1.0, 2.6], kneeS: [1.3, 2.9], footS: [1.0, 2.6], abdK: [1.0, 2.9], armK: [1.0, 3.0], elbK: [1.0, 2.9], abdS: [1.0, 3.0], armS: [1.0, 3.1], elbS: [1.0, 3.0] };
/** Haltung zur Zeit t im Schuss (vor dem Schwung Anlauf, danach Durchschwung). */
export function kickPose(t, A = {}, sw = SW) {
  for (const k of ANGLES) {
    const w = WINDOW[k], u = k === 'hipK' ? sw.at(t) : ease((t - w[0]) / (w[1] - w[0]));
    A[k] = POSES.anlauf[k] + (POSES.schuss[k] - POSES.anlauf[k]) * u;
  }
  return A;
}
export { swingOf };

/**
 * Der Körper in der Bauhaltung, genau n Drohnen: { pts [x, y, z, r, g, b], tags (Segment je Drohne), pose(j, A, o) }.
 * Das Skelett: Umrisse in der Bildebene, Kammlinien vorn, Reifen an Hosensaum, Stutzen und Kragen.
 */
export function spieler(n, { outline = false, kind = 'fussball', headWeight = 1.35 } = {}) {
  // outline: nur die Doppelkontur (2D-Fassung, wie FlyingStars dicke Glieder zeichnen), ohne Kamm, Reifen, Meridiane
  // Stufen nach Drohnenzahl (wie bei den Katalogkörpern): bis 300 Doppelkontur mit Reifen, ab 300 Kammlinien an den
  // Beinen und die Brustbreite, ab 400 Kammlinien auch an den Armen. Sonst reißen die Linien bei 250 Drohnen auf.
  const ridge = n >= 300 && !outline, dense = n >= 400 && !outline, hoop = (at) => (outline ? [] : at);
  const leg = (tag, a, b, r0, r1, hoopAt, caps) => tube(tag, [a, b], (s) => r0 + (r1 - r0) * s, { depth: 0.95, hoopAt: hoop(hoopAt), caps, crest: ridge });
  const arm = (tag, a, b, r0, r1, caps) => tube(tag, [a, b], (s) => r0 + (r1 - r0) * s, { depth: 0.9, hoops: 0, crest: dense, caps });
  const calf = (s) => 0.056 + 0.016 * Math.sin(Math.PI * Math.min(1, s / 0.75)) - 0.014 * s; // Wade, zum Knöchel schmal
  const parts = [
    // Kopf mit Haaransatz (schräger Breitenkreis, er zeigt, wohin der Kopf blickt); etwas kleiner als zuvor
    ellipsoid('kopf', [0.02, 0.75, 0], [0.096, 0.116, 0.092], { lat: hoop([0.3]), roll: -0.35, w: headWeight }),
    // Hals nur im Körper; in der Doppelkontur schnitte er den Kopfring auf
    ...(outline ? [] : [tube('kopf', [[0.004, 0.58, 0], [0.012, 0.65, 0]], 0.048, { hoops: 0, crest: false, caps: [false, false] })]),
    // Trikot: Profil, Schulterreifen und Saum (Breitenkreise zeigen die wahre Breite aus jedem Blickwinkel), ab 300 die
    // Brustbreite als Meridian quer zur Blickrichtung
    ellipsoid('rumpf', [0, 0.35, 0], [0.14, 0.24, 0.225], { lat: hoop([0.58, -0.5]), mer: hoop(ridge ? [Math.PI / 2] : []) }),
    // Hose: Profil und Breite; die Beinsäume sind die Reifen der Oberschenkel
    ellipsoid('hose', [0, 0.03, 0], [0.13, 0.14, 0.2], { lat: [], mer: hoop(ridge ? [Math.PI / 2] : []) }),
    leg('oschK', J.hipK, J.kneeK, 0.1, 0.066, [0.32], [false, true]), leg('oschS', J.hipS, J.kneeS, 0.1, 0.066, [0.32], [false, true]),
    tube('uschK', [J.kneeK, J.ankleK], calf, { depth: 0.95, hoopAt: hoop([0.22]), caps: [false, false], crest: ridge }),
    tube('uschS', [J.kneeS, J.ankleS], calf, { depth: 0.95, hoopAt: hoop([0.22]), caps: [false, false], crest: ridge }),
    ellipsoid('schuhK', [0.05, -0.882, J.ankleK[2]], [0.1, 0.042, 0.052], { lat: [] }), ellipsoid('schuhS', [0.05, -0.882, J.ankleS[2]], [0.1, 0.042, 0.052], { lat: [] }),
    arm('oarmK', J.shK, J.elK, 0.06, 0.05, [true, true]), arm('uarmK', J.elK, J.wrK, 0.049, 0.04, [false, true]),
    arm('oarmS', J.shS, J.elS, 0.06, 0.05, [true, true]), arm('uarmS', J.elS, J.wrS, 0.049, 0.04, [false, true]),
  ];
  const shape = assemble(parts, n);
  // Farben: Fußballer mit Trikot, Hose, Stutzen und Schuhen; der Springer nur mit Badehose (kurz, bis über die Saumreifen)
  const swim = kind === 'springer', shorts = swim ? mix(WARM, BLUE, 0.45) : mix(WARM, CYAN, 0.35), sock = mix(GOLD, ORANGE, 0.35), hem = swim ? -0.1 : -0.17;
  const pts = colour(shape, swim ? {
    hose: shorts, oschK: (p) => (p[1] > hem ? shorts : WARM), oschS: (p) => (p[1] > hem ? shorts : WARM),
  } : {
    hose: shorts,
    oschK: (p) => (p[1] > hem ? shorts : WARM), oschS: (p) => (p[1] > hem ? shorts : WARM),
    uschK: (p) => (p[1] < -0.53 ? sock : WARM), uschS: (p) => (p[1] < -0.53 ? sock : WARM),
    schuhK: GOLD, schuhS: GOLD,
  }, WARM);
  return { pts, tags: shape.tags, pose: (j, A, o) => place(shape.tags[j], A, o) };
}

/**
 * Ein Ball als Kugel: ruhiger Umriss, auf der Vorderfläche ein großes Fünfeck, Nähte zu den Ecken der Nachbarflecken
 * und deren äußere Kanten (wie der Ball in Eisenhüttenstadt, der eine dichte Fläche ist). Dreht sich das Muster, sieht
 * man den Drall. k Drohnen, Mitte im Ursprung. tags: 'rand' | 'muster'.
 */
export function ball(k, R) {
  const rim = ellipsoid('rand', [0, 0, 0], [R, R, R * 0.9], { lat: [], solid: false }); // Muster liegt auf der Fläche, nichts verdeckt
  // Muster auf der Kugel: Richtung um die Blickachse und Abstand von der Mitte (1 = Umriss)
  const on = (a, q) => { const th = q * (Math.PI / 2) * 0.92; return [Math.cos(a) * Math.sin(th) * R, Math.sin(a) * Math.sin(th) * R, Math.cos(th) * R * 0.9]; };
  const corner = Array.from({ length: 5 }, (_, i) => Math.PI / 2 + (i * TAU) / 5);
  const seg = (a0, q0, a1, q1, m = 4) => Array.from({ length: m + 1 }, (_, i) => on(a0 + (a1 - a0) * (i / m), q0 + (q1 - q0) * (i / m)));
  // je Ecke ein Linienzug: Fünfeckecke → Naht → Kante des Nachbarflecks (kurze Einzelstriche fielen bei wenigen Drohnen
  // als verlorene Einzelpunkte weg); die zweite Kante jedes Flecks kommt ab genug Drohnen dazu
  const P = 0.46, lines = [{ pts: corner.map((a) => on(a, P)), closed: true }, ...corner.map((a) => [...seg(a, P, a, 0.72, 2), ...seg(a, 0.72, a - 0.55, 0.98, 3).slice(1)])];
  if (k >= 44) lines.push(...corner.map((a) => seg(a, 0.72, a + 0.55, 0.98, 3)));
  const shape = assemble([rim, curves('muster', lines, { w: 1.1 })], k);
  return { pts: shape.pts, tags: shape.tags };
}

/**
 * Flug nach dem Schuss als Anteil 0 → 1 je Achse: Die Geschwindigkeit steigt in τr weich an (der Fuß gibt den Schwung
 * ab, ohne Ruck) und klingt dann ab wie durch Luftwiderstand (τd). Waagerecht klingt sie langsamer ab als senkrecht, so
 * biegt die Bahn zum Bogen und läuft flach aus; der Ball steigt und bremst, wie in der Referenz.
 */
function drag(tau, tr, td) {
  if (tau <= 0) return 0;
  const tc = 1 / (1 / tr + 1 / td);
  return (td * (1 - Math.exp(-tau / td)) - tc * (1 - Math.exp(-tau / tc))) / (td - tc);
}
export const FLIGHT = { rise: 0.43, x: 1.2, y: 0.8 };

/**
 * Das Bild „Der Spieler schießt“ (HORIZON): Spieler und Ball, genau n Drohnen. Liefert { pts, live, groups, hold,
 * fitPts, kickAt, ballAt(t) } in Szenenkoordinaten (Figurrahmen, um die Dreiviertelansicht gedreht).
 */
export const VIEW = { base: -0.62, amp: 0.22, period: 16 };
export function schuss(n, { R = 0.13, D = 1.4, H = 1.1, flight = FLIGHT, swing = SWING, margin = 0.025, hold = 6.6, view = VIEW, ballDrones, target, lift = 0.9 } = {}) {
  const k = ballDrones ?? Math.max(30, Math.round(n * 0.17)), body = spieler(n - k), b = ball(k, R);
  const sw = swing === SWING ? SW : swingOf(swing), A = {}, o = [0, 0, 0];
  // Ball vor dem Standbein, in der Spur des Schussbeins: dort, wo die Schuhspitze am tiefsten durchschwingt; sie trifft
  // ihn unten hinten und hebt ihn an
  const toeAt = (t) => { o[0] = 0.148; o[1] = -0.885; o[2] = J.ankleK[2]; place('schuhK', kickPose(t, A, sw), o); return [o[0], o[1]]; };
  let low = KICK.start, ly = Infinity;
  for (let t = KICK.start; t < KICK.end; t += 0.01) { const y = toeAt(t)[1]; if (y < ly) { ly = y; low = t; } }
  const [tx, ty] = toeAt(low), B0 = [tx + Math.sqrt(Math.max(0, R * R - (GROUND + R - ty) ** 2)) + 0.004, GROUND + R + 0.005, J.ankleK[2]];
  // Flug: ohne Ziel ein Bogen bis zum Scheitel (Weite D, Höhe H); mit Ziel (Szenenkoordinaten, z. B. das Tor) ein Bogen
  // dorthin, der um lift über die Gerade steigt. Das Ziel wird in den Figurrahmen zurückgedreht (Blick steht dann still).
  const T = target && (() => { const q = [target[0], target[1], target[2] ?? 0]; yaw(q, -view.base, 0.25, J.ankleK[2] * 0.5); return q; })();
  const K = T && [(B0[0] + T[0]) / 2, Math.max(B0[1], T[1]) + lift, (B0[2] + T[2]) / 2];
  const flyAt = T
    ? (t, t0) => { const u = drag(t - t0, flight.rise, flight.x); return [0, 1, 2].map((i) => (1 - u) ** 2 * B0[i] + 2 * (1 - u) * u * K[i] + u * u * T[i]); }
    : (t, t0) => [B0[0] + D * drag(t - t0, flight.rise, flight.x), B0[1] + H * drag(t - t0, flight.rise, flight.y), B0[2]];
  // Abflug so spät wie möglich, aber so, dass keine Drohne von Schuh oder Schienbein in den Ball eindringt
  const foot = body.pts.map((p, j) => [p, body.tags[j]]).filter(([, g]) => g === 'schuhK' || g === 'uschK').map(([p, g]) => [p[0], p[1], p[2], g]);
  // Fußdrohnen je Zeitschritt einmal stellen (die Haltung hängt nicht vom Abflug ab), dann jeden Abflug dagegen prüfen
  const STEP = 0.02, frames = [];
  for (let t = KICK.start; t <= KICK.end + 1e-9; t += STEP) { kickPose(t, A, sw); frames.push([t, foot.map(([x, y, z, g]) => { o[0] = x; o[1] = y; o[2] = z; place(g, A, o); return [o[0], o[1]]; })]); }
  const gap = (t0, from = KICK.start, to = KICK.end) => {
    let m = Infinity;
    for (const [t, fp] of frames) {
      if (t < from - 1e-9 || t > to + 1e-9) continue;
      const c = flyAt(t, t0);
      for (const q of fp) m = Math.min(m, Math.hypot(q[0] - c[0], q[1] - c[1]) - R);
    }
    return m;
  };
  let hit = KICK.start, clear = -Infinity;
  for (let t0 = KICK.end; t0 >= KICK.start; t0 -= 0.02) { clear = gap(t0); if (clear >= margin) { hit = t0; break; } }
  const ballAt = (t) => flyAt(t, hit);
  const built = [...body.pts, ...b.pts.map((p, j) => [p[0] + B0[0], p[1] + B0[1], p[2] + B0[2], ...(b.tags[j] === 'muster' ? mix(GOLD, WARM, 0.3) : GOLD)])];
  const m = body.pts.length, rank = rankBy(body.pts, (p) => -p[1] + 0.3 * p[0]);
  let at = NaN;
  // jede Drohne rechnet von ihrem Bauplatz aus; pts sind die Plätze zur Zeit 0 (Anlaufstellung, Ball am Boden)
  const live = (base, j, t, out) => {
    if (j < m) {
      const r = built[j]; out[0] = r[0]; out[1] = r[1]; out[2] = r[2];
      if (t !== at) { at = t; kickPose(t, A, sw); }
      body.pose(j, A, out);
      const tag = body.tags[j];
      // der Fuß leuchtet auf, wenn er den Ball trifft; sonst wandert ein ruhiges Licht über den Körper
      out[3] = tag === 'schuhK' ? 1 + 0.8 * Math.exp(-(((t - low) / 0.25) ** 2)) : wander(rank[j], t, 7, 0.2, 0.1);
    } else {
      const q = j - m, c = ballAt(t), r = b.pts[q];
      out[0] = r[0]; out[1] = r[1]; out[2] = r[2];
      if (b.tags[q] === 'muster') roll(out, 0.75 * TAU * drag(t - hit, flight.rise, flight.x)); // Rückwärtsdrall, läuft mit dem Flug aus
      out[0] += c[0]; out[1] += c[1]; out[2] += c[2];
      out[3] = 1 + 0.5 * Math.exp(-(((t - low) / 0.3) ** 2));
    }
    turn(out, t, view.base, view.amp, view.period, 0.25, J.ankleK[2] * 0.5);
  };
  const pts = built.map((p, j) => { const q = [p[0], p[1], p[2], 1]; live(p, j, 0, q); return [q[0], q[1], q[2], p[3], p[4], p[5]]; });
  // im Bild bleibt, was Figur und Ball während des ganzen Schusses überstreichen
  const fitPts = [0, 1.6, 2.2, 3, 4.5, hold].flatMap((t) => built.map((p, j) => { const q = [p[0], p[1], p[2], 1]; live(p, j, t, q); return q.slice(0, 3); }));
  // für Geschichten: Fortschritt des Flugs (0 → 1), Zeit nach dem Abflug zu einem Fortschritt, Ballmitte wie gesehen
  const progress = (t) => drag(t - hit, flight.rise, flight.x);
  const timeFor = (u) => { let lo = 0, hi = 20; for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (drag(mid, flight.rise, flight.x) < u) lo = mid; else hi = mid; } return hi; };
  const ballSeen = (t) => { const q = ballAt(t); turn(q, t, view.base, view.amp, view.period, 0.25, J.ankleK[2] * 0.5); return q; };
  return { pts, live, hold, fitPts, kickAt: hit, low, contact: sw.contact, clear, touch: gap(hit, hit - STEP / 2, hit + STEP / 2), ballAt, ballSeen, progress, timeFor, groups: [{ name: 'player', count: m, rigid: false }, { name: 'ball', count: n - m, rigid: false }] };
}

/** Ein ruhiges Standbild in Haltung name (oder Winkelobjekt), in der Dreiviertelansicht (für Geschichten). */
export function pose(n, name, { view = VIEW, outline = false } = {}) {
  const body = spieler(n, { outline }), A = POSES[name] ?? name;
  return body.pts.map((p, j) => { const o = [p[0], p[1], p[2], 1]; body.pose(j, A, o); turn(o, 0, view.base, 0, view.period, 0.25, J.ankleK[2] * 0.5); return [o[0], o[1], o[2], p[3], p[4], p[5]]; });
}

/**
 * Die 2D-Fassung (SPARK) nach der Referenz aus Eisenhüttenstadt: Der Spieler steht im Durchschwung (Bein fast
 * waagerecht), nur als Doppelkontur und flach in der Bildebene; der Ball ist gerade vom Fuß weg, steigt schräg nach
 * oben, bremst ab, sein Muster dreht sich und kommt mit ihm zur Ruhe. n Drohnen.
 */
export function schuss2d(n, { R = 0.13, hold = 6 } = {}) {
  const k = Math.max(30, Math.round(n * 0.2)), m = n - k, A = POSES.schuss;
  const flat = (o) => { turn(o, 0, -0.5, 0, 1, 0.25, 0); o[2] = 0; return o; };
  const sp = spieler(m, { outline: true });
  const player = sp.pts.map((p, j) => { const o = [p[0], p[1], p[2], 1]; sp.pose(j, A, o); flat(o); return [o[0], o[1], 0, p[3], p[4], p[5]]; });
  // Ball vor der Schuhspitze, ein Stück darüber; er steigt um (0,55 | 0,5) und bremst bis zum Stand
  const toe = [0.148, -0.885, J.ankleK[2], 1]; place('schuhK', A, toe); flat(toe);
  const C = [toe[0] + R * 1.6, toe[1] + R * 1.5], b = ball(k, R), ballPts = b.pts.map((p, j) => [C[0] + p[0], C[1] + p[1], 0, ...(b.tags[j] === 'muster' ? mix(GOLD, WARM, 0.3) : GOLD)]);
  const pts = [...player, ...ballPts], rank = rankBy(player, (p) => -p[1] + 0.3 * p[0]);
  const live = (base, j, t, o) => {
    if (j < m) { o[3] = wander(rank[j], t, 7, 0.2, 0.1); return; }
    const q = j - m, u = drag(t, 0.5, 1.6), r = b.pts[q];
    o[0] = r[0]; o[1] = r[1]; o[2] = 0;
    if (b.tags[q] === 'muster') roll(o, 0.9 * TAU * u);
    o[0] += C[0] + 0.55 * u; o[1] += C[1] + 0.5 * drag(t, 0.5, 1.1); o[3] = breathe(t, 3);
  };
  const fitPts = [0, hold].flatMap((t) => pts.map((p, j) => { const o = [p[0], p[1], p[2], 1]; live(p, j, t, o); return o.slice(0, 3); }));
  return { pts, live, hold, fitPts, groups: [{ name: 'player', count: m, rigid: false }, { name: 'ball', count: k, rigid: false }] };
}

// ---------------------------------------------------------------- Springer (Kopfsprung) ----------
// Runde 9b (Marc: „gleiche Klasse, gleiche Bauweise“): der Springer ist derselbe Körper wie der Fußballer, mit Badehose,
// die Arme gestreckt über dem Kopf (Hände zusammen: die Spitze, die ins Wasser schneidet), die Beine geschlossen. Er
// nimmt die Gelenkwinkel der bisherigen Strichfigur entgegen, damit Bahn und Takt des Sprungs in scenes/jubilaeum.js
// bleiben, wie sie sind (Finten-Wächter): g = { torso, arms, thigh, shin, foot } in rad, torso und arms negativ = zum
// Bauch, thigh positiv = Knie nach vorn, shin negativ = Unterschenkel zurück, foot FLAT = Fuß steht flach (0 = Spitze).
// Lage wie bisher: Hüfte bei c, Körperachse unter dem Winkel a (0 = Hände nach rechts, π/2 = aufrecht), Bauch auf der
// Seite −y. Der Körper ist um seine Längsachse zum Publikum gedreht (spin), so sieht man Brust und Schultern.
const FLAT = Math.PI / 2, OVERHEAD = Math.PI - 0.06, DIVE = 1.2, HIP_Y = -0.02;
const tipOf = (el, wr, d) => { const v = [wr[0] - el[0], wr[1] - el[1], wr[2] - el[2]], L = Math.hypot(...v); return wr.map((q, i) => q + (v[i] / L) * d); };
const HAND = tipOf(J.elK, J.wrK, 0.06), SOLE = [0.06, -0.924, J.ankleK[2]];
export function springer(n, { S = 1, spin = 0.95 } = {}) {
  // Kopf dichter besetzt: zwischen den gestreckten Armen soll er als eigener Ring lesbar bleiben
  const body = spieler(n, { kind: 'springer', outline: n < 140, headWeight: 1.6 }), k = DIVE * S, A = {};
  const angles = (g) => {
    A.lean = g.torso; A.nod = 0; A.abdK = A.abdS = -0.36; A.armK = A.armS = OVERHEAD + g.arms; A.elbK = A.elbS = 0;
    A.hipK = A.hipS = g.thigh; A.kneeK = A.kneeS = g.shin; A.footK = A.footS = -1.1 * (1 - g.foot / FLAT);
    return A;
  };
  const toScene = (o, c, a) => { o[1] -= HIP_Y; yaw(o, spin); o[0] *= k; o[1] *= k; o[2] *= k; roll(o, a - Math.PI / 2); o[0] += c[0]; o[1] += c[1]; o[2] += c[2] ?? 0; return o; };
  const mark = (q, seg, g, c, a) => { const o = [q[0], q[1], q[2], 1]; place(seg, angles(g), o); return toScene(o, c, a); };
  return {
    pts: body.pts,
    /** Drohne j in Haltung g, Hüfte bei c, Körperwinkel a → [x, y, z] */
    at: (j, g, c, a) => mark(body.pts[j], body.tags[j], g, c, a).slice(0, 3),
    /** Spitze der Hände (trifft das Wasser zuerst) und Sohle (steht auf dem Brett) in derselben Lage */
    hand: (g, c, a) => mark(HAND, 'uarmK', g, c, a).slice(0, 3),
    sole: (g, c, a) => mark(SOLE, 'schuhK', g, c, a).slice(0, 3),
  };
}

export { GROUND, ball as fussball3d };
/** Register der Sportfiguren (keine Katalogmotive, darum nicht in CATALOG_3D): Fassung → (n) → Bild. */
export const SPORT_3D = { schuss, schuss2d, springer };
