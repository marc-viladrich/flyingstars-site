// Drone field of the show configurator: one dot per drone, flown like a real show (see show-flight.js; the physics
// test in tests/show-physics.spec.ts checks every scene).
//
// A scene is { beats: [beat, …], loopTo? }. A beat is { pts, groups?, live?, hold?, caption?, lift?, swirl?,
// shimmer? }: pts are resting places [x, y, z, r, g, b] in the scene's own units; groups name consecutive parts of
// pts ({ name, count, rigid? }). Object permanence: a drone keeps its group from beat to beat (the rocket stays the
// rocket, the arrow stays the arrow); a rigid group flies as one piece, keeping every drone's place within it. Only
// drones whose part ends or begins are reassigned, by optimal assignment. live(base, index, t, out) moves a drone
// around its resting place and sets its light; out = [x, y, z, alpha]. Transitions follow the client's Vercel
// prototype: staggered starts, drones joining fly in from outside like shooting stars, drones leaving fly out.
// A beat may name fitPts (the points that must stay in view; parts that leave the picture are left out).
// A sequence of motifs is one scene: beats carry their motif as segment (one scale per motif, optionally split by a
// named frame). The render loop stops when nothing moves; paused or reduced motion shows the motif at rest.
//
// Zwölfte Fassung (30.10.2026):
// - Virtuelle Show-Uhr: alle Zeiten laufen über `vt`, das nur die Render-Schleife vorrückt (mal Tempofaktor). Pause
//   friert das exakte Bild ein, statt ein fertiges Motiv zu zeigen; setRate() ändert das Tempo.
// - Lebendige Wolke (beat.cloud, nur beim automatischen Weiterlaufen): gestaffelter Start je Drohne nach ihrer Stelle
//   im Lichtlauf, gekrümmte quadratische Bézier-Bahn über einen zufälligen Mittelpunkt (auch in der Tiefe), im Flug
//   gedimmt mit deterministischem Funkeln; die Form schaltet sich erst beim Ankommen ein.
// - Grundhelligkeit und Lichtlauf: siehe lift() und runLight() in show-tempo.js.
//
// Dreizehnte Fassung (Marc, 30.10.2026):
// - Teil-Umbau als lebendige Wolke: beat.cloud darf eine Liste von Teilnamen sein. Dann fliegen nur die Drohnen dieser
//   Teile durch die Wolke, der stehende Rest (Buchdeckel, Vorhang, Hand) fliegt normal und bleibt ruhig.
// - Der Lichtlauf kommt nur noch dort, wo buildSequence() beat.run gesetzt hat (Linien und Konturen ohne eigenes Licht).
// - show(…, { cloud: true }) erreicht ein Bild auch auf Klick durch die Wolke (Freischalten eines Motivs am Regler).
//
// Vierzehnte Fassung (Marc, 30.10.2026 abends):
// - Der Rücksprung vom letzten zum ersten Bild läuft immer durch die lebendige Wolke (step()); den Wechsel des Anlasses
//   schickt der Konfigurator mit show(…, { cloud: true }) ebenfalls hindurch.
// - Lichtlauf und Staffelung der Wolke folgen den Linien der Form (rankOf() → lightOrder(), show-tempo.js).
import { assign, flightTime, along, ease, LIMITS } from "./show-flight.js";
import { TEMPO, lift, runLight, rankOf, hilbertOrder } from "./show-tempo.js";

const MAX = 1000;
const TILT = 0.14, TILT_C = Math.cos(TILT), TILT_S = Math.sin(TILT); // Kippung der Bühne (render), auch für die Wolkenbahnen
const hash = (x) => { const s = Math.sin(x * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); };
/** Outside place of drone i (display units): where drones join from and leave to, dark when idle. */
const outside = (i, out) => {
  const a = hash(i) * Math.PI * 2, r = 1.2 + 0.2 * hash(i + 0.5);
  out[0] = Math.cos(a) * r * 1.1; out[1] = Math.sin(a) * r * 0.75; out[2] = (hash(i + 0.25) - 0.5) * 0.8; return out;
};

