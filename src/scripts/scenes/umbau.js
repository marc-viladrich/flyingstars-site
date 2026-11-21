// Zerlegen und Zusammensetzen (Runde 16, Marc 21.11.2026: „großer Fan der Roboter-Geschichte … genau diese Art
// Disassembly/Reassembly öfter“). Verallgemeinert den Übergang Roboter → Greifarm (scenes/gross/robotergreifer.js):
// Ein Bild steht, dann löst sich seine Formation Stück für Stück und setzt sich ohne Wolke zum nächsten Bild zusammen.
//   - Jede Drohne fliegt auf gerader Bahn von ihrem Platz im alten Bild an ihren Platz im neuen, weich an- und
//     abgebremst (keine Umkehr, keine Finte).
//   - Gestaffelt nach Bauordnung: das neue Bild entsteht von unten nach oben (oder nach eigener Ordnung, z. B. erst das
//     Gehäuse, dann der Code), die alten Drohnen gehen in derselben Ordnung los. Zuordnung schichtweise und je Schicht
//     optimal, damit sich früh und spät startende Bahnen nicht kreuzen.
//   - Licht: was in beiden Bildern leuchtet, bleibt an (im Flug leicht gedimmt); was nur im alten leuchtet, verlischt;
//     was nur im neuen leuchtet, geht im letzten Drittel des Flugs an.
// Das Ergebnis ist ein gewöhnliches Bild (beat) für show-field.js, nutzbar in jeder Geschichte des Konfigurators und im
// Teaser. Der Teil heißt „umbau“ und „schreibt“ (writes): die Drohnen fliegen einzeln, der Teil hat keine gemeinsame
// Bewegung, von der der Finten-Wächter je Teil ausgehen könnte. Wächter: scripts/umbau.test.mjs.
import { assignScalable } from '../show-field.js';

const lerp = (a, b, u) => a + (b - a) * u;
const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * u * (u * (u * 6 - 15) + 10));
const smooth = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));

/** Lage und Licht jeder Drohne eines Bildes nach t Sekunden seiner eigenen (rohen) Uhr: [x, y, z, Licht]. steady() in
 * show-scenes.js lässt ein Bild genau bei t = hold zum Stehen kommen; dort beginnt der Umbau. */
export function poseAt(beat, t) {
  return beat.pts.map((p, j) => { const o = [p[0], p[1], p[2] || 0, 1]; if (beat.live) beat.live(p, j, t, o); return o; });
}

/**
 * Der Umbau von `from` (Endlage nach from.hold) zu `to` (Anfangslage, t = 0) als eigenes Bild.
 * Optionen: caption, frame; spread (s, Staffelung von der ersten bis zur letzten Drohne), fly (s, Flugdauer jeder
 * Drohne), order(p, i) Bauordnung eines Platzes im neuen Bild (klein = zuerst; Standard: von unten nach oben),
 * layers (Schichten der Zuordnung), at (Endzeit des alten Bildes, Standard from.hold ?? 2.2).
 * Unterschiedlich viele Drohnen: fehlende Startplätze parken dunkel an einem Platz des alten Bildes, überzählige
 * Drohnen des alten Bildes bleiben stehen und verlöschen (das nächste Bild schickt sie in Reserve).
 */