// Sechzehnte Fassung, Startseiten-Showreel (additiv, der Konfigurator setzt nichts davon): cloudTime und cloudSpread
// verkürzen bzw. beruhigen die lebendige Wolke (Mindestdauer bzw. Versatz der Bahn-Mittelpunkte, 1 = wie bisher); ein
// Bild darf mit `drones` eine eigene Drohnenzahl für die Größe der Lichter nennen (Schärfe-Effekt beim Logo), die
// Lichtgröße folgt dann in kleinen Stufen über etwa eine halbe Sekunde, ohne zu springen.
export function createField(canvas, { onBeat, onTick, cloudTime = 1, cloudSpread = 1 } = {}) {
  const ctx = canvas.getContext("2d");
  const reduceQuery = matchMedia("(prefers-reduced-motion: reduce)");
  const pos = new Float64Array(MAX * 3), col = new Float32Array(MAX * 3), alpha = new Float32Array(MAX), vel = new Float64Array(MAX * 3);
  const from = new Float64Array(MAX * 3), fromCol = new Float32Array(MAX * 3), fromAlpha = new Float32Array(MAX), fromVel = new Float64Array(MAX * 3);
  const delay = new Float32Array(MAX), prev = new Float64Array(MAX * 3), flowOf = new Float32Array(MAX);
  const groupOf = new Array(MAX).fill(""), localOf = new Int32Array(MAX);
  const mid = new Float64Array(MAX * 3), rankNow = new Float32Array(MAX); // Wolke: Mittelpunkt der Bahn, Stelle im Lichtlauf
  const inCloud = new Uint8Array(MAX); // diese Drohne fliegt im laufenden Übergang durch die lebendige Wolke
  const spot = [0, 0, 0], out = [0, 0, 0], live = [0, 0, 0, 1], rest = [0, 0, 0, 1];
  for (let i = 0; i < MAX; i++) { outside(i, spot); pos.set(spot, i * 3); col.set([246, 241, 232], i * 3); }
  let W = 0, H = 0, DPR = 1, frame = 0, visible = true, lastT = 0;
  let scene = null, beat = 0, beatAt = 0, flight = 0, spread = 0, order = null, active = 0, leaveEnd = 0, size = 1, fitK = 1, fitX = 0, fitY = 0;
  const glow = new Map();
  const held = () => reduceQuery.matches || document.documentElement.classList.contains("motion-paused") || document.hidden;
  // Show-Uhr: vt rückt nur in der Render-Schleife vor, um die echte Zeit seit dem letzten Bild mal rate (höchstens
  // 0,1 s je Bild, damit ein ruckelndes Gerät die Show verlangsamt statt springen lässt)
  let droneCount = 300, radNow = 0, radAt = 0; // Drohnenzahl der Show (Größe der Lichter), aktuelle Lichtgröße
  let vt = 0, lastReal = 0, rate = 1, userPaused = false, cloud = false, settled = 0, flightN = 0, flightC = 0;
  const now = () => vt;
  const still = () => held() || userPaused;

  function resize() {
    DPR = Math.min(1.5, devicePixelRatio || 1);
    const r = canvas.getBoundingClientRect(); W = r.width; H = r.height;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    render();
  }
  // Lichtpunkte wie in der Designsprache-Probe (fünfzehnte Fassung, Marc: „weniger hochwertig als die Probe-Seite“;
  // Swarm.draw()/sprite() der früheren Designsprache-Probe): ein vorgerendertes Sprite je Farbe und Größe, klarer Kern (voll
  // bis 0,8 r, aufgehellt), schmaler Übergang auf einen schwachen Hof (0,24 bei 1,15 r, aus bei 3,4 r). Licht über 1
  // (Lichtlauf, Funkeln) legt ein zweites Sprite darüber: weißer Kern, weiterer Schein in der Drohnenfarbe. Vorher war
  // jede Drohne ein voller Kreis von etwa 3 px plus ein Hof von 10 px mit 35 % Deckkraft: groß, weich, verschwommen.
  // Sechzehnte Fassung, Leistung (Marc, 31.10.2026: „die Seite hängt, nachdem der Teaser eine Weile läuft“): Im Flug
  // werden die Farben stetig zwischen altem und neuem Motiv überblendet. Mit 32 Stufen je Kanal entstand dabei laufend
  // ein neuer Schlüssel, bei 4000 Sprites wurde der Speicher ganz geleert und neu gefüllt: gemessen rund 145 neue
  // Canvas-Elemente je Sekunde, in WebKit 500–900 MB statt 250–300 MB. Jetzt 16 Stufen je Kanal (Abweichung höchstens
  // 8/255, auf einem leuchtenden Punkt unsichtbar), das Sprite in der Mitte seiner Stufe, und bei vollem Speicher fallen
  // nur die ältesten Einträge heraus.
  function sprite(r, g, b, rad, hot, halo = 3.4) {
    const qr = r >> 4, qg = g >> 4, qb = b >> 4, key = ((((qr * 16 + qg) * 16 + qb) * 2 + (hot ? 1 : 0)) * 1e4) + Math.round(rad * 40) * 10 + Math.round(halo * 2);
    let s = glow.get(key); if (s) return s;
    r = Math.min(255, qr * 16 + 8); g = Math.min(255, qg * 16 + 8); b = Math.min(255, qb * 16 + 8);
    const R = Math.ceil(rad * (hot ? halo * 1.47 : halo)), c = document.createElement("canvas");
    c.width = c.height = R * 2;
    const x = c.getContext("2d"), up = (v) => Math.min(255, v + 70), gr = x.createRadialGradient(R, R, 0, R, R, R);
    if (hot) { gr.addColorStop(0, "rgba(255,255,255,0.95)"); gr.addColorStop(rad / R, `rgba(${up(r)},${up(g)},${up(b)},0.55)`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`); }
    else {
      const core = `rgb(${up(r)},${up(g)},${up(b)})`;
      gr.addColorStop(0, core); gr.addColorStop((rad * 0.8) / R, core);
      gr.addColorStop((rad * 1.15) / R, `rgba(${r},${g},${b},0.24)`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
    }
    x.fillStyle = gr; x.fillRect(0, 0, R * 2, R * 2);
    s = { c, R };
    if (glow.size >= 6000) { let drop = 500; for (const k of glow.keys()) { glow.delete(k); if (--drop <= 0) break; } } // die ältesten zuerst
    glow.set(key, s);
    return s;
  }
  /** Radius eines Lichts in Gerätepixeln: wie in der Probe 2,1 px bis 300 Drohnen (bis dahin wächst das Bild mit der
   * Drohnenzahl, der Abstand bleibt gleich), darüber kleiner, weil das Bild dichter wird (bei 600 etwa 1,6 px wie in
   * Studie 1). Kleine Bilder (Handy) bekommen kleinere Lichter, sonst laufen die Höfe dichter Formationen zu Flecken
   * zusammen: gemessen am Bildmaßstab S (CSS-Pixel), voll ab S = 250 (Desktop-Bühnen liegen bei 300–500). */
  // Sechzehnte Fassung (Marc, 31.10.2026: „ein Stückchen größer … dann erkennt man die Motive besser und sie wirken
  // eindrucksvoller“): Grundgröße 2,5 statt 2,1 px, und auf großen Bühnen wachsen die Lichter wieder mit, gedämpft mit
  // der Wurzel des Bildmaßstabs. Gemessen an einer 1440er Bühne (S ≈ 330): Fassung 14 ≈ 2,8 px (S × 0,0085), Fassung 15
  // 2,1 px, jetzt ≈ 2,6 px; bei 2560 px (S ≈ 690) 5,8 / 2,1 / 3,8 px. Kern und weicher Hof bleiben wie in Fassung 15.
  function dotRadius(n, S) {
    const dense = Math.min(1, Math.max(0.76, Math.sqrt(300 / Math.max(1, n)))), fitStage = Math.min(1, Math.max(0.45, S / 250));
    const base = 2.5 * Math.sqrt(Math.max(1, S / 300));
    return Math.max(1, Math.round(base * dense * fitStage * DPR * 4) / 4);
  }
  /** Reichweite des Hofs in Kernradien: 3,4 wie in der Probe; auf kleinen Bildern kürzer (bis 2), weil die Lichter dort
   * so dicht stehen, dass sich die Höfe sonst zu einer Fläche addieren. */
  const haloOf = (S) => Math.round(Math.min(3.4, Math.max(2, 3.4 * (S / 250))) * 5) / 5;

  /** One scale per motif (beats with the same segment, optionally split by a named frame), so a story keeps its
   * proportions and every motif of a sequence fills the stage. */
  function fit(beats) {
    const segments = new Map();
    for (const b of beats) { const key = `${b.segment ?? 0}|${b.frame ?? ""}`; if (!segments.has(key)) segments.set(key, []); segments.get(key).push(b); }
    for (const list of segments.values()) {
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const b of list) for (const p of b.fitPts ?? b.pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
      // zoom: a picture may ask to fill more of the stage than its drone count would give it (the wide glitter band)
      const f = { x: (x0 + x1) / 2, y: (y0 + y1) / 2, k: ((list.some((b) => b.live) ? 0.9 : 1) * (list[0].zoom ?? 1)) / Math.max((x1 - x0) / 2 / 1.15, (y1 - y0) / 2 / 0.75, 1e-6) };
      for (const b of list) b.fit = f;
    }
  }
  const useFit = (b) => { fitK = b.fit.k; fitX = b.fit.x; fitY = b.fit.y; };
  /** The last beat of the motif that beat k belongs to: where a paused view rests. */
  const motifEnd = (k) => { let e = k; while (e + 1 < scene.beats.length && (scene.beats[e + 1].segment ?? 0) === (scene.beats[k].segment ?? 0)) e++; return e; };
  const groupsOf = (b) => b.groups ?? [{ name: "*", count: b.pts.length }];

  /** Where drone i of the current beat rests at time t (live motion and shimmer included), display units → rest. */
  function restAt(i, t) {
    const b = scene.beats[beat], j = order[i], p = b.pts[j];
    let x = p[0], y = p[1], z = p[2] || 0, a = 1;
    if (b.live) { live[0] = x; live[1] = y; live[2] = z; live[3] = 1; b.live(p, j, t - beatAt - flight - spread, live); x = live[0]; y = live[1]; z = live[2]; a = live[3]; }
    rest[0] = (x - fitX) * fitK * size; rest[1] = (y - fitY) * fitK * size; rest[2] = z * fitK * size;
    // volle Grundhelligkeit, Effekte nur obendrauf; der Lichtlauf läuft entlang der Form (ersetzt den diagonalen Schimmer)
    a = lift(a);
    if (b.run === true && a >= 1) a += runLight(rankOf(b)[j], t - beatAt - flight - spread, b.runLight); // b.runLight: eigener Lauf (Logo)
    rest[3] = a;
    return rest;
  }

  /** Assigns the drones of the new beat to its places, keeping every drone in its group where the group continues.
   * loose: true = the whole picture is reached through the living cloud; a Set of part names = only these parts are
   * (their drones are matched in Hilbert order, the parts that stay keep their drones as before). */
  function assignPlaces(b, n, target, loose = false) {
    order = new Int32Array(n).fill(-1);
    const taken = new Uint8Array(n);
    const partial = loose instanceof Set ? loose : null;
    let start = 0;
    if (loose === true) {
      // lebendige Wolke: die Bahnen sind ohnehin gekrümmt und gestaffelt, Kreuzungen fallen nicht auf. Statt der optimalen
      // Zuordnung (O(n³), bei 600 Drohnen ein spürbarer Hänger) verbindet die Hilbert-Reihenfolge der jetzigen Positionen
      // die Plätze in Lichtlauf-Reihenfolge (O(n log n)); benachbarte Drohnen landen weiterhin benachbart.
      const drones = hilbertOrder(n, (i) => pos[i * 3], (i) => pos[i * 3 + 1]), slots = hilbertOrder(n, (j) => target[j * 3], (j) => target[j * 3 + 1]);
      drones.forEach((i, r) => { order[i] = slots[r]; taken[slots[r]] = 1; });
    }
    if (loose !== true) for (const g of groupsOf(b)) {
      if (partial?.has(g.name)) { start += g.count; continue; } // rebuilt through the cloud: its drones are free
      const drones = [];
      for (let i = 0; i < n; i++) if (groupOf[i] === g.name && order[i] < 0) drones.push(i);
      const sameShape = g.rigid && drones.length === g.count && drones.every((i) => localOf[i] < g.count) && new Set(drones.map((i) => localOf[i])).size === g.count;
      if (sameShape) for (const i of drones) { order[i] = start + localOf[i]; taken[start + localOf[i]] = 1; }
      else if (drones.length && g.count) {
        const slots = Array.from({ length: g.count }, (_, k) => start + k);
        const pick = (list, src) => Float64Array.from(list.flatMap((k) => [src[k * 3], src[k * 3 + 1], src[k * 3 + 2]]));
        if (drones.length <= slots.length) { const m = assign(pick(drones, pos), pick(slots, target)); drones.forEach((i, r) => { order[i] = slots[m[r]]; taken[slots[m[r]]] = 1; }); }
        else { const m = assign(pick(slots, target), pick(drones, pos)); slots.forEach((s, r) => { order[drones[m[r]]] = s; taken[s] = 1; }); }
      }
      start += g.count;
    }
    // everything else: drones whose part ended, drones joining, places of parts that begin
    let freeDrones = [], freeSlots = [];
    for (let i = 0; i < n; i++) { if (order[i] < 0) freeDrones.push(i); if (!taken[i]) freeSlots.push(i); }
    const pick = (list, src) => Float64Array.from(list.flatMap((k) => [src[k * 3], src[k * 3 + 1], src[k * 3 + 2]]));
    if (partial && freeDrones.length) {
      // places of the parts that stay first (optimal, few), the rest of the free drones flies to the rebuilt parts
      const owner = [];
      for (const g of groupsOf(b)) for (let k = 0; k < g.count; k++) owner.push(g.name);
      const cloudSlots = freeSlots.filter((j) => partial.has(owner[j])), otherSlots = freeSlots.filter((j) => !partial.has(owner[j]));
      let rest = freeDrones;
      if (otherSlots.length) {
        const m = assign(pick(otherSlots, target), pick(freeDrones, pos)), used = new Set();
        otherSlots.forEach((s, r) => { order[freeDrones[m[r]]] = s; used.add(freeDrones[m[r]]); });
        rest = freeDrones.filter((i) => !used.has(i));
      }
      const drones = hilbertOrder(rest.length, (r) => pos[rest[r] * 3], (r) => pos[rest[r] * 3 + 1]), slots = hilbertOrder(cloudSlots.length, (r) => target[cloudSlots[r] * 3], (r) => target[cloudSlots[r] * 3 + 1]);
      drones.forEach((r, q) => { order[rest[r]] = cloudSlots[slots[q]]; });
      freeDrones = [];
    }
    if (freeDrones.length) {
      const m = assign(pick(freeDrones, pos), pick(freeSlots, target));
      freeDrones.forEach((i, r) => { order[i] = freeSlots[m[r]]; });
    }
    // remember each drone's part for the next beat
    start = 0;
    const owner = new Array(n), local = new Int32Array(n);
    for (const g of groupsOf(b)) { for (let k = 0; k < g.count; k++) { owner[start + k] = g; local[start + k] = k; } start += g.count; }
    for (let i = 0; i < n; i++) { const g = owner[order[i]]; groupOf[i] = g.name; localOf[i] = local[order[i]]; flowOf[i] = g.rigid ? 0 : 1; }
  }

  /** auto: the show moves on by itself (slower flights, the living cloud where the beat asks for it); otherwise a
   * visitor's click, which answers quickly. viaCloud: reach this beat through the living cloud also on a click. */
  function startBeat(k, t, auto = false, viaCloud = false) {
    // bring every drone to where it is now: time may have passed since the last frame (slow device, async build)
    if (lastT && t > lastT) { for (let q = 0; q < MAX * 3; q++) pos[q] += vel[q] * (t - lastT); lastT = t; }
    beat = k; beatAt = t; settled = 0;
    const b = scene.beats[k], n = b.pts.length, target = new Float64Array(n * 3);
    useFit(b);
    for (let j = 0; j < n; j++) { const p = b.pts[j]; target[j * 3] = (p[0] - fitX) * fitK * size; target[j * 3 + 1] = (p[1] - fitY) * fitK * size; target[j * 3 + 2] = (p[2] || 0) * fitK * size; }
    // drones joining come from outside (dark there); every drone beyond this beat that is still lit flies out
    for (let i = active; i < n; i++) if (alpha[i] < 0.02) { outside(i, spot); pos.set(spot, i * 3); vel.fill(0, i * 3, i * 3 + 3); groupOf[i] = ""; }
    leaveEnd = n;
    for (let i = n; i < MAX; i++) if (alpha[i] > 0.01) leaveEnd = i + 1;
    active = n;
    // lebendige Wolke: das ganze Bild (cloud: true) oder nur die genannten Teile (cloud: ["star"], Teil-Umbau)
    const want = !held() && !userPaused && (viaCloud ? true : auto ? b.cloud : null);
    const parts = Array.isArray(want) ? new Set(want) : null;
    cloud = Boolean(want);
    assignPlaces(b, n, target, parts ?? cloud);
    inCloud.fill(0);
    if (cloud) for (let i = 0; i < n; i++) inCloud[i] = parts ? (parts.has(groupOf[i]) ? 1 : 0) : 1;
    from.set(pos); fromCol.set(col); fromAlpha.set(alpha); fromVel.set(vel);
    // flight time from the longest path of the drones that fly normally, the starts staggered for drones that do not
    // belong to a rigid part
    const ordered = new Float64Array(n * 3), plain = [];
    for (let i = 0; i < n; i++) { const j = order[i]; ordered[i * 3] = target[j * 3]; ordered[i * 3 + 1] = target[j * 3 + 1]; ordered[i * 3 + 2] = target[j * 3 + 2]; if (!inCloud[i]) plain.push(i); }
    let longest = plain.length ? flightTime(Float64Array.from(plain.flatMap((i) => [from[i * 3], from[i * 3 + 1], from[i * 3 + 2]])), Float64Array.from(plain.flatMap((i) => [ordered[i * 3], ordered[i * 3 + 1], ordered[i * 3 + 2]])), Int32Array.from(plain, (_, r) => r), ...(auto ? [TEMPO.flight.min, TEMPO.flight.max] : [])) : 0;
    let back = 0;
    for (let i = n; i < leaveEnd; i++) { outside(i, spot); back = Math.max(back, Math.hypot(from[i * 3] - spot[0], from[i * 3 + 1] - spot[1], from[i * 3 + 2] - spot[2])); }
    if (back) longest = Math.max(longest, flightTime(Float64Array.of(0, 0, 0), Float64Array.of(back, 0, 0), [0]));
    // drones that still move fast from the last picture's own motion (a leaping dolphin, a beating wing) carry that
    // velocity into the flight and shed it over the flight (Hermite term in step: peak deceleration 4·v/flight), so
    // the flight lasts long enough to shed it gently
    let carried = 0;
    for (let i = 0; i < leaveEnd; i++) carried = Math.max(carried, Math.hypot(vel[i * 3], vel[i * 3 + 1], vel[i * 3 + 2]));
    flightN = still() ? 0 : Math.max(longest, b.minFlight || 0, plain.length || leaveEnd > n ? 1.1 * carried : 0);
    const spreadN = still() ? 0 : Math.min(0.5, flightN * 0.25);
    flight = flightN; spread = spreadN; flightC = 0;
    if (cloud) {
      // lebendige Wolke: jede Drohne fliegt über einen eigenen, zufälligen Mittelpunkt; ihr Flugfenster ist so lang,
      // dass die Bézier-Bahn die Geschwindigkeits- und Beschleunigungsgrenzen einhält (Spitze 1,875·D/W bzw. 5,77·D/W²
      // mit D = doppelter längerer Schenkel), mindestens aber 60 % der Wolkendauer
      const rank = rankOf(b), m = [0, 0, 0];
      let need = 0;
      for (let i = 0; i < n; i++) {
        if (!inCloud[i]) continue;
        const q = i * 3, j = order[i] * 3;
        let ox = (hash(i * 3.17 + k * 1.3) - 0.5) * 0.9 * size * cloudSpread, oy = (hash(i * 5.71 + k * 2.9) - 0.5) * 0.7 * size * cloudSpread;
        const oz = (hash(i * 7.33 + k * 0.7) - 0.5) * 0.6 * size * cloudSpread;
        // keine Finte (vierzehnte Fassung, Marc: „überall raus“): Der Versatz des Bahn-Mittelpunkts entlang der
        // Flugrichtung, so wie man sie auf der Bühne sieht (x, gekipptes y), bleibt innerhalb der Strecke. Eine quadratische
        // Bézier-Bahn läuft dann in Flugrichtung stetig vorwärts; quer bleibt der Versatz frei, die Bahn bleibt gekrümmt.
        const sx = target[j] - from[q], sy = (target[j + 1] - from[q + 1]) * TILT_C - (target[j + 2] - from[q + 2]) * TILT_S, L = Math.hypot(sx, sy);
        if (L > 1e-6) {
          const ux = sx / L, uy = sy / L, a = ox * ux + (oy * TILT_C - oz * TILT_S) * uy, lim = L * 0.45;
          const d = Math.max(-lim, Math.min(lim, a)) - a;
          ox += d * ux; oy += (d * uy) / TILT_C;
        }
        m[0] = (from[q] + target[j]) / 2 + ox;
        m[1] = (from[q + 1] + target[j + 1]) / 2 + oy;
        m[2] = (from[q + 2] + target[j + 2]) / 2 + oz;
        mid.set(m, q); rankNow[i] = rank[order[i]];
        const D = 2 * Math.max(Math.hypot(m[0] - from[q], m[1] - from[q + 1], m[2] - from[q + 2]), Math.hypot(target[j] - m[0], target[j + 1] - m[1], target[j + 2] - m[2]));
        need = Math.max(need, (1.875 * D) / LIMITS.speed, Math.sqrt((5.7735 * D) / LIMITS.accel));
      }
      flightC = Math.max(TEMPO.cloud * cloudTime, need / TEMPO.cloudWindow, 1.1 * carried / TEMPO.cloudWindow);
      flight = Math.max(flightC, flightN + spreadN); spread = 0;
    }
    // Wolke: Start nach der Stelle im Lichtlauf, die Form baut sich in ihrer eigenen Reihenfolge auf; sonst gestaffelte
    // Starts nur für Drohnen, die wirklich reisen (eine Drohne, die bleibt, hat auf nichts zu warten)
    for (let i = 0; i < leaveEnd; i++) {
      if (i < n && inCloud[i]) { delay[i] = (rankNow[i] * 0.25 + hash(i * 2.13 + k) * 0.15) * flightC; continue; }
      const j = order[i] ?? 0, d = i < n ? Math.hypot(from[i * 3] - target[j * 3], from[i * 3 + 1] - target[j * 3 + 1], from[i * 3 + 2] - target[j * 3 + 2]) : 0;
      delay[i] = flowOf[i] && i < n ? hash(i * 1.37 + k * 7.1) * spreadN * Math.min(1, d / 0.3) : 0;
    }
    canvas.dataset.points = String(n); canvas.dataset.beat = String(k); canvas.dataset.cloud = cloud ? (parts ? "part" : "all") : "";
    onBeat?.(k, b, scene.beats.length);
    if (still()) settle(t, k);
  }

  /** Shows beat k formed and at rest (paused, reduced motion, first view). */
  function settle(t, k = motifEnd(beat)) {
    beat = k;
    const b = scene.beats[k], n = b.pts.length;
    useFit(b);
    order = Int32Array.from({ length: n }, (_, i) => i); active = n;
    let start = 0;
    for (const g of groupsOf(b)) { for (let q = 0; q < g.count; q++) { groupOf[start + q] = g.name; localOf[start + q] = q; flowOf[start + q] = g.rigid ? 0 : 1; } start += g.count; }
    // live motion shown at a calm, fully formed moment; the picture still stands its full hold from now on
    flight = 0; spread = 0; flightN = 0; flightC = 0; cloud = false; inCloud.fill(0); beatAt = t - 2.5; settled = 2.5;
    for (let i = 0; i < n; i++) { const r = restAt(i, t); pos[i * 3] = r[0]; pos[i * 3 + 1] = r[1]; pos[i * 3 + 2] = r[2]; alpha[i] = r[3]; col.set(b.pts[i].slice(3, 6), i * 3); }
    for (let i = n; i < MAX; i++) { outside(i, spot); pos.set(spot, i * 3); alpha[i] = 0; }
    vel.fill(0); leaveEnd = n;
    canvas.dataset.beat = String(k); canvas.dataset.points = String(n); canvas.dataset.cloud = ""; onBeat?.(k, b, scene.beats.length);
  }

  /** Shows a scene at a size factor (1 = fills the stage), starting at beat at; instant: already formed (first view
   * of the page). Paused or reduced motion shows the motif of that beat at rest. */
  function show(next, droneCountOf, sizeFactor = 1, { instant = false, at = 0, cloud: viaCloud = false } = {}) {
    scene = next; size = sizeFactor; droneCount = droneCountOf || 300; fit(scene.beats);
    groupOf.fill(""); // a new scene: every drone is free to take any place
    const k = Math.max(0, Math.min(scene.beats.length - 1, at));
    if (instant || still()) settle(now(), motifEnd(k)); else startBeat(k, now(), false, viaCloud);
    render(); sync();
  }
  /** Jumps to act k of the current scene (back/forward buttons). */
  function goto(k) {
    if (!scene) return;
    const target = Math.max(0, Math.min(scene.beats.length - 1, k));
    if (still()) { settle(now(), target); render(); tick(); } else { startBeat(target, now()); sync(); }
  }

  /** Advances the simulation; returns whether anything still moves. */
  function step(t) {
    prev.set(pos);
    const b = scene.beats[beat], elapsed = t - beatAt;
    const W = flightC * TEMPO.cloudWindow;
    for (let i = 0; i < active; i++) {
      const r = restAt(i, t), k = i * 3, c = b.pts[order[i]];
      if (inCloud[i] && elapsed - delay[i] < W) {
        const q = Math.max(0, (elapsed - delay[i]) / W), e = ease(q), span = delay[i] + W, w = Math.min(1, elapsed / span), carry = span * (w - 2 * w * w + w * w * w);
        const A = (1 - e) * (1 - e), B = 2 * (1 - e) * e, C = e * e;
        for (let d = 0; d < 3; d++) pos[k + d] = A * from[k + d] + B * mid[k + d] + C * r[d] + fromVel[k + d] * carry;
        const f = Math.min(1, q * 1.4);
        for (let d = 0; d < 3; d++) col[k + d] = fromCol[k + d] + (c[3 + d] - fromCol[k + d]) * f;
        // wartend: das alte Bild verlischt; im Flug gedimmt, einzelne Drohnen blitzen auf; kurz vor der Ankunft an.
        // Das Verlöschen läuft auch nach dem Start einer Drohne weiter (kein Helligkeitssprung, wenn sie losfliegt).
        const fading = fromAlpha[i] > 0.05 ? fromAlpha[i] * Math.max(0, 1 - (elapsed / flightC) * 3) : 0;
        if (q <= 0) alpha[i] = fromAlpha[i] > 0.05 ? Math.max(TEMPO.cloudDim, fading) : fromAlpha[i];
        else if (q < 0.88) alpha[i] = Math.max(fading, hash(i * 0.731 + Math.floor(t * 7 + hash(i) * 7) * 1.917) < TEMPO.cloudTwinkle ? TEMPO.cloudSpark : TEMPO.cloudDim);
        else alpha[i] = TEMPO.cloudDim + (r[3] - TEMPO.cloudDim) * ((q - 0.88) / 0.12);
        continue;
      }
      const u = flightN && !inCloud[i] ? Math.min(1, Math.max(0, (elapsed - delay[i]) / flightN)) : 1;
      if (u < 1) {
        // a flight continues the drone's current velocity from the moment the beat starts, also while it waits for
        // its staggered start (Hermite term over its whole window, gone at arrival)
        const span = flightN + delay[i], w = Math.min(1, elapsed / span), carry = span * (w - 2 * w * w + w * w * w), e = ease(u), arc = Math.sin(Math.PI * u) ** 2;
        let fx = from[k], fy = from[k + 1];
        if (b.swirl) { const a0 = -b.swirl; fx = from[k] * Math.cos(a0) - from[k + 1] * Math.sin(a0); fy = from[k] * Math.sin(a0) + from[k + 1] * Math.cos(a0); }
        along(fx, fy, from[k + 2], r[0], r[1], r[2], u, t, out, flowOf[i]);
        let x = out[0], y = out[1];
        if (b.swirl) { const sw = b.swirl * (1 - e), cs = Math.cos(sw), sn = Math.sin(sw), x0 = x; x = x0 * cs - y * sn; y = x0 * sn + y * cs; }
        if (b.lift) { const moved = Math.min(1, Math.hypot(r[0] - fx, r[1] - fy) / 0.3); x += b.lift[0] * arc * size * moved; y += b.lift[1] * arc * size * moved; } // only what flies far arcs
        pos[k] = x + fromVel[k] * carry; pos[k + 1] = y + fromVel[k + 1] * carry; pos[k + 2] = out[2] + fromVel[k + 2] * carry;
        const f = Math.min(1, u * 1.4);
        for (let q = 0; q < 3; q++) col[k + q] = fromCol[k + q] + (c[3 + q] - fromCol[k + q]) * f;
        alpha[i] = fromAlpha[i] + (r[3] - fromAlpha[i]) * Math.min(1, u * 2.5); // joining drones light up as they fly in
      } else { pos[k] = r[0]; pos[k + 1] = r[1]; pos[k + 2] = r[2]; alpha[i] = r[3]; col[k] = c[3]; col[k + 1] = c[4]; col[k + 2] = c[5]; }
    }
    // drones no longer needed fly out of the picture and switch off
    for (let i = active; i < leaveEnd; i++) {
      const k = i * 3, u = flight ? Math.min(1, elapsed / flight) : 1, carry = flight * (u - 2 * u * u + u * u * u); outside(i, spot);
      along(from[k], from[k + 1], from[k + 2], spot[0], spot[1], spot[2], u, t, out);
      pos[k] = out[0] + fromVel[k] * carry; pos[k + 1] = out[1] + fromVel[k + 1] * carry; pos[k + 2] = out[2] + fromVel[k + 2] * carry; alpha[i] = Math.max(0, fromAlpha[i] * (1 - u * 1.6));
    }
    const arrived = elapsed >= flight + spread;
    if (arrived) leaveEnd = active;
    const dt = lastT ? t - lastT : 0; lastT = t;
    if (dt > 0) for (let k = 0; k < MAX * 3; k++) vel[k] = (pos[k] - prev[k]) / dt;
    if (arrived && elapsed - flight - spread - settled >= (b.hold ?? 2.2)) {
      if (beat < scene.beats.length - 1) startBeat(beat + 1, t, true);
      // vierzehnte Fassung (Marc): vom letzten Bild zurück zum ersten immer durch die lebendige Wolke, in jedem Paket
      else if (scene.loopTo !== undefined) startBeat(scene.loopTo, t, true, true);
    }
    return !arrived || beat < scene.beats.length - 1 || scene.loopTo !== undefined || Boolean(b.live) || Boolean(b.shimmer);
  }

  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!scene) return;
    const ct = TILT_C, st = TILT_S, narrow = W < 600;
    const S = Math.min(W * 0.36, H * (narrow ? 0.38 : 0.6)) * DPR, ox = W * 0.5 * DPR, oy = H * (narrow ? 0.52 : 0.5) * DPR, list = [];
    for (let i = 0; i < MAX; i++) {
      if (alpha[i] < 0.01) continue;
      const k = i * 3, y = pos[k + 1], z = pos[k + 2];
      const Y = y * ct - z * st, Z = y * st + z * ct, pr = 3.4 / (3.4 - Z);
      // depth shading: drones further back are dimmer, which makes volumes read as volumes
      const depth = Math.max(0, Math.min(1, (Z / (size * fitK || 1) + 0.6) / 1.2));
      list.push([ox + pos[k] * S * pr, oy - Y * S * pr, Z, pr, alpha[i] * (0.78 + 0.22 * depth), col[k] | 0, col[k + 1] | 0, col[k + 2] | 0]);
    }
    canvas.dataset.lit = String(list.length); // drones lit right now, read by the tests
    // alle Lichter additiv wie in der Probe (die Reihenfolge spielt dabei keine Rolle); Tiefe macht ein Licht etwas
    // größer bzw. kleiner (Perspektive), Licht über 1 legt das helle Sprite darüber
    const goal = dotRadius(scene.beats[beat]?.drones ?? droneCount, S / DPR), halo = haloOf(S / DPR);
    // ein Bild mit eigener Drohnenzahl: die Lichtgröße wandert in Viertelpixel-Schritten dorthin (kein Sprung)
    const wall = performance.now();
    if (!(radNow > 0) || still()) radNow = goal;
    else if (radNow !== goal && wall - radAt > 90) { radAt = wall; radNow = Math.abs(goal - radNow) <= 0.25 ? goal : radNow + Math.sign(goal - radNow) * 0.25; }
    const rad = radNow;
    ctx.globalCompositeOperation = "lighter";
    for (const [px, py, , pr, a, r, g, b] of list) {
      const sp = sprite(r, g, b, rad, false, halo), R = sp.R * pr;
      ctx.globalAlpha = Math.min(1, a); ctx.drawImage(sp.c, px - R, py - R, R * 2, R * 2);
      if (a > 1.02) { const hot = sprite(r, g, b, rad, true, halo), Q = hot.R * pr; ctx.globalAlpha = Math.min(1, a - 1); ctx.drawImage(hot.c, px - Q, py - Q, Q * 2, Q * 2); }
    }
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
  }

  function loop(ms) {
    frame = 0;
    if (!visible || still() || !scene) return;
    const real = ms / 1000;
    if (lastReal) vt += Math.min(0.1, Math.max(0, real - lastReal)) * rate;
    lastReal = real;
    const t = vt, busy = step(t);
    render(); tick();
    // physics test hook: positions of every drone in the air, in display units
    if (window.__showTrace) window.__showTrace.push([t, Array.from(pos.subarray(0, Math.max(active, leaveEnd) * 3)), beat, active, leaveEnd]);
    if (busy) frame = requestAnimationFrame(loop);
    else canvas.dataset.running = "false"; // nothing moves: no more frames until the next change
  }
  function sync() {
    if (visible && !still()) { if (!frame && scene) { canvas.dataset.running = "true"; lastReal = 0; frame = requestAnimationFrame(loop); } }
    else {
      if (frame) cancelAnimationFrame(frame);
      frame = 0; canvas.dataset.running = "false";
      // reduzierte Bewegung, globale Pause, verdeckter Tab: das Motiv in Ruhe; Pause der Vorführ-Steuerung: genau dieses Bild
      if (scene && held()) settle(now(), beat);
      if (scene) { render(); tick(); }
    }
  }

  /** Fortschritt für die Vorführ-Steuerung: Schätzdauer je Bild und wie weit das laufende Bild ist. */
  const estimates = new WeakMap();
  function timeline() {
    if (!scene) return null;
    if (!estimates.has(scene)) estimates.set(scene, scene.beats.map((b) => (b.cloud ? TEMPO.cloud : 2.4) + (b.hold ?? 2.2)));
    const b = scene.beats[beat], total = flight + spread + (b.hold ?? 2.2);
    return { beat, beats: scene.beats, est: estimates.get(scene), frac: total > 0 ? Math.min(1, Math.max(0, (vt - beatAt - settled) / total)) : 1, paused: userPaused, rate };
  }
  function tick() { onTick?.(timeline()); }
  /** Pause der Vorführ-Steuerung: friert das aktuelle Bild ein; weiter läuft es genau von dort. */
  function setPaused(p) { userPaused = Boolean(p); sync(); tick(); }

  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }).observe(canvas);
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(canvas);
  document.addEventListener("flyingstars:motion-change", sync);
  document.addEventListener("visibilitychange", sync);
  reduceQuery.addEventListener("change", sync);
  resize();
  return { show, replay: () => goto(0), goto, beat: () => beat, setPaused, paused: () => userPaused, setRate: (r) => { rate = r; tick(); }, timeline };
}