export function reassemble(from, to, { caption = '', frame, spread = 2.6, fly = 2.2, order = (p) => p[1], layers = 6, at = from.hold ?? 2.2 } = {}) {
  const A = poseAt(from, at), B = poseAt(to, 0), M = Math.max(A.length, B.length);
  const litA = A.map((o) => o[3] > 0.05), litB = B.map((o) => o[3] > 0.05);
  // Startplätze: die Drohnen des alten Bildes, fehlende parken dunkel auf den hellsten Plätzen (jeder Platz höchstens
  // einmal doppelt, gleichmäßig über das Bild)
  const src = A.map((o, j) => ({ p: o, lit: litA[j], c: from.pts[j].slice(3, 6) }));
  for (let k = 0; src.length < M; k++) { const j = Math.floor(((k * 7919) % A.length)); src.push({ p: A[j], lit: false, c: from.pts[j].slice(3, 6) }); }
  // Zielplätze: die Plätze des neuen Bildes; überzählige alte Drohnen bleiben, wo sie sind (und verlöschen)
  const slots = B.map((o, i) => ({ p: o, lit: litB[i] }));
  // alle Drohnen der Show: was keins der beiden Bilder braucht, wartet in Reserve
  const off = Math.max(A.length + (from.offstageDrones ?? 0), B.length + (to.offstageDrones ?? 0)) - M;
  // Zuordnung schichtweise: Ziele nach Bauordnung, Drohnen nach Höhe (leuchtende zuerst), je Schicht optimal
  const byOrder = slots.map((s, i) => [order(to.pts[i], i), i]).sort((a, b) => a[0] - b[0]).map(([, i]) => i);
  const byHeight = src.map((s, j) => [s.p[1] + (s.lit ? 0 : 0.5), j]).sort((a, b) => a[0] - b[0]).map(([, j]) => j);
  const slotOf = new Int32Array(M).fill(-1), rank = new Float64Array(M);
  byOrder.forEach((i, r) => { rank[i] = r / Math.max(1, byOrder.length - 1); });
  // überzählige Drohnen: die dunkelsten und höchsten (am Ende von byHeight) bleiben stehen
  const movers = byHeight.slice(0, slots.length);
  const L = Math.max(1, Math.min(layers, Math.ceil(slots.length / 24)));
  for (let l = 0; l < L; l++) {
    const a = Math.floor((l * slots.length) / L), b = Math.floor(((l + 1) * slots.length) / L);
    const S = byOrder.slice(a, b), D = movers.slice(a, b);
    if (!S.length) continue;
    const m = assignScalable(Float64Array.from(D.flatMap((j) => src[j].p.slice(0, 3))), Float64Array.from(S.flatMap((i) => slots[i].p.slice(0, 3))));
    D.forEach((j, r) => { slotOf[j] = S[m[r]]; });
  }
  const leave = new Float64Array(M), target = Array.from({ length: M }), litT = new Uint8Array(M);
  for (let j = 0; j < M; j++) {
    const i = slotOf[j];
    if (i >= 0) { target[j] = slots[i].p; litT[j] = slots[i].lit ? 1 : 0; leave[j] = rank[i] * spread; }
    else { target[j] = src[j].p; litT[j] = 0; leave[j] = 0; }
  }
  const pts = src.map((s) => [s.p[0], s.p[1], s.p[2], ...s.c]), litS = src.map((s) => s.lit);
  const fitPts = [...(to.fitPts ?? B.map((o) => o.slice(0, 3))), ...A.filter((_, j) => litA[j]).map((o) => o.slice(0, 3))];
  return {
    groups: [{ name: 'umbau', count: M, rigid: false }], writes: ['umbau'],
    pts, caption, hold: spread + fly + 0.4, fitPts, ...(frame ? { frame } : {}), ...(off > 0 ? { offstageDrones: off } : {}),
    umbau: { from: A.length, to: B.length, slotOf, leave, fly }, // für den Wächter
    live: (b, j, t, o) => {
      const u = ease((t - leave[j]) / fly), q = target[j];
      for (let c = 0; c < 3; c++) o[c] = lerp(b[c], q[c], u);
      if (litS[j] && litT[j]) o[3] = 1 - 0.3 * Math.sin(Math.PI * u);
      else if (litS[j]) o[3] = 1 - smooth(u / 0.6);
      else if (litT[j]) o[3] = smooth((u - 0.6) / 0.4);
      else o[3] = 0;
    },
  };
}

/**
 * Eine Geschichte aus zwei Bildern mit Umbau dazwischen: [...vorher, Umbau, ...nachher]. Das letzte Bild vorher endet
 * nach `hold` Sekunden (dort beginnt der Umbau), alle Bilder teilen sich einen Bildausschnitt (frame), damit sich der
 * Maßstab beim Umbau nicht ändert.
 */
export function chain(before, after, { frame, hold, ...opts } = {}) {
  const last = { ...before.at(-1), ...(hold ? { hold } : {}) };
  const morph = reassemble(last, after[0], { frame, ...opts });
  const fitPts = [...before.flatMap((b) => b.fitPts ?? b.pts.map((p) => p.slice(0, 3))), ...after.flatMap((b) => b.fitPts ?? b.pts.map((p) => p.slice(0, 3)))];
  const framed = (b) => ({ ...b, fitPts, ...(frame ? { frame } : {}) });
  return [...before.slice(0, -1).map(framed), framed(last), { ...morph, fitPts }, ...after.map(framed)];
}
